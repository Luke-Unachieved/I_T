import test from 'node:test';import assert from 'node:assert/strict';
import {createDealRoom,reduceDealRoom,normalizeDealRoom} from '../src/deal-room-engine.js';
import {collectionQuote,collectionView,collectionPitchOffers,previewCollectionPitch,collectionPitchView} from '../src/deal-room-collection.js';
const act=(s,type,more={})=>reduceDealRoom(s,{type,...more});
const finish=(s,optionId)=>act(act(act(s,'PROPOSE',{optionId}),'ADVANCE'),'NEXT_CLIENT');
function paidCase(){let s=createDealRoom();for(const id of ['trial','ready','season'])s=finish(s,id);s=act(s,'CONTINUE_BUSINESS');for(let i=0;i<2;i++)s=finish(act(s,'SELECT_CLIENT',{clientId:'mira'}),'repeat-small');s=act(s,'START_SUPPLY_PLAN',{clientId:'mira',firstBatch:'small',payment:'delivery'});s=act(act(s,'FULFIL_SUPPLY_PLAN'),'START_CLIENT_PROJECTS');for(const clientId of ['mira','samir','ines'])s=finish(act(s,'SELECT_CLIENT',{clientId}),'project-series');s=act(s,'START_CURATION',{clientId:'mira'});return act(act(s,'SIGN_CURATION',{products:['mira','samir','ines'],quantity:40,packaging:'gift'}),'FULFIL_CURATION');}
import {cooperationChapter} from '../src/deal-room-cooperation.js';
function series(model='private',buyerId='northline',optionId='retain'){
 let s=act(act(paidCase(),'START_COLLECTION'),'SIGN_COLLECTION',{model,style:model==='private'?'charcoal':'botanical'});
 if(model==='own')s=act(act(s,'OPEN_COLLECTION_PITCH',{buyerId}),'SIGN_COLLECTION_PITCH',{optionId});
 return act(act(s,'FULFIL_COLLECTION'),'CLOSE_COLLECTION');
}
const handover=s=>act(act(act(act(s,'OPEN_LAUNCH_PROJECT'),'REVIEW_LAUNCH'),'HAND_OVER_LAUNCH'),'CLOSE_LAUNCH_PROJECT');
test('proposal and contract are not delivered chapters',()=>{
 const s=paidCase(),p=cooperationChapter(s);assert.equal(p.relation,null);assert.equal(p.nextAction.type,'START_COLLECTION');
 const signed=act(act(s,'START_COLLECTION'),'SIGN_COLLECTION',{model:'private',style:'cream'}),r=cooperationChapter(signed);assert.equal(r.stage,'contract');assert.equal(r.closed,false);assert.equal(r.nextAction.type,'FULFIL_COLLECTION');assert.equal(r.facts.some(f=>f.kind==='series-delivered'),false);
});
test('Atelier exclusive closes from its own handover, not Northline stores',()=>{
 let s=series('own','atelier','exclusive');let r=cooperationChapter(s);assert.equal(r.relation.buyerId,'atelier');assert.equal(r.nextAction.type,'OPEN_LAUNCH_PROJECT');assert.equal(r.closed,false);
 assert.equal(cooperationChapter({...s,accountHistory:[{status:'paid',stores:6}]}).closed,false);
 s=handover(s);r=cooperationChapter(s);assert.equal(r.stage,'closed');assert.equal(r.nextAction,null);assert.equal(r.facts.find(f=>f.kind==='launch-handed').buyerId,'atelier');assert.deepEqual(normalizeDealRoom(s),s);
});
test('Northline three stores advances existing contract; six closes without inventing a required handover gate',()=>{
 let s=series(),r=cooperationChapter(s);assert.equal(r.relation.route,'private');assert.equal(r.nextAction.type,'START_ACCOUNT_FROM_COLLECTION');assert.equal(r.closed,false);
 s=act(act(act(act(s,'START_ACCOUNT_FROM_COLLECTION'),'SIGN_ACCOUNT',{optionId:'pilot'}),'FULFIL_ACCOUNT'),'CLOSE_ACCOUNT');r=cooperationChapter(s);assert.equal(r.nextAction.type,'OPEN_ACCOUNT_EXPANSION');assert.equal(r.facts.find(f=>f.kind==='same-version-stores').stores,3);assert.equal(r.closed,false);
 s=act(act(act(act(s,'OPEN_ACCOUNT_EXPANSION'),'SIGN_ACCOUNT_EXPANSION'),'FULFIL_ACCOUNT_EXPANSION'),'CLOSE_ACCOUNT');r=cooperationChapter(s);assert.equal(r.closed,true);assert.equal(r.facts.some(f=>f.kind==='launch-handed'),false);assert.deepEqual(normalizeDealRoom(s),s);
 const snapshot=structuredClone(s);cooperationChapter(s);assert.deepEqual(s,snapshot);
});
test('generic stores or a mismatched version cannot close a Northline series chapter',()=>{
 let s=series();s=act(act(act(act(s,'START_ACCOUNT',{referrerId:'mira'}),'SIGN_ACCOUNT',{optionId:'funded'}),'FULFIL_ACCOUNT'),'CLOSE_ACCOUNT');assert.equal(cooperationChapter(s).closed,false);assert.match(cooperationChapter(s).step,/通用商品/);
 let real=series();real=act(act(act(act(real,'START_ACCOUNT_FROM_COLLECTION'),'SIGN_ACCOUNT',{optionId:'funded'}),'FULFIL_ACCOUNT'),'CLOSE_ACCOUNT');assert.equal(cooperationChapter(real).closed,true);const fake=structuredClone(real);fake.accountHistory[0].seriesSource.style='botanical';assert.equal(cooperationChapter(fake).closed,false);
});
test('independent original needs paid adoption, not approval or other-route orders',()=>{
 const s=series('own','atelier','retain'),r=cooperationChapter(s);assert.equal(r.relation.route,'independent');assert.equal(r.closed,false);assert.equal(r.nextAction.type,'OPEN_CASE_GROWTH');assert.equal(r.nextAction.referrerId,'mira');assert.match(r.step,/先选择合作方式/);
 const approved={...s,caseLampApprovals:{mira:{model:'developed'}},studioProject:{status:'approved'}};assert.equal(cooperationChapter(approved).closed,false);
 const wrong={...s,caseGrowthHistory:[{status:'paid',agreement:'private',designVersion:'original',purpose:'studio-series',designStyle:'botanical'}]};assert.equal(cooperationChapter(wrong).facts.some(f=>f.kind==='original-adopted'),false);
});
test('independent chapter closes at paid adoption and keeps later use optional',()=>{
 let s=series('own','atelier','retain');s=act(s,'OPEN_CASE_GROWTH',{referrerId:'mira'});s=act(s,'SIGN_CASE_GROWTH',{agreement:'portfolio',products:['mira','samir','ines'],packaging:'plain',terms:'delivery'});s=act(act(s,'FULFIL_CASE_GROWTH'),'CLOSE_CASE_GROWTH');
 assert.equal(cooperationChapter(s).nextAction.referrerId,'mira');
 s=act(s,'OPEN_CASE_GROWTH',{referrerId:'mira'});s=act(s,'WAIT_CASE_GROWTH',{products:['mira','samir','ines']});s=act(act(act(s,'SIGN_CATALOGUE_ORDER',{lampVersion:'standard'}),'FULFIL_CASE_GROWTH'),'CLOSE_CASE_GROWTH');
 let r=cooperationChapter(s);assert.equal(r.closed,true);assert.equal(r.stage,'closed');assert.match(r.nextAction.label,/可选/);assert.equal(r.facts.some(f=>f.kind==='use-delivered'),false);assert.equal(r.nextAction.type,'OPEN_STUDIO_PROJECT');assert.equal(r.nextAction.direction,'independent');
 s=act(s,'OPEN_STUDIO_PROJECT',{direction:'independent'});s=act(s,'REVIEW_STUDIO_PROJECT');assert.equal(cooperationChapter(s).closed,true);s=act(s,'WAIT_STUDIO_PROJECT');s=act(s,'SIGN_STUDIO_PROJECT_ORDER');assert.equal(cooperationChapter(s).closed,true);s=act(act(s,'FULFIL_CASE_GROWTH'),'CLOSE_CASE_GROWTH');
 r=cooperationChapter(s);assert.equal(r.closed,true);assert.equal(r.facts.find(f=>f.kind==='use-delivered').briefId,'reading');assert.deepEqual(normalizeDealRoom(s),s);
});

