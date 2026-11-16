import test from 'node:test';
import assert from 'node:assert/strict';
import {createOpeningGame,quoteOpening,reduceOpening,STORAGE_KEY,availableInvestments,normalizeOpeningSave,INVESTMENTS,DAILY_OPERATING_COST} from '../src/rework-opening.js';
const act=(s,type,orderId,route)=>reduceOpening(s,{type,orderId,route});
function sale(s,id,route='sea'){for(const type of ['PURCHASE','SHIP','DELIVER']){const r=act(s,type,id,route);assert.equal(r.feedback.ok,true,r.feedback.message);s=r.state;}return s;}
test('independent opening is deterministic and quotes are pure',()=>{const s=createOpeningGame(),before=JSON.stringify(s);assert.notEqual(STORAGE_KEY,'trade-tycoon:data:v2');assert.deepEqual(s,createOpeningGame());const q=quoteOpening(s,'quick','sea');assert.equal(q.profit,350);assert.equal(q.collectionDay,5);assert.equal(JSON.stringify(s),before);});
test('urgent high price requires express and failed actions do not spend money',()=>{let s=createOpeningGame();assert.equal(quoteOpening(s,'urgent','sea').onTime,false);assert.equal(quoteOpening(s,'urgent','express').valid,true);s=act(s,'PURCHASE','urgent').state;const before=JSON.stringify(s),r=act(s,'SHIP','urgent','sea');assert.equal(r.feedback.ok,false);assert.equal(JSON.stringify(r.state),before);s=act(s,'SHIP','urgent','express').state;s=act(s,'DELIVER','urgent').state;assert.equal(s.cash,2300);assert.equal(s.completed,1);});
test('large credit order locks cash and collection explicitly advances time',()=>{const s=sale(createOpeningGame(),'large');assert.equal(s.cash,500);assert.equal(s.orders.find(o=>o.id==='large').status,'receivable');assert.equal(quoteOpening(s,'urgent','express').valid,false);assert.equal(act(s,'PURCHASE','urgent').feedback.ok,false);const r=act(s,'COLLECT','large');assert.equal(r.feedback.daysAdvanced,7);assert.equal(r.state.cash,2600);assert.equal(act(r.state,'COLLECT','large').feedback.ok,false);});
test('published next prices become current after delivery and only one live cargo occupies dock',()=>{let s=createOpeningGame();const expected=s.nextPrices;s=sale(s,'quick');assert.deepEqual(s.prices,expected);s=act(s,'PURCHASE','urgent').state;const cost=s.orders.find(o=>o.id==='urgent').purchaseCost;assert.equal(act(s,'PURCHASE','large').feedback.ok,false);const altered=structuredClone(s);altered.prices.lights=1;assert.equal(quoteOpening(altered,'urgent','express').purchaseCost,cost);});
test('three completed payments unlock finite end and restart is fresh',()=>{let s=createOpeningGame();s=sale(s,'quick');s=sale(s,'urgent','express');s=sale(s,'large');assert.equal(s.portUnlocked,false);s=act(s,'COLLECT','large').state;assert.equal(s.portUnlocked,true);assert.equal(s.completed,3);assert.ok(s.cash>1800);assert.deepEqual(reduceOpening(s,{type:'RESTART'}).state,createOpeningGame());});
test('out of order actions reject without mutation and reserve enough for legal freight',()=>{const s=createOpeningGame();for(const type of ['SHIP','DELIVER','COLLECT'])assert.equal(act(s,type,'quick','sea').state,s);s.cash=700;assert.equal(act(s,'PURCHASE','urgent').feedback.ok,false);assert.equal(quoteOpening(s,'missing').valid,false);});

