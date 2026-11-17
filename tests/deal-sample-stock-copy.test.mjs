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
