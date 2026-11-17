import test from 'node:test';import assert from 'node:assert/strict';
import {createDealRoom,reduceDealRoom as r,normalizeDealRoom} from '../src/deal-room-engine.js';
import {cooperationChapter} from '../src/deal-room-cooperation.js';
import {cooperationView} from '../src/deal-room-cooperation-view.js';
function reachable(atelierScope='sleeve'){
let s=createDealRoom();function a(type,x={}){let n=r(s,{type,...x});if(n===s)throw Error(type+' '+s.phase+' '+s.cash);s=n;}
for(const optionId of ['trial','ready','small']){a('PROPOSE',{optionId});a('ADVANCE');a('NEXT_CLIENT');}a('START_OPENING_CURATION',{clientId:'mira'});a('SIGN_CURATION',{products:['mira','samir','ines'],quantity:40,packaging:'plain'});a('FULFIL_CURATION');a('START_COLLECTION');a('SIGN_COLLECTION',{model:'own',style:'botanical'});
a('SIGN_COLLECTION_ORDER',{buyerId:'northline'});a('FULFIL_COLLECTION');a('OPEN_COLLECTION_PITCH',{buyerId:'atelier'});a('SIGN_COLLECTION_PITCH',{optionId:atelierScope});a('FULFIL_COLLECTION');a('CLOSE_COLLECTION');
a('OPEN_COLLECTION_REVISION');a('COMMISSION_COLLECTION_REVISION');a('RECEIVE_COLLECTION_REVISION');a('SIGN_COLLECTION_REVISION',{buyerId:'northline',scope:'revision-exclusive'});a('FULFIL_COLLECTION_REVISION');a('CLOSE_COLLECTION_REVISION');
a('OPEN_COLLECTION');a('OPEN_COLLECTION_PITCH',{buyerId:'northline'});if(atelierScope==='retain')return {s,rejected:r(s,{type:'SIGN_COLLECTION_PITCH',optionId:'exclusive'})};a('SIGN_COLLECTION_PITCH',{optionId:'exclusive'});a('FULFIL_COLLECTION');a('CLOSE_COLLECTION');
a('START_ACCOUNT_FROM_REVISION');a('SIGN_ACCOUNT',{optionId:'pilot'});a('FULFIL_ACCOUNT');a('CLOSE_ACCOUNT');a('OPEN_ACCOUNT_EXPANSION');a('SET_ACCOUNT_EXPANSION_BASIS',{basisId:'original'});a('SIGN_ACCOUNT_EXPANSION');a('FULFIL_ACCOUNT_EXPANSION');a('CLOSE_ACCOUNT');normalizeDealRoom(s);return s;
}

test('legal buyer-sleeve path can later promise original exclusive and fulfil two separately approved Northline versions',()=>{
 const s=reachable();assert.equal(s.day,59);assert.equal(s.cash,38060);assert.deepEqual(normalizeDealRoom(s),s);
 const before=structuredClone(s),chapter=cooperationChapter(s);assert.equal(chapter.relation.route,'exclusive');assert.equal(chapter.closed,true);assert.equal(chapter.nextAction,null);assert.match(cooperationView(s),/两批门店承诺已兑现/);assert.match(cooperationView(s),/6 家店按各自确认版本交付/);assert.doesNotMatch(cooperationView(s),/6 家店收到同版商品/);
 const fact=chapter.facts.find(f=>f.kind==='mixed-approved-version-stores');assert.equal(fact.stores,6);assert.equal(fact.batches.length,2);assert.equal(fact.batches[0].seriesSource.versionId,'revision:tidal-grid');assert.equal(fact.batches[1].seriesSource.scope,'whole-exclusive');assert.deepEqual(s,before);
});
test('two actual original adopters block later exclusive, rather than pretending all mixed routes enter exclusive chapter',()=>{
 const {s,rejected}=reachable('retain');assert.equal(rejected,s);assert.deepEqual(normalizeDealRoom(s),s);assert.equal(cooperationChapter(s).relation.route,'independent');
});
test('generic, unpaid, wrong-buyer, invented revision and retroactive approvals cannot complete mixed chapter',()=>{
 const s=reachable();for(const change of [x=>delete x.accountHistory[0].seriesSource,x=>x.accountHistory[0].status='fulfilling',x=>x.collectionRevision.orders[0].buyerId='atelier',x=>x.accountHistory[0].seriesSource.versionId='fake',x=>x.collectionRevision.orders[0].paymentDay=x.accountHistory[0].signedDay+1,x=>x.accountHistory[0].unitCost++,x=>x.accountHistory[0].products=['mira']]){
  const bad=structuredClone(s);change(bad);assert.equal(cooperationChapter(bad).closed,false);assert.equal(cooperationChapter(bad).facts.some(f=>f.kind==='mixed-approved-version-stores'),false);
 }
});
