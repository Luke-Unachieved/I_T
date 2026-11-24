import test from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { newGame, act, endWeek, forecast, factorValue } from '../v38/engine/game.js';
import { generateInquiries, quote } from '../v38/engine/quotes.js';
import { certProgress } from '../v38/engine/expansion.js';
import { MARKETS, STAFF_ROLES, clientComic } from '../v38/data/expansion.js';
import { TRADE_EVENTS } from '../v38/data/events.js';

const fresh = () => newGame({ name: '扩张功能验收', assistant: 'fang', seed: 381 });
const apply = (state, action) => {
  const result = act(state, action);
  assert.equal(result.error, undefined, `${action.type}: ${result.error}`);
  return result.state;
};
const decide = state => {
  let next = state;
  for (let i = 0; next.events.length && i < 20; i++) {
    const event = next.events[0];
    next = apply(next, { type: 'resolve-event', eventId: event.id, choice: event.choices.at(-1).id });
  }
  return next;
};
const week = state => endWeek(decide(state));
function exportState() {
  let state = fresh();
  state.cash = 300000;
  state.company.rep = 75;
  state.year.deliveries = 10; // Explicit eligibility fixture; no balance simulation.
  state = apply(state, { type: 'buy-cert', id: 'export' });
  state = apply(state, { type: 'open-market', id: 'se-asia' });
  state.week = 4;
  state.inquiries = generateInquiries(state);
  return state;
}
function foreignBid(financing = 'standard') {
  let state = exportState();
  const inquiry = state.inquiries.find(item => item.market === 'se-asia');
  assert.ok(inquiry);
  // A deliberately sized export order exercises large-order finance, not profitability.
  inquiry.quantity *= 4;
  inquiry.terms = 3;
  state = apply(state, { type: 'bid', inquiryId: inquiry.id, source: 'stock', ratio: 80, extraTerms: 0, financing });
  state = week(state);
  assert.equal(state.orders.length, 1);
  return state;
}
function foreignInvoice(financing = 'standard') {
  let state = foreignBid(financing);
  for (let i = 0; i < 12 && !state.receivables.length; i++) state = week(state);
  assert.ok(state.receivables.length);
  return decide(state);
}

test('founding assistant is an employee; hiring sales increases arrivals and assigned win probability', () => {
  const before = fresh();
  assert.equal(before.staff.length, 1);
  assert.equal(before.staff[0].id, 'fang');
  assert.ok(before.staff[0].salary > 0);
  const candidate = before.candidates.find(person => person.role === 'sales');
  const hired = apply(before, { type: 'hire', id: candidate.id });
  const a = structuredClone(before), b = structuredClone(hired);
  a.seed = b.seed = 3800;
  assert.equal(generateInquiries(b).length, generateInquiries(a).length + 1);
  const inquiry = hired.inquiries[0];
  const ordinary = quote(hired, inquiry, { source: 'stock', ratio: 97 });
  const assigned = quote(hired, inquiry, { source: 'stock', ratio: 97, staffId: candidate.id });
  assert.ok(assigned.probability > ordinary.probability);
  const next = endWeek(hired);
  assert.equal(next.summary.outflow, 1200 + hired.staff.reduce((sum, person) => sum + person.salary, 0));
});

test('one employee cannot handle more than three simultaneous bids or orders', () => {
  const state = fresh();
  const staffId = state.staff[0].id;
  state.orders = Array.from({ length: 3 }, (_, i) => ({ id: `load-${i}`, staffId, status: 'production' }));
  assert.match(quote(state, state.inquiries[0], { source: 'stock', ratio: 97, staffId }).error, /3/);
  assert.ok(act(state, { type: 'dismiss-staff', id: staffId }).error);
});

