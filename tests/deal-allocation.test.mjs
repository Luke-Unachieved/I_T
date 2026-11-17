import {allocationView} from '../src/deal-room-allocation-view.js';
import test from 'node:test';import assert from 'node:assert/strict';
import {createDealRoom,reduceDealRoom,normalizeDealRoom} from '../src/deal-room-engine.js';
import {previewStudioProjectOrder} from '../src/deal-room-studio-project.js';
const a=(s,type,fields={})=>reduceDealRoom(s,{type,...fields});
const finish=(s,id)=>a(a(a(s,'PROPOSE',{optionId:id}),'ADVANCE'),'NEXT_CLIENT');
function earnedCase(sample=false,products=['mira','samir','ines']){let s=createDealRoom();for(const id of ['trial','ready','season'])s=finish(s,id);s=a(s,'CONTINUE_BUSINESS');for(let i=0;i<2;i++)s=finish(a(s,'SELECT_CLIENT',{clientId:'mira'}),'repeat-small');s=a(s,'START_SUPPLY_PLAN',{clientId:'mira',firstBatch:'small',payment:'delivery'});s=a(s,'FULFIL_SUPPLY_PLAN');if(sample){s=a(a(a(a(s,'START_DEVELOPMENT'),'COMMISSION_SAMPLE',{factory:'studio'}),'RECEIVE_SAMPLE'),'ACCEPT_SAMPLE');}s=a(s,'START_CLIENT_PROJECTS');for(const id of ['mira','samir','ines'])s=finish(a(s,'SELECT_CLIENT',{clientId:id}),'project-focus');s=a(s,'START_CURATION',{clientId:'mira'});s=a(s,sample?'SIGN_CURATION_SAMPLE':'SIGN_CURATION',{products,quantity:40,packaging:'gift',...(sample?{lampVersion:'developed'}:{})});return a(s,'FULFIL_CURATION');}

function ready(){let s=a(earnedCase(true),'OPEN_CASE_GROWTH',{referrerId:'mira'});s=a(s,'SIGN_CASE_GROWTH',{agreement:'portfolio',products:['mira','samir','ines'],packaging:'plain',terms:'delivery'});s=a(a(s,'FULFIL_CASE_GROWTH'),'CLOSE_CASE_GROWTH');s=a(a(s,'START_COLLECTION'),'SIGN_COLLECTION',{model:'own',style:'botanical'});s=a(a(a(s,'OPEN_COLLECTION_PITCH',{buyerId:'atelier'}),'SIGN_COLLECTION_PITCH',{optionId:'sleeve'}),'FULFIL_COLLECTION');return a(a(s,'CLOSE_COLLECTION'),'OPEN_CASE_GROWTH',{referrerId:'mira'});}

