import { CATEGORIES, PRODUCTS } from '../data/core.js';
import { CERTIFICATION_BY_ID, FINANCING, MARKET_BY_ID, STAFF_ROLES } from '../data/expansion.js';
import { canExpedite, expediteFee, factorValue, forecast, lawsuitFee, liquidationValue } from '../engine/game.js';
import { quote } from '../engine/quotes.js';
import { stockPurchaseQuote } from '../engine/strategy.js';
import { imageFrame } from './media.js';

const sources = {
  stock: { name: '现货仓', hint: '备货较快，中单时付清采购款。' },
  factory: { name: '工厂排产', hint: '采购单价较低，中单时先付 30% 采购款。' },
  inventory: { name: '自有库存', hint: '使用仓库的同款货物，按账面成本核算。' },
};

const orderStatus = {
  procurement: '待采购', production: '生产中', transit: '在途', delivered: '已交货',
  settled: '已结清', cancelled: '已取消', 'bad-debt': '坏账',
};

const receivableStatus = {
  open: '待回款', overdue: '已逾期', paid: '已到账', 'bad-debt': '坏账',
  lawsuit: '诉讼中', recovered: '已追回', factored: '已保理', insured: '已获赔',
};

const deliveryOrderStates = new Set(['procurement', 'production', 'transit']);
const activeOrderStates = new Set([...deliveryOrderStates, 'delivered']);
const activeReceivableStates = new Set(['open', 'overdue', 'bad-debt', 'lawsuit']);
const productIndex = new Map(PRODUCTS.map(product => [product.id, product]));
const currencyFormatters = new Map();
const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => entities[character]);
}

function number(value) {
  return Number.isFinite(value) ? value.toLocaleString('zh-CN') : '—';
}

function money(value, currency = 'CNY') {
  if (!Number.isFinite(value)) return '—';
  const code = /^[A-Z]{3}$/.test(currency) ? currency : 'CNY';
  if (!currencyFormatters.has(code)) {
    currencyFormatters.set(code, new Intl.NumberFormat('zh-CN', {
      style: 'currency', currency: code, maximumFractionDigits: 0,
    }));
  }
  return escapeHtml(currencyFormatters.get(code).format(value));
}

function percent(value) {
  return Number.isFinite(value) ? `${Math.round(value * 100)}%` : '—';
}

function week(value) {
  return Number.isSafeInteger(value) && value > 0 ? `第 ${number(value)} 周` : '—';
}

function unitPrice(value, currency, unit) {
  return `${money(value, currency)}${unit ? ` / ${escapeHtml(unit)}` : ''}`;
}

function badge(label, variant = '') {
  return `<span class="badge${variant ? ` ${variant}` : ''}">${escapeHtml(label)}</span>`;
}

function table(label, headers, rows) {
  return `<div class="table-wrap"><table class="data-table" role="table" aria-label="${escapeHtml(label)}">
    <thead role="rowgroup"><tr role="row">${headers.map(header => `<th scope="col" role="columnheader">${escapeHtml(header)}</th>`).join('')}</tr></thead>
    <tbody role="rowgroup">${rows.join('')}</tbody></table></div>`;
}

function cell(label, content, className = '') {
  return `<td role="cell" data-label="${escapeHtml(label)}"${className ? ` class="${className}"` : ''}><div class="cell-value">${content}</div></td>`;
}

function button(type, id, label, extra = '') {
  return `<button type="button" class="button" data-action="${type}" data-id="${escapeHtml(id)}" ${extra}>${label}</button>`;
}

function panel(title, inner, note = '') {
  return `<section class="panel"><header class="trade-header"><h2>${title}</h2>${note}</header>${inner}</section>`;
}

function empty(message) {
  return `<p class="empty-state">${escapeHtml(message)}</p>`;
}

function availableSources(state, inquiry) {
  const kinds = ['stock', 'factory'];
  if (state.inventory.some(item => item.productId === inquiry.productId && item.quantity > 0)) {
    kinds.push('inventory');
  }
  return kinds;
}

function eligible(state, inquiry) {
  return availableSources(state, inquiry).some(source => !quote(state, inquiry, { source, ratio: 100, extraTerms: 0 }).error);
}

function productCell(name, category, asset) {
  const art = imageFrame(asset, { className: 'product-thumb', fallback: '无图' });
  return `<div class="trade-product">${art}<span><strong>${escapeHtml(name)}</strong>
    ${category ? `<small>${escapeHtml(category)}</small>` : ''}</span></div>`;
}

