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
test('verified cache spans segment rollover and rejects changed archives with unchanged activity',()=>{
 let s=migrateDealRoomToV2(firstThree());
 for(let i=0;i<1030;i++){
  s=reduceSegmentedDealRoom(s,{type:i%2?'BACK_FROM_CLIENTS':'CONTINUE_BUSINESS'});
  if(i>=1018)assert.deepEqual(normalizeSegmentedDealRoom(s),s);
 }
 const bad=clone(s);bad.journal.segments[0].actions[0].optionId='rollout';
 assert.throws(()=>normalizeSegmentedDealRoom(bad));
 const input=clone(s),result=normalizeSegmentedDealRoom(input);
 input.cash++;input.journal.segments[0].actions[0].optionId='forged';result.cash++;
 assert.deepEqual(normalizeSegmentedDealRoom(s),s);
 assert.throws(()=>normalizeSegmentedDealRoom(result));
});
test('cache eviction and forced size-limit bypass preserve verified results',async()=>{
 const {readFile}=await import('node:fs/promises');
 const url=new URL('../src/deal-room-ledger-v2.js',import.meta.url);
 let source=await readFile(url,'utf8');
 source=source.replace(/from '\.\/([^']+)'/g,(_,file)=>"from '"+new URL(file,url).href+"'");
 // Test-only tiny limit exercises the same production oversized-entry bypass.
 // This is not a claim to have benchmarked a >1M-character economic save.
 source=source.replace('const CACHE_BYTES=32*1024*1024;','const CACHE_BYTES=1;');
 const uncached=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 let s=migrateDealRoomToV2(firstThree());const oldest=clone(s);
 for(let i=0;i<10;i++){
  s=reduceSegmentedDealRoom(s,{type:i%2?'BACK_FROM_CLIENTS':'CONTINUE_BUSINESS'});
  assert.deepEqual(normalizeSegmentedDealRoom(s),uncached.normalizeSegmentedDealRoom(s));
 }
 assert.deepEqual(normalizeSegmentedDealRoom(oldest),uncached.normalizeSegmentedDealRoom(oldest));
 const bad=clone(s);bad.cash++;
 assert.throws(()=>uncached.normalizeSegmentedDealRoom(bad));
});
test('weighted LRU bounds retained UTF16 bytes and count, and refreshes accessed prefixes',async()=>{
 const {readFile}=await import('node:fs/promises');
 const url=new URL('../src/deal-room-ledger-v2.js',import.meta.url);
 let source=await readFile(url,'utf8');
 source=source.replace(/from '\.\/([^']+)'/g,(_,file)=>"from '"+new URL(file,url).href+"'");
 // Test-only access to cache metrics; not a product API.
 source+='\nexport function cacheMetrics(){return {bytes:verifiedBytes,entries:verified.map(s=>({bytes:2*s.length,total:JSON.parse(s).total})),budget:CACHE_BYTES};}\n';
 const mod=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 let state=mod.migrateDealRoomToV2(firstThree());const snapshots=[state];
 for(let i=0;i<3;i++){state=mod.reduceSegmentedDealRoom(state,{type:i%2?'BACK_FROM_CLIENTS':'CONTINUE_BUSINESS'});mod.normalizeSegmentedDealRoom(state);snapshots.push(state);}
 mod.normalizeSegmentedDealRoom(snapshots[0]);
 state=mod.reduceSegmentedDealRoom(state,{type:'BACK_FROM_CLIENTS'});mod.normalizeSegmentedDealRoom(state);
 let metrics=mod.cacheMetrics();assert.equal(metrics.entries.length,4);
 assert.ok(metrics.entries.some(e=>e.total===9));assert.ok(!metrics.entries.some(e=>e.total===10));
 assert.equal(metrics.bytes,metrics.entries.reduce((n,e)=>n+e.bytes,0));assert.ok(metrics.bytes<=metrics.budget);
 // Choose a tiny budget that fits one real entry, but not two; this exercises
 // weighted eviction independently of the four-entry count.
 const budget=Math.max(...metrics.entries.map(e=>e.bytes))+64;
 const tinySource=source.replace('const CACHE_BYTES=32*1024*1024;',`const CACHE_BYTES=${budget};`);
 const tiny=await import('data:text/javascript;base64,'+Buffer.from(tinySource).toString('base64'));
 for(const snap of snapshots)assert.deepEqual(tiny.normalizeSegmentedDealRoom(snap),snap);
 metrics=tiny.cacheMetrics();assert.equal(metrics.entries.length,1);assert.ok(metrics.bytes<=budget);
 assert.deepEqual(tiny.normalizeSegmentedDealRoom(snapshots[0]),snapshots[0]);
});
