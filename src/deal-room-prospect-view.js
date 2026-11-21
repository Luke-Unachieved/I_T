import {inquiryOpening,inquirySpeech,inquiryOption,inquiryActions,inquiryDetails,inquiryFacts,revealQuoteReply} from './deal-room-inquiry-layout.js';
import {bindQuotePriceSteps,quoteAdviserProjection,quoteDraftWarning,quotePriceControls,quotePriceGuide,quotePriceRejected,quoteUnitPriceValid} from './deal-room-quote-price.js';
import {displayProspectCopy036To045} from './deal-room-prospect-copy-036-045.js';
import {displayProspectCopy036To045Handover} from './deal-room-prospect-copy-036-045-handover.js';
import {displayProspectCopy056To065} from './deal-room-prospect-copy-056-065.js';
import {displayProspectCopy066To075} from './deal-room-prospect-copy-066-075.js';
import {displayProspectCopy066To075Handover} from './deal-room-prospect-copy-066-075-handover.js';
import {displayProspectCopy076To085} from './deal-room-prospect-copy-076-085.js';
import {displayProspectCopy001To005} from './deal-room-prospect-copy-001-005.js';
import {displayProspectCopy006To015} from './deal-room-prospect-copy-006-015.js';
import {displayProspectCopy046To055} from './deal-room-prospect-copy-046-055.js';
import {displayProspectCopy086To095} from './deal-room-prospect-copy-086-095.js';
import {displayProspectCopy086To095Followups} from './deal-room-prospect-copy-086-095-followups.js';
import {displayProspectCopy096To100} from './deal-room-prospect-copy-096-100.js';
import {displayProspectCopy096To100Followups} from './deal-room-prospect-copy-096-100-followups.js';
import {displayProspectCopy016To025} from './deal-room-prospect-copy-016-025.js';
import {displayProspectCopy016To025Late} from './deal-room-prospect-copy-016-025-late.js';
import {displayProspectCopy026To035} from './deal-room-prospect-copy-026-035.js';
import {displayProspectCopy026To035Followups} from './deal-room-prospect-copy-026-035-followups.js';
import {evaTrayStoryMoment,lukaTrayStoryMoment,prospectSceneLine,prospectComicView} from './deal-room-prospect-scenes.js';
import {lukaRepeatAcceptedLine,lukaRepeatInquiryView,lukaRepeatLetter,lukaRepeatOrder,lukaRepeatOrderSpeech,lukaRepeatPaidView} from './deal-room-luka-repeat-scenes.js';
import {evaRepeatAcceptedLine,evaRepeatInquiryView,evaRepeatLetter,evaRepeatOrder,evaRepeatPaidView,evaRepeatSpeech} from './deal-room-eva-repeat-scenes.js';
import {PROSPECT_CONTENT,prospectFallbackDialogue} from './deal-room-prospect-content.js';
import {prospectDisplayText,prospectMarketLabel} from './deal-room-prospect-locale.js';
import {previewWarehouseIssue,warehouseSummary} from './deal-room-warehouse.js';
import {prospectInbox,prospectContentById,prospectRelationship} from './deal-room-prospects.js';
import {previewMarket} from './deal-room-market.js';
import {prospectAvatar} from './deal-room-prospect-avatar.js';

