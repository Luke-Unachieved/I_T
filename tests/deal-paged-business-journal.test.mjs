import test from 'node:test';
import assert from 'node:assert/strict';
import {createDealRoom,reduceDealRoom,normalizeDealRoom} from '../src/deal-room-engine.js';
import {encodeDealBackup,parseDealBackup} from '../src/deal-room-save.js';
const len=s=>s.history.length+(s.historyPages||[]).flat().length;
const take=(s,type,extra={})=>{const n=reduceDealRoom(s,{type,...extra});assert.notEqual(n,s,type);return n;};
function opening(){let s=createDealRoom();for(const optionId of ['trial','ready','small']){s=take(s,'PROPOSE',{optionId});s=take(s,'ADVANCE');s=take(s,'NEXT_CLIENT');}return s;}
function finish(s){s=take(s,'SELECT_CLIENT',{clientId:'mira'});s=take(s,'PROPOSE',{optionId:'repeat-small'});s=take(s,'ADVANCE');return take(s,'NEXT_CLIENT');}
test('4096 prior real actions, including paid orders: migration, new deal, backup, tamper detection',async()=>{
 let s=opening(),rounds=0;
 while(len(s)<4096){
  if(s.phase!=='portfolio')s=take(s,'CONTINUE_BUSINESS');
  else if(++rounds%80===0&&len(s)<4000)s=finish(s);
  else s=take(s,'BACK_FROM_CLIENTS');
 }
 assert.equal(len(s),4096);assert.ok(s.contracts.length>20);
 const {historyPages,history,...game}=s,flat={...structuredClone(game),history:[...historyPages.flat(),...history]};
 const oldText=JSON.stringify(flat),fixed=normalizeDealRoom(flat);
 assert.equal(JSON.stringify(flat),oldText);assert.deepEqual(fixed,s);
 const cold=await import('../src/deal-room-engine.js?long-business-cold');
 assert.deepEqual(cold.normalizeDealRoom(JSON.parse(JSON.stringify(fixed))),fixed);
 if(s.phase!=='portfolio')s=take(s,'CONTINUE_BUSINESS');
 const cash=s.cash,contracts=structuredClone(s.contracts);
 s=finish(s);assert.ok(len(s)>4096);assert.equal(s.contracts.at(-1).status,'paid');
 assert.ok(s.cash>cash);assert.deepEqual(s.contracts.slice(0,-1),contracts);
 const backup=parseDealBackup(encodeDealBackup(s));assert.equal(backup.summary.actions,len(s));assert.deepEqual(backup.state,s);
 for(const mutate of [x=>x.cash++,x=>x.historyPages[0][0]={type:'ADVANCE'},x=>x.historyPages[0].pop(),x=>x.historyPages.reverse()]){
  const edited=structuredClone(s);mutate(edited);assert.throws(()=>normalizeDealRoom(edited));
 }
 const legacyTamper={...flat,cash:flat.cash+1};assert.throws(()=>normalizeDealRoom(legacyTamper));
});
