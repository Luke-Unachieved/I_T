const clients=new Set(['mira','samir','ines']);
const actions=new Set(['DELIVER_OPENING_ORDER_V1','COLLECT_OPENING_ORDER_V1']);
const day=n=>Number.isSafeInteger(n)&&n>=1;

export const openingFlow = s=>!!s&&!s.businessRound&&!s.clientProjectActive&&['negotiating','fulfilling','paid'].includes(s.phase);
export const openingOrder = c=>!!c&&clients.has(c.clientId)&&!c.businessRound&&!c.projectId;
export const openingOrders = s=>(s?.contracts||[]).filter(openingOrder);
const live = c=>c.status==='fulfilling'||c.status==='receivable';
const dueDate = c=>c.status==='fulfilling'?c.deliveryDay:c.paymentDay;
export const openingReserveDays = s=>Math.max(0,...openingOrders(s).filter(live).map(c=>c.paymentDay-s.day));
export const OPENING_TERMS_V2=Object.freeze({
 trial:[2,0],rollout:[3,2],ready:[2,0],branded:[3,2],'branded-opening':[3,2],promise:[3,2],small:[2,0],season:[3,3],'all-now':[3,0],
});
export function openingContractMilestone(s,clientId){
 if(s?.openingParallel&&openingFlow(s)){
  const c=openingOrders(s).filter(c=>live(c)&&(!clientId||c.clientId===clientId))
   .sort((a,b)=>dueDate(a)-dueDate(b)||a.signedDay-b.signedDay)[0];
  return c?{day:dueDate(c),delivery:c.status==='fulfilling',sameDay:c.deliveryDay===c.paymentDay,clientId:c.clientId,contract:c}:null;
 }
 const c=s?.contracts?.at(-1);
 if(s?.phase!=='fulfilling'||s.businessRound||s.clientProjectActive||!c||!clients.has(c.clientId)||c.businessRound||c.projectId||
    !['fulfilling','receivable'].includes(c.status)||![c.signedDay,c.deliveryDay,c.paymentDay].every(day)||
    c.signedDay>c.deliveryDay||c.deliveryDay>c.paymentDay)return null;
 const delivery=c.status==='fulfilling';
 return {day:delivery?c.deliveryDay:c.paymentDay,delivery,sameDay:delivery&&c.deliveryDay===c.paymentDay,clientId:c.clientId,contract:c};
}
export function canonicalOpeningCalendar(a){
 if(!a||!actions.has(a.type)||Object.keys(a).length!==3||!Object.hasOwn(a,'type')||!Object.hasOwn(a,'clientId')||!Object.hasOwn(a,'checkedDay')||
    !clients.has(a.clientId)||!day(a.checkedDay))return null;
 return {type:a.type,clientId:a.clientId,checkedDay:a.checkedDay};
}
export function applyOpeningCalendar(s,a){
 const due=openingContractMilestone(s,s?.openingParallel?a.clientId:undefined);
 if(!due||a.checkedDay!==s.day||a.clientId!==due.clientId||s.day<due.day||
    (a.type==='DELIVER_OPENING_ORDER_V1')!==due.delivery)return s;
 const n=structuredClone(s),c=s.openingParallel?n.contracts.find(c=>openingOrder(c)&&c.clientId===a.clientId):n.contracts.at(-1);
 if(due.delivery&&!due.sameDay){
  c.status='receivable';
  n.feedback={kind:'opening-delivered',message:'已交货，按约定日期收'+(c.deposit>0?'尾款':'货款')+'。'};
 }else{
  c.status='paid';n.phase='paid';n.cash+=c.balanceDue;
  if(s.openingParallel)n.clientIndex=[...clients].indexOf(c.clientId);
  n.feedback={kind:'paid',message:`${c.clientName.split(' · ')[0]} 的货款已收齐，这单净赚 ${c.netProfit}。`};
 }
 return n;
}
