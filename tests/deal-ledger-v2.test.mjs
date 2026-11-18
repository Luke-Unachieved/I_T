import test from 'node:test';
import assert from 'node:assert/strict';
import {createDealRoom,reduceDealRoom} from '../src/deal-room-engine.js';
import {createSegmentedDealRoom,migrateDealRoomToV2,reduceSegmentedDealRoom,normalizeSegmentedDealRoom} from '../src/deal-room-ledger-v2.js';
const clone=x=>JSON.parse(JSON.stringify(x));
function firstThree(){let s=createDealRoom();for(const optionId of ['trial','ready','small'])for(const a of [{type:'PROPOSE',optionId},{type:'ADVANCE'},{type:'NEXT_CLIENT'}])s=reduceDealRoom(s,a);return s;}
const business=s=>{const {version,history,journal,...rest}=s;return rest;};
test('v2 migration validates legacy and preserves every business field and journal event',()=>{
 const old=firstThree(),v=migrateDealRoomToV2(old);
 assert.deepEqual(business(v),business(old));assert.deepEqual(v.journal.segments[0].actions,old.history);
 assert.equal(v.journal.totalActions,9);assert.deepEqual(normalizeSegmentedDealRoom(v),v);
 const bad=clone(old);bad.cash++;assert.throws(()=>migrateDealRoomToV2(bad));
 assert.deepEqual(normalizeSegmentedDealRoom(createSegmentedDealRoom()),createSegmentedDealRoom());
});
test('three commercial navigation segments retain all events and correct final state',()=>{
 let s=migrateDealRoomToV2(firstThree());
 for(let i=0;i<3200;i++){
  const action={type:i%2?'BACK_FROM_CLIENTS':'CONTINUE_BUSINESS'};
  const next=reduceSegmentedDealRoom(s,action);assert.notEqual(next,s);s=next;
 }
 assert.equal(s.journal.segments.length,4);assert.equal(s.journal.totalActions,3209);
 assert.deepEqual(normalizeSegmentedDealRoom(s),s);
 for(const change of [
  x=>x.cash++,x=>x.journal.totalActions++,x=>x.history[0].type='FAKE',
  x=>x.journal.segments.reverse(),x=>x.journal.segments.splice(1,1),
  x=>x.journal.segments[1].actions[0].type='FAKE',x=>x.journal.extra=1,
  x=>x.journal.segments[0].kind='actions'
 ]){const bad=clone(s);change(bad);assert.throws(()=>normalizeSegmentedDealRoom(bad));}
});
test('an unsettled contract crosses a segment boundary without changing settlement',()=>{
 let old=firstThree();
 // 1013 navigation events plus 9 legacy => choose v2 activity length precisely.
 let s=migrateDealRoomToV2(old);
 for(let i=0;i<1020;i++)s=reduceSegmentedDealRoom(s,{type:i%2?'BACK_FROM_CLIENTS':'CONTINUE_BUSINESS'});
 s=reduceSegmentedDealRoom(s,{type:'CONTINUE_BUSINESS'});
 s=reduceSegmentedDealRoom(s,{type:'SELECT_CLIENT',clientId:'mira'});
 assert.equal(s.history.length,1023);
 const before=clone(s);
 s=reduceSegmentedDealRoom(s,{type:'PROPOSE',optionId:'repeat-small'});
 assert.equal(s.history.length,1);assert.equal(s.phase,'fulfilling');
 assert.deepEqual(normalizeSegmentedDealRoom(s),s);
 const signed=s.contracts.at(-1);
 s=reduceSegmentedDealRoom(s,{type:'ADVANCE'});
 assert.equal(s.cash,before.cash-signed.cost+signed.revenue-signed.operatingCost);
 assert.equal(s.contracts.at(-1).status,'paid');
 assert.deepEqual(normalizeSegmentedDealRoom(s),s);
});
test('archives are immutable and caller-owned input cannot alias new output',()=>{
 const original=migrateDealRoomToV2(firstThree()),raw=clone(original);
 const next=reduceSegmentedDealRoom(raw,{type:'CONTINUE_BUSINESS'});
 raw.journal.segments[0].actions[0].optionId='forged';
 assert.equal(next.journal.segments[0].actions[0].optionId,'trial');
 assert.throws(()=>{next.journal.segments[0].actions[0].optionId='forged';});
 assert.deepEqual(normalizeSegmentedDealRoom(next),next);
});
