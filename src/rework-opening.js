/** Isolated opening prototype. Integer fictional yuan; days advance only by explicit actions.
 * Storage owner should use STORAGE_KEY, never the established trade-game save key.
 */
export const DAILY_OPERATING_COST=50;
export const STORAGE_KEY='trade-tycoon:opening:v1';
export const PRODUCTS=[{id:'cups',name:'保温杯'},{id:'lights',name:'灯具'},{id:'textiles',name:'织品'}];
export const ROUTES=[{id:'sea',name:'海运',days:4,cost:100},{id:'express',name:'快运',days:1,cost:300}];
const PRICES=[{cups:40,lights:70,textiles:50},{cups:45,lights:60,textiles:55},{cups:35,lights:80,textiles:45},{cups:40,lights:70,textiles:50}];
const ORDERS=[
 {id:'quick',product:'cups',name:'街角店补货',quantity:10,revenue:850,deadlineDays:5,payLag:0},
 {id:'urgent',product:'lights',name:'开业急单',quantity:10,revenue:1500,deadlineDays:2,payLag:0},
 {id:'large',product:'textiles',name:'旅店整批换新',quantity:24,revenue:2100,deadlineDays:5,payLag:7}
];
export const INVESTMENTS=[
 {id:'warehouse',name:'扩建货仓',cost:700,description:'后续采购总价省10%，取整到元。'},
 {id:'express',name:'固定快线',cost:700,description:'新港快运从2天缩为1天，运费从300元降到180元。'}
];
const SECOND_ORDERS=[
 {id:'port-quick',product:'cups',name:'新港商店补货',quantity:20,revenue:1500,deadlineDays:5,payLag:0},
 {id:'port-urgent',product:'lights',name:'新港展会急单',quantity:16,revenue:2250,deadlineDays:2,payLag:0},
 {id:'port-large',product:'textiles',name:'新港旅店联采',quantity:36,revenue:3000,deadlineDays:5,payLag:9}
];
const THIRD_ORDERS=[
 {id:'choice-bulk',product:'textiles',name:'连锁旅店大批采购',quantity:60,revenue:4400,deadlineDays:5,payLag:6},
 {id:'choice-restock',product:'textiles',name:'街区小店快补',quantity:12,revenue:1250,deadlineDays:2,payLag:0},
 {id:'choice-urgent',product:'lights',name:'展台灯具急补',quantity:8,revenue:1300,deadlineDays:2,payLag:0},
 {id:'choice-regular',product:'cups',name:'商店常规备货',quantity:24,revenue:1750,deadlineDays:5,payLag:2}
];
const signed=o=>!['open','declined'].includes(o.status);
const priceAt=round=>PRICES[round%PRICES.length];
function costFor(state,order){const base=order.basePurchaseCost??order.unitCost*order.quantity;const raw=Number.isFinite(base)?base:state.prices[order.product]*order.quantity;return {basePurchaseCost:raw,purchaseCost:order.purchaseCost??Math.floor(raw*(state.investment==='warehouse'?90:100)/100)};}
/** Business is an explicit continuation, not a new scripted stage. Orders keep immutable customer IDs. */
export const SECOND_BERTH_COST=2500;
export const cargoCapacity=state=>state.berthCount===2?2:1;
export function currentOpeningOrders(state){return state.businessRound?state.orders.filter(o=>o.businessRound===state.businessRound):state.orders.filter(o=>o.stage===state.stage&&!o.businessRound);}
const DEPOSIT_REPEAT_TARGET=2;
function earlierPaidRepeats(state,o){return state.orders.filter(x=>x.customerId===o.customerId&&x.businessRound<o.businessRound&&x.businessRound>0&&x.status==='paid').length;}
export function outstandingPayment(order){return order.status==='paid'?0:Math.max(0,order.revenue-(order.depositReceived||0));}
function procurementDeposit(state,o){return o.status==='open'&&o.paymentTerms==='deposit'&&earlierPaidRepeats(state,o)>=DEPOSIT_REPEAT_TARGET?Math.floor(o.baseRevenue*30/100):0;}
export function businessCustomers(state){return state.orders.filter(o=>o.stage===3&&!o.businessRound&&o.status==='paid').map(o=>({id:o.id,name:o.name,product:o.product,repeatPaid:state.orders.filter(x=>x.customerId===o.id&&x.businessRound&&x.status==='paid').length,completed:state.orders.filter(x=>x.customerId===o.id&&x.businessRound&&x.status==='paid').length,repeatTarget:DEPOSIT_REPEAT_TARGET,depositUnlocked:state.orders.filter(x=>x.customerId===o.id&&x.businessRound&&x.status==='paid').length>=DEPOSIT_REPEAT_TARGET}));}
function demandContract(t,round,index){
 const type=round<=3?'regular':['urgent','bulk','regular'][(round-4+index)%3];
 const quantity=type==='urgent'?Math.max(1,Math.floor(t.quantity*.8)):type==='bulk'?Math.ceil(t.quantity*1.2):t.quantity;
 return {...t,quantity,revenue:Math.floor(t.revenue*quantity/t.quantity),deadlineDays:type==='urgent'?2:type==='bulk'?6:t.deadlineDays,payLag:type==='urgent'?1:Math.max(3,t.payLag)+(type==='bulk'?2:0),demandVersion:1,demandType:type,demandLabel:{regular:'常规补货',urgent:'临时急补',bulk:'集中采购'}[type]};
}
function repeatTemplates(state,round,version=0){return businessCustomers(state).map((c,index)=>{const original=THIRD_ORDERS.find(o=>o.id===c.id),t=version===1?demandContract(original,round,index):{...original,payLag:Math.max(3,original.payLag)};return {...t,id:`repeat-${round}-${t.id}`,customerId:t.id,businessRound:round,stage:3,baseRevenue:t.revenue,paymentTerms:'credit'};});}
export function canPassBusinessOrder(state,id){const o=find(state,id);return !!state.businessRound&&o?.businessRound===state.businessRound&&o.status==='open'&&currentOpeningOrders(state).some(x=>x.id!==id&&x.status==='paid');}
export function nextBusinessDemand(state){if(!state.businessRound)return [];return repeatTemplates(state,(state.businessRound||0)+1,1);}

