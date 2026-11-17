import test from 'node:test';import assert from 'node:assert/strict';
import {createGroupUseLedger as create,previewGroupUse as preview,reduceGroupUseLedger as reduce} from '../src/group-use-ledger-experiment.js';
const lot={status:'paid',purpose:'studio-project',studioDirection:'group',agreement:'private',referrerId:'mira',deliveryDay:155,studioBrief:'bedside',lampVersion:'developed',quantity:60,allocationVersion:1,allocation:{bedside:40,welcome:20},productQuantities:{mira:40,samir:60,ines:20},products:['mira','samir','ines']};
const world=()=>({day:169,cash:65320,caseGrowthHistory:[structuredClone(lot)]});
const options={referrerId:'mira',readingTarget:8};
test('real mixed delivery persists by location, not consumption rate or generic sales',()=>{
 const s=world(),m=create(s,options);assert.deepEqual(m.rooms,{mira:40,samir:40,ines:0});assert.deepEqual(m.tea,{mira:0,samir:20,ines:20});assert.deepEqual(create({...s,day:9999},options),m);
 for(const extra of [{...lot,purpose:'ordinary'},{...lot,status:'production'},{...lot,referrerId:'other'},{...lot,productQuantities:{mira:60,samir:60,ines:60}}])assert.deepEqual(create({...s,caseGrowthHistory:[lot,extra]},options),m);
 assert.equal(create({...s,caseGrowthHistory:[]},options),null);
});
test('draft can withdraw; agreed temporary move and return conserve every product without changing world',()=>{
 const s=world(),before=structuredClone(s),initial=create(s,options);let m=reduce(initial,{type:'PROPOSE_GROUP_USE',quantity:8});assert.equal(m.draft.roomLampsAfter,32);assert.equal(m.draft.readingShortfallAfter,0);assert.deepEqual(m.rooms,initial.rooms);
 m=reduce(m,{type:'WITHDRAW_GROUP_USE'});assert.equal(m.draft,null);m=reduce(m,{type:'PROPOSE_GROUP_USE',quantity:8});m=reduce(m,{type:'CONFIRM_GROUP_USE'});assert.equal(m.rooms.mira,32);assert.equal(m.publicReading.mira,8);assert.deepEqual(m.totals,initial.totals);assert.equal(reduce(m,{type:'CONFIRM_GROUP_USE'}),m);
 m=reduce(m,{type:'RETURN_GROUP_LAMPS'});assert.equal(m.rooms.mira,40);assert.equal(m.publicReading.mira,0);assert.equal(reduce(m,{type:'RETURN_GROUP_LAMPS'}),m);assert.deepEqual(s,before);assert.equal('cash' in m,false);assert.equal('day' in m,false);
});
test('unsupported model, missing lamps and excessive or fractional movement fail; keeping rooms has no penalty',()=>{
 const m=create(world(),options);for(const q of [0,-1,1.5,9,100])assert.equal(preview(m,q).valid,false);
 const standard=create({...world(),caseGrowthHistory:[{...lot,lampVersion:'standard'}]},options);assert.equal(preview(standard,1).valid,false);
 const kept=reduce(m,{type:'KEEP_GROUP_ROOMS'});assert.deepEqual(kept.rooms,m.rooms);assert.deepEqual(kept.publicReading,m.publicReading);assert.equal(reduce(kept,{type:'CONFIRM_GROUP_USE'}),kept);
});
