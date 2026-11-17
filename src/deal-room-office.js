/** One optional, one-time furnishing purchase. Core owns the action journal. */
export const OFFICE_IMPROVEMENT = Object.freeze({id:'window-studio',name:'窗边工作室布置',price:3600});
export const OFFICE_ACTION_KEYS = Object.freeze({BUY_OFFICE_IMPROVEMENT:['type']});
export function officeAvailable(state){return ['review','complete'].includes(state?.phase)&&(state.contracts||[]).some(c=>c.status==='paid');}
export function officePreview(state){
 const owned=!!state?.officeImprovement, cash=state?.cash, price=OFFICE_IMPROVEMENT.price;
 const validCash=Number.isSafeInteger(cash)&&cash>=0;
 return {owned,valid:!owned&&officeAvailable(state)&&validCash&&cash>=price,price,cashAfter:validCash?cash-price:null,shortfall:validCash?Math.max(0,price-cash):null};
}
export function canonicalOfficeAction(a){return a&&typeof a==='object'&&!Array.isArray(a)&&a.type==='BUY_OFFICE_IMPROVEMENT'&&Object.keys(a).length===1?{type:a.type}:null;}
export function applyOfficeAction(state,action){
 if(!canonicalOfficeAction(action)||!officePreview(state).valid)return state;
 const next=structuredClone(state);next.cash-=OFFICE_IMPROVEMENT.price;
 next.officeImprovement={id:OFFICE_IMPROVEMENT.id,price:OFFICE_IMPROVEMENT.price,day:state.day};
 next.feedback={kind:'office-improvement',message:'窗边工作室布置好了。新的陈列角和休息位，都是留给自己的。'};
 return next;
}
export function officeCompletedWork(state){return (state.contracts||[]).filter(c=>c.status==='paid').map(c=>({clientId:c.clientId,quantity:c.quantity}));}
