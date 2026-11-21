import {marketCalendarDue} from './deal-room-market-calendar.js';
import {charterCarafe} from './deal-room-market-carafe-transport.js';
import {NEIGHBORHOOD_BUYER,neighborhoodRequest} from './deal-room-neighborhood.js';
import {MARKET_PRODUCTS} from './deal-room-market-data.js';
import {prospectIdValid,prospectPlan,dismissProspect} from './deal-room-prospects.js';
import {WAREHOUSE_ACTION_KEYS,canonicalWarehouseAction,applyWarehouseAction,previewWarehouseIssue,issueWarehouseStock} from './deal-room-warehouse.js';
import {EQUIPMENT_PROJECTS,previewEquipment,advanceEquipmentShipping,rebookEquipment} from './deal-room-equipment.js';
// One active purchase/sale at a time. The main reducer owns the replay journal.
export const DAY_COST=30;
export const MARKET_ACTION_KEYS=Object.freeze({...WAREHOUSE_ACTION_KEYS,CHARTER_CARAFE_V1:['type'],SIGN_EQUIPMENT:['type','projectId','shipping'],SHIP_EQUIPMENT:['type'],SHIP_EQUIPMENT_V2:['type'],REBOOK_EQUIPMENT:['type'],OPEN_MARKET:['type'],CLOSE_MARKET:['type'],REGISTER_NEIGHBORHOOD:['type'],DISMISS_PROSPECT_V1:['type','customerId','checkedDay'],SIGN_PROSPECT_VIP_LOT_V1:['type','customerId','source','unitPrice','previousPaidDay'],SIGN_PROSPECT_LOT_V1:['type','customerId','optionId','source','unitPrice'],SIGN_MARKET:['type','productId','mode','source','unitPrice'],DELIVER_MARKET:['type'],COLLECT_MARKET:['type'],DELIVER_MARKET_V2:['type'],COLLECT_MARKET_V2:['type']});
const safe=n=>Number.isSafeInteger(n)&&n>=0;
export function canonicalMarketAction(a){
 if(!a||typeof a!=='object'||Array.isArray(a)||!Object.hasOwn(MARKET_ACTION_KEYS,a.type))return null;
 if(Object.hasOwn(WAREHOUSE_ACTION_KEYS,a.type))return canonicalWarehouseAction(a);
 if(a.type==='SIGN_EQUIPMENT'&&(!EQUIPMENT_PROJECTS.some(p=>p.id===a.projectId)||!['standard','locked'].includes(a.shipping)))return null;
 const keys=MARKET_ACTION_KEYS[a.type];
 if(Object.keys(a).length!==keys.length||!keys.every(k=>Object.hasOwn(a,k)))return null;
 if(a.type==='SIGN_MARKET'&&(!MARKET_PRODUCTS.some(p=>p.id===a.productId)||!['trial','bulk','neighborhood'].includes(a.mode)||!['stock','factory','warehouse'].includes(a.source)||!safe(a.unitPrice)||a.unitPrice<1||a.unitPrice>100000))return null;
 if(a.type==='DISMISS_PROSPECT_V1'&&(!prospectIdValid(a.customerId)||!safe(a.checkedDay)||a.checkedDay<1))return null;
 if(a.type==='SIGN_PROSPECT_LOT_V1'&&(!prospectIdValid(a.customerId)||!['quote','concession','reorder'].includes(a.optionId)||!['stock','factory','warehouse'].includes(a.source)||!safe(a.unitPrice)||a.unitPrice<1||a.unitPrice>100000))return null;
 if(a.type==='SIGN_PROSPECT_VIP_LOT_V1'&&(!prospectIdValid(a.customerId)||!safe(a.previousPaidDay)||a.previousPaidDay<1||!['stock','factory','warehouse'].includes(a.source)||!safe(a.unitPrice)||a.unitPrice<1||a.unitPrice>100000))return null;
 return Object.fromEntries(keys.map(k=>[k,a[k]]));
}
// A fulfilled lot and an unpaid receivable are not a paid order. The active
// receipt is also copied into marketHistory at settlement; never count both.
export function marketBook(state){
 const receipts=(state.marketHistory||[]).filter(r=>r.status==='paid'&&
  Number.isSafeInteger(r.paidDay)&&r.paidDay<=state.day&&r.delivered===r.quantity&&r.received===r.revenue&&
  r.quantity>0&&r.unitPrice*r.quantity===r.revenue&&r.netProfit===r.revenue-r.cost-r.operatingCost);
 let net=0,received=0,repeat=null;
 const products=new Set(),buyers=new Map(),firstTrials=new Map();
 for(const r of receipts){
  net+=r.netProfit;received+=r.received;products.add(r.productId);
  buyers.set(r.buyer,1+(buyers.get(r.buyer)||0));
  const key=JSON.stringify([r.buyer,r.productId]),trial=firstTrials.get(key);
  if(r.mode==='trial'&&!trial)firstTrials.set(key,r);
  if(r.mode==='bulk'&&trial&&r.signedDay>=trial.paidDay&&r.quantity>trial.quantity)repeat={trial,bulk:r};
 }
 return {receipts,net,received,products:products.size,buyers:[...buyers].map(([name,count])=>({name,count})),repeat};
}
export function marketAvailable(s){
 return !!s&&['review','complete'].includes(s.phase)&&safe(s.cash)&&safe(s.day)&&(s.contracts||[]).some(c=>c.status==='paid')&&!(s.contracts||[]).some(c=>c.status!=='paid')&&(!s.market||['draft','paid'].includes(s.market.status));
}
export function previewMarket(s,draft){
 const invalid=reason=>({valid:false,accepted:false,reason});
 if(!s||!safe(s.cash)||!safe(s.day)||!draft)return invalid('经营资金或日期无效。');
 const wantsProspect=Object.hasOwn(draft,'customerId'),plan=wantsProspect?prospectPlan(s,draft.customerId,draft.optionId,draft.previousPaidDay):null;
 if(wantsProspect&&!plan)return invalid('这条询盘暂时不能报价，看看收件箱里还有哪些。');
 const p=plan?.product??MARKET_PRODUCTS.find(x=>x.id===draft.productId),mode=plan?.offer.mode??draft.mode,source=draft.source,unitPrice=draft.unitPrice;
 if(!p||!['trial','bulk','neighborhood'].includes(mode)||!['stock','factory','warehouse'].includes(source)||!safe(unitPrice)||unitPrice<1||unitPrice>100000)return invalid('请选择商品、规模、货源，并填入有效的整数单价。');
 const request=mode==='neighborhood'&&s.neighborhoodRegistered?neighborhoodRequest(marketBook(s).receipts):null;
 const o=plan?.offer??(mode==='neighborhood'?request?.offers[p.id]:p.offers[mode]);
 if(!o)return invalid('这款商品不在本次门店联采清单内。');
 const own=source==='warehouse',quantity=o.quantity,issue=own?previewWarehouseIssue(s,p.id,quantity):null;
 if(own&&!issue.valid)return invalid(issue.reason);
 const f=own?{...p.sources.stock,name:'自有仓库',minQuantity:1,days:1}:p.sources[source];
 const revenue=quantity*unitPrice,goodsCost=own?issue.bookCost:quantity*f.unitCost,boxes=Math.ceil(quantity/f.packSize),freight=f.freightBase+boxes*f.freightPerBox,cost=goodsCost+freight;
 const payable=own?freight:cost;
 const deposit=Math.floor(revenue*o.depositPercent/100),balanceDue=revenue-deposit,deliveryDay=s.day+f.days,paymentDay=deliveryDay+o.payLag,deadlineDay=s.day+o.deadlineDays,operatingCost=(f.days+o.payLag)*DAY_COST,cashRequired=Math.max(0,payable-deposit+operatingCost),cashAfterSigning=s.cash+deposit-payable,cashAfterPayment=s.cash+revenue-payable-operatingCost;
 const q={productId:p.id,productName:p.name,category:p.category,buyer:plan?.buyer??(request?NEIGHBORHOOD_BUYER:p.buyer),...(plan?{kind:'prospect',customerId:plan.customerId,optionId:plan.optionId,prospectVoice:plan.prospectVoice,...(plan.prospectRepeat?{prospectRepeat:true,prospectPreviousPaidDay:plan.prospectPreviousPaidDay}:{})}:{}),...(request?{kind:'neighborhood',stores:request.stores,perStore:o.perStore}:{}),unit:p.unit,mode,source,sourceName:f.name,...(own?{warehouseRevision:issue.revision,cashPayable:payable,warehouseBookCost:issue.bookCost}:{}),unitPrice,maxUnitPrice:o.maxUnitPrice,quantity,minQuantity:f.minQuantity,boxes,goodsCost,freight,cost,revenue,deposit,balanceDue,operatingCost,netProfit:revenue-cost-operatingCost,cashRequired,cashAfterSigning,cashAfterPayment,signedDay:s.day,deliveryDay,paymentDay,deadlineDay,inspection:p.inspection};
 if(![revenue,goodsCost,freight,cost,deposit,balanceDue,deliveryDay,paymentDay,deadlineDay,operatingCost,cashRequired].every(safe)||!Number.isSafeInteger(cashAfterSigning)||!Number.isSafeInteger(cashAfterPayment))return invalid('这份报价超出可记录范围。');
 let reason='';
 if(unitPrice>o.maxUnitPrice)reason=plan?'这个价客户没接受，可以重新报价。':`买方拒绝：单价高于本方案预算 ¥${o.maxUnitPrice}，请调整报价。`;
 else if(quantity<f.minQuantity)reason=`这家货源至少 ${f.minQuantity} ${p.unit}起订，当前只需 ${quantity} ${p.unit}。`;
 else if(deliveryDay>deadlineDay)reason=`预计第 ${deliveryDay} 天到货，晚于买方第 ${deadlineDay} 天收货期限。`;
 const accepted=!reason;
 if(!reason&&s.cash<cashRequired)reason=`周转资金还差 ¥${cashRequired-s.cash}，需覆盖采购、运费和回款前日常开支。`;
 if(!reason&&(s.phase!=='market'||s.market?.status!=='draft'))reason='当前没有待签的新商品报价。';
 return {...q,accepted,valid:!reason,reason};
}
function paidMarket(n){
 n.market.status='paid';n.market.active.status='paid';n.market.active.paidDay=n.day;
 n.marketHistory=[...(n.marketHistory||[]),structuredClone(n.market.active)];
 n.feedback={kind:'market-paid',message:`${n.market.active.buyer} 已收货并结清；本单净赚 ¥${n.market.active.netProfit}，已记入商品账。`};
}
export function applyMarketAction(s,action,canStart=true){
 const a=canonicalMarketAction(action);if(!a)return s;
 if(Object.hasOwn(WAREHOUSE_ACTION_KEYS,a.type))return applyWarehouseAction(s,a,canStart);
 if(a.type==='DISMISS_PROSPECT_V1')return dismissProspect(s,a.customerId,a.checkedDay);
 if(a.type==='OPEN_MARKET'){
  if(!canStart||!marketAvailable(s))return s;
  const n=structuredClone(s);n.market={status:'draft',returnPhase:s.phase};n.phase='market';return n;
 }
 if(s.phase!=='market'||!s.market)return s;
 if(a.type==='REGISTER_NEIGHBORHOOD'){
  if(s.market.status!=='draft'||s.neighborhoodRegistered||!neighborhoodRequest(marketBook(s).receipts))return s;
  const n=structuredClone(s);n.neighborhoodRegistered=true;return n;
 }
 if(a.type==='CHARTER_CARAFE_V1')return charterCarafe(s);
 if(a.type==='SHIP_EQUIPMENT'||a.type==='SHIP_EQUIPMENT_V2')return advanceEquipmentShipping(s,DAY_COST,a.type==='SHIP_EQUIPMENT_V2');
 if(a.type==='REBOOK_EQUIPMENT')return rebookEquipment(s,DAY_COST);
 if(a.type==='CLOSE_MARKET'&&['draft','paid'].includes(s.market.status)){
  const n=structuredClone(s);n.phase=n.market.returnPhase==='complete'?'complete':'review';return n;
 }
 if(a.type==='SIGN_MARKET'||a.type==='SIGN_EQUIPMENT'||a.type==='SIGN_PROSPECT_LOT_V1'||a.type==='SIGN_PROSPECT_VIP_LOT_V1'){
  if(!canStart)return s;
  const q=a.type==='SIGN_EQUIPMENT'?previewEquipment(s,a.projectId,a.shipping,DAY_COST):previewMarket(s,a.type==='SIGN_PROSPECT_VIP_LOT_V1'?{...a,optionId:'vip-volume'}:a);
  if(!q?.valid)return s;
  const n=q.source==='warehouse'?issueWarehouseStock(s,q.productId,q.quantity,q.warehouseRevision):structuredClone(s);
  if(n===s)return s;
  n.cash=q.cashAfterSigning;n.market.status='transit';
  n.market.active={...q,status:'transit',received:q.deposit,delivered:0,operatingPaid:0};
  if(q.kind==='equipment'){
   n.market.active.status=n.market.status='preparing';
   n.feedback={kind:'market-signed',message:`${q.buyer} 已签约并付预付款 ¥${q.deposit}。采购、运输和验收费共 ¥${q.cost}，已付清。`};return n;
  }
  if(q.source==='warehouse'){n.feedback={kind:'market-signed',message:`${q.productName} 已从自有仓取出 ${q.quantity} ${q.unit}。这次只付出库配送费 ¥${q.freight}，库存成本没有再扣现金。`.replace('\$','$')};return n;}
  n.feedback={kind:'market-signed',message:`${q.productName} 已采购 ${q.quantity} ${q.unit}：付货款和运费 ¥${q.cost}，收定金 ¥${q.deposit}。`};return n;
 }
 const p=s.market.active;
 if(!p)return s;
 const calendar=a.type==='DELIVER_MARKET_V2'||a.type==='COLLECT_MARKET_V2';
 if(calendar){
  const due=marketCalendarDue(s);
  if(!due||due.legacy||due.stage==='ship'||s.day<due.day||(a.type==='DELIVER_MARKET_V2')!==due.delivery)return s;
 }
 if((a.type==='DELIVER_MARKET'||a.type==='DELIVER_MARKET_V2')&&s.market.status==='transit'&&p.status==='transit'){
  const from=p.kind==='equipment'?p.shipDay:p.signedDay;
  if(!calendar&&s.day!==from)return s;
  const expense=(p.deliveryDay-from)*DAY_COST;if(!safe(expense)||!calendar&&s.cash<expense)return s;
  const n=structuredClone(s);if(!calendar){n.day=p.deliveryDay;n.cash-=expense;}
  n.market.active.operatingPaid+=expense;n.market.active.delivered=p.quantity;
  if(p.paymentDay===p.deliveryDay){n.cash+=p.balanceDue;n.market.active.received+=p.balanceDue;paidMarket(n);}
  else {n.market.status='receivable';n.market.active.status='receivable';n.feedback={kind:'market-delivered',message:`${p.productName} 已验收 ${p.quantity} ${p.unit}，尾款 ¥${p.balanceDue} 到第 ${p.paymentDay} 天再收。`};}
  return n;
 }
 if((a.type==='COLLECT_MARKET'||a.type==='COLLECT_MARKET_V2')&&s.market.status==='receivable'&&p.status==='receivable'){
  if(!calendar&&s.day!==p.deliveryDay)return s;
  const expense=(p.paymentDay-p.deliveryDay)*DAY_COST;if(!safe(expense)||!calendar&&s.cash<expense)return s;
  const n=structuredClone(s);if(!calendar)n.day=p.paymentDay;n.cash+=p.balanceDue-(calendar?0:expense);n.market.active.received+=p.balanceDue;n.market.active.operatingPaid+=expense;paidMarket(n);return n;
 }
 return s;
}
