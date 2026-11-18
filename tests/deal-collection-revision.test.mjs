import test from 'node:test';import assert from 'node:assert/strict';
import {createDealRoom,reduceDealRoom,normalizeDealRoom} from '../src/deal-room-engine.js';
import {revisionOpportunity,previewRevisionOrder,revisionCatalogueVersion} from '../src/deal-room-collection-revision.js';
import {catalogueVersions,catalogueProposal} from '../src/deal-room-design-catalogue.js';
import {accountCollectionBasis,accountRevisionBasis,previewAccount,accountSeriesReceipt} from '../src/deal-room-account.js';
const act=(s,type,x={})=>{const n=reduceDealRoom(s,{type,...x});assert.notEqual(n,s,type);return n;};
function ready(style='botanical'){let s=createDealRoom();for(const optionId of ['trial','ready','small'])for(const a of [{type:'PROPOSE',optionId},{type:'ADVANCE'},{type:'NEXT_CLIENT'}])s=reduceDealRoom(s,a);s=act(s,'START_OPENING_CURATION',{clientId:'mira'});s=act(s,'SIGN_CURATION',{products:['mira','samir','ines'],quantity:40,packaging:'plain'});s=act(s,'FULFIL_CURATION');s=act(s,'START_COLLECTION');s=act(s,'SIGN_COLLECTION',{model:'own',style});for(const buyerId of ['northline','atelier']){s=act(s,'OPEN_COLLECTION_PITCH',{buyerId});s=act(s,'SIGN_COLLECTION_PITCH',{optionId:'retain'});s=act(s,'FULFIL_COLLECTION');}return act(s,'CLOSE_COLLECTION');}
function sample(s){s=act(s,'OPEN_COLLECTION_REVISION');s=act(s,'COMMISSION_COLLECTION_REVISION');return act(s,'RECEIVE_COLLECTION_REVISION');}
const sign=(s,buyerId,scope)=>act(s,'SIGN_COLLECTION_REVISION',{buyerId,scope});
test('real two-buyer request is optional and new artwork/tray costs actual development, never resets old contracts',()=>{
 const initial=ready(),old=structuredClone(initial.collection),versions=catalogueVersions(initial),basis=accountCollectionBasis(initial);assert.equal(revisionOpportunity(initial).available,true);
 let s=act(initial,'OPEN_COLLECTION_REVISION');const no=act(s,'CLOSE_COLLECTION_REVISION');assert.equal(no.cash,initial.cash);assert.equal(no.day,initial.day);assert.deepEqual(no.collection,old);assert.deepEqual(normalizeDealRoom(no),no);
 s=act(no,'OPEN_COLLECTION_REVISION');assert.equal(revisionCatalogueVersion(s),null);s=act(s,'COMMISSION_COLLECTION_REVISION');assert.equal(s.cash,initial.cash-3200);assert.equal(reduceDealRoom(s,{type:'COMMISSION_COLLECTION_REVISION'}),s);assert.equal(previewRevisionOrder(s,{buyerId:'northline',scope:'revision-exclusive'}).valid,false);s=act(s,'RECEIVE_COLLECTION_REVISION');assert.equal(s.cash,initial.cash-3320);assert.equal(s.day,initial.day+4);assert.equal(s.collectionRevision.investment,3320);assert.equal(s.collectionRevision.packaging,'partition-tray');assert.equal(s.collectionRevision.style,'tidal-grid');assert.deepEqual(catalogueVersions(s).slice(0,-1),versions);assert.deepEqual(s.collection,old);assert.deepEqual(accountCollectionBasis(s),basis);assert.deepEqual(normalizeDealRoom(s),s);
});
test('new exclusive commitment locks only revision immediately and never revokes old original reuse',()=>{
 let s=sample(ready());const old=structuredClone(s.collection);s=sign(s,'northline','revision-exclusive');assert.equal(revisionCatalogueVersion(s).reusable,false);assert.equal(catalogueVersions(s).find(v=>v.id==='original').reusable,true);assert.equal(s.collection.exclusiveBuyer,undefined);s=act(s,'FULFIL_COLLECTION_REVISION');assert.equal(previewRevisionOrder(s,{buyerId:'atelier',scope:'revision-nonexclusive'}).valid,false);assert.deepEqual(s.collection,old);assert.equal(s.collectionRevision.orders.length,1);assert.deepEqual(normalizeDealRoom(s),s);
});
test('reusable version can actually reach second buyer and has one finite separate ledger',()=>{
 let s=sample(ready()),cash=s.cash;assert.equal(previewRevisionOrder(s,{buyerId:'atelier',scope:'revision-nonexclusive'}).valid,false);
 for(const buyerId of ['northline','atelier']){const q=previewRevisionOrder(s,{buyerId,scope:'revision-nonexclusive'});assert.equal(q.valid,true,q.reason);s=sign(s,buyerId,'revision-nonexclusive');s=act(s,'FULFIL_COLLECTION_REVISION');cash+=q.netProfit;assert.equal(s.cash,cash);assert.deepEqual(normalizeDealRoom(s),s);}
 assert.equal(s.collectionRevision.status,'complete');assert.equal(s.collectionRevision.orders.length,2);assert.equal(revisionCatalogueVersion(s).reusable,true);assert.equal(previewRevisionOrder(s,{buyerId:'northline',scope:'revision-nonexclusive'}).valid,false);
 assert.equal(catalogueProposal(s,{route:'portfolio',versionId:'revision:tidal-grid',products:s.collection.products}).valid,false);assert.deepEqual(normalizeDealRoom(s),s);
});
test('failed funds, wrong scope and tampered revision do not create rights or progress',()=>{
 const initial=ready();assert.equal(revisionOpportunity({...initial,collection:{...initial.collection,orders:initial.collection.orders.slice(0,1)}}).available,false);
 const opened=act(initial,'OPEN_COLLECTION_REVISION'),poor={...opened,cash:3319};assert.equal(reduceDealRoom(poor,{type:'COMMISSION_COLLECTION_REVISION'}),poor);
 const s=sample(initial),before=structuredClone(s);assert.equal(previewRevisionOrder({...s,cash:0},{buyerId:'northline',scope:'revision-nonexclusive'}).valid,false);assert.equal(reduceDealRoom(s,{type:'SIGN_COLLECTION_REVISION',buyerId:'atelier',scope:'revision-exclusive'}),s);assert.deepEqual(s,before);
 const forged=structuredClone(s);forged.collectionRevision.investment=0;assert.throws(()=>normalizeDealRoom(forged));const forgedOld=structuredClone(s);forgedOld.collection.orders=[];assert.throws(()=>normalizeDealRoom(forgedOld));
});

