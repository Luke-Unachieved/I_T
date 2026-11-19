import {MARKET_PRODUCTS} from './deal-room-market-data.js';
// Private ordinary-goods stock, not the supplying depot or a bespoke lamp/linen batch.
// Serialization: do NOT seed this property on existing/new games. The journal replays
// the canonical intent (including its expected revision); only successful intents
// materialise ordinaryWarehouse. Retain existing save key and compare the derived
// state in the usual full replay. Never accept serialized lot/cash data as an action.
export const WAREHOUSE_TIERS=Object.freeze([[10,0],[24,1800],[60,5200],[100,9800],[180,18200],[300,34000]].map(([capacity,price])=>Object.freeze({capacity,price})));
export const WAREHOUSE_ACTION_KEYS=Object.freeze(Object.fromEntries(Object.entries({
 BUY_WAREHOUSE_STOCK:['type','productId','source','boxes','revision'],
 EXPAND_WAREHOUSE:['type','target','revision'],WAIT_WAREHOUSE_STOCK:['type','revision']
}).map(([k,v])=>[k,Object.freeze(v)])));
const nonneg=n=>Number.isSafeInteger(n)&&n>=0;
const positive=n=>Number.isSafeInteger(n)&&n>0;
const goods=id=>MARKET_PRODUCTS.find(p=>p.id===id);
const emptyWarehouse=()=>({capacity:10,revision:0,lots:[],purchasedQuantity:0,issuedQuantity:0,purchaseSpend:0,issuedCost:0,expansionSpend:0});
const bad=reason=>({valid:false,reason});
const raw=s=>!s||!Object.hasOwn(s,'ordinaryWarehouse')?emptyWarehouse():s.ordinaryWarehouse;
const daysCost=30; // Same game-wide ordinary operating expense as DAY_COST; no cyclic market import.
const basis=(lot,issued)=>Math.floor(lot.cost*issued/lot.quantity);
function validWarehouse(w){
 if(!w||!WAREHOUSE_TIERS.some(t=>t.capacity===w.capacity)||!nonneg(w.revision)||!Array.isArray(w.lots)||w.lots.length>w.capacity)return false;
 if(![w.purchasedQuantity,w.issuedQuantity,w.purchaseSpend,w.issuedCost,w.expansionSpend].every(nonneg))return false;
 if(w.expansionSpend!==WAREHOUSE_TIERS.filter(t=>t.capacity<=w.capacity).reduce((a,t)=>a+t.price,0))return false;
 let boxes=0,units=0,value=0,previousId=0;
 for(const l of w.lots){
  if(!l||!positive(l.id)||l.id<=previousId||l.id>w.revision||!['stock','factory'].includes(l.source))return false;
  const f=goods(l.productId)?.sources[l.source];
  if(!f||!positive(l.quantity)||l.quantity<f.minQuantity||!positive(l.remaining)||l.remaining>l.quantity||l.packSize!==f.packSize||l.quantity%l.packSize!==0||!positive(l.day)||!positive(l.arrivalDay)||l.arrivalDay!==l.day+f.days)return false;
  if(!positive(l.cost)||l.cost!==l.quantity*f.unitCost+f.freightBase+(l.quantity/l.packSize)*f.freightPerBox||!nonneg(l.quantity*l.cost))return false;
  previousId=l.id;boxes+=Math.ceil(l.remaining/l.packSize);units+=l.remaining;value+=l.cost-basis(l,l.quantity-l.remaining);
 }
 return boxes<=w.capacity&&nonneg(units)&&nonneg(value)&&w.purchasedQuantity-w.issuedQuantity===units&&w.purchaseSpend-w.issuedCost===value;
}
export function canonicalWarehouseAction(a){
 if(!a||typeof a!=='object'||Array.isArray(a)||!Object.hasOwn(a,'type')||!Object.hasOwn(WAREHOUSE_ACTION_KEYS,a.type))return null;
 const keys=WAREHOUSE_ACTION_KEYS[a.type];
 if(Object.keys(a).length!==keys.length||!keys.every(k=>Object.hasOwn(a,k))||!nonneg(a.revision))return null;
 if(a.type==='BUY_WAREHOUSE_STOCK'&&(!goods(a.productId)||!['stock','factory'].includes(a.source)||!positive(a.boxes)||a.boxes>300))return null;
 if(a.type==='EXPAND_WAREHOUSE'&&!WAREHOUSE_TIERS.slice(1).some(t=>t.capacity===a.target))return null;
 return Object.fromEntries(keys.map(k=>[k,a[k]]));
}
export function warehouseAvailable(s){
 return !!s&&positive(s.day)&&nonneg(s.cash)&&Array.isArray(s.contracts)&&s.contracts.some(c=>c?.status==='paid')&&s.contracts.every(c=>c?.status==='paid')&&
  ((['review','complete'].includes(s.phase)&&(!s.market||['draft','paid'].includes(s.market.status)))||(s.phase==='market'&&s.market?.status==='draft'));
}
export function warehouseSummary(s){
 const w=raw(s);
 if(!s||!positive(s.day)||!validWarehouse(w))return {valid:false,reason:'仓库存货记录无效。',items:[],lots:[],nextTier:null};
 const rows=new Map();let onHandBoxes=0,inTransitBoxes=0,nextArrivalDay=null,lastArrivalDay=null;
 const lots=w.lots.map(l=>{
  const arrived=l.arrivalDay<=s.day,boxes=Math.ceil(l.remaining/l.packSize),bookCost=l.cost-basis(l,l.quantity-l.remaining),p=goods(l.productId);
  if(arrived)onHandBoxes+=boxes;else{inTransitBoxes+=boxes;nextArrivalDay=Math.min(nextArrivalDay??l.arrivalDay,l.arrivalDay);lastArrivalDay=Math.max(lastArrivalDay??l.arrivalDay,l.arrivalDay);}
  const r=rows.get(p.id)??{productId:p.id,name:p.name,unit:p.unit,onHand:0,inTransit:0,onHandBoxes:0,inTransitBoxes:0,bookCost:0};
  r[arrived?'onHand':'inTransit']+=l.remaining;r[arrived?'onHandBoxes':'inTransitBoxes']+=boxes;r.bookCost+=bookCost;rows.set(p.id,r);
  return {...l,boxes,arrived,bookCost};
 });
 const usedBoxes=onHandBoxes+inTransitBoxes;
 return {valid:true,capacity:w.capacity,revision:w.revision,usedBoxes,freeBoxes:w.capacity-usedBoxes,onHandBoxes,inTransitBoxes,nextArrivalDay,lastArrivalDay,items:[...rows.values()],lots,
  purchasedQuantity:w.purchasedQuantity,issuedQuantity:w.issuedQuantity,purchaseSpend:w.purchaseSpend,issuedCost:w.issuedCost,inventoryCost:w.purchaseSpend-w.issuedCost,expansionSpend:w.expansionSpend,
  nextTier:WAREHOUSE_TIERS[WAREHOUSE_TIERS.findIndex(t=>t.capacity===w.capacity)+1]??null};
}
function ready(s,q,revision){
 if(!q.valid)return q.reason;
 if(!warehouseAvailable(s))return '请先结清手上的订单，再来安排仓储。';
 if(q.revision!==revision||!nonneg(revision+1))return '仓库已更新，请按最新库存重新确认。';
 return '';
}
export function previewWarehousePurchase(s,draft){
 const q=warehouseSummary(s),reason=ready(s,q,draft?.revision);if(reason)return bad(reason);
 const p=goods(draft?.productId),f=p&&['stock','factory'].includes(draft.source)&&p.sources[draft.source],boxes=draft?.boxes;
 if(!f||!positive(boxes)||boxes>300)return bad('请选择有效商品、货源和整箱数。');
 const quantity=boxes*f.packSize,goodsCost=quantity*f.unitCost,freight=f.freightBase+boxes*f.freightPerBox,cost=goodsCost+freight,arrivalDay=s.day+f.days;
 const projectedWait=(Math.max(arrivalDay,q.lastArrivalDay??s.day)-s.day)*daysCost;
 if(![quantity,goodsCost,freight,cost,arrivalDay,projectedWait,cost+projectedWait,quantity+q.purchasedQuantity,cost+q.purchaseSpend].every(nonneg)||!nonneg(cost*quantity))return bad('采购金额或日期超出可记录范围。');
 const result={productId:p.id,productName:p.name,source:draft.source,unit:p.unit,boxes,packSize:f.packSize,minBoxes:Math.ceil(f.minQuantity/f.packSize),quantity,goodsCost,freight,cost,arrivalDay,revision:q.revision,operatingReserve:projectedWait,cashAfter:s.cash-cost,freeAfter:q.freeBoxes-boxes};
 const why=quantity<f.minQuantity?'该货源未达起订量。':boxes>q.freeBoxes?'仓位不足：在途货也占位，可减少采购或先扩仓。':s.cash<cost+projectedWait?'资金不足以支付采购、运费并留足到货前的日常开支。':'';
 return {...result,valid:!why,reason:why};
}
export function previewWarehouseExpansion(s,draft){
 const q=warehouseSummary(s),reason=ready(s,q,draft?.revision);if(reason)return bad(reason);
 if(!q.nextTier)return bad('已是最大仓容。');
 const {capacity:target,price}=q.nextTier;
 if(draft?.target!==target)return bad('只能扩到下一档，不能跳级或重复购买。');
 const reserve=((q.lastArrivalDay??s.day)-s.day)*daysCost,why=s.cash<price+reserve?'现金不足，需保留在途货到库前的日常开支。':'';
 return {valid:!why,reason:why,target,price,addedBoxes:target-q.capacity,revision:q.revision,cashAfter:s.cash-price};
}
export function previewWarehouseWait(s){
 const q=warehouseSummary(s),reason=ready(s,q,q.revision);if(reason)return bad(reason);
 if(!q.nextArrivalDay)return bad('没有等待到货的批次。');
 const arrivalDay=q.nextArrivalDay,days=arrivalDay-s.day,operatingCost=days*daysCost;
 const why=!nonneg(operatingCost)||s.cash<operatingCost?'现金不足以支付等货期间的日常开支。':'';
 return {valid:!why,reason:why,revision:q.revision,arrivalDay,days,operatingCost,cashAfter:s.cash-operatingCost};
}
export function applyWarehouseAction(s,a,canStart=true){
 const action=canonicalWarehouseAction(a);if(!action||!canStart)return s;
 const q=action.type==='BUY_WAREHOUSE_STOCK'?previewWarehousePurchase(s,action):action.type==='EXPAND_WAREHOUSE'?previewWarehouseExpansion(s,action):previewWarehouseWait(s);
 if(!q.valid||action.revision!==q.revision)return s;
 const n=structuredClone(s),w=n.ordinaryWarehouse??=emptyWarehouse();w.revision++;n.cash=q.cashAfter;
 if(action.type==='BUY_WAREHOUSE_STOCK'){
  w.lots.push({id:w.revision,productId:q.productId,source:q.source,day:s.day,arrivalDay:q.arrivalDay,quantity:q.quantity,remaining:q.quantity,packSize:q.packSize,cost:q.cost});
  w.purchasedQuantity+=q.quantity;w.purchaseSpend+=q.cost;
  n.feedback={kind:'warehouse-purchase',message:q.productName+'已订 '+q.boxes+' 箱，含运费 ¥'+q.cost+' 已付。第 '+q.arrivalDay+' 天到仓，途中只占仓位。'};
 }else if(action.type==='EXPAND_WAREHOUSE'){
  w.capacity=q.target;w.expansionSpend+=q.price;n.feedback={kind:'warehouse-expand',message:'已付 ¥'+q.price+' 扩到 '+q.target+' 箱，新增 '+q.addedBoxes+' 个仓位。'};
 }else{
  n.day=q.arrivalDay;n.feedback={kind:'warehouse-arrival',message:'到了第 '+n.day+' 天，届期批次已上架。这 '+q.days+' 天日常开支 ¥'+q.operatingCost+'。'};
 }
 return n;
}
// Trusted signing subroutine, NOT a standalone public action. Use in the same
// reducer transition as the contract; reject stale drafts. Signing must book the
// landed FIFO cost as COGS in net profit without paying it again in cash.
export function previewWarehouseIssue(s,productId,quantity){
 const q=warehouseSummary(s),p=goods(productId);
 if(!q.valid||!p||!positive(quantity)||!nonneg(q.revision+1))return bad('出库商品或数量无效。');
 const eligible=q.lots.filter(l=>l.productId===productId&&l.arrived).sort((a,b)=>a.arrivalDay-b.arrivalDay||a.id-b.id);
 const available=eligible.reduce((n,l)=>n+l.remaining,0);if(quantity>available)return {...bad('已到库的现货不足，在途货不能出库。'),available,revision:q.revision};
 let needed=quantity,bookCost=0,freedBoxes=0;const allocations=[];
 for(const l of eligible){if(!needed)break;const take=Math.min(l.remaining,needed),start=l.quantity-l.remaining,cost=basis(l,start+take)-basis(l,start);
  allocations.push({lotId:l.id,quantity:take,cost});bookCost+=cost;freedBoxes+=l.boxes-Math.ceil((l.remaining-take)/l.packSize);needed-=take;}
 return {valid:true,reason:'',productId,quantity,available,bookCost,freedBoxes,allocations,revision:q.revision};
}
export function issueWarehouseStock(s,productId,quantity,revision){
 const q=previewWarehouseIssue(s,productId,quantity);if(!q.valid||q.revision!==revision)return s;
 const n=structuredClone(s),w=n.ordinaryWarehouse,byId=new Map(q.allocations.map(a=>[a.lotId,a.quantity]));
 w.revision++;for(const l of w.lots)l.remaining-=byId.get(l.id)??0;w.lots=w.lots.filter(l=>l.remaining>0);w.issuedQuantity+=quantity;w.issuedCost+=q.bookCost;
 return n;
}
