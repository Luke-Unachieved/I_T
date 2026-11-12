import test from 'node:test';
import assert from 'node:assert/strict';
import {deliveryMilestone} from '../src/delivery-stories.js';
import {createGame,reduce,offers,parseSave,recentDeliveryForInquiry} from '../src/engine.js';
const act=(s,type,id)=>{const r=reduce(s,{type,id});assert.ok(r.changed,r.message);return r.state;};
function settled(stage='employee',factory='steady'){
 let s=createGame('成长记录');s.stage=stage;s.cash=30000;
 if(stage==='founder'){s.completed=3;s.story.focus='brand';}
 const o=offers(s)[0];s=act(s,'accept',o.id);s=act(s,'tactic',o.need);s=act(s,'factory',factory);
 return act(s,'ship','normal');
}
test('delivery milestones use exact real counts and do not claim a career ending',()=>{
 for(const completed of [1,3])assert.ok(deliveryMilestone({stage:'employee',completed,qualityPoints:2,planPoints:2}));
 for(const completed of [0,2,4,10])assert.equal(deliveryMilestone({stage:'employee',completed}), '');
 for(const startupOrders of [1,3,6,10]){
  const line=deliveryMilestone({stage:'founder',completed:startupOrders+3,startupOrders,qualityPoints:2,planPoints:2});
  assert.ok(line);assert.doesNotMatch(line,/通关|终章达成|额外|奖励|客人都|全部满意/);
 }
 for(const startupOrders of [undefined,-1,0,2,4,7,11,1.5,NaN])assert.equal(deliveryMilestone({stage:'founder',completed:20,startupOrders}),'');
 assert.equal(deliveryMilestone({stage:'founder',completed:0,startupOrders:1}),'');
});
test('milestone recognition does not hide defects or unmet customer priorities',()=>{
 const input={stage:'founder',completed:4,startupOrders:1,qualityPoints:-1,planPoints:1};
 assert.match(deliveryMilestone(input),/尚待跟进的瑕疵/);
 assert.match(deliveryMilestone({...input,qualityPoints:2}),/尚未回应到的客户顾虑/);
 for(const stage of ['employee','founder'])for(const qualityPoints of [-1,1,2,3]){
  const text=deliveryMilestone({...input,stage,completed:1,qualityPoints});assert.ok(text.length<300);
  assert.doesNotMatch(text,/恋爱|加班|全员|参加庆功|永久客户|[¥￥]/);
 }
});
test('new delivery snapshots preserve growth text and old snapshots gain nothing retroactively',()=>{
 for(const stage of ['employee','founder']){
  const s=settled(stage),record=structuredClone(s.lastDelivery);assert.ok(record.story.milestone);
  assert.ok(s.logs[0].text.includes(record.story.milestone));assert.deepEqual(parseSave(JSON.stringify(s)),s);
  const later=act(act(s,'evening'),'rest');assert.deepEqual(later.lastDelivery,record);
  const old=structuredClone(s);delete old.lastDelivery.story.milestone;
  assert.equal(parseSave(JSON.stringify(old)).lastDelivery.story.milestone,undefined);
  assert.deepEqual(reduce(s,{type:'ship',id:'normal'}).state,s);
 }
});
test('malformed optional milestone snapshots fail import',()=>{
 for(const milestone of ['',null,7,{},'x'.repeat(301)]){
  const s=settled();s.lastDelivery.story.milestone=milestone;assert.throws(()=>parseSave(JSON.stringify(s)),/成长记录/);
 }
});
test('previous inquiry recap requires the same customer product and business stage',()=>{
 const s=settled(),r=s.lastDelivery,offer={buyer:r.buyer,product:r.product};
 const before=JSON.stringify(s);assert.equal(recentDeliveryForInquiry(s,offer),r);
 for(const candidate of [null,{...offer,buyer:'Another'},{...offer,product:'handle'}])assert.equal(recentDeliveryForInquiry(s,candidate),null);
 assert.equal(recentDeliveryForInquiry({...s,stage:'founder'},offer),null);
 assert.equal(recentDeliveryForInquiry({...s,lastDelivery:null},offer),null);
 assert.equal(JSON.stringify(s),before);
});
test('milestone content stays deterministic and does not add rewards or mutate inputs',()=>{
 const input=Object.freeze({stage:'founder',completed:13,startupOrders:10,qualityPoints:3,planPoints:3});
 assert.equal(deliveryMilestone(input),deliveryMilestone(input));
 for(const stage of ['employee','founder']){
  const s=settled(stage);assert.equal(s.story.finale,null);assert.deepEqual(s.relations,createGame().relations);
  assert.equal(s.lastDelivery.gain,stage==='employee'?Math.floor(s.lastDelivery.profit*.3):s.lastDelivery.profit);
 }
});
