import {previewWorkspaceSleep} from './deal-room-workspace-sleep.js';
import {carafeTransport} from './deal-room-market-carafe-transport.js';
import {prospectDisplayText} from './deal-room-prospect-locale.js';
import {DEAL_SAVE_KEY} from './deal-room-save.js';
import {marketBook} from './deal-room-market.js';
import {neighborhoodRequest} from './deal-room-neighborhood.js';
import {prospectInbox} from './deal-room-prospects.js';
import {previewPromotion} from './deal-room-promotion.js';
import {warehouseAvailable,warehouseSummary} from './deal-room-warehouse.js';
import {previewAccount} from './deal-room-account.js';
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
const escape = value => String(prospectDisplayText(value)).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
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
  const desk=target==='.market-quote',source=desk?'quote-source':target,price=desk?'quote-price':target,facts=desk?'quote-costs':target;
  if (quantity < minQuantity) return suggested('这批数量还没到起订量。看看现货，或者和买方换个数量。', source, '查看货源和数量');
  if (deliveryDay > deadlineDay) return suggested('这批货赶不上买方的交期。换个货源再算。', source, '查看货源和交期');
  if (cashRequired > state.cash) return suggested(`开工前还差 ${money(cashRequired - state.cash)}。尾款没到账，别急着拿它付货款。`, facts, '核对报价');
  if (quote.reason && !quote.valid) return suggested(quote.reason, price, '查看报价');
  if (quote.accepted === false) return suggested('客户对这份条件还有顾虑，看看对方的要求，再换一份报价。', price, '查看买方要求');
  if (quote.netProfit < 0) return suggested(`按这份报价要亏 ${money(-quote.netProfit)}。确认前还能调整条件。`, facts, '核对成本');
  if (quote.kind === 'equipment') return suggested('采购、运费和验收费用都得留出来。往下看船期，再决定接不接。', desk?'equipment-route':target, '查看设备条款');
  return suggested(desk?'先比采购和运费，再看从交货到回款要等几天。':'这几种方案垫的钱、回款的日子都不一样。先看看哪档周转得开。', price, '查看报价');
}

function inboxNote(state, atDesk) {
  const project = equipmentOpportunity(state);
  const request = neighborhoodRequest(marketBook(state).receipts);
  const openDesk = '[data-action="OPEN_MARKET"]';
  if (project) return suggested(`${project.buyer}有一封${project.name}询价。先看看订舱和验收条款。`, atDesk ? '[data-equipment-open]' : openDesk, '查看设备来信');
  if (request) {
    if (!state.neighborhoodRegistered) return suggested('四邻百货在找门店供货方。到「商品与项目」看看林妍的联采登记。', atDesk ? '[data-market-action="REGISTER_NEIGHBORHOOD"]' : openDesk, '查看联采登记');
    return suggested(`林妍把 ${request.stores} 家店的清单发来了，先核对每店数量。`, atDesk ? '[data-neighborhood-product]' : openDesk, '查看联采清单');
  }
  return null;
}

