import test from 'node:test';
import assert from 'node:assert/strict';
import {PEOPLE, PRODUCTS, FACTORIES, SHIPMENTS} from '../src/content.js';
import {deliveryStory} from '../src/delivery-stories.js';

const input=overrides=>({product:'hinge',need:'quality',shipmentId:'normal',factoryId:'steady',qualityPoints:2,planPoints:2,stage:'employee',focus:null,operations:null,staffIds:[],completed:1,...overrides});
const story=overrides=>deliveryStory(input(overrides));
const textOf=result=>Object.values(result).join('');

test('all current products have concrete, distinct use after delivery',()=>{
 assert.deepEqual(PRODUCTS.map(p=>p.id),['hinge','tool','handle']);
 const results=PRODUCTS.map(p=>story({product:p.id}));
 assert.match(results[0].customer,/合页.*柜门/);
 assert.match(results[1].customer,/工具套装.*握柄/);
 assert.match(results[2].customer,/门把手.*拉丝/);
 assert.equal(new Set(results.map(r=>r.customer)).size,PRODUCTS.length);
});

test('negative quality always reports cosmetic defects, even with contradictory inspection inputs',()=>{
 for(const product of PRODUCTS)for(const shipment of SHIPMENTS){
  const result=story({product:product.id,shipmentId:shipment.id,qualityPoints:-1,factoryId:'value'});
  assert.match(result.customer,/轻微外观瑕疵/);
  assert.doesNotMatch(result.customer,/很稳|顺手|颜色很一致|声音很轻|仔细我看到了|完全满意/);
  assert.doesNotMatch(result.team,/核查的评价|这回对得上/);
 }
});

test('inspection improvement at the new factory is visible without overstating quality',()=>{
 const flawed=story({factoryId:'value',qualityPoints:-1});
 const inspected=story({factoryId:'value',shipmentId:'qc',qualityPoints:1});
 assert.match(flawed.customer,/轻微外观瑕疵/);
 assert.match(inspected.customer,/出货前补了外观复核/);
 assert.doesNotMatch(inspected.customer,/轻微外观瑕疵|仔细我看到了|完全满意/);
 assert.notEqual(flawed.customer,inspected.customer);
});

test('only high quality backed by an actual inspection earns inspection praise',()=>{
 assert.match(story({shipmentId:'qc',qualityPoints:3}).customer,/核查记录.*仔细我看到了/);
 assert.doesNotMatch(story({shipmentId:'normal',qualityPoints:2}).customer,/核查记录|仔细我看到了/);
 assert.doesNotMatch(story({shipmentId:'qc',qualityPoints:1}).customer,/仔细我看到了/);
 assert.match(story({stage:'founder',staffIds:['xia'],qualityPoints:3}).customer,/核查记录/);
 assert.doesNotMatch(story({stage:'founder',staffIds:['zhou'],qualityPoints:2}).customer,/核查记录/);
});

test('urgent delivery separates agreed schedules from paid early shipment',()=>{
 for(const shipmentId of ['normal','qc']){
  const result=story({product:'handle',need:'speed',shipmentId,qualityPoints:3});
  assert.match(result.customer,/急用部分按约定排期到货/);
  assert.doesNotMatch(textOf(result),/提前|先到了/);
 }
 const express=story({product:'handle',need:'speed',shipmentId:'express'});
 assert.match(express.customer,/急用部分提前到了/);
 const unresolved=story({need:'speed',shipmentId:'normal',planPoints:1});
 assert.match(unresolved.customer,/急用部分的安排还没完全解决/);
 assert.doesNotMatch(unresolved.customer,/提前/);
});

test('unmatched priorities remain visible and alternate terms are not mistaken for failure',()=>{
 const patterns={quality:/批次标准还需要说清楚/,price:/预算压力还在/,speed:/安排还没完全解决/};
 for(const need of Object.keys(patterns)){
  assert.match(story({need,planPoints:1}).customer,patterns[need]);
  assert.doesNotMatch(story({need,planPoints:2,stage:'founder'}).customer,patterns[need]);
 }
 assert.doesNotMatch(story({stage:'founder',planPoints:2}).customer,/简洁包装|展示样品|拆批费用/);
});

test('founders without employees do not turn remote friends into staff',()=>{
 for(const staffIds of [[],['shen','lu'],['unknown']])for(const operations of [null,'team','network']){
  const result=story({stage:'founder',staffIds,operations,focus:'brand'});
  assert.match(result.team,/工作室/);
  for(const person of PEOPLE)assert.ok(!result.team.includes(person.name));
  if(operations==='team')assert.match(result.team,/仍由你自己填完/);
  if(operations==='network')assert.match(result.team,/外部协作/);
 }
});

