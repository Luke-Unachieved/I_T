import test from 'node:test';
import assert from 'node:assert/strict';
import {careerOpportunity,previewSupplyPlan,businessOpportunities,MAX_DEAL_ACTIONS,createDealRoom,currentClient,quoteOptions,previewOffer,reduceDealRoom,normalizeDealRoom} from '../src/deal-room-engine.js';
const act=(s,type,optionId)=>reduceDealRoom(s,optionId?{type,optionId}:{type});
const finish=(s,id)=>act(act(s,'PROPOSE',id),'ADVANCE');
const next=(s)=>act(s,'NEXT_CLIENT');
test('isolated deterministic quote with transparent cost and next-client window',()=>{
 const s=createDealRoom(),a=previewOffer(s,'trial'),b=previewOffer(s,'rollout');
 assert.equal(a.netProfit,510);assert.equal(b.netProfit,1030);
 assert.equal(a.paymentDay,4);assert.equal(b.paymentDay,10);
 assert.match(a.opportunityNote,/来得及/);assert.match(b.opportunityNote,/错过/);
 assert.equal(currentClient(s).country,'荷兰');assert.equal(quoteOptions(s).length,2);
 assert.deepEqual(s,createDealRoom());
});
test('quick first deal preserves premium request; larger first deal loses it but has fallback',()=>{
 const quick=next(finish(createDealRoom(),'trial')),slow=next(finish(createDealRoom(),'rollout'));
 assert.equal(previewOffer(quick,'ready').revenue,4100);
 assert.equal(previewOffer(slow,'ready').revenue,2800);
 assert.equal(previewOffer(quick,'ready').netProfit,1440);
 assert.equal(previewOffer(slow,'ready').netProfit,650);
 assert.equal(finish(quick,'ready').cash,6950);
 assert.equal(finish(slow,'ready').cash,6680);
 assert.equal(previewOffer(quick,'branded').netProfit,1560);
 assert.equal(previewOffer(quick,'branded').paymentDay,12);
});
test('unacceptable promise gives repairable counteroffer without money or time loss',()=>{
 const s=next(finish(createDealRoom(),'trial')),counter=act(s,'PROPOSE','promise');
 assert.equal(counter.phase,'negotiating');assert.equal(counter.cash,s.cash);assert.equal(counter.day,s.day);
 assert.equal(counter.feedback.kind,'counter');assert.match(counter.feedback.message,/改现货/);
 assert.equal(act(counter,'PROPOSE','promise'),counter);
 assert.equal(act(counter,'PROPOSE','ready').phase,'fulfilling');
 assert.deepEqual(normalizeDealRoom(counter),counter);
});
test('automatic routine fulfillment charges real cost once and never double collects',()=>{
 const initial=createDealRoom(),signed=act(initial,'PROPOSE','trial');
 assert.equal(initial.cash,5000);assert.equal(signed.cash,3200);
 assert.equal(act(signed,'PROPOSE','rollout'),signed);
 assert.equal(act(signed,'NEXT_CLIENT'),signed);
 const paid=act(signed,'ADVANCE');assert.equal(paid.cash,5510);assert.equal(paid.day,4);
 assert.equal(act(paid,'ADVANCE'),paid);assert.equal(paid.contracts[0].status,'paid');
});
test('third client exchanges a true deposit for delayed tail, with no duplicate income',()=>{
 const s=next(finish(next(finish(createDealRoom(),'trial')),'ready'));
 const counter=act(s,'PROPOSE','all-now');assert.equal(counter.phase,'negotiating');
 const q=previewOffer(counter,'season');assert.equal(q.deposit,1860);assert.equal(q.balanceDue,4340);
 const signed=act(counter,'PROPOSE','season');assert.equal(signed.cash,s.cash+1860-4300);
 const paid=act(signed,'ADVANCE');assert.equal(paid.cash,s.cash+1570);
 assert.equal(next(paid).phase,'complete');assert.equal(currentClient(next(paid)),null);
 assert.deepEqual(quoteOptions(next(paid)),[]);
});
test('all eight legal combinations roundtrip each action with reliable integer accounting',()=>{
 for(const first of ['trial','rollout'])for(const second of ['ready','branded'])for(const third of ['small','season']){
  let s=createDealRoom();
  for(const option of [first,second,third]){
   for(const action of [{type:'PROPOSE',optionId:option},{type:'ADVANCE'},{type:'NEXT_CLIENT'}]){
    s=reduceDealRoom(s,action);assert.deepEqual(normalizeDealRoom(JSON.parse(JSON.stringify(s))),s);
    assert.ok(Number.isSafeInteger(s.cash)&&s.cash>=0);assert.ok(Number.isSafeInteger(s.day));
   }
  }
  assert.equal(s.phase,'complete');assert.equal(s.cash,5000+s.contracts.reduce((n,c)=>n+c.netProfit,0));
 }
});
test('strict save replay rejects edited amounts, dates, unknown fields and unrelated saves',()=>{
 const s=finish(createDealRoom(),'trial');
 for(const mutate of [x=>x.cash++,x=>x.day++,x=>x.contracts[0].deposit++,x=>x.extra=true,x=>x.history[0].extra=true,x=>x.history.push({type:'ADVANCE'})]){
  const x=structuredClone(s);mutate(x);assert.throws(()=>normalizeDealRoom(x));
 }
 for(const x of [null,{},[],{version:1,cash:5000,history:[]},{stage:3,businessRound:1}])assert.throws(()=>normalizeDealRoom(x));
 assert.equal(reduceDealRoom(s,{type:'RESTART'}),s);
});