test('collection cannot skip cargo arrival or strand packed urgent cargo',()=>{
 let s=createOpeningGame();s.cash=4000;s=sale(s,'large');
 s=act(s,'PURCHASE','urgent').state;
 let r=act(s,'COLLECT','large');assert.equal(r.feedback.ok,false);assert.equal(r.state,s);assert.match(r.feedback.message,/先把码头/);
 s=act(s,'SHIP','urgent','express').state;
 r=act(s,'COLLECT','large');assert.equal(r.feedback.ok,false);assert.equal(r.state,s);assert.match(r.feedback.message,/先交付正在路上/);
 s=act(s,'DELIVER','urgent').state;assert.equal(act(s,'COLLECT','large').feedback.ok,true);
});
test('shipping and paid quotes preserve booked express route despite a default or conflicting route',()=>{
 let s=createOpeningGame();s=act(s,'PURCHASE','urgent').state;s=act(s,'SHIP','urgent','express').state;
 for(const state of [s,act(s,'DELIVER','urgent').state])for(const route of [undefined,'sea']){
  const q=quoteOpening(state,'urgent',route);assert.equal(q.route,'express');assert.equal(q.freight,300);assert.equal(q.profit,500);assert.equal(q.arrivalDay,2);assert.equal(q.collectionDay,2);
 }
});

test('price history contains only initial and actual delivery price observations',()=>{
 let s=createOpeningGame();assert.deepEqual(s.priceHistory,[{day:1,prices:s.prices}]);
 const initial=structuredClone(s.priceHistory);s=act(s,'PURCHASE','large').state;s=act(s,'SHIP','large','sea').state;
 assert.deepEqual(s.priceHistory,initial);
 s=act(s,'DELIVER','large').state;assert.equal(s.priceHistory.length,2);
 assert.deepEqual(s.priceHistory[0],initial[0]);assert.deepEqual(s.priceHistory[1],{day:s.day,prices:s.prices});
 assert.notEqual(s.priceHistory[1].prices,s.prices);
 const observed=structuredClone(s.priceHistory);s=act(s,'COLLECT','large').state;assert.deepEqual(s.priceHistory,observed);
 assert.equal(reduceOpening(s,{type:'RESTART'}).state.priceHistory.length,1);
});

function firstStage(){let s=createOpeningGame();s=sale(s,'quick');s=sale(s,'urgent','express');s=sale(s,'large');return act(s,'COLLECT','large').state;}
test('both investments finish the larger second stage in every order with real changing prices',()=>{
 const ids=['port-quick','port-urgent','port-large'];
 for(const choice of ['warehouse','express'])for(const a of ids)for(const b of ids.filter(x=>x!==a)){
  let s=firstStage();const oldCash=s.cash;const r=reduceOpening(s,{type:'INVEST',choice});assert.equal(r.feedback.ok,true);s=r.state;
  assert.equal(s.cash,oldCash-700);assert.equal(s.investmentCost,700);assert.equal(s.stage,2);assert.equal(s.stageCompleted,0);assert.equal(s.portUnlocked,false);
  for(const id of [a,b,ids.find(x=>x!==a&&x!==b)]){s=sale(s,id,id==='port-urgent'?'express':'sea');if(id==='port-large')s=act(s,'COLLECT',id).state;assert.ok(s.cash>=0);}
  assert.equal(s.completed,6);assert.equal(s.stageCompleted,3);assert.equal(s.ending,true);assert.equal(s.portUnlocked,true);assert.equal(s.priceHistory.length,7);assert.notDeepEqual(s.priceHistory[4].prices,s.priceHistory[5].prices);
 }
});
test('investment requires first-stage settlement, is single use, and protects working cash',()=>{
 let s=createOpeningGame();assert.equal(INVESTMENTS.length,2);assert.equal(reduceOpening(s,{type:'INVEST',choice:'warehouse'}).state,s);
 s=firstStage();s.cash=800;assert.ok(availableInvestments(s).every(i=>!i.available));assert.equal(reduceOpening(s,{type:'INVEST',choice:'express'}).state,s);
 s=firstStage();s=reduceOpening(s,{type:'INVEST',choice:'warehouse'}).state;assert.equal(reduceOpening(s,{type:'INVEST',choice:'express'}).state,s);
});
test('investment quotes use integer discounts and preserve procurement and booked freight',()=>{
 let s=reduceOpening(firstStage(),{type:'INVEST',choice:'warehouse'}).state;
 let q=quoteOpening(s,'port-quick');assert.equal(q.purchaseCost,Math.floor(q.basePurchaseCost*.9));assert.equal(q.discountSavings,q.basePurchaseCost-q.purchaseCost);
 s=act(s,'PURCHASE','port-quick').state;const locked=q.purchaseCost;s.prices.cups=99;assert.equal(quoteOpening(s,'port-quick').purchaseCost,locked);
 s=reduceOpening(firstStage(),{type:'INVEST',choice:'express'}).state;q=quoteOpening(s,'port-urgent','express');assert.equal(q.freight,180);assert.equal(q.purchaseCost,q.basePurchaseCost);
 s=act(s,'PURCHASE','port-urgent').state;s=act(s,'SHIP','port-urgent','express').state;assert.equal(quoteOpening(s,'port-urgent').freight,180);assert.equal(quoteOpening(s,'port-urgent').route,'express');
});
test('isolated legacy saves gain stage fields but never fabricated historical prices',()=>{
 const old=firstStage();for(const k of ['stage','stageCompleted','investment','investmentCost','ending','history','priceHistory'])delete old[k];old.orders.forEach(o=>delete o.stage);
 const restored=normalizeOpeningSave(JSON.stringify(old));assert.equal(restored.stage,1);assert.equal(restored.stageCompleted,3);assert.equal(restored.portUnlocked,true);assert.equal(restored.ending,false);assert.deepEqual(restored.priceHistory,[]);assert.deepEqual(restored.history,[]);assert.equal(restored.cash,old.cash);
 assert.equal(reduceOpening(restored,{type:'INVEST',choice:'warehouse'}).feedback.ok,true);
 const modern=reduceOpening(firstStage(),{type:'INVEST',choice:'express'}).state;assert.deepEqual(normalizeOpeningSave(modern),modern);
 assert.equal(normalizeOpeningSave({version:7,cash:1000,active:[]}),null);assert.equal(normalizeOpeningSave('{bad'),null);assert.equal(normalizeOpeningSave({...old,cash:-1}),null);
});

