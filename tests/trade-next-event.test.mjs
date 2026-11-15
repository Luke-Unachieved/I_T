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

test('following one order reaches shipping without interrupting for ordinary weekly offers',()=>{
 let s=createTradeGame('盯首单');s=reduceTrade(s,{type:'ACCEPT',offerId:s.offers[0].id,markup:0}).state;assert.equal(s.active.length,1);
 const id=s.active[0].id,raw=JSON.stringify(s),r=reduceTrade(s,{type:'FOLLOW_ORDER',orderId:id});assert.equal(r.state.day,15);assert.equal(r.state.active[0].paidShipping,true);assert.equal(JSON.stringify(s),raw);
 let daily=s;for(let i=0;i<14;i++)daily=reduceTrade(daily,{type:'NEXT_DAY'}).state;assert.deepEqual(r.state,daily);assert.deepEqual(parseTradeSave(JSON.stringify(r.state)),r.state);
 const delivered=reduceTrade(r.state,{type:'FOLLOW_ORDER',orderId:id});assert.equal(delivered.state.day,29);assert.equal(delivered.state.metrics.orders,1);assert.equal(delivered.state.active.length,0);
});
test('follow order refuses obsolete targets and preserves cash and flagship safeguards',()=>{
 const s=full(),id=s.active[0].id;assert.equal(reduceTrade(s,{type:'FOLLOW_ORDER',orderId:'obsolete'}).changed,false);
 s.cash=0;const gap=reduceTrade(s,{type:'FOLLOW_ORDER',orderId:id});assert.equal(gap.pause.code,'funding_gap');assert.equal(gap.state.day,7);
 const t=full();t.day=7;t.offers=[{id:'pending',kind:'flagship',expiresDay:7}];const paused=reduceTrade(t,{type:'FOLLOW_ORDER',orderId:t.active[0].id});assert.equal(paused.advancedDays,0);assert.equal(paused.pause.code,'offers_expiring');
});

test('opening customer funds a visible first win without changing later prices or old offers',()=>{const s=createTradeGame('第一笔');const q=s.offers.find(o=>o.kind==='quick');assert.equal(q.kindName,'开张首单');let r=reduceTrade(s,{type:'ACCEPT',offerId:q.id});const id=r.state.active[0].id;r=reduceTrade(r.state,{type:'FOLLOW_ORDER',orderId:id});r=reduceTrade(r.state,{type:'FOLLOW_ORDER',orderId:id});assert.ok(r.state.cash>=20000&&r.state.cash<22000);assert.equal(r.state.metrics.orders,1);assert.ok(r.state.offers.every(o=>o.kindName!=='开张首单'));assert.deepEqual(parseTradeSave(JSON.stringify(r.state)),r.state);});

test('explicit focused waiting does not repeatedly stop for refreshed framework offers but retains cash safety',()=>{let s=createTradeGame('等回款');s.metrics.orders=8;s.customers["europe-quick"]={orders:1,revenue:8000,market:"europe",name:"欧洲老客户"};s.reputation=16;s.cash=20000;s=reduceTrade(s,{type:'ADVANCE_DAYS',days:7}).state;s.receivables=[{id:'tail',amount:10000,dueDay:36,dueWeek:6,customer:'客户'}];let first=reduceTrade(s,{type:'FOLLOW_ORDER',orderId:'tail'});assert.equal(first.pause.code,'offers_expiring');const focused=reduceTrade(first.state,{type:'FOLLOW_ORDER',orderId:'tail',allowExpireDuringFollow:true});assert.equal(focused.state.day,36);assert.equal(focused.summary.receipts,10000);assert.equal(focused.state.receivables.length,0);const poor={...first.state,cash:0};const stopped=reduceTrade(poor,{type:'FOLLOW_ORDER',orderId:'tail',allowExpireDuringFollow:true});assert.equal(stopped.pause.code,'funding_gap');});
