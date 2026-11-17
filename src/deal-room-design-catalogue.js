import {acceptedLampSample} from './deal-room-development.js';
import {revisionCatalogueVersion} from './deal-room-collection-revision.js';
/** Rights facts only. A version is not a new customer, order or inventory pool.
 * These are fictional game agreements, not a real-world legal interpretation. */
const BUYERS={atelier:'Atelier',northline:'Northline'};
const buyerKey=id=>id==='northline-private'?'northline':id;
const STYLES=new Set(['cream','charcoal','botanical']);
const PRODUCT_IDS=new Set(['mira','samir','ines']);
const paidOrders=c=>(c.orders||[]).filter(o=>o.status==='paid');
const signedOrders=c=>[...(c.orders||[]),...(c.status==='production'&&c.active?[c.active]:[])];
export function catalogueVersions(state){
 const c=state?.collection;if(!c||!['own','private'].includes(c.model)||!STYLES.has(c.style)||!Array.isArray(c.products))return [];
 const signed=signedOrders(c),paid=paidOrders(c),products=[...c.products],lampVersion=c.lampVersion==='developed'?'developed':'standard',seriesDelivered=paid.length>0;
 if(c.model==='private'){
  if(!signed.length)return [];
  return [{id:'private:northline',kind:'private-label',title:'Northline 贴牌版本',style:c.style,products,lampVersion,owner:'northline',buyerId:'northline',exclusiveBuyer:'northline',reusable:false,delivered:seriesDelivered,seriesDelivered,reason:'这套贴牌包装属于 Northline，案例引荐的新客户不是 Northline，不能擅自转用。'}];
 }
 const exclusiveBuyer=buyerKey(c.exclusiveBuyer||signed.find(o=>o.scope==='whole-exclusive')?.buyerId)||null;
 const uncertain=signed.some(o=>o.scope?!['nonexclusive','whole-exclusive','buyer-sleeve'].includes(o.scope):o.negotiated===true);
 const reusable=!exclusiveBuyer&&!uncertain;
 const versions=[{id:'original',kind:'original',title:'工作室原稿',style:c.style,products,lampVersion,owner:'workshop',buyerId:null,exclusiveBuyer,reusable,delivered:paid.some(o=>o.scope!=='buyer-sleeve'),seriesDelivered,reason:exclusiveBuyer?`原系列已约定只供 ${BUYERS[exclusiveBuyer]||'原买方'}；改颜色、换包装或更换转介来源都不会解除独家。`:uncertain?'已有合同范围暂不能确认，不自动开放原稿。':'原稿保留在工作室，可以向其他客户提出采用方案；提案不等于客户已采用。'}];
 const sleeves=new Map();for(const order of signed)if(order.scope==='buyer-sleeve')sleeves.set(buyerKey(order.buyerId),order);
 for(const [buyerId,order] of sleeves){const name=BUYERS[buyerId]||'原买方';versions.push({id:`sleeve:${buyerId}`,kind:'buyer-sleeve',title:`${name} 专用纸套`,style:order.style||c.style,products:[...products],lampVersion,owner:buyerId,buyerId,exclusiveBuyer:buyerId,reusable:false,delivered:paid.some(o=>o.scope==='buyer-sleeve'&&buyerKey(o.buyerId)===buyerId),seriesDelivered,reason:`这份纸套只给 ${name} 使用，不能直接交给案例引荐的新客户；不因此限制工作室原稿。`});}
 const revision=revisionCatalogueVersion(state);if(revision)versions.push(revision);
 return versions;
}
export function catalogueProposal(state,draft={}){
 const {route,versionId,products}=draft,version=catalogueVersions(state).find(v=>v.id===versionId),history=(state?.caseGrowthHistory||[]).filter(h=>h.status==='paid'&&h.agreement===route),refs=new Set(history.map(h=>h.referrerId));
 const customer=history.length?{route,referrerId:history[0].referrerId,title:route==='portfolio'?'案例引荐的概念店':'案例引荐的集团采购'}:null;
 const selected=Array.isArray(products)?[...products]:[],hasLamp=selected.includes('mira'),lampVersion=hasLamp?(draft.lampVersion??version?.lampVersion??'standard'):null;
 const rightsEligible=!!version?.reusable,requiresCustomerConfirmation=route==='private'&&rightsEligible;
 const base={valid:false,reason:'',route,versionId,version:version||null,customer,products:selected,style:version?.style??null,lampVersion,rightsEligible,requiresCustomerConfirmation,proposalOnly:true};
 const fail=reason=>({...base,reason});
 if(!['portfolio','private'].includes(route))return fail('请选择已经建立的持续客户。');
 if(!version)return fail('没有这份已制作并保留权利记录的系列版本。');
 if(version.kind==='independent-revision')return fail('潮汐分格新版本需在自己的授权与采购桌单独确认，不能套用旧原稿合同。');
 if(!rightsEligible)return fail(version.reason);
 if(!version.seriesDelivered)return fail('这套系列还没有实际交付，先完成已有的系列合作。');
 if(!customer)return fail('先完成这条路线的首次客户合作，再向该联系人提出系列采用方案。');
 if(refs.size!==1)return fail('这条路线出现多个客户来源，先核清原联系人，不能借样册新建客户。');
 if(!Array.isArray(products)||!selected.length||new Set(selected).size!==selected.length||selected.some(id=>!PRODUCT_IDS.has(id))||selected.length!==version.products.length||selected.some(id=>!version.products.includes(id)))return fail('沿用这份系列需要保留原稿实际整套产品；删换商品请回原自主选品，不把新组合说成原系列。');
 if(draft.lampVersion!==undefined&&!['standard','developed'].includes(draft.lampVersion))return fail('台灯型号无法确认，请选择实际已有的型号。');
 if(hasLamp&&lampVersion==='developed'){
  const sample=acceptedLampSample(state,'studio')||state.productDevelopment;if(sample?.status!=='active')return fail('先验收调光实物样，不能仅凭改写型号采用新品。');
  if(sample.factory!=='studio')return fail('180 盏起做的批量暖光样不是三档调光样，不能当作小批调光型号复用。');
 }
 if(route==='private')return fail('集团尚未确认这套工作室系列，原目录不会因为提案自动改动；需要另行确认实际用途与规格。');
 return {...base,valid:true,products:[...version.products],reason:'原稿权利与实物依据允许向这位概念店客户提出整套系列方案；报价、余货及实际签约仍须核实。'};
}
