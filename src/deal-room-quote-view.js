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
/** Quoted cash milestones, never an interpolated daily market or balance forecast. */
export function quoteCashPathView(state,offer,{roundActive=false}={}){
 if(!offer||offer.accepted===false||offer.valid===false)return '';
 const split=roundActive&&Number.isSafeInteger(offer.paymentDay)&&Number.isSafeInteger(offer.projectedSettlementDay)&&offer.projectedSettlementDay>offer.paymentDay;
 const dated=(day,label)=>`第 ${day} 天 · ${label}`;
 const labels=['现在','签约后'],values=[state?.cash,offer.cashAfterSigning];
 if(split&&Number.isSafeInteger(offer.cashAtOwnPayment)){labels.push(dated(offer.paymentDay,'本单收齐'));values.push(offer.cashAtOwnPayment);}
 labels.push(split?dated(offer.projectedSettlementDay,'两单收齐'):'收齐后');values.push(offer.cashAfterPayment);
 if(!values.every(value=>Number.isSafeInteger(value)&&value>=0))return '';
 const low=Math.min(0,...values),high=Math.max(0,...values),range=Math.max(1,high-low);
 const y=value=>12+(high-value)/range*42,x=values.map((_,i)=>24+i*252/(values.length-1));
 const points=values.map((value,i)=>`${x[i]},${y(value).toFixed(2)}`).join(' ');
 const zero=y(0).toFixed(2),summary=labels.map((label,i)=>label+(i?'预计 ':' ')+money(values[i])).join('，');
 return `<figure class="quote-cash-path" aria-label="${escape(summary)}"><figcaption>这单的钱怎样走 <small>${values.length===4?'签约后各项为预计':'后两项为预计'}</small></figcaption><svg viewBox="0 0 300 68" aria-hidden="true" focusable="false"><path d="M24 ${zero}H276" class="cash-path-zero"/><polyline points="${points}" class="cash-path-line"/>${values.map((value,i)=>`<circle cx="${x[i]}" cy="${y(value).toFixed(2)}" r="4" class="cash-path-dot ${value<0?'cash-path-negative':''}"/>`).join('')}</svg><div class="cash-path-values${values.length===4?' cash-path-four':''}">${labels.map((label,i)=>`<div class="${values[i]<0?'cash-path-negative':''}"><small>${label}</small><strong>${money(values[i])}</strong></div>`).join('')}</div>${roundActive?`<small class="cash-path-context">${split?'另一单在本单之后到账，不能提前算进本单收款日的现金。':'收齐后金额包含其他已签订单在这期间的到期回款。'}</small>`:''}</figure>`;
}
export function quoteCommitmentView(state, offer, {roundActive=false,counterMessage='',action='PROPOSE',quantityLabel=null}={}) {
  if (!offer) return '';
  const signed = offer.accepted !== false;
  const validLot = Number.isSafeInteger(offer.quantity) && offer.quantity > 0;
  const per = n => (n / offer.quantity).toLocaleString('zh-CN',{maximumFractionDigits:2});
  const set = action === 'SIGN_CURATION';
  const pricing = signed && validLot && [offer.revenue,offer.cost].every(n=>Number.isSafeInteger(n)&&n>=0)
    ? '<p class="quote-action-note">'+(set?'每套':'折合每件')+'：货款 ¥'+per(offer.revenue)+'，备货交付 ¥'+per(offer.cost)+'。按整单结算。</p>' : '';
  const deposit = offer.deposit || 0;
  const advance = Math.max(0, offer.cost - deposit);
  const counter = counterMessage ? `<p class="counter" role="alert">${escape(counterMessage)}</p>` : '';
  const reason = !offer.valid ? `<p class="quote-blocked" role="status">${escape(offer.reason)}</p>` : '';
  if (!signed) return `<section class="quote-commitment" aria-label="待商议的报价">
    <div class="quote-price"><span>想谈的货款</span><strong>${money(offer.revenue)}</strong><small>${escape(quantityLabel||`${offer.quantity} 件`)}</small></div>
    <p class="quote-action-note">${escape(offer.title)}</p>
    <p class="quote-action-note">付款和交货条件还没谈妥，先听听客户的回复，这一步不花钱。</p>
    ${reason}${counter}
    <button class="primary" data-action="${escape(action)}" ${offer.valid?'':'disabled'}>问问客户的意思 <span aria-hidden="true">→</span></button>
  </section>`;
  return `<section class="quote-commitment" aria-label="签约与资金明细">
    <div class="quote-price"><span>这单货款</span><strong>${money(offer.revenue)}</strong><small>${escape(quantityLabel||`${offer.quantity} 件`)}</small></div>
    ${pricing}<dl class="quote-now">${deposit>0?`<div><dt>客户先付定金</dt><dd>${money(deposit)}</dd></div>`:''}<div><dt>现在要付</dt><dd>${money(offer.cost)}</dd></div>${deposit>0?`<div><dt>你先垫付</dt><dd>${money(advance)}</dd></div>`:''}<div class="quote-cash"><dt>${offer.cashAfterSigning<0?'还差':'签完还剩'}</dt><dd>${money(offer.cashAfterSigning<0?-offer.cashAfterSigning:offer.cashAfterSigning)}</dd></div></dl>
    <div class="quote-schedule"><span>第 <b>${offer.deliveryDay}</b> 天交货</span><span>第 <b>${offer.paymentDay}</b> 天收齐货款</span></div>
    ${quoteCashPathView(state,offer,{roundActive})}
    <p class="quote-profit"><span>这单预计赚到</span><strong>${money(offer.netProfit)}</strong></p>
    ${(state.businessRound||state.clientProjectActive)&&offer.opportunityNote?`<p class="opportunity quote-choice" aria-label="接下这单后的安排">${escape(offer.opportunityNote)}</p>`:''}
    <details class="quote-breakdown"><summary>这单怎么结算</summary><p>货款 ${money(offer.revenue)} − 备货交付 ${money(offer.cost)} − ${roundActive?'仅做这单预计花费的':'回款前的'}日常开销 ${money(offer.operatingCost)} = 预计赚到 ${money(offer.netProfit)}</p><p>待收尾款 ${money(offer.balanceDue)}。${roundActive&&offer.projectedSettlementDay>offer.paymentDay?`到第 ${offer.projectedSettlementDay} 天两单结清后预计`:roundActive?'按当前已签回款排程预计':'本单收齐后预计'}可用现金 ${money(offer.cashAfterPayment)}。</p></details>
    ${reason}${counter}${signed?'':'<p class="quote-action-note">先听听客户的回复，这一步不花钱。</p>'}
    <button class="primary" data-action="${escape(action)}" ${offer.valid?'':'disabled'}>${signed?'签下这单':'问问客户的意思'} <span aria-hidden="true">→</span></button>
  </section>`;
}

export function quoteBuyerBrief(state, client, selected='') {
  if(['developed-lamp','second-developed-lamp'].includes(selected)) return (selected==='second-developed-lamp'?state.secondSupplier:state.productDevelopment)?.factory==='studio'?'展台白天要亮、晚上要柔和。我想先订一批调光灯试试。':'这批门店统一用暖光灯，我想按整批采购来谈。';
  if (!state.businessRound && !state.clientProjectActive && state.clientIndex === 0 && client?.id === 'mira') return '我想先让一家店试卖。三家店一起铺货也可以，不过要等交货后四天再付清。';
  return client?.brief || '';
}
