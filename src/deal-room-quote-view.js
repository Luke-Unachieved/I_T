import {cupPaperProofArt,selectedSample} from './deal-room-samples.js';
import {previewOffer} from './deal-room-engine.js';
import {comparePriorUnitPrice} from './deal-room-goods-prices.js';
import {inquiryOpening,inquirySpeech,inquiryOption,inquiryActions,inquiryDetails,inquiryFacts} from './deal-room-inquiry-layout.js';
import {roundQuoteNote} from './deal-room-round-view.js';
// Presentation only. PROPOSE remains the canonical historical signing action.
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = value => typeof value === 'number' && Number.isFinite(value) ? `¥${value.toLocaleString('zh-CN')}` : '待确认';
function shelfProofView(o){
 if(!['cup-front-proof','cup-back-proof'].includes(o?.id))return '';
 const back=o.id==='cup-back-proof',label=back?'保留正面纹样、背面中间另贴标签':'正面留白，标签平印在面内';
 return `<details class="shelf-proof" open><summary>核对这次的包装校样</summary>${cupPaperProofArt(back?'back':'front',label+'；折线不穿过标签')}<p>${back?'正面保留原图案。另印一张背贴，多一道贴标工序。':'正面让出一块空白，标签与纸套一次印成，不加背贴。'}</p></details>`;
}

