import test from 'node:test';import assert from 'node:assert/strict';
import {createDealRoom,reduceDealRoom,normalizeDealRoom} from '../src/deal-room-engine.js';
import {collectionQuote,collectionView,collectionPitchOffers,previewCollectionPitch,collectionPitchView} from '../src/deal-room-collection.js';
const act=(s,type,more={})=>reduceDealRoom(s,{type,...more});
const finish=(s,optionId)=>act(act(act(s,'PROPOSE',{optionId}),'ADVANCE'),'NEXT_CLIENT');
function paidCase(){let s=createDealRoom();for(const id of ['trial','ready','season'])s=finish(s,id);s=act(s,'CONTINUE_BUSINESS');for(let i=0;i<2;i++)s=finish(act(s,'SELECT_CLIENT',{clientId:'mira'}),'repeat-small');s=act(s,'START_SUPPLY_PLAN',{clientId:'mira',firstBatch:'small',payment:'delivery'});s=act(act(s,'FULFIL_SUPPLY_PLAN'),'START_CLIENT_PROJECTS');for(const clientId of ['mira','samir','ines'])s=finish(act(s,'SELECT_CLIENT',{clientId}),'project-series');s=act(s,'START_CURATION',{clientId:'mira'});return act(act(s,'SIGN_CURATION',{products:['mira','samir','ines'],quantity:40,packaging:'gift'}),'FULFIL_CURATION');}
import {accountCollectionBasis,accountReceipt,previewAccount,accountView} from '../src/deal-room-account.js';
function series(model='private',buyerId='northline',optionId='retain'){
 let s=act(act(paidCase(),'START_COLLECTION'),'SIGN_COLLECTION',{model,style:model==='private'?'charcoal':'botanical'});
 if(model==='own')s=act(act(s,'OPEN_COLLECTION_PITCH',{buyerId}),'SIGN_COLLECTION_PITCH',{optionId});
 return act(act(s,'FULFIL_COLLECTION'),'CLOSE_COLLECTION');
}
test('Northline paid series flows into existing chain procurement and keeps real version through expansion',()=>{
 for(const [model,option,scope,style] of [['private','retain','private-label','charcoal'],['own','retain','nonexclusive','botanical'],['own','exclusive','whole-exclusive','charcoal']]){
  let s=series(model,'northline',option),old=structuredClone(s.collection),basis=accountCollectionBasis(s);assert.equal(basis.seriesSource.scope,scope);assert.equal(basis.seriesSource.style,style);
  s=act(s,'START_ACCOUNT_FROM_COLLECTION');assert.equal(s.phase,'account');assert.equal(s.account.referrerId,'northline');assert.deepEqual(s.account.products,old.products);assert.deepEqual(s.collection,old);
  const locked=structuredClone(s.account.seriesSource),q=previewAccount(s,'pilot');assert.equal(q.valid,true);const startCash=s.cash;
  s=act(act(s,'SIGN_ACCOUNT',{optionId:'pilot'}),'FULFIL_ACCOUNT');assert.equal(s.cash,startCash+q.netProfit);assert.deepEqual(s.accountHistory[0].seriesSource,locked);assert.match(accountView(s,'pilot'),/已确认的系列，进入连锁门店/);assert.match(accountReceipt(s.account),new RegExp(locked.label));assert.deepEqual(normalizeDealRoom(s),s);
  s=act(act(s,'CLOSE_ACCOUNT'),'OPEN_ACCOUNT_EXPANSION');assert.deepEqual(s.account.seriesSource,locked);s=act(act(s,'SIGN_ACCOUNT_EXPANSION'),'FULFIL_ACCOUNT_EXPANSION');assert.deepEqual(s.accountHistory[1].seriesSource,locked);assert.deepEqual(s.collection,old);assert.deepEqual(normalizeDealRoom(s),s);
 }
});
test('no transfer from Atelier-only or unpaid Northline; generic cases remain available',()=>{
 const atelier=series('own','atelier','exclusive');assert.equal(accountCollectionBasis(atelier),null);assert.equal(act(atelier,'START_ACCOUNT_FROM_COLLECTION'),atelier);assert.equal(act(atelier,'START_ACCOUNT',{referrerId:'mira'}).phase,'account');
 const plainAtelier=series('own','atelier','retain');assert.equal(accountCollectionBasis(plainAtelier),null);
 const unpaid=act(act(paidCase(),'START_COLLECTION'),'SIGN_COLLECTION',{model:'private',style:'cream'});assert.equal(accountCollectionBasis(unpaid),null);assert.equal(act(unpaid,'START_ACCOUNT_FROM_COLLECTION'),unpaid);
});
test('series chain reorder does not repeat one-off design or licence fees, and locks original lamp model',()=>{
 for(const [model,opt] of [['private','retain'],['own','exclusive']]){
  const s=series(model,'northline',opt),o=s.collection.orders.at(-1),b=accountCollectionBasis(s);
  assert.equal(b.unitCost,(o.cost-(model==='private'?2400:0))/o.sets);
  assert.equal(b.unitPrice,Math.floor(((o.revenue-(model==='private'?4000:o.licenceFee))/o.sets)*.75));
 }
 const s=series('private'),tagged={...s,collection:{...s.collection,lampVersion:'developed'}};assert.equal(accountCollectionBasis(tagged).lampVersion,'developed');
 const signed=act(act(s,'START_ACCOUNT_FROM_COLLECTION'),'SIGN_ACCOUNT',{optionId:'pilot'}),bad=structuredClone(signed);bad.account.seriesSource.style='botanical';assert.throws(()=>normalizeDealRoom(bad));
});

test('career primary action continues Northline series; generic cases remain folded without duplicate card',async()=>{
 const {careerProjects}=await import('../src/deal-room-career-focus.js'),{businessHomeView}=await import('../src/deal-room-home.js');
 const s=series('private'),p=careerProjects(s).find(p=>p.id==='stores');assert.deepEqual(p.actions,[{label:'用已确认系列谈门店合作',type:'START_ACCOUNT_FROM_COLLECTION'}]);assert.match(p.step,/Northline 想把已确认系列带到门店/);
 const html=businessHomeView(s,{career:{eligible:false,reason:''},referrals:[],focus:'stores'});assert.equal((html.match(/START_ACCOUNT_FROM_COLLECTION/g)||[]).length,1);assert.match(html,/data-career-action="START_ACCOUNT_FROM_COLLECTION"/);assert.match(html,/<details class="business-route"><summary>通用商品的连锁采购/);assert.doesNotMatch(html,/Northline 想沿用这版继续铺店/);
 const other=careerProjects(series('own','atelier','exclusive')).find(p=>p.id==='stores');assert.equal(other.actions[0].type,'START_ACCOUNT');
});
