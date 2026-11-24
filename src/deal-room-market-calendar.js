// Dated ordinary and equipment milestones.
export function isSpecialCarafe(a){
 return !!a&&!a.kind&&a.productId==='carafe'&&a.buyer==='岚岸餐饮采购社'&&a.source==='stock'&&a.mode==='bulk'&&a.quantity===72&&a.unitPrice===51&&a.deposit===1101;
}
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
 const delivery=a.status==='transit',day=delivery?a.deliveryDay:a.paymentDay;
 return Number.isSafeInteger(day)?{day,delivery}:null;
}

export function marketParallelDue(s){
 const current=marketCalendarDue(s),opening=s?.openingMarket?.market;
 const openingDue=opening?marketCalendarDue({phase:'market',market:opening}):null;
 const parked=(Array.isArray(s?.marketParked)?s.marketParked:[]).map(a=>({day:a.status==='transit'?a.deliveryDay:a.paymentDay,delivery:a.status==='transit'}));
 const openingParked=(s?.openingMarket?.parked??[]).map(a=>({day:a.status==='transit'?a.deliveryDay:a.paymentDay,delivery:a.status==='transit'}));
 return [current,openingDue,...parked,...openingParked].filter(Boolean).sort((a,b)=>a.day-b.day)[0]??null;
}

// A paid receipt or empty draft may stay open even with no obligations.
function noDeskObligations(s){
 const sidecar=s?.openingMarket;
 return s?.phase==='market'&&!s.marketParked?.length&&!sidecar?.parked?.length&&
  (!sidecar?.market?.active||sidecar.market.active.status==='paid')&&(s.contracts??[]).every(c=>c?.status==='paid');
}
export function settledMarketDesk(s){
 return noDeskObligations(s)&&s.market?.status==='paid'&&s.market.active?.status==='paid';
}
export function emptyMarketDesk(s){
 return noDeskObligations(s)&&s.market?.status==='draft'&&!s.market.active;
}
