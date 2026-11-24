import {netProfitAmount} from './deal-room-net-profit.js';
import {openingDialogueQuote} from './deal-room-opening-dialogue.js';
import {cupPaperProofArt,selectedSample} from './deal-room-samples.js';
import {previewOffer} from './deal-room-engine.js?v=36';
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
    if (offer.id === 'trial') return '米拉：先给我这家 60 盏，货到我就付清。';
    if (offer.id === 'rollout') return '米拉：三家一起订 120 盏，不付定金，收货后 '+offer.payLag+' 天一次付清。';
  }
  return (offer.exchange || '').replace('本次总净赚较少','这单预计赚得较少');
}
const OPENING_DIALOGUE={
  mira:'另外两家店看了我发的样灯照片，也想订。先供我这家，60 盏，货到我就付清。三家一起订 120 盏，不付定金，我收货后第四天一次付清。',
  samir:'开业前我得把杯子摆上柜台。带店里纸套的能赶上，我就订 120 只；不做纸套的话，先给我 80 只也行。',
  ines:'两家店先试卖的话，一共 50 条，货到我就付。要是赶得上换季陈列，我可以订 150 条，先付三成，收货后第六天再付剩下的。'
};
function samirReadyInTime(state){
  return previewOffer(state,'ready').deliveryDay<=7;
}
function openingBuyerVoice(client,state){
  if(client.id==='samir'&&state){
    if(!samirReadyInTime(state))return '这批赶不上开业，就按平时补货谈。无印字的和带纸套的，你都给我报个价吧。';
    if(previewOffer(state,'branded-opening').accepted!==true)return '开业先给我 80 只无印字的，货到我就付。要做店里的纸套，就按平时补货谈。';
  }
  if(client.id==='mira'&&state?.openingQuoteV2){
    const lag=previewOffer(state,'rollout').payLag;
    const days=['','一','两','三','四','五','六','七','八','九','十'];
    return OPENING_DIALOGUE.mira.replace('收货后第四天',lag?'收货'+(days[lag]||lag)+'天后':'收货当天');
  }
  if(client.id==='ines'&&state){
    const q=previewOffer(state,'season');
    if(q.deliveryDay>11)return '这批赶不上换季陈列，就按平时备货谈。两家店先试卖，一共 50 条，货到我就付。要是订 150 条，我先付三成，收货后 '+q.payLag+' 天再付剩下的。';
    if(state.openingQuoteV2)return OPENING_DIALOGUE.ines.replace('第六天',q.payLag+' 天');
  }
  return OPENING_DIALOGUE[client.id];
}
export function openingBuyerLineView(client,quoteState){
  if(!client||!Object.hasOwn(OPENING_DIALOGUE,client.id))return inquirySpeech(client?.brief);
  if(quoteState&&(quoteState.phase!=='negotiating'||quoteState.businessRound||quoteState.clientProjectActive))return inquirySpeech(client.brief);
  return inquiryOpening(openingBuyerVoice(client,quoteState),{kind:'opening',customerId:client.id,product:client.product});
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
       ['付款方式',q.accepted===false?(q.id==='all-now'?'拟全款预付':'待确认'):openingPayment(q)],
       q.accepted===false?['状态','待客户确认']:[q.netProfit<0?'预计亏损':'预计净利',q.netProfit,'net-profit']];
    return inquiryOption(v.label,m,{hook:samir?'data-sample':'data-select',value:v.action,active});
  }).join('');
  return '<fieldset class="inquiry-choices"><legend>这批货怎么谈？</legend>'+cards+'</fieldset>';
}
function openingContractActions(offer, action){
  return inquiryActions({backHook:'data-workspace-open="inbox"',backLabel:'先不接',signHook:offer.accepted!==false?'data-action':'',signValue:action,canSign:offer.accepted!==false&&offer.valid});
}
function openingCounterVoice(state,offer,message){
  if(!message||message==='条件尚未谈妥，这一步不花钱。')return '';
  if(offer.accepted===false&&offer.id==='promise'){
    return samirReadyInTime(state)
      ?'纸套等不及了。开业我可以先收无印字的；想做纸套，那批就按平时补货谈。'
      :'两种杯子都赶不上开业。做不做纸套都行，按平时补货给我重新报。';
  }
  if(offer.accepted===false&&offer.id==='all-now')
    return '150 条我可以订，但不能先付全款。我先付三成，收货后 '+previewOffer(state,'season').payLag+' 天再付剩下的。要是不能留账期，就先做 50 条，货到我就付。';
  return message;
}
// Translate save-capacity errors only at the view boundary.
const quoteBlockMessage=reason=>typeof reason==='string'&&reason.includes('经营记录已到容量上限')
  ?'这份存档暂时不能接新单。已签订单还能继续处理。':reason;
