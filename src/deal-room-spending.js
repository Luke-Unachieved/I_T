import {businessOpportunities} from './deal-room-engine.js?v=36';
/** Display-only. Evaluate the same ready, affordable repeat quotes as the next
 * customer screen; never change a purchase, journal, balance or contract. */
export function spendingLiquidity(state,price){
 if(!['review','complete'].includes(state?.phase)||state.clientProjectActive||!Number.isSafeInteger(price)||price<0||!Number.isSafeInteger(state.cash)||state.cash<price)return null;
 const next={...state,phase:'portfolio',businessRound:(state.businessRound||0)+1,...(state.supplyPlanHistory?.length?{retailPlanning:true}:{})};
 const quotes=businessOpportunities(next).flatMap(c=>c.options.filter(q=>q.id!=='repeat-prepaid'&&q.valid&&q.accepted!==false&&Number.isSafeInteger(q.cashRequired)).map(q=>({clientId:c.id,optionId:q.id,required:q.cashRequired})));
 if(!quotes.length)return null;
 const cheapest=quotes.reduce((a,b)=>a.required<=b.required?a:b),cashAfter=state.cash-price,shortfall=cheapest.required-cashAfter;
 return shortfall>0?{...cheapest,cashAfter,shortfall}:null;
}
export function spendingLiquidityView(state,price){
 const q=spendingLiquidity(state,price);if(!q)return '';
 return `<p class="spending-liquidity">买完后，就算接熟客最小的一笔普通补货单，还差 ¥${q.shortfall.toLocaleString('zh-CN')} 周转。<small>可以先接单再买，也可以给熟客让点价，谈八成预付。</small></p>`;
}
