import test from 'node:test';
import assert from 'node:assert/strict';
import {createTradeGame,reduceTrade,quoteOrder,forecastCash,parseTradeSave,PRODUCTS,SUPPLIERS,SHIPPING,capacity,netWorth,weeklyCost} from '../src/trade-economy.js';
const go=(s,a)=>reduceTrade(s,a).state;
const copy=s=>JSON.parse(JSON.stringify(s));
function acceptAny(s,kind='quick',options={}){
 for(let tries=0;tries<8;tries++){
  const o=s.offers.find(o=>o.kind===kind);const r=reduceTrade(s,{type:'ACCEPT',offerId:o.id,markup:-10,...options});
  s=r.state;if(s.active.length)return s;s=go(s,{type:'NEXT_WEEK'});
 }
 throw new Error('No accepted inquiry');
}
test('new economy has six products, 3 distinct contract cash terms and isolated version',()=>{
 const s=createTradeGame('海上');assert.equal(s.version,2);assert.equal(PRODUCTS.length,6);assert.equal(s.offers.length,3);assert.equal(s.cash,18000);
 const qs=s.offers.map(o=>quoteOrder(s,o.id));assert.ok(qs[1].profit>qs[0].profit);assert.ok(qs[1].payLag>qs[0].payLag);assert.ok(qs[0].deposit/qs[0].revenue>qs[1].deposit/qs[1].revenue);
 assert.deepEqual(parseTradeSave(JSON.stringify(s)),s);
});
test('markup changes profitability and win probability in opposite directions',()=>{
 const s=createTradeGame(),id=s.offers[0].id,a=quoteOrder(s,id,{markup:-5}),b=quoteOrder(s,id,{markup:10});assert.ok(a.profit<b.profit);assert.ok(a.chance>b.chance);
 assert.equal(quoteOrder(s,id,{markup:NaN}).valid,false);assert.equal(quoteOrder(s,id,{markup:16}).valid,false);assert.equal(quoteOrder(s,id,{supplier:'unknown'}).valid,false);
});
test('supplier and transport change time, margin and explicit penalty, not decorative labels',()=>{
 const s=createTradeGame(),id=s.offers[2].id;
 const slow=quoteOrder(s,id,{supplier:'economy',shipping:'sea'}),fast=quoteOrder(s,id,{supplier:'express',shipping:'rail'});
 assert.ok(slow.weeks>fast.weeks);assert.ok(slow.penalty>0);assert.equal(fast.penalty,0);assert.ok(slow.chance<fast.chance);assert.ok(slow.cost<fast.cost);
});
test('accepted orders reserve slots and staged amounts; duplicate click never pays twice',()=>{
 let s=acceptAny(createTradeGame());const o=s.active[0],cash=s.cash;
 assert.equal(s.metrics.orders,0);assert.ok(o.dueWeek>s.week);assert.equal(o.paidShipping,false);
 const r=reduceTrade(s,{type:'ACCEPT',offerId:o.id,markup:-10});assert.equal(r.changed,false);assert.equal(r.state.cash,cash);
 while(s.week<o.shipWeek)s=go(s,{type:'NEXT_WEEK'});
 assert.equal(s.active[0].paidShipping,true);assert.equal(s.metrics.orders,0);
 while(s.week<o.deliveryWeek)s=go(s,{type:'NEXT_WEEK'});
 assert.equal(s.active.length,0);assert.equal(s.metrics.orders,1);assert.equal(s.metrics.profit,o.profit);assert.ok(s.customers[o.offer.customerId]);assert.equal(s.receivables.length,0);
 assert.deepEqual(parseTradeSave(s),s);
});
test('long terms remain receivable after delivery and release capacity before cash comes back',()=>{
 let s=acceptAny(createTradeGame(),'long');const o=s.active[0];while(s.week<o.deliveryWeek)s=go(s,{type:'NEXT_WEEK'});
 assert.equal(s.active.length,0);assert.equal(s.receivables.length,1);assert.equal(s.receivables[0].amount,o.revenue-o.deposit-o.penalty);
 const before=s.cash,cost=weeklyCost(s);while(s.week<o.dueWeek)s=go(s,{type:'NEXT_WEEK'});
 assert.equal(s.cash,before-cost*o.payLag+o.revenue-o.deposit-o.penalty);assert.equal(s.receivables.length,0);
});
test('six-week cash forecast exactly matches actual scheduled cash in absence of new decisions',()=>{
 let s=acceptAny(createTradeGame(),'long');const forecast=forecastCash(s);
 for(const point of forecast.points.slice(1)){s=go(s,{type:'NEXT_WEEK'});assert.equal(s.cash,point.cash,`week ${s.week}`);}
});
test('candidate forecast includes signing deposit and procurement before future cash events',()=>{
 const s=createTradeGame(),q=quoteOrder(s,s.offers[1].id,{markup:-10});const f=forecastCash(s,q);
 assert.equal(f.points[0].cash,s.cash+q.deposit-q.procurement);assert.equal(f.points[q.productionWeeks].outflow,weeklyCost(s)+q.balance+q.freight);
});
test('cash strain and full slots prevent unsafe acceptances without mutation',()=>{
 let s=createTradeGame();s.cash=0;const initial=JSON.stringify(s);
 const r=reduceTrade(s,{type:'ACCEPT',offerId:s.offers[1].id,markup:0});assert.equal(r.changed,false);assert.equal(JSON.stringify(s),initial);
 s=createTradeGame();s=acceptAny(s);s.active.push({...copy(s.active[0]),id:'other'});assert.equal(s.active.length,capacity(s));
 assert.match(quoteOrder(s,s.offers[0].id).reason,/并行/);
});
test('upgrades change next order and cannot spend money committed to existing orders',()=>{
 let s=createTradeGame();const id=s.offers[1].id,old=quoteOrder(s,id,{supplier:'economy'});s=go(s,{type:'UPGRADE',id:'quality'});const fresh=quoteOrder(s,id,{supplier:'economy'});assert.ok(fresh.quality>old.quality);assert.ok(fresh.penalty<old.penalty);
 s=go(s,{type:'UPGRADE',id:'logistics'});assert.ok(quoteOrder(s,id).freight<quoteOrder(createTradeGame(),id).freight);
 const slots=capacity(s);s.cash=100000;s=go(s,{type:'UPGRADE',id:'team'});assert.equal(capacity(s),slots+1);
});
test('broker income is once per week, recovers cash without irreversible bankruptcy',()=>{
 let s=createTradeGame();s.cash=0;const r=reduceTrade(s,{type:'BROKER'});assert.ok(r.state.cash>0);assert.equal(reduceTrade(r.state,{type:'BROKER'}).changed,false);
 s=go(s,{type:'NEXT_WEEK'});assert.equal(s.cash,0);assert.ok(s.debt>0);s=go(s,{type:'BROKER'});assert.ok(s.cash>weeklyCost(s));
});
test('bridge and repayment keep debt explicit and avoid negative balance',()=>{
 let s=createTradeGame();s=go(s,{type:'BRIDGE'});assert.equal(s.debt,6000);assert.equal(s.cash,24000);
 s=go(s,{type:'REPAY',amount:6000});assert.equal(s.debt,0);assert.equal(s.cash,18000);
 assert.equal(reduceTrade(s,{type:'REPAY',amount:Infinity}).changed,false);
});
test('inquiries and prices move weekly and history survives reload',()=>{
 let s=createTradeGame(),p=copy(s.prices),o=s.offers[0].id;s=go(s,{type:'NEXT_WEEK'});assert.notDeepEqual(s.prices,p);assert.notEqual(s.offers[0].id,o);assert.equal(s.priceHistory.length,2);assert.deepEqual(parseTradeSave(s),s);
});
test('import rejects v1, malformed or unsafe amounts and live schedule tampering',()=>{
 const s=createTradeGame();for(const mutate of [x=>x.version=1,x=>x.cash=-1,x=>x.cash=1e20,x=>x.prices.cups=Infinity,x=>x.upgrades.team=99,x=>x.receivables.push({id:'x',amount:-1,dueWeek:3}),x=>x.offers[0].price='100',x=>x.customers.__bad={orders:3}]){const bad=copy(s);mutate(bad);assert.throws(()=>parseTradeSave(bad));}
 const a=acceptAny(s);for(const mutate of [x=>x.active[0].balance=-4,x=>x.active[0].dueWeek=1,x=>x.active[0].profit=99999,x=>x.active[0].steps=null]){const bad=copy(a);mutate(bad);assert.throws(()=>parseTradeSave(bad));}
 assert.throws(()=>parseTradeSave('{'));assert.throws(()=>parseTradeSave('null'));
});
test('conservative diversified strategy reaches a real economic ending, then continues',()=>{
 let s=createTradeGame();for(let w=0;w<60&&!s.ending;w++){
  for(const o of s.offers.slice().sort((a,b)=>(b.kind==='flagship')-(a.kind==='flagship'))){
   let best;for(const sup of SUPPLIERS)for(const ship of SHIPPING){const q=quoteOrder(s,o.id,{supplier:sup.id,shipping:ship.id,markup:-2});if(q.valid&&q.profit>0&&q.late===0&&(o.kind!=='flagship'||q.penalty===0)&&forecastCash(s,q).minimum>=0&&(!best||q.profit>best.profit))best=q;}
   if(best)s=go(s,{type:'ACCEPT',offerId:o.id,supplier:best.supplier,shipping:best.shipping,markup:-2});
  }
  if(s.cash>16000&&s.upgrades.quality<1)s=go(s,{type:'UPGRADE',id:'quality'});
  if(s.cash>22000&&s.upgrades.team<2)s=go(s,{type:'UPGRADE',id:'team'});
  s=go(s,{type:'NEXT_WEEK'});assert.deepEqual(parseTradeSave(s),s);
 }
 assert.ok(s.ending);assert.ok(s.customers['europe-flagship']?.qualified);assert.ok(netWorth(s)>=60000);const week=s.week;s=go(s,{type:'NEXT_WEEK'});assert.equal(s.week,week+1);assert.ok(s.ending);
});
test('shipping payment is not deducted twice from net assets',()=>{
 let s=acceptAny(createTradeGame(),'long');const o=s.active[0];while(s.week<o.shipWeek-1)s=go(s,{type:'NEXT_WEEK'});
 const before=netWorth(s),operating=weeklyCost(s);s=go(s,{type:'NEXT_WEEK'});assert.equal(s.active[0].paidShipping,true);assert.equal(netWorth(s),before-operating);
});
test('bad imported steps and impossible live contracts cannot become forecast inputs',()=>{
 const s=acceptAny(createTradeGame());const variants=[x=>x.active[0].steps[0].amount=Infinity,x=>x.active[0].quality=101,x=>x.active[0].capacity=-1,x=>x.active[0].offer.customerId='__proto__',x=>x.active[0].id='unrelated'];
 for(const mutate of variants){const bad=copy(s);mutate(bad);assert.throws(()=>parseTradeSave(bad));}
});
test('loan interest is included in cash forecast and money is never silently negative',()=>{
 let s=go(createTradeGame(),{type:'BRIDGE'});const cost=weeklyCost(s);assert.equal(cost,168);const f=forecastCash(s);s=go(s,{type:'NEXT_WEEK'});assert.equal(s.cash,f.points[1].cash);
 for(let i=0;i<200;i++){s=go(s,{type:'NEXT_WEEK'});assert.ok(Number.isSafeInteger(s.cash)&&s.cash>=0);assert.ok(Number.isSafeInteger(s.debt)&&s.debt>=0);}
});
test('flagship is unlocked after normal markets and needs capable production to qualify',()=>{
 let s=createTradeGame();s.metrics.orders=8;s.reputation=16;s.cash=100000;s=go(s,{type:'NEXT_WEEK'});
 const offer=s.offers.find(o=>o.kind==='flagship');assert.ok(offer);assert.equal(offer.depositRate,15);assert.equal(offer.quality,95);
 const cheap=quoteOrder(s,offer.id,{supplier:'economy',shipping:'sea'});assert.ok(cheap.penalty>0);assert.ok(cheap.late>0);
 s=go(s,{type:'UPGRADE',id:'quality'});const good=quoteOrder(s,offer.id,{supplier:'reliable',shipping:'rail',markup:-10});assert.equal(good.penalty,0);assert.equal(good.weeks,3);
 s=go(s,{type:'ACCEPT',offerId:offer.id,supplier:'reliable',shipping:'rail',markup:-10});
 assert.ok(s.active.some(o=>o.offer.kind==='flagship'));
 for(let i=0;i<3;i++)s=go(s,{type:'NEXT_WEEK'});
 assert.equal(s.customers['europe-flagship'].qualified,true);assert.equal(s.ending,null,'one market alone is not a global ending');assert.deepEqual(parseTradeSave(s),s);
});
test('unpublished first-candidate achievement is retained while new final challenge stays open',()=>{
 const s=createTradeGame();delete s.ruleset;s.ending={week:1,title:'previous candidate',orders:16,netWorth:60000};
 const migrated=parseTradeSave(s);assert.equal(migrated.ruleset,2);assert.equal(migrated.ending,null);assert.equal(migrated.previousEnding.title,'previous candidate');assert.equal(migrated.cash,s.cash);
});
