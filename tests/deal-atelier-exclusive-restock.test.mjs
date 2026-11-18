import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';
import {createDealRoom,reduceDealRoom as step,normalizeDealRoom,currentClient} from '../src/deal-room-engine.js';
import {atelierRestockBasis,previewAtelierRestock,atelierRestockProfit,atelierRestockInvite,atelierRestockView} from '../src/deal-room-atelier-restock.js';
import {collectionView} from '../src/deal-room-collection.js';import {cooperationChapter} from '../src/deal-room-cooperation.js';import {launchBasis} from '../src/deal-room-launch.js';import {accountCollectionBasis} from '../src/deal-room-account.js';import {careerRecapView} from '../src/deal-room-home.js';
import {buildDealHtml} from '../scripts/build-deal-standalone.mjs';
const act=(s,type,fields={})=>{const n=step(s,{type,...fields});assert.notEqual(n,s,type+' from '+s.phase);return n;};
const nop=(s,type,fields={})=>assert.equal(step(s,{type,...fields}),s,type);
function original(buyerId='atelier',optionId='exclusive',model='own',style='botanical'){
 let s=createDealRoom();for(const id of ['trial','ready','season']){s=act(s,'PROPOSE',{optionId:id});s=act(s,'ADVANCE');s=act(s,'NEXT_CLIENT');}
 s=act(s,'START_OPENING_CURATION',{clientId:'mira'});s=act(s,'SIGN_CURATION',{products:['mira','samir'],quantity:40,packaging:'plain'});s=act(s,'FULFIL_CURATION');
 s=act(act(s,'START_COLLECTION'),'SIGN_COLLECTION',{model,style});if(model==='own'){s=act(act(s,'OPEN_COLLECTION_PITCH',{buyerId}),'SIGN_COLLECTION_PITCH',{optionId});}return act(act(s,'FULFIL_COLLECTION'),'CLOSE_COLLECTION');
}
const hand=s=>act(act(act(act(s,'OPEN_LAUNCH_PROJECT'),'REVIEW_LAUNCH'),'HAND_OVER_LAUNCH'),'CLOSE_LAUNCH_PROJECT');
function time(s){s=act(act(s,'CONTINUE_BUSINESS'),'SELECT_CLIENT',{clientId:'ines'});s=act(act(act(s,'PROPOSE',{optionId:'repeat-scale'}),'ADVANCE'),'NEXT_CLIENT');return act(s,'BACK_FROM_CLIENTS');}
const ready=()=>time(hand(original()));
test('a real paid Atelier whole-exclusive original and display review date, not similarly named sleeves or a generic shop, opens once',()=>{
 const s=original(),h=hand(s),r=time(h),b=atelierRestockBasis(r);assert.equal(s.day,35);assert.equal(h.day,35);assert.equal(h.cash,15160);assert.ok(cooperationChapter(h).closed);assert.equal(b.reviewDay,45);assert.equal(r.day,48);assert.equal(r.cash,16870);
 for(const bad of [s,hand(original('northline')),hand(original('northline','exclusive','private','cream')),original('atelier','retain'),original('atelier','sleeve'),{...r,launchProject:{...r.launchProject,status:'review'}},{...r,launchProject:{...r.launchProject,lead:'ines'}}]){assert.equal(atelierRestockBasis(bad),null);nop(bad,'OPEN_ATELIER_RESTOCK');}
 nop(h,'OPEN_ATELIER_RESTOCK');assert.match(atelierRestockInvite(h),/第 45 天/);assert.doesNotMatch(atelierRestockInvite(h),/data-action="OPEN_ATELIER_RESTOCK"/);assert.match(atelierRestockInvite(r),/上次那套/);assert.deepEqual(r.collection,h.collection);
 const q=act(r,'OPEN_ATELIER_RESTOCK');assert.equal(currentClient(q),null);nop(q,'SIGN_ATELIER_RESTOCK_SMALL',{price:0});assert.deepEqual(normalizeDealRoom(h),h);
});
test('ignoring, postponing and rejecting the one request never charge, consume time, cancel rights or force a new licence',()=>{
 let s=ready();const before=structuredClone(s),other=act(s,'CONTINUE_BUSINESS');assert.equal(other.day,s.day);assert.equal(other.cash,s.cash);
 const later=act(act(s,'OPEN_ATELIER_RESTOCK'),'CLOSE_ATELIER_RESTOCK');assert.equal(later.atelierRestock,undefined);assert.equal(later.cash,s.cash);
 s=act(act(later,'OPEN_ATELIER_RESTOCK'),'DECLINE_ATELIER_RESTOCK');assert.equal(s.atelierRestock.status,'declined');assert.equal(s.cash,before.cash);assert.equal(s.day,before.day);assert.deepEqual(s.collection,before.collection);assert.deepEqual(launchBasis(s),launchBasis(before));assert.equal(atelierRestockProfit(s),0);assert.ok(cooperationChapter(s).closed);assert.doesNotMatch(atelierRestockInvite(s),/data-action=/);
 const peek=act(s,'OPEN_ATELIER_RESTOCK');nop(peek,'SIGN_ATELIER_RESTOCK_SMALL');nop(peek,'DECLINE_ATELIER_RESTOCK');assert.match(atelierRestockView(peek),/回工作室/);assert.deepEqual(normalizeDealRoom(s),s);
});
for(const term of ['small','season'])test(term+' original per-set sale and cost, true outstanding balance, cost of days and paid-only accounting',()=>{
 const s=ready(),doc=s.collection.orders[0],d=act(s,'OPEN_ATELIER_RESTOCK'),q=previewAtelierRestock(d,term),sign=term==='small'?'SIGN_ATELIER_RESTOCK_SMALL':'SIGN_ATELIER_RESTOCK_SEASON';
 assert.equal(doc.revenue,13900);assert.equal(doc.licenceFee,2400);assert.equal(q.unitPrice,115);assert.equal(q.unitCost,62);assert.equal(q.licenceFee,0);assert.equal(q.sampleCost,0);assert.equal(q.revenue,q.sets*(doc.revenue-doc.licenceFee)/doc.sets);assert.equal(q.cost,q.sets*doc.cost/doc.sets);assert.match(atelierRestockView(d),/这批不重收授权费/);
 const poor={...d,cash:q.requiredCash-1};assert.equal(previewAtelierRestock(poor,term).valid,false);nop(poor,sign);assert.equal(previewAtelierRestock({...d,cash:q.requiredCash},term).valid,true);
 let n=act(d,sign);assert.equal(n.cash,s.cash+q.deposit-q.cost);assert.equal(n.day,48);assert.equal(atelierRestockProfit(n),0);nop(n,sign);nop(n,'CLOSE_ATELIER_RESTOCK');nop(n,'DECLINE_ATELIER_RESTOCK');nop(n,'COLLECT_ATELIER_RESTOCK');assert.deepEqual(normalizeDealRoom(n),n);
 n=act(n,'DELIVER_ATELIER_RESTOCK');assert.equal(n.day,q.deliveryDay);nop(n,'DELIVER_ATELIER_RESTOCK');
 if(term==='season'){assert.equal(n.atelierRestock.status,'receivable');assert.equal(n.cash,15010);assert.equal(atelierRestockProfit(n),0);assert.match(atelierRestockView(n),/已收货，尾款未到/);assert.deepEqual(normalizeDealRoom(n),n);n=act(n,'COLLECT_ATELIER_RESTOCK');}
 assert.equal(n.atelierRestock.status,'paid');assert.equal(n.cash,q.cashAfterPayment);assert.equal(n.cash-s.cash,q.netProfit);assert.equal(n.day,term==='small'?53:59);assert.equal(q.netProfit,term==='small'?1970:2850);assert.equal(atelierRestockProfit(n),q.netProfit);nop(n,'COLLECT_ATELIER_RESTOCK');
 n=act(n,'CLOSE_ATELIER_RESTOCK');assert.deepEqual(n.collection,s.collection);assert.equal(n.collection.orders.length,1);assert.deepEqual(n.launchProject,s.launchProject);assert.deepEqual(launchBasis(n),launchBasis(s));assert.equal(accountCollectionBasis(n),null);assert.ok(cooperationChapter(n).closed);assert.match(careerRecapView(n),new RegExp('后来又买了 '+q.sets+' 套'));assert.deepEqual(normalizeDealRoom(n),n);
 const revisit=act(n,'OPEN_ATELIER_RESTOCK');nop(revisit,sign);const series=act(n,'OPEN_COLLECTION');assert.match(collectionView(series),new RegExp('Atelier 原版补货净赚 ¥'+q.netProfit.toLocaleString('zh-CN')));assert.match(collectionView(series),new RegExp('扣除出样后，已赚到 ¥'+(doc.netProfit-2490+q.netProfit).toLocaleString('zh-CN')));
 for(const change of [p=>p.sourceOrderIndex++,p=>p.unitPrice++,p=>p.style='cream',p=>p.products=['mira'],p=>p.paymentDay++,p=>p.scope='whole-exclusive',p=>p.netProfit+=2400]){const bad=structuredClone(n);change(bad.atelierRestock);assert.equal(atelierRestockProfit(bad),0);}
});
test('offline artifact wires places, exact model and separate delivery/collection actions; no always-on inquiry at D35',async()=>{
 const code=(await buildDealHtml()).match(/<script>([\s\S]*?)<\/script>/)[1];
 function view(s){const root={innerHTML:'',querySelector(sel){return sel==='#motion'?{}:null;},querySelectorAll(){return [];}};new vm.Script(code).runInNewContext({document:{querySelector:()=>root,documentElement:{classList:{contains:()=>false,add(){}}}},localStorage:{getItem:k=>k==='trade-tycoon:deal-room-offline:v1'?JSON.stringify(s):null,setItem(){}},structuredClone,TextEncoder,console},{timeout:3000});return root.innerHTML;}
 const r=ready(),draft=act(r,'OPEN_ATELIER_RESTOCK'),signed=act(draft,'SIGN_ATELIER_RESTOCK_SEASON'),delivered=act(signed,'DELIVER_ATELIER_RESTOCK'),paid=act(delivered,'COLLECT_ATELIER_RESTOCK');
 assert.doesNotMatch(view(hand(original())),/data-action="OPEN_ATELIER_RESTOCK"/);assert.match(view(r),/data-action="OPEN_ATELIER_RESTOCK"/);const html=view(draft);assert.match(html,/Élise · Atelier/);assert.match(html,/Atelier 原版 · 枝叶纹样/);assert.match(html,/便携台灯、保温杯/);assert.match(html,/SIGN_ATELIER_RESTOCK_SMALL/);assert.match(html,/DECLINE_ATELIER_RESTOCK/);assert.match(view(signed),/DELIVER_ATELIER_RESTOCK/);assert.match(view(delivered),/COLLECT_ATELIER_RESTOCK/);assert.match(view(paid),/尾款已收齐/);const net=x=>Number(view(x).match(/经营累计赚到 <strong>¥([\d,]+)<\/strong>/)[1].replaceAll(',',''));assert.equal(net(act(paid,'CLOSE_ATELIER_RESTOCK'))-net(r),2850);
});