function inquiryTable(rows, state) {
  const headers = ['商品', '买家与信用', '数量', '目标单价', '交期与有效期', '付款条件', '竞争', '操作'];
  const bids = new Set(state.bids.map(bid => bid.inquiryId));
  let hasTutorialAnchor = false;
  return table('本周询盘', headers, rows.map(({ inquiry, canQuote }) => {
    const { buyer } = inquiry;
    const alreadyBid = bids.has(inquiry.id);
    const full = state.bids.length >= 3;
    const tour = !hasTutorialAnchor && canQuote && !alreadyBid && !full ? 'data-tour="quote"' : '';
    if (tour) hasTutorialAnchor = true;
    const flags = [inquiry.tutorial && badge('开场客户'), marketName(inquiry),
      inquiry.landmark ? badge('地标订单', 'pending') : inquiry.framework && badge('年度框架'),
      inquiry.repeat && badge('熟客复购'), inquiry.brandDemand && badge('偏好品牌'), inquiry.localRestock && badge('海外仓补货')].filter(Boolean);
    const quotesAction = alreadyBid ? badge('已报价', 'pending') : `<button type="button" class="button${tour ? ' primary' : ''}"
      data-ui="quote-open" data-id="${escapeHtml(inquiry.id)}" ${tour}>${canQuote && !full ? '算价' : '查看条款'}</button>`;
    return `<tr role="row" data-inquiry-id="${escapeHtml(inquiry.id)}">${cell('商品', `${productCell(inquiry.productName, inquiry.category, inquiry.asset)}${flags.length ? `<small class="trade-flags">${flags.join(' ')}</small>` : ''}`)}
      ${cell('买家与信用', `<strong>${escapeHtml(buyer.name)}</strong> ${badge(buyer.credit)}<small>${escapeHtml(buyer.type)}</small>`)}
      ${cell('数量', `${number(inquiry.quantity)} ${escapeHtml(inquiry.unit)}`, 'number')}
      ${cell('目标单价', unitPrice(inquiry.targetPrice, inquiry.currency, inquiry.unit), 'number')}
      ${cell('交期与有效期', `${week(inquiry.dueWeek)}<small>报价至 ${week(inquiry.expiresWeek)}</small>`)}
      ${cell('付款条件', `${number(inquiry.depositRate)}% 定金<small>${inquiry.terms ? `账期 ${number(inquiry.terms)} 周` : '交货当周应付'}</small>`)}
      ${cell('竞争', `${number(inquiry.rivals.length)} 家<small>${inquiry.rivals.slice(0, 2).map(rival => escapeHtml(rival.name)).join('、')}</small>`)}
      ${cell('操作', quotesAction, 'trade-actions')}</tr>`;
  }));
}

function marketName(inquiry) {
  if (!inquiry.market || inquiry.market === 'domestic') return '';
  return badge(MARKET_BY_ID[inquiry.market]?.name ?? inquiry.market);
}

function bidTable(state) {
  const headers = ['询盘', '货源', '报价', '中单率', '垫资峰值', '操作'];
  return table('已提交报价', headers, state.bids.map(bid => {
    const inquiry = state.inquiries.find(item => item.id === bid.inquiryId);
    const product = productIndex.get(bid.productId);
    const label = inquiry ? `${inquiry.productName} · ${inquiry.buyer.name}` : product?.name;
    return `<tr role="row">${cell('询盘', `${escapeHtml(label || '待揭晓报价')}${marketName(inquiry ?? bid)}${bid.branded ? badge('自有品牌') : ''}`)}${cell('货源', `${escapeHtml(sources[bid.source]?.name ?? bid.source)}${bid.financing && bid.financing !== 'standard' ? `<small>${escapeHtml(FINANCING[bid.financing]?.label)}</small>` : ''}`)}
      ${cell('报价', `${unitPrice(bid.unitPrice, bid.currency, inquiry?.unit ?? product?.unit)}<small>总货款 ${money(bid.foreignTotal ?? bid.total, bid.currency)}</small>`, 'number')}
      ${cell('中单率', percent(bid.probability), 'number')}${cell('垫资峰值', money(bid.workingCapital ?? bid.upfront), 'number')}
      ${cell('操作', button('withdraw-bid', bid.inquiryId, '撤回'), 'trade-actions')}</tr>`;
  }));
}

