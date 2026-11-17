import {acceptedLampSample} from './deal-room-development.js';
import {catalogueProposal,catalogueVersions} from './deal-room-design-catalogue.js';
import {caseGrowthDemand,caseGrowthOffers} from './deal-room-case-growth.js';
/** A real original-series quote uses the existing gift-order economics.
 * Design reuse never creates a premium, another customer, or another stock pool. */
const ITEMS=[{id:'mira',name:'便携台灯',price:55,cost:30},{id:'samir',name:'保温杯',price:48,cost:26},{id:'ines',name:'棉麻桌布',price:42,cost:24}];
export function previewCatalogueOrder(state,draft={}){
 if(!draft||typeof draft!=='object'||Array.isArray(draft)||Object.keys(draft).length!==1||!['standard','developed'].includes(draft.lampVersion))return {valid:false,reason:'请选择原款或已验收的调光型号；系列产品不能在这里删改。'};
 const current=state?.caseGrowth;
 if(state?.phase!=='case-growth'||current?.status!=='draft')return {valid:false,reason:'先回到已建立的概念店客户采购桌。'};
 const proposal=catalogueProposal(state,{route:'portfolio',versionId:'original',products:state.collection?.products,lampVersion:draft.lampVersion});
 const source=(state.curationHistory||[]).find(c=>c.referrerId===current.referrerId&&c.status==='paid');
 if(!source||!proposal.customer||proposal.customer.referrerId!==current.referrerId||current.agreement!=='portfolio')return {valid:false,reason:'这份系列只向已建立的概念店联系人报价；不能代替集团确认，也不能换转介来源新建客户。'};
 return catalogueQuote(state,source,proposal,draft);
}
function catalogueQuote(state,source,proposal,draft){
 const current={referrerId:source.referrerId};
 const developed=draft.lampVersion==='developed',items=ITEMS.filter(p=>(proposal.products||[]).includes(p.id)).map(p=>p.id==='mira'&&developed?{...p,name:'三档调光台灯',price:75,cost:45}:p);
 const products=items.map(p=>p.id),quantity=40,price=items.reduce((n,p)=>n+p.price,0)+12,unitCost=items.reduce((n,p)=>n+p.cost,0)+8,revenue=price*quantity,cost=unitCost*quantity,deposit=Math.floor(revenue*.5),deliveryDay=state.day+6,paymentDay=deliveryDay+3,operatingCost=270;
 const demand=caseGrowthDemand(state,current.referrerId).filter(d=>products.includes(d.id)),waiting=demand.filter(d=>!d.ready),waitingUntil=Math.max(state.day,...demand.map(d=>d.readyDay)),waitingCost=(waitingUntil-state.day)*30,requiredCash=cost-deposit+operatingCost;
 const reason=!proposal.valid?proposal.reason:items.length!==proposal.products.length||items.length<2||items.length>3?'这份系列的完整产品记录无法确认。':waiting.length?waiting.map(d=>`${ITEMS.find(p=>p.id===d.id).name}还余${d.remaining}件`).join('、')+'；整组暂不补货。可以先回自主选品，改谈缺货商品。':state.history.length>4096-3?'经营记录容量已满，暂不能接新项目。':state.cash<requiredCash?'资金不足以覆盖生产与回款前支出，先保留未签方案。':'';
 return {referrerId:source.referrerId,referrerName:source.referrerName,sourceBuyer:source.buyer,agreement:'portfolio',terms:'delivery',products,productNames:items.map(p=>p.name),quantity,packaging:'gift',price,unitCost,cost,revenue,deposit,balanceDue:revenue-deposit,operatingCost,netProfit:revenue-cost-operatingCost,deliveryDay,paymentDay,requiredCash,cashAfterSigning:state.cash+deposit-cost,cashAfterPayment:state.cash+revenue-cost-operatingCost,buyer:'概念店采购 · 工作室选品',...(developed&&products.includes('mira')?{lampVersion:'developed'}:{}),designVersion:'original',designStyle:proposal.style,purpose:'studio-series',waitingUntil,waitingCost,valid:!reason,reason};
}

/** First signed adoption replaces the redundant prerequisite purchase, not its
 * identity rules. No synthetic history or stock reset is used to quote it. */
export function previewFirstCatalogueOrder(state,draft={}){
 const fail=reason=>({valid:false,reason});
 if(!draft||typeof draft!=='object'||Array.isArray(draft)||Object.keys(draft).length!==2||typeof draft.referrerId!=='string'||!['standard','developed'].includes(draft.lampVersion))return fail('请选择真实案例来源与已验型号。');
 const {referrerId,lampVersion}=draft,current=state.caseGrowth;
 if(current?.status==='production'||!['review','complete','case-growth'].includes(state.phase)||state.phase==='case-growth'&&(current?.status!=='draft'||current.referrerId!==referrerId))return fail('先处理当前已签合作，不能覆盖或替换在途订单。');
 const source=(state.curationHistory||[]).find(c=>c.referrerId===referrerId&&c.status==='paid'),offer=caseGrowthOffers(state).find(o=>o.referrerId===referrerId);
 if(!source||!offer||offer.agreement||!offer.availableAgreements.includes('portfolio')||(state.caseGrowthHistory||[]).some(h=>h.referrerId===referrerId||h.agreement==='portfolio')||current?.referrerId===referrerId&&current.agreement)return fail('首次原稿采用只能来自尚未约定路线的真实案例；已有联系人请沿原入口回访。');
 const version=catalogueVersions(state).find(v=>v.id==='original');
 if(!version?.reusable)return fail(version?.reason||'没有可复用的工作室原稿。');
 if(!version.delivered)return fail('这份原稿还没有实际交付，不能只凭样品建立首次采用。');
 if(lampVersion==='developed'&&version.products.includes('mira')&&(!acceptedLampSample(state,'studio')))return fail('先验收真实调光样，标准暖光与未验样不能代替。');
 return catalogueQuote(state,source,{valid:true,products:[...version.products],style:version.style},{lampVersion});
}
