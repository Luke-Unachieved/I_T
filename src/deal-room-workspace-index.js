import {netProfitAmount} from './deal-room-net-profit.js';
import {openingDialogueQuote} from './deal-room-opening-dialogue.js';
import {adviserInboxAdvice} from './deal-room-adviser.js?v=34';
import {orderReadListStatus} from './deal-room-order-read.js';
import {repeatParallelScope,repeatActiveOrders} from './deal-room-repeat-calendar.js';
import {prospectDisplayText} from './deal-room-prospect-locale.js';
import {prospectInbox,prospectIdValid} from './deal-room-prospects.js';
import {marketAvailable,marketBook,parkedMarketOrders,canParkMarketOrder} from './deal-room-market.js';
import {openingMarketOrders,openingMarketProjection} from './deal-room-opening-market.js';
import {openingOrders} from './deal-room-opening-calendar.js';
import {openFirstBuyers,familiarBuyers,CURATION_PRODUCTS} from './deal-room-engine.js';
import {COLLECTION_STYLES} from './deal-room-collection.js';
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
const inboxHead=()=>'<section class="ws-office ws-index ws-mail-ledger" aria-labelledby="ws-inbox-title"><header><h2 id="ws-inbox-title" tabindex="-1">收件箱</h2></header><div class="ws-mail-rows">';
const inboxFooter='<div class="ws-mail-footer"><button type="button" data-workspace-open="office">回办公室</button></div>';
const mailAdvisers=new Set(['fang','liang','tao','xu']);
function inboxAdvice(id,text){
 if(!mailAdvisers.has(id)||!text)return '';
 return '<aside class="ws-mail-advice" aria-label="助理建议"><h3>助理建议</h3><div><i aria-hidden="true" class="adviser-face adviser-'+id+'"></i><p>'+ixEsc(openingDialogueQuote(text))+'</p></div></aside>';
}
const mailRow=(attr,face,name,item,last)=>'<button type="button" class="ws-contact" '+attr+'><span class="ws-contact-avatar">'+face+'<i class="ws-contact-unread" role="img" aria-label="未处理，待报价" title="未处理"></i></span><span><strong>'+ixEsc(name)+'</strong><span>'+ixEsc(item)+'</span><small>'+ixEsc(last)+'</small></span></button>';
const opening={
 mira:['荷兰','先订一批在一家店试卖，也考虑三家店一起上。',0],
 samir:['阿联酋','新店第 7 天开门，现货或定制都想看看。',50],
 ines:['葡萄牙','第 11 天换季布置餐桌，也想了解小批试卖。',100]
};
export function workspaceOpeningInbox(s,adviserId=null){
 const rows=openFirstBuyers(s), leads=prospectInbox(openingMarketProjection(s,0));
 const leadNotes=leads.map(row=>mailRow('data-opening-promotion-letter="'+ixEsc(row.person.id)+'"',prospectAvatar(row.person.id),row.person.displayName,row.product.name,'推广来信')).join('');
 return inboxHead()+rows.map(row=>mailRow('data-first-buyer="'+ixEsc(row.id)+'"','<span class="ws-first-face" aria-hidden="true" style="--face-x:'+opening[row.id][2]+'%"></span>',row.name.split(' · ')[0],row.product,'第 '+s.day+' 天来信')).join('')+leadNotes+'</div></section>'+inboxAdvice(adviserId,adviserInboxAdvice(s,[...rows,...leads]))+inboxFooter;
}
export function workspaceFamiliarInbox(s,adviserId=null){
 const rows=familiarBuyers(s),leads=prospectInbox(openingMarketProjection(s,0));
 const marketLetters=leads.map(row=>mailRow('data-opening-promotion-letter="'+ixEsc(row.person.id)+'"',prospectAvatar(row.person.id),row.person.displayName,row.product.name,row.promotion?'推广来信':'新询盘')).join('');
 return inboxHead()+rows.map(row=>mailRow('data-familiar-buyer="'+ixEsc(row.id)+'"','<span class="ws-first-face" aria-hidden="true" style="--face-x:'+opening[row.id][2]+'%"></span>',row.name.split(' · ')[0],row.product,'老客户补货')).join('')+marketLetters+
 (rows.length||marketLetters?'':'<p class="ws-mail-empty">暂时没有新询盘。</p>')+'</div></section>'+inboxAdvice(adviserId,adviserInboxAdvice(s,[...rows,...leads]))+inboxFooter;
}
export function workspaceInboxIndex(s,adviserId=null){
 const live=canParkMarketOrder(s)||s.phase==='market'&&s.market?.status==='paid';
 const rows=prospectInbox(s,{whileActive:live});
 const ranked=[...rows].sort((a,b)=>(a.replyBy??Infinity)-(b.replyBy??Infinity));
 const hint=adviserInboxAdvice(s,ranked);
 const list=ranked.map(x=>mailRow('data-workspace-inbox-desk="'+ixEsc(x.person.id)+'"',prospectAvatar(x.person.id),x.person.displayName,x.product.name,Number.isSafeInteger(x.replyBy)?'第 '+x.replyBy+' 天截止':x.previous?'熟客补货':'新来信')).join('')||'<p class="ws-mail-empty">没有待回复的来信。</p>';
 return inboxHead()+list+'</div></section>'+inboxAdvice(adviserId,hint)+inboxFooter;
}
function orderTrack(stops){
 return '<ol class="ws-order-timeline">'+stops.filter(([,n])=>Number.isSafeInteger(n)).map(([label,n])=>'<li><b>'+label+'</b><span>第 '+n+' 天</span></li>').join('')+'</ol>';
}
function orderLead(product,buyer,label,days,action,text){
 return '<article class="ws-order-lead"><div><span class="ws-order-state">'+label+'</span><h3>'+ixEsc(product)+'</h3><p>'+ixEsc(buyer)+'</p></div>'+orderTrack(days)+'<button type="button" class="ws-control ws-control--secondary" '+action+'>'+text+' <span aria-hidden="true">›</span></button></article>';
}
const paidOnFile=(order,day)=>order?.status==='paid'&&Number.isSafeInteger(order.paymentDay)&&order.paymentDay<=day;
const comboNames=(products,lampVersion)=>(products??[]).map(id=>id==='mira'&&lampVersion==='developed'
 ?'三档调光台灯':CURATION_PRODUCTS.find(p=>p.id===id)?.name??id);