function workspaceNote(s,person){
 const nav=(text,label,tab,ref)=>({text,label,tab,ref});
 if(s.phase==='paid'||s.phase==='market'&&s.market?.active&&s.market.status==='paid')return nav('这笔货款已收齐。可以去订单核对收款凭据。','查看收款凭据','orders');
 if(s.phase==='market'&&s.market?.active&&s.market.status!=='paid'||['fulfilling','supply','collection','collection-revision','stock-procurement','atelier-restock','linen-freight','studio-project'].includes(s.phase))
  return nav('手上有一笔单。去看交接安排和款项，不用从头再报价。','看这笔订单','orders');
 if(s.phase==='negotiating')return nav(person.first,'去收件箱','inbox');
 if(!['review','complete','market'].includes(s.phase))return null;
 const letters=prospectInbox(s);
 if(letters.some(letter=>letter.replyBy===s.day))return nav('有询盘今天截止。先看看数量和收货日，再决定要不要报价。','去收件箱','inbox');
 if(letters.length||inboxNote(s,false))return nav('有新来信。先看数量和收货日，再决定接哪笔。','去收件箱','inbox');
 if(previewPromotion(s,'district').valid)return nav('暂时没有待回的询盘。想找新客户，可以先看看版位和价格。','去推广获客','development','promotion');
 const sleep=previewWorkspaceSleep(s);
 if(sleep.valid)return nav('今天没有待办的订单。可以先回家，睡到明天再看。','去下班','afterwork');
 return null;
}
export function adviserWorkspaceAdvice(s,ui={}){
 const person=ADVISERS.find(x=>x.id===ui.choice), note=person?workspaceNote(s,person):null;
 return note?.tab?[{title:note.label,tab:note.tab,text:note.text,ref:note.ref}]:[];
}
function accountNote(s,option){
 const a=s.account;
 if(a.status==='draft'){
  const q=previewAccount(s,a.expansion?'remaining':option||'pilot');
  if(q&&!q.valid&&q.requiredCash>s.cash)return suggested('算上回款前的开支，还差 '+money(q.requiredCash-s.cash)+'。先别签。','.account-order-section .offer','核对款项');
  return a.expansion?suggested('前三家已结清。这次只给另外三家备货，先看看供什么货、要先垫多少钱。','.account-order-specs','核对两批商品'):
   suggested('先核对定金和要垫的货款，再看尾款哪天到。只签眼前这一批。','.account-order-section','查看款项');
 }
 if(a.status==='paid')return {text:a.expansion?'尾款收齐了，六家店都收到货了。':'货款收齐了。要不要给另外三家店供货，回办公室再决定。'};
 const delivered=a.status==='receivable', due=delivered?a.paymentDay:a.deliveryDay;
 if(!['receivable','fulfilling'].includes(a.status)||!Number.isSafeInteger(due))return null;
 if(s.day===due)return delivered?suggested('今天到收款日，核对 '+money(a.balanceDue)+' 尾款。','[data-action="COLLECT_ACCOUNT_V1"]','核对尾款'):
  suggested('今天该交货。确认这一批送到门店，再等尾款。','[data-action="DELIVER_ACCOUNT_V1"]','查看交货安排');
 return {text:delivered?'货已交了，第 '+due+' 天收尾款。':'第 '+due+' 天交货，到时候再来确认。'};
}
export function orderFooterAdvice(s,adviserId){
 const person=ADVISERS.find(p=>p.id===adviserId);
 if(!person)return '';
 let text;
 if(s.phase==='account'&&s.account){
  const a=s.account;
  if(a.status==='fulfilling')text=s.day===a.deliveryDay?'确认门店签收后，就可以等尾款了。':'等到交货日再确认，先不用动这单。';
  if(a.status==='receivable')text=s.day===a.paymentDay?'这次只收尾款，签约时的定金已经到账。':'货已经送到，等收款日再来处理这单。';
  if(a.status==='paid'&&!a.expansion)text='另外三家店的订单不用现在接，明天再决定也行。';
 }else if((s.contracts||[]).some(o=>o.status==='fulfilling'))text='先看哪笔快到交货日，别让货压在手里。';
 else if(['review','complete'].includes(s.phase))text='要对账的话，从「最近回款」能查到每笔实收。';
 if(!text)return '';
 return `<aside class="ws-order-tip" aria-label="${escape(person.name)}"><i class="adviser-face adviser-${person.id}" aria-hidden="true"></i><p>${escape(text)}</p></aside>`;
}
function warehouseNote(s){
 const w=warehouseSummary(s);
 if(!w.valid)return {text:'这次没能读到仓位，先回上一页，别照这张表备货。'};
 if(w.inTransitBoxes)return suggested('还有 '+w.inTransitBoxes+' 箱在路上，最早第 '+w.nextArrivalDay+' 天到。没入仓，先别拿来给客户承诺现货。','[data-wh-rack] > summary','查看仓位');
 if(w.onHandBoxes)return suggested('已入仓 '+w.onHandBoxes+' 箱。报价前先按商品核对，别把总箱数当作同一款的库存。','[data-wh-rack] > summary','查看仓位');
 if(warehouseAvailable(s))return suggested('仓库还是空的。先看备货会占多少钱，不必为了填满仓位就订货。','[data-wh-order] > summary','看看备货条件');
 return {text:'仓库还是空的。手上的订单结清后，再来考虑提前备货。'};
}
function developmentNote(s){
 const promo=previewPromotion(s,'district');
 if(promo.valid)return suggested('想找新客户，可以先比较推广版位和费用。先看条件，不用马上刊登。','[data-hub-promotion] > summary','比较推广版位');
 return suggested('还不急着投推广。已合作的客户如果愿意引荐，可以先看看买手要什么。','.ws-leads > summary','查看客户机会');
}
function currentNote(state, context, person) {
  if(context.place==='发展')return developmentNote(state);
  if(context.place==='自有仓库')return warehouseNote(state);
  if(context.place==='订单列表') {
    if(context.orderList==='market')return suggested('手头这笔订单可以打开核对交期和款项。','[data-workspace-current-market-order]','找到订单详情');
    if(context.orderList==='opening')return suggested('先核对约好的交付和回款日期。','[data-workspace-order-detail]','查看交货安排');
    return suggested('想接下一单？可以去看看还有哪些商品和项目。','[data-workspace-products]','去商品与项目');
  }
  if(context.place==='业务'&&state.phase==='account'&&state.account){const note=accountNote(state,context.accountOption);if(note)return note;}

  if(context.place==='办公室'){const actionable=workspaceNote(state,person);if(actionable)return actionable;}
  if (context.place === '下班'||context.place === '住处') {
    const home=context.place==='住处',q=previewWorkspaceSleep(state);
    if(!q.valid)return null; // The sleep panel already supplies the blocking reason and any action.
    const text=q.pending.length?'还有询盘今天截止。「睡到明天」会先列给你看。':'想开始明天，就点「睡到明天」，先看今天的工作室开支。';
    return suggested(text,home?'[data-home-sleep]':'[data-workspace-sleep]','看看睡前安排');
  }
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
    if(carafeTransport(state))return suggested('联仓的车已配好。包车会早两天交货和收款，但比照原安排多花 ¥36；两边的日期可以一起比。','.ws-carafe .ws-ship-choice','比较两种运输安排');
    if(active.carafeCharter&&status==='transit')return suggested('包车已订，第 '+active.deliveryDay+' 天交货。先看看新的验收安排。','.ws-carafe [data-market-action="DELIVER_MARKET"]','查看新交货安排');
    if(status==='legacy-preparing')return suggested('客户定金已收。到第 '+active.shipDay+' 天再付工厂尾款和运费。','.market-active','看出运安排');
    if(status==='legacy-transit')return suggested('第 '+active.deliveryDay+' 天交接。先留出验收费，验完才收中间一笔。','.market-active','看验收安排');
    if(status==='legacy-receivable')return suggested('中间一笔已到账。尾款 '+money(active.balanceDue)+'，等第 '+active.paymentDay+' 天收。','.market-active','看尾款');
    if (status === 'preparing') return suggested(`货已订好。第 ${active.shipDay} 天整批出运，先核对出运清单。`, '.market-active', '查看出运安排');
    if (status === 'transit') return suggested(`这批${active.productName}约在第 ${active.deliveryDay} 天交付。请按合同清单验收。`, '.market-active', '查看交货安排');
    if (status === 'receivable') return suggested(`货已验收，${money(active.balanceDue)} 尾款约在第 ${active.paymentDay} 天收。届时再入账。`, '[data-market-action="COLLECT_MARKET"]', '查看应收尾款');
    if(status==='paid'&&active.kind==='prospect')return {text:`这笔 ${money(active.received)} 已收齐，账本上也记好了。`};
    if (status === 'paid') {
      const back=context.back==='orders'?'返回订单':'返回收件箱';
      return suggested(`这笔 ${money(active.received)} 已收齐，可以${back}了。`, '[data-market-action="CLOSE_MARKET"]', back);
    }
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
  return suggested('先看眼前这份约定，数量和付款日以单子为准。', '.business h2', '看看手头的单子');
}