export function inquiriesPage(state, ui) {
  const { category = '', availability = 'all' } = ui.filters ?? {};
  const submitted = new Set(state.bids.map(bid => bid.inquiryId));
  const rows = state.inquiries.map(inquiry => ({ inquiry, canQuote: eligible(state, inquiry) }))
    .filter(({ inquiry, canQuote }) => (!category || category === 'all' || inquiry.category === category) &&
      (availability !== 'available' || (canQuote && !submitted.has(inquiry.id) && state.bids.length < 3)));
  return `<div class="trade-stack">
    <section class="panel" data-tour="inquiries"><header class="trade-header"><div>
      <h2>本周询盘</h2><p class="trade-note">结合交期和可用资金挑选询盘。报价在本周结束时开结果。</p></div>
      ${badge(`已用报价位 ${state.bids.length} / 3`, 'pending')}
    </header>
    <div class="trade-filters">
      <label>报价状态<select data-ui="inquiry-filter" name="availability">
        <option value="all"${availability === 'all' ? ' selected' : ''}>全部询盘</option>
        <option value="available"${availability === 'available' ? ' selected' : ''}>当前可报</option>
      </select></label>
      <label>商品品类<select data-ui="inquiry-filter" name="category">
        <option value="">全部品类</option>
        ${CATEGORIES.map(name => `<option value="${escapeHtml(name)}"${name === category ? ' selected' : ''}>${escapeHtml(name)}</option>`).join('')}
      </select></label>
    </div>
    ${rows.length ? inquiryTable(rows, state) : empty('没有符合筛选条件的询盘。可选择全部询盘查看本周信息。')}
    <p class="trade-note">买家信用从 AAA 到 B，等级越高，通常越能按时付款。</p>
    </section>
    ${panel('已提交报价', state.bids.length ? bidTable(state) : empty('本周还没有提交报价。'), '<span class="trade-note">结算前可撤回</span>')}
  </div>`;
}

function fulfillment(order) {
  if (order.status === 'procurement') {
    if (order.source === 'inventory') return { label: '库存已预留，待发货' };
    if (order.costPaid >= order.cost) {
      return { label: order.source === 'factory' ? '已付款，待排产' : '已付款，待备货', detail: `采购款 ${money(order.costPaid)} 已付清` };
    }
    if (order.costPaid > 0) return { label: '已预付，待排产', detail: `已付 ${money(order.costPaid)}，待付 ${money(order.cost - order.costPaid)}` };
  }
  if (order.status === 'production') {
    const work = order.source === 'stock' ? '备货' : '生产';
    return { label: `${work}中`, detail: `预计还需 ${number(order.productionLeft)} 周${work}` };
  }
  const label = orderStatus[order.status] ?? order.status;
  if (order.status === 'transit') return { label, detail: `预计还需 ${number(order.shippingLeft)} 周到货` };
  if (order.deliveredWeek) return { label, detail: `${week(order.deliveredWeek)}交货` };
  return { label };
}

function orderTable(rows, state, name) {
  const headers = ['订单', '状态', '约定交期', '预计回款', '利润与罚款', '操作'];
  return table(name, headers, rows.map(order => {
    const product = productIndex.get(order.productId);
    const buyer = typeof order.buyer === 'object' ? order.buyer?.name : order.buyer;
    const staff = order.staffId ? state.staff.find(person => person.id === order.staffId) : null;
    const pendingDelivery = deliveryOrderStates.has(order.status);
    const late = pendingDelivery && state.week > order.dueWeek;
    const { label, detail } = fulfillment(order);
    let actions = '—';
    if (order.expedited) actions = badge('已加急');
    else if (canExpedite(state, order)) {
      actions = `${button('expedite', order.id, `加急 · ${money(expediteFee(order))}`)}<small>提前 1 周到货</small>`;
    }
    return `<tr role="row">${cell('订单', `<strong>${escapeHtml(order.productName ?? product?.name ?? '商品订单')}</strong>
        <small>${escapeHtml(buyer)} · ${number(order.quantity)} ${escapeHtml(order.unit ?? product?.unit ?? '件')}</small>
        ${marketName(order)}${order.branded ? badge('自有品牌') : ''}${order.warehouseLocal ? badge('海外仓交付') : ''}${staff ? `<small>负责人 ${escapeHtml(staff.name)}</small>` : ''}`)}
      ${cell('状态', `${badge(label, late ? 'negative' : '')}${late ? badge(`逾期 ${state.week - order.dueWeek} 周`, 'negative') : ''}${detail ? `<small>${detail}</small>` : ''}`)}
      ${cell('约定交期', `${week(order.dueWeek)}${pendingDelivery && order.deliverWeek ? `<small>预计 ${week(order.deliverWeek)}交货</small>` : ''}`)}
      ${cell('预计回款', `${week(order.expectedPayWeek)}${order.currency && order.currency !== 'CNY' ? `<small>合同额 ${money(order.foreignTotal, order.currency)}</small>` : ''}${order.financing && order.financing !== 'standard' ? `<small>${escapeHtml(FINANCING[order.financing]?.label)}</small>` : ''}`)}
      ${cell('利润与罚款', `${money(order.profit)}<small>${pendingDelivery ? '预计利润' : '已入账利润'}</small>${order.penalty ? `<small class="negative">含交付罚款 −${money(order.penalty)}</small>` : ''}`, `number${order.profit < 0 ? ' negative' : ''}`)}
      ${cell('操作', actions, 'trade-actions')}</tr>`;
  }));
}

