import test from 'node:test';
import assert from 'node:assert/strict';
import {createOpeningGame,reduceOpening,normalizeOpeningSave,quoteOpening,currentOpeningOrders,businessCustomers,paymentOptions,cargoCapacity,berthUpgrade} from '../src/rework-opening.js';
function move(s,type,orderId,route,extra={}){const r=reduceOpening(s,{type,orderId,route,...extra});assert.equal(r.feedback.ok,true,r.feedback.message);return r.state;}
function sale(s,id,route='sea'){for(const t of ['PURCHASE','SHIP','DELIVER'])s=move(s,t,id,route);return s;}
function completed(){let s=createOpeningGame();s=sale(s,'quick');s=sale(s,'urgent','express');s=sale(s,'large');s=move(s,'COLLECT','large');s=move(s,'INVEST',null,null,{choice:'express'});s=sale(s,'port-quick','express');s=sale(s,'port-large','express');s=sale(s,'port-urgent','express');s=move(s,'COLLECT','port-large');s=move(s,'NEXT_STAGE');s=sale(s,'choice-bulk','express');s=sale(s,'choice-regular','sea');s=move(s,'COLLECT','choice-bulk');return s;}
function business(){return move(completed(),'START_BUSINESS');}
function finishRound(s){for(const order of currentOpeningOrders(s)){s=sale(s,order.id,'express');}for(const order of currentOpeningOrders(s).filter(o=>o.status==='receivable').sort((a,b)=>a.collectionDay-b.collectionDay)){if(s.orders.find(o=>o.id===order.id).status==='receivable')s=move(s,'COLLECT',order.id);}return s;}
test('finished three-stage saves enter business only explicitly and preserve every historical contract',()=>{
 const old=completed(),snapshot=structuredClone(old.orders);delete old.businessRound;delete old.berthCount;delete old.berthInvestmentCost;
 const normalized=normalizeOpeningSave(old);assert.ok(normalized);assert.equal(normalized.businessRound,0);assert.equal(normalized.ending,true);assert.deepEqual(normalized.orders,snapshot);
 assert.equal(reduceOpening(createOpeningGame(),{type:'START_BUSINESS'}).feedback.ok,false);
 const s=move(normalized,'START_BUSINESS');assert.equal(s.businessRound,1);assert.equal(s.stage,3);assert.equal(s.ending,false);assert.equal(s.cash,old.cash);assert.equal(s.day,old.day);assert.deepEqual(s.orders.slice(0,10),snapshot);assert.equal(currentOpeningOrders(s).length,2);assert.ok(normalizeOpeningSave(s));
});
test('payment choice changes real quote and locks on procurement without changing earlier contracts',()=>{
 let s=business();const o=currentOpeningOrders(s)[0],prior=JSON.stringify(s.orders.slice(0,10));const choices=paymentOptions(s,o.id);assert.equal(choices.find(x=>x.id==='credit').selected,true);
 const credit=quoteOpening(s,o.id,'express');s=move(s,'SET_PAYMENT',o.id,null,{paymentTerms:'cash'});const cash=quoteOpening(s,o.id,'express');assert.equal(cash.revenue,Math.floor(credit.revenue*.92));assert.equal(cash.payLag,0);assert.equal(credit.collectionDay-cash.collectionDay,6);assert.equal(JSON.stringify(s.orders.slice(0,10)),prior);
 s=move(s,'PURCHASE',o.id);const denied=reduceOpening(s,{type:'SET_PAYMENT',orderId:o.id,paymentTerms:'credit'});assert.equal(denied.feedback.ok,false);assert.equal(denied.state,s);s=move(s,'SHIP',o.id,'express');s=move(s,'DELIVER',o.id);assert.equal(s.orders.find(x=>x.id===o.id).status,'paid');assert.equal(businessCustomers(s)[0].repeatPaid,1);assert.ok(normalizeOpeningSave(s));
});
test('repeat rounds keep stable quantities, require paid invoices, and derive growth from paid orders',()=>{
 let s=business();assert.equal(reduceOpening(s,{type:'NEXT_BUSINESS_ROUND'}).feedback.ok,false);const contracts=currentOpeningOrders(s).map(o=>({customerId:o.customerId,quantity:o.quantity,baseRevenue:o.baseRevenue}));s=finishRound(s);assert.equal(s.ending,true);assert.deepEqual(businessCustomers(s).map(c=>c.completed),[1,1]);const day=s.day,cash=s.cash;s=move(s,'NEXT_BUSINESS_ROUND');assert.equal(s.businessRound,2);assert.equal(s.day,day);assert.equal(s.cash,cash);assert.deepEqual(currentOpeningOrders(s).map(o=>({customerId:o.customerId,quantity:o.quantity,baseRevenue:o.baseRevenue})),contracts);assert.ok(normalizeOpeningSave(s));s=finishRound(s);assert.deepEqual(businessCustomers(s).map(c=>c.repeatPaid),[2,2]);assert.ok(normalizeOpeningSave(s));
});
test('second berth is a one-time cash investment with a trading reserve and stable cargo slots',()=>{
 assert.equal(berthUpgrade(completed()).available,false);let s=business();s.cash=2500;assert.equal(berthUpgrade(s).available,false);s.cash=10000;const original=s.investmentCost;s=move(s,'EXPAND_BERTH');assert.equal(s.cash,7500);assert.equal(s.berthInvestmentCost,2500);assert.equal(s.investmentCost,original);assert.equal(cargoCapacity(s),2);assert.equal(berthUpgrade(s).available,false);
 const [a,b]=currentOpeningOrders(s);s=move(s,'PURCHASE',a.id);s=move(s,'PURCHASE',b.id);assert.deepEqual(currentOpeningOrders(s).map(o=>o.berthIndex),[0,1]);assert.ok(normalizeOpeningSave(s));const bad=structuredClone(s);currentOpeningOrders(bad)[1].berthIndex=0;assert.equal(normalizeOpeningSave(bad),null);
});
test('two-ship delivery cannot skip the earlier arrival and charges elapsed days only once',()=>{
 let s=business();s.cash=12000;s=move(s,'EXPAND_BERTH');const [a,b]=currentOpeningOrders(s);s=move(s,'PURCHASE',a.id);s=move(s,'SHIP',a.id,'sea');s=move(s,'PURCHASE',b.id);s=move(s,'SHIP',b.id,'express');const day=s.day,cost=s.operatingCostPaid;const denied=reduceOpening(s,{type:'DELIVER',orderId:a.id});assert.equal(denied.feedback.ok,false);assert.equal(denied.state,s);
 s=move(s,'DELIVER',b.id);assert.equal(s.day,day+1);assert.equal(s.orders.find(o=>o.id===a.id).status,'shipping');assert.equal(s.orders.find(o=>o.id===a.id).berthIndex,0);assert.equal(s.orders.find(o=>o.id===b.id).berthIndex,1);s=move(s,'DELIVER',a.id);assert.equal(s.day,day+4);assert.equal(s.operatingCostPaid-cost,200);assert.ok(normalizeOpeningSave(s));
});
test('another packed cargo freight and shared runway remain reserved during parallel purchase',()=>{
 let s=business();s.cash=12000;s=move(s,'EXPAND_BERTH');const [a,b]=currentOpeningOrders(s);s=move(s,'PURCHASE',a.id);const q=quoteOpening(s,b.id,'express');assert.ok(q.otherFreightReserve>0);assert.ok(q.sharedOperatingReserve>=q.operatingReserve);
 s.cash=q.cashNeeded+q.operatingReserve;const constrained=quoteOpening(s,b.id,'express');assert.ok(constrained.cashAfterReserve<0);assert.equal(constrained.valid,false);
});
test('business save validation rejects unrecognized customers, altered contract terms and unfinished past rounds',()=>{
 const s=business();for(const mutate of [x=>currentOpeningOrders(x)[0].customerId='unknown',x=>currentOpeningOrders(x)[0].baseRevenue++,x=>currentOpeningOrders(x)[0].revenue++,x=>currentOpeningOrders(x)[0].paymentTerms='free',x=>x.orders.push({...currentOpeningOrders(x)[0],id:'made-up'}),x=>x.businessRound=99,x=>currentOpeningOrders(x)[0].purchaseCost=0]){const bad=structuredClone(s);mutate(bad);assert.equal(normalizeOpeningSave(bad),null);}
 const next=move(finishRound(s),'NEXT_BUSINESS_ROUND');const bad=structuredClone(next);bad.orders.find(o=>o.businessRound===1).status='receivable';assert.equal(normalizeOpeningSave(bad),null);
});
