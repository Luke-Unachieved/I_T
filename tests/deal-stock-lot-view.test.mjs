import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createDealRoom,reduceDealRoom as reduce} from '../src/deal-room-engine.js';
import {stockProcurementView as view,stockProcurementInvite as invite} from '../src/deal-room-stock-view.js';

const actions=JSON.parse(readFileSync(new URL('./fixtures/deal-group-day169-actions.json',import.meta.url)));
const act=(s,type,extra={})=>{const n=reduce(s,{type,...extra});assert.notEqual(n,s,type);return n;};
const draft=()=>act(act(actions.reduce(reduce,createDealRoom()),'CLOSE_STUDIO_PROJECT'),'OPEN_STOCK_PROCUREMENT');
function fulfil(mode){return act(act(draft(),'SIGN_STOCK_PROCUREMENT',{factoryMode:mode}),'FULFIL_STOCK_PROCUREMENT');}

test('real purchase options compare unit quotes and profit on twelve confirmed lamps, not on sixty',()=>{
 const s=draft(), before=structuredClone(s);
 for(const selected of ['small','batch']){
  const h=view(s,selected);
  assert.match(h,/工厂每盏 ¥60 · 先付 ¥720/);assert.match(h,/预计净赚 ¥60；没有余货/);
  assert.match(h,/工厂每盏 ¥45 · 先付 ¥2,700/);assert.match(h,/预计净赚 ¥240；另有 48 盏待售/);
 }
 assert.deepEqual(s,before);
});

test('batch receipt separates confirmed sale margin, lot cash movement and unsold stock; small batch has none',()=>{
 const s=fulfil('batch'),h=view(s);
 assert.match(h,/净赚 ¥240/);assert.match(h,/现金变化 −¥1,920/);assert.match(h,/这批 60 盏的去向/);
 assert.match(h,/集团阅读位已收 12 盏/);assert.match(h,/工作室还有 48 盏，成本 ¥2,160，尚未售出/);
 const small=fulfil('small');assert.match(view(small),/净赚 ¥60/);assert.match(view(small),/这批 12 盏的去向/);
 assert.match(view(small),/仓库没有可分配的现货/);assert.doesNotMatch(invite(small),/已预留|小店陈列|随组合订单/);
});

test('store display, agreed sale, return and actual reserved order stay distinct in the same factory lot',()=>{
 let s=act(fulfil('batch'),'CLOSE_STOCK_PROCUREMENT');
 s=act(act(s,'OPEN_SHOP_TRIAL'),'SIGN_SHOP_TRIAL',{terms:'regular'});
 assert.match(invite(s),/小店陈列中 12 盏，尚未结算/);assert.match(invite(s),/工作室还有 36 盏/);
 assert.doesNotMatch(invite(s),/小店已买下/);
 s=act(act(s,'SETTLE_SHOP_TRIAL'),'CLOSE_SHOP_TRIAL');
 assert.match(invite(s),/小店已买下 8 盏（另有 4 盏已退回）/);assert.match(invite(s),/工作室还有 40 盏/);
 s=act(s,'OPEN_STUDIO_PROJECT',{direction:'independent'});s=act(s,'REVISE_STUDIO_PROJECT');
 s=act(s,'SET_STUDIO_PROJECT',{field:'lampVersion',value:'developed'});s=act(s,'REVIEW_STUDIO_PROJECT');
 s=act(s,'SIGN_STUDIO_PROJECT_FROM_STOCK');const before=structuredClone(s);
 assert.match(invite(s),/组合订单已预留 40 盏，尚未交付/);assert.match(invite(s),/仓库没有可分配的现货/);
 assert.doesNotMatch(invite(s),/随组合订单已交付|已全部售出/);assert.deepEqual(s,before);
 s=act(act(s,'FULFIL_CASE_GROWTH'),'CLOSE_CASE_GROWTH');
 s=act(s,'OPEN_STOCK_PROCUREMENT');const receipt=view(s);
 assert.match(receipt,/随组合订单已交付 40 盏/);assert.match(receipt,/小店已买下 8 盏/);
 assert.doesNotMatch(receipt,/组合订单已预留|陈列中|已全部售出/);
});