function receivablesTable(rows, name, state) {
  const headers = ['买家', '应收', '回款周', '状态', '操作'];
  return table(name, headers, rows.map(item => {
    const buyerName = typeof item.buyer === 'object' ? item.buyer?.name : item.buyer;
    const buyerCredit = typeof item.buyer === 'object' ? item.buyer?.credit : '';
    const delayed = item.originalDueWeek && item.originalDueWeek !== item.dueWeek;
    const overseas = item.currency && item.currency !== 'CNY';
    const payout = factorValue(state, item);
    const waitingForInsurance = item.status === 'bad-debt' && item.insuranceDueWeek >= state.week;
    const funds = item.status === 'factored' ? '保理到账' : item.status === 'insured' ? '保险赔付' : '实际到账';
    let action = '—';
    if (item.status === 'open' || item.status === 'overdue') {
      const reminder = item.reminderWeek === state.week ? badge('本周已催款') :
        `${button('collect', item.id, '催款')}<small>提高回款机会，略降客户关系</small>`;
      action = `${reminder}${payout > 0 ? `<div class="trade-factor">${button('factor', item.id, `保理 · ${money(payout)}`)}<small>立即收款，银行接手剩余应收</small></div>` : ''}`;
    } else if (waitingForInsurance) {
      action = `<small>预计 ${week(item.insuranceDueWeek)}保险赔付</small>`;
    } else if (item.status === 'bad-debt') {
      action = `${button('sue', item.id, `起诉 · ${money(lawsuitFee(item))}`)}<small>支付费用后等待部分追回</small>`;
    }
    return `<tr role="row">${cell('买家', `<strong>${escapeHtml(buyerName ?? '客户')}</strong>${buyerCredit ? ` ${badge(buyerCredit)}` : ''}${marketName(item)}
        ${item.financing && item.financing !== 'standard' ? `<small>${escapeHtml(FINANCING[item.financing]?.label)}</small>` : ''}`)}
      ${cell('应收', `${overseas && Number.isFinite(item.foreignBalance) ? `${money(item.foreignBalance, item.currency)}<small>入账折合 ${money(item.amount)}</small>` : money(item.amount)}
        ${Number.isFinite(item.paidAmount) ? `<small>${funds} ${money(item.paidAmount)}</small>` : ''}
        ${item.fxGain ? `<small class="${item.fxGain > 0 ? 'positive' : 'negative'}">${item.fxGain > 0 ? '汇兑收益' : '汇兑损失'} ${money(Math.abs(item.fxGain))}</small>` : ''}`, 'number')}
      ${cell('回款周', `${week(item.dueWeek)}${delayed ? `<small>原定 ${week(item.originalDueWeek)}</small>` : ''}`)}
      ${cell('状态', badge(waitingForInsurance ? '等待理赔' : receivableStatus[item.status] ?? item.status, ['overdue', 'bad-debt'].includes(item.status) ? 'negative' : ''))}
      ${cell('操作', action, 'trade-actions')}</tr>`;
  }));
}

function scheduledReceipts(state) {
  const records = state.queue.filter(item => item.type === 'export-refund' || item.type === 'insurance')
    .sort((a, b) => a.dueWeek - b.dueWeek);
  if (!records.length) return '';
  const rows = records.map(item => {
    const order = state.orders.find(order => order.id === item.orderId);
    return `<tr role="row">${cell('款项', item.type === 'insurance' ? '出口信用保险赔付' : '出口退税')}
      ${cell('相关订单', escapeHtml(order?.productName ?? '海外订单'))}
      ${cell('预计金额', money(item.amount), 'number')}${cell('到账周', week(item.dueWeek))}</tr>`;
  });
  return panel('预计到账的退税与理赔', table('预计到账的退税与理赔', ['款项', '相关订单', '预计金额', '到账周'], rows),
    '<span class="trade-note">这些款项已计入现金预测</span>');
}

