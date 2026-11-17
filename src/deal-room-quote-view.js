// Presentation only. PROPOSE remains the canonical historical signing action.
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = value => typeof value === 'number' && Number.isFinite(value) ? `¥${value.toLocaleString('zh-CN')}` : '待确认';
export function quoteOptionExplanation(state, offer) {
  // Do not reveal an as-yet unmet next buyer's opening window to the player.
  if (!state.businessRound && !state.clientProjectActive && state.clientIndex === 0) {
    if (offer.id === 'trial') return 'Mira：先做 60 盏试卖，交货时我付清货款。';
    if (offer.id === 'rollout') return 'Mira：120 盏可以铺进三家店；交货后请给我 4 天账期。';
  }
  return (offer.exchange || '').replace('本次总净赚较少','这单预计赚得较少');
}
export function quoteCommitmentView(state, offer, {roundActive=false,counterMessage='',action='PROPOSE',quantityLabel=null}={}) {
  if (!offer) return '';
  const signed = offer.accepted !== false;
  const deposit = offer.deposit || 0;
  const advance = Math.max(0, offer.cost - deposit);
  const counter = counterMessage ? `<p class="counter" role="alert">${escape(counterMessage)}</p>` : '';
  const reason = !offer.valid ? `<p class="quote-blocked" role="status">${escape(offer.reason)}</p>` : '';
  return `<section class="quote-commitment" aria-label="签约与资金明细">
    <div class="quote-price"><span>这单货款</span><strong>${money(offer.revenue)}</strong><small>${escape(quantityLabel||`${offer.quantity} 件`)}</small></div>
    <dl class="quote-now">${deposit>0?`<div><dt>客户先付定金</dt><dd>${money(deposit)}</dd></div>`:''}<div><dt>现在要付</dt><dd>${money(offer.cost)}</dd></div>${deposit>0?`<div><dt>你先垫付</dt><dd>${money(advance)}</dd></div>`:''}<div class="quote-cash"><dt>${offer.cashAfterSigning<0?'还差':'签完还剩'}</dt><dd>${money(offer.cashAfterSigning<0?-offer.cashAfterSigning:offer.cashAfterSigning)}</dd></div></dl>
    <div class="quote-schedule"><span>第 <b>${offer.deliveryDay}</b> 天交货</span><span>第 <b>${offer.paymentDay}</b> 天收齐货款</span></div>
    <p class="quote-profit"><span>这单预计赚到</span><strong>${money(offer.netProfit)}</strong></p>
    <details class="quote-breakdown"><summary>这单怎么结算</summary><p>货款 ${money(offer.revenue)} − 备货交付 ${money(offer.cost)} − ${roundActive?'仅做这单预计花费的':'回款前的'}日常开销 ${money(offer.operatingCost)} = 预计赚到 ${money(offer.netProfit)}</p><p>待收尾款 ${money(offer.balanceDue)}。${roundActive?'按当前已签回款排程预计':'本单收齐后预计'}可用现金 ${money(offer.cashAfterPayment)}。</p></details>
    ${reason}${counter}${signed?'':'<p class="quote-action-note">先听听客户的回复，这一步不花钱。</p>'}
    <button class="primary" data-action="${escape(action)}" ${offer.valid?'':'disabled'}>${signed?'签下这单':'问问客户的意思'} <span aria-hidden="true">→</span></button>
  </section>`;
}

export function quoteBuyerBrief(state, client, selected='') {
  if(['developed-lamp','second-developed-lamp'].includes(selected)) return (selected==='second-developed-lamp'?state.secondSupplier:state.productDevelopment)?.factory==='studio'?'展台白天要亮、晚上要柔和。我想先订一批调光灯试试。':'这批门店统一用暖光灯，我想按整批采购来谈。';
  if (!state.businessRound && !state.clientProjectActive && state.clientIndex === 0 && client?.id === 'mira') return '我想先让一家店试卖。三家店一起铺货也可以，不过要等交货后四天再付清。';
  return client?.brief || '';
}
