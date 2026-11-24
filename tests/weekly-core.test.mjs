import test from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { newGame, act, endWeek, forecast, creditLimit } from '../v38/engine/game.js';
import { quote } from '../v38/engine/quotes.js';
import { PRODUCTS, ASSISTANTS } from '../v38/data/core.js';

const apply = (state, action) => {
  const result = act(state, action);
  assert.equal(result.error, undefined, `Action ${action.type} rejected: ${result.error}`);
  return result.state;
};
const fresh = (seed = 381) => newGame({ name: '周转功能验收', assistant: 'fang', seed });
const firstBid = state => ({ type: 'bid', inquiryId: state.inquiries[0].id, source: 'stock', ratio: 80, extraTerms: 0 });

test('new company starts with a week, assistant, domestic inquiries and actual reference capital', () => {
  const state = fresh();
  assert.equal(state.v, 38);
  assert.equal(state.week, 1);
  assert.equal(state.cash, 50000);
  assert.equal(state.loan, 0);
  assert.equal(state.company.rep, 60);
  assert.ok(creditLimit(state) >= 20000);
  assert.ok(state.inquiries.length >= 4 && state.inquiries.length <= 6);
  assert.match(JSON.stringify(state.inquiries[0]), /米拉/);
  assert.equal(new Set(state.inquiries.map(item => item.id)).size, state.inquiries.length);
});

test('catalog has distinct goods, available reused images and usable paired sources', async () => {
  assert.ok(PRODUCTS.length >= 30);
  assert.equal(new Set(PRODUCTS.map(item => item.id)).size, PRODUCTS.length);
  assert.equal(ASSISTANTS.length, 4);
  for (const item of PRODUCTS) {
    await access(new URL(`../${item.asset}`, import.meta.url));
    for (const source of Object.values(item.sources)) {
      assert.ok(Number.isSafeInteger(source.minQuantity) && source.minQuantity > 0, item.id);
      assert.ok(Number.isFinite(source.unitCost) && source.unitCost > 0, item.id);
      assert.ok(source.days > 0 && source.packSize > 0, item.id);
    }
  }
});

test('five tutorial steps can complete or be skipped without spending business cash', () => {
  let state = fresh();
  for (let step = 0; step < 5; step++) state = apply(state, { type: 'tutorial', step });
  state = apply(state, { type: 'tutorial', step: 5, done: true });
  assert.equal(state.cash, 50000);
  assert.equal(state.week, 1);
  assert.ok(state.tutorial.done);
});

test('price calculation and bidding do not sign, charge or mutate the previous state', () => {
  const initial = fresh();
  const bytes = JSON.stringify(initial);
  const proposal = quote(initial, initial.inquiries[0], { source: 'stock', ratio: 80, extraTerms: 0 });
  assert.equal(proposal.error, undefined);
  assert.equal(JSON.stringify(initial), bytes);
  assert.ok(proposal.total > 0 && Number.isFinite(proposal.profit));
  assert.ok(proposal.deliverWeek <= proposal.dueWeek);
  const state = apply(initial, firstBid(initial));
  assert.equal(state.bids.length, 1);
  assert.equal(state.orders.length, 0);
  assert.equal(state.cash, initial.cash);
  assert.equal(JSON.stringify(initial), bytes);
});

test('weekly tender settlement produces a real order and later its paid receivable', () => {
  let state = fresh();
  const inquiryId = state.inquiries[0].id;
  state = apply(state, firstBid(state));
  state = endWeek(state);
  assert.equal(state.summary.week, 1);
  assert.ok(state.summary.won.some(item => item.inquiryId === inquiryId));
  assert.equal(state.bids.length, 0);
  assert.equal(state.orders.length, 1);
  const id = state.orders[0].id;
  let sawReceivable = false;
  for (let i = 0; i < 20; i++) {
    sawReceivable ||= state.receivables.some(item => item.orderId === id || item.id === id);
    if (state.orders.find(item => item.id === id)?.status === 'settled') break;
    state = endWeek(state);
  }
  assert.ok(sawReceivable, 'Delivered order must be represented in receivables');
  assert.equal(state.orders.find(item => item.id === id)?.status, 'settled');
  assert.ok(state.receivables.some(item => item.status === 'paid' && (item.orderId === id || item.id === id)));
  assert.ok(state.company.rep > 60);
});

