import {CURATION_PRODUCTS} from './deal-room-engine.js';
import {catalogueVersions} from './deal-room-design-catalogue.js';
/** UNSHIPPED pure proposal experiment. No signing, persistence, rewards or new buyers.
 * Design hypotheses: existing Atelier asks for a complete 40-set gift assortment;
 * existing Northline asks for a two-product standard daily assortment. These are
 * candidate briefs for playtesting, NOT demands inferred from saved contracts.
 * Reuses product prices, gift +12/+8, 4/6 delivery days +2/3 payment days,
 * 30/day office costs, and chain's 50%-deposit-for-5%-discount convention.
 */
const names={atelier:'Élise · Atelier',northline:'Adrian · Northline'};
const key=id=>id==='northline-private'?'northline':id;
const sourceFor=(s,id)=>(s.curationHistory||[]).find(c=>c.status==='paid'&&c.referrerId===id);
export function cooperationDeskBriefs(state,{referrerId}={}){
 const source=sourceFor(state,referrerId);if(!source||!Array.isArray(source.products)||source.products.length<2)return [];
 const known=new Set((state.collection?.orders||[]).filter(o=>o.status==='paid').map(o=>key(o.buyerId)));
 for(const c of state.curationHistory||[])if(c.status==='paid'){if(c.buyer?.startsWith('Atelier'))known.add('atelier');if(c.buyer?.startsWith('Northline'))known.add('northline');}
 return ['atelier','northline'].filter(id=>known.has(id)).map(buyerId=>({experimental:true,buyerId,buyer:names[buyerId],referrerId,quantity:40,budget:7200,
  requirement:buyerId==='atelier'?'完整组合做成礼赠套装':'两款标准商品做日常补货',
  requiredPackaging:buyerId==='atelier'?'gift':'plain',requiredProductCount:buyerId==='atelier'?source.products.length:2,
  availableProducts:[...source.products],requiredProducts:buyerId==='atelier'?[...source.products]:[],
  lampPolicy:buyerId==='atelier'?'verified-sample':'standard-only',payments:['deposit30','deposit50']}));
}
export function previewCooperationDesk(state,draft={}){
 const brief=cooperationDeskBriefs(state,draft).find(b=>b.buyerId===draft.buyerId);
 const base={experimental:true,proposalOnly:true,brief:brief||null,customerMatched:false,rightsAllowed:false,affordable:false,valid:false};
 const fail=(reason,extra={})=>({...base,...extra,reason});
 if(!brief)return fail('先选择真实已交付案例和已经合作的买手。');
 const {products,packaging,payment,versionId='generic',lampVersion='standard'}=draft,source=sourceFor(state,draft.referrerId);
 if(!Array.isArray(products)||new Set(products).size!==products.length||products.some(id=>!source.products.includes(id)||!CURATION_PRODUCTS.some(p=>p.id===id))||!['plain','gift'].includes(packaging)||!['deposit30','deposit50'].includes(payment)||!['standard','developed'].includes(lampVersion))return fail('请选择案例里实际已有的商品、包装和付款方案。');
 if(lampVersion==='developed'&&(!products.includes('mira')||state.productDevelopment?.status!=='active'||state.productDevelopment.factory!=='studio'))return fail('调光方案必须有已验收的三档实物样，不能把标准批量灯当作调光灯。');
 const mismatch=packaging!==brief.requiredPackaging?(brief.buyerId==='atelier'?'礼赠用途需要成套包装。':'日常补货不采购礼盒。'):products.length!==brief.requiredProductCount?'商品数量不符合这份用途需求。':brief.requiredProducts.some(id=>!products.includes(id))?'礼赠需要保留案例的完整组合。':brief.lampPolicy==='standard-only'&&lampVersion==='developed'?'这次日常补货只接受原标准款，不为调光升级采购。':'';
 const version=versionId==='generic'?null:catalogueVersions(state).find(v=>v.id===versionId);
 let rightsReason='';
 if(versionId!=='generic'){
  if(!version)rightsReason='没有这份实际留存的设计版本。';
  else if(!version.delivered)rightsReason='此实验只使用已实际交付的设计版本。';
  else if(!version.reusable&&version.exclusiveBuyer!==brief.buyerId&&version.buyerId!==brief.buyerId)rightsReason='这份版本不能向当前买手使用，原授权不改变。';
  else if(products.length!==version.products.length||version.products.some(id=>!products.includes(id)))rightsReason='已采用设计按原完整商品组合保留，删换商品不能仍称同一版本。';
  else if(version.kind==='independent-revision'&&(packaging!=='gift'||products.length!==version.products.length||version.products.some(id=>!products.includes(id))))rightsReason='已确认的分格内托是完整套装，不能直接宣称改成拆件补货。';
 }
 const quantity=40,items=CURATION_PRODUCTS.filter(p=>products.includes(p.id)).map(p=>p.id==='mira'&&lampVersion==='developed'?{...p,price:75,cost:45}:p);
 const unitPrice=items.reduce((n,p)=>n+p.price,packaging==='gift'?12:0),unitCost=items.reduce((n,p)=>n+p.cost,packaging==='gift'?8:0),listRevenue=unitPrice*quantity,discount=payment==='deposit50'?5:0,revenue=Math.floor(listRevenue*(100-discount)/100),cost=unitCost*quantity,deposit=Math.floor(revenue*(payment==='deposit50'?50:30)/100),deliveryDays=packaging==='gift'?6:4,payLag=packaging==='gift'?3:2,operatingCost=(deliveryDays+payLag)*30,requiredCash=cost-deposit+operatingCost;
 if(!Number.isSafeInteger(state.cash)||state.cash<0||!Number.isSafeInteger(state.day)||state.day<1||state.day>Number.MAX_SAFE_INTEGER-10)return fail('资金或日期不能安全计算。');
 const affordable=state.cash>=requiredCash,reason=mismatch||rightsReason||(!affordable?'现有现金不足以覆盖这份方案的制作与回款前开支。':'仅为提案预览，尚未签约。');
 return {...base,customerMatched:!mismatch,rightsAllowed:!rightsReason,affordable,valid:!mismatch&&!rightsReason&&affordable,reason,products:[...products],packaging,payment,versionId,lampVersion,quantity,unitPrice,unitCost,listRevenue,discount,revenue,cost,deposit,balanceDue:revenue-deposit,operatingCost,requiredCash,cashShortfall:Math.max(0,requiredCash-state.cash),netProfit:revenue-cost-operatingCost,deliveryDay:state.day+deliveryDays,paymentDay:state.day+deliveryDays+payLag,cashAfterSigning:state.cash+deposit-cost,customerReason:mismatch,rightsReason};
}
