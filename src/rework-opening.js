/** Isolated opening prototype. Integer fictional yuan; days advance only by explicit actions.
 * Storage owner should use STORAGE_KEY, never the established trade-game save key.
 */
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
const priceAt=round=>PRICES[round%PRICES.length];
function costFor(state,order){const base=order.basePurchaseCost??order.unitCost*order.quantity;const raw=Number.isFinite(base)?base:state.prices[order.product]*order.quantity;return {basePurchaseCost:raw,purchaseCost:order.purchaseCost??Math.floor(raw*(state.investment==='warehouse'?90:100)/100)};}
export function availableInvestments(state){return INVESTMENTS.map(i=>{let reason='';
 if(state.investment||state.stage===2)reason='已经选过经营投资。';
 else if(!state.orders.filter(o=>o.stage===1||!o.stage).every(o=>o.status==='paid'))reason='先把第一程三单的款收齐。';
 else {const probe={...state,investment:i.id,cash:state.cash-i.cost};const minimum=Math.min(...SECOND_ORDERS.map(o=>costFor(probe,o).purchaseCost+(o.deadlineDays<4?(i.id==='express'?180:300):100)));if(probe.cash<minimum)reason='投资后必须留够一笔新生意的采购和运费。';}
 return {...i,available:!reason,reason};});}
/** Accept only this isolated prototype's v1 shape. Missing histories stay empty, never invented. */
export function normalizeOpeningSave(raw){
 try{
  const s=structuredClone(typeof raw==='string'?JSON.parse(raw):raw);
  const integer=n=>Number.isSafeInteger(n)&&n>=0;
  if(!s||s.version!==1||!integer(s.day)||s.day<1||!integer(s.cash)||!integer(s.round)||!Array.isArray(s.orders))return null;
  if(s.investment!=null&&!INVESTMENTS.some(i=>i.id===s.investment))return null;
  s.investment??=null;s.stage=s.investment?2:1;s.investmentCost=s.investment?700:0;
  const templates=s.stage===2?[...ORDERS,...SECOND_ORDERS]:ORDERS;
  if(s.orders.length!==templates.length||new Set(s.orders.map(o=>o.id)).size!==templates.length)return null;
  for(const o of s.orders){const template=templates.find(t=>t.id===o.id);if(!template||!['open','packed','shipping','receivable','paid'].includes(o.status))return null;
   for(const key of ['purchaseCost','basePurchaseCost','unitCost','deadlineDay','freight','arrivalDay','collectionDay','deliveredDay','transitDays','shipDay'])if(o[key]!=null&&!integer(o[key]))return null;
   if(o.status!=='open'&&(!integer(o.purchaseCost)||!integer(o.deadlineDay)))return null;
   if(['shipping','receivable','paid'].includes(o.status)&&(!ROUTES.some(r=>r.id===o.route)||!integer(o.freight)||!integer(o.arrivalDay)||!integer(o.collectionDay)))return null;
   if(!PRODUCTS.some(p=>p.id===o.product)||typeof o.name!=='string'||o.name.length>120)return null;
   if(!['quantity','revenue','deadlineDays','payLag'].every(k=>integer(o[k]))||o.quantity<1||o.deadlineDays<1)return null;
   o.stage=SECOND_ORDERS.some(t=>t.id===o.id)?2:1;
   if(o.route&&o.transitDays==null)o.transitDays=ROUTES.find(r=>r.id===o.route).days;
  }
  if(s.orders.filter(o=>['packed','shipping'].includes(o.status)).length>1)return null;
  const prices=p=>p&&PRODUCTS.every(x=>integer(p[x.id])&&p[x.id]>0);
  if(!prices(s.prices))return null;s.nextPrices={...priceAt(s.round+1)};
  s.history=Array.isArray(s.history)?s.history:[];
  s.priceHistory=Array.isArray(s.priceHistory)?s.priceHistory.filter(p=>integer(p.day)&&p.day<=s.day&&prices(p.prices)):[];
  s.completed=s.orders.filter(o=>o.status==='paid').length;s.stageCompleted=s.orders.filter(o=>o.stage===s.stage&&o.status==='paid').length;s.portUnlocked=s.stageCompleted===3;s.ending=s.stage===2&&s.portUnlocked;return s;
 }catch{return null;}
}
export function createOpeningGame(){return {version:1,stage:1,investment:null,investmentCost:0,stageCompleted:0,ending:false,day:1,round:0,cash:1800,prices:{...PRICES[0]},priceHistory:[{day:1,prices:{...PRICES[0]}}],nextPrices:{...PRICES[1]},orders:ORDERS.map(o=>({...o,stage:1,status:'open'})),completed:0,portUnlocked:false,history:[]};}
function find(state,id){return state.orders.find(o=>o.id===id);}
/** Quote never mutates. Revenue is fixed; procurement locks current public price. */
export function quoteOpening(state,orderId,route='sea'){
 const order=find(state,orderId),shipping=ROUTES.find(r=>r.id===(order?.route??route));
 if(!order||!shipping)return {valid:false,reason:'没有这笔订单或运输方式。'};
 const {purchaseCost,basePurchaseCost}=costFor(state,order);
 const freight=order.freight??(shipping.id==='express'&&state.investment==='express'?180:shipping.cost);
 const transitDays=order.transitDays??(order.arrivalDay!=null?shipping.days:shipping.id==='express'&&order.stage===2&&state.investment!=='express'?2:shipping.days);
 const arrivalDay=order.arrivalDay??state.day+transitDays;
 const deadlineDay=order.deadlineDay??state.day+order.deadlineDays;
 const onTime=arrivalDay<=deadlineDay;
 const cashNeeded=order.status==='open'?purchaseCost+freight:order.status==='packed'?freight:0;
 return {valid:onTime&&state.cash>=cashNeeded,reason:!onTime?'这条路线赶不上交期。':state.cash<cashNeeded?'现金不够采购和运输。':'',orderId,route:shipping.id,purchaseCost,basePurchaseCost,discountSavings:basePurchaseCost-purchaseCost,freight,revenue:order.revenue,profit:order.revenue-purchaseCost-freight,transitDays,arrivalDay,collectionDay:order.collectionDay??arrivalDay+order.payLag,deadlineDay,onTime,cashNeeded,cashAfterPayment:state.cash-cashNeeded,payLag:order.payLag};
}
function reject(state,message){return {state,feedback:{ok:false,message}};}
/** Actions: PURCHASE {orderId}, SHIP {orderId,route}, DELIVER {orderId}, COLLECT {orderId},
 * INVEST {choice: warehouse|express}, RESTART. completed is lifetime; stageCompleted is current port.
 * DELIVER explicitly advances to arrival, COLLECT to the published payment date.
 * Orders with immediate terms collect on delivery. No ticks, random events or hidden bills.
 */
