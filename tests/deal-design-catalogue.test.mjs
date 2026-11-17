import test from 'node:test';import assert from 'node:assert/strict';
import {catalogueVersions,catalogueProposal} from '../src/deal-room-design-catalogue.js';
const own=()=>({collection:{model:'own',status:'complete',style:'botanical',products:['mira','samir','ines'],orders:[{buyerId:'atelier',scope:'nonexclusive',style:'botanical',status:'paid'}]},caseGrowthHistory:[{agreement:'portfolio',referrerId:'mira',status:'paid'},{agreement:'private',referrerId:'samir',status:'paid'}]});
const proposal={route:'portfolio',versionId:'original',products:['mira','samir','ines'],lampVersion:'standard'};
test('drafts cannot invent catalogue versions; an unfulfilled own sample is not a delivered series',()=>{
 assert.deepEqual(catalogueVersions({}),[]);assert.deepEqual(catalogueVersions({collection:{status:'draft',style:'cream',products:['mira','samir']}}),[]);
 const s=own();s.collection.orders=[];s.collection.status='sample';const v=catalogueVersions(s)[0];assert.equal(v.reusable,true);assert.equal(v.seriesDelivered,false);assert.match(catalogueProposal(s,proposal).reason,/还没有实际交付/);
});
test('nonexclusive original can be proposed to the distinct existing concept-store contact without granting adoption',()=>{
 const s=own(),before=structuredClone(s),v=catalogueVersions(s)[0],p=catalogueProposal(s,proposal);assert.equal(v.id,'original');assert.equal(v.owner,'workshop');assert.equal(v.reusable,true);assert.equal(p.valid,true);assert.equal(p.proposalOnly,true);assert.equal(p.customer.referrerId,'mira');assert.equal(p.customer.title,'案例引荐的概念店');assert.doesNotMatch(p.customer.title,/Atelier|Northline/);assert.equal(p.style,'botanical');assert.deepEqual(s,before);
 v.products.pop();p.products.pop();assert.deepEqual(s,before);
});
test('a delivered buyer sleeve does not take away the original but cannot travel to a new buyer',()=>{
 const s=own();s.collection.orders=[{buyerId:'atelier',scope:'buyer-sleeve',style:'cream',status:'paid'}];const versions=catalogueVersions(s);assert.equal(versions.length,2);assert.equal(versions[0].delivered,false);assert.equal(versions[0].seriesDelivered,true);assert.equal(catalogueProposal(s,proposal).valid,true);const sleeve=versions.find(v=>v.id==='sleeve:atelier');assert.equal(sleeve.style,'cream');assert.equal(sleeve.reusable,false);assert.equal(sleeve.delivered,true);assert.match(catalogueProposal(s,{...proposal,versionId:sleeve.id}).reason,/只给 Atelier/);
});
test('signed exclusive scope binds immediately, even before delivery, and recolouring never releases it',()=>{
 const s=own();s.collection.status='production';s.collection.active={buyerId:'atelier',scope:'whole-exclusive',style:'charcoal'};assert.equal(catalogueVersions(s)[0].exclusiveBuyer,'atelier');assert.equal(catalogueProposal(s,proposal).valid,false);s.collection.style='cream';assert.equal(catalogueProposal(s,proposal).valid,false);assert.match(catalogueProposal(s,proposal).reason,/改颜色.*不会解除独家/);delete s.collection.active;s.collection.exclusiveBuyer='northline';assert.match(catalogueProposal(s,proposal).reason,/Northline/);
});
test('private-label versions never manufacture a free workshop original or impersonate the original buyer',()=>{
 const s=own();s.collection.model='private';s.collection.style='charcoal';s.collection.orders=[{buyerId:'northline-private',status:'paid'}];const versions=catalogueVersions(s);assert.equal(versions.length,1);assert.equal(versions[0].id,'private:northline');assert.equal(versions[0].owner,'northline');assert.equal(versions[0].reusable,false);assert.equal(catalogueProposal(s,proposal).valid,false);const p=catalogueProposal(s,{...proposal,route:'private',versionId:'private:northline'});assert.equal(p.rightsEligible,false);assert.match(p.reason,/新客户不是 Northline/);
});
test('group route requires new actual confirmation even when rights are reusable',()=>{
 const s=own(),p=catalogueProposal(s,{...proposal,route:'private'});assert.equal(p.valid,false);assert.equal(p.rightsEligible,true);assert.equal(p.requiresCustomerConfirmation,true);assert.match(p.reason,/集团尚未确认/);assert.equal(s.caseGrowthHistory.length,2);
});
test('the actual full series is required; developed lamp needs an accepted studio sample',()=>{
 const s=own();assert.equal(catalogueProposal(s,{...proposal,products:['mira','samir']}).valid,false);assert.equal(catalogueProposal(s,{...proposal,products:['mira','mira','ines']}).valid,false);assert.equal(catalogueProposal(s,{...proposal,products:['mira','samir','bad']}).valid,false);
 const developed={...proposal,lampVersion:'developed'};assert.match(catalogueProposal(s,developed).reason,/先验收/);s.productDevelopment={status:'received',factory:'studio'};assert.equal(catalogueProposal(s,developed).valid,false);s.productDevelopment={status:'active',factory:'line'};assert.match(catalogueProposal(s,developed).reason,/180 盏/);s.productDevelopment={status:'active',factory:'studio'};assert.equal(catalogueProposal(s,developed).valid,true);assert.equal(catalogueProposal(s,{...proposal,products:['ines','samir','mira']}).valid,true);
 s.collection.products=['samir','ines'];assert.equal(catalogueProposal(s,{...developed,products:['samir','ines']}).lampVersion,null);
});
test('unestablished or duplicate identities and uncertain rights cannot silently grant permission',()=>{
 const s=own();s.caseGrowthHistory=[];assert.match(catalogueProposal(s,proposal).reason,/首次客户合作/);s.caseGrowthHistory=[{agreement:'portfolio',referrerId:'mira',status:'paid'},{agreement:'portfolio',referrerId:'ines',status:'paid'}];assert.match(catalogueProposal(s,proposal).reason,/多个客户来源/);s.collection.orders[0].scope='unknown';assert.match(catalogueProposal(s,proposal).reason,/合同范围暂不能确认/);
});
test('legacy unsigned-scope own-series orders retain their established nonexclusive meaning',()=>{
 const s=own();s.collection.orders=[{buyerId:'atelier',status:'paid'}];assert.equal(catalogueVersions(s)[0].reusable,true);assert.equal(catalogueProposal(s,proposal).valid,true);
});

