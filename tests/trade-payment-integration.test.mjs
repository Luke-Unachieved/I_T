import test from 'node:test';
import assert from 'node:assert/strict';
import {createTradeGame,reduceTrade,quoteOrder,parseTradeSave,fxRateAt,dayToWeek} from '../src/trade-economy.js';
function sign(kind,paymentTerms,fxMode){
 let s=createTradeGame('付款方案守恒');s.cash=100000;
 for(let n=0;n<10;n++){
  const offer=s.offers.find(o=>o.kind===kind),opts={paymentTerms,fxMode,markup:-5};
  const q=quoteOrder(s,offer.id,opts),cash=s.cash;
  s=reduceTrade(s,{type:'ACCEPT',offerId:offer.id,...opts}).state;
  if(s.active.length)return {s,q,cash};
  s=reduceTrade(s,{type:'ADVANCE_DAYS',days:7}).state;
 }
 throw new Error('Could not sign fixture');
}
function run(state,step){
 let s=structuredClone(state),operating=0;const due=s.active[0].dueDay;
 while(s.day<due){const r=reduceTrade(s,{type:'ADVANCE_DAYS',days:Math.min(step,due-s.day)});assert.ok(r.advancedDays>0);s=r.state;operating+=r.summary.operating;assert.deepEqual(parseTradeSave(s),s);}
 return {s,operating};
}
test('all payment proposals reconcile cash and exchange settlement under daily and fast play',()=>{
 for(const kind of ['quick','long','rush'])for(const paymentTerms of ['standard','cashflow','growth'])for(const fxMode of ['locked','spot']){
  const {s,q,cash}=sign(kind,paymentTerms,fxMode);assert.equal(q.paymentTerms.id,paymentTerms);
  const daily=run(s,1),fast=run(s,7);assert.deepEqual(fast.s,daily.s);
  const rate=fxMode==='locked'?q.fx.lockedRate:fxRateAt(dayToWeek(q.settlementDay));
  const actual=q.deposit+Math.round(q.fx.tailUsdCents*rate/1000000)-q.cost-q.freight-q.fx.fee;
  assert.equal(fast.s.metrics.profit,actual);assert.equal(fast.s.cash-cash,actual-fast.operating);
  assert.equal(fast.s.active.length,0);assert.equal(fast.s.receivables.length,0);
 }
});
