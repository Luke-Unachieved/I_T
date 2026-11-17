import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {developmentView} from '../src/deal-room-development.js';
import {stockProcurementView,stockProcurementInvite,stockStudioOption} from '../src/deal-room-stock-view.js';
import {createDealRoom,reduceDealRoom,normalizeDealRoom} from '../src/deal-room-engine.js';
const act=(s,type,x={})=>reduceDealRoom(s,{type,...x});
const ready=()=>JSON.parse(fs.readFileSync(new URL('./fixtures/deal-group-day169-actions.json',import.meta.url))).reduce((s,a)=>reduceDealRoom(s,a),createDealRoom());
test('sample proposal states cost, expected earnings and buyer decision without promising orders',()=>{
 for(const selected of ['studio','line']){const s={cash:5000,productDevelopment:{status:'draft'}},before=structuredClone(s),html=developmentView(s,selected);
 assert.match(html,/扣除日常开支后预计净赚/);assert.match(html,/还要由买手决定是否下单/);assert.match(html,selected==='studio'?/合计 ¥2520/:/合计 ¥1890/);assert.doesNotMatch(html,/没有订单保底/);assert.deepEqual(s,before);}
});
test('standard sample is not incorrectly described as dimmable and existing orders still apply',()=>{
 const s={contracts:[],productDevelopment:{status:'active',factory:'line'}},before=structuredClone(s),html=developmentView(s);
 assert.match(html,/亮度固定，180 盏起订/);assert.match(html,/旧订单仍照原样交付/);assert.doesNotMatch(html,/新订单可以选调光灯|低成本不能套/);assert.deepEqual(s,before);
});
test('stock preview never says draft inventory has already been paid for',()=>{
 let s=act(act(ready(),'CLOSE_STUDIO_PROJECT'),'OPEN_STOCK_PROCUREMENT');const before=structuredClone(s),html=stockProcurementView(s,'batch');
 assert.match(html,/另外 48 盏将留在仓库/);assert.match(html,/还需寻找买家/);assert.match(html,/预计收款/);assert.doesNotMatch(html,/已由你支付|不算收入/);assert.deepEqual(s,before);assert.deepEqual(normalizeDealRoom(s),s);
});
test('paid inventory remains explicitly unsold and its exact reservation is visible on the next order',()=>{
 let s=act(act(ready(),'CLOSE_STUDIO_PROJECT'),'OPEN_STOCK_PROCUREMENT');s=act(s,'SIGN_STOCK_PROCUREMENT',{factoryMode:'batch'});s=act(s,'FULFIL_STOCK_PROCUREMENT');
 const before=structuredClone(s),html=stockProcurementView(s)+stockProcurementInvite(s);assert.match(html,/48 盏/);assert.match(html,/尚未售出/);assert.match(html,/成本 ¥2,160/);assert.doesNotMatch(html,/余货不是利润|未售不是收入/);assert.deepEqual(s,before);
 s=act(s,'CLOSE_STOCK_PROCUREMENT');s=act(s,'OPEN_STUDIO_PROJECT',{direction:'independent'});s=act(s,'REVISE_STUDIO_PROJECT');s=act(s,'SET_STUDIO_PROJECT',{field:'lampVersion',value:'developed'});s=act(s,'REVIEW_STUDIO_PROJECT');
 const prior=structuredClone(s),option=stockStudioOption(s);assert.match(option,/库存灯具 40 盏，成本 ¥1,800/);assert.match(option,/另付 ¥1,280/);assert.match(option,/接单后为这笔订单预留 40 盏/);assert.deepEqual(s,prior);assert.deepEqual(normalizeDealRoom(s),s);
});

test('stock cash shown before signing equals actual reducer, not future receipts',()=>{
 const s=act(act(ready(),'CLOSE_STUDIO_PROJECT'),'OPEN_STOCK_PROCUREMENT');
 for(const [factoryMode,pay,after] of [['small','720','64,600'],['batch','2,700','62,620']]){
  const html=stockProcurementView(s,factoryMode),signed=act(s,'SIGN_STOCK_PROCUREMENT',{factoryMode});
  assert.ok(html.includes(`现在要付</small><strong>¥${pay}`));
  assert.ok(html.includes(`签完还剩 ¥${after}`));
  assert.equal(signed.cash.toLocaleString('zh-CN'),after);
 }
 const poor={...s,cash:700};assert.match(stockProcurementView(poor,'small'),/现金还差 ¥20/);assert.doesNotMatch(stockProcurementView(poor,'small'),/签完还剩 ¥-/);
});
test('inventory order upfront cash excludes previously paid stock without erasing its profit cost',()=>{
 let s=act(act(ready(),'CLOSE_STUDIO_PROJECT'),'OPEN_STOCK_PROCUREMENT');s=act(s,'SIGN_STOCK_PROCUREMENT',{factoryMode:'batch'});s=act(s,'FULFIL_STOCK_PROCUREMENT');s=act(s,'CLOSE_STOCK_PROCUREMENT');s=act(s,'OPEN_STUDIO_PROJECT',{direction:'independent'});s=act(s,'REVISE_STUDIO_PROJECT');s=act(s,'SET_STUDIO_PROJECT',{field:'lampVersion',value:'developed'});s=act(s,'REVIEW_STUDIO_PROJECT');
 const before=structuredClone(s),html=stockStudioOption(s);
 assert.match(html,/客户先付定金<\/small><strong>¥2,580/);assert.match(html,/现在另付<\/small><strong>¥1,280/);assert.match(html,/签完还剩<\/small><strong>¥64,700/);assert.match(html,/成本 ¥1,800/);assert.deepEqual(s,before);
 assert.equal(act(s,'SIGN_STUDIO_PROJECT_FROM_STOCK').cash,64700);
});

test('stock route title explicitly identifies it as the second alternative',()=>{const source=fs.readFileSync(new URL('../src/deal-room-studio-project-view.js',import.meta.url),'utf8');assert.match(source,/方案一 · 全部重新制作/);assert.ok(source.indexOf('data-action="SIGN_STUDIO_PROJECT_ORDER"')<source.lastIndexOf('stockStudioOption(state)'));});
