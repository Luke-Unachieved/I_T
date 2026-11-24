import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, act, endWeek, expediteFee } from '../v38/engine/game.js';
import { decisionInfo } from '../v38/engine/expansion.js';
import { orderDates } from '../v38/engine/treasury.js';
import { quote } from '../v38/engine/quotes.js';
import { TRADE_EVENTS } from '../v38/data/events.js';
import { PRODUCT_BY_ID } from '../v38/data/core.js';

const fresh = () => newGame({ name: '体验修复数值验收', assistant: 'fang', seed: 381 });
const apply = (state, action) => {
  const result = act(state, action);
  assert.equal(result.error, undefined, `${action.type}: ${result.error}`);
  return result.state;
};
const sum = values => Object.values(values).reduce((total, value) => total + value, 0);
function signedOrder() {
  let state = fresh();
  state = apply(state, { type: 'bid', inquiryId: state.inquiries[0].id, source: 'stock', ratio: 80 });
  state = endWeek(state);
  assert.equal(state.orders.length, 1);
  return state;
}
function eventFor(state, code) {
  const template = TRADE_EVENTS.find(item => item.id === code);
  const event = { ...structuredClone(template), id: `qa-${code}`, code, type: 'trade-event', orderId: state.orders[0]?.id, market: 'domestic' };
  state.events = [event];
  return event;
}

test('E03: expedition updates order profit immediately and books its cost only once at delivery', () => {
  let state = signedOrder();
  const original = state.orders[0];
  const fee = expediteFee(original);
  const cash = state.cash;
  const profit = original.profit;
  state = apply(state, { type: 'expedite', orderId: original.id });
  assert.equal(state.cash, cash - fee);
  assert.equal(state.orders[0].profit, profit - fee);
  assert.equal(state.period.cashBreakdown.outflow.expedite, fee);
  assert.equal(state.period.profit, 0, 'Delivery recognizes this order cost; paying it must not recognize it twice');
  const snapshot = JSON.stringify(state);
  assert.ok(act(state, { type: 'expedite', orderId: original.id }).error);
  assert.equal(JSON.stringify(state), snapshot);
  // Place the same signed stock order at its final shipping stage, isolating
  // delivery accounting from random production disruption or late penalties.
  state.orders[0].productionLeft = 0;
  state.orders[0].shippingLeft = 1;
  state.orders[0].status = 'transit';
  state.orders[0].dueWeek = 99;
  state = endWeek(state);
  assert.ok(state.summary.delivered.includes(original.id));
  assert.equal(state.orders[0].profit, profit - fee);
  const overhead = sum(Object.fromEntries(Object.entries(state.summary.cashBreakdown.outflow).filter(([key]) => ['fixed', 'payroll', 'interest'].includes(key))));
  assert.equal(state.summary.profit, profit - fee - overhead);
  assert.equal(state.summary.cashBreakdown.outflow.expedite, fee);
});

test('E11: weekly cash categories conserve actual cash and separate funding from sales and profit', () => {
  let state = fresh();
  const initialCash = state.cash;
  state = apply(state, { type: 'borrow', amount: 5000 });
  state = apply(state, { type: 'repay', amount: 1000 });
  state = apply(state, { type: 'bid', inquiryId: state.inquiries[0].id, source: 'stock', ratio: 80 });
  state = endWeek(state);
  const flow = state.summary, { inflow, outflow } = flow.cashBreakdown;
  assert.equal(sum(inflow), flow.inflow);
  assert.equal(sum(outflow), flow.outflow);
  assert.equal(state.cash, initialCash + flow.inflow - flow.outflow);
  assert.equal(inflow.borrowing, 5000);
  assert.equal(outflow.repayment, 1000);
  assert.equal(inflow.deposit, state.orders[0].deposit);
  assert.equal(inflow.customerPayment ?? 0, 0);
  assert.equal(outflow.supplier, state.orders[0].prepayment);
  assert.equal(outflow.fixed, 1200);
  assert.equal(outflow.payroll, state.staff.reduce((total, person) => total + person.salary, 0));
  assert.equal(flow.profit, -outflow.fixed - outflow.payroll - outflow.interest);
  assert.equal(flow.won[0].unit, PRODUCT_BY_ID[state.orders[0].productId].unit);
});

