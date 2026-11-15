import test from 'node:test';
import assert from 'node:assert/strict';
import {createTradeGame,reduceTrade,quoteOrder,parseTradeSave} from '../src/trade-economy.js';
function nextWeek(s){return reduceTrade(s,{type:'ADVANCE_DAYS',days:7,allowExpireOfferIds:s.offers.filter(o=>o.kind==='flagship').map(o=>o.id)}).state;}
function offer(s,market,kind){for(let i=0;i<6;i++){const o=s.offers.find(o=>o.market===market&&o.kind===kind);if(o)return {s,o};s=nextWeek(s);}throw Error('missing buyer');}
test('buyer contracts change optimal shipping and quality choices, not just region label',()=>{
 let base=createTradeGame();base.metrics.orders=8;base.reputation=8;base.cash=80000;
 let {s,o}=offer(nextWeek(base),'middle','quick');assert.equal(o.customer,'海湾展会配货商');assert.equal(o.deadlineDays,21);
 assert.ok(quoteOrder(s,o.id,{supplier:'reliable',shipping:'sea'}).lateDays>0);
 assert.equal(quoteOrder(s,o.id,{supplier:'reliable',shipping:'rail'}).penalty,0);
 assert.equal(quoteOrder(s,o.id,{supplier:'express',shipping:'sea'}).penalty,0);
 ({s,o}=offer(nextWeek(base),'europe','long'));assert.equal(o.quality,98);assert.equal(o.payLagDays,35);
 assert.ok(quoteOrder(s,o.id).penalty>0);s.upgrades.quality=1;assert.equal(quoteOrder(s,o.id).penalty,0);
 s.upgrades.quality=2;assert.equal(quoteOrder(s,o.id,{supplier:'economy'}).penalty,0);
 assert.deepEqual(parseTradeSave(JSON.stringify(s)),s);
 const asia=createTradeGame(),q=asia.offers.find(o=>o.kind==='quick');assert.equal(q.deadlineDays,35);assert.equal(quoteOrder(asia,q.id,{supplier:'economy'}).penalty,0);
});
test('new generation never changes existing inquiries or signed contracts on load',()=>{
 let s=createTradeGame();s=reduceTrade(s,{type:'ACCEPT',offerId:s.offers[0].id,markup:-10}).state;
 const raw=JSON.stringify(s),loaded=parseTradeSave(raw);assert.deepEqual(loaded,s);
 assert.equal(JSON.stringify(loaded.active),JSON.stringify(s.active));assert.equal(JSON.stringify(loaded.offers),JSON.stringify(s.offers));
});

test('hotel cash bridge and boutique quality sale are materially different future contracts',()=>{
 let base=createTradeGame();base.metrics.orders=8;base.reputation=8;base.cash=80000;
 let {s,o}=offer(nextWeek(base),'middle','long');assert.equal(o.kindName,'酒店开业备货');assert.ok(['cups','lights','textiles'].includes(o.product));assert.equal(o.depositRate,60);assert.equal(o.payLagDays,7);assert.equal(o.deadlineDays,28);
 assert.equal(quoteOrder(s,o.id,{supplier:'reliable',shipping:'sea'}).penalty,0);assert.ok(quoteOrder(s,o.id,{supplier:'economy',shipping:'sea'}).penalty>0);
 ({s,o}=offer(nextWeek(base),'europe','quick'));assert.equal(o.kindName,'精品店补货');assert.ok(['cups','lights','textiles'].includes(o.product));assert.equal(o.payLagDays,0);assert.equal(o.quality,98);assert.equal(o.depositRate,40);
 assert.ok(quoteOrder(s,o.id).penalty>0);s.upgrades.quality=1;assert.equal(quoteOrder(s,o.id).penalty,0);assert.deepEqual(parseTradeSave(JSON.stringify(s)),s);
});

test('European ordinary delivery unlocks framework, not market unlock or empty customer records',()=>{
 let s=createTradeGame();s.metrics.orders=8;s.reputation=16;s.cash=80000;s=nextWeek(s);assert.equal(s.offers.some(o=>o.kind==='flagship'),false);
 s.customers['europe-quick']={orders:0,revenue:0,market:'europe',name:'新客户'};s=nextWeek(s);assert.equal(s.offers.some(o=>o.kind==='flagship'),false);
 s.customers['europe-quick'].orders=1;s.customers['europe-quick'].revenue=5000;s=nextWeek(s);assert.ok(s.offers.some(o=>o.kind==='flagship'));assert.deepEqual(parseTradeSave(JSON.stringify(s)),s);
 // Prior-version framework inquiries remain valid and acceptable without rewriting their contract.
 delete s.customers['europe-quick'];assert.deepEqual(parseTradeSave(JSON.stringify(s)),s);const trial=s.offers.find(o=>o.kind==='flagship');assert.equal(quoteOrder(s,trial.id).offer.id,trial.id);
});

test('already signed legacy framework still delivers when no ordinary European record exists',()=>{
 let s=createTradeGame();s.metrics.orders=8;s.reputation=16;s.cash=80000;s.upgrades.quality=1;s.customers['europe-quick']={orders:1,revenue:5000,market:'europe',name:'旧客户'};s=nextWeek(s);
 const trial=s.offers.find(o=>o.kind==='flagship');s=reduceTrade(s,{type:'ACCEPT',offerId:trial.id,supplier:'reliable',shipping:'rail',markup:-10}).state;assert.equal(s.active.length,1);
 delete s.customers['europe-quick'];const restored=parseTradeSave(JSON.stringify(s));assert.deepEqual(restored,s);
 s=reduceTrade(restored,{type:'FOLLOW_ORDER',orderId:trial.id}).state;s=reduceTrade(s,{type:'FOLLOW_ORDER',orderId:trial.id}).state;assert.equal(s.customers['europe-flagship'].qualified,true);assert.deepEqual(parseTradeSave(JSON.stringify(s)),s);
});
