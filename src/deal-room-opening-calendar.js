const clients=new Set(['mira','samir','ines']);
const actions=new Set(['DELIVER_OPENING_ORDER_V1','COLLECT_OPENING_ORDER_V1']);
const day=n=>Number.isSafeInteger(n)&&n>=1;

export function openingContractMilestone(s){
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
 const due=openingContractMilestone(s);
 if(!due||a.checkedDay!==s.day||a.clientId!==due.clientId||s.day<due.day||
    (a.type==='DELIVER_OPENING_ORDER_V1')!==due.delivery)return s;
 const n=structuredClone(s),c=n.contracts.at(-1);
 if(due.delivery&&!due.sameDay){
  c.status='receivable';
  n.feedback={kind:'opening-delivered',message:'货已交付，按合同等尾款。'};
 }else{
  c.status='paid';n.phase='paid';n.cash+=c.balanceDue;
  n.feedback={kind:'paid',message:`${c.clientName.split(' · ')[0]} 的货款已收齐，这单净赚 ${c.netProfit}。`};
 }
 return n;
}