function inventoryTable(state) {
  const lots = new Map();
  for (const item of state.inventory) {
    if (item.quantity <= 0) continue;
    const lot = lots.get(item.productId) ?? { quantity: 0, bookValue: 0, reserved: 0 };
    lot.quantity += item.quantity;
    lot.bookValue += item.quantity * item.unitCost;
    lots.set(item.productId, lot);
  }
  for (const bid of state.bids) {
    if (bid.source === 'inventory' && lots.has(bid.productId)) lots.get(bid.productId).reserved += bid.quantity;
  }
  const headers = ['货物', '库存数量', '账面成本', '清仓金额', '操作'];
  return table('库存', headers, [...lots].map(([productId, lot]) => {
    const product = productIndex.get(productId);
    const unit = escapeHtml(product?.unit ?? '件');
    const available = Math.max(0, lot.quantity - lot.reserved);
    const proceeds = available ? liquidationValue(state, productId, available) : 0;
    return `<tr role="row">${cell('货物', productCell(product?.name ?? productId, product?.category, product?.asset))}
      ${cell('库存数量', `${number(lot.quantity)} ${unit}${lot.reserved ? `<small>已预留 ${number(lot.reserved)} ${unit}</small>` : ''}`, 'number')}
      ${cell('账面成本', money(lot.bookValue), 'number')}${cell('清仓金额', money(proceeds), 'number')}
      ${cell('操作', available ? button('liquidate', productId, '清仓可用库存', `data-quantity="${available}"`) : badge('已预留'), 'trade-actions')}</tr>`;
  }));
}

export function stockPurchasePreview(state, productId, quantity) {
  const purchase = stockPurchaseQuote(state, productId, Number(quantity));
  const unit = escapeHtml(productIndex.get(productId)?.unit ?? '件');
  return `<p class="trade-note${purchase.error ? ' negative' : ''}" role="status">${purchase.error ? escapeHtml(purchase.error) :
    `采购 ${money(purchase.unitPrice)}／${unit} · 运费 ${money(purchase.shipping)} · 本次支付 <strong>${money(purchase.cost)}</strong> · 当前可用仓位 ${number(purchase.available)}／${number(purchase.capacity)}`}</p>
    <button type="submit" class="button primary"${purchase.error ? ' disabled' : ''}>采购入库</button>`;
}

function stockPurchaseForm(state) {
  if (!(state.ventures?.warehouse > 0)) return '';
  const firstProduct = PRODUCTS[0];
  const startingQuantity = firstProduct.sources.stock.minQuantity;
  return `<form class="stock-purchase" data-form="purchase-stock"><h3>备货入库</h3>
    <div class="stock-purchase-row"><label>商品<select name="productId" data-ui="stock-input">
      ${PRODUCTS.map(product => `<option value="${escapeHtml(product.id)}">${escapeHtml(product.name)}（${escapeHtml(product.unit)}）</option>`).join('')}
    </select></label><label>备货数量<input type="number" min="1" step="1" name="quantity" data-ui="stock-input" value="${startingQuantity}" required inputmode="numeric"></label>
    <div data-stock-preview>${stockPurchasePreview(state, firstProduct.id, startingQuantity)}</div></div></form>`;
}

export function ordersPage(state) {
  const activeOrders = state.orders.filter(order => deliveryOrderStates.has(order.status));
  const deliveredOrders = state.orders.filter(order => order.status === 'delivered');
  const pastOrders = state.orders.filter(order => !activeOrderStates.has(order.status));
  const receivables = state.receivables.filter(item => activeReceivableStates.has(item.status));
  const settled = state.receivables.filter(item => !activeReceivableStates.has(item.status));
  return `<div class="trade-stack">
    ${panel('待交付订单', `${activeOrders.length ? orderTable(activeOrders, state, '待交付订单') : empty('这会儿没有待交付的订单。中单后，可以在这里跟进备货和发货。')}
      ${deliveredOrders.length ? `<details open><summary>已交货，待结清（${number(deliveredOrders.length)} 笔）</summary>${orderTable(deliveredOrders, state, '已交货，待结清')}</details>` : ''}
      ${pastOrders.length ? `<details><summary>最近已结束订单（${Math.min(pastOrders.length, 12)} 笔）</summary>${orderTable(pastOrders.slice(-12).reverse(), state, '已结束订单')}</details>` : ''}`,
    '<span class="trade-note">生产、发运和交付随周结算推进</span>')}
    ${panel('应收账款', `${receivables.length ? receivablesTable(receivables, '未结应收账款', state) : empty('暂时没有待收货款。交货后，可以在这里查看回款时间。')}
      ${settled.length ? `<details><summary>最近回款（${Math.min(settled.length, 12)} 笔）</summary>${receivablesTable(settled.slice(-12).reverse(), '最近回款', state)}</details>` : ''}`)}
    ${scheduledReceipts(state)}
    ${panel('库存', `${state.inventory.some(item => item.quantity > 0) ? inventoryTable(state) : empty('仓库里还没有库存。')}${stockPurchaseForm(state)}`,
    `<span class="trade-note">库存可用于同款询盘，也可清仓回笼现金${state.ventures?.warehouse > 0 ? '' : '。建成自有仓库后可主动备货'}</span>`)}
  </div>`;
}

