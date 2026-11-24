import {retailDemand} from './deal-room-demand.js';
import {roundReceivableSummary,roundReceivablesActive,roundCalendarDue} from './deal-room-round-receivables.js';
const cash=n=>`¥${Number(n).toLocaleString('zh-CN')}`;
function datedRoundButton(s,d){
 if(!d||d.day>s.day)return '';
 return '<button type="button" class="primary" data-round-milestone="'+escape(d.clientId)+'" data-round-day="'+s.day+'">'+(d.delivery?(d.sameDay?'确认交货并收款':'确认交货'):(d.contract.deposit?'收取尾款':'收取货款'))+' →</button>';
}
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function roundCashView(state){
 const r=roundReceivableSummary(state);
 if(!r.active){
  if(state.phase!=='portfolio'||state.clientProjectActive||!state.businessRound||state.businessSigned!==0||state.contracts.some(c=>['fulfilling','receivable'].includes(c.status)))return '';
  return `<details class="round-cash"><summary>两单周转挑战</summary><p>这项可选挑战只安排两笔订单。普通接单不受挑战名额限制。</p><p>手头订单结清后，随时可以回工作室。</p><button data-action="ENABLE_ROUND_RECEIVABLES">交货后接着谈下一单 →</button></details>`;
 }
 const due=roundCalendarDue(state);
 const rows=state.contracts.filter(c=>c.roundReceivable&&c.businessRound===state.businessRound);
 return `<section class="round-cash" aria-label="本轮现金与尾款"><div class="round-balances"><span>现在能用<strong>${cash(state.cash)}</strong></span><span>已交货，待到账<strong>${cash(r.outstanding)}</strong></span></div><div class="round-orders">${rows.map(c=>`<p><strong>${escape(c.clientName.split(' · ')[0])}</strong><span>${c.status==='fulfilling'?`生产中 · 第 ${c.deliveryDay} 天交货`:c.status==='receivable'?`已交货 · 第 ${c.paymentDay} 天收 ${cash(c.balanceDue)}`:`已结清 · ${c.quantity} 件交付`}</span></p>`).join('')}</div><small>已签 ${r.signed} / 2 单 · 本轮日常支出 ${cash(r.operatingCost)}</small>${due&&!due.delivery?datedRoundButton(state,due):''}${state.phase==='portfolio'?`${r.signed===0?'<button class="quiet" data-action="CANCEL_ROUND_RECEIVABLES">还没签单，改回逐单安排</button>':''}${r.canCloseSettled&&!r.canFinish?'<button class="quiet" data-action="CLOSE_SETTLED_ROUND">这单已结清，先回工作室 →</button>':''}${r.canFinish?'<button class="primary" data-action="FINISH_ROUND_RECEIVABLES">两单都已收齐，回工作室 →</button>':`<p>${r.signed<2?(r.nextPaymentDay!==null?'可以继续谈下一单，也可以先等已交货的尾款。':r.signed===0?'先挑一位客户，谈第一份合作。':'货款已收齐。继续接单，或回工作室安排其他业务。'):'两笔都已交付，收齐尾款后结束这一轮。'}</p>`}`:''}<small>这轮货款结清后，再安排其他业务。</small></section>`;
}
export function roundProductionView(state){
 const c=state.contracts.at(-1);if(!roundReceivablesActive(state)||state.phase!=='fulfilling'||!c?.roundReceivable)return '';
 return `<h3>先把这批货交到客户手里</h3><p>${escape(c.clientName)} · ${c.quantity} 件</p><div class="fulfil-track"><span class="done">合同已签</span><span class="moving">第 ${c.deliveryDay} 天交货</span><span>第 ${c.paymentDay} 天尾款到账</span></div><p>${c.paymentDay>c.deliveryDay?(state.businessSigned<2?'货交完就能谈本轮下一单，不用等这笔尾款。':'两单已签齐，交货后核对各自的尾款日期。'):'本批交货当天收齐货款。'}</p>${roundCalendarDue(state)?.delivery?datedRoundButton(state,roundCalendarDue(state)):''}`;
}

export function roundQuoteNote(state,quote,clientId){
 const d=clientId?retailDemand(state,clientId):null;
 const stock=d&&Number.isFinite(d.rate)&&d.rate>0&&Number.isFinite(quote.quantity)&&Number.isFinite(quote.deliveryDay)?`这批约供门店卖 ${Math.ceil(quote.quantity/d.rate)} 天，预计第 ${quote.deliveryDay+Math.ceil(quote.quantity/d.rate)} 天再补货。`:'';
 return stock+(state.businessSigned<1?'交货后可以接着谈，也可以不接第二单，等这笔货款收齐就回工作室。':'这单是本轮第二份采购。两份合同的货款都收齐后，就能回工作室。');
}
