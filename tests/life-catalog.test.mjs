import test from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { OUTING_TRIPS, FRIEND_EVENTS } from '../src/deal-room-outings-content.js';
import { FRIEND_OUTINGS, TRAVEL_OUTINGS } from '../v38/data/outing-catalog.js';
import { LIFE_CATALOG, collateral, lifeAssets, outingLockHint } from '../v38/engine/life.js';
import { act, creditLimit, endWeek, netAssets, newGame } from '../v38/engine/game.js';
import { readSave, writeSave } from '../v38/ui/save.js';

function fresh() {
  const state = newGame({ name: '生活验收', assistant: 'fang', seed: 381 });
  state.cash = 6_000_000;
  state.creditLine = creditLimit(state);
  state.energy = 0;
  return state;
}

function apply(state, action) {
  const result = act(state, action);
  assert.equal(result.error, undefined, result.error);
  return result.state;
}

test('the eight home and car choices have ascending, distinct prices and their own artwork', async () => {
  for (const items of [LIFE_CATALOG.properties, LIFE_CATALOG.cars]) {
    assert.equal(items.length, 8);
    assert.equal(new Set(items.map(item => item.id)).size, 8);
    assert.equal(new Set(items.map(item => item.asset)).size, 8);
    assert.ok(items.every((item, i) => Number.isSafeInteger(item.price) && item.price > 0 && (!i || item.price > items[i - 1].price)));
    for (const item of items) await access(new URL(`../${item.asset}`, import.meta.url));
  }
});

test('the eight original destinations and fifty friend activities retain every original choice and lock', async () => {
  assert.equal(TRAVEL_OUTINGS.length, 8);
  assert.equal(FRIEND_OUTINGS.length, 50);
  assert.equal(LIFE_CATALOG.outings.length, 61);
  assert.equal(new Set(LIFE_CATALOG.outings.map(item => item.id)).size, 61);
  for (const old of OUTING_TRIPS) {
    const current = TRAVEL_OUTINGS.find(row => row.id === `trip-${old.id}`);
    assert.equal(current.label, old.name);
    assert.deepEqual(current.choices.map(choice => [choice.id, choice.label, choice.price, choice.text]),
      old.interactions.map(choice => [choice.id, choice.label, old.fare, choice.outcome]));
  }
  for (const old of FRIEND_EVENTS) {
    const current = FRIEND_OUTINGS.find(row => row.id === `friend-${old.id}`);
    assert.equal(current.label, old.name);
    assert.deepEqual(current.choices.map(choice => [choice.id, choice.label, choice.price, choice.text]),
      old.choices.map(choice => [choice.id, choice.label, choice.cost, choice.outcome]));
    if (old.requires) assert.deepEqual(current.requires, { eventId: `friend-${old.requires.eventId}`, choiceId: old.requires.choiceId });
  }
  for (const item of LIFE_CATALOG.outings) {
    const artwork = [item.asset, item.echo?.asset, ...(item.choices ?? []).flatMap(choice => [choice.asset, choice.epilogue?.asset])].filter(Boolean);
    for (const asset of artwork) await access(new URL(`../${asset}`, import.meta.url));
  }
});

test('every expanded home supports purchase, mortgage, release and resale at the disclosed rates', () => {
  for (const item of LIFE_CATALOG.properties) {
    let state = fresh();
    const assets = netAssets(state), cash = state.cash, credit = state.creditLine;
    state = apply(state, { type: 'buy-property', id: item.id });
    assert.equal(state.cash, cash - item.price);
    assert.equal(lifeAssets(state), item.price);
    assert.equal(netAssets(state), assets);
    assert.ok(act(state, { type: 'buy-property', id: item.id }).error);
    state = apply(state, { type: 'mortgage', id: item.id });
    assert.equal(collateral(state), Math.floor(item.price * 0.55));
    assert.equal(state.creditLine - credit, Math.floor(item.price * 0.55));
    assert.ok(act(state, { type: 'sell-property', id: item.id }).error);
    state = apply(state, { type: 'unmortgage', id: item.id });
    state = apply(state, { type: 'sell-property', id: item.id });
    assert.equal(lifeAssets(state), 0);
    assert.equal(collateral(state), 0);
    assert.equal(state.cash, cash - item.price + Math.floor(item.price * 0.85));
  }
});

