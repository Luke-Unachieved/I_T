import {marketProductComicView} from './deal-room-workspace-product-comics.js';
import {prospectDisplayText} from './deal-room-prospect-locale.js';
import {carafeTransportView,carafeCustomerFollowup,carafeComicFrame} from './deal-room-market-carafe-transport.js';
import {legacyEquipmentInvite,legacyEquipmentView,bindLegacyEquipment} from './deal-room-equipment-legacy-view.js';
import {previewWarehouseIssue,warehouseSummary} from './deal-room-warehouse.js';
import {prospectInboxView,bindProspectInbox,prospectAdviserQuote,prospectReceiptContact} from './deal-room-prospect-view.js';
import {equipmentInvite,equipmentView,bindEquipment,equipmentReceiptCosts} from './deal-room-equipment-view.js';
import {neighborhoodInvite,neighborhoodQuote,neighborhoodContact} from './deal-room-neighborhood-view.js';
import {neighborhoodRequest} from './deal-room-neighborhood.js';
import {marketPlate} from './deal-room-market-art.js';
import {MARKET_PRODUCTS} from './deal-room-market-data.js';
import {DAY_COST,previewMarket,marketBook} from './deal-room-market.js';
import {previewEquipment} from './deal-room-equipment.js';
const esc=s=>String(prospectDisplayText(s)??'').replaceAll(' · ','，').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>Number.isSafeInteger(n)?`¥${n.toLocaleString('zh-CN')}`:'—';
const modeName=m=>m==='neighborhood'?'门店联采':m==='project'?'设备项目':m==='bulk'?'铺货':'试单';
const sourceName=s=>s==='warehouse'?'自有仓库':s==='factory'?'工厂排产':'现货联仓';
const sourceSpec=(p,s)=>s==='warehouse'?{...p.sources.stock,name:'自有仓库',minQuantity:1,days:1}:p.sources[s];
const fact=(label,value)=>`<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`;
function draftOf(ui,state){
 const p=MARKET_PRODUCTS.find(p=>p.id===ui.productId);
 if(!p)return null;
 const mode=ui.mode==='neighborhood'?'neighborhood':ui.mode==='bulk'?'bulk':'trial',source=['factory','warehouse'].includes(ui.source)?ui.source:'stock';
 // A seller's starting price uses this lot's landed cost and overhead, not the hidden buyer ceiling.
 const f=sourceSpec(p,source),o=mode==='neighborhood'&&state.neighborhoodRegistered?neighborhoodRequest(paidReceipts(state))?.offers[p.id]:p.offers[mode];
 if(!o)return null;
 const expenses=f.freightBase+Math.ceil(o.quantity/f.packSize)*f.freightPerBox+(f.days+o.payLag)*30;
 const suggested=Math.ceil((f.unitCost+expenses/o.quantity)*1.3);
 return {productId:p.id,mode,source,unitPrice:ui.unitPrice??(mode==='neighborhood'?o.maxUnitPrice:suggested)};
}
const paidReceipts=s=>marketBook(s).receipts;
function historyView(state,ui){
 const rows=paidReceipts(state);if(!rows.length)return '';
 const pageSize=6,pages=Math.ceil(rows.length/pageSize),page=Math.min(pages-1,Math.max(0,Number.isSafeInteger(ui.historyPage)?ui.historyPage:0));
 const visible=rows.slice(Math.max(0,rows.length-(page+1)*pageSize),rows.length-page*pageSize).reverse();
 return `<details class="market-history"${ui.historyOpen?' open':''}><summary>已经收齐的商品订单（${rows.length} 单）</summary><p>只有实际到账的订单才进入这里，未到期尾款不算收入。</p>${visible.map(r=>`<article><h3>${esc(r.productName)}（${esc(r.quantity)} ${esc(r.unit)}）</h3><p>${esc(r.buyer)}，${esc(modeName(r.mode))}，${esc(r.sourceName)}</p><dl class="market-facts">${fact('成交单价',money(r.unitPrice))}${fact('总货款',money(r.revenue))}${r.kind==='equipment'?equipmentReceiptCosts(r):fact('货品＋运输',money(r.cost))}${fact('日常开支',money(r.operatingCost))}${fact('本单净利',money(r.netProfit))}${fact('收齐日期',`第 ${r.paymentDay} 天`)}</dl></article>`).join('')}${pages>1?`<div class="market-pager"><button data-market-page="${page-1}" ${page===0?'disabled':''}>较新</button><span>第 ${page+1} / ${pages} 页</span><button data-market-page="${page+1}" ${page===pages-1?'disabled':''}>较早</button></div>`:''}</details>`;
}
function recentShelf(state){
 const seen=new Set(),recent=[],rows=paidReceipts(state);
 for(let i=rows.length-1;i>=0&&recent.length<3;i--){const r=rows[i],p=MARKET_PRODUCTS.find(item=>item.id===r.productId);if(!r.kind&&['trial','bulk'].includes(r.mode)&&p&&!seen.has(p.id)){seen.add(p.id);recent.push({r,p});}}
 if(!recent.length)return '';
 return `<section class="market-repeat"><h3>从成交样册再找货</h3><p>照上一笔已收款的合同拟一份新报价。先看成本和日期，再决定要不要签。</p><div>${recent.map(({r,p})=>`<button type="button" data-market-repeat="${p.id}">${marketPlate(p)}<span><strong>${esc(p.name)}</strong><small>上次${esc(modeName(r.mode))}，每${esc(r.unit)} ${money(r.unitPrice)}，第 ${r.paymentDay} 天收齐</small></span></button>`).join('')}</div></section>`;
}
function comparePrior(state,p,d){
 const r=paidReceipts(state).findLast(r=>r.productId===p.id&&(d.mode==='neighborhood'?r.kind==='neighborhood':!r.kind));if(!r)return '';
 const difference=Number.isSafeInteger(d.unitPrice)?d.unitPrice-r.unitPrice:null;
 return `<details class="market-prior"><summary>翻到上次的合同</summary><p>${esc(r.buyer)} 上次按 ${money(r.unitPrice)}/${esc(p.unit)} 买了 ${r.quantity}${esc(p.unit)}（${esc(modeName(r.mode))}），第 ${r.paymentDay} 天收齐。这次${d.mode===r.mode?'仍是'+modeName(r.mode):'改为'+modeName(d.mode)}${difference===null?'。':difference===0?'，报价与上次相同。':`，每${esc(p.unit)}比上次${difference>0?'高':'低'} ${money(Math.abs(difference))}。`}</p></details>`;
}
// The old journal sentence is part of replay equality. Derive player-facing copy
// from the settled receipt instead of rewriting existing saves or their actions.
export function marketReceiptText(state){
 const a=state.market?.active;
 if(state.market?.status!=='paid'||a?.status!=='paid'||a.received!==a.revenue||a.delivered!==a.quantity)return '';
 const outcome=a.netProfit<0?'亏了 '+money(-a.netProfit):a.netProfit>0?'赚了 '+money(a.netProfit):'不赚不亏';
 return `${a.buyer} 已付清 ${money(a.received)}。${a.productName}这单${outcome}，已记入工作室账本。`;
}
function marketStageText(state){
 const status=state.market?.status,kind=state.feedback?.kind;
 if(kind==='market-chartered')return state.feedback.message;
 if(status==='paid')return marketReceiptText(state);
 if(status==='transit'&&kind==='market-signed'||status==='receivable'&&kind==='market-delivered')return state.feedback.message;
 return '';
}
function orderSheet(a,status,visual,body,facts,kicker='订单进度'){
 const heading=status==='transit'?'已签约，等交货':status==='receivable'?'已交货，等尾款':'货款已收齐';
 const steps=[['签约',a.signedDay],['交货',a.deliveryDay],['收款',a.paymentDay]];
 return '<section class="ws-carafe ws-order-detail"><header class="ws-order-summary"><div><p class="ws-order-kicker">'+esc(kicker)+'</p><h2>'+heading+'</h2><p>'+esc(a.buyer)+'</p></div>'+visual+'</header>'+
  '<p class="ws-order-item"><strong>'+esc(a.productName)+'</strong><span>'+a.quantity+esc(a.unit)+'</span></p>'+
  '<ol class="ws-carafe-track" data-stage="'+esc(status)+'">'+steps.map(([label,n],i)=>'<li'+(i===(status==='transit'?1:status==='receivable'?2:-1)?' aria-current="step"':'')+'><b>'+label+'</b><span>第 '+n+' 天</span></li>').join('')+'</ol>'+
  body+'<details class="ws-order-facts"><summary>订单明细</summary>'+facts+'</details></section>';
}
const marketBack=ui=>ui.back==='orders'?'返回订单':'返回收件箱';
function activeView(state,ui={}){
 const a=state.market?.active,status=state.market?.status;
 if(!a)return '<p role="status">没有待处理的商品合同。</p>';
 const product=MARKET_PRODUCTS.find(p=>p.id===a.productId);
 const choice=status==='transit'?carafeTransportView(state,ui.adviserId):'';
 const carafeReply=carafeCustomerFollowup(state),replyLine=carafeReply?'<p class="market-note">'+esc(carafeReply)+'</p>':'';
 const restored=Boolean(a.carafeCharter);
 const scene=carafeReply?'<div class="ws-carafe-delivery">'+carafeComicFrame(restored?'early':'standard')+'<div><strong>岚岸采购负责人</strong>'+replyLine+'</div></div>':'';
 const next=choice||(restored&&status==='transit'?'<section class="ws-ship-choice"><h3>联仓已确认包车</h3><p>已付 ¥96。第 '+a.deliveryDay+' 天交货，第 '+a.paymentDay+' 天收款。</p><button type="button" data-market-action="DELIVER_MARKET">按新安排交货</button></section>':(restored||carafeReply)&&status==='receivable'?'<section class="ws-ship-choice"><h3>买方签收</h3><p>第 '+a.paymentDay+' 天收尾款 '+money(a.balanceDue)+'。</p>'+scene+'<button type="button" data-market-action="COLLECT_MARKET">到付款日，收齐尾款</button></section>':(restored||carafeReply)&&status==='paid'?'<section class="ws-ship-choice"><h3>货款已收齐</h3><p>'+esc(marketReceiptText(state))+'</p>'+replyLine+'<button type="button" data-market-action="CLOSE_MARKET">'+marketBack(ui)+'</button></section>':'');
 if(next)return orderSheet(a,status,'<img class="ws-order-product" src="assets/deal-original-order-carafe.webp" alt="">',next,'<dl>'+fact('合同货款',money(a.revenue))+fact('已收定金',money(a.deposit))+fact(status==='paid'?'实际净利':'预计净利',money(a.netProfit))+'</dl>');
 const contact=a.kind==='neighborhood'?neighborhoodContact(status==='transit'?`定金付好了。请按每店 ${a.perStore} ${a.unit}配齐装箱，门店照清单点货。`:status==='receivable'?`${a.stores} 家店都点过数了。这批货我签收，余款在第 ${a.paymentDay} 天付。`:`财务已经付清。谢谢你把 ${a.stores} 家店的货配齐。`):a.kind==='prospect'?prospectReceiptContact(state):'';
 const action=status==='transit'?`<p>第 ${a.deliveryDay} 天交货。期间日常开支从主账扣除，${a.paymentDay===a.deliveryDay?'验收当日收齐尾款。':'尾款按约定日期到账。'}</p><button class="primary" data-market-action="DELIVER_MARKET">第 ${a.deliveryDay} 天${a.paymentDay===a.deliveryDay?'交货并收款':'确认交货'}</button>`:status==='receivable'?`<p>第 ${a.paymentDay} 天收尾款 <strong>${money(a.balanceDue)}</strong>。</p><button class="primary" data-market-action="COLLECT_MARKET">到付款日，收齐尾款</button>`:`<p>${esc(a.buyer)} 已付清 <strong>${money(a.received)}</strong>，已记入账本。</p><button class="primary" data-market-action="CLOSE_MARKET">${marketBack(ui)}</button>`;
 const details='<p class="ws-order-inspection"><strong>验收约定</strong> '+esc(a.inspection||product?.inspection)+'</p><dl>'+
  fact(a.source==='warehouse'?'自仓已出库':'本单采购',a.quantity+a.unit)+fact('本单未交货',String(a.quantity-a.delivered)+a.unit)+fact('买方已收货',a.delivered+a.unit)+
  fact('货源',a.sourceName)+fact('总货款',money(a.revenue))+fact('已收定金',money(a.deposit))+fact('采购及运输',money(a.cost))+
  fact(status==='paid'?'尾款已收':'待收尾款',money(a.balanceDue))+fact('本单日常开支',money(a.operatingCost))+fact(status==='paid'?'本单净利':'预计净利',money(a.netProfit))+'</dl>';
 return orderSheet(a,status,'<div class="ws-order-thumb">'+marketPlate(product)+'</div>',
  '<section class="ws-order-next" aria-label="下一步">'+action+'</section>'+contact+marketProductComicView(a,status),details,a.kind==='neighborhood'?'门店联采':a.kind==='prospect'?'客户订单':modeName(a.mode));
}
function quoteView(state,ui,d){
 const p=MARKET_PRODUCTS.find(p=>p.id===d.productId),q=previewMarket(state,d),supplier=sourceSpec(p,d.source);
 const request=d.mode==='neighborhood'?neighborhoodRequest(paidReceipts(state)):null;
 const o=request?request.offers[p.id]:p.offers[d.mode];
 const quoted=ui.quoted===JSON.stringify(d),finite=Number.isSafeInteger(d.unitPrice)&&d.unitPrice>0&&d.unitPrice<=100000;
 const buyer=request?'林妍':p.buyer;
 const label=request?'四邻百货联采':p.buyer;
 const response=!quoted?'':`<div class="market-response" role="status"><p>${esc(buyer)}：${
 finite&&d.unitPrice>o.maxUnitPrice?`这个价格超出预算。这批最高接受 ${money(o.maxUnitPrice)}/${esc(p.unit)}，数量和付款不变。`:
 finite&&!q.accepted?'先找能按数量和日期交付的货源，这份方案还不能签。':
 finite?`${money(d.unitPrice)}/${esc(p.unit)} 可以。请在第 ${q.deadlineDay} 天前送到。${d.unitPrice<o.maxUnitPrice?'采购数量不变。':''}`:'请输入正整数单价。'}</p>${finite&&d.unitPrice>o.maxUnitPrice?'<button type="button" data-market-counter>按买方上限重新报价</button>':''}</div>`;
 const sources=['stock','factory',...(d.source==='warehouse'||previewWarehouseIssue(state,p.id,o.quantity).valid?['warehouse']:[])];
 const warehouseStock=sources.includes('warehouse')?warehouseSummary(state).items.find(row=>row.productId===p.id):null;
 return `<section class="market-quote market-trade-sheet" aria-label="商品报价">
  <div class="market-sheet market-trade-hero">${marketPlate(p)}<div><small>${esc(label)}</small><h2 tabindex="-1" data-market-heading>${esc(p.name)}</h2>${request?'':`<p>${esc(p.brief)}</p>`}</div></div>
  ${request?neighborhoodQuote(request.stores,o,p.unit):''}
  <div class="market-trade-columns"><section class="market-trade-choices" aria-label="采购方案">
   ${request?'':`<fieldset class="market-compare"><legend>采购数量</legend>${['trial','bulk'].map(m=>`<div class="market-choice"><button type="button" data-market-mode="${m}" aria-pressed="${d.mode===m}" aria-describedby="market-mode-${m}">${modeName(m)}</button><div id="market-mode-${m}" class="market-choice-facts"><p><strong>${p.offers[m].quantity} ${esc(p.unit)}</strong></p><small>${p.offers[m].deadlineDays} 天内收到</small><small>${m==='trial'?'交货付清':'签约付三成定金，验收后 5 天付清'}</small></div></div>`).join('')}</fieldset>`}
   <fieldset class="market-compare"><legend>选货源</legend>${sources.map(s=>{const v=sourceSpec(p,s);return `<div class="market-choice"><button type="button" data-market-source="${s}" aria-pressed="${d.source===s}" aria-describedby="market-source-${s}">${sourceName(s)}</button>
   <div id="market-source-${s}" class="market-choice-facts"><p><strong>${v.days} 天可交货</strong></p>
   ${s==='warehouse'?`<small>可用 ${warehouseStock?.onHand??0} ${esc(p.unit)}</small>${warehouseStock?.inTransit?'<small>另有 '+warehouseStock.inTransit+' '+esc(p.unit)+' 在途</small>':''}<small>只付配送费</small>`:`<small>${money(v.unitCost)}/${esc(p.unit)}</small><small>${v.minQuantity} ${esc(p.unit)}起订</small>`}</div></div>`;}).join('')}</fieldset>
   <details class="market-trade-detail"><summary>装箱、运费与验收</summary><p>${esc(supplier.name)}：每箱 ${supplier.packSize} ${esc(p.unit)}，基础运费 ${money(supplier.freightBase)}，每箱另加 ${money(supplier.freightPerBox)}。</p><p><strong>验收约定</strong> ${esc(p.inspection)}</p></details>
   ${o.quantity<supplier.minQuantity?'<p class="market-warning">这一批数量不足起订量，请换货源或采购数量。</p>':''}${comparePrior(state,p,d)}
  </section><section class="market-trade-price" aria-label="报价与周转">
   <form data-market-quote-form><label for="market-unit-price">报单价（元/${esc(p.unit)}）</label><div class="market-price-row"><input id="market-unit-price" name="price" type="number" min="1" max="100000" step="1" inputmode="numeric" value="${esc(d.unitPrice)}" required><button type="submit">发送报价</button></div></form>
   <p class="market-note" data-market-edit-hint role="status" hidden>单价已改。重新报价后，会按新价格核对费用。</p><div data-market-terms>
   ${response}
   <dl class="market-facts market-trade-totals">${fact('合同货款',money(q.revenue))}${fact('至少需要周转金',money(q.cashRequired))}${fact(q.netProfit<0?'预计亏损':'预计净利',money(Number.isSafeInteger(q.netProfit)?Math.abs(q.netProfit):null))}</dl>
   ${Number.isSafeInteger(q.deliveryDay)?`<p class="market-trade-dates"><span><strong>第 ${q.deliveryDay} 天</strong>${q.paymentDay===q.deliveryDay?'交货并收款':'交货'}</span>${q.paymentDay===q.deliveryDay?'':`<span><strong>第 ${q.paymentDay} 天</strong>收款</span>`}</p>`:''}
   <details class="market-trade-detail"><summary>采购、收款与费用明细</summary><dl class="market-facts">${fact(d.source==='warehouse'?'库存成本（已付）':'采购货款',money(q.goodsCost))}${q.freight>0?fact('运输费用',money(q.freight)):''}${q.deposit>0?fact('买方定金',money(q.deposit))+fact(q.paymentDay===q.deliveryDay?'验收当日收尾款':'到期收尾款',money(q.balanceDue)):''}${q.operatingCost>0?fact('回款前日常开支',money(q.operatingCost)):''}${fact('签约后现金',money(q.cashAfterSigning))}${fact('最终剩余现金',money(q.cashAfterPayment))}</dl></details>
   ${q.reason&&!(finite&&d.unitPrice>o.maxUnitPrice)?`<p class="market-warning" role="status">${esc(q.reason)}</p>`:''}
  </div><button type="button" class="primary" data-market-sign ${q.valid&&quoted?'':'disabled'}>确认签约</button>
  </section></div></section>`;
}
export function marketAdviserQuote(state,ui={}){
 if(state.phase!=='market'||state.market?.status!=='draft')return null;
 if(ui.prospectId)return prospectAdviserQuote(state,ui);
 if(ui.equipmentId)return previewEquipment(state,ui.equipmentId,ui.equipmentShipping||'standard',DAY_COST);
 const draft=draftOf(ui,state);
 return draft?previewMarket(state,draft):null;
}
export function marketView(state,ui={}){
 const equipment=legacyEquipmentView(state,ui)||equipmentView(state,ui);
 const status=state.market?.status||'draft',stageText=marketStageText(state),d=draftOf(ui,state),categories=[...new Set(MARKET_PRODUCTS.map(p=>p.category))],search=String(ui.search||'').trim().toLocaleLowerCase(),filtered=MARKET_PRODUCTS.filter(p=>(!ui.category||p.category===ui.category)&&(!search||`${p.name} ${p.category} ${p.brief} ${p.buyer}`.toLocaleLowerCase().includes(search)));
 if(status==='draft'&&ui.prospectId)return '<section class="market-panel ws-letter-panel">'+prospectInboxView(state,ui)+'</section>';
 if(equipment&&status!=='draft')return '<section class="market-panel ws-carafe-panel ws-equipment-panel"><button type="button" data-workspace-market-order-list>‹ 订单列表</button>'+equipment+'</section>';
 if(state.market?.active&&['transit','receivable','paid'].includes(status))return '<section class="market-panel ws-carafe-panel"><button type="button" data-workspace-market-order-list>‹ 订单列表</button>'+activeView(state,ui)+historyView(state,ui)+'</section>';
 if(ui.prospectId&&status==='draft')return '<section class="market-panel ws-dedicated-inquiry">'+prospectInboxView(state,ui)+'</section>';
 if(status!=='draft')return `<section class="market-panel market-modern"><button type="button" data-market-action="CLOSE_MARKET">‹ ${marketBack(ui)}</button>${stageText?`<p role="status">${esc(stageText)}</p>`:''}${activeView(state,ui)}</section>`;
 if(equipment||d)return `<section class="market-panel market-modern market-modern-detail"><header class="market-modern-top">${d?'<button type="button" data-market-browse>‹ 商品与项目</button>':'<span>设备项目</span>'}<button type="button" data-market-action="CLOSE_MARKET">${marketBack(ui)}</button></header>${equipment||quoteView(state,ui,d)}</section>`;
 const opportunities=equipmentInvite(state)+legacyEquipmentInvite(state)+neighborhoodInvite(state,paidReceipts(state));
 return `<section class="market-panel market-modern market-modern-catalog"><header class="market-modern-top"><h2>商品与项目</h2><button type="button" data-market-action="CLOSE_MARKET">${marketBack(ui)}</button></header>
  <form data-market-search-form class="market-filters"><label for="market-search">找商品或用途<input id="market-search" type="search" value="${esc(ui.search||'')}" placeholder="例如：餐桌、收纳、咖啡"></label><label for="market-category">品类<select id="market-category"><option value="">全部品类</option>${categories.map(c=>`<option value="${esc(c)}" ${ui.category===c?'selected':''}>${esc(c)}</option>`).join('')}</select></label><button type="submit">筛选</button></form>
  ${opportunities?`<details class="market-opportunities" open><summary>设备与联采</summary><div>${opportunities}</div></details>`:''}
  <section aria-label="商品目录"><h3 class="market-modern-shelf">商品目录 <small>${filtered.length} 款</small></h3><div class="market-grid">${filtered.map(p=>`<button type="button" class="market-product" data-market-product="${esc(p.id)}">${marketPlate(p)}<span><small>${esc(p.category)}</small><strong>${esc(p.name)}</strong><small>试单 ${p.offers.trial.quantity} ${esc(p.unit)}</small><b>看货源与报价 ›</b></span></button>`).join('')||'<p>没有符合条件的商品。试试别的名称或品类。</p>'}</div></section>
  ${recentShelf(state)}${historyView(state,ui)}
 </section>`;
}
export function bindMarket(root,state,ui,rerender,dispatch,options){
 bindLegacyEquipment(root,state,ui,rerender,dispatch);
 bindEquipment(root,state,ui,rerender,dispatch);
 bindProspectInbox(root,state,ui,rerender,dispatch,options);
 const renderFocus=selector=>{rerender();root.querySelector(selector)?.focus?.({preventScroll:true});};
 const changeDraft=patch=>{Object.assign(ui,patch,{quoted:null});renderFocus('[data-market-heading]');};
 root.querySelectorAll('[data-neighborhood-product]').forEach(b=>b.addEventListener('click',()=>changeDraft({productId:b.dataset.neighborhoodProduct,mode:'neighborhood',source:'factory',unitPrice:undefined})));
 root.querySelectorAll('[data-market-repeat]').forEach(b=>b.addEventListener('click',()=>{
  const r=paidReceipts(state).findLast(r=>r.productId===b.dataset.marketRepeat&&!r.kind&&['trial','bulk'].includes(r.mode));
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
 root.querySelector('#market-unit-price')?.addEventListener('input',e=>{
  const value=e.currentTarget.value;ui.unitPrice=value===''?'':Number(value);ui.quoted=null;
  const terms=root.querySelector('[data-market-terms]'),prior=root.querySelector('.market-prior'),hint=root.querySelector('[data-market-edit-hint]'),sign=root.querySelector('[data-market-sign]');
  if(terms)terms.hidden=true;if(prior)prior.hidden=true;if(hint)hint.hidden=false;if(sign)sign.disabled=true;
 });
 root.querySelector('[data-market-quote-form]')?.addEventListener('submit',e=>{e.preventDefault();ui.unitPrice=Number(root.querySelector('#market-unit-price').value);ui.quoted=JSON.stringify(draftOf(ui,state));renderFocus('#market-unit-price');});
 root.querySelector('[data-market-counter]')?.addEventListener('click',()=>{const d=draftOf(ui,state),p=MARKET_PRODUCTS.find(p=>p.id===d?.productId);if(!p)return;const limit=previewMarket(state,d).maxUnitPrice;if(!Number.isSafeInteger(limit))return;ui.unitPrice=limit;ui.quoted=JSON.stringify(draftOf(ui,state));renderFocus('#market-unit-price');});
 root.querySelector('[data-market-sign]')?.addEventListener('click',()=>{const d=draftOf(ui,state);if(!d||ui.quoted!==JSON.stringify(d)||!previewMarket(state,d).valid)return;dispatch({type:'SIGN_MARKET',...d});});
}
