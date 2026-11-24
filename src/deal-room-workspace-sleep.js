import {roundCalendarDue,creditRoundSleep} from './deal-room-round-receivables.js';
import {specialtyMilestone,creditSpecialtySleep} from './deal-room-specialty-calendar.js';
import {coreCalendarMilestone} from './deal-room-core-calendar.js';
import {openingMarketOrders} from './deal-room-opening-market.js';
import {repeatContractMilestone} from './deal-room-repeat-calendar.js';
import {openingContractMilestone} from './deal-room-opening-calendar.js';
import {marketParallelDue,parkedMarketOrders} from './deal-room-market.js';
import {prospectInbox} from './deal-room-prospects.js';

export const WORKSPACE_DAY_COST=30;
const safe=n=>Number.isSafeInteger(n)&&n>=0;
const accountMilestone=s=>s?.phase==='account'?(s.account?.status==='fulfilling'?s.account.deliveryDay:s.account?.status==='receivable'?s.account.paymentDay:null):null;
const workspaceActiveOrder=s=>openingMarketOrders(s).length>0||parkedMarketOrders(s).length>0||s?.contracts?.find(c=>c.status!=='paid')||s?.market?.active&&['preparing','transit','receivable','legacy-preparing','legacy-transit','legacy-receivable'].includes(s.market.status);
export function workspaceProgressCue(s){
 const openingDue=openingContractMilestone(s)||repeatContractMilestone(s);
 if(openingDue&&s.day>=openingDue.day)return {reason:openingDue.delivery?'这批货该交付了。':openingDue.contract?.deposit>0?'这批货的尾款到期了。':'这批货的货款到期了。',tab:'orders',label:'去订单'};
 const market=marketParallelDue(s);
 if(market&&s.day>=market.day)return {reason:market.stage==='ship'?'这批设备今天该装船了。':market.delivery?'今天该交付这笔订单。':'这笔订单的尾款已到期。',tab:'orders',label:'去订单'};
 const milestone=accountMilestone(s);
 if(safe(milestone)&&s.day>=milestone)return {reason:s.account.status==='fulfilling'?'这批货今天该交付了。':'这批货的尾款到期了。',tab:'orders',label:'去订单'};

 if(workspaceActiveOrder(s))return {reason:'还有待交付或待收款的订单，请到「订单」继续处理。',tab:'orders',label:'去订单'};
 const opening=!s?.businessRound&&!s?.clientProjectActive;
 const paid=(s?.contracts||[]).filter(c=>c.status==='paid'&&!c.businessRound&&!c.projectId).length;
 if(s?.phase==='paid'){
  if(opening&&paid>0&&paid<3)return {reason:`已有 ${paid} 位客户付清货款。去订单看看回执，再打开下一封来信。`,tab:'orders',label:'去订单'};
  if(opening&&paid===3)return {reason:'三位客户都付清了。在订单页点「回工作室，看看新机会」，就能安排明天的生意。',tab:'orders',label:'去订单'};
  return {reason:'这笔货款收齐了。先去订单看看回执。',tab:'orders',label:'去订单'};
 }
 if(opening&&s?.phase==='negotiating'&&paid<3)return {reason:`已有 ${paid} 位客户付清货款。还有几封来信没处理，可以先去看看。`,tab:'inbox',label:'去收件箱'};
 if(s?.phase==='market'&&['draft','paid'].includes(s.market?.status))return {reason:'退出采购台，回到工作室后就可以购买。'};
 return {reason:'请先完成或退出正在办理的工作。'};
}
export function previewWorkspaceSleep(s,{live=false}={}){
 if(!s||!safe(s.day)||s.day<1||!safe(s.cash)||!safe(s.day+1))return {valid:false,reason:'现在不能结这一天的账。',pending:[]};
 const due=prospectInbox(s).filter(r=>r.replyBy===s.day).map(r=>r.person.displayName+'的询盘今天截止');
 const active=workspaceActiveOrder(s);
 const paused=['market','review','complete'].includes(s.phase)&&(!s.supplyPlan||s.supplyPlan.completed===true);
 const milestone=accountMilestone(s);
 const market=marketParallelDue(s),waitingForMarket=market&&s.day<market.day&&(!s.contracts?.some(c=>c.status!=='paid')||s.openingMarket);
 const waitingForAccount=!active&&safe(milestone)&&s.day<milestone;
 const opening=openingContractMilestone(s)||repeatContractMilestone(s),waitingForOpening=opening&&s.day<opening.day;
 const sharedDue=s.openingMarket&&[opening?.day,market?.day].some(d=>safe(d)&&d<=s.day);
 const baseCue=sharedDue?workspaceProgressCue(s):s.openingParallel&&opening&&!waitingForOpening&&s.phase==='paid'&&(s.contracts||[]).some(c=>c.status!=='paid')?workspaceProgressCue(s):!waitingForOpening&&!waitingForMarket&&(active||!paused&&!waitingForAccount)?workspaceProgressCue(s):null;
 const core=live?coreCalendarMilestone(s):null;
 const pendingGlobal=[opening?.day,market?.day,milestone].some(d=>safe(d)&&d<=s.day);
 const round=live?roundCalendarDue(s):null;
 const roundCue=round&&s.day>=round.day?{reason:round.delivery?'这笔周转订单该交货了。':'这笔周转订单今天该收款了。',tab:'orders',label:'去订单'}:null;
 const coreCue=core&&s.day>=core.day?{reason:'今天得先处理：'+core.label+'。',tab:'orders',label:'去订单'}:null;
 const deferred=live&&['portfolio','development','supplier-development','curation-fulfillment','case-growth','collection','collection-revision','stock-procurement','shop-trial','atelier-restock','linen-freight','planning-fulfillment','launch-project'].includes(s.phase);
 const specialty=live?specialtyMilestone(s):null;
 const specialtyCue=specialty?.required&&specialty.ready?{reason:'今天得先处理：'+specialty.label+'。',tab:'orders',label:'去订单'}:null;
 const cue=coreCue??specialtyCue??roundCue??((core||specialty||round||deferred)&&!pendingGlobal?null:baseCue);
 const reason=cue?.reason||(s.cash<WORKSPACE_DAY_COST?'手头还不够付今天的工作室开支。':'');
 return {valid:!reason,reason,pending:due,cost:WORKSPACE_DAY_COST,nextDay:s.day+1,checkedDay:s.day,cashAfter:s.cash-WORKSPACE_DAY_COST,...(cue?.tab?{nextStep:{tab:cue.tab,label:cue.label}}:{})};
}
export function canonicalWorkspaceSleep(a){
 if(!a||!['SLEEP_TO_NEXT_DAY','SLEEP_TO_NEXT_DAY_V2'].includes(a.type)||Object.keys(a).length!==3||!Object.hasOwn(a,'type')||!Object.hasOwn(a,'checkedDay')||!Object.hasOwn(a,'acknowledgePending')||!safe(a.checkedDay)||a.checkedDay<1||typeof a.acknowledgePending!=='boolean')return null;
 return {type:a.type,checkedDay:a.checkedDay,acknowledgePending:a.acknowledgePending};
}
export function applyWorkspaceSleep(s,a){
 const q=previewWorkspaceSleep(s,{live:a?.type==='SLEEP_TO_NEXT_DAY_V2'}),c=canonicalWorkspaceSleep(a);
 if(!c||!q.valid||q.checkedDay!==c.checkedDay||q.pending.length&&!c.acknowledgePending)return s;
 const n=structuredClone(s);n.day=q.nextDay;n.cash=q.cashAfter;
 n.feedback={kind:'workspace-next-day',message:'到了第 '+n.day+' 天，工作室开支 ¥'+q.cost+' 已入账。'};
 return a.type==='SLEEP_TO_NEXT_DAY_V2'?creditRoundSleep(s,creditSpecialtySleep(s,n,q.cost),q.cost):n;
}

export const previewLiveWorkspaceSleep=s=>previewWorkspaceSleep(s,{live:true});
