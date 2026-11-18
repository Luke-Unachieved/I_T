import test from 'node:test';
import assert from 'node:assert/strict';
import {createDealRoom,reduceDealRoom,normalizeDealRoom} from '../src/deal-room-engine.js';
const clone=x=>JSON.parse(JSON.stringify(x));
function fixture(n=30) {
 let s=createDealRoom();
 for(const optionId of ['trial','ready','small'])
  for(const a of [{type:'PROPOSE',optionId},{type:'ADVANCE'},{type:'NEXT_CLIENT'}])s=reduceDealRoom(s,a);
 s=reduceDealRoom(s,{type:'BUY_LIFE_ITEM',itemId:'chair'});
 while(s.history.length<n)s=reduceDealRoom(s,{type:'ARRANGE_LIFE_ITEM',itemId:'chair',position:s.personalLife.positions.chair==='window'?'inside':'window'});
 return s;
}
test('validated replay cache rejects forged balances and all derived fields even for exact histories',()=>{
 const s=fixture(); normalizeDealRoom(s);
 for(const mutate of [x=>x.cash++,x=>x.day++,x=>x.feedback.message+='!',x=>x.personalLife.positions.chair='forged',x=>x.extra=true]){
  const bad=clone(s);mutate(bad);assert.throws(()=>normalizeDealRoom(bad));assert.deepEqual(normalizeDealRoom(s),s);
 }
});
test('input and returned state mutations cannot poison cached snapshots or actions',()=>{
 const original=fixture(32),input=clone(original),out=normalizeDealRoom(input);
 input.cash=999999;input.history[0].optionId='rollout';input.personalLife.positions.chair='wrong';
 out.cash=888888;out.history[0].optionId='rollout';out.personalLife.positions.chair='wrong';
 assert.deepEqual(normalizeDealRoom(original),original);
 assert.throws(()=>normalizeDealRoom(input));assert.throws(()=>normalizeDealRoom(out));
});
test('changed, truncated, divergent and appended history still require correct replay',()=>{
 const old=fixture(34);normalizeDealRoom(old);
 const grown=reduceDealRoom(old,{type:'ARRANGE_LIFE_ITEM',itemId:'chair',position:old.personalLife.positions.chair==='window'?'inside':'window'});
 assert.deepEqual(normalizeDealRoom(grown),grown);
 const shorter=fixture(20);assert.deepEqual(normalizeDealRoom(shorter),shorter);
 for(const mutate of [x=>x.history.pop(),x=>x.history[0].optionId='rollout',x=>x.history.push({type:'FAKE'}),x=>x.history[0].unknown=true]){
  const bad=clone(old);mutate(bad);assert.throws(()=>normalizeDealRoom(bad));
 }
 let different=createDealRoom();different=reduceDealRoom(different,{type:'PROPOSE',optionId:'rollout'});
 assert.deepEqual(normalizeDealRoom(different),different);
});
test('legacy purchase wording remains readable and bounded cache eviction preserves correctness',()=>{
 const old=fixture(10);old.feedback.message=old.feedback.message.replace('这是个人消费，不会提高订单收益。','给自己的下班时间添了一件喜欢的东西。');
 const normalized=normalizeDealRoom(old);
 for(let n=12;n<22;n++)normalizeDealRoom(fixture(n));
 assert.deepEqual(normalizeDealRoom(old),normalized);
 assert.deepEqual(normalizeDealRoom(clone(normalized)),normalized);
});
test('JSON object key order may miss the prefix cache but never changes acceptance',()=>{
 const original=fixture(27);normalizeDealRoom(original);
 const reordered=clone(original);
 reordered.history=reordered.history.map(a=>Object.fromEntries(Object.entries(a).reverse()));
 assert.deepEqual(normalizeDealRoom(reordered),original);
 const changed=clone(reordered);changed.history[0].optionId='rollout';
 assert.throws(()=>normalizeDealRoom(changed));
 assert.deepEqual(normalizeDealRoom(original),original);
});
