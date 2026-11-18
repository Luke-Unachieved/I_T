const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>`¥${Number(n||0).toLocaleString('zh-CN')}`;
export function supplyDraftView(opportunity,draft,preview){
 return `<section class="supply-draft"><h3>把下一轮供货安排谈下来</h3><p class="brief">谈好两批货，一次安排数量、交期和收款。</p><label>合作客户<select id="supply-client">${opportunity.clients.map(c=>`<option value="${esc(c.id)}" ${draft.clientId===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label><fieldset><legend>怎样收款</legend><button data-plan-payment="delivery" aria-pressed="${draft.payment==='delivery'}">每批交货付款</button><button data-plan-payment="deposit" aria-pressed="${draft.payment==='deposit'}">先收三成，末批结尾款</button></fieldset><ul class="requirements">${[`客户分两次收货：第 ${preview.lots[0].deliveryDay} 天 ${preview.lots[0].quantity} 件，第 ${preview.lots[1].deliveryDay} 天 ${preview.lots[1].quantity} 件`,'逐批付款需让价 4%；收三成定金保留原价，末批交货后 4 天结清。'].map(x=>`<li>${esc(x)}</li>`).join('')}</ul>${supplyLotsView(preview)}${preview.deposit?`<p class="opportunity">签约先收 ${money(preview.deposit)}；两批合计尾款 ${money(preview.balanceDue)}，第 ${preview.finishDay} 天收齐。</p>`:''}<div class="offer"><div><small>现在支付首批制作款</small><strong>${money(preview.lots[0].cost)}</strong></div><div><small>${preview.cashAfterSigning<0?'首批还差':'签后可用资金'+(preview.deposit?'（含已收定金）':'')}</small><strong>${money(Math.abs(preview.cashAfterSigning))}</strong></div><div><small>两批预计净赚</small><strong>${money(preview.netProfit)}</strong></div></div><p class="brief">第 ${preview.lots[1].startDay} 天还需支付第二批制作款 ${money(preview.lots[1].cost)}；到第 ${preview.finishDay} 天收齐，期间日常开支合计 ${money(preview.operatingCost)}。</p><p class="brief">安排两批前请留足 ${money(preview.cashRequired)} 周转。</p>${!preview.valid?`<p class="counter">${esc(preview.reason)}</p>`:''}<button data-action="START_SUPPLY_PLAN" class="primary" ${preview.valid?'':'disabled'}>确认这份供货安排 →</button><button class="back-clients" id="close-supply">先不接这份委托</button></section>`;
}
export function supplyLotsView(plan){
 const signed=plan.status==='fulfilling'||plan.status==='paid';
 const processed=signed?(plan.events||[]).slice(0,plan.eventIndex):[];
 const delivered=new Set(processed.filter(e=>e.kind==='delivery').map(e=>e.lotId));
 const started=new Set(processed.filter(e=>e.kind==='start').map(e=>e.lotId));
 const lots=plan.lots||[],quantity=lots.reduce((n,l)=>n+(delivered.has(l.id)?l.quantity:0),0);
 const received=(plan.deposit||0)+processed.reduce((n,e)=>n+(e.income||0),0);
 const progress=signed?`<p class="supply-progress"><span>客户已收货 <b>${quantity} / ${plan.totalQuantity} 件</b></span><span>货款已到账 <b>${money(received)} / ${money(plan.revenue)}</b></span></p>`:'';
 return `<div class="supply-lots" aria-label="两批供货日程">${progress}${lots.map((lot,i)=>{
  const hasGoods=delivered.has(lot.id),paid=plan.status==='paid'||(plan.payment==='delivery'&&hasGoods);
  // First production is paid and started at signature. For the second lot,
  // a shared calendar day is not evidence that the distinct start event ran.
  const working=signed&&(i===0||started.has(lot.id));
  const status=!signed?'签约后安排':paid?'已收齐':hasGoods?'已交付 · 待尾款':working?'已开工 · 制作中':'待开工';
  return `<div class="supply-lot ${paid?'lot-paid':''}"><span class="lot-number">${i+1}</span><div><strong>${lot.quantity} 件</strong><small>第 ${lot.startDay} 天开工 · 第 ${lot.deliveryDay} 天交货</small><small>${plan.payment==='deposit'?`第 ${lot.paymentDay} 天统一收尾款`:`第 ${lot.paymentDay} 天收款 ${money(lot.revenue)}`}</small></div><b>${status}</b></div>`;
 }).join('')}</div>`;
}

// Presentation only: every frame is taken from a signed plan, never changes the ledger.
export function supplyPlaybackFrames(plan){
 return (plan.events||[]).map(e=>{const lot=plan.lots.find(l=>l.id===e.lotId);return {day:e.day,kind:e.kind,quantity:lot?.quantity||plan.totalQuantity,title:e.kind==='start'?`跟单安排 ${lot.quantity} 件生产`:e.kind==='delivery'?`${lot.quantity} 件，客户已签收`:'两批尾款已到账',detail:e.kind==='payment'?`${plan.clientName} · ¥${e.income.toLocaleString('zh-CN')}`:e.kind==='delivery'?(e.income?`按约收到 ¥${e.income.toLocaleString('zh-CN')}`:'按约交付，尾款日期不变'):plan.product};});
}