test('second client turnaround preserves a disclosed seasonal premium, with ordinary fallback',()=>{
 const s=next(finish(createDealRoom(),'trial'));
 assert.match(currentClient(s).windowNote,/400/);
 const early=next(finish(s,'ready')),late=next(finish(s,'branded'));
 assert.equal(previewOffer(early,'season').revenue,6200);
 assert.equal(previewOffer(late,'season').revenue,5800);
 assert.equal(previewOffer(late,'season').deposit,1740);
 assert.equal(previewOffer(late,'season').balanceDue,4060);
 assert.equal(finish(early,'season').cash,8520);
 assert.equal(finish(late,'season').cash,8240);
});

const initialComplete=(first='trial',second='ready',third='season')=>next(finish(next(finish(next(finish(createDealRoom(),first)),second)),third));
const select=(s,clientId)=>reduceDealRoom(s,{type:'SELECT_CLIENT',clientId});
test('自主经营自由选同客或换客，两单仅回顾且可继续；签后不可撤回',()=>{
 for(const ids of [['mira','mira'],['samir','ines']]){
  let s=act(initialComplete(),'CONTINUE_BUSINESS');
  assert.equal(s.phase,'portfolio');assert.equal(s.businessTarget,2);
  assert.equal(currentClient(s),null);assert.deepEqual(quoteOptions(s),[]);
  const listed=businessOpportunities(s);assert.equal(listed.length,3);assert.ok(listed.every(c=>c.available));
  for(const id of ids){
   s=select(s,id);const before=s;
   const back=act(s,'BACK_TO_CLIENTS');assert.equal(back.day,s.day);assert.equal(back.cash,s.cash);
   s=select(back,id);s=act(s,'PROPOSE','repeat-scale');assert.equal(act(s,'BACK_TO_CLIENTS'),s);
   assert.equal(act(s,'CONTINUE_BUSINESS'),s);s=next(act(s,'ADVANCE'));
   assert.ok(s.cash>before.cash);assert.deepEqual(normalizeDealRoom(s),s);
  }
  assert.equal(s.phase,'review');assert.equal(s.businessSigned,2);
  const continued=act(s,'CONTINUE_BUSINESS');assert.equal(continued.businessRound,2);
  assert.equal(continued.businessSigned,0);assert.equal(continued.cash,s.cash);assert.equal(continued.day,s.day);
 }
});
test('返单依据真实最近成交规模和包装，条件公开变化但锁定合同不变',()=>{
 let a=act(initialComplete(),'CONTINUE_BUSINESS'),b=act(initialComplete('rollout','branded'),'CONTINUE_BUSINESS');
 const qa=previewOffer(select(a,'mira'),'repeat-scale'),qb=previewOffer(select(b,'mira'),'repeat-scale');
 assert.equal(qa.quantity,150);assert.equal(qb.quantity,180);assert.equal(qa.payLag,4);assert.equal(qb.payLag,7);
 assert.equal(previewOffer(select(a,'samir'),'repeat-small').deliveryDays,2);
 assert.equal(previewOffer(select(b,'samir'),'repeat-small').deliveryDays,3);
 assert.match(businessOpportunities(b).find(c=>c.id==='samir').consequence,/版样/);
 a=next(finish(select(a,'mira'),'repeat-scale'));
 assert.equal(businessOpportunities(a).find(c=>c.id==='mira').basis.quantity,150);
 assert.equal(previewOffer(select(a,'mira'),'repeat-scale').quantity,180);
 assert.equal(a.contracts.at(-1).quantity,150);
 b=next(finish(select(b,'samir'),'repeat-small'));
 assert.equal(previewOffer(select(b,'samir'),'repeat-small').specification,'branded');
});
test('每位熟客的小批与规模均有实际周期/净赚差异，采购保留费用现金',()=>{
 const s=act(initialComplete(),'CONTINUE_BUSINESS');
 for(const opportunity of businessOpportunities(s)){
  const selected=select(s,opportunity.id),small=previewOffer(selected,'repeat-small'),large=previewOffer(selected,'repeat-scale');
  assert.ok(small.netProfit<large.netProfit);assert.ok(small.paymentDay<large.paymentDay);
  assert.ok(small.netProfit/(small.paymentDay-s.day)>large.netProfit/(large.paymentDay-s.day));
  const poor={...selected,cash:small.cashRequired-1};assert.equal(previewOffer(poor,'repeat-small').valid,false);
  assert.equal(act(poor,'PROPOSE','repeat-small'),poor);
  const exact={...selected,cash:small.cashRequired};const paid=finish(exact,'repeat-small');assert.ok(paid.cash>=0);
 }
 const poor={...s,cash:0};assert.ok(businessOpportunities(poor).every(c=>!c.available&&c.reason.includes('现金不足')));
 assert.equal(select(poor,'mira'),poor);assert.equal(select(s,'unknown'),s);
});
test('记录容量公开阻止新单但已签合同仍可结清，不静默卡住资金',()=>{
 let s=select(act(initialComplete(),'CONTINUE_BUSINESS'),'mira');
 const limited={...s,history:Array(MAX_DEAL_ACTIONS-4).fill({type:'BACK_TO_CLIENTS'})};
 assert.match(previewOffer(limited,'repeat-small').reason,/容量上限/);
 assert.equal(act(limited,'PROPOSE','repeat-small'),limited);
 s=act({...s,history:Array(MAX_DEAL_ACTIONS-5).fill({type:'BACK_TO_CLIENTS'})},'PROPOSE','repeat-small');
 assert.equal(s.phase,'fulfilling');s=next(act(s,'ADVANCE'));assert.equal(s.phase,'portfolio');
 assert.ok(businessOpportunities(s).every(c=>!c.available&&c.reason.includes('容量上限')));
});

