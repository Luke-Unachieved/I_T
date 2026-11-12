import test from 'node:test';
import assert from 'node:assert/strict';
import {PRODUCTS,WEEKEND_INQUIRIES} from '../src/content.js';
import {createGame,offers,reduce,parseSave} from '../src/engine.js';
const act=(s,type,id)=>{const r=reduce(s,{type,id});assert.ok(r.changed,r.message);return r.state;};
test('weekend inquiries rotate concrete product uses without demanding attendance',()=>{
 const cases=[6,7,13].map(day=>offers({...createGame(),day})[0]);
 assert.deepEqual(cases.map(o=>o.product),['handle','tool','hinge']);assert.equal(new Set(cases.map(o=>o.buyer)).size,3);
 assert.match(cases[0].request,/客房.*门把手/);assert.match(cases[1].request,/维修点.*工具/);assert.match(cases[2].request,/柜门.*合页/);
 for(const o of cases){assert.equal(o.need,'speed');assert.match(o.request,/可以等下个工作日再谈/);assert.equal(o.featured,true);}
 for(const day of [6,7,13,14,20,21]){const s={...createGame(),day};assert.equal(offers(s).length,1);assert.equal(reduce(s,{type:'accept',id:offers(s)[0].id}).changed,false);}
});
test('weekend prices belong to the declared scenario rather than an unrelated weekday customer',()=>{
 for(const [i,day]of [6,7,13].entries())for(const warehouse of [1,2])for(const stage of ['employee','founder']){
  const s={...createGame(),day,stage,warehouse},before=JSON.stringify(s),o=offers(s)[0],v=WEEKEND_INQUIRIES[i],p=PRODUCTS.find(p=>p.id===v.product);
  assert.equal(o.revenue,p.revenue+v.revenueDelta+(warehouse-1)*1800);
  assert.equal(o.cost,p.cost+v.costDelta+(warehouse-1)*1000);assert.equal(o.negotiationCase,stage==='founder'?'speed':null);
  assert.equal(JSON.stringify(s),before);assert.deepEqual(offers(s)[0],o);
 }
});
test('new weekend scenarios preserve an accepted order across a different next-day inquiry',()=>{
 let s={...createGame(),day:6},old=offers(s)[0];s=act(s,'weekend-work');s=act(s,'accept',old.id);s=act(s,'tactic','speed');
 const saved=structuredClone(s.active);s=act(act(s,'evening'),'rest');assert.notEqual(offers(s)[0].product,saved.product);
 assert.deepEqual(s.active,saved);assert.equal(reduce(s,{type:'factory',id:'steady'}).changed,false);
 s=act(s,'weekend-work');s=act(s,'factory','steady');s=act(s,'ship','normal');
 assert.equal(s.lastDelivery.product,old.product);assert.equal(s.lastDelivery.buyer,old.buyer);assert.deepEqual(parseSave(JSON.stringify(s)),s);
});
test('weekday inquiry variety and old accepted weekend snapshots stay intact',()=>{
 for(const day of [1,2,3,8,9,10])assert.equal(offers({...createGame(),day}).length,3);
 let s={...createGame(),day:6};s=act(s,'weekend-work');s=act(s,'accept',offers(s)[0].id);
 s.active.buyer='Omar';s.active.market='阿联酋 · 酒店补货';s.active.request='旧版已经接下的订单原文。';const old=structuredClone(s.active);
 const restored=parseSave(JSON.stringify(s));assert.deepEqual(restored.active,old);assert.notEqual(offers(restored)[0].buyer,old.buyer);
});
