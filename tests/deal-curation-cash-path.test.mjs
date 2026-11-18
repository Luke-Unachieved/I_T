import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {buildDealHtml} from '../scripts/build-deal-standalone.mjs';
import {createDealRoom,reduceDealRoom,previewCuration} from '../src/deal-room-engine.js';
import {curationView} from '../src/deal-room-curation-view.js';

function firstAssortment(){
 let s=createDealRoom();
 for(const optionId of ['trial','ready','season'])
  for(const a of [{type:'PROPOSE',optionId},{type:'ADVANCE'},{type:'NEXT_CLIENT'}])s=reduceDealRoom(s,a);
 s=reduceDealRoom(s,{type:'START_OPENING_CURATION',clientId:'mira'});
 assert.equal(s.phase,'curating');assert.equal(s.cash,8520);return s;
}
const label=(before,signed,paid)=>'现在 ¥'+before.toLocaleString('zh-CN')+'，签约后预计 ¥'+signed.toLocaleString('zh-CN')+'，收齐后预计 ¥'+paid.toLocaleString('zh-CN');
test('actual standalone quotes a reachable first assortment from current cash to both settlement milestones',async()=>{
 const s=firstAssortment(),draft={products:['mira','samir'],quantity:60,packaging:'plain'};
 const q=previewCuration(s,draft);assert.equal(q.valid,true);
 const signed=reduceDealRoom(s,{type:'SIGN_CURATION',...draft});
 const paid=reduceDealRoom(signed,{type:'FULFIL_CURATION'});
 assert.equal(signed.cash,q.cashAfterSigning);assert.equal(paid.cash,q.cashAfterPayment);
 const script=(await buildDealHtml()).match(/<script>([\s\S]*?)<\/script>/)[1];
 const root={innerHTML:'',querySelector:sel=>sel==='#motion'?{}:null,querySelectorAll:()=>[]};
 const document={querySelector:()=>root,documentElement:{classList:{contains:()=>false,add(){}}}};
 const raw=JSON.stringify(s);
 const localStorage={getItem:key=>key==='trade-tycoon:deal-room-offline:v1'?raw:null,setItem(){assert.fail('preview must not write progress');}};
 new vm.Script(script).runInNewContext({document,localStorage,structuredClone,TextEncoder,console},{timeout:3000});
 assert.ok(root.innerHTML.includes('aria-label="'+label(s.cash,signed.cash,paid.cash)+'"'));
 assert.equal((root.innerHTML.match(/class="quote-cash-path"/g)||[]).length,1);
});
test('changing assortment quantity updates milestones; over-budget assortment never draws its projected path',()=>{
 const s=firstAssortment(),original=structuredClone(s);
 const render=d=>{const q=previewCuration(s,d);return {q,html:curationView(s.curation,d,q,null,null,s.cash)};};
 const draft={products:['mira','samir','ines'],quantity:40,packaging:'gift'};
 const {q,html}=render(draft);assert.equal(q.valid,true);
 assert.deepEqual([q.cashAfterSigning,q.cashAfterPayment],[8140,11010]);
 assert.ok(html.includes('aria-label="'+label(s.cash,8140,11010)+'"'));
 const denied=render({...draft,quantity:60});assert.equal(denied.q.valid,false);
 assert.match(denied.html,/超过预算/);assert.match(denied.html,/data-action="SIGN_CURATION" disabled/);
 assert.doesNotMatch(denied.html,/class="quote-cash-path"/);assert.deepEqual(s,original);
});
