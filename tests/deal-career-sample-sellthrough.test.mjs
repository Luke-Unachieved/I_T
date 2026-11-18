import test from 'node:test';
import assert from 'node:assert/strict';
import {createDealRoom,reduceDealRoom,previewOffer} from '../src/deal-room-engine.js';
import {careerProjects,openProductReorder} from '../src/deal-room-career-focus.js';
const act=(s,type,p={})=>{const n=reduceDealRoom(s,{type,...p});assert.notEqual(n,s,type+' '+s.phase);return n;};
const finish=(s,id)=>act(act(act(s,'PROPOSE',{optionId:id}),'ADVANCE'),'NEXT_CLIENT'),who=(s,clientId)=>act(s,'SELECT_CLIENT',{clientId});

test('a paid old shelf blocks both new samples until the actual replenishment day; a stale direct link does not start an empty round',()=>{
 let b=['trial','ready','season'].reduce(finish,createDealRoom());b=act(b,'CONTINUE_BUSINESS');
 for(let i=0;i<2;i++)b=finish(who(b,'mira'),'repeat-small');
 b=act(b,'START_SUPPLY_PLAN',{clientId:'mira',firstBatch:'small',payment:'delivery'});b=act(b,'FULFIL_SUPPLY_PLAN');b=act(b,'START_RETAIL_PLANNING');b=act(b,'CONTINUE_RETAIL_BUSINESS');b=finish(who(b,'mira'),'repeat-scale');b=finish(who(b,'ines'),'repeat-small');
 for(const [factory,day,remaining,quantity] of [['line',41,70,180],['studio',42,62,60]]){
  let s=act(b,'START_DEVELOPMENT');s=act(s,'COMMISSION_SAMPLE',{factory});s=act(act(s,'RECEIVE_SAMPLE'),'ACCEPT_SAMPLE');assert.equal(s.day,day);
  const card=careerProjects(s).find(p=>p.id==='product');assert.ok(card.step.includes(remaining+' 盏灯'));assert.ok(card.step.includes('第 50 天'));assert.equal(card.actions.some(a=>a.type==='OPEN_PRODUCT_REORDER'),false);
  const direct=openProductReorder(s,factory);assert.equal(direct.state,s);assert.equal(direct.selected,'');
  const choose=card.actions.find(a=>a.type==='CONTINUE_RETAIL_BUSINESS');assert.ok(choose);const desk=act(s,choose.type);assert.equal(desk.phase,'portfolio');assert.equal(desk.day,s.day);assert.equal(desk.cash,s.cash);
  const ready=act(desk,'WAIT_FOR_BUYER',{clientId:'mira'});assert.equal(ready.day,50);
  const atBuyer=who(ready,'mira'),q=previewOffer(atBuyer,'developed-lamp');assert.equal(q.valid,true);assert.equal(q.quantity,quantity);assert.equal(q.specification,'developed-'+factory);
 }
});
