import {LEGACY_EQUIPMENT_ACTION_KEYS,canonicalLegacyEquipmentAction,applyLegacyEquipmentAction} from './deal-room-equipment-legacy.js';
import {PROMOTION_ACTION_KEYS,canonicalPromotionAction,applyPromotionAction} from './deal-room-promotion.js';
import {canonicalWorkspaceSleep,applyWorkspaceSleep} from './deal-room-workspace-sleep.js';
import {PROPERTY_ACTION_KEYS,canonicalPropertyAction,applyPropertyAction} from './deal-room-property.js';
import {OUTING_ACTION_KEYS,canonicalOutingAction,applyOutingAction} from './deal-room-outings.js';
import {MARKET_ACTION_KEYS,canonicalMarketAction,applyMarketAction} from './deal-room-market.js';
import {LINEN_FREIGHT_ACTIONS,canonicalLinenFreight,applyLinenFreight} from './deal-room-linen-freight.js';
import {ATELIER_RESTOCK_ACTIONS,canonicalAtelierRestock,applyAtelierRestock} from './deal-room-atelier-restock.js';
import {SHOP_TRIAL_ACTIONS,canonicalShopTrialAction,applyShopTrialAction} from './deal-room-shop-trial.js';
import {EXHIBITION_ACTION_KEYS,canonicalExhibitionAction,applyExhibitionAction} from './deal-room-exhibition.js';
import {ANNEX_ACTION_KEYS,canonicalAnnexAction,applyAnnexAction} from './deal-room-annex.js';
import {canonicalOfficeAction,applyOfficeAction,OFFICE_ACTION_KEYS} from './deal-room-office.js';
import {canonicalLifeAction,applyLifeAction,LIFE_ACTION_KEYS} from './deal-room-life.js';
import {stockProcurementOpportunity,previewStockProcurement,previewStudioProjectFromStock} from './deal-room-stock-procurement.js';
import {revisionOpportunity,previewRevisionOrder} from './deal-room-collection-revision.js';
import {roundReceivablesActive,roundReceivableSummary,previewRoundSigning,advanceRoundTime} from './deal-room-round-receivables.js';
import {previewStudioAllocation} from './deal-room-allocation.js';
import {launchBasis,launchReview} from './deal-room-launch.js';
import {studioProjectEligibility,studioProjectReview,previewStudioProjectOrder,groupProjectChange} from './deal-room-studio-project.js';
import {previewCatalogueOrder,previewFirstCatalogueOrder} from './deal-room-catalogue-order.js';
import {caseGrowthOffers,previewCaseGrowth,caseGrowthDemand,previewCaseCalloff,canCalloffCase,canProposeCaseLamp,previewApprovedCaseLamp} from './deal-room-case-growth.js';
import {SAMPLE_FACTORIES,developmentOffer,hasLampDevelopmentCase,acceptedLampSample,secondDevelopmentOffer,SECOND_SUPPLIER_ACTIONS,canonicalSecondSupplierAction,applySecondSupplierAction} from './deal-room-development.js';
import {retailDemand,retailWait,retailPause} from './deal-room-demand.js';
import {collectionSeedChoices,collectionQuote,COLLECTION_STYLES,collectionPitchOffers,previewCollectionPitch} from './deal-room-collection.js';
import {previewAccount,canExpandAccount,accountCollectionBasis,accountRevisionBasis,accountExpansionBases} from './deal-room-account.js';
/** Isolated modern trade experiment. All amounts are fictional settled RMB integers.
 * Design assumptions, not real export quotations: 30/day office cost; freight,
 * inspection and conversion included in cost. No random acceptance or old saves.
 */
const DAY_COST = 30;
export const MAX_DEAL_ACTIONS = 4096;
const canStartDeal = state => state.history.length <= MAX_DEAL_ACTIONS - 5;
const copy = value => JSON.parse(JSON.stringify(value));
const offer = (id,title,exchange,quantity,revenue,cost,deliveryDays,payLag,accepted=true,reason='') =>
  ({id,title,exchange,quantity,revenue,cost,deliveryDays,payLag,accepted,reason});
const CLIENTS = [
  {id:'mira',name:'Mira · Forma 家居',country:'荷兰',product:'便携台灯',
    brief:'先试卖，还是一次铺满三家店？两种规模都能接，付款条件要一起谈。',
    requirements:['首批至少 60 盏；同一色温标准','小批交货付款；全量可接受 4 天账期'],
    options:[
      offer('trial','60 盏试单 · 交货付款','少赚一些，3 天收齐货款，赶得上下位客户的开业补货。',60,2400,1800,3,0),
      offer('rollout','120 盏铺货 · 留 4 天账期','多做一批赚更多，资金占用 9 天；下位客户只能接常规需求。',120,4500,3200,5,4)
    ]},
  {id:'samir',name:'Samir · Nawa 精品店',country:'阿联酋',product:'不锈钢保温杯',
    brief:'新店开业需要先到一批。错过开业日期也能合作，但只按常规补货预算谈。',
    requirements:['开业批必须在第 7 天前送达','可用无印字现货；定制包装要延后'],
    options:[
      offer('ready','80 只现货 · 保开业','用无印字现货换加急预算，交货付款。',80,4100,2600,2,0),
      offer('branded','120 只定制 · 延后补货','放弃开业批，保留定制包装与更大的订单，接受 3 天账期。',120,4600,2800,5,3),
      offer('promise','120 只定制 · 仍保开业','定制要 5 天，不能同时承诺第 7 天到货。',120,4600,2800,5,3,false,'定制要 5 天，赶不上开业。改现货，或把用途改成后续补货。')
    ]},
  {id:'ines',name:'Inês · Linha 生活馆',country:'葡萄牙',product:'棉麻桌布',
    brief:'先给两家店试卖，还是替整个季度备货？我愿意为备货付定金，但尾款不能太急。',
    requirements:['统一面料与尺寸，不能靠降规格压价','小单交货付款；季度备货先付 30%，尾款晚 6 天','季度陈列批第 11 天前到货按 6,200；之后常规备货按 5,800'],
    options:[
      offer('small','50 条试卖 · 交货付款','不收定金，3 天结束这一单；利润较少。',50,2900,2000,3,0),
      {...offer('season','150 条备货 · 30% 定金','客户先付 1,860，尾款在交货后 6 天收到；总利润更高。',150,6200,4300,5,6),deposit:1860},
      offer('all-now','150 条备货 · 全款预付','规模不减，也不让账期。',150,6200,4300,5,0,false,'季度备货不能全款预付。可以先付 30%，或者缩成小单交货付款。')
    ]}
];
// A retail-ready packaging request comes from an actual paid custom cup, not trust points.
// Both new jobs retain the ordinary signing, delivery, receivables and demand rules.
function cupShelfProofOffers(state){
 const orders=state.contracts.filter(c=>c.clientId==='samir');
 if(!orders.some(c=>c.status==='paid'&&(c.optionId==='branded'||c.optionId==='branded-opening'||c.specification==='branded')))return [];
 const first=orders.find(c=>['cup-front-proof','cup-back-proof'].includes(c.optionId));
 if(first&&first.status!=='paid')return [];
 const follow=first?'沿用已交付的上架版：':'本次上架要求标签不能压折线。';
 const a={...offer('cup-front-proof','上架纸套 · 正面留标','正面让出印刷位。四天交货，货到付清。',120,5040,3360,4,0),specification:'branded',proofProduct:'保温杯 · 正面印标纸套'};
 const b={...offer('cup-back-proof','上架纸套 · 保留封面另做背贴','保留正面纹样，背面另贴。六天交货，定金三成、交货后三天收清。',120,5640,3720,6,3),deposit:1692,specification:'branded',proofProduct:'保温杯 · 独立背贴纸套'};
 return [a,b].filter(o=>!first||first.optionId===o.id).map(o=>({...o,exchange:follow+o.exchange}));
}

/** Reorders use the latest settled specification, never a hidden trust score. */
function reorderContext(state,clientId){
  const client=CLIENTS.find(c=>c.id===clientId);
  const last=state.contracts.findLast(c=>c.clientId===clientId&&c.status==='paid');
  if(!client||!last)return null;
  const large=last.quantity>({mira:60,samir:80,ines:50}[clientId]);
  const branded=clientId==='samir'&&(last.optionId==='branded'||last.specification==='branded');
  const basis={optionId:last.optionId,quantity:last.quantity,paidDay:last.paymentDay};
  const consequence=large?'上批已做规模备货，本次先补畅销货；继续大批采购需要更长账期。':'上批小单已完成规格确认，本次可沿用规格扩大备货，也可保持小批周转。';
  const data={
    mira:{small:[60,2500,1800,1,0],large:large?[180,6600,4800,4,7]:[150,5700,4100,4,4]},
    samir:{small:[80,branded?3500:3100,branded?2400:2100,branded?3:2,0],large:large?[200,6900,4900,5,7]:[160,5900,4200,4,5]},
    ines:{small:[50,3300,2100,3,0],large:large?[200,7400,5300,5,8]:[150,6000,4300,4,5]}
  }[clientId];
  const options=[offer('repeat-small','小批补货 · 交货付款','少垫款、较快收齐；本次总净赚较少。',...data.small),
    {...offer('repeat-scale','扩大备货 · 定金留账期','先收 30% 定金，扩大数量；尾款更晚，日常费用更多。',...data.large),deposit:Math.floor(data.large[1]*.3)}];
  // Settled repeat customers can exchange a real price concession for earlier
  // payment. Original small/scale terms and old journals remain unchanged.
  const [quantity,revenue,cost,days,lag]=data.small,prepaidRevenue=revenue-200;
  const prepaidDeposit=Math.floor(prepaidRevenue*.8);
  if(prepaidDeposit>=cost+(days+lag)*DAY_COST)options.push({
    ...offer('repeat-prepaid','小批补货 · 让价换八成预付','沿用已经交付的规格，这批总价少收 ¥200；客户先付八成，交货时结清余款。',quantity,prepaidRevenue,cost,days,lag),deposit:prepaidDeposit
  });
  for(const o of options)o.specification=branded?'branded':'standard';
  if(clientId==='samir')options.push(...cupShelfProofOffers(state));
  if(clientId==='mira'&&state.productDevelopment?.status==='active'){for(const o of options)o.title='旧款 · '+o.title;options.push(developmentOffer(state));const second=secondDevelopmentOffer(state);if(second)options.push(second);}
  return {client,last,basis,consequence:consequence+(clientId==='samir'?(branded?' 沿用上批定制版样，不再重新打样。':' 沿用无印字现货，补货 2 天交付。'):''),options};
}
// Unanswered opening inquiries. Browsing projects a different buyer onto the same day/cash;
// only a submitted alternate proposal becomes a journal entry.
export function openFirstBuyers(state){
 if(!state||state.phase!=='negotiating'||state.businessRound||state.clientProjectActive)return [];
 const contracted=new Set(state.contracts.map(o=>o.clientId));
 return CLIENTS.filter(c=>!contracted.has(c.id)).map(c=>({id:c.id,name:c.name,product:c.product,index:CLIENTS.indexOf(c)}));
}
export function firstBuyerProjection(state,id){
 const c=openFirstBuyers(state).find(c=>c.id===id);
 return c&&state.clientIndex!==c.index?{...state,clientIndex:c.index}:state;
}
/** A single finite client season. Explicit opt-in preserves all previous journals. */
const PROJECTS={
 mira:{title:'新店灯光橱窗',offset:5,brief:'新店橱窗要亮起来。可以先布置一个角落，也可以把整套灯光系列一次铺齐。',small:[60,2800,1800,2,0],large:[150,6200,4100,4,4],regular:[2500,5700],labels:['先布置样板角','完整灯光系列']},
 samir:{title:'城市快闪开场',offset:7,brief:'快闪开场要有能带走的礼物。现货保住开场；定制包装要给工厂留足时间。',small:[80,4100,2600,2,0],large:[120,5200,2800,5,3],regular:[3100,4600],labels:['现货开场礼','定制品牌礼盒']},
 ines:{title:'周末餐桌专题',offset:10,brief:'专题陈列需要统一桌布。先做主桌，或一次备足整个系列，两种都能成为陈列案例。',small:[50,3600,2100,3,0],large:[150,6800,4300,4,5],regular:[3300,6000],labels:['先做主桌','完整餐桌系列']}
};
export const CURATION_PRODUCTS=[
 {id:'mira',name:'便携台灯',kind:'lamp',price:55,cost:30},
 {id:'samir',name:'保温杯',kind:'cup',price:48,cost:26},
 {id:'ines',name:'棉麻桌布',kind:'linen',price:42,cost:24}
];
export function curationOffers(state){
 if(!state.clientProjectSeason||state.clientProjectActive)return [];
 return clientProjects(state).filter(p=>p.completed&&!(state.curationHistory||[]).some(c=>c.referrerId===p.id)).map(p=>({...p,referrerName:p.name,anchor:p.id,buyer:p.onTime?'Atelier · 生活方式买手店':'Northline · 连锁门店采购',purpose:p.onTime?'用你做过的产品，搭一组上新礼盒。':'把熟悉的产品配成门店日常补货组合。',giftAllowed:p.onTime,budget:7200}));
}
/** One first assortment invitation from actual opening deliveries.
 * Separate opt-in action leaves the old project/referral journal unchanged. */
