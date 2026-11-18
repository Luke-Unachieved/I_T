import test from 'node:test';
import assert from 'node:assert/strict';
import {retailDemand,retailWait,retailPause,buyerWaitView} from '../src/deal-room-demand.js';
import {createDealRoom,reduceDealRoom,normalizeDealRoom} from '../src/deal-room-engine.js';
// Constructed boundary states test waiting rules, not genuine save validation.
function fixture(cash=0){return {...createDealRoom(),phase:'portfolio',retailPlanning:true,businessRound:1,day:11,cash,contracts:['mira','samir','ines'].map(clientId=>({clientId,status:'paid',retailPlanning:true,quantity:160,deliveryDay:10}))};}
test('low cash has explicit closed-studio wait, without changing ordinary wait pricing',()=>{
 for(const cash of [0,1,190,269]){const s=fixture(cash),before=structuredClone(s);assert.deepEqual(retailWait(s,'samir'),{day:20,days:9,cost:270,valid:false});assert.deepEqual(retailPause(s,'samir'),{day:20,days:9,cost:0});assert.match(buyerWaitView(s),/data-pause-buyer="samir"/);assert.match(buyerWaitView(s),/不营业、不计日费、不产生收入/);assert.deepEqual(s,before);}
 assert.equal(retailPause(fixture(270),'samir'),null);
});
test('pause refuses malformed cash, ready buyers, wrong phases and live obligations',()=>{
 for(const cash of [-1,NaN,Infinity,0.5])assert.equal(retailPause(fixture(cash),'samir'),null);
 const s=fixture();assert.equal(retailPause(s,'unknown'),null);assert.equal(retailPause({...s,day:20},'samir'),null);assert.equal(retailPause({...s,phase:'fulfilling'},'samir'),null);
 for(const status of ['fulfilling','receivable'])assert.equal(retailPause({...s,contracts:[...s.contracts,{status}]},'samir'),null);
 const active={...s,roundReceivables:{active:true,round:s.businessRound}};assert.equal(retailPause(active,'samir'),null);assert.equal(buyerWaitView(active),'');
});
test('pause advances only calendar, preserves cash and contracts, consumes stock only by elapsed days',()=>{
 const s=fixture(190),before=structuredClone(s),next=reduceDealRoom(s,{type:'PAUSE_FOR_BUYER',clientId:'samir'});
 assert.equal(next.day,20);assert.equal(next.cash,190);assert.deepEqual(next.contracts,s.contracts);assert.equal(next.retailOperatingCost,s.retailOperatingCost);assert.equal(retailDemand(next,'samir').remaining,0);assert.equal(retailDemand(next,'mira').remaining,80);assert.deepEqual(s,before);
 assert.equal(reduceDealRoom(next,{type:'PAUSE_FOR_BUYER',clientId:'samir'}),next);
});
test('real paid orders, two samples and home purchases recover through pause, replenishment and reload',()=>{
 let s=createDealRoom();
 const act=(type,extra={})=>{const next=reduceDealRoom(s,{type,...extra});assert.notEqual(next,s,`real action must succeed: ${type}`);s=next;};
 const settle=optionId=>{act('PROPOSE',{optionId});act('ADVANCE');act('NEXT_CLIENT');};
 for(const id of ['trial','ready','small'])settle(id);
 act('CONTINUE_BUSINESS');
 for(let i=0;i<2;i++){act('SELECT_CLIENT',{clientId:'mira'});settle('repeat-prepaid');}
 act('START_SUPPLY_PLAN',{clientId:'mira',firstBatch:'small',payment:'delivery'});act('FULFIL_SUPPLY_PLAN');
 act('START_DEVELOPMENT');act('COMMISSION_SAMPLE',{factory:'studio'});act('RECEIVE_SAMPLE');act('ACCEPT_SAMPLE');
 act('OPEN_SECOND_SUPPLIER');act('COMMISSION_SECOND_SAMPLE');act('RECEIVE_SECOND_SAMPLE');act('ACCEPT_SECOND_SAMPLE');
 act('START_RETAIL_PLANNING');act('CONTINUE_BUSINESS');act('SELECT_CLIENT',{clientId:'mira'});settle('repeat-prepaid');act('BACK_FROM_CLIENTS');
 for(const itemId of ['chair','coffee','books','record','records'])act('BUY_LIFE_ITEM',{itemId});
 act('CONTINUE_BUSINESS');assert.equal(s.cash,60);assert.equal(retailWait(s,'mira').cost,240);assert.equal(retailWait(s,'mira').valid,false);
 assert.deepEqual(normalizeDealRoom(JSON.parse(JSON.stringify(s))),s);
 const before=structuredClone(s);act('PAUSE_FOR_BUYER',{clientId:'mira'});assert.equal(s.cash,before.cash);assert.equal(s.day,35);assert.deepEqual(s.contracts,before.contracts);assert.equal(retailDemand(s,'mira').remaining,0);
 assert.deepEqual(normalizeDealRoom(JSON.parse(JSON.stringify(s))),s);
 act('SELECT_CLIENT',{clientId:'mira'});settle('repeat-prepaid');assert.ok(s.cash>before.cash);assert.equal(s.contracts.at(-1).status,'paid');
 assert.deepEqual(normalizeDealRoom(JSON.parse(JSON.stringify(s))),s);
});