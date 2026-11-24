import {applyMarketAction} from './deal-room-market.js?v=36';
import {openingMarketProjection} from './deal-room-opening-market.js?v=36';
import {applyOpeningCalendar} from './deal-room-opening-calendar.js?v=36';
import {applyRepeatCalendar} from './deal-room-repeat-calendar.js';
import {applyRoundCalendarAction} from './deal-room-round-receivables.js';
import {legacyEquipmentCashSchedule} from './deal-room-equipment-legacy.js?v=36';
// Project signed cash flows only; prospects, hypothetical sales and unsold stock
// are not cash. A receipt available today can pay tonight's operating expense.
const dueStatuses=new Set(['fulfilling','production','preparing','transit','receivable','legacy-preparing','legacy-transit','legacy-receivable','display']);
const safe=value=>Number.isSafeInteger(value)&&value>=0;
// Only count payments already released for collection. An overdue shipment,
// inspection or production debit does not turn into cash by moving its date.
function collectibleLateReceipts(s){
 const ready=new Map();
 const eligible=o=>o?.status==='receivable'&&safe(o.paymentDay)&&o.paymentDay<s.day&&safe(o.balanceDue)&&o.balanceDue>0&&Number.isSafeInteger(s.cash+o.balanceDue);
 const add=(o,n)=>{if(eligible(o)&&n&&n.day===s.day&&n.cash-s.cash===o.balanceDue)ready.set(o,o.balanceDue);};
 if(s.bankruptcy||s.phase==='outing-trip')return ready;
 for(const o of s.contracts??[]){
  if(!eligible(o))continue;
  const args={clientId:o.clientId,checkedDay:s.day};
  add(o,o.roundReceivable?applyRoundCalendarAction(s,{type:'ROUND_CALENDAR_V1',...args}):
   o.businessRound?applyRepeatCalendar(s,{type:'COLLECT_REPEAT_ORDER_V1',...args}):applyOpeningCalendar(s,{type:'COLLECT_OPENING_ORDER_V1',...args}));
 }
 const tryMarket=(o,view)=>{
  if(eligible(o)&&view?.market?.status==='receivable'&&view.market.active?.status==='receivable')add(o,applyMarketAction(view,{type:'COLLECT_MARKET_V2'}));
 };
 tryMarket(s.market?.active,s);
 for(const o of s.marketParked??[])if(eligible(o)&&o.queueId>0){
  const view=applyMarketAction(s,{type:'SWITCH_MARKET_ORDER_V1',orderId:o.queueId});
  if(view!==s&&view.market.active?.queueId===o.queueId)tryMarket(o,view);
 }
 const side=s.openingMarket;
 if(eligible(side?.market?.active))tryMarket(side.market.active,openingMarketProjection(s));
 for(const o of side?.parked??[])if(eligible(o)&&o.queueId>0)tryMarket(o,openingMarketProjection(s,o.queueId));
 if(s.phase==='account'&&eligible(s.account))ready.set(s.account,s.account.balanceDue);
 if(s.phase==='atelier-restock'&&eligible(s.atelierRestock))ready.set(s.atelierRestock,s.atelierRestock.balanceDue);
 return ready;
}
export function collectibleLateAmount(s){
 if(!s||!safe(s.day)||!safe(s.cash))return 0;
 const total=[...collectibleLateReceipts(s).values()].reduce((sum,value)=>sum+value,0);
 return safe(total)?total:0;
}
export function cashRiskProjection(s,dailyCost){
 if(!s||!safe(s.day)||!safe(s.cash)||!safe(dailyCost)||dailyCost<1)return null;
 const flows=new Map(), beforeIncome=new Map(), seen=new Set(),late=collectibleLateReceipts(s);
 function flow(day,value){
  if(!safe(day)||day<s.day||!Number.isSafeInteger(value))return;
  const amount=(flows.get(day)||0)+value;
  if(Number.isSafeInteger(amount))flows.set(day,amount);
 }
 function receipt(order,day=order?.paymentDay,amount=order?.balanceDue??order?.revenue){
  if(!order||seen.has(order)||!dueStatuses.has(order.status)||!safe(amount)||!amount)return;
  seen.add(order);flow(late.has(order)?s.day:day,amount);
 }
 for(const o of s.contracts||[])receipt(o);
 for(const o of [...(s.marketParked||[]),...(s.openingMarket?.parked||[])])receipt(o);
 function market(order){
  if(!order||!dueStatuses.has(order.status))return;
  if(order.status.startsWith('legacy-')){
   for(const {day,expense,income} of legacyEquipmentCashSchedule(s)){
    if(day>=s.day&&safe(expense)&&safe(income)){
     beforeIncome.set(day,(beforeIncome.get(day)||0)+expense);
     flow(day,income-expense);
    }
   }
   return;
  }
  if(order.kind==='equipment'&&['preparing','transit'].includes(order.status)){
   const transfer=order.status==='preparing'&&order.shipping==='standard'&&order.shipDay%3===0;
   if(transfer)flow(order.shipDay,-order.stationFee);
   const slip=transfer?order.slipDays:0;
   // Modern equipment pays supplier, freight and acceptance at signing.
   // Only a triggered transfer fee remains payable at departure.
   receipt(order,order.paymentDay+slip);
   return;
  }
  receipt(order);
 }
 market(s.market?.active);market(s.openingMarket?.market?.active);
 receipt(s.account);receipt(s.curation);
 for(const k of ['caseGrowth','collectionRevision','collection']){
  const p=s[k];if(p?.status==='production'&&p.active){
   const o=p.active;flow(o.paymentDay,o.balanceDue??o.revenue);
  }
 }
 receipt(s.stockProcurement,s.stockProcurement?.deliveryDay,s.stockProcurement?.revenue);
 receipt(s.atelierRestock);
 receipt(s.shopTrial,s.shopTrial?.settlementDay,s.shopTrial?.revenue);
 const linen=s.linenFreight;
 if(linen?.status==='transit')for(const lot of linen.lots.slice(linen.index))flow(linen.signedDay+lot.after,lot.balance);
 const supply=s.supplyPlan;
 if(supply&&!supply.completed)for(const e of (supply.events||[]).slice(supply.eventIndex))flow(e.day,e.income-e.cost);
 for(const lot of s.ordinaryWarehouse?.lots||[])if(lot.arrivalDay>s.day)flow(lot.arrivalDay,0);
 for(const k of ['productDevelopment','secondSupplier','collection','collectionRevision']){
  const sample=s[k];if(sample?.status==='sampling')flow(sample.sampleDay,0);
 }
 // Compute the maximum deficit between due-day events without an unbounded
 // daily loop. Today's overhead is always relevant, even without signed jobs.
 let cursor=s.day,net=0,requiredCash=0,cashHorizonDay=s.day;
 for(const [day,amount] of [...flows.entries()].sort((a,b)=>a[0]-b[0])){
  net-=(day-cursor)*dailyCost;
  if(-net>requiredCash){requiredCash=-net;cashHorizonDay=day;}
  const cashBeforeReceipt=net-(beforeIncome.get(day)||0);
  if(-cashBeforeReceipt>requiredCash){requiredCash=-cashBeforeReceipt;cashHorizonDay=day;}
  net+=amount;
  if(-net>requiredCash){requiredCash=-net;cashHorizonDay=day;}
  cursor=day;
 }
 if(cursor===s.day&&dailyCost-net>requiredCash){requiredCash=dailyCost-net;cashHorizonDay=s.day;}
 if(!safe(requiredCash))return null;
 return {cash:s.cash,requiredCash,shortfall:Math.max(0,requiredCash-s.cash),cashHorizonDay};
}
