import test from 'node:test';
import assert from 'node:assert/strict';
import {createDealRoom,reduceDealRoom} from '../src/deal-room-engine.js';
import {migrateDealRoomToV2,normalizeSegmentedDealRoom} from '../src/deal-room-ledger-v2.js';
import {crc32Utf8,encodeDealSnapshot,parseDealSnapshot,recoverDealSnapshot} from '../src/deal-room-snapshot-v1.js';
import {DEAL_SAVE_KEY,saveDealProgress,loadDealSave,restoreDealBackup} from '../src/deal-room-ledger-save-v2.js';
function fixture(){let s=createDealRoom();for(const optionId of ['trial','ready','small'])for(const a of [{type:'PROPOSE',optionId},{type:'ADVANCE'},{type:'NEXT_CLIENT'}])s=reduceDealRoom(s,a);return migrateDealRoomToV2(s);}
const corrupt=(text,fn)=>{const x=JSON.parse(text);fn(x);return JSON.stringify(x);};
test('CRC32 IEEE vectors and UTF8 Chinese are deterministic',()=>{
 assert.equal(crc32Utf8(''),'00000000');
 assert.equal(crc32Utf8('123456789'),'cbf43926');
 assert.equal(crc32Utf8('外贸账本'),'3e918ebf'); // Independently checked with Python zlib.crc32 UTF-8.
});
test('snapshot roundtrip tolerates object key reorder, not data damage or unknown formats',()=>{
 const s=fixture(),text=encodeDealSnapshot(s);
 const reorder=x=>Array.isArray(x)?x.map(reorder):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).reverse().map(([k,v])=>[k,reorder(v)])):x;
 assert.deepEqual(parseDealSnapshot(JSON.stringify(reorder(JSON.parse(text)))),s);
 for(const mutate of [x=>x.state.cash++,x=>x.version++,x=>x.state.version++,x=>x.integrity.algorithm='new',x=>x.extra=1]){
  assert.throws(()=>parseDealSnapshot(corrupt(text,mutate)));
 }
});
test('checksum is corruption detection, deliberately not economic authentication',()=>{
 const s=fixture();s.cash+=100;
 // With a recomputed checksum and otherwise consistent fields, altered cash can
 // load. Document this explicitly; strict event replay still rejects it.
 assert.deepEqual(parseDealSnapshot(encodeDealSnapshot(s)),s);
 assert.throws(()=>normalizeSegmentedDealRoom(s));
 const bad=fixture();bad.contracts[0].balanceDue++;
 assert.throws(()=>encodeDealSnapshot(bad),/合同账目/);
});
test('explicit recovery distinguishes checksum-only damage from changed business snapshot',()=>{
 const s=fixture(),text=encodeDealSnapshot(s);
 const checksumOnly=corrupt(text,x=>x.integrity.value='00000000');
 assert.throws(()=>parseDealSnapshot(checksumOnly));
 const first=recoverDealSnapshot(checksumOnly);
 assert.deepEqual(first.state,s);assert.deepEqual(first.changedFields,[]);assert.equal(first.originalText,checksumOnly);
 assert.deepEqual(recoverDealSnapshot(corrupt(text,x=>x.integrity.value='broken')).state,s);
 const money=corrupt(text,x=>x.state.cash++);
 const second=recoverDealSnapshot(money);
 assert.deepEqual(second.state,s);assert.deepEqual(second.changedFields,['cash']);assert.equal(second.originalText,money);
 assert.match(second.notice,/现存事件/);
});
test('missing, reordered and unknown events are not silently trimmed in recovery',()=>{
 const text=encodeDealSnapshot(fixture());
 for(const mutate of [
  x=>x.state.journal.segments[0].actions.pop(),
  x=>{const a=x.state.journal.segments[0].actions;[a[0],a[1]]=[a[1],a[0]];},
  x=>x.state.journal.segments[0].actions[0].type='UNKNOWN',
  x=>x.state.history=[],
  x=>x.version=99
 ])assert.throws(()=>recoverDealSnapshot(corrupt(text,mutate)));
});
test('damaged stored snapshot remains untouched until explicit recovered restore preserves original',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 const s=fixture();assert.equal(saveDealProgress(storage,s).ok,true);
 const damaged=corrupt(storage.getItem(DEAL_SAVE_KEY),x=>x.state.cash++);
 storage.setItem(DEAL_SAVE_KEY,damaged);
 assert.equal(loadDealSave(storage).status,'corrupt');
 assert.equal(saveDealProgress(storage,s).ok,false);assert.equal(storage.getItem(DEAL_SAVE_KEY),damaged);
 const recovered=recoverDealSnapshot(damaged),backup=encodeDealSnapshot(recovered.state);
 const preview=restoreDealBackup(storage,backup);assert.equal(preview.needsConfirmation,true);
 assert.equal(storage.getItem(DEAL_SAVE_KEY),damaged);
 assert.equal(restoreDealBackup(storage,backup,{confirmed:true,expectedRaw:preview.expectedRaw}).ok,true);
 assert.equal(storage.getItem(DEAL_SAVE_KEY+':unreadable-backup'),damaged);
 assert.deepEqual(loadDealSave(storage).state,s);
});
test('snapshot writer rejects unknown event shapes and malformed contract identities without replay',()=>{
 const bad=fixture();bad.journal=JSON.parse(JSON.stringify(bad.journal));
 bad.journal.segments[0].actions[0].type='UNKNOWN';
 assert.throws(()=>encodeDealSnapshot(bad),/动作格式/);
 const contract=fixture();contract.contracts[0].clientName={unexpected:'object'};
 assert.throws(()=>encodeDealSnapshot(contract),/合同状态/);
});
