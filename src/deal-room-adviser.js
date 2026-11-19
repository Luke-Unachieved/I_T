import {DEAL_SAVE_KEY} from './deal-room-save.js';
import {marketBook} from './deal-room-market.js';
import {neighborhoodRequest} from './deal-room-neighborhood.js';
import {equipmentOpportunity} from './deal-room-equipment.js';

// Advisory text is projected from the current view. Navigating from a note only focuses a
// visible control. Trading actions and the replayed business save stay under player control.
const ADVISERS = [
  {id:'fang', name:'方文斌', first:'桌上的合同我来整理。先回哪封询盘，你定。'},
  {id:'liang', name:'梁佳音', first:'我把买方要货的日子圈出来了。你想先回哪一家？'},
  {id:'tao', name:'陶乐', first:'样品摆好了。先看看客户打算怎么用，再给他回话。'},
  {id:'xu', name:'许明珊', first:'我把收款日记在单子旁边了。咱们先挑一笔能周转过来的。'}
];
const money = n => '¥' + n.toLocaleString('zh-CN');
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const known = id => id === 'solo' || ADVISERS.some(person => person.id === id);

export function readAdviserChoice(storage, saveKey = DEAL_SAVE_KEY) {
  try {
    const id = storage.getItem(saveKey + ':adviser');
    return known(id) ? id : null;
  } catch { return null; }
}
function suggested(text, target, label) { return {text, target, label}; }

function quoteNote(quote, state, target) {
  const {quantity, minQuantity, deliveryDay, deadlineDay, cashRequired} = quote;
  if (quantity < minQuantity) return suggested('这批数量还没到起订量。看看现货，或者和买方换个数量。', target, '查看货源和数量');
  if (deliveryDay > deadlineDay) return suggested('这批货赶不上买方的交期。换个货源再算。', target, '查看货源和交期');
  if (cashRequired > state.cash) return suggested(`开工前还差 ${money(cashRequired - state.cash)}。尾款没到账，别急着拿它付货款。`, target, '核对报价');
  if (quote.reason && !quote.valid) return suggested(quote.reason, target, '查看报价');
  if (quote.accepted === false) return suggested('客户对这份条件还有顾虑，看看对方的要求，再换一份报价。', target, '查看买方要求');
  if (quote.netProfit < 0) return suggested(`按这份报价要亏 ${money(-quote.netProfit)}。确认前还能调整条件。`, target, '核对成本');
  if (quote.kind === 'equipment') return suggested('采购、运费和验收费用都得留出来。往下看船期，再决定接不接。', target, '查看设备条款');
  return suggested('先比采购和运费，再看交付和收款隔几天。价格由你来定。', target, '查看报价');
}

function inboxNote(state, atDesk) {
  const project = equipmentOpportunity(state);
  const request = neighborhoodRequest(marketBook(state).receipts);
  const openDesk = '[data-action="OPEN_MARKET"]';
  if (project) return suggested(`${project.buyer}有一封${project.name}询价。先看看订舱和验收条款。`, atDesk ? '[data-equipment-open]' : openDesk, '查看设备来信');
  if (request) {
    if (!state.neighborhoodRegistered) return suggested('四邻百货在找门店供货方。采购台收件箱里有林妍的登记邀请。', atDesk ? '[data-market-action="REGISTER_NEIGHBORHOOD"]' : openDesk, '查看联采登记');
    return suggested(`林妍把 ${request.stores} 家店的清单发来了，先核对每店数量。`, atDesk ? '[data-neighborhood-product]' : openDesk, '查看林妍的来信');
  }
  return null;
}

function currentNote(state, context, person) {
  if (context.place === '生活') return {text:'今天先歇一会儿。想添件东西时，看一下标价和手里的周转钱。'};
  if (context.place === '工作室布置') return {text:'先看布置和标价。确认购买后才会从工作室扣款。'};
  if (context.place === '展览') return {text:'看一看这次手里的作品。陈列顺序由你来排。'};
  if (context.place === '侧间') return {text:'看看侧间里已有的物件，再决定怎么安排。'};
  if (context.place === '收工') return {text:'收齐的货款已经留在账本里了。有空再回来接下一单。'};
  if (state.phase === 'market') {
    const {status, active} = state.market;
    if (status === 'draft') {
      if (context.quote) return quoteNote(context.quote, state, '.market-quote');
      return inboxNote(state,true) || suggested('先看买方要什么。报价之前，把货源和交期问清楚。', '#market-search', '去采购台找货');
    }
    if (!active) return {text:'回采购台核对手里的合同。'};
    if (status === 'preparing') return suggested(`货已订好。第 ${active.shipDay} 天整批出运，先核对出运清单。`, '.market-active', '查看出运安排');
    if (status === 'transit') return suggested(`这批${active.productName}约在第 ${active.deliveryDay} 天交付。请按合同清单验收。`, '.market-active', '查看交货安排');
    if (status === 'receivable') return suggested(`货已验收，${money(active.balanceDue)} 尾款约在第 ${active.paymentDay} 天收。届时再入账。`, '[data-market-action="COLLECT_MARKET"]', '查看应收尾款');
    if (status === 'paid') return suggested(`这笔 ${money(active.received)} 已收齐，可以回工作室了。`, '[data-market-action="CLOSE_MARKET"]', '查看返回入口');
  }
  if (state.phase === 'negotiating') {
    if (context.quote && (state.history.length || !context.quote.valid)) return quoteNote(context.quote, state, '.business');
    return suggested(person.first, '.business', '去看询盘');
  }
  if (state.phase === 'fulfilling') return suggested('合同已经签好，先核对交货安排，尾款按约定收。', '.business','查看合同');
  if (state.phase === 'paid') return suggested('这笔货款收齐了。收据上有交货日期和净利，你看看。', '.receipt','查看收款凭据');
  if (state.phase === 'portfolio') {
    const overdue = state.contracts.filter(c => c.status === 'receivable').sort((a,b) => a.paymentDay-b.paymentDay)[0];
    if (overdue) return suggested(`还有一笔 ${money(overdue.balanceDue)} 尾款，约在第 ${overdue.paymentDay} 天收。`, '.business','查看应收安排');
    return suggested('先看看哪位客户这次需要补货。', '.business','查看客户需求');
  }
  if (['review','complete'].includes(state.phase) && context.place === '工作室') return inboxNote(state,false) || suggested('手里这轮合同已经结清。可以看看采购台的新货，再决定接哪单。', '[data-action="OPEN_MARKET"]', '去找下一单');
  return suggested('先看眼前这份约定，数量和付款日以单子为准。', '.business h2', '查看当前业务');
}

