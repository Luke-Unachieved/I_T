import test from 'node:test';
import assert from 'node:assert/strict';
import {createTradeGame as createFxGame,fxRateAt,FX_MIN,FX_MAX,reduceTrade,quoteOrder,forecastCash,parseTradeSave,PRODUCTS,SUPPLIERS,SHIPPING,capacity,netWorth,weeklyCost,dayToWeek,weekToDay,MAX_DAY} from '../src/trade-economy.js';
// Legacy RMB fixture: existing board has no currency metadata; future boards still use new USD rules.
const createTradeGame=(name)=>{const s=createFxGame(name);s.ruleset=5;for(const o of s.offers){delete o.currency;delete o.quoteRate;delete o.usdUnitCents;}return s;};
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
 for(const point of forecast.points.slice(1)){s=go(s,{type:'NEXT_DAY'});assert.equal(s.day,point.day);assert.equal(s.cash,point.cash,`day ${s.day}`);}
});
test('candidate forecast includes signing deposit and procurement before future cash events',()=>{
 const s=createTradeGame(),q=quoteOrder(s,s.offers[1].id,{markup:-10});const f=forecastCash(s,q);
 assert.equal(f.points[0].cash,s.cash+q.deposit-q.procurement);assert.equal(f.points[q.productionDays].outflow,weeklyCost(s)+q.balance+q.freight);
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
 let paused=reduceTrade(s,{type:'NEXT_WEEK'});assert.equal(paused.pause.code,'funding_gap');assert.equal(paused.state.day,7);s=go(paused.state,{type:'NEXT_DAY',allowFundingDay:8});assert.equal(s.cash,0);assert.ok(s.debt>0);s=go(s,{type:'BROKER'});assert.ok(s.cash>weeklyCost(s));
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
 let s=go(createTradeGame(),{type:'BRIDGE'});const cost=weeklyCost(s);assert.equal(cost,168);const f=forecastCash(s);s=go(s,{type:'NEXT_WEEK'});assert.equal(s.cash,f.points[7].cash);
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
 const migrated=parseTradeSave(s);assert.equal(migrated.ruleset,5);assert.equal(migrated.ending,null);assert.equal(migrated.previousEnding.title,'previous candidate');assert.equal(migrated.cash,s.cash);
});
test('signing does not recognize future profits before delivery',()=>{
 const before=createTradeGame();const after=acceptAny(before,'long');assert.equal(netWorth(after),netWorth(before));
 const order=after.active[0];let s=after;
 while(s.week<order.deliveryWeek)s=go(s,{type:'NEXT_WEEK'});
 assert.equal(netWorth(s),netWorth(before)+order.profit-weeklyCost(before)*(s.week-before.week));
});

test('earlier candidate estimated-profit ending is retained but not counted before realization',()=>{
 const s=createTradeGame();s.ruleset=2;s.ending={week:1,title:'earlier',orders:9,netWorth:63659};s.customers['europe-flagship']={name:'test',market:'europe',orders:1,revenue:100,qualified:true};const n=parseTradeSave(s);assert.equal(n.ending,null);assert.equal(n.previousEnding.title,'earlier');assert.equal(n.customers['europe-flagship'].qualified,true);
});

