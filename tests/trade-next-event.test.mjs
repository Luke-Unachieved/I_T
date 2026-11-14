import test from 'node:test';
import assert from 'node:assert/strict';
import {createTradeGame,reduceTrade,nextTradeEvent,parseTradeSave} from '../src/trade-economy.js';
function full(){let s=createTradeGame('节点测试');for(const offer of [...s.offers].slice(0,2)){s=reduceTrade(s,{type:'ACCEPT',offerId:offer.id,markup:-10}).state;}assert.equal(s.active.length,2);return s;}
test('next milestone skips quiet days but uses identical daily settlement and intact saves',()=>{
 const s=full(),raw=JSON.stringify(s),node=nextTradeEvent(s);assert.equal(node.day,15);
 const fast=reduceTrade(s,{type:'NEXT_EVENT'});assert.equal(fast.advancedDays,14);assert.equal(fast.state.day,15);
 let daily=s;for(let i=0;i<14;i++)daily=reduceTrade(daily,{type:'NEXT_DAY'}).state;
 assert.deepEqual(fast.state,daily);assert.equal(JSON.stringify(s),raw);assert.deepEqual(parseTradeSave(JSON.stringify(fast.state)),fast.state);
 assert.equal(nextTradeEvent(fast.state).day,29);
 assert.equal(reduceTrade(s,{type:'ADVANCE_DAYS',days:14}).changed,false);
});
test('free slots stop for new inquiries and event traversal preserves funding pause',()=>{
 const fresh=createTradeGame();assert.equal(nextTradeEvent(fresh).day,8);assert.equal(reduceTrade(fresh,{type:'NEXT_EVENT'}).state.day,8);
 const s=full();s.cash=0;const r=reduceTrade(s,{type:'NEXT_EVENT'});assert.equal(r.pause.code,'funding_gap');assert.equal(r.state.day,7);assert.equal(r.pause.day,8);
});
test('next event cannot advance beyond record limit or bypass pending framework inquiry',()=>{
 const s=createTradeGame();s.day=3640;s.week=520;assert.equal(nextTradeEvent(s),null);assert.equal(reduceTrade(s,{type:'NEXT_EVENT'}).changed,false);
 const t=full();t.day=7;t.offers=[{id:'pending',kind:'flagship',expiresDay:7}];const r=reduceTrade(t,{type:'NEXT_EVENT'});assert.equal(r.advancedDays,0);assert.equal(r.pause.code,'offers_expiring');
});
