import test from 'node:test';
import assert from 'node:assert/strict';
import {supplyPlaybackFrames} from '../src/deal-room-supply-view.js';
test('供货回放只来自已签事件，不改变日期、款项或合同',()=>{
 const plan={clientName:'Mira',product:'台灯',totalQuantity:180,lots:[{id:'first',quantity:60},{id:'second',quantity:120}],events:[{kind:'delivery',day:29,lotId:'first',income:0},{kind:'start',day:31,lotId:'second'},{kind:'delivery',day:34,lotId:'second',income:0},{kind:'payment',day:38,income:5250}]};
 const before=JSON.stringify(plan),frames=supplyPlaybackFrames(plan);
 assert.deepEqual(frames.map(f=>f.day),[29,31,34,38]);assert.equal(frames[1].quantity,120);assert.match(frames[0].detail,/尾款日期不变/);assert.match(frames[3].detail,/5,250/);assert.equal(JSON.stringify(plan),before);
});
