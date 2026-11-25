import { act, forecast } from '../engine/game.js';
import { operatingReserve } from './development-planner.js';
import { plannerForecast } from './quote-planner.js';
import { evaluateRollouts, rolloutBudget, ROLLOUT_SEEDS } from './rollout-planner.js';

const comparisonCache = new WeakMap();

function liquidity(state, rows) {
  if (rows.length !== 12 || !rows.every(row => [row.cash, row.hypothetical, row.financing].every(Number.isFinite))) return null;
  return {
    floor: Math.min(state.cash, ...rows.flatMap(row => [row.cash, row.hypothetical])),
    borrowing: rows.reduce((total, row) => total + row.financing, 0),
  };
}

// Resolve each displayed choice on a disposable copy of the real game. A choice
// cannot buy its better margin by eating the minimum operating reserve when a
// viable alternative is available. Forecasts describe existing commitments,
// not more sales or guaranteed future returns from this event.
export function planEventSafety(state, event, choices, { reserve = 0 } = {}) {
  const required = Math.max(operatingReserve(state), Number.isFinite(reserve) ? reserve : 0);
  // Normal play supplies a pending event; allowing a disposable copy also makes
  // previews for a separately supplied decision possible without state mutation.
  const current = state.events.some(item => item.id === event.id) ? state : { ...state, events: [...state.events, event] };
  const feasible = [];
  for (const choice of choices) {
    if (choice.disabled) continue;
    const result = act(current, { type: 'resolve-event', eventId: event.id, choice: choice.id });
    if (result.error || result.state === current) continue;
    const neutral = liquidity(result.state, plannerForecast(result.state));
    const visible = liquidity(result.state, forecast(result.state));
    if (!neutral || !visible) continue;
    const nextReserve = Math.max(required, operatingReserve(result.state));
    const riskFloor = Math.min(neutral.floor, visible.floor);
    const debt = Math.max(neutral.borrowing, visible.borrowing);
    const safeReserve = riskFloor >= nextReserve && debt === 0 && result.state.loan <= state.loan;
    feasible.push({ ...choice, reserve: nextReserve, cashFloor: visible.floor, scenarioFloor: neutral.floor,
      borrowing: visible.borrowing, scenarioBorrowing: neutral.borrowing, riskFloor, debt, safeReserve,
      upfront: Math.max(0, state.cash - result.state.cash) });
  }
  const safeChoices = feasible.filter(choice => choice.safeReserve);
  if (safeChoices.length) return { safe: true, choices: safeChoices, all: feasible, reserve: required };
  // When every option is risky, use the conservative cash safety estimate only
  // to find the least exposed choice. Do not rank future profits using the
  // live game's hidden seed or pretend that this forced choice is safe.
  const ranked = [...feasible].sort((a, b) => (b.riskFloor - b.reserve) - (a.riskFloor - a.reserve)
    || a.debt - b.debt || b.scenarioFloor - a.scenarioFloor || a.upfront - b.upfront);
  return { safe: false, choices: ranked.slice(0, 1), all: feasible, reserve: required };
}

function outcomeRisk(rollout, startingLoan, reserve) {
  return {
    failed: rollout.bankruptCount + rollout.blockedCount,
    borrowing: rollout.scenarios.filter(scenario => scenario.maxLoan > startingLoan).length,
    shortage: rollout.scenarios.filter(scenario => scenario.minCash < reserve).length,
  };
}

const compareRisk = (a, b) => a.failed - b.failed || a.borrowing - b.borrowing || a.shortage - b.shortage;

function certainlyDominates(state,event,better,worse) {
  const a=better.choice,b=worse.choice;
  // The founding assistant stays either way; paying a larger salary changes
  // no skill or assignment. A free repeat inquiry is optional, not a contract.
  if(event.type==='staff-poach'&&event.staffId===state.assistant&&a.id==='defer'&&b.id==='retain')return true;
  if(event.type==='key-client'&&a.id==='contact'&&b.id==='thanks'&&!a.upfront)return true;
  if(event.code==='add-order'&&a.id==='accept'&&b.id==='pass'&&!a.upfront)return true;
  const uncertain=choice=>['policy','macro','collection','invoiceDelay','lockFx','stockLoss','clearance','lead','exhibit'].some(key=>Boolean(choice[key]));
  if(!event.orderId||uncertain(a)||uncertain(b))return false;
  const x=a.impact??{},y=b.impact??{};
  if(![x.profit,y.profit,x.deliveryWeek,y.deliveryWeek,x.paymentWeek,y.paymentWeek].every(Number.isFinite))return false;
  const aTerms=[-a.upfront,x.profit,-x.deliveryWeek,-x.paymentWeek,-Number(Boolean(x.cancelWeek)),x.reputation??0,a.relationship??0];
  const bTerms=[-b.upfront,y.profit,-y.deliveryWeek,-y.paymentWeek,-Number(Boolean(y.cancelWeek)),y.reputation??0,b.relationship??0];
  return aTerms.every((value,index)=>value>=bTerms[index])&&aTerms.some((value,index)=>value>bTerms[index]);
}