// Produce the legacy weekly serialization (all financial fields unchanged).
function weeklyFormat(s){
 const old=copy(s);old.ruleset=3;delete old.day;
 const undate=x=>{delete x.day;return x;};
 const oldOffer=o=>{delete o.deadlineDays;delete o.payLagDays;delete o.expiresDay;return o;};
 old.offers=old.offers.map(oldOffer);
 for(const o of old.active){oldOffer(o.offer);for(const k of ['acceptedDay','shipDay','deliveryDay','dueDay','settlementDay','days','productionDays','payLagDays','lateDays'])delete o[k];o.steps=o.steps.map(undate);}
 for(const r of old.receivables)delete r.dueDay;
 for(const k of ['history','priceHistory','log'])old[k]=old[k].map(undate);
 if(old.ending)undate(old.ending);if(old.previousEnding)undate(old.previousEnding);return old;
}
const days=(s,n)=>{for(let i=0;i<n;i++){const r=reduceTrade(s,{type:'NEXT_DAY'});assert.equal(r.advancedDays,1,r.message);s=r.state;}return s;};
test('daily calendar is real: one click is one day, weekly bills and market updates happen once',()=>{
 const s=createTradeGame();assert.equal(s.day,1);assert.equal(s.ruleset,5);
 const r=reduceTrade(s,{type:'NEXT_DAY'});assert.equal(r.state.day,2);assert.equal(r.state.week,1);assert.equal(r.state.cash,18000);assert.equal(r.advancedDays,1);
 const before=days(s,6);assert.equal(before.day,7);assert.equal(before.cash,18000);assert.deepEqual(before.prices,s.prices);
 const after=reduceTrade(before,{type:'NEXT_DAY'});assert.equal(after.state.day,8);assert.equal(after.state.week,2);assert.equal(after.state.cash,17880);assert.equal(after.expiredOffers,3);assert.match(after.message,/3笔普通询盘/);
 assert.deepEqual(parseTradeSave(after.state),after.state);
});
test('new midweek orders retain full durations instead of stealing days at the next weekly tick',()=>{
 let s=days(createTradeGame(),3);const q=quoteOrder(s,s.offers[1].id,{markup:-10});assert.equal(s.day,4);assert.equal(q.productionDays,14);assert.equal(q.days,28);assert.equal(q.payLagDays,28);assert.equal(q.settlementDay,60);
 s=go(s,{type:'ACCEPT',offerId:s.offers[1].id,markup:-10});assert.equal(s.active.length,1);const o=s.active[0];assert.equal(o.shipDay,18);assert.equal(o.deliveryDay,32);assert.equal(o.dueDay,60);
 s=days(s,13);assert.equal(s.day,17);assert.equal(s.active[0].paidShipping,false);s=days(s,1);assert.equal(s.active[0].paidShipping,true);
 s=days(s,13);assert.equal(s.day,31);assert.equal(s.metrics.orders,0);s=days(s,1);assert.equal(s.metrics.orders,1);assert.equal(s.receivables[0].dueDay,60);
 assert.deepEqual(parseTradeSave(s),s);
});
test('daily forecast captures midweek shipment low and reconciles every day with actual cash',()=>{
 let s=days(createTradeGame(),3);s=go(s,{type:'ACCEPT',offerId:s.offers[1].id,markup:-10});const f=forecastCash(s);
 assert.equal(f.points.length,43);assert.equal(f.horizonDays,42);const shipment=f.points.find(p=>p.day===18);assert.equal(shipment.outflow,s.active[0].balance+s.active[0].freight,'midweek is not a weekly billing day');
 for(const p of f.points.slice(1)){s=days(s,1);assert.equal(s.cash,p.cash,`cash day ${p.day}`);}
});
test('weekly save migration maps dates exactly and never scales money or rerolls offer IDs',()=>{
 let s=acceptAny(createTradeGame(),'long');s=days(s,14);const legacy=weeklyFormat(s),original=JSON.stringify(legacy);const migrated=parseTradeSave(legacy);
 assert.equal(JSON.stringify(legacy),original,'input object remains untouched');assert.equal(migrated.day,15);assert.equal(migrated.week,3);
 assert.equal(migrated.active[0].acceptedDay,1);assert.equal(migrated.active[0].shipDay,15);assert.equal(migrated.active[0].deliveryDay,29);assert.equal(migrated.active[0].dueDay,57);assert.equal(migrated.active[0].paidShipping,true);
 for(const k of ['cash','debt','metrics','prices','customers','upgrades'])assert.deepEqual(migrated[k],legacy[k]);
 assert.deepEqual(migrated.offers.map(o=>o.id),legacy.offers.map(o=>o.id));assert.equal(migrated.offers[0].expiresDay,21);
 assert.deepEqual(parseTradeSave(migrated),migrated,'migration is idempotent');
 const after=days(migrated,1);assert.equal(after.cash,migrated.cash,'already paid shipping is not charged again');
});
test('legacy receivables keep exact value and absolute due date, then pay once',()=>{
 let s=acceptAny(createTradeGame(),'long');s=days(s,28);const legacy=weeklyFormat(s);assert.equal(legacy.week,5);assert.equal(legacy.receivables.length,1);
 s=parseTradeSave(legacy);assert.equal(s.day,29);const r=s.receivables[0];assert.equal(r.dueDay,57);assert.equal(r.amount,legacy.receivables[0].amount);
 s=days(s,27);assert.equal(s.receivables.length,1);const before=s.cash;s=days(s,1);assert.equal(s.cash,before+r.amount-weeklyCost(s));assert.equal(s.receivables.length,0);const paid=s.cash;s=days(s,1);assert.equal(s.cash,paid);
});
test('quick 3/7 day advancement settles identically to individual days when no important stop exists',()=>{
 const s=acceptAny(createTradeGame(),'quick');const fast=reduceTrade(s,{type:'ADVANCE_DAYS',days:7});const slow=days(s,7);assert.equal(fast.advancedDays,7);assert.equal(fast.pause,null);assert.deepEqual(fast.state,slow);
 const a=reduceTrade(fast.state,{type:'ADVANCE_DAYS',days:3});assert.equal(a.advancedDays,3);assert.deepEqual(a.state,days(slow,3));
});
function flagshipState(){let s=createTradeGame();s.metrics.orders=8;s.reputation=16;s.cash=100000;return reduceTrade(s,{type:'ADVANCE_DAYS',days:7});}
test('flagship arrival pauses only once at arrival day and expiry requires explicit current offer acknowledgement',()=>{
 const appeared=flagshipState();assert.equal(appeared.state.day,8);assert.equal(appeared.pause.code,'flagship_available');assert.equal(appeared.advancedDays,7);
 const following=reduceTrade(appeared.state,{type:'NEXT_DAY'});assert.equal(following.advancedDays,1);assert.equal(following.pause,null);
 const expiry=reduceTrade(following.state,{type:'ADVANCE_DAYS',days:7});assert.equal(expiry.state.day,14);assert.equal(expiry.advancedDays,5);assert.equal(expiry.pause.code,'offers_expiring');assert.equal(expiry.remainingDays,2);
 const again=reduceTrade(expiry.state,{type:'NEXT_DAY'});assert.equal(again.changed,false);assert.equal(again.advancedDays,0);assert.deepEqual(again.state,expiry.state);
 const denied=reduceTrade(expiry.state,{type:'NEXT_DAY',allowExpireOfferIds:['w1-flagship']});assert.equal(denied.advancedDays,0,'stale approval cannot dismiss a different opportunity');
 const acknowledged=reduceTrade(expiry.state,{type:'ADVANCE_DAYS',days:2,allowExpireOfferIds:expiry.pause.offerIds});assert.equal(acknowledged.state.day,15);assert.equal(acknowledged.advancedDays,1);assert.equal(acknowledged.pause.code,'flagship_available');
});
test('cash shortfall pauses BEFORE settlement and exact-day permission cannot authorize another gap',()=>{
 let s=createTradeGame();s.cash=0;const r=reduceTrade(s,{type:'ADVANCE_DAYS',days:7});assert.equal(r.state.day,7);assert.equal(r.advancedDays,6);assert.equal(r.pause.code,'funding_gap');assert.equal(r.pause.day,8);assert.equal(r.pause.shortfall,120);assert.equal(r.state.debt,0);
 const denied=reduceTrade(r.state,{type:'NEXT_DAY',allowFundingDay:7});assert.equal(denied.advancedDays,0);assert.equal(denied.state.day,7);
 const ok=reduceTrade(r.state,{type:'NEXT_DAY',allowFundingDay:8});assert.equal(ok.state.day,8);assert.equal(ok.state.cash,0);assert.equal(ok.state.debt,120);
 const once=days(ok.state,1);assert.equal(once.debt,120,'same day cost cannot replay');
 const other=reduceTrade(once,{type:'ADVANCE_DAYS',days:7,allowFundingDay:8});assert.equal(other.pause.code,'funding_gap');assert.equal(other.pause.day,15);assert.equal(other.state.day,14);
});
test('ordinary receipts do not interrupt fast advancement, but new market and ending events do',()=>{
 let s=acceptAny(createTradeGame(),'quick');s=days(s,27);const r=reduceTrade(s,{type:'ADVANCE_DAYS',days:3});assert.equal(r.advancedDays,3);assert.equal(r.pause,null);assert.equal(r.state.metrics.orders,1);assert.equal(r.state.receivables.length,0);
 s=acceptAny(createTradeGame(),'quick');s.metrics.orders=2;s=days(s,27);const unlocked=reduceTrade(s,{type:'ADVANCE_DAYS',days:7});assert.equal(unlocked.advancedDays,1);assert.equal(unlocked.pause.code,'market_unlocked');assert.equal(unlocked.state.day,29);
 const resumed=reduceTrade(unlocked.state,{type:'NEXT_DAY'});assert.equal(resumed.advancedDays,1);assert.equal(resumed.pause,null);
 s=createTradeGame();s.cash=61000;s.customers={'asia-quick':{orders:1,revenue:1,market:'asia',name:'A'},'middle-quick':{orders:1,revenue:1,market:'middle',name:'B'},'europe-flagship':{orders:1,revenue:1,market:'europe',name:'C',qualified:true}};
 const won=reduceTrade(s,{type:'ADVANCE_DAYS',days:7});assert.equal(won.advancedDays,1);assert.equal(won.pause.code,'ending');assert.equal(won.state.ending.day,2);assert.equal(reduceTrade(won.state,{type:'NEXT_DAY'}).pause,null);
});
test('daily broker limit resets only at a weekly boundary, no sevenfold income exploit',()=>{
 let s=go(createTradeGame(),{type:'BROKER'});const income=s.cash;for(let i=0;i<6;i++){s=days(s,1);const r=reduceTrade(s,{type:'BROKER'});assert.equal(r.changed,false);assert.equal(s.cash,income);}
 s=days(s,1);assert.equal(s.week,2);const r=reduceTrade(s,{type:'BROKER'});assert.equal(r.changed,true);assert.equal(r.state.metrics.brokered,2);
});
test('daily save rejects inconsistent alias dates and malformed paused advancement inputs',()=>{
 const s=acceptAny(createTradeGame(),'long');for(const mutate of [x=>x.day=NaN,x=>x.day=8,x=>x.active[0].shipDay--,x=>x.active[0].dueDay--,x=>x.active[0].paidShipping=true,x=>x.offers[0].expiresDay=3,x=>x.active[0].steps[1].day--]){const bad=copy(s);mutate(bad);assert.throws(()=>parseTradeSave(bad));}
 for(const n of [0,8,-1,2.5,NaN,Infinity,'7']){const r=reduceTrade(s,{type:'ADVANCE_DAYS',days:n});assert.equal(r.changed,false);assert.deepEqual(r.state,s);}
 assert.equal(dayToWeek(1),1);assert.equal(dayToWeek(7),1);assert.equal(dayToWeek(8),2);assert.equal(weekToDay(2),8);assert.equal(MAX_DAY,3640);
});
test('advance notice aggregates all committed days instead of reporting only the last day',()=>{
 let s=acceptAny(createTradeGame(),'quick');const o=copy(s.active[0]);s=days(s,27);
 const r=reduceTrade(s,{type:'ADVANCE_DAYS',days:3});
 assert.equal(r.advancedDays,3);assert.match(r.message,/已推进3\/3天/);assert.doesNotMatch(r.message,/已推进1天/);
 assert.equal(r.summary.deliveries,1);assert.equal(r.summary.profit,o.profit);assert.equal(r.summary.receipts,o.revenue-o.deposit-o.penalty);
 assert.match(r.message,/实际回款/);assert.match(r.message,/交付订单利润/);
 assert.equal(r.state.cash-s.cash,r.summary.receipts-r.summary.payments-r.summary.operating);
 const quiet=reduceTrade(createTradeGame(),{type:'ADVANCE_DAYS',days:3});
 assert.equal(quiet.message,'已推进3/3天，当前第4天。');
});
test('advance summary includes shipment and later receivable, excludes an uncommitted funding day',()=>{
 let s=acceptAny(createTradeGame(),'long');const o=copy(s.active[0]);s=days(s,13);
 let r=reduceTrade(s,{type:'ADVANCE_DAYS',days:7});assert.equal(r.summary.payments,o.balance+o.freight);assert.match(r.message,/支付采购尾款及运费/);
 s=days(r.state,35);assert.equal(s.day,56);r=reduceTrade(s,{type:'ADVANCE_DAYS',days:3});
 assert.equal(r.summary.receipts,o.revenue-o.deposit-o.penalty);assert.equal(r.summary.deliveries,0);assert.match(r.message,/实际回款/);
 assert.equal(r.state.cash-s.cash,r.summary.receipts-r.summary.payments-r.summary.operating);
 s=createTradeGame();s.cash=0;r=reduceTrade(s,{type:'ADVANCE_DAYS',days:7});
 assert.equal(r.advancedDays,6);assert.equal(r.summary.operating,0);assert.equal(r.pause.code,'funding_gap');
});
test('signing step labels the net cash flow, not the gross customer deposit',()=>{
 const s=createTradeGame();
 for(const offer of s.offers){const q=quoteOrder(s,offer.id);assert.equal(q.steps[0].label,'签约净收付');assert.equal(q.steps[0].amount,q.deposit-q.procurement);}
});