test('natural opening referral gives one uncommitted case entry, without assigning portfolio or ownership',()=>{
 let s=createDealRoom();for(const id of ['trial','ready','season'])s=finish(s,id);
 s=act(s,'START_OPENING_CURATION',{clientId:'ines'});s=act(act(s,'SIGN_CURATION',{products:['mira','samir','ines'],quantity:40,packaging:'plain'}),'FULFIL_CURATION');
 s=act(act(s,'START_COLLECTION'),'SIGN_COLLECTION',{model:'own',style:'botanical'});s=act(act(act(s,'OPEN_COLLECTION_PITCH',{buyerId:'northline'}),'SIGN_COLLECTION_PITCH',{optionId:'retain'}),'FULFIL_COLLECTION');s=act(s,'CLOSE_COLLECTION');
 const before=structuredClone(s),r=cooperationChapter(s);assert.deepEqual(r.nextAction,{type:'OPEN_CASE_GROWTH',label:'先看案例的合作方式',referrerId:'ines'});assert.match(r.step,/尚未约定/);assert.equal(r.closed,false);assert.deepEqual(s,before);
 const opened=act(s,r.nextAction.type,{referrerId:r.nextAction.referrerId});assert.equal(opened.phase,'case-growth');assert.equal(opened.caseGrowth.agreement,undefined);assert.deepEqual(normalizeDealRoom(opened),opened);
 const multiple={...s,curationHistory:[...s.curationHistory,{...s.curationHistory[0],referrerId:'mira',referrerName:'Mira'}]};assert.equal(cooperationChapter(multiple).nextAction,null);
});