export function quoteOptionExplanation(state, offer) {
  // Do not reveal an as-yet unmet next buyer's opening window to the player.
  if (!state.businessRound && !state.clientProjectActive && state.clientIndex === 0) {
    if (offer.id === 'trial') return 'Mira：先做 60 盏试卖，交货时我付清货款。';
    if (offer.id === 'rollout') return 'Mira：120 盏可以铺进三家店；交货后请给我 4 天账期。';
  }
  return (offer.exchange || '').replace('本次总净赚较少','这单预计赚得较少');
}
const OPENING_DIALOGUE={
  mira:'我把样灯照片发了过去，另外两家店也来问。先供我这家试卖也行。三家一起铺的话，到货后得给我四天结账。',
  samir:'开业那天柜台不能空着。第 7 天前能送来吗？印字要是来不及，先说说现货。',
  ines:'我先给两家店进一批。要是把一季的货都定下来，我能先打定金，尾款得缓几天。'
};
export function openingBuyerLineView(client,quoteState){
  if(!client||!Object.hasOwn(OPENING_DIALOGUE,client.id))return inquirySpeech(client?.brief);
  if(quoteState&&(quoteState.phase!=='negotiating'||quoteState.businessRound||quoteState.clientProjectActive))return inquirySpeech(client.brief);
  const late=client.id==='samir'&&quoteState&&previewOffer(quoteState,'ready').deliveryDay>7;
  const line=late?'开业那一批已经赶不上了，按常规补货谈吧。无印字现货和定制包装，分别要等多久？':OPENING_DIALOGUE[client.id];
  return inquiryOpening(line,{kind:'opening',customerId:client.id,product:client.product});
}
function openingPayment(quote){
  if(quote.paymentDay===quote.deliveryDay)return '交货当天付清';
  return quote.deposit?`先付 ${money(quote.deposit)}，第 ${quote.paymentDay} 天收尾款`:`第 ${quote.paymentDay} 天付清`;
}
export function openingQuoteChoicesView(state,client,options,selected){
  const id=client?.id, samir=id==='samir';
  if(!['mira','samir','ines'].includes(id))return '';
  const variants=samir
    ? [{action:'plain',quote:'ready',label:'无印字现货'},{action:'custom',quote:['promise','branded'].includes(selected)?selected:options.some(o=>o.id==='branded-opening')?'branded-opening':'branded',label:'定制包装'}]
    : options.filter(o=>o.accepted).map(o=>({action:o.id,quote:selected==='all-now'&&o.id==='season'?selected:o.id,label:id==='mira'?(o.id==='trial'?'1 家店试卖':'3 家店铺货'):(o.id==='small'?'两家店试卖':'季度备货')}));
  const cards=variants.map(v=>{
    const q=previewOffer(state,v.quote);
    if(!Number.isSafeInteger(q.quantity))return '';
    const active=samir?selectedSample(selected)===v.action:selected===v.quote;
    const unit=samir?'只':id==='mira'?'盏':'条';
    const m=[['订购量',q.quantity+' '+unit],['交货日期','第 '+q.deliveryDay+' 天'],
       ['付款',q.accepted===false?(q.id==='all-now'?'拟全款预付':'待确认'):openingPayment(q)],
       q.accepted===false?['状态','待客户确认']:[q.netProfit<0?'预计亏损':'预计净利',money(Math.abs(q.netProfit))]];
    return inquiryOption(v.label,m,{hook:samir?'data-sample':'data-select',value:v.action,active});
  }).join('');
  return '<fieldset class="inquiry-choices"><legend>这批货怎么谈？</legend>'+cards+'</fieldset>';
}
function openingContractActions(offer, action){
  return inquiryActions({backHook:'data-workspace-open="inbox"',backLabel:'先不接',signHook:offer.accepted!==false?'data-action':'',signValue:action,canSign:offer.accepted!==false&&offer.valid});
}
function openingCommitment(offer,{action,quantityLabel,counterMessage}){
  const accepted=offer.accepted!==false,advance=Math.max(0,offer.cost-(offer.deposit||0));
  const note=counterMessage&&counterMessage!=='条件尚未谈妥，这一步不花钱。'?counterMessage:'';
  const facts=[['订购量',quantityLabel||offer.quantity+' 件'],['总货款',money(offer.revenue)],
   ['备货及交付成本',money(offer.cost)],['定金',offer.deposit>0?money(offer.deposit):''],
   ['你先垫付',offer.deposit>0?money(advance):''],['回款前日常开支',money(offer.operatingCost)],
   [offer.cashAfterSigning<0?'资金缺口':'签约后可用资金',money(Math.abs(offer.cashAfterSigning))],
   ['收齐后的可用资金',money(offer.cashAfterPayment)]];
  return '<section class="quote-commitment inquiry-settlement" aria-label="报价与签约">'+
   (!accepted&&!note?'<p class="inquiry-wait">客户确认后才能签约。</p>':'')+
   (note?inquirySpeech(note,{reply:true}):'')+
   (!offer.valid&&offer.reason!==note?'<p class="quote-blocked" role="status">'+escape(offer.reason)+'</p>':'')+
   (!accepted?'<button type="button" class="primary opening-ask" data-action="'+escape(action)+'"'+(offer.valid?'':' disabled')+'>发送报价</button>':'')+
   (accepted?inquiryDetails('收支明细',inquiryFacts(facts)):'')+openingContractActions(offer,action)+'</section>';
}
export function quoteCommitmentView(state, offer, {roundActive=false,counterMessage='',action='PROPOSE',quantityLabel=null,client=null,opening=false,openingDesk=false}={}) {
  if (!offer) return '';
  if(openingDesk)return openingCommitment(offer,{action,quantityLabel,counterMessage});
  const signed = offer.accepted !== false;
  const nextStep = roundActive&&action==='PROPOSE' ? (signed&&offer.valid?roundQuoteNote(state,offer,client?.id):'') : offer.opportunityNote;
  const validLot = Number.isSafeInteger(offer.quantity) && offer.quantity > 0;
  const per = n => (n / offer.quantity).toLocaleString('zh-CN',{maximumFractionDigits:2});
  const set = action === 'SIGN_CURATION';
  const unit = client?.id==='mira'?'盏':client?.id==='samir'?'只':client?.id==='ines'?'条':'件';
  const pricing = signed && validLot && [offer.revenue,offer.cost].every(n=>Number.isSafeInteger(n)&&n>=0)
    ? '<p class="quote-action-note">'+(set?'每套':'折合每'+unit)+'：货款 ¥'+per(offer.revenue)+'，备货及交货成本 ¥'+per(offer.cost)+'。按整单结算。</p>' : '';
  const deposit = offer.deposit || 0;
  const advance = Math.max(0, offer.cost - deposit);
  const twoReceipts = roundActive && offer.valid && Number.isSafeInteger(offer.paymentDay) && Number.isSafeInteger(offer.projectedSettlementDay) && offer.projectedSettlementDay > offer.paymentDay && Number.isSafeInteger(offer.cashAtOwnPayment);
  const expectedBalances = twoReceipts ? `<div class="quote-dated-balances" aria-label="预计可用资金" style="display:grid;gap:.35rem"><div><small>第 ${offer.paymentDay} 天 · 本单收齐</small><strong>${money(offer.cashAtOwnPayment)}</strong></div><div><small>第 ${offer.projectedSettlementDay} 天 · 两单收齐</small><strong>${money(offer.cashAfterPayment)}</strong></div></div>` : '';
  const counter = counterMessage ? `<p class="counter" role="alert">${escape(counterMessage)}</p>` : '';
  const reason = !offer.valid ? `<p class="quote-blocked" role="status">${escape(offer.reason)}</p>` : '';
  const showQuantity=escape(quantityLabel||`${offer.quantity} 件`);
  const offerFacts=opening?`<dl class="opening-quote-facts${signed?' opening-quote-confirmed':''}">
    <div><dt>数量</dt><dd>${showQuantity}</dd></div>
    ${signed?`<div><dt>交付</dt><dd>第 ${offer.deliveryDay} 天</dd></div><div><dt>付款方式</dt><dd>${escape(openingPayment(offer))}</dd></div>`:
     `<div><dt>交付</dt><dd>${client?.id==='samir'?`预计第 ${offer.deliveryDay} 天，待确认`:'待确认'}</dd></div><div><dt>付款方式</dt><dd>${offer.id==='all-now'?'拟全款预付，待确认':'待确认'}</dd></div>`}
   </dl>`:'';
  if (!signed) return `<section class="quote-commitment" aria-label="待商议的报价">
    ${offerFacts}<div class="quote-price"><span>拟报货款</span><strong>${money(offer.revenue)}</strong>${opening?'':`<small>${showQuantity}</small>`}</div>
    ${opening?'':`<p class="quote-action-note">${escape(offer.id==='promise'&&client?.id==='samir'?'120 只定制，不能作为开业批签约':offer.title)}</p>`}
    <p class="quote-action-note">${opening?'条件尚未谈妥，这一步不花钱。':'付款和交货条件还没谈妥，先听听客户的回复，这一步不花钱。'}</p>
    ${reason}${counter}
    ${openingDesk?openingContractActions(offer,action):`<button class="primary" data-action="${escape(action)}" ${offer.valid?'':'disabled'}>${opening?'询问客户':'问问客户的意思'} <span aria-hidden="true">→</span></button>`}
  </section>`;
  return `<section class="quote-commitment" aria-label="签约与资金明细">
    ${offerFacts}<div class="quote-price"><span>${opening?'合同货款':'这单货款'}</span><strong>${money(offer.revenue)}</strong>${opening?'':`<small>${showQuantity}</small>`}</div>
    ${opening?'':pricing}${action==='PROPOSE'?comparePriorUnitPrice(state,offer,client)+shelfProofView(offer):''}<dl class="quote-now">${deposit>0?`<div><dt>客户先付定金</dt><dd>${money(deposit)}</dd></div>`:''}<div><dt>${opening?'备货及交付成本':'备货和交货'}</dt><dd>${money(offer.cost)}</dd></div>${deposit>0?`<div><dt>你先垫付</dt><dd>${money(advance)}</dd></div>`:''}<div class="quote-cash"><dt>${offer.cashAfterSigning<0?'还差':opening?'签约后可用资金':'签完还剩'}</dt><dd>${money(offer.cashAfterSigning<0?-offer.cashAfterSigning:offer.cashAfterSigning)}</dd></div></dl>
    ${opening?'':`<div class="quote-schedule"><span>第 <b>${offer.deliveryDay}</b> 天交货</span><span>第 <b>${offer.paymentDay}</b> 天收齐货款</span></div>`}
    <p class="quote-profit"><span>${opening?'预计净利':'这单预计赚到'}</span><strong>${money(offer.netProfit)}</strong></p>
    ${(state.businessRound||state.clientProjectActive)&&nextStep?`<p class="opportunity quote-choice" aria-label="接下这单后的安排">${escape(nextStep)}</p>`:''}
    <details class="quote-breakdown"><summary>这单怎么结算</summary>${opening?pricing:''}<p>货款 ${money(offer.revenue)} − 备货交付 ${money(offer.cost)} − ${roundActive?'仅做这单预计花费的':'回款前的'}日常开销 ${money(offer.operatingCost)} = 预计赚到 ${money(offer.netProfit)}</p><p>待收尾款 ${money(offer.balanceDue)}。${offer.valid&&!twoReceipts?(roundActive?'按已签订单的回款日期估算，收齐后':'本单收齐后')+'预计可用现金 '+money(offer.cashAfterPayment)+'。':''}</p>${expectedBalances}</details>
    ${reason}${counter}${signed?'':'<p class="quote-action-note">先听听客户的回复，这一步不花钱。</p>'}
    ${openingDesk?openingContractActions(offer,action):`<button class="primary" data-action="${escape(action)}" ${offer.valid?'':'disabled'}>签下这单 <span aria-hidden="true">→</span></button>`}
  </section>`;
}

