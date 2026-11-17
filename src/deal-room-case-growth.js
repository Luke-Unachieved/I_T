import {acceptedLampSample} from './deal-room-development.js';
/** Case presentation permission is separate from product/design ownership.
 * Opt-in follow-up projects do not rewrite any earlier client's agreement. */
const PRODUCTS=[{id:'mira',name:'便携台灯',price:55,cost:30},{id:'samir',name:'保温杯',price:48,cost:26},{id:'ines',name:'棉麻桌布',price:42,cost:24}];
const RATE={mira:8,samir:16,ines:5};
// Referral evidence is not a new customer identity. There are two contacts.
function caseContacts(state){
 const owners=new Map();for(const h of state.caseGrowthHistory||[])if(!owners.has(h.agreement))owners.set(h.agreement,h.referrerId);
 if(state.caseGrowth?.status==='production'&&!owners.has(state.caseGrowth.agreement))owners.set(state.caseGrowth.agreement,state.caseGrowth.referrerId);
 return owners;
}
export function caseGrowthDemand(state,referrerId){
 const agreement=(state.caseGrowthHistory||[]).find(h=>h.referrerId===referrerId)?.agreement||(state.caseGrowth?.referrerId===referrerId?state.caseGrowth.agreement:null);
 return PRODUCTS.map(p=>{const lots=(state.caseGrowthHistory||[]).filter(h=>(agreement?h.agreement===agreement:h.referrerId===referrerId)&&h.status==='paid'&&h.products.includes(p.id)&&h.deliveryDay<=state.day).sort((a,b)=>a.deliveryDay-b.deliveryDay);let stock=0,lastDay=0;for(const lot of lots){stock=Math.max(0,stock-(lot.deliveryDay-lastDay)*RATE[p.id])+(lot.allocationVersion===1?lot.productQuantities[p.id]:lot.quantity);lastDay=lot.deliveryDay;}const remaining=Math.max(0,stock-(state.day-lastDay)*RATE[p.id]),readyDay=remaining?state.day+Math.ceil(remaining/RATE[p.id]):state.day;return {id:p.id,remaining,readyDay,ready:remaining===0};});
}
export function caseGrowthOffers(state){
 const paid=(state.curationHistory||[]).filter(c=>c.status==='paid'),known=new Set(paid.flatMap(c=>c.products)),contacts=caseContacts(state),available=['portfolio','private'].filter(a=>!contacts.has(a));
 return paid.filter(c=>!(state.caseGrowth?.status==='production'&&state.caseGrowth.referrerId===c.referrerId)).map(c=>{const history=(state.caseGrowthHistory||[]).filter(h=>h.referrerId===c.referrerId),agreement=history[0]?.agreement,returning=history.length>0;if(agreement&&contacts.get(agreement)!==c.referrerId)return null;if(!agreement&&!available.length)return null;return {referrerId:c.referrerId,referrerName:c.referrerName,buyer:c.buyer,products:returning&&agreement==='portfolio'?PRODUCTS.filter(p=>known.has(p.id)).map(p=>p.id):[...c.products],sourceProducts:[...c.products],packaging:c.packaging,agreement,availableAgreements:agreement?[agreement]:[...available],returning,historyCount:history.length,...(c.lampVersion==='developed'?{lampVersion:'developed'}:{})};}).filter(Boolean);
}
export function canCalloffCase(state,referrerId){return (state.caseGrowthHistory||[]).some(h=>h.referrerId===referrerId&&h.agreement==='private'&&h.status==='paid');}
// New approval adds one specification, never edits a source case or prior contract.
function caseLampBasis(state,referrerId){
 const source=(state.curationHistory||[]).find(c=>c.referrerId===referrerId&&c.status==='paid');
 return source?.products.includes('mira')&&source.lampVersion!=='developed'&&canCalloffCase(state,referrerId)&&!!acceptedLampSample(state,'studio')?source:null;
}
export function canProposeCaseLamp(state,referrerId){return !!caseLampBasis(state,referrerId)&&!state.caseLampApprovals?.[referrerId];}
export function previewApprovedCaseLamp(state,{terms}={}){
 const id=state.caseGrowth?.referrerId,source=caseLampBasis(state,id);
 if(!source||state.caseLampApprovals?.[id]?.model!=='developed')return {valid:false,reason:'这位集团客户尚未批准三档调光型号。'};
 return caseQuote(state,{agreement:'private',products:['mira'],packaging:source.packaging,terms},true,true);
}
export function previewCaseCalloff(state,draft={}){return caseQuote(state,draft,true);}
export function previewCaseGrowth(state,draft={}){return caseQuote(state,draft,false);}
function caseQuote(state,draft={},calloff=false,approvedLamp=false){
 const c=state.caseGrowth,source=(state.curationHistory||[]).find(p=>p.referrerId===c?.referrerId&&p.status==='paid');
 if(state.phase!=='case-growth'||c?.status!=='draft'||!source)return {valid:false,reason:'先选择一份已交付案例。'};
 const offer=caseGrowthOffers(state).find(p=>p.referrerId===source.referrerId),locked=offer?.agreement||(state.caseGrowthHistory||[]).find(h=>h.referrerId===source.referrerId)?.agreement,contacts=caseContacts(state);
 const {agreement,products,packaging,terms}=draft;
 const privateDeal=agreement==='private',validProducts=Array.isArray(products)&&products.length>=(calloff?1:2)&&products.length<=(calloff?1:3)&&new Set(products).size===products.length&&products.every(id=>(offer?.products||source.products).includes(id)&&PRODUCTS.some(p=>p.id===id));
 const inputReason=calloff&&(!canCalloffCase(state,source.referrerId)||agreement!=='private')?'先完成这位集团客户的整套采购，才能谈目录补货。':!['portfolio','private'].includes(agreement)||!validProducts||!['plain','gift'].includes(packaging)||!['delivery','sample'].includes(terms)?'请选择合作方式及已交付案例里的产品。':locked&&agreement!==locked?'这位客户已约定合作方式，回访不能改为另一条路线。':contacts.has(agreement)&&contacts.get(agreement)!==source.referrerId?'已经认识这位客户，请从原联系人入口回访，另一份案例不会重置门店库存。':privateDeal&&((!calloff&&products.length!==source.products.length)||products.some(id=>!source.products.includes(id))||packaging!==source.packaging)?'集团按原案例整套规格采购，产品和包装不能删改。':!privateDeal&&terms!=='delivery'?'概念店选品按五成定金、交货后收齐的方案合作。':'';
 const selected=PRODUCTS.filter(p=>Array.isArray(products)&&products.includes(p.id)).map(p=>p.id==='mira'&&(source.lampVersion==='developed'||approvedLamp)?{...p,name:'三档调光台灯',price:75,cost:45}:p);
 const quantity=privateDeal?60:40,gift=packaging==='gift',price=selected.reduce((n,p)=>n+p.price,0)+(gift?12:0),unitCost=selected.reduce((n,p)=>n+p.cost,0)+(gift?8:0);
 const revenue=price*quantity,cost=unitCost*quantity,deposit=privateDeal&&terms==='delivery'?0:Math.floor(revenue*.5);
 const deliveryDay=state.day+(privateDeal?(terms==='sample'?8:5):(gift?6:4)),paymentDay=deliveryDay+(privateDeal?0:(gift?3:2)),operatingCost=(paymentDay-state.day)*30;
 const demand=caseGrowthDemand(state,source.referrerId).filter(p=>selected.some(s=>s.id===p.id)),waiting=demand.filter(p=>!p.ready),waitingUntil=Math.max(state.day,...demand.map(p=>p.readyDay)),waitingCost=(waitingUntil-state.day)*30;
 const requiredCash=cost-deposit+operatingCost,reason=inputReason||(waiting.length?waiting.map(d=>`${PRODUCTS.find(p=>p.id===d.id).name}还余${d.remaining}件`).join('、')+(privateDeal?(calloff?'；这一款还未缺货，可以稍后回访。':'；集团按整套规格补货，可以稍后回访。'):'；可改选缺货产品，或稍后回访。'):'')||(state.history.length>4096-3?'经营记录容量已满，暂不能接新项目。':state.cash<requiredCash?'资金不足以覆盖生产与回款前支出，先保留未签方案。':'');

 return {...(approvedLamp?{approvedCaseLamp:true,purpose:'night-reading'}:{}),...(calloff?{calloff:true}:{}),waitingUntil,waitingCost,referrerId:source.referrerId,referrerName:source.referrerName,sourceBuyer:source.buyer,agreement,terms,products:selected.map(p=>p.id),productNames:selected.map(p=>p.name),quantity,packaging,price,unitCost,cost,revenue,deposit,balanceDue:revenue-deposit,operatingCost,netProfit:revenue-cost-operatingCost,deliveryDay,paymentDay,requiredCash,cashAfterSigning:state.cash+deposit-cost,cashAfterPayment:state.cash+revenue-cost-operatingCost,buyer:privateDeal?'集团采购 · 匿名供货':'概念店采购 · 工作室选品',...(selected.some(p=>p.id==='mira')&&(source.lampVersion==='developed'||approvedLamp)?{lampVersion:'developed'}:{}),valid:!reason,reason};
}

/** Visible consequence only; never changes stock or journals. */
export function caseCalloffConsequence(state,quote){
 if(!quote?.valid||!quote.calloff)return null;
 const before=caseGrowthDemand(state,quote.referrerId),after=caseGrowthDemand({...state,day:quote.paymentDay,caseGrowthHistory:[...(state.caseGrowthHistory||[]),{...quote,status:'paid'}]},quote.referrerId);
 return {without:Math.max(state.day,...before.map(d=>d.readyDay)),withOrder:Math.max(quote.paymentDay,...after.map(d=>d.readyDay))};
}