function equipmentCosts(q) {
  if (q?.kind !== 'equipment') return '';
  const rows = [['合同货款',q.revenue],['采购货款',q.goodsCost],['运费',q.freight],['验收费用',q.acceptanceFee],['日常开支',q.operatingCost]];
  rows.push([q.shipping === 'locked' ? '锁舱预计净利' : '顺利时预计净利',q.netProfit]);
  if (q.shipping === 'standard') rows.push(['换船场站费',q.stationFee],['换船风险下预计净利',q.riskNetProfit],['如选改订，另付',q.rebookFee]);
  return '<details class="adviser-costs"><summary>这份设备报价怎么算</summary><dl>' + rows.map(([label,n]) => `<div><dt>${label}</dt><dd>${money(n)}</dd></div>`).join('') + '</dl></details>';
}

export function adviserPickerOpen(state,ui){
  return ui.choosing ?? (!ui.choice && !state.history.length);
}

export function adviserView(state, context, ui) {
  const person = ADVISERS.find(p => p.id === ui.choice);
  const pick = adviserPickerOpen(state,ui);
  const band = person ? '换助理' : '选助理';
  const controls = pick ? `<div class="adviser-options" role="group" aria-label="选择工作室搭档">${ADVISERS.map(p => `<button type="button" data-adviser-choice="${p.id}" aria-pressed="${ui.choice === p.id}"><i class="adviser-face adviser-${p.id}" aria-hidden="true"></i>${p.name}</button>`).join('')}</div>
    <div class="adviser-defer"><button type="button" data-adviser-choice="solo">稍后再选</button></div>` : '';
  if (!person) return `<aside class="adviser-panel" aria-label="工作室搭档"><button class="quiet" type="button" data-adviser-picker aria-expanded="${pick}">${band}</button>${controls}</aside>`;
  const minimal=context.identityOnly||context.place==='订单列表'||(context.orderFocus&&state.phase==='account'&&state.account?.status!=='draft');
  const note = pick||minimal?{}:currentNote(state, context, person)??{};
  const action=note.tab?`<button type="button" class="quiet" data-adviser-tab="${note.tab}"${note.ref==='promotion'?' data-adviser-ref="promotion"':''}>${note.label} →</button>`:note.target?`<button type="button" class="quiet" data-adviser-focus="${escape(note.target)}">${note.label} →</button>`:'';
  const message=!pick&&!context.compact&&!minimal&&note.text;
  const tip=message?`<div class="adviser-message"><i class="adviser-face adviser-${person.id}" aria-hidden="true"></i><div><p>${escape(note.text)}</p>${action}</div></div>`:action;
  return `<aside class="adviser-panel" aria-label="搭档便笺"><div class="adviser-byline"><i class="adviser-face adviser-${person.id}" aria-hidden="true"></i><strong>${person.name}</strong><button type="button" class="quiet" data-adviser-picker aria-expanded="${pick}">${band}</button></div>${controls}${tip}${pick?'':equipmentCosts(context.quote)}</aside>`;
}
// Resolve the nearest meaningful live control, never a paid action dispatch.
const adviserTargets=Object.freeze({
 'quote-source':['[data-prospect-source][aria-pressed="true"]','[data-market-source][aria-pressed="true"]','.market-quote'],
 'quote-price':['#prospect-unit-price','#market-unit-price','#legacy-price','.market-quote'],
 'quote-costs':['.market-quote .market-facts','.market-quote'],
 'equipment-route':['[data-equipment-shipping][aria-pressed="true"]','[data-legacy-route][aria-pressed="true"]','.market-quote']
});
export function bindAdviser(root, ui, storage, rerender, saveKey = DEAL_SAVE_KEY, navigate) {
  root.querySelector('[data-adviser-tab]')?.addEventListener('click',event=>{const k=event.currentTarget.dataset.adviserTab;if(['inbox','orders','development','afterwork'].includes(k)){const ref=event.currentTarget.dataset.adviserRef;ref==='promotion'?navigate?.(k,ref):navigate?.(k);}});
  root.querySelector('[data-adviser-picker]')?.addEventListener('click', () => {
    ui.choosing = !root.querySelector('.adviser-options');
    rerender();
    root.querySelector(ui.choosing ? '[data-adviser-choice]' : '[data-adviser-picker]')?.focus?.({preventScroll:true});
  });
  if (root.querySelector('.adviser-options')) {
    root.querySelector('.adviser-panel')?.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      ui.choosing = false;
      rerender();
      root.querySelector('[data-adviser-picker]')?.focus?.({preventScroll:true});
    });
  }
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
  const key=jump.dataset.adviserFocus;
  const target=Object.hasOwn(adviserTargets,key)?adviserTargets[key].map(selector=>root.querySelector(selector)).find(Boolean):root.querySelector(key);
  if (!target) { jump.hidden = true; return; }
  jump.addEventListener('click', () => {
    for (let p = target.parentElement; p; p = p.parentElement) if (p.tagName === 'DETAILS') p.open = true;
    if (!target.matches('button, input, select, [tabindex]')) target.setAttribute('tabindex','-1');
    target.focus({preventScroll:true});
    target.scrollIntoView({block:'center'});
  });
}
