import test from 'node:test';import assert from 'node:assert/strict';
import {createDealRoom,reduceDealRoom,normalizeDealRoom} from '../src/deal-room-engine.js';
import {accountExpansionBases,previewAccount} from '../src/deal-room-account.js';
const act=(s,type,x={})=>{const n=reduceDealRoom(s,{type,...x});assert.notEqual(n,s,type);return n;};
function ready(){let s=createDealRoom();for(const optionId of ['trial','ready','small'])for(const a of [{type:'PROPOSE',optionId},{type:'ADVANCE'},{type:'NEXT_CLIENT'}])s=reduceDealRoom(s,a);s=act(s,'START_OPENING_CURATION',{clientId:'mira'});s=act(s,'SIGN_CURATION',{products:['mira','samir','ines'],quantity:40,packaging:'plain'});s=act(s,'FULFIL_CURATION');s=act(s,'START_COLLECTION');s=act(s,'SIGN_COLLECTION',{model:'own',style:'botanical'});for(const buyerId of ['northline','atelier']){s=act(s,'OPEN_COLLECTION_PITCH',{buyerId});s=act(s,'SIGN_COLLECTION_PITCH',{optionId:'retain'});s=act(s,'FULFIL_COLLECTION');}return act(s,'CLOSE_COLLECTION');}
function sample(s){s=act(s,'OPEN_COLLECTION_REVISION');s=act(s,'COMMISSION_COLLECTION_REVISION');return act(s,'RECEIVE_COLLECTION_REVISION');}
const sign=(s,buyerId,scope)=>act(s,'SIGN_COLLECTION_REVISION',{buyerId,scope});

function versions(){let s=sample(ready());s=sign(s,'northline','revision-exclusive');return act(act(s,'FULFIL_COLLECTION_REVISION'),'CLOSE_COLLECTION_REVISION');}
function pilot(s,revision=false){s=act(s,revision?'START_ACCOUNT_FROM_REVISION':'START_ACCOUNT_FROM_COLLECTION');s=act(s,'SIGN_ACCOUNT',{optionId:'pilot'});s=act(s,'FULFIL_ACCOUNT');return act(s,'CLOSE_ACCOUNT');}
test('remaining stores can select a separately paid version without rewriting first stores or rights',()=>{
 let s=pilot(versions());const first=structuredClone(s.accountHistory[0]),rights=structuredClone(s.collection),revision=structuredClone(s.collectionRevision);s=act(s,'OPEN_ACCOUNT_EXPANSION');const previous=structuredClone(s.account);
 assert.deepEqual(accountExpansionBases(s).map(o=>o.basisId),['previous','revision:tidal-grid']);assert.equal(s.feedback.message,'首批三家已交付。是否再接余下三家的采购，由你决定。');assert.deepEqual(normalizeDealRoom(s),s);
 s=act(s,'SET_ACCOUNT_EXPANSION_BASIS',{basisId:'revision:tidal-grid'});assert.equal(s.account.seriesSource.versionId,'revision:tidal-grid');assert.equal(reduceDealRoom(s,{type:'SET_ACCOUNT_EXPANSION_BASIS',basisId:'revision:tidal-grid'}),s);assert.deepEqual(normalizeDealRoom(s),s);
 s=act(s,'SET_ACCOUNT_EXPANSION_BASIS',{basisId:'previous'});assert.deepEqual(s.account,previous);s=act(s,'SET_ACCOUNT_EXPANSION_BASIS',{basisId:'revision:tidal-grid'});
 const q=previewAccount(s,'remaining'),cash=s.cash;assert.equal(q.sets,300);assert.equal(q.stores,3);assert.equal(q.cost,s.account.unitCost*300);
 s=act(s,'SIGN_ACCOUNT_EXPANSION');assert.equal(reduceDealRoom(s,{type:'SET_ACCOUNT_EXPANSION_BASIS',basisId:'previous'}),s);s=act(s,'FULFIL_ACCOUNT_EXPANSION');assert.equal(s.cash,cash+q.netProfit);assert.deepEqual(s.accountHistory[0],first);assert.equal(s.accountHistory[1].seriesSource.versionId,'revision:tidal-grid');assert.deepEqual(s.collection,rights);assert.deepEqual(s.collectionRevision,revision);assert.deepEqual(normalizeDealRoom(s),s);
 const bad=structuredClone(s);bad.accountHistory[0].seriesSource.versionId='revision:tidal-grid';assert.throws(()=>normalizeDealRoom(bad));
});
test('revision-first can choose original; duplicate source is hidden and generic previous can restore absence of source',()=>{
 let s=act(pilot(versions(),true),'OPEN_ACCOUNT_EXPANSION');assert.deepEqual(accountExpansionBases(s).map(o=>o.basisId),['previous','original']);s=act(s,'SET_ACCOUNT_EXPANSION_BASIS',{basisId:'original'});assert.equal(s.account.seriesSource.versionId,undefined);assert.deepEqual(normalizeDealRoom(s),s);
 s=versions();s=act(s,'START_ACCOUNT',{referrerId:'mira'});s=act(s,'SIGN_ACCOUNT',{optionId:'pilot'});s=act(act(s,'FULFIL_ACCOUNT'),'CLOSE_ACCOUNT');s=act(s,'OPEN_ACCOUNT_EXPANSION');const old=structuredClone(s.account);assert.equal(old.seriesSource,undefined);s=act(s,'SET_ACCOUNT_EXPANSION_BASIS',{basisId:'original'});s=act(s,'SET_ACCOUNT_EXPANSION_BASIS',{basisId:'previous'});assert.deepEqual(s.account,old);assert.deepEqual(normalizeDealRoom(s),s);
});
test('no unapproved, wrong-buyer, unpaid or non-expansion basis; old unchanged expansion still replays',()=>{
 const base=versions();assert.deepEqual(accountExpansionBases(base),[]);assert.equal(reduceDealRoom(base,{type:'SET_ACCOUNT_EXPANSION_BASIS',basisId:'revision:tidal-grid'}),base);
 let s=act(pilot(base),'OPEN_ACCOUNT_EXPANSION');const noRevision=structuredClone(s);delete noRevision.collectionRevision;assert.deepEqual(accountExpansionBases(noRevision).map(o=>o.basisId),['previous']);assert.equal(reduceDealRoom(s,{type:'SET_ACCOUNT_EXPANSION_BASIS',basisId:'unknown'}),s);assert.equal(reduceDealRoom(noRevision,{type:'SET_ACCOUNT_EXPANSION_BASIS',basisId:'revision:tidal-grid'}),noRevision);
 s=act(act(s,'SIGN_ACCOUNT_EXPANSION'),'FULFIL_ACCOUNT_EXPANSION');assert.deepEqual(normalizeDealRoom(s),s);
 const good=act(pilot(base),'OPEN_ACCOUNT_EXPANSION');for(const field of ['buyerId','status']){const bad=structuredClone(good);bad.collectionRevision.orders[0][field]=field==='buyerId'?'atelier':'production';assert.deepEqual(accountExpansionBases(bad).map(o=>o.basisId),['previous']);}
 const unpaid=structuredClone(good);unpaid.accountHistory[0].status='fulfilling';assert.deepEqual(accountExpansionBases(unpaid),[]);
});
