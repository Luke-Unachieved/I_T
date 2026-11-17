import test from 'node:test';import assert from 'node:assert/strict';
import {createDealRoom,reduceDealRoom} from '../src/deal-room-engine.js';
import {DEAL_SAVE_KEY,DEAL_BACKUP_MAX_BYTES,encodeDealBackup,parseDealBackup,loadDealSave,saveDealProgress,restoreDealBackup} from '../src/deal-room-save.js';
function storage(seed={}){const map=new Map(Object.entries(seed));return {map,writes:[],getItem(k){return map.has(k)?map.get(k):null;},setItem(k,v){this.writes.push(k);map.set(k,String(v));}};}
const progress=()=>reduceDealRoom(reduceDealRoom(createDealRoom(),{type:'PROPOSE',optionId:'trial'}),{type:'ADVANCE'});
const restore=(store,text)=>{const p=restoreDealBackup(store,text);return restoreDealBackup(store,text,{confirmed:true,expectedRaw:p.expectedRaw});};
test('modern envelope roundtrips strict engine progress and gives a pre-restore summary',()=>{
 const state=progress(),text=encodeDealBackup(state),p=parseDealBackup(text);assert.deepEqual(p.state,state);assert.equal(p.summary.day,state.day);assert.equal(p.summary.cash,state.cash);assert.equal(p.summary.actions,state.history.length);
 const db=storage(),preview=restoreDealBackup(db,text);assert.equal(preview.needsConfirmation,true);assert.equal(preview.expectedRaw,null);assert.deepEqual(db.writes,[]);assert.equal(loadDealSave(db).status,'empty');
});
test('rejects other games, future schema, raw state, extra fields and forged finance',()=>{
 const valid=JSON.parse(encodeDealBackup(progress()));
 for(const value of [{...valid,type:'harbor'},{...valid,version:2},{...valid,extra:true},createDealRoom(),{type:'deal-room',version:1,state:{stage:3,businessRound:1}},null,[],{...valid,state:{...valid.state,cash:999999}}])assert.throws(()=>parseDealBackup(JSON.stringify(value)));
 assert.throws(()=>parseDealBackup('{broken'));assert.throws(()=>encodeDealBackup({...progress(),day:999}));
});
test('5 MiB limit is UTF-8 bytes including envelope, not JavaScript string length',()=>{
 const text=encodeDealBackup(createDealRoom());assert.doesNotThrow(()=>parseDealBackup(text+' '.repeat(DEAL_BACKUP_MAX_BYTES-new TextEncoder().encode(text).byteLength)));
 assert.throws(()=>parseDealBackup(text+' '.repeat(DEAL_BACKUP_MAX_BYTES-new TextEncoder().encode(text).byteLength+1)),/5 MiB/);
 const tooManyUnicode='中'.repeat(Math.floor(DEAL_BACKUP_MAX_BYTES/3)+1);assert.ok(tooManyUnicode.length<DEAL_BACKUP_MAX_BYTES);assert.throws(()=>parseDealBackup(tooManyUnicode),/5 MiB/);
});
test('autosave validates new state and preserves unreadable raw exactly',()=>{
 const raw='\n{"broken":',db=storage({[DEAL_SAVE_KEY]:raw,'original-game-key':'untouched'});
 const read=loadDealSave(db);assert.equal(read.status,'corrupt');assert.equal(read.raw,raw);
 assert.equal(saveDealProgress(db,progress()).ok,false);assert.equal(db.getItem(DEAL_SAVE_KEY),raw);assert.deepEqual(db.writes,[]);
 const empty=storage();assert.equal(saveDealProgress(empty,progress()).ok,true);assert.equal(loadDealSave(empty).status,'valid');
 assert.equal(saveDealProgress(empty,{...progress(),cash:-1}).ok,false);
});
test('confirmed restore preserves corrupt raw first and supports recovering that same bad save again',()=>{
 const raw='bad raw\n',db=storage({[DEAL_SAVE_KEY]:raw}),text=encodeDealBackup(progress());
 const result=restore(db,text);assert.equal(result.ok,true);assert.equal(db.getItem(DEAL_SAVE_KEY+':unreadable-backup'),raw);assert.deepEqual(loadDealSave(db).state,progress());
 db.map.set(DEAL_SAVE_KEY,raw);assert.equal(restore(db,text).ok,true);
 db.map.set(DEAL_SAVE_KEY,'different broken');assert.equal(restore(db,text).status,'backup-conflict');assert.equal(db.getItem(DEAL_SAVE_KEY),'different broken');assert.equal(db.getItem(DEAL_SAVE_KEY+':unreadable-backup'),raw);
});
test('normal recovery preserves previous valid progress and never touches old game keys',()=>{
 const old=JSON.stringify(createDealRoom()),db=storage({[DEAL_SAVE_KEY]:old,'trade-tycoon:opening:v1':'old-port'});assert.equal(restore(db,encodeDealBackup(progress())).ok,true);assert.equal(db.getItem(DEAL_SAVE_KEY+':before-restore'),old);assert.equal(db.getItem('trade-tycoon:opening:v1'),'old-port');
 const invalid=restoreDealBackup(db,encodeDealBackup(progress()),{key:'trade-tycoon:opening:v1',confirmed:true,expectedRaw:'old-port'});assert.equal(invalid.ok,false);assert.equal(db.getItem('trade-tycoon:opening:v1'),'old-port');
 const offline=storage();assert.equal(saveDealProgress(offline,progress(),{key:'trade-tycoon:deal-room-offline:v1'}).ok,true);assert.equal(offline.getItem(DEAL_SAVE_KEY),null);
});
test('parse/cancel and changed-progress confirmation never overwrite current data',()=>{
 const db=storage({[DEAL_SAVE_KEY]:JSON.stringify(createDealRoom())}),text=encodeDealBackup(progress());
 assert.equal(restoreDealBackup(db,'invalid',{confirmed:true,expectedRaw:db.getItem(DEAL_SAVE_KEY)}).ok,false);assert.deepEqual(db.writes,[]);
 assert.equal(restoreDealBackup(db,text,{confirmed:true}).status,'changed');const p=restoreDealBackup(db,text);db.map.set(DEAL_SAVE_KEY,JSON.stringify(progress()));assert.equal(restoreDealBackup(db,text,{confirmed:true,expectedRaw:p.expectedRaw}).status,'changed');assert.deepEqual(db.writes,[]);
});
test('quota denial and readback failure never claim success; backup failure leaves current raw',()=>{
 const text=encodeDealBackup(progress()),raw='unreadable',db=storage({[DEAL_SAVE_KEY]:raw});db.setItem=()=>{throw new Error('quota');};assert.equal(restore(db,text).ok,false);assert.equal(db.getItem(DEAL_SAVE_KEY),raw);
 const denied=storage();denied.setItem=()=>{throw new Error('quota');};assert.equal(saveDealProgress(denied,progress()).ok,false);
 const silent=storage();silent.setItem=()=>{};assert.equal(saveDealProgress(silent,progress()).ok,false);assert.equal(restore(silent,text).ok,false);
 const inaccessible={getItem(){throw new Error('denied');}};assert.equal(loadDealSave(inaccessible).status,'unavailable');assert.equal(restoreDealBackup(inaccessible,text).ok,false);
 const failFinal=storage({[DEAL_SAVE_KEY]:raw});const write=failFinal.setItem;failFinal.setItem=function(k,v){if(k===DEAL_SAVE_KEY)throw new Error('quota');write.call(this,k,v);};assert.equal(restore(failFinal,text).ok,false);assert.equal(failFinal.getItem(DEAL_SAVE_KEY),raw);assert.equal(failFinal.getItem(DEAL_SAVE_KEY+':unreadable-backup'),raw);
});

