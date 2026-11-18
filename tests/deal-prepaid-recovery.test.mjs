import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createDealRoom,reduceDealRoom as R,normalizeDealRoom,quoteOptions,previewOffer,businessOpportunities} from '../src/deal-room-engine.js';
const act=(s,type,x={})=>{const n=R(s,{type,...x});assert.notEqual(n,s,`${type} ${s.phase}`);return n;};
const finish=(s,id)=>act(act(act(s,'PROPOSE',{optionId:id}),'ADVANCE'),'NEXT_CLIENT');
function opening(samir='ready'){let s=createDealRoom();for(const id of ['trial',samir,'season'])s=finish(s,id);return s;}
test('only settled repeat partners offer prepayment; opening rejection unchanged',()=>{
 let s=createDealRoom();assert(!quoteOptions(s).some(q=>q.id==='repeat-prepaid'));s=finish(finish(s,'trial'),'ready');
 const q=previewOffer(s,'all-now');assert.equal(q.accepted,false);const n=act(s,'PROPOSE',{optionId:'all-now'});assert.equal(n.cash,s.cash);assert.equal(n.contracts.length,s.contracts.length);
});
test('all three clients and both cup specifications fund production and fees without capital; discount is real',()=>{
 for(const specification of ['ready','branded'])for(const clientId of ['mira','samir','ines']){
 let s=act(opening(specification),'CONTINUE_BUSINESS');s=act(s,'SELECT_CLIENT',{clientId});
 const small=previewOffer(s,'repeat-small'),q=previewOffer(s,'repeat-prepaid');assert(q.valid);assert.equal(q.revenue,small.revenue-200);assert.equal(q.netProfit,small.netProfit-200);assert.equal(q.cost,small.cost);assert.equal(q.quantity,small.quantity);assert.equal(q.paymentDay,small.paymentDay);assert(q.deposit>=q.cost+q.operatingCost);assert.equal(q.cashRequired,0);
 // Explicit unit boundary, not claimed to be a naturally earned save.
 const zero={...s,cash:0};assert(previewOffer(zero,'repeat-prepaid').valid);const signed=act(zero,'PROPOSE',{optionId:'repeat-prepaid'});assert(signed.cash>=q.operatingCost);const paid=act(signed,'ADVANCE');assert.equal(paid.cash,q.netProfit);assert(paid.cash>0);
 }
});
test('canonical 190 consumption deadlock replays unchanged and recovers ordinary work through two actual orders',()=>{
 const before=JSON.parse(fs.readFileSync(new URL('./fixtures/consumption-liquidity-190.json',import.meta.url)));
 let s=createDealRoom();for(const a of before.history)s=act(s,a.type,Object.fromEntries(Object.entries(a).filter(([k])=>k!=='type')));assert.deepEqual(s,before);assert.deepEqual(normalizeDealRoom(before),before);
 s=act(s,'CONTINUE_BUSINESS');for(let i=0;i<2;i++){s=act(s,'SELECT_CLIENT',{clientId:'ines'});s=finish(s,'repeat-prepaid');}
 assert.equal(s.cash,2010);assert.equal(s.day,202);assert.deepEqual(normalizeDealRoom(s),s);assert(businessOpportunities(s).some(c=>c.options.some(q=>q.id==='repeat-small'&&q.valid)));assert.deepEqual(s.history.slice(0,before.history.length),before.history);
});
test('prepayment does not override shelf demand or fund waiting when all buyers stocked',async()=>{
 const {retailDemand,retailWait}=await import('../src/deal-room-demand.js');
 let s=act(opening(),'CONTINUE_BUSINESS');for(let i=0;i<2;i++)s=finish(act(s,'SELECT_CLIENT',{clientId:'mira'}),'repeat-small');
 s=act(act(s,'START_SUPPLY_PLAN',{clientId:'mira',firstBatch:'small',payment:'delivery'}),'FULFIL_SUPPLY_PLAN');s=act(s,'CONTINUE_RETAIL_BUSINESS');
 for(const clientId of ['mira','samir','ines']){if(s.phase==='review')s=act(s,'CONTINUE_RETAIL_BUSINESS');s=finish(act(s,'SELECT_CLIENT',{clientId}),'repeat-prepaid');}
 for(const id of ['mira','samir','ines'])assert.equal(retailDemand(s,id).ready,false);
 // Real demand history, zero cash sensitivity only; NOT a canonical zero-cash save.
 const zero={...s,cash:0};assert(!businessOpportunities(zero).some(c=>c.available));assert.equal(retailWait(zero).valid,false);assert.equal(R(zero,{type:'WAIT_FOR_RETAIL'}),zero);
 for(const clientId of ['mira','samir','ines'])assert.equal(R(zero,{type:'SELECT_CLIENT',clientId}),zero);
});
