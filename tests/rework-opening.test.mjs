import test from 'node:test';
import assert from 'node:assert/strict';
import {createOpeningGame,quoteOpening,reduceOpening,STORAGE_KEY} from '../src/rework-opening.js';
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
