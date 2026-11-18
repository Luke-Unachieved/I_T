import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {buildDealHtml} from '../scripts/build-deal-standalone.mjs';
import {createDealRoom,reduceDealRoom,previewOffer,businessOpportunities,quoteOptions,normalizeDealRoom} from '../src/deal-room-engine.js';
import {retailDemand,retailWait} from '../src/deal-room-demand.js';
import {projectDeskPreview} from '../src/deal-room-home.js';
function a(s,type,x={}){const n=reduceDealRoom(s,{type,...x});if(n===s)throw Error(type+' at '+s.day);return n}const f=(s,id)=>a(a(a(s,'PROPOSE',{optionId:id}),'ADVANCE'),'NEXT_CLIENT');
function start(plan=true){let s=createDealRoom();for(const id of ['trial','ready','season'])s=f(s,id);s=a(s,'CONTINUE_BUSINESS');for(let i=0;i<2;i++)s=f(a(s,'SELECT_CLIENT',{clientId:'mira'}),'repeat-small');
s=a(a(s,'START_SUPPLY_PLAN',{clientId:'mira',firstBatch:'small',payment:'delivery'}),'FULFIL_SUPPLY_PLAN');if(plan)s=a(s,'START_RETAIL_PLANNING');return a(s,'START_CLIENT_PROJECTS');}
function late(plan=true){return a(f(a(start(plan),'SELECT_CLIENT',{clientId:'mira'}),'project-series'),'SELECT_CLIENT',{clientId:'samir'});}

test('a late event restock reaches its retail shelves and blocks an immediate duplicate; a real wait reopens the ordinary buyer',()=>{
 let s=late();const id='project-series-retail',q=previewOffer(s,id);assert.equal(q.valid,true);assert.equal(q.projectOnTime,false);assert.equal(q.accepted,true);
 assert.deepEqual([q.quantity,q.revenue,q.deliveryDay,q.paymentDay],[120,4600,40,43]);assert.match(q.opportunityNote,/计入门店余货/);
 const signed=a(s,'PROPOSE',{optionId:id});assert.equal(retailDemand(signed,'samir').remaining,0);assert.equal(signed.contracts.at(-1).retailPlanning,true);
 s=a(a(signed,'ADVANCE'),'NEXT_CLIENT');const completed=s.contracts.at(-1);assert.equal(completed.projectOnTime,false);assert.equal(completed.specification,'branded');
 s=a(a(s,'PAUSE_CLIENT_PROJECTS'),'CONTINUE_RETAIL_BUSINESS');const d=retailDemand(s,'samir');
 assert.deepEqual([d.remaining,d.readyDay,s.day],[72,48,43]);assert.equal(businessOpportunities(s).find(o=>o.id==='samir').available,false);assert.equal(reduceDealRoom(s,{type:'SELECT_CLIENT',clientId:'samir'}),s);
 assert.equal(businessOpportunities(s).find(o=>o.id==='mira').available,true);const w=retailWait(s,'samir');assert.deepEqual([w.days,w.cost],[5,150]);
 const ready=a(s,'WAIT_FOR_BUYER',{clientId:'samir'});assert.equal(ready.cash,s.cash-150);assert.deepEqual(ready.contracts,s.contracts);assert.equal(businessOpportunities(ready).find(o=>o.id==='samir').available,true);assert.deepEqual(normalizeDealRoom(ready),ready);
});
test('new sale opt-in leaves on-time event goods, original saved quotes and planning-off projects unchanged',()=>{
 for(const plan of [true,false]){
  const early=a(start(plan),'SELECT_CLIENT',{clientId:'samir'});assert.ok(quoteOptions(early).every(o=>o.projectOnTime&&!o.id.endsWith('-retail')));
  assert.equal(previewOffer(early,'project-series-retail').valid,false);const timely=f(early,'project-series');assert.equal(timely.contracts.at(-1).retailPlanning,undefined);
  if(plan)assert.equal(retailDemand(timely,'samir').remaining,0);
  const s=late(plan);assert.deepEqual(quoteOptions(s).map(o=>o.id),plan?['project-focus-retail','project-series-retail']:['project-focus','project-series']);
  // Distinct old orders are not retrospectively turned into shelf stock or repriced.
  const old=f(s,'project-series');assert.equal(createHash('sha256').update(JSON.stringify(old)).digest('hex'),plan?'4d97ab3981108f545dad9ac5e1b8844153f662dcf5cae8b44ef3568cde02d208':'7d77f744db54ecde922785faa2f15b4b6038ab22ef490cdb87687c3c2b0529ac');assert.deepEqual(normalizeDealRoom(old),old);
 }
});
test('the finite prior client plan adds to actual unsold ordinary stock; no stock is erased or sold twice',()=>{
 let s=f(a(start(),'SELECT_CLIENT',{clientId:'mira'}),'project-series');
 s=a(a(s,'PAUSE_CLIENT_PROJECTS'),'CONTINUE_RETAIL_BUSINESS');s=f(a(s,'SELECT_CLIENT',{clientId:'ines'}),'repeat-scale');
 s=a(a(s,'BACK_FROM_CLIENTS'),'RESUME_CLIENT_PROJECTS');const id='project-series-retail';
 assert.equal(projectDeskPreview(s,'ines',id).quote.id,id);s=a(s,'SELECT_CLIENT',{clientId:'ines'});
 const q=previewOffer(s,id),before=retailDemand(s,'ines'),atDelivery=Math.max(0,before.remaining-(q.deliveryDay-s.day)*before.rate);assert.ok(atDelivery>0);
 const line=f(s,id),d=retailDemand(line,'ines');assert.equal(d.remaining,atDelivery+q.quantity-(q.paymentDay-q.deliveryDay)*before.rate);assert.deepEqual(normalizeDealRoom(line),line);
});
test('shipped late quote uses the tracked option when signed and reloads with the same contractual price',async()=>{
 const fixture=late(),script=(await buildDealHtml()).match(/<script>([\s\S]*?)<\/script>/)[1],key='trade-tycoon:deal-room-offline:v1';let packed=JSON.stringify(fixture),html='',nodes=new Map();
 const root={get innerHTML(){return html},set innerHTML(v){html=v.replace(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/g,'image');nodes=new Map();},querySelector:k=>k==='#motion'?{}:null,querySelectorAll:k=>{
  const m=k.match(/^\[(data-(select|action))\]$/);if(!m)return [];if(!nodes.has(k))nodes.set(k,[...html.matchAll(new RegExp(m[1]+'="([^"]+)"','g'))].map(x=>({dataset:{[m[2]]:x[1]},getAttribute:()=>x[1],focus(){}})));return nodes.get(k);
 }};
 const load=()=>new vm.Script(script).runInNewContext({structuredClone,TextEncoder,document:{querySelector:()=>root,documentElement:{classList:{contains:()=>false,add(){}}}},localStorage:{getItem:k=>k===key?packed:null,setItem:(k,v)=>{if(k===key)packed=v;}}},{timeout:3000});
 const press=(attr,id)=>{const el=root.querySelectorAll('[data-'+attr+']').find(n=>n.dataset[attr]===id);assert.ok(el,id);el.onclick();};
 load();press('select','project-series-retail');assert.match(html,/计入门店余货/);press('action','PROPOSE');
 const signed=JSON.parse(packed);assert.equal(signed.contracts.at(-1).optionId,'project-series-retail');assert.equal(signed.contracts.at(-1).retailPlanning,true);load();press('action','ADVANCE');
 const paid=JSON.parse(packed);assert.equal(paid.contracts.at(-1).revenue,4600);assert.equal(retailDemand(paid,'samir').remaining,72);
});
