import {SAMPLE_FACTORIES,applySecondSupplierAction} from './deal-room-development.js?v=36';
import {applyShopTrialAction} from './deal-room-shop-trial.js?v=36';
import {applyLinenFreight} from './deal-room-linen-freight.js?v=36';
import {applyAtelierRestock} from './deal-room-atelier-restock.js?v=36';

export const SPECIALTY_MILESTONE='SPECIALTY_MILESTONE_V1';
const tasks=new Set(['first-sample-collect','second-sample','shop-trial-settle','linen-freight-receive','atelier-restock-deliver','atelier-restock-collect']);
const positiveDay=day=>Number.isSafeInteger(day)&&day>0;
const home=phase=>phase==='review'||phase==='complete';

function dated(s,task,dueDay,label,waitingLabel,{required=true,allowLate=true}={}){
 if(!positiveDay(s?.day)||!positiveDay(dueDay))return null;
 // A sample can leave the workshop waiting screen while other business continues.
 // If it is picked up after its arrival date, retain the original date as dueDay.
 const day=allowLate?Math.max(s.day,dueDay):dueDay;
 return {task,day,dueDay,label,waitingLabel,ready:s.day===day,required};
}
function sample(s,entry,task,{required,allowReceived,label}){
 if(!entry||!Object.hasOwn(SAMPLE_FACTORIES,entry.factory)||!positiveDay(entry.sampleDay)||!Number.isSafeInteger(entry.investment)||entry.investment<0)return null;
 if(entry.status!=='sampling'&&!(allowReceived&&entry.status==='received'))return null;
 return dated(s,task,entry.sampleDay,label,'样品到货',{required,allowLate:true});
}

export function specialtyMilestone(s,{allowLate=true}={}){
 if(!s)return null;
 if(s.phase==='development')return sample(s,s.productDevelopment,'first-sample-collect',{required:true,allowReceived:false,label:'拆开寄来的样品'});
 if(home(s.phase))return sample(s,s.productDevelopment,'first-sample-collect',{required:false,allowReceived:true,label:'查看工厂样品'});
 if(s.phase==='supplier-development'&&s.productDevelopment?.status==='active'){
  const other=s.productDevelopment.factory==='studio'?'line':'studio';
  if(s.secondSupplier?.factory===other)return sample(s,s.secondSupplier,'second-sample',{required:true,allowReceived:false,label:'拆开另一家的样品'});
 }
 if(s.phase==='shop-trial'&&s.shopTrial?.status==='display'){
  return dated(s,'shop-trial-settle',s.shopTrial.settlementDay,s.shopTrial.returned?'收款并收回陈列灯':'收齐货款','小店结算',{allowLate});
 }
 if(s.phase==='linen-freight'&&s.linenFreight?.status==='transit'){
  const {signedDay,index,lots}=s.linenFreight,lot=lots?.[index];
  if(!positiveDay(signedDay)||!positiveDay(lot?.after)||!positiveDay(lot?.quantity))return null;
  return dated(s,'linen-freight-receive',signedDay+lot.after,`确认 ${lot.quantity} 条桌布签收并收款`,`${lot.quantity} 条桌布签收并收款`,{allowLate});
 }
 if(s.phase==='atelier-restock'){
  const p=s.atelierRestock;
  if(p?.status==='production')return dated(s,'atelier-restock-deliver',p.deliveryDay,p.lag?'确认交货':'确认交货并收款',p.lag?'交货':'交货并收款',{allowLate});
  if(p?.status==='receivable')return dated(s,'atelier-restock-collect',p.paymentDay,'收齐尾款','收尾款',{allowLate});
 }
 return null;
}

export function canonicalSpecialtyMilestone(a){
 if(!a||typeof a!=='object'||Array.isArray(a)||Object.keys(a).length!==3||
    !['type','task','checkedDay'].every(k=>Object.hasOwn(a,k))||![SPECIALTY_MILESTONE,'SPECIALTY_MILESTONE_V2'].includes(a.type)||
    !tasks.has(a.task)||!positiveDay(a.checkedDay))return null;
 return {type:a.type,task:a.task,checkedDay:a.checkedDay};
}

export function applySpecialtyMilestone(s,a){
 const action=canonicalSpecialtyMilestone(a),allowLate=action?.type==='SPECIALTY_MILESTONE_V2',m=action?specialtyMilestone(s,{allowLate}):null;
 if(!m?.ready||action.task!==m.task||action.checkedDay!==s.day)return s;
 switch(action.task){
  case 'first-sample-collect':return applySecondSupplierAction(s,{type:'COLLECT_FIRST_SAMPLE'},{calendar:true,allowLate});
  case 'second-sample':return applySecondSupplierAction(s,{type:'RECEIVE_SECOND_SAMPLE'},{calendar:true,allowLate});
  case 'shop-trial-settle':return applyShopTrialAction(s,{type:'SETTLE_SHOP_TRIAL'},{calendar:true,allowLate});
  case 'linen-freight-receive':return applyLinenFreight(s,{type:'RECEIVE_LINEN_FREIGHT'},false,{calendar:true,allowLate});
  case 'atelier-restock-deliver':return applyAtelierRestock(s,{type:'DELIVER_ATELIER_RESTOCK'},false,{calendar:true,allowLate});
  case 'atelier-restock-collect':return applyAtelierRestock(s,{type:'COLLECT_ATELIER_RESTOCK'},false,{calendar:true,allowLate});
  default:return s;
 }
}

/** Attribute only the one daily fee the new sleep action already deducted.
 * While a sample is parked and other deals run, the same day is not its cost.
 * Original SLEEP_TO_NEXT_DAY journal actions never call this helper.
 */
export function creditSpecialtySleep(previous,next,charge){
 if(!previous||!next||next.day!==previous.day+1||!Number.isSafeInteger(charge)||charge<=0)return next;
 const m=specialtyMilestone(previous);
 const key=previous.phase==='development'&&m?.task==='first-sample-collect'?'productDevelopment':
   previous.phase==='supplier-development'&&m?.task==='second-sample'?'secondSupplier':null;
 if(!key||previous.day>=m.dueDay||next[key]?.status!=='sampling'||next[key].sampleDay!==m.dueDay)return next;
 const investment=next[key].investment+charge;
 if(!Number.isSafeInteger(investment))return next;
 return {...next,[key]:{...next[key],investment}};
}

export function specialtyMilestoneView(s,{hideWaiting=false}={}){
 const m=specialtyMilestone(s);
 if(!m)return '';
 return m.ready?`<button type="button" class="primary" data-specialty-milestone="${m.task}" data-specialty-day="${m.day}">${m.label} →</button>`:
  hideWaiting?'':`<p class="brief specialty-wait">第 ${m.dueDay} 天${m.waitingLabel}。</p>`;
}
