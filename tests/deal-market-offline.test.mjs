import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {buildDealHtml} from '../scripts/build-deal-standalone.mjs';
import {createDealRoom, reduceDealRoom} from '../src/deal-room-engine.js';

const html = await buildDealHtml();
const script = new vm.Script(html.match(/<script>([\s\S]*)<\/script>/)[1]);
const offlineKey = 'trade-tycoon:deal-room-offline:v1';

function act(state, type, fields = {}) {
  const next = reduceDealRoom(state, {type, ...fields});
  assert.notEqual(next, state, type);
  return next;
}

function purchasingDesk() {
  let state = createDealRoom();
  for (const optionId of ['trial', 'ready', 'small']) {
    state = act(state, 'PROPOSE', {optionId});
    state = act(act(state, 'ADVANCE'), 'NEXT_CLIENT');
  }
  for (let i = 0; i < 6; i++) {
    state = act(state, 'OPEN_MARKET');
    state = act(state, 'SIGN_MARKET', {productId:'tray', mode:'bulk', source:'factory', unitPrice:32});
    state = act(act(act(state, 'DELIVER_MARKET'), 'COLLECT_MARKET'), 'CLOSE_MARKET');
  }
  return act(state, 'OPEN_MARKET');
}

// Use a fresh, in-memory browser-storage boundary on each open. Register listeners
// only for buttons that the complete rendered page actually included.
function openOffline(state) {
  const raw = JSON.stringify(state), values = new Map([[offlineKey, raw], [offlineKey + ':adviser', 'fang']]);
  const controls = new Map();
  const root = {
    innerHTML: '',
    querySelector() { return null; },
    querySelectorAll(selector) {
      if (selector !== '[data-market-action]') return [];
      controls.clear();
      return [...this.innerHTML.matchAll(/<button\b[^>]*\bdata-market-action="([^"]+)"[^>]*>/g)].map(([tag, type]) => ({
        dataset: {marketAction:type},
        addEventListener(event, handler) {
          if (event === 'click' && !/\bdisabled\b/.test(tag)) controls.set(type, handler);
        }
      }));
    }
  };
  const context = vm.createContext({
    document: {querySelector:() => root, documentElement:{classList:{contains:() => false}}},
    localStorage: {getItem:key => values.get(key) ?? null, setItem:(key, value) => values.set(key, String(value))},
    TextEncoder, structuredClone, console
  });
  script.runInContext(context, {timeout:3000});
  assert.equal(values.get(offlineKey), raw, 'opening a valid save preserves its bytes');
  return {
    markup:() => root.innerHTML,
    click(type) { assert.ok(controls.has(type), type + ' must be a visible enabled action'); controls.get(type)(); },
    saved:() => JSON.parse(values.get(offlineKey))
  };
}

test('the offline purchase desk resumes ordinary, chain-store and equipment orders from the module entry', () => {
  const ordinary = purchasingDesk();
  const desk = openOffline(ordinary);
  assert.equal((desk.markup().match(/data-market-product="/g) || []).length, 34);
  assert.match(desk.markup(), /林妍/);
  assert.match(desk.markup(), /方文斌/);
  desk.click('REGISTER_NEIGHBORHOOD');
  const registered = act(ordinary, 'REGISTER_NEIGHBORHOOD');
  assert.deepEqual(desk.saved(), registered);

  let booth = act(registered, 'SIGN_MARKET', {productId:'ratchet-set', mode:'neighborhood', source:'factory', unitPrice:103});
  const tools = openOffline(booth);
  assert.match(tools.markup(), /棘轮套筒工具组/);
  for (const type of ['DELIVER_MARKET', 'COLLECT_MARKET']) {
    tools.click(type);
    booth = act(booth, type);
    assert.deepEqual(tools.saved(), booth);
  }
  assert.equal(booth.market.active.netProfit, 14512);

  const project = act(act(act(booth, 'CLOSE_MARKET'), 'OPEN_MARKET'), 'SIGN_EQUIPMENT', {projectId:'cold-chain', shipping:'standard'});
  const coldChain = openOffline(project);
  assert.match(coldChain.markup(), /周岚/);
  assert.match(coldChain.markup(), /核对出运清单/);
  let expected = project;
  for (const type of ['SHIP_EQUIPMENT', 'DELIVER_MARKET', 'COLLECT_MARKET']) {
    coldChain.click(type);
    expected = act(expected, type);
    assert.deepEqual(coldChain.saved(), expected);
  }
  assert.equal(expected.market.active.received, 1200000);
});

test('the offline desk embeds the exact local image for each new project and buyer', async () => {
  const images = ['deal-buyer-lin-yan', 'deal-buyer-zhou-lan', 'deal-buyer-cheng-zhe',
    'deal-project-cold-chain', 'deal-project-automated-warehouse', 'deal-project-filling-line', 'deal-advisers-recovered'];
  for (const name of images) {
    const bytes = await readFile(new URL('../assets/' + name + '.webp', import.meta.url));
    assert.ok(html.includes('data:image/webp;base64,' + bytes.toString('base64')), name);
  }
  assert.doesNotMatch(html, /assets\/deal[\w.-]*\.webp/);
});
