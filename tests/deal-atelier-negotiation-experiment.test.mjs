import test from 'node:test';import assert from 'node:assert/strict';
import {createAtelierNegotiation as create,reduceAtelierNegotiation as reduce,previewAtelierPurchase as preview,atelierNegotiationOptions as options} from '../src/deal-room-atelier-negotiation-experiment.js';
const world=()=>({day:22,cash:10390,curationHistory:[{status:'paid',referrerId:'mira',buyer:'Atelier · 生活方式买手店',products:['mira','samir','ines']}],collection:{model:'own',style:'botanical',products:['mira','samir','ines'],orders:[{status:'paid',buyerId:'northline',scope:'nonexclusive'}]}});
const draft={products:['mira','samir','ines'],packaging:'gift',payment:'deposit30',versionId:'original'};
test('real sample communication opens actionable assortment and packaging scope without charging reusable samples',()=>{
 const s=world(),before=structuredClone(s),start=create(s,{referrerId:'mira'});assert.equal(create(s,{referrerId:'unknown'}),null);assert.deepEqual(options(s,start).packaging,['gift']);
 const shown=reduce(s,start,{type:'SHOW_DISPLAY',lead:'mira',versionId:'original'});assert.equal(shown.stage,'drafting');assert.deepEqual(options(s,shown).requiredProducts,['mira']);assert.deepEqual(options(s,shown).packaging,['plain','gift']);
 const proposal={...draft,products:['mira','samir'],packaging:'plain',versionId:'generic'};assert.equal(preview(s,shown,proposal).valid,false);const reshown=reduce(s,shown,{type:'SHOW_DISPLAY',lead:'mira',versionId:'generic'});assert.equal(preview(s,reshown,proposal).valid,true);assert.equal(preview(s,shown,{...proposal,products:['samir','ines']}).valid,false);assert.equal(preview(s,start,proposal).valid,false);
 reduce(s,shown,{type:'SHOW_DISPLAY',lead:'samir',versionId:'generic'});assert.deepEqual(s,before);
});
test('customer approval freezes the full proposal, with an explicit reversible withdrawal instead of a fake contract',()=>{
 const s=world(),shown=reduce(s,create(s,{referrerId:'mira'}),{type:'SHOW_DISPLAY',lead:'mira',versionId:'original'}),confirmed=reduce(s,shown,{type:'PROPOSE_PURCHASE',draft});assert.equal(confirmed.stage,'confirmed');assert.deepEqual(options(s,confirmed).editable,[]);assert.equal(options(s,confirmed).noContract,true);
 assert.equal(reduce(s,confirmed,{type:'SHOW_DISPLAY',lead:'ines'}),confirmed);assert.equal(preview(s,confirmed,draft).valid,false);const reopened=reduce(s,confirmed,{type:'REOPEN_PROPOSAL'});assert.equal(reopened.proposal,null);assert.deepEqual(reopened.previousProposal,confirmed.proposal);assert.equal(preview(s,reopened,draft).valid,true);
});
test('direct full proposal and sample-led proposal are communication structures, not hidden reward routes',()=>{
 const s=world(),start=create(s,{referrerId:'mira'}),direct=reduce(s,start,{type:'START_WHOLE',draft}),shown=reduce(s,start,{type:'SHOW_DISPLAY',lead:'mira',versionId:'original'}),viaSample=reduce(s,shown,{type:'PROPOSE_PURCHASE',draft});
 assert.equal(direct.stage,'confirmed');for(const field of ['cost','revenue','netProfit','paymentDay','deposit'])assert.equal(direct.proposal[field],viaSample.proposal[field]);assert.equal(s.day,22);assert.equal(s.cash,10390);
});
test('a display does not grant rights, erase complete-version constraints or turn lack of funds into approval',()=>{
 const s=world();s.collection.exclusiveBuyer='northline';let session=create(s,{referrerId:'mira'});session=reduce(s,session,{type:'SHOW_DISPLAY',lead:'mira',versionId:'original'});assert.equal(session.stage,'choosing');session=reduce(s,session,{type:'SHOW_DISPLAY',lead:'mira'});assert.equal(preview(s,session,draft).valid,false);
 assert.equal(preview({...s,cash:0},session,{...draft,versionId:'generic'}).valid,false);delete s.collection.exclusiveBuyer;assert.equal(preview(s,session,{...draft,products:['mira','samir']}).valid,false);
});
