import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {createDealRoom,reduceDealRoom,normalizeDealRoom} from '../src/deal-room-engine.js';
import {groupStudioPurchaseEligibility as eligibility} from '../src/deal-room-group-use-eligibility.js';
import {stockProcurementOpportunity} from '../src/deal-room-stock-procurement.js';
const project={direction:'group',briefId:'bedside',referrerId:'samir',status:'approved'};
const lot={status:'paid',agreement:'private',purpose:'studio-project',studioDirection:'group',referrerId:'samir',studioBrief:'bedside',quantity:60,deliveryDay:10};
const state=()=>({day:196,studioProject:{...project},caseGrowthHistory:[]});
test('first use and a genuinely unserved other use remain accessible; days never erase delivered installations',()=>{
 let s=state();assert.equal(eligibility(s).canPurchase,true);s.caseGrowthHistory=[{...lot}];assert.equal(eligibility(s).canPurchase,false);assert.equal(eligibility({...s,day:9999}).canPurchase,false);assert.equal(eligibility(s,{...project,briefId:'welcome'}).canPurchase,true);assert.equal(eligibility(s,project,{allocation:'mixed'}).canPurchase,true);assert.equal(eligibility(s,{...project,direction:'independent'}).canPurchase,true);
 assert.equal(eligibility({...s,caseGrowthHistory:[{...lot,status:'production'}]}).canPurchase,true);
 const pending={...s,caseGrowth:{status:'production',active:{...lot,status:undefined}}};assert.equal(eligibility(pending).canPurchase,false);assert.equal(eligibility(pending).canFulfilExisting,true);
});
test('mixed coverage counts exact delivered positions without inventing automatic balance orders',()=>{
 const s=state();s.caseGrowthHistory=[{...lot,allocationVersion:1,allocation:{bedside:40,welcome:20},productQuantities:{mira:40,samir:60,ines:20}}];assert.deepEqual(eligibility(s).delivered,{bedside:40,welcome:20});assert.equal(eligibility(s).canPurchase,false);assert.equal(eligibility(s,{...project,briefId:'welcome'}).canPurchase,false);assert.equal(eligibility(s,project,{allocation:'mixed'}).canPurchase,false);
 s.caseGrowthHistory[0].allocation={bedside:60,welcome:0};s.caseGrowthHistory[0].productQuantities={mira:60,samir:60,ines:0};assert.equal(eligibility(s,{...project,briefId:'welcome'}).canPurchase,true);assert.equal(eligibility(s,project,{allocation:'mixed'}).canPurchase,false);
});
test('generic sales and different contacts do not silently become use deliveries; malformed mixed record blocks guessing',()=>{
 const s=state();s.caseGrowthHistory=[{...lot,purpose:'ordinary'},{...lot,referrerId:'mira'},{...lot,studioDirection:'independent'}];assert.equal(eligibility(s).canPurchase,true);
 s.caseGrowthHistory=[{...lot,allocationVersion:1,allocation:{bedside:40,welcome:20}}];assert.equal(eligibility(s).canPurchase,false);assert.match(eligibility(s).reason,/核实/);
});
test('real older canonical history still replays; new entry policy blocks repeats, not the explicit twelve-lamp inquiry',()=>{
 const actions=JSON.parse(fs.readFileSync(new URL('./fixtures/deal-group-day169-actions.json',import.meta.url)));const s=actions.reduce((s,a)=>reduceDealRoom(s,a),createDealRoom()),before=structuredClone(s);assert.deepEqual(normalizeDealRoom(s),s);
 const r=eligibility(s);assert.deepEqual(r.delivered,{bedside:100,welcome:80});assert.equal(r.canPurchase,false);assert.equal(eligibility(s,{...s.studioProject,briefId:'welcome'}).canPurchase,false);assert.equal(stockProcurementOpportunity(s).available,true);assert.equal(eligibility(s,project,{allocation:'mixed'}).canPurchase,false);assert.deepEqual(s,before);
});
