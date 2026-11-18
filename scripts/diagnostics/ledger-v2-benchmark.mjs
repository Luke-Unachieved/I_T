// Cloud Node measurements, not browser/Windows frame timing.
// Usage: node scripts/diagnostics/ledger-v2-benchmark.mjs legacy-state.json [output-v2.json]
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import * as engine from '../../src/deal-room-ledger-v2.js';
import {saveDealProgress,DEAL_SAVE_KEY} from '../../src/deal-room-ledger-save-v2.js';
if(!process.argv[2])throw new Error('Provide a genuine reducer-generated legacy or v2 state JSON');
const out={};
function timed(name,run){const t=performance.now(),result=run();out[name]=+(performance.now()-t).toFixed(2);return result;}
const raw=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
let state=raw.version===2?raw:timed('legacyMigrationMs',()=>engine.migrateDealRoomToV2(raw));
function act(action){const next=engine.reduceSegmentedDealRoom(state,action);assert.notEqual(next,state);state=next;}
timed('growTo2025ContractsMs',()=>{
 while(state.contracts.length<2025){
  if(['review','complete'].includes(state.phase))act({type:'CONTINUE_BUSINESS'});
  if(state.phase==='portfolio')act({type:'SELECT_CLIENT',clientId:'mira'});
  act({type:'PROPOSE',optionId:'repeat-small'});act({type:'ADVANCE'});act({type:'NEXT_CLIENT'});
 }
});
if(process.argv[3])fs.writeFileSync(process.argv[3],JSON.stringify(state));
out.contracts=state.contracts.length;out.totalActions=state.journal.totalActions;
out.jsonBytes=Buffer.byteLength(JSON.stringify(state));
// Independent module has no migration seed or prior verified prefix.
const cold=await import('../../src/deal-room-ledger-v2.js?benchmark-cold');
timed('coldNormalizeMs',()=>assert.deepEqual(cold.normalizeSegmentedDealRoom(state),state));
timed('warmNormalizeMs',()=>assert.deepEqual(cold.normalizeSegmentedDealRoom(state),state));
timed('mainModuleInitialNormalizeMs',()=>assert.deepEqual(engine.normalizeSegmentedDealRoom(state),state));
timed('appendActionsMs',()=>{
 if(['review','complete'].includes(state.phase))act({type:'CONTINUE_BUSINESS'});
 if(state.phase==='portfolio')act({type:'SELECT_CLIENT',clientId:'mira'});
 act({type:'PROPOSE',optionId:'repeat-small'});
});
timed('appendNormalizeMs',()=>engine.normalizeSegmentedDealRoom(state));
const previous=engine.reduceSegmentedDealRoom(state,{type:'ADVANCE'});
engine.normalizeSegmentedDealRoom(previous);
const data=new Map([[DEAL_SAVE_KEY,JSON.stringify(state)]]),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
timed('saveNewAndPreviousMs',()=>assert.equal(saveDealProgress(storage,previous).ok,true));
timed('repeatSaveMs',()=>assert.equal(saveDealProgress(storage,previous).ok,true));
console.log(JSON.stringify(out,null,2));
