import {cupPaperProofArt} from './deal-room-samples.js';
import {comparePriorUnitPrice} from './deal-room-goods-prices.js';
import {roundQuoteNote} from './deal-room-round-view.js';
// Presentation only. PROPOSE remains the canonical historical signing action.
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = value => typeof value === 'number' && Number.isFinite(value) ? `¥${value.toLocaleString('zh-CN')}` : '待确认';
function shelfProofView(o){
 if(!['cup-front-proof','cup-back-proof'].includes(o?.id))return '';
 const back=o.id==='cup-back-proof',label=back?'保留正面纹样、背面中间另贴标签':'正面留白，标签平印在面内';
 return `<details class="shelf-proof" open><summary>核对这次的包装校样</summary>${cupPaperProofArt(back?'back':'front',label+'；折线不穿过标签')}<p>${back?'正面保留原图案。另印一张背贴，多一道贴标工序。':'正面让出一块空白，标签与纸套一次印成，不加背贴。'}</p></details>`;
}

export function quoteOptionExplanation(state, offer) {
  // Do not reveal an as-yet unmet next buyer's opening window to the player.
  if (!state.businessRound && !state.clientProjectActive && state.clientIndex === 0) {
    if (offer.id === 'trial') return 'Mira：先做 60 盏试卖，交货时我付清货款。';
    if (offer.id === 'rollout') return 'Mira：120 盏可以铺进三家店；交货后请给我 4 天账期。';
  }
  return (offer.exchange || '').replace('本次总净赚较少','这单预计赚得较少');
}
export function quoteCommitmentView(state, offer, {roundActive=false,counterMessage='',action='PROPOSE',quantityLabel=null,client=null}={}) {
  if (!offer) return '';
  const signed = offer.accepted !== false;
  const nextStep = roundActive&&action==='PROPOSE' ? (signed&&offer.valid?roundQuoteNote(state,offer,client?.id):'') : offer.opportunityNote;
  const validLot = Number.isSafeInteger(offer.quantity) && offer.quantity > 0;
  const per = n => (n / offer.quantity).toLocaleString('zh-CN',{maximumFractionDigits:2});
  const set = action === 'SIGN_CURATION';
  const unit = client?.id==='mira'?'盏':client?.id==='samir'?'只':client?.id==='ines'?'条':'件';
  const pricing = signed && validLot && [offer.revenue,offer.cost].every(n=>Number.isSafeInteger(n)&&n>=0)
    ? '<p class="quote-action-note">'+(set?'每套':'折合每'+unit)+'：货款 ¥'+per(offer.revenue)+'，备货及交货成本 ¥'+per(offer.cost)+'。按整单结算。</p>' : '';
  const deposit = offer.deposit || 0;
  const advance = Math.max(0, offer.cost - deposit);
  const twoReceipts = roundActive && offer.valid && Number.isSafeInteger(offer.paymentDay) && Number.isSafeInteger(offer.projectedSettlementDay) && offer.projectedSettlementDay > offer.paymentDay && Number.isSafeInteger(offer.cashAtOwnPayment);
  const expectedBalances = twoReceipts ? `<div class="quote-dated-balances" aria-label="预计可用资金" style="display:grid;gap:.35rem"><div><small>第 ${offer.paymentDay} 天 · 本单收齐</small><strong>${money(offer.cashAtOwnPayment)}</strong></div><div><small>第 ${offer.projectedSettlementDay} 天 · 两单收齐</small><strong>${money(offer.cashAfterPayment)}</strong></div></div>` : '';
  const counter = counterMessage ? `<p class="counter" role="alert">${escape(counterMessage)}</p>` : '';
  const reason = !offer.valid ? `<p class="quote-blocked" role="status">${escape(offer.reason)}</p>` : '';
  if (!signed) return `<section class="quote-commitment" aria-label="待商议的报价">
    <div class="quote-price"><span>想谈的货款</span><strong>${money(offer.revenue)}</strong><small>${escape(quantityLabel||`${offer.quantity} 件`)}</small></div>
    <p class="quote-action-note">${escape(offer.id==='promise'&&client?.id==='samir'?'120 只定制，不能作为开业批签约':offer.title)}</p>
    <p class="quote-action-note">付款和交货条件还没谈妥，先听听客户的回复，这一步不花钱。</p>
    ${reason}${counter}
    <button class="primary" data-action="${escape(action)}" ${offer.valid?'':'disabled'}>问问客户的意思 <span aria-hidden="true">→</span></button>
  </section>`;
  return `<section class="quote-commitment" aria-label="签约与资金明细">
    <div class="quote-price"><span>这单货款</span><strong>${money(offer.revenue)}</strong><small>${escape(quantityLabel||`${offer.quantity} 件`)}</small></div>
    ${pricing}${action==='PROPOSE'?comparePriorUnitPrice(state,offer,client)+shelfProofView(offer):''}<dl class="quote-now">${deposit>0?`<div><dt>客户先付定金</dt><dd>${money(deposit)}</dd></div>`:''}<div><dt>备货和交货</dt><dd>${money(offer.cost)}</dd></div>${deposit>0?`<div><dt>你先垫付</dt><dd>${money(advance)}</dd></div>`:''}<div class="quote-cash"><dt>${offer.cashAfterSigning<0?'还差':'签完还剩'}</dt><dd>${money(offer.cashAfterSigning<0?-offer.cashAfterSigning:offer.cashAfterSigning)}</dd></div></dl>
    <div class="quote-schedule"><span>第 <b>${offer.deliveryDay}</b> 天交货</span><span>第 <b>${offer.paymentDay}</b> 天收齐货款</span></div>
    <p class="quote-profit"><span>这单预计赚到</span><strong>${money(offer.netProfit)}</strong></p>
    ${(state.businessRound||state.clientProjectActive)&&nextStep?`<p class="opportunity quote-choice" aria-label="接下这单后的安排">${escape(nextStep)}</p>`:''}
    <details class="quote-breakdown"><summary>这单怎么结算</summary><p>货款 ${money(offer.revenue)} − 备货交付 ${money(offer.cost)} − ${roundActive?'仅做这单预计花费的':'回款前的'}日常开销 ${money(offer.operatingCost)} = 预计赚到 ${money(offer.netProfit)}</p><p>待收尾款 ${money(offer.balanceDue)}。${offer.valid&&!twoReceipts?(roundActive?'按已签订单的回款日期估算，收齐后':'本单收齐后')+'预计可用现金 '+money(offer.cashAfterPayment)+'。':''}</p>${expectedBalances}</details>
    ${reason}${counter}${signed?'':'<p class="quote-action-note">先听听客户的回复，这一步不花钱。</p>'}
    <button class="primary" data-action="${escape(action)}" ${offer.valid?'':'disabled'}>${signed?'签下这单':'问问客户的意思'} <span aria-hidden="true">→</span></button>
  </section>`;
}

export function quoteBuyerBrief(state, client, selected='') {
  if(state.businessRound&&!state.clientProjectActive&&client?.id==='samir'&&['cup-front-proof','cup-back-proof'].includes(selected))return '这批杯要上收银货架。标签不能跨包装折线；可以让出正面图案的位置，也可以另付一道背贴工序。普通补货还是原来的条件。';
  if(['developed-lamp','second-developed-lamp'].includes(selected)) return (selected==='second-developed-lamp'?state.secondSupplier:state.productDevelopment)?.factory==='studio'?'展台白天要亮、晚上要柔和。我想先订一批调光灯试试。':'这批门店统一用暖光灯，我想按整批采购来谈。';
  if (!state.businessRound && !state.clientProjectActive && state.clientIndex === 0 && client?.id === 'mira') return '我想先让一家店试卖。三家店一起铺货也可以，不过要等交货后四天再付清。';
  return client?.brief || '';
}
