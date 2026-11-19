import {EQUIPMENT_PROJECTS,equipmentOpportunity,previewEquipment,canRebookEquipment} from './deal-room-equipment.js';
import {DAY_COST} from './deal-room-market.js';

const artwork = {
  'cold-chain': ['assets/deal-project-cold-chain.webp','assets/deal-buyer-zhou-lan.webp'],
  'automated-warehouse': ['assets/deal-project-automated-warehouse.webp','assets/deal-buyer-cheng-zhe.webp'],
  'filling-lines': ['assets/deal-project-filling-line.webp']
};
const money = value => '¥' + value.toLocaleString('zh-CN');
const fact = (label, amount) => `<div><dt>${label}</dt><dd>${money(amount)}</dd></div>`;

export function equipmentInvite(state) {
  const project = equipmentOpportunity(state);
  if (!project) return '';
  return `<section class="market-repeat"><h3>设备项目来信</h3><button data-equipment-open="${project.id}">${project.buyer} · ${project.name} ${project.quantity} ${project.unit}，看项目报价 →</button></section>`;
}

function projectSummary(project, status) {
  const [productImage,portrait] = artwork[project.id];
  const manifest = project.consignees
    ? `<p><strong>收货清单</strong> ${project.consignees.map(factory => factory.name+' '+factory.quantity+' 条').join('、')}。</p>` : '';
  return `<div class="market-sheet"><img class="equipment-product" src="${productImage}" alt="${project.name}"><div><small>${project.company} · 设备采购</small><h3 tabindex="-1" data-equipment-heading>${project.name} · ${project.quantity} ${project.unit}</h3><p>${project.brief}</p></div></div>
    <div class="equipment-buyer">${portrait ? `<img src="${portrait}" width="64" height="64" alt="${project.buyer}">` : ''}<p><strong>${project.buyer}</strong><br>“${project.dialogue[status]}”</p></div>
    <p><strong>供货与出运</strong> ${project.supplier}。 ${project.shipping}</p>${manifest}
    <p class="market-inspection"><strong>验收约定</strong> ${project.inspection}</p>`;
}

function costs(q) {
  return fact('合同货款',q.revenue) + equipmentReceiptCosts(q) +
    fact('到收齐的日常开支',q.operatingCost) + fact('总成本（含日常开支）',q.cost+q.operatingCost);
}

export function equipmentReceiptCosts(q) {
  return fact('采购货款',q.goodsCost) + fact('运输费用',q.freight) + fact('验收费用',q.acceptanceFee) +
    (q.stationPaid ? fact('已付场站费',q.stationPaid) : '') + (q.rebookPaid ? fact('已付改订费',q.rebookPaid) : '') + fact('项目直接成本',q.cost);
}

function quoteView(state, project, shipping) {
  const q = previewEquipment(state, project.id, shipping, DAY_COST);
  if (!q) return '';
  const flexible = shipping === 'standard';
  return `<section class="market-quote equipment-quote"><button class="quiet" data-equipment-back>← 返回采购台</button>
    ${projectSummary(project, 'draft')}
    <fieldset><legend>整批出运的订舱方式</legend><button data-equipment-shipping="standard" aria-pressed="${flexible}">常规舱<small>运费 ${money(project.freight)}。转运港可能换船。</small></button><button data-equipment-shipping="locked" aria-pressed="${!flexible}">锁舱<small>运费 ${money(project.freight+project.lockedPremium)}。船期固定。</small></button></fieldset>
    <dl class="market-facts">${costs(q)}${fact('签约预付款',q.deposit)}${fact('验收后应收尾款',q.balanceDue)}${fact('至少需要周转金',q.cashRequired)}${fact(flexible?'顺利时预计净利':'锁舱预计净利',q.netProfit)}${flexible?fact('换船风险下预计净利',q.riskNetProfit):''}</dl>
    <p>第 ${q.shipDay} 天整批出运，按原船期第 ${q.deliveryDay} 天到港验收，第 ${q.paymentDay} 天收尾款。</p>
    ${flexible ? `<p>若换船，晚 ${q.slipDays} 天到港和收款，另付场站费 ${money(q.stationFee)} 和延后期间的日常开支 ${money(q.slipDays*DAY_COST)}。届时也可另付 ${money(q.rebookFee)} 改订，比等原接驳船早 ${q.daysSaved} 天，场站费照收。</p>` : '<p>锁定船期后按上述日期出运、到港和收款。</p>'}
    <p>签约时收预付款 ${money(q.deposit)}，向供应商及服务方支付 ${money(q.cost)}。尾款须待验收后按期收取。</p>
    ${q.valid ? '' : `<p class="market-warning">开工前还差 ${money(q.cashRequired-state.cash)}。尾款没到账，别急着拿它付货款。</p>`}
    <button class="primary" data-equipment-sign="${project.id}" ${q.valid?'':'disabled'}>确认报价，签约备货</button></section>`;
}

