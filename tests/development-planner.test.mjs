import test from 'node:test';
import assert from 'node:assert/strict';
import { act, forecast, newGame } from '../v38/engine/game.js';
import { planDevelopment } from '../v38/ui/development-planner.js';
import { evaluateRollouts } from '../v38/ui/rollout-planner.js';

const step = (state, action) => {
  const result = act(state, action);
  assert.ifError(result.error);
  return result.state;
};

test('equal market unlocks are compared through real fees and 12-week liquidity, not first match', () => {
  const state = newGame({ seed: 19, difficulty: 'casual', origin: 'buyer' });
  state.company.certs.push('export');
  state.cash = 80000;
  const untouched = structuredClone(state);
  const candidates = [
    { action: { type: 'open-market', id: 'se-asia' }, strategicValue: 60, label: '参展' },
    { action: { type: 'referral', id: 'se-asia' }, strategicValue: 60, label: '引荐' },
  ];
  const plan = planDevelopment(state, candidates);
  assert.equal(plan.choices.length, 1);
  assert.equal(plan.choices[0].label, '引荐');
  const directMarket = step(state, candidates[0].action);
  const marketFloor = Math.min(directMarket.cash, ...forecast(directMarket).flatMap(row => [row.cash, row.hypothetical]));
  assert.ok(marketFloor >= plan.baseline.reserve, 'Both choices pass the first cash reserve check');
  assert.ok(plan.choices[0].cashFloor > marketFloor);
  assert.match(plan.rejected.find(item => item.candidate.label === '参展').reason, /多轮情境/);
  const continueNow = evaluateRollouts(state, { reserve: plan.baseline.reserve, continueCurrentWeek: true });
  assert.equal(plan.defer.rolloutScore, continueNow.score);
  assert.ok(continueNow.scenarios.every(sample => sample.rounds[0].actions.some(action => action.type === 'bid')));
  assert.ok(continueNow.futureBids > evaluateRollouts(state, { reserve: plan.baseline.reserve }).futureBids);
  assert.equal(plan.defer.rolloutHorizon, 4);
  assert.equal(plan.defer.rolloutScenarios, 3);
  assert.ok(plan.defer.rolloutFutureBids > 0);
  for (const candidate of plan.choices) {
    const next = step(state, candidate.action);
    const rows = forecast(next);
    assert.equal(candidate.upfront, state.cash - next.cash);
    assert.equal(candidate.cashFloor, Math.min(next.cash, ...rows.flatMap(row => [row.cash, row.hypothetical])));
    assert.ok(candidate.cashFloor >= candidate.reserve);
    assert.equal(candidate.rolloutScore - plan.defer.rolloutScore, candidate.rolloutDelta);
    assert.ok(candidate.rolloutFutureBids > 0);
  }
  assert.deepEqual(state, untouched);
});

test('high strategic value cannot override insufficient reserve or an avoidable loan', () => {
  const state = newGame({ seed: 27, difficulty: 'casual' });
  state.cash = 33000;
  state.loan = 9000;
  const untouched = structuredClone(state);
  const candidates = [
    { action: { type: 'invest-venture', id: 'warehouse' }, strategicValue: 95 },
    { action: { type: 'borrow', amount: 2000 }, strategicValue: 100 },
    { action: { type: 'repay', amount: 500 }, strategicValue: 50 },
    { action: { type: 'buy-cert', id: 'export' }, strategicValue: 90 },
  ];
  const result = planDevelopment(state, candidates);
  assert.deepEqual(result.choices.map(choice => choice.action.type), ['repay']);
  assert.ok(result.choices[0].operatingDelta > 0);
  assert.equal(result.choices[0].loanDelta, -500);
  assert.equal(result.choices[0].borrowing, 0);
  assert.ok(result.choices[0].scenarioFloor >= result.choices[0].reserve * 2);
  assert.ok(result.choices[0].scenarioOperatingDelta > 0);
  assert.ok(result.choices[0].upfront <= (result.choices[0].scenarioFloor - result.choices[0].reserve) * .05);
  assert.equal(result.rejected.length, 3);
  assert.deepEqual(state, untouched);
});

