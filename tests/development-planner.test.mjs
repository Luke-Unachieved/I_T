import test from 'node:test';
import assert from 'node:assert/strict';
import { act, forecast, newGame } from '../v38/engine/game.js';
import { planDevelopment } from '../v38/ui/development-planner.js';

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
  assert.equal(plan.choices.length, 2);
  assert.equal(plan.choices[0].label, '引荐');
  assert.ok(plan.choices[0].cashFloor > plan.choices[1].cashFloor);
  for (const candidate of plan.choices) {
    const next = step(state, candidate.action);
    const rows = forecast(next);
    assert.equal(candidate.upfront, state.cash - next.cash);
    assert.equal(candidate.cashFloor, Math.min(next.cash, ...rows.flatMap(row => [row.cash, row.hypothetical])));
    assert.ok(candidate.cashFloor >= candidate.reserve);
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
    { action: { type: 'repay', amount: 3000 }, strategicValue: 50 },
    { action: { type: 'buy-cert', id: 'export' }, strategicValue: 90 },
  ];
  const result = planDevelopment(state, candidates);
  assert.deepEqual(result.choices.map(choice => choice.action.type), ['repay']);
  assert.ok(result.choices[0].operatingDelta > 0);
  assert.equal(result.choices[0].loanDelta, -3000);
  assert.equal(result.choices[0].borrowing, 0);
  assert.equal(result.rejected.length, 3);
  assert.deepEqual(state, untouched);
});

test('a safe repayment is deferred if pending winning quotes consume the available reserve', () => {
  let state = newGame({ seed: 21, difficulty: 'casual' });
  state.cash = 34000;
  state.loan = 9000;
  const candidate = { action: { type: 'repay', amount: 9000 }, strategicValue: 60 };
  assert.equal(planDevelopment(state, [candidate]).choices.length, 1);
  // Use a long open invoice term to keep the winning bid's procurement cash within
  // the planning horizon, without crediting a future sale not currently committed.
  const mira = state.inquiries.find(inquiry => inquiry.buyer.id === 'mira');
  mira.terms = 12;
  state = step(state, { type: 'bid', inquiryId: mira.id, source: 'stock', ratio: 80 });
  const untouched = structuredClone(state);
  const plan = planDevelopment(state, [candidate]);
  assert.equal(plan.choices.length, 0);
  assert.match(plan.rejected[0].reason, /经营预留/);
  assert.deepEqual(state, untouched);
});

test('equally feasible development actions keep a neutral ranking when only the hidden seed changes', () => {
  const state = newGame({ seed: 381, difficulty: 'casual' });
  state.cash = 180000;
  state.company.certs = ['export', 'audit'];
  state.company.markets = ['domestic', 'se-asia'];
  const candidates = [
    { action: { type: 'invest-venture', id: 'warehouse' }, strategicValue: 79 },
    { action: { type: 'invest-venture', id: 'ecommerce' }, strategicValue: 70 },
  ];
  const first = planDevelopment({ ...state, seed: 5 }, candidates);
  const second = planDevelopment({ ...state, seed: 7 }, candidates);
  assert.equal(first.choices.length, 2);
  assert.equal(second.choices.length, 2);
  const ranking = plan => plan.choices.map(choice => [choice.action.id, choice.score, choice.scenarioFloor]);
  assert.deepEqual(ranking(first), ranking(second));
  for (const [seed, plan] of [[5, first], [7, second]]) {
    for (const choice of plan.choices) {
      const next = step({ ...state, seed }, choice.action);
      const rows = forecast(next);
      assert.equal(choice.cashFloor, Math.min(next.cash, ...rows.flatMap(row => [row.cash, row.hypothetical])));
    }
  }
});
