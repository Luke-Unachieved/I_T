// Dated ordinary and equipment milestones; the special carafe path is separate.
export function marketCalendarDue(s){
 const market=s?.market,a=market?.active;
 if(s?.phase!=='market'||!a||market.status!==a.status)return null;
 if(['equipment','legacy-equipment-v1'].includes(a.kind)){
  const legacy=a.kind==='legacy-equipment-v1';
  const status=legacy?a.status.replace(/^legacy-/,''):a.status;
  const stage={preparing:'ship',transit:'delivery',receivable:'payment'}[status];
  const day={ship:a.shipDay,delivery:a.deliveryDay,payment:a.paymentDay}[stage];
  return Number.isSafeInteger(day)?{day,stage,delivery:stage==='delivery',equipment:true,legacy}:null;
 }
 if(!['transit','receivable'].includes(a.status)||![undefined,'prospect','neighborhood'].includes(a.kind))return null;
 if(!a.kind&&a.productId==='carafe'&&a.buyer==='岚岸餐饮采购社'&&a.source==='stock'&&a.mode==='bulk'&&a.quantity===72&&a.unitPrice===51&&a.deposit===1101)return null;
 const delivery=a.status==='transit',day=delivery?a.deliveryDay:a.paymentDay;
 return Number.isSafeInteger(day)?{day,delivery}:null;
}