export function reduceOpening(state,action){
 if(action?.type==='RESTART')return {state:createOpeningGame(),feedback:{ok:true,message:'重新开张。'}};
 if(action?.type==='INVEST'){
  const option=availableInvestments(state).find(i=>i.id===action.choice);
  if(!option||!option.available)return reject(state,option?.reason||'请选择货仓或快线。');
  const next=structuredClone(state);next.cash-=option.cost;next.investment=option.id;next.investmentCost=option.cost;next.stage=2;next.stageCompleted=0;next.portUnlocked=false;next.ending=false;
  next.orders.push(...SECOND_ORDERS.map(o=>({...o,stage:2,status:'open'})));
  const feedback={ok:true,message:`${option.name}已投入使用，新港口三笔生意到了。`,action:'INVEST',cashDelta:-option.cost,daysAdvanced:0,portUnlocked:false};next.history.push({...feedback,day:next.day});return {state:next,feedback};
 }
 if(!action||!['PURCHASE','SHIP','DELIVER','COLLECT'].includes(action.type))return reject(state,'请选择采购、运输或收款。');
 const original=find(state,action.orderId);if(!original)return reject(state,'没有这笔订单。');
 const next=structuredClone(state),order=find(next,action.orderId);let message;
 if(action.type==='PURCHASE'){
  if(order.status!=='open')return reject(state,'这笔订单已经采购。');
  if(state.orders.some(o=>['packed','shipping'].includes(o.status)))return reject(state,'先送完码头这批货，再配下一批；待收款不占货位。');
  const affordable=ROUTES.some(r=>quoteOpening(state,order.id,r.id).valid);
  if(!affordable)return reject(state,'要留够这单的运费；先收回其他订单的款。');
  Object.assign(order,costFor(state,order));order.unitCost=state.prices[order.product];order.deadlineDay=state.day+order.deadlineDays;
  next.cash-=order.purchaseCost;order.status='packed';message=`${order.quantity}箱货已配好，采购支出${order.purchaseCost}元。`;
 }else if(action.type==='SHIP'){
  if(order.status!=='packed')return reject(state,'先采购配货，再选运输。');
  const q=quoteOpening(state,order.id,action.route);if(!q.valid)return reject(state,q.reason);
  order.route=q.route;order.transitDays=q.transitDays;order.shipDay=state.day;order.freight=q.freight;order.arrivalDay=q.arrivalDay;order.collectionDay=q.collectionDay;order.status='shipping';next.cash-=q.freight;message=`已发运，第${q.arrivalDay}天交付，第${q.collectionDay}天收款。`;
 }else if(action.type==='DELIVER'){
  if(order.status!=='shipping')return reject(state,'这批货还没有发运。');
  next.day=Math.max(state.day,order.arrivalDay);order.status='receivable';order.deliveredDay=next.day;
  next.round++;next.prices={...priceAt(next.round)};next.nextPrices={...priceAt(next.round+1)};
  next.priceHistory.push({day:next.day,prices:{...next.prices}});
  message=`客户已收货，${order.revenue}元将在第${order.collectionDay}天到账。`;
  if(order.payLag===0){next.cash+=order.revenue;order.status='paid';next.completed++;message=`交付收款${order.revenue}元，这单赚${order.revenue-order.purchaseCost-order.freight}元。`;}
 }else{
  if(order.status!=='receivable')return reject(state,'没有这笔待收款。');
  const targetDay=Math.max(state.day,order.collectionDay);
  if(state.orders.some(o=>o.status==='shipping'&&o.arrivalDay<targetDay))return reject(state,'先交付正在路上的货，再推进到这笔回款日。');
  if(targetDay>state.day&&state.orders.some(o=>o.status==='packed'))return reject(state,'先把码头已配好的货发运交付，再等待这笔回款。');
  next.day=Math.max(state.day,order.collectionDay);next.cash+=order.revenue;order.status='paid';next.completed++;message=`推进到第${next.day}天，收到${order.revenue}元。`;
 }
 next.stageCompleted=next.orders.filter(o=>o.stage===next.stage&&o.status==='paid').length;
 next.portUnlocked=next.stageCompleted===3;next.ending=next.stage===2&&next.portUnlocked;
 if(next.portUnlocked)message+=next.ending?' 新港三单全部收齐，第二程完成！':' 三单全部收齐，选一次经营投资，出发去新港！';
 const feedback={ok:true,message,action:action.type,orderId:order.id,cashDelta:next.cash-state.cash,daysAdvanced:next.day-state.day,portUnlocked:next.portUnlocked};
 next.history.push({...feedback,day:next.day});return {state:next,feedback};
}
