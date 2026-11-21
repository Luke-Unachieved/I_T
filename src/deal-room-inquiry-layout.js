const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const inquirySpeech = (line, {reply=false,extra=''}={}) => line
 ? '<blockquote class="inquiry-speech'+(reply?' is-reply':' opening-quote-chat')+'"'+(reply?' role="status" tabindex="-1" data-prospect-reply':'')+'><p>'+esc(line)+'</p>'+(extra?'<small>'+esc(extra)+'</small>':'')+'</blockquote>' : '';

// Opening artwork is not a delivery/settlement reward. An unillustrated letter
// keeps its own words; never substitute another buyer's or another product's art.
const openingComics = new Map([
 ['opening:mira', ['便携台灯','mira','米拉在橱窗试亮样灯，接着用手机把同一盏灯的照片发给分店。']],
 ['opening:samir',['不锈钢保温杯','samir','新店柜台前，萨米尔拿起保温杯，比较无印字现货和定制纸套的样稿。']],
 ['opening:ines', ['棉麻桌布','ines','伊内斯展开浅色桌布，又翻开布样册，比较试卖和整季备货。']],
 ['prospect:001', ['tray','', '早餐过后，伊娃·迈耶尔在腾空的餐台上检查现用的浅口托盘，然后放下同一只托盘，拿起手机询价。','assets/deal-client-comic-001-first-inquiry.webp']],
 ['prospect:006', ['tray','lu-heng','会展餐饮部的采购发现餐盘分散在几个领用台，又把餐盘归拢，核对要订的箱数。']]
]);
export function inquiryOpening(line,{kind,customerId,product}={}){
 const speech=inquirySpeech(line),comic=openingComics.get(kind+':'+customerId);
 if(!speech||!comic||comic[0]!==product)return speech;
 const asset=comic[3]??'assets/deal-inquiry-'+comic[1]+'.webp';
 return '<figure class="inquiry-comic"><img src="'+asset+'" width="1440" height="720" decoding="async" alt="'+esc(comic[2])+'"><figcaption>'+speech+'</figcaption></figure>';
}

export const inquiryFacts = (facts, kind='') => '<dl class="inquiry-facts'+(kind?' '+kind:'')+'">'+facts.filter(([,value])=>value!==''&&value!=null).map(([label,value])=>'<div><dt>'+esc(label)+'</dt><dd>'+esc(value)+'</dd></div>').join('')+'</dl>';
// A native button may only contain phrasing content. Keep facts in spans here.
export const inquiryOption = (title,facts,{hook,value,active=false}={}) =>
 '<button type="button" class="inquiry-option" '+hook+'="'+esc(value)+'" aria-pressed="'+active+'"><strong>'+esc(title)+'</strong><span class="inquiry-option-facts">'+facts.filter(([,value])=>value!==''&&value!=null).map(([label,value])=>'<span><small>'+esc(label)+'</small><b>'+esc(value)+'</b></span>').join('')+'</span></button>';
export const inquiryActions = ({backHook,backLabel='不接这单',signHook='',signValue='',canSign=false}) =>
 '<div class="inquiry-actions"><button type="button" class="quiet" '+backHook+'>'+esc(backLabel)+'</button><button type="button" class="primary"'+(signHook?' '+signHook+(signValue?'="'+esc(signValue)+'"':''):'')+(canSign?'':' disabled')+'>签约</button></div>';
export const inquiryDetails = (label,html,{kind=''}={}) => '<details class="inquiry-details'+(kind?' '+kind:'')+'"><summary>'+esc(label)+'</summary>'+html+'</details>';

// Keep the keyboard on the result rather than reopening the price input.
export function revealQuoteReply(root,selector){
 const target=root.querySelector(selector);
 target?.focus?.({preventScroll:true});
 target?.scrollIntoView?.({block:'nearest',inline:'nearest',behavior:'auto'});
}
