import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {buildDealHtml} from '../scripts/build-deal-standalone.mjs';
import {createDealRoom,reduceDealRoom,normalizeDealRoom} from '../src/deal-room-engine.js';
import {lifeCatalogue,lifeReadingLampBasis,lifePurchasePreview,lifeLightLevel} from '../src/deal-room-life.js';
import {lifeRoomView,bindLifeRoom} from '../src/deal-room-life-view.js';
import {homeLifeView} from '../src/deal-room-home.js';
const act=(s,type,x={})=>reduceDealRoom(s,{type,...x});
const buy=(s,id)=>act(s,'BUY_LIFE_ITEM',{itemId:id});
const finish=(s,id)=>act(act(act(s,'PROPOSE',{optionId:id}),'ADVANCE'),'NEXT_CLIENT');
function developed(factory='studio',second=false){
 let s=createDealRoom();for(const id of ['trial','ready','season'])s=finish(s,id);
 s=act(s,'START_OPENING_CURATION',{clientId:'mira'});s=act(s,'SIGN_CURATION',{products:['mira','samir'],quantity:40,packaging:'plain'});s=act(s,'FULFIL_CURATION');
 s=act(act(act(act(s,'START_CASE_DEVELOPMENT'),'COMMISSION_SAMPLE',{factory}),'RECEIVE_SAMPLE'),'ACCEPT_SAMPLE');
 if(second)s=act(act(act(act(s,'OPEN_SECOND_SUPPLIER'),'COMMISSION_SECOND_SAMPLE'),'RECEIVE_SECOND_SAMPLE'),'ACCEPT_SECOND_SAMPLE');
 return s;
}
function quote(s){return act(act(s,'CONTINUE_BUSINESS'),'SELECT_CLIENT',{clientId:'mira'});}
function home(s){return act(act(s,'NEXT_CLIENT'),'BACK_FROM_CLIENTS');}
function eligible(){return home(act(act(quote(developed()),'PROPOSE',{optionId:'developed-lamp'}),'ADVANCE'));}
test('a settled, adopted small-batch model unlocks private retail; inspection, unpaid delivery and fixed spec do not',()=>{
 for(const [first,second] of [['studio',false],['line',true],['line',false],['studio',true]]){
  const d=developed(first,second),id=second?'second-developed-lamp':'developed-lamp',qualifies=second?first==='line':first==='studio';
  assert.equal(lifeCatalogue(d).length,5);assert.equal(lifeReadingLampBasis(d),null);assert.equal(buy(d,'readinglamp'),d);
  const signed=act(quote(d),'PROPOSE',{optionId:id});assert.equal(signed.phase,'fulfilling');assert.equal(lifeReadingLampBasis(signed),null);assert.equal(lifeCatalogue(signed).length,5);
  const h=home(act(signed,'ADVANCE')),c=h.contracts.at(-1);assert.equal(c.status,'paid');assert.equal(lifeReadingLampBasis(h),qualifies?c:null);
  assert.equal(lifeCatalogue(h).length,qualifies?6:5);
  assert.equal(homeLifeView(h).includes('回家看看：现在也能另订一盏'),qualifies);
  assert.equal(lifeRoomView(h).includes('data-life-preview="readinglamp"'),qualifies);
  if(qualifies){
   for(const overrides of [{clientId:'samir'},{status:'receivable'},{specification:'developed-line'},{optionId:'repeat-small'},{paymentDay:h.day+1}]){
    const wrong={...h,contracts:[{...c,...overrides}]};assert.equal(lifeReadingLampBasis(wrong),null);assert.equal(buy(wrong,'readinglamp'),wrong);
   }
  }
 }
});
test('preview and skipping are free; optional private lamp and table leave customer inventory, offers, day and net terms alone',()=>{
 const s=eligible();assert.equal(s.day,31);assert.equal(s.cash,9080);assert.match(lifePurchasePreview(s,'readinglamp').reason,/先给阅读角添一把椅子/);
 const chair=buy(s,'chair'),before=structuredClone(chair),trial=lifeRoomView(chair,{preview:'readinglamp'});
 assert.match(trial,/¥180/);assert.match(trial,/¥580/);assert.match(trial,/花费 ¥760/);assert.match(trial,/试摆不会扣钱/);assert.match(trial,/data-lamp-level="2"/);
 assert.doesNotMatch(trial,/data-life-room-use="readinglamp"/);assert.deepEqual(chair,before);
 const poor={...chair,cash:759};assert.equal(buy(poor,'readinglamp'),poor);
 const owned=buy(chair,'readinglamp');assert.equal(chair.cash-owned.cash,760);assert.equal(owned.cash,7520);assert.equal(owned.day,chair.day);assert.deepEqual(owned.contracts,chair.contracts);assert.deepEqual(owned.productDevelopment,chair.productDevelopment);assert.deepEqual(owned.curationHistory,chair.curationHistory);
 assert.equal(owned.personalLife.spent,1560);assert.equal(owned.personalLife.purchases.at(-1).price,760);assert.equal(buy(owned,'readinglamp'),owned);assert.equal(act(owned,'ARRANGE_LIFE_ITEM',{itemId:'readinglamp',position:'inside'}),owned);
 assert.deepEqual(normalizeDealRoom(owned),owned);assert.deepEqual(normalizeDealRoom(s),s);
 const again=h=>finish(quote(h),'repeat-small'),a=again(s),b=again(owned);assert.equal(a.contracts.length,s.contracts.length+1);assert.equal(a.contracts.at(-1).status,'paid');assert.deepEqual(a.contracts,b.contracts);assert.equal(a.day,b.day);assert.equal(a.cash-b.cash,1560);assert.equal(a.personalLife?.spent||0,0);
 assert.doesNotMatch(homeLifeView(owned),/另订一盏/);assert.match(homeLifeView(owned),/调光阅读角/);
});
test('the table follows the chair; stepped light changes the room and both actual book surfaces without moving the bookmark',()=>{
 let s=buy(buy(buy(eligible(),'chair'),'readinglamp'),'books');s=act(s,'READ_LIFE_BOOK',{itemId:'books',page:2});const before=structuredClone(s);
 for(let n=0;n<=3;n++){
  for(const using of ['chair','books','readinglamp']){
   const html=lifeRoomView(s,{using,readingLight:n,page:1});assert.match(html,new RegExp('data-lamp-level="'+n+'" transform="translate\\(0,0\\)"'));assert.match(html,new RegExp('data-life-light-level="'+n+'" aria-pressed="true"'));assert.equal((html.match(/data-life-light-level=/g)||[]).length,4);
   if(using!=='readinglamp')assert.match(html,new RegExp('data-reading-light="'+n+'"'));
   if(using==='books')assert.match(html,/书签停在第 3 \/ 4 篇/);
   assert.equal(html.includes('fill="#ffdf93"'),n>0);
  }
 }
 const moved=act(s,'ARRANGE_LIFE_ITEM',{itemId:'chair',position:'inside'});assert.match(lifeRoomView(moved),/data-lamp-level="0" transform="translate\(65,0\)"/);assert.deepEqual(s,before);
 for(const n of [99,-1,'3',NaN])assert.equal(lifeLightLevel({readingLight:n}),0);
});
test('bound switch uses UI state only, preserves music and page, and rejects unauthorised or stale events',()=>{
 const owned=buy(buy(eligible(),'chair'),'readinglamp');let s=owned,ui={using:'chair',page:1,soundOn:true};const controls=['0','1','2','3','9'].map(n=>({dataset:{lifeLightLevel:n}}));
 const doc={addEventListener(){},removeEventListener(){}},root={ownerDocument:doc,querySelector(){return null;},querySelectorAll(q){return q==='[data-life-light-level]'?controls:[];}};
 let mutations=0;bindLifeRoom(root,{getState:()=>s,getUI:()=>ui,setUI:next=>{ui=next;mutations++;},dispatch(){assert.fail('switch must not dispatch a business or expense action');},close(){}});
 controls[3].onclick();assert.deepEqual(ui,{using:'chair',page:1,soundOn:true,readingLight:3});controls[4].onclick();assert.equal(mutations,1);ui={...ui,using:'coffee'};controls[1].onclick();assert.equal(mutations,1);
 ui={...ui,using:'chair'};s=eligible();controls[2].onclick();assert.equal(mutations,1);
});
test('offline artifact includes working scoped catalog, book illumination and the drawn lamp, with no external references',async()=>{
 const html=await buildDealHtml(),js=html.match(/<script>([\s\S]*?)<\/script>/)[1],cut=js.indexOf('const {lifeRoomView,bindLifeRoom}=');assert.ok(cut>0);
 const end=js.indexOf('return {lifeRoomView,bindLifeRoom};})();',cut)+'return {lifeRoomView,bindLifeRoom};})();'.length;
 const s=buy(buy(eligible(),'chair'),'readinglamp'),view=vm.runInNewContext(js.slice(0,end)+';lifeRoomView(s,{using:"chair",readingLight:3})',{s,structuredClone});
 assert.match(view,/data-reading-light="3"/);assert.match(view,/data-lamp-level="3"/);assert.match(view,/data-life-room-use="readinglamp"/);assert.match(html,/--paper:#fffbea/);assert.doesNotMatch(view,/(?:href|src)="(?:https?:|assets\/)/);
});