export function paymentOptions(state,id){
 const o=find(state,id);if(!o?.businessRound)return [];const payLag=(o.demandVersion===1?repeatTemplates(state,o.businessRound,1).find(t=>t.customerId===o.customerId).payLag:Math.max(3,THIRD_ORDERS.find(t=>t.id===o.customerId).payLag)),unlocked=earlierPaidRepeats(state,o)>=DEPOSIT_REPEAT_TARGET;
 return [{id:'credit',payment:'credit',selected:o.paymentTerms==='credit',revenue:o.baseRevenue,payLag,discount:0},{id:'cash',payment:'cash',selected:o.paymentTerms==='cash',revenue:Math.floor(o.baseRevenue*92/100),payLag:0,discount:o.baseRevenue-Math.floor(o.baseRevenue*92/100)},{id:'deposit',payment:'deposit',selected:o.paymentTerms==='deposit',revenue:o.baseRevenue,payLag,discount:0,deposit:Math.floor(o.baseRevenue*30/100),disabled:!unlocked,reason:unlocked?'':`这位客户复购收齐${DEPOSIT_REPEAT_TARGET}单后愿付定金。`,requiredRepeats:DEPOSIT_REPEAT_TARGET}];
}
function transportEstimate(state,o,day=state.day){return ROUTES.map(r=>{const days=r.id==='express'&&o.stage>=2&&state.investment!=='express'?2:r.days;return {freight:r.id==='express'&&state.investment==='express'?180:r.cost,arrivalDay:day+days,collectionDay:day+days+o.payLag};}).filter(r=>r.arrivalDay<=(o.deadlineDay??day+o.deadlineDays)).sort((a,b)=>(a.freight+(a.collectionDay-day)*(state.dailyOperatingCost||0))-(b.freight+(b.collectionDay-day)*(state.dailyOperatingCost||0)))[0];}
export function berthUpgrade(state){
 let reason='';if(!state.businessRound)reason='先完成三程，开始经营长期客户。';else if(cargoCapacity(state)===2)reason='第二泊位已经投入使用。';
 else if(state.orders.some(o=>['packed','shipping'].includes(o.status)))reason='先把码头这批货交付，再扩建泊位。';
 else {const remaining=state.cash-SECOND_BERTH_COST;const candidates=currentOpeningOrders(state).filter(o=>o.status==='open');const orders=candidates.length?candidates:nextBusinessDemand(state);const minimum=Math.min(...orders.map(o=>{const estimate=transportEstimate(state,o);return costFor(state,o).purchaseCost-procurementDeposit(state,o)+estimate.freight+(estimate.collectionDay-state.day)*(state.dailyOperatingCost||0);}));const dueDays=Math.max(0,...state.orders.filter(o=>o.status==='receivable').map(o=>o.collectionDay-state.day));if(remaining<Math.max(minimum,dueDays*(state.dailyOperatingCost||0)))reason='扩建后还要留够一笔生意的货款、运费与日常周转。';}
 return {cost:SECOND_BERTH_COST,available:!reason,reason};
}
export function availableInvestments(state){return INVESTMENTS.map(i=>{let reason='';
 if(state.investment||state.stage===2)reason='已经选过经营投资。';
 else if(!state.orders.filter(o=>o.stage===1||!o.stage).every(o=>o.status==='paid'))reason='先把第一程三单的款收齐。';
 else {const probe={...state,investment:i.id,cash:state.cash-i.cost};const minimum=Math.min(...SECOND_ORDERS.map(o=>costFor(probe,o).purchaseCost+(o.deadlineDays<4?(i.id==='express'?180:300):100)+(o.payLag+(o.deadlineDays<4?(i.id==='express'?1:2):4))*DAILY_OPERATING_COST));if(probe.cash<minimum)reason='投资后必须留够一笔新生意的采购和运费。';}
 return {...i,dailyCost:DAILY_OPERATING_COST,available:!reason,reason};});}
