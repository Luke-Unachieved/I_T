import {netProfitAmount} from './deal-room-net-profit.js';
import {openingDialogueQuote} from './deal-room-opening-dialogue.js';
import {openingContractMilestone} from './deal-room-opening-calendar.js?v=36';
import {repeatContractMilestone} from './deal-room-repeat-calendar.js';
import {openingMarketOrders,openingMarketProjection} from './deal-room-opening-market.js?v=36';
import {openFirstBuyers,familiarBuyers,openingQuoteProjection,familiarQuoteProjection,quoteOptions,previewOffer,reduceLiveDealRoom,CURATION_PRODUCTS} from './deal-room-engine.js?v=36';
import {SAMPLE_FACTORIES} from './deal-room-development.js?v=36';
import {marketCalendarDue} from './deal-room-market-calendar.js';
import {coreCalendarMilestone} from './deal-room-core-calendar.js?v=36';
import {specialtyMilestone} from './deal-room-specialty-calendar.js?v=36';
import {roundReceivableSummary} from './deal-room-round-receivables.js';
import {legacyEquipmentCalendarAction,legacyEquipmentCashSchedule} from './deal-room-equipment-legacy.js?v=36';
import {carafeTransport} from './deal-room-market-carafe-transport.js';
import {prospectDisplayText} from './deal-room-prospect-locale.js';
import {DEAL_SAVE_KEY} from './deal-room-save.js?v=36';
import {marketBook,marketAvailable,canParkMarketOrder,parkedMarketOrders,previewMarket} from './deal-room-market.js?v=36';
import {neighborhoodRequest} from './deal-room-neighborhood.js';
import {prospectInbox} from './deal-room-prospects.js?v=36';
import {previewPromotion,promotionStatus} from './deal-room-promotion.js?v=36';
import {warehouseAvailable,warehouseSummary} from './deal-room-warehouse.js';
import {previewAccount} from './deal-room-account.js?v=36';
import {advanceEquipmentShipping,equipmentOpportunity} from './deal-room-equipment.js?v=36';
import {WORKSPACE_DAY_COST} from './deal-room-workspace-sleep.js?v=36';

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
  const {quantity,minQuantity,deliveryDay,deadlineDay,cashRequired,netProfit}=quote;
  const desk=target==='.market-quote',source=desk?'quote-source':target,facts=desk?'quote-costs':target;
  if(Number.isSafeInteger(quantity)&&Number.isSafeInteger(minQuantity)&&quantity<minQuantity)
    return suggested(`这单只要 ${quantity}，这家至少做 ${minQuantity}。先换个起订量合适的货源。`,source,'查看货源和数量');
  if(Number.isSafeInteger(deliveryDay)&&Number.isSafeInteger(deadlineDay)&&deliveryDay>deadlineDay)
    return suggested(`这家第 ${deliveryDay} 天才能交货，客户最晚第 ${deadlineDay} 天要货。先换货源，不急着签。`,source,'查看货源和交期');
  if(Number.isSafeInteger(cashRequired)&&cashRequired>state.cash)
    return suggested(`签这单还差 ${money(cashRequired-state.cash)}。先换成垫款少的方案；不够就先不签。`,facts,'核对报价');
  // Numbered buyers already have their own advice beside the actual refusal.
  if(quote.accepted===false&&quote.kind==='prospect'&&/未接受|没有接受/.test(quote.reason??''))return null;
  if(quote.accepted===false&&/价格|单价/.test(quote.reason??''))
    return suggested('对方没接受这口价。想继续谈，就调低单价再发一次，先别签。',desk?'quote-price':target,'查看报价');
  if(Number.isSafeInteger(netProfit)&&netProfit<0)
    return suggested(`按现在的条件，这单要亏 ${money(-netProfit)}。可以先换方案，不必急着签。`,facts,'核对成本');
  if(quote.kind==='equipment'&&quote.shipping==='standard'&&Number.isSafeInteger(quote.stationFee)&&quote.stationFee>0)
    return suggested(`要比普通舱和锁舱，记得把换船时可能多付的 ${money(quote.stationFee)} 场站费算进去。`,'equipment-route','查看设备条款');
  return null;
}
function inboxNote(state, atDesk) {
  const project = equipmentOpportunity(state);
  const request = neighborhoodRequest(marketBook(state).receipts);
  const openDesk = '[data-action="OPEN_MARKET"]';
  if(project)return suggested(`「商品与项目」里有${project.buyer}的${project.name}询价。想做这单，先比较普通舱和锁舱要付的钱。`,atDesk?'[data-equipment-open]':openDesk,'查看设备来信');
  if (request) {
    if (!state.neighborhoodRegistered) return suggested('四邻百货在找门店供货方。林妍的联采登记在「商品与项目」里。', atDesk ? '[data-market-action="REGISTER_NEIGHBORHOOD"]' : openDesk, '查看联采登记');
    return suggested(`林妍这次问的是 ${request.stores} 家店。到「商品与项目」打开联采清单，再按总量挑货源。`,atDesk?'[data-neighborhood-product]':openDesk,'查看联采清单');
  }
  return null;
}