test('certification enforces delivery and reputation conditions and opens paid foreign-market access', () => {
  const initial = fresh();
  assert.ok(act(initial, { type: 'buy-cert', id: 'export' }).error);
  assert.ok(act(initial, { type: 'open-market', id: 'se-asia' }).error);
  const state = exportState();
  assert.ok(state.company.certs.includes('export'));
  assert.ok(state.company.markets.includes('se-asia'));
  assert.equal(state.cash, 280000);
  assert.ok(act(state, { type: 'buy-cert', id: 'export' }).error);
  assert.ok(certProgress(state).find(item => item.id === 'audit').requirements.some(item => !item.met));
  const inquiry = state.inquiries.find(item => item.market === 'se-asia');
  const offer = quote(state, inquiry, { source: 'stock', ratio: 80 });
  assert.equal(offer.currency, 'USD');
  assert.ok(offer.shippingWeeks >= 2);
  assert.equal(offer.total, Math.round(offer.foreignTotal * offer.fx));
});

test('credit letters require a large export and insurance shows its real premium in cost and forecast', () => {
  const state = exportState();
  const inquiry = state.inquiries.find(item => item.market === 'se-asia');
  inquiry.quantity *= 4;
  const base = quote(state, inquiry, { source: 'stock', ratio: 97 });
  const letter = quote(state, inquiry, { source: 'stock', ratio: 97, financing: 'letter-of-credit' });
  const insured = quote(state, inquiry, { source: 'stock', ratio: 97, financing: 'insured' });
  assert.equal(letter.error, undefined);
  assert.ok(letter.probability < base.probability);
  assert.ok(insured.insurancePremium > 0 && insured.insuredRecovery > 0.5);
  assert.ok(insured.profit < base.profit);
  const ordinaryCash = forecast(state, base)[0].hypothetical;
  const insuredCash = forecast(state, insured)[0].hypothetical;
  assert.equal(ordinaryCash - insuredCash, insured.insurancePremium);
  const domestic = fresh();
  assert.ok(quote(domestic, domestic.inquiries[0], { source: 'stock', ratio: 97, financing: 'insured' }).error);
});

test('factoring pays a discounted real invoice exactly once and removes future collection', () => {
  let state = foreignInvoice();
  const invoice = state.receivables[0];
  const expected = factorValue(state, invoice);
  assert.ok(expected > 0 && expected < invoice.foreignBalance * state.macro.usd);
  const cash = state.cash;
  state = apply(state, { type: 'factor', receivableId: invoice.id });
  assert.equal(state.cash, cash + expected);
  assert.equal(state.receivables[0].status, 'factored');
  assert.equal(state.orders[0].status, 'settled');
  assert.ok(act(state, { type: 'factor', receivableId: invoice.id }).error);
  assert.equal(factorValue(state, state.receivables[0]), 0);
});

test('foreign receivables settle at payment-week FX and record the resulting exchange gain', () => {
  let state = foreignInvoice('letter-of-credit');
  const invoice = state.receivables[0];
  invoice.dueWeek = state.week;
  state.macro.usd += 1;
  state.seed = 1;
  const expected = Math.round(invoice.foreignBalance * state.macro.usd);
  state = endWeek(state);
  assert.equal(state.receivables[0].status, 'paid');
  assert.equal(state.receivables[0].paidAmount, expected);
  assert.equal(state.receivables[0].fxGain, expected - invoice.amount);
});

test('insured bad debt schedules and receives a partial claim without a second lawsuit', () => {
  let state = foreignInvoice('insured');
  state.receivables[0].dueWeek = state.week;
  state.receivables[0].buyer.credit = 'B';
  state.seed = 7;
  state = endWeek(state);
  const invoice = state.receivables[0];
  assert.equal(invoice.status, 'bad-debt');
  const claim = state.queue.find(item => item.type === 'insurance');
  assert.ok(claim && claim.amount > 0 && claim.amount < invoice.amount * 1.1);
  assert.ok(act(state, { type: 'sue', receivableId: invoice.id }).error);
  const without = structuredClone(state);
  without.queue = without.queue.filter(item => item.type !== 'insurance');
  const yes = forecast(state), no = forecast(without);
  assert.ok(yes.some((point, index) => point.inflow - no[index].inflow === claim.amount));
  for (let i = 0; i < 4 && state.receivables[0].status !== 'insured'; i++) state = week(state);
  assert.equal(state.receivables[0].status, 'insured');
  assert.equal(state.receivables[0].paidAmount, claim.amount);
});