function activeView(state, project) {
  const a = state.market.active;
  const preparing = a.status === 'preparing', transit = a.status === 'transit', paid = a.status === 'paid';
  let action;
  if (preparing) {
    action = `<p>已按合同备齐 ${a.quantity} ${a.unit}，第 ${a.shipDay} 天出运。</p><button class="primary" data-market-action="SHIP_EQUIPMENT">整批出运</button>`;
  } else if (transit) {
    const transfer = a.transfer && !a.rebookPaid ? `<p>船公司通知换船。场站费 ${money(a.stationPaid)} 已付。现在多付 ${money(a.rebookFee)} 改订可提前 ${a.daysSaved} 天到港和收款，场站费照收。</p><button data-market-action="REBOOK_EQUIPMENT" ${canRebookEquipment(state,DAY_COST)?'':'disabled'}>改订接驳船 · 立即付 ${money(a.rebookFee)}</button>${canRebookEquipment(state,DAY_COST)?'':'<p>手头现金不足以改订后等到回款，可保留现有船期。</p>'}` : '';
    action = `${transfer}<p>整批已出运，预计第 ${a.deliveryDay} 天到港。${a.rebookPaid?'改订后的船期已确认。':''}</p><button class="primary" data-market-action="DELIVER_MARKET">到港，按清单整单验收</button>`;
  } else if (paid) {
    action = '<p class="market-success">货款已收齐，项目已记入工作室账本。</p><button class="primary" data-market-action="CLOSE_MARKET">回工作室</button>';
  } else {
    action = `<p>已到港并整单验收。第 ${a.paymentDay} 天可收尾款 ${money(a.balanceDue)}。</p><button class="primary" data-market-action="COLLECT_MARKET">到付款日，收齐尾款</button>`;
  }
  return `<section class="market-active equipment-active">${projectSummary(project, a.status)}
    <ol class="market-track"><li class="done">第 ${a.signedDay} 天<br>签约</li><li class="${preparing?'':'done'}">第 ${a.shipDay} 天<br>整批出运</li><li class="${preparing||transit?'':'done'}">第 ${a.deliveryDay} 天<br>到港验收</li><li class="${paid?'done':''}">第 ${a.paymentDay} 天<br>收齐尾款</li></ol>
    <dl class="market-facts">${costs(a)}${fact('已到账',a.received)}${fact('应收余额',a.revenue-a.received)}${fact(paid?'实际净利':preparing&&a.shipping==='standard'?'顺利时预计净利':'预计净利',a.netProfit)}${preparing&&a.shipping==='standard'?fact('换船风险下预计净利',a.riskNetProfit):''}</dl>
    <p>已验收 ${a.delivered} / ${a.quantity} ${a.unit}。</p>${action}</section>`;
}

export function equipmentView(state, ui) {
  if (state.market?.status === 'draft') {
    const project = equipmentOpportunity(state);
    return project && project.id === ui.equipmentId ? quoteView(state,project,ui.equipmentShipping || 'standard') : '';
  }
  const a = state.market?.active;
  const project = a?.kind === 'equipment' && EQUIPMENT_PROJECTS.find(p => p.id === a.productId);
  return project ? activeView(state,project) : '';
}

export function bindEquipment(root, state, ui, rerender, dispatch) {
  const focus = selector => {rerender();root.querySelector(selector)?.focus?.();};
  root.querySelectorAll('[data-equipment-open]').forEach(button => button.addEventListener('click', () => {
    ui.productId = null; ui.equipmentId = button.dataset.equipmentOpen; ui.equipmentShipping = 'standard';
    focus('[data-equipment-heading]');
  }));
  root.querySelectorAll('[data-equipment-back]').forEach(button => button.addEventListener('click', () => {
    ui.equipmentId = null; focus('[data-equipment-open]');
  }));
  root.querySelectorAll('[data-equipment-shipping]').forEach(button => button.addEventListener('click', () => {
    ui.equipmentShipping = button.dataset.equipmentShipping;
    focus('[data-equipment-shipping="'+ui.equipmentShipping+'"]');
  }));
  root.querySelectorAll('[data-equipment-sign]').forEach(button => button.addEventListener('click', () => {
    const projectId = button.dataset.equipmentSign, shipping = ui.equipmentShipping || 'standard';
    if (previewEquipment(state,projectId,shipping,DAY_COST)?.valid) dispatch({type:'SIGN_EQUIPMENT',projectId,shipping});
  }));
}
