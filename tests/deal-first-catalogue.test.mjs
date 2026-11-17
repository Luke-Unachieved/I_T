import test from 'node:test';import assert from 'node:assert/strict';
import {createDealRoom,reduceDealRoom,normalizeDealRoom} from '../src/deal-room-engine.js';
import {previewFirstCatalogueOrder,previewCatalogueOrder} from '../src/deal-room-catalogue-order.js';
import {caseGrowthDemand,caseGrowthOffers} from '../src/deal-room-case-growth.js';
import {previewStudioProjectOrder,studioProjectEligibility} from '../src/deal-room-studio-project.js';
const a=(s,type,fields={})=>reduceDealRoom(s,{type,...fields});
const finish=(s,id)=>a(a(a(s,'PROPOSE',{optionId:id}),'ADVANCE'),'NEXT_CLIENT');
function ready(option='retain',buyer='northline'){
 let s=createDealRoom();for(const id of ['trial','ready','season'])s=finish(s,id);
 s=a(s,'START_OPENING_CURATION',{clientId:'ines'});s=a(a(s,'SIGN_CURATION',{products:['mira','samir','ines'],quantity:40,packaging:'plain'}),'FULFIL_CURATION');s=a(a(s,'START_COLLECTION'),'SIGN_COLLECTION',{model:'own',style:'botanical'});s=a(a(a(s,'OPEN_COLLECTION_PITCH',{buyerId:buyer}),'SIGN_COLLECTION_PITCH',{optionId:option}),'FULFIL_COLLECTION');return a(s,'CLOSE_COLLECTION');
}
const draft={referrerId:'ines',lampVersion:'standard'};
test('natural first case directly adopts the original with one true paid record, unchanged suite economics',()=>{
 const s=ready(),before=structuredClone(s),q=previewFirstCatalogueOrder(s,draft);assert.equal(q.valid,true,q.reason);assert.equal(q.revenue,6280);assert.equal(q.cost,3520);assert.equal(q.netProfit,2490);assert.equal(q.designVersion,'original');assert.equal(q.purpose,'studio-series');assert.equal(q.quantity,40);assert.deepEqual(s,before);assert.equal(s.caseGrowthHistory,undefined);
 const opened=a(s,'OPEN_CASE_GROWTH',{referrerId:'ines'});assert.equal(opened.caseGrowth.agreement,undefined);assert.equal(previewCatalogueOrder(opened,{lampVersion:'standard'}).valid,false);assert.deepEqual(previewFirstCatalogueOrder(opened,draft),q);
 const signed=a(opened,'SIGN_FIRST_CATALOGUE_ORDER',draft);assert.equal(signed.caseGrowth.agreement,'portfolio');assert.equal(signed.cash,s.cash+q.deposit-q.cost);assert.equal(signed.caseGrowthHistory,undefined);assert.equal(a(signed,'SIGN_FIRST_CATALOGUE_ORDER',draft),signed);
 const paid=a(signed,'FULFIL_CASE_GROWTH');assert.equal(paid.caseGrowthHistory.length,1);assert.equal(paid.cash,s.cash+q.netProfit);assert.equal(a(paid,'FULFIL_CASE_GROWTH'),paid);assert.deepEqual(normalizeDealRoom(paid),paid);assert.equal(studioProjectEligibility(paid,'independent').valid,true);
 const closed=a(paid,'CLOSE_CASE_GROWTH');assert.equal(previewFirstCatalogueOrder(closed,draft).valid,false);assert.equal(caseGrowthOffers(closed).find(o=>o.referrerId==='ines').agreement,'portfolio');assert.ok(caseGrowthDemand(closed,'ines').some(d=>d.remaining>0));
});
test('private binding, another portfolio owner and production cannot be bypassed or cloned',()=>{
 const s=ready();for(const history of [[{referrerId:'ines',agreement:'private',status:'paid'}],[{referrerId:'mira',agreement:'portfolio',status:'paid'}]]){const state={...s,caseGrowthHistory:history};assert.equal(previewFirstCatalogueOrder(state,draft).valid,false);assert.equal(a(state,'SIGN_FIRST_CATALOGUE_ORDER',draft),state);}
 const production={...s,caseGrowth:{status:'production',referrerId:'mira',agreement:'private',active:{}}};assert.equal(previewFirstCatalogueOrder(production,draft).valid,false);
 assert.equal(previewFirstCatalogueOrder(s,{...draft,referrerId:'fake'}).valid,false);assert.equal(previewFirstCatalogueOrder({...s,curationHistory:[]},draft).valid,false);
});
test('actual reusable full original and accepted physical model are required; raw injected extras rejected',()=>{
 const s=ready();assert.equal(previewFirstCatalogueOrder(ready('exclusive','atelier'),draft).valid,false);
 const unpaid={...s,collection:{...s.collection,orders:[]}};assert.equal(previewFirstCatalogueOrder(unpaid,draft).valid,false);
 assert.equal(previewFirstCatalogueOrder(s,{...draft,lampVersion:'developed'}).valid,false);assert.equal(previewFirstCatalogueOrder({...s,productDevelopment:{status:'active',factory:'line'}},{...draft,lampVersion:'developed'}).valid,false);
 for(const extra of [{products:['mira']},{revenue:999999},{agreement:'portfolio'}])assert.equal(a(s,'SIGN_FIRST_CATALOGUE_ORDER',{...draft,...extra}),s);
 const poor={...s,cash:0};assert.equal(a(poor,'SIGN_FIRST_CATALOGUE_ORDER',draft),poor);
 const bad=a(s,'SIGN_FIRST_CATALOGUE_ORDER',draft);bad.caseGrowth.active.revenue++;assert.throws(()=>normalizeDealRoom(bad));
});

test('first original UI exposes rights confirmation and distinguishes signed from delivered',async()=>{
 const {caseGrowthView}=await import('../src/deal-room-case-growth-view.js');let s=a(ready(),'OPEN_CASE_GROWTH',{referrerId:'ines'});const d={agreement:'portfolio',products:['mira','samir','ines'],packaging:'plain',terms:'delivery'};
 assert.match(caseGrowthView(s,d),/id="open-series-proposal"/);const preview=caseGrowthView(s,d,{catalogueMode:true});assert.match(preview,/SIGN_FIRST_CATALOGUE_ORDER/);assert.match(preview,/确认前不建立合作/);assert.match(preview,/¥2,490/);
 s=a(s,'SIGN_FIRST_CATALOGUE_ORDER',draft);assert.match(caseGrowthView(s,d),/原稿采购已签，等待交付/);assert.doesNotMatch(caseGrowthView(s,d),/工作室系列已被采用/);s=a(s,'FULFIL_CASE_GROWTH');assert.match(caseGrowthView(s,d),/工作室系列已在概念店上架/);
});