test('paid revision continues into existing chain procurement and expansion without recharging rights or changing old artwork',()=>{
 let s=sample(ready());s=sign(s,'northline','revision-exclusive');s=act(s,'FULFIL_COLLECTION_REVISION');s=act(s,'CLOSE_COLLECTION_REVISION');const old=structuredClone(s.collection),revision=structuredClone(s.collectionRevision),basis=accountRevisionBasis(s),paid=revision.orders[0];
 assert.equal(basis.unitPrice,Math.floor(((paid.revenue-paid.licenceFee)/paid.sets)*.75));assert.equal(basis.unitCost,paid.cost/paid.sets);assert.equal(basis.seriesSource.packaging,'partition-tray');
 s=act(s,'START_ACCOUNT_FROM_REVISION');const q=previewAccount(s,'pilot');assert.equal(q.valid,true,q.reason);s=act(s,'SIGN_ACCOUNT',{optionId:'pilot'});assert.equal(reduceDealRoom(s,{type:'SET_ACCOUNT_VERSION',versionId:'original'}),s);s=act(s,'FULFIL_ACCOUNT');s=act(s,'CLOSE_ACCOUNT');const first=structuredClone(s.accountHistory[0]);assert.match(accountSeriesReceipt(first),/波线图样.*分格内托/);assert.deepEqual(normalizeDealRoom(s),s);
 assert.equal(reduceDealRoom(s,{type:'START_ACCOUNT_FROM_REVISION'}),s);s=act(s,'OPEN_ACCOUNT_EXPANSION');assert.equal(reduceDealRoom(s,{type:'SET_ACCOUNT_VERSION',versionId:'original'}),s);assert.deepEqual(s.account.seriesSource,first.seriesSource);assert.equal(s.account.unitCost,first.unitCost);s=act(s,'SIGN_ACCOUNT_EXPANSION');s=act(s,'FULFIL_ACCOUNT_EXPANSION');assert.deepEqual(s.accountHistory[0],first);assert.deepEqual(s.accountHistory[1].seriesSource,first.seriesSource);assert.deepEqual(s.collection,old);assert.deepEqual(s.collectionRevision,revision);assert.deepEqual(normalizeDealRoom(s),s);
});
test('only unsigned first chain draft may switch between actually adopted versions, never merely sampled revisions',()=>{
 let s=sample(ready());assert.equal(accountRevisionBasis(s),null);assert.equal(reduceDealRoom(s,{type:'START_ACCOUNT_FROM_REVISION'}),s);s=sign(s,'northline','revision-nonexclusive');assert.equal(accountRevisionBasis(s),null);s=act(s,'FULFIL_COLLECTION_REVISION');s=act(s,'CLOSE_COLLECTION_REVISION');s=act(s,'START_ACCOUNT_FROM_COLLECTION');const original=structuredClone(s.account);assert.equal(reduceDealRoom(s,{type:'SET_ACCOUNT_VERSION',versionId:'invented'}),s);
 s=act(s,'SET_ACCOUNT_VERSION',{versionId:'revision:tidal-grid'});assert.equal(s.account.seriesSource.versionId,'revision:tidal-grid');assert.equal(reduceDealRoom(s,{type:'SET_ACCOUNT_VERSION',versionId:'revision:tidal-grid'}),s);s=act(s,'SET_ACCOUNT_VERSION',{versionId:'original'});assert.deepEqual(s.account,original);assert.deepEqual(normalizeDealRoom(s),s);
 const wrong=structuredClone(s);wrong.collectionRevision.orders[0].buyerId='atelier';assert.equal(accountRevisionBasis(wrong),null);const unproved=structuredClone(s);unproved.collectionRevision.orders[0].status='fulfilling';assert.equal(accountRevisionBasis(unproved),null);
});
test('reopening an existing revision preserves the historical feedback bytes for replay',()=>{let s=sample(ready());s=act(s,'CLOSE_COLLECTION_REVISION');s=act(s,'OPEN_COLLECTION_REVISION');assert.equal(s.feedback.message,'Northline 想看一版独立的新包装。旧原稿的授权不能撤回；是否另做新样由你决定。');assert.deepEqual(normalizeDealRoom(s),s);});

