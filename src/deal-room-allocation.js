import {studioProjectReview,previewStudioProjectOrder} from './deal-room-studio-project.js';
import {caseGrowthDemand} from './deal-room-case-growth.js';
/** One existing unsigned purchase, 60 positions. Not another order or reward. */
export function previewStudioAllocation(state,allocation='bedside'){
 const p=state.studioProject;
 const fail=reason=>({available:false,valid:false,reason});
 if(!['bedside','mixed'].includes(allocation))return fail('请选择保留60处床头，或40处床头加20处茶台。');
 if(state.phase!=='studio-project'||p?.status!=='approved'||p.direction!=='group'||p.briefId!=='bedside')return fail('先回到已确认、尚未签采购的集团床头方案。');
 const specs={...(state.groupProjectSpecs||{}),...(state.studioProjectPlans?.group?{[state.studioProjectPlans.group.briefId]:state.studioProjectPlans.group}:{}),bedside:p};
 if(!['bedside','welcome'].every(id=>{const spec=specs[id];return spec?.status==='approved'&&spec.direction==='group'&&spec.briefId===id&&spec.referrerId===p.referrerId&&studioProjectReview(state,spec).valid;}))return fail('这位客户需要先确认床头与茶台两份真实规格，才能协商同批分配。');
 const base=previewStudioProjectOrder(state,p);if(!base.products)return fail(base.reason);
 if(state.caseGrowth?.status==='production')return fail('已签采购不能更改这批用途分配。');
 const split=allocation==='mixed',positions={bedside:split?40:60,welcome:split?20:0},productQuantities={mira:positions.bedside,samir:60,ines:positions.welcome};
 const products=['mira','samir','ines'].filter(id=>productQuantities[id]>0),names={mira:'三档调光台灯',samir:'保温杯',ines:'棉麻桌布'};
 const gift=base.packaging==='gift',revenue=productQuantities.mira*75+productQuantities.samir*48+productQuantities.ines*42+(gift?12*60:0),cost=productQuantities.mira*45+productQuantities.samir*26+productQuantities.ines*24+(gift?8*60:0);
 const demand=caseGrowthDemand(state,p.referrerId).filter(d=>products.includes(d.id)),waiting=demand.filter(d=>!d.ready),waitingUntil=Math.max(state.day,...demand.map(d=>d.readyDay)),waitingCost=(waitingUntil-state.day)*30;
 const requiredCash=cost+base.operatingCost;
 const reason=waiting.length?waiting.map(d=>`${names[d.id]}还余${d.remaining}件`).join('、')+'；这批所需商品暂不重复采购。':state.history.length>4096-3?'经营记录容量已满，暂不能接新项目。':state.cash<requiredCash?'资金不足以覆盖备货和回款前支出。':'';
 return {...base,available:true,allocationVersion:1,allocation:positions,productQuantities,products,productNames:products.map(id=>names[id]),quantity:60,price:revenue/60,unitCost:cost/60,revenue,cost,deposit:0,balanceDue:revenue,requiredCash,netProfit:revenue-cost-base.operatingCost,cashAfterSigning:state.cash-cost,cashAfterPayment:state.cash+revenue-cost-base.operatingCost,waitingUntil,waitingCost,valid:!reason,reason};
}
