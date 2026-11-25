import test from 'node:test';
import assert from 'node:assert/strict';
import { act, forecast, newGame } from '../v38/engine/game.js';
import { quote } from '../v38/engine/quotes.js';
import { planQuoteBundle } from '../v38/ui/quote-planner.js';
import { evaluateRollouts, ROLLOUT_SEEDS, ROLLOUT_WEEKS } from '../v38/ui/rollout-planner.js';

const config = { source: 'stock', ratio: 95, extraTerms: 0, financing: 'standard' };
const recommendations = (state, inquiry) => ({ offer: quote(state, inquiry, config), config });
const ids = plan => plan.steps.map(step => step.inquiry.id);
const minimum = rows => Math.min(...rows.map(row => row.hypothetical));
function makeInquiry(reference, { id, quantity, targetPrice, terms, depositRate = 0 }) {
  return { ...reference, id, quantity, targetPrice, terms, depositRate, dueWeek: 4, expiresWeek: 1,
    rivals: [{ name: '同行', price: targetPrice, style: '稳健' }], buyer: { ...reference.buyer, id, credit: 'AAA' } };
}
function replayBundle(state, plan) {
  let successor = state;
  for (const step of plan.steps) {
    const result = act(successor, { type: 'bid', inquiryId: step.inquiry.id, ...step.recommendation.config });
    assert.equal(result.error, undefined);
    successor = result.state;
    assert.equal(minimum(forecast(successor)), step.cashFloor);
    assert.ok(step.cashFloor >= plan.reserve);
  }
  return successor;
}

test('rollout plays four actual weekly rounds per scenario, including new inquiry actions; every recorded move replays in the engine', () => {
  const state = newGame({ difficulty: 'casual', seed: 381 });
  const snapshot = structuredClone(state);
  const initialIds = new Set(state.inquiries.map(inquiry => inquiry.id));
  const report = evaluateRollouts(state);
  assert.equal(report.horizon, ROLLOUT_WEEKS);
  assert.equal(report.scenarioCount, ROLLOUT_SEEDS.length);
  assert.equal(report.completedRounds, 12);
  assert.equal(report.futureWeeks, 9);
  assert.ok(report.futureBids > 0 && report.futureBidWeeks > 0);
  let freshBids = 0, actualBids = 0;
  for (const [index, scenario] of report.scenarios.entries()) {
    let replay = structuredClone({ ...state, seed: ROLLOUT_SEEDS[index] });
    for (const [round, record] of scenario.rounds.entries()) {
      assert.equal(replay.week, record.week);
      for (const action of record.actions) {
        if (action.type === 'bid') {
          assert.ok(round > 0, 'First round uses only candidate current bids; future policy chooses later rounds');
          assert.ok(replay.inquiries.some(inquiry => inquiry.id === action.inquiryId));
          actualBids++;
          if (!initialIds.has(action.inquiryId)) freshBids++;
        }
        const result = act(replay, action);
        assert.equal(result.error, undefined, `Rollout recorded rejected action ${JSON.stringify(action)}`);
        replay = result.state;
      }
      const result = act(replay, { type: 'end-week' });
      assert.equal(result.error, undefined);
      replay = result.state;
      assert.equal(replay.week, record.week + 1);
      assert.equal(replay.cash, record.cash);
      assert.equal(replay.loan, record.loan);
      assert.equal(replay.summary.profit, record.profit);
      assert.equal(replay.summary.won.length, record.won);
      assert.equal(replay.summary.delivered.length, record.delivered);
      assert.equal(replay.summary.collected.length, record.collected);
      assert.equal(replay.inquiries.length, record.nextInquiries);
    }
  }
  assert.ok(freshBids > 0, 'Later rounds must actually act on newly generated inquiries, not only advance cash commitments');
  assert.equal(actualBids, report.futureBids);
  const fixed = evaluateRollouts(state, { futurePolicy: false });
  assert.equal(fixed.futureBids, 0);
  assert.notEqual(report.score, fixed.score);
  assert.deepEqual(state, snapshot);
});

