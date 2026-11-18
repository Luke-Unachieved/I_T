import {marketPlate} from './deal-room-market-art.js';
import {MARKET_PRODUCTS} from './deal-room-market-data.js';
import {previewMarket} from './deal-room-market.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>Number.isSafeInteger(n)?`¥${n.toLocaleString('zh-CN')}`:'—';
const modeName=m=>m==='bulk'?'铺货':'试单';
const sourceName=s=>s==='factory'?'工厂排产':'现货联仓';
const fact=(label,value)=>`<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`;
function draftOf(ui){
 const p=MARKET_PRODUCTS.find(p=>p.id===ui.productId);
 if(!p)return null;
 const mode=ui.mode==='bulk'?'bulk':'trial',source=ui.source==='factory'?'factory':'stock';
 // A seller's starting price uses this lot's landed cost and overhead, not the hidden buyer ceiling.
 const f=p.sources[source],o=p.offers[mode],expenses=f.freightBase+Math.ceil(o.quantity/f.packSize)*f.freightPerBox+(f.days+o.payLag)*30;
 const suggested=Math.ceil((f.unitCost+expenses/o.quantity)*1.3);
 return {productId:p.id,mode,source,unitPrice:ui.unitPrice??suggested};
}
const paidReceipts=s=>(s.marketHistory||[]).filter(r=>r.status==='paid'&&r.delivered===r.quantity&&r.received===r.revenue);
function historyView(state,ui){
 const rows=paidReceipts(state);if(!rows.length)return '';
 const pageSize=6,pages=Math.ceil(rows.length/pageSize),page=Math.min(pages-1,Math.max(0,Number.isSafeInteger(ui.historyPage)?ui.historyPage:0));
 const visible=rows.slice(Math.max(0,rows.length-(page+1)*pageSize),rows.length-page*pageSize).reverse();
 return `<details class="market-history"${ui.historyOpen?' open':''}><summary>已经收齐的商品订单 · ${rows.length} 单</summary><p>只有实际到账的订单才进入这里，未到期尾款不算收入。</p>${visible.map(r=>`<article><h3>${esc(r.productName)} · ${esc(r.quantity)}${esc(r.unit)}</h3><p>${esc(r.buyer)} · ${esc(modeName(r.mode))} · ${esc(r.sourceName)}</p><dl class="market-facts">${fact('成交单价',money(r.unitPrice))}${fact('总货款',money(r.revenue))}${fact('货品＋运输',money(r.cost))}${fact('日常开支',money(r.operatingCost))}${fact('本单净利',money(r.netProfit))}${fact('收齐日期',`第 ${r.paymentDay} 天`)}</dl></article>`).join('')}${pages>1?`<div class="market-pager"><button data-market-page="${page-1}" ${page===0?'disabled':''}>较新</button><span>第 ${page+1} / ${pages} 页</span><button data-market-page="${page+1}" ${page===pages-1?'disabled':''}>较早</button></div>`:''}</details>`;
}
function recentShelf(state){
 const seen=new Set(),recent=[],rows=paidReceipts(state);
 for(let i=rows.length-1;i>=0&&recent.length<3;i--){const r=rows[i],p=MARKET_PRODUCTS.find(item=>item.id===r.productId);if(p&&!seen.has(p.id)){seen.add(p.id);recent.push({r,p});}}
 if(!recent.length)return '';
 return `<section class="market-repeat"><h3>从成交样册再找货</h3><p>照上一笔已收款的合同拟一份新报价。先看成本和日期，再决定要不要签。</p><div>${recent.map(({r,p})=>`<button type="button" data-market-repeat="${p.id}">${marketPlate(p)}<span><strong>${esc(p.name)}</strong><small>上次 ${esc(modeName(r.mode))} · ${money(r.unitPrice)}/${esc(r.unit)} · 第 ${r.paymentDay} 天收齐</small></span></button>`).join('')}</div></section>`;
}
function comparePrior(state,p,d){
 const r=paidReceipts(state).findLast(r=>r.productId===p.id);if(!r)return '';
 const difference=Number.isSafeInteger(d.unitPrice)?d.unitPrice-r.unitPrice:null;
 return `<aside class="market-prior"><strong>翻到上次的合同</strong><p>${esc(r.buyer)} 上次按 ${money(r.unitPrice)}/${esc(p.unit)} 买了 ${r.quantity}${esc(p.unit)}（${esc(modeName(r.mode))}），第 ${r.paymentDay} 天收齐。这次${d.mode===r.mode?'仍是'+modeName(r.mode):'改为'+modeName(d.mode)}${difference===null?'。':difference===0?'，报价与上次相同。':`，每${esc(p.unit)}比上次${difference>0?'高':'低'} ${money(Math.abs(difference))}。`}</p></aside>`;
}
function activeView(state){
 const a=state.market?.active,status=state.market?.status;
 if(!a)return '<p role="status">没有待处理的商品合同。返回工作室后再打开商品业务。</p>';
 const product=MARKET_PRODUCTS.find(p=>p.id===a.productId);
 return `<section class="market-active"><small>${status==='paid'?'这单已经结清':status==='receivable'?'已经交货，尾款仍在账上':'已经采购，按合同交付'}</small><h3>${esc(a.productName)} · ${esc(a.quantity)}${esc(a.unit)}</h3>${marketPlate(product)}<p>${esc(a.buyer)} · ${esc(a.sourceName)} · ${esc(modeName(a.mode))}</p><ol class="market-track"><li class="done">第 ${a.signedDay} 天<br>签约采购</li><li class="${status!=='transit'?'done':''}">第 ${a.deliveryDay} 天<br>交货验收</li><li class="${status==='paid'?'done':''}">第 ${a.paymentDay} 天<br>收齐货款</li></ol><p class="market-inspection"><strong>验收约定</strong> ${esc(a.inspection||product?.inspection)}</p><dl class="market-facts">${fact('本单采购',a.quantity+a.unit)}${fact('本单未交货',String(a.quantity-a.delivered)+a.unit)}${fact('买方已收货',a.delivered+a.unit)}${fact('总货款',money(a.revenue))}${fact('已收定金',money(a.deposit))}${fact('采购及运输',money(a.cost))}${fact(status==='paid'?'尾款已收':'待收尾款',money(a.balanceDue))}${fact('本单日常开支',money(a.operatingCost))}${fact(status==='paid'?'本单净利':'预计净利',money(a.netProfit))}</dl>${status==='transit'?`<p>推进到第 ${a.deliveryDay} 天，按上述标准交付。期间日常开支会从主账扣除${a.paymentDay===a.deliveryDay?'，验收后当日收齐尾款':'；尾款到期前不会提前到账'}。</p><button class="primary" data-market-action="DELIVER_MARKET">按合同验收并交货</button>`:status==='receivable'?`<p>推进到第 ${a.paymentDay} 天，再收 ${money(a.balanceDue)} 尾款，扣除这段时间的日常开支。</p><button class="primary" data-market-action="COLLECT_MARKET">到付款日，收齐尾款</button>`:`<p class="market-success">${esc(a.buyer)} 已付清货款。这笔采购、运费和日常开支已计入主账；不是额外赠送利润。</p><button class="primary" data-market-action="CLOSE_MARKET">回工作室，继续下一笔生意</button>`}</section>`;
}
function quoteView(state,ui,d){
 const p=MARKET_PRODUCTS.find(p=>p.id===d.productId),o=p.offers[d.mode],q=previewMarket(state,d),supplier=p.sources[d.source];
 const quoted=ui.quoted===JSON.stringify(d),finite=Number.isSafeInteger(d.unitPrice)&&d.unitPrice>0&&d.unitPrice<=100000;
 return `<section class="market-quote" aria-label="商品报价"><button data-market-browse class="quiet">← 换一种商品</button><small>${esc(p.category)} · ${esc(p.buyer)}</small><div class="market-sheet">${marketPlate(p)}<div><small>实物样册</small><h3 tabindex="-1" data-market-heading>${esc(p.name)}</h3><p>${esc(p.brief)}</p></div></div><p class="market-inspection"><strong>验收约定</strong> ${esc(p.inspection)}</p><fieldset><legend>买方要多少</legend>${['trial','bulk'].map(m=>`<button data-market-mode="${m}" aria-pressed="${d.mode===m}"><strong>${modeName(m)} · ${p.offers[m].quantity}${esc(p.unit)}</strong><small>${p.offers[m].deadlineDays} 天内收到 · ${m==='trial'?'交货付清':'三成定金，验收后五天付清'}</small></button>`).join('')}</fieldset><fieldset><legend>从哪里采购</legend>${['stock','factory'].map(s=>{const v=p.sources[s];return `<button data-market-source="${s}" aria-pressed="${d.source===s}"><strong>${sourceName(s)}</strong><small>${esc(v.name)}<br>至少 ${v.minQuantity}${esc(p.unit)} · ${money(v.unitCost)}/${esc(p.unit)} · ${v.days} 天</small></button>`;}).join('')}</fieldset><p class="market-note">${esc(supplier.name)}：${supplier.packSize}${esc(p.unit)}/箱，基础运费 ${money(supplier.freightBase)}，每箱另加 ${money(supplier.freightPerBox)}。${o.quantity<supplier.minQuantity?'这一批数量不足起订量，请改现货或铺货。':''}</p>${comparePrior(state,p,d)}<form data-market-quote-form><label for="market-unit-price">向买方报单价（游戏人民币 / ${esc(p.unit)}）</label><div class="market-price-row"><input id="market-unit-price" name="price" type="number" min="1" max="100000" step="1" inputmode="numeric" value="${esc(d.unitPrice)}" required><button type="submit">问买方这个价</button></div></form>${quoted?`<div class="market-response" role="status">${finite&&d.unitPrice>o.maxUnitPrice?`买方：这个价格超出预算。这一批最高接受 ${money(o.maxUnitPrice)}/${esc(p.unit)}，数量和付款条件不变。<button data-market-counter>按买方上限重新报价</button>`:finite&&!q.accepted?`买方：先找能按数量和日期交付的货源，这份方案还不能签。`:finite?`买方：${money(d.unitPrice)}/${esc(p.unit)} 可以，${o.quantity}${esc(p.unit)}，第 ${q.deadlineDay} 天前收到。${d.unitPrice<o.maxUnitPrice?'你主动让了价，但买方不会因此增加数量。':''}`:'请输入正整数单价。'}</div>`:'<p class="market-note">先问价，再决定是否签约。改数量、货源或价格后需要重新确认报价；浏览和询价不扣钱、不推进时间。</p>'}<dl class="market-facts">${fact('采购货款',money(q.goodsCost))}${fact('运输费用',money(q.freight))}${fact('买方定金',money(q.deposit))}${fact('到收齐的日常开支',money(q.operatingCost))}${fact('至少需要周转金',money(q.cashRequired))}${fact('预计净利',money(q.netProfit))}</dl>${Number.isSafeInteger(q.deliveryDay)?`<p class="market-note">第 ${q.deliveryDay} 天交货，第 ${q.paymentDay} 天收齐。签约后现金 ${money(q.cashAfterSigning)}，收齐且扣完本单日费后 ${money(q.cashAfterPayment)}。</p>`:''}${q.valid&&q.netProfit<0?`<p class="market-warning">这个报价能成交，但扣完采购、运费和日费会亏损 ${money(-q.netProfit)}。可以提高单价再谈。</p>`:''}${q.reason?`<p class="market-warning" role="status">${esc(q.reason)}</p>`:''}<button class="primary" data-market-sign ${q.valid&&quoted?'':'disabled'}>确认条款，采购并签约</button><p class="market-note">签约会实际收定金、支付采购和运费。没有确认前，可以自由换品或返回。</p></section>`;
}
export function marketView(state,ui={}){
 const status=state.market?.status||'draft',d=draftOf(ui),categories=[...new Set(MARKET_PRODUCTS.map(p=>p.category))],search=String(ui.search||'').trim().toLocaleLowerCase(),filtered=MARKET_PRODUCTS.filter(p=>(!ui.category||p.category===ui.category)&&(!search||`${p.name} ${p.category} ${p.brief} ${p.buyer}`.toLocaleLowerCase().includes(search)));
 return `<section class="market-panel"><header><div><small>采购 · 报价 · 履约</small><h2>找下一件好货</h2></div><button data-market-action="CLOSE_MARKET" ${['transit','receivable'].includes(status)?'disabled title="先交付并收齐这笔合同，再返回工作室"':''}>回工作室</button></header><div class="market-wallet"><span>第 ${state.day} 天 · 主账可用现金</span><strong>${money(state.cash)}</strong></div>${state.feedback?.kind?.startsWith('market-')?`<p role="status">${esc(state.feedback.message)}</p>`:''}${status!=='draft'?activeView(state):d?quoteView(state,ui,d):`<p>给真实用途找货，替买方核对交期。${MARKET_PRODUCTS.length} 种不同商品，采购和收款都走工作室的同一本账。</p>${recentShelf(state)}<form data-market-search-form class="market-filters"><label for="market-search">找商品或用途<input id="market-search" type="search" value="${esc(ui.search||'')}" placeholder="例如：餐桌、收纳、咖啡"></label><label for="market-category">品类<select id="market-category"><option value="">全部品类</option>${categories.map(c=>`<option value="${esc(c)}" ${ui.category===c?'selected':''}>${esc(c)}</option>`).join('')}</select></label><button type="submit">筛选</button></form><p class="market-note">找到 ${filtered.length} 种。先选商品，再比较小批试单和大批铺货。</p><div class="market-grid">${filtered.map(p=>`<button class="market-product" data-market-product="${esc(p.id)}">${marketPlate(p)}<small>${esc(p.category)}</small><strong>${esc(p.name)}</strong><span>${esc(p.brief)}</span><small>${esc(p.buyer)} · 试单 ${p.offers.trial.quantity}${esc(p.unit)}</small><b>看货源与报价 →</b></button>`).join('')||'<p>没有符合条件的商品。试着换个词或选全部品类。</p>'}</div>`}${historyView(state,ui)}<p class="market-disclaimer">价格、买方与交易均为游戏设定，不是真实商品采购服务。</p></section>`;
}
export function bindMarket(root,state,ui,rerender,dispatch){
 const renderFocus=selector=>{rerender();root.querySelector(selector)?.focus?.({preventScroll:true});};
 const changeDraft=patch=>{Object.assign(ui,patch,{quoted:null});renderFocus('[data-market-heading]');};
 root.querySelectorAll('[data-market-repeat]').forEach(b=>b.addEventListener('click',()=>{
  const r=paidReceipts(state).findLast(r=>r.productId===b.dataset.marketRepeat);
  if(r)changeDraft({productId:r.productId,mode:r.mode,source:r.source,unitPrice:r.unitPrice});
 }));
 root.querySelector('.market-history')?.addEventListener('toggle',e=>{ui.historyOpen=e.currentTarget.open;});
 root.querySelectorAll('[data-market-page]').forEach(b=>b.addEventListener('click',()=>{ui.historyPage=Number(b.dataset.marketPage);ui.historyOpen=true;renderFocus('.market-history summary');}));
 root.querySelectorAll('[data-market-action]').forEach(b=>b.addEventListener('click',()=>dispatch({type:b.dataset.marketAction})));
 root.querySelector('[data-market-search-form]')?.addEventListener('submit',e=>{e.preventDefault();ui.search=root.querySelector('#market-search').value;ui.category=root.querySelector('#market-category').value;renderFocus('#market-search');});
 root.querySelector('#market-category')?.addEventListener('change',e=>{ui.category=e.target.value;ui.search=root.querySelector('#market-search').value;renderFocus('#market-category');});
 root.querySelectorAll('[data-market-product]').forEach(b=>b.addEventListener('click',()=>changeDraft({productId:b.dataset.marketProduct,mode:'trial',source:'stock',unitPrice:undefined})));
 root.querySelector('[data-market-browse]')?.addEventListener('click',()=>{ui.productId=null;ui.quoted=null;renderFocus('#market-search');});
 root.querySelectorAll('[data-market-mode]').forEach(b=>b.addEventListener('click',()=>changeDraft({mode:b.dataset.marketMode,unitPrice:undefined})));
 root.querySelectorAll('[data-market-source]').forEach(b=>b.addEventListener('click',()=>changeDraft({source:b.dataset.marketSource})));
 root.querySelector('#market-unit-price')?.addEventListener('input',()=>{ui.quoted=null;const button=root.querySelector('[data-market-sign]');if(button)button.disabled=true;});
 root.querySelector('[data-market-quote-form]')?.addEventListener('submit',e=>{e.preventDefault();ui.unitPrice=Number(root.querySelector('#market-unit-price').value);ui.quoted=JSON.stringify(draftOf(ui));renderFocus('#market-unit-price');});
 root.querySelector('[data-market-counter]')?.addEventListener('click',()=>{const d=draftOf(ui),p=MARKET_PRODUCTS.find(p=>p.id===d?.productId);if(!p)return;ui.unitPrice=p.offers[d.mode].maxUnitPrice;ui.quoted=JSON.stringify(draftOf(ui));renderFocus('#market-unit-price');});
 root.querySelector('[data-market-sign]')?.addEventListener('click',()=>{const d=draftOf(ui);if(!d||ui.quoted!==JSON.stringify(d)||!previewMarket(state,d).valid)return;dispatch({type:'SIGN_MARKET',...d});});
}
