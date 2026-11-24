import test from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { newGame, act, endWeek, forecast, netAssets, creditLimit } from '../v38/engine/game.js';
import { quote, generateInquiries } from '../v38/engine/quotes.js';
import { ACHIEVEMENTS, biography, ipoProgress, nationalRank, stockPurchaseQuote, valuation, ventureProgress } from '../v38/engine/strategy.js';
import { collateral, LIFE_CATALOG } from '../v38/engine/life.js';
import { ERAS } from '../v38/data/strategy.js';

const fresh = options => newGame({ name: '长线功能验收', assistant: 'fang', seed: 381, ...options });
const apply = (state, action) => {
  const result = act(state, action);
  assert.equal(result.error, undefined, `${action.type}: ${result.error}`);
  return result.state;
};
const ready = state => {
  let next = state;
  for (let i = 0; next.events.length && i < 20; i++) {
    const event = next.events[0];
    next = apply(next, { type: 'resolve-event', eventId: event.id, choice: event.choices.at(-1).id });
  }
  return next;
};
const week = state => endWeek(ready(state));

test('all five eras can start and fire their first scheduled shock on its specified week', () => {
  assert.equal(ERAS.length, 5);
  for (const era of ERAS) {
    let state = fresh({ era: era.id });
    state.cash = 200000; // Calendar fixture; each era otherwise uses its own real initialization.
    assert.equal(state.startYear, era.year);
    for (const [key, value] of Object.entries(era.initial)) assert.equal(state.macro[key], value);
    const event = era.schedule[0];
    while (state.week < event.week) state = week(state);
    const before = { ...state.macro };
    state = week(state);
    assert.ok(state.log.some(item => item.type === 'era' && item.text.includes(event.title)), era.id);
    assert.ok(state.chronicle.some(item => item.type === 'era' && item.text.includes(event.title)), era.id);
    for (const [key, change] of Object.entries(event.changes ?? {})) assert.ok((state.macro[key] - before[key]) * change > 0, `${era.id}: ${key}`);
    if (event.policy) assert.ok(state.policies.some(item => item.title === event.title && item.untilWeek > state.week));
    state = week(state);
    assert.equal(state.chronicle.filter(item => item.type === 'era' && item.text.includes(event.title)).length, 1);
  }
});

test('origins and difficulty initialize actual capital, factory ownership, relationship and risk', () => {
  const regular = fresh();
  const heir = fresh({ origin: 'factory-heir' });
  const buyer = fresh({ origin: 'buyer' });
  const casual = fresh({ difficulty: 'casual' });
  const hard = fresh({ difficulty: 'hard' });
  assert.equal(heir.cash, 32000);
  assert.equal(heir.ventures.factory['餐桌器具'], 1);
  assert.ok(netAssets(heir) > heir.cash);
  assert.equal(buyer.company.rep, 72);
  assert.equal(buyer.relationships.mira.deliveries, 3);
  assert.ok(casual.cash > regular.cash && hard.cash < regular.cash);
  assert.ok(casual.riskMultiplier < regular.riskMultiplier && hard.riskMultiplier > regular.riskMultiplier);
});

test('all five industry investments consume real funds, preserve book assets and have actual effects', () => {
  let state = fresh();
  state.cash = 1000000;
  state.company.certs = ['export', 'audit'];
  state.company.markets = ['domestic', 'se-asia'];
  const beforeAssets = netAssets(state);
  const original = quote(state, state.inquiries[0], { source: 'stock', ratio: 97 });
  state = apply(state, { type: 'invest-venture', id: 'warehouse' });
  const warehouse = quote(state, state.inquiries[0], { source: 'stock', ratio: 97 });
  assert.ok(warehouse.productionWeeks < original.productionWeeks);
  state = apply(state, { type: 'invest-venture', id: 'factory', target: '咖啡与餐厨' });
  state = apply(state, { type: 'invest-venture', id: 'overseas', target: 'se-asia' });
  state = apply(state, { type: 'invest-venture', id: 'brand' });
  state = apply(state, { type: 'invest-venture', id: 'ecommerce' });
  assert.equal(netAssets(state), beforeAssets);
  assert.ok(state.company.certs.includes('brand'));
  assert.equal(ventureProgress(state).filter(item => item.options.some(option => option.level > 0)).length, 5);
  const next = endWeek(state);
  assert.ok(next.summary.revenue > 0);
  assert.ok(next.log.some(item => item.type === 'retail'));
  assert.ok(next.summary.outflow > 1200);
  assert.ok(next.achievements.includes('warehouse') && next.achievements.includes('web-store'));
});