test('founder dialogue is restricted to actually hired recruitable coworkers',()=>{
 for(const hired of PEOPLE.filter(p=>p.recruit))for(const need of ['quality','price','speed']){
  const result=story({stage:'founder',staffIds:[hired.id],need});
  assert.match(result.team,new RegExp(hired.name));
  for(const other of PEOPLE.filter(p=>p.id!==hired.id))assert.ok(!result.team.includes(other.name));
 }
 const result=story({stage:'founder',staffIds:['zhou','xia'],shipmentId:'qc',qualityPoints:3});
 assert.match(result.team,/林知夏/);
 assert.match(story({stage:'founder',staffIds:['zhou'],operations:'team'}).team,/已有分工/);
});

test('employee echoes use existing colleagues without founder titles or romantic escalation',()=>{
 for(const need of ['quality','price','speed']){
  const result=story({need,focus:'brand',operations:'team'});
  assert.ok(PEOPLE.some(p=>p.recruit&&result.team.includes(p.name)));
  assert.doesNotMatch(textOf(result),/老板|工作室|自家品牌|恋爱|约会|牵手|亲吻/);
 }
 assert.deepEqual(story({gender:'male'}),story({gender:'female'}));
});

test('founder directions reflect the chosen business without inventing rewards',()=>{
 const boutique=story({stage:'founder',focus:'boutique'});
 const brand=story({stage:'founder',focus:'brand'});
 assert.match(boutique.team,/精品交付档案/);
 assert.match(brand.team,/自家品牌的样册/);
 assert.notEqual(boutique.team,brand.team);
 assert.match(story({stage:'founder',focus:'brand',qualityPoints:-1}).team,/待改的外观细节/);
 for(const result of [boutique,brand])assert.doesNotMatch(textOf(result),/[¥￥+\d]|口碑|利润|收入|奖励|返单邮件/);
});

test('delivery stories are deterministic, do not mutate frozen inputs, and return fresh objects',()=>{
 const source=input({stage:'founder',staffIds:['xia','zhou','tang'],focus:'boutique',operations:'team',completed:12});
 const before=structuredClone(source);
 Object.freeze(source.staffIds);Object.freeze(source);
 const first=deliveryStory(source),second=deliveryStory(source);
 assert.deepEqual(first,second);
 assert.notEqual(first,second);
 assert.deepEqual(source,before);
 first.customer='changed by caller';
 assert.deepEqual(deliveryStory(source),second);
 assert.notEqual(story({completed:1}).customer,story({completed:2}).customer);
 assert.deepEqual(story({completed:1}),story({completed:3}));
});

test('all supported combinations stay short, textual, and reward-free',()=>{
 const rosters=[[],['xia'],['zhou'],['tang'],['xia','zhou','tang']];
 for(const product of PRODUCTS)for(const need of ['quality','price','speed'])
 for(const shipment of SHIPMENTS)for(const factory of FACTORIES)
 for(const qualityPoints of [-1,0,1,2,3])for(const planPoints of [1,2,3])
 for(const stage of ['employee','founder'])for(const focus of [null,'boutique','brand'])
 for(const operations of [null,'team','network'])for(const staffIds of rosters)
 for(const completed of [1,2]){
  const result=story({product:product.id,need,shipmentId:shipment.id,factoryId:factory.id,qualityPoints,planPoints,stage,focus,operations,staffIds,completed});
  assert.deepEqual(Object.keys(result),['title','customer','team']);
  for(const [key,max] of [['title',20],['customer',120],['team',100]]){
   assert.equal(typeof result[key],'string');
   assert.ok(result[key].length>0&&Array.from(result[key]).length<=max,`${key}: ${result[key]}`);
   assert.doesNotMatch(result[key],/undefined|NaN|[¥￥+\d]|口碑|利润|收入|奖励|恋爱|约会|牵手|亲吻/);
  }
 }
});

test('missing or unknown optional data has a stable plain-text fallback',()=>{
 assert.deepEqual(deliveryStory(),deliveryStory({}));
 const result=story({product:'<untrusted>',completed:NaN,staffIds:null,stage:'founder',qualityPoints:NaN});
 assert.match(result.customer,/这批货已收到/);
 assert.match(result.team,/工作室/);
 assert.doesNotMatch(textOf(result),/<untrusted>|NaN/);
});