function quoteArtwork(inquiry) {
  const { buyer } = inquiry;
  const portrait = imageFrame(buyer.portrait, { className: 'buyer-portrait', fallback: '无图' });
  const product = imageFrame(inquiry.asset, { className: 'quote-product-image', fallback: '商品图片未加载' });
  const comic = buyer.comic ? imageFrame(buyer.comic, {
    className: 'buyer-comic', alt: `${buyer.name}的询盘来信漫画`, fallback: '来信漫画未加载', retry: true,
  }) : '';
  return `<aside class="buyer-art" aria-label="买家与商品">
    <div class="trade-product">${portrait}<span>
      <strong>${escapeHtml(buyer.name)}</strong>${buyer.credit ? ` ${badge(`信用 ${buyer.credit}`)}` : ''}<small>${escapeHtml(buyer.type)}</small></span></div>
    ${buyer.line ? `<blockquote>${escapeHtml(buyer.line)}</blockquote>` : ''}
    ${product}
    <p><strong>${escapeHtml(inquiry.productName)}</strong> · ${number(inquiry.quantity)} ${escapeHtml(inquiry.unit)}</p>
    ${marketName(inquiry)}
    ${comic ? `<details><summary>查看来信漫画</summary>${comic}</details>` : ''}
    <p class="trade-note">约定 ${week(inquiry.dueWeek)}交货，报价有效至 ${week(inquiry.expiresWeek)}。</p>
    <p class="trade-note">定金 ${number(inquiry.depositRate)}% · ${inquiry.terms ? `基本账期 ${number(inquiry.terms)} 周` : '交货当周应付'} · ${inquiry.minRep ? `要求公司信誉 ${number(inquiry.minRep)} 以上` : '无信誉要求'}。</p>
    ${inquiry.cert ? `<p class="trade-note">所需认证：${escapeHtml(CERTIFICATION_BY_ID[inquiry.cert]?.name ?? inquiry.cert)}</p>` : ''}
    <p class="trade-note">${inquiry.rivals.length} 家同行参与${inquiry.rivals.length ? `，包括 ${inquiry.rivals.slice(0, 2).map(rival => `${escapeHtml(rival.name)}（${escapeHtml(rival.style)}）`).join('、')}` : ''}。</p>
  </aside>`;
}

function quoteCashForecast(lowest, submitted) {
  if (!Number.isFinite(lowest?.hypothetical)) return '';
  const shortfall = lowest.hypothetical < 0;
  const balance = shortfall ? `资金不足，预计还差 ${money(-lowest.hypothetical)}` : `预计仍有 ${money(lowest.hypothetical)}`;
  const assumption = submitted ? '假设本单和已提交的报价都中单，且后续不再新增报价。' : '假设本单中单，且后续不再新增报价。';
  return `<p class="quote-risk${shortfall ? ' quote-risk--shortfall negative' : ' quote-risk--normal'}" data-tour="cash-forecast">
    <strong>若中单 · 未来 12 周最低余额</strong><br>${week(lowest.week)}：${balance}
    <small>${assumption}${shortfall ? '提交前，请检查剩余授信和到期款。' : ''}</small></p>`;
}

