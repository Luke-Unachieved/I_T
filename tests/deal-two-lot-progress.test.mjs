import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createDealRoom,reduceDealRoom as reduce,previewSupplyPlan} from '../src/deal-room-engine.js';
import {supplyLotsView} from '../src/deal-room-supply-view.js';
import {careerRecapView} from '../src/deal-room-home.js';
const actions=JSON.parse(readFileSync(new URL('./fixtures/deal-group-day169-actions.json',import.meta.url)));
const ready=()=>actions.slice(0,actions.findIndex(a=>a.type==='START_SUPPLY_PLAN')).reduce(reduce,createDealRoom());
const act=(s,type,opts={})=>{const next=reduce(s,{type,...opts});assert.notEqual(next,s,type);return next;};
const options=payment=>({clientId:'mira',firstBatch:'large',payment});
const money=n=>'¥'+n.toLocaleString('zh-CN');
test('draft is not an actual start; signing starts only the first lot and books only the agreed deposit',()=>{
 const s=ready(),p=previewSupplyPlan(s,options('deposit')),h=supplyLotsView(p);
 assert.equal(p.valid,true);assert.match(h,/签约后安排/);assert.doesNotMatch(h,/已开工|已到账|已收齐/);
 const signed=act(s,'START_SUPPLY_PLAN',options('deposit')).supplyPlan,before=structuredClone(signed),live=supplyLotsView(signed);
 assert.equal((live.match(/已开工 · 制作中/g)||[]).length,1);assert.equal((live.match(/待开工/g)||[]).length,1);
 assert.ok(live.includes('0 / '+signed.totalQuantity+' 件'));assert.ok(live.includes(money(signed.deposit)+' / '+money(signed.revenue)));
 assert.deepEqual(signed,before);
});
test('same-day first delivery does not start the second lot; delivered goods stay distinct from unpaid balance',()=>{
 let s=act(ready(),'START_SUPPLY_PLAN',options('deposit'));const p=s.supplyPlan;
 assert.equal(p.events[0].day,p.events[1].day);
 s=act(s,'ADVANCE_SUPPLY_PLAN');let h=supplyLotsView(s.supplyPlan);
 assert.match(h,/已交付 · 待尾款/);assert.match(h,/待开工/);assert.doesNotMatch(h,/制作中/);
 assert.ok(h.includes(p.lots[0].quantity+' / '+p.totalQuantity+' 件'));
 s=act(s,'ADVANCE_SUPPLY_PLAN');h=supplyLotsView(s.supplyPlan);assert.match(h,/已开工 · 制作中/);
 s=act(s,'ADVANCE_SUPPLY_PLAN');h=supplyLotsView(s.supplyPlan);
 assert.equal((h.match(/已交付 · 待尾款/g)||[]).length,2);
 assert.ok(h.includes(money(p.deposit)+' / '+money(p.revenue)));
 s=act(s,'ADVANCE_SUPPLY_PLAN');h=supplyLotsView(s.supplyPlan);
 assert.equal((h.match(/已收齐/g)||[]).length,2);assert.ok(h.includes(money(p.revenue)+' / '+money(p.revenue)));
 assert.match(careerRecapView(s),/最近结清的两批供货 · Mira/);
});
test('pay-on-delivery records only signed receipts, while the team shortcut and manual schedule finish identically',()=>{
 const signed=act(ready(),'START_SUPPLY_PLAN',options('delivery')),p=signed.supplyPlan;
 assert.ok(supplyLotsView(p).includes('¥0 / '+money(p.revenue)));
 let step=act(signed,'ADVANCE_SUPPLY_PLAN');assert.match(supplyLotsView(step.supplyPlan),/已收齐/);
 assert.ok(supplyLotsView(step.supplyPlan).includes(money(p.events[0].income)+' / '+money(p.revenue)));
 while(step.phase==='planning-fulfillment')step=act(step,'ADVANCE_SUPPLY_PLAN');
 const automatic=act(signed,'FULFIL_SUPPLY_PLAN');assert.deepEqual(step.supplyPlan,automatic.supplyPlan);
 assert.equal(step.cash,automatic.cash);assert.deepEqual(careerRecapView(step),careerRecapView(automatic));
 assert.doesNotMatch(careerRecapView(ready()),/最近结清的两批供货/);
});

// Run the built inline script and its actual buttons. No browser, no display/layout claims.
test('offline program opens the completed supply and price receipts via the real recap button and returns to work',async()=>{
 const {buildDealHtml}=await import('../scripts/build-deal-standalone.mjs'),vm=await import('node:vm');
 const html=await buildDealHtml(),script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
 const s=act(act(ready(),'START_SUPPLY_PLAN',options('deposit')),'FULFIL_SUPPLY_PLAN');
 const buttons=new Map(),key='trade-tycoon:deal-room-offline:v1';
 const root={innerHTML:'',querySelector(sel){
   if(sel==='#motion')return {};
   if(!['#finish-session','#resume-work'].includes(sel)||!root.innerHTML.includes('id="'+sel.slice(1)+'"'))return null;
   return {addEventListener(event,fn){if(event==='click')buttons.set(sel,fn);},focus(){}};
  },querySelectorAll(){return [];}};
 const doc={querySelector:()=>root,documentElement:{classList:{contains:()=>false,add(){}}}};
 const ctx=vm.createContext({document:doc,localStorage:{getItem:k=>k===key?JSON.stringify(s):null,setItem(){}},TextEncoder,structuredClone,console});
 new vm.Script(script).runInContext(ctx,{timeout:3000});
 assert.ok(buttons.has('#finish-session'));buttons.get('#finish-session')();
 assert.match(root.innerHTML,/自己的成交单价/);assert.match(root.innerHTML,/最近结清的两批供货 · Mira/);
 assert.match(root.innerHTML,/货款已到账/);assert.ok(buttons.has('#resume-work'));buttons.get('#resume-work')();
 assert.doesNotMatch(root.innerHTML,/最近结清的两批供货/);
});
