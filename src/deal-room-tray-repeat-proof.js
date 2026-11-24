import {marketTiming} from './deal-room-order-cadence.js';
import {marketCalendarDue} from './deal-room-market-calendar.js';
import {MARKET_PRODUCTS} from './deal-room-market-data.js';
import {prospectInbox} from './deal-room-prospects.js?v=37';
import {prospectDisplayText} from './deal-room-prospect-locale.js';

// The two curated tray storylines share their actual commercial rules, not
// their scenes. This is a read-only proof, never a new deal or journal route.
const product=MARKET_PRODUCTS.find(p=>p.id==='tray');
const firstOption=id=>id==='quote'||id==='concession';
const repeatOption=id=>id==='reorder'||id==='vip-volume';
const day=n=>Number.isSafeInteger(n)&&n>0;
const after=(order,prior)=>order.signedDay>=prior.paidDay+(prior.optionId==='concession'?3:7);
const amount=n=>Number.isSafeInteger(n)&&n>=0;
const terms=(order,option,mode,customer)=>{
 if(!option||order.kind!=='prospect'||order.customerId!==customer||order.productId!==product.id||
    order.productName!==product.name||order.unit!==product.unit||order.mode!==mode||!day(order.signedDay)||
    order.quantity!==option.quantity||!day(order.unitPrice)||order.unitPrice>option.maxUnitPrice)return false;
 const supply=order.source==='warehouse'?{days:1,minQuantity:1}:Object.hasOwn(product.sources,order.source)?product.sources[order.source]:null;
 const timing=marketTiming(supply,option,{mode,source:order.source,optionId:order.optionId,cadence:order.marketCadenceVersion===1});
 if(!timing||order.quantity<supply.minQuantity||timing.delivery>option.deadlineDays||
    order.source==='warehouse'&&(!day(order.warehouseRevision)||!amount(order.warehouseBookCost)||order.goodsCost!==order.warehouseBookCost))return false;
 return order.deliveryDay===order.signedDay+timing.delivery&&order.deadlineDay===order.signedDay+option.deadlineDays&&
  order.paymentDay===order.deliveryDay+timing.lag&&order.revenue===order.quantity*order.unitPrice&&
  order.deposit===Math.floor(order.revenue*option.depositPercent/100)&&order.balanceDue===order.revenue-order.deposit;
};
const settled=(r,maxDay)=>r.status==='paid'&&r.delivered===r.quantity&&r.received===r.revenue&&day(r.paidDay)&&r.paidDay>=r.paymentDay&&r.paidDay<=maxDay;
const bulkTerms=id=>id==='reorder'?product.offers.bulk:id==='vip-volume'?{...product.offers.bulk,quantity:product.offers.bulk.quantity+Math.ceil(product.offers.bulk.quantity/4)}:null;
const buyerMatches=(given,canonical,customer)=>given===canonical||customer==='001'&&typeof given==='string'&&typeof canonical==='string'&&prospectDisplayText(given)===prospectDisplayText(canonical);
const sameBuyer=(order,row,customer)=>buyerMatches(order.buyer,row.person.displayName+' · '+row.person.organization,customer);
function firstOrganic(state,order,customer){
 const row=prospectInbox({...state,phase:'market',day:order.signedDay,market:{status:'draft'}}).find(r=>r.person.id===customer);
 return row&&!row.promotion&&!row.isRepeat&&row.product.id===product.id&&sameBuyer(order,row,customer)&&
  terms(order,row.options.find(o=>o.id===order.optionId),'trial',customer);
}
function priorChain(state,through,customer){
 let previous=null,count=0;
 for(const r of state.marketHistory??[]){
  if(r?.customerId!==customer||r.paidDay>through)continue;
  if(!settled(r,through))return null;
  if(!previous){
   if(r.prospectRepeat||!firstOption(r.optionId)||!firstOrganic(state,r,customer))return null;
  }else if(r.prospectRepeat!==true||!repeatOption(r.optionId)||!after(r,previous)||r.prospectPreviousPaidDay!==previous.paidDay||
   !buyerMatches(r.buyer,previous.buyer,customer)||r.optionId==='vip-volume'&&count<3||!terms(r,bulkTerms(r.optionId),'bulk',customer))return null;
  previous=r;count++;
 }
 return previous?{previous,count}:null;
}
export function organicTrayRepeatLetter(state,row,customer){
 if(row?.person?.id!==customer||row?.product?.id!==product.id||row.isRepeat!==true||row.promotion||!day(state?.day))return null;
 const chain=priorChain(state,state.day,customer);
 if(!chain||chain.previous!==row.previous||chain.count!==row.repeatNumber||
    !after({signedDay:state.day},chain.previous)||!sameBuyer(chain.previous,row,customer))return null;
 const base=row.options.find(o=>o.id==='reorder'),vip=row.options.find(o=>o.id==='vip-volume');
 if(base?.mode!=='bulk'||base.quantity!==bulkTerms('reorder').quantity||
    Boolean(vip)!==(chain.count>=3)||vip&&(vip.mode!=='bulk'||vip.quantity!==bulkTerms('vip-volume').quantity))return null;
 return {base:base.quantity,vip:vip?.quantity??null};
}
function matchingAction(state,a,customer){
 const isSign=x=>x?.customerId===customer&&['SIGN_PROSPECT_LOT_V1','SIGN_PROSPECT_LOT_V2','SIGN_PROSPECT_VIP_LOT_V1','SIGN_PROSPECT_VIP_LOT_V2'].includes(x.type);
 let sign=state.history?.findLast(isSign);
 for(let i=(state.historyPages?.length??0)-1;i>=0&&!sign;i--)sign=state.historyPages[i].findLast(isSign);
 return sign?.source===a.source&&sign.unitPrice===a.unitPrice&&(a.optionId==='reorder'?
  ['SIGN_PROSPECT_LOT_V1','SIGN_PROSPECT_LOT_V2'].includes(sign.type)&&sign.optionId==='reorder':
  ['SIGN_PROSPECT_VIP_LOT_V1','SIGN_PROSPECT_VIP_LOT_V2'].includes(sign.type)&&sign.previousPaidDay===a.prospectPreviousPaidDay);
}
export function organicTrayRepeatOrder(state,customer){
 const a=state?.market?.active,status=state?.market?.status;
 if(state?.phase!=='market'||!a||a.status!==status||!day(state.day)||state.day<a.signedDay||
    a.prospectRepeat!==true||!repeatOption(a.optionId)||!terms(a,bulkTerms(a.optionId),'bulk',customer)||!matchingAction(state,a,customer))return null;
 const chain=priorChain(state,a.signedDay,customer);
 if(!chain||!after(a,chain.previous)||!buyerMatches(a.buyer,chain.previous.buyer,customer)||a.prospectPreviousPaidDay!==chain.previous.paidDay||
    a.optionId==='vip-volume'&&chain.count<3)return null;
 let stage='';
 if(status==='transit'&&a.delivered===0&&a.received===a.deposit){
  const due=marketCalendarDue(state);if(due?.delivery)stage=state.day>=due.day?'inspection':'waiting';
 }else if(status==='receivable'&&state.day>=a.deliveryDay&&a.delivered===a.quantity&&a.received===a.deposit&&a.balanceDue>0)stage='receivable';
 else if(settled(a,state.day)&&state.marketHistory?.some(r=>r.signedDay===a.signedDay&&r.customerId===customer&&r.productId===product.id&&
    r.optionId===a.optionId&&r.source===a.source&&r.quantity===a.quantity&&r.revenue===a.revenue&&r.paidDay===a.paidDay&&(customer!=='001'||buyerMatches(r.buyer,a.buyer,customer))&&settled(r,state.day)))stage='paid';
 return stage?{stage,option:a.optionId,quantity:a.quantity}:null;
}