export function quoteBuyerBrief(state, client, selected='') {
  if(state.businessRound&&!state.clientProjectActive&&client?.id==='samir'&&['cup-front-proof','cup-back-proof'].includes(selected))return '这批杯要上收银货架。标签不能跨包装折线；可以让出正面图案的位置，也可以另付一道背贴工序。普通补货还是原来的条件。';
  if(['developed-lamp','second-developed-lamp'].includes(selected)) return (selected==='second-developed-lamp'?state.secondSupplier:state.productDevelopment)?.factory==='studio'?'展台白天要亮、晚上要柔和。我想先订一批调光灯试试。':'这批门店统一用暖光灯，我想按整批采购来谈。';
  if (!state.businessRound && !state.clientProjectActive && state.clientIndex === 0 && client?.id === 'mira') return '我想先让一家店试卖。三家店一起铺货也可以，不过要等交货后四天再付清。';
  return client?.brief || '';
}

export function quoteOpeningSelection(state,client,p,options,selected){
 if(client.id==='mira'||client.id==='ines'&&selected==='small')return '';
 return `<div class="sample-proposal opening-selection">
 ${client.id==='samir'?`<p class="opening-selection-note">${selected==='branded-opening'?'定制包装赶得上第 7 天开业。':selected==='branded'?'保留定制包装，改作常规补货。':selected==='promise'?`定制包装第 ${p.deliveryDay} 天到，赶不上第 7 天开业。`:p.deliveryDay<=7?'无印字现货，赶得上开业。':'无印字现货已赶不上开业，改作常规补货。'}</p>${selected==='promise'?`<div class="repair"><button data-repair="plain">${state.day+options[0].deliveryDays<=7?'改现货，赶开业':'改现货补货'}</button><button data-repair="restock">保留定制，改补货</button></div>`:''}`:''}
 ${client.id==='ines'&&selected!=='small'?`<div class="terms" role="group" aria-label="付款条件"><button data-select="season" aria-pressed="${selected==='season'}">先付 30%</button><button data-select="all-now" aria-pressed="${selected==='all-now'}">试谈全款预付</button></div>`:''}
 </div>`;
}