/** Accept only this isolated prototype's v1 shape. Missing histories stay empty, never invented. */
export function normalizeOpeningSave(raw){
 try{
  const s=structuredClone(typeof raw==='string'?JSON.parse(raw):raw);
  const integer=n=>Number.isSafeInteger(n)&&n>=0;
  if(!s||s.version!==1||!integer(s.day)||s.day<1||!integer(s.cash)||!integer(s.round)||!Array.isArray(s.orders))return null;
  if(s.investment!=null&&!INVESTMENTS.some(i=>i.id===s.investment))return null;
  s.businessRound??=0;s.berthCount??=1;s.berthInvestmentCost??=0;if(!integer(s.businessRound)||![1,2].includes(s.berthCount)||s.berthInvestmentCost!==(s.berthCount===2?SECOND_BERTH_COST:0)||(!s.businessRound&&s.berthCount!==1))return null;
  s.investment??=null;s.stage=s.investment?(s.stage===3?3:2):1;s.investmentCost=s.investment?700:0;
  const legacyCosts=s.operatingCostPaid==null;s.dailyOperatingCost=s.stage>=2?DAILY_OPERATING_COST:0;s.operatingCostPaid??=0;if(!integer(s.operatingCostPaid))return null;
  if(s.demandStartRound!=null&&(!integer(s.demandStartRound)||s.demandStartRound<1||s.demandStartRound>s.businessRound))return null;
  let templates=s.stage===3?[...ORDERS,...SECOND_ORDERS,...THIRD_ORDERS]:s.stage===2?[...ORDERS,...SECOND_ORDERS]:ORDERS;
  if(s.businessRound){if(s.stage!==3||s.orders.length!==10+s.businessRound*2||businessCustomers(s).length!==2||s.orders.some(o=>!o.businessRound&&o.stage===3&&!['paid','declined'].includes(o.status)))return null;for(let n=1;n<=s.businessRound;n++)templates.push(...repeatTemplates(s,n,s.demandStartRound!=null&&n>=s.demandStartRound?1:0));}
  if(s.orders.length!==templates.length||new Set(s.orders.map(o=>o.id)).size!==templates.length)return null;
  for(const o of s.orders){const template=templates.find(t=>t.id===o.id);if(!template||!['open','packed','shipping','receivable','paid','declined'].includes(o.status))return null;
   for(const key of ['depositReceived','berthIndex','purchaseCost','basePurchaseCost','unitCost','deadlineDay','freight','arrivalDay','collectionDay','deliveredDay','transitDays','shipDay'])if(o[key]!=null&&!integer(o[key]))return null;
   if(signed(o)&&(!integer(o.purchaseCost)||!integer(o.deadlineDay)))return null;
   if(['shipping','receivable','paid'].includes(o.status)&&(!ROUTES.some(r=>r.id===o.route)||!integer(o.freight)||!integer(o.arrivalDay)||!integer(o.collectionDay)))return null;
   if(!PRODUCTS.some(p=>p.id===o.product)||typeof o.name!=='string'||o.name.length>120)return null;
   if(!['quantity','revenue','deadlineDays','payLag'].every(k=>integer(o[k]))||o.quantity<1||o.deadlineDays<1)return null;
   if(legacyCosts&&signed(o))o.legacySettlement=true;
   if(template.businessRound){for(const key of ['demandVersion','demandType','demandLabel'])if(o[key]!==template[key])return null;if(o.businessRound!==template.businessRound||o.customerId!==template.customerId||o.baseRevenue!==template.baseRevenue||!['cash','credit','deposit'].includes(o.paymentTerms)||(o.status==='declined'?o.passed!==true:o.passed!=null)||(o.businessRound<s.businessRound&&!['paid','declined'].includes(o.status)))return null;for(const key of ['name','product','quantity','deadlineDays'])if(o[key]!==template[key])return null;const terms=paymentOptions(s,o.id).find(x=>x.id===o.paymentTerms);if(terms.disabled||o.revenue!==terms.revenue||o.payLag!==terms.payLag)return null;
    if(o.paymentTerms==='deposit'){if(['open','declined'].includes(o.status)?o.depositReceived!=null:o.depositReceived!==terms.deposit)return null;}else if(o.depositReceived!=null)return null;
    const procurement=['purchaseCost','basePurchaseCost','unitCost','deadlineDay','berthIndex'],shipment=['freight','arrivalDay','collectionDay','transitDays','shipDay'];
    if(['open','declined'].includes(o.status)&&[...procurement,...shipment,'deliveredDay'].some(k=>o[k]!=null))return null;
    if(o.status==='packed'&&[...shipment,'deliveredDay'].some(k=>o[k]!=null))return null;
    if(signed(o)&&(!procurement.every(k=>integer(o[k]))||o.berthIndex>=cargoCapacity(s)||o.basePurchaseCost!==o.unitCost*o.quantity||o.purchaseCost!==Math.floor(o.basePurchaseCost*(s.investment==='warehouse'?90:100)/100)))return null;
    if(['shipping','receivable','paid'].includes(o.status)&&(!shipment.every(k=>integer(o[k]))||o.arrivalDay!==o.shipDay+o.transitDays||o.collectionDay!==o.arrivalDay+o.payLag||o.arrivalDay>o.deadlineDay))return null;
    if(['receivable','paid'].includes(o.status)&&(!integer(o.deliveredDay)||o.deliveredDay<o.arrivalDay||o.deliveredDay>s.day))return null;
   }else if(o.passed!=null||o.demandVersion!=null||o.demandType!=null||o.demandLabel!=null||o.businessRound||o.customerId||o.paymentTerms||o.baseRevenue!=null||o.depositReceived!=null)return null;
   o.stage=template.businessRound||THIRD_ORDERS.some(t=>t.id===o.id)?3:SECOND_ORDERS.some(t=>t.id===o.id)?2:1;
   if(o.route&&o.transitDays==null)o.transitDays=ROUTES.find(r=>r.id===o.route).days;
  }
  for(let n=1;n<=s.businessRound;n++){const batch=s.orders.filter(o=>o.businessRound===n);if(batch.some(o=>o.status==='declined')&&(batch.filter(o=>o.status==='declined').length!==1||batch.filter(o=>o.status==='paid').length!==1))return null;}
  const active=s.orders.filter(o=>['packed','shipping'].includes(o.status));if(active.length>cargoCapacity(s))return null;const occupied=new Set();for(const o of active){if(o.berthIndex==null)o.berthIndex=[0,1].find(i=>!occupied.has(i));if(o.berthIndex>=cargoCapacity(s)||occupied.has(o.berthIndex))return null;occupied.add(o.berthIndex);}
  const prices=p=>p&&PRODUCTS.every(x=>integer(p[x.id])&&p[x.id]>0);
  if(!prices(s.prices))return null;s.nextPrices={...priceAt(s.round+1)};
  s.history=Array.isArray(s.history)?s.history:[];
  s.priceHistory=Array.isArray(s.priceHistory)?s.priceHistory.filter(p=>integer(p.day)&&p.day<=s.day&&prices(p.prices)):[];
  s.completed=s.orders.filter(o=>o.status==='paid').length;const current=currentOpeningOrders(s);s.stageCompleted=current.filter(o=>o.status==='paid').length;s.stageTarget=s.businessRound?2-current.filter(o=>o.status==='declined').length:s.stage===3?2:3;s.stageSigned=current.filter(signed).length;if(s.stageSigned>s.stageTarget)return null;if(s.stage===3){if(s.orders.some(o=>o.stage<3&&o.status!=='paid'))return null;if(!s.businessRound)for(const o of current){if(s.stageSigned===2&&o.status==='open')o.status='declined';if(s.stageSigned<2&&o.status==='declined')return null;}}s.portUnlocked=s.stageCompleted===s.stageTarget;s.ending=s.stage>=2&&s.portUnlocked;return s;
 }catch{return null;}
}
export function createOpeningGame(){return {version:1,stage:1,businessRound:0,berthCount:1,berthInvestmentCost:0,investment:null,investmentCost:0,dailyOperatingCost:0,operatingCostPaid:0,stageCompleted:0,stageTarget:3,stageSigned:0,ending:false,day:1,round:0,cash:1800,prices:{...PRICES[0]},priceHistory:[{day:1,prices:{...PRICES[0]}}],nextPrices:{...PRICES[1]},orders:ORDERS.map(o=>({...o,stage:1,status:'open'})),completed:0,portUnlocked:false,history:[]};}
function find(state,id){return state.orders.find(o=>o.id===id);}
/** Quote never mutates. Revenue is fixed; procurement locks current public price. */
export function quoteOpening(state,orderId,route='sea'){
 const order=find(state,orderId),shipping=ROUTES.find(r=>r.id===(order?.route??route));
 if(!order||!shipping)return {valid:false,reason:'没有这笔订单或运输方式。'};
 const {purchaseCost,basePurchaseCost}=costFor(state,order);
 const freight=order.freight??(shipping.id==='express'&&state.investment==='express'?180:shipping.cost);
 const transitDays=order.transitDays??(order.arrivalDay!=null?shipping.days:shipping.id==='express'&&order.stage>=2&&state.investment!=='express'?2:shipping.days);
 const arrivalDay=order.arrivalDay??state.day+transitDays;
 const deadlineDay=order.deadlineDay??state.day+order.deadlineDays;
 const onTime=arrivalDay<=deadlineDay;
 const deposit=procurementDeposit(state,order),balanceDue=Math.max(0,outstandingPayment(order)-deposit),termsAllowed=order.paymentTerms!=='deposit'||earlierPaidRepeats(state,order)>=DEPOSIT_REPEAT_TARGET;
 const cashNeeded=order.status==='open'?purchaseCost+freight-deposit:order.status==='packed'?freight:0;
 const collectionDay=order.collectionDay??arrivalDay+order.payLag;
 const operatingReserve=Math.max(0,collectionDay-state.day)*(state.dailyOperatingCost||0);
 // Parallel procurement must not consume the other cargo's freight or common operating runway.
 const otherActive=state.orders.filter(o=>o.id!==order.id&&['packed','shipping'].includes(o.status));
 const otherEstimates=otherActive.map(o=>o.status==='packed'?transportEstimate(state,o):{freight:0,collectionDay:o.collectionDay});
 const otherFreightReserve=otherEstimates.reduce((n,x)=>n+(x?.freight||0),0);
 const sharedOperatingReserve=Math.max(0,collectionDay-state.day,...otherEstimates.map(x=>(x?.collectionDay??state.day)-state.day))*(state.dailyOperatingCost||0);
 const cashAfterPayment=state.cash-cashNeeded,cashAfterReserve=cashAfterPayment-otherFreightReserve-sharedOperatingReserve;
 const needsReserve=['open','packed'].includes(order.status);
 const settleOperatingCost=operatingReserve,settleCashAfter=state.cash+outstandingPayment(order)-settleOperatingCost;
 const canSettle=!!order.legacySettlement&&order.status==='shipping'&&order.payLag>0&&state.cash-Math.max(0,arrivalDay-state.day)*(state.dailyOperatingCost||0)<0&&settleCashAfter>=0;
 const funded=otherEstimates.every(Boolean)&&cashAfterPayment>=0&&(!needsReserve||cashAfterReserve>=0||(!!order.legacySettlement&&cashAfterReserve+outstandingPayment(order)>=0));
 return {valid:order.status!=='declined'&&termsAllowed&&onTime&&funded,reason:!termsAllowed?'这位客户尚未完成两笔复购，不能收取定金。':order.status==='declined'?'本轮已经选定两位客户，这笔不再签约。':!onTime?'这条路线赶不上交期。':!funded?'现金不足以支付货款、运费并撑到收款日。':'',orderId,route:shipping.id,purchaseCost,basePurchaseCost,discountSavings:basePurchaseCost-purchaseCost,freight,revenue:order.revenue,deposit,balanceDue,profit:order.revenue-purchaseCost-freight,transitDays,arrivalDay,collectionDay,deadlineDay,onTime,cashNeeded,cashAfterPayment,operatingReserve,otherFreightReserve,sharedOperatingReserve,cashAfterReserve,canSettle,settleOperatingCost,settleCashAfter,payLag:order.payLag};
}
function reject(state,message){return {state,feedback:{ok:false,message}};}
/** Actions: PURCHASE {orderId}, SHIP {orderId,route}, DELIVER {orderId}, COLLECT {orderId},
 * Business: START_BUSINESS, NEXT_BUSINESS_ROUND, SET_PAYMENT {orderId,paymentTerms}, EXPAND_BERTH.
 * SETTLE {orderId} (only quote.canSettle legacy shipments), INVEST {choice: warehouse|express}, RESTART. completed is lifetime; stageCompleted is current port.
 * DELIVER explicitly advances to arrival, COLLECT to the published payment date.
 * Orders with immediate terms collect on delivery. No ticks, random events or hidden bills.
 */