test('mandatory event is resolved through a concrete safe engine choice rather than freezing or silently clearing it', () => {
  const state = newGame({ difficulty: 'casual', seed: 381 });
  state.cash = 6500;
  state.events = [{ id: 'materials-fixture', type: 'trade-event', code: 'materials', title: '供应商调价通知', text: '供应商调价',
    choices: [{ id: 'reserve', label: '锁定采购价', cost: 700, policy: { weeks: 5, materialDelta: -12 } }, { id: 'open', label: '按现价采购', macro: { materials: 7 } }] }];
  const snapshot = structuredClone(state);
  const report = evaluateRollouts(state);
  assert.equal(report.blockedCount, 0);
  assert.ok(report.eventActions >= ROLLOUT_SEEDS.length);
  for (const scenario of report.scenarios) {
    assert.deepEqual(scenario.rounds[0].actions[0], { type: 'resolve-event', eventId: 'materials-fixture', choice: 'open' });
    assert.equal(scenario.completedRounds, 4);
  }
  assert.deepEqual(state, snapshot, 'Actual pending player decision must remain untouched');
});

test('multi-round comparison changes the current bundle when a slow contract would block profitable future moves', () => {
  const state = newGame({ difficulty: 'casual', seed: 381 });
  const reference = state.inquiries[0];
  state.cash = 28000;
  state.inquiries = [makeInquiry(reference, { id: 'slow', quantity: 180, targetPrice: 92, terms: 8 }),
    makeInquiry(reference, { id: 'fast', quantity: 170, targetPrice: 94, terms: 0, depositRate: 30 }),
    makeInquiry(reference, { id: 'small', quantity: 100, targetPrice: 110, terms: 1, depositRate: 15 })];
  const snapshot = structuredClone(state);
  const analytic = planQuoteBundle(state, { recommendations, lookahead: false });
  const chosen = planQuoteBundle(state, { recommendations });
  assert.deepEqual(new Set(ids(analytic)), new Set(['slow', 'fast', 'small']));
  assert.deepEqual(new Set(ids(chosen)), new Set(['fast', 'small']));
  assert.ok(analytic.expectedProfit > chosen.expectedProfit, 'Old immediate expected-return ranking prefers filling all three slots');
  const analyticSimulation = evaluateRollouts(replayBundle(state, analytic), { reserve: analytic.reserve });
  const chosenSimulation = evaluateRollouts(replayBundle(state, chosen), { reserve: chosen.reserve });
  assert.ok(chosenSimulation.score > analyticSimulation.score);
  assert.ok(chosenSimulation.futureBids > analyticSimulation.futureBids, 'Keeping room allows actual profitable later-week bids');
  assert.ok(chosen.cashFloor > analytic.cashFloor);
  assert.equal(chosen.rollout.score, chosenSimulation.score);
  assert.equal(chosen.lookaheadRounds, 4);
  assert.ok(chosen.rolloutCompared >= 3 && chosen.rolloutCompared <= 5);
  assert.equal(chosen.rollout.completedRounds, 12);
  assert.deepEqual(state, snapshot);
});

test('waiting remains a real compared move when an otherwise positive quote immobilizes money needed in later rounds', () => {
  const state = newGame({ difficulty: 'casual', seed: 381 });
  state.cash = 30000;
  state.inquiries = [makeInquiry(state.inquiries[0], { id: 'slow', quantity: 160, targetPrice: 62, terms: 9 })];
  const analytic = planQuoteBundle(state, { recommendations, lookahead: false });
  assert.deepEqual(ids(analytic), ['slow']);
  assert.ok(analytic.expectedProfit > 0 && analytic.cashFloor >= analytic.reserve);
  const chosen = planQuoteBundle(state, { recommendations });
  assert.equal(chosen.waitPreferred, true);
  assert.deepEqual(chosen.steps, []);
  assert.equal(chosen.rolloutCompared, 2);
  const simulation = evaluateRollouts(replayBundle(state, analytic), { reserve: analytic.reserve });
  assert.ok(chosen.baselineRollout.score > simulation.score);
  assert.ok(chosen.rollout.futureBids > 0, 'Waiting now does not mean no future business');
});

