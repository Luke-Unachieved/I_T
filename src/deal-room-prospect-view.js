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
import {prospectSceneLine,prospectComicView} from './deal-room-prospect-scenes.js';
import {prospectDisplayText,prospectMarketLabel} from './deal-room-prospect-locale.js';
import {previewWarehouseIssue,warehouseSummary} from './deal-room-warehouse.js';
import {prospectInbox,prospectContentById,prospectRelationship} from './deal-room-prospects.js';
import {previewMarket} from './deal-room-market.js';
import {marketPlate} from './deal-room-market-art.js';
import {prospectAvatar} from './deal-room-prospect-avatar.js';

const esc = value => String(prospectDisplayText(value) ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cash = n => Number.isSafeInteger(n) ? '¥' + n.toLocaleString('zh-CN') : '—';
const day = n => Number.isSafeInteger(n) ? '第 ' + n + ' 天' : '待确认';
const fact = (label,value) => '<div><dt>'+esc(label)+'</dt><dd>'+esc(value)+'</dd></div>';
const optionName = id => ({quote:'按常规条件报价',concession:'让价争取早补货',reorder:'给熟客报补货价','vip-volume':'VIP 加量补货'})[id] || '按来信报价';
const sourceName = k => k==='warehouse'?'自有仓库':k==='factory'?'工厂排产':'现货采购';
const pack = (n,u) => (Number.isSafeInteger(n) ? n.toLocaleString('zh-CN') : '—') + u;
const payment = o => (o.depositPercent ? '定金 '+o.depositPercent+'%' : '不付定金')+'，'+(o.payLag?'验收后 '+o.payLag+' 天付余款':o.depositPercent?'验收当日付清余款':'验收当日付清');
const perPage = 5;
const sourceKeys=(product,state,quantity)=>['stock','factory',...(previewWarehouseIssue(state,product.id,quantity).valid?['warehouse']:[])];
const inDraft = s => s?.phase === 'market' && s.market?.status === 'draft';

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
function supplierBlock(f,o,unit){return o.quantity<f.minQuantity?'离起订量还差 '+pack(f.minQuantity-o.quantity,unit):f.days>o.deadlineDays?'赶不上最晚收货日':'';}
function draftContext(state,ui) {
 if(!inDraft(state)||!ui.prospectId)return null;
 const row=prospectInbox(state).find(x=>x.person.id===ui.prospectId);
 if(!row)return null;
 const o=row.options.find(x=>x.id===ui.prospectOption)||row.options[0];
 const keys=sourceKeys(row.product,state,o?.quantity);
 if(!o||!keys.length)return null;
 const usable=keys.filter(k=>k==='warehouse'||!supplierBlock(row.product.sources[k],o,row.product.unit));
 const source=usable.includes(ui.prospectSource)?ui.prospectSource:(row.isRepeat&&usable.includes('factory')?'factory':usable[0]??keys[0]);
 const fields={customerId:row.person.id,optionId:o.id,source,...(o.id==='vip-volume'?{previousPaidDay:row.previous.paidDay}:{})};
 // The initial asking price is the seller's cost plus markup, not the buyer's
 // ceiling. Reading the quote for expenses works even when the source is late.
 let unitPrice=ui.prospectPrice;
 if(unitPrice===undefined){
  const base=previewMarket(state,{...fields,unitPrice:1});
  const cost=base?.cost,overhead=base?.operatingCost;
  if(Number.isSafeInteger(cost)&&Number.isSafeInteger(overhead)&&o.quantity>0){
   const ask=Math.max(1,Math.ceil((cost+overhead)*1.2/o.quantity));
   unitPrice=o.id==='concession'?Math.max(1,Math.floor(ask*.95)):ask;
  }else unitPrice='';
 }
 const draft={...fields,unitPrice};
 return {row,o,source,draft,adviserId:ui.adviserId,q:previewMarket(state,draft),asked:ui.prospectAsked===JSON.stringify(draft)};
}
const overBudget = c => (Number.isSafeInteger(c.draft.unitPrice)&&c.draft.unitPrice>c.o.maxUnitPrice)||/预算|上限|最高接受/.test(c.q?.reason||'');
function privateQuote(c) {
 if(!c?.q)return null;
 const {maxUnitPrice,...q}=c.q;
 // Do not leak a buyer's reservation price via adviser text, including before asking.
 if(overBudget(c)){q.reason=c.asked?'客户没有接受这个价格。可以降低单价，再问一次。':'';if(!c.asked)q.accepted=true;}
 return q;
}
export function prospectAdviserQuote(state,ui={}) {return privateQuote(draftContext(state,ui));}
const rejectedAdvice=Object.freeze({
 fang:['方文斌','先别改交期。把运费摊到每件里，看看这一单还能让多少。'],
 liang:['梁佳音','对方只是没接这个价。先算清降价以后还赚不赚，再回话也不迟。'],
 tao:['陶乐','对方没说不要这批货。你可以只改报价再问，不用把刚选好的货源推倒重来。'],
 xu:['许明珊','报价往下改容易，尾款还是那天才到。先看手里的钱够不够撑到收款。']
});
function response(c) {
 if(!c.asked)return '';
 const person=c.row.person;
 const bubble=(line,price='')=>'<div class="prospect-quote-chat">'+face(person)+'<p class="market-response" role="status"><strong>'+esc(person.displayName)+'</strong><span class="prospect-chat-line">'+esc(line)+(price?'<small>'+esc(price)+'</small>':'')+'</span></p></div>';
 if(overBudget(c)){const note=Object.hasOwn(rejectedAdvice,c.adviserId)?rejectedAdvice[c.adviserId]:null;return bubble('这个单价我这边接不了。你能再报一个价吗？')+(note?'<aside class="market-note" aria-label="助理便笺"><strong>'+esc(note[0])+'：</strong>'+esc(note[1])+'</aside>':'');}
 if(!c.q?.accepted)return '';
 const line=c.row.isRepeat?'':prospectSceneLine(person.id,'agreed',c.o.id,c.row.product.id);
 return bubble(line||'可以，照这份数量和交期来。',cash(c.draft.unitPrice)+'/'+c.row.product.unit);
}
const prospectCopyEditors=[
 displayProspectCopy001To005,displayProspectCopy006To015,displayProspectCopy016To025,displayProspectCopy016To025Late,
 displayProspectCopy026To035,displayProspectCopy026To035Followups,
 displayProspectCopy036To045,displayProspectCopy036To045Handover,displayProspectCopy046To055,displayProspectCopy056To065,
 displayProspectCopy066To075,displayProspectCopy066To075Handover,displayProspectCopy076To085,displayProspectCopy086To095,displayProspectCopy086To095Followups,
 displayProspectCopy096To100,displayProspectCopy096To100Followups
];
const displayProspectCopy=(id,stage,line)=>prospectCopyEditors.reduce((current,edit)=>edit(id,stage,current),line);
function sourceOptions(state,c) {
 const {row,o,source,draft}=c,{product}=row,unit=product.unit;
 const supplier=['stock','factory'].map(key=>{
  const f=product.sources[key];
  const boxCount=Math.ceil(o.quantity/f.packSize);
  const cost=o.quantity*f.unitCost+f.freightBase+boxCount*f.freightPerBox;
  const blocked=supplierBlock(f,o,unit);
  const late=f.days-o.deadlineDays;
  const minShort=Math.max(0,f.minQuantity-o.quantity);
  const limits=[late>0?'晚 '+late+' 天到货':'',minShort>0?'还差 '+minShort+' '+unit+'才够起订量':''].filter(Boolean);
  return '<button type="button" data-prospect-source="'+key+'" aria-pressed="'+(source===key)+'"'+(blocked?' disabled':'')+'>'+
    '<span class="prospect-source-name"><strong>'+sourceName(key)+'</strong><small>'+esc(f.name)+'</small></span>'+
    '<span class="prospect-source-total"><small>货款＋运费</small><b>'+esc(cash(cost))+'</b></span>'+
    '<span class="prospect-delivery-tag"><small>预计到货</small><b>'+esc(day(state.day+f.days))+'</b></span>'+
    '<span class="prospect-source-verdict"><strong>'+ (blocked?'不可选':(source===key?'已选，可按时到货':'可按时到货'))+'</strong>'+
    limits.map(limit=>'<small>'+esc(limit)+'</small>').join('')+'</span></button>';
 }).join('');
 const issue=previewWarehouseIssue(state,product.id,o.quantity);
 const stock=warehouseSummary(state);
 const item=stock.items.find(x=>x.productId===product.id);
 let detail=stock.valid?'已到仓 '+pack(item?.onHand??0,unit)+' · 本单需 '+pack(o.quantity,unit):'暂时无法读取库存';
 if(item?.inTransit)detail+=' · 在途 '+pack(item.inTransit,unit)+'，到仓后才可出库';
 let terms='';
 if(issue.valid){
  const q=source==='warehouse'&&Number.isSafeInteger(c.q.deliveryDay)?c.q:previewMarket(state,{...draft,source:'warehouse',unitPrice:1});
  terms='库存货款已付，本次只付出库配送费'+(Number.isSafeInteger(q.freight)?' '+cash(q.freight):'')+(Number.isSafeInteger(q.deliveryDay)?' · 预计'+day(q.deliveryDay)+'送达客户':'');
 }else if(stock.valid)terms='已到仓库存不足，不能供本单';
 const warehouse='<button type="button" data-prospect-source="warehouse" aria-pressed="'+(source==='warehouse')+'"'+(issue.valid?'':' disabled')+'><strong>自有仓库</strong><small>'+esc(detail)+(terms?'<br>'+esc(terms):'')+'</small></button>';
 return supplier+(issue.valid?warehouse:'<details class="prospect-warehouse-more"><summary>'+(item?.inTransit?'仓库有货在途':'仓库暂无可用库存')+'</summary>'+warehouse+'</details>');
}
function quote(state,c) {
 const {row,o,draft:d,source,q,asked}=c,{person:p,product}=row,unit=product.unit;
 const old=row.previous;
 const quotedQty=pack(o.quantity,unit),reason=overBudget(c)?'':(q.reason||'');
 return '<section class="market-quote prospect-panel" aria-label="客户来信报价"><div class="prospect-quote-top"><button type="button" class="quiet" data-prospect-back>← 收件箱</button><button type="button" class="prospect-dismiss-button" data-prospect-dismiss>不接这单</button></div>'+
 '<div class="prospect-byline">'+face(p)+'<div><div class="prospect-identity"><h3 tabindex="-1" data-prospect-heading>'+esc(p.displayName)+'</h3><span class="prospect-quote-status">待报价</span></div><span class="prospect-origin">'+esc(p.organization)+'</span><span class="prospect-region">'+esc(prospectMarketLabel(p).replaceAll(' · ','，'))+'</span></div></div>'+
 '<div class="prospect-contact-meta"><span>合作关系：'+esc(prospectRelationship(row))+'</span>'+
 (Number.isSafeInteger(row.replyBy)?'<span>'+esc(day(row.replyBy))+'前可回复</span>':'')+'</div>'+
 '<div class="market-sheet">'+marketPlate(product)+'<div><small>'+esc(row.isRepeat?'熟客补货':o.mode==='bulk'?'批量采购':'首批试订')+'</small><h3>'+esc(product.name)+'</h3><strong>'+esc(quotedQty)+'</strong></div></div>'+
 '<dl class="prospect-request-facts">'+fact('最迟收货',day(state.day+o.deadlineDays))+fact('付款方式',payment(o))+'</dl>'+
 '<details class="prospect-disclosure prospect-request"><summary>客户要求</summary><blockquote class="prospect-message">'+(row.promotion?esc('我是在《'+row.promotion.channelName+'》上看到你的。'+(o.mode==='bulk'?'我想按铺货量问价，先看看整批怎么报。':'先问一批试货的价格，合不合适还要看报价。'))+'<br>':'')+esc(displayProspectCopy(p.id,row.isRepeat?'reorder':'inquiry',row.opening))+(row.isRepeat&&prospectSceneLine(p.id,'repeat',null,product.id)?'<br>'+esc(prospectSceneLine(p.id,'repeat',null,product.id)):'')+'</blockquote>'+
 (row.isRepeat&&old?'<p class="market-prior"><strong>上次已结清</strong> · '+esc(old.productName||product.name)+' '+esc(pack(old.quantity,old.unit||unit))+'，成交单价 '+esc(cash(old.unitPrice))+'，'+esc(day(old.paidDay))+'收齐。这次按下面的新数量、货源和账期另算。</p>':'')+
 (q.prospectVoice?.bargain?'<blockquote class="prospect-message"><strong>'+esc(p.displayName)+'：</strong>'+esc(displayProspectCopy(p.id,'bargain',q.prospectVoice.bargain))+'</blockquote>':'')+
 '<h4>验收要求</h4><p>'+esc(product.inspection)+'</p></details>'+
 '<fieldset><legend>请哪家供货</legend>'+sourceOptions(state,c)+'</fieldset>'+
 (o.id==='concession'?'<p class="market-note">建议价按常规起报价的 95% 估算，可自行改价。</p>':'')+
 (row.options.length>1?'<details class="prospect-disclosure prospect-story-choice"'+(o.id!==row.options[0].id?' open':'')+'><summary>'+esc(row.isRepeat?'有另一种补货方案':'想换个条件谈？')+'</summary><fieldset aria-label="谈单方案">'+row.options.map(v=>
 '<button type="button" data-prospect-option="'+esc(v.id)+'" aria-pressed="'+(v.id===o.id)+'"><strong>'+esc(optionName(v.id))+'</strong><small>'+
 esc(pack(v.quantity,unit)+' · '+v.deadlineDays+' 天内交货')+'<br>'+esc(payment(v))+(v.id==='concession'?'<br>对方要求比常规方案更低的价格。':v.id==='vip-volume'?'<br>客户愿意多订，也可以照常补货。':'')+
 (Number.isSafeInteger(v.followupDays)?'<br>'+esc('结清 '+v.followupDays+' 天后可再询价'):'')+'</small></button>').join('')+'</fieldset></details>':'')+
 '<form data-prospect-form><label for="prospect-unit-price">向'+esc(p.displayName)+'报单价（元 / '+esc(unit)+'）</label><div class="market-price-row"><input type="number" id="prospect-unit-price" inputmode="numeric" min="1" max="100000" step="1" required value="'+esc(d.unitPrice)+'"><button type="submit">发送报价</button></div></form>'+
 '<p class="market-note" data-prospect-edit-hint hidden role="status">单价已改，请重新发送报价。</p><div data-prospect-terms>'+response(c)+
 '<dl class="prospect-sign-facts">'+(Number.isSafeInteger(q.netProfit)?fact(q.netProfit<0?'预计亏损':'预计净赚',cash(Math.abs(q.netProfit))):'')+
 (Number.isSafeInteger(q.deliveryDay)?(q.paymentDay===q.deliveryDay?fact('交货并收款',day(q.deliveryDay)):fact('交货',day(q.deliveryDay))+fact('收款',day(q.paymentDay))):'')+'</dl>'+
 (reason?'<p class="market-warning" role="status">'+esc(reason)+'</p>':'')+
 (q.netProfit<0?'<p class="market-warning">按这个价签，扣完货款、运费和日常开支会亏 '+esc(cash(-q.netProfit))+'。</p>':'')+
 '<details class="prospect-disclosure"><summary>收支明细</summary><dl class="market-facts">'+fact('总货款',cash(q.revenue))+fact('签约收定金',cash(q.deposit))+fact(q.paymentDay===q.deliveryDay?'验收当日收款':'到期收尾款',cash(q.balanceDue))+fact(source==='warehouse'?'库存成本（已付）':'付给货源',cash(q.goodsCost))+fact('这批运费',cash(q.freight))+fact('回款前日常开支',cash(q.operatingCost))+fact('至少要备的周转金',cash(q.cashRequired))+fact('签后手头现金',cash(q.cashAfterSigning))+fact('收齐后的本单净利',cash(q.netProfit))+fact('收齐后的可用资金',cash(q.cashAfterPayment))+'</dl></details>'+
 (asked&&q.valid?'<p class="market-note">'+(source==='warehouse'?'签约后安排出库。':'签约时支付采购款和运费。')+'</p><button type="button" class="primary" data-prospect-sign>'+(source==='warehouse'?'签约并安排出库':'签约采购')+'</button>':!asked?'<p class="prospect-sign-wait">客户接受报价后才能签约。</p>':'')+
 '</div>'+
 '</section>';
}
export function prospectInboxView(state,ui={}) {
 if(!inDraft(state))return '';
 const c=draftContext(state,ui);
 if(c)return quote(state,c);
 return (ui.prospectId?'<p role="status">这封来信目前不能报价。<button type="button" class="quiet" data-prospect-back>回到采购台</button></p>':'')+inbox(prospectInbox(state),ui,state.day);
}
export function prospectReceiptContact(state) {
 const a=state?.market?.active,status=state?.market?.status;
 if(!a?.customerId||!a.prospectVoice||!['transit','receivable','paid'].includes(status))return '';
 const p=prospectContentById(a.customerId)||{id:a.customerId,displayName:a.buyer,organization:''};
 // The delivery line is an instruction for the carrier, so show it before
 // handover, not after the shipment has already been signed for or paid.
 const phrases=status==='paid'?[displayProspectCopy(a.customerId,'settlement',a.prospectVoice.settlement),...(!a.prospectRepeat?[prospectSceneLine(a.customerId,'paid',a.optionId,a.productId)]:[])]:status==='transit'?[displayProspectCopy(a.customerId,'delivery',a.prospectVoice.delivery)]:[];
 const stage=status==='paid'?'已结清':status==='receivable'?'已验收':'已签约';
 return '<aside class="prospect-panel prospect-receipt"><div class="prospect-byline">'+face(p)+'<div><small>'+esc(a.prospectRepeat?'熟客补货':'首单合作')+' · '+stage+'</small><strong>'+esc(p.displayName)+'</strong><span>'+esc(p.organization)+'</span></div></div>'+
 phrases.filter(Boolean).map(s=>'<p class="prospect-message">'+esc(s)+'</p>').join('')+prospectComicView(a,status)+'</aside>';
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
 const input=root.querySelector('#prospect-unit-price');
 input?.addEventListener('input',()=>{
  ui.prospectPrice=input.value===''?'':Number(input.value);ui.prospectAsked=null;
  const terms=root.querySelector('[data-prospect-terms]'),hint=root.querySelector('[data-prospect-edit-hint]'),sign=root.querySelector('[data-prospect-sign]');
  if(terms)terms.hidden=true;if(hint)hint.hidden=false;if(sign)sign.disabled=true;
 });
 root.querySelector('[data-prospect-form]')?.addEventListener('submit',e=>{
  e.preventDefault();if(!input||!Number.isSafeInteger(Number(input.value))||Number(input.value)<1||Number(input.value)>100000)return;
  ui.prospectPrice=Number(input.value);const c=draftContext(state,ui);if(c)change({prospectAsked:JSON.stringify(c.draft)},'#prospect-unit-price');
 });
 root.querySelector('[data-prospect-dismiss]')?.addEventListener('click',()=>{
  const c=draftContext(state,ui);if(!c)return;
  delete ui.prospectId;delete ui.prospectAsked;
  dispatch({type:'DISMISS_PROSPECT_V1',customerId:c.row.person.id,checkedDay:state.day});
 });
 root.querySelector('[data-prospect-sign]')?.addEventListener('click',()=>{
  const c=draftContext(state,ui);if(!c||!c.asked||!c.q.valid)return;
  const {optionId,...fields}=c.draft;
  if(optionId==='vip-volume') dispatch({type:'SIGN_PROSPECT_VIP_LOT_V1',...fields});
  else dispatch({type:'SIGN_PROSPECT_LOT_V1',...c.draft});
 });
}
