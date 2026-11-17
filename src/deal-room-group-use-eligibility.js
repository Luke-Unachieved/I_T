/** Read-only entry policy for future UI visits, NEVER a canonical replay rule.
 * Installed-use deliveries do not evaporate with days. Positive partial coverage
 * proves a delivered use, not an automatically promised remainder to 60.
 * The explicitly authored one-time 60-position allocation is a separate request:
 * callers identify it via allocation; only its own paid allocation closes it.
 * Other new inquiries have separate scope and are not rejected by this helper.
 */
export function groupStudioPurchaseEligibility(state,project=state.studioProject,{allocation}={}){
 const base={applicable:project?.direction==='group',canPurchase:true,reason:'',delivered:{bedside:0,welcome:0},requestedUses:[],hasPendingDelivery:false,canFulfilExisting:false};
 if(!base.applicable)return base;
 if(!project.referrerId||!['bedside','welcome'].includes(project.briefId)||allocation!==undefined&&!['bedside','mixed'].includes(allocation))return {...base,canPurchase:false,reason:'需要明确的现有集团联系人和用途。'};
 const uses=allocation==='mixed'?['bedside','welcome']:[allocation==='bedside'?'bedside':project.briefId],counts={bedside:0,welcome:0};
 const positive=n=>Number.isSafeInteger(n)&&n>0;
 let malformed=false,allocationDelivered=false;
 for(const h of state.caseGrowthHistory||[]){
  if(h.status!=='paid'||h.purpose!=='studio-project'||h.studioDirection!=='group'||h.agreement!=='private'||h.referrerId!==project.referrerId)continue;
  if(!Number.isSafeInteger(h.deliveryDay)||h.deliveryDay>state.day){malformed=true;continue;}
  if(h.allocationVersion===1){
   const a=h.allocation;if(!a||!Number.isSafeInteger(a.bedside)||a.bedside<0||!Number.isSafeInteger(a.welcome)||a.welcome<0||a.bedside+a.welcome!==h.quantity||h.productQuantities?.mira!==a.bedside||h.productQuantities?.samir!==h.quantity||h.productQuantities?.ines!==a.welcome){malformed=true;continue;}
   counts.bedside+=a.bedside;counts.welcome+=a.welcome;allocationDelivered=true;
  }else if(h.allocationVersion===undefined&&['bedside','welcome'].includes(h.studioBrief)&&positive(h.quantity))counts[h.studioBrief]+=h.quantity;
  else malformed=true;
 }
 const active=state.caseGrowth?.status==='production'?state.caseGrowth.active:null;
 const pending=!!active,ownPending=pending&&active.studioDirection==='group'&&active.referrerId===project.referrerId;
 const already=uses.filter(id=>counts[id]>0),explicitAllocation=allocation!==undefined;
 const repeated=explicitAllocation?allocationDelivered:already.length>0;
 const reason=pending?'先完成已经签下的采购；不重复建立同一批货。':malformed?'已交付用途记录需要核实，暂不自动提出重复采购。':repeated?'这处用途已有实际交付。尚无新增场所或缺损需求，不自动再采购整套。':'';
 return {...base,canPurchase:!reason,reason,delivered:counts,requestedUses:uses,hasPendingDelivery:pending,canFulfilExisting:ownPending,allocationDelivered,explicitAllocation};
}
