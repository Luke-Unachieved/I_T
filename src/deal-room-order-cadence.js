// New signed orders use cadence-tagged terms; existing journal actions keep
// their historical timing and already-signed promises never move.
export const MAX_NEW_ORDER_DAYS=18;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function marketTiming(supplier,offer,{mode=offer?.mode,source,optionId=offer?.id,cadence=false,preserveStory=false}={}){
 if(!supplier||!offer)return null;
 if(!cadence||preserveStory)return {delivery:supplier.days,lag:offer.payLag};
 if(mode==='neighborhood'){
  const stores=offer.quantity/offer.perStore;
  const group=stores>=24?2:stores>=18?1:0;
  const delivery=Math.max(supplier.days,4+group);
  return {delivery,lag:Math.min(12-delivery,6)};
 }
 const small=mode==='trial',vip=optionId==='vip-volume';
 // Time quoted by the actual supplier is a floor. Shorter settlement comes
 // from agreed buyer terms, not an artificially faster factory.
 const delivery=Math.max(supplier.days,small?2:3);
 const totalCap=vip?12:source==='factory'?11:9;
 const lag=small?offer.payLag:clamp(offer.payLag+(vip?1:0),0,totalCap-delivery);
 return {delivery,lag};
}

export function familiarTimingV1(offer){
 if(!['repeat-small','repeat-scale','repeat-prepaid'].includes(offer?.id))return offer;
 if(offer.id==='repeat-scale')return {...offer,payLag:Math.min(offer.payLag,12-offer.deliveryDays)};
 return {...offer,deliveryDays:Math.max(2,offer.deliveryDays)};
}
