import test from 'node:test';import assert from 'node:assert/strict';
import {createDealRoom,reduceDealRoom,normalizeDealRoom,curationOffers,previewCuration} from '../src/deal-room-engine.js';
const a=(s,type,more={})=>reduceDealRoom(s,{type,...more});
const finish=(s,id)=>a(a(a(s,'PROPOSE',{optionId:id}),'ADVANCE'),'NEXT_CLIENT');
const base=()=>{let s=createDealRoom();for(const id of ['trial','ready','season'])s=finish(s,id);s=a(s,'CONTINUE_BUSINESS');for(let i=0;i<2;i++)s=finish(a(s,'SELECT_CLIENT',{clientId:'mira'}),'repeat-small');s=a(s,'START_SUPPLY_PLAN',{clientId:'mira',firstBatch:'small',payment:'delivery'});s=a(a(s,'FULFIL_SUPPLY_PLAN'),'START_CLIENT_PROJECTS');for(const id of ['mira','samir','ines'])s=finish(a(s,'SELECT_CLIENT',{clientId:id}),'project-series');return s;};
const draft={products:['mira','samir'],quantity:60,packaging:'gift'};
test('真实案例产生不同用途的引荐；未完成阶段不提前解锁',()=>{
 assert.deepEqual(curationOffers(createDealRoom()),[]);const s=base(),offers=curationOffers(s);assert.equal(offers.length,3);assert.equal(offers.find(p=>p.id==='mira').giftAllowed,true);assert.equal(offers.find(p=>p.id==='samir').giftAllowed,false);assert.deepEqual(normalizeDealRoom(s),s);
});
test('选品预算可就地修复，不消耗钱或抹掉样品；常规买手不收礼盒',()=>{
 const s=a(base(),'START_CURATION',{clientId:'mira'}),before=structuredClone(s),over={...draft,products:['mira','samir','ines']};assert.equal(previewCuration(s,over).revenue,9420);assert.equal(previewCuration(s,over).valid,false);assert.equal(a(s,'SIGN_CURATION',over),s);
 const fixed={...over,quantity:40},q=previewCuration(s,fixed);assert.equal(q.valid,true);assert.equal(q.revenue,6280);assert.equal(q.netProfit,2490);assert.deepEqual(s,before);assert.equal(previewCuration(s,{...draft,products:['samir','ines']}).valid,false);
 const other=a(base(),'START_CURATION',{clientId:'samir'});assert.match(previewCuration(other,draft).reason,/不需要礼盒/);
});
test('引荐可返回，已签后锁定，交付仅收一次，案例来源不重复刷',()=>{
 const old=base(),s=a(old,'START_CURATION',{clientId:'mira'}),back=a(s,'BACK_FROM_CURATION');assert.equal(back.cash,old.cash);assert.equal(back.day,old.day);assert.deepEqual(normalizeDealRoom(back),back);
 const signed=a(s,'SIGN_CURATION',draft);assert.equal(signed.phase,'curation-fulfillment');assert.equal(a(signed,'BACK_FROM_CURATION'),signed);assert.equal(a(signed,'SIGN_CURATION',draft),signed);
 const paid=a(signed,'FULFIL_CURATION');assert.equal(paid.cash,old.cash+2790);assert.equal(paid.curationHistory.length,1);assert.equal(a(paid,'FULFIL_CURATION'),paid);assert.equal(curationOffers(paid).some(p=>p.id==='mira'),false);assert.deepEqual(normalizeDealRoom(paid),paid);
 const corrupt=structuredClone(paid);corrupt.curation.products=['ines'];assert.throws(()=>normalizeDealRoom(corrupt));
});
test('产品数组复制并验证，外部引用不能改写签约历史',()=>{
 const s=a(base(),'START_CURATION',{clientId:'mira'}),products=['samir','mira'];const signed=a(s,'SIGN_CURATION',{...draft,products});products.push('ines');assert.deepEqual(signed.history.at(-1).products,['mira','samir']);assert.deepEqual(normalizeDealRoom(signed),signed);assert.equal(a(s,'SIGN_CURATION',{...draft,products:['mira','mira']}),s);
});
import {businessFeedback} from '../src/deal-room-curation-view.js';
test('查看历史案例与当前草案各显示自身状态，不串上一笔回谈',()=>{const state={feedback:{kind:'referrals',message:'还没有签约，可以换一位客户的引荐。'}};assert.match(businessFeedback(state,{viewingCase:{buyer:'Atelier',deliveryDay:93}}),/第 93 天已交付/);assert.doesNotMatch(businessFeedback(state,{viewingCase:{buyer:'Atelier',deliveryDay:93}}),/没有签约/);assert.match(businessFeedback(state,{supplyDraft:{clientId:'mira'}}),/两次收货/);assert.equal(businessFeedback(state),state.feedback.message);});
function withSample(factory='studio'){let s=base();s=a(s,'START_DEVELOPMENT');s=a(s,'COMMISSION_SAMPLE',{factory});s=a(s,'RECEIVE_SAMPLE');return a(s,'ACCEPT_SAMPLE');}
test('theme buyer can use developed lamp but its real higher cost and same budget change feasible assortment',()=>{const s=a(withSample(),'START_CURATION',{clientId:'mira'});const over={...draft,lampVersion:'developed'};assert.match(previewCuration(s,over).reason,/超过预算/);assert.doesNotMatch(previewCuration(s,over).reason,/少选一件/);const fixed={...over,quantity:40,products:['mira','samir','ines']};const q=previewCuration(s,fixed);assert.equal(q.valid,true);assert.equal(q.revenue,7080);assert.equal(q.cost,4120);assert.equal(q.netProfit,2690);const paid=a(a(s,'SIGN_CURATION_SAMPLE',fixed),'FULFIL_CURATION');assert.equal(paid.curationHistory[0].lampVersion,'developed');assert.ok(paid.curationHistory[0].productNames.includes('三档调光台灯'));assert.deepEqual(normalizeDealRoom(paid),paid);const account=a(paid,'START_ACCOUNT',{referrerId:'mira'});assert.equal(account.account.unitCost,95);const collection=a(paid,'START_COLLECTION');assert.equal(collection.collection.cost,95);assert.equal(collection.collection.lampVersion,'developed');assert.deepEqual(normalizeDealRoom(collection),collection);});
test('standard buyer does not buy an unnecessary upgrade and batch MOQ cannot be laundered through a small gift order',()=>{const wholesale=a(withSample(),'START_CURATION',{clientId:'samir'});assert.match(previewCuration(wholesale,{...draft,quantity:40,packaging:'plain',lampVersion:'developed'}).reason,/只采购原来的标准款/);const batch=a(withSample('line'),'START_CURATION',{clientId:'mira'});assert.match(previewCuration(batch,{...draft,quantity:40,lampVersion:'developed'}).reason,/180盏/);assert.equal(a(batch,'SIGN_CURATION_SAMPLE',{...draft,quantity:40,lampVersion:'developed'}),batch);});

