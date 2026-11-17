/** One independently commissioned packaging design, not a reset of old rights.
 * Tidal line artwork + partition tray are a NEW visual/structural specification.
 * Existing original, sleeves, chain versions and prior contracts are untouched.
 */
const ID='revision:tidal-grid',STYLE='tidal-grid',PACK='partition-tray';
const PRICES={mira:[55,30],samir:[48,26],ines:[42,24]};
export function revisionOpportunity(state){
 const c=state.collection,paid=c?.orders?.filter(o=>o.status==='paid')||[];
 const has=id=>paid.some(o=>o.buyerId===id);
 const reason=state.collectionRevision?'这份独立新版本已经建立，请回到留样。':c?.model!=='own'?'先有工作室自己的系列。':c.exclusiveBuyer?'原系列已有独家，不将它改名重新出售。':!has('northline')||!has('atelier')?'先完成两位买手对原系列的实际采购。':!c.products?.length||c.products.some(id=>!PRICES[id])?'原系列实物规格无法确认。':'';
 return {available:!reason,reason,title:'潮汐分格系列',designCost:3200,days:4,operatingCost:120,versionId:ID,style:STYLE,packaging:PACK};
}
export function previewRevisionOrder(state,{buyerId,scope}={}){
 const r=state.collectionRevision,fail=reason=>({valid:false,reason});
 if(state.phase!=='collection-revision'||!r||!['sample','complete'].includes(r.status))return fail('先拿到已完成的新版本实物样。');
 if(!['northline','atelier'].includes(buyerId)||!['revision-nonexclusive','revision-exclusive'].includes(scope)||buyerId==='atelier'&&scope!=='revision-nonexclusive')return fail('这份新版本的买方或授权范围无效。');
 if(r.exclusiveBuyer&&r.exclusiveBuyer!==buyerId)return fail('只有潮汐分格新版本已专供 Northline；原款的旧授权不变。');
 if(r.orders.some(o=>o.buyerId===buyerId))return fail('这位买手已完成该版本的本次采用，不重复生成订单。');
 if(buyerId==='atelier'&&!r.orders.some(o=>o.buyerId==='northline'&&o.status==='paid'&&o.scope==='revision-nonexclusive'))return fail('先兑现 Northline 的新版本合作，再向 Atelier 提案复用。');
 const exclusive=scope==='revision-exclusive',sets=buyerId==='atelier'?50:exclusive?80:60,licenceFee=exclusive?1200:0;
 const unitPrice=r.products.reduce((n,id)=>n+(id==='mira'&&r.lampVersion==='developed'?75:PRICES[id][0]),12),unitCost=r.products.reduce((n,id)=>n+(id==='mira'&&r.lampVersion==='developed'?45:PRICES[id][1]),8);
 const revenue=unitPrice*sets+licenceFee,cost=unitCost*sets,deposit=Math.floor(revenue*.5),days=6,operatingCost=days*30;
 const reason=state.history.length>4089?'经营记录容量不足，暂不签新合同。':state.cash+deposit-cost<operatingCost?'资金不足以覆盖制作与回款前支出。':'';
 return {valid:!reason,reason,products:[...r.products],lampVersion:r.lampVersion,buyerId,buyer:buyerId==='northline'?'Northline':'Atelier',sets,style:r.style,packaging:r.packaging,versionId:r.versionId,scope,licenceFee,revenue,cost,deposit,balanceDue:revenue-deposit,operatingCost,netProfit:revenue-cost-operatingCost,deliveryDay:state.day+6,paymentDay:state.day+6};
}
export function revisionCatalogueVersion(state){
 const r=state.collectionRevision;if(!r||['draft','sampling'].includes(r.status))return null;
 return {id:r.versionId,kind:'independent-revision',title:'潮汐分格系列',style:r.style,packaging:r.packaging,products:[...r.products],lampVersion:r.lampVersion,owner:'workshop',buyerId:r.exclusiveBuyer||null,exclusiveBuyer:r.exclusiveBuyer||null,reusable:!r.exclusiveBuyer,delivered:r.orders.some(o=>o.status==='paid'),seriesDelivered:r.orders.some(o=>o.status==='paid'),reason:r.exclusiveBuyer?'潮汐分格版仅供 Northline；工作室旧原稿及其既有授权不受影响。':'潮汐分格版可独立谈复用；旧原稿和旧客户合同照常保留。'};
}