function quoteNumbers(state, proposal, inquiry) {
  if (proposal.error) return `<p class="quote-risk negative" role="status">${escapeHtml(proposal.error)}</p>`;
  const cashFlow = forecast(state, proposal);
  const lowest = cashFlow.reduce((current, item) => !current || item.hypothetical < current.hypothetical ? item : current, null);
  const probability = Math.max(0, Math.min(100, Math.round(proposal.probability * 100)));
  const gross = proposal.total - proposal.cost - proposal.shipping;
  const rows = [
    ['单价', unitPrice(proposal.unitPrice, proposal.currency, inquiry.unit)],
    ['总货款', money(proposal.foreignTotal ?? proposal.total, proposal.currency)],
    ['采购成本', money(proposal.cost)],
    ['运费', money(proposal.shipping - (proposal.tariff ?? 0))],
    ...(proposal.tariff ? [['关税', money(proposal.tariff)]] : []),
    ...(proposal.insurancePremium ? [['签约投保保费', money(proposal.insurancePremium)]] : []),
    ...(proposal.commission ? [['负责人提成', money(proposal.commission)]] : []),
    ['客户定金', money(proposal.deposit)],
    ['先付采购款', money(proposal.prepayment)],
    ['毛利率', percent(gross / proposal.total)],
    ['预计毛利', money(gross)],
    ...(gross !== proposal.profit ? [['预计订单利润', money(proposal.profit)]] : []),
    ['签约时需垫资', money(proposal.upfront)],
    ['回款前垫资峰值', money(proposal.workingCapital ?? proposal.upfront)],
    ['预计交货', week(proposal.deliverWeek ?? state.week + proposal.productionWeeks + proposal.shippingWeeks)],
    ['预计回款（按约定）', week(proposal.expectedPayWeek)],
    ...(proposal.rebateEstimate ? [['预计交货后退税', money(proposal.rebateEstimate)]] : []),
    ...(proposal.currency && proposal.currency !== 'CNY' ? [[`每 ${escapeHtml(proposal.currency)} 测算汇率`, `¥${number(proposal.fx)}`]] : []),
  ];
  return `<div class="quote-metrics"><div class="quote-probability">
    <span>预计中单率 <strong>${probability}%</strong></span>
    <progress aria-label="预计中单率" max="100" value="${probability}">${probability}%</progress>
    ${proposal.unitPrice > inquiry.targetPrice && !proposal.branded ? '<small class="negative">报价超过买家目标价，无法中单。</small>' : ''}
    ${proposal.branded ? `<small>自有品牌 ${number(proposal.brandLevel)} 级 · 由定价与品牌吸引力决定中单率。</small>` : ''}
    </div><dl class="money-list">${rows.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl>
    ${quoteCashForecast(lowest, state.bids.length)}
    ${inquiry.currency && inquiry.currency !== 'CNY' ? '<p class="trade-note">货款以合同币种结算。毛利、垫资和现金预测按人民币列示，最终回款按到账周汇率折算。</p>' : ''}
    ${proposal.warehouseLocal ? '<p class="trade-note">本地海外仓直接交付，本单省去跨境船期。</p>' : ''}
    ${proposal.factoryLevel ? `<p class="trade-note">已计入 ${number(proposal.factoryLevel)} 级自有工厂的采购和排产优惠。</p>` : ''}</div>`;
}

function staffField(state, model) {
  if (!state.staff.length) return '';
  const options = state.staff.map(person => {
    const load = state.orders.filter(item => item.staffId === person.id && activeOrderStates.has(item.status)).length +
      state.bids.filter(item => item.staffId === person.id).length;
    const role = STAFF_ROLES[person.role]?.label ?? '员工';
    return `<option value="${escapeHtml(person.id)}"${person.id === model.staffId ? ' selected' : ''}${load >= 3 ? ' disabled' : ''}>${escapeHtml(person.name)} · ${role} · 能力 ${number(person.ability)} · ${load}/3 单</option>`;
  });
  return `<label>负责人<select name="staffId" data-ui="quote-input"><option value="">亲自跟进</option>${options.join('')}</select>
    <small>员工同时最多跟进 3 笔报价或订单。业务员提高中单率，跟单员减少履约风险。</small></label>`;
}

function financingField(inquiry, model) {
  if (!inquiry.currency || inquiry.currency === 'CNY') return '';
  const selected = model.financing ?? 'standard';
  return `<label>回款保障<select name="financing" data-ui="quote-input">${Object.entries(FINANCING).map(([id, item]) =>
    `<option value="${id}"${id === selected ? ' selected' : ''}>${item.label}${item.threshold ? `（货款 ≥ ${money(item.threshold)}）` : ''}</option>`).join('')}</select>
    <small data-quote-preview="financing-hint">${escapeHtml(FINANCING[selected]?.text)}</small></label>`;
}

function priceControl(inquiry, { branded, brandUnitPrice, ratio }) {
  const content = branded ? `<label class="brand-price"><span>自有品牌单价（${escapeHtml(inquiry.currency ?? 'CNY')}／${escapeHtml(inquiry.unit)}）</span>
    <input type="number" name="brandUnitPrice" min="1" step="1" required inputmode="numeric" value="${Number.isFinite(brandUnitPrice) && brandUnitPrice > 0 ? brandUnitPrice : ''}" data-ui="quote-input">
    <small>普通货物参考价 ${unitPrice(inquiry.targetPrice, inquiry.currency, inquiry.unit)}。自有品牌可自主定价。</small></label>` :
    `<label class="price-slider"><span>报价占目标价 <output data-quote-preview="ratio">${number(ratio)}%</output></span>
    <input type="range" name="ratio" min="80" max="105" step="1" value="${ratio}" data-ui="quote-input">
    <small>目标单价 ${unitPrice(inquiry.targetPrice, inquiry.currency, inquiry.unit)} · 可报 80%–105%</small></label>`;
  return `<div data-quote-preview="price-control">${content}</div>`;
}