function overrideThreshold(state,event,baseline,challenger,reserve) {
  const a=baseline.choice,b=challenger.choice;
  const extraCost=Math.max(0,b.upfront-a.upfront);
  const order=state.orders.find(item=>item.id===event.orderId);
  const directValue=choice=>{
    const impact=choice.impact??{};
    if(!order||!Number.isFinite(impact.profit)||!Number.isFinite(impact.deliveryWeek))return null;
    if(impact.cancelWeek)return -order.total;
    const late=Math.max(0,impact.deliveryWeek-order.dueWeek)*order.total*.03;
    const carrying=Math.max(0,order.total-order.deposit)*Math.max(0,(impact.paymentWeek??state.week)-state.week)*.0025;
    return impact.profit-late-carrying;
  };
  const aValue=directValue(a),bValue=directValue(b);
  const knownLoss=aValue===null||bValue===null?0:Math.max(0,aValue-bValue);
  // A richer cash position means paying early/extra for a deadline which is
  // already feasible should need more reliable evidence of a real advantage.
  const headroom=Math.max(0,a.scenarioFloor-reserve)/Math.max(1,reserve);
  const lossWeight=2+Math.min(2,headroom);
  let threshold=Math.max(200,reserve*.035)+extraCost+knownLoss*lossWeight;
  if(event.type==='rival-sale'&&a.id==='pass'&&b.id==='acquire'){
    const rival=state.rivals.find(item=>item.id===event.rivalId);
    const unbackedCost=Math.max(0,extraCost-(rival?.scale??0)*40*19*.65);
    threshold+=unbackedCost*2;
  }
  return threshold;
}

function notWorseReserve(candidate,reference) {
  return candidate.rollout.scenarios.every((scenario,index)=>{
    const base=reference.rollout.scenarios[index];
    const shortage=Math.max(0,candidate.choice.reserve-scenario.minCash);
    const priorShortage=Math.max(0,reference.choice.reserve-base.minCash);
    return shortage<=priorShortage&&(!scenario.bankrupt||base.bankrupt)&&(!scenario.blocked||base.blocked);
  });
}

/** Choose between compatible, already safety-checked player decisions by
 * executing the event and actual game rounds on independent sampled states.
 * The immediate financial judgement is a robust tie-break, not an alternative
 * to running the multiweek simulation. No future action changes the live game.
 */
export function planEventRollouts(state, event, safety, { preferredId } = {}) {
  if (!safety?.choices?.length) return null;
  const preferred=safety.choices.find(item=>item.id===preferredId)??safety.choices[0];
  // A mandatory emergency has no cash-safe alternative. Keep least-exposed
  // fallback rather than speculative forecasts justifying an unsafe purchase.
  if (!safety.safe || safety.choices.length===1) return { choice:preferred, compared:0, alternatives:[], reason:'safety' };
  let entries=comparisonCache.get(state);
  if (!entries) {entries=new Map();comparisonCache.set(state,entries);}
  const key=JSON.stringify([event.id,preferred.id,safety.reserve,safety.choices.map(item=>item.id)]);
  if(entries.has(key))return entries.get(key);
  const current=state.events.some(item=>item.id===event.id)?state:{...state,events:[...state.events,event]};
  const seeds=ROLLOUT_SEEDS.slice(0,rolloutBudget(state).scenarioCount);
  const alternatives=[];
  for(const choice of safety.choices) {
    const result=act(current,{type:'resolve-event',eventId:event.id,choice:choice.id});
    if(result.error||result.state===current)continue;
    const rollout=evaluateRollouts(result.state,{horizon:4,seeds,reserve:choice.reserve,continueCurrentWeek:true});
    alternatives.push({choice,rollout,risk:outcomeRisk(rollout,state.loan,choice.reserve)});
  }
  if(!alternatives.length)return {choice:preferred,compared:0,alternatives:[],reason:'safety'};
  // Do not let unrelated future draws favor a strictly inferior known choice.
  // Still actually evaluate every safe choice so the comparison is complete.
  const rational=alternatives.filter(item=>!alternatives.some(other=>other!==item&&certainlyDominates(state,event,other,item)));
  const contenders=rational.length?rational:alternatives;
  const baseline=contenders.find(item=>item.choice.id===preferred.id)??contenders[0];
  const sorted=contenders.filter(item=>notWorseReserve(item,baseline)).sort((a,b)=>compareRisk(a.risk,b.risk)||b.rollout.score-a.rollout.score||a.choice.upfront-b.choice.upfront);
  const best=sorted[0];
  const differences=best.rollout.scenarios.map((scenario,index)=>scenario.score-baseline.rollout.scenarios[index].score);
  const wins=differences.filter(diff=>diff>0).length;
  const threshold=overrideThreshold(state,event,baseline,best,safety.reserve);
  const median=[...differences].sort((a,b)=>a-b)[Math.floor((differences.length-1)/2)];
  const extraCost=Math.max(0,best.choice.upfront-baseline.choice.upfront);
  const paidEvidence=extraCost===0||differences.every(diff=>diff>=extraCost);
  const robust=best.rollout.score-baseline.rollout.score>threshold&&median>threshold*.6&&wins>differences.length/2&&paidEvidence;
  const safer=compareRisk(best.risk,baseline.risk)<0;
  const chosen=safer||robust?best:baseline;
  const report={choice:chosen.choice,rollout:chosen.rollout,compared:alternatives.length,alternatives,preferredId:preferred.id,
    reason:safer?'risk':robust?'future':baseline.choice.id!==preferred.id?'certain':'tie',scoreDelta:chosen.rollout.score-baseline.rollout.score,pairedWins:chosen===best?wins:0};
  entries.set(key,report);
  return report;
}