export function openingCurationOffers(state){
 if(!['complete','review'].includes(state.phase)||state.clientProjectActive||state.curationHistory?.length||!canStartDeal(state))return [];
 const opening=CLIENTS.map(c=>(state.contracts||[]).find(o=>o.clientId===c.id&&o.status==='paid'&&!o.businessRound&&!o.projectId));
 if(opening.some(o=>!o))return [];
 const uses={mira:'用已交付的台灯，搭一个阅读角。',samir:'用已交付的保温杯，搭一组出行礼物。',ines:'用已交付的桌布，搭一个餐桌陈列。'};
 return CLIENTS.map((c,i)=>({id:c.id,referrerName:c.name,product:c.product,anchor:c.id,buyer:'Atelier · 生活方式买手店',purpose:uses[c.id],giftAllowed:true,budget:7200,source:'opening-delivery',deliveredQuantity:opening[i].quantity}));
}
export function previewCuration(state,draft={}){
 const brief=state.curation;
 if(!brief||brief.status!=='draft')return {valid:false,reason:'这份选品委托已经处理。'};
 const ids=draft.products;
 if(!Array.isArray(ids)||new Set(ids).size!==ids.length||ids.some(id=>!CURATION_PRODUCTS.some(p=>p.id===id))||![40,60].includes(draft.quantity)||!['plain','gift'].includes(draft.packaging))return {valid:false,reason:'请选桌上的产品、套数与包装。'};
 const developed=draft.lampVersion==='developed';
 const sampleReason=developed&&(!ids.includes('mira')||!acceptedLampSample(state,'studio')&&!acceptedLampSample(state,'line'))?'先把已验过的新台灯加入组合。':developed&&!acceptedLampSample(state,'studio')?'这家工厂的新批量成本要180盏起做，不能用于40或60套组合。':developed&&!brief.giftAllowed?'这位买手只采购原来的标准款，不为调光功能另付预算。新样可以留给主题买手。':'';
 const selected=CURATION_PRODUCTS.filter(p=>ids.includes(p.id)).map(p=>developed&&p.id==='mira'?{...p,name:'三档调光台灯',price:75,cost:45}:p),gift=draft.packaging==='gift';
 const price=selected.reduce((n,p)=>n+p.price,0)+(gift?12:0),unitCost=selected.reduce((n,p)=>n+p.cost,0)+(gift?8:0),revenue=price*draft.quantity,cost=unitCost*draft.quantity;
 const deliveryDay=state.day+(gift?6:4),paymentDay=deliveryDay+(gift?3:2),operatingCost=(paymentDay-state.day)*DAY_COST,deposit=Math.floor(revenue*.5);
 const reason=sampleReason||(!ids.includes(brief.anchor)?'保留引荐案例里的那件产品，再搭一件。':ids.length<2?'买手要一组搭配，再添一件不同产品。':gift&&!brief.giftAllowed?'日常补货不需要礼盒，换成常规包装即可。':revenue>brief.budget?`超过预算 ${revenue-brief.budget}；${ids.length>2?'可以减为 40 套，或少选一件':developed?'可以改回旧款，或减为 40 套':'可以换更便宜的搭配，或减为 40 套'}。`:state.cash<cost-deposit+operatingCost?'可用资金不够覆盖备货与回款前支出。':!canStartDeal(state)?'经营记录容量已满，暂不能接新委托。':'');
 return {valid:!reason,reason,...(developed?{lampVersion:'developed',productNames:selected.map(p=>p.name)}:{}),products:selected.map(p=>p.id),quantity:draft.quantity,packaging:draft.packaging,revenue,cost,price,deposit,balanceDue:revenue-deposit,deliveryDay,paymentDay,operatingCost,netProfit:revenue-cost-operatingCost,cashAfterSigning:state.cash+deposit-cost,cashAfterPayment:state.cash+revenue-cost-operatingCost};
}
function clientProjectContext(state,id,trackRetail=true){
 const d=PROJECTS[id],c=CLIENTS.find(c=>c.id===id);if(!d||!state.clientProjectSeason)return null;
 const deadline=state.clientProjectSeason.startDay+d.offset;
 const options=[d.small,d.large].map((values,i)=>{
  const [quantity,revenue,cost,deliveryDays,payLag]=values,onTime=state.day+deliveryDays<=deadline;
  // A seasonal inquiry that misses its event becomes a regular retail
  // delivery only under the player's inventory-planning mode. New IDs keep old
  // sealed agreements independent; neither a past invoice nor its price changes.
  const retailFallback=trackRetail&&state.retailPlanning&&!onTime,optionId=(i?'project-series':'project-focus')+(retailFallback?'-retail':'');
  return {...offer(optionId,onTime?d.labels[i]:(i?'整批系列补货':'小批现货补货'),`${quantity} 件 · ${i?'先付三成，尾款留账期':'交货付款'}${onTime?'':' · 用于门店日常销售'}`,quantity,onTime?revenue:d.regular[i],cost,deliveryDays,payLag),
   ...(retailFallback?{projectRetailDelivery:true}:{}),projectId:id,projectTitle:d.title,projectOnTime:onTime,specification:id==='samir'&&i?'branded':'standard',...(i?{deposit:Math.floor((onTime?revenue:d.regular[i])*.3)}:{})};
 });
 return {client:c,title:d.title,brief:options.some(o=>o.projectOnTime)?d.brief:`${d.title}这次赶不上了。这批保留原规格，改做门店日常补货。`,deadline,options};
}
export function clientProjects(state){
 if(!state.clientProjectSeason)return [];
 return CLIENTS.map(c=>{const p=clientProjectContext(state,c.id),done=state.contracts.find(x=>x.projectId===c.id&&x.status==='paid');return {id:c.id,name:c.name,product:c.product,title:p.title,deadline:p.deadline,completed:!!done,openForProject:p.options.some(o=>o.projectOnTime),onTime:done?.projectOnTime??null,quantity:done?.quantity||0,specification:done?.specification||'standard'};});
}
export function businessOpportunities(state){
  if(!['complete','portfolio','review','negotiating'].includes(state.phase))return [];
  if(state.clientProjectActive)return CLIENTS.map(c=>{
    const p=clientProjectContext(state,c.id),done=clientProjects(state).find(x=>x.id===c.id).completed;
    const selected={...state,clientIndex:CLIENTS.indexOf(c),phase:'negotiating'};
    const options=p.options.map(o=>previewOffer(selected,o.id)),available=!done&&options.some(o=>o.valid);
    return {id:c.id,name:c.name,country:c.country,product:c.product,basis:{quantity:0},title:p.title,deadline:p.deadline,consequence:done?'这份客户计划已经完成。':p.brief,options,available,reason:done?'已完成':available?'':options[0].reason};
  });
  return CLIENTS.flatMap(c=>{
    const context=reorderContext(state,c.id);if(!context)return [];
    const selected={...state,businessRound:state.businessRound||1,clientIndex:CLIENTS.indexOf(c),phase:'negotiating'};
    const options=context.options.map(o=>previewOffer(selected,o.id));const demand=retailDemand(state,c.id);
    return [{id:c.id,name:c.name,country:c.country,product:c.product,basis:context.basis,consequence:context.consequence,options,demand,
      available:options.some(o=>o.valid),reason:options.some(o=>o.valid)?'':options[0].reason}];
  });
}
export function createDealRoom(){return {version:1,day:1,cash:5000,clientIndex:0,phase:'negotiating',contracts:[],feedback:{kind:'welcome',message:'先看看客户要把这批货用在哪里。'},history:[]};}
export function currentClient(state){
  if(['complete','portfolio','review','curating','curation-fulfillment','account','collection','collection-revision','development','case-growth','atelier-restock','linen-freight'].includes(state.phase))return null;
  const c=CLIENTS[state.clientIndex]; if(!c)return null;
  if(state.clientProjectActive){const p=clientProjectContext(state,c.id);return {...c,brief:p.brief,requirements:p.options.some(o=>o.projectOnTime)?[`第 ${p.deadline} 天前交货用于${p.title}`,'日期来不及，可改谈门店补货']:['门店常规补货，保留原规格'],windowNote:'先做谁，会改变其他客户能否赶上专题。'};}
  if(state.businessRound){const r=reorderContext(state,c.id),last=state.contracts.at(-1);return {id:c.id,name:c.name,country:c.country,product:['fulfilling','paid'].includes(state.phase)&&last?.optionId==='developed-lamp'?last.product:c.product,brief:r.consequence,requirements:['沿用已确认规格，不降低品质','小批交货付款；规模备货先付 30%，尾款留账期'],windowNote:'主动选择经营哪位客户；本次结清后可继续同客，也可换客。'};}
  if(samirOpeningCustom(state))return {id:c.id,name:c.name,country:c.country,product:c.product,brief:c.brief,requirements:['第 7 天开业前交货','无印字现货做 2 天；定制包装做 5 天，交货后 3 天结清'],windowNote:'今天下单，两款都赶得上开业；定制款交货后还要等三天回款。'};
  return {id:c.id,name:c.name,country:c.country,product:c.product,brief:c.brief,requirements:[...c.requirements],windowNote:state.clientIndex===0?'下一位客户的开业批要在第 7 天前送到。':state.clientIndex===1?(state.day+2<=7?'现货还赶得上第 7 天开业。':'开业批已关闭，现货改按常规补货预算。')+' 下一位客户第 11 天前到货的陈列批有 400 溢价，备货需 5 天。':'陈列批第 11 天前到货有 400 溢价；之后仍可做常规备货。'};
}
// The same five-day customised cup and three-day terms can serve the opening
// only while there are five manufacturing days left. Keep historical proposal
// identities untouched: the earlier "promise" counter was never a signed order.
function samirOpeningCustom(state){
 if(state.phase!=='negotiating'||state.businessRound||state.clientProjectActive||state.clientIndex!==1)return null;
 const branded=CLIENTS[1].options.find(o=>o.id==='branded');
 return state.day+branded.deliveryDays<=7?{...branded,id:'branded-opening',title:'120 只定制 · 开业陈列',exchange:'定制包装照原工期制作；赶上开业，交货后三天结清。',specification:'branded'}:null;
}
export function quoteOptions(state){
  if(!currentClient(state))return [];
  if(state.clientProjectActive)return copy(clientProjectContext(state,CLIENTS[state.clientIndex].id).options);
  if(state.businessRound)return copy(reorderContext(state,CLIENTS[state.clientIndex].id).options);
  const options=copy(CLIENTS[state.clientIndex].options),timelySamir=samirOpeningCustom(state);
  if(timelySamir)options[2]=timelySamir;
  if(state.clientIndex===1 && state.day+2>7){
    Object.assign(options[0],{title:'80 只现货 · 常规补货',exchange:'开业批已关闭；按常规预算、5 天交货，不必支付加急费用。',revenue:2800,cost:2000,deliveryDays:5});
  }
  if(state.clientIndex===2 && state.day+5>11){
    Object.assign(options[1],{title:'150 条备货 · 30% 定金',revenue:5800,deposit:1740,exchange:'陈列档期已过，按常规备货价；先付 1,740，尾款在交货后 6 天收到。'});
    options[2].revenue=5800;
  }
  return options;
}
function projectScheduleNote(state,o,paymentDay){
 const remaining=clientProjects(state).filter(p=>!p.completed&&p.id!==o.projectId),open=remaining.filter(p=>p.openForProject);
 const lost=open.filter(p=>{const c=clientProjectContext(state,p.id);return paymentDay+Math.min(...c.options.map(o=>o.deliveryDays))>c.deadline;});
 const own=o.projectOnTime?`赶得上本客户第 ${clientProjectContext(state,o.projectId).deadline} 天专题。`:'按门店常规补货报价。';
 return own+(!remaining.length?'这笔收齐，三位客户的计划就都落地了。':lost.length?`这单收齐后，${lost.map(p=>p.title).join('、')}只能改做常规补货。`:open.length?'收齐后仍有其他专题机会，接下一单时再看日期。':'余下客户也按常规补货安排，不再追专题日期。');
}
export function previewOffer(state,optionId){
  const o=quoteOptions(state).find(x=>x.id===optionId)
    // Older proposals used this distinct rejected identity even on day one.
    ||(optionId==='promise'&&samirOpeningCustom(state)?CLIENTS[1].options.find(x=>x.id===optionId):null)
    ||(state.clientProjectActive&&state.retailPlanning&&['project-focus','project-series'].includes(optionId)?clientProjectContext(state,CLIENTS[state.clientIndex].id,false).options.find(x=>x.id===optionId):null);
  if(!o)return {valid:false,reason:'没有这份报价。'};
  const demand=state.businessRound&&!state.clientProjectActive?retailDemand(state,CLIENTS[state.clientIndex].id):null;
  if(demand&&!demand.ready)return {...o,valid:false,reason:`门店约余 ${demand.remaining} 件，第 ${demand.readyDay} 天才需要补货。先看其他客户，或做工作室的其他业务。`};
  const deposit=o.deposit||0,operatingCost=(o.deliveryDays+o.payLag)*DAY_COST;
  const cashRequired=o.id==='repeat-prepaid'?Math.max(0,o.cost-deposit+operatingCost):o.cost-deposit+operatingCost;
  const deliveryDay=state.day+o.deliveryDays,paymentDay=deliveryDay+o.payLag;
  const valid=state.phase==='negotiating'&&state.cash>=cashRequired&&canStartDeal(state);
  const quoted={...o,deposit,balanceDue:o.revenue-deposit,valid,
    reason:!canStartDeal(state)?'本份经营记录已到容量上限；已签合同仍可结清，请保留进度并查看账目。':state.phase!=='negotiating'?'这份合同已经处理。':state.cash<cashRequired?'现金不足以覆盖这单和回款前的日常费用。':o.reason,
    profit:o.revenue-o.cost,operatingCost,netProfit:o.revenue-o.cost-operatingCost,
    cashRequired,deliveryDay,paymentDay,cashAfterSigning:state.cash+deposit-o.cost,
    cashAfterPayment:state.cash+o.revenue-o.cost-operatingCost,
    opportunityNote:demand?`这批约供门店卖 ${Math.ceil(o.quantity/demand.rate)} 天；预计第 ${deliveryDay+Math.ceil(o.quantity/demand.rate)} 天再补货。期间可换客户或经营其他业务。`:state.clientProjectActive?projectScheduleNote(state,o,paymentDay)+(o.projectRetailDelivery?' 本批交付后计入门店余货，日常返单要等现货卖完。':''):state.businessRound?'小批周转更快；规模备货占资更久。结清后由你决定继续同客或换客。':state.clientIndex===0?(paymentDay+2<=7?'收款后，下一位客户的开业批还来得及。':'这单收齐后，将错过下一位客户的开业批；仍可谈常规补货。'):state.clientIndex===1?(paymentDay+5<=11?'收齐后还赶得上下一位客户的季度陈列批，合同额多 400。':'收齐后错过下一位客户的陈列档期，仍可做常规备货。'):'小单更早结束、大单总利润更高；收齐前不能抽回垫款。'};
  if(roundReceivablesActive(state)){const adjusted=previewRoundSigning(state,quoted,CLIENTS[state.clientIndex].id);return canStartDeal(state)?adjusted:{...adjusted,valid:false,reason:quoted.reason};}
  return quoted;
}
/** A finite, fully quoted two-delivery mandate, not permanent parallel capacity. */
export function careerOpportunity(state){
  const repeats=state.contracts.filter(c=>c.businessRound&&c.status==='paid');
  const counts=Object.fromEntries(CLIENTS.map(c=>[c.id,repeats.filter(x=>x.clientId===c.id).length]));
  const depth=Object.values(counts).some(n=>n>=2),network=Object.values(counts).filter(n=>n>=1).length>=2;
  return {eligible:!state.clientProjectActive&&(depth||network),paths:{depth,network},reason:depth||network?'已完成的返单可作为下一轮供货安排的合作依据。':'同一客户完成两次返单，或两位客户各完成一次返单，即可谈下一轮供货安排。',
    clients:CLIENTS.filter(c=>counts[c.id]>0).map(c=>({id:c.id,name:c.name,product:c.product,paidRepeats:counts[c.id],basis:reorderContext(state,c.id).basis}))};
}
export function previewSupplyPlan(state,{clientId,firstBatch,payment}={}){
  const opportunity=careerOpportunity(state),context=reorderContext(state,clientId);
  if(!context||!['small','large'].includes(firstBatch)||!['delivery','deposit'].includes(payment))return {valid:false,reason:'请选择客户、首批数量和结算条件。'};
  const base=context.options[0],totalQuantity=base.quantity*3,firstQuantity=base.quantity*(firstBatch==='large'?2:1);
  // Larger first delivery takes more production time and ties up more cash.
  // A public 4% cash discount exchanges price for payment on each delivery.
  const firstDeliveryDay=state.day+(firstBatch==='large'?5:3),secondDeliveryDay=state.day+8;
  const fullRevenue=base.revenue*3;
  const revenue=payment==='delivery'?Math.floor(fullRevenue*.96):fullRevenue;
  const deposit=payment==='deposit'?Math.floor(revenue*.3):0;
  const firstRevenue=Math.floor(revenue*firstQuantity/totalQuantity),lastRevenue=revenue-firstRevenue;
  const firstCost=base.cost*(firstBatch==='large'?2:1),lastCost=base.cost*(firstBatch==='large'?1:2);
  const lots=[{id:'first',quantity:firstQuantity,cost:firstCost,revenue:firstRevenue,startDay:state.day,deliveryDay:firstDeliveryDay,paymentDay:payment==='deposit'?secondDeliveryDay+4:firstDeliveryDay},
    {id:'second',quantity:totalQuantity-firstQuantity,cost:lastCost,revenue:lastRevenue,startDay:state.day+5,deliveryDay:secondDeliveryDay,paymentDay:payment==='deposit'?secondDeliveryDay+4:secondDeliveryDay}];
  lots[0].deposit=Math.floor(deposit*firstQuantity/totalQuantity);lots[1].deposit=deposit-lots[0].deposit;
  const finishDay=payment==='deposit'?secondDeliveryDay+4:secondDeliveryDay;
  const events=[{id:'first-delivery',day:firstDeliveryDay,kind:'delivery',lotId:'first',cost:0,income:payment==='delivery'?firstRevenue:0},
    {id:'second-start',day:state.day+5,kind:'start',lotId:'second',cost:lastCost,income:0},
    {id:'second-delivery',day:secondDeliveryDay,kind:'delivery',lotId:'second',cost:0,income:payment==='delivery'?lastRevenue:0}];
  if(payment==='deposit')events.push({id:'balance',day:finishDay,kind:'payment',lotId:null,cost:0,income:revenue-deposit});
  // At a shared date, collect delivery receipts before starting the next lot.
  events.sort((a,b)=>a.day-b.day||(a.kind==='delivery'?-1:1));
  let balance=deposit-firstCost,minBalance=Math.min(0,balance),day=state.day;
  for(const event of events){balance-=(event.day-day)*DAY_COST;minBalance=Math.min(minBalance,balance);balance+=event.income-event.cost;minBalance=Math.min(minBalance,balance);day=event.day;}
  const cashRequired=-minBalance,operatingCost=(finishDay-state.day)*DAY_COST,cost=firstCost+lastCost;
  const idle=['complete','portfolio','review'].includes(state.phase);
  const capacity=state.history.length<=MAX_DEAL_ACTIONS-events.length-2;
  const qualified=opportunity.eligible&&opportunity.clients.some(c=>c.id===clientId);
  const demand=retailDemand(state,clientId);
  const reason=demand&&!demand.ready?`门店还有货，第 ${demand.readyDay} 天再安排供货。`:!qualified?'该供货安排需要已完成返单的合作依据。':!idle?'请先结清手上已签的合同。':!capacity?'经营记录已到容量上限，请保留进度并查看账目。':state.cash<cashRequired?'现金不足以覆盖两批开工和回款前的日常费用。':'';
  return {valid:!reason,reason,clientId,clientName:context.client.name,product:context.client.product,firstBatch,payment,
    totalQuantity,lots,events,deposit,balanceDue:revenue-deposit,revenue,cost,operatingCost,totalOperatingCost:operatingCost,
    cashRequired,totalAdvance:cashRequired,cashAfterSigning:state.cash+deposit-firstCost,netProfit:revenue-cost-operatingCost,
    finishDay,completed:false,nextEventDay:events[0].day,cashAfterCompletion:state.cash+revenue-cost-operatingCost,
    requirements:[`首批至少 ${base.quantity} 件，最多可接 ${base.quantity*2} 件，第 ${state.day+5} 天前到货`, `余量在第 ${secondDeliveryDay} 天交齐，总需求 ${totalQuantity} 件`, '逐批付款按总价让 4%；或签约付 30% 定金，末批交货后 4 天结清'],
    terms:{firstMinimum:base.quantity,firstMaximum:base.quantity*2,firstDeadline:state.day+5,secondDeadline:secondDeliveryDay,
      cashDiscount:fullRevenue-revenue,
      explanation:'首批小量第 3 天到货，大量第 5 天到货；总数量和单位价格不变，较大首批更早占用采购款。逐批付款让总价 4%；30% 定金方案末批交货后 4 天收尾款。'}};
}