test('an overpriced losing tender names the actual winner without creating an order or buyer deposit', () => {
  let state = fresh();
  state = apply(state, { ...firstBid(state), ratio: 105 });
  const result = endWeek(state);
  assert.equal(result.orders.length, 0);
  assert.equal(result.summary.won.length, 0);
  assert.equal(result.summary.lost.length, 1);
  assert.ok(result.summary.lost[0].winner);
  assert.ok(result.summary.lost[0].price > 0);
  assert.equal(result.cash, 48800);
});

test('only three quotations can be outstanding, and withdrawing releases a slot', () => {
  let state = fresh();
  for (const inquiry of state.inquiries.slice(0, 3)) state = apply(state, { ...firstBid(state), inquiryId: inquiry.id });
  const before = JSON.stringify(state);
  const rejected = act(state, { ...firstBid(state), inquiryId: state.inquiries[3].id });
  assert.ok(rejected.error);
  assert.equal(JSON.stringify(state), before);
  state = apply(state, { type: 'withdraw-bid', inquiryId: state.inquiries[0].id });
  assert.equal(state.bids.length, 2);
});

test('cash forecast has twelve finite weeks and its first quiet week agrees with settlement', () => {
  const state = fresh();
  const before = JSON.stringify(state);
  const points = forecast(state);
  assert.equal(points.length, 12);
  for (const point of points) for (const field of ['week', 'inflow', 'outflow', 'cash', 'hypothetical']) assert.ok(Number.isFinite(point[field]), field);
  const next = endWeek(state);
  assert.equal(points[0].cash, next.cash);
  assert.equal(points[0].inflow, next.summary.inflow);
  assert.equal(points[0].outflow, next.summary.outflow);
  assert.equal(JSON.stringify(state), before);
});

test('pending bids produce a visible hypothetical cash path and a first-week actual match when won', () => {
  let state = fresh();
  const noBid = forecast(state);
  state = apply(state, firstBid(state));
  const points = forecast(state);
  assert.ok(points.some((point, index) => point.hypothetical !== noBid[index].cash));
  const next = endWeek(state);
  assert.equal(points[0].hypothetical, next.cash);
});

test('a seeded game can complete all 52 weekly settlements and emits an annual result', () => {
  let state = fresh();
  state.cash = 200000; // Solvent fixture; this is a calendar test, not a balance calibration.
  for (let week = 1; week <= 52; week++) {
    state = endWeek(state);
    assert.equal(state.week, week + 1);
    assert.ok(Number.isFinite(state.cash));
    assert.equal(state.bankrupt, false);
  }
  assert.equal(state.summary.annual.number, 1);
  assert.equal(state.history.length, 52);
});

test('seeded settlement is reproducible and never mutates the submitted state', () => {
  const state = apply(fresh(), firstBid(fresh()));
  const bytes = JSON.stringify(state);
  assert.deepEqual(endWeek(state), endWeek(structuredClone(state)));
  assert.equal(JSON.stringify(state), bytes);
});

test('cash emergency consumes credit first and two consecutive negative weeks cause bankruptcy', () => {
  const state = fresh();
  state.payables.push({ id: 'unfunded-factory-balance', amount: 500000, dueWeek: 1, type: 'supplier' });
  const first = endWeek(state);
  assert.ok(first.loan > 0, 'Available credit should be used automatically');
  assert.ok(first.cash < 0);
  assert.equal(first.bankrupt, false);
  const second = endWeek(first);
  assert.equal(second.bankrupt, true);
  assert.equal(second.week, 3);
});

test('late orders accrue three-percent penalties, lose reputation and cancel into real inventory', () => {
  let state = endWeek(apply(fresh(), firstBid(fresh())));
  const order = state.orders[0];
  order.dueWeek = state.week - 1;
  order.productionLeft = 20;
  order.status = 'production';
  const rep = state.company.rep;
  state = endWeek(state);
  assert.equal(state.orders[0].penalty, Math.round(order.total * 0.03));
  assert.equal(state.company.rep, rep - 2);
  assert.equal(state.year.late, 1);
  for (let i = 0; i < 3; i++) state = endWeek(state);
  assert.equal(state.orders[0].status, 'cancelled');
  assert.equal(state.orders[0].lateWeeks, 4);
  assert.ok(state.company.rep <= rep - 8);
  assert.equal(state.receivables.length, 0);
  assert.equal(state.inventory.find(item => item.productId === order.productId)?.quantity, order.quantity);
  const cash = state.cash;
  state = apply(state, { type: 'liquidate', productId: order.productId });
  assert.equal(state.inventory.length, 0);
  assert.ok(state.cash > cash);
  assert.ok(act(state, { type: 'liquidate', productId: order.productId }).error);
});

