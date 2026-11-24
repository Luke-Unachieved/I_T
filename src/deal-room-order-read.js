import {netProfitAmount} from './deal-room-net-profit.js';
// Shared view-only order header, timeline and receipt. No transaction state changes.
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>Number.isSafeInteger(n)?'¥'+n.toLocaleString('zh-CN'):'—';
export const openingOrderUnits=Object.freeze({mira:'盏',samir:'只',ines:'条'});
const readStatus=Object.freeze({transit:'待交货',receivable:'待收款',paid:'已结清'});
export function orderReadSummary({status,buyer,product,quantity,unit,signedDay,deliveryDay,paymentDay,paidDay,visual='',kicker='客户订单',esc=escape}){
 const dates=[['签约',signedDay],['交货',deliveryDay],['收款',status==='paid'&&Number.isSafeInteger(paidDay)?paidDay:paymentDay]];
 const count=Number.isSafeInteger(quantity)?quantity+' '+(unit??'件'):'';
 return '<header class="ws-order-summary"><div><p class="ws-order-kicker">'+esc(kicker)+'</p><h2 tabindex="-1">'+esc(product)+'</h2><p>'+esc(buyer)+'</p></div>'+visual+'</header>'+
  '<p class="ws-order-item"><strong>'+esc(readStatus[status]??'订单进度')+'</strong><span>'+esc(count)+'</span></p>'+
  '<ol class="ws-carafe-track" aria-label="合同进度" data-stage="'+esc(status)+'">'+dates.map(([label,n],i)=>'<li'+(i===(status==='transit'?1:status==='receivable'?2:-1)?' aria-current="step"':'')+'><b>'+label+'</b><time>'+(Number.isSafeInteger(n)?'第 '+n+' 天':'—')+'</time></li>').join('')+'</ol>';
}
export function orderReadReceipt(received,netProfit){
 const amount=Number.isSafeInteger(received)?'<p><span>实收货款</span> <strong>'+money(received)+'</strong></p>':'';
 const net=Number.isSafeInteger(netProfit)?'<p><span>本单净利</span> <strong>'+netProfitAmount(netProfit)+'</strong></p>':'';
 return '<div class="ws-order-paid-line" aria-label="货款已收齐">'+amount+net+'</div>';
}

export function orderReadListStatus(order,status,day){
 const stage=({fulfilling:'transit','legacy-transit':'transit','legacy-receivable':'receivable','legacy-preparing':'preparing','legacy-paid':'paid'})[status]??status;
 const label=stage==='transit'?(order.deliveryDay<=day?'今天交货':'待交货'):
  stage==='receivable'?(order.paymentDay<=day?'今天收款':'待收款'):
  stage==='preparing'?(order.shipDay<=day?'今天出运':'待出运'):readStatus[stage]??'当前订单';
 return {label,action:'查看订单详情'};
}
export function orderReadNext(body){
 return '<section class="ws-order-next" aria-label="下一步">'+body+'</section>';
}
