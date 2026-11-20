// Read-only receipts. Never allocate a multi-SKU bundle price across its contents.
const integer=Number.isSafeInteger;
const day=n=>integer(n)&&n>=0;
const pos=n=>integer(n)&&n>0;
// The signed two-lot cup contract predates an explicit packaging field.
// Check BOTH immutable production and sale terms of the two authored Samir
// price lists. For history also require the contemporaneous paid specification;
// never identify an old plan from whichever sample the customer owns today.
export function supplyCupEdition(p,contracts=null){
 if(p?.clientId!=='samir'||p.product!=='不锈钢保温杯'||p.totalQuantity!==240||!['delivery','deposit'].includes(p.payment)||!Array.isArray(p.lots)||p.lots.length!==2||p.lots.reduce((n,l)=>n+l.quantity,0)!==240||p.lots.reduce((n,l)=>n+l.revenue,0)!==p.revenue)return null;
 const terms=[['plain','无印字现货',6300,9300],['branded','定制包装',7200,10500]].find(([, ,cost,full])=>p.cost===cost&&p.revenue===(p.payment==='delivery'?Math.floor(full*.96):full)&&p.lots.every(l=>pos(l.quantity)&&l.cost*240===cost*l.quantity&&l.revenue*240===p.revenue*l.quantity));
 if(!terms)return null;
 if(contracts!==null){
  if(!day(p.signedDay)||!Array.isArray(contracts))return null;
  const prior=contracts.findLast(c=>c.clientId==='samir'&&c.status==='paid'&&day(c.paidDay??c.paymentDay)&&(c.paidDay??c.paymentDay)<=p.signedDay);
  if(!prior||(!['standard','branded'].includes(prior.specification)&&!['ready','branded'].includes(prior.optionId))||((prior.optionId==='branded'||prior.specification==='branded')?'branded':'plain')!==terms[0])return null;
 }
 return {id:terms[0],label:terms[1]};
}
export function priorSupplyAgreements(state,clients=[]){
 const names={samir:'Samir',mira:'Mira',ines:'Inês'},eligible=new Set(clients.map(c=>c.id)),rows=new Map();
 for(const p of state.supplyPlanHistory||[]){
  if(!eligible.has(p.clientId)||!Object.hasOwn(names,p.clientId)||p.status!=='paid'||!day(p.finishDay)||p.finishDay>state.day||!pos(p.totalQuantity)||!pos(p.revenue)||!['deposit','delivery'].includes(p.payment))continue;
  const ed=p.clientId==='samir'?supplyCupEdition(p,state.contracts||[]):null;
  if(p.clientId==='samir'&&!ed)continue;
  const label=ed?.label||({mira:'标准台灯',ines:'棉麻桌布'})[p.clientId];
  rows.set(p.clientId+':'+label,{name:names[p.clientId],label,quantity:p.totalQuantity,unit:p.revenue/p.totalQuantity,finish:p.finishDay,terms:p.payment==='deposit'?'三成定金、末批交付后结清':'交货逐批结清'});
 }
 return rows.size?`<details class="settled-prices"><summary>再谈之前，翻开同款的上份供货约定</summary>${[...rows.values()].sort((a,b)=>b.finish-a.finish).map(r=>`<p><strong>${r.name} · ${r.label}</strong><br>${r.quantity} 件，每件 ${perUnit(r.unit)}；${r.terms}，第 ${r.finish} 天收齐。</p>`).join('')}</details>`:'';
}
export function goodsPriceRecords(state){
 const records=[...(state.contracts||[])],asOf=state.day;
 const append=(who,product,spec,signedDay,paidDay,quantity,revenue,priceSource,fee=0)=>{
  if(!day(signedDay)||!day(paidDay)||paidDay<signedDay||paidDay>asOf||!pos(quantity)||!pos(revenue))return;
  records.push({status:'paid',clientId:who,product,specification:spec,signedDay,paidDay,quantity,revenue,priceSource,...(fee?{separateServiceFee:fee}:{})});
 };
 for(const o of state.marketHistory||[]){
  if(o.status==='paid'&&o.received===o.revenue&&o.delivered===o.quantity&&o.unitPrice*o.quantity===o.revenue)
   append(o.kind==='prospect'?'prospect-'+o.customerId:'market-'+o.productId,o.productName,'market',o.signedDay,o.paidDay,o.quantity,o.revenue,(o.kind==='equipment'||o.kind==='legacy-equipment-v1')?'设备项目':o.kind==='neighborhood'?'门店联采':o.kind==='prospect'?(o.prospectRepeat?'客户补货':'新客户首单'):o.mode==='bulk'?'新品铺货':'新品试单');
 }
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
  const cup=plan.clientId==='samir',ed=cup?supplyCupEdition(plan,state.contracts||[]):null;
  const label=plan.product+' · 分批供货'+(cup?' · '+(ed?.label||'包装未核实'):'');
  const spec=cup?'supply-cup-'+(ed?.id||'unverified-'+plan.signedDay):'supply-plan';
  plan.lots.forEach((lot,i)=>append('supply-'+plan.clientId,label,spec,plan.signedDay,lot.paymentDay,lot.quantity,lot.revenue,i?'第二批':'首批'));
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
