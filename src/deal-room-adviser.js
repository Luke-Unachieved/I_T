import {netProfitAmount} from './deal-room-net-profit.js';
import {openingDialogueQuote} from './deal-room-opening-dialogue.js';
import {openingContractMilestone} from './deal-room-opening-calendar.js';
import {repeatContractMilestone} from './deal-room-repeat-calendar.js';
import {openingMarketOrders,openingMarketProjection} from './deal-room-opening-market.js';
import {openFirstBuyers,familiarBuyers} from './deal-room-engine.js';
import {marketCalendarDue} from './deal-room-market-calendar.js';
import {previewLiveWorkspaceSleep as previewWorkspaceSleep} from './deal-room-workspace-sleep.js';
import {carafeTransport} from './deal-room-market-carafe-transport.js';
import {prospectDisplayText} from './deal-room-prospect-locale.js';
import {DEAL_SAVE_KEY} from './deal-room-save.js';
import {marketBook,marketAvailable,canParkMarketOrder,parkedMarketOrders} from './deal-room-market.js';
import {neighborhoodRequest} from './deal-room-neighborhood.js';
import {prospectInbox} from './deal-room-prospects.js';
import {previewPromotion} from './deal-room-promotion.js';
import {warehouseAvailable,warehouseSummary} from './deal-room-warehouse.js';
import {previewAccount} from './deal-room-account.js';
import {equipmentOpportunity} from './deal-room-equipment.js';

// Advisory text is projected from the current view. Navigating from a note only focuses a
// visible control. Trading actions and the replayed business save stay under player control.
const ADVISERS = [
  {id:'fang', name:'方文斌', first:'先看有哪几封要回。你挑一封，我帮你把订单条件理清。'},
  {id:'liang', name:'梁佳音', first:'这几家要货的日子不一样。先挑一单赶得上的。'},
  {id:'tao', name:'陶乐', first:'先问清楚货摆在哪儿。做橱窗样品和补货，谈的条件不一样。'},
  {id:'xu', name:'许明珊', first:'先看看这笔要垫多少、哪天收钱。别把下单的钱都压在这儿。'}
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
  if (quantity < minQuantity) return suggested('这批还没到起订量。现货或换个数量，都可以再算一算。', source, '查看货源和数量');
  if (deliveryDay > deadlineDay) return suggested('这个货源赶不上交期，换一家或许有办法。', source, '查看货源和交期');
  if (cashRequired > state.cash) return suggested(`开工前还差 ${money(cashRequired - state.cash)}，没到账的尾款还不能用来付这笔货款。`, facts, '核对报价');
  if (quote.reason && !quote.valid) return suggested(quote.reason, price, '查看报价');
  if (quote.accepted === false) return suggested('对方没接受这份条件。要是还想谈，报价可以改。', price, '查看买方要求');
  if (quote.netProfit < 0) return suggested(`按这份报价要亏 ${money(-quote.netProfit)}。确认前还能调整条件。`, facts, '核对成本');
  if (quote.kind === 'equipment') return suggested('除了采购款，这单还有运费和验收费。船期也列在下面，方便一起算。', desk?'equipment-route':target, '查看设备条款');
  return suggested(desk?'先看看要垫多少、哪天能收回来。手上还有别的单，就把两边要付的钱一起算。':'这几份的垫款和回款日不一样，手头留的钱也会有差别。', price, '查看报价');
}

function inboxNote(state, atDesk) {
  const project = equipmentOpportunity(state);
  const request = neighborhoodRequest(marketBook(state).receipts);
  const openDesk = '[data-action="OPEN_MARKET"]';
  if (project) return suggested(`${project.buyer}有一封${project.name}询价，信里有订舱和验收条款。`, atDesk ? '[data-equipment-open]' : openDesk, '查看设备来信');
  if (request) {
    if (!state.neighborhoodRegistered) return suggested('四邻百货在找门店供货方。林妍的联采登记在「商品与项目」里。', atDesk ? '[data-market-action="REGISTER_NEIGHBORHOOD"]' : openDesk, '查看联采登记');
    return suggested(`林妍把 ${request.stores} 家店的清单发来了，各店要多少都写在上面。`, atDesk ? '[data-neighborhood-product]' : openDesk, '查看联采清单');
  }
  return null;
}

