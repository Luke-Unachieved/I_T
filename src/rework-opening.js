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
export function createOpeningGame(){return {version:1,day:1,round:0,cash:1800,prices:{...PRICES[0]},priceHistory:[{day:1,prices:{...PRICES[0]}}],nextPrices:{...PRICES[1]},orders:ORDERS.map(o=>({...o,status:'open'})),completed:0,portUnlocked:false,history:[]};}
function find(state,id){return state.orders.find(o=>o.id===id);}
/** Quote never mutates. Revenue is fixed; procurement locks current public price. */
export function quoteOpening(state,orderId,route='sea'){
 const order=find(state,orderId),shipping=ROUTES.find(r=>r.id===(order?.route??route));
 if(!order||!shipping)return {valid:false,reason:'没有这笔订单或运输方式。'};
 const purchaseCost=order.purchaseCost??state.prices[order.product]*order.quantity;
 const arrivalDay=order.arrivalDay??state.day+shipping.days;
 const deadlineDay=order.deadlineDay??state.day+order.deadlineDays;
 const onTime=arrivalDay<=deadlineDay;
 const cashNeeded=order.status==='open'?purchaseCost+shipping.cost:order.status==='packed'?shipping.cost:0;
 return {valid:onTime&&state.cash>=cashNeeded,reason:!onTime?'这条路线赶不上交期。':state.cash<cashNeeded?'现金不够采购和运输。':'',orderId,route:shipping.id,purchaseCost,freight:shipping.cost,revenue:order.revenue,profit:order.revenue-purchaseCost-shipping.cost,arrivalDay,collectionDay:arrivalDay+order.payLag,deadlineDay,onTime,cashNeeded,cashAfterPayment:state.cash-cashNeeded,payLag:order.payLag};
}
function reject(state,message){return {state,feedback:{ok:false,message}};}
/** Actions: PURCHASE {orderId}, SHIP {orderId,route}, DELIVER {orderId}, COLLECT {orderId}, RESTART.
 * DELIVER explicitly advances to arrival, COLLECT to the published payment date.
 * Orders with immediate terms collect on delivery. No ticks, random events or hidden bills.
 */
export function reduceOpening(state,action){
 if(action?.type==='RESTART')return {state:createOpeningGame(),feedback:{ok:true,message:'重新开张。'}};
 if(!action||!['PURCHASE','SHIP','DELIVER','COLLECT'].includes(action.type))return reject(state,'请选择采购、运输或收款。');
 const original=find(state,action.orderId);if(!original)return reject(state,'没有这笔订单。');
 const next=structuredClone(state),order=find(next,action.orderId);let message;
 if(action.type==='PURCHASE'){
  if(order.status!=='open')return reject(state,'这笔订单已经采购。');
  if(state.orders.some(o=>['packed','shipping'].includes(o.status)))return reject(state,'先送完码头这批货，再配下一批；待收款不占货位。');
  const affordable=ROUTES.some(r=>quoteOpening(state,order.id,r.id).valid);
  if(!affordable)return reject(state,'要留够这单的运费；先收回其他订单的款。');
  order.purchaseCost=state.prices[order.product]*order.quantity;order.unitCost=state.prices[order.product];order.deadlineDay=state.day+order.deadlineDays;
  next.cash-=order.purchaseCost;order.status='packed';message=`${order.quantity}箱货已配好，采购支出${order.purchaseCost}元。`;
 }else if(action.type==='SHIP'){
  if(order.status!=='packed')return reject(state,'先采购配货，再选运输。');
  const q=quoteOpening(state,order.id,action.route);if(!q.valid)return reject(state,q.reason);
  order.route=q.route;order.freight=q.freight;order.arrivalDay=q.arrivalDay;order.collectionDay=q.collectionDay;order.status='shipping';next.cash-=q.freight;message=`已发运，第${q.arrivalDay}天交付，第${q.collectionDay}天收款。`;
 }else if(action.type==='DELIVER'){
  if(order.status!=='shipping')return reject(state,'这批货还没有发运。');
  next.day=Math.max(state.day,order.arrivalDay);order.status='receivable';order.deliveredDay=next.day;
  next.round++;next.prices={...PRICES[Math.min(next.round,PRICES.length-1)]};next.nextPrices={...PRICES[Math.min(next.round+1,PRICES.length-1)]};
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
 next.portUnlocked=next.completed===ORDERS.length;
 if(next.portUnlocked)message+=' 三单全部收齐，新港口已解锁！';
 const feedback={ok:true,message,action:action.type,orderId:order.id,cashDelta:next.cash-state.cash,daysAdvanced:next.day-state.day,portUnlocked:next.portUnlocked};
 next.history.push({...feedback,day:next.day});return {state:next,feedback};
}
