import {previewWarehouseIssue} from './deal-room-warehouse.js';
import {prospectInbox,prospectContentById} from './deal-room-prospects.js';
import {previewMarket} from './deal-room-market.js';
import {marketPlate} from './deal-room-market-art.js';
import {prospectAvatar} from './deal-room-prospect-avatar.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cash = n => Number.isSafeInteger(n) ? '¥' + n.toLocaleString('zh-CN') : '—';
const day = n => Number.isSafeInteger(n) ? '第 ' + n + ' 天' : '待确认';
const fact = (label,value) => '<div><dt>'+esc(label)+'</dt><dd>'+esc(value)+'</dd></div>';
const optionName = id => ({quote:'按常规条件报价',concession:'让价争取早补货',reorder:'给熟客报补货价'})[id] || '按来信报价';
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
 return '<button type="button" class="prospect-letter" data-prospect-open="'+esc(p.id)+'">'+face(p)+'<span><small>'+esc(isRepeat?'熟客补货':'初次来信')+' · '+esc(p.market)+'</small><strong>'+esc(p.displayName)+' · '+esc(product.name)+'</strong><span>'+esc(p.organization)+'</span><small>'+esc(Number.isSafeInteger(row.replyBy)?'最晚'+day(row.replyBy)+'回复':'查看这次补货条件')+' →</small></span></button>';
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
function draftContext(state,ui) {
 if(!inDraft(state)||!ui.prospectId)return null;
 const row=prospectInbox(state).find(x=>x.person.id===ui.prospectId);
 if(!row)return null;
 const o=row.options.find(x=>x.id===ui.prospectOption)||row.options[0];
 const keys=sourceKeys(row.product,state,o?.quantity);
 if(!o||!keys.length)return null;
 const source=keys.includes(ui.prospectSource)?ui.prospectSource:(row.isRepeat&&keys.includes('factory')?'factory':keys[0]);
 const fields={customerId:row.person.id,optionId:o.id,source};
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
 return {row,o,source,draft,q:previewMarket(state,draft),asked:ui.prospectAsked===JSON.stringify(draft)};
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
function response(c) {
 if(!c.asked)return '';
 const name=c.row.person.displayName;
 if(overBudget(c))return '<p class="market-response" role="status"><strong>'+esc(name)+'：</strong>这个单价我这边接不了。你能再报一个价吗？</p>';
 if(!c.q?.accepted)return '';
 return '<p class="market-response" role="status"><strong>'+esc(name)+'：</strong>'+esc(cash(c.draft.unitPrice)+'/'+c.row.product.unit+' 可以，照这份数量和交期来。')+'</p>';
}
function quote(state,c) {
 const {row,o,draft:d,source,q,asked}=c,{person:p,product}=row,unit=product.unit;
 const old=row.previous;
 const quotedQty=pack(o.quantity,unit),reason=overBudget(c)?'':(q.reason||'');
 return '<section class="market-quote prospect-panel" aria-label="客户来信报价"><button type="button" class="quiet" data-prospect-back>← 回到客户来信</button>'+
 '<div class="prospect-byline">'+face(p)+'<div><small>'+esc(row.isRepeat?'熟客补货':'初次来信')+' · '+esc(p.market)+'</small><h3 tabindex="-1" data-prospect-heading>'+esc(p.displayName)+'</h3><span>'+esc(p.organization)+'</span></div></div>'+
 (Number.isSafeInteger(row.replyBy)?'<p class="prospect-date">最晚在'+esc(day(row.replyBy))+'回复。</p>':'')+
 '<blockquote class="prospect-message">'+esc(row.opening)+'</blockquote>'+
 (row.isRepeat&&old?'<p class="market-prior"><strong>上次已结清</strong> · '+esc(old.productName||product.name)+' '+esc(pack(old.quantity,old.unit||unit))+'，成交单价 '+esc(cash(old.unitPrice))+'，'+esc(day(old.paidDay))+'收齐。这次按下面的新数量、货源和账期另算。</p>':'')+
 '<div class="market-sheet">'+marketPlate(product)+'<div><small>'+esc(product.category)+'</small><h3>'+esc(product.name)+'</h3><p>'+esc(product.brief)+'</p></div></div>'+
 '<p class="market-inspection"><strong>验收约定</strong> '+esc(product.inspection)+'</p>'+
 '<fieldset><legend>'+esc(row.isRepeat?'这次补货怎么买':'第一单，怎么和客户谈？')+'</legend>'+row.options.map(v=>
 '<button type="button" data-prospect-option="'+esc(v.id)+'" aria-pressed="'+(v.id===o.id)+'"><strong>'+esc(optionName(v.id))+'</strong><small>'+
 esc(pack(v.quantity,unit)+' · '+v.deadlineDays+' 天内交货')+'<br>'+esc(payment(v))+(v.id==='concession'?'<br>对方要求比常规方案更低的价格。':'')+
 (Number.isSafeInteger(v.followupDays)?'<br>'+esc('结清 '+v.followupDays+' 天后可再询价'):'')+'</small></button>').join('')+'</fieldset>'+
 (q.prospectVoice?.bargain?'<blockquote class="prospect-message"><strong>'+esc(p.displayName)+'：</strong>'+esc(q.prospectVoice.bargain)+'</blockquote>':'')+
 '<fieldset><legend>选哪种货源</legend>'+sourceKeys(product,state,o.quantity).map(key=>{const f=key==='warehouse'?{name:'已到仓货物',days:1,minQuantity:1}:product.sources[key];return '<button type="button" data-prospect-source="'+key+'" aria-pressed="'+(source===key)+'"><strong>'+sourceName(key)+'</strong><small>'+esc(f.name)+'<br>'+esc(cash(f.unitCost)+'/'+unit+' · '+pack(f.minQuantity,unit)+'起订 · '+f.days+' 天到货')+'</small></button>';}).join('')+'</fieldset>'+
 '<p class="market-note">'+(o.id==='concession'?'起报价按本批常规起价的九五折估算，向下取整；你可以改价。':'起报价按本批成本估算，你可以改价。')+'</p>'+
 '<form data-prospect-form><label for="prospect-unit-price">向'+esc(p.displayName)+'报单价（游戏人民币 / '+esc(unit)+'）</label><div class="market-price-row"><input type="number" id="prospect-unit-price" inputmode="numeric" min="1" max="100000" step="1" required value="'+esc(d.unitPrice)+'"><button type="submit">问客户这个价</button></div></form>'+
 '<p class="market-note" data-prospect-edit-hint hidden role="status">单价已改。请重新问价，旧条款不能签约。</p><div data-prospect-terms>'+response(c)+
 '<p class="prospect-terms"><strong>'+esc(quotedQty)+'</strong> · '+esc(payment(o))+'。'+esc('买方最晚'+day(q.deadlineDay)+'收货。')+'</p>'+
 '<dl class="market-facts">'+fact('总货款',cash(q.revenue))+fact('签约收定金',cash(q.deposit))+fact(q.paymentDay===q.deliveryDay?'验收当日收款':'到期收尾款',cash(q.balanceDue))+fact(source==='warehouse'?'库存成本（已付）':'付给货源',cash(q.goodsCost))+fact('这批运费',cash(q.freight))+fact('回款前日常开支',cash(q.operatingCost))+fact('至少要备的周转金',cash(q.cashRequired))+fact('签后手头现金',cash(q.cashAfterSigning))+fact('收齐后的本单净利',cash(q.netProfit))+'</dl>'+
 (Number.isSafeInteger(q.deliveryDay)?'<p>'+esc(day(q.deliveryDay)+'交货；'+day(q.paymentDay)+'收齐，届时手头现金 '+cash(q.cashAfterPayment)+'。')+'</p>':'')+
 (reason?'<p class="market-warning" role="status">'+esc(reason)+'</p>':'')+
 (q.netProfit<0?'<p class="market-warning">按这个价签，扣完货款、运费和日常开支会亏 '+esc(cash(-q.netProfit))+'。</p>':'')+
 '<button type="button" class="primary" data-prospect-sign '+(q.valid&&asked?'':'disabled')+'>确认条款，签约采购</button><p class="market-note">'+(asked?'签约后按上面的条款实际收定金、付款备货。':'先问客户这个价，对方接受后才能签约。')+'</p></div></section>';
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
 const phrases=status==='paid'?[a.prospectVoice.settlement]:status==='transit'?[a.prospectVoice.delivery]:[];
 const stage=status==='paid'?'已结清':status==='receivable'?'已验收':'已签约';
 return '<aside class="prospect-panel prospect-receipt"><div class="prospect-byline">'+face(p)+'<div><small>'+esc(a.prospectRepeat?'熟客补货':'首单合作')+' · '+stage+'</small><strong>'+esc(p.displayName)+'</strong><span>'+esc(p.organization)+'</span></div></div>'+
 phrases.filter(Boolean).map(s=>'<p class="prospect-message">'+esc(s)+'</p>').join('')+'</aside>';
}
export function bindProspectInbox(root,state,ui,rerender,dispatch) {
 if(!inDraft(state))return;
 const change=(fields,target)=>{Object.assign(ui,fields);rerender();root.querySelector(target)?.focus?.();};
 const bindMany=(sel,fn)=>root.querySelectorAll(sel).forEach(b=>b.addEventListener('click',()=>fn(b)));
 bindMany('[data-prospect-open]',b=>change({prospectId:b.dataset.prospectOpen,prospectOption:undefined,prospectSource:undefined,prospectPrice:undefined,prospectAsked:null},'[data-prospect-heading]'));
 bindMany('[data-prospect-page]',b=>change({prospectPage:Number(b.dataset.prospectPage)},'#prospect-inbox-title'));
 bindMany('[data-prospect-filter]',b=>change({prospectFilter:b.dataset.prospectFilter,prospectPage:0},'#prospect-inbox-title'));
 root.querySelector('[data-prospect-back]')?.addEventListener('click',()=>{
  const id=ui.prospectId;delete ui.prospectId;delete ui.prospectAsked;rerender();
  const back=[...root.querySelectorAll('[data-prospect-open]')].find(b=>b.dataset.prospectOpen===id);(back||root.querySelector('#prospect-inbox-title'))?.focus?.();
 });
 bindMany('[data-prospect-option]',b=>change({prospectOption:b.dataset.prospectOption,prospectPrice:undefined,prospectAsked:null},'[data-prospect-option][aria-pressed="true"]'));
 bindMany('[data-prospect-source]',b=>change({prospectSource:b.dataset.prospectSource,prospectPrice:undefined,prospectAsked:null},'[data-prospect-source][aria-pressed="true"]'));
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
 root.querySelector('[data-prospect-sign]')?.addEventListener('click',()=>{
  const c=draftContext(state,ui);if(!c||!c.asked||!c.q.valid)return;
  dispatch({type:'SIGN_PROSPECT_LOT_V1',...c.draft});
 });
}
