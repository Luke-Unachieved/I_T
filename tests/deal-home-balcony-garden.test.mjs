import test from 'node:test';import assert from 'node:assert/strict';
import {createDealRoom,reduceDealRoom,normalizeDealRoom} from '../src/deal-room-engine.js';
import {lifeCatalogue,lifePurchasePreview} from '../src/deal-room-life.js';
import {lifeRoomView} from '../src/deal-room-life-view.js';
const act=(s,type,x={})=>{const n=reduceDealRoom(s,{type,...x});assert.notEqual(n,s,type);return n;};
const close=(s,id)=>act(act(act(s,'PROPOSE',{optionId:id}),'ADVANCE'),'NEXT_CLIENT');
function twoOrders(s){s=act(s,'CONTINUE_BUSINESS');for(let i=0;i<2;i++)s=close(act(s,'SELECT_CLIENT',{clientId:'ines'}),'repeat-small');return s;}
function ready(){let s=createDealRoom();for(const id of ['trial','ready','season'])s=close(s,id);s=act(s,'BUY_LIFE_ITEM',{itemId:'chair'});assert.ok(!lifeCatalogue(s).some(i=>i.id==='balcony'));for(let i=0;i<3;i++)s=twoOrders(s);return s;}
const garden=(s,type,x={})=>act(s,type,{itemId:'balcony',...x});
test('a funded optional renovation opens a second place at home and does not charge a second time or create trade inventory',()=>{
 const s=ready(),before=structuredClone(s),q=lifePurchasePreview(s,'balcony');assert.equal(q.valid,true);assert.equal(q.item.price,9600);
 assert.match(lifeRoomView(s,{preview:'balcony'}),/改造预览 · 尚未购买/);assert.equal(reduceDealRoom(s,{type:'PLANT_BALCONY',itemId:'balcony',plant:'mint'}),s);
 const b=garden(s,'BUY_LIFE_ITEM');assert.equal(b.cash,s.cash-9600);assert.equal(b.day,s.day);assert.deepEqual(b.contracts,s.contracts);assert.equal(b.personalLife.spent,10400);
 assert.equal(reduceDealRoom(b,{type:'BUY_LIFE_ITEM',itemId:'balcony'}),b);assert.equal(reduceDealRoom(b,{type:'ARRANGE_LIFE_ITEM',itemId:'balcony',position:'inside'}),b);
 const html=lifeRoomView(b,{using:'balcony'});assert.match(html,/data-balcony-stage="empty"/);assert.match(html,/种雏菊 · 7 个经营日/);assert.doesNotMatch(html,/data-life-place="balcony"/);assert.deepEqual(s,before);
});
test('mint and flowers grow only as actual orders advance dates; tea is consumed once and the dried bouquet remains in the reading room',()=>{
 let s=garden(ready(),'BUY_LIFE_ITEM');const day=s.day;s=garden(s,'PLANT_BALCONY',{plant:'mint'});assert.equal(s.day,day);assert.equal(reduceDealRoom(s,{type:'HARVEST_BALCONY',itemId:'balcony'}),s);
 assert.match(lifeRoomView(s,{using:'balcony'}),/data-balcony-stage="new"/);s=twoOrders(s);assert.match(lifeRoomView(s,{using:'balcony'}),/data-balcony-stage="ready"/);
 const cash=s.cash;s=garden(s,'HARVEST_BALCONY');s=garden(s,'BREW_BALCONY_TEA');assert.equal(s.cash,cash);assert.equal(reduceDealRoom(s,{type:'BREW_BALCONY_TEA',itemId:'balcony'}),s);
 s=garden(s,'PLANT_BALCONY',{plant:'daisy'});s=twoOrders(s);assert.equal(reduceDealRoom(s,{type:'HARVEST_BALCONY',itemId:'balcony'}),s);s=twoOrders(s);s=garden(s,'HARVEST_BALCONY');
 assert.match(lifeRoomView(s,{using:'chair'}),/自己在阳台种的雏菊干花/);assert.deepEqual(normalizeDealRoom(s),s);
});