import {curationDemoModel,curationDemoView} from '../src/deal-room-curation-view.js';
test('buyer sample demo reflects real selected model, never mutates draft or approval',()=>{
 const draft={products:['mira','samir'],quantity:40,packaging:'plain',lampVersion:'developed'},before=structuredClone(draft),brief={giftAllowed:true};
 const soft=curationDemoModel(brief,draft,{open:true,room:'night',brightness:0});
 assert.match(soft.message,/睡前/);assert.equal(soft.level,0);
 assert.match(curationDemoModel(brief,draft,{room:'day',brightness:0}).message,/有点暗/);
 assert.match(curationDemoModel(brief,draft,{room:'night',brightness:2}).message,/太亮/);
 const old=curationDemoModel(brief,{...draft,lampVersion:'standard'},{room:'night',brightness:0});assert.equal(old.level,1);assert.match(old.message,/不能把调光当卖点/);assert.doesNotMatch(curationDemoView({...old,open:true}),/data-demo-light/);
 assert.match(curationDemoModel({giftAllowed:false},draft).message,/原规格/);
 assert.equal(curationDemoModel(brief,{products:['samir','ines']}),null);assert.deepEqual(draft,before);
 assert.match(curationDemoView(soft),/不签单、不收费/);
});

import {toggleCurationProduct} from '../src/deal-room-curation-view.js';
test('removing developed lamp clears its specification, leaving unrelated cup and linen quote usable',()=>{
 const draft={products:['samir','mira','ines'],quantity:40,packaging:'plain',lampVersion:'developed'};
 const next=toggleCurationProduct(draft,'mira','samir');assert.deepEqual(next.products,['samir','ines']);assert.equal(next.lampVersion,undefined);assert.equal(draft.lampVersion,'developed');
 assert.equal(toggleCurationProduct(draft,'samir','samir'),draft);
 const s=a(withSample(),'START_CURATION',{clientId:'samir'});assert.equal(previewCuration(s,next).valid,true);
});