test('every expanded car can be purchased and sold once for its actual resale value', () => {
  for (const item of LIFE_CATALOG.cars) {
    let state = fresh();
    const cash = state.cash;
    state = apply(state, { type: 'buy-car', id: item.id });
    assert.equal(lifeAssets(state), item.price);
    assert.ok(act(state, { type: 'buy-car', id: item.id }).error);
    state = apply(state, { type: 'sell-car', id: item.id });
    assert.equal(lifeAssets(state), 0);
    assert.equal(state.cash, cash - item.price + Math.floor(item.price * 0.65));
    assert.ok(act(state, { type: 'sell-car', id: item.id }).error);
  }
});

test('each travel route resolves the chosen original scene, price, companion, and one weekly rest', () => {
  for (const trip of TRAVEL_OUTINGS) for (const choice of trip.choices) {
    const before = fresh();
    const state = apply(before, { type: 'outing', id: trip.id, choiceId: choice.id, companionId: 'liang' });
    const result = state.life.latestOuting;
    assert.equal(state.cash, before.cash - choice.price);
    assert.equal(state.energy, choice.energy);
    assert.equal(result.label, trip.label);
    assert.equal(result.companionName, '梁佳音');
    assert.equal(result.text, choice.text);
    assert.equal(result.asset, choice.asset);
    if (choice.epilogue) assert.equal(result.epilogue.text, choice.epilogue.text);
    assert.ok(act(state, { type: 'outing', id: trip.id, choiceId: trip.choices[0].id, companionId: 'solo' }).error);
  }
});

test('friend follow-up options preserve their prerequisite choice and companion across weeks and save reload', () => {
  for (const branch of FRIEND_OUTINGS.filter(item => item.requires)) {
    const source = FRIEND_OUTINGS.find(item => item.id === branch.requires.eventId);
    const required = source.choices.find(choice => choice.id === branch.requires.choiceId);
    let state = fresh();
    delete state.life.memories; // Earlier V38 saves lack the optional memories list.
    assert.ok(outingLockHint(state, branch));
    assert.ok(act(state, { type: 'outing', id: branch.id, choiceId: branch.choices[0].id, companionId: branch.companionId }).error);
    state = apply(state, { type: 'outing', id: source.id, choiceId: required.id, companionId: source.companionId });
    assert.equal(outingLockHint(state, branch), '');
    state = endWeek(state);
    assert.ok(act(state, { type: 'outing', id: branch.id, choiceId: branch.choices[0].id, companionId: 'liang' === branch.companionId ? 'fang' : 'liang' }).error);
    let stored = null;
    const storage = { getItem: () => stored, setItem: (_, raw) => { stored = raw; } };
    assert.equal(writeSave(state, { page: 'offwork' }, null, storage).status, 'ready');
    const loaded = readSave(storage);
    assert.equal(loaded.status, 'ready');
    state = apply(loaded.record.state, { type: 'outing', id: branch.id, choiceId: branch.choices[0].id, companionId: branch.companionId });
    assert.equal(state.life.latestOuting.text, branch.choices[0].text);
    assert.equal(state.life.memories.length, 2);
  }
});

test('choosing the different predecessor branch does not unlock the other episode', () => {
  const branch = FRIEND_OUTINGS.find(item => item.id === 'friend-fang-stool-fit');
  let state = apply(fresh(), { type: 'outing', id: 'friend-fang-stool', choiceId: 'second', companionId: 'fang' });
  state = endWeek(state);
  assert.ok(outingLockHint(state, branch));
  assert.equal(outingLockHint(state, FRIEND_OUTINGS.find(item => item.id === 'friend-fang-stool-note')), '');
  assert.ok(act(state, { type: 'outing', id: branch.id, choiceId: branch.choices[0].id, companionId: 'fang' }).error);
});
