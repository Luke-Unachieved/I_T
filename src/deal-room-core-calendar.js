import {openingContractMilestone} from './deal-room-opening-calendar.js?v=36';
import {repeatContractMilestone} from './deal-room-repeat-calendar.js';
// View and replay share the same contractual milestone lookup. This module only
// reads original agreed dates; it never moves the clock or posts money.
const milestone=(type,day,label,mark=null,stage=null)=>Number.isSafeInteger(day)&&day>0?{type,day,label,mark,stage}:null;
function order(type,x,label){
 if(!x)return null;
 return x.deliveryDay<x.paymentDay&&x.calendarDelivered!==true
  ?milestone(type,x.deliveryDay,'确认交货','calendarDelivered',x)
  :milestone(type,x.paymentDay,label,null,x);
}
export const coreCalendarActions=new Set(['ADVANCE','RECEIVE_COLLECTION_REVISION','FULFIL_COLLECTION_REVISION','FULFIL_STOCK_PROCUREMENT','FULFIL_CURATION','FULFIL_CASE_GROWTH','FULFIL_COLLECTION','ADVANCE_SUPPLY_PLAN','RECEIVE_OWN_COLLECTION_V1']);
export const removedLiveWaits=new Set(['WAIT_CASE_GROWTH','WAIT_CASE_CALLOFF','WAIT_STUDIO_PROJECT','WAIT_STUDIO_ALLOCATION','PAUSE_FOR_BUYER','WAIT_FOR_BUYER','WAIT_FOR_RETAIL','FULFIL_SUPPLY_PLAN','FULFIL_ACCOUNT','FULFIL_ACCOUNT_EXPANSION']);
export function coreCalendarMilestone(s){
 switch(s?.phase){
  case 'collection-revision': return s.collectionRevision?.status==='sampling'?milestone('RECEIVE_COLLECTION_REVISION',s.collectionRevision.sampleDay,'接收新包装样品'):s.collectionRevision?.status==='production'?order('FULFIL_COLLECTION_REVISION',s.collectionRevision.active,'收齐货款'):null;
  case 'stock-procurement': return s.stockProcurement?.status==='production'?milestone('FULFIL_STOCK_PROCUREMENT',s.stockProcurement.deliveryDay,'确认交货并收款'):null;
  case 'curation-fulfillment': return order('FULFIL_CURATION',s.curation,'收齐货款');
  case 'case-growth': return s.caseGrowth?.status==='production'?order('FULFIL_CASE_GROWTH',s.caseGrowth.active,'收齐货款'):null;
  case 'collection': return s.collection?.status==='sampling'?milestone('RECEIVE_OWN_COLLECTION_V1',s.collection.sampleDay,'验收工作室自有系列样品'):s.collection?.status==='production'?order('FULFIL_COLLECTION',s.collection.active,'收齐货款'):null;
  case 'planning-fulfillment': {
   const e=s.supplyPlan?.events?.[s.supplyPlan.eventIndex];
   return e?milestone('ADVANCE_SUPPLY_PLAN',e.day,e.kind==='start'?'确认下一批开工':e.kind==='payment'?'收取尾款':e.income>0?'确认本批交货并收款':'确认本批交货'):null;
  }
  case 'fulfilling': {
   const o=s.contracts?.at(-1);
   if(!o||o.openingTermsVersion||o.roundReceivable||openingContractMilestone(s)||repeatContractMilestone(s))return null;
   return order('ADVANCE',o,o.deliveryDay===o.paymentDay?'确认交货并收款':o.deposit>0?'收取尾款':'收取货款');
  }
  default:return null;
 }
}
export function coreCalendarTarget(s,type){
 const row=coreCalendarMilestone(s);
 return row?.type===type?row:null;
}
