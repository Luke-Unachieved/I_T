import test from 'node:test';import assert from 'node:assert/strict';
import {createDealRoom,reduceDealRoom,normalizeDealRoom,currentClient} from '../src/deal-room-engine.js';
import {caseGrowthOffers,previewCaseGrowth,caseGrowthDemand,previewCaseCalloff,canCalloffCase,caseCalloffConsequence,canProposeCaseLamp,previewApprovedCaseLamp} from '../src/deal-room-case-growth.js';
const a=(s,type,fields={})=>reduceDealRoom(s,{type,...fields});
const finish=(s,id)=>a(a(a(s,'PROPOSE',{optionId:id}),'ADVANCE'),'NEXT_CLIENT');
function earnedCase(sample=false,products=['mira','samir','ines']){let s=createDealRoom();for(const id of ['trial','ready','season'])s=finish(s,id);s=a(s,'CONTINUE_BUSINESS');for(let i=0;i<2;i++)s=finish(a(s,'SELECT_CLIENT',{clientId:'mira'}),'repeat-small');s=a(s,'START_SUPPLY_PLAN',{clientId:'mira',firstBatch:'small',payment:'delivery'});s=a(s,'FULFIL_SUPPLY_PLAN');if(sample){s=a(a(a(a(s,'START_DEVELOPMENT'),'COMMISSION_SAMPLE',{factory:'studio'}),'RECEIVE_SAMPLE'),'ACCEPT_SAMPLE');}s=a(s,'START_CLIENT_PROJECTS');for(const id of ['mira','samir','ines'])s=finish(a(s,'SELECT_CLIENT',{clientId:id}),'project-focus');s=a(s,'START_CURATION',{clientId:'mira'});s=a(s,sample?'SIGN_CURATION_SAMPLE':'SIGN_CURATION',{products,quantity:40,packaging:'gift',...(sample?{lampVersion:'developed'}:{})});return a(s,'FULFIL_CURATION');}
const portfolio={agreement:'portfolio',products:['mira','samir'],packaging:'plain',terms:'delivery'};
const privateDraft={agreement:'private',products:['mira','samir','ines'],packaging:'gift',terms:'delivery'};
test('case growth is opt-in, cancellable before agreement and old canonical cases do not change',()=>{
 const old=earnedCase(),snapshot=structuredClone(old);assert.equal(caseGrowthOffers(old).length,1);assert.equal(caseGrowthOffers(createDealRoom()).length,0);assert.equal(a(createDealRoom(),'OPEN_CASE_GROWTH',{referrerId:'mira'}).phase,'negotiating');
 const opened=a(old,'OPEN_CASE_GROWTH',{referrerId:'mira'});assert.equal(opened.phase,'case-growth');assert.equal(opened.caseGrowth.agreement,undefined);const closed=a(opened,'CLOSE_CASE_GROWTH');assert.equal(closed.caseGrowth,undefined);assert.equal(closed.cash,old.cash);assert.deepEqual(closed.curationHistory,old.curationHistory);assert.deepEqual(old,snapshot);assert.deepEqual(normalizeDealRoom(old),old);assert.deepEqual(normalizeDealRoom(closed),closed);
});
test('portfolio selects source products while private preserves the exact source assortment and packaging',()=>{
 const s=a(earnedCase(),'OPEN_CASE_GROWTH',{referrerId:'mira'}),q=previewCaseGrowth(s,portfolio);assert.equal(q.valid,true);assert.equal(q.quantity,40);assert.deepEqual(q.products,['mira','samir']);assert.equal(q.cost,2240);assert.equal(q.revenue,4120);
 assert.equal(previewCaseGrowth(s,{...portfolio,products:['mira','samir','ines'],packaging:'gift'}).valid,true);
 assert.equal(previewCaseGrowth(s,{...portfolio,terms:'sample'}).valid,false);
 assert.equal(previewCaseGrowth(s,{...privateDraft,products:['mira','samir']}).valid,false);assert.equal(previewCaseGrowth(s,{...privateDraft,packaging:'plain'}).valid,false);
 const direct=previewCaseGrowth(s,privateDraft),sample=previewCaseGrowth(s,{...privateDraft,terms:'sample'});assert.equal(direct.valid,true);assert.equal(direct.quantity,60);assert.equal(direct.deposit,0);assert.equal(sample.deposit,sample.revenue/2);assert.equal(sample.paymentDay,direct.paymentDay+3);assert.equal(direct.netProfit-sample.netProfit,90);assert.equal(direct.revenue,sample.revenue);assert.equal(direct.cost,sample.cost);assert.equal(previewCaseGrowth({...s,cash:1000},privateDraft).valid,false);assert.equal(previewCaseGrowth({...s,cash:1000},{...privateDraft,terms:'sample'}).valid,true);
});
test('agreement locks at sign, settlement occurs once, private source cannot be offered for portfolio again',()=>{
 const old=earnedCase(),s=a(old,'OPEN_CASE_GROWTH',{referrerId:'mira'}),q=previewCaseGrowth(s,privateDraft),signed=a(s,'SIGN_CASE_GROWTH',privateDraft);assert.equal(signed.caseGrowth.agreement,'private');assert.equal(signed.caseGrowth.status,'production');assert.equal(a(signed,'SIGN_CASE_GROWTH',portfolio),signed);assert.equal(a(signed,'CLOSE_CASE_GROWTH'),signed);assert.equal(caseGrowthOffers(signed).length,0);
 const paid=a(signed,'FULFIL_CASE_GROWTH');assert.equal(paid.cash,old.cash+q.netProfit);assert.equal(paid.day,q.paymentDay);assert.equal(paid.caseGrowthHistory.length,1);assert.equal(paid.caseGrowth.status,'paid');assert.equal(a(paid,'FULFIL_CASE_GROWTH'),paid);assert.deepEqual(paid.curationHistory,old.curationHistory);assert.equal(caseGrowthOffers(paid)[0].agreement,'private');const closed=a(paid,'CLOSE_CASE_GROWTH'),reopened=a(closed,'OPEN_CASE_GROWTH',{referrerId:'mira'});assert.equal(reopened.caseGrowth.agreement,'private');assert.equal(a(reopened,'SIGN_CASE_GROWTH',portfolio),reopened);assert.match(previewCaseGrowth(reopened,portfolio).reason,/不能改为/);assert.deepEqual(normalizeDealRoom(reopened),reopened);
});
test('developed sample cost carries only if the new lamp remains in the chosen assortment',()=>{
 const s=a(earnedCase(true),'OPEN_CASE_GROWTH',{referrerId:'mira'}),q=previewCaseGrowth(s,portfolio);assert.equal(q.lampVersion,'developed');assert.equal(q.cost,(45+26)*40);assert.equal(q.revenue,(75+48)*40);
 const without={...portfolio,products:['samir','ines']},other=previewCaseGrowth(s,without);assert.equal(other.valid,true);assert.equal(other.lampVersion,undefined);assert.equal(other.cost,50*40);assert.deepEqual(other.productNames,['保温杯','棉麻桌布']);const paid=a(a(s,'SIGN_CASE_GROWTH',without),'FULFIL_CASE_GROWTH');assert.deepEqual(normalizeDealRoom(paid),paid);
});
test('invalid or mutated inputs cannot alter the signed project or bypass funding',()=>{
 const s=a(earnedCase(),'OPEN_CASE_GROWTH',{referrerId:'mira'});for(const draft of [{...portfolio,products:['mira','mira']},{...portfolio,products:['bad','mira']},{...portfolio,extra:true},{...portfolio,terms:'guess'}])assert.equal(a(s,'SIGN_CASE_GROWTH',draft),s);
 assert.equal(previewCaseGrowth({...s,cash:0},privateDraft).valid,false);const products=['samir','mira'],signed=a(s,'SIGN_CASE_GROWTH',{...portfolio,products});products.push('ines');assert.deepEqual(signed.caseGrowth.active.products,['mira','samir']);const corrupt=structuredClone(signed);corrupt.caseGrowth.agreement='private';assert.throws(()=>normalizeDealRoom(corrupt));assert.deepEqual(normalizeDealRoom(signed),signed);
});