const withRelations=(ids=['mira','mira'])=>{
 let s=act(initialComplete(),'CONTINUE_BUSINESS');for(const id of ids)s=next(finish(select(s,id),'repeat-small'));return s;
};
test('供货安排资格同客深耕或跨客合作任选，不要求两条全刷',()=>{
 assert.equal(careerOpportunity(initialComplete()).eligible,false);
 const deep=careerOpportunity(withRelations()),wide=careerOpportunity(withRelations(['mira','samir']));
 assert.deepEqual(deep.paths,{depth:true,network:false});assert.deepEqual(wide.paths,{depth:false,network:true});
 assert.equal(deep.eligible,true);assert.equal(wide.eligible,true);assert.equal(deep.clients.length,1);
 assert.ok(deep.clients[0].basis.quantity>0);
 const s=withRelations();assert.equal(previewSupplyPlan(s,{clientId:'ines',firstBatch:'small',payment:'delivery'}).valid,false);
 assert.equal(reduceDealRoom(initialComplete(),{type:'START_SUPPLY_PLAN',clientId:'mira',firstBatch:'small',payment:'delivery'}).phase,'complete');
});
test('两批数量/结算可独立谈，公开固定需求日期、现金底线与每批真实安排',()=>{
 const s=withRelations();
 for(const firstBatch of ['small','large'])for(const payment of ['delivery','deposit']){
  const draft={clientId:'mira',firstBatch,payment},q=previewSupplyPlan(s,draft);
  assert.equal(q.valid,true);assert.equal(q.lots.length,2);assert.equal(q.totalQuantity,180);
  assert.equal(q.lots.reduce((n,l)=>n+l.quantity,0),180);
  assert.equal(q.lots[1].deliveryDay,s.day+8);assert.ok(q.lots[0].deliveryDay<=q.terms.firstDeadline);
  assert.equal(q.deposit,payment==='deposit'?2250:0);
  assert.equal(q.revenue,payment==='delivery'?7200:7500);
  assert.equal(q.totalOperatingCost,payment==='delivery'?240:360);
  assert.equal(q.netProfit,q.revenue-q.cost-q.totalOperatingCost);
  const poor={...s,cash:q.cashRequired-1};assert.equal(previewSupplyPlan(poor,draft).valid,false);
  assert.equal(reduceDealRoom(poor,{type:'START_SUPPLY_PLAN',...draft}),poor);
 }
 const small=previewSupplyPlan(s,{clientId:'mira',firstBatch:'small',payment:'delivery'}),large=previewSupplyPlan(s,{clientId:'mira',firstBatch:'large',payment:'delivery'});
 assert.equal(small.cost,large.cost);assert.equal(small.revenue,large.revenue);
 assert.ok(small.cashRequired<large.cashRequired);assert.ok(small.lots[0].deliveryDay<large.lots[0].deliveryDay);
});
test('团队执行锁定两批，真实事件推进共享日费只扣一次，合同不可复领',()=>{
 for(const firstBatch of ['small','large'])for(const payment of ['delivery','deposit']){
  const original=withRelations(['mira','samir']),draft={clientId:'samir',firstBatch,payment};
  const q=previewSupplyPlan(original,draft);let s=reduceDealRoom(original,{type:'START_SUPPLY_PLAN',...draft});
  assert.equal(currentClient(s).id,'samir');assert.equal(s.supplyPlan.completed,false);assert.equal(s.supplyPlan.nextEventDay,q.events[0].day);
  assert.equal(reduceDealRoom(s,{type:'START_SUPPLY_PLAN',...draft}),s);
  assert.equal(act(s,'CONTINUE_BUSINESS'),s);assert.equal(act(s,'ADVANCE'),s);
  for(let i=0;i<q.events.length;i++){
   const before=s;s=act(s,'ADVANCE_SUPPLY_PLAN');assert.equal(s.day,q.events[i].day);
   assert.equal(s.cash-before.cash,q.events[i].income-q.events[i].cost-(s.day-before.day)*30);
   assert.ok(s.cash>=0);assert.deepEqual(normalizeDealRoom(s),s);
  }
  assert.equal(s.phase,'review');assert.equal(s.careerMilestone,true);assert.equal(s.supplyPlan.completed,true);
  assert.equal(s.supplyPlan.nextEventDay,null);assert.equal(s.cash,q.cashAfterCompletion);
  assert.equal(s.supplyPlan.operatingCostPaid,q.totalOperatingCost);assert.equal(s.supplyPlanHistory.length,1);
  assert.equal(s.contracts.length,original.contracts.length);assert.equal(act(s,'ADVANCE_SUPPLY_PLAN'),s);
  assert.equal(act(s,'CONTINUE_BUSINESS').phase,'portfolio');
 }
});
test('按恰好足够的保底现金，所有批次执行不中断；旧常规合同不重写',()=>{
 for(const payment of ['delivery','deposit']){
  const base=withRelations(),draft={clientId:'mira',firstBatch:'large',payment};
  const q=previewSupplyPlan(base,draft);let s=reduceDealRoom({...base,cash:q.cashRequired},{type:'START_SUPPLY_PLAN',...draft});
  while(s.phase==='planning-fulfillment'){const before=s;s=act(s,'ADVANCE_SUPPLY_PLAN');assert.notEqual(s,before);assert.ok(s.cash>=0);}
  assert.equal(s.cash,q.cashRequired+q.netProfit);assert.deepEqual(s.contracts,base.contracts);
 }
});


