import test from 'node:test';
import assert from 'node:assert/strict';
import {createDealRoom,reduceDealRoom,normalizeDealRoom} from '../src/deal-room-engine.js';
import {cooperationChapter} from '../src/deal-room-cooperation.js';
import {cooperationView} from '../src/deal-room-cooperation-view.js';
import {careerRecapView} from '../src/deal-room-home.js';
const act=(s,type,args={})=>{const n=reduceDealRoom(s,{type,...args});assert.notEqual(n,s,type);return n;};
function pilot(){
 let s=createDealRoom();for(const optionId of ['trial','ready','season']){s=act(s,'PROPOSE',{optionId});s=act(s,'ADVANCE');s=act(s,'NEXT_CLIENT');}
 s=act(s,'START_OPENING_CURATION',{clientId:'mira'});s=act(s,'SIGN_CURATION',{products:['mira','samir','ines'],quantity:40,packaging:'plain'});s=act(s,'FULFIL_CURATION');
 s=act(s,'START_COLLECTION');s=act(s,'SIGN_COLLECTION',{model:'private',style:'cream'});s=act(s,'FULFIL_COLLECTION');s=act(s,'CLOSE_COLLECTION');
 s=act(s,'START_ACCOUNT',{referrerId:'mira'});s=act(s,'SIGN_ACCOUNT',{optionId:'pilot'});s=act(s,'FULFIL_ACCOUNT');return act(s,'CLOSE_ACCOUNT');
}
function second(s,basis='original'){
 s=act(s,'OPEN_ACCOUNT_EXPANSION');if(basis==='original')s=act(s,'SET_ACCOUNT_EXPANSION_BASIS',{basisId:'original'});
 return act(s,'SIGN_ACCOUNT_EXPANSION');
}
const closeSecond=s=>act(act(s,'FULFIL_ACCOUNT_EXPANSION'),'CLOSE_ACCOUNT');
test('three generic stores still have a live expansion choice; three newly contracted series stores are not yet a delivery',()=>{
 let s=pilot();assert.equal(s.day,38);assert.equal(s.cash,26170);
 const chapter=cooperationChapter(s);assert.equal(chapter.closed,false);assert.equal(chapter.nextAction.type,'OPEN_ACCOUNT_EXPANSION');
 assert.match(cooperationView(s),/余下三家可以沿用它/);
 s=second(s);assert.equal(cooperationChapter(s).nextAction.type,'FULFIL_ACCOUNT_EXPANSION');assert.equal(cooperationChapter(s).closed,false);
 assert.equal(cooperationChapter(s).facts.some(f=>f.kind==='generic-then-series-stores'),false);
});
test('a paid generic pilot plus paid approved-series expansion closes from actual receipts, before and after optional handover',()=>{
 const first=pilot(),originalPilot=structuredClone(first.accountHistory[0]);let s=closeSecond(second(first));
 assert.equal(s.day,44);assert.equal(s.cash,35290);assert.deepEqual(normalizeDealRoom(s),s);
 const before=structuredClone(s),c=cooperationChapter(s);
 assert.equal(c.stage,'closed');assert.equal(c.closed,true);assert.equal(c.nextAction.type,'OPEN_LAUNCH_PROJECT');assert.match(c.nextAction.label,/可选/);
 assert.deepEqual(c.facts.find(f=>f.kind==='generic-then-series-stores'),{kind:'generic-then-series-stores',genericStores:3,seriesStores:3});
 assert.equal(c.facts.find(f=>f.kind==='same-version-stores').stores,3);
 assert.match(cooperationView(s),/首批 3 家通用组合 · 后 3 家系列商品/);assert.doesNotMatch(cooperationView(s),/谈余下|6 家店收到同版/);
 assert.match(careerRecapView(s),/首批三家是通用组合，后三家是买方确认过的系列/);
 assert.deepEqual(s,before);assert.deepEqual(s.accountHistory[0],originalPilot);assert.equal(s.accountHistory[0].seriesSource,undefined);
 assert.equal(s.accountHistory[1].seriesSource.scope,'private-label');
 for(const type of ['OPEN_LAUNCH_PROJECT','REVIEW_LAUNCH','HAND_OVER_LAUNCH','CLOSE_LAUNCH_PROJECT'])s=act(s,type);
 assert.equal(cooperationChapter(s).closed,true);assert.equal(cooperationChapter(s).nextAction,null);
 assert.match(cooperationView(s),/上市交接已完成/);assert.deepEqual(s.accountHistory[0],originalPilot);assert.deepEqual(normalizeDealRoom(s),s);
});
test('six generic stores never turn into series stores; unconfirmed and mismatched expansions do not complete the split chapter',()=>{
 const first=pilot(),generic=closeSecond(second(first,'previous'));assert.equal(cooperationChapter(generic).closed,false);
 assert.equal(cooperationChapter(generic).facts.some(f=>f.kind==='generic-then-series-stores'),false);
 const actual=closeSecond(second(first));for(const change of [s=>s.accountHistory[1].status='fulfilling',s=>s.accountHistory[1].seriesSource.style='charcoal',s=>s.accountHistory[1].signedDay=s.accountHistory[0].paymentDay-1,s=>s.accountHistory[0].referrerId='northline',s=>s.accountHistory[0].products=['ines'],s=>s.curationHistory[0].status='draft']){
  const s=structuredClone(actual);change(s);assert.equal(cooperationChapter(s).closed,false);assert.equal(cooperationChapter(s).facts.some(f=>f.kind==='generic-then-series-stores'),false);
 }
});

test('the complete offline recap keeps its top customer caption consistent with the two original paid store batches',async()=>{
 const {buildDealHtml}=await import('../scripts/build-deal-standalone.mjs'),vm=await import('node:vm');
 const html=await buildDealHtml(),script=html.match(/<script>([\s\S]*?)<\/script>/)[1],s=closeSecond(second(pilot()));
 let show;const root={innerHTML:'',querySelector(sel){if(sel==='#motion')return {};if(sel==='#finish-session'&&root.innerHTML.includes('id="finish-session"'))return {addEventListener(kind,f){if(kind==='click')show=f;}};return null;},querySelectorAll(){return [];}};
 const document={querySelector:()=>root,documentElement:{classList:{contains:()=>false,add(){}}}};
 const ctx=vm.createContext({document,localStorage:{getItem:k=>k==='trade-tycoon:deal-room-offline:v1'?JSON.stringify(s):null,setItem(){}},TextEncoder,structuredClone,console});
 new vm.Script(script).runInContext(ctx,{timeout:3000});assert.equal(typeof show,'function');show();
 assert.match(root.innerHTML,/Northline · 三店通用组合，三店系列商品/);assert.match(root.innerHTML,/首批三家是通用组合，后三家是买方确认过的系列/);
 assert.doesNotMatch(root.innerHTML,/同版系列六店交付/);
});
