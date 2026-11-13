import test from 'node:test';
import assert from 'node:assert/strict';
import {createTradeGame,reduceTrade,quoteOrder,forecastCash,parseTradeSave,SUPPLIERS,SHIPPING,capacity,netWorth,weeklyCost} from '../src/trade-economy.js';

// Deterministic scripted strategies, not UI playtests or evidence of human retention.
// Only use player-visible quotes, forecasts and balances; never inspect acceptance hashes.
function simulate(expand=false){
 let s=createTradeGame('平衡验证公司'),firstEnding=null,spent=0,lowest=s.cash,pauses=0,peakSlots=capacity(s),operating=0;
 const investments=[];
 function invest(action,threshold,label){
  if(s.cash<threshold)return;
  const before=s.cash,r=reduceTrade(s,action);
  if(!r.changed||forecastCash(r.state).stressMinimum<8000)return;
  s=r.state;spent+=before-s.cash;investments.push({day:s.day,label,cost:before-s.cash});
 }
 for(let turn=0;turn<420;turn++){
  if(s.upgrades.quality<1)invest({type:'UPGRADE',id:'quality'},18000,'验货');
  if(s.upgrades.team<2)invest({type:'UPGRADE',id:'team'},26000,'业务团队');
  if(expand&&s.metrics.orders>=8){
   if(s.expansion.warehouse<1)invest({type:'EXPAND_WAREHOUSE'},40000,'集货仓');
   if(!s.expansion.branches.asia)invest({type:'OPEN_BRANCH',market:'asia'},50000,'东南亚子公司');
   if(s.expansion.branches.asia&&!s.expansion.branches.asia.manager)invest({type:'APPOINT',market:'asia',manager:'zhou'},0,'货运负责人');
  }
  const offers=s.offers.slice().sort((a,b)=>(b.kind==='flagship')-(a.kind==='flagship'));
  for(const offer of offers){
   if(s.active.length>=capacity(s))break;
   let best;
   for(const supplier of SUPPLIERS)for(const shipping of SHIPPING){
    const options={supplier:supplier.id,shipping:shipping.id,markup:-2,fxMode:'locked'};
    const q=quoteOrder(s,offer.id,options);
    if(!q.valid||q.profit<=0||q.penalty>0||forecastCash(s,q).stressMinimum<1000)continue;
    if(!best||q.profit>best.q.profit)best={q,options};
   }
   if(best)s=reduceTrade(s,{type:'ACCEPT',offerId:offer.id,...best.options}).state;
  }
  let r=reduceTrade(s,{type:'NEXT_DAY'});
  if(r.pause?.code==='offers_expiring')r=reduceTrade(s,{type:'NEXT_DAY',allowExpireOfferIds:r.pause.offerIds});
  if(r.pause?.code==='funding_gap')pauses++;
  assert.ok(r.advancedDays===1,'strategy must progress without emergency debt or hidden funding');
  s=r.state;operating+=r.summary.operating;lowest=Math.min(lowest,s.cash);peakSlots=Math.max(peakSlots,capacity(s));
  assert.deepEqual(parseTradeSave(s),s,'save round-trip throughout progression');
  assert.equal(s.debt,0,'strategy does not borrow');
  if(s.ending&&!firstEnding)firstEnding={...s.ending};
 }
 return {state:s,firstEnding,spent,lowest,pauses,peakSlots,operating,investments};
}
function reconcileAfterFinalReceipts(r){
 let s=r.state,operating=r.operating;
 for(let i=0;i<120&&(s.active.length||s.receivables.length);i++){
  let next=reduceTrade(s,{type:'NEXT_DAY'});
  if(next.pause?.code==='offers_expiring')next=reduceTrade(s,{type:'NEXT_DAY',allowExpireOfferIds:next.pause.offerIds});
  assert.equal(next.advancedDays,1);s=next.state;operating+=next.summary.operating;
  assert.deepEqual(parseTradeSave(s),s);
 }
 assert.equal(s.active.length,0);assert.equal(s.receivables.length,0);
 assert.equal(s.cash,18000+s.metrics.profit-r.spent-operating,'all expansion, operating and trading cash reconciles to the initial balance');
}
const report=r=>({endingDay:r.firstEnding?.day,ordersAtEnding:r.firstEnding?.orders,day:r.state.day,orders:r.state.metrics.orders,cash:r.state.cash,netWorth:netWorth(r.state),minimumCash:r.lowest,spent:r.spent,operating:r.operating,weeklyCost:weeklyCost(r.state),peakSlots:r.peakSlots,investments:r.investments});

test('scripted baseline and late expansion both reach all-market ending without funding gaps',t=>{
 const baseline=simulate(false),expanded=simulate(true);
 for(const r of [baseline,expanded]){
  assert.ok(r.firstEnding,'must reach first ending within 420 days');
  assert.ok(r.state.customers['europe-flagship']?.qualified);
  assert.equal(new Set(Object.values(r.state.customers).filter(c=>c.orders>0).map(c=>c.market)).size,3);
  assert.equal(r.pauses,0);assert.ok(r.lowest>=0);reconcileAfterFinalReceipts(r);
 }
 assert.equal(baseline.state.expansion.warehouse,0);
 assert.equal(Object.keys(baseline.state.expansion.branches).length,0);
 assert.equal(expanded.state.expansion.warehouse,1);
 assert.equal(expanded.state.expansion.branches.asia.manager,'zhou');
 assert.ok(expanded.peakSlots>baseline.peakSlots);
 t.diagnostic('No expansion: '+JSON.stringify(report(baseline)));
 t.diagnostic('Late expansion: '+JSON.stringify(report(expanded)));
});