const reopen=s=>a(a(s,'CLOSE_CASE_GROWTH'),'OPEN_CASE_GROWTH',{referrerId:'mira'});
test('stock follows delivery, not payment, and waiting charges once without signing',()=>{
 const source=earnedCase(),opened=a(source,'OPEN_CASE_GROWTH',{referrerId:'mira'}),paid=a(a(opened,'SIGN_CASE_GROWTH',portfolio),'FULFIL_CASE_GROWTH'),s=reopen(paid),d=caseGrowthDemand(s,'mira');
 assert.deepEqual(d.map(p=>p.remaining),[24,8,0]);assert.equal(currentClient(s),null);const q=previewCaseGrowth(s,portfolio);assert.equal(q.valid,false);assert.match(q.reason,/便携台灯还余24件/);assert.equal(q.waitingUntil,s.day+3);assert.equal(q.waitingCost,90);assert.equal(q.revenue,4120);
 const waited=a(s,'WAIT_CASE_GROWTH',{products:portfolio.products});assert.equal(waited.day,s.day+3);assert.equal(waited.cash,s.cash-90);assert.equal(waited.caseGrowthOperatingCost,90);assert.equal(waited.caseGrowthHistory.length,1);assert.equal(a(waited,'WAIT_CASE_GROWTH',{products:portfolio.products}),waited);assert.equal(previewCaseGrowth(waited,portfolio).valid,true);const twice=a(a(waited,'SIGN_CASE_GROWTH',portfolio),'FULFIL_CASE_GROWTH');assert.equal(twice.caseGrowthHistory.length,2);assert.equal(caseGrowthOffers(twice)[0].historyCount,2);assert.deepEqual(normalizeDealRoom(twice),twice);
 for(const products of [['mira'],['mira','mira'],['mira','bad']])assert.equal(a(s,'WAIT_CASE_GROWTH',{products}),s);assert.equal(a({...s,cash:0},'WAIT_CASE_GROWTH',{products:portfolio.products}).cash,0);
});
test('real work for another buyer sells existing stock, portfolio can switch to other earned products',()=>{
 let source=earnedCase(false,['mira','samir']);source=a(source,'START_CURATION',{clientId:'samir'});source=a(a(source,'SIGN_CURATION',{products:['samir','ines'],quantity:40,packaging:'plain'}),'FULFIL_CURATION');
 let s=a(source,'OPEN_CASE_GROWTH',{referrerId:'mira'});assert.equal(previewCaseGrowth(s,{...portfolio,products:['samir','ines']}).valid,false);s=a(a(s,'SIGN_CASE_GROWTH',portfolio),'FULFIL_CASE_GROWTH');const delivered=s.day;
 s=a(s,'CLOSE_CASE_GROWTH');s=a(s,'CONTINUE_BUSINESS');s=finish(a(s,'SELECT_CLIENT',{clientId:'mira'}),'repeat-small');s=a(s,'BACK_FROM_CLIENTS');s=a(s,'OPEN_CASE_GROWTH',{referrerId:'mira'});
 assert.ok(s.day>delivered);const stock=caseGrowthDemand(s,'mira');assert.equal(stock.find(d=>d.id==='mira').remaining,Math.max(0,24-(s.day-delivered)*8));assert.equal(stock.find(d=>d.id==='samir').remaining,0);assert.deepEqual(caseGrowthOffers(s).find(o=>o.referrerId==='mira').products,['mira','samir','ines']);assert.equal(previewCaseGrowth(s,{...portfolio,products:['samir','ines']}).valid,true);assert.equal(previewCaseGrowth(s,portfolio).valid,false);assert.deepEqual(normalizeDealRoom(s),s);
});
test('private reorders keep full source even after other cases, and only whole-set waiting is accepted',()=>{
 const paid=a(a(a(earnedCase(),'OPEN_CASE_GROWTH',{referrerId:'mira'}),'SIGN_CASE_GROWTH',privateDraft),'FULFIL_CASE_GROWTH'),s=reopen(paid),q=previewCaseGrowth(s,privateDraft);assert.equal(q.waitingUntil,s.day+12);assert.match(q.reason,/整套规格补货/);assert.doesNotMatch(q.reason,/改选缺货/);assert.equal(a(s,'WAIT_CASE_GROWTH',{products:['mira','samir']}),s);const waited=a(s,'WAIT_CASE_GROWTH',{products:privateDraft.products});assert.equal(waited.cash,s.cash-360);assert.equal(previewCaseGrowth(waited,privateDraft).valid,true);assert.equal(a(waited,'SIGN_CASE_GROWTH',portfolio),waited);assert.deepEqual(normalizeDealRoom(waited),waited);
});
test('stock lots use continuous sell-through, not one independent consumption allowance per batch',()=>{
 const state={day:13,caseGrowthHistory:[{status:'paid',referrerId:'mira',products:['mira'],quantity:40,deliveryDay:10},{status:'paid',referrerId:'mira',products:['mira'],quantity:40,deliveryDay:12},{status:'paid',referrerId:'samir',products:['mira'],quantity:500,deliveryDay:12}]};const d=caseGrowthDemand(state,'mira')[0];assert.equal(d.remaining,56);assert.equal(d.readyDay,20);assert.equal(d.ready,false);
});

