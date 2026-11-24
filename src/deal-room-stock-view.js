import {netProfitAmount} from './deal-room-net-profit.js';
import {stockProcurementOpportunity,previewStockProcurement,previewStudioProjectFromStock} from './deal-room-stock-procurement.js?v=36';
const money=n=>`¥${Number(n||0).toLocaleString('zh-CN')}`;
// Reconcile this factory lot only; newly made components are not its inventory.
function lotMoves(state){
 const p=state.stockProcurement,shop=state.shopTrial;
 const reserved=state.caseGrowth?.status==='production'?(state.caseGrowth.active?.stockUsed||0):0;
 const deliveredInSets=(p.stockUsed||0)-reserved;
 return [
  p.delivered&&`集团阅读位已收 ${p.delivered} 盏`,
  shop?.status==='display'&&`小店陈列中 ${shop.outside} 盏，尚未结算`,
  shop?.status==='paid'&&`小店已买下 ${shop.sold} 盏${shop.returned?`（另有 ${shop.returned} 盏已退回）`:''}`,
  deliveredInSets>0&&`随组合订单已交付 ${deliveredInSets} 盏`,
  reserved>0&&`组合订单已预留 ${reserved} 盏，尚未交付`,
  p.remaining>0?`工作室还有 ${p.remaining} 盏，成本 ${money(p.inventoryCost)}，尚未售出`:'仓库没有可分配的现货'
 ].filter(Boolean);
}
export function stockProcurementInvite(state){
 const p=state.stockProcurement,o=stockProcurementOpportunity(state);
 if(!p&&!o.available)return '';
 return `<section class="stock-invite"><small>集团采购 · 使用后的新需求</small><h3>${p?.status==='paid'?'阅读位收到灯了，这批货都去了哪？':'新增12处阅读位，只补需要的灯'}</h3><p>${p?.status==='paid'?lotMoves(state).join('；')+'。':'旧客房用品继续使用。这次只问调光灯，不追加杯和布。'}</p><button data-action="OPEN_STOCK_PROCUREMENT">${p?.status==='paid'?'查看这次供货与余货':'先看客户数量与工厂报价'} →</button></section>`;
}
export function stockProcurementView(state,mode='small'){
 const p=state.stockProcurement;if(!p)return '';
 const q=previewStockProcurement(state,mode),draft=p.status==='draft',producing=p.status==='production';
 if(!draft)return `<h3>${producing?'工厂正在备货':'阅读位补货已结清'}</h3><div class="stock-facts"><article><small>${producing?'客户确认采购':'客户已收到'}</small><strong>12 盏</strong><span>通用三档调光灯</span></article><article><small>${producing?'本批制作':'工作室余货'}</small><strong>${producing?p.factoryQuantity:p.remaining} 盏</strong><span>${producing?'等待工厂交货':`成本 ${money(p.inventoryCost)} · 未售`}</span></article></div><p class="brief">${producing?`已付制作 ${money(p.cost)}，第 ${p.deliveryDay} 天交付，只收本次12盏货款 ${money(p.revenue)}。`:`这 12 盏收款 ${money(p.revenue)}，扣掉售出灯具成本 ${money(p.soldCost)} 和日常开支 ${money(p.operatingCost)}，净赚 ${netProfitAmount(p.revenue-p.soldCost-p.operatingCost)}。整批采购付了 ${money(p.cost)}，这次补货的现金变化 ${p.cashChange<0?'−':'+'}${money(Math.abs(p.cashChange))}。`}</p>${producing?'<button class="primary" data-action="FULFIL_STOCK_PROCUREMENT">等工厂完成，交付客户的12盏 →</button>':`<details class="quote-breakdown"><summary>这批 ${p.factoryQuantity} 盏的去向</summary><ul>${lotMoves(state).map(line=>`<li>${line}</li>`).join('')}</ul></details>${p.remaining?'<p>余下的灯可以搭进合适的新方案。</p>':''}<button class="primary" data-action="CLOSE_STOCK_PROCUREMENT">回工作室 →</button>`}`;
 return `<button class="back-clients" data-action="CLOSE_STOCK_PROCUREMENT">← 先不承接</button><h3>客户要12盏，采购怎样安排？</h3><blockquote class="buyer-counter">“新加的阅读位只缺12盏调光灯。旧房间用品不动，也不需要专属铭牌。”</blockquote><div class="stock-options">${['small','batch'].map(id=>{const x=previewStockProcurement(state,id);return `<button data-stock-mode="${id}" aria-pressed="${id===mode}"><strong>${id==='small'?'只采购 12 盏':'采购 60 盏，留 48 盏备货'}</strong><span>工厂每盏 ${money(x.unitCost)} · 先付 ${money(x.cost)}</span><span>交付 ${x.quantity} 盏后，这单预计净赚 ${netProfitAmount(x.revenue-x.soldCost-x.operatingCost)}；${x.remaining?`另有 ${x.remaining} 盏待售`:'没有余货'}。</span></button>`;}).join('')}</div><div class="stock-facts"><article><small>现在要付</small><strong>${money(q.cost)}</strong><span>${q.cashAfterSigning<0?`现金还差 ${money(-q.cashAfterSigning)}`:`签完还剩 ${money(q.cashAfterSigning)}`}</span></article><article><small>预计收款</small><strong>${money(q.revenue)}</strong><span>第 ${q.deliveryDay} 天</span></article><article><small>收齐后现金</small><strong>${money(q.cashAfterPayment)}</strong><span>含制作与日常支出</span></article></div><p class="brief">${mode==='batch'?`另外 48 盏将留在仓库，成本 ${money(q.inventoryCost)}，还需寻找买家。`:'小批单价较高，只采购客户要的 12 盏调光灯。'}</p>${q.valid?'':`<p class="counter">${q.reason}</p>`}<button class="primary" data-action="SIGN_STOCK_PROCUREMENT" ${q.valid?'':'disabled'}>确认这份采购安排 →</button>`;
}
export function stockStudioOption(state){
 const q=previewStudioProjectFromStock(state);if(!q.valid)return '';
 return `<section class="stock-studio-option"><h4>方案二 · 先用工作室的 ${q.stockUsed} 盏现货</h4><p>使用库存灯具 ${q.stockUsed} 盏，成本 ${money(q.stockCost)}；其他商品和包装需另付 ${money(q.newProductionCost)}。本单利润已扣除这两项成本。</p><div class="stock-facts"><article><small>客户先付定金</small><strong>${money(q.deposit)}</strong></article><article><small>现在另付</small><strong>${money(q.newProductionCost)}</strong></article><article><small>签完还剩</small><strong>${money(q.cashAfterSigning)}</strong></article></div><button class="primary" data-action="SIGN_STUDIO_PROJECT_FROM_STOCK">用现货并确认这份采购 →</button><small>接单后为这笔订单预留 ${q.stockUsed} 盏。也可以选择上方方案，全部重新制作。</small></section>`;
}