const openingNames={mira:'米拉',samir:'萨米尔',ines:'伊内斯'};
function assortment(o){
 return o?.productName||o?.product||o?.productNames?.join('、')||o?.products?.map(id=>id==='mira'&&o.lampVersion==='developed'?'三档调光台灯':CURATION_PRODUCTS.find(p=>p.id===id)?.name).filter(Boolean).join('、');
}
function specialtyIdentity(s,m){
 if(m.task==='first-sample-collect'||m.task==='second-sample'){
  const d=m.task==='first-sample-collect'?s.productDevelopment:s.secondSupplier,f=SAMPLE_FACTORIES[d?.factory];
  if(f)return {buyer:f.name,product:f.title+'样品'};
 }
 if(m.task==='linen-freight-receive')return {buyer:'里斯本展陈方',product:'棉麻桌布'};
 if(m.task==='shop-trial-settle')return {buyer:'街角小店',product:'三档调光台灯'};
 if(m.task.startsWith('atelier-restock-'))return {buyer:'Atelier',product:assortment(s.atelierRestock)};
 return {};
}
function adviserMilestones(s){
 const clients=Object.keys(openingNames);
 const known=clients.flatMap(id=>[openingContractMilestone(s,id),repeatContractMilestone(s,id)]).filter(Boolean);
 const round=roundReceivableSummary(s);
 if(round.active&&['fulfilling','portfolio','negotiating'].includes(s.phase)){
  for(const c of round.rows.filter(c=>['fulfilling','receivable'].includes(c.status))){
   const delivery=c.status==='fulfilling';known.push({day:delivery?c.deliveryDay:c.paymentDay,delivery,sameDay:delivery&&c.deliveryDay===c.paymentDay,clientId:c.clientId,
    queue:true,contract:s.contracts.find(r=>r.roundReceivable&&r.businessRound===s.businessRound&&r.clientId===c.clientId)});
  }
 }
 const seen=new Set();
 const story=known.filter(d=>d.contract&&!seen.has(d.contract)&&seen.add(d.contract))
  .map(d=>({...d,buyer:openingNames[d.clientId],product:assortment(d.contract)}));
 const active=s.phase==='market'?s.market?.active:null;
 const market=[active,...parkedMarketOrders(s),...openingMarketOrders(s)].filter(Boolean).map(o=>{
  const d=marketCalendarDue({phase:'market',market:{status:o.status,active:o}});
  return d&&{...d,sameDay:d.delivery&&o.deliveryDay===o.paymentDay,contract:o,buyer:prospectDisplayText(o.buyer),product:assortment(o),
   strict:d.legacy||d.equipment&&d.stage==='ship',blocked:d.day===s.day&&(d.legacy?!legacyEquipmentCalendarAction(s):d.equipment&&d.stage==='ship'&&advanceEquipmentShipping(s,WORKSPACE_DAY_COST,true)===s)};
 });
 const account=s.phase==='account'&&s.account;
 const delivery=account?.status==='fulfilling';
 const dated=account&&['fulfilling','receivable'].includes(account.status)
  ?{delivery,day:delivery?account.deliveryDay:account.paymentDay,contract:account,buyer:account.buyer,product:assortment(account),strict:true}:null;
 const core=coreCalendarMilestone(s),specialty=specialtyMilestone(s);
 const holder=core?.stage|| (s.phase==='planning-fulfillment'?s.supplyPlan:null);
 const nextSupply=s.phase==='planning-fulfillment'?s.supplyPlan?.events?.[s.supplyPlan.eventIndex]:null;
 const task=core?{...core,buyer:holder?.buyer||holder?.clientName,product:assortment(holder),strict:true,blocked:Number.isSafeInteger(nextSupply?.cost)&&nextSupply.cost>s.cash}:
  specialty?.required?{...specialty,...specialtyIdentity(s,specialty),strict:true}:null;
 return [...story,...market,dated,task].filter(d=>Number.isSafeInteger(d?.day)&&d.day>0)
  .sort((a,b)=>a.day-b.day||(a.queue&&b.queue?Number(a.delivery)-Number(b.delivery):0));
}
export const adviserNextMilestone=s=>adviserMilestones(s)[0]||null;
const actionableToday=(s,rows=adviserMilestones(s))=>rows.filter(d=>!d.blocked&&(d.strict?d.day===s.day:d.day<=s.day));
function milestoneAction(d){
 if(d.label)return d.label;
 if(d.legacy)return d.stage==='ship'?'安排装船':d.delivery?'验收并收验收款':'收尾款';
 if(d.equipment)return d.stage==='ship'?'确认装船':d.delivery?'按清单整单验收':'收齐尾款';
 return d.sameDay?'确认交货并收款':d.delivery?'确认交货':d.contract?.deposit>0?'收取尾款':'收取货款';
}
function milestoneSubject(d){
 const buyer=prospectDisplayText(d.buyer||'');
 return buyer&&d.product?buyer+'的'+d.product:buyer?buyer+'这单':d.product||'';
}
function todayLine(rows,day,{inOrders=false}={}){
 if(!rows.length)return '';
 const summary=rows.map(d=>{
  const subject=milestoneSubject(d)||'这项',when=d.day===day?'今天':'已经到期，今天';
  if(d.stage==='ship')return subject+when+'要装船';
  if(d.legacy&&d.delivery)return subject+when+'能验收，办完就能收验收款';
  if(d.equipment&&d.delivery)return subject+when+'能按清单验收';
  if(d.sameDay||d.label==='确认交货并收款')return subject+when+'交货时就能收钱';
  if(d.delivery||d.label==='确认交货')return subject+when+'能交货';
  const label=milestoneAction(d);
  if(/^(收取|收齐|收)(尾款|货款)$/.test(label)){
   const cash=d.contract?.balanceDue,word=label.endsWith('尾款')?'尾款':'货款';
   return subject+'的'+word+when+'能收'+(Number.isSafeInteger(cash)&&cash>0?' '+money(cash):'');
  }
  return subject+when+'可以'+label;
 }).join('；');
 return summary+'。'+(inOrders?'打开对应的订单就能办。':'到「订单」打开对应的单子。');
}
function milestoneLine(d,day){
 const subject=milestoneSubject(d);
 if(d.day>day)return (subject?subject+'，':'')+'第 '+d.day+' 天再到「订单」'+milestoneAction(d)+'。';
 return todayLine([d],day);
}
function ordinaryInquiryDesk(s){
 const side=openingMarketProjection(s,0);
 if(side)return side;
 if(s.phase==='market'&&s.market.status==='draft')return s;
 const action=s.phase==='market'&&(s.market.status==='paid'||canParkMarketOrder(s))
  ?{type:'SWITCH_MARKET_ORDER_V1',orderId:0}:marketAvailable(s)?{type:'OPEN_MARKET'}:null;
 // Apply the exact navigation to a local projection, never to the actual save.
 const p=action&&reduceLiveDealRoom(s,action);
 return p?.phase==='market'&&p.market?.status==='draft'?p:null;
}
function inquiryFunding(s,row,desk){
 if(!row.person){
  const p=openingQuoteProjection(s,row.id)||familiarQuoteProjection(s,row.id,3);
  const quotes=p?quoteOptions(p,p.openingQuoteV2===true).map(o=>previewOffer(p,o.id)):[];
  return summarizeFunding(quotes,s.cash,q=>q.reason==='现金不足以覆盖这单和回款前的日常费用。');
 }
 const quotes=[];
 if(desk)for(const o of row.options??[]){
  // At the buyer's allowed ceiling, a deposit (if any) gives the lowest
  // possible upfront need. Never expose this ceiling or assume this is the price the player sent.
  if(!Number.isSafeInteger(o.maxUnitPrice))continue;
  for(const source of ['stock','factory','warehouse']){
   quotes.push(previewMarket(desk,{customerId:row.person.id,optionId:o.id,source,unitPrice:o.maxUnitPrice,
    ...(o.id==='vip-volume'?{previousPaidDay:row.previous?.paidDay}:{})},{cadence:true}));
  }
 }
 return summarizeFunding(quotes,s.cash,q=>q.accepted===true);
}
function summarizeFunding(quotes,cash,onlyCash){
 const flexible=quotes.filter(q=>q.accepted!==false);
 if(flexible.some(q=>q.valid))return {affordable:true};
 const amounts=flexible.filter(q=>onlyCash(q)&&Number.isSafeInteger(q.cashRequired)&&q.cashRequired>cash).map(q=>q.cashRequired);
 return {required:amounts.length?Math.min(...amounts):null};
}
function inquiryNote(s,rows,reads,dates,desk){
 let funded=false,required=Infinity;
 for(const row of [...rows].sort((a,b)=>(a.replyBy??Infinity)-(b.replyBy??Infinity))){
  const q=inquiryFunding(s,row,desk);
  if(q.affordable){
   if(!reads?.has(s,row))return {letter:row};
   funded=true;
  }else if(q.required!==null)required=Math.min(required,q.required);
 }
 // A read letter stays selectable; the assistant need not send the player
 // back to a letter they already reviewed, whether or not they can afford it.
 if(funded||!Number.isSafeInteger(required))return {};
 const receipt=dates.filter(d=>Number.isSafeInteger(d.contract?.paymentDay)&&d.contract.paymentDay>s.day)
  .sort((a,b)=>a.contract.paymentDay-b.contract.paymentDay)[0];
 const who=receipt&&prospectDisplayText(receipt.buyer||'').split(' · ')[0];
 const wait=receipt?(who?who+'那笔':'手上的一笔订单')+`约在第 ${receipt.contract.paymentDay} 天回款，到账后再算。`:'先不签新单。';
 return {text:`手头有 ${money(s.cash)}，这些询盘最省的方案也要留 ${money(required)} 周转，还差 ${money(required-s.cash)}。`+wait};
}
const buyerName=row=>row?.person?.displayName||openingNames[row?.id]||row?.name?.split(' · ')[0]||'';
const productName=row=>typeof row?.product==='string'?row.product:row?.product?.name;
function letterLine(row,day,place='询盘'){
 const who=buyerName(row),what=productName(row),open=place==='询盘'?'打开':'到「询盘」打开';
 if(!who)return '';
 if(Number.isSafeInteger(row.replyBy))return `${who}的询盘${row.replyBy===day?'今天':'第 '+row.replyBy+' 天'}截止，${open}这封${what?'，先看'+what+'要哪天到':''}。`;
 return `${open}${who}的来信${what?'，先看'+what+'要多少、哪天交货':'，先看数量和交货日'}。`;
}
function workspaceNote(s,person,reads){
 const nav=(text,label,tab,ref)=>({text,label,tab,ref});
 const dates=adviserMilestones(s),today=actionableToday(s,dates),waiting=dates.find(d=>d.day>s.day);
 if(today.length)return {text:todayLine(today,s.day)};
 const opening=openFirstBuyers(s),familiar=familiarBuyers(s),desk=ordinaryInquiryDesk(s);
 const {letter,text:cash}=inquiryNote(s,[...opening,...familiar,...prospectInbox(desk)],reads,dates,desk);
 if(cash)return {text:cash};
 if(letter){
  const who=buyerName(letter),text=who&&opening.length&&!s.contracts?.length
   ?`到「询盘」打开${who}的来信。${person.first}`:letterLine(letter,s.day,'办公室');
  if(text)return nav(text,'去收件箱','inbox');
 }
 if(s.phase==='paid'&&s.openingParallel&&s.contracts.filter(c=>openingNames[c.clientId]&&!c.businessRound&&!c.projectId&&c.status==='paid').length===3)
  return {text:'三位客户的首单都收齐了。到「订单」点「回工作室，看看新机会」。'};
 if(waiting)return {text:milestoneLine(waiting,s.day)};
 return null; // no generic rest instruction or assistant end-day button
}
export function adviserInboxAdvice(s,rows,reads){
 const dates=adviserMilestones(s),today=actionableToday(s,dates),waiting=dates.find(d=>d.day>s.day);
 if(today.length)return todayLine(today,s.day);
 const {letter,text:cash}=inquiryNote(s,rows,reads,dates,rows.some(row=>row.person)?ordinaryInquiryDesk(s):null);
 return cash||(letter?letterLine(letter,s.day):waiting?milestoneLine(waiting,s.day):'');
}
export function adviserWorkspaceAdvice(s,ui={}){
 const person=ADVISERS.find(x=>x.id===ui.choice), note=person?workspaceNote(s,person,ui.inquiryReads):null;
 return note?[{title:note.label,tab:note.tab,text:note.text,ref:note.ref}]:[];
}
function accountNote(s,option){
 const a=s.account;
 if(a.status!=='draft')return null;
 const q=previewAccount(s,a.expansion?'remaining':option||'pilot');
 return q&&!q.valid&&q.requiredCash>s.cash?suggested(`签这批还差 ${money(q.requiredCash-s.cash)}。其他门店没收齐的钱不要算进来。`,'.account-order-section .offer','核对款项'):null;
}
export function orderFooterAdvice(s,adviserId){
 const person=ADVISERS.find(p=>p.id===adviserId);
 const text=person&&todayLine(actionableToday(s),s.day,{inOrders:true});
 if(!text)return '';
 return `<aside class="ws-order-tip" aria-label="${escape(person.name)}"><i class="adviser-face adviser-${person.id}" aria-hidden="true"></i><p>${escape(openingDialogueQuote(text))}</p></aside>`;
}
function warehouseNote(s){
 const w=warehouseSummary(s);
 if(!w.valid)return null;
 if(w.inTransitBoxes&&Number.isSafeInteger(w.nextArrivalDay))return {text:`最早第 ${w.nextArrivalDay} 天才有一批到仓。现在要用库存发货，只能选已经入仓的货。`};
 if(w.onHandBoxes&&warehouseAvailable(s))return {text:'要用现货发单，在报价的货源里选「自有仓库」。下单前先对一下同款还有多少件。'};
 return null;
}
function developmentNote(s){
 const pending=promotionStatus(s)?.pending;
 if(pending)return {text:`这次推广已经付了 ${money(pending.fee)}。第 ${pending.replyDay} 天到「询盘」看看有没有买家来问。`};
 const promo=previewPromotion(s,'district');
 if(promo.valid)return suggested(`${promo.name}要付 ${money(promo.quotedFee)}。如果今天投，第 ${promo.replyDay} 天到「询盘」看看有没有感兴趣的买家来信。`,'[data-hub-promotion] > summary','比较推广版位');
 return null;
}
function marketOrderNote(state){
 const active=state.market?.active,due=marketCalendarDue(state);
 if(!due||!active||carafeTransport(state))return null;
 const decision=due.delivery&&active.transfer&&!active.rebooked&&!active.rebookPaid&&state.day===active.shipDay;
 if(decision)return null; // the route panel already has its own advice
 const label=milestoneAction({...due,contract:active,sameDay:due.delivery&&active.deliveryDay===active.paymentDay});
 if(state.day<due.day)return {text:`第 ${due.day} 天再回这笔订单，点「${label}」。`};
 if(due.legacy&&!legacyEquipmentCalendarAction(state)){
  const payable=legacyEquipmentCashSchedule(state).find(row=>row.day===state.day)?.expense;
  const what=due.stage==='ship'?'工厂余款和运费':'验收费用';
  return Number.isSafeInteger(payable)&&payable>state.cash?{text:`这一步要先付${what} ${money(payable)}，手头还差 ${money(payable-state.cash)}。买方的验收款要验完才会到账。`}:null;
 }
 if(due.equipment&&!due.legacy&&due.stage==='ship'){
  if(state.day!==due.day)return null;
  if(advanceEquipmentShipping(state,WORKSPACE_DAY_COST,true)===state)return active.stationFee>state.cash?{text:`装船要先付 ${money(active.stationFee)} 场站费，手头还差 ${money(active.stationFee-state.cash)}，现在不能装船。`}:null;
 }
 const amount=!due.delivery&&due.stage!=='ship'&&Number.isSafeInteger(active.balanceDue)&&active.balanceDue>0?'，这次应收 '+money(active.balanceDue):'';
 return {text:`这笔已到${due.stage==='ship'?'装船':due.delivery?'交货':'收款'}日，点「${label}」${amount}。`};
}
function currentNote(state,context,person){
  // The mail being read can differ from the contract that is currently in the journal.
  if(context.view==='inquiry')return context.quote?quoteNote(context.quote,state,context.place==='采购台'?'.market-quote':'.business'):null;
  if(context.place==='发展')return developmentNote(state);
  if(context.place==='自有仓库')return warehouseNote(state);
  if(context.place==='办公室')return workspaceNote(state,person,context.inquiryReads);
  if(context.place==='采购台'&&state.phase==='market'){
    if(state.market.status==='draft')return context.quote?quoteNote(context.quote,state,'.market-quote'):inboxNote(state,true);
    return marketOrderNote(state);
  }
  if(context.place==='业务'&&state.phase==='account'&&state.account)return accountNote(state,context.accountOption);
  if(context.place==='业务'||context.place==='展陈配送'){
   const specialty=specialtyMilestone(state),due=coreCalendarMilestone(state)||specialty?.required&&specialty;
   const e=state.phase==='planning-fulfillment'?state.supplyPlan?.events?.[state.supplyPlan.eventIndex]:null;
   if(due&&state.day===due.day&&Number.isSafeInteger(e?.cost)&&e.cost>state.cash)
    return {text:`下一批开工要先付 ${money(e.cost)}，手头还差 ${money(e.cost-state.cash)}。`};
   return due?{text:state.day<due.day?`第 ${due.day} 天再回来${due.label}。`:state.day===due.day?`今天在这页${due.label}。`:''}:null;
  }
  if(['review','complete'].includes(state.phase)&&context.place==='工作室')return inboxNote(state,false);
  return null;
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
  root.querySelector('[data-adviser-tab]')?.addEventListener('click',event=>{const k=event.currentTarget.dataset.adviserTab;if(['inbox','orders','development'].includes(k)){const ref=event.currentTarget.dataset.adviserRef;ref==='promotion'?navigate?.(k,ref):navigate?.(k);}});
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
