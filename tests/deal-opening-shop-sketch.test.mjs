import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createDealRoom,currentClient,firstBuyerProjection,reduceDealRoom,previewOffer as previewQuote} from '../src/deal-room-engine.js';
const app=readFileSync(new URL('../src/deal-room-app.js',import.meta.url),'utf8'),context=vm.createContext({});
vm.runInContext(app.slice(app.indexOf('function openingShopSketch('),app.indexOf('function openingInboxView(')),context);
const scene=(s,id)=>context.openingShopSketch(s,currentClient(s),previewQuote(s,id));
const act=(s,type,a={})=>reduceDealRoom(s,{type,...a});
test('opening cutaways distinguish actual shop, quantity, timing and an unsigned counter without changing trade',()=>{
 const start=createDealRoom(),before=structuredClone(start);const small=scene(start,'trial'),big=scene(start,'rollout');
 assert.match(small,/一家店先试卖/);assert.equal((small.match(/class="shop-stock"/g)||[]).length,1);assert.equal((big.match(/class="shop-stock"/g)||[]).length,3);
 const early=firstBuyerProjection(start,'samir');assert.match(scene(early,'ready'),/data-mode="open"/);assert.match(scene(early,'branded-opening'),/data-mode="custom-open"/);
 const afterLamp=act(act(act(start,'PROPOSE',{optionId:'rollout'}),'ADVANCE'),'NEXT_CLIENT');assert.equal(afterLamp.day,10);assert.match(scene(afterLamp,'ready'),/data-mode="stock"/);assert.match(scene(afterLamp,'promise'),/data-mode="miss"/);assert.doesNotMatch(scene(afterLamp,'promise'),/class="opening-pennant"/);assert.match(scene(afterLamp,'branded'),/data-mode="custom-stock"/);
 const cloth=firstBuyerProjection(start,'ines');assert.match(scene(cloth,'small'),/data-mode="pair"/);assert.match(scene(cloth,'season'),/data-mode="season"/);assert.match(scene(cloth,'all-now'),/付款待谈/);
 assert.match(scene(firstBuyerProjection(afterLamp,'ines'),'season'),/data-mode="reserve"/);assert.deepEqual(start,before);assert.equal(context.openingShopSketch({...start,phase:'paid'},currentClient(start),previewQuote(start,'trial')),'');assert.equal(context.openingShopSketch({...start,businessRound:1},currentClient(start),previewQuote(start,'trial')),'');
 assert.equal((app.match(/openingShopSketch\(quoteState,client,p\)/g)||[]).length,2);
});