const opened=()=>{let s=ready();s=a(a(s,'SIGN_CATALOGUE_ORDER',{lampVersion:'developed'}),'FULFIL_CASE_GROWTH');s=a(s,'CLOSE_CASE_GROWTH');return a(s,'OPEN_STUDIO_PROJECT',{direction:'independent'});};
import {previewStudioAllocation} from '../src/deal-room-allocation.js';
import {caseGrowthDemand} from '../src/deal-room-case-growth.js';
function allocationReady(){
 let s=a(opened(),'KEEP_STUDIO_PROJECT');s=a(s,'START_CURATION',{clientId:'samir'});s=a(a(s,'SIGN_CURATION',{products:['mira','samir','ines'],quantity:40,packaging:'plain'}),'FULFIL_CURATION');s=a(s,'OPEN_CASE_GROWTH',{referrerId:'samir'});s=a(a(a(s,'SIGN_CASE_GROWTH',{agreement:'private',products:['mira','samir','ines'],packaging:'plain',terms:'delivery'}),'FULFIL_CASE_GROWTH'),'CLOSE_CASE_GROWTH');s=a(s,'OPEN_STUDIO_PROJECT',{direction:'group'});
 for(const [field,value] of Object.entries({lampVersion:'developed',layout:'table',light:'soft'}))s=a(s,'SET_STUDIO_PROJECT',{field,value});s=a(s,'REVIEW_STUDIO_PROJECT');s=a(s,'WAIT_STUDIO_PROJECT');s=a(a(a(s,'SIGN_STUDIO_PROJECT_ORDER'),'FULFIL_CASE_GROWTH'),'CLOSE_CASE_GROWTH');s=a(s,'OPEN_STUDIO_PROJECT',{direction:'group'});s=a(a(s,'PROPOSE_GROUP_CHANGE'),'REVIEW_STUDIO_PROJECT');return a(s,'RESTORE_GROUP_SPEC',{briefId:'bedside'});
}
test('only same-customer approved bedside plus welcome enables allocation, with unchanged old quote',()=>{
 const s=allocationReady(),original=previewStudioProjectOrder(s,s.studioProject);assert.equal(previewStudioAllocation(s).available,true);assert.deepEqual(previewStudioAllocation(s).productQuantities,{mira:60,samir:60,ines:0});
 const bad=structuredClone(s);delete bad.groupProjectSpecs.welcome;delete bad.studioProjectPlans.group;assert.equal(previewStudioAllocation(bad,'mixed').available,false);assert.equal(a(bad,'SIGN_STUDIO_ALLOCATION',{allocation:'mixed'}),bad);
 const other=structuredClone(s);other.groupProjectSpecs.welcome.referrerId='mira';if(other.studioProjectPlans?.group?.briefId==='welcome')other.studioProjectPlans.group.referrerId='mira';assert.equal(previewStudioAllocation(other,'mixed').available,false);
 assert.deepEqual(previewStudioProjectOrder(s,s.studioProject),original);assert.deepEqual(normalizeDealRoom(s),s);
});
test('mixed batch has 60 cups not 120, real prices, locked quantities and no repeated settlement',()=>{
 let s=allocationReady();s=a(s,'WAIT_STUDIO_ALLOCATION',{allocation:'mixed'});const q=previewStudioAllocation(s,'mixed'),original=previewStudioAllocation(s);
 assert.equal(q.available,true);assert.equal(q.valid,true,q.reason);assert.deepEqual(q.allocation,{bedside:40,welcome:20});assert.deepEqual(q.productQuantities,{mira:40,samir:60,ines:20});assert.equal(q.quantity,60);assert.equal(q.revenue,40*75+60*48+20*42);assert.equal(q.cost,40*45+60*26+20*24);assert.equal(q.netProfit,original.netProfit-240);
 const start=s.cash,old=structuredClone(s.caseGrowthHistory);s=a(s,'SIGN_STUDIO_ALLOCATION',{allocation:'mixed'});assert.equal(s.cash,start-q.cost);assert.equal(a(s,'SIGN_STUDIO_ALLOCATION',{allocation:'bedside'}),s);assert.equal(a(s,'WAIT_STUDIO_ALLOCATION',{allocation:'mixed'}),s);
 s=a(s,'FULFIL_CASE_GROWTH');assert.equal(s.cash,start+q.netProfit);assert.deepEqual(s.caseGrowthHistory.slice(0,-1),old);assert.equal(a(s,'FULFIL_CASE_GROWTH'),s);
 const stock=caseGrowthDemand(s,'samir');assert.deepEqual(Object.fromEntries(stock.map(d=>[d.id,d.remaining])),{mira:40,samir:60,ines:20});assert.deepEqual(normalizeDealRoom(s),s);
 const revisit=a(a(s,'CLOSE_CASE_GROWTH'),'OPEN_STUDIO_PROJECT',{direction:'group'});assert.equal(allocationView(revisit),'');assert.deepEqual(normalizeDealRoom(revisit),revisit);
 for(const mutate of [x=>x.caseGrowthHistory.at(-1).productQuantities.ines=60,x=>x.caseGrowthHistory.at(-1).allocation.bedside=60]){const bad=structuredClone(s);mutate(bad);assert.throws(()=>normalizeDealRoom(bad));}
});
test('mixed wait follows the later cloth need and only charges elapsed days once',()=>{
 const s=allocationReady(),day=s.day;
 // Read-only demand fixture isolates different SKU readiness; no fabricated save is loaded.
 const fixture={...s,caseGrowthHistory:[...s.caseGrowthHistory,{status:'paid',agreement:'private',referrerId:'samir',products:['ines'],quantity:100,deliveryDay:day}]};
 const q=previewStudioAllocation(fixture,'mixed'),bedside=previewStudioAllocation(fixture);assert.ok(q.waitingUntil>bedside.waitingUntil);assert.equal(q.available,true);assert.equal(q.valid,false);
 const waited=a(fixture,'WAIT_STUDIO_ALLOCATION',{allocation:'mixed'});assert.equal(waited.day,q.waitingUntil);assert.equal(waited.cash,fixture.cash-q.waitingCost);assert.equal(a(waited,'WAIT_STUDIO_ALLOCATION',{allocation:'mixed'}),waited);assert.equal(previewStudioAllocation(waited,'mixed').valid,true);
 const poor={...s,cash:0};assert.equal(previewStudioAllocation(poor,'mixed').available,true);assert.equal(a(poor,'SIGN_STUDIO_ALLOCATION',{allocation:'mixed'}),poor);
});