import {createDealRoom,reduceDealRoom,normalizeDealRoom} from '../src/deal-room-engine.js';
test('real reducer journal supplies sleeve and pending-exclusive rights without changing the save',()=>{
 let s=createDealRoom();const act=(type,fields={})=>s=reduceDealRoom(s,{type,...fields});const finish=optionId=>{act('PROPOSE',{optionId});act('ADVANCE');act('NEXT_CLIENT');};for(const id of ['trial','ready','season'])finish(id);act('CONTINUE_BUSINESS');for(let i=0;i<2;i++){act('SELECT_CLIENT',{clientId:'mira'});finish('repeat-small');}act('START_SUPPLY_PLAN',{clientId:'mira',firstBatch:'small',payment:'delivery'});act('FULFIL_SUPPLY_PLAN');act('START_CLIENT_PROJECTS');for(const clientId of ['mira','samir','ines']){act('SELECT_CLIENT',{clientId});finish('project-focus');}act('START_CURATION',{clientId:'mira'});act('SIGN_CURATION',{products:['mira','samir','ines'],quantity:40,packaging:'gift'});act('FULFIL_CURATION');act('OPEN_CASE_GROWTH',{referrerId:'mira'});act('SIGN_CASE_GROWTH',{agreement:'portfolio',products:['mira','samir','ines'],packaging:'plain',terms:'delivery'});act('FULFIL_CASE_GROWTH');act('CLOSE_CASE_GROWTH');act('START_COLLECTION');act('SIGN_COLLECTION',{model:'own',style:'botanical'});act('OPEN_COLLECTION_PITCH',{buyerId:'atelier'});act('SIGN_COLLECTION_PITCH',{optionId:'sleeve'});act('FULFIL_COLLECTION');
 assert.equal(s.collection.orders[0].scope,'buyer-sleeve');const before=structuredClone(s);assert.equal(catalogueProposal(s,proposal).valid,true);assert.equal(catalogueVersions(s).find(v=>v.id==='sleeve:atelier').delivered,true);assert.deepEqual(s,before);assert.deepEqual(normalizeDealRoom(s),s);
 act('OPEN_COLLECTION_PITCH',{buyerId:'northline'});act('SIGN_COLLECTION_PITCH',{optionId:'exclusive'});assert.equal(s.collection.status,'production');assert.equal(catalogueVersions(s)[0].exclusiveBuyer,'northline');assert.equal(catalogueProposal(s,proposal).valid,false);assert.deepEqual(normalizeDealRoom(s),s);
});
