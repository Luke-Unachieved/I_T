import {netProfitAmount} from './deal-room-net-profit.js';
import {equipmentComicView} from './deal-room-equipment-comics.js';
import {EQUIPMENT_PROJECTS,EQUIPMENT_SIGN_V2,equipmentOpportunity,previewEquipment,canRebookEquipment} from './deal-room-equipment.js?v=36';
import {DAY_COST} from './deal-room-market.js?v=36';

const artwork = {
  'cold-chain': ['assets/deal-project-cold-chain.webp','assets/deal-buyer-zhou-lan.webp'],
  'automated-warehouse': ['assets/deal-project-automated-warehouse.webp','assets/deal-buyer-cheng-zhe.webp'],
  'filling-lines': ['assets/deal-project-filling-line.webp']
};
const money = value => '¥' + value.toLocaleString('zh-CN');
const fact = (label, amount, net=false) => `<div><dt>${label}</dt><dd>${net?netProfitAmount(amount):money(amount)}</dd></div>`;

export function equipmentInvite(state) {
  const project = equipmentOpportunity(state);
  if (!project) return '';
  return `<section class="market-repeat"><h3>设备项目来信</h3><button data-equipment-open="${project.id}"><strong>${project.name}（${project.quantity} ${project.unit}）</strong><small>${project.buyer}</small></button></section>`;
}

function projectSummary(project, status, draft = false) {
  const [productImage,portrait] = artwork[project.id];
  const manifest = project.consignees
    ? `<p><strong>收货清单</strong> ${project.consignees.map(factory => factory.name+' '+factory.quantity+' 条').join('、')}。</p>` : '';
  const heading=draft?'h2':'h3';
  return `<div class="market-sheet${draft?' market-trade-hero':''}"><img class="equipment-product" src="${productImage}" alt="${project.name}"><div><small>${project.company}</small><${heading} tabindex="-1" data-equipment-heading>${project.name}（${project.quantity} ${project.unit}）</${heading}>${draft?'':`<p>${project.brief}</p>`}</div></div>
    <section aria-label="客户留言"><div class="equipment-buyer">${portrait ? `<img src="${portrait}" width="64" height="64" alt="${project.buyer}">` : ''}<p><strong>${project.buyer}</strong><br>“${project.dialogue[status]}”</p></div></section>
    ${draft?'<details class="market-trade-detail"><summary>供货、清单与验收约定</summary>':''}<p><strong>供货与装船</strong> ${project.supplier}。${project.shipping}</p>${manifest}
    <p class="market-inspection"><strong>验收约定</strong> ${project.inspection}</p>${draft?'</details>':''}`;
}

function costs(q) {
  return fact('合同货款',q.revenue) + equipmentReceiptCosts(q) +
    fact('到收齐的日常开支',q.operatingCost) + fact('总成本（含日常开支）',q.cost+q.operatingCost);
}

export function equipmentReceiptCosts(q) {
  return fact('采购货款',q.goodsCost) + fact('运输费用',q.freight) + fact('验收费用',q.acceptanceFee) +
    (q.stationPaid ? fact('已付场站费',q.stationPaid) : '') + (q.rebookPaid ? fact('已付改订费',q.rebookPaid) : '') + fact('采购、运输及验收合计',q.cost);
}