test('buyer-only sleeve and original adoption are distinct paid facts, without a forced extra use order',async()=>{
 let s=series('own','atelier','sleeve');s=act(s,'OPEN_CASE_GROWTH',{referrerId:'mira'});s=act(s,'SIGN_CASE_GROWTH',{agreement:'portfolio',products:['mira','samir','ines'],packaging:'plain',terms:'delivery'});s=act(act(s,'FULFIL_CASE_GROWTH'),'CLOSE_CASE_GROWTH');s=act(s,'OPEN_CASE_GROWTH',{referrerId:'mira'});s=act(s,'WAIT_CASE_GROWTH',{products:['mira','samir','ines']});s=act(s,'SIGN_CATALOGUE_ORDER',{lampVersion:'standard'});assert.equal(cooperationChapter(s).closed,false);
 s=act(act(s,'FULFIL_CASE_GROWTH'),'CLOSE_CASE_GROWTH');const before=structuredClone(s),r=cooperationChapter(s);assert.equal(r.closed,true);assert.match(r.step,/专用纸套已交付/);assert.equal(r.facts.find(f=>f.kind==='series-delivered').scope,'buyer-sleeve');assert.equal(r.facts.filter(f=>f.kind==='original-adopted').length,1);assert.equal(r.facts.some(f=>f.kind==='use-delivered'),false);assert.deepEqual(s,before);
 const {careerRecapView}=await import('../src/deal-room-home.js');const recap=careerRecapView(s);assert.match(recap,/新的用途合作由你决定/);assert.doesNotMatch(recap,/走进实际使用场所/);
 const multiple={...s,curationHistory:[...s.curationHistory,{...s.curationHistory[0],referrerId:'ines'}],caseGrowthHistory:[...s.caseGrowthHistory,{status:'paid',agreement:'private',referrerId:'ines',products:['mira','samir','ines']}]};const choices=cooperationChapter(multiple);assert.equal(choices.closed,true);assert.equal(choices.nextAction.type,'OPEN_COLLECTION');assert.equal(choices.nextAction.direction,undefined);
});

 test('generic stores keep launch handover discoverable without inventing series coverage',async()=>{
 let s=series();s=act(act(act(act(s,'START_ACCOUNT',{referrerId:'mira'}),'SIGN_ACCOUNT',{optionId:'funded'}),'FULFIL_ACCOUNT'),'CLOSE_ACCOUNT');
 assert.equal(cooperationChapter(s).nextAction.type,'OPEN_LAUNCH_PROJECT');
 const {cooperationView}=await import('../src/deal-room-cooperation-view.js');assert.match(cooperationView(s),/交接这套系列的陈列/);
 s=handover(s);const c=cooperationChapter(s);assert.match(c.nextAction.label,/回看/);assert.equal(c.facts.some(f=>f.kind==='same-version-stores'),false);assert.match(cooperationView(s),/上市交接已完成/);assert.deepEqual(normalizeDealRoom(s),s);
 });


test('cooperation signposts describe customer next steps instead of internal bookkeeping',async()=>{
 const {cooperationView}=await import('../src/deal-room-cooperation-view.js');
 const signed=act(act(paidCase(),'START_COLLECTION'),'SIGN_COLLECTION',{model:'private',style:'cream'});
 const before=structuredClone(signed),h=cooperationView(signed);
 assert.match(h,/系列订单已经签好，接下来安排制作、交货和收款/);
 assert.doesNotMatch(h,/不能把签约当作交付/);assert.deepEqual(signed,before);
 assert.match(cooperationChapter(signed).step,/不能把签约当作交付/);
 const atelier=series('own','atelier','exclusive'),a=cooperationView(atelier);
 assert.match(a,/和 Atelier 确认实物与陈列/);assert.doesNotMatch(a,/不重新问归属/);
 const independent=series('own','northline','retain');
 // Two referral cases is a display-only fixture; neither is yet a signed new contact.
 const multiple={...independent,caseGrowthHistory:[],curationHistory:[...independent.curationHistory,{...independent.curationHistory[0],referrerId:'ines',referrerName:'Inês'}]};
 const m=cooperationView(multiple);assert.match(m,/带着原稿去和概念店买手谈一谈/);assert.doesNotMatch(m,/不把转介自动算成采用/);
});
