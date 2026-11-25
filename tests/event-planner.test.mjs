import test from 'node:test';
import assert from 'node:assert/strict';
import { act, forecast, newGame } from '../v38/engine/game.js';
import { decisionInfo } from '../v38/engine/expansion.js';
import { TRADE_EVENTS } from '../v38/data/events.js';
import { operatingReserve } from '../v38/ui/development-planner.js';
import { planEventSafety } from '../v38/ui/event-planner.js';

const apply = (state, action) => {
  const result = act(state, action);
  assert.ifError(result.error);
  return result.state;
};
const floor = state => Math.min(state.cash, ...forecast(state).flatMap(row => [row.cash, row.hypothetical]));

function eventFixture() {
  let state = newGame({ seed: 7, difficulty: 'casual' });
  const inquiry = state.inquiries[0];
  inquiry.quantity = 400;
  inquiry.terms = 12;
  inquiry.dueWeek = 4;
  state = apply(state, { type: 'bid', inquiryId: inquiry.id, ratio: 80, source: 'stock' });
  state = apply(state, { type: 'end-week' });
  state = apply(state, { type: 'dismiss-summary' });
  const event = { ...TRADE_EVENTS.find(item => item.id === 'packing-standard'), id: 'packing', code: 'packing-standard', type: 'trade-event', orderId: state.orders[0].id };
  state.events.push(event);
  state.cash += operatingReserve(state) + 100 - floor(state);
  return { state, event };
}

test('event advice excludes higher-profit paid printing when its fee crosses the reserve', () => {
  const { state, event } = eventFixture();
  const snapshot = structuredClone(state);
  const details = decisionInfo(state, event).choices;
  assert.ok(details.find(x => x.id === 'print').impact.profit > details.find(x => x.id === 'manual').impact.profit);
  const plan = planEventSafety(state, event, details);
  assert.equal(plan.safe, true);
  assert.deepEqual(plan.choices.map(x => x.id), ['manual']);
  const printed = plan.all.find(x => x.id === 'print');
  assert.equal(printed.cashFloor, floor(apply(state, { type: 'resolve-event', eventId: event.id, choice: 'print' })));
  assert.ok(printed.cashFloor < printed.reserve);
  assert.ok(plan.choices[0].cashFloor >= plan.choices[0].reserve);
  assert.deepEqual(state, snapshot);
});

test('when every choice is risky, offer one least exposed option without claiming safety', () => {
  const { state, event } = eventFixture();
  state.cash -= 1200;
  const plan = planEventSafety(state, event, decisionInfo(state, event).choices);
  assert.equal(plan.safe, false);
  assert.equal(plan.choices.length, 1);
  assert.equal(plan.choices[0].id, 'manual');
  assert.ok(plan.choices[0].riskFloor < plan.choices[0].reserve);
});

test('changing only the hidden seed cannot change an otherwise safe option set or scenario estimates', () => {
  const { state, event } = eventFixture();
  const first = { ...state, cash: 160000, seed: 5 };
  const second = { ...state, cash: 160000, seed: 7 };
  const signature = current => planEventSafety(current, event, decisionInfo(current, event).choices).choices.map(choice => [choice.id, choice.scenarioFloor]);
  assert.deepEqual(signature(first), signature(second));
  assert.equal(signature(first).length, 2);
});
