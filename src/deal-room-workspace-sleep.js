import {repeatContractMilestone} from './deal-room-repeat-calendar.js';
import {openingContractMilestone} from './deal-room-opening-calendar.js';
import {marketCalendarDue} from './deal-room-market-calendar.js';
import {prospectInbox} from './deal-room-prospects.js';

export const WORKSPACE_DAY_COST=30;
const safe=n=>Number.isSafeInteger(n)&&n>=0;
const accountMilestone=s=>s?.phase==='account'?(s.account?.status==='fulfilling'?s.account.deliveryDay:s.account?.status==='receivable'?s.account.paymentDay:null):null;
const workspaceActiveOrder=s=>s?.contracts?.find(c=>c.status!=='paid')||s?.market?.active&&['preparing','transit','receivable','legacy-preparing','legacy-transit','legacy-receivable'].includes(s.market.status);
export function workspaceProgressCue(s){
 const openingDue=openingContractMilestone(s)||repeatContractMilestone(s);
 if(openingDue&&s.day>=openingDue.day)return {reason:openingDue.delivery?'这批货该交付了。':'这批货的尾款到期了。',tab:'orders',label:'去订单'};
 const market=marketCalendarDue(s);
 if(market&&s.day>=market.day)return {reason:market.stage==='ship'?'这批设备今天该装船了。':market.delivery?'今天该交付这笔订单。':'这笔订单的尾款已到期。',tab:'orders',label:'去订单'};
 const milestone=accountMilestone(s);
 if(safe(milestone)&&s.day>=milestone)return {reason:s.account.status==='fulfilling'?'这批货今天该交付了。':'这批货的尾款到期了。',tab:'orders',label:'去订单'};

 if(workspaceActiveOrder(s))return {reason:'还有待交付或待收款的订单，请到「订单」继续处理。',tab:'orders',label:'去订单'};
 const opening=!s?.businessRound&&!s?.clientProjectActive;
 const paid=(s?.contracts||[]).filter(c=>c.status==='paid'&&!c.businessRound&&!c.projectId).length;
 if(s?.phase==='paid'){
  if(opening&&paid>0&&paid<3)return {reason:`开场订单已收齐 ${paid} / 3。在「订单」点「看看下一位客户」，完成三单后就能自由安排。`,tab:'orders',label:'打开这笔回执'};
  if(opening&&paid===3)return {reason:'三位客户的货款已收齐。在「订单」点「回工作室，看看新机会」，结束开场。',tab:'orders',label:'打开这笔回执'};
  return {reason:'这笔货款已收齐。在「订单」从收款回执继续本轮安排。',tab:'orders',label:'打开这笔回执'};
 }
 if(opening&&s?.phase==='negotiating'&&paid<3)return {reason:`开场订单已收齐 ${paid} / 3。先去「收件箱」看还没接的开场询盘。`,tab:'inbox',label:'去收件箱'};
 if(s?.phase==='market'&&['draft','paid'].includes(s.market?.status))return {reason:'退出采购台，回到工作室后就可以购买。'};
 return {reason:'请先完成或退出正在办理的工作。'};
}
export function previewWorkspaceSleep(s){
 if(!s||!safe(s.day)||s.day<1||!safe(s.cash)||!safe(s.day+1))return {valid:false,reason:'现在不能结这一天的账。',pending:[]};
 const due=prospectInbox(s).filter(r=>r.replyBy===s.day).map(r=>r.person.displayName+'的询盘今天截止');
 const active=workspaceActiveOrder(s);
 const paused=['market','review','complete'].includes(s.phase)&&(!s.supplyPlan||s.supplyPlan.completed===true);
 const milestone=accountMilestone(s);
 const market=marketCalendarDue(s),waitingForMarket=market&&s.day<market.day&&!s.contracts?.some(c=>c.status!=='paid');
 const waitingForAccount=!active&&safe(milestone)&&s.day<milestone;
 const opening=openingContractMilestone(s)||repeatContractMilestone(s),waitingForOpening=opening&&s.day<opening.day;
 const cue=!waitingForOpening&&!waitingForMarket&&(active||!paused&&!waitingForAccount)?workspaceProgressCue(s):null;
 const reason=cue?.reason||(s.cash<WORKSPACE_DAY_COST?'手头还不够付今天的工作室开支。':'');
 return {valid:!reason,reason,pending:due,cost:WORKSPACE_DAY_COST,nextDay:s.day+1,checkedDay:s.day,cashAfter:s.cash-WORKSPACE_DAY_COST,...(cue?.tab?{nextStep:{tab:cue.tab,label:cue.label}}:{})};
}
export function canonicalWorkspaceSleep(a){
 if(!a||a.type!=='SLEEP_TO_NEXT_DAY'||Object.keys(a).length!==3||!Object.hasOwn(a,'type')||!Object.hasOwn(a,'checkedDay')||!Object.hasOwn(a,'acknowledgePending')||!safe(a.checkedDay)||a.checkedDay<1||typeof a.acknowledgePending!=='boolean')return null;
 return {type:a.type,checkedDay:a.checkedDay,acknowledgePending:a.acknowledgePending};
}
export function applyWorkspaceSleep(s,a){
 const q=previewWorkspaceSleep(s),c=canonicalWorkspaceSleep(a);
 if(!c||!q.valid||q.checkedDay!==c.checkedDay||q.pending.length&&!c.acknowledgePending)return s;
 const n=structuredClone(s);n.day=q.nextDay;n.cash=q.cashAfter;
 n.feedback={kind:'workspace-next-day',message:'到了第 '+n.day+' 天，工作室开支 ¥'+q.cost+' 已入账。'};
 return n;
}
