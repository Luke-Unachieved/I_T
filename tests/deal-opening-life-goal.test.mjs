import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {buildDealHtml} from '../scripts/build-deal-standalone.mjs';
import {createDealRoom,reduceDealRoom as step} from '../src/deal-room-engine.js';
import {LIFE_ITEMS,lifeAvailable} from '../src/deal-room-life.js';

const key='trade-tycoon:deal-room-offline:v1';
const source=(await buildDealHtml()).match(/<script>([\s\S]*?)<\/script>/)[1];
function markup(s){
 const root={innerHTML:'',querySelector:sel=>sel==='#motion'?{}:null,querySelectorAll:()=>[]};
 const document={querySelector:()=>root,documentElement:{classList:{contains:()=>false,add(){}}}};
 const raw=JSON.stringify(s),localStorage={getItem:k=>k===key?raw:null,setItem(){assert.fail('preview must not write to the save');}};
 new vm.Script(source).runInNewContext({document,localStorage,structuredClone,TextEncoder,console},{timeout:3000});
 return root.innerHTML;
}
const pay=(s,optionId)=>step(step(s,{type:'PROPOSE',optionId}),{type:'ADVANCE'});
const next=s=>step(s,{type:'NEXT_CLIENT'});
test('the first payment previews an actual future chair without opening a shop or charging the player',()=>{
 const initial=createDealRoom();assert.doesNotMatch(markup(initial),/opening-life-goal/);
 const chair=LIFE_ITEMS.find(i=>i.id==='chair');assert.ok(chair);
 for(const offer of ['trial','rollout']){
  const s=pay(initial,offer),h=markup(s);
  assert.equal(s.phase,'paid');assert.equal(lifeAvailable(s),false);
  assert.ok(h.includes(chair.name+' · ¥'+chair.price.toLocaleString('zh-CN')));
  assert.match(h,/三位客户的首单都收齐后/);
  assert.doesNotMatch(h,/id="open-personal-life"|data-life-buy|class="home-life"/);
  assert.equal(step(s,{type:'BUY_LIFE_ITEM',itemId:'chair'}),s);
  assert.equal(next(s).cash,s.cash);
 }
});
test('later receipts do not repeat the preview; home opens after three settlements and describes unpurchased vs owned goods',()=>{
 const first=pay(createDealRoom(),'trial'),second=pay(next(first),'ready'),third=pay(next(second),'season');
 for(const s of [next(first),second,third])assert.doesNotMatch(markup(s),/opening-life-goal|id="open-personal-life"/);
 const home=next(third),h=markup(home);assert.equal(home.cash,8520);assert.equal(lifeAvailable(home),true);
 assert.match(h,/家里还没添置新物件/);assert.match(h,/id="open-personal-life"/);assert.doesNotMatch(h,/第一笔合作做成了|opening-life-goal/);
 const owned=step(home,{type:'BUY_LIFE_ITEM',itemId:'chair'}),ownedHtml=markup(owned);
 assert.equal(owned.cash,home.cash-LIFE_ITEMS.find(i=>i.id==='chair').price);
 assert.match(ownedHtml,/阅读角/);assert.doesNotMatch(ownedHtml,/家里还没添置新物件|opening-life-goal/);
});