const esc = value => String(prospectDisplayText(value) ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cash = n => Number.isSafeInteger(n) ? '¥' + n.toLocaleString('zh-CN') : '—';
const day = n => Number.isSafeInteger(n) ? '第 ' + n + ' 天' : '待确认';
const fact = (label,value) => '<div><dt>'+esc(label)+'</dt><dd>'+esc(value)+'</dd></div>';
const optionName = id => ({quote:'按常规条件报',concession:'让一点价，争取早点补货',reorder:'按原数量补货','vip-volume':'加量补货'})[id] || '按来信报价';
const sourceName = k => k==='warehouse'?'自有仓库':k==='factory'?'工厂排产':'现货采购';
const pack = (n,u) => (Number.isSafeInteger(n) ? n.toLocaleString('zh-CN') : '—') + u;
const payment = o => (o.depositPercent ? '定金 '+o.depositPercent+'%' : '不付定金')+'，'+(o.payLag?'验收后 '+o.payLag+' 天付余款':o.depositPercent?'验收当日付清余款':'验收当日付清');
const perPage = 5;
const inDraft = s => s?.phase === 'market' && s.market?.status === 'draft';
const firstLetter = row => !row.isRepeat && !row.promotion;
const illustratedTrayLetter = row => firstLetter(row)&&row.person.id==='006'&&row.product.id==='tray';

// The person's name is always real roster text. The letter tile is only a
// functional fallback for an unknown avatar, never represented as recovered art.
function face(person) {
 const portrait=prospectAvatar(person.id);
 return portrait || '<span class="prospect-letter-tile" aria-hidden="true">'+esc(Array.from(person.displayName || '?')[0])+'</span>';
}
function card(row) {
 const {person:p,product,isRepeat}=row;
 return '<button type="button" class="prospect-letter" data-prospect-open="'+esc(p.id)+'">'+face(p)+'<span><small>'+esc(isRepeat?'熟客补货':'初次来信')+' · '+esc(prospectMarketLabel(p))+'</small><strong>'+esc(p.displayName)+' · '+esc(product.name)+'</strong><span>'+esc(p.organization)+'</span><small>'+esc(Number.isSafeInteger(row.replyBy)?'最晚'+day(row.replyBy)+'回复':'查看这次补货条件')+' →</small></span></button>';
}
function inbox(rows,ui,today) {
 const end=rows.find(r=>!r.isRepeat&&Number.isSafeInteger(r.replyBy))?.replyBy;
 const group=['new','repeat'].includes(ui.prospectFilter)?ui.prospectFilter:'all';
 const shown=rows.filter(r=>group==='all'||(group==='repeat')===r.isRepeat);
 const pages=Math.max(1,Math.ceil(shown.length/perPage));
 const page=Math.min(pages-1,Math.max(0,Number.isSafeInteger(ui.prospectPage)?ui.prospectPage:0));
 const count=rows.filter(r=>r.isRepeat).length,filters=[['all','全部 '+rows.length],['new','初次来信 '+(rows.length-count)],['repeat','熟客补货 '+count]];
 return '<section class="prospect-panel prospect-inbox" aria-labelledby="prospect-inbox-title"><div class="prospect-eyebrow">客商往来</div><h3 id="prospect-inbox-title" tabindex="-1">客户来信</h3>'+
 (rows.length?'<p>挑一封看看对方要什么。读信和询价不扣钱，也不会推进日期。</p>':'<p>今天没有待回复的来信。你仍然可以到采购台找货。</p>')+
 ((count&&count<rows.length)||group!=='all'?'<div class="prospect-filters" role="group" aria-label="筛选客户来信">'+filters.map(([key,label])=>'<button type="button" data-prospect-filter="'+key+'" aria-pressed="'+(group===key)+'">'+label+'</button>').join('')+'</div>':'')+
 '<p class="prospect-calendar">新客每 7 天轮换一组，每组最多 5 封；熟客按上笔结款日补货，不跟新客一起撤信。'+(Number.isSafeInteger(end)?(end===today?'今天是本批新客回复的最后一天。':'本批初次来信最晚'+esc(day(end))+'回复。')+'下一批从'+esc(day(end+1))+'开始。':'')+'</p>'+
 '<div class="prospect-letters">'+shown.slice(page*perPage,(page+1)*perPage).map(card).join('')+'</div>'+
 (!shown.length&&rows.length?'<p>这一栏暂时没有来信。</p>':'')+
 (pages>1?'<nav class="prospect-pages" aria-label="客户来信翻页"><button type="button" data-prospect-page="'+(page-1)+'" '+(page?'':'disabled')+'>上一页</button><span>'+ (page+1)+' / '+pages+'</span><button type="button" data-prospect-page="'+(page+1)+'" '+(page+1<pages?'':'disabled')+'>下一页</button></nav>':'')+'</section>';
}
const supplierFits=(f,o)=>o.quantity>=f.minQuantity&&f.days<=o.deadlineDays;
function draftContext(state,ui) {
 if(!inDraft(state)||!ui.prospectId)return null;
 const row=prospectInbox(state).find(x=>x.person.id===ui.prospectId);
 if(!row)return null;
 const o=row.options.find(x=>x.id===ui.prospectOption)||row.options[0];
 if(!o)return null;
 const warehouseIssue=previewWarehouseIssue(state,row.product.id,o.quantity);
 const usable=['stock','factory'].filter(k=>supplierFits(row.product.sources[k],o));
 if(warehouseIssue.valid)usable.push('warehouse');
 const source=usable.includes(ui.prospectSource)?ui.prospectSource:(row.isRepeat&&usable.includes('factory')?'factory':usable[0]??'stock');
 const fields={customerId:row.person.id,optionId:o.id,source,...(o.id==='vip-volume'?{previousPaidDay:row.previous.paidDay}:{})};
 const markup=o.id==='concession'?14:20;
 const unitPrice=quoteUnitPriceValid(ui.prospectPrice)?ui.prospectPrice:quotePriceGuide(previewMarket(state,{...fields,unitPrice:1}),markup)?.recommended??1;
 const draft={...fields,unitPrice};
 const q=previewMarket(state,draft);
 return {row,o,source,draft,usable,warehouseIssue,adviserId:ui.adviserId,q,guide:quotePriceGuide(q,markup),asked:ui.prospectAsked===JSON.stringify(draft)};
}
export function prospectAdviserQuote(state,ui={}) {
 const c=draftContext(state,ui);
 return c?quoteAdviserProjection(c.q,state.cash,c.asked,quotePriceRejected(c.q)):null;
}
const rejectedAdvice=Object.freeze({
 fang:['方文斌','交期这会儿不用动。要是想让点价，我可以陪你把运费摊到每件上，看看还有多少余地。'],
 liang:['梁佳音','对方嫌这个价高，倒没说不要货。咱们把降价后的利润算一遍，再回也来得及。'],
 tao:['陶乐','货源还是刚才那个，没必要重选。要是你还想谈，咱们只换个价问一句就行。'],
 xu:['许明珊','就算单价降了，尾款也不会早到。要不要算一下，手上的钱能不能撑到那天？']
});
function response(c,repeatReply) {
 if(!c.asked)return '';
 const person=c.row.person;
 const bubble=(line,price='')=>inquirySpeech(prospectDisplayText(line),{reply:true,extra:price});
 if(quotePriceRejected(c.q)){const note=Object.hasOwn(rejectedAdvice,c.adviserId)?rejectedAdvice[c.adviserId]:null;return bubble('这个单价我这边接不了。你能再报一个价吗？')+(note?'<aside class="market-note" aria-label="助理便笺"><strong>'+esc(note[0])+'：</strong>'+esc(note[1])+'</aside>':'');}
 if(!c.q?.accepted)return '';
 const agreement=c.row.isRepeat?'':prospectSceneLine(person.id,'agreed',c.o.id,c.row.product.id);
 const stagedReply=!c.row.isRepeat&&Number(person.id)>=46?displayProspectCopy(person.id,'bargain',c.q.prospectVoice?.bargain||''):'';
 const line=repeatReply||agreement||stagedReply||(c.row.isRepeat?'好，这次补货就按这份报价来。':'可以，照这份报价和交货日期来。');
 return bubble(line,cash(c.draft.unitPrice)+'/'+c.row.product.unit);
}
const prospectCopyEditors=[
 displayProspectCopy001To005,displayProspectCopy006To015,displayProspectCopy016To025,displayProspectCopy016To025Late,
 displayProspectCopy026To035,displayProspectCopy026To035Followups,
 displayProspectCopy036To045,displayProspectCopy036To045Handover,displayProspectCopy046To055,displayProspectCopy056To065,
 displayProspectCopy066To075,displayProspectCopy066To075Handover,displayProspectCopy076To085,displayProspectCopy086To095,displayProspectCopy086To095Followups,
 displayProspectCopy096To100,displayProspectCopy096To100Followups
];
function displayProspectCopy(id,stage,line){
 const edited=prospectCopyEditors.reduce((current,edit)=>edit(id,stage,current),line);
 return edited===line?prospectFallbackDialogue(id,stage,line):edited;
}
const gcd=(a,b)=>b?gcd(b,a%b):a;
// prospectInbox advances five buyers a week. For letters whose variant count is
// in step with a full roster rotation, vary the on-screen copy on later cycles.
// row.opening stays canonical: it is replayed into signed and paid orders.
const organicRotationWeeks=PROSPECT_CONTENT.length/gcd(PROSPECT_CONTENT.length,5);
function displayOrganicOpening(row){
 const lines=row.person.lines.inquiry;
 if(!lines?.length)return row.opening;
 // The 006 strip depicts this exact carton-count conversation, not the other variants.
 if(illustratedTrayLetter(row))return lines[1]??row.opening;
 const week=Math.floor((row.replyBy-1)/7),cycle=Math.floor(week/organicRotationWeeks);
 if(cycle>0&&gcd(organicRotationWeeks,lines.length)>1)return lines[(week%organicRotationWeeks+cycle)%lines.length];
 return row.opening;
}
// Only usable routes are selectable. A lone route is a readout, not a choice.
export function prospectSourceListView(rows,selected,{canChangeConditions=false}={}){
 const usable=rows.filter(r=>r.available), blocked=rows.filter(r=>!r.available&&r.reason);
 const unavailable=blocked.length?'<details class="prospect-source-disclosure prospect-source-unavailable" data-prospect-source-unavailable><summary>不可用货源</summary><div class="prospect-source-blocked-list">'+blocked.map((v,i)=>{
  const title=v.title||v.reason.split('：')[0]||'货源';
  const prefix=title+'：', reason=v.reason.startsWith(prefix)?v.reason.slice(prefix.length):v.reason;
  return '<div><button type="button" class="prospect-source-blocked" disabled aria-describedby="prospect-source-blocked-'+i+'">'+esc(title)+'</button><p id="prospect-source-blocked-'+i+'">'+esc(reason)+'</p></div>';
 }).join('')+'</div></details>':'';
 if(!usable.length)return '<p class="prospect-source-note">没有货源能满足这单的数量和交期。'+(canChangeConditions?'可换个方案再核对，或先不接。':'请先不接这单。')+'</p>'+unavailable;
 const multi=usable.length>1;
 const detail=usable.flatMap(v=>v.notes?.length?['<p><strong>'+esc(v.title)+'</strong> '+v.notes.map(esc).join('，')+'</p>']:[]);
 const details=detail.length?'<details class="prospect-source-disclosure" data-prospect-source-more><summary>供货明细</summary><div>'+detail.join('')+'</div></details>':'';
 if(!multi){
  const v=usable[0];
  return '<div class="prospect-source-single" data-prospect-source-summary="'+v.key+'">'+
    '<strong>'+esc(v.title)+'</strong><b><span class="quote-sr-only">货源费用 </span>'+esc(cash(v.amount))+'</b>'+
    '<small>'+esc(day(v.deliveryDay))+'到货</small>'+details+'</div>'+unavailable;
 }
 return '<div class="prospect-source-columns" aria-hidden="true"><span></span><span>货源费用</span><span>预计到货</span></div>'+
  usable.map(v=>'<button type="button" class="prospect-source-line" data-prospect-source="'+v.key+'" aria-pressed="'+(v.key===selected)+'">'+
   '<span class="prospect-source-label"><strong>'+esc(v.title)+'</strong></span>'+
   '<b><span class="quote-sr-only">货源费用 </span>'+esc(cash(v.amount))+'</b><span class="prospect-source-eta"><span class="quote-sr-only">预计到货 </span>'+esc(day(v.deliveryDay))+'</span></button>').join('')+details+unavailable;
}
function sourceOptions(state,c) {
 const {row,o,source,draft,usable,warehouseIssue}=c,{product}=row,unit=product.unit;
 const asksAboutCartons=illustratedTrayLetter(row);
 const rows=['stock','factory'].map(key=>{
  const f=product.sources[key];
  const boxCount=Math.ceil(o.quantity/f.packSize);
  const title=sourceName(key),notes=[f.name];
  if(asksAboutCartons)notes.push('每箱 '+pack(f.packSize,unit)+'，本批需 '+boxCount+' 箱');
  return {key,title,notes,unitCost:f.unitCost,available:usable.includes(key),amount:o.quantity*f.unitCost+f.freightBase+boxCount*f.freightPerBox,deliveryDay:state.day+f.days,
   reason:title+'：'+pack(f.minQuantity,' '+unit)+'起订，'+(key==='factory'?'排产 '+f.days+' 天':f.days+' 天到货')+'；本单 '+pack(o.quantity,' '+unit)+'，'+o.deadlineDays+' 天内收货。'};
 });
 if(warehouseIssue.valid){
  const q=source==='warehouse'&&Number.isSafeInteger(c.q.deliveryDay)?c.q:previewMarket(state,{...draft,source:'warehouse',unitPrice:1});
  rows.push({key:'warehouse',title:'自有仓库',notes:['已到仓 '+pack(warehouseIssue.available,' '+unit)+'，只付配送费'],available:true,amount:q.freight,deliveryDay:q.deliveryDay});
 }else{
  const item=warehouseSummary(state).items.find(x=>x.productId===product.id);
  if(item&&(item.onHand||item.inTransit))rows.push({key:'warehouse',title:'自有仓库',available:false,
   reason:'自有仓库：已到仓 '+pack(item.onHand,' '+unit)+'，还差 '+pack(Math.max(0,o.quantity-item.onHand),' '+unit)+(item.inTransit?'；在途货不能出库。':'。')});
 }
 return prospectSourceListView(rows,source,{canChangeConditions:row.options.some(v=>v.quantity!==o.quantity||v.deadlineDays!==o.deadlineDays)});
}
function quote(state,c) {
 const {row,o,draft:d,source,q,guide,asked}=c,{person:p,product}=row,unit=product.unit;
 const old=row.previous,repeat=lukaRepeatLetter(state,row),evaRepeat=evaRepeatLetter(state,row);
 const repeatReply=repeat?lukaRepeatAcceptedLine(repeat,o.id):evaRepeat?evaRepeatAcceptedLine(evaRepeat,o.id):'';
 const opening=row.promotion?'我是在《'+row.promotion.channelName+'》上看到你的。'+(o.mode==='bulk'?'我想问问整批铺货怎么报。':'我想先问一批试货。'):
  (row.isRepeat?prospectSceneLine(p.id,'repeat',null,product.id):'')||displayProspectCopy(p.id,row.isRepeat?'reorder':'inquiry',row.isRepeat?row.opening:displayOrganicOpening(row));
 const choices='<fieldset class="inquiry-choices"><legend>'+esc(row.isRepeat?'这批货怎么补？':'这批货怎么谈？')+'</legend>'+row.options.map(v=>
  inquiryOption((repeat||p.id==='001'&&row.isRepeat&&product.id==='tray')&&v.id==='reorder'?'常规补货':optionName(v.id),[['订购量',pack(v.quantity,unit)],['最迟收货',day(state.day+v.deadlineDays)],['付款',payment(v)],['最早补货',Number.isSafeInteger(v.followupDays)?'回款后 '+v.followupDays+' 天':'']],
    {hook:'data-prospect-option',value:v.id,active:v.id===o.id})).join('')+'</fieldset>';
 const showSettlement=!asked||q.accepted;
 const reason=asked?(quotePriceRejected(q)?'':q.reason):quoteDraftWarning(q,state.cash);
 return '<section class="market-quote prospect-panel" aria-label="客户来信报价"><div class="prospect-quote-top"><button type="button" class="quiet" data-prospect-back>← 收件箱</button></div>'+
 '<div class="prospect-byline">'+face(p)+'<div><div class="prospect-identity"><h3 tabindex="-1" data-prospect-heading>'+esc(p.displayName)+'</h3><span class="prospect-quote-status" data-prospect-quote-status>'+(asked?(q.accepted?'报价已接受':'待重新报价'):'待报价')+'</span></div><span class="prospect-origin">'+esc(p.organization)+'</span><span class="prospect-region">'+esc(product.name)+'</span></div></div>'+
 '<div class="prospect-contact-meta"><span>合作关系：'+esc(prospectRelationship(row))+'</span>'+
 (Number.isSafeInteger(row.replyBy)?'<span>'+esc(day(row.replyBy))+'前可回复</span>':'')+'</div>'+
 (repeat?lukaRepeatInquiryView(repeat):evaRepeat?evaRepeatInquiryView(evaRepeat):inquiryOpening(prospectDisplayText(opening),{kind:firstLetter(row)?'prospect':'',customerId:p.id,product:product.id}))+
 choices+inquiryDetails('客户要求',
 (row.isRepeat&&old?'<p>上次采购 '+esc(pack(old.quantity,old.unit||unit))+'，成交单价 '+esc(cash(old.unitPrice))+'，'+esc(day(old.paidDay))+'收齐。</p>':'')+
 '<p>'+esc(product.inspection)+'</p>',{kind:'prospect-request'})+
 '<fieldset class="prospect-source-list"><legend>货源</legend>'+sourceOptions(state,c)+'</fieldset>'+
 '<form data-prospect-form>'+quotePriceControls({key:'prospect',unit,price:d.unitPrice,guide,q,sent:asked,canSend:c.usable.length>0})+'</form>'+
 '<div data-prospect-terms>'+response(c,repeatReply)+
 (showSettlement&&(asked||q.paymentDay!==q.deliveryDay)?inquiryFacts([
  ...(asked?[[q.netProfit<0?'预计亏损':'预计净利',Number.isSafeInteger(q.netProfit)?cash(Math.abs(q.netProfit)):'']]:[]),
  ...(Number.isSafeInteger(q.deliveryDay)?(asked?(q.paymentDay===q.deliveryDay?[['交货并收款',day(q.deliveryDay)]]:[['交货日期',day(q.deliveryDay)],['收款',day(q.paymentDay)]]):q.paymentDay!==q.deliveryDay?[['预计收款',day(q.paymentDay)]]:[]):[])
 ],asked?'inquiry-decision-facts':'quote-draft-schedule'):'')+
 (reason?'<p class="market-warning" role="status"'+(asked&&!q.accepted?' tabindex="-1" data-prospect-reply':'')+'>'+esc(reason)+'</p>':'')+
 (showSettlement?inquiryDetails('收支明细',inquiryFacts([['总货款',cash(q.revenue)],['定金',q.deposit>0?cash(q.deposit):''],['尾款',q.deposit>0?cash(q.balanceDue):''],[source==='warehouse'?'库存成本（已付）':'付给货源',cash(q.goodsCost)],['运费',q.freight>0?cash(q.freight):''],['回款前日常开支',q.operatingCost>0?cash(q.operatingCost):''],['至少要备的周转金',cash(q.cashRequired)],['签后手头现金',cash(q.cashAfterSigning)],['收齐后的可用资金',cash(q.cashAfterPayment)]])):'')+
 '</div>'+inquiryActions({backHook:'data-prospect-dismiss',signHook:'data-prospect-sign',canSign:asked&&q.accepted&&q.valid})+
 '</section>';
}
export function prospectInboxView(state,ui={}) {
 if(!inDraft(state))return '';
 const c=draftContext(state,ui);
 if(c)return quote(state,c);
 return (ui.prospectId?'<p role="status">这封来信目前不能报价。<button type="button" class="quiet" data-prospect-back>回到采购台</button></p>':'')+inbox(prospectInbox(state),ui,state.day);
}
export function prospectReceiptContact(state,{lukaMoment=lukaTrayStoryMoment(state),repeat=lukaRepeatOrder(state),evaMoment=evaTrayStoryMoment(state),evaRepeat=evaRepeatOrder(state)}={}) {
 const a=state?.market?.active,status=state?.market?.status;
 if(!a?.customerId||!a.prospectVoice||!['transit','receivable','paid'].includes(status))return '';
 const p=prospectContentById(a.customerId)||{id:a.customerId,displayName:a.buyer,organization:''};
 const repeatScene=repeat||evaRepeat;
 if(repeatScene?.stage==='inspection')return '';
 const repeatComic=repeat?lukaRepeatPaidView(repeat):evaRepeatPaidView(evaRepeat);
 // The delivery line is an instruction for the carrier, so show it before
 // handover, not after the shipment has already been signed for or paid.
 // Scene prose belongs to the comic; do not append it as a second buyer message.
 const speech=repeatScene&&repeatScene.stage!=='paid'?(repeat?lukaRepeatOrderSpeech(repeat):evaRepeatSpeech(evaRepeat)):
  status==='paid'&&lukaMoment!=='paid'&&evaMoment!=='paid'&&!repeatComic?displayProspectCopy(a.customerId,'settlement',a.prospectVoice.settlement):status==='transit'?displayProspectCopy(a.customerId,'delivery',a.prospectVoice.delivery):'';
 const stage=status==='paid'?'已结清':status==='receivable'?'已验收':'已签约';
 return '<aside class="prospect-panel prospect-receipt"><div class="prospect-byline">'+face(p)+'<div><small>'+esc(repeatScene?.option==='vip-volume'?'VIP 加量':a.prospectRepeat?'熟客补货':'首单合作')+' · '+stage+'</small><strong>'+esc(p.displayName)+'</strong><span>'+esc(p.organization)+'</span></div></div>'+
 (speech?'<blockquote class="prospect-message" aria-label="'+esc(p.displayName)+'">'+esc(speech)+'</blockquote>':'')+(repeatComic||prospectComicView(a,status,{lukaMoment,evaMoment}))+'</aside>';
}
export function bindProspectInbox(root,state,ui,rerender,dispatch,options) {
 if(!inDraft(state))return;
 const change=(fields,target)=>{Object.assign(ui,fields);rerender();root.querySelector(target)?.focus?.();};
 const bindMany=(sel,fn)=>root.querySelectorAll(sel).forEach(b=>b.addEventListener('click',()=>fn(b)));
 bindMany('[data-prospect-open]',b=>change({prospectId:b.dataset.prospectOpen,prospectOption:undefined,prospectSource:undefined,prospectPrice:undefined,prospectAsked:null},'[data-prospect-heading]'));
 bindMany('[data-prospect-page]',b=>change({prospectPage:Number(b.dataset.prospectPage)},'#prospect-inbox-title'));
 bindMany('[data-prospect-filter]',b=>change({prospectFilter:b.dataset.prospectFilter,prospectPage:0},'#prospect-inbox-title'));
 root.querySelector('[data-prospect-back]')?.addEventListener('click',()=>{
  if(options?.onProspectBack){options.onProspectBack();return;}
  const id=ui.prospectId;delete ui.prospectId;delete ui.prospectAsked;rerender();
  const back=[...root.querySelectorAll('[data-prospect-open]')].find(b=>b.dataset.prospectOpen===id);(back||root.querySelector('#prospect-inbox-title'))?.focus?.();
 });
 bindMany('[data-prospect-option]',b=>change({prospectOption:b.dataset.prospectOption,prospectPrice:undefined,prospectAsked:null},'[data-prospect-option][aria-pressed="true"]'));
 bindMany('[data-prospect-source]',b=>{if(!b.disabled)change({prospectSource:b.dataset.prospectSource,prospectPrice:undefined,prospectAsked:null},'[data-prospect-source][aria-pressed="true"]');});
 if(!ui.prospectId)return;
 bindQuotePriceSteps(root,{key:'prospect',read:()=>draftContext(state,ui)?.draft.unitPrice,change:price=>{ui.prospectPrice=price;ui.prospectAsked=null;},rerender});
 root.querySelector('[data-prospect-form]')?.addEventListener('submit',e=>{
  e.preventDefault();const c=draftContext(state,ui);if(!c||!c.usable.length||!quoteUnitPriceValid(c.draft.unitPrice))return;
  ui.prospectAsked=JSON.stringify(c.draft);rerender();revealQuoteReply(root,'[data-prospect-reply]');
 });
 root.querySelector('[data-prospect-dismiss]')?.addEventListener('click',()=>{
  const c=draftContext(state,ui);if(!c)return;
  delete ui.prospectId;delete ui.prospectAsked;
  dispatch({type:'DISMISS_PROSPECT_V1',customerId:c.row.person.id,checkedDay:state.day});
 });
 root.querySelector('[data-prospect-sign]')?.addEventListener('click',()=>{
  const c=draftContext(state,ui);if(!c||!c.asked||!c.q.accepted||!c.q.valid)return;
  const {optionId,...fields}=c.draft;
  if(optionId==='vip-volume') dispatch({type:'SIGN_PROSPECT_VIP_LOT_V1',...fields});
  else dispatch({type:'SIGN_PROSPECT_LOT_V1',...c.draft});
 });
}
