import test from 'node:test';
import assert from 'node:assert/strict';
import {createDealRoom,reduceDealRoom as reduce,normalizeDealRoom} from '../src/deal-room-engine.js';
import {cooperationChapter} from '../src/deal-room-cooperation.js';
import {cooperationView} from '../src/deal-room-cooperation-view.js';
import {careerRecapView} from '../src/deal-room-home.js';
const act=(s,type,args={})=>{const n=reduce(s,{type,...args});assert.notEqual(s,n,type);return n;};
function signedSeries(){
 let s=createDealRoom();for(const optionId of ['trial','ready','season']){s=act(s,'PROPOSE',{optionId});s=act(s,'ADVANCE');s=act(s,'NEXT_CLIENT');}
 s=act(s,'START_OPENING_CURATION',{clientId:'mira'});s=act(s,'SIGN_CURATION',{products:['mira','samir','ines'],quantity:40,packaging:'plain'});
 s=act(s,'FULFIL_CURATION');s=act(s,'START_COLLECTION');s=act(s,'SIGN_COLLECTION',{model:'private',style:'cream'});
 return act(act(s,'FULFIL_COLLECTION'),'CLOSE_COLLECTION');
}
const start=(s,optionId)=>act(act(s,'START_ACCOUNT',{referrerId:'mira'}),'SIGN_ACCOUNT',{optionId});
const finish=s=>act(act(s,'FULFIL_ACCOUNT'),'CLOSE_ACCOUNT');
const expand=s=>act(act(act(act(s,'OPEN_ACCOUNT_EXPANSION'),'SIGN_ACCOUNT_EXPANSION'),'FULFIL_ACCOUNT_EXPANSION'),'CLOSE_ACCOUNT');
function handed(s){for(const t of ['OPEN_LAUNCH_PROJECT','REVIEW_LAUNCH','HAND_OVER_LAUNCH','CLOSE_LAUNCH_PROJECT'])s=act(s,t);return s;}
test('generic stores alone never finish the series; only a paid series and actual launch handover give this route its own finish',()=>{
 for(const first of ['pilot','funded']){
  let s=finish(start(signedSeries(),first));if(first==='pilot')s=expand(s);
  const history=structuredClone(s.accountHistory);assert.equal(cooperationChapter(s).closed,false);
  assert.equal(cooperationChapter(s).nextAction.type,'OPEN_LAUNCH_PROJECT');s=handed(s);
  const before=structuredClone(s),c=cooperationChapter(s);
  assert.equal(c.closed,true);assert.equal(c.stage,'closed');assert.match(c.nextAction.label,/可选.*回看/);
  assert.deepEqual(c.facts.find(f=>f.kind==='generic-stores-separate-handover'),{kind:'generic-stores-separate-handover',genericStores:6,seriesStores:0});
  assert.ok(!c.facts.some(f=>['same-version-stores','mixed-approved-version-stores','generic-then-series-stores'].includes(f.kind)));
  assert.match(cooperationView(s),/6 家门店另收通用商品/);assert.match(careerRecapView(s),/另有六家门店收到通用组合/);
  assert.deepEqual(s,before);assert.deepEqual(s.accountHistory,history);assert.deepEqual(normalizeDealRoom(s),s);
  if(first==='pilot'){assert.equal(s.day,44);assert.equal(s.cash,34390);}
 }
});
test('handover before expansion keeps a real open choice; unfulfilled, wrong buyer and unmatched provenance cannot close it',()=>{
 let s=handed(finish(start(signedSeries(),'pilot')));assert.equal(cooperationChapter(s).closed,false);assert.equal(cooperationChapter(s).nextAction.type,'OPEN_ACCOUNT_EXPANSION');
 s=expand(s);assert.equal(cooperationChapter(s).closed,true);assert.deepEqual(normalizeDealRoom(s),s);
 for(const change of [x=>x.accountHistory[1].status='fulfilling',x=>x.accountHistory[1].referrerId='ines',x=>x.accountHistory[1].buyer='Atelier',x=>x.launchProject.status='review',x=>x.collection.orders[0].status='production']){
  const bad=structuredClone(s);change(bad);assert.equal(cooperationChapter(bad).closed,false);
 }
});
test('offline recap identifies generic chain stock separately from the delivered series handover',async()=>{
 const vm=await import('node:vm'),{buildDealHtml}=await import('../scripts/build-deal-standalone.mjs');
 const s=handed(finish(start(signedSeries(),'funded'))),code=(await buildDealHtml()).match(/<script>([\s\S]*?)<\/script>/)[1];let open;
 const root={innerHTML:'',querySelector(sel){if(sel==='#motion')return {};if(sel==='#finish-session'&&this.innerHTML.includes('id="finish-session"'))return {addEventListener(_,fn){open=fn;}};return null;},querySelectorAll(){return [];}};
 const context=vm.createContext({document:{querySelector:()=>root,documentElement:{classList:{contains:()=>false,add(){}}}},localStorage:{getItem:k=>k==='trade-tycoon:deal-room-offline:v1'?JSON.stringify(s):null,setItem(){}},structuredClone,TextEncoder,console});
 new vm.Script(code).runInContext(context,{timeout:3000});assert.equal(typeof open,'function');open();
 assert.match(root.innerHTML,/Northline · 系列陈列已交接，六店另供通用商品/);assert.doesNotMatch(root.innerHTML,/同版系列六店交付/);
});
