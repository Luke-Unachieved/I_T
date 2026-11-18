import test from 'node:test';
import assert from 'node:assert/strict';
import {createDealRoom,reduceDealRoom as reduce,previewOffer,normalizeDealRoom} from '../src/deal-room-engine.js';
import {quoteCommitmentView} from '../src/deal-room-quote-view.js';

const act=(s,type,args={})=>{const n=reduce(s,{type,...args});assert.notEqual(n,s,type);return n;};
const start=()=>{let s=createDealRoom();for(const optionId of ['trial','ready','small']){s=act(s,'PROPOSE',{optionId});s=act(s,'ADVANCE');s=act(s,'NEXT_CLIENT');}return act(act(s,'CONTINUE_BUSINESS'),'ENABLE_ROUND_RECEIVABLES');};
const select=(s,clientId)=>act(s,'SELECT_CLIENT',{clientId});
const sign=(s,optionId)=>act(s,'PROPOSE',{optionId});
const second=(a,b)=>select(act(sign(select(start(),a),'repeat-scale'),'DELIVER_ROUND_ORDER'),b);

test('day 14 own receipt excludes the outstanding Samir balance that only arrives on day 18',()=>{
 const s=second('samir','mira'),before=structuredClone(s),q=previewOffer(s,'repeat-small');assert.equal(q.valid,true);
 assert.deepEqual([s.day,q.paymentDay,q.cashAtOwnPayment,q.projectedSettlementDay,q.cashAfterPayment],[13,14,5880,18,9890]);
 const markup=quoteCommitmentView(s,q,{roundActive:true});assert.match(markup,/第 14 天 · 本单收齐<\/small><strong>¥5,880/);
 assert.match(markup,/第 18 天 · 两单收齐<\/small><strong>¥9,890/);assert.match(markup,/到第 18 天两单结清后预计可用现金 ¥9,890/);
 assert.equal((markup.match(/<circle /g)||[]).length,4);assert.deepEqual(s,before);
 const due=act(sign(s,'repeat-small'),'DELIVER_ROUND_ORDER');assert.deepEqual([due.day,due.cash],[14,5880]);
 assert.ok(!Object.hasOwn(due.contracts.at(-1),'cashAtOwnPayment'));const all=act(due,'WAIT_ROUND_RECEIPT');
 assert.deepEqual([all.day,all.cash],[18,9890]);assert.deepEqual(normalizeDealRoom(all),all);
});

test('all distinct second customers and both quote sizes agree with actual own-day and final cash; do not split a shared or earlier date',()=>{
 const ids=['mira','samir','ines'];let split=0,plain=0;
 for(const a of ids)for(const b of ids.filter(id=>id!==a))for(const option of ['repeat-small','repeat-scale']){
  const s=second(a,b),q=previewOffer(s,option),markup=quoteCommitmentView(s,q,{roundActive:true});assert.equal(q.valid,true,q.reason);
  let running=act(sign(s,option),'DELIVER_ROUND_ORDER');
  while(running.contracts.at(-1).status!=='paid')running=act(running,'WAIT_ROUND_RECEIPT');
  assert.equal(running.day,q.paymentDay);
  if(q.projectedSettlementDay>q.paymentDay){split++;assert.equal(q.cashAtOwnPayment,running.cash);assert.match(markup,/两单收齐/);}
  else {plain++;assert.equal(q.cashAtOwnPayment,undefined);assert.equal(q.cashAfterPayment,running.cash);assert.equal((markup.match(/<circle /g)||[]).length,3);}
  while(running.contracts.some(o=>o.status==='receivable'))running=act(running,'WAIT_ROUND_RECEIPT');
  assert.deepEqual([running.day,running.cash],[q.projectedSettlementDay,q.cashAfterPayment]);
 }
 assert.ok(split>0&&plain>0);
});

test('offline second-customer quote exposes both distinct dated balances without signing the quote',async()=>{
 const vm=await import('node:vm'),{buildDealHtml}=await import('../scripts/build-deal-standalone.mjs');
 const s=second('samir','mira'),code=(await buildDealHtml()).match(/<script>([\s\S]*?)<\/script>/)[1],root={innerHTML:'',querySelector(sel){return sel==='#motion'?{}:null;},querySelectorAll(){return [];}};
 const ctx=vm.createContext({document:{querySelector:()=>root,documentElement:{classList:{contains:()=>false,add(){}}}},localStorage:{getItem:k=>k==='trade-tycoon:deal-room-offline:v1'?JSON.stringify(s):null,setItem(){}},structuredClone,TextEncoder,console});
 new vm.Script(code).runInContext(ctx,{timeout:3000});
 assert.match(root.innerHTML,/第 14 天 · 本单收齐<\/small><strong>¥5,880/);assert.match(root.innerHTML,/第 18 天 · 两单收齐<\/small><strong>¥9,890/);
});