test('E11: four-week summaries retain independent funding and expense buckets', () => {
  let state = apply(fresh(), { type: 'borrow', amount: 5000 });
  const initialCash = state.cash - 5000;
  state = apply(state, { type: 'advance-four' });
  assert.equal(state.summary.weeks.length, 4);
  const weeks = state.summary.weeks;
  assert.equal(weeks[0].cashBreakdown.inflow.borrowing, 5000);
  assert.ok(weeks.slice(1).every(week => !week.cashBreakdown.inflow.borrowing));
  for (const week of weeks) {
    assert.equal(sum(week.cashBreakdown.inflow), week.inflow);
    assert.equal(sum(week.cashBreakdown.outflow), week.outflow);
    assert.equal(week.profit, -sum(week.cashBreakdown.outflow));
  }
  assert.equal(state.cash, initialCash + weeks.reduce((total, week) => total + week.inflow - week.outflow, 0));
});

test('E13/E03: quality decisions identify a real order and predict the applied dates and profit', () => {
  const state = signedOrder();
  state.orders[0].status = 'production';
  state.orders[0].productionLeft = 2;
  state.orders[0].shippingLeft = 1;
  state.orders[0].dueWeek = 20;
  const event = eventFor(state, 'quality');
  const info = decisionInfo(state, event);
  assert.ok(info.context.some(text => text.includes(state.orders[0].buyer.name)));
  assert.ok(info.context.some(text => text.includes(state.orders[0].productName)));
  for (const choice of info.choices) {
    const result = apply(state, { type: 'resolve-event', eventId: event.id, choice: choice.id });
    const order = result.orders[0], actualDates = orderDates(order, result.week);
    assert.equal(order.deliverWeek, choice.impact.deliveryWeek);
    assert.equal(actualDates.paymentWeek, choice.impact.paymentWeek);
    assert.equal(order.profit, choice.impact.profit);
    assert.equal(order.penalty - state.orders[0].penalty, choice.impact.discount);
    assert.equal(result.cash - state.cash, choice.impact.cash ?? 0);
    assert.ok(choice.details.length > 0);
    if (choice.cost) {
      assert.equal(order.profit, state.orders[0].profit - choice.cost);
      assert.equal(result.period.profit, 0);
      assert.equal(result.period.cashBreakdown.outflow.orderFees, choice.cost);
    }
  }
});

test('E13: packaging visit quotes a bounded material saving and applies it to actual new factory quotes', () => {
  const state = fresh();
  // A normal inquiry at factory MOQ exercises the production price, without
  // injecting cash or claiming that this targeted fixture is a campaign.
  const inquiry = structuredClone(state.inquiries[0]);
  inquiry.quantity = PRODUCT_BY_ID[inquiry.productId].sources.factory.minQuantity;
  inquiry.dueWeek = 30;
  inquiry.expiresWeek = 30;
  const event = eventFor(state, 'supplier-demo');
  const before = quote(state, inquiry, { source: 'factory', ratio: 100 });
  assert.equal(before.error, undefined);
  const choice = decisionInfo(state, event).choices.find(item => item.id === 'visit');
  assert.equal(choice.impact.untilWeek, state.week + 3);
  assert.equal(choice.impact.materialSavingPer10k, 800);
  const result = apply(state, { type: 'resolve-event', eventId: event.id, choice: 'visit' });
  const after = quote(result, inquiry, { source: 'factory', ratio: 100 });
  assert.equal(after.error, undefined);
  assert.ok(after.cost < before.cost);
  assert.equal(result.cash - state.cash, choice.impact.cash);
  assert.ok(result.policies.some(policy => policy.untilWeek === choice.impact.untilWeek && policy.materialDelta === -8));
  const expired = structuredClone(result);
  expired.week = choice.impact.untilWeek + 1;
  const restored = quote(expired, inquiry, { source: 'factory', ratio: 100 });
  assert.equal(restored.cost, before.cost, 'The visit must not make its temporary saving permanent');
});
