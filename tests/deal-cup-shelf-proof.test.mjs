import test from 'node:test';import assert from 'node:assert/strict';
import {createDealRoom,reduceDealRoom,quoteOptions,previewOffer} from '../src/deal-room-engine.js';
import {quoteCommitmentView} from '../src/deal-room-quote-view.js';
import {settledUnitPriceGroups} from '../src/deal-room-home.js';
const act=(s,type,more={})=>reduceDealRoom(s,{type,...more});
const finish=(s,id)=>act(act(act(s,'PROPOSE',{optionId:id}),'ADVANCE'),'NEXT_CLIENT');
const again=s=>act(s,'SELECT_CLIENT',{clientId:'samir'});
const open=id=>again(act(['trial',id,'small'].reduce(finish,createDealRoom()),'CONTINUE_BUSINESS'));
const ids=s=>quoteOptions(s).filter(o=>o.id.startsWith('cup-')).map(o=>o.id);
test('only a paid custom cup leads to two costed shelf proofs; ordinary orders still work and later shelf orders reuse only the buyer’s paid layout',()=>{
 assert.deepEqual(ids(open('ready')),[]);const s=open('branded'),prior=structuredClone(s.contracts);
 assert.deepEqual(ids(s),['cup-front-proof','cup-back-proof']);assert.equal(finish(s,'repeat-small').contracts.at(-1).product,'不锈钢保温杯');
 for(const [id,deposit,cost,days,profit] of [['cup-front-proof',0,3360,4,1560],['cup-back-proof',1692,3720,9,1650]]){
  const q=previewOffer(s,id);assert.equal(q.valid,true);assert.equal(q.quantity,120);assert.equal(q.deposit,deposit);assert.equal(q.paymentDay-s.day,days);assert.equal(q.netProfit,profit);
  const html=quoteCommitmentView(s,q);assert.match(html,/核对这次的包装校样/);assert.ok(html.includes(id==='cup-back-proof'?'背面中间另贴':'正面留白'));
  const signed=act(s,'PROPOSE',{optionId:id});assert.equal(signed.cash,s.cash+deposit-cost);assert.deepEqual(signed.contracts.slice(0,-1),prior);
  const paid=act(signed,'ADVANCE');assert.equal(paid.cash,s.cash+profit);assert.equal(paid.day,s.day+days);assert.equal(paid.contracts.at(-1).product,q.proofProduct);
  assert.equal(settledUnitPriceGroups(paid.contracts).find(g=>g.name===q.proofProduct).rows.at(-1).unit,q.revenue/120);
  const repeat=again(act(paid,'NEXT_CLIENT'));assert.deepEqual(ids(repeat),[id]);console.log(id,JSON.stringify({startDay:s.day,startCash:s.cash,afterSigning:signed.cash,delivery:q.deliveryDay,paidDay:paid.day,paidCash:paid.cash}));
 }
});
