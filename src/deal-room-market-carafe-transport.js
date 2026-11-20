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
 const compare=(title,left,right)=>'<tr><th scope="row">'+title+'</th><td>'+left+'</td><td>'+right+'</td></tr>';
 const day=n=>'第 '+n+' 天';
 const board='<table class="ws-route-compare" aria-label="运输方案对比"><thead><tr><th scope="col"><span class="ws-offscreen">对比项目</span></th><th scope="col">跟原车</th><th scope="col">另包一辆</th></tr></thead><tbody>'+
  compare('交货',day(a.deliveryDay),day(q.delivery))+compare('收尾款',day(a.paymentDay),day(q.payment))+compare('现在加付','¥0','¥96')+
  '</tbody><tfoot><tr><th scope="row"><span class="ws-offscreen">选择方案</span></th><td><button type="button" data-market-action="DELIVER_MARKET" aria-label="照原安排交货">走原车</button></td>'+
  '<td><button type="button" data-market-action="CHARTER_CARAFE_V1" aria-label="确认包车 · ¥96"'+(q.affordable?'':' disabled')+'>确认包车</button></td></tr></tfoot></table>';
 return '<section class="ws-ship-choice ws-route-decision"><header class="ws-carafe-call ws-order-decision-head"><div><h3>选运输方案</h3><p>联仓来电话。调度员说，货已配齐，可以随原车发走。</p></div></header>'+board+
  '<p class="ws-route-note">包车省 ¥60 日常开支，净多花 ¥36。'+(!q.affordable?'手头现金不够包车并等到回款。':'')+'</p>'+
  (['liang','fang','tao','xu'].includes(adviserId)?'<aside class="ws-trade-hint" aria-label="助理建议"><strong>助理建议</strong><p>'+(q.affordable?'包车净多花 ¥36，能早两天收款。下一单要是正缺这笔钱，才值得换。':'包车费要现在付，但买家的款没那么快到。先保住手里的周转金。')+'</p></aside>':'')+'</section>';
}