export function equipmentQuoteMilestones(ship,arrival,pay,{fixed=false}={}) {
 if(![ship,arrival,pay].every(Number.isSafeInteger))return '';
 return `<ol class="market-milestones" aria-label="${fixed?'锁定船期':'预计船期'}">
  <li><strong>第 ${ship} 天装船</strong><small>整批发货</small></li>
  <li><strong>第 ${arrival} 天</strong><small>${fixed?'到港验收':'预计到港验收'}</small></li>
  <li><strong>第 ${pay} 天</strong><small>${fixed?'收尾款':'预计收尾款'}</small></li>
 </ol>`;
}
export function equipmentQuoteDelay({slipDays,stationFee,rebookFee,daysSaved,riskProfit,paymentDay}) {
 if(!slipDays)return '';
 return `<section class="market-quote-risk" aria-label="换船的影响"><h3>如果换船</h3><dl>
  <div><dt>验收和回款</dt><dd>晚 ${slipDays} 天</dd></div>
  ${Number.isSafeInteger(paymentDay+slipDays)?'<div><dt>换船时收尾款</dt><dd>最晚第 '+(paymentDay+slipDays)+' 天</dd></div>':''}
  <div><dt>场站费</dt><dd>${money(stationFee)}</dd></div>
  <div><dt>多付的日常开支</dt><dd>${money(slipDays*DAY_COST)}</dd></div>
  ${Number.isSafeInteger(riskProfit)?`<div><dt>换船风险下预计净利</dt><dd>${netProfitAmount(riskProfit)}</dd></div>`:''}
 </dl><p>可加付 ${money(rebookFee)} 改早班，比原延误方案早 ${daysSaved} 天。场站费仍要付。</p></section>`;
}
function quoteView(state, project, shipping) {
 const q=previewEquipment(state,project.id,shipping,DAY_COST,2);
 if(!q)return '';
 const flexible=shipping==='standard';
 const choices=[['standard','常规舱'],['locked','锁舱']].map(([choice,label])=>{
   const r=previewEquipment(state,project.id,choice,DAY_COST,2);
   return `<div class="market-choice"><button type="button" data-equipment-shipping="${choice}" aria-pressed="${choice===shipping}" aria-describedby="equipment-${choice}-facts">${label}</button>
   <div id="equipment-${choice}-facts" class="market-choice-facts"><p>运费 <strong>${money(r.freight)}</strong></p><small>${choice==='standard'?'中途可能换船':'加付运费，锁定原船期'}</small></div></div>`;
 }).join('');
 return `<section class="market-quote equipment-quote market-trade-sheet" aria-label="设备合同报价"><button type="button" class="quiet" data-equipment-back>‹ 返回商品与项目</button>
   ${projectSummary(project,'draft',true)}
   <div class="market-trade-columns"><section aria-label="船期与运输费用"><fieldset class="market-compare"><legend>怎么订舱</legend>${choices}</fieldset>
   ${equipmentQuoteMilestones(q.shipDay,q.deliveryDay,q.paymentDay,{fixed:!flexible})}
   ${flexible?equipmentQuoteDelay({slipDays:q.slipDays,stationFee:q.stationFee,rebookFee:q.rebookFee,daysSaved:q.daysSaved,riskProfit:q.riskNetProfit,paymentDay:q.paymentDay}):''}
   </section><section class="market-trade-price" aria-label="合同货款与周转">
   <dl class="market-facts market-trade-totals">${fact('合同货款',q.revenue)}${fact('最低周转金',q.cashRequired)}${fact(flexible?'顺利时预计净利':'锁舱预计净利',q.netProfit,true)}</dl>
   <h3 class="market-finance-title">签约当天</h3>
   <dl class="market-pay-plan">${fact('收到预付款',q.deposit)}${fact('付采购及服务费',q.cost)}</dl>
   <details class="market-trade-detail"><summary>费用与尾款明细</summary><dl class="market-facts">${equipmentReceiptCosts(q)}${fact('到收齐的日常开支',q.operatingCost)}${fact('总成本（含日常开支）',q.cost+q.operatingCost)}${fact('验收后应收尾款',q.balanceDue)}</dl></details>
   ${q.valid?'':`<p class="market-warning">${q.reason||`开工前还差 ${money(q.cashRequired-state.cash)}。`}</p>`}
   <button type="button" class="primary" data-equipment-sign="${project.id}" ${q.valid?'':'disabled'}>确认签约</button></section></div></section>`;
}

