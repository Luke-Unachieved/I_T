import test from 'node:test';
import assert from 'node:assert/strict';
import {createTradeGame,reduceTrade,rebookShipping,parseTradeSave} from '../src/trade-economy.js';
function signed(shipping='sea'){
 let s=createTradeGame('换船');const offer=s.offers.find(o=>o.kind==='quick');
 s=reduceTrade(s,{type:'ACCEPT',offerId:offer.id,shipping,supplier:'reliable'}).state;
 assert.equal(s.active.length,1);return s;
}
test('predeparture rebooking trades fixed cash margin for earlier delivery, without repricing contract',()=>{
 const s=signed(),old=s.active[0],raw=JSON.stringify(s),q=rebookShipping(s,old.id,'rail');
 assert.ok(q.valid);assert.equal(JSON.stringify(s),raw);assert.equal(q.daysSaved,7);assert.ok(q.extraFreight>0);
 let n=reduceTrade(s,{type:'REBOOK_SHIPPING',orderId:old.id,shipping:'rail'}).state;
 assert.equal(n.cash,s.cash);assert.equal(n.active[0].profit,old.profit-q.extraFreight);
 for(const k of ['revenue','cost','deposit','procurement','balance','penalty','quality','chance'])assert.equal(n.active[0][k],old[k]);
 assert.deepEqual(n.active[0].fx,old.fx);assert.deepEqual(parseTradeSave(JSON.stringify(n)),n);
 assert.equal(rebookShipping(n,old.id,'sea').valid,false);
 n=reduceTrade(n,{type:'FOLLOW_ORDER',orderId:old.id}).state;assert.equal(n.day,old.shipDay);assert.equal(n.active[0].paidShipping,true);
 assert.deepEqual(parseTradeSave(JSON.stringify(n)),n);
 assert.equal(rebookShipping(n,old.id,'sea').valid,false);
 n=reduceTrade(n,{type:'FOLLOW_ORDER',orderId:old.id}).state;assert.equal(n.day,old.deliveryDay-7);assert.equal(n.metrics.orders,1);
 assert.equal(n.metrics.profit,q.order.profit);assert.deepEqual(parseTradeSave(JSON.stringify(n)),n);
});
test('slower but on-time rebooking frees freight cash and increases margin; invalid alternatives do not mutate',()=>{
 const s=signed('rail'),o=s.active[0],q=rebookShipping(s,o.id,'sea');assert.ok(q.valid);assert.equal(q.daysSaved,-7);assert.ok(q.extraFreight<0);assert.ok(q.order.profit>o.profit);
 const n=reduceTrade(s,{type:'REBOOK_SHIPPING',orderId:o.id,shipping:'sea'}).state;assert.deepEqual(parseTradeSave(JSON.stringify(n)),n);
 for(const shipping of ['air','missing','rail'])assert.equal(rebookShipping(s,o.id,shipping).valid,false);
 const late=structuredClone(s);late.active[0].offer.deadlineDays=21;assert.equal(rebookShipping(late,o.id,'sea').valid,false);
 const poor=structuredClone(s);poor.cash=0;assert.equal(rebookShipping(poor,o.id,'sea').valid,false);
 assert.deepEqual(reduceTrade(s,{type:'REBOOK_SHIPPING',orderId:'missing',shipping:'sea'}).state,s);
});