test('a paid four-day revision sample has no dead return button, and a revision licence never renames the actual original',async()=>{
 const {revisionView}=await import('../src/deal-room-revision-view.js');
 let s=ready('cream');const original=structuredClone(s.collection);s=act(s,'OPEN_COLLECTION_REVISION');const day=s.day,initial=s.cash;
 assert.match(revisionView(s),/确认后，接下来 4 天用于打样/);assert.match(revisionView(s),/data-action="CLOSE_COLLECTION_REVISION"/);
 s=act(s,'COMMISSION_COLLECTION_REVISION');assert.equal(s.cash,initial-3200);assert.equal(reduceDealRoom(s,{type:'CLOSE_COLLECTION_REVISION'}),s);
 const waiting=revisionView(s);assert.doesNotMatch(waiting,/data-action="CLOSE_COLLECTION_REVISION"/);assert.match(waiting,new RegExp('等到第 '+(day+4)+' 天'));
 s=act(s,'RECEIVE_COLLECTION_REVISION');assert.equal(s.day,day+4);assert.equal(s.cash,initial-3320);assert.match(revisionView(s),/data-action="CLOSE_COLLECTION_REVISION"/);
 s=act(sign(s,'northline','revision-exclusive'),'FULFIL_COLLECTION_REVISION');assert.equal(s.collection.style,'cream');assert.deepEqual(s.collection,original);assert.match(revisionView(s),/独家范围只限潮汐版/);assert.doesNotMatch(revisionView(s),/旧枝叶版/);
});