function openingCommitment(state,offer,{action,quantityLabel,counterMessage}){
  const accepted=offer.accepted!==false,advance=Math.max(0,offer.cost-(offer.deposit||0));
  const note=openingCounterVoice(state,offer,counterMessage);
 const fundingGap=Math.max(0,(offer.cashRequired??state.cash)-state.cash);
  const facts=[['订购量',quantityLabel||offer.quantity+' 件'],['总货款',money(offer.revenue)],
   ['备货及交付成本',money(offer.cost)],['定金',offer.deposit>0?money(offer.deposit):''],
   ['你先垫付',offer.deposit>0?money(advance):''],[offer.sharedOperatingDays?'本单新增日常开支':'回款前日常开支',money(offer.operatingCost)],
   [fundingGap>0?'资金缺口':'签约后可用资金',money(fundingGap||offer.cashAfterSigning)],
   ['收齐后的可用资金',money(offer.cashAfterPayment)]];
  return '<section class="quote-commitment inquiry-settlement" aria-label="报价与签约">'+
   (!accepted&&!note?'<p class="inquiry-wait">客户确认后才能签约。</p>':'')+
   (note?inquirySpeech(note,{reply:true}):'')+
   (!offer.valid&&offer.reason!==note?'<p class="quote-blocked" role="status">'+escape(quoteBlockMessage(offer.reason))+'</p>':'')+
   (!accepted?'<button type="button" class="primary opening-ask ws-control ws-control--main" data-action="'+escape(action)+'"'+(offer.valid?'':' disabled')+'>发送报价</button>':'')+
   (accepted?inquiryDetails('收支明细',inquiryFacts(facts)):'')+openingContractActions(offer,action)+'</section>';
}
export function quoteCommitmentView(state, offer, {roundActive=false,counterMessage='',action='PROPOSE',quantityLabel=null,client=null,opening=false,openingDesk=false}={}) {
  if (!offer) return '';
  if(openingDesk)return openingCommitment(state,offer,{action,quantityLabel,counterMessage});
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
  const reason = !offer.valid ? `<p class="quote-blocked" role="status">${escape(quoteBlockMessage(offer.reason))}</p>` : '';
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
    <p class="quote-profit"><span>${opening?'预计净利':'这单预计赚到'}</span><strong>${netProfitAmount(offer.netProfit)}</strong></p>
    ${(state.businessRound||state.clientProjectActive)&&nextStep?`<p class="opportunity quote-choice" aria-label="接下这单后的安排">${escape(nextStep)}</p>`:''}
    <details class="quote-breakdown"><summary>这单怎么结算</summary>${opening?pricing:''}<p>货款 ${money(offer.revenue)} − 备货交付 ${money(offer.cost)} − ${roundActive?'仅做这单预计花费的':'回款前的'}日常开销 ${money(offer.operatingCost)} = 预计赚到 ${netProfitAmount(offer.netProfit)}</p><p>待收尾款 ${money(offer.balanceDue)}。${offer.valid&&!twoReceipts?(roundActive?'按已签订单的回款日期估算，收齐后':'本单收齐后')+'预计可用现金 '+money(offer.cashAfterPayment)+'。':''}</p>${expectedBalances}</details>
    ${reason}${counter}${signed?'':'<p class="quote-action-note">先听听客户的回复，这一步不花钱。</p>'}
    ${openingDesk?openingContractActions(offer,action):`<button class="primary" data-action="${escape(action)}" ${offer.valid?'':'disabled'}>签下这单 <span aria-hidden="true">→</span></button>`}
  </section>`;
}

export function quoteBuyerBrief(state, client, selected='') {
  if(state.businessRound&&!state.clientProjectActive&&client?.id==='samir'&&['cup-front-proof','cup-back-proof'].includes(selected))return openingDialogueQuote('这批杯要上收银货架。标签不能跨包装折线；可以让出正面图案的位置，也可以另付一道背贴工序。普通补货还是原来的条件。');
  if(['developed-lamp','second-developed-lamp'].includes(selected)) return openingDialogueQuote((selected==='second-developed-lamp'?state.secondSupplier:state.productDevelopment)?.factory==='studio'?'展台白天要亮、晚上要柔和。我想先订一批调光灯试试。':'这批门店统一用暖光灯，我想按整批采购来谈。');
  if (!state.businessRound && !state.clientProjectActive && state.phase==='negotiating' && client && Object.hasOwn(OPENING_DIALOGUE,client.id)) return openingBuyerVoice(client,state);
  return client?.brief || '';
}

export function quoteOpeningSelection(state,client,p,options,selected){
 if(client.id==='mira'||client.id==='ines'&&selected==='small')return '';
 return `<div class="sample-proposal opening-selection">
 ${client.id==='samir'?`<p class="opening-selection-note">${selected==='branded-opening'?'定制包装赶得上第 7 天开业。':selected==='branded'?'保留定制包装，改作常规补货。':selected==='promise'?`定制包装第 ${p.deliveryDay} 天到，赶不上第 7 天开业。`:p.deliveryDay<=7?'无印字现货，赶得上开业。':'无印字现货已赶不上开业，改作常规补货。'}</p>${selected==='promise'?`<div class="repair"><button data-repair="plain">${state.day+options[0].deliveryDays<=7?'改现货，赶开业':'改现货补货'}</button><button data-repair="restock">保留定制，改补货</button></div>`:''}`:''}
 ${client.id==='ines'&&selected!=='small'?`<div class="terms" role="group" aria-label="付款条件"><button data-select="season" aria-pressed="${selected==='season'}">先付 30%</button><button data-select="all-now" aria-pressed="${selected==='all-now'}">试谈全款预付</button></div>`:''}
 </div>`;
}
