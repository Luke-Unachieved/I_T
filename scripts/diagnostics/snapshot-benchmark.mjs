// Node-only real-state measurements. Recovery is explicit and can be slow.
// Usage: node scripts/diagnostics/snapshot-benchmark.mjs genuine-v2-state.json
import fs from 'node:fs';import assert from 'node:assert/strict';import {performance} from 'node:perf_hooks';
import {encodeDealSnapshot,parseDealSnapshot,recoverDealSnapshot} from '../../src/deal-room-snapshot-v1.js';
import {saveDealProgress,loadDealSave,DEAL_SAVE_KEY} from '../../src/deal-room-ledger-save-v2.js';
const s=JSON.parse(fs.readFileSync(process.argv[2],'utf8')),out={contracts:s.contracts.length,events:s.journal.totalActions};
const timed=(key,f)=>{let start=performance.now();const value=f();out[key]=+(performance.now()-start).toFixed(2);return value;};
const text=timed('encodeMs',()=>encodeDealSnapshot(s));out.snapshotBytes=Buffer.byteLength(text);
const cold=await import('../../src/deal-room-snapshot-v1.js?coldSnapshot');
timed('coldSnapshotParseMs',()=>assert.deepEqual(cold.parseDealSnapshot(text),s));
timed('repeatSnapshotParseMs',()=>assert.deepEqual(parseDealSnapshot(text),s));
const data=new Map([[DEAL_SAVE_KEY,text]]),store={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
timed('loadSaveMs',()=>assert.equal(loadDealSave(store).ok,true));
timed('saveWithPreviousMs',()=>assert.equal(saveDealProgress(store,s).ok,true));
const broken=JSON.parse(text);broken.state.cash++;
const raw=JSON.stringify(broken);assert.throws(()=>parseDealSnapshot(raw));
const result=timed('explicitStrictRecoveryMs',()=>recoverDealSnapshot(raw));
assert.deepEqual(result.state,s);assert.equal(result.originalText,raw);assert.deepEqual(result.changedFields,['cash']);
console.log(JSON.stringify(out,null,2));
