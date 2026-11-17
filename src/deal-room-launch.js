/** Visual handover of already purchased goods. Never creates a new sale or licence. */
export function launchBasis(state){
 const c=state.collection;if(!c||!Array.isArray(c.orders))return null;
 const order=c.orders.findLast(o=>o.status==='paid'&&(c.model==='private'?o.buyerId==='northline-private':o.scope==='whole-exclusive'&&o.buyerId===c.exclusiveBuyer));
 if(!order||!c.products?.length)return null;
 return {buyerId:c.model==='private'?'northline':c.exclusiveBuyer,buyer:order.buyer,style:order.style||c.style,products:[...c.products],lampVersion:c.lampVersion||'standard',sets:order.sets,scope:c.model==='private'?'private-label':'whole-exclusive',paidDay:order.paymentDay};
}
export function launchReview(state,draft){
 const basis=launchBasis(state);if(!basis)return {valid:false,reason:'先完成已签客户的系列交付。'};
 if(!draft||!['set','individual'].includes(draft.arrangement)||!basis.products.includes(draft.lead)||!['draft','review','handed'].includes(draft.status))return {valid:false,reason:'只展示已交付的实物和已签版本。'};
 const names={mira:'灯光',samir:'保温杯',ines:'桌布纹理'};
 return {valid:true,basis,reply:draft.arrangement==='set'?`按成套主题介绍，先让客人看到${names[draft.lead]}，其他商品一起呈现。`:`分件介绍，${names[draft.lead]}放在主推位置；每件商品沿用本次已交付规格。`};
}