test('sampled paths and ranking do not depend on saved private seed or mutate the live game', () => {
  const first = newGame({ difficulty: 'casual', seed: 381 });
  const second = { ...structuredClone(first), seed: 0xdeadbeef };
  const snapshot = structuredClone(first);
  assert.deepEqual(evaluateRollouts(first), evaluateRollouts(second));
  assert.equal(evaluateRollouts(first), evaluateRollouts(first), 'Repeated evaluation caches immutable state');
  assert.deepEqual(first, snapshot);
});

test('four rounds stay explicitly bounded on a long history with a busy inquiry inbox', () => {
  const state = newGame({ difficulty: 'casual', seed: 381 });
  state.week = 520; state.cash = 300000;
  const reference = state.inquiries[0];
  state.inquiries = Array.from({ length: 60 }, (_, index) => ({ ...reference, id: `current-${index}`, week: state.week, dueWeek: state.week + 4,
    expiresWeek: state.week + 1, quantity: 100 + index, buyer: { ...reference.buyer, id: `customer-${index}` } }));
  state.history = Array.from({ length: 519 }, (_, index) => ({ week: index + 1, cash: state.cash, profit: 1000, revenue: 10000,
    inflow: 12000, outflow: 11000, loan: 0, financing: 0, receivables: 0, orders: 0, rep: 60, macro: { ...state.macro } }));
  const started = performance.now();
  const report = evaluateRollouts(state);
  const elapsed = performance.now() - started;
  assert.equal(report.completedRounds, 12);
  assert.ok(report.futureBids <= 27, 'At most three new future bids per later week per scenario');
  assert.ok(report.futureBids > 0);
  assert.ok(elapsed < 3500, `rollout took ${Math.round(elapsed)}ms`);
});

test('very long firm histories narrow the search width without skipping weekly simulation or deterministic explicit seeds', () => {
  const opening = newGame({ difficulty: 'casual', seed: 381 });
  const won = act(act(opening, { type: 'bid', inquiryId: opening.inquiries[0].id, source: 'stock', ratio: 80 }).state, { type: 'end-week' }).state;
  assert.ok(won.orders.length);
  const state = newGame({ difficulty: 'casual', seed: 381 });
  state.week = 520; state.cash = 300000;
  const example = won.orders[0];
  // A synthetic years-old order archive exercises full real reducer clones.
  state.orders = Array.from({ length: 1000 }, (_, index) => ({ ...example, id: `historic-${index}`, status: 'settled',
    contractWeek: Math.ceil(index / 2), deliveredWeek: Math.ceil(index / 2) + 2, expectedPayWeek: Math.ceil(index / 2) + 3 }));
  state.history = Array.from({ length: 519 }, (_, index) => ({ week: index + 1, cash: state.cash, profit: 1000, revenue: 10000,
    inflow: 12000, outflow: 11000, loan: 0, financing: 0, receivables: 0, orders: 0, rep: 60, macro: { ...state.macro } }));
  state.inquiries = state.inquiries.map(inquiry => ({ ...inquiry, week: state.week, expiresWeek: state.week + 1, dueWeek: state.week + 4 }));
  const started = performance.now();
  const plan = planQuoteBundle(state, { recommendations });
  const elapsed = performance.now() - started;
  assert.ok(plan.rollout, 'Substantial histories still run genuine future paths');
  assert.equal(plan.rollout.horizon, 4);
  assert.equal(plan.rollout.scenarioCount, 2);
  assert.equal(plan.rollout.completedRounds, 8);
  assert.equal(plan.rollout.futureBidLimit, 2);
  assert.ok(plan.rollout.futureBids > 0 && plan.rollout.futureBids <= 12);
  assert.ok(plan.examined <= 35 && plan.rolloutCompared <= 4);
  assert.ok(elapsed < 5000, `heavy-state search took ${Math.round(elapsed)}ms`);
  const explicit = evaluateRollouts(state, { seeds: ROLLOUT_SEEDS });
  assert.equal(explicit.scenarioCount, 3, 'Explicit independent sample seeds stay deterministic even on heavy histories');
  assert.equal(explicit.completedRounds, 12);
  assert.equal(state.orders.length, 1000);
  assert.equal(state.history.length, 519);
});
