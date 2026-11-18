// Read-only receipts. Never allocate a multi-SKU bundle price across its contents.
const integer=Number.isSafeInteger;
const day=n=>integer(n)&&n>=0;
const pos=n=>integer(n)&&n>0;
export function goodsPriceRecords(state){
 const records=[...(state.contracts||[])],asOf=state.day;
 const append=(who,product,spec,signedDay,paidDay,quantity,revenue,priceSource,fee=0)=>{
  if(!day(signedDay)||!day(paidDay)||paidDay<signedDay||paidDay>asOf||!pos(quantity)||!pos(revenue))return;
  records.push({status:'paid',clientId:who,product,specification:spec,signedDay,paidDay,quantity,revenue,priceSource,...(fee?{separateServiceFee:fee}:{})});
 };
 const p=state.stockProcurement;
 if(p?.status==='paid'&&p.specification==='developed-studio'&&p.packaging==='generic'&&p.delivered===p.quantity&&p.received===p.revenue)
  append('studio-generic','通用三档调光灯','generic-lot',p.signedDay,p.deliveryDay,p.delivered,p.received,'集团阅读位');
 const shop=state.shopTrial;
 if(p?.status==='paid'&&p.specification==='developed-studio'&&shop?.status==='paid'&&shop.sent===shop.sold+shop.returned&&shop.revenue===shop.sold*shop.unitPrice)
  append('studio-generic','通用三档调光灯','generic-lot',shop.signedDay,shop.settlementDay,shop.sold,shop.revenue,'街角小店');
 const f=state.linenFreight;
 if(f?.status==='paid'&&f.delivered===100&&f.received===f.revenue&&f.goodsRevenue+f.serviceFee===f.revenue)
  append('lisbon-display','棉麻桌布 · 展陈采购','exhibit-linen',f.signedDay,f.paidDay,f.delivered,f.goodsRevenue,'里斯本展陈',f.serviceFee);
 for(const plan of state.supplyPlanHistory||[]){
  if(plan.status!=='paid'||!Array.isArray(plan.lots)||plan.lots.length!==2||!plan.product||!day(plan.finishDay)||plan.finishDay>asOf||plan.lots.reduce((sum,l)=>sum+l.quantity,0)!==plan.totalQuantity||plan.lots.reduce((sum,l)=>sum+l.revenue,0)!==plan.revenue)continue;
  plan.lots.forEach((lot,i)=>append('supply-'+plan.clientId,plan.product+' · 分批供货','supply-plan',plan.signedDay,lot.paymentDay,lot.quantity,lot.revenue,i?'第二批':'首批'));
 }
 return records.sort((a,b)=>(a.signedDay??0)-(b.signedDay??0));
}
const perUnit=n=>'¥'+n.toLocaleString('zh-CN',{maximumFractionDigits:2});
export function comparePriorUnitPrice(state,offer,client){
 if(!client?.id||!client?.product||!Array.isArray(state?.contracts)||!state.businessRound&&!state.clientProjectActive||!offer||offer.accepted===false||!pos(offer.quantity)||!pos(offer.revenue))return '';
 const spec=offer.specification||(['branded','branded-opening'].includes(offer.id)?'branded':'standard');
 const prior=state.contracts.findLast(c=>c.status==='paid'&&c.clientId===client.id&&pos(c.quantity)&&pos(c.revenue)&&day(c.paidDay??c.paymentDay)&&(c.paidDay??c.paymentDay)<=state.day&&
  (c.specification||(['branded','branded-opening'].includes(c.optionId)?'branded':'standard'))===spec&&
  (offer.proofProduct?c.product===offer.proofProduct:spec.startsWith('developed-')?['developed-lamp','second-developed-lamp'].includes(c.optionId):c.product===client.product));
 if(!prior)return '';
 const a=prior.revenue/prior.quantity,b=offer.revenue/offer.quantity,diff=Math.round((b-a)*100)/100;
 return `<p class="quote-action-note prior-unit-price">上次同客同款：${prior.quantity} 件，每件 ${perUnit(a)}；这次每件 ${perUnit(b)}，${diff===0?'单价持平':(diff>0?'高 ':'低 ')+perUnit(Math.abs(diff))}。</p>`;
}
