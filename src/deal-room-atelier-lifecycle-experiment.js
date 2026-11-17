import {createAtelierNegotiation,reduceAtelierNegotiation,previewAtelierPurchase} from './deal-room-atelier-negotiation-experiment.js';
/** Isolated, unshipped lifecycle. Owns a deep-cloned world; never writes the main
 * reducer or save keys. No concurrent contracts. Reorders are player requests,
 * not invented customer demand or proof of long-term play value. */
const copy=x=>JSON.parse(JSON.stringify(x));
const draftOf=q=>Object.fromEntries(['products','packaging','payment','versionId','lampVersion'].map(k=>[k,copy(q[k])]));
export function createAtelierLifecycle(world,options){
 const session=createAtelierNegotiation(world,options);if(!session)return null;
 return {experimental:true,world:copy(world),session,orders:[],activeOrderId:null,feedback:session.feedback};
}
export function atelierAdoptionChoices(model){
 if(!model||model.activeOrderId)return [];
 return model.orders.filter(o=>o.status==='paid').map(o=>({orderId:o.id,buyerId:'atelier',products:[...o.products],versionId:o.versionId,lead:o.lead,use:o.use,packaging:o.packaging,
  actions:[{type:'REORDER_ATELIER_ADOPTION',orderId:o.id,label:'按已采用方案再采购'},
   {type:'REOPEN_ATELIER_ADOPTION',orderId:o.id,label:'拿已采用实物重新谈搭配'}]}));
}
/** Reserved-flow experiment only: the held deposit is not counted twice as capital. */
export function previewAtelierChange(model,draft={}){
 const o=model?.orders.find(o=>o.id===model.activeOrderId);
 if(!o||o.status!=='awaiting-production')return {valid:false,reason:'只有尚未下工厂单的合同可以协商变更。'};
 const session={...model.session,stage:'drafting',mode:o.mode,lead:draft.lead||o.lead,shownVersionId:o.versionId};
 const q=previewAtelierPurchase({...model.world,cash:model.world.cash-o.received,day:o.signedDay},session,{...draftOf(o),...draft});
 return {...q,lead:session.lead,depositDelta:Number.isSafeInteger(q.deposit)?q.deposit-o.received:0,costDelta:Number.isSafeInteger(q.cost)?q.cost-o.cost:0,
  previousDeliveryDay:o.deliveryDay,previousPaymentDay:o.paymentDay};
}
export function reduceAtelierLifecycle(model,action={}){
 if(!model)return model;
 const active=model.orders.find(o=>o.id===model.activeOrderId);
 const reject=feedback=>({...model,feedback});
 if(active){
  if(['REQUEST_ATELIER_CHANGE','ACCEPT_ATELIER_CHANGE','DECLINE_ATELIER_CHANGE'].includes(action.type)&&active.status!=='awaiting-production')return reject('工厂已经接单，不能按未投产条件更换合同。');
  if(active.status==='awaiting-production'){
   if(action.type==='REQUEST_ATELIER_CHANGE'){
    const q=previewAtelierChange(model,{...action.draft,...(action.lead?{lead:action.lead}:{})});if(!q.valid)return reject(q.reason);
    const next=copy(model),o=next.orders.find(o=>o.id===active.id);
    o.changeRequest={status:'pending-customer-confirmation',quote:copy(q)};next.feedback='新用途与差额已列明，尚未变更合同；请明确同意或保留原约。';return next;
   }
   if(action.type==='DECLINE_ATELIER_CHANGE'){
    if(!active.changeRequest)return model;
    const next=copy(model);next.orders.find(o=>o.id===active.id).changeRequest=null;next.feedback='保留原合同，未收取差额，也没有关系惩罚。';return next;
   }
   if(action.type==='ACCEPT_ATELIER_CHANGE'){
    if(!active.changeRequest)return model;
    const q=previewAtelierChange(model,{...draftOf(active.changeRequest.quote),lead:active.changeRequest.quote.lead});if(!q.valid)return reject(q.reason);
    const next=copy(model),o=next.orders.find(o=>o.id===active.id),before=copy(o);
    delete before.changeRequest;delete before.amendments;delete before.originalTerms;
    next.world.cash+=q.depositDelta;
    Object.assign(o,copy(q),{proposalOnly:false,use:q.use||(q.packaging==='gift'?'完整礼赠，按组合带走':'开放陈列，让顾客拿取体验'),received:q.deposit,changeRequest:null});
    o.amendments.push({day:next.world.day,before,after:copy(q),depositDelta:q.depositDelta});
    next.session={...next.session,lead:o.lead,shownVersionId:o.versionId,proposal:copy(o)};
    next.feedback='双方已确认新范围与日期，定金差额已结清；尚未下工厂单。';return next;
   }
   if(action.type==='RELEASE_ATELIER_PRODUCTION'){
    if(active.changeRequest)return reject('先确认或拒绝待谈的变更，再下工厂单。');
    if(model.world.day!==active.signedDay||model.world.cash<active.cost+active.operatingCost)return reject('资金或排程不足，不能下工厂单。');
    const next=copy(model),o=next.orders.find(o=>o.id===active.id);next.world.cash-=o.cost;o.status='production';o.factoryCostPaid=o.cost;
    next.feedback='锁定的制作款已支付，工厂开始履约；此后不能按未投产条件改约。';return next;
   }
   return model;
  }

  if(action.type==='DELIVER_ATELIER_ORDER'&&active.status==='production'){
   const next=copy(model),o=next.orders.find(o=>o.id===active.id),days=o.deliveryDay-next.world.day;
   if(days<0||next.world.cash<days*30)return reject('资金不足，不能推进交付。');
   next.world.cash-=days*30;next.world.day=o.deliveryDay;o.operatingCostPaid+=days*30;o.status='receivable';
   next.feedback='已按签约商品与用途交付，尾款仍待约定日期收取。';return next;
  }
  if(action.type==='COLLECT_ATELIER_BALANCE'&&active.status==='receivable'){
   const next=copy(model),o=next.orders.find(o=>o.id===active.id),days=o.paymentDay-next.world.day;
   if(days<0||next.world.cash<days*30)return reject('资金不足，不能推进回款。');
   next.world.cash+=o.balanceDue-days*30;next.world.day=o.paymentDay;o.operatingCostPaid+=days*30;o.status='paid';o.received=o.revenue;
   next.activeOrderId=null;next.feedback='尾款已收齐，实际采用的实物与用途已保留，可按原方案补购或拿样重谈。';return next;
  }
  return model; // signing/delivery/collection duplicates and withdrawal cannot alter a live contract
 }
 if(['REORDER_ATELIER_ADOPTION','REOPEN_ATELIER_ADOPTION'].includes(action.type)){
  if(model.session.stage==='confirmed')return reject('已有认可的提案，请先撤回重谈，再选择历史采用方案。');
  const o=model.orders.find(o=>o.id===action.orderId&&o.status==='paid');if(!o)return model;
  let session=createAtelierNegotiation(model.world,{referrerId:o.referrerId});
  if(action.type==='REOPEN_ATELIER_ADOPTION'){
   session=reduceAtelierNegotiation(model.world,session,{type:'SHOW_DISPLAY',lead:o.lead||o.products[0],versionId:o.versionId});
   return {...model,session,feedback:'拿出这次实际采用的样品，重新讨论搭配；旧合同与授权保留。'};
  }
  session={...session,stage:'drafting',mode:o.mode,lead:o.lead,shownVersionId:o.versionId};
  session=reduceAtelierNegotiation(model.world,session,{type:'PROPOSE_PURCHASE',draft:draftOf(o)});
  return {...model,session,feedback:session.feedback};
 }
 if(action.type==='SIGN_ATELIER_PROPOSAL'||action.type==='SIGN_ATELIER_RESERVED'){
  if(model.session.stage!=='confirmed'||!model.session.proposal)return model;
  const q=previewAtelierPurchase(model.world,{...model.session,stage:'drafting'},draftOf(model.session.proposal));
  if(!q.valid)return reject(q.reason);
  const next=copy(model),id=`atelier-experiment-${next.orders.length+1}`;
  const use=q.use||(q.packaging==='gift'?'完整礼赠，按组合带走':'开放陈列，让顾客拿取体验');
  const order={...copy(q),proposalOnly:false,id,status:'production',buyerId:'atelier',referrerId:model.session.referrerId,mode:model.session.mode,lead:model.session.lead,use,signedDay:model.world.day,operatingCostPaid:0,received:q.deposit};
  if(action.type==='SIGN_ATELIER_RESERVED'){
   order.status='awaiting-production';order.originalTerms={...copy(q),lead:order.lead,use:order.use,mode:order.mode};order.amendments=[];order.changeRequest=null;order.factoryCostPaid=0;
   next.world.cash+=q.deposit;next.orders.push(order);next.activeOrderId=id;next.session.stage='signed';
   next.feedback='合同已签、定金已收，尚未下工厂单；可明确协商变更或按原约投产。';return next;
  }
  next.world.cash+=q.deposit-q.cost;next.orders.push(order);next.activeOrderId=id;next.session.stage='signed';
  next.feedback='合同已签，定金已收、制作款已支付；商品、版本、用途和主推已锁定。';return next;
 }
 if(model.session.stage==='signed')return model;
 const session=reduceAtelierNegotiation(model.world,model.session,action);
 return session===model.session?model:{...model,session,feedback:session.feedback};
}