test('new-port express takes two days without a fixed lane while tutorial stays one day',()=>{
 assert.equal(quoteOpening(createOpeningGame(),'urgent','express').transitDays,1);
 for(const choice of ['warehouse','express']){let s=reduceOpening(firstStage(),{type:'INVEST',choice}).state;const q=quoteOpening(s,'port-urgent','express');assert.equal(q.transitDays,choice==='express'?1:2);assert.equal(q.valid,true);s=act(s,'PURCHASE','port-urgent').state;s=act(s,'SHIP','port-urgent','express').state;const before=quoteOpening(s,'port-urgent');s.day++;assert.equal(quoteOpening(s,'port-urgent').arrivalDay,before.arrivalDay);assert.equal(quoteOpening(s,'port-urgent').transitDays,before.transitDays);}
});
test('normalization preserves signed contract economics and legacy locked dates and freight',()=>{
 let s=reduceOpening(firstStage(),{type:'INVEST',choice:'warehouse'}).state;s=act(s,'PURCHASE','port-urgent').state;s=act(s,'SHIP','port-urgent','express').state;
 const o=s.orders.find(o=>o.id==='port-urgent');Object.assign(o,{quantity:19,revenue:2444,deadlineDays:3,payLag:11,arrivalDay:s.day+1,collectionDay:s.day+12,freight:277});delete o.transitDays;delete o.shipDay;
 const saved=structuredClone(o);const restored=normalizeOpeningSave(s);const kept=restored.orders.find(o=>o.id==='port-urgent');
 for(const key of Object.keys(saved))assert.deepEqual(kept[key],saved[key],key);
 const q=quoteOpening(restored,'port-urgent');assert.equal(q.arrivalDay,saved.arrivalDay);assert.equal(q.collectionDay,saved.collectionDay);assert.equal(q.freight,277);assert.equal(q.transitDays,1);
 const paid=s.orders.find(o=>o.id==='quick');paid.revenue=999;paid.quantity=13;paid.payLag=2;assert.equal(normalizeOpeningSave(s).orders.find(o=>o.id==='quick').revenue,999);
});