test('a safe repayment is deferred if pending winning quotes consume the available reserve', () => {
  let state = newGame({ seed: 21, difficulty: 'casual' });
  state.cash = 70000;
  state.loan = 9000;
  const candidate = { action: { type: 'repay', amount: 9000 }, strategicValue: 60 };
  assert.equal(planDevelopment(state, [candidate]).choices.length, 1);
  // Use a long open invoice term to keep the winning bid's procurement cash within
  // the planning horizon, without crediting a future sale not currently committed.
  const mira = state.inquiries.find(inquiry => inquiry.buyer.id === 'mira');
  mira.quantity = 1000;
  mira.terms = 12;
  state = step(state, { type: 'bid', inquiryId: mira.id, source: 'stock', ratio: 80 });
  const untouched = structuredClone(state);
  const plan = planDevelopment(state, [candidate]);
  assert.equal(plan.choices.length, 0);
  assert.match(plan.rejected[0].reason, /经营预留|动用借款/);
  assert.deepEqual(state, untouched);
});

test('equally feasible development actions keep a neutral ranking when only the hidden seed changes', () => {
  const state = newGame({ seed: 381, difficulty: 'casual', origin: 'buyer' });
  state.cash = 180000;
  state.loan = 9000;
  state.company.certs = ['export'];
  const candidates = [
    { action: { type: 'repay', amount: 9000 }, strategicValue: 82 },
    { action: { type: 'referral', id: 'se-asia' }, longTermEvidence: true, strategicValue: 69 },
    { action: { type: 'open-market', id: 'se-asia' }, longTermEvidence: true, strategicValue: 69 },
  ];
  const first = planDevelopment({ ...state, seed: 5 }, candidates);
  const second = planDevelopment({ ...state, seed: 7 }, candidates);
  assert.equal(first.choices.length, 3);
  assert.equal(second.choices.length, 3);
  const ranking = plan => plan.choices.map(choice => [choice.action.type, choice.action.id, choice.score, choice.scenarioFloor, choice.rolloutScore]);
  assert.deepEqual(ranking(first), ranking(second));
  for (const [seed, plan] of [[5, first], [7, second]]) {
    for (const choice of plan.choices) {
      const next = step({ ...state, seed }, choice.action);
      const rows = forecast(next);
      assert.equal(choice.cashFloor, Math.min(next.cash, ...rows.flatMap(row => [row.cash, row.hypothetical])));
    }
  }
});

test('a reserve-safe expensive development action can lose to four-week defer and continued business', () => {
  const state = newGame({ seed: 381, difficulty: 'casual' });
  state.cash = 180000;
  state.company.certs = ['export', 'audit'];
  state.company.markets = ['domestic', 'se-asia'];
  const snapshot = structuredClone(state);
  const candidate = { action: { type: 'invest-venture', id: 'warehouse' }, strategicValue: 95 };
  const invested = step(state, candidate.action);
  const rows = forecast(invested);
  assert.ok(Math.min(invested.cash, ...rows.flatMap(row => [row.cash, row.hypothetical])) > 5000);
  assert.ok(invested.ventures.warehouse > state.ventures.warehouse);
  const plan = planDevelopment(state, [candidate]);
  assert.equal(plan.choices.length, 0);
  assert.equal(plan.defer.chosen, true);
  assert.equal(plan.defer.rolloutHorizon, 4);
  assert.equal(plan.defer.rolloutScenarios, 3);
  assert.ok(plan.defer.rolloutFutureBids > 0);
  assert.match(plan.rejected[0].reason, /多轮情境|多轮经营/);
  assert.deepEqual(state, snapshot);
});

test('a verified staged certification budget remains a viable strategic choice despite short-term simulated costs', () => {
  const state = newGame({ seed: 381, difficulty: 'casual' });
  state.week = 13;
  state.cash = 1500000;
  state.company.rep = 90;
  state.year.deliveries = 24;
  state.cumulativeRevenue = 6000000;
  state.history = Array.from({ length: 12 }, (_, index) => ({ week: index + 1, profit: 25000, revenue: 500000, macro: { ...state.macro } }));
  state.year.revenue = 6000000;
  state.year.profit = 300000;
  const snapshot = structuredClone(state);
  const candidate = { action: { type: 'buy-cert', id: 'export' }, strategicValue: 79 };
  const options = { reserve: 461500 };
  assert.deepEqual(planDevelopment(state, [candidate], options).choices, []);
  // The verified certification+market budget includes both real fees. A
  // four-week sample pays them before most overseas orders can mature.
  const justified = planDevelopment(state, [{ ...candidate, longTermUnlock: true, longTermCost: 20000 }], options);
  assert.equal(justified.choices.length, 1);
  assert.ok(justified.choices[0].rolloutDelta < 0);
  assert.ok(justified.choices[0].cashFloor >= options.reserve);
  assert.deepEqual(state, snapshot);
});
