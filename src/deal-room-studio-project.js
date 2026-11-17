import {acceptedLampSample} from './deal-room-development.js';
import { catalogueVersions } from './deal-room-design-catalogue.js';
import { caseGrowthDemand } from './deal-room-case-growth.js';
const ITEMS=[{id:'mira',name:'便携台灯',price:55,cost:30},{id:'samir',name:'保温杯',price:48,cost:26},{id:'ines',name:'棉麻桌布',price:42,cost:24}];
const BRIEFS={'reading-drink':{direction:'independent',products:['mira','samir']},reading:{direction:'independent',products:['mira','ines']},hosting:{direction:'independent',products:['samir','ines']},bedside:{direction:'group',products:['mira','samir']},welcome:{direction:'group',products:['samir','ines']}};
const KEYS=['direction','briefId','lampVersion','layout','light','status','referrerId'];
export function studioProjectEligibility(state,direction){
 const agreement=direction==='independent'?'portfolio':direction==='group'?'private':null;
 const original=catalogueVersions(state).find(v=>v.id==='original');
 const adoption=(state?.caseGrowthHistory||[]).some(h=>h.status==='paid'&&h.agreement==='portfolio'&&h.designVersion==='original'&&h.purpose==='studio-series');
 const refs=[...new Set((state?.caseGrowthHistory||[]).filter(h=>h.status==='paid'&&h.agreement===agreement).map(h=>h.referrerId))];
 const source=(state?.curationHistory||[]).find(c=>c.status==='paid'&&c.referrerId===refs[0]);
 const reason=!agreement?'请选择工作室陈列或集团用途专案。':!original?.reusable?original?.reason||'没有可合法延用的工作室原稿。':!adoption?'需要概念店已经交付的原稿采用记录。':refs.length!==1||!source?'先核实这条路线唯一的实际合作客户与已交付案例。':'';
 return {valid:!reason,reason,direction,agreement,referrerId:refs.length===1?refs[0]:null,source:source||null,original:original||null,briefs:Object.keys(BRIEFS).filter(k=>BRIEFS[k].direction===direction&&BRIEFS[k].products.every(id=>original?.products.includes(id))&&(k!=='reading-drink'||original.products.length===2))};
}
export function studioProjectReview(state,project){
 const fail=(reason,products=[])=>({valid:false,reason,feedback:reason,products,project:project&&typeof project==='object'&&!Array.isArray(project)?{...project,status:'draft'}:null});
 if(!project||typeof project!=='object'||Array.isArray(project)||Object.keys(project).some(k=>!KEYS.includes(k)&&k!=='products')||KEYS.some(k=>!Object.hasOwn(project,k)))return fail('请提交完整陈列方案，不能附加价格、权利或客户同意参数。');
 const e=studioProjectEligibility(state,project.direction),b=BRIEFS[project.briefId];
 if(!e.valid)return fail(e.reason);
 if(project.referrerId!==e.referrerId)return fail('这不是已建立的合作联系人，不能借专案复制客户。');
 if(!b||b.direction!==project.direction)return fail('请选择这一方向实际支持的用途。');
 if(project.briefId==='reading-drink'&&!e.briefs.includes('reading-drink'))return fail('这个阅读饮水组合只用于已交付的灯与杯双款原稿。');
 const products=[...b.products];
 if(Object.hasOwn(project,'products')&&(!Array.isArray(project.products)||project.products.length!==products.length||project.products.some((id,i)=>id!==products[i])))return fail('商品组合由确认用途决定，不能注入或删改产品。',products);
 if(!['draft','approved'].includes(project.status)||!['standard','developed'].includes(project.lampVersion)||!['table','shelf'].includes(project.layout)||!['soft','reading'].includes(project.light))return fail('摆放、灯光或型号记录无法确认。',products);
 if(products.some(id=>!e.original.products.includes(id)))return fail('原系列没有交付过这个方案需要的商品，不能凭用途名称创造实物依据。',products);
 const lamp=products.includes('mira');
 if(lamp&&project.lampVersion==='developed'&&(!acceptedLampSample(state,'studio')))return fail('请先验收真实三档调光样，批量暖光样不能代替。',products);
 if(['reading','reading-drink'].includes(project.briefId)&&project.light!=='reading')return fail('这是阅读桌面，请展示照亮书页的阅读光，不是睡前柔光。',products);
 if(project.briefId==='bedside'&&(project.lampVersion!=='developed'||project.light!=='soft'))return fail('客房晚间需要可以调暗的床头光，请用已验调光灯展示柔光。',products);
 if(project.briefId==='bedside'&&project.layout!=='table')return fail('请放在床头桌上，让客人伸手能取水和调灯；展示架不是实际使用位置。',products);
 if(project.briefId==='welcome'&&project.layout!=='table')return fail('请放在迎宾茶台桌面，杯与桌布要能一起使用。',products);
 const canonical={...project,products,status:'approved',...(lamp?{}:{lampVersion:'standard',light:'reading'})};
 const feedback=project.direction==='independent'?'这组陈列可以进店。方案仍由工作室复用，我们只采购这次确认的组合。':project.briefId==='bedside'?'柔光和取水位置符合客房晚间用途。批准这一份床头规格，不改变原整套采购目录。':'这份茶台组合符合接待用途。批准该子方案，不要求把台灯也放进来。';
 return {valid:true,reason:'',feedback,products,project:canonical};
}
export function previewStudioProjectOrder(state,project){
 const review=studioProjectReview(state,project);
 if(!review.valid)return {valid:false,reason:review.reason};
 if(project.status!=='approved')return {valid:false,reason:'请先让客户看过实际陈列，再确认采购。'};
 if(state.caseGrowth?.status==='production')return {valid:false,reason:'先完成正在生产的客户订单，不能并行覆盖已签合同。'};
 const e=studioProjectEligibility(state,project.direction),p=review.project,group=p.direction==='group',packaging=group?e.source.packaging:'gift';
 if(!['plain','gift'].includes(packaging))return {valid:false,reason:'原客户包装记录无法确认。'};
 const items=ITEMS.filter(i=>review.products.includes(i.id)).map(i=>i.id==='mira'&&p.lampVersion==='developed'?{...i,name:'三档调光台灯',price:75,cost:45}:i);
 const quantity=group?60:40,gift=packaging==='gift',price=items.reduce((n,i)=>n+i.price,0)+(gift?12:0),unitCost=items.reduce((n,i)=>n+i.cost,0)+(gift?8:0),revenue=price*quantity,cost=unitCost*quantity,deposit=group?0:Math.floor(revenue*.5),deliveryDay=state.day+(group?5:6),paymentDay=deliveryDay+(group?0:3),operatingCost=(paymentDay-state.day)*30,requiredCash=cost-deposit+operatingCost;
 const demand=caseGrowthDemand(state,e.referrerId).filter(d=>review.products.includes(d.id)),waiting=demand.filter(d=>!d.ready),waitingUntil=Math.max(state.day,...demand.map(d=>d.readyDay));
 const reason=waiting.length?waiting.map(d=>`${ITEMS.find(i=>i.id===d.id).name}还余${d.remaining}件`).join('、')+(group?'；采购部还有这批余量，暂不重复备货。':'；店里还没卖完，这组暂不补货。'):!Array.isArray(state.history)||state.history.length>4096-3?'经营记录容量已满或无法确认，暂不能签新项目。':!Number.isFinite(state.cash)||!Number.isInteger(state.day)||state.day<0?'资金或经营日期无法确认。':state.cash<requiredCash?'资金不足以覆盖生产和回款前支出。':'';
 return {referrerId:e.referrerId,referrerName:e.source.referrerName,sourceBuyer:e.source.buyer,agreement:e.agreement,terms:'delivery',products:items.map(i=>i.id),productNames:items.map(i=>i.name),quantity,packaging,price,unitCost,cost,revenue,deposit,balanceDue:revenue-deposit,operatingCost,netProfit:revenue-cost-operatingCost,deliveryDay,paymentDay,requiredCash,cashAfterSigning:state.cash+deposit-cost,cashAfterPayment:state.cash+revenue-cost-operatingCost,buyer:group?'集团采购 · 用途专案':'概念店采购 · 工作室陈列',...(items.some(i=>i.id==='mira')&&p.lampVersion==='developed'?{lampVersion:'developed'}:{}),purpose:'studio-project',studioDirection:p.direction,studioBrief:p.briefId,layout:p.layout,light:p.light,waitingUntil,waitingCost:(waitingUntil-state.day)*30,valid:!reason,reason};
}

// A buyer asks for another use only after accepting a real delivered project.
// Previous specifications remain callable; proposing does not overwrite a contract.
export function groupProjectChange(state){
 const p=state.studioProject;
 if(p?.direction!=='group')return null;
 const delivered=(state.caseGrowthHistory||[]).filter(h=>h.status==='paid'&&h.purpose==='studio-project'&&h.studioDirection==='group'&&h.referrerId===p.referrerId);
 if(!delivered.length)return null;
 const last=delivered.at(-1),next=last.studioBrief==='bedside'?'welcome':'bedside';
 const approved={...(state.groupProjectSpecs||{}),...(state.studioProjectPlans?.group?{[state.studioProjectPlans.group.briefId]:state.studioProjectPlans.group}:{})};
 return {next,deliveredBrief:last.studioBrief,approved,available:!approved[next],message:last.studioBrief==='bedside'?'床头那批已经收到。前厅也想用同一系列：不要灯，杯子配一块茶台布。能另留一份规格吗？':'茶台那批已经收到。客房想沿用这套风格，但需要床头调光灯和水杯，能另留一份规格吗？'};
}