function equipmentCosts(q) {
  if (q?.kind !== 'equipment') return '';
  const rows = [['合同货款',q.revenue],['采购货款',q.goodsCost],['运费',q.freight],['验收费用',q.acceptanceFee],['日常开支',q.operatingCost]];
  rows.push([q.shipping === 'locked' ? '锁舱预计净利' : '顺利时预计净利',q.netProfit]);
  if (q.shipping === 'standard') rows.push(['换船场站费',q.stationFee],['换船风险下预计净利',q.riskNetProfit],['如选改订，另付',q.rebookFee]);
  return '<details class="adviser-costs"><summary>这份设备报价怎么算</summary><dl>' + rows.map(([label,n]) => `<div><dt>${label}</dt><dd>${money(n)}</dd></div>`).join('') + '</dl></details>';
}

export function adviserView(state, context, ui) {
  const person = ADVISERS.find(p => p.id === ui.choice);
  const pick = ui.choosing ?? (!ui.choice && !state.history.length);
  const band = person ? '换搭档' : '选助理';
  const controls = pick ? `<div class="adviser-options" role="group" aria-label="选择工作室搭档">${ADVISERS.map(p => `<button type="button" data-adviser-choice="${p.id}" aria-pressed="${ui.choice === p.id}"><i class="adviser-face adviser-${p.id}" aria-hidden="true"></i>${p.name}</button>`).join('')}<button type="button" data-adviser-choice="solo">先自己来</button></div>` : '';
  if (!person) return `<aside class="adviser-panel" aria-label="工作室搭档"><button class="quiet" type="button" data-adviser-picker aria-expanded="${pick}">${band}</button>${controls}</aside>`;
  const note = currentNote(state, context, person);
  return `<aside class="adviser-panel" aria-label="搭档便笺"><div class="adviser-byline"><i class="adviser-face adviser-${person.id}" aria-hidden="true"></i><strong>${person.name}</strong><button type="button" class="quiet" data-adviser-picker aria-expanded="${pick}">${band}</button></div>${controls}<p>${escape(note.text)}</p>${note.target ? `<button type="button" class="quiet" data-adviser-focus="${escape(note.target)}">${note.label} →</button>` : ''}${equipmentCosts(context.quote)}</aside>`;
}
export function bindAdviser(root, ui, storage, rerender, saveKey = DEAL_SAVE_KEY) {
  root.querySelector('[data-adviser-picker]')?.addEventListener('click', () => {
    ui.choosing = !root.querySelector('.adviser-options');
    rerender();
    root.querySelector(ui.choosing ? '[data-adviser-choice]' : '[data-adviser-picker]')?.focus?.({preventScroll:true});
  });
  root.querySelectorAll('[data-adviser-choice]').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.adviserChoice;
    if (!known(id)) return;
    ui.choice = id;
    ui.choosing = false;
    try { storage.setItem(saveKey + ':adviser', id); } catch {}
    rerender();
    root.querySelector('[data-adviser-picker]')?.focus?.({preventScroll:true});
  }));
  const price = root.querySelector('#market-unit-price');
  const note = root.querySelector('.adviser-panel p');
  if (price && note) price.addEventListener('input', () => {
    note.textContent = '单价改了，重新询价后咱们再核对成本和交期。';
  });
  const jump = root.querySelector('[data-adviser-focus]');
  if (!jump) return;
  const target = root.querySelector(jump.dataset.adviserFocus);
  if (!target) { jump.hidden = true; return; }
  jump.addEventListener('click', () => {
    for (let p = target.parentElement; p; p = p.parentElement) if (p.tagName === 'DETAILS') p.open = true;
    if (!target.matches('button, input, select, [tabindex]')) target.setAttribute('tabindex','-1');
    target.focus({preventScroll:true});
    target.scrollIntoView({block:'center'});
  });
}
