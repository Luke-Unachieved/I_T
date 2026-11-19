import test from 'node:test';
import assert from 'node:assert/strict';
import {warehouseView,bindWarehouse} from '../src/deal-room-warehouse-view.js';
import {warehouseSummary,previewWarehousePurchase,applyWarehouseAction,issueWarehouseStock} from '../src/deal-room-warehouse.js';
const workshop=()=>({phase:'review',day:12,cash:150000,contracts:[{status:'paid'}]});
const buy=(s,n)=>applyWarehouseAction(s,{type:'BUY_WAREHOUSE_STOCK',productId:'tray',source:'stock',boxes:n,revision:warehouseSummary(s).revision});
const wait=s=>applyWarehouseAction(s,{type:'WAIT_WAREHOUSE_STOCK',revision:warehouseSummary(s).revision});
const grow=s=>{const x=warehouseSummary(s);return applyWarehouseAction(s,{type:'EXPAND_WAREHOUSE',target:x.nextTier.capacity,revision:x.revision});};
const icons=(h,k)=>[...h.matchAll(new RegExp('class="wh-bay wh-'+k+'"','g'))].length;
test('ten initial free bays, all incremental fees, no payment before the player confirms',()=>{
 const s=workshop(),old=structuredClone(s),h=warehouseView(s);
 assert.deepEqual(s,old);
 assert.deepEqual(['empty','reserved','stocked'].map(k=>icons(h,k)),[10,0,0]);
 assert.doesNotMatch(h,/仓位已占满|class="wh-carton"|data-wh-wait/);assert.match(h,/初始免费/);
 for(const n of ['¥1,800','¥5,200','¥9,800','¥18,200','¥34,000'])assert.ok(h.includes(n));
 assert.match(h,/付 ¥1,800，扩至 24 箱/);assert.match(h,/data-wh-buy class="wh-strong" disabled/);
 assert.match(h,/付 ¥925，预订 4 箱/);assert.match(h,/预计到仓<\/dt><dd>第 15 天/);assert.match(h,/最晚到货前须留现金<\/dt><dd>¥90/);
});
test('full reservations have a full caption but not one physical carton; arrival and partial FIFO issues follow the real shelf',()=>{
 let s=buy(workshop(),10),h=warehouseView(s);
 assert.match(h,/仓位已占满/);assert.deepEqual(['reserved','stocked','empty'].map(k=>icons(h,k)),[10,0,0]);assert.doesNotMatch(h,/class="wh-carton"/);
 assert.match(h,/已到，可供 0只 · 在途 90只/);
 assert.match(h,/等到第 15 天 · 开支 ¥90/);
 s=wait(s);h=warehouseView(s);assert.equal(icons(h,'stocked'),10);assert.equal(icons(h,'reserved'),0);assert.match(h,/已到，可供 90只 · 在途 0只/);assert.doesNotMatch(h,/data-wh-wait/);
 s=issueWarehouseStock(s,'tray',10,warehouseSummary(s).revision);h=warehouseView(s);
 assert.deepEqual(['stocked','empty'].map(k=>icons(h,k)),[9,1]);assert.match(h,/散箱/);assert.doesNotMatch(h,/仓位已占满/);assert.match(h,/已到，可供 80只/);
});
test('map is bounded and paged at 300 real bays, and unavailable or corrupt states never allow spending',()=>{
 let s=workshop();for(let i=0;i<5;i++)s=grow(s);
 const h=warehouseView(s,{warehouseShelfPage:999});assert.equal(icons(h,'empty'),30);
 assert.match(h,/第 10 \/ 10 区 · 仓位 271–300/);assert.match(h,/已到最大仓容 300 箱/);assert.doesNotMatch(h,/data-wh-expand/);
 assert.doesNotMatch(warehouseView({...s,phase:'fulfilling'}),/data-wh-(?:buy|expand|wait)/);
 assert.match(warehouseView({...s,ordinaryWarehouse:{evil:1}}),/仓库存货记录无效/);
});
test('rechecking an edited quantity is mandatory, and the binder dispatches only canonical revision-guarded intents',()=>{
 let s=workshop(),ui={},calls=[],renders=0,backs=0;
 const handlers={},nodes=new Map(),root={querySelectorAll(){return [];},querySelector(sel){if(!nodes.has(sel))nodes.set(sel,{value:'4',focus(){},addEventListener(evt,fn){handlers[sel+':'+evt]=fn;}});return nodes.get(sel);}};
 const bind=()=>bindWarehouse(root,s,ui,()=>{renders++;},a=>{calls.push(a);s=applyWarehouseAction(s,a);},()=>{backs++;});
 const hit=(sel,evt)=>handlers[sel+':'+evt]({preventDefault(){},currentTarget:root.querySelector(sel)});
 bind();hit('[data-wh-buy]','click');assert.deepEqual(calls,[]);
 hit('[data-wh-form]','submit');assert.ok(!/data-wh-buy class="wh-strong" disabled/.test(warehouseView(s,ui)));
 root.querySelector('#wh-boxes').value='5';hit('#wh-boxes','input');hit('[data-wh-buy]','click');assert.equal(calls.length,0);
 hit('[data-wh-form]','submit');hit('[data-wh-buy]','click');hit('[data-wh-buy]','click');
 assert.deepEqual(calls,[{type:'BUY_WAREHOUSE_STOCK',productId:'tray',source:'stock',boxes:5,revision:0}]);
 assert.equal(warehouseSummary(s).inTransitBoxes,5);
 bind();hit('[data-wh-wait]','click');assert.deepEqual(calls.at(-1),{type:'WAIT_WAREHOUSE_STOCK',revision:1});
 bind();hit('[data-wh-expand]','click');assert.deepEqual(calls.at(-1),{type:'EXPAND_WAREHOUSE',target:24,revision:2});
 bind();hit('[data-warehouse-back]','click');assert.equal(backs,1);assert.ok(renders>=2);
});
test('purchasing shortages show the reducer reason; messages from a save are escaped',()=>{
 const s=workshop(),poor={...s,cash:900,feedback:{kind:'warehouse-arrival',message:'<img src=x onerror="oops">'}};
 const q=previewWarehousePurchase(poor,{productId:'tray',source:'stock',boxes:4,revision:0}),h=warehouseView(poor);
 assert.ok(h.includes(q.reason));assert.doesNotMatch(h,/<img src=x/);assert.ok(h.includes('&lt;img src=x'));
});