// USD contracts: separate from unchanged legacy RMB fixture regressions above.
test('new inquiries are explicit USD; old board stays RMB until the next weekly refresh',()=>{
 const fresh=createFxGame();assert.equal(fresh.ruleset,5);
 for(const o of fresh.offers){assert.equal(o.currency,'USD');assert.equal(o.quoteRate,fxRateAt(1));assert.ok(o.usdUnitCents>0);}
 const old=parseTradeSave(createTradeGame());assert.equal(quoteOrder(old,old.offers[0].id).fx,null);
 const refreshed=reduceTrade(old,{type:'ADVANCE_DAYS',days:7}).state;
 assert.ok(refreshed.offers.every(o=>o.currency==='USD'));assert.deepEqual(parseTradeSave(refreshed),refreshed);
});
test('FX fee is paid only on successful signature and included in forecast, net assets and profit',()=>{
 const s=createFxGame(),id=s.offers[1].id;
 const locked=quoteOrder(s,id,{markup:-10,fxMode:'locked'}),spot=quoteOrder(s,id,{markup:-10,fxMode:'spot'});
 assert.equal(locked.fx.fee,Math.ceil(locked.fx.estimatedTail*.006));assert.equal(spot.fx.fee,0);
 assert.equal(spot.profit-locked.profit,locked.fx.fee);
 assert.equal(locked.steps[0].amount,locked.deposit-locked.procurement-locked.fx.fee);
 assert.equal(forecastCash(s,locked).points[0].cash,s.cash+locked.steps[0].amount);
 const r=reduceTrade(s,{type:'ACCEPT',offerId:id,markup:-10,fxMode:'locked'});assert.equal(r.state.active.length,1);
 assert.equal(netWorth(r.state),s.cash-locked.fx.fee);
 assert.deepEqual(parseTradeSave(r.state),r.state);
 const repeated=reduceTrade(r.state,{type:'ACCEPT',offerId:id,fxMode:'spot'});assert.equal(repeated.changed,false);assert.equal(repeated.state.cash,r.state.cash);
 assert.equal(quoteOrder(s,id,{fxMode:'magic'}).valid,false);
});
test('spot cash forecast is explicitly an estimate with pressure bounds, not future FX knowledge',()=>{
 const s=createFxGame(),q=quoteOrder(s,s.offers[1].id,{fxMode:'spot'});
 const f=forecastCash(s,q);assert.equal(f.estimated,true);assert.ok(f.stressMinimum<=f.minimum);
 // This long order settles beyond horizon; forecast still labels the exposure.
 assert.equal(q.fx.minTail,Math.round(q.fx.tailUsdCents*FX_MIN/1000000));
 assert.equal(q.fx.maxTail,Math.round(q.fx.tailUsdCents*FX_MAX/1000000));
 const quick=quoteOrder(s,s.offers[0].id,{fxMode:'spot'});
 const point=forecastCash(s,quick).points.find(p=>p.day===quick.settlementDay);
 assert.ok(point.lowCash<point.cash&&point.cash<point.highCash);
 assert.equal(quick.steps[2].amount,quick.fx.estimatedTail);
});
function fxRun(kind,mode,advance=1){
 let s=acceptAny(createFxGame(),kind,{fxMode:mode}),o=copy(s.active[0]),initial=s.cash;
 while(s.day<o.dueDay){
  const r=reduceTrade(s,{type:'ADVANCE_DAYS',days:Math.min(advance,o.dueDay-s.day)});
  assert.ok(r.advancedDays>0,r.message);s=r.state;
 }
 return {s,o,initial};
}
test('spot quick and long paths settle at actual due-day weekly rate once; customer and metrics reconcile',()=>{
 for(const kind of ['quick','long']){
  const {s,o}=fxRun(kind,'spot',7);
  const tail=Math.round(o.fx.tailUsdCents*fxRateAt(dayToWeek(o.dueDay))/1000000),delta=tail-o.fx.estimatedTail;
  assert.equal(s.receivables.length,0);assert.equal(s.active.length,0);assert.equal(s.metrics.orders,1);
  assert.equal(s.metrics.profit,o.profit+delta);assert.equal(s.metrics.revenue,o.deposit+tail);
  assert.equal(s.customers[o.offer.customerId].revenue,o.deposit+tail);
  assert.equal(s.cash,18000+s.metrics.profit-(s.week-1)*120);assert.equal(netWorth(s),s.cash);
  const reload=parseTradeSave(s),next=reduceTrade(reload,{type:'NEXT_DAY'}).state;
  assert.equal(next.cash,s.cash);assert.equal(next.metrics.profit,s.metrics.profit);
  assert.deepEqual(fxRun(kind,'spot',1).s,s,'7-day and daily settlement dates produce same FX result');
 }
});
test('long receivable preserves USD and initial estimate, then only adds FX difference on payment',()=>{
 let s=acceptAny(createFxGame(),'long',{fxMode:'spot'}),o=copy(s.active[0]);
 s=days(s,o.deliveryDay-s.day);assert.equal(s.metrics.profit,o.profit);assert.equal(s.receivables[0].amount,o.fx.estimatedTail);assert.equal(s.receivables[0].currency,'USD');
 const reload=parseTradeSave(s);assert.deepEqual(reload,s);
 const predicted=forecastCash(s);assert.equal(predicted.estimated,true);
 s=days(reload,o.dueDay-s.day);assert.equal(s.metrics.profit,o.profit+Math.round(o.fx.tailUsdCents*fxRateAt(s.week)/1000000)-o.fx.estimatedTail);
});
test('locked and spot each win in actual scenarios; locked amount never changes with later FX',()=>{
 let spotWins=false,lockedWins=false;
 for(let startWeek=1;startWeek<=14;startWeek++){
  let base=createFxGame();
  while(base.week<startWeek)base=reduceTrade(base,{type:'ADVANCE_DAYS',days:7}).state;
  const id=base.offers[0].id;
  const l=quoteOrder(base,id,{markup:-10,fxMode:'locked'}),p=quoteOrder(base,id,{markup:-10,fxMode:'spot'});
  const actualSpot=Math.round(p.fx.tailUsdCents*fxRateAt(dayToWeek(p.settlementDay))/1000000);
  if(actualSpot>l.fx.estimatedTail-l.fx.fee)spotWins=true;
  if(actualSpot<l.fx.estimatedTail-l.fx.fee)lockedWins=true;
 }
 assert.equal(spotWins,true);assert.equal(lockedWins,true);
 const {s,o}=fxRun('long','locked',7);assert.equal(s.metrics.profit,o.profit);
 assert.equal(s.cash,18000+o.profit-(s.week-1)*120);
});
test('FX imports reject inconsistent currencies, fees, conversions, rates and monetary steps',()=>{
 const signed=acceptAny(createFxGame(),'long',{fxMode:'spot'});
 for(const mutate of [
 x=>x.active[0].fx.fee=1,x=>x.active[0].fx.mode='x',x=>x.active[0].fx.signRate=NaN,
 x=>x.active[0].fx.tailUsdCents++,x=>x.active[0].fx.estimatedTail++,x=>x.active[0].fx.minTail++,
 x=>x.active[0].steps[0].amount++,x=>x.active[0].offer.currency='EUR',x=>x.active[0].fx=null,
 x=>x.offers[0].usdUnitCents++,x=>x.offers[0].quoteRate++
 ]){const bad=copy(signed);mutate(bad);assert.throws(()=>parseTradeSave(bad));}
 let delivered=days(signed,signed.active[0].deliveryDay-signed.day);
 for(const mutate of [x=>x.receivables[0].fx=null,x=>x.receivables[0].amount++,x=>x.receivables[0].fx.fee=99,x=>x.receivables[0].customerId='invalid']){
 const bad=copy(delivered);mutate(bad);assert.throws(()=>parseTradeSave(bad));}
});
test('ruleset4 migrates without repricing old active contracts or receivables',()=>{
 for(const phase of ['active','receivable']){
  let s=acceptAny(createTradeGame(),'long');
  if(phase==='receivable')s=days(s,s.active[0].deliveryDay-s.day);
  s.ruleset=4;const original=copy(s),m=parseTradeSave(s);
  assert.equal(m.ruleset,5);assert.equal(m.day,s.day);
  for(const key of ['cash','debt','metrics','active','receivables','offers','ending'])assert.deepEqual(m[key],original[key]);
  assert.deepEqual(s,original);assert.deepEqual(parseTradeSave(m),m);
 }
});
test('delivery notices distinguish final profit from unsettled spot estimates and disclose signing fees',()=>{
 for(const mode of ['locked','spot']){
  let s=acceptAny(createFxGame(),'quick',{fxMode:mode});const o=copy(s.active[0]);
  const signed=s.log.find(l=>l.text.includes('签约 ')).text;
  assert.ok(signed.includes('USD '+(o.fx.usdCents/100).toFixed(2)));
  assert.ok(signed.includes('订金 ¥'+o.deposit));assert.ok(signed.includes('工厂首付 ¥'+o.procurement));assert.ok(signed.includes('锁汇费 ¥'+o.fx.fee));
  s=days(s,o.deliveryDay-s.day-1);const r=reduceTrade(s,{type:'NEXT_DAY'});
  const expected=o.profit+Math.round(o.fx.tailUsdCents*(mode==='locked'?o.fx.lockedRate:fxRateAt(r.state.week))/1000000)-o.fx.estimatedTail;
  assert.equal(r.summary.profit,expected);assert.equal(r.summary.fxAdjustment,0);assert.equal(r.summary.estimatedDeliveries,0);
  assert.ok(r.message.includes('交付订单利润 ¥'+expected));assert.doesNotMatch(r.message,/暂估|此前应收/);
  const delivered=r.state.log.find(l=>l.text.includes('收货：')).text;assert.ok(delivered.includes('本单利润 ¥'+expected));assert.doesNotMatch(delivered,/暂估/);
 }
});
test('long spot delivery is estimated, its later FX adjustment is not labeled as new delivery profit',()=>{
 let s=acceptAny(createFxGame(),'long',{fxMode:'spot'});const o=copy(s.active[0]);
 s=days(s,o.deliveryDay-s.day-1);let r=reduceTrade(s,{type:'NEXT_DAY'});
 assert.equal(r.summary.profit,o.profit);assert.equal(r.summary.estimatedDeliveries,1);assert.match(r.message,/1单浮动尾款暂估/);
 assert.match(r.state.log.find(l=>l.text.includes('收货：')).text,/浮动尾款未收，暂估/);
 s=days(r.state,o.dueDay-r.state.day-1);r=reduceTrade(s,{type:'NEXT_DAY'});
 const delta=Math.round(o.fx.tailUsdCents*fxRateAt(r.state.week)/1000000)-o.fx.estimatedTail;
 assert.equal(r.summary.profit,0);assert.equal(r.summary.deliveries,0);assert.equal(r.summary.fxAdjustment,delta);
 assert.match(r.message,/此前应收结汇损益调整/);assert.doesNotMatch(r.message,/交付订单利润/);
});
