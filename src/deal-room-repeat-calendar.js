import {roundReceivablesActive} from './deal-room-round-receivables.js';

const products=Object.freeze({mira:'便携台灯',samir:'不锈钢保温杯',ines:'棉麻桌布'});
const choices=new Set(['repeat-small','repeat-scale','repeat-prepaid']);
const actions=new Set(['DELIVER_REPEAT_ORDER_V1','COLLECT_REPEAT_ORDER_V1']);
const day=n=>Number.isSafeInteger(n)&&n>=1;
export const isOrdinaryRepeatChoice=id=>choices.has(id);

export function ordinaryRepeatContract(s){
 const c=s?.contracts?.at(-1);
 if(!day(s?.businessRound)||!day(s.day)||s.clientProjectActive||roundReceivablesActive(s)||
    !c||c.projectId||c.roundReceivable||c.businessRound!==s.businessRound||!Object.hasOwn(products,c.clientId)||
    c.product!==products[c.clientId]||!choices.has(c.optionId)||![c.signedDay,c.deliveryDay,c.paymentDay].every(day)||
    c.signedDay>s.day||c.signedDay>=c.deliveryDay||c.deliveryDay>c.paymentDay) return null;
 return c;
}
export function repeatContractMilestone(s){
 if(s?.phase!=='fulfilling')return null;
 const c=ordinaryRepeatContract(s);
 if(!c||!['fulfilling','receivable'].includes(c.status)||
    c.status==='receivable'&&(s.day<c.deliveryDay||c.deliveryDay===c.paymentDay))return null;
 const delivery=c.status==='fulfilling';
 return {day:delivery?c.deliveryDay:c.paymentDay,delivery,sameDay:delivery&&c.deliveryDay===c.paymentDay,clientId:c.clientId,contract:c};
}
export const isRepeatCalendarAction=type=>actions.has(type);
export function canonicalRepeatCalendar(a){
 if(!actions.has(a?.type)||Object.keys(a).length!==3||!['type','clientId','checkedDay'].every(k=>Object.hasOwn(a,k))||
    !Object.hasOwn(products,a.clientId)||!day(a.checkedDay))return null;
 return {type:a.type,clientId:a.clientId,checkedDay:a.checkedDay};
}
export function applyRepeatCalendar(s,a){
 const due=repeatContractMilestone(s);
 if(!due||a.checkedDay!==s.day||a.clientId!==due.clientId||s.day<due.day||
    (a.type==='DELIVER_REPEAT_ORDER_V1')!==due.delivery)return s;
 const n=structuredClone(s),c=n.contracts.at(-1);
 if(due.delivery&&!due.sameDay){
  c.status='receivable';
  n.feedback={kind:'repeat-delivered',message:'货已交付，按约定日期收尾款。'};
 }else{
  c.status='paid';n.phase='paid';n.cash+=c.balanceDue;
  n.feedback={kind:'paid',message:`${c.clientName.split(' · ')[0]} 的货款已收齐，这单净赚 ${c.netProfit}。`};
 }
 return n;
}
