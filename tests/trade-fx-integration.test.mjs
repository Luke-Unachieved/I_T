import test from 'node:test';
import assert from 'node:assert/strict';
import {createTradeGame,reduceTrade,quoteOrder,parseTradeSave,fxRateAt,dayToWeek} from '../src/trade-economy.js';
function signed(kind,mode,startWeek){
 let s=createTradeGame('结汇守恒夹具');s.cash=100000;
 while(s.week<startWeek)s=reduceTrade(s,{type:'ADVANCE_DAYS',days:7}).state;
 for(let i=0;i<8;i++){
  const o=s.offers.find(x=>x.kind===kind),options={supplier:'reliable',shipping:'sea',markup:-10,fxMode:mode};
  const q=quoteOrder(s,o.id,options),before=s.cash;
  const r=reduceTrade(s,{type:'ACCEPT',offerId:o.id,...options});s=r.state;
  if(s.active.length)return {s,q,before};
  s=reduceTrade(s,{type:'ADVANCE_DAYS',days:7}).state;
 }
 throw new Error('fixture failed to sign');
}
function finish(initial,step){
 let s=structuredClone(initial),operating=0;
 const due=s.active[0].dueDay;
 while(s.day<due){const r=reduceTrade(s,{type:'ADVANCE_DAYS',days:Math.min(step,due-s.day)});assert.ok(r.advancedDays>0);s=r.state;operating+=r.summary.operating;assert.deepEqual(parseTradeSave(s),s);}
 return {s,operating};
}
test('FX integration: cash, profit and customer revenue reconcile for both settlement paths',()=>{
 for(const mode of ['locked','spot'])for(const kind of ['quick','long'])for(const week of [1,7,15]){
  const {s,q,before}=signed(kind,mode,week),{s:end,operating}=finish(s,7);
  const rate=mode==='locked'?q.fx.lockedRate:fxRateAt(dayToWeek(q.settlementDay));
  const tail=Math.round(q.fx.tailUsdCents*rate/1000000);
  const profit=q.deposit+tail-q.cost-q.freight-q.fx.fee;
  assert.equal(end.cash-before,profit-operating,`${mode}/${kind}/${week} cash`);
  assert.equal(end.metrics.profit,profit);assert.equal(end.metrics.revenue,q.deposit+tail);
  assert.equal(end.customers[q.offer.customerId].revenue,q.deposit+tail);
  assert.equal(end.active.length,0);assert.equal(end.receivables.length,0);
  const reload=parseTradeSave(JSON.stringify(end));assert.equal(reload.cash,end.cash);assert.equal(reload.metrics.profit,profit);
 }
});
test('FX integration: 7-day fast forward settles at the same daily rate as single-day play',()=>{
 for(const mode of ['locked','spot'])for(const kind of ['quick','long']){
  const {s}=signed(kind,mode,7),a=finish(s,1),b=finish(s,7);
  assert.deepEqual(a.s,b.s);assert.equal(a.operating,b.operating);
 }
});
