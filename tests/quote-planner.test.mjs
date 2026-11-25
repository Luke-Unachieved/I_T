import test from 'node:test';
import assert from 'node:assert/strict';
import { act, forecast, newGame } from '../v38/engine/game.js';
import { quote, quoteCapacity } from '../v38/engine/quotes.js';
import { planQuoteBundle, plannerForecast, quoteExpectedProfit } from '../v38/ui/quote-planner.js';

const config = { source: 'stock', ratio: 95, extraTerms: 0, financing: 'standard' };
const recommendations = (state, inquiry) => ({ offer: quote(state, inquiry, config), config });
const minimum = rows => Math.min(...rows.map(row => row.hypothetical));
const ids = plan => plan.steps.map(step => step.inquiry.id);

function fixture() {
  const state = newGame({ difficulty: 'casual', seed: 381 });
  const example = state.inquiries[0];
  state.cash = 32000;
  state.inquiries = [['large', 300, 86], ['small-a', 110, 115], ['small-b', 110, 115]].map(([id, quantity, targetPrice]) => ({ ...example,
    id, quantity, targetPrice, dueWeek: 4, terms: 5, depositRate: 0, rivals: [{ name: '同行', price: targetPrice, style: '稳健' }],
    buyer: { ...example.buyer, id, credit: 'AAA' },
  }));
  return state;
}

test('bounded lookahead finds two smaller profitable quotes that a greedy first move blocks', () => {
  const state = fixture();
  const snapshot = structuredClone(state);
  const large = quote(state, state.inquiries[0], config);
  const small = quote(state, state.inquiries[1], config);
  assert.ok(quoteExpectedProfit(state, large) > quoteExpectedProfit(state, small));
  const greedy = planQuoteBundle(state, { recommendations, reserve: 5000, beamWidth: 1 });
  assert.deepEqual(ids(greedy), ['large']);
  const lookahead = planQuoteBundle(state, { recommendations, reserve: 5000 });
  assert.deepEqual(ids(lookahead), ['small-a', 'small-b']);
  assert.ok(lookahead.expectedProfit > greedy.expectedProfit * 1.4);
  assert.ok(lookahead.score > greedy.score && lookahead.cashFloor > greedy.cashFloor);
  assert.equal(lookahead.projectedWeeks, 12);
  let replay = state;
  for (const step of lookahead.steps) {
    const result = act(replay, { type: 'bid', inquiryId: step.inquiry.id, ...step.recommendation.config });
    assert.equal(result.error, undefined);
    replay = result.state;
    assert.equal(step.cashFloor, minimum(forecast(replay)), 'visible projection matches actual applied prefix');
    assert.ok(step.cashFloor >= lookahead.reserve);
    assert.ok(minimum(plannerForecast(replay)) >= lookahead.reserve);
  }
  assert.equal(lookahead.cashFloor, minimum(forecast(replay)));
  assert.deepEqual(state, snapshot, 'planning cannot change the live game');
});

test('plans respect fixed existing bids, real inventory capacity and category filter without a three-quote ceiling', () => {
  let state = fixture();
  state.cash = 250000;
  const reference = state.inquiries[1];
  state.inquiries = ['existing', 'remain-a', 'remain-b', 'filtered'].map(id => ({ ...reference, id, quantity: 100, buyer: { ...reference.buyer, id } }));
  state.inventory = [{ productId: reference.productId, quantity: 200, unitCost: 28 }];
  state = act(state, { type: 'bid', inquiryId: 'existing', ...config, source: 'inventory' }).state;
  const snapshot = structuredClone(state);
  const variants = (current, inquiry) => ['inventory', 'stock'].map(source => {
    const settings = { ...config, source };
    return { offer: quote(current, inquiry, settings), config: settings };
  });
  const plan = planQuoteBundle(state, { recommendations: variants, filter: inquiry => inquiry.id !== 'filtered' });
  assert.deepEqual(new Set(ids(plan)), new Set(['remain-a', 'remain-b']));
  assert.equal(plan.steps.filter(step => step.recommendation.offer.source === 'inventory').length, 1);
  let replay = state;
  for (const step of plan.steps) {
    const result = act(replay, { type: 'bid', inquiryId: step.inquiry.id, ...step.recommendation.config });
    assert.equal(result.error, undefined);
    replay = result.state;
  }
  assert.equal(replay.bids.length, 3);
  assert.equal(replay.bids[0].inquiryId, 'existing');
  assert.equal(replay.bids.filter(bid => bid.source === 'inventory').reduce((sum, bid) => sum + bid.quantity, 0), 200);
  const reopened=planQuoteBundle(replay,{recommendations:variants});
  assert.deepEqual(ids(reopened),['filtered'],'the fourth eligible quote remains viable when the whole inbox is restored');
  assert.equal(reopened.remainingCapacity,quoteCapacity(replay)-3);
  const fourth=act(replay,{type:'bid',inquiryId:'filtered',...reopened.steps[0].recommendation.config});
  assert.ifError(fourth.error);assert.equal(fourth.state.bids.length,4);
  assert.equal(planQuoteBundle(fourth.state,{recommendations:variants}).steps.length,0,'only exhausted real inquiries stop this plan');
  assert.deepEqual(state, snapshot);
});

test('neutral economic ranking cannot read hidden future RNG draws; the player-visible cash chart is only a safety veto', () => {
  const a = fixture(); a.cash = 250000;
  const b = { ...a, seed: 0xfedcab98 };
  assert.deepEqual(plannerForecast(a), plannerForecast(b));
  const planA = planQuoteBundle(a, { recommendations });
  const planB = planQuoteBundle(b, { recommendations });
  assert.deepEqual(ids(planA), ids(planB));
  assert.equal(planA.score, planB.score);
  assert.equal(planA.scenarioFloor, planB.scenarioFloor);
  assert.ok(planA.cashFloor >= planA.reserve && planB.cashFloor >= planB.reserve);
  assert.ok(planA.steps.length > 0);
});