test('整份供货自动履约与逐事件账目一致，只记录一次委托动作，旧逐步存档仍可接续',()=>{
 for(const firstBatch of ['small','large'])for(const payment of ['delivery','deposit']){
  const base=withRelations(['mira','samir']);
  const signed=reduceDealRoom(base,{type:'START_SUPPLY_PLAN',clientId:'samir',firstBatch,payment});
  for(const partial of [false,true]){
   const start=partial?act(signed,'ADVANCE_SUPPLY_PLAN'):signed;
   let manual=start;while(manual.phase==='planning-fulfillment')manual=act(manual,'ADVANCE_SUPPLY_PLAN');
   const automatic=act(start,'FULFIL_SUPPLY_PLAN');
   const {history:mh,...manualResult}=manual,{history:ah,...autoResult}=automatic;
   assert.deepEqual(autoResult,manualResult);
   assert.equal(automatic.history.length,start.history.length+1);
   assert.deepEqual(automatic.history.at(-1),{type:'FULFIL_SUPPLY_PLAN'});
   assert.deepEqual(normalizeDealRoom(automatic),automatic);
   assert.deepEqual(normalizeDealRoom(start),start);
   assert.equal(act(automatic,'FULFIL_SUPPLY_PLAN'),automatic);
   assert.equal(act(automatic,'ADVANCE_SUPPLY_PLAN'),automatic);
   assert.equal(automatic.supplyPlan.events.length,signed.supplyPlan.events.length);
   assert.equal(automatic.supplyPlan.eventIndex,signed.supplyPlan.events.length);
  }
 }
 assert.equal(act(createDealRoom(),'FULFIL_SUPPLY_PLAN').phase,'negotiating');
});