test('export delivery schedules a dated rebate that appears in cash forecast and pays once', () => {
  let state = foreignInvoice();
  const rebate = state.queue.find(item => item.type === 'export-refund');
  assert.ok(rebate && rebate.amount > 0);
  assert.equal(rebate.dueWeek, state.orders[0].deliveredWeek + 4);
  const without = structuredClone(state);
  without.queue = without.queue.filter(item => item.type !== 'export-refund');
  const yes = forecast(state), no = forecast(without);
  assert.ok(yes.some((point, index) => point.inflow - no[index].inflow === rebate.amount));
  for (let i = 0; i < 6 && state.queue.some(item => item.id === rebate.id); i++) state = week(state);
  assert.equal(state.queue.some(item => item.id === rebate.id), false);
  assert.ok(state.log.some(item => item.text.includes('出口退税') && item.text.includes('到账')));
});

test('macroeconomic indices and rival revenue change, and a distressed rival can fail and be acquired', () => {
  const initial = fresh();
  initial.rivals[0].health = 1;
  initial.rivals[0].cash = -9000;
  const state = endWeek(initial);
  assert.notDeepEqual(state.macro, initial.macro);
  assert.ok(state.rivals.some(item => item.revenue > 0));
  assert.equal(state.rivals[0].status, 'failed');
  const sale = state.events.find(item => item.type === 'rival-sale');
  assert.ok(sale);
  const acquired = apply(state, { type: 'resolve-event', eventId: sale.id, choice: 'acquire' });
  assert.equal(acquired.rivals[0].status, 'acquired');
  assert.ok(acquired.inventory.length);
  assert.ok(acquired.cash < state.cash);
});

test('underpaid staff receive a real poaching decision and can be retained at the stated salary', () => {
  const initial = fresh();
  initial.week = 8;
  initial.rivals = [];
  initial.staff[0].salary = 1;
  initial.seed = 7;
  const state = endWeek(initial);
  const event = state.events.find(item => item.type === 'staff-poach');
  assert.ok(event);
  const retained = apply(state, { type: 'resolve-event', eventId: event.id, choice: 'retain' });
  assert.equal(retained.staff[0].salary, event.raise);
  assert.ok(retained.staff[0].salary >= STAFF_ROLES[retained.staff[0].role].salary);
});

test('third delivery creates an illustrated key client and monthly replenishment inquiry', async () => {
  let state = fresh();
  const inquiry = state.inquiries[0];
  state.relationships[inquiry.buyer.id] = { deliveries: 2, rep: 30, buyer: inquiry.buyer, productId: inquiry.productId, market: 'domestic' };
  state = apply(state, { type: 'bid', inquiryId: inquiry.id, source: 'stock', ratio: 80 });
  for (let i = 0; i < 8 && !state.events.some(item => item.type === 'key-client'); i++) state = week(state);
  const event = state.events.find(item => item.type === 'key-client');
  assert.ok(event?.comic);
  await access(new URL(`../${event.comic}`, import.meta.url));
  state = decide(state);
  state.week = 4;
  const arrivals = generateInquiries(state);
  assert.ok(arrivals.some(item => item.repeat && item.buyer.id === inquiry.buyer.id));
});

test('event catalog has selectable consequences and all key-client comics reuse existing art', async () => {
  assert.ok(TRADE_EVENTS.length >= 20);
  assert.equal(new Set(TRADE_EVENTS.map(item => item.id)).size, TRADE_EVENTS.length);
  for (const event of TRADE_EVENTS) assert.ok(event.choices.length >= 2 && event.choices.length <= 3);
  for (const buyer of ['mira', 'samir', 'ines']) for (const event of ['first', 'repeat', 'payment', 'inspection', 'concession']) {
    const art = clientComic(buyer, event);
    assert.ok(art);
    await access(new URL(`../${art}`, import.meta.url));
  }
  assert.equal(MARKETS.length, 8);
});