test('one paid expedition reduces a real shipping stage and cannot charge twice', () => {
  let state = endWeek(apply(fresh(), firstBid(fresh())));
  const order = state.orders[0];
  const previousCash = state.cash;
  const previousWeeks = order.shippingLeft;
  state = apply(state, { type: 'expedite', orderId: order.id });
  assert.equal(state.orders[0].shippingLeft, previousWeeks - 1);
  assert.ok(state.cash < previousCash);
  assert.ok(state.orders[0].extraCost > 0);
  const after = JSON.stringify(state);
  assert.ok(act(state, { type: 'expedite', orderId: order.id }).error);
  assert.equal(JSON.stringify(state), after);
});

const deliveredFixture = () => {
  let state = endWeek(apply(fresh(), firstBid(fresh())));
  for (let i = 0; i < 10 && !state.receivables.length; i++) state = endWeek(state);
  assert.ok(state.receivables.length, 'Expected an actual delivery invoice');
  return state;
};

test('collection targets only a real unpaid invoice and cannot repeat within one week', () => {
  let state = deliveredFixture();
  const invoice = state.receivables[0];
  state.receivables[0].status = 'overdue';
  state.receivables[0].dueWeek = state.week + 3;
  const relation = state.relationships[invoice.buyer.id].rep;
  const cash = state.cash;
  state = apply(state, { type: 'collect', receivableId: invoice.id });
  assert.equal(state.cash, cash, 'A reminder must not invent a payment');
  assert.equal(state.receivables[0].dueWeek, state.week);
  assert.equal(state.relationships[invoice.buyer.id].rep, relation - 2);
  assert.ok(act(state, { type: 'collect', receivableId: invoice.id }).error);
  assert.ok(act(state, { type: 'collect', receivableId: 'nonexistent' }).error);
});

test('bad debt can be litigated for a fee and recovers only part of the actual invoice', () => {
  let state = deliveredFixture();
  const invoice = state.receivables[0];
  invoice.buyer.credit = 'B';
  invoice.dueWeek = state.week;
  state.seed = 7; // Fixed draw exercises the bad-debt branch, not a probability calibration.
  state = endWeek(state);
  assert.equal(state.receivables[0].status, 'bad-debt');
  assert.equal(state.orders[0].status, 'bad-debt');
  const cash = state.cash;
  state = apply(state, { type: 'sue', receivableId: invoice.id });
  assert.ok(state.cash < cash);
  assert.equal(state.receivables[0].status, 'lawsuit');
  assert.ok(act(state, { type: 'sue', receivableId: invoice.id }).error);
  for (let i = 0; i < 6 && state.receivables[0].status !== 'recovered'; i++) state = endWeek(state);
  const recovered = state.receivables[0];
  assert.equal(recovered.status, 'recovered');
  assert.ok(recovered.paidAmount > 0 && recovered.paidAmount < recovered.amount);
});

test('four-week advance stops for tender results and funding emergencies', () => {
  const bid = apply(fresh(), firstBid(fresh()));
  const tender = apply(bid, { type: 'advance-four' });
  assert.equal(tender.week, 2);
  assert.equal(tender.summary.won.length, 1);
  const danger = fresh();
  danger.payables.push({ id: 'cash-shortage', amount: 500000, dueWeek: 1, type: 'supplier' });
  const stopped = apply(danger, { type: 'advance-four' });
  assert.equal(stopped.week, 2);
  assert.ok(stopped.cash < 0 && !stopped.bankrupt);
});

test('borrowing and repayment obey actual credit, cash and positive-integer limits', () => {
  let state = fresh();
  for (const amount of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 500000]) assert.ok(act(state, { type: 'borrow', amount }).error);
  state = apply(state, { type: 'borrow', amount: 10000 });
  assert.equal(state.cash, 60000);
  assert.equal(state.loan, 10000);
  assert.ok(act(state, { type: 'repay', amount: 10001 }).error);
  state = apply(state, { type: 'repay', amount: 10000 });
  assert.equal(state.cash, 50000);
  assert.equal(state.loan, 0);
});