// Keep both decisions on the same labeled rows, including on small screens.
export function equipmentRoutePair(wait,early){
 return '<div class="eq-routes">'+[wait,early].map(r=>'<article><h4>'+r.title+'</h4><dl>'+[['现在另付',money(r.fee)],['到货验收','第 '+r.day+' 天'],['收尾款','第 '+r.pay+' 天']].map(([k,v])=>'<div><dt>'+k+'</dt><dd>'+v+'</dd></div>').join('')+'</dl>'+(r.button?'<button type="button" '+r.action+(r.enabled?'':' disabled')+'>'+r.button+'</button>':'')+'</article>').join('')+'</div>';
}

function activeView(state, project) {
  const a = state.market.active;
  const preparing = a.status === 'preparing', transit = a.status === 'transit', paid = a.status === 'paid';
  let action;
  if (preparing) {
    action = `<p>第 ${a.shipDay} 天装船，整批出运 ${a.quantity} ${a.unit}。</p>${state.day>=a.shipDay?'<button class="primary" data-market-action="SHIP_EQUIPMENT_'+(state.day===a.shipDay?'V2':'V3')+'">确认装船</button>':''}`;
  } else if (transit) {
    const choose=a.transfer&&!a.rebookPaid&&state.day===a.shipDay;
    const available=choose&&canRebookEquipment(state,DAY_COST);
    action=choose?`<section class="eq-decision"><h3>船期变了，怎么安排？</h3><p>场站费 ${money(a.stationPaid)} 已付，两种方案都不退。改订可早 ${a.daysSaved} 天回款，少付 ${money(a.daysSaved*DAY_COST)} 日常开支。不改订就按现在的船期等货，到港再验收。</p>${equipmentRoutePair({title:'照现在的船期等',fee:0,day:a.deliveryDay,pay:a.paymentDay,action:'',enabled:false,button:''},{title:'改订更早的班次',fee:a.rebookFee,day:a.deliveryDay-a.daysSaved,pay:a.paymentDay-a.daysSaved,action:'data-market-action="REBOOK_EQUIPMENT"',enabled:available,button:'确认改订'})}${available?'':'<p>现金不足以改订并等到回款。</p>'}</section>`:`<p>已装船，预计第 ${a.deliveryDay} 天到港。${a.rebookPaid?'改订后的船期已确认。':''}</p>${state.day>=a.deliveryDay?'<button class="primary" data-market-action="DELIVER_MARKET_V2">按清单整单验收</button>':''}`;
  } else if (paid) {
    action = '<p class="market-success">货款已收齐，项目已记入工作室账本。</p><button class="primary" data-market-action="CLOSE_MARKET">回工作室</button>';
  } else {
    action = `<p>已到港并整单验收。第 ${a.paymentDay} 天可收尾款 ${money(a.balanceDue)}。</p>${state.day>=a.paymentDay?'<button class="primary" data-market-action="COLLECT_MARKET_V2">收齐尾款</button>':''}`;
  }
  return `<section class="market-active equipment-active eq-order"><small>${project.company}，${project.buyer}</small><h3>${project.name}（${a.quantity} ${a.unit}）</h3><p>已验收 ${a.delivered} / ${a.quantity} ${a.unit}。</p>${action}${equipmentComicView(a,a.status)}<details><summary>合同与费用明细</summary>${projectSummary(project, a.status)}
    <ol class="market-track"><li class="done">第 ${a.signedDay} 天<br>签约</li><li class="${preparing?'':'done'}">第 ${a.shipDay} 天<br>装船</li><li class="${preparing||transit?'':'done'}">第 ${a.deliveryDay} 天<br>到港验收</li><li class="${paid?'done':''}">第 ${a.paymentDay} 天<br>收齐尾款</li></ol>
    <dl class="market-facts">${costs(a)}${fact('已到账',a.received)}${fact('应收余额',a.revenue-a.received)}${fact(paid?'实际净利':preparing&&a.shipping==='standard'?'顺利时预计净利':'预计净利',a.netProfit,true)}${preparing&&a.shipping==='standard'?fact('换船风险下预计净利',a.riskNetProfit,true):''}</dl>
    </details></section>`;
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
    if (previewEquipment(state,projectId,shipping,DAY_COST,2)?.valid) dispatch({type:EQUIPMENT_SIGN_V2,projectId,shipping});
  }));
}
