// Ordinary orders from the three original customers; presentation only.
import {currentClient,quoteOptions} from './deal-room-engine.js?v=37';
import {ordinaryRepeatContract,isOrdinaryRepeatChoice} from './deal-room-repeat-calendar.js';
import {roundReceivablesActive} from './deal-room-round-receivables.js';

const products=Object.freeze({mira:'便携台灯',samir:'不锈钢保温杯',ines:'棉麻桌布'});
const day=n=>Number.isSafeInteger(n)&&n>=1;

export function openingRepeatComicScope(state, selected){
 if(!day(state?.businessRound)||!day(state.day)||state.clientProjectActive||roundReceivablesActive(state)||
    !['negotiating','fulfilling','paid'].includes(state.phase))return null;
 const client=currentClient(state);
 if(!client||!Object.hasOwn(products,client.id)||client.product!==products[client.id])return null;
 const earlier=state.contracts.some(c=>c.clientId===client.id&&c.product===client.product&&c.status==='paid'&&
   !c.businessRound&&!c.projectId&&c.paymentDay<=state.day);
 if(!earlier)return null;
 if(state.phase==='negotiating'){
  if(!isOrdinaryRepeatChoice(selected))return null;
  const option=quoteOptions(state).find(q=>q.id===selected&&q.accepted);
  return option?{stage:'inquiry',clientId:client.id,optionId:selected,option,specification:option.specification}:null;
 }
 const c=ordinaryRepeatContract(state);
 if(!c||c.clientId!==client.id)return null;
 const data={clientId:c.clientId,optionId:c.optionId,contract:c,specification:c.specification};
 if(state.phase==='paid'&&c.status==='paid'&&state.day>=c.paymentDay)return {stage:'paid',...data};
 if(state.phase==='fulfilling'&&c.status==='receivable'&&state.day>=c.deliveryDay&&c.paymentDay>c.deliveryDay)return {stage:'delivered',...data};
 if(state.phase==='fulfilling'&&c.status==='fulfilling')return {stage:state.day>=c.deliveryDay?'delivery-due':'signed',...data};
 return null;
}
