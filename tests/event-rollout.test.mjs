import test from 'node:test';
import assert from 'node:assert/strict';
import { act, newGame } from '../v38/engine/game.js';
import { decisionInfo } from '../v38/engine/expansion.js';
import { TRADE_EVENTS } from '../v38/data/events.js';
import { planEventSafety, planEventRollouts } from '../v38/ui/event-planner.js';
import { eventCoach } from '../v38/ui/coaching.js';
import { evaluateRollouts } from '../v38/ui/rollout-planner.js';

function decide(state,event,preferredId) {
  const choices=decisionInfo(state,event).choices;
  return planEventRollouts(state,event,planEventSafety(state,event,choices),{preferredId});
}

function tradeFixture(code,seed=381,cash=120000) {
  const state=newGame({difficulty:'casual',seed});
  state.cash=cash;
  const event={...TRADE_EVENTS.find(item=>item.id===code),id:'pending',code,type:'trade-event'};
  state.events=[event];
  return {state,event};
}

test('paying for a real future materials policy can beat the immediate free choice in actual four-week rounds',()=>{
  const {state,event}=tradeFixture('materials');
  const before=structuredClone(state);
  const decision=decide(state,event,'open');
  assert.equal(decision.compared,2);
  assert.equal(decision.choice.id,'reserve');
  assert.equal(decision.reason,'future');
  assert.equal(decision.rollout.horizon,4);
  assert.equal(decision.rollout.scenarioCount,3);
  assert.equal(decision.rollout.completedRounds,12);
  assert.ok(decision.rollout.futureBids>0);
  assert.ok(decision.rollout.scenarios.every(item=>item.rounds[0].actions.some(action=>action.type==='bid')),'event continuation fills actual remaining current-week bid slots');
  const free=decision.alternatives.find(item=>item.choice.id==='open');
  const paid=decision.alternatives.find(item=>item.choice.id==='reserve');
  for(const [index,scenario] of paid.rollout.scenarios.entries()) {
    const reference=free.rollout.scenarios[index];
    assert.ok(scenario.score-reference.score>=700,'every paired gain must cover the paid policy');
    assert.ok(Math.max(0,paid.choice.reserve-scenario.minCash)<=Math.max(0,free.choice.reserve-reference.minCash));
  }
  assert.deepEqual(state,before);
  const visible=eventCoach(state,event,decisionInfo(state,event).choices);
  assert.equal(visible.id,'reserve');
  assert.match(visible.html,/按 3 种可能的情况算了接下来 4 周的接单、交货和回款/);
});

test('current-week continuation does not add unplanned bids to an evaluated quote bundle',()=>{
  const {state,event}=tradeFixture('materials');
  const after=act(state,{type:'resolve-event',eventId:event.id,choice:'open'}).state;
  const regular=evaluateRollouts(after,{horizon:4});
  const current=evaluateRollouts(after,{horizon:4,continueCurrentWeek:true});
  assert.ok(regular.scenarios.every(scenario=>!scenario.rounds[0].actions.some(action=>action.type==='bid')));
  assert.ok(current.scenarios.every(scenario=>scenario.rounds[0].actions.some(action=>action.type==='bid')));
  assert.equal(after.bids.length,0);
});

test('a known free optional repeat inquiry and same-ability founder deferral cannot lose to sampling noise',()=>{
  const {state}=tradeFixture('materials');
  const inquiry=state.inquiries[0];
  const bid=act({...state,events:[]},{type:'bid',inquiryId:inquiry.id,source:'stock',ratio:80});
  assert.ifError(bid.error);
  const won=act(bid.state,{type:'end-week'}).state;
  assert.ok(won.orders.length);
  const repeat={...TRADE_EVENTS.find(item=>item.id==='add-order'),id:'repeat',code:'add-order',type:'trade-event',orderId:won.orders[0].id};
  const live={...won,events:[repeat],cash:120000};
  const contact=decide(live,repeat,'pass');
  assert.equal(contact.compared,2);
  assert.equal(contact.choice.id,'accept');
  const founder=live.staff.find(item=>item.id===live.assistant);
  const salary={id:'salary',type:'staff-poach',staffId:founder.id,raise:founder.salary+300,title:'调薪',choices:[{id:'retain',label:'加薪'},{id:'defer',label:'暂缓调薪'}]};
  const salaryLive={...live,events:[salary]};
  const payroll=decide(salaryLive,salary,'retain');
  assert.equal(payroll.compared,2);
  assert.equal(payroll.choice.id,'defer');
  const actual=act(salaryLive,{type:'resolve-event',eventId:salary.id,choice:payroll.choice.id});
  assert.ifError(actual.error);
  assert.equal(actual.state.staff.find(item=>item.id===founder.id).salary,founder.salary);
  assert.equal(actual.state.staff.find(item=>item.id===founder.id).ability,founder.ability);
});

test('event comparison never uses hidden live seed and preserves mandatory unsafe fallback',()=>{
  const {state,event}=tradeFixture('materials');
  const a=decide({...state,seed:1},event,'open');
  const b=decide({...state,seed:999},event,'open');
  assert.equal(a.choice.id,b.choice.id);
  assert.deepEqual(a.alternatives.map(item=>[item.choice.id,item.rollout.score]),b.alternatives.map(item=>[item.choice.id,item.rollout.score]));
  const poor={...state,cash:0};
  const safety=planEventSafety(poor,event,decisionInfo(poor,event).choices);
  assert.equal(safety.safe,false);
  const fallback=planEventRollouts(poor,event,safety,{preferredId:'reserve'});
  assert.equal(fallback.compared,0);
  assert.equal(fallback.choice.id,'open');
  assert.equal(fallback.reason,'safety');
});
