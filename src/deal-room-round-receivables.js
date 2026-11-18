/** Opt-in, finite two-contract receivables round. No background clock or capacity.
 * Helpers advance only cloned engine state. Office cost belongs to the contract
 * currently being delivered, or the earliest remaining receivable while waiting.
 * Quotes are estimates; recorded operatingCost/netProfit are actual to date.
 */
const clone=s=>JSON.parse(JSON.stringify(s));
export const roundReceivablesActive=s=>s.roundReceivables?.active===true&&s.roundReceivables.round===s.businessRound;
const orders=s=>s.contracts.filter(c=>c.roundReceivable&&c.businessRound===s.roundReceivables?.round);
export function roundReceivableSummary(state){
 const rows=orders(state),pending=rows.filter(c=>c.status==='receivable');
 return {active:roundReceivablesActive(state),rows:rows.map(c=>({clientId:c.clientId,clientName:c.clientName,status:c.status,quantity:c.quantity,deliveryDay:c.deliveryDay,paymentDay:c.paymentDay,balanceDue:c.balanceDue,operatingCost:c.operatingCost,netProfit:c.netProfit})),signed:rows.length,target:2,canCloseSettled:roundReceivablesActive(state)&&rows.length>=1&&rows.every(c=>c.status==='paid'),canFinish:roundReceivablesActive(state)&&rows.length===2&&rows.every(c=>c.status==='paid'),
  nextPaymentDay:pending.length?Math.min(...pending.map(c=>c.paymentDay)):null,
  receivables:pending.map(c=>({clientId:c.clientId,clientName:c.clientName,balanceDue:c.balanceDue,paymentDay:c.paymentDay,deliveryDay:c.deliveryDay})),
  outstanding:pending.reduce((n,c)=>n+c.balanceDue,0),operatingCost:rows.reduce((n,c)=>n+c.operatingCost,0),
  restriction:'本轮最多接两单；已签合同全部交付收齐后，可回工作室经营其他业务。'};
}
/** Inclusive end-of-day settlement, never credit future cash at signing.
 * Return false without exposing the cloned result if any interval is insolvent.
 */
export function advanceRoundTime(s,target,ownerIndex=null){
 if(!Number.isSafeInteger(target)||target<s.day)return false;
 while(true){
  const pending=orders(s).filter(c=>c.status==='receivable');
  const due=pending.filter(c=>c.paymentDay<=target).map(c=>Math.max(s.day,c.paymentDay));
  const next=Math.min(target,...due),fee=(next-s.day)*30;
  const owner=ownerIndex!==null?s.contracts[ownerIndex]:pending.slice().sort((a,b)=>a.paymentDay-b.paymentDay)[0];
  if(fee&&!owner||s.cash<fee)return false;
  s.cash-=fee;s.day=next;
  if(owner){owner.operatingCost+=fee;owner.netProfit=owner.profit-owner.operatingCost;}
  for(const c of pending.filter(c=>c.paymentDay<=s.day)){s.cash+=c.balanceDue;c.status='paid';c.paidDay=s.day;}
  if(s.day===target)return Number.isSafeInteger(s.cash)&&s.cash>=0;
 }
}
export function previewRoundSigning(state,q,clientId){
 if(!roundReceivablesActive(state))return q;
 const rows=orders(state),locked=rows.some(c=>c.clientId===clientId&&c.status!=='paid');
 let reason=state.businessSigned>=2?'本轮两份合同已签，请先交付并收齐。':locked?'这位客户还有尾款待收，不能重复签约。':state.contracts.some(c=>c.status==='fulfilling')?'先交付当前生产中的合同。':'';
 if(!reason&&state.cash+q.deposit-q.cost<0)reason='现有现金不足以采购，未来尾款不能提前支用。';
 const s=clone(state),index=s.contracts.length;
 s.cash+=q.deposit-q.cost;s.contracts.push({...q,clientId,businessRound:s.businessRound,roundReceivable:true,status:'receivable',operatingCost:0,netProfit:q.profit});
 const horizon=Math.max(q.paymentDay,...orders(s).filter(c=>c.status==='receivable').map(c=>c.paymentDay));
 // The final round balance may include a different customer's payment several
 // days later. Project this contract's own day separately, with the same ledger.
 // Only the at-most-two live round entries are needed; never rewrite the save.
 const onOwnDay=!reason&&horizon>q.paymentDay?{day:s.day,cash:s.cash,businessRound:s.businessRound,roundReceivables:s.roundReceivables,contracts:orders(s).map(o=>({...o}))}:null;
 if(!reason&&!advanceRoundTime(s,horizon,index))reason='按已确定的回款日期，现金不足以覆盖期间开支。';
 const valid=state.phase==='negotiating'&&!reason;
 const hasEarlierBalance=valid&&onOwnDay&&advanceRoundTime(onOwnDay,q.paymentDay,onOwnDay.contracts.length-1);
 return {...q,...(hasEarlierBalance?{cashAtOwnPayment:onOwnDay.cash}:{}),valid,reason:reason||(q.accepted===false?q.reason:''),estimatedOperatingCost:q.operatingCost,
  cashRequired:Math.max(0,q.cost-q.deposit),cashAfterSigning:state.cash+q.deposit-q.cost,
  cashAfterPayment:reason?null:s.cash,projectedSettlementDay:horizon,opportunityNote:'交货后可谈本轮第二单；尾款按原账期到账。两单收齐后再回工作室。'};
}
