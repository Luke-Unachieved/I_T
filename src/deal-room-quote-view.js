// Presentation only. PROPOSE remains the canonical historical signing action.
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = value => typeof value === 'number' && Number.isFinite(value) ? `¥${value.toLocaleString('zh-CN')}` : '待确认';
export function quoteOptionExplanation(state, offer) {
  // Do not reveal an as-yet unmet next buyer's opening window to the player.
  if (!state.businessRound && !state.clientProjectActive && state.clientIndex === 0) {
    if (offer.id === 'trial') return 'Mira：先做 60 盏试卖，交货时我付清货款。';
    if (offer.id === 'rollout') return 'Mira：120 盏可以铺进三家店；交货后请给我 4 天账期。';
  }
  return offer.exchange || '';
}
export function quoteCommitmentView(state, offer, {roundActive=false,counterMessage=''}={}) {
  if (!offer) return '';
  const signed = offer.accepted !== false;
  const deposit = offer.deposit || 0;
  const advance = Math.max(0, offer.cost - deposit);
  const counter = counterMessage ? `<p class="counter" role="alert">${escape(counterMessage)}</p>` : '';
  const reason = !offer.valid ? `<p class="quote-blocked" role="status">${escape(offer.reason)}</p>` : '';
  return `<section class="quote-commitment" aria-label="签约与资金明细">
    <div class="quote-price"><span>合同总价</span><strong>${money(offer.revenue)}</strong><small>${offer.quantity} 件的全部货款，不是此刻到账金额</small></div>
    <dl class="quote-now">${deposit>0?`<div><dt>签约收到定金</dt><dd>${money(deposit)}</dd></div>`:''}<div><dt>立即支付采购及履约</dt><dd>${money(offer.cost)}</dd></div>${deposit>0?`<div><dt>本次净垫资（支付减定金）</dt><dd>${money(advance)}</dd></div>`:''}<div class="quote-cash"><dt>签约后可用现金</dt><dd>${money(offer.cashAfterSigning)}</dd></div></dl>
    <div class="quote-schedule"><span>第 <b>${offer.deliveryDay}</b> 天交货</span><span>第 <b>${offer.paymentDay}</b> 天收齐货款</span></div>
    <p class="quote-profit"><span>${roundActive?'单独做本单预计净收益':'预计净收益'}</span><strong>${money(offer.netProfit)}</strong><small>尚未实现，不能当作当前余额</small></p>
    <details class="quote-breakdown"><summary>查看预计收益与回款计算</summary><p>合同 ${money(offer.revenue)} − 采购及履约 ${money(offer.cost)} − ${roundActive?'单独做本单预计':'回款前'}日常支出 ${money(offer.operatingCost)} = 预计净收益 ${money(offer.netProfit)}</p><p>待收尾款 ${money(offer.balanceDue)}。${roundActive?'按当前已签回款排程预计':'本单收齐后预计'}可用现金 ${money(offer.cashAfterPayment)}。</p></details>
    ${reason}${counter}<p class="quote-action-note">${signed?'确认后立即签约、收取约定定金并支付采购履约款。不是只发送询价。':'这个方案尚未获得客户认可。提交后先看回复，本次不会签约或扣款。'}</p>
    <button class="primary" data-action="PROPOSE" ${offer.valid?'':'disabled'}>${signed?'确认签约并安排备货':'把这个方案交给客户'} <span aria-hidden="true">→</span></button>
  </section>`;
}

export function quoteBuyerBrief(state, client) {
  if (!state.businessRound && !state.clientProjectActive && state.clientIndex === 0 && client?.id === 'mira') return '我想先让客人试试这款台灯，也在考虑一次铺进三家店。请按这两种规模给我安排数量和付款条件。';
  return client?.brief || '';
}