function collectionSeedDraft(basis){
 const items=CURATION_PRODUCTS.filter(p=>basis.products.includes(p.id)).map(p=>basis.lampVersion==='developed'&&p.id==='mira'?{...p,price:75,cost:45}:p);
 return {status:'draft',products:items.map(p=>p.id),price:items.reduce((n,p)=>n+p.price,0),cost:items.reduce((n,p)=>n+p.cost,0),orders:[],...(basis.lampVersion?{lampVersion:basis.lampVersion}:{})};
}
function apply(state,action){
  if(Object.hasOwn(LEGACY_EQUIPMENT_ACTION_KEYS,action.type))return applyLegacyEquipmentAction(state,action,canStartDeal(state));
  if(Object.hasOwn(PROMOTION_ACTION_KEYS,action.type)){
    if(!canStartDeal(state))return state;
    const next=applyPromotionAction(state,action);
    return next===state?state:{...next,history:[...state.history]};
  }
  if(action.type==='SLEEP_TO_NEXT_DAY')return applyWorkspaceSleep(state,action);
  if(Object.hasOwn(OUTING_ACTION_KEYS,action.type))return applyOutingAction(state,action,canStartDeal(state));
  if(state.phase==='outing-trip')return state;
  if(Object.hasOwn(PROPERTY_ACTION_KEYS,action.type)){
    if(!['review','complete'].includes(state.phase)||!canStartDeal(state))return state;
    const next=applyPropertyAction(state,action);
    return next===state?state:{...next,history:[...state.history]};
  }
  if(typeof MARKET_ACTION_KEYS!=='undefined'&&Object.hasOwn(MARKET_ACTION_KEYS,action.type))return applyMarketAction(state,action,canStartDeal(state));
  // Do not let an unrelated career/office action interrupt an outstanding new-goods lot.
  if(state.phase==='market')return state;
  if(action.type==='SIGN_OWN_COLLECTION_FROM_CASE'){
    const b=collectionSeedChoices(state).find(o=>o.referrerId===action.referrerId&&!o.current);
    if(!b)return state;const projected={...state,collection:collectionSeedDraft(b)},n=apply(projected,{type:'SIGN_COLLECTION',model:'own',style:action.style});
    if(n===projected)return state;n.collection.seedCase={referrerId:b.referrerId,paymentDay:b.day};return n;
  }
  if(action.type==='PROPOSE_OPENING_QUOTE'){
    const projected=firstBuyerProjection(state,action.clientId);
    if(projected===state)return state;
    const next=apply(projected,{type:'PROPOSE',optionId:action.optionId});
    if(next===projected)return state;
    next.openingOrderChosen=true;return next;
  }
  if(Object.hasOwn(LINEN_FREIGHT_ACTIONS,action.type))return applyLinenFreight(state,action,canStartDeal(state));
  if(Object.hasOwn(ATELIER_RESTOCK_ACTIONS,action.type))return applyAtelierRestock(state,action,canStartDeal(state));
  if(Object.hasOwn(SHOP_TRIAL_ACTIONS,action.type))return applyShopTrialAction(state,action);
  if(Object.hasOwn(EXHIBITION_ACTION_KEYS,action.type))return applyExhibitionAction(state,action);
  if(Object.hasOwn(ANNEX_ACTION_KEYS,action.type))return applyAnnexAction(state,action);
  if(Object.hasOwn(OFFICE_ACTION_KEYS,action.type))return applyOfficeAction(state,action);
  if(Object.hasOwn(LIFE_ACTION_KEYS,action.type))return applyLifeAction(state,action);
  if(Object.hasOwn(SECOND_SUPPLIER_ACTIONS,action.type))return applySecondSupplierAction(state,action);
  if(action.type==='ENABLE_ROUND_RECEIVABLES'){
    if(roundReceivablesActive(state)||state.phase!=='portfolio'||!state.businessRound||state.businessTarget!==2||state.businessSigned!==0||state.clientProjectActive||state.contracts.some(c=>['fulfilling','receivable'].includes(c.status))||state.history.length>MAX_DEAL_ACTIONS-16||!businessOpportunities(state).some(o=>o.available))return state;
    const s=copy(state);s.roundReceivables={active:true,round:s.businessRound,startDay:s.day};s.feedback={kind:'round-receivables',message:'这轮两单可以交货后继续接单；尾款仍按账期到账。收齐后再回工作室。'};return s;
  }
  if(roundReceivablesActive(state)){
    if(action.type==='CLOSE_SETTLED_ROUND'){
      if(state.phase!=='portfolio'||!roundReceivableSummary(state).canCloseSettled)return state;
      const s=copy(state);s.roundReceivables.active=false;s.phase='review';s.feedback={kind:'round-closed',message:'已签合同全部交付，货款已收齐。回工作室看看其他业务。'};return s;
    }
    if(action.type==='CANCEL_ROUND_RECEIVABLES'){
      if(state.phase!=='portfolio'||roundReceivableSummary(state).rows.length!==0)return state;
      const s=copy(state);s.roundReceivables.active=false;s.feedback={kind:'round-cancelled',message:'尚未签约，已回到原来的接单方式。'};return s;
    }
    if(!['SELECT_CLIENT','BACK_TO_CLIENTS','PROPOSE','DELIVER_ROUND_ORDER','WAIT_ROUND_RECEIPT','FINISH_ROUND_RECEIVABLES'].includes(action.type))return state;
    if(action.type==='DELIVER_ROUND_ORDER'){
      if(state.phase!=='fulfilling')return state;
      const index=state.contracts.findIndex(c=>c.roundReceivable&&c.businessRound===state.businessRound&&c.status==='fulfilling');if(index<0)return state;
      const s=copy(state),c=s.contracts[index];c.status='receivable';if(!advanceRoundTime(s,c.deliveryDay,index))return state;
      s.phase='portfolio';s.feedback={kind:'round-delivered',message:c.status==='paid'?'已交货，货款当日收齐。':'已交货，尾款仍待到账；现在可以谈本轮下一单。'};return s;
    }
    if(action.type==='WAIT_ROUND_RECEIPT'){
      if(state.phase!=='portfolio')return state;const next=roundReceivableSummary(state).nextPaymentDay;if(next===null)return state;
      const s=copy(state);if(!advanceRoundTime(s,next))return state;s.feedback={kind:'round-receipt',message:'到期尾款已到账，期间日常费用已计入。'};return s;
    }
    if(action.type==='FINISH_ROUND_RECEIVABLES'){
      if(state.phase!=='portfolio'||!roundReceivableSummary(state).canFinish)return state;
      const s=copy(state);s.roundReceivables.active=false;s.phase='review';s.feedback={kind:'round-complete',message:'本轮两单已交付，尾款全部收齐。'};return s;
    }
  }

  if(action.type==='OPEN_STOCK_PROCUREMENT'&&['review','complete'].includes(state.phase)&&canStartDeal(state)){
    if(state.contracts.some(c=>['fulfilling','receivable'].includes(c.status))||state.caseGrowth?.status==='production'||state.collection?.status==='production'||state.collectionRevision?.status==='production'||state.account?.status==='fulfilling'||['production','fulfilling'].includes(state.supplyPlan?.status))return state;
    const offer=stockProcurementOpportunity(state);if(!state.stockProcurement&&!offer.available)return state;
    const s=copy(state);if(!s.stockProcurement)s.stockProcurement={status:'draft',referrerId:offer.referrerId,sourceHistoryIndex:offer.sourceHistoryIndex,quantity:12,unitPrice:75,purpose:'public-reading',specification:'developed-studio',packaging:'generic'};s.phase='stock-procurement';s.feedback={kind:'stock-inquiry',message:'现有集团提出12处公共阅读位的新询盘；小批或整批报价可选，余货没有保证销路。'};return s;
  }
  if(state.phase==='stock-procurement'){
    const p=state.stockProcurement;
    if(action.type==='CLOSE_STOCK_PROCUREMENT'&&['draft','paid'].includes(p.status)){const s=copy(state);s.phase='review';s.feedback={kind:'stock-back',message:'回到工作室，本次询盘和库存记录保留。'};return s;}
    if(action.type==='SIGN_STOCK_PROCUREMENT'){
      const q=previewStockProcurement(state,action.factoryMode);if(!q.valid)return state;
      const s=copy(state);Object.assign(s.stockProcurement,q,{status:'production',signedDay:s.day,stockUsed:0});s.cash=q.cashAfterSigning;s.feedback={kind:'stock-signed',message:'已按选定报价支付制作款；只向客户承诺12盏，其余批次由工作室承担。'};return s;
    }
    if(action.type==='FULFIL_STOCK_PROCUREMENT'&&p.status==='production'){
      const s=copy(state);s.cash+=p.revenue-p.operatingCost;s.day=p.deliveryDay;Object.assign(s.stockProcurement,{status:'paid',delivered:12,received:p.revenue});s.feedback={kind:'stock-paid',message:'12盏已交付并收款。余货是工作室库存成本，不是收入或利润。'};return s;
    }
    return state;
  }
  if(action.type==='SIGN_STUDIO_PROJECT_FROM_STOCK'){
    const {waitingUntil,waitingCost,...q}=previewStudioProjectFromStock(state);if(!q.valid)return state;
    const s=copy(state);s.stockProcurement.remaining-=q.stockUsed;s.stockProcurement.stockUsed+=q.stockUsed;s.stockProcurement.inventoryCost=s.stockProcurement.remaining*s.stockProcurement.unitCost;
    s.caseGrowth={status:'production',referrerId:q.referrerId,agreement:q.agreement,active:{...q,signedDay:s.day}};s.cash=q.cashAfterSigning;s.phase='case-growth';s.feedback={kind:'case-growth-stock-signed',message:'现货已按合同预留扣出，只支付剩余商品与包装制作款；已付灯具成本仍计入本单成本。'};return s;
  }

  if(action.type==='OPEN_COLLECTION_REVISION'&&['review','complete'].includes(state.phase)){
    const offer=revisionOpportunity(state);if(!state.collectionRevision&&!offer.available)return state;
    if(state.contracts.some(c=>['fulfilling','receivable'].includes(c.status))||state.caseGrowth?.status==='production'||state.collection?.status==='production')return state;
    const s=copy(state);s.phase='collection-revision';if(!s.collectionRevision)s.collectionRevision={versionId:offer.versionId,style:offer.style,packaging:offer.packaging,products:[...s.collection.products],lampVersion:s.collection.lampVersion||'standard',status:'draft',investment:0,orders:[]};s.feedback={kind:'revision',message:'Northline 想看一版独立的新包装。旧原稿的授权不能撤回；是否另做新样由你决定。'};return s;
  }
  if(state.phase==='collection-revision'){
    const r=state.collectionRevision;
    if(action.type==='CLOSE_COLLECTION_REVISION'&&!['sampling','production'].includes(r.status)){const s=copy(state);s.phase='review';s.feedback={kind:'revision-back',message:'旧款合作照常，新版本进度保留。'};return s;}
    if(action.type==='COMMISSION_COLLECTION_REVISION'&&r.status==='draft'&&state.cash>=3320&&state.history.length<=MAX_DEAL_ACTIONS-10){const s=copy(state);s.cash-=3200;Object.assign(s.collectionRevision,{status:'sampling',investment:3200,sampleDay:s.day+4});s.feedback={kind:'revision-sampling',message:'独立波线图样与分格内托已委托开发，旧稿没有被覆盖。'};return s;}
    if(action.type==='RECEIVE_COLLECTION_REVISION'&&r.status==='sampling'&&state.cash>=120){const s=copy(state);s.day=r.sampleDay;s.cash-=120;s.collectionRevision.investment+=120;s.collectionRevision.status='sample';s.feedback={kind:'revision-sample',message:'潮汐分格实物样已完成。先核新版本授权，再决定是否签约。'};return s;}
    if(action.type==='SIGN_COLLECTION_REVISION'){
      const q=previewRevisionOrder(state,action);if(!q.valid)return state;const s=copy(state);s.cash+=q.deposit-q.cost;s.collectionRevision.active=q;s.collectionRevision.status='production';if(q.scope==='revision-exclusive')s.collectionRevision.exclusiveBuyer='northline';s.feedback={kind:'revision-signed',message:'只签署潮汐分格新版本的这份范围，旧版所有承诺保持。'};return s;
    }
    if(action.type==='FULFIL_COLLECTION_REVISION'&&r.status==='production'){
      const q=r.active,s=copy(state);s.day=q.paymentDay;s.cash+=q.balanceDue-q.operatingCost;s.collectionRevision.orders.push({...q,status:'paid'});delete s.collectionRevision.active;s.collectionRevision.status=s.collectionRevision.exclusiveBuyer||s.collectionRevision.orders.length===2?'complete':'sample';s.feedback={kind:'revision-paid',message:q.buyer+' 已收到潮汐分格版并付清货款，旧版订单没有改变。'};return s;
    }
    return state;
  }
  if(action.type==='OPEN_LAUNCH_PROJECT'&&['review','complete'].includes(state.phase)){
    const b=launchBasis(state);if(!b)return state;const s=copy(state);s.launchProject=s.launchProject||{status:'draft',arrangement:'set',lead:b.products[0]};s.phase='launch-project';s.feedback={kind:'launch',message:'用已交付的实物安排上市陈列，不重新卖一遍同样的货。'};return s;
  }
  if(action.type==='CLOSE_LAUNCH_PROJECT'&&state.phase==='launch-project'){const s=copy(state);s.phase='review';return s;}
  if(action.type==='SET_LAUNCH'&&state.phase==='launch-project'&&state.launchProject?.status==='draft'){
    const draft={...state.launchProject,[action.field]:action.value};if(!launchReview(state,draft).valid||draft[action.field]===state.launchProject[action.field])return state;const s=copy(state);s.launchProject=draft;return s;
  }
  if(action.type==='REVIEW_LAUNCH'&&state.phase==='launch-project'&&state.launchProject?.status==='draft'&&launchReview(state,state.launchProject).valid){const s=copy(state);s.launchProject.status='review';return s;}
  if(action.type==='REVISE_LAUNCH'&&state.phase==='launch-project'&&state.launchProject?.status==='review'){const s=copy(state);s.launchProject.status='draft';return s;}
  if(action.type==='HAND_OVER_LAUNCH'&&state.phase==='launch-project'&&state.launchProject?.status==='review'&&launchReview(state,state.launchProject).valid){const s=copy(state);s.launchProject.status='handed';s.launchProject.handedDay=s.day;s.feedback={kind:'launch-handed',message:'买方已收到上市陈列资料，原采购和权利约定保持。'};return s;}
  if(action.type==='OPEN_STUDIO_READING_PAIR'&&['review','complete'].includes(state.phase)){
    const e=studioProjectEligibility(state,'independent');if(!e.valid||!e.briefs.includes('reading-drink'))return state;
    const s=copy(state);s.phase='studio-project';s.studioProject=copy(s.studioProjectDrafts?.independent||(s.studioProject?.direction==='independent'?s.studioProject:null)||s.studioProjectPlans?.independent||{direction:'independent',briefId:'reading-drink',lampVersion:'standard',layout:'table',light:'reading',status:'draft',referrerId:e.referrerId});s.feedback={kind:'studio-project',message:'沿用已交付的台灯与杯，提出阅读时也能取水的桌面组合。'};return s;
  }
  if(action.type==='OPEN_STUDIO_PROJECT'&&['review','complete'].includes(state.phase)){
    const e=studioProjectEligibility(state,action.direction);if(!e.valid)return state;
    const s=copy(state);s.phase='studio-project';s.studioProject=s.studioProjectDrafts?.[action.direction]?copy(s.studioProjectDrafts[action.direction]):s.studioProject?.direction===action.direction?copy(s.studioProject):s.studioProjectPlans?.[action.direction]?copy(s.studioProjectPlans[action.direction]):{direction:action.direction,briefId:action.direction==='independent'?'reading':'bedside',lampVersion:'standard',layout:'shelf',light:'reading',status:'draft',referrerId:e.referrerId||e.customer?.referrerId};s.feedback={kind:'studio-project',message:'把方案摆出来，再请客户判断用途。旧合作不会因此取消。'};return s;
  }
  if(action.type==='KEEP_STUDIO_PROJECT'&&state.phase==='studio-project'){const s=copy(state);if(s.studioProject.status==='draft')s.studioProjectDrafts={...(s.studioProjectDrafts||{}),[s.studioProject.direction]:copy(s.studioProject)};s.phase='review';s.feedback={kind:'studio-project',message:'方案留在工作室，未签采购不会扣款。'};return s;}
  if(action.type==='CLOSE_STUDIO_PROJECT'&&state.phase==='studio-project'){const s=copy(state);s.phase='review';s.feedback={kind:'studio-project',message:'方案留在工作室，未签采购不会扣款。'};return s;}
  if(action.type==='PROPOSE_GROUP_CHANGE'&&state.phase==='studio-project'&&state.studioProject?.status==='approved'){
    const change=groupProjectChange(state);if(!change?.available)return state;
    const s=copy(state),old=s.studioProject;s.groupProjectSpecs={...(s.groupProjectSpecs||{}),[old.briefId]:copy(old)};
    s.studioProject={...old,briefId:change.next,status:'draft',layout:'table'};delete s.studioProject.products;
    s.feedback={kind:'studio-project',message:'先看新用途，原规格仍可补货；没有追加采购。'};return s;
  }
  if(action.type==='RESTORE_GROUP_SPEC'&&state.phase==='studio-project'&&state.studioProject?.direction==='group'){
    const change=groupProjectChange(state),plan=change?.approved[action.briefId];if(!plan||!studioProjectReview(state,plan).valid)return state;
    const s=copy(state);if(s.studioProject.status==='draft')s.studioProjectDrafts={...(s.studioProjectDrafts||{}),group:copy(s.studioProject)};
    s.studioProject=copy(plan);s.feedback={kind:'studio-project',message:'回到已确认规格，未签的新用途没有改变旧采购。'};return s;
  }
  if(action.type==='REVISE_STUDIO_PROJECT'&&state.phase==='studio-project'&&state.studioProject?.direction==='independent'&&state.studioProject.status==='approved'){const s=copy(state);s.studioProject.status='draft';s.feedback={kind:'studio-project',message:'可以重新准备工作室主题。已交付的版本仍保留在合同里。'};return s;}
  if(action.type==='SET_STUDIO_PROJECT'&&state.phase==='studio-project'&&state.studioProject?.status==='draft'){
    const s=copy(state),p=s.studioProject;if(action.field==='briefId'&&!((p.direction==='independent'?['reading','hosting','reading-drink']:['bedside','welcome']).includes(action.value)))return state;
    if(action.field==='briefId'&&action.value==='reading-drink'&&!studioProjectEligibility(state,p.direction).briefs.includes('reading-drink'))return state;
    if(p[action.field]===action.value)return state;p[action.field]=action.value;if(action.field==='briefId')delete p.products;s.feedback={kind:'studio-project',message:'方案已调整，还没有改变采购承诺。'};return s;
  }
  if(action.type==='REVIEW_STUDIO_PROJECT'&&state.phase==='studio-project'&&state.studioProject?.status==='draft'){
    const review=studioProjectReview(state,state.studioProject),s=copy(state);if(!review.valid){s.feedback={kind:'counter',message:review.reason};return s;}
    s.studioProject=copy(review.project);if(s.groupProjectSpecs&&s.studioProject.direction==='group')s.groupProjectSpecs={...s.groupProjectSpecs,[s.studioProject.briefId]:copy(s.studioProject)};if(s.studioProjectDrafts?.[s.studioProject.direction])delete s.studioProjectDrafts[s.studioProject.direction];s.studioProjectPlans={...(s.studioProjectPlans||{}),[s.studioProject.direction]:copy(s.studioProject)};s.feedback={kind:'studio-project-approved',message:review.feedback||'这份用途方案已确认，采购单仍由你决定。'};return s;
  }
  if(action.type==='SIGN_STUDIO_ALLOCATION'){
    const {waitingUntil,waitingCost,...q}=previewStudioAllocation(state,action.allocation);if(!q.valid)return state;
    const s=copy(state);s.caseGrowth={status:'production',referrerId:q.referrerId,agreement:q.agreement,active:{...q,signedDay:s.day}};s.cash=q.cashAfterSigning;s.phase='case-growth';s.feedback={kind:'case-growth-signed',message:action.allocation==='mixed'?'本批改为40处床头、20处茶台；杯共60只，不重复计数。':'本批保留60处床头；茶台请求不纳入这批采购。'};return s;
  }
  if(action.type==='WAIT_STUDIO_ALLOCATION'){
    const q=previewStudioAllocation(state,action.allocation),cost=q.waitingCost;if(!(q.waitingUntil>state.day)||!Number.isSafeInteger(cost)||state.cash<cost)return state;
    const s=copy(state);s.cash-=cost;s.day=q.waitingUntil;s.caseGrowthOperatingCost=(s.caseGrowthOperatingCost||0)+cost;s.feedback={kind:'studio-project',message:'已等到所选用途需要的商品补货日期；还没有签采购。'};return s;
  }
  if(action.type==='SIGN_STUDIO_PROJECT_ORDER'&&state.phase==='studio-project'&&state.studioProject?.status==='approved'){
    const {waitingUntil,waitingCost,...q}=previewStudioProjectOrder(state,state.studioProject);if(!q.valid)return state;
    const s=copy(state);s.caseGrowth={status:'production',referrerId:q.referrerId,agreement:q.agreement,active:{...q,signedDay:s.day}};s.cash=q.cashAfterSigning;s.phase='case-growth';s.feedback={kind:'case-growth-signed',message:'这批按已确认的场所方案采购，旧目录与原稿承诺仍保留。'};return s;
  }
  if(action.type==='WAIT_STUDIO_PROJECT'&&state.phase==='studio-project'&&state.studioProject?.status==='approved'){
    const q=previewStudioProjectOrder(state,state.studioProject),cost=q.waitingCost;if(!(q.waitingUntil>state.day)||!Number.isSafeInteger(cost)||state.cash<cost)return state;
    const s=copy(state);s.cash-=cost;s.day=q.waitingUntil;s.caseGrowthOperatingCost=(s.caseGrowthOperatingCost||0)+cost;s.feedback={kind:'studio-project',message:'已等到这批商品的补货日期，还没有签采购单。'};return s;
  }

  if(!action||typeof action!=='object')return state;
  if(action.type==='START_CASE_DEVELOPMENT'&&['review','complete'].includes(state.phase)&&hasLampDevelopmentCase(state)&&!state.productDevelopment){const s=copy(state);s.productDevelopment={status:'draft'};s.phase='development';s.feedback={kind:'development',message:'已交付的灯具组合是你的案例。比较工厂能力，是否出样由你决定。'};return s;}
  if(action.type==='START_DEVELOPMENT'&&['review','complete'].includes(state.phase)&&state.supplyPlanHistory?.length&&!state.productDevelopment){const s=copy(state);s.productDevelopment={status:'draft'};s.phase='development';s.feedback={kind:'development',message:'两家工厂的样品能力不同。先看它会让你接到哪种生意。'};return s;}
  if(action.type==='VIEW_DEVELOPMENT'&&['review','complete'].includes(state.phase)&&state.productDevelopment?.status==='active'){const s=copy(state);s.phase='development';s.feedback={kind:'sample-review',message:'工作室保留的工厂样品，报价时仍可使用。'};return s;}
  if(action.type==='CLOSE_SAMPLE'&&state.phase==='development'&&state.productDevelopment?.status==='active'){const s=copy(state);s.phase='review';return s;}
  if(action.type==='CLOSE_DEVELOPMENT'&&state.phase==='development'&&state.productDevelopment?.status==='draft'){const s=copy(state);delete s.productDevelopment;s.phase='review';s.feedback={kind:'review',message:'还没有付出样费，原有合作保持。'};return s;}
  if(action.type==='COMMISSION_SAMPLE'&&state.phase==='development'&&state.productDevelopment?.status==='draft'&&Object.hasOwn(SAMPLE_FACTORIES,action.factory)){const f=SAMPLE_FACTORIES[action.factory];if(state.cash<f.cost+f.days*DAY_COST)return state;const s=copy(state);s.cash-=f.cost;s.productDevelopment={status:'sampling',factory:action.factory,sampleDay:s.day+f.days,investment:f.cost};s.feedback={kind:'development-signed',message:'工厂收到出样委托。样品还未验收，不会提前加入报价。'};return s;}
  if(action.type==='RECEIVE_SAMPLE'&&state.phase==='development'&&state.productDevelopment?.status==='sampling'){const s=copy(state),d=s.productDevelopment,f=SAMPLE_FACTORIES[d.factory];s.day=d.sampleDay;s.cash-=f.days*DAY_COST;d.investment+=f.days*DAY_COST;d.status='received';s.feedback={kind:'sample-received',message:'实物样到了。先看看这件产品能做什么，再带给客户。'};return s;}
  if(action.type==='ACCEPT_SAMPLE'&&state.phase==='development'&&state.productDevelopment?.status==='received'){const s=copy(state);s.productDevelopment.status='active';s.phase='review';s.feedback={kind:'sample-active',message:'样品已收进工作室。和Mira谈返单时，可以选择这版新台灯，不必放弃旧款。'};return s;}
  if(action.type==='START_SUPPLY_PLAN'){
    const q=previewSupplyPlan(state,action);if(!q.valid)return state;
    const s=copy(state);s.cash=q.cashAfterSigning;s.clientIndex=CLIENTS.findIndex(c=>c.id===q.clientId);s.phase='planning-fulfillment';
    s.supplyPlan={...q,signedDay:s.day,eventIndex:0,status:'fulfilling',operatingCostPaid:0};if(s.retailPlanning)s.supplyPlan.retailPlanning=true;
    s.feedback={kind:'accepted',message:`两批供货安排已签，首批 ${q.lots[0].quantity} 件；团队按合同执行，末笔款在第 ${q.finishDay} 天收齐。`};return s;
  }
  if(action.type==='FULFIL_SUPPLY_PLAN'&&state.phase==='planning-fulfillment'){
    let next=state;
    // Reuse the exact locked-event settlement, without recording synthetic clicks.
    // Bound the loop by the signed event list; a failed step leaves all untouched.
    const remaining=state.supplyPlan.events.length-state.supplyPlan.eventIndex;
    for(let i=0;i<remaining;i++){
      const settled=apply(next,{type:'ADVANCE_SUPPLY_PLAN'});
      if(settled===next)return state;
      next=settled;
    }
    return next;
  }
  if(action.type==='ADVANCE_SUPPLY_PLAN'&&state.phase==='planning-fulfillment'){
    const s=copy(state),plan=s.supplyPlan,event=plan.events[plan.eventIndex];if(!event)return state;
    const fee=(event.day-s.day)*DAY_COST;
    if(s.cash-fee+event.income-event.cost<0)return state;
    s.day=event.day;s.cash+=event.income-event.cost-fee;plan.operatingCostPaid+=fee;plan.eventIndex++;plan.nextEventDay=plan.events[plan.eventIndex]?.day??null;
    s.feedback={kind:'supply-progress',message:event.kind==='start'?`第二批已开工，生产支出 ${event.cost}，本次日常费用 ${fee}。`:`${event.kind==='payment'?'尾款到账':'按约交货'}，本次收款 ${event.income}，日常费用 ${fee}。`};
    if(plan.eventIndex===plan.events.length){plan.status='paid';plan.completed=true;s.phase='review';s.careerMilestone=true;
      s.supplyPlanHistory=[...(s.supplyPlanHistory||[]),copy(plan)];
      s.feedback={kind:'supply-complete',message:`两批供货安排已结清，实际净赚 ${plan.netProfit}。这是一次经营阶段回顾，可以继续经营。`};}
    return s;
  }
  if(action.type==='START_COLLECTION'&&['review','complete'].includes(state.phase)&&state.curationHistory?.length&&!state.collection&&state.history.length<=MAX_DEAL_ACTIONS-8){
    const s=copy(state),basis=state.accountHistory?.length?state.account:state.curationHistory[0];s.collection=collectionSeedDraft(basis);s.phase='collection';s.feedback={kind:'collection',message:'Northline 提出了贴牌合作。你也能把设计留在自己的工作室。'};return s;
  }
  if(action.type==='BACK_FROM_COLLECTION'&&state.phase==='collection'&&state.collection?.status==='draft'){const s=copy(state);delete s.collection;s.phase='review';s.feedback={kind:'collection-back',message:'合作方式尚未确认，没有支出。'};return s;}
  if(action.type==='SIGN_COLLECTION'&&state.phase==='collection'&&state.collection?.status==='draft'&&state.history.length<=MAX_DEAL_ACTIONS-6){
    if(!['private','own'].includes(action.model)||!Object.hasOwn(COLLECTION_STYLES,action.style)||(action.model==='private'&&action.style==='botanical'))return state;
    const q=collectionQuote(state,'private');if(action.model==='own'?state.cash<2490:!q.valid)return state;
    const s=copy(state),c=s.collection;Object.assign(c,{model:action.model,style:action.style});
    if(c.model==='own'){s.cash-=2490;s.day+=3;c.sampleCost=2490;c.status='sample';s.feedback={kind:'collection-sample',message:'工作室自己的样品做好了。外观与署名保留，可以向不同买手提案。'};}
    else{c.sampleCost=0;c.active=q;c.status='production';s.cash+=q.deposit-q.cost;s.feedback={kind:'collection-signed',message:'Northline 的专用包装与订单已确认，出样费用包含在这份合作中。'};}return s;
  }
  if(action.type==='OPEN_COLLECTION_PITCH'&&state.phase==='collection'&&['sample','complete'].includes(state.collection?.status)&&collectionPitchOffers(state.collection).includes(action.buyerId)&&canStartDeal(state)){
    const s=copy(state);s.collection.pitchBuyer=action.buyerId;s.collection.status='pitch';s.feedback={kind:'collection-pitch',message:'买方愿意加量，但提出独家。先确定独家究竟覆盖什么。'};return s;
  }
  if(action.type==='BACK_COLLECTION_PITCH'&&state.phase==='collection'&&state.collection?.status==='pitch'){const s=copy(state);delete s.collection.pitchBuyer;s.collection.status='sample';s.feedback={kind:'collection-back',message:'尚未承诺独家，原设计和资金都保持不变。'};return s;}
  if(action.type==='SIGN_COLLECTION_PITCH'&&state.phase==='collection'&&state.collection?.status==='pitch'&&canStartDeal(state)){
    const q=previewCollectionPitch(state,action.optionId);if(!q?.valid)return state;
    const s=copy(state),c=s.collection;c.active=q;c.status='production';if(q.scope==='whole-exclusive')c.exclusiveBuyer=q.buyerId;delete c.pitchBuyer;s.cash+=q.deposit-q.cost;s.feedback={kind:'collection-signed',message:q.scope==='buyer-sleeve'?'只为买方另做专用纸套，工作室原系列不受限制。':q.scope==='whole-exclusive'?'原系列的独家范围与授权费已经写进这份订单。':'按非独家供货，工作室的署名与复用权保留。'};return s;
  }
  if(action.type==='SIGN_COLLECTION_ORDER'&&state.phase==='collection'&&state.collection?.model==='own'&&state.collection.status==='sample'&&canStartDeal(state)){
    if(state.collection.exclusiveBuyer&&state.collection.exclusiveBuyer!==action.buyerId)return state;if(state.collection.orders.some(o=>o.buyerId===action.buyerId))return state;const q=collectionQuote(state,'own',action.buyerId);if(!q?.valid)return state;
    const s=copy(state);s.collection.active=q;s.collection.status='production';s.cash+=q.deposit-q.cost;s.feedback={kind:'collection-signed',message:`${q.buyer} 接受了工作室这份设计，定金已收。`};return s;
  }
  if(action.type==='FULFIL_COLLECTION'&&state.phase==='collection'&&state.collection?.status==='production'){
    const s=copy(state),c=s.collection,q=c.active;s.cash+=q.balanceDue-q.operatingCost;s.day=q.paymentDay;c.orders.push({...q,status:'paid'});delete c.active;c.status=q.negotiated?(collectionPitchOffers(c).length?'sample':'complete'):(c.model==='private'||c.orders.length===2?'complete':'sample');s.feedback={kind:'collection-paid',message:`${q.buyer} 的系列已交付，货款收齐。`};return s;
  }
  if(action.type==='CLOSE_COLLECTION'&&state.phase==='collection'&&['sample','complete'].includes(state.collection?.status)){const s=copy(state);s.phase='review';return s;}
  if(action.type==='OPEN_COLLECTION'&&['review','complete'].includes(state.phase)&&['sample','complete'].includes(state.collection?.status)){const s=copy(state);s.phase='collection';s.feedback={kind:'collection-review',message:state.collection.model==='own'?'看看工作室自己的系列，或继续向买手提案。':'Northline 的这份专用系列已交付。'};return s;}
  if(action.type==='OPEN_ACCOUNT_EXPANSION'&&['review','complete'].includes(state.phase)&&canExpandAccount(state)&&canStartDeal(state)){
    const s=copy(state),old=s.accountHistory[0];s.account={status:'draft',expansion:true,buyer:old.buyer,referrerId:old.referrerId,referrerName:old.referrerName,products:[...old.products],unitPrice:old.unitPrice,unitCost:old.unitCost,...(old.seriesSource?{seriesSource:copy(old.seriesSource)}:{}),...(old.lampVersion?{lampVersion:old.lampVersion}:{})};s.phase='account';s.feedback={kind:'account',message:'首批三家已交付。是否再接余下三家的采购，由你决定。'};return s;
  }
  if(action.type==='SET_ACCOUNT_EXPANSION_BASIS'){
    const choice=accountExpansionBases(state).find(o=>o.basisId===action.basisId);if(!choice||choice.selected)return state;
    const s=copy(state);s.account={status:'draft',expansion:true,...copy(choice.basis)};
    s.feedback={kind:'account-expansion-basis',message:'仅余下三店采用所选的已批准版本；首批三店与原权利保持不变。'};return s;
  }
  if(action.type==='SIGN_ACCOUNT_EXPANSION'&&state.phase==='account'&&state.account?.expansion){
    const q=previewAccount(state,'remaining');if(!q?.valid)return state;const s=copy(state);Object.assign(s.account,q,{status:'fulfilling',signedDay:s.day});s.cash=q.cashAfterSigning;s.feedback={kind:'account-signed',message:'余下三家门店的采购已签，首批合同保持不变。'};return s;
  }
  if(action.type==='FULFIL_ACCOUNT_EXPANSION'&&state.phase==='account'&&state.account?.expansion&&state.account.status==='fulfilling'){
    const s=copy(state),a=s.account;s.cash+=a.balanceDue-a.operatingCost;s.day=a.paymentDay;a.status='paid';s.accountHistory.push(copy(a));s.feedback={kind:'account-paid',message:'另外三家门店已交付，累计六家；两批货款均已收齐。'};return s;
  }
  if(action.type==='START_ACCOUNT_FROM_REVISION'&&['review','complete'].includes(state.phase)&&!state.accountHistory?.length&&canStartDeal(state)){
    const basis=accountRevisionBasis(state);if(!basis)return state;
    const s=copy(state);s.account={status:'draft',buyer:'Northline · 区域连锁采购',referrerId:'northline',referrerName:'Northline 已交付新版本',...basis};s.phase='account';s.feedback={kind:'account',message:'沿用 Northline 已收到的潮汐分格版，图样、内托与成本一起写入这次门店合同。'};return s;
  }
  if(action.type==='SET_ACCOUNT_VERSION'&&state.phase==='account'&&state.account?.status==='draft'&&!state.account.expansion&&!state.accountHistory?.length){
    const basis=action.versionId==='original'?accountCollectionBasis(state):action.versionId==='revision:tidal-grid'?accountRevisionBasis(state):null;if(!basis)return state;
    if(JSON.stringify(state.account.seriesSource)===JSON.stringify(basis.seriesSource))return state;
    const s=copy(state);s.account={status:'draft',buyer:'Northline · 区域连锁采购',referrerId:'northline',referrerName:action.versionId==='original'?'Northline 已交付系列':'Northline 已交付新版本',...basis};s.feedback={kind:'account-version',message:'尚未签约，已换成这位买手实际采用过的版本；旧客户合同保持不变。'};return s;
  }
  if(action.type==='START_ACCOUNT_FROM_COLLECTION'&&['review','complete'].includes(state.phase)&&!state.accountHistory?.length&&canStartDeal(state)){
    const basis=accountCollectionBasis(state);if(!basis)return state;
    const s=copy(state);s.account={status:'draft',buyer:'Northline · 区域连锁采购',referrerId:'northline',referrerName:'Northline 已交付系列',...basis};s.phase='account';s.feedback={kind:'account',message:'Northline 沿用已经确认的系列版本铺店，不重新商谈署名或归属。先看付款和门店规模。'};return s;
  }
  if(action.type==='START_ACCOUNT'&&['review','complete'].includes(state.phase)&&!state.accountHistory?.length&&canStartDeal(state)){
    const basis=state.curationHistory?.find(c=>c.referrerId===action.referrerId);if(!basis)return state;
    const s=copy(state),products=CURATION_PRODUCTS.filter(p=>basis.products.includes(p.id)).map(p=>basis.lampVersion==='developed'&&p.id==='mira'?{...p,price:75,cost:45}:p);
    s.account={status:'draft',buyer:'Northline · 区域连锁采购',referrerId:basis.referrerId,referrerName:basis.referrerName,products:products.map(p=>p.id),unitPrice:Math.floor(products.reduce((n,p)=>n+p.price,0)*.75),unitCost:products.reduce((n,p)=>n+p.cost,0),...(basis.lampVersion?{lampVersion:basis.lampVersion}:{})};s.phase='account';
    s.feedback={kind:'account',message:'你的买手店案例进入了连锁采购名单。先谈付款，再决定铺多少店。'};return s;
  }
  if(action.type==='BACK_FROM_ACCOUNT'&&state.phase==='account'&&state.account?.status==='draft'){const s=copy(state);if(s.account.expansion)s.account=copy(s.accountHistory[0]);else delete s.account;s.phase='review';s.feedback={kind:'account-back',message:'未签约，资金和日期保持不变。'};return s;}
  if(action.type==='SIGN_ACCOUNT'&&state.phase==='account'&&!state.account?.expansion){
    const q=previewAccount(state,action.optionId);if(!q?.valid)return state;
    const s=copy(state);Object.assign(s.account,q,{status:'fulfilling',signedDay:s.day});s.cash=q.cashAfterSigning;s.feedback={kind:'account-signed',message:`${q.depositRate}% 定金已收，${q.stores} 家店的采购已签。`};return s;
  }
  if(action.type==='FULFIL_ACCOUNT'&&state.phase==='account'&&!state.account?.expansion&&state.account?.status==='fulfilling'){
    const s=copy(state),a=s.account;s.cash+=a.balanceDue-a.operatingCost;s.day=a.paymentDay;a.status='paid';s.accountHistory=[copy(a)];s.feedback={kind:'account-paid',message:`${a.stores} 家门店按约收货，货款收齐，净赚 ${a.netProfit}。`};return s;
  }
  if(action.type==='CLOSE_ACCOUNT'&&state.phase==='account'&&state.account?.status==='paid'){const s=copy(state);s.phase='review';return s;}
  if(action.type==='OPEN_CASE_GROWTH'&&['review','complete'].includes(state.phase)&&canStartDeal(state)){
    const source=caseGrowthOffers(state).find(c=>c.referrerId===action.referrerId);if(!source)return state;
    const s=copy(state);s.caseGrowth={status:'draft',referrerId:source.referrerId,...(source.agreement?{agreement:source.agreement}:{})};s.phase='case-growth';s.feedback={kind:'case-growth',message:source.returning?'沿已签范围看门店补货，合作方式保持不变。':'先谈案例怎么使用，再看下一位采购需要什么。尚未承诺展示权限。'};return s;
  }
  if(action.type==='CLOSE_CASE_GROWTH'&&state.phase==='case-growth'&&['draft','paid'].includes(state.caseGrowth?.status)){
    const s=copy(state);if(s.caseGrowth.status==='draft')delete s.caseGrowth;s.phase='review';s.feedback={kind:'review',message:'回到工作室。未签方案没有改变任何案例权限。'};return s;
  }
  if(['WAIT_CASE_GROWTH','WAIT_CASE_CALLOFF'].includes(action.type)&&state.phase==='case-growth'&&state.caseGrowth?.status==='draft'){
    const calloff=action.type==='WAIT_CASE_CALLOFF',source=caseGrowthOffers(state).find(c=>c.referrerId===state.caseGrowth.referrerId),ids=action.products;if(calloff&&!canCalloffCase(state,state.caseGrowth.referrerId))return state;if(!source||!Array.isArray(ids)||ids.length<(calloff?1:2)||ids.length>(calloff?1:3)||new Set(ids).size!==ids.length||ids.some(id=>!source.products.includes(id)))return state;
    if(source.agreement==='private'&&((!calloff&&ids.length!==source.sourceProducts.length)||ids.some(id=>!source.sourceProducts.includes(id))))return state;
    const day=Math.max(state.day,...caseGrowthDemand(state,source.referrerId).filter(d=>ids.includes(d.id)).map(d=>d.readyDay)),cost=(day-state.day)*DAY_COST;if(day<=state.day||!Number.isSafeInteger(day)||!Number.isSafeInteger(cost)||cost<=0||state.cash<cost)return state;
    const s=copy(state);s.day=day;s.cash-=cost;s.caseGrowthOperatingCost=(s.caseGrowthOperatingCost||0)+cost;s.feedback={kind:'case-growth-wait',message:`已到第 ${day} 天，选定产品可以谈补货；工作室支出 ${cost}，尚未签新订单。`};return s;
  }
  if(action.type==='APPROVE_CASE_LAMP'&&state.phase==='case-growth'&&state.caseGrowth?.status==='draft'&&canProposeCaseLamp(state,state.caseGrowth.referrerId)){
    const s=copy(state);
    if(action.model==='standard'){s.feedback={kind:'counter',message:'标准暖光不能切换客房柔光与阅读亮度。请试三档调光型号；旧目录仍可照常补货。'};return s;}
    s.caseLampApprovals={...(s.caseLampApprovals||{}),[s.caseGrowth.referrerId]:{model:'developed',purpose:'night-reading',approvedDay:s.day}};
    s.feedback={kind:'case-lamp-approved',message:'客房的柔光和阅读亮度都确认了。三档调光型号已获供货批准，尚未下单；旧型号仍可补货。'};return s;
  }
  if(['SIGN_CATALOGUE_ORDER','SIGN_CASE_GROWTH','SIGN_CASE_CALLOFF','SIGN_APPROVED_CASE_LAMP'].includes(action.type)){
    const {waitingUntil,waitingCost,...q}=(action.type==='SIGN_CATALOGUE_ORDER'?previewCatalogueOrder:action.type==='SIGN_APPROVED_CASE_LAMP'?previewApprovedCaseLamp:action.type==='SIGN_CASE_CALLOFF'?previewCaseCalloff:previewCaseGrowth)(state,action.type==='SIGN_CATALOGUE_ORDER'?{lampVersion:action.lampVersion}:action);if(!q.valid)return state;
    const s=copy(state);s.caseGrowth={status:'production',referrerId:q.referrerId,agreement:q.agreement,active:{...q,signedDay:s.day}};s.cash=q.cashAfterSigning;s.feedback={kind:'case-growth-signed',message:q.agreement==='private'?'匿名供货约定已签；该客户身份不用于新的工作室案例展示。产品与设计原有权利不变。':'工作室署名案例约定已签，新采购采用你选择的搭配。产品与设计原有权利不变。'};return s;
  }
  if(action.type==='FULFIL_CASE_GROWTH'&&state.phase==='case-growth'&&state.caseGrowth?.status==='production'){
    const s=copy(state),q=s.caseGrowth.active;s.cash+=q.balanceDue-q.operatingCost;s.day=q.paymentDay;s.caseGrowth.status='paid';s.caseGrowthHistory=[...(s.caseGrowthHistory||[]),{...copy(q),status:'paid'}];s.feedback={kind:'case-growth-paid',message:`${q.buyer} 已按约收货，净赚 ${q.netProfit}。案例展示约定保留，原商品销售权不变。`};return s;
  }
  if(action.type==='START_OPENING_CURATION'){
    const brief=openingCurationOffers(state).find(p=>p.id===action.clientId);if(!brief)return state;
    const s=copy(state);s.curation={referrerId:brief.id,referrerName:brief.referrerName,anchor:brief.anchor,buyer:brief.buyer,purpose:brief.purpose,giftAllowed:brief.giftAllowed,budget:brief.budget,source:brief.source,status:'draft'};s.phase='curating';
    s.feedback={kind:'curating',message:`${brief.referrerName.split(' · ')[0]} 介绍了一份选品委托。保留已交付的那件产品，再搭配一件，不必先做返单。`};return s;
  }
  if(action.type==='SIGN_FIRST_CATALOGUE_ORDER'){
    const {waitingUntil,waitingCost,...q}=previewFirstCatalogueOrder(state,{referrerId:action.referrerId,lampVersion:action.lampVersion});if(!q.valid)return state;
    const s=copy(state);s.caseGrowth={status:'production',referrerId:q.referrerId,agreement:'portfolio',active:{...q,signedDay:s.day}};s.cash=q.cashAfterSigning;s.phase='case-growth';s.feedback={kind:'case-growth-signed',message:'首次合作直接采用已交付的工作室原稿。范围已签，待交付后记入实际采用。'};return s;
  }
  if(action.type==='START_CURATION'&&['complete','review'].includes(state.phase)){
    const brief=curationOffers(state).find(p=>p.id===action.clientId);if(!brief||!canStartDeal(state))return state;
    const s=copy(state);s.curation={referrerId:brief.id,referrerName:brief.referrerName,anchor:brief.anchor,buyer:brief.buyer,purpose:brief.purpose,giftAllowed:brief.giftAllowed,budget:brief.budget,status:'draft'};s.phase='curating';
    s.feedback={kind:'curating',message:`${brief.referrerName.split(' · ')[0]} 把你的合作案例介绍给了 ${brief.buyer}。`};return s;
  }
  if(action.type==='BACK_FROM_CURATION'&&state.phase==='curating'){const s=copy(state);delete s.curation;s.phase='review';s.feedback={kind:'referrals',message:'还没有签约，可以换一位客户的引荐。'};return s;}
  if(['SIGN_CURATION','SIGN_CURATION_SAMPLE'].includes(action.type)&&state.phase==='curating'){
    const q=previewCuration(state,action);if(!q.valid)return state;
    const s=copy(state);Object.assign(s.curation,q,{status:'fulfilling',signedDay:s.day});s.cash=q.cashAfterSigning;s.phase='curation-fulfillment';
    s.feedback={kind:'curation-signed',message:`组合已确认，定金 ${q.deposit} 到账。整组 ${q.quantity} 套，第 ${q.deliveryDay} 天交付。`};return s;
  }
  if(action.type==='FULFIL_CURATION'&&state.phase==='curation-fulfillment'){
    const s=copy(state),c=s.curation;s.day=c.paymentDay;s.cash+=c.balanceDue-c.operatingCost;c.status='paid';s.curationHistory=[...(s.curationHistory||[]),copy(c)];s.phase='review';
    s.feedback={kind:'curation-paid',message:`${c.buyer} 已收到你搭配的 ${c.quantity} 套产品，货款收齐。`};return s;
  }
  if(action.type==='START_CLIENT_PROJECTS'&&['complete','review'].includes(state.phase)&&state.supplyPlanHistory?.length&&!state.clientProjectSeason&&canStartDeal(state)){
    const s=copy(state);s.clientProjectSeason={startDay:s.day};s.clientProjectActive=true;s.phase='portfolio';
    s.feedback={kind:'projects',message:'三位熟客各有一项新计划。日期已经列出，先做谁由你安排。'};return s;
  }
  if(action.type==='PAUSE_CLIENT_PROJECTS'&&state.phase==='portfolio'&&state.clientProjectActive&&!state.contracts.some(c=>c.status==='fulfilling')){
    const s=copy(state);s.clientProjectActive=false;s.phase='review';s.feedback={kind:'projects-paused',message:'先回工作室做别的业务。已交付案例保留，专题日期不会重排。'};return s;
  }
  if(action.type==='RESUME_CLIENT_PROJECTS'&&['review','complete'].includes(state.phase)&&state.clientProjectSeason&&!state.clientProjectActive&&clientProjects(state).some(p=>!p.completed)&&!state.contracts.some(c=>c.status==='fulfilling')){
    const s=copy(state);s.clientProjectActive=true;s.phase='portfolio';s.feedback={kind:'projects',message:'继续看未完成的客户计划，仍按原来的专题日期谈用途。'};return s;
  }
  if(action.type==='START_RETAIL_PLANNING'&&['review','complete'].includes(state.phase)&&state.supplyPlanHistory?.length&&!state.retailPlanning){const s=copy(state);s.retailPlanning=true;s.feedback={kind:'retail-planning',message:'熟客会按门店余货安排新采购。刚补过的门店不重复进货；别的业务照常可谈。'};return s;}
  if(action.type==='BACK_FROM_CLIENTS'&&state.phase==='portfolio'&&!state.clientProjectActive){const s=copy(state);s.phase='review';s.feedback={kind:'review',message:'尚未签约，回工作室看看其他业务。'};return s;}
  if(action.type==='PAUSE_FOR_BUYER'){
    const pause=retailPause(state,action.clientId);if(!pause)return state;
    const s=copy(state);s.day=pause.day;s.feedback={kind:'portfolio',message:'工作室暂停营业至第 '+s.day+' 天。期间没有收入，也没有工作室日费；客户只消化原有库存。'};return s;
  }
  if(action.type==='WAIT_FOR_BUYER'){const w=retailWait(state,action.clientId);if(!w?.valid)return state;const s=copy(state);s.day=w.day;s.cash-=w.cost;s.retailOperatingCost=(s.retailOperatingCost||0)+w.cost;s.feedback={kind:'portfolio',message:`已到第 ${w.day} 天，等候期间工作室支出 ${w.cost}。选定客户现在可以谈补货。`};return s;}
  if(action.type==='WAIT_FOR_RETAIL'){const w=retailWait(state);if(!w?.valid)return state;const s=copy(state);s.day=w.day;s.cash-=w.cost;s.retailOperatingCost=(s.retailOperatingCost||0)+w.cost;s.feedback={kind:'portfolio',message:`已到第 ${w.day} 天，工作室支出 ${w.cost}。门店有新的补货需求。`};return s;}
  if(action.type==='CONTINUE_RETAIL_BUSINESS'&&['complete','review'].includes(state.phase)&&state.supplyPlanHistory?.length){
    const s=copy(state);s.retailPlanning=true;s.businessRound=(s.businessRound||0)+1;s.businessSigned=0;s.businessTarget=2;s.phase='portfolio';
    s.feedback={kind:'portfolio',message:'看看哪位客户需要补货。刚铺过的门店先卖现有产品，也可以等对方的下一批采购。'};return s;
  }
  if(action.type==='CONTINUE_BUSINESS'&&['complete','review'].includes(state.phase)){
    const s=copy(state);s.businessRound=(s.businessRound||0)+1;s.businessSigned=0;s.businessTarget=2;s.phase='portfolio';
    s.feedback={kind:'portfolio',message:'根据已完成的合作，选择接下来经营哪位客户。'};return s;
  }
  if(action.type==='SELECT_CLIENT'&&state.phase==='portfolio'){
    const opportunity=businessOpportunities(state).find(c=>c.id===action.clientId);if(!opportunity?.available)return state;
    const s=copy(state);s.clientIndex=CLIENTS.findIndex(c=>c.id===action.clientId);s.phase='negotiating';
    s.feedback={kind:'new-client',message:opportunity.consequence};return s;
  }
  if(action.type==='BACK_TO_CLIENTS'&&state.phase==='negotiating'&&state.businessRound){
    const s=copy(state);s.phase='portfolio';s.feedback={kind:'portfolio',message:'尚未签约，可以换一位客户。'};return s;
  }
  if(action.type==='PROPOSE'){
    const q=previewOffer(state,action.optionId);if(!q.valid)return state;
    const s=copy(state),c=currentClient(s);
    if(!q.accepted){s.feedback={kind:'counter',message:q.reason};return s;}
    s.cash=q.cashAfterSigning;s.phase='fulfilling';if(s.businessRound&&!s.clientProjectActive)s.businessSigned++;
    s.contracts.push({clientId:c.id,clientName:c.name,product:c.product,optionId:q.id,quantity:q.quantity,revenue:q.revenue,cost:q.cost,deposit:q.deposit,balanceDue:q.balanceDue,profit:q.profit,operatingCost:q.operatingCost,netProfit:q.netProfit,signedDay:s.day,deliveryDay:q.deliveryDay,paymentDay:q.paymentDay,status:'fulfilling'});
    if(s.businessRound){s.contracts.at(-1).businessRound=s.businessRound;s.contracts.at(-1).specification=q.specification;}
    if(q.proofProduct)s.contracts.at(-1).product=q.proofProduct;
    if(q.id==='branded-opening')s.contracts.at(-1).specification='branded';
    if(q.id==='second-developed-lamp')s.contracts.at(-1).product=SAMPLE_FACTORIES[s.secondSupplier.factory].title;
    if(q.id==='developed-lamp')s.contracts.at(-1).product=SAMPLE_FACTORIES[s.productDevelopment.factory].title;
    if(s.retailPlanning&&((s.businessRound&&!s.clientProjectActive)||q.projectRetailDelivery))s.contracts.at(-1).retailPlanning=true;
    if(roundReceivablesActive(s))Object.assign(s.contracts.at(-1),{roundReceivable:true,operatingCost:0,netProfit:q.profit});
    if(s.clientProjectActive)Object.assign(s.contracts.at(-1),{projectId:q.projectId,projectTitle:q.projectTitle,projectOnTime:q.projectOnTime,specification:q.specification});
    s.feedback={kind:'accepted',message:q.deposit?`成交。定金 ${q.deposit} 已到账，尾款 ${q.balanceDue} 在第 ${q.paymentDay} 天收齐。`:`成交。第 ${q.deliveryDay} 天交货，第 ${q.paymentDay} 天收款。`};return s;
  }
  if(action.type==='ADVANCE'&&state.phase==='fulfilling'){
    const s=copy(state),c=s.contracts.at(-1);
    s.day=c.paymentDay;s.cash+=c.balanceDue-c.operatingCost;c.status='paid';s.phase='paid';
    s.feedback={kind:'paid',message:`${c.clientName.split(' · ')[0]} 的货款已收齐，这单净赚 ${c.netProfit}。`};return s;
  }
  if(action.type==='NEXT_CLIENT'&&state.phase==='paid'){
    const s=copy(state);
    if(s.clientProjectActive){const done=clientProjects(s).every(p=>p.completed);s.phase=done?'review':'portfolio';if(done)s.clientProjectActive=false;s.feedback={kind:done?'projects-complete':'projects',message:done?'三份客户计划已收齐。看看哪些货赶上了专题，哪些转成了常规补货。':'这位客户的计划已交付，其他专题日期不会随之延后。'};return s;}
    if(s.businessRound){s.phase=s.businessSigned>=s.businessTarget?'review':'portfolio';s.feedback={kind:s.phase,message:s.phase==='review'?'本次两笔经营已结清，可以查看账目并继续经营。':'这笔已结清，下一笔继续同客或换客由你决定。'};return s;}
    if(s.openingOrderChosen){
      const pending=CLIENTS.findIndex(c=>!s.contracts.some(o=>o.clientId===c.id&&o.status==='paid'&&!o.businessRound&&!o.projectId));
      s.clientIndex=pending<0?CLIENTS.length:pending;
    }else s.clientIndex++;
    s.phase=s.clientIndex<CLIENTS.length?'negotiating':'complete';
    s.feedback={kind:s.phase==='complete'?'complete':'new-client',message:s.phase==='complete'?'三位客户的生意已收齐。':'新询盘到了，先看这位客户在意什么。'};return s;
  }
  return state;
}
const actionKeys={SIGN_OWN_COLLECTION_FROM_CASE:['type','referrerId','style'],PROPOSE_OPENING_QUOTE:['type','clientId','optionId'],CONTINUE_RETAIL_BUSINESS:['type'],OPEN_STOCK_PROCUREMENT:['type'],CLOSE_STOCK_PROCUREMENT:['type'],SIGN_STOCK_PROCUREMENT:['type','factoryMode'],FULFIL_STOCK_PROCUREMENT:['type'],SIGN_STUDIO_PROJECT_FROM_STOCK:['type'],SET_ACCOUNT_EXPANSION_BASIS:['type','basisId'],START_ACCOUNT_FROM_REVISION:['type'],SET_ACCOUNT_VERSION:['type','versionId'],OPEN_COLLECTION_REVISION:['type'],CLOSE_COLLECTION_REVISION:['type'],COMMISSION_COLLECTION_REVISION:['type'],RECEIVE_COLLECTION_REVISION:['type'],SIGN_COLLECTION_REVISION:['type','buyerId','scope'],FULFIL_COLLECTION_REVISION:['type'],START_CASE_DEVELOPMENT:['type'],OPEN_STUDIO_READING_PAIR:['type'],CLOSE_SETTLED_ROUND:['type'],CANCEL_ROUND_RECEIVABLES:['type'],ENABLE_ROUND_RECEIVABLES:['type'],DELIVER_ROUND_ORDER:['type'],WAIT_ROUND_RECEIPT:['type'],FINISH_ROUND_RECEIVABLES:['type'],SIGN_FIRST_CATALOGUE_ORDER:['type','referrerId','lampVersion'],START_OPENING_CURATION:['type','clientId'],SIGN_STUDIO_ALLOCATION:['type','allocation'],WAIT_STUDIO_ALLOCATION:['type','allocation'],START_ACCOUNT_FROM_COLLECTION:['type'],PAUSE_CLIENT_PROJECTS:['type'],RESUME_CLIENT_PROJECTS:['type'],OPEN_LAUNCH_PROJECT:['type'],CLOSE_LAUNCH_PROJECT:['type'],SET_LAUNCH:['type','field','value'],REVIEW_LAUNCH:['type'],REVISE_LAUNCH:['type'],HAND_OVER_LAUNCH:['type'],PROPOSE_GROUP_CHANGE:['type'],RESTORE_GROUP_SPEC:['type','briefId'],KEEP_STUDIO_PROJECT:['type'],REVISE_STUDIO_PROJECT:['type'],OPEN_STUDIO_PROJECT:['type','direction'],CLOSE_STUDIO_PROJECT:['type'],SET_STUDIO_PROJECT:['type','field','value'],REVIEW_STUDIO_PROJECT:['type'],SIGN_STUDIO_PROJECT_ORDER:['type'],WAIT_STUDIO_PROJECT:['type'],SIGN_CATALOGUE_ORDER:['type','lampVersion'],APPROVE_CASE_LAMP:['type','model'],SIGN_APPROVED_CASE_LAMP:['type','terms'],OPEN_ACCOUNT_EXPANSION:['type'],SIGN_ACCOUNT_EXPANSION:['type'],FULFIL_ACCOUNT_EXPANSION:['type'],WAIT_CASE_CALLOFF:['type','products'],SIGN_CASE_CALLOFF:['type','agreement','products','packaging','terms'],WAIT_CASE_GROWTH:['type','products'],OPEN_CASE_GROWTH:['type','referrerId'],CLOSE_CASE_GROWTH:['type'],SIGN_CASE_GROWTH:['type','agreement','products','packaging','terms'],FULFIL_CASE_GROWTH:['type'],SIGN_CURATION_SAMPLE:['type','products','quantity','packaging','lampVersion'],VIEW_DEVELOPMENT:['type'],CLOSE_SAMPLE:['type'],START_DEVELOPMENT:['type'],CLOSE_DEVELOPMENT:['type'],COMMISSION_SAMPLE:['type','factory'],RECEIVE_SAMPLE:['type'],ACCEPT_SAMPLE:['type'],PAUSE_FOR_BUYER:['type','clientId'],WAIT_FOR_BUYER:['type','clientId'],START_RETAIL_PLANNING:['type'],BACK_FROM_CLIENTS:['type'],WAIT_FOR_RETAIL:['type'],OPEN_COLLECTION_PITCH:['type','buyerId'],BACK_COLLECTION_PITCH:['type'],SIGN_COLLECTION_PITCH:['type','optionId'],START_COLLECTION:['type'],BACK_FROM_COLLECTION:['type'],SIGN_COLLECTION:['type','model','style'],SIGN_COLLECTION_ORDER:['type','buyerId'],FULFIL_COLLECTION:['type'],CLOSE_COLLECTION:['type'],OPEN_COLLECTION:['type'],START_ACCOUNT:['type','referrerId'],BACK_FROM_ACCOUNT:['type'],SIGN_ACCOUNT:['type','optionId'],FULFIL_ACCOUNT:['type'],CLOSE_ACCOUNT:['type'],BACK_FROM_CURATION:['type'],START_CURATION:['type','clientId'],SIGN_CURATION:['type','products','quantity','packaging'],FULFIL_CURATION:['type'],START_CLIENT_PROJECTS:['type'],PROPOSE:['type','optionId'],ADVANCE:['type'],NEXT_CLIENT:['type'],CONTINUE_BUSINESS:['type'],SELECT_CLIENT:['type','clientId'],BACK_TO_CLIENTS:['type'],START_SUPPLY_PLAN:['type','clientId','firstBatch','payment'],ADVANCE_SUPPLY_PLAN:['type'],FULFIL_SUPPLY_PLAN:['type']};
function canonicalAction(a){
  if(a&&Object.hasOwn(LEGACY_EQUIPMENT_ACTION_KEYS,a.type))return canonicalLegacyEquipmentAction(a);
  if(a&&Object.hasOwn(PROMOTION_ACTION_KEYS,a.type))return canonicalPromotionAction(a);
  if(a?.type==='SLEEP_TO_NEXT_DAY')return canonicalWorkspaceSleep(a);
  if(a&&Object.hasOwn(PROPERTY_ACTION_KEYS,a.type))return canonicalPropertyAction(a);
  if(a&&Object.hasOwn(OUTING_ACTION_KEYS,a.type))return canonicalOutingAction(a);
  if(a&&typeof MARKET_ACTION_KEYS!=='undefined'&&Object.hasOwn(MARKET_ACTION_KEYS,a.type))return canonicalMarketAction(a);
  if(a&&Object.hasOwn(LINEN_FREIGHT_ACTIONS,a.type))return canonicalLinenFreight(a);
  if(a&&Object.hasOwn(ATELIER_RESTOCK_ACTIONS,a.type))return canonicalAtelierRestock(a);
  if(a&&Object.hasOwn(SHOP_TRIAL_ACTIONS,a.type))return canonicalShopTrialAction(a);
  if(a&&Object.hasOwn(EXHIBITION_ACTION_KEYS,a.type))return canonicalExhibitionAction(a);
  if(a&&Object.hasOwn(ANNEX_ACTION_KEYS,a.type))return canonicalAnnexAction(a);
  if(a&&Object.hasOwn(OFFICE_ACTION_KEYS,a.type))return canonicalOfficeAction(a);
  if(a&&Object.hasOwn(LIFE_ACTION_KEYS,a.type))return canonicalLifeAction(a);
  if(a&&Object.hasOwn(SECOND_SUPPLIER_ACTIONS,a.type))return canonicalSecondSupplierAction(a);
  if(!a||typeof a!=='object'||Array.isArray(a)||!actionKeys[a.type])return null;
  if(a.type==='PROPOSE_OPENING_QUOTE'&&(!CLIENTS.some(c=>c.id===a.clientId)||typeof a.optionId!=='string'))return null;
  if(a.type==='SET_LAUNCH'&&!({arrangement:['set','individual'],lead:['mira','samir','ines']}[a.field]?.includes(a.value)))return null;
  if(a.type==='RESTORE_GROUP_SPEC'&&!['bedside','welcome'].includes(a.briefId))return null;
  if(a.type==='OPEN_STUDIO_PROJECT'&&!['independent','group'].includes(a.direction))return null;
  if(a.type==='SET_STUDIO_PROJECT'&&!({briefId:['reading','hosting','reading-drink','bedside','welcome'],lampVersion:['standard','developed'],layout:['table','shelf'],light:['soft','reading']}[a.field]?.includes(a.value)))return null;
  if(a.type==='SIGN_CATALOGUE_ORDER'&&!['standard','developed'].includes(a.lampVersion))return null;
  if(a.type==='APPROVE_CASE_LAMP'&&!['standard','developed'].includes(a.model))return null;
  if(a.type==='SIGN_APPROVED_CASE_LAMP'&&!['delivery','sample'].includes(a.terms))return null;
  if(['SIGN_STUDIO_ALLOCATION','WAIT_STUDIO_ALLOCATION'].includes(a.type)&&!['bedside','mixed'].includes(a.allocation))return null;
  if(a.type==='SIGN_FIRST_CATALOGUE_ORDER'&&(typeof a.referrerId!=='string'||!['standard','developed'].includes(a.lampVersion)))return null;
  if(a.type==='SIGN_COLLECTION_REVISION'&&(!['northline','atelier'].includes(a.buyerId)||!['revision-nonexclusive','revision-exclusive'].includes(a.scope)))return null;
  if(a.type==='SIGN_STOCK_PROCUREMENT'&&!['small','batch'].includes(a.factoryMode))return null;
  if(a.type==='SET_ACCOUNT_EXPANSION_BASIS'&&!['previous','original','revision:tidal-grid'].includes(a.basisId))return null;
  if(a.type==='SET_ACCOUNT_VERSION'&&!['original','revision:tidal-grid'].includes(a.versionId))return null;
  const keys=actionKeys[a.type];if(Object.keys(a).length!==keys.length||!keys.every(k=>Object.hasOwn(a,k)))return null;
  if(['PROPOSE','SIGN_ACCOUNT','SIGN_COLLECTION_PITCH'].includes(a.type)&&typeof a.optionId!=='string')return null;
  if(a.type==='COMMISSION_SAMPLE'&&typeof a.factory!=='string')return null;
  if(a.type==='SIGN_OWN_COLLECTION_FROM_CASE'&&(typeof a.referrerId!=='string'||typeof a.style!=='string'||!Object.hasOwn(COLLECTION_STYLES,a.style)))return null;
  if(a.type==='SIGN_COLLECTION'&&(typeof a.model!=='string'||typeof a.style!=='string'))return null;
  if(['SIGN_COLLECTION_ORDER','OPEN_COLLECTION_PITCH'].includes(a.type)&&typeof a.buyerId!=='string')return null;
  if(['WAIT_CASE_GROWTH','WAIT_CASE_CALLOFF'].includes(a.type)&&(!Array.isArray(a.products)||a.products.some(id=>typeof id!=='string')))return null;
  if(a.type==='OPEN_CASE_GROWTH'&&typeof a.referrerId!=='string')return null;
  if(['SIGN_CASE_GROWTH','SIGN_CASE_CALLOFF'].includes(a.type)&&(typeof a.agreement!=='string'||typeof a.packaging!=='string'||typeof a.terms!=='string'||!Array.isArray(a.products)||a.products.some(id=>typeof id!=='string')))return null;
  if(a.type==='START_ACCOUNT'&&typeof a.referrerId!=='string')return null;
  if(['PAUSE_FOR_BUYER','WAIT_FOR_BUYER','SELECT_CLIENT','START_SUPPLY_PLAN','START_CURATION','START_OPENING_CURATION'].includes(a.type)&&typeof a.clientId!=='string')return null;
  if(a.type==='START_SUPPLY_PLAN'&&(typeof a.firstBatch!=='string'||typeof a.payment!=='string'))return null;
  if(a.type==='SIGN_CURATION_SAMPLE'&&a.lampVersion!=='developed')return null;
  if(['SIGN_CURATION','SIGN_CURATION_SAMPLE'].includes(a.type)&&(!Array.isArray(a.products)||a.products.some(p=>typeof p!=='string')||!Number.isSafeInteger(a.quantity)||typeof a.packaging!=='string'))return null;
  return Object.fromEntries(keys.map(k=>[k,k==='products'?[...a[k]].sort():a[k]]));
}
function reduceRecordedDeal(state,action){
  const a=canonicalAction(action);if(!a)return state;
  // Counteroffers do not grow the save indefinitely; one repeated identical reply is enough.
  if(state.feedback.kind==='counter'&&JSON.stringify(state.history.at(-1))===JSON.stringify(a))return state;
  if(state.history.length>=MAX_DEAL_ACTIONS)return state;
  const next=apply(state,a);if(next===state)return state;
  next.history.push(a);return next;
}
// Consecutive decor adjustments carry only final positions/bookmarks/track choices.
// Keep commercial and saved-exhibition history intact, including old journals.
const decorJournalTypes=new Set(['ARRANGE_LIFE_ITEM','READ_LIFE_BOOK','SELECT_LIFE_RECORD']);
// Replay-only fast path: these three setters never inspect the journal.
// Actions are still canonicalized and applied by the same domain reducer.
// Internal replay owns its journal, so it need not deep-copy all prior entries
// for every position change; no caller-owned action object is reused.
function replayRecordedDeal(state,action){
 if(!decorJournalTypes.has(action?.type)||state.feedback.kind==='counter')return reduceRecordedDeal(state,action);
 const a=canonicalAction(action);if(!a||state.history.length>=MAX_DEAL_ACTIONS)return state;
 const input={...state,history:[]},next=applyLifeAction(input,a);
 if(next===input)return state;
 next.history=state.history.concat(a);return next;
}
function compactDecorTail(state){
 let start=state.history.length;
 while(start>0&&decorJournalTypes.has(state.history[start-1]?.type))start--;
 if(state.history.length-start<128)return state;
 let base=createDealRoom();
 for(const action of state.history.slice(0,start)){const next=reduceRecordedDeal(base,action);if(next===base)return state;base=next;}
 const last=new Map();
 for(const action of state.history.slice(start)){const key=action.type+':'+action.itemId;last.delete(key);last.set(key,action);}
 for(const action of last.values()){const next=reduceRecordedDeal(base,action);if(next!==base)base=next;}
 const withoutJournal=value=>{const {history,...rest}=value;return JSON.stringify(rest);};
 // Do not compact unless replay proves every non-journal field is unchanged.
 return withoutJournal(base)===withoutJournal(state)?base:state;
}
// Seal action pages, never balance snapshots. Keep the latest action on the live page.
const JOURNAL_PAGE_SIZE=512;
const MAX_ARCHIVE_PAGES=640; // beyond the normal 5 MiB backup budget
function sealJournalPage(actions){
 for(const a of actions){if(Array.isArray(a.products))Object.freeze(a.products);Object.freeze(a);}
 return Object.freeze(actions);
}
function journalLength(s){return (s.historyPages?.length||0)*JOURNAL_PAGE_SIZE+s.history.length;}
function allJournalActions(s){return s.historyPages?[...s.historyPages.flat(),...s.history]:s.history;}
function pageJournal(s){
 if(s.history.length<=JOURNAL_PAGE_SIZE)return s;
 const pages=[...(s.historyPages||[])];let offset=0;
 while(s.history.length-offset>JOURNAL_PAGE_SIZE){pages.push(sealJournalPage(s.history.slice(offset,offset+JOURNAL_PAGE_SIZE)));offset+=JOURNAL_PAGE_SIZE;}
 return {...s,historyPages:Object.freeze(pages),history:s.history.slice(offset)};
}
function applyOnJournalPage(state,action,reducer){
 if(!state.historyPages)return reducer(state,action);
 const {historyPages,...input}=state;const next=reducer(input,action);
 return next===input?state:{...next,historyPages};
}
export function reduceDealRoom(state,action){
 if(!canonicalAction(action))return state;
 let compacted=state.historyPages?state:compactDecorTail(state);
 // An untouched old save may already lack room even for a navigation action.
 if(!compacted.historyPages&&compacted.history.length>=4000){try{compacted=normalizeDealRoom(compacted);}catch{return state;}}
 const next=applyOnJournalPage(compacted,action,reduceRecordedDeal);
 return next===compacted?state:pageJournal(next);
}
// Only successful, fully compared replays enter this process-local cache.
// Serialized snapshots never alias caller-owned objects. At most four entries,
// each snapshot at most 1M UTF-16 code units, are retained. Action strings
// duplicate at most the journal within that bound (plus bounded array overhead).
// Eviction changes speed, never validity.
const VERIFIED_REPLAY_LIMIT = 4;
const VERIFIED_REPLAY_CHARS = 1024 * 1024;
const verifiedReplays = [];
function replayPrefix(history,paged) {
  const actions = history.map(a => JSON.stringify(a));
  let best;
  for (const entry of verifiedReplays) {
    if ((!paged && entry.paged) || (paged && !entry.paged && entry.actions.length>JOURNAL_PAGE_SIZE) || entry.actions.length > actions.length || (best && entry.actions.length <= best.actions.length)) continue;
    if (entry.actions.every((a, i) => a === actions[i])) best = entry;
  }
  if(!best)return createDealRoom();
  const restored=JSON.parse(best.snapshot);
  if(restored.historyPages)restored.historyPages=Object.freeze(restored.historyPages.map(sealJournalPage));
  return restored;
}
function rememberVerifiedReplay(state) {
  const snapshot = JSON.stringify(state);
  if (snapshot.length > VERIFIED_REPLAY_CHARS) return;
  const existing = verifiedReplays.findIndex(entry => entry.snapshot === snapshot);
  if (existing !== -1) verifiedReplays.splice(existing, 1);
  verifiedReplays.push({snapshot, paged:!!state.historyPages, actions: allJournalActions(state).map(a => JSON.stringify(a))});
  if (verifiedReplays.length > VERIFIED_REPLAY_LIMIT) verifiedReplays.shift();
}
/** Strict canonical replay rejects edited money, unknown keys and old-game saves.
 * A tiny action journal avoids accepting guessed financial fields as trusted state.
 */
