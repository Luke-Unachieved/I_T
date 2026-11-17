import test from 'node:test';import assert from 'node:assert/strict';
import {createDealRoom,reduceDealRoom,normalizeDealRoom,openingCurationOffers,curationOffers,previewCuration} from '../src/deal-room-engine.js';
const a=(s,type,more={})=>reduceDealRoom(s,{type,...more});
const finish=(s,id)=>a(a(a(s,'PROPOSE',{optionId:id}),'ADVANCE'),'NEXT_CLIENT');
const opening=(choices=['trial','ready','season'])=>choices.reduce((s,id)=>finish(s,id),createDealRoom());
test('first invitation requires all three actual paid opening orders and never changes old actions',()=>{
 let s=createDealRoom();assert.deepEqual(openingCurationOffers(s),[]);s=finish(s,'trial');s=finish(s,'ready');assert.deepEqual(openingCurationOffers(s),[]);const signed=a(s,'PROPOSE',{optionId:'small'});assert.deepEqual(openingCurationOffers(signed),[]);
 s=finish(s,'small');const before=structuredClone(s);assert.deepEqual(openingCurationOffers(s).map(o=>o.id),['mira','samir','ines']);assert.deepEqual(curationOffers(s),[]);assert.equal(a(s,'START_CURATION',{clientId:'mira'}),s);assert.equal(a(s,'START_CLIENT_PROJECTS'),s);assert.deepEqual(s,before);assert.deepEqual(normalizeDealRoom(s),s);
});
test('cancel can choose a different real referrer without consuming money, days or the opportunity',()=>{
 const s=opening(),opened=a(s,'START_OPENING_CURATION',{clientId:'mira'});assert.equal(opened.phase,'curating');assert.equal(opened.cash,s.cash);assert.equal(opened.day,s.day);assert.equal(opened.curation.source,'opening-delivery');assert.equal(opened.productDevelopment,undefined);
 const back=a(opened,'BACK_FROM_CURATION');assert.equal(back.phase,'review');assert.equal(openingCurationOffers(back).length,3);const changed=a(back,'START_OPENING_CURATION',{clientId:'ines'});assert.equal(changed.curation.anchor,'ines');assert.deepEqual(normalizeDealRoom(changed),changed);assert.equal(a(s,'START_OPENING_CURATION',{clientId:'invented'}),s);
});
test('all eight opening paths can afford a real first assortment with no subsidy or extra orders',()=>{
 for(const first of ['trial','rollout'])for(const second of ['ready','branded'])for(const third of ['small','season'])for(const clientId of ['mira','samir','ines']){
  const old=opening([first,second,third]);let s=a(old,'START_OPENING_CURATION',{clientId});
  const products=clientId==='mira'?['mira','ines']:clientId==='samir'?['samir','ines']:['mira','ines'],draft={products,quantity:40,packaging:'plain'},q=previewCuration(s,draft);assert.equal(q.valid,true,q.reason);
  s=a(s,'SIGN_CURATION',draft);assert.equal(s.cash,old.cash+q.deposit-q.cost);assert.equal(a(s,'BACK_FROM_CURATION'),s);s=a(s,'FULFIL_CURATION');assert.equal(s.cash,old.cash+q.netProfit);assert.equal(s.contracts.length,3);assert.equal(s.curationHistory.length,1);assert.equal(s.businessRound,undefined);assert.equal(s.supplyPlanHistory,undefined);assert.deepEqual(openingCurationOffers(s),[]);assert.equal(a(s,'START_OPENING_CURATION',{clientId}),s);assert.deepEqual(normalizeDealRoom(s),s);
  assert.equal(a(s,'START_COLLECTION').phase,'collection');
 }
});
test('first assortment preserves specimen, anchor and funding checks; does not block optional repeat business',()=>{
 const s=opening(),opened=a(s,'START_OPENING_CURATION',{clientId:'mira'}),draft={products:['mira','ines'],quantity:40,packaging:'gift',lampVersion:'developed'};
 assert.equal(a(opened,'SIGN_CURATION_SAMPLE',draft),opened);assert.equal(previewCuration(opened,draft).valid,false);assert.equal(previewCuration(opened,{products:['samir','ines'],quantity:40,packaging:'plain'}).valid,false);assert.equal(previewCuration({...opened,cash:0},{products:['mira','ines'],quantity:40,packaging:'plain'}).valid,false);
 const repeat=a(s,'CONTINUE_BUSINESS');assert.equal(repeat.phase,'portfolio');assert.equal(repeat.businessRound,1);
});
