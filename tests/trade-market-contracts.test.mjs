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