export function normalizeDealRoom(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||!Array.isArray(raw.history))throw new Error('谈单进度无效');
  const paged=Object.hasOwn(raw,'historyPages');
  if(paged){
    const p=raw.historyPages;
    if(!Array.isArray(p)||!p.length||p.length>MAX_ARCHIVE_PAGES||raw.history.length<1||raw.history.length>JOURNAL_PAGE_SIZE)throw new Error('谈单记录分卷无效');
    for(const page of p)if(!Array.isArray(page)||page.length!==JOURNAL_PAGE_SIZE)throw new Error('谈单记录分卷无效');
  }else if(raw.history.length>MAX_DEAL_ACTIONS)throw new Error('谈单进度无效');
  // Preserve, rather than silently migrate, unpublished experiments that cloned
  // one contact through several referrals. The app retains rejected raw saves.
  const caseOwners=new Map(),caseRecords=[...(Array.isArray(raw.caseGrowthHistory)?raw.caseGrowthHistory:[]),...(raw.caseGrowth?.status==='production'?[raw.caseGrowth.active]:[])];
  for(const c of caseRecords){if(!c||!['portfolio','private'].includes(c.agreement))continue;if(caseOwners.has(c.agreement)&&caseOwners.get(c.agreement)!==c.referrerId)throw new Error('旧实验曾将同一客户复制到多个案例；原存档未修改，请保留并使用对应实验版本读取。');caseOwners.set(c.agreement,c.referrerId);}
  const actions=allJournalActions(raw);let state=replayPrefix(actions,paged);
  for(let i=journalLength(state);i<actions.length;i++){
    const next=applyOnJournalPage(state,actions[i],replayRecordedDeal);
    if(next===state)throw new Error('谈单记录无效');state=paged?pageJournal(next):next;
  }
  function stable(v){if(Array.isArray(v))return v.map(stable);if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));return v;}
  // v18 briefly changed only the saved purchase feedback sentence. Accept that
  // exact released wording, but still compare every financial/journal field.
  let comparable=raw;
  if(state.feedback?.kind==='personal-life'&&raw.feedback?.kind==='personal-life'&&
    raw.feedback.message===state.feedback.message.replace('这是个人消费，不会提高订单收益。','给自己的下班时间添了一件喜欢的东西。'))
    comparable={...raw,feedback:{...raw.feedback,message:state.feedback.message}};
  if(JSON.stringify(stable(comparable))!==JSON.stringify(stable(state)))throw new Error('谈单账目不一致');
  // Only migrate the old flat journal after comparison with its original replay.
  if(paged||state.history.length>=4000)state=pageJournal(state);
  rememberVerifiedReplay(state);
  return state;
}