test('operating costs charge only actual elapsed days including a nine-day wait',()=>{
 let s=reduceOpening(firstStage(),{type:'INVEST',choice:'warehouse'}).state;s=sale(s,'port-large','sea');const cash=s.cash,paid=s.operatingCostPaid;const r=act(s,'COLLECT','port-large');assert.equal(r.feedback.operatingCost,450);assert.equal(r.state.cash,cash+3000-450);assert.equal(r.state.operatingCostPaid,paid+450);assert.equal(act(r.state,'COLLECT','port-large').feedback.ok,false);
});
test('work filling payment lag does not double-charge time and new orders reserve operations',()=>{
 let s=reduceOpening(firstStage(),{type:'INVEST',choice:'express'}).state;const start=s.day;s=sale(s,'port-quick','express');s=sale(s,'port-large','express');s=sale(s,'port-urgent','express');s=act(s,'COLLECT','port-large').state;assert.equal(s.cash,5070);assert.equal(s.day-start,11);assert.equal(s.operatingCostPaid,550);
 let poor=reduceOpening(firstStage(),{type:'INVEST',choice:'warehouse'}).state;poor.cash=2000;const q=quoteOpening(poor,'port-large','sea');assert.ok(q.cashAfterPayment>=0);assert.ok(q.cashAfterReserve<0);assert.equal(q.valid,false);assert.equal(act(poor,'PURCHASE','port-large').feedback.ok,false);
});
test('legacy low-cash shipment settles receivable and costs atomically without retroactive fees',()=>{
 let old=reduceOpening(firstStage(),{type:'INVEST',choice:'warehouse'}).state;old=sale(old,'port-quick');old=act(old,'PURCHASE','port-large').state;old=act(old,'SHIP','port-large','sea').state;old.cash=100;delete old.operatingCostPaid;delete old.dailyOperatingCost;const day=old.day;let s=normalizeOpeningSave(old);assert.equal(s.day,day);assert.equal(s.operatingCostPaid,0);assert.equal(s.dailyOperatingCost,50);
 assert.equal(act(s,'DELIVER','port-large').feedback.ok,false);const q=quoteOpening(s,'port-large');assert.equal(q.canSettle,true);const r=act(s,'SETTLE','port-large');assert.equal(r.feedback.ok,true);assert.equal(r.state.cash,100+3000-q.settleOperatingCost);assert.equal(r.feedback.operatingCost,q.settleOperatingCost);assert.equal(r.state.orders.find(o=>o.id==='port-large').status,'paid');assert.equal(act(r.state,'SETTLE','port-large').feedback.ok,false);
});