export function reduceOpening(state,action){
 if(action?.type==='RESTART')return {state:createOpeningGame(),feedback:{ok:true,message:'重新开张。'}};
 if(action?.type==='PASS_BUSINESS_ORDER'){
  if(!canPassBusinessOrder(state,action.orderId))return reject(state,'本批先收齐一单，另一份未签约的生意才可以不接。');
  const next=structuredClone(state),o=find(next,action.orderId);o.status='declined';o.passed=true;next.stageTarget=1;next.stageCompleted=1;next.portUnlocked=true;next.ending=true;
  const feedback={ok:true,message:'这份未签约生意本批不接，不收钱、不扣钱。客户下批仍会来；这次不增加复购记录。',action:action.type,orderId:o.id,cashDelta:0,daysAdvanced:0,operatingCost:0};next.history.push({...feedback,day:next.day});return {state:next,feedback};
 }
 if(['START_BUSINESS','NEXT_BUSINESS_ROUND'].includes(action?.type)){
  const starting=action.type==='START_BUSINESS';if(state.stage!==3||!state.ending||businessCustomers(state).length!==2||(starting?!!state.businessRound:!state.businessRound))return reject(state,'先收齐当前生意的货款。');
  const next=structuredClone(state);next.businessRound=(state.businessRound||0)+1;next.demandStartRound??=next.businessRound;next.orders.push(...repeatTemplates(next,next.businessRound,1).map(o=>({...o,status:'open'})));Object.assign(next,{ending:false,portUnlocked:false,stageCompleted:0,stageSigned:0,stageTarget:2});
  const feedback={ok:true,message:starting?'两位老客户带来了回头单。付款方式由你来定。':'老客户的新一批订单到了，采购价按今天行情。',action:action.type,cashDelta:0,daysAdvanced:0,operatingCost:0};next.history.push({...feedback,day:next.day});return {state:next,feedback};
 }
 if(action?.type==='SET_PAYMENT'){
  const o=find(state,action.orderId),choice=action.paymentTerms??action.payment;if(!state.businessRound||o?.businessRound!==state.businessRound||o.status!=='open')return reject(state,'采购后合同已锁定，不能再改付款方式。');
  const terms=paymentOptions(state,o.id).find(x=>x.id===choice);if(!terms)return reject(state,'请选择收款方式。');if(terms.disabled)return reject(state,terms.reason);const next=structuredClone(state);Object.assign(find(next,o.id),{paymentTerms:terms.id,revenue:terms.revenue,payLag:terms.payLag});return {state:next,feedback:{ok:true,message:terms.id==='deposit'?`签约先收${terms.deposit}元定金，尾款${terms.revenue-terms.deposit}元按账期收。`:terms.id==='cash'?`让价${terms.discount}元，交付即收款。`:`按原价成交，交付后${terms.payLag}天回款。`,action:action.type,cashDelta:0,daysAdvanced:0,operatingCost:0}};
 }
 if(action?.type==='EXPAND_BERTH'){
  const option=berthUpgrade(state);if(!option.available)return reject(state,option.reason);const next=structuredClone(state);next.cash-=option.cost;next.berthCount=2;next.berthInvestmentCost=option.cost;
  const feedback={ok:true,message:'第二泊位投入使用，现在可同时安排两批货。',action:action.type,cashDelta:-option.cost,daysAdvanced:0,operatingCost:0};next.history.push({...feedback,day:next.day});return {state:next,feedback};
 }
 if(action?.type==='NEXT_STAGE'){
  if(state.stage!==2||!state.ending||state.orders.filter(o=>o.stage===2&&o.status==='paid').length!==3)return reject(state,'先完成第二程的全部回款。');
  const next=structuredClone(state);Object.assign(next,{stage:3,stageTarget:2,stageSigned:0,stageCompleted:0,ending:false,portUnlocked:false});
  next.orders.push(...THIRD_ORDERS.map(o=>({...o,stage:3,status:'open'})));
  const feedback={ok:true,message:'四位客户来询价，这一程只选两位合作。',action:'NEXT_STAGE',cashDelta:0,daysAdvanced:0,operatingCost:0,portUnlocked:false};next.history.push({...feedback,day:next.day});return {state:next,feedback};
 }
 if(action?.type==='INVEST'){
  const option=availableInvestments(state).find(i=>i.id===action.choice);
  if(!option||!option.available)return reject(state,option?.reason||'请选择货仓或快线。');
  const next=structuredClone(state);next.cash-=option.cost;next.investment=option.id;next.investmentCost=option.cost;next.stage=2;next.dailyOperatingCost=DAILY_OPERATING_COST;next.stageCompleted=0;next.stageTarget=3;next.stageSigned=0;next.portUnlocked=false;next.ending=false;
  next.orders.push(...SECOND_ORDERS.map(o=>({...o,stage:2,status:'open'})));
  const feedback={ok:true,message:`${option.name}已投入使用，新港口三笔生意到了。`,action:'INVEST',cashDelta:-option.cost,daysAdvanced:0,portUnlocked:false};next.history.push({...feedback,day:next.day});return {state:next,feedback};
 }
 if(!action||!['PURCHASE','SHIP','DELIVER','COLLECT','SETTLE'].includes(action.type))return reject(state,'请选择采购、运输或收款。');
 const original=find(state,action.orderId);if(!original)return reject(state,'没有这笔订单。');
 if(action.type==='SETTLE'&&!quoteOpening(state,original.id).canSettle)return reject(state,'这笔订单可以按正常交付和收款流程办理。');
 const next=structuredClone(state),order=find(next,action.orderId);let message;
 if(action.type==='PURCHASE'){
  if(!currentOpeningOrders(state).some(o=>o.id===order.id)||order.status!=='open')return reject(state,'这笔订单不能再次签约。');
  if(currentOpeningOrders(state).filter(signed).length>=(state.stageTarget??3))return reject(state,'本轮合作名额已经用完。');
  if(state.orders.filter(o=>['packed','shipping'].includes(o.status)).length>=cargoCapacity(state))return reject(state,'泊位已满，先交付一批货；待收款不占泊位。');
  const affordable=ROUTES.some(r=>quoteOpening(state,order.id,r.id).valid);
  if(!affordable)return reject(state,'要留够采购、运费及收齐前的运营费；先收回其他订单的款。');
  Object.assign(order,costFor(state,order));order.unitCost=state.prices[order.product];order.deadlineDay=state.day+order.deadlineDays;
  const deposit=procurementDeposit(state,original);if(order.paymentTerms==='deposit')order.depositReceived=deposit;next.cash+=deposit-order.purchaseCost;order.status='packed';order.berthIndex=Array.from({length:cargoCapacity(state)},(_,i)=>i).find(i=>!state.orders.some(o=>['packed','shipping'].includes(o.status)&&(o.berthIndex??0)===i));next.stageSigned=currentOpeningOrders(next).filter(signed).length;
  if(next.stage===3&&!next.businessRound&&next.stageSigned===2)for(const other of next.orders.filter(o=>o.stage===3&&o.status==='open'))other.status='declined';
  message=`${order.quantity}箱货已配好，采购支出${order.purchaseCost}元。${deposit?' 同时收到定金'+deposit+'元。':''}`;
 }else if(action.type==='SHIP'){
  if(order.status!=='packed')return reject(state,'先采购配货，再选运输。');
  const q=quoteOpening(state,order.id,action.route);if(!q.valid)return reject(state,q.reason);
  order.route=q.route;order.transitDays=q.transitDays;order.shipDay=state.day;order.freight=q.freight;order.arrivalDay=q.arrivalDay;order.collectionDay=q.collectionDay;order.status='shipping';next.cash-=q.freight;message=`已发运，第${q.arrivalDay}天交付，第${q.collectionDay}天收款。`;
 }else if(action.type==='DELIVER'||(action.type==='SETTLE'&&order.status==='shipping')){
  if(order.status!=='shipping')return reject(state,'这批货还没有发运。');
  const target=action.type==='SETTLE'?Math.max(state.day,order.collectionDay):Math.max(state.day,order.arrivalDay);if(state.orders.some(o=>o.id!==order.id&&((o.status==='shipping'&&o.arrivalDay<target)||(o.status==='packed'&&!transportEstimate(state,o,target)))))return reject(state,'先处理更早到港或即将过交期的另一批货。');
  next.day=Math.max(state.day,order.arrivalDay);order.status='receivable';order.deliveredDay=next.day;
  next.round++;next.prices={...priceAt(next.round)};next.nextPrices={...priceAt(next.round+1)};
  next.priceHistory.push({day:next.day,prices:{...next.prices}});
  message=`客户已收货，${outstandingPayment(order)}元将在第${order.collectionDay}天到账。`;
  if(order.payLag===0||action.type==='SETTLE'){if(action.type==='SETTLE')next.day=Math.max(next.day,order.collectionDay);const payment=outstandingPayment(order);next.cash+=payment;order.status='paid';next.completed++;message=`交付收款${payment}元，这单毛利${order.revenue-order.purchaseCost-order.freight}元。`;}
 }else{
  if(order.status!=='receivable')return reject(state,'没有这笔待收款。');
  const targetDay=Math.max(state.day,order.collectionDay);
  if(state.orders.some(o=>o.status==='shipping'&&o.arrivalDay<targetDay))return reject(state,'先交付正在路上的货，再推进到这笔回款日。');
  if(targetDay>state.day&&state.orders.some(o=>o.status==='packed'))return reject(state,'先把码头已配好的货发运交付，再等待这笔回款。');
  next.day=Math.max(state.day,order.collectionDay);const payment=outstandingPayment(order);next.cash+=payment;order.status='paid';next.completed++;message=`推进到第${next.day}天，收到${payment}元。`;
 }
 // Reaching a promised payment date settles all receivables already due.
 // One advance, one operating bill; no extra collection clicks for the same day.
 const due=next.orders.filter(o=>o.status==='receivable'&&o.collectionDay<=next.day);
 if(due.length){const total=due.reduce((n,o)=>n+outstandingPayment(o),0);for(const o of due){o.status='paid';next.completed++;}next.cash+=total;message+=` 同时收到${due.length}笔到期货款${total}元。`;}
 const operatingCost=Math.max(0,next.day-state.day)*(state.dailyOperatingCost||0);
 if(!Number.isSafeInteger(next.cash)||next.cash<operatingCost)return reject(state,'现金不足以覆盖本次运营费；可选择交付并等到收款，一次结清应收与运营费。');
 next.cash-=operatingCost;next.operatingCostPaid=(state.operatingCostPaid||0)+operatingCost;
 if(operatingCost)message+=` 本次${next.day-state.day}天运营费${operatingCost}元。`;
 next.stageCompleted=currentOpeningOrders(next).filter(o=>o.status==='paid').length;
 next.portUnlocked=next.stageCompleted===(next.stageTarget??3);next.ending=next.stage>=2&&next.portUnlocked;
 if(next.portUnlocked)message+=next.businessRound?' 这批回头单款已收齐，老客户还会再来。':next.stage===3?' 两位客户的款全部收齐，第三程完成！':next.ending?' 新港三单全部收齐，第二程完成！':' 三单全部收齐，选一次经营投资，出发去新港！';
 const newlyTrusted=businessCustomers(next).filter(c=>c.repeatPaid===DEPOSIT_REPEAT_TARGET&&(businessCustomers(state).find(old=>old.id===c.id)?.repeatPaid||0)<DEPOSIT_REPEAT_TARGET);
 if(newlyTrusted.length)message+=' '+newlyTrusted.map(c=>c.name+'愿意先付定金了。').join('');
 const feedback={ok:true,message,action:action.type,orderId:order.id,cashDelta:next.cash-state.cash,daysAdvanced:next.day-state.day,operatingCost,portUnlocked:next.portUnlocked};
 next.history.push({...feedback,day:next.day});return {state:next,feedback};
}