function curationReceipts(s){
 // The paid case is archived by FULFIL_CURATION; the active curation is a copy of the same order.
 return (s.curationHistory??[]).filter(c=>paidOnFile(c,s.day))
  .map(c=>{
   const components=c.productNames??comboNames(c.products,c.lampVersion);
   return {...c,buyer:(c.giftAllowed?'Élise':'Adrian')+' · '+c.buyer,clientId:c.anchor,name:'组合订单，'+c.quantity+' 套',combo:components.join('、'),
    day:c.paymentDay,cash:c.revenue,terms:c.packaging==='gift'?'礼盒':'常规包装'};
  });
}
function storeReceipts(s){
 // The active account may be the same paid order as one of these batches.
 return (s.accountHistory??[]).filter(o=>paidOnFile(o,s.day)).map(o=>({
  ...o,clientId:o.products?.[0],name:(o.expansion?'新增 ':'')+o.stores+' 家门店采购，'+o.sets+' 套',
  combo:comboNames(o.products,o.lampVersion).join('、'),terms:o.seriesSource?.label,
  day:o.paymentDay,cash:o.revenue
 }));
}
function seriesReceipts(s){
 const c=s.collection;
 // Production, deposits and launch handovers are not additional receipts.
 return (c?.orders??[]).filter(o=>paidOnFile(o,s.day)).map(o=>({
  ...o,clientId:c.products?.[0],name:(o.buyerId==='northline-private'?'贴牌系列':'系列采购')+'，'+o.sets+' 套',
  combo:comboNames(c.products,c.lampVersion).join('、'),terms:COLLECTION_STYLES[o.style||c.style],
  day:o.paymentDay,cash:o.revenue
 }));
}
const orderHeading='<header><h2 id="ws-orders-title" tabindex="-1">订单与回款</h2></header>';
function receipts(s,active=false,expand=false){
 const book=marketBook(s);
 const old=(s.contracts??[]).filter(x=>x?.status==='paid').map(x=>({...x,name:x.product,buyer:x.clientName,day:x.paidDay??x.paymentDay,cash:x.revenue}));
 const newRows=book.receipts.map(x=>({...x,name:x.productName,day:x.paidDay,cash:x.received}));
 const cases=curationReceipts(s);
 const stores=storeReceipts(s),series=seriesReceipts(s);
 const scope=stores.length||series.length?['单品订单','选品',...(stores.length?['连锁采购']:[]),...(series.length?['系列订单']:[])].join('、'):'单品订单与选品';
 const net=[...old,...cases,...stores,...series].reduce((sum,r)=>sum+(Number.isSafeInteger(r.netProfit)?r.netProfit:0),book.net);
 const rows=[...old,...newRows,...cases,...stores,...series].sort((a,b)=>(b.day||0)-(a.day||0)).slice(0,12);
 if(!rows.length)return active?'':'<p class="ws-receipt-empty">还没有已收齐的订单。</p><button class="ws-summary-link" type="button" data-workspace-open="inbox">去询盘</button>';
 return '<details class="ws-receipt-archive"'+(expand?' open':'')+'><summary>最近回款</summary>'+rows.map(x=>'<details><summary>'+receiptImage(x)+'<span><strong>'+ixEsc(x.name)+'</strong><small>'+ixEsc(x.buyer)+'</small></span><span class="ws-receipt-cash"><b>'+ixMoney(x.cash)+'</b><small>第 '+ixEsc(x.day)+' 天收齐</small></span></summary>'+(x.combo?'<p>'+[ixEsc(x.combo),ixEsc(x.terms),'本单净利 '+netProfitAmount(x.netProfit)].filter(Boolean).join('。')+'。</p>':'')+(Number.isSafeInteger(x.signedDay)||Number.isSafeInteger(x.deliveryDay)?orderTrack([['签约',x.signedDay],['交货',x.deliveryDay],['收齐',x.day]]):'')+'</details>').join('')+'<footer class="ws-profit-line"><span aria-label="'+ixEsc(scope)+'的累计净利">累计净利　<strong>'+netProfitAmount(net)+'</strong></span></footer></details><nav class="ws-orders-shortcuts" aria-label="工作室快捷入口"><button type="button" data-workspace-open="office">回办公室 <span aria-hidden="true">›</span></button></nav>';
}
export function workspaceActiveOrders(s){
 const rows=(s.contracts||[]).filter(x=>['fulfilling','receivable'].includes(x.status));
 const promoRows=openingMarketOrders(s).map(o=>orderLead(o.productName,o.buyer,orderReadListStatus(o,o.status,s.day).label,[['签约',o.signedDay],['交货',o.deliveryDay],['回款',o.paymentDay]],
  'data-opening-market-order="'+(o===s.openingMarket?.market?.active?'current':ixEsc(o.queueId))+'"','查看订单详情')).join('');
 return '<section class="ws-office ws-index ws-orders ws-receipts" data-workspace-order-list>'+orderHeading+rows.map(x=>orderLead(x.product,x.clientName,orderReadListStatus(x,x.status,s.day).label,[['签约',x.signedDay],['交货',x.deliveryDay],['回款',x.paymentDay]],'data-workspace-order-detail="'+ixEsc(x.clientId)+'"','查看订单详情')).join('')+promoRows+(s.openingParallel&&openingOrders(s).length===3&&!rows.length?'<button class="primary" type="button" data-finish-opening>回工作室，看看新机会</button>':'')+(openFirstBuyers(s).length||familiarBuyers(s).length?'<button type="button" class="ws-summary-link" data-workspace-open="inbox">去收件箱看其他询盘</button>':'')+(repeatParallelScope(s)&&s.phase==='paid'&&!repeatActiveOrders(s).length?'<button class="primary" type="button" data-finish-familiar>继续看熟客询盘</button>':'')+receipts(s,true)+'</section>';
}
export function workspaceOrdersIndex(s,{expandReceipts=false}={}){
 const productDesk=marketAvailable(s)||(s.phase==='market'&&s.market?.status==='draft')?'<button class="ws-products-link" type="button" data-workspace-products>商品与项目 <span aria-hidden="true">›</span></button>':'';
 return '<section class="ws-office ws-index ws-orders ws-receipts" data-workspace-order-list aria-label="近期已收齐订单">'+orderHeading+productDesk+receipts(s,false,expandReceipts)+'</section>';
}
function queuedMarketCards(s){
 return parkedMarketOrders(s).map(o=>orderLead(o.productName,o.buyer,orderReadListStatus(o,o.status,s.day).label,[['签约',o.signedDay],['交货',o.deliveryDay],['回款',o.paymentDay]],'data-workspace-queued-order="'+ixEsc(o.queueId)+'"','查看订单详情')).join('');
}
export function workspaceMarketQueue(s){
 return '<section class="ws-office ws-index ws-orders ws-receipts" data-workspace-order-list>'+orderHeading+queuedMarketCards(s)+'<button type="button" data-workspace-products>商品与项目 ›</button>'+receipts(s,true)+'</section>';
}
export function workspaceCurrentMarketOrder(a,status,s){
 const stage=String(status).replace(/^legacy-/,'');
 const {label,action}=orderReadListStatus(a,stage,s?.day??0);
 return '<section class="ws-office ws-index ws-orders ws-receipts" data-workspace-order-list>'+orderHeading+orderLead(a.productName,a.buyer,label,[['签约',a.signedDay],['交货',a.deliveryDay],['回款',a.paymentDay]],'data-workspace-current-market-order',action)+(s?queuedMarketCards(s)+(canParkMarketOrder(s)||parkedMarketOrders(s).length?'<button type="button" data-workspace-open="inbox">去收件箱看其他询盘</button>':'')+receipts(s,true):'')+'</section>';
}

// Task links carry a customer, not an order action. Validate against live mail.
export function workspaceInquiryFromRef(s,ref){
 const id=typeof ref==='string'&&ref.startsWith('prospect:')?ref.slice(9):'';
 return prospectIdValid(id)&&prospectInbox(s,{whileActive:canParkMarketOrder(s)||s.phase==='market'&&s.market?.status==='paid'}).some(row=>row.person.id===id)?id:null;
}