test('single fifty-yuan operating rate is exposed and warehouse retains a slower higher-cash strategy',()=>{
 assert.equal(DAILY_OPERATING_COST,50);assert.ok(availableInvestments(firstStage()).every(i=>i.dailyCost===50));let s=reduceOpening(firstStage(),{type:'INVEST',choice:'warehouse'}).state;const start=s.day;s=sale(s,'port-large','sea');s=sale(s,'port-quick','sea');s=sale(s,'port-urgent','express');s=act(s,'COLLECT','port-large').state;assert.equal(s.cash,5366);assert.equal(s.day-start,13);assert.equal(s.operatingCostPaid,650);
});
function secondStage(choice='warehouse'){let s=reduceOpening(firstStage(),{type:'INVEST',choice}).state;for(const id of ['port-quick','port-urgent','port-large']){s=sale(s,id,id==='port-urgent'?'express':'sea');if(id==='port-large')s=act(s,'COLLECT',id).state;}return s;}
test('third stage is explicit, preserves a finished legacy stage, and opens four offers for two signatures',()=>{
 const old=secondStage();delete old.stageTarget;delete old.stageSigned;const restored=normalizeOpeningSave(old);assert.equal(restored.stage,2);assert.equal(restored.ending,true);assert.equal(restored.orders.length,6);
 assert.equal(reduceOpening(firstStage(),{type:'NEXT_STAGE'}).feedback.ok,false);
 let s=reduceOpening(restored,{type:'NEXT_STAGE'}).state;assert.equal(s.stage,3);assert.equal(s.stageTarget,2);assert.equal(s.stageSigned,0);assert.equal(s.ending,false);assert.equal(s.cash,old.cash);assert.equal(s.day,old.day);assert.equal(s.orders.filter(o=>o.stage===3).length,4);
 s=sale(s,'choice-restock','express');assert.equal(s.stageSigned,1);assert.equal(s.ending,false);assert.equal(s.orders.filter(o=>o.status==='declined').length,0);
 s=act(s,'PURCHASE','choice-urgent').state;assert.equal(s.stageSigned,2);assert.equal(s.stageCompleted,1);assert.equal(s.orders.filter(o=>o.status==='declined').length,2);assert.equal(quoteOpening(s,'choice-bulk').valid,false);assert.ok(Number.isFinite(quoteOpening(s,'choice-bulk').profit));assert.ok(Number.isFinite(quoteOpening(s,'choice-bulk').cashAfterReserve));assert.equal(act(s,'PURCHASE','choice-bulk').feedback.ok,false);assert.deepEqual(normalizeOpeningSave(s),s);
 s=act(s,'SHIP','choice-urgent','express').state;s=act(s,'DELIVER','choice-urgent').state;assert.equal(s.ending,true);assert.equal(s.completed,8);assert.equal(s.stageCompleted,2);assert.equal(s.portUnlocked,true);assert.equal(reduceOpening(s,{type:'NEXT_STAGE'}).feedback.ok,false);assert.deepEqual(normalizeOpeningSave(s),s);
});
test('third-stage choices retain fast-lane terms and meaningful capital versus speed outcomes',()=>{
 const run=(choice,ids,routes)=>{let s=reduceOpening(secondStage(choice),{type:'NEXT_STAGE'}).state;const cash=s.cash,day=s.day;for(let i=0;i<ids.length;i++)s=sale(s,ids[i],routes[i]);for(const o of s.orders.filter(o=>o.status==='receivable').sort((a,b)=>a.collectionDay-b.collectionDay))s=act(s,'COLLECT',o.id).state;assert.equal(s.ending,true);return {net:s.cash-cash,days:s.day-day};};
 assert.deepEqual(run('warehouse',['choice-bulk','choice-regular'],['sea','sea']),{net:2156,days:10});
 assert.deepEqual(run('express',['choice-restock','choice-urgent'],['express','express']),{net:990,days:2});
 for(const choice of ['warehouse','express']){const s=reduceOpening(secondStage(choice),{type:'NEXT_STAGE'}).state;const q=quoteOpening(s,'choice-urgent','express');assert.equal(q.transitDays,choice==='express'?1:2);assert.equal(q.freight,choice==='express'?180:300);const poor=structuredClone(s);poor.cash=100;assert.equal(act(poor,'PURCHASE','choice-bulk').feedback.ok,false);assert.equal(poor.stageSigned,0);}
});
test('one collection settles both same-day third-stage receivables with one daily bill',()=>{
 let s=reduceOpening(firstStage(),{type:'INVEST',choice:'warehouse'}).state;s=sale(s,'port-quick');s=sale(s,'port-urgent','express');s=sale(s,'port-large');s=act(s,'COLLECT','port-large').state;s=reduceOpening(s,{type:'NEXT_STAGE'}).state;
 s=sale(s,'choice-bulk');s=sale(s,'choice-regular');const bulk=s.orders.find(o=>o.id==='choice-bulk'),regular=s.orders.find(o=>o.id==='choice-regular');assert.equal(bulk.collectionDay,regular.collectionDay);const before=s.cash,days=bulk.collectionDay-s.day;
 const r=act(s,'COLLECT','choice-bulk');assert.equal(r.feedback.ok,true);assert.equal(r.state.cash,before+6150-days*50);assert.equal(r.feedback.operatingCost,days*50);assert.equal(r.state.stageCompleted,2);assert.equal(r.state.ending,true);assert.equal(r.state.orders.find(o=>o.id==='choice-regular').status,'paid');assert.equal(act(r.state,'COLLECT','choice-regular').feedback.ok,false);
});
