import {tradeAdviserHint} from './deal-room-market-adviser-hint.js';
// Only this ordinary offer/consignment is evidenced in the pre-loss screenshot.
const carafePanels=Object.freeze({
 standard:'assets/deal-work-comic-carafe-standard.webp',
 early:'assets/deal-work-comic-carafe-early.webp'
});
export function carafeComicFrame(kind){
 if(!Object.hasOwn(carafePanels,kind))return '';
 const alt={standard:'换班时，买方和接班同事照箱单清点。',early:'岚岸的现场负责人在培训室核对清早送到的冷水壶。'};
 return '<figure class="ws-carafe-comic ws-carafe-comic-'+kind+'"><img src="'+carafePanels[kind]+'" alt="'+alt[kind]+'"></figure>';
}
export function carafeTransport(s){
 const a=s?.market?.active;
 if(s?.phase!=='market'||s.market.status!=='transit'||a?.status!=='transit'||a.kind||a.carafeCharter||a.productId!=='carafe'||a.buyer!=='岚岸餐饮采购社'||a.source!=='stock'||a.mode!=='bulk'||a.quantity!==72||a.unitPrice!==51||a.deposit!==1101||s.day!==a.signedDay||a.deliveryDay!==s.day+4||a.paymentDay!==s.day+9)return null;
 return {fee:96,saved:60,delivery:a.deliveryDay-2,payment:a.paymentDay-2,affordable:s.cash>=96+a.operatingCost-60};
}
export function charterCarafe(s){
 const q=carafeTransport(s);if(!q?.affordable)return s;
 const n=structuredClone(s),a=n.market.active;
 n.cash-=q.fee;a.carafeCharter=true;a.deliveryDay=q.delivery;a.paymentDay=q.payment;
 a.freight+=q.fee;a.cost+=q.fee;a.operatingCost-=q.saved;a.netProfit-=q.fee-q.saved;
 a.cashAfterPayment-=q.fee-q.saved;
 n.feedback={kind:'market-chartered',message:'联仓已确认包车，已付 ¥96。第 '+q.delivery+' 天交货，第 '+q.payment+' 天收款。'};return n;
}
export function carafeCustomerFollowup(s){
 const a=s?.market?.active,status=s?.market?.status;
 if(!a||!['receivable','paid'].includes(status)||a.kind||a.productId!=='carafe'||a.buyer!=='岚岸餐饮采购社'||a.source!=='stock'||a.mode!=='bulk'||a.quantity!==72||a.unitPrice!==51||a.deposit!==1101||a.delivered!==72||a.deliveryDay!==a.signedDay+(a.carafeCharter?2:4)||a.paymentDay!==a.signedDay+(a.carafeCharter?7:9))return '';
 if(status==='receivable')return a.carafeCharter?'「冷水壶已点齐。比原定早到两天，上午那场培训就能先用上。尾款按新日期付。」':'「冷水壶已点齐。原车到了刚好赶上换班，接班的人照箱单点的。尾款按原日期付。」';
 return a.carafeCharter?'「尾款已经打了。培训那天两组人同时用，少了来回找壶的麻烦。」':'「尾款已经打了。交接那张箱单我留下了，下回补货也按这个写。」';
}
export function carafeTransportView(s,adviserId){
 const q=carafeTransport(s);if(!q)return '';
 const a=s.market.active;
 const day=n=>'第 '+n+' 天';
 const money=n=>'¥'+n.toLocaleString('zh-CN');
 const route=(title,action,fee,delivery,payment,profit,enabled,detail)=>
  '<button class="ws-carafe-route" type="button" data-market-action="'+action+'"'+(enabled?'':' disabled')+'>'+
  '<strong>'+title+'</strong><span class="ws-carafe-route-facts">'+
  [['现在加付',money(fee)],['交货',day(delivery)],['收尾款',day(payment)],['预计净利',money(profit)]].map(([label,value])=>
   '<span><span>'+label+'</span><b>'+value+'</b></span>').join('')+
  '</span><small>'+detail+'</small></button>';
 return '<section class="ws-ship-choice ws-route-decision"><header class="ws-carafe-call ws-order-decision-head"><div><h3>选运输方案</h3>'+
  '<p><strong>联仓调度：</strong>冷水壶配齐了，能跟原车走。另叫一辆车能早送两天，车费要现在付。</p>'+
  '<p><strong>岚岸采购：</strong>按原日子到也行，交班的人会收。要是早两天，培训的两组人都能用上。</p></div></header>'+
  '<div class="ws-carafe-routes">'+
  route('走原车','DELIVER_MARKET',0,a.deliveryDay,a.paymentDay,a.netProfit,true,'按原计划交货')+
  route('确认包车','CHARTER_CARAFE_V1',q.fee,q.delivery,q.payment,a.netProfit-q.fee+q.saved,q.affordable,q.affordable?'先付车费，再安排交货':'手头现金不够包车并等到回款')+
  '</div><p class="ws-route-note">包车少付 '+money(q.saved)+' 日常开支，净多花 '+money(q.fee-q.saved)+'。</p>'+
  tradeAdviserHint(adviserId,q.affordable?'包车净多花 ¥36，能早两天收款。下一单要是正缺这笔钱，才值得换。':'包车费要现在付，但买家的款没那么快到。先保住手里的周转金。')+'</section>';
}