test('factory investments lower their actual category costs and overseas warehouses remove the route leg', () => {
  let state = fresh();
  state.cash = 500000;
  state.week = 2;
  state.inquiries = generateInquiries(state);
  const samir = state.inquiries.find(item => item.buyer.id === 'samir');
  const base = quote(state, samir, { source: 'factory', ratio: 97 });
  assert.equal(base.error, undefined);
  state = apply(state, { type: 'invest-venture', id: 'factory', target: samir.category });
  const owned = quote(state, samir, { source: 'factory', ratio: 97 });
  assert.ok(owned.cost < base.cost);
  assert.ok(owned.productionWeeks <= base.productionWeeks);
  state.company.certs.push('export');
  state.company.markets.push('se-asia');
  state.week = 4;
  state.inquiries = generateInquiries(state);
  const inquiry = state.inquiries.find(item => item.market === 'se-asia');
  const standard = quote(state, inquiry, { source: 'stock', ratio: 97 });
  state = apply(state, { type: 'invest-venture', id: 'overseas', target: 'se-asia' });
  const local = quote(state, inquiry, { source: 'stock', ratio: 97 });
  assert.equal(local.shippingWeeks, 0);
  assert.ok(local.deliverWeek < standard.deliverWeek);
});

test('facilities can upgrade only three times and warehouse stocking creates paid, usable inventory', () => {
  let state = fresh();
  state.cash = 500000;
  assert.ok(stockPurchaseQuote(state, 'tray', 36).error);
  for (let i = 0; i < 3; i++) state = apply(state, { type: 'invest-venture', id: 'warehouse' });
  assert.equal(state.ventures.warehouse, 3);
  assert.ok(act(state, { type: 'invest-venture', id: 'warehouse' }).error);
  const cost = stockPurchaseQuote(state, 'tray', 72);
  const assets = netAssets(state), cash = state.cash;
  state = apply(state, { type: 'purchase-stock', productId: 'tray', quantity: 72 });
  assert.equal(state.cash, cash - cost.cost);
  assert.equal(state.inventory.reduce((sum, item) => sum + item.quantity, 0), 72);
  assert.equal(netAssets(state), assets);
  assert.ok(stockPurchaseQuote(state, 'tray', 99999).error);
});

test('registered brands accept an explicit price above the buyer target without bypassing every refusal', () => {
  let state = fresh();
  assert.ok(act(state, { type: 'invest-venture', id: 'brand' }).error);
  state.cash = 100000;
  state.company.certs = ['audit'];
  state = apply(state, { type: 'invest-venture', id: 'brand' });
  const inquiry = state.inquiries[0];
  const premium = quote(state, inquiry, { source: 'stock', ratio: 100, branded: true, brandUnitPrice: inquiry.targetPrice + 8 });
  assert.equal(premium.error, undefined);
  assert.ok(premium.unitPrice > inquiry.targetPrice);
  assert.ok(premium.branded && premium.probability > 0 && premium.probability < 1);
  assert.ok(quote(state, inquiry, { source: 'stock', branded: true, brandUnitPrice: Number.NaN }).error);
});

test('annual targets settle their actual bonus and renew the goal for the next year', () => {
  let state = fresh();
  state.cash = 200000;
  state.week = 52;
  state.year.revenue = state.year.goal.revenue + 100000;
  state.year.profit = state.year.goal.profit + 100000;
  state.year.deliveries = 12;
  const bonus = state.year.goal.bonusCash;
  const failing = structuredClone(state);
  failing.year.revenue = 0;
  const missed = endWeek(failing);
  state = endWeek(state);
  assert.equal(state.summary.annual.goal.met, true);
  assert.equal(state.year.records[0].goal.met, true);
  assert.equal(state.cash - missed.cash, bonus);
  assert.ok(state.year.goal.revenue > state.year.records[0].goal.revenue);
  assert.ok(state.achievements.includes('annual-goal'));
});

