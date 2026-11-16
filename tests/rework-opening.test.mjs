import test from 'node:test';
import assert from 'node:assert/strict';
import {createOpeningGame,quoteOpening,reduceOpening,STORAGE_KEY,availableInvestments,normalizeOpeningSave,INVESTMENTS} from '../src/rework-opening.js';
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

test('second-stage fastest comparison trades warehouse cash for fixed-lane time, not an extra reward',()=>{
 const results={};for(const choice of ['warehouse','express']){let s=firstStage();const start=s.day;s=reduceOpening(s,{type:'INVEST',choice}).state;s=sale(s,'port-large','express');s=sale(s,'port-quick','sea');s=sale(s,'port-urgent','express');s=act(s,'COLLECT','port-large').state;results[choice]={cash:s.cash,days:s.day-start};}
 assert.deepEqual(results,{warehouse:{cash:5816,days:11},express:{cash:5700,days:10}});
});
