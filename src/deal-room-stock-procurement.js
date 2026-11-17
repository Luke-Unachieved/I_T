import {SAMPLE_FACTORIES} from './deal-room-development.js';
import {previewStudioProjectOrder} from './deal-room-studio-project.js';
/** One authored follow-up inquiry, not a historical fact or guaranteed inventory buyer.
 * Small-run 60/unit is a new explicit offer; the existing 60-unit quote is not an MOQ. */
export function stockProcurementOpportunity(state){
 const rows=(state.caseGrowthHistory||[]).filter(h=>h.status==='paid'&&h.purpose==='studio-project'&&h.studioDirection==='group'&&h.agreement==='private'&&h.lampVersion==='developed'&&h.products?.includes('mira'));
 const refs=[...new Set(rows.map(h=>h.referrerId))],source=rows.at(-1);
 const reason=state.stockProcurement?'本次新用途询盘已经建立，不重复生成。':state.productDevelopment?.status!=='active'||state.productDevelopment.factory!=='studio'?'需要实际验收的三档调光样。':refs.length!==1?'需要唯一现有集团客户已交付的调光用途依据。':'';
 return {available:!reason,reason,referrerId:refs.length===1?refs[0]:null,sourceHistoryIndex:source?(state.caseGrowthHistory||[]).lastIndexOf(source):-1,quantity:12,unitPrice:75,purpose:'public-reading',specification:'developed-studio',packaging:'generic',newInquiry:true};
}
export function previewStockProcurement(state,factoryMode='small'){
 const p=state.stockProcurement,f=SAMPLE_FACTORIES.studio;
 if(state.phase!=='stock-procurement'||p?.status!=='draft'||!['small','batch'].includes(factoryMode))return {valid:false,reason:'先打开尚未签约的新用途询盘。'};
 const quantity=12,factoryQuantity=factoryMode==='small'?quantity:f.quantity,unitCost=factoryMode==='small'?60:45,cost=factoryQuantity*unitCost,revenue=quantity*75,operatingCost=f.deliveryDays*30,requiredCash=cost+operatingCost;
 return {valid:state.cash>=requiredCash&&state.history.length<=4091,reason:state.cash<requiredCash?'现金不足以覆盖制作和交付前日费。':state.history.length>4091?'记录容量不足。':'',factoryMode,quantity,factoryQuantity,unitCost,cost,revenue,operatingCost,requiredCash,soldCost:quantity*unitCost,remaining:factoryQuantity-quantity,inventoryCost:(factoryQuantity-quantity)*unitCost,cashChange:revenue-cost-operatingCost,deliveryDay:state.day+f.deliveryDays,cashAfterSigning:state.cash-cost,cashAfterPayment:state.cash+revenue-cost-operatingCost};
}
export function previewStudioProjectFromStock(state){
 const p=state.studioProject,b=state.stockProcurement;
 if(state.phase!=='studio-project'||p?.direction!=='independent'||p.status!=='approved')return {valid:false,reason:'先打开实际已批准的自主用途方案。'};
 const q=previewStudioProjectOrder(state,p);if(!q.products)return q;
 if(q.quantity!==40||q.lampVersion!=='developed'||!q.products.includes('mira')||b?.status!=='paid'||b.specification!=='developed-studio'||b.packaging!=='generic'||b.unitCost!==45||!Number.isSafeInteger(b.remaining)||b.remaining<1)return {valid:false,reason:'没有可匹配这份调光组合的已付通用库存。'};
 const costs={mira:45,samir:26,ines:24};if(q.products.some(id=>!Object.hasOwn(costs,id))||q.cost!==q.quantity*(q.products.reduce((n,id)=>n+costs[id],q.packaging==='gift'?8:0)))return {valid:false,reason:'原商品及包装成本无法核实。'};
 const stockUsed=Math.min(q.quantity,b.remaining),stockCost=stockUsed*45,newProductionCost=q.cost-stockCost;
 const affordability=previewStudioProjectOrder({...state,cash:state.cash+stockCost},p);if(!affordability.valid)return {...q,valid:false,reason:affordability.reason};
 return {...q,valid:true,reason:'',stockUsed,stockCost,newProductionCost,remainingAfter:b.remaining-stockUsed,originalCashAfterSigning:q.cashAfterSigning,originalCashAfterPayment:q.cashAfterPayment,requiredCash:Math.max(0,q.requiredCash-stockCost),cashAfterSigning:q.cashAfterSigning+stockCost,cashAfterPayment:q.cashAfterPayment+stockCost};
}
/** Read-only reporting; never rewrite historical contract P&L or cash movements.
 * Existing caseGrowth netProfit ALREADY expenses reused stock at 45/unit.
 * Only realizedProfit below is missing from legacy realized-profit aggregation.
 */
export function stockProcurementAccounting(state){
 const p=state.stockProcurement;
 if(!p||p.status==='draft')return {realizedProfit:0,cashChange:0,inventoryCost:0,reservedInventoryCost:0,inTransitCost:0,reusedStockCost:0};
 if(p.status==='production')return {realizedProfit:0,cashChange:-p.cost,inventoryCost:0,reservedInventoryCost:0,inTransitCost:p.cost,reusedStockCost:0};
 const active=state.caseGrowth?.status==='production'?state.caseGrowth.active:null;
 return {realizedProfit:p.revenue-p.soldCost-p.operatingCost,cashChange:p.cashChange,inventoryCost:p.remaining*p.unitCost,reservedInventoryCost:active?.stockCost||0,inTransitCost:0,reusedStockCost:(p.stockUsed||0)*p.unitCost};
}