test('paid case close does not claim the order was unsigned',()=>{assert.match(businessFeedback({history:[{type:'CLOSE_CASE_GROWTH'}],caseGrowth:{status:'paid'},feedback:{message:'未签方案没有改变任何案例权限'}}),/已结清/);});

test('budget counteroffers keep the anchor and let the buyer trade breadth for quantity at actual contract prices',async()=>{
 const {curationView,toggleCurationProduct}=await import('../src/deal-room-curation-view.js');
 const s=a(base(),'START_CURATION',{clientId:'mira'}),d={products:['mira','samir','ines'],quantity:60,packaging:'gift'},initial=structuredClone(s),original=structuredClone(d);
 const preview=x=>previewCuration(s,x),panel=x=>curationView(s.curation,x,preview(x),null,null,s.cash).match(/<section class="curation-counteroffer"[\s\S]*?<\/section>/)?.[0]||'';
 assert.equal(preview(d).revenue,9420);const html=panel(d);assert.match(html,/¥7,200/);assert.doesNotMatch(html,/data-action=|data-curation-product="mira"/);
 const buttons=[...html.matchAll(/<button class="quote" data-curation-(quantity|product)="([^"]+)">([\s\S]*?)<\/button>/g)];assert.equal(buttons.length,3);
 const expected=[6280,6540,6900];for(const [,field,value,written] of buttons){
  const amended=field==='quantity'?{...d,quantity:Number(value)}:toggleCurationProduct(d,value,s.curation.anchor);
  const q=preview(amended);assert.ok(q.valid);assert.ok(amended.products.includes('mira'));assert.equal(amended.packaging,'gift');assert.ok(expected.includes(q.revenue));
  assert.ok(written.includes('¥'+q.revenue.toLocaleString('zh-CN')));assert.ok(written.includes('预计净赚 ¥'+q.netProfit.toLocaleString('zh-CN')));assert.equal(panel(amended),'');
  const signed=a(s,'SIGN_CURATION',amended);assert.equal(signed.cash,q.cashAfterSigning);const paid=a(signed,'FULFIL_CURATION');assert.equal(paid.cash,s.cash+q.netProfit);assert.equal(paid.curation.quantity,amended.quantity);
 }assert.deepEqual(s,initial);assert.deepEqual(d,original);
});
test('a commissioned dimmer gift keeps its sample: still-over-budget deletions are not presented as counteroffers',async()=>{
 const {curationView}=await import('../src/deal-room-curation-view.js');
 const s=a(withSample(),'START_CURATION',{clientId:'mira'}),d={products:['mira','samir','ines'],quantity:60,packaging:'gift',lampVersion:'developed'},q=previewCuration(s,d);assert.equal(q.revenue,10620);
 const h=curationView(s.curation,d,q,s.productDevelopment,null,s.cash).match(/<section class="curation-counteroffer"[\s\S]*?<\/section>/)[0];
 assert.equal((h.match(/<button/g)||[]).length,1);assert.match(h,/data-curation-quantity="40"/);assert.doesNotMatch(h,/data-curation-product=/);assert.match(h,/¥7,080/);
 for(const id of ['ines','samir'])assert.ok(previewCuration(s,{...d,products:d.products.filter(p=>p!==id)}).revenue>s.curation.budget);
 const chosen={...d,quantity:40},quote=previewCuration(s,chosen);assert.ok(quote.valid);const paid=a(a(s,'SIGN_CURATION_SAMPLE',chosen),'FULFIL_CURATION');assert.equal(paid.cash,s.cash+quote.netProfit);assert.equal(paid.curation.lampVersion,'developed');
});
