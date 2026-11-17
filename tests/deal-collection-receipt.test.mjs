import test from 'node:test';
import assert from 'node:assert/strict';
import {collectionReceipt} from '../src/deal-room-relationships.js';
const paid=(buyerId,extra={})=>({buyerId,status:'paid',sets:60,paymentDay:22,...extra});
const state=(orders,extra={})=>({phase:'collection',feedback:{kind:'collection-review'},collection:{model:'own',status:'sample',style:'botanical',products:['mira','samir'],orders,...extra}});
test('reopened private series receipt retains actual Adrian, products and payment date without paid feedback',()=>{
 const s=state([paid('northline-private',{sets:80,paymentDay:53})],{model:'private',status:'complete',style:'charcoal',lampVersion:'developed'}),before=structuredClone(s);
 const r=collectionReceipt(s);assert.equal(r.buyer.name,'Adrian');assert.equal(r.buyer.company,'Northline');assert.equal(r.buyerId,'northline-private');assert.deepEqual(r.products,['mira','samir']);assert.equal(r.sets,80);assert.equal(r.style,'charcoal');assert.equal(r.scope,'private-label');assert.equal(r.paymentDay,53);assert.equal(r.lampVersion,'developed');assert.deepEqual(r.order,s.collection.orders[0]);assert.deepEqual(s,before);
 r.products.push('ines');r.buyer.name='changed';r.order.sets=1;assert.deepEqual(s,before);
 assert.equal(collectionReceipt(s,'northline').buyer.name,'Adrian');assert.equal(collectionReceipt(s,'atelier'),null);
});
test('latest paid order or explicitly requested contact supplies actual sleeve versus original',()=>{
 const s=state([paid('atelier',{scope:'nonexclusive',sets:50}),paid('northline',{scope:'whole-exclusive',paymentDay:30}),paid('atelier',{scope:'buyer-sleeve',style:'cream',sets:80,paymentDay:40}),{buyerId:'northline',status:'production',paymentDay:50}]);
 const last=collectionReceipt(s);assert.equal(last.buyer.name,'Élise');assert.equal(last.style,'cream');assert.equal(last.scope,'buyer-sleeve');assert.equal(last.sets,80);assert.equal(last.paymentDay,40);
 const selected=collectionReceipt(s,'northline');assert.equal(selected.scope,'whole-exclusive');assert.equal(selected.style,'botanical');assert.equal(selected.paymentDay,30);assert.equal(collectionReceipt(s,'unknown'),null);
});
test('no receipt for samples, unsigned/production contracts, other screens or unpaid requested buyer',()=>{
 for(const orders of [[],[{buyerId:'atelier'}],[{buyerId:'atelier',status:'production'}]])assert.equal(collectionReceipt(state(orders)),null);
 for(const status of ['draft','pitch','production'])assert.equal(collectionReceipt(state([paid('atelier')],{status})),null);
 assert.equal(collectionReceipt({...state([paid('atelier')]),phase:'review'}),null);
 assert.equal(collectionReceipt({phase:'collection'}),null);
 assert.equal(collectionReceipt(state([paid('atelier'),{buyerId:'northline',status:'production'}]),'northline'),null);
});
test('legacy paid original order stays unmodified while display derives the existing nonexclusive scope',()=>{
 const s=state([paid('northline')]),before=structuredClone(s);assert.equal(collectionReceipt(s).scope,'nonexclusive');assert.equal(collectionReceipt(s).order.scope,undefined);assert.deepEqual(s,before);
});

test('customer workbench derives delivered quantities and scope without offering another signature',async()=>{
 const {collectionBoardView}=await import('../src/deal-room-relationships.js');const state={phase:'collection',collection:{model:'own',status:'sample',style:'botanical',products:['mira','samir'],orders:[{status:'paid',buyerId:'atelier',scope:'buyer-sleeve',style:'cream',sets:80,paymentDay:40,netProfit:100}]}};
 const before=JSON.stringify(state),html=collectionBoardView(state,'atelier','original','delivered');assert.match(html,/每款 80 件已交付/);assert.match(html,/第 40 天结清/);assert.match(html,/纸套专供买方/);assert.match(html,/data-receipt-mode="delivered" aria-pressed="true"/);assert.doesNotMatch(html,/SIGN_/);assert.equal(JSON.stringify(state),before);
});
