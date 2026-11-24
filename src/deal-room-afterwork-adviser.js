import {propertyHoldings, propertyPreview, PROPERTY_CATALOG} from './deal-room-property.js?v=36';
import {promotionReserve} from './deal-room-promotion.js?v=37';
import {parkedMarketOrders} from './deal-room-market.js?v=37';
import {previewLiveWorkspaceSleep as previewWorkspaceSleep} from './deal-room-workspace-sleep.js?v=37';
import {openingDialogueQuote} from './deal-room-opening-dialogue.js';

const adviserNames=Object.freeze({fang:'方文斌',liang:'梁佳音',tao:'陶乐',xu:'许明珊'});
// Two spaced slots, no random redraw on reload, tab switches or adviser changes.
const lookDays=Object.freeze({3:'car',10:'home'});
const reminder=Object.freeze({
 car:{label:'去看看车',text:'最近做成的单子赚了些钱。留够下一单的周转，手头还够买辆代步车。有空可以先去车行看看。'},
 home:{label:'去看看房',text:'留足生意上的周转，手头还有些余钱。要是想换个住处，有空可以去看看房。'}
});
function hasSettledProfit(state){
 let profit=0;
 for(const order of [
  ...(state.contracts??[]),...(state.marketHistory??[]),...(state.curationHistory??[]),
  ...(state.accountHistory??[]),...(state.caseGrowthHistory??[])
 ]){
  const day=order.paidDay??order.paymentDay;
  if(order.status==='paid'&&Number.isSafeInteger(day)&&day<=state.day&&Number.isSafeInteger(order.netProfit))
   profit+=order.netProfit;
 }
 return profit>0;
}

export function afterworkAdvice(state,sleep,{sleepOpen=false}={}){
 const q=sleep??previewWorkspaceSleep(state);
 if(sleepOpen||!q.valid)return null;
 const groups=q.reminderGroups??[];
 if(groups.length){
  const due=groups.find(g=>g.title==='询盘今天截止')?.items??[];
  if(due.length===1)return {text:due[0]+'。还想谈的话，今晚回一封。'};
  if(due.length>1)return {text:'有 '+due.length+' 封询盘今天截止。还想谈的话，可以先去回信。'};
  return {text:'还有到期的订单没办完。睡前可以展开看看是哪几笔。'};
 }
 const kind=lookDays[state.day%14];
 if(!kind||!['review','complete'].includes(state.phase)||state.clientProjectActive||state.afterWorkOutings?.activeTrip||
    state.contracts?.some(order=>order.status!=='paid')||parkedMarketOrders(state).length||!hasSettledProfit(state))return null;
 const h=propertyHoldings(state);
 if(!h||h.owned.some(own=>own.id!=='home-starter'&&PROPERTY_CATALOG.some(asset=>asset.id===own.id&&asset.kind===kind)))return null;
 const price=PROPERTY_CATALOG.filter(asset=>asset.kind===kind&&Number.isSafeInteger(asset.price)&&asset.price>0).sort((a,b)=>a.price-b.price)[0];
 const reserve=promotionReserve(state);
 if(!price||!Number.isSafeInteger(reserve?.required)||reserve.required<=0)return null;
 const purchase=propertyPreview(state,price.id);
 if(!purchase.valid||purchase.cashAfter<reserve.required+q.cost)return null;
 return {...reminder[kind],kind};
}

const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function afterworkAdviserView(state,adviserId,sleep,options){
 if(!Object.hasOwn(adviserNames,adviserId))return '';
 const note=afterworkAdvice(state,sleep,options);
 if(!note)return '';
 const button=note.kind?'<button class="ws-control ws-control--secondary" type="button" data-property-enter="'+note.kind+'">'+esc(note.label)+'</button>':'';
 return '<aside class="ws-mail-advice" aria-label="'+esc(adviserNames[adviserId]+'的建议')+'"><div><i class="adviser-face adviser-'+adviserId+'" aria-hidden="true"></i><section><p>'+esc(openingDialogueQuote(note.text))+'</p>'+button+'</section></div></aside>';
}