export function quoteDialog(state, ui) {
  const inquiry = state.inquiries.find(item => item.id === ui.quoteId);
  const close = '<button type="button" class="button" data-ui="close-dialog">关闭</button>';
  if (!inquiry) return `<header class="trade-header"><h2 id="quote-title" tabindex="-1">询盘已结束</h2>${close}</header><p>返回询盘查看本周新机会。</p>`;
  const model = ui.quote ?? {};
  const ratio = Number.isFinite(Number(model.ratio)) ? Math.max(80, Math.min(105, Math.round(Number(model.ratio)))) : 100;
  const extraTerms = Number(model.extraTerms) || 0;
  const canBrand = state.ventures?.brand > 0 && state.company.certs.includes('brand');
  const branded = canBrand && model.branded === true;
  const brandUnitPrice = branded ? Number(model.brandUnitPrice ?? inquiry.targetPrice) : undefined;
  const sourcesAvailable = availableSources(state, inquiry).map(source => ({
    source, proposal: quote(state, inquiry, { source, ratio, extraTerms }),
  }));
  const selected = sourcesAvailable.find(item => model.source === item.source) ?? sourcesAvailable[0];
  const proposal = quote(state, inquiry, { ...model, source: selected.source, ratio, extraTerms, branded, brandUnitPrice });
  const alreadyBid = state.bids.some(bid => bid.inquiryId === inquiry.id);
  const disabled = proposal.error || alreadyBid || state.bids.length >= 3;
  return `<header class="trade-header"><div><h2 id="quote-title" tabindex="-1">算价与报价</h2><p class="trade-note">${escapeHtml(inquiry.buyer.name)} · ${escapeHtml(inquiry.productName)}</p>
    ${ui.quoteDraftRestored ? '<small class="trade-note">已恢复这条询盘的未提交报价。</small>' : ''}</div>${close}</header>
    <div class="quote-grid">${quoteArtwork(inquiry)}
      <form class="quote-controls" data-form="quote" data-id="${escapeHtml(inquiry.id)}">
        <fieldset><legend>货源</legend><div class="source-options">${sourcesAvailable.map(({ source, proposal: option }) => {
          const selectedAttr = selected.source === source ? ' checked' : '';
          const disabledAttr = option.error ? ' disabled' : '';
          const hint = option.error ?? `${sources[source].hint} 采购 ${money(option.cost)} · 周期 ${number(Math.max(1, option.productionWeeks + option.shippingWeeks))} 周`;
          return `<label class="source-option"><input type="radio" name="source" value="${source}" data-ui="quote-input"${selectedAttr}${disabledAttr}>
            <span><strong>${sources[source].name}</strong><small>${escapeHtml(hint)}</small></span></label>`;
        }).join('')}</div></fieldset>
        ${canBrand ? `<label class="brand-toggle"><input type="checkbox" name="branded" data-ui="quote-input"${branded ? ' checked' : ''}>以自有品牌报价</label>` : ''}
        ${priceControl(inquiry, { branded, brandUnitPrice, ratio })}
        <label>账期让步<select name="extraTerms" data-ui="quote-input">
          ${[0, 1, 2, 3, 4].map(terms => `<option value="${terms}"${terms === extraTerms ? ' selected' : ''}>${terms ? `延长 ${terms} 周` : '按买家原账期'}</option>`).join('')}
        </select><small>账期更长可能提高中单率，也会延后现金回流。</small></label>
        ${staffField(state, model)}${financingField(inquiry, model)}
        <div data-quote-preview="numbers">${quoteNumbers(state, proposal, inquiry)}</div>
        <div class="dialog-actions" data-quote-preview="submit"><button class="button primary" type="submit"${disabled ? ' disabled' : ''}>提交报价</button>
          <small>${alreadyBid ? '这条询盘已经提交报价。' : state.bids.length >= 3 ? '本周 3 个报价位已用完。' : `本周已用 ${state.bids.length} / 3 个报价位，周末统一开结果。`}</small></div>
      </form>
    </div>`;
}
