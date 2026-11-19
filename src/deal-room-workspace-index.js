import {prospectDisplayText} from './deal-room-prospect-locale.js';
import {prospectInbox,prospectIdValid} from './deal-room-prospects.js';
import {marketAvailable,marketBook} from './deal-room-market.js';
import {openFirstBuyers} from './deal-room-engine.js';
import {prospectAvatar} from './deal-room-prospect-avatar.js';
const ixEsc=x=>String(prospectDisplayText(x)??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ixMoney=x=>Number.isSafeInteger(x)?'¥'+x.toLocaleString('zh-CN'):'—';
import {MARKET_PRODUCTS} from './deal-room-market-data.js';
import {marketPlate} from './deal-room-market-art.js';
function receiptImage(row){
 const product=MARKET_PRODUCTS.find(p=>p.id===row.productId||p.name===row.name);
 if(product?.id==='carafe')return '<img class="ws-receipt-image" alt="" src="assets/deal-original-order-carafe.webp">';
 if(product)return marketPlate(product);
 const pos={mira:0,samir:50,ines:100}[row.clientId];
 return pos===undefined?'':'<span class="ws-receipt-image ws-story-product" aria-hidden="true" style="--ws-story-pos:'+pos+'%"></span>';
}
const inboxHead=()=>'<section class="ws-office ws-index ws-mail-ledger" aria-label="收件箱"><header><h2 id="ws-inbox-title">客户询盘</h2></header>';
const mailAdvisers=new Set(['fang','liang','tao','xu']);
function inboxAdvice(id,text){
 if(!mailAdvisers.has(id))return '';
 return '<aside class="ws-mail-advice" aria-label="助理建议"><h3>助理建议</h3><div><i aria-hidden="true" class="adviser-face adviser-'+id+'"></i><p>'+ixEsc(text)+'</p></div></aside>';
}
const mailRow=(attr,face,name,item,last)=>'<button type="button" class="ws-contact" '+attr+'><span class="ws-contact-avatar">'+face+'<i role="img" aria-label="未处理" class="ws-contact-unread"></i></span><span><strong>'+ixEsc(name)+'</strong><span>'+ixEsc(item)+'</span><small>'+ixEsc(last)+'</small></span><b>待报价</b></button>';
const opening={
 mira:['荷兰','先订一批在一家店试卖，也考虑三家店一起上。',0],
 samir:['阿联酋','新店第 7 天开门，现货或定制都想看看。',50],
 ines:['葡萄牙','第 11 天换季布置餐桌，也想了解小批试卖。',100]
};
export function workspaceOpeningInbox(s,adviserId=null){
 const rows=openFirstBuyers(s);
 return inboxHead(s)+rows.map(row=>mailRow('data-first-buyer="'+ixEsc(row.id)+'"','<span class="ws-first-face" aria-hidden="true" style="--face-x:'+opening[row.id][2]+'%"></span>',row.name.split(' · ')[0],row.product,'第 '+s.day+' 天来信')).join('')+'</section>'+inboxAdvice(adviserId,'先挑一封看客户要什么、什么时候要。打开来信不会签单。');
}
export function workspaceInboxIndex(s,adviserId=null){
 const rows=prospectInbox(s),canOpen=marketAvailable(s)||(s.phase==='market'&&s.market?.status==='draft');
 const ranked=[...rows].sort((a,b)=>(a.replyBy??Infinity)-(b.replyBy??Infinity)),first=ranked[0];
 const hint=first?(Number.isSafeInteger(first.replyBy)?first.person.displayName+' 的来信第 '+first.replyBy+' 天截止，可以先看。':'先看看 '+first.person.displayName+' 的补货数量，再决定要不要报价。'):(canOpen?'暂时没有待回复的客户来信。':'手上的合同还有事要处理，先去订单看看。');
 const list=ranked.map(x=>mailRow('data-workspace-inbox-desk="'+ixEsc(x.person.id)+'"',prospectAvatar(x.person.id),x.person.displayName,x.product.name,Number.isSafeInteger(x.replyBy)?'第 '+x.replyBy+' 天截止':x.previous?'熟客补货':'新来信')).join('')||'<p class="ws-mail-empty">没有待回复的来信。</p>';
 return inboxHead(s)+list+'</section>'+inboxAdvice(adviserId,hint);
}
function orderTrack(stops){
 return '<ol class="ws-order-timeline">'+stops.filter(([,n])=>Number.isSafeInteger(n)).map(([label,n])=>'<li><b>'+label+'</b><span>第 '+n+' 天</span></li>').join('')+'</ol>';
}
function orderLead(product,buyer,label,days,action,text){
 return '<article class="ws-order-lead"><div><span class="ws-order-state">'+label+'</span><h3>'+ixEsc(product)+'</h3><p>'+ixEsc(buyer)+'</p></div>'+orderTrack(days)+'<button type="button" '+action+'>'+text+' <span aria-hidden="true">›</span></button></article>';
}
const orderHeading='<header><h2 id="ws-orders-title" tabindex="-1">订单与回款</h2></header>';
function receipts(s,active=false){
 const book=marketBook(s);
 const old=(s.contracts??[]).filter(x=>x?.status==='paid').map(x=>({...x,name:x.product,buyer:x.clientName,day:x.paidDay??x.paymentDay,cash:x.revenue}));
 const newRows=book.receipts.map(x=>({...x,name:x.productName,day:x.paidDay,cash:x.received}));
 const rows=[...old,...newRows].sort((a,b)=>(b.day||0)-(a.day||0)).slice(0,12);
 if(!rows.length)return active?'':'<p class="ws-receipt-empty">还没有已收齐的订单。</p><button class="ws-summary-link" type="button" data-workspace-open="inbox">去询盘</button>';
 return '<h3 class="ws-receipt-title">最近回款</h3>'+rows.map(x=>'<details><summary>'+receiptImage(x)+'<span><strong>'+ixEsc(x.name)+'</strong><small>'+ixEsc(x.buyer)+'</small></span><span><b>'+ixMoney(x.cash)+'</b><small>第 '+ixEsc(x.day)+' 天收齐</small></span></summary>'+orderTrack([['签约',x.signedDay],['交货',x.deliveryDay],['收齐',x.day]])+'</details>').join('')+'<footer class="ws-profit-line"><span>累计净利　<strong>'+ixMoney(old.reduce((sum,r)=>sum+(Number.isSafeInteger(r.netProfit)?r.netProfit:0),book.net))+'</strong></span><button class="ws-summary-link" type="button" data-workspace-open="office">查看经营小结 ›</button></footer>';
}
export function workspaceActiveOrders(s){
 const rows=(s.contracts||[]).filter(x=>x.status==='fulfilling');
 return '<section class="ws-office ws-index ws-orders ws-receipts">'+orderHeading+rows.map(x=>orderLead(x.product+' · '+x.quantity+' 件',x.clientName,'待交货',[['签约',x.signedDay],['交货',x.deliveryDay],['回款',x.paymentDay]],'data-workspace-order-detail','查看交货安排')).join('')+receipts(s,true)+'</section>';
}
export function workspaceOrdersIndex(s){
 const productDesk=marketAvailable(s)||(s.phase==='market'&&s.market?.status==='draft')?'<button class="ws-products-link" type="button" data-workspace-products>商品与项目 <span aria-hidden="true">›</span></button>':'';
 return '<section class="ws-office ws-index ws-orders ws-receipts" aria-label="近期已收齐订单">'+orderHeading+productDesk+receipts(s)+'</section>';
}
export function workspaceCurrentMarketOrder(a,status,s){
 const stage=String(status).replace(/^legacy-/,'');
 const label={paid:'已收齐',preparing:'待出运',transit:'待交货',receivable:'待回款'}[stage]||'当前订单';
 return '<section class="ws-office ws-index ws-orders ws-receipts">'+orderHeading+orderLead(a.productName,a.buyer,label,[['签约',a.signedDay],['交货',a.deliveryDay],['回款',a.paymentDay]],'data-workspace-current-market-order',stage==='transit'?'查看交货安排':'查看订单详情')+(s?receipts(s,true):'')+'</section>';
}

// Task links carry a customer, not an order action. Validate against live mail.
export function workspaceInquiryFromRef(s,ref){
 const id=typeof ref==='string'&&ref.startsWith('prospect:')?ref.slice(9):'';
 return prospectIdValid(id)&&prospectInbox(s).some(row=>row.person.id===id)?id:null;
}
