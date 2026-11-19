import test from 'node:test';
import assert from 'node:assert/strict';
import {WAREHOUSE_TIERS,WAREHOUSE_ACTION_KEYS,warehouseAvailable,warehouseSummary,previewWarehousePurchase,previewWarehouseWait,previewWarehouseExpansion,canonicalWarehouseAction,applyWarehouseAction,previewWarehouseIssue,issueWarehouseStock} from '../src/deal-room-warehouse.js';
import {MARKET_PRODUCTS} from '../src/deal-room-market-data.js';
const home=()=>({phase:'review',cash:150000,day:12,contracts:[{status:'paid'}],history:[],stockProcurement:{remaining:22,unitCost:45}});
const buy=(revision=0,boxes=4,source='stock',productId='tray')=>({type:'BUY_WAREHOUSE_STOCK',productId,source,boxes,revision});
const expand=(target,revision)=>({type:'EXPAND_WAREHOUSE',target,revision});
const wait=revision=>({type:'WAIT_WAREHOUSE_STOCK',revision});
const r=applyWarehouseAction;
test('legacy saves derive a free empty warehouse without changing any saved fields or bespoke stock',()=>{
 const s=home(), old=structuredClone(s);const v=warehouseSummary(s);assert.deepEqual(s,old);assert.equal(Object.hasOwn(s,'ordinaryWarehouse'),false);
 assert.deepEqual([v.capacity,v.usedBoxes,v.freeBoxes,v.items.length,v.revision],[10,0,10,0,0]);assert.deepEqual(v.nextTier,{capacity:24,price:1800});assert.equal(previewWarehouseIssue(s,'tray',1).valid,false);
});
test('exact one-way incremental prices; stale double-clicks, skips and downgrades are no-ops',()=>{
 let s=home();assert.equal(r(s,expand(60,0)),s);const start=s.cash;
 assert.deepEqual(WAREHOUSE_TIERS.map(t=>[t.capacity,t.price]),[[10,0],[24,1800],[60,5200],[100,9800],[180,18200],[300,34000]]);
 for(const [i,t] of WAREHOUSE_TIERS.slice(1).entries()){
  const a=expand(t.capacity,i),v=previewWarehouseExpansion(s,a);assert.equal(v.price,t.price);const old=s;s=r(s,a);assert.equal(s.cash,old.cash-t.price);assert.notEqual(old,s);assert.equal(r(s,a),s);assert.equal(r(s,expand(10,i+1)),s);
 }
 const v=warehouseSummary(s);assert.equal(v.expansionSpend,69000);assert.equal(start-s.cash,69000);assert.equal(v.capacity,300);assert.equal(v.nextTier,null);assert.equal(v.usedBoxes,0);
});
test('paid purchase prices include freight; reserve spaces while inbound with no premature or phantom stock',()=>{
 const s=home(),a=buy(),q=previewWarehousePurchase(s,a);assert.deepEqual([q.valid,q.quantity,q.packSize,q.goodsCost,q.freight,q.cost,q.arrivalDay,q.operatingReserve],[true,36,9,864,61,925,15,90]);
 const n=r(s,a),summary=warehouseSummary(n);
 assert.equal(n.cash,s.cash-925);assert.deepEqual([n.day,summary.usedBoxes,summary.onHandBoxes,summary.inTransitBoxes,summary.freeBoxes],[12,4,0,4,6]);
 assert.equal(summary.items[0].onHand,0);assert.equal(summary.items[0].inTransit,36);assert.equal(r(n,a),n);assert.equal(warehouseSummary(s).usedBoxes,0);
 assert.equal(previewWarehouseIssue(n,'tray',1).valid,false);assert.deepEqual(n.stockProcurement,s.stockProcurement);
 assert.equal(r(n,buy(1,7)),n);assert.equal(r(n,buy(1,3)),n);assert.equal(warehouseSummary(r(n,buy(1,6))).freeBoxes,0);
});
test('waiting pays only elapsed days once, moves goods from reserved to physical, and earns nothing',()=>{
 const s=r(home(),buy()),q=previewWarehouseWait(s),a=wait(q.revision),n=r(s,a);
 assert.deepEqual([q.days,q.operatingCost,n.day,n.cash],[3,90,15,s.cash-90]);
 assert.deepEqual([warehouseSummary(n).onHandBoxes,warehouseSummary(n).inTransitBoxes,warehouseSummary(n).items[0].onHand],[4,0,36]);
 assert.equal(r(n,a),n);assert.equal(r(n,wait(2)),n);const otherDay={...s,day:16};assert.equal(warehouseSummary(otherDay).items[0].onHand,36);assert.equal(r(otherDay,wait(1)),otherDay);
});
test('partial FIFO issues account for every yuan of landed cost without a second cash debit',()=>{
 let s=r(r(home(),buy()),wait(1));const day=s.day,cash=s.cash;
 const q=previewWarehouseIssue(s,'tray',5);assert.deepEqual([q.bookCost,q.freedBoxes],[128,0]);assert.equal(issueWarehouseStock(s,'tray',5,0),s);
 const n=issueWarehouseStock(s,'tray',5,2);assert.equal(n.cash,cash);assert.equal(n.day,day);assert.equal(warehouseSummary(n).usedBoxes,4);
 assert.equal(issueWarehouseStock(n,'tray',5,2),n);const partial=previewWarehouseIssue(n,'tray',5);assert.equal(partial.freedBoxes,1);
 const o=issueWarehouseStock(n,'tray',5,3),z=issueWarehouseStock(o,'tray',26,4),v=warehouseSummary(z);
 assert.deepEqual([v.usedBoxes,v.issuedQuantity,v.issuedCost,v.inventoryCost,z.cash],[0,36,925,0,cash]);
 assert.deepEqual(z.stockProcurement,home().stockProcurement);assert.equal(previewWarehouseIssue(z,'tray',1).valid,false);
});
test('different packing sizes cannot mint space; FIFO means actual arrival order, not purchase order',()=>{
 let s=home();s=r(s,buy(0,6,'factory'));s=r(s,buy(1,4));let v=warehouseSummary(s);assert.deepEqual([v.inTransitBoxes,v.nextArrivalDay,v.lastArrivalDay],[10,15,20]);
 s=r(s,wait(2));v=warehouseSummary(s);assert.deepEqual([v.onHandBoxes,v.inTransitBoxes,v.nextArrivalDay],[4,6,20]);assert.equal(previewWarehouseIssue(s,'tray',37).valid,false);
 s=r(s,wait(3));const q=previewWarehouseIssue(s,'tray',45);assert.deepEqual(q.allocations.map(x=>[x.lotId,x.quantity]),[[2,36],[1,9]]);
 s=issueWarehouseStock(s,'tray',45,q.revision);v=warehouseSummary(s);assert.deepEqual([v.onHandBoxes,v.freeBoxes,v.items[0].onHand],[6,4,111]);assert.equal(v.issuedCost+v.inventoryCost,v.purchaseSpend);
});
test('no debt/skip: upfront price, running reserve, existing inbound commitments and current phase',()=>{
 const low={...home(),cash:1014};assert.equal(r(low,buy()),low);const exact={...home(),cash:1015},n=r(exact,buy());assert.equal(n.cash,90);assert.equal(r(n,wait(1)).cash,0);
 const hold=r({...home(),cash:2800},buy());assert.equal(r(hold,expand(24,1)),hold);
 for(const s of [{...home(),phase:'receivable'},{...home(),phase:'market',market:{status:'transit'}},{...home(),contracts:[{status:'paid'},{status:'production'}]},{...home(),contracts:[]},{...home(),day:0},{...home(),cash:-1}]){assert.equal(warehouseAvailable(s),false);assert.equal(r(s,buy()),s);}
 for(const s of [home(),{...home(),phase:'complete'},{...home(),phase:'market',market:{status:'draft'}}])assert.equal(warehouseAvailable(s),true);
 const s=home();assert.equal(r(s,buy(),false),s);const overflow={...s,day:Number.MAX_SAFE_INTEGER};assert.equal(r(overflow,buy()),overflow);
});
test('strict canonical inputs: no direct inventory insertion, outflow action, attacker price, inherited args or unsafe quantities',()=>{
 for(const a of [null,{type:'ISSUE_WAREHOUSE_STOCK',productId:'tray'}, {...buy(),cost:0}, {...buy(),source:'__proto__'}, {...buy(),productId:'constructor'},buy(-1),buy(0,1.5),buy(0,0),buy(0,301),{...buy(),boxes:'4'},Object.create(buy()),{...wait(2),cash:2000},expand(300,NaN)])assert.equal(canonicalWarehouseAction(a),null);
 for(const a of [buy(),expand(24,0),wait(1)])assert.deepEqual(canonicalWarehouseAction(a),a);
 assert(!Object.hasOwn(WAREHOUSE_ACTION_KEYS,'ISSUE_WAREHOUSE_STOCK'));
 const s=r(home(),buy());s.ordinaryWarehouse.lots[0].cost=0;assert.equal(warehouseSummary(s).valid,false);assert.equal(r(s,wait(1)),s);
});
test('JSON roundtrip and action replay yield the same warehouse, money and outflow',()=>{
 const s=home(),journal=[buy(),expand(24,1),wait(2)],replay=()=>journal.reduce((st,a)=>r(st,a),structuredClone(s));const n=replay(), restored=JSON.parse(JSON.stringify(n));
 assert.deepEqual(n,replay());assert.deepEqual(restored,n);assert.deepEqual(issueWarehouseStock(restored,'tray',17,3),issueWarehouseStock(n,'tray',17,3));
});
test('all ordinary catalog products can be acquired at their own minimum/pack size; no equipment or story goods leak in',()=>{
 for(const p of MARKET_PRODUCTS){for(const src of ['stock','factory']){
  let s=home();for(const [i,t] of WAREHOUSE_TIERS.slice(1).entries())s=r(s,expand(t.capacity,i));const f=p.sources[src],boxes=Math.ceil(f.minQuantity/f.packSize),a=buy(5,boxes,src,p.id),quote=previewWarehousePurchase(s,a);assert.equal(quote.valid,true,p.id);
  s=r(s,a);s=r(s,wait(6));const q=previewWarehouseIssue(s,p.id,quote.quantity);assert.equal(q.bookCost,quote.cost);assert.equal(q.freedBoxes,boxes);
 }}
});