test('IPO enforces three real funding stages and allows continued operation after the celebration', () => {
  let state = fresh();
  assert.ok(act(state, { type: 'ipo' }).error);
  state.cash = 500000;
  state.week = 105;
  state.company.rep = 88;
  state.cumulativeRevenue = 2600000;
  state.history = Array.from({ length: 52 }, (_, i) => ({ week: 53 + i, revenue: 25000, profit: 4000, cash: 500000, rep: 88 }));
  state.year.records = [{ number: 1, profit: 120000 }, { number: 2, profit: 130000 }];
  assert.ok(ipoProgress(state, netAssets(state)).actions[0].available);
  assert.ok(valuation(state, netAssets(state)) > netAssets(state));
  assert.ok(nationalRank(state) < nationalRank(fresh()));
  const cash = state.cash;
  state = apply(state, { type: 'strategic-investment' });
  assert.equal(state.listing.stage, 'funded');
  assert.ok(state.cash > cash && state.listing.stake < 100);
  state = apply(state, { type: 'restructure' });
  assert.equal(state.listing.stage, 'corporation');
  state = apply(state, { type: 'ipo' });
  assert.equal(state.listing.stage, 'public');
  assert.ok(state.achievements.includes('ipo'));
  assert.ok(state.events.some(item => item.type === 'ipo-celebration'));
  assert.ok(act(state, { type: 'ipo' }).error);
  assert.match(biography(state).join(''), /完成上市/);
  const continued = week(state);
  assert.equal(continued.week, state.week + 1);
  assert.equal(continued.listing.stage, 'public');
});

test('achievement catalog and company chronicle are distinct, finite and based on business actions', () => {
  assert.ok(ACHIEVEMENTS.length >= 30 && ACHIEVEMENTS.length <= 40);
  assert.equal(new Set(ACHIEVEMENTS.map(item => item.id)).size, ACHIEVEMENTS.length);
  let state = fresh();
  state = apply(state, { type: 'bid', inquiryId: state.inquiries[0].id, source: 'stock', ratio: 80 });
  assert.ok(state.achievements.includes('quote'));
  state = endWeek(state);
  assert.ok(state.achievements.includes('won'));
  assert.ok(state.chronicle.some(item => item.type === 'founded'));
  assert.match(biography(state).join(''), /2026 年成立/);
});

test('a property remains a real asset, mortgage adds credit without cash, and collateral cannot be double-used', () => {
  let state = fresh();
  state.cash = 300000;
  const assets = netAssets(state);
  state = apply(state, { type: 'buy-property', id: 'city-flat' });
  assert.equal(netAssets(state), assets);
  const before = creditLimit(state), cash = state.cash;
  state = apply(state, { type: 'mortgage', id: 'city-flat' });
  assert.equal(state.cash, cash);
  assert.equal(creditLimit(state) - before, Math.floor(62000 * 0.55));
  assert.equal(state.creditLine, creditLimit(state));
  assert.equal(collateral(state), Math.floor(62000 * 0.55));
  assert.ok(act(state, { type: 'mortgage', id: 'city-flat' }).error);
  assert.ok(act(state, { type: 'sell-property', id: 'city-flat' }).error);
  state = apply(state, { type: 'borrow', amount: state.creditLine });
  assert.ok(act(state, { type: 'unmortgage', id: 'city-flat' }).error);
});

test('cars can be enjoyed as assets and sold only once at the disclosed discount', () => {
  let state = fresh();
  state.cash = 100000;
  const assets = netAssets(state), cash = state.cash;
  state = apply(state, { type: 'buy-car', id: 'hatch' });
  assert.equal(netAssets(state), assets);
  assert.ok(state.life.cars.includes('hatch'));
  state = apply(state, { type: 'sell-car', id: 'hatch' });
  assert.equal(state.cash, cash - 21800 + Math.floor(21800 * 0.65));
  assert.ok(act(state, { type: 'sell-car', id: 'hatch' }).error);
});

test('fast advancement consumes more energy, low energy affects quotes and one paid outing restores it', () => {
  const initial = fresh();
  const slow = endWeek(initial);
  const fast = apply(initial, { type: 'advance-four' });
  assert.ok(initial.energy > slow.energy);
  assert.ok(fast.energy < initial.energy - (fast.week - initial.week));
  let tired = fresh();
  const normal = quote(tired, tired.inquiries[0], { source: 'stock', ratio: 97 });
  tired.energy = 10;
  const low = quote(tired, tired.inquiries[0], { source: 'stock', ratio: 97 });
  assert.ok(low.probability < normal.probability);
  const cash = tired.cash;
  tired = apply(tired, { type: 'outing', id: 'flower-market' });
  assert.equal(tired.energy, 24);
  assert.equal(tired.cash, cash - 240);
  assert.ok(act(tired, { type: 'outing', id: 'flower-market' }).error);
});

test('all life and industry illustrations reuse existing local assets', async () => {
  for (const group of Object.values(LIFE_CATALOG)) for (const item of group) await access(new URL(`../${item.asset}`, import.meta.url));
  for (const venture of ventureProgress(fresh())) await access(new URL(`../${venture.asset}`, import.meta.url));
});
