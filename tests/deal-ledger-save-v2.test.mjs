import test from 'node:test';
import assert from 'node:assert/strict';
import {createDealRoom,reduceDealRoom} from '../src/deal-room-engine.js';
import {migrateDealRoomToV2,reduceSegmentedDealRoom} from '../src/deal-room-ledger-v2.js';
import {DEAL_SAVE_KEY,DEAL_BACKUP_MAX_BYTES,encodeDealBackup,parseDealBackup,loadDealSave,saveDealProgress,restoreDealBackup} from '../src/deal-room-ledger-save-v2.js';
const storage=()=>{const data=new Map();return {data,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};};
const old=()=>reduceDealRoom(createDealRoom(),{type:'PROPOSE',optionId:'trial'});
const fixture=()=>migrateDealRoomToV2(old());
test('v1 import validates and migrates; v2 export includes exact total and pending contract',()=>{
 const raw=old(),text=JSON.stringify({type:'deal-room',version:1,state:raw});
 const parsed=parseDealBackup(text);assert.deepEqual(parsed.state.contracts,raw.contracts);assert.equal(parsed.summary.actions,1);
 const encoded=encodeDealBackup(parsed.state);assert.equal(JSON.parse(encoded).version,2);
 assert.deepEqual(parseDealBackup(encoded).state,parsed.state);
 const wrong=JSON.parse(encoded);wrong.state.cash++;assert.throws(()=>parseDealBackup(JSON.stringify(wrong)));
 wrong.version=3;assert.throws(()=>parseDealBackup(JSON.stringify(wrong)));
});
test('new isolated keys preserve legacy source and use exact restore summary',()=>{
 const store=storage(),legacyKey='trade-tycoon:deal-room:v1',legacyRaw=JSON.stringify(old());
 store.setItem(legacyKey,legacyRaw);
 const backup=JSON.stringify({type:'deal-room',version:1,state:old()});
 const preview=restoreDealBackup(store,backup);
 assert.equal(preview.needsConfirmation,true);assert.equal(preview.summary.actions,1);
 const restored=restoreDealBackup(store,backup,{confirmed:true,expectedRaw:preview.expectedRaw});
 assert.equal(restored.ok,true);assert.equal(store.getItem(legacyKey),legacyRaw);
 const progressed=reduceSegmentedDealRoom(restored.state,{type:'ADVANCE'});
 assert.equal(saveDealProgress(store,progressed,{expectedRaw:store.getItem(DEAL_SAVE_KEY)}).ok,true);
 assert.deepEqual(loadDealSave(store).state,progressed);
 assert.equal(saveDealProgress(store,progressed,{key:legacyKey}).ok,false);
});
test('save failures, corrupt previous data, CAS conflicts and unreadable originals stay explicit',()=>{
 const s=fixture(),store=storage();assert.equal(saveDealProgress(store,s).ok,true);
 const prior=store.getItem(DEAL_SAVE_KEY);
 assert.equal(saveDealProgress(store,s,{expectedRaw:'wrong'}).status,'conflict');
 assert.equal(store.getItem(DEAL_SAVE_KEY),prior);
 store.setItem(DEAL_SAVE_KEY,'broken');
 assert.equal(saveDealProgress(store,s).ok,false);assert.equal(store.getItem(DEAL_SAVE_KEY),'broken');
 const restored=restoreDealBackup(store,encodeDealBackup(s),{confirmed:true,expectedRaw:'broken'});
 assert.equal(restored.ok,true);assert.equal(store.getItem(DEAL_SAVE_KEY+':unreadable-backup'),'broken');
 const quota={getItem:()=>null,setItem(){throw new Error('QuotaExceededError');}};
 assert.equal(saveDealProgress(quota,s).ok,false);
 const wrongRead={getItem:()=>null,setItem(){}};
 assert.equal(saveDealProgress(wrongRead,s).ok,false);
});
test('restore preserves previous snapshot if main write fails after backup or concurrent source changes',()=>{
 const store=storage(),s=fixture();saveDealProgress(store,s);
 const prior=store.getItem(DEAL_SAVE_KEY),next=reduceSegmentedDealRoom(s,{type:'ADVANCE'});
 const adapter={getItem:store.getItem,setItem(k,v){if(k===DEAL_SAVE_KEY)throw new Error('quota main write');store.setItem(k,v);}};
 assert.equal(restoreDealBackup(adapter,encodeDealBackup(next),{confirmed:true,expectedRaw:prior}).ok,false);
 assert.equal(store.getItem(DEAL_SAVE_KEY),prior);
 assert.equal(store.getItem(DEAL_SAVE_KEY+':before-restore'),prior);
 const racing={getItem:store.getItem,setItem(k,v){store.setItem(k,v);if(k.endsWith(':before-restore'))store.setItem(DEAL_SAVE_KEY,'other tab');}};
 assert.equal(restoreDealBackup(racing,encodeDealBackup(next),{confirmed:true,expectedRaw:prior}).status,'changed');
 assert.equal(store.getItem(DEAL_SAVE_KEY),'other tab');
});
test('backup byte ceiling checks UTF8, not just character count, before parsing',()=>{
 // Synthetic envelope filler only tests I/O byte guard, not a valid economic save.
 const exact=' '.repeat(DEAL_BACKUP_MAX_BYTES);
 assert.throws(()=>parseDealBackup(exact),e=>!/超过 5 MiB/.test(e.message));
 const unicode='中'.repeat(Math.floor(DEAL_BACKUP_MAX_BYTES/3)+1);
 assert.ok(unicode.length<DEAL_BACKUP_MAX_BYTES);
 assert.throws(()=>parseDealBackup(unicode),/超过 5 MiB/);
 assert.throws(()=>parseDealBackup(exact+' '),/超过 5 MiB/);
});
test('v1 original envelope is retained verbatim; failed migration cannot overwrite current save',()=>{
 const store=storage(),text=JSON.stringify({type:'deal-room',version:1,state:old()},null,2);
 const current=fixture();saveDealProgress(store,current);const before=store.getItem(DEAL_SAVE_KEY);
 const failing={getItem:store.getItem,setItem(k,v){if(k.endsWith(':imported-v1'))throw new Error('quota original');store.setItem(k,v);}};
 assert.equal(restoreDealBackup(failing,text,{confirmed:true,expectedRaw:before}).ok,false);
 assert.equal(store.getItem(DEAL_SAVE_KEY),before);
 assert.equal(restoreDealBackup(store,text,{confirmed:true,expectedRaw:before}).ok,true);
 assert.equal(store.getItem(DEAL_SAVE_KEY+':imported-v1'),text);
 const different=JSON.stringify({type:'deal-room',version:1,state:createDealRoom()});
 const now=store.getItem(DEAL_SAVE_KEY);
 assert.equal(restoreDealBackup(store,different,{confirmed:true,expectedRaw:now}).status,'backup-conflict');
 assert.equal(store.getItem(DEAL_SAVE_KEY),now);
 assert.equal(store.getItem(DEAL_SAVE_KEY+':imported-v1'),text);
});