function threeCases(){let s=earnedCase();for(const clientId of ['samir','ines']){s=a(s,'START_CURATION',{clientId});s=a(a(s,'SIGN_CURATION',{products:['mira','samir','ines'],quantity:40,packaging:'plain'}),'FULFIL_CURATION');}return s;}
test('referral cases cannot clone a contact or reset its stock; two real contacts may coexist',()=>{
 let s=threeCases();assert.equal(caseGrowthOffers(s).length,3);assert.deepEqual(caseGrowthOffers(s)[0].availableAgreements,['portfolio','private']);s=a(a(a(s,'OPEN_CASE_GROWTH',{referrerId:'mira'}),'SIGN_CASE_GROWTH',portfolio),'FULFIL_CASE_GROWTH');s=a(s,'CLOSE_CASE_GROWTH');
 let offers=caseGrowthOffers(s);assert.deepEqual(offers.find(o=>o.referrerId==='mira').availableAgreements,['portfolio']);assert.deepEqual(offers.find(o=>o.referrerId==='samir').availableAgreements,['private']);const before=caseGrowthDemand(s,'mira');
 s=a(s,'OPEN_CASE_GROWTH',{referrerId:'samir'});const duplicate=previewCaseGrowth(s,portfolio);assert.equal(duplicate.valid,false);assert.match(duplicate.reason,/已经认识这位客户/);assert.equal(a(s,'SIGN_CASE_GROWTH',portfolio),s);assert.deepEqual(caseGrowthDemand(s,'mira'),before);s=a(s,'CLOSE_CASE_GROWTH');const revisit=a(s,'OPEN_CASE_GROWTH',{referrerId:'mira'});assert.deepEqual(caseGrowthDemand(revisit,'mira'),before);assert.match(previewCaseGrowth(revisit,portfolio).reason,/还余/);
 s=a(revisit,'CLOSE_CASE_GROWTH');s=a(s,'OPEN_CASE_GROWTH',{referrerId:'samir'});s=a(a(s,'SIGN_CASE_GROWTH',{...privateDraft,packaging:'plain'}),'FULFIL_CASE_GROWTH');s=a(s,'CLOSE_CASE_GROWTH');offers=caseGrowthOffers(s);assert.equal(offers.length,2);assert.deepEqual(offers.map(o=>o.agreement),['portfolio','private']);assert.equal(s.curationHistory.length,3);assert.equal(a(s,'OPEN_CASE_GROWTH',{referrerId:'ines'}),s);assert.deepEqual(normalizeDealRoom(s),s);
});
test('contact identity includes a signed production contract, before payment is recorded',()=>{
 const signed=a(a(threeCases(),'OPEN_CASE_GROWTH',{referrerId:'mira'}),'SIGN_CASE_GROWTH',portfolio);assert.equal(signed.caseGrowthHistory,undefined);assert.deepEqual(caseGrowthOffers(signed).map(o=>o.availableAgreements),[['private'],['private']]);
});
test('unpublished duplicate-contact experimental saves are explicitly rejected without mutation',()=>{
 let s=a(a(a(threeCases(),'OPEN_CASE_GROWTH',{referrerId:'mira'}),'SIGN_CASE_GROWTH',portfolio),'FULFIL_CASE_GROWTH');const legacy=structuredClone(s);legacy.caseGrowthHistory.push({...structuredClone(legacy.caseGrowthHistory[0]),referrerId:'samir'});const untouched=structuredClone(legacy);assert.throws(()=>normalizeDealRoom(legacy),/旧实验.*同一客户.*原存档未修改/);assert.deepEqual(legacy,untouched);
});

