// Run with node --experimental-vm-modules scripts/diagnostics/market-legacy-replay.mjs
// Generate each v1 save in memory using the original reducer, then read it with today's importer.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createContext, SourceTextModule} from 'node:vm';
import {parseDealBackup} from '../../src/deal-room-save.js';

const revision = 'a5960232e8f9f14fb52e22c2cfa78851b100eac8';
const root = fileURLToPath(new URL('../../', import.meta.url));
const modules = new Map();
const context = createContext({structuredClone});

function originalModule(file) {
  assert.match(file, /^src\/deal-room[\w.-]*\.js$/);
  if (!modules.has(file)) {
    const source = execFileSync('git', ['cat-file', 'blob', revision + ':' + file], {cwd:root, encoding:'utf8'});
    modules.set(file, new SourceTextModule(source, {identifier:file, context}));
  }
  return modules.get(file);
}

const engine = originalModule('src/deal-room-engine.js');
await engine.link((specifier, parent) => {
  assert.match(specifier, /^\.\/deal-room[\w.-]*\.js$/);
  return originalModule(path.posix.join(path.posix.dirname(parent.identifier), specifier));
});
await engine.evaluate();
const {createDealRoom, reduceDealRoom} = engine.namespace;
const {MARKET_PRODUCTS} = modules.get('src/deal-room-market-data.js').namespace;
assert.equal(MARKET_PRODUCTS.length, 30);

let verified = 0;
function checkSave(state, stage) {
  const text = JSON.stringify({type:'deal-room', version:1, state});
  const expected = JSON.parse(text).state;
  assert.deepEqual(parseDealBackup(text).state, expected, stage);
  verified++;
  return state;
}

function act(state, type, fields = {}) {
  const next = reduceDealRoom(state, {type, ...fields});
  const label = [state.market?.active?.productId || fields.productId, fields.mode, type].filter(Boolean).join(' ');
  assert.notEqual(next, state, 'Original reducer declined ' + label);
  return checkSave(next, label);
}

let workshop = checkSave(createDealRoom(), 'new game');
for (const optionId of ['trial', 'ready', 'small']) {
  workshop = act(workshop, 'PROPOSE', {optionId});
  workshop = act(workshop, 'ADVANCE');
  workshop = act(workshop, 'NEXT_CLIENT');
}
workshop = act(workshop, 'OPEN_MARKET');

// Each buyer plan starts from the same authentic workshop opening balance.
for (const product of MARKET_PRODUCTS) {
  for (const mode of ['trial', 'bulk']) {
    const source = mode === 'trial' ? 'stock' : 'factory';
    const unitPrice = product.offers[mode].maxUnitPrice;
    let state = act(workshop, 'SIGN_MARKET', {productId:product.id, mode, source, unitPrice});
    state = act(state, 'DELIVER_MARKET');
    if (mode === 'bulk') state = act(state, 'COLLECT_MARKET');
    act(state, 'CLOSE_MARKET');
  }
}

assert.equal(verified, 221);
console.log(JSON.stringify({source:revision, legacyModules:modules.size, products:MARKET_PRODUCTS.length, verifiedSyntheticSaves:verified}));