test('retained copies are read-only, modern-key scoped and independently validated',()=>{
 const valid=JSON.stringify(progress()),raw='bad original\n',db=storage({[DEAL_SAVE_KEY]:'main untouched',[DEAL_SAVE_KEY+':before-restore']:valid,[DEAL_SAVE_KEY+':unreadable-backup']:raw,'old:before-restore':valid});
 const before=loadDealSave(db,DEAL_SAVE_KEY,{copy:'before-restore'});assert.equal(before.status,'valid');assert.deepEqual(parseDealBackup(encodeDealBackup(before.state)).state,progress());
 assert.equal(loadDealSave(db,DEAL_SAVE_KEY,{copy:'unreadable-backup'}).raw,raw);assert.equal(loadDealSave(db,DEAL_SAVE_KEY,{copy:'unreadable-backup'}).status,'corrupt');
 assert.equal(loadDealSave(db,DEAL_SAVE_KEY,{copy:'focus'}).status,'unavailable');assert.equal(loadDealSave(db,'old',{copy:'before-restore'}).status,'unavailable');assert.equal(loadDealSave(storage(),DEAL_SAVE_KEY,{copy:'before-restore'}).status,'empty');assert.deepEqual(db.writes,[]);assert.equal(db.getItem(DEAL_SAVE_KEY),'main untouched');
 const offline='trade-tycoon:deal-room-offline:v1',local=storage({[offline+':before-restore']:valid});assert.equal(loadDealSave(local,offline,{copy:'before-restore'}).status,'valid');assert.equal(loadDealSave(local,DEAL_SAVE_KEY,{copy:'before-restore'}).status,'empty');
});
