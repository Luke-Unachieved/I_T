import {prospectInbox} from './deal-room-prospects.js';

export const WORKSPACE_DAY_COST=30;
const safe=n=>Number.isSafeInteger(n)&&n>=0;
export function previewWorkspaceSleep(s){
 if(!s||!safe(s.day)||s.day<1||!safe(s.cash)||!safe(s.day+1))return {valid:false,reason:'现在不能结这一天的账。',pending:[]};
 const due=prospectInbox(s).filter(r=>r.replyBy===s.day).map(r=>r.person.displayName+'的询盘今天截止');
 const active=s.contracts?.find(c=>c.status!=='paid')||s.market?.active&&['preparing','transit','receivable','legacy-preparing','legacy-transit','legacy-receivable'].includes(s.market.status);
 const paused=['market','review','complete'].includes(s.phase)&&(!s.supplyPlan||s.supplyPlan.completed===true);
 const reason=active?'手上还有待交付或待收款的合同，请先按原计划处理。':!paused?'先回工作台，确认今天的事都记下来了。':s.cash<WORKSPACE_DAY_COST?'手头还不够付今天的工作室开支。':'';
 return {valid:!reason,reason,pending:due,cost:WORKSPACE_DAY_COST,nextDay:s.day+1,checkedDay:s.day,cashAfter:s.cash-WORKSPACE_DAY_COST};
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
