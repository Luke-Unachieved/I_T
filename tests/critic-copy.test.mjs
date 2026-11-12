import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,reduce,offers} from '../src/engine.js';
import {deliveryStory} from '../src/delivery-stories.js';
import {WORK_STORIES} from '../src/relationships.js';
test('checked quality reply gives one verification acknowledgement',()=>{
 const r=deliveryStory({product:'hinge',need:'quality',shipmentId:'qc',factoryId:'steady',qualityPoints:3,planPoints:2,stage:'employee',completed:1});
 assert.match(r.customer,/核查记录/);assert.doesNotMatch(r.customer,/这次的核对有了依据/);
});
test('new factory selection explains the pending quality decision without altering economics',()=>{
 let s=createGame();s=reduce(s,{type:'accept',id:offers(s)[0].id}).state;s=reduce(s,{type:'tactic',id:'quality'}).state;
 const r=reduce(s,{type:'factory',id:'value'});assert.match(r.message,/品质还待核查.*验货后出运/);assert.doesNotMatch(r.message,/样品已确认/);assert.equal(r.state.cash,s.cash);assert.equal(r.state.ap,s.ap-1);assert.equal(r.state.active.factory,'value');
 assert.match(reduce(s,{type:'factory',id:'steady'}).message,/样品已确认/);
});
test('generic Xia work scene does not invent inspection history',()=>{
 const s=WORK_STORIES.find(s=>s.id==='xia_small_details');assert.ok(s);assert.doesNotMatch(JSON.stringify(s),/复检|检查过|一起检查/);assert.match(s.office,/包装标记/);
});
