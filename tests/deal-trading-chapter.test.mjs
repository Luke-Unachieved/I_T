import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';
import {createDealRoom,reduceDealRoom} from '../src/deal-room-engine.js';
import {cooperationChapter} from '../src/deal-room-cooperation.js';
import {tradingChapter,tradingChapterView,tradingChapterVisual} from '../src/deal-room-trading-chapter.js';
import {careerRecapView,settledUnitPricesView} from '../src/deal-room-home.js';
import {buildDealHtml} from '../scripts/build-deal-standalone.mjs';
const a=(s,type,fields={})=>{const n=reduceDealRoom(s,{type,...fields});assert.notEqual(n,s,type+' in '+s.phase);return n;};
const finish=(s,id)=>a(a(a(s,'PROPOSE',{optionId:id}),'ADVANCE'),'NEXT_CLIENT');
function base(rounds=1){
 let s=createDealRoom();for(const id of ['trial','ready','season'])s=finish(s,id);
 s=a(s,'START_OPENING_CURATION',{clientId:'mira'});s=a(s,'SIGN_CURATION',{products:['mira','samir'],quantity:40,packaging:'plain'});s=a(s,'FULFIL_CURATION');
 for(let r=0;r<rounds;r++){s=a(s,'CONTINUE_BUSINESS');for(let i=0;i<2;i++)s=finish(a(s,'SELECT_CLIENT',{clientId:'mira'}),'repeat-small');}return s;
}
const first=(s,optionId)=>a(a(a(a(s,'START_ACCOUNT',{referrerId:'mira'}),'SIGN_ACCOUNT',{optionId}),'FULFIL_ACCOUNT'),'CLOSE_ACCOUNT');
function expand(s,series=false){s=a(s,'OPEN_ACCOUNT_EXPANSION');if(series)s=a(s,'SET_ACCOUNT_EXPANSION_BASIS',{basisId:'original'});return a(a(a(s,'SIGN_ACCOUNT_EXPANSION'),'FULFIL_ACCOUNT_EXPANSION'),'CLOSE_ACCOUNT');}
const privateSeries=s=>a(a(a(a(s,'START_COLLECTION'),'SIGN_COLLECTION',{model:'private',style:'cream'}),'FULFIL_COLLECTION'),'CLOSE_COLLECTION');
function newModel(s,factory='studio',second=false){
 s=a(a(a(a(s,'START_CASE_DEVELOPMENT'),'COMMISSION_SAMPLE',{factory}),'RECEIVE_SAMPLE'),'ACCEPT_SAMPLE');
 if(second)s=a(a(a(a(s,'OPEN_SECOND_SUPPLIER'),'COMMISSION_SECOND_SAMPLE'),'RECEIVE_SECOND_SAMPLE'),'ACCEPT_SECOND_SAMPLE');
 return s;
}
function sell(s,second=false){s=a(a(s,'CONTINUE_BUSINESS'),'SELECT_CLIENT',{clientId:'mira'});return a(finish(s,second?'second-developed-lamp':'developed-lamp'),'BACK_FROM_CLIENTS');}
const natural=()=>sell(newModel(expand(first(base(),'pilot'))));
test('the D45 trade ending keeps the regular settlement book and does not invent a supply plan',()=>{
 const s=natural(),original=structuredClone(s),prices=settledUnitPricesView(s.contracts);assert.equal(s.day,45);assert.equal(s.contracts.filter(c=>c.status==='paid').length,6);assert.ok(prices.includes('自己的成交单价'));
 for(const route of ['auto','trade'])for(const evidence of ['chain','model']){
  const html=careerRecapView(s,{route,evidence});assert.match(html,/做成了六家店的供货生意/);assert.match(html,/可用资金 ¥22,660/);assert.ok(html.includes(prices));assert.equal((html.match(/自己的成交单价/g)||[]).length,1);assert.ok(prices.includes('每件 ¥70'));assert.doesNotMatch(html,/最近结清的两批供货/);
 }
 assert.deepEqual(s,original);
});
test('a real previously paid two-lot plan stays inspectable next to either trade receipt and an existing series recap',()=>{
 let s=a(a(base(),'START_SUPPLY_PLAN',{clientId:'mira',firstBatch:'small',payment:'delivery'}),'FULFIL_SUPPLY_PLAN');assert.equal(s.supplyPlanHistory.at(-1).lots.length,2);const original=s.supplyPlanHistory.at(-1);
 const receipt=careerRecapView(s).match(/<details class="settled-prices"><summary>最近结清的两批供货[\s\S]+?<\/details>/)[0];
 s=sell(newModel(expand(first(s,'pilot'))));assert.ok(tradingChapter(s));const series=privateSeries(s);
 for(const state of [s,series])for(const route of ['auto','trade'])for(const evidence of ['chain','model']){
  const html=careerRecapView(state,{route,evidence});assert.ok(html.includes(receipt));assert.ok(html.includes(settledUnitPricesView(state.contracts)));assert.equal((html.match(/最近结清的两批供货/g)||[]).length,1);assert.deepEqual(state.supplyPlanHistory.at(-1),original);
 }
});
test('D45 supplier career closes without a collection or household spending, with only the two real trades',()=>{
 const s=natural(),snap=structuredClone(s),t=tradingChapter(s);assert.equal(s.day,45);assert.equal(s.cash,22660);assert.equal(s.collection,undefined);assert.equal(s.personalLife?.spent||0,0);
 assert.equal(cooperationChapter(s).closed,false,'separate design chapter remains unopened');assert.equal(t.completedDay,45);assert.equal(t.chain.sets,600);assert.equal(t.chain.revenue,46200);assert.deepEqual(t.chain.batches.map(b=>b.paymentDay),[31,37]);assert.equal(t.model.contract.quantity,60);assert.equal(t.model.contract.revenue,4200);
 assert.match(careerRecapView(s),/做成了六家店的供货生意/);assert.match(careerRecapView(s),/第 23 天，买手收到的 40 套/);assert.match(careerRecapView(s),/货款，已收齐/);assert.doesNotMatch(careerRecapView(s),/签署|独家|系列设计/);
 assert.match(tradingChapterView(t,'model'),/Mira · 三档调光台灯/);assert.match(tradingChapterView(t,'model'),/data-action="VIEW_DEVELOPMENT"/);assert.match(tradingChapterVisual(t,'model').buyer,/Mira/);assert.deepEqual(s,snap);
 const alternate={...s,day:s.day+4,contracts:[...s.contracts.slice(0,-1),{...s.contracts.at(-1),paidDay:s.day+3},s.contracts.at(-1)]};assert.equal(tradingChapter(alternate).model.contract,alternate.contracts.at(-1));
 const late={...s,day:s.day+4,contracts:[...s.contracts.slice(0,-1),{...s.contracts.at(-1),paidDay:s.day+2}]};assert.equal(tradingChapter(late).completedDay,47);assert.match(careerRecapView(late,{evidence:'model'}),/第 47 天收清货款/);
 const continued=a(a(s,'CONTINUE_BUSINESS'),'SELECT_CLIENT',{clientId:'ines'});assert.equal(continued.phase,'negotiating');assert.equal(continued.cash,s.cash);assert.deepEqual(continued.accountHistory,s.accountHistory);
});
test('both supplier slots and volume models work, model before store rollout is allowed, and shop terms reflect actual discounts',()=>{
 for(const [factory,second,kind] of [['studio',true,'line'],['line',true,'studio'],['line',false,'line']]){
  const s=first(sell(newModel(base(6),factory,second),second),'funded'),t=tradingChapter(s),c=t.model.contract;assert.equal(t.completedDay,t.chain.paymentDay);assert.equal(t.chain.batches.length,1);assert.equal(t.chain.batches[0].stores,6);assert.equal(t.chain.revenue,43890);assert.equal(t.model.kind,kind);assert.ok(c.paymentDay<t.completedDay);
  assert.equal(c.quantity,kind==='studio'?60:180);assert.match(careerRecapView(s,{route:'trade',evidence:'model'}),new RegExp(second?'OPEN_SECOND_SUPPLIER':'VIEW_DEVELOPMENT'));assert.deepEqual(tradingChapterVisual(t,'model').productNames,[c.product]);
 }
});
test('drafts, partial stores, mismatch, entitlement without paid sale and false attribution never close',()=>{
 const p=first(base(),'pilot');assert.equal(tradingChapter(sell(newModel(p))),null);assert.equal(tradingChapter(newModel(expand(p))),null);
 const s=natural();for(const change of [v=>v.accountHistory[1].status='fulfilling',v=>v.accountHistory[0].seriesSource={style:'cream'},v=>v.accountHistory[1].referrerId='ines',v=>v.accountHistory[1].products=['ines'],v=>v.curationHistory[0].paymentDay=v.day+1,v=>v.contracts.at(-1).status='receivable',v=>v.contracts.at(-1).clientId='samir',v=>v.contracts.at(-1).specification='developed-line',v=>v.productDevelopment.status='sampling',v=>v.contracts.at(-1).paymentDay=v.day+1,v=>v.accountHistory[0].revenue++]){const v=structuredClone(s);change(v);assert.equal(tradingChapter(v),null);}
 const mixed=expand(first(privateSeries(sell(newModel(base(2)))),'pilot'),true);assert.equal(cooperationChapter(mixed).closed,true);assert.equal(tradingChapter(mixed),null);assert.match(careerRecapView(mixed),/后三家是买方确认过的系列/);
});
test('a later series neither overwrites the trade outcome nor loses its own default recap and handover',()=>{
 const s=natural(),withSeries=privateSeries(s);assert.ok(tradingChapter(withSeries));assert.doesNotMatch(careerRecapView(withSeries),/做成了六家店的供货生意/);assert.match(careerRecapView(withSeries,{route:'trade'}),/六店供货/);
 const handed=a(a(a(a(withSeries,'OPEN_LAUNCH_PROJECT'),'REVIEW_LAUNCH'),'HAND_OVER_LAUNCH'),'CLOSE_LAUNCH_PROJECT');
 assert.ok(cooperationChapter(handed).closed);assert.ok(tradingChapter(handed));assert.match(careerRecapView(handed),/另有六家门店收到通用组合/);assert.match(careerRecapView(handed,{route:'trade',evidence:'model'}),/60 盏/);
});
test('offline interface opens trade independently, changes actual goods on the desk, and resumes the same workday',async()=>{
 const code=(await buildDealHtml()).match(/<script>([\s\S]*?)<\/script>/)[1];
 for(const withSeries of [false,true]){
  const s=withSeries?privateSeries(natural()):natural(),cash=s.cash,day=s.day;let saved=0;const buttons={};
  const root={innerHTML:'',querySelector(sel){if(sel==='#motion')return {};if(sel.startsWith('#')&&this.innerHTML.includes('id="'+sel.slice(1)+'"'))return {addEventListener(_,fn){buttons[sel]=fn;},focus(){}};return null;},querySelectorAll(sel){if(sel==='[data-trade-evidence]'&&this.innerHTML.includes('data-trade-evidence='))return ['chain','model'].map(key=>({dataset:{tradeEvidence:key},set onclick(fn){buttons[key]=fn;}}));return [];}};
  const context=vm.createContext({document:{querySelector:()=>root,documentElement:{classList:{contains:()=>false,add(){}}}},localStorage:{getItem:k=>k==='trade-tycoon:deal-room-offline:v1'?JSON.stringify(s):null,setItem(){saved++;}},structuredClone,TextEncoder,console});
  new vm.Script(code).runInContext(context,{timeout:3000});const before=saved;assert.equal((root.innerHTML.match(/id="finish-trading"/g)||[]).length,1);assert.match(root.innerHTML,/Mira 也收到了 60 盏三档调光台灯/);const opener=withSeries?'#finish-trading':'#finish-session';assert.equal(typeof buttons[opener],'function');buttons[opener]();assert.match(root.innerHTML,/自己的成交单价/);assert.match(root.innerHTML,/Northline · 六店通用组合 · 已交货并收款/);assert.match(root.innerHTML,/300 套，第 29 天交货，第 31 天收齐/);
  buttons.model();assert.match(root.innerHTML,/自己的成交单价/);assert.match(root.innerHTML,/Mira · 三档调光台灯 · 已交货并收款/);assert.doesNotMatch(root.innerHTML,/Northline · 六店通用组合 · 已交货并收款/);assert.match(root.innerHTML,/第 45 天送到 Mira，第 45 天收清货款/);
  buttons.chain();assert.match(root.innerHTML,/600 套已交付/);buttons['#resume-work']();assert.match(root.innerHTML,new RegExp('id="'+opener.slice(1)+'"'));assert.doesNotMatch(root.innerHTML,/class="career-recap"/);
  assert.equal(saved,before);assert.equal(s.cash,cash);assert.equal(s.day,day);
 }
});
