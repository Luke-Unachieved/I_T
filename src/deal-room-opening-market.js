// Normal promotion replies can be handled while opening contracts are in flight.
// Keep the legacy phase and dated contracts intact; only the ordinary market
// workbench is projected. All money/inventory mutations use the market reducer.
import {openingFlow,openingOrders} from './deal-room-opening-calendar.js?v=36';
import {repeatActiveOrders} from './deal-room-repeat-calendar.js';
import {roundReceivablesActive} from './deal-room-round-receivables.js';
function sideMarketContext(s){
 if(openingFlow(s)&&openingOrders(s).length)return 'opening';
 if(s?.businessRound&&!s.clientProjectActive&&!roundReceivablesActive(s)&&['portfolio','negotiating','fulfilling','paid'].includes(s.phase)&&
    s.contracts.filter(c=>c.status!=='paid').length===repeatActiveOrders(s).length)return 'familiar';
 return null;
}
import {applyMarketAction,canonicalMarketAction,parkedMarketOrders,canParkMarketOrder} from './deal-room-market.js?v=37';
const allowed=new Set(['SIGN_PROSPECT_LOT_V1','SIGN_PROSPECT_LOT_V2','DELIVER_MARKET_V2','COLLECT_MARKET_V2','DISMISS_PROSPECT_V1']);
export function openingMarketProjection(s,orderId=null){
 const context=sideMarketContext(s);if(!context)return null;
 const input={...s,phase:'market',market:s.openingMarket?.market??{status:'draft',returnPhase:context},
  marketParked:s.openingMarket?.parked??[],marketQueueSequence:s.openingMarket?.sequence??0};
 if(orderId===null)return input;
 if(orderId===0){
  if(canParkMarketOrder(input))return applyMarketAction(input,{type:'SWITCH_MARKET_ORDER_V1',orderId:0});
  return input.market.status==='draft'?input:{...input,market:{status:'draft',returnPhase:context}};
 }
 const result=applyMarketAction(input,{type:'SWITCH_MARKET_ORDER_V1',orderId});
 return result===input?null:result;
}
export function openingMarketOrders(s){
 const p=s?.openingMarket;if(!p)return [];
 const a=p.market?.active;
 return [...(p.parked??[]),...(['transit','receivable'].includes(a?.status)?[a]:[])];
}
export const openingMarketReserveDays=s=>Math.max(0,...openingMarketOrders(s).map(a=>a.paymentDay-s.day));
export function canonicalOpeningMarketAction(a){
 if(!a||a.type!=='OPENING_MARKET_ACTION_V1'||Object.keys(a).length!==3||!Object.hasOwn(a,'type')||!Object.hasOwn(a,'action')||!Object.hasOwn(a,'orderId')||
    !(a.orderId===null||Number.isSafeInteger(a.orderId)&&a.orderId>=0)||!allowed.has(a.action?.type))return null;
 const action=canonicalMarketAction(a.action),isQuote=['SIGN_PROSPECT_LOT_V1','SIGN_PROSPECT_LOT_V2','DISMISS_PROSPECT_V1'].includes(a.action.type);
 return action&&(a.orderId===0)===isQuote?{type:a.type,orderId:a.orderId,action}:null;
}
export function reduceOpeningMarket(s,a,canStart){
 const canonical=canonicalOpeningMarketAction(a),input=canonical&&openingMarketProjection(s,canonical.orderId);
 if(!input||!canonical)return s;
 const result=applyMarketAction(input,canonical.action,canStart);
 if(result===input)return s;
 // Never persist a projected phase or copy over the canonical opening journal.
 const n={...s,cash:result.cash,feedback:result.feedback,history:[...s.history],
  ...(sideMarketContext(s)==='opening'?{openingParallel:true,openingOrderChosen:true}:{repeatParallelV2:s.businessRound}),
  openingMarket:{market:result.market,parked:parkedMarketOrders(result),sequence:result.marketQueueSequence}};
 for(const prop of ['marketHistory','dismissedProspectLetters','ordinaryWarehouse'])if(Object.hasOwn(result,prop))n[prop]=result[prop];
 return n;
}
export function graduateOpeningMarket(s){
 if(!s.openingMarket)return s;
 if(openingMarketOrders(s).length){
  const {market,parked,sequence}=s.openingMarket;
  // An unsettled order is still real after the story stage ends. Return to
  // the market workbench, not a later career mode that could skip its dates.
  s.phase='market';
  s.market={...market,returnPhase:s.businessRound?'review':'complete'};
  s.marketParked=parked;s.marketQueueSequence=sequence;
 }
 delete s.openingMarket;
 return s;
}