test('trusted group calloffs are earned by delivery and preserve the approved catalogue',()=>{
 let s=a(earnedCase(),'OPEN_CASE_GROWTH',{referrerId:'mira'});const single={...privateDraft,products:['samir']};
 assert.equal(previewCaseCalloff(s,single).valid,false);assert.equal(a(s,'SIGN_CASE_CALLOFF',single),s);
 s=a(s,'SIGN_CASE_GROWTH',privateDraft);assert.equal(canCalloffCase(s,'mira'),false);s=a(s,'FULFIL_CASE_GROWTH');assert.equal(canCalloffCase(s,'mira'),true);
 s=a(a(s,'CLOSE_CASE_GROWTH'),'OPEN_CASE_GROWTH',{referrerId:'mira'});assert.equal(previewCaseCalloff(s,single).valid,false);
 s=a(s,'WAIT_CASE_CALLOFF',{products:['samir']});const q=previewCaseCalloff(s,single);assert.equal(q.valid,true);assert.equal(q.calloff,true);assert.equal(q.quantity,60);const consequence=caseCalloffConsequence(s,q);assert.ok(consequence.withOrder>consequence.without);
 assert.equal(previewCaseGrowth(s,single).valid,false);assert.equal(previewCaseCalloff(s,{...single,packaging:'plain'}).valid,false);assert.equal(previewCaseCalloff(s,{...single,products:['mira','samir']}).valid,false);
 const before=caseGrowthDemand(s,'mira'),signed=a(s,'SIGN_CASE_CALLOFF',single),paid=a(signed,'FULFIL_CASE_GROWTH');assert.equal(paid.cash,q.cashAfterPayment);assert.equal(paid.caseGrowthHistory.at(-1).calloff,true);assert.deepEqual(normalizeDealRoom(paid),paid);
 const after=caseGrowthDemand(paid,'mira');assert.equal(after.find(d=>d.id==='samir').remaining,60);assert.ok(after.find(d=>d.id==='samir').readyDay>before.find(d=>d.id==='samir').readyDay);assert.equal(after.find(d=>d.id==='ines').readyDay,before.find(d=>d.id==='ines').readyDay);assert.deepEqual(a(paid,'FULFIL_CASE_GROWTH'),paid);
});
test('calloff permission cannot be borrowed across customers or change the source SKU set',()=>{
 const s=a(earnedCase(false,['mira','ines']),'OPEN_CASE_GROWTH',{referrerId:'mira'});const paid=a(a(s,'SIGN_CASE_GROWTH',{...privateDraft,products:['mira','ines']}),'FULFIL_CASE_GROWTH');const reopened=a(a(paid,'CLOSE_CASE_GROWTH'),'OPEN_CASE_GROWTH',{referrerId:'mira'});
 assert.equal(canCalloffCase(reopened,'samir'),false);assert.equal(previewCaseCalloff(reopened,{...privateDraft,products:['samir']}).valid,false);assert.equal(a(reopened,'WAIT_CASE_CALLOFF',{products:['samir']}),reopened);
});