test('does not propose an order when reserve, expected economics or real quote eligibility fail', () => {
  const state = fixture(); state.cash = 3000;
  const rejected = planQuoteBundle(state, { recommendations });
  assert.deepEqual(rejected.steps, []);
  const rich = fixture(); rich.cash = 250000;
  rich.inquiries = rich.inquiries.map(inquiry => ({ ...inquiry, minRep: 999 }));
  assert.deepEqual(planQuoteBundle(rich, { recommendations }).steps, []);
  const unprofitable = fixture(); unprofitable.cash = 250000;
  unprofitable.inquiries = unprofitable.inquiries.map(inquiry => ({ ...inquiry, targetPrice: 1 }));
  assert.deepEqual(planQuoteBundle(unprofitable, { recommendations }).steps, []);
});

test('search stays bounded even in a mature game with many currently visible inquiries', () => {
  const state = fixture();
  state.week = 520; state.cash = 300000;
  const reference = state.inquiries[1];
  state.inquiries = Array.from({ length: 60 }, (_, index) => ({ ...reference, id: `current-${index}`, week: state.week, dueWeek: state.week + 4,
    expiresWeek: state.week + 1, quantity: 100 + index, buyer: { ...reference.buyer, id: `customer-${index}` } }));
  state.history = Array.from({ length: 519 }, (_, index) => ({ week: index + 1, cash: state.cash, profit: 1000, revenue: 10000,
    inflow: 12000, outflow: 11000, loan: 0, financing: 0, receivables: 0, orders: 0, rep: 60, macro: { ...state.macro } }));
  const started = performance.now();
  const plan = planQuoteBundle(state, { recommendations });
  const elapsed = performance.now() - started;
  assert.equal(plan.searchWindow,4);
  assert.ok(plan.steps.length>0&&plan.steps.length<=plan.searchWindow);
  assert.ok(plan.examined <= 58, `candidate forecast evaluations: ${plan.examined}`);
  // A loose wall-clock guard catches combinatorial explosions without requiring
  // identical hardware in every browser worker or CI environment.
  assert.ok(elapsed < 3500, `planning took ${Math.round(elapsed)}ms`);
});

test('the rolling planner continues through the fourth and fifth real bids, then replans when team capacity grows',()=>{
  let state=newGame({difficulty:'casual',seed:381});
  const reference=state.inquiries[0];state.cash=500000;
  state.inquiries=Array.from({length:10},(_,i)=>({...reference,id:`inquiry-${i}`,quantity:100,targetPrice:200,dueWeek:4,expiresWeek:1,terms:0,depositRate:20,buyer:{...reference.buyer,id:`buyer-${i}`,credit:'AAA'},rivals:[{name:'同行',price:200,style:'稳健'}]}));
  assert.equal(quoteCapacity(state),5);
  const chosen=new Set();
  for(let index=0;index<quoteCapacity(state);index++){
    const prior=structuredClone(state),plan=planQuoteBundle(state,{recommendations});
    assert.deepEqual(state,prior,'planning does not submit any quote');
    assert.equal(plan.remainingCapacity,quoteCapacity(state)-index);
    assert.equal(plan.searchWindow,Math.min(4,quoteCapacity(state)-index));
    assert.ok(plan.steps.length>0&&plan.lookaheadRounds===4&&plan.rolloutCompared>=2);
    const first=plan.steps[0];assert.ok(!chosen.has(first.inquiry.id));chosen.add(first.inquiry.id);
    const result=act(state,{type:'bid',inquiryId:first.inquiry.id,...first.recommendation.config});
    assert.ifError(result.error);state=result.state;
    assert.ok(minimum(forecast(state))>=plan.reserve);
    assert.ok(minimum(plannerForecast(state))>=plan.reserve);
  }
  assert.equal(state.bids.length,5);
  const full=planQuoteBundle(state,{recommendations});assert.equal(full.remainingInquiries,5);assert.equal(full.remainingCapacity,0);assert.deepEqual(full.steps,[]);
  const employee=state.candidates.find(person=>person.role==='sales');
  const hired=act(state,{type:'hire',id:employee.id});assert.ifError(hired.error);state=hired.state;
  assert.equal(quoteCapacity(state),7);
  const after=planQuoteBundle(state,{recommendations});
  assert.equal(after.remainingCapacity,2);assert.equal(after.steps.length,2);
  for(const step of after.steps){
    const result=act(state,{type:'bid',inquiryId:step.inquiry.id,...step.recommendation.config});assert.ifError(result.error);state=result.state;
    assert.ok(minimum(forecast(state))>=after.reserve);
  }
  assert.equal(state.bids.length,7);
  const dismissed=act(state,{type:'dismiss-staff',id:employee.id});assert.ifError(dismissed.error);state=dismissed.state;
  assert.equal(quoteCapacity(state),5);
  assert.equal(state.bids.length,7,'already accepted quotes are never cancelled when the roster shrinks');
  const reduced=planQuoteBundle(state,{recommendations});
  assert.equal(reduced.remainingCapacity,0);assert.deepEqual(reduced.steps,[]);
  for(let i=0;i<3;i++){const withdrawn=act(state,{type:'withdraw-bid',inquiryId:state.bids[0].inquiryId});assert.ifError(withdrawn.error);state=withdrawn.state;}
  assert.equal(state.bids.length,4);
  const reopened=planQuoteBundle(state,{recommendations});assert.equal(reopened.remainingCapacity,1);assert.equal(reopened.steps.length,1);
});