const openingNames={mira:'米拉',samir:'萨米尔',ines:'伊内斯'};
export function adviserNextMilestone(s){
 const story=[openingContractMilestone(s),repeatContractMilestone(s)].filter(Boolean)
  .map(d=>({...d,buyer:openingNames[d.clientId]}));
 const active=s.phase==='market'?s.market?.active:null;
 const market=[active,...parkedMarketOrders(s),...openingMarketOrders(s)].filter(Boolean).map(o=>{
  const d=marketCalendarDue({phase:'market',market:{status:o.status,active:o}});
  return d&&{...d,contract:o,buyer:prospectDisplayText(o.buyer)};
 });
 const account=s.phase==='account'&&s.account;
 const delivery=account?.status==='fulfilling';
 const dated=account&&['fulfilling','receivable'].includes(account.status)
  ?{delivery,day:delivery?account.deliveryDay:account.paymentDay,contract:account}:null;
 return [...story,...market,dated].filter(d=>Number.isSafeInteger(d?.day)&&d.day>0).sort((a,b)=>a.day-b.day)[0]||null;
}
function milestoneLine(d,day){
 const action=d.stage==='ship'?'确认装船':d.sameDay?'确认交货并收款':d.delivery?'确认交货':d.equipment||d.contract?.deposit>0?'收取尾款':'收取货款';
 const subject=d.buyer?d.buyer+'这单':'这笔订单';
 if(d.day<=day)return subject+(d.day===day?'今天要':'已经到期，记得去订单里')+action+'。';
 const event=d.stage==='ship'?'装船':d.sameDay?'交货并收款':d.delivery?'交货':d.equipment||d.contract?.deposit>0?'收尾款':'收货款';
 return subject+'第 '+d.day+' 天'+event+'。';
}
function nextLetter(rows){
 return [...rows].sort((a,b)=>(a.replyBy??Infinity)-(b.replyBy??Infinity))[0]||null;
}
function workspaceNote(s,person){
 const nav=(text,label,tab,ref)=>({text,label,tab,ref});
 const due=adviserNextMilestone(s), sleep=previewWorkspaceSleep(s);
 if(due&&due.day<=s.day)return nav(milestoneLine(due,s.day),'去订单','orders');
 const opening=openFirstBuyers(s),familiar=familiarBuyers(s),projection=openingMarketProjection(s,0);
 const canOpen=marketAvailable(s)||canParkMarketOrder(s)||s.phase==='market'&&['draft','paid'].includes(s.market?.status);
 const ordinary=projection?prospectInbox(projection):canOpen?prospectInbox(s,{whileActive:canParkMarketOrder(s)}):[];
 const letter=nextLetter(ordinary);
 const before=due?milestoneLine(due,s.day)+' ':'';
 if(letter&&letter.replyBy===s.day)return nav(before+letter.person.displayName+'的询盘今天截止，有空可以先回这封。','去收件箱','inbox');
 if(opening.length||familiar.length||letter)return nav(due?before+'还有来信没回，等货时也可以接着谈。':
  opening.length&&!s.contracts?.length?person.first:'收件箱有来信，先看看数量和交货日期。','去收件箱','inbox');
 if(previewPromotion(s,'district').valid)return nav(before+'要是想找新客户，可以先看这次推广要花多少钱。','去推广获客','development','promotion');
 if(sleep.valid)return nav(before+'今天没有到期的订单。想收工的话，明天继续。','去下班','afterwork');
 if(due)return nav(before.trim(),'去订单','orders');
 return null;
}
export function adviserInboxAdvice(s,rows){
 const due=adviserNextMilestone(s);
 if(due&&due.day<=s.day)return milestoneLine(due,s.day)+(rows.length?' 手上的单子办完，再回来看来信。':'');
 const letter=nextLetter(rows);
 if(letter&&Number.isSafeInteger(letter.replyBy))return letter.person.displayName+'的来信第 '+letter.replyBy+' 天截止。先看数量，再看看来不来得及交货。';
 if(!rows.length)return due?milestoneLine(due,s.day):'';
 if(due)return milestoneLine(due,s.day)+' 要接新单，先看看两笔生意的备货款会不会撞到一起。';
 return '报价之前，咱们先算算要垫多少。客户愿意先付定金，这单就少占一点周转钱。';
}
export function adviserWorkspaceAdvice(s,ui={}){
 const person=ADVISERS.find(x=>x.id===ui.choice), note=person?workspaceNote(s,person):null;
 return note?.tab?[{title:note.label,tab:note.tab,text:note.text,ref:note.ref}]:[];
}
function accountNote(s,option){
 const a=s.account;
 if(a.status==='draft'){
  const q=previewAccount(s,a.expansion?'remaining':option||'pilot');
  if(q&&!q.valid&&q.requiredCash>s.cash)return suggested('算上回款前的开支，还差 '+money(q.requiredCash-s.cash)+'，目前还签不了。','.account-order-section .offer','核对款项');
  return a.expansion?suggested('前三家已经结清。剩下三家用哪些货、要垫多少，单子上是分开列的。','.account-order-specs','核对两批商品'):
   suggested('这次只谈眼前这一批。定金、垫款和尾款日都列在单子上了。','.account-order-section','查看款项');
 }
 if(a.status==='paid')return {text:a.expansion?'尾款收齐了，六家店都收到货了。':'货款收齐了。要不要给另外三家店供货，回办公室再决定。'};
 const delivered=a.status==='receivable', due=delivered?a.paymentDay:a.deliveryDay;
 if(!['receivable','fulfilling'].includes(a.status)||!Number.isSafeInteger(due))return null;
 if(s.day===due)return delivered?suggested('今天到收款日，这单还有 '+money(a.balanceDue)+' 尾款待收。','[data-action="COLLECT_ACCOUNT_V1"]','核对尾款'):
  suggested('这批货今天到交货日。门店签收以后，就剩尾款了。','[data-action="DELIVER_ACCOUNT_V1"]','查看交货安排');
 return {text:delivered?'货已交了，第 '+due+' 天收尾款。':'第 '+due+' 天交货，现在还不用确认。'};
}
export function orderFooterAdvice(s,adviserId){
 const person=ADVISERS.find(p=>p.id===adviserId);
 if(!person)return '';
 let text;
 if(s.phase==='account'&&s.account){
  const a=s.account;
  if(a.status==='fulfilling')text=s.day===a.deliveryDay?'确认门店签收后，就可以等尾款了。':'还没到交货日，这单暂时不用处理。';
  if(a.status==='receivable')text=s.day===a.paymentDay?'这次只收尾款，签约时的定金已经到账。':'货已经送到了，尾款会在约定的收款日到期。';
  if(a.status==='paid'&&!a.expansion)text='另外三家店的订单不用现在接，明天再决定也行。';
 }else if((s.contracts||[]).some(o=>o.status==='fulfilling'))text='还有货待交，订单上能看到哪一笔先到期。';
 else if(['review','complete'].includes(s.phase))text='要对账的话，从「最近回款」能查到每笔实收。';
 if(!text)return '';
 return `<aside class="ws-order-tip" aria-label="${escape(person.name)}"><i class="adviser-face adviser-${person.id}" aria-hidden="true"></i><p>${escape(openingDialogueQuote(text))}</p></aside>`;
}
function warehouseNote(s){
 const w=warehouseSummary(s);
 if(!w.valid)return {text:'这次没读到仓位，这张表暂时不能用来备货。'};
 if(w.inTransitBoxes)return suggested('还有 '+w.inTransitBoxes+' 箱在路上，最早第 '+w.nextArrivalDay+' 天到，这批到仓后才能算现货。','[data-wh-rack] > summary','查看仓位');
 if(w.onHandBoxes)return suggested('已入仓 '+w.onHandBoxes+' 箱，是几款商品合在一起的数量。每款的余量都在仓位里。','[data-wh-rack] > summary','查看仓位');
 if(warehouseAvailable(s))return suggested('仓库还空着。想提前备货的话，备货页能看到会占多少周转金。','[data-wh-order] > summary','看看备货条件');
 return {text:'仓库还空着，手头订单结清后就能考虑提前备货了。'};
}
function developmentNote(s){
 const promo=previewPromotion(s,'district');
 if(promo.valid)return suggested('想找新客户的话，版位和费用可以先比一比，查看不花钱。','[data-hub-promotion] > summary','比较推广版位');
 return suggested('除了推广，也可以留意合作客户的引荐，看看买手最近在找什么。','.ws-leads > summary','查看客户机会');
}
function currentNote(state, context, person) {
  // An open inquiry can belong to another buyer while the journal is waiting
  // for shipment or payment. Never infer this screen's outcome from that phase.
  if(context.view==='inquiry')return context.quote?quoteNote(context.quote,state,context.place==='采购台'?'.market-quote':'.business'):null;
  if(context.place==='发展')return developmentNote(state);
  if(context.place==='自有仓库')return warehouseNote(state);
  if(context.place==='订单列表') {
    if(context.orderList==='market')return suggested('手头这笔订单可以打开核对交期和款项。','[data-workspace-current-market-order]','找到订单详情');
    if(context.orderList==='opening')return suggested('交货和回款各是哪一天，这里都有记录。','[data-workspace-order-detail]','查看交货安排');
    return suggested('想接下一单？可以去看看还有哪些商品和项目。','[data-workspace-products]','去商品与项目');
  }
  if(context.place==='业务'&&state.phase==='account'&&state.account){const note=accountNote(state,context.accountOption);if(note)return note;}

  if(context.place==='办公室'){const actionable=workspaceNote(state,person);if(actionable)return actionable;}
  if (context.place === '下班'||context.place === '住处') {
    const home=context.place==='住处',q=previewWorkspaceSleep(state);
    if(!q.valid)return null; // The sleep panel already supplies the blocking reason and any action.
    const text=q.pending.length?'有询盘今天截止。「睡到明天」里会列出这些来信。':'如果今天做完了，「睡到明天」里可以看到今天的工作室开支。';
    return suggested(text,home?'[data-home-sleep]':'[data-workspace-sleep]','看看睡前安排');
  }
  if (context.place === '生活') return {text:'先看看价，买不买由你。'};
  if (context.place === '工作室布置') return {text:'先比较两种布置。没点购买，不会扣钱。'};
  if (context.place === '展览') return {text:'想换个摆法，先挑要摆出来的样品。'};
  if (context.place === '侧间') return {text:'侧间里的东西都还在，想换个摆法也行。'};
  if (context.place === '收工') return {text:'收到的货款都记到账本上了。'};
  if (state.phase === 'market') {
    const {status, active} = state.market;
    if (status === 'draft') {
      if (context.quote) return quoteNote(context.quote, state, '.market-quote');
      return inboxNote(state,true) || suggested('报价前可以把货源和交期一起比，看看哪种跟买方要的更合适。', '#market-search', '去采购台找货');
    }
    if (!active) return {text:'手头的合同还可以在采购台核对。'};
    const due=marketCalendarDue(state);
    if(due&&!due.equipment){
      if(state.day<due.day)return {text:'第 '+due.day+' 天'+(due.delivery?'交货':'收尾款')+'，现在不用处理。'};
      return suggested(due.delivery?'这笔货可以交付了。':'这笔尾款已到期。',due.delivery?'[data-market-action="DELIVER_MARKET_V2"]':'[data-market-action="COLLECT_MARKET_V2"]',due.delivery?'查看交货安排':'查看应收尾款');
    }
    if(carafeTransport(state))return suggested('联仓的车已配好。包车会早两天交货和收款，但比照原安排多花 ¥36；两边的日期可以一起比。','.ws-carafe .ws-ship-choice','比较两种运输安排');
    if(active.carafeCharter&&status==='transit')return suggested('包车已订，第 '+active.deliveryDay+' 天交货，新的验收安排也已记在订单里。','.ws-carafe [data-market-action="DELIVER_MARKET"]','查看新交货安排');
    if(status==='legacy-preparing')return suggested('客户定金已收。到第 '+active.shipDay+' 天再付工厂尾款和运费。','.market-active','看出运安排');
    if(status==='legacy-transit')return suggested('第 '+active.deliveryDay+' 天交接，届时还有验收费；验完会收到中间一笔款。','.market-active','看验收安排');
    if(status==='legacy-receivable')return suggested('中间一笔已到账。尾款 '+money(active.balanceDue)+'，等第 '+active.paymentDay+' 天收。','.market-active','看尾款');
    if (status === 'preparing') return suggested(`货已订好。第 ${active.shipDay} 天整批出运，出运清单已经列好了。`, '.market-active', '查看出运安排');
    if (status === 'transit') return suggested(`这批${active.productName}约在第 ${active.deliveryDay} 天交付，验收要用的清单在合同里。`, '.market-active', '查看交货安排');
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
  if (state.phase === 'fulfilling') return suggested('这单签了。交货日和收款日都在订单上。', '.business','查看合同');
  if (state.phase === 'paid') return suggested('这笔货款收齐了，交货日期和净利都记在收据上了。', '.receipt','看收款记录');
  if (state.phase === 'portfolio') {
    const overdue = state.contracts.filter(c => c.status === 'receivable').sort((a,b) => a.paymentDay-b.paymentDay)[0];
    if (overdue) return suggested(`还有一笔 ${money(overdue.balanceDue)} 尾款，约在第 ${overdue.paymentDay} 天收。`, '.business','查看应收安排');
    return suggested('想接返单的话，这里能看到哪些客户有补货需求。', '.business','查看客户需求');
  }
  if (['review','complete'].includes(state.phase) && context.place === '工作室') return inboxNote(state,false) || suggested('手里这轮合同已经结清。可以看看采购台的新货，再决定接哪单。', '[data-action="OPEN_MARKET"]', '去找下一单');
  return suggested('要对数量或收款日，打开手头这张单。', '.business h2', '看看手头的单子');
}

function equipmentCosts(q) {
  if (q?.kind !== 'equipment') return '';
  const rows = [['合同货款',q.revenue],['采购货款',q.goodsCost],['运费',q.freight],['验收费用',q.acceptanceFee],['日常开支',q.operatingCost]];
  rows.push([q.shipping === 'locked' ? '锁舱预计净利' : '顺利时预计净利',q.netProfit,true]);
  if (q.shipping === 'standard') rows.push(['换船场站费',q.stationFee],['换船风险下预计净利',q.riskNetProfit,true],['如选改订，另付',q.rebookFee]);
  return '<details class="adviser-costs"><summary>这份设备报价怎么算</summary><dl>' + rows.map(([label,n,net]) => `<div><dt>${label}</dt><dd>${net?netProfitAmount(n):money(n)}</dd></div>`).join('') + '</dl></details>';
}

export function adviserPickerOpen(state,ui){
  return ui.choosing ?? (!ui.choice && !state.history.length);
}

export function adviserView(state, context, ui) {
  const person = ADVISERS.find(p => p.id === ui.choice);
  const pick = adviserPickerOpen(state,ui);
  const band = person ? '换助理' : '选助理';
  const controls = pick ? `<div class="adviser-options" role="group" aria-labelledby="adviser-choice-title"><h2 id="adviser-choice-title" class="adviser-choice-title">${person?'更换助理':'选择助理'}</h2>${ADVISERS.map(p => `<button type="button" data-adviser-choice="${p.id}" aria-pressed="${ui.choice === p.id}"><i class="adviser-face adviser-${p.id}" aria-hidden="true"></i>${p.name}</button>`).join('')}</div>
    <div class="adviser-defer"><button type="button" data-adviser-choice="solo">稍后再选</button></div>` : '';
  if (!person) return `<aside class="adviser-panel" aria-label="工作室助理"><button class="quiet" type="button" data-adviser-picker aria-expanded="${pick}">${band}</button>${controls}</aside>`;
  const minimal=context.identityOnly||context.place==='订单列表'||(context.orderFocus&&state.phase==='account'&&state.account?.status!=='draft');
  const note = pick||minimal?{}:currentNote(state, context, person)??{};
  const action=note.tab?`<button type="button" class="quiet" data-adviser-tab="${note.tab}"${note.ref==='promotion'?' data-adviser-ref="promotion"':''}>${note.label} →</button>`:note.target?`<button type="button" class="quiet" data-adviser-focus="${escape(note.target)}">${note.label} →</button>`:'';
  const message=!pick&&!context.compact&&!minimal&&note.text;
  const tip=message?`<div class="adviser-message"><i class="adviser-face adviser-${person.id}" aria-hidden="true"></i><div><p>${escape(openingDialogueQuote(note.text))}</p>${action}</div></div>`:action;
  return `<aside class="adviser-panel" aria-label="工作室助理"><div class="adviser-byline"><i class="adviser-face adviser-${person.id}" aria-hidden="true"></i><strong>${person.name}</strong><button type="button" class="quiet" data-adviser-picker aria-expanded="${pick}">${band}</button></div>${controls}${tip}${pick?'':equipmentCosts(context.quote)}</aside>`;
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