test('standalone bundle renders trusted calloffs and their future stock consequence',async()=>{
 const {buildDealHtml}=await import('../scripts/build-deal-standalone.mjs');const vm=await import('node:vm');let s=a(a(a(earnedCase(),'OPEN_CASE_GROWTH',{referrerId:'mira'}),'SIGN_CASE_GROWTH',privateDraft),'FULFIL_CASE_GROWTH');s=a(a(s,'CLOSE_CASE_GROWTH'),'OPEN_CASE_GROWTH',{referrerId:'mira'});s=a(s,'WAIT_CASE_CALLOFF',{products:['samir']});const script=(await buildDealHtml()).match(/<script>([\s\S]*)<\/script>/)[1].split('let growthDraft=null;')[0];const context={state:s,draft:{...privateDraft,products:['samir']}};vm.runInNewContext(script+';result=caseGrowthView(state,draft);',context);assert.match(context.result,/这批按款补货/);assert.match(context.result,/整套最早第/);
});

// Approval is earned on an existing contact; the original assortment stays intact.
function lampProposal(factory='studio'){
 let s=earnedCase();
 s=a(a(a(s,'OPEN_CASE_GROWTH',{referrerId:'mira'}),'SIGN_CASE_GROWTH',privateDraft),'FULFIL_CASE_GROWTH');
 s=a(s,'CLOSE_CASE_GROWTH');
 s=a(a(a(a(s,'START_DEVELOPMENT'),'COMMISSION_SAMPLE',{factory}),'RECEIVE_SAMPLE'),'ACCEPT_SAMPLE');
 return a(s,'OPEN_CASE_GROWTH',{referrerId:'mira'});
}
test('group lamp proposal rejects standard, requires a real approved studio sample, and is repeat safe',()=>{
 const s=lampProposal();assert.equal(canProposeCaseLamp(s,'mira'),true);
 const counter=a(s,'APPROVE_CASE_LAMP',{model:'standard'});assert.equal(counter.feedback.kind,'counter');assert.match(counter.feedback.message,/不能切换/);assert.equal(counter.cash,s.cash);assert.equal(counter.day,s.day);assert.equal(counter.caseLampApprovals,undefined);
 assert.equal(a(counter,'APPROVE_CASE_LAMP',{model:'standard'}),counter);
 const approved=a(counter,'APPROVE_CASE_LAMP',{model:'developed'});assert.deepEqual(approved.caseLampApprovals.mira,{model:'developed',purpose:'night-reading',approvedDay:s.day});assert.equal(approved.cash,s.cash);assert.equal(approved.day,s.day);assert.equal(approved.caseGrowth.status,'draft');assert.deepEqual(approved.caseGrowthHistory,s.caseGrowthHistory);assert.deepEqual(approved.curationHistory,s.curationHistory);
 assert.equal(canProposeCaseLamp(approved,'mira'),false);assert.equal(a(approved,'APPROVE_CASE_LAMP',{model:'developed'}),approved);
 const line=lampProposal('line');assert.equal(canProposeCaseLamp(line,'mira'),false);assert.equal(a(line,'APPROVE_CASE_LAMP',{model:'developed'}),line);
 const missing={...s,productDevelopment:undefined};assert.equal(canProposeCaseLamp(missing,'mira'),false);assert.equal(a(missing,'APPROVE_CASE_LAMP',{model:'developed'}),missing);
 assert.equal(a(s,'APPROVE_CASE_LAMP',{model:'invented'}),s);assert.equal(canProposeCaseLamp(s,'samir'),false);
 assert.deepEqual(normalizeDealRoom(approved),approved);
});
test('approved lamp quote keeps old quotes unchanged and uses actual shared stock, cash and payment terms',()=>{
 let s=lampProposal();const oldCall={...privateDraft,products:['mira']};const before=previewCaseCalloff(s,oldCall),whole=previewCaseGrowth(s,privateDraft);
 assert.equal(previewApprovedCaseLamp(s,{terms:'delivery'}).valid,false);assert.equal(a(s,'SIGN_APPROVED_CASE_LAMP',{terms:'delivery'}),s);
 s=a(s,'APPROVE_CASE_LAMP',{model:'developed'});assert.deepEqual(previewCaseCalloff(s,oldCall),before);assert.deepEqual(previewCaseGrowth(s,privateDraft),whole);
 assert.equal(previewApprovedCaseLamp(s,{terms:'delivery'}).valid,false);assert.match(previewApprovedCaseLamp(s,{terms:'delivery'}).reason,/还余/);
 s=a(s,'WAIT_CASE_CALLOFF',{products:['mira']});
 const q=previewApprovedCaseLamp(s,{terms:'delivery'}),old=previewCaseCalloff(s,oldCall),sample=previewApprovedCaseLamp(s,{terms:'sample'});
 assert.equal(q.valid,true);assert.equal(q.lampVersion,'developed');assert.equal(q.purpose,'night-reading');assert.equal(old.purpose,undefined);assert.equal(q.quantity,60);assert.deepEqual(q.products,['mira']);assert.equal(q.packaging,'gift');assert.equal(q.cost,(45+8)*60);assert.equal(q.revenue,(75+12)*60);assert.equal(q.netProfit-old.netProfit,300);assert.equal(q.requiredCash-old.requiredCash,900);assert.equal(sample.requiredCash-previewCaseCalloff(s,{...oldCall,terms:'sample'}).requiredCash,300);
 assert.equal(previewApprovedCaseLamp({...s,cash:0},{terms:'delivery'}).valid,false);assert.equal(previewApprovedCaseLamp(s,{terms:'invalid'}).valid,false);
 const signed=a(s,'SIGN_APPROVED_CASE_LAMP',{terms:'sample'});assert.equal(signed.caseGrowth.status,'production');assert.equal(signed.caseGrowth.active.approvedCaseLamp,true);assert.equal(signed.caseGrowth.active.purpose,'night-reading');assert.equal(signed.cash,s.cash+sample.deposit-sample.cost);
 const paid=a(signed,'FULFIL_CASE_GROWTH');assert.equal(paid.cash,s.cash+sample.netProfit);assert.equal(a(paid,'FULFIL_CASE_GROWTH'),paid);assert.deepEqual(normalizeDealRoom(paid),paid);
 const reopened=a(a(paid,'CLOSE_CASE_GROWTH'),'OPEN_CASE_GROWTH',{referrerId:'mira'});assert.equal(caseGrowthDemand(reopened,'mira').find(d=>d.id==='mira').remaining,60);assert.equal(previewCaseCalloff(reopened,oldCall).valid,false);assert.equal(previewApprovedCaseLamp(reopened,{terms:'delivery'}).valid,false);assert.equal(caseGrowthOffers(reopened).length,1);
 for(const mutate of [x=>x.caseLampApprovals.mira.approvedDay++,x=>x.caseLampApprovals.mira.model='standard',x=>delete x.caseLampApprovals,x=>x.caseGrowthHistory.at(-1).cost++]){const bad=structuredClone(paid);mutate(bad);assert.throws(()=>normalizeDealRoom(bad));}
});
test('a group already supplied the developed source model does not need another qualification',()=>{
 const s=a(a(a(earnedCase(true),'OPEN_CASE_GROWTH',{referrerId:'mira'}),'SIGN_CASE_GROWTH',privateDraft),'FULFIL_CASE_GROWTH');
 const opened=a(a(s,'CLOSE_CASE_GROWTH'),'OPEN_CASE_GROWTH',{referrerId:'mira'});assert.equal(canProposeCaseLamp(opened,'mira'),false);assert.equal(a(opened,'APPROVE_CASE_LAMP',{model:'developed'}),opened);assert.equal(previewCaseCalloff(opened,{...privateDraft,products:['mira']}).lampVersion,'developed');assert.deepEqual(normalizeDealRoom(opened),opened);
});

test('sample meeting separates adoption from ordering and clears stale standard objections',async()=>{
 const {caseGrowthView}=await import('../src/deal-room-case-growth-view.js');let state=a(lampProposal(),'APPROVE_CASE_LAMP',{model:'standard'});const draft={...privateDraft,products:['samir']};const initial=caseGrowthView(state,draft,{proposalOpen:true,proposalModel:'standard'});assert.match(initial,/不能切换客房/);assert.doesNotMatch(initial,/data-action="SIGN_CASE_GROWTH"/);const revised=caseGrowthView(state,draft,{proposalOpen:true,proposalModel:'developed'});assert.doesNotMatch(revised,/class="counter"/);assert.match(revised,/data-proposal-light/);
 const {buildDealHtml}=await import('../scripts/build-deal-standalone.mjs');const vm=await import('node:vm');const script=(await buildDealHtml()).match(/<script>([\s\S]*)<\/script>/)[1].split('let growthDraft=null;')[0],context={state,draft};vm.runInNewContext(script+';result=caseGrowthView(state,draft,{proposalOpen:true,proposalModel:"developed"});',context);assert.match(context.result,/三档调光实物样/);
});
