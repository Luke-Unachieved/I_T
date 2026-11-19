// Two recorded placement fees. Reply delays, deterministic distribution and
// the exact no-stranding reserve are reconstruction rules, not recovered odds.
import {PROSPECT_CONTENT} from './deal-room-prospect-content.js';
import {MARKET_PRODUCTS} from './deal-room-market-data.js';
import {businessOpportunities} from './deal-room-engine.js';

export const PROMOTION_CHANNELS=Object.freeze([
  Object.freeze({id:'district',name:'街区商报',fee:380,replyDays:2,possible:'以小批试货为主，也可能收到铺货询价。'}),
  Object.freeze({id:'cross-city',name:'跨城买手通讯',fee:1580,replyDays:4,possible:'更可能有铺货询价，也可能只问一笔小单。'})
]);
export const PROMOTION_ACTION_KEYS=Object.freeze({
  BOOK_PROMOTION_V1:Object.freeze(['type','channelId','quotedFee','revision','confirmed']),
  WAIT_PROMOTION_V1:Object.freeze(['type','campaignId'])
});
const promoChannel=id=>PROMOTION_CHANNELS.find(c=>c.id===id);
const promoUint=n=>Number.isSafeInteger(n)&&n>=0;
const promoDay=n=>promoUint(n)&&n>0;
const promoObj=a=>!!a&&typeof a==='object'&&!Array.isArray(a);
const promoPlainKeys=(o,keys)=>promoObj(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
const promoFind=id=>PROSPECT_CONTENT.find(p=>p.id===id);
const promoProduct=p=>{if(!p)return null;const group=MARKET_PRODUCTS.filter(x=>x.category===p.category);
  return (p.productId?MARKET_PRODUCTS.find(x=>x.id===p.productId):group[(Number(p.id)-1)%group.length])??null;};
const promoEmpty=()=>({campaigns:[],feesPaid:0,waitCost:0});
const promoBook=s=>s&&Object.hasOwn(s,'promotionBook')?s.promotionBook:promoEmpty();
const promoValidBook=b=>promoObj(b)&&Array.isArray(b.campaigns)&&b.campaigns.length<=PROSPECT_CONTENT.length&&promoUint(b.feesPaid)&&promoUint(b.waitCost)
  && b.campaigns.every((c,i)=>{const channel=promoChannel(c?.channelId);return !!channel&&c.id===i+1&&promoDay(c.bookedDay)&&c.fee===channel.fee&&
    c.replyDay===c.bookedDay+channel.replyDays&&promoDay(c.replyDay)&&!!promoFind(c.customerId)&&['trial','bulk'].includes(c.mode)&&
    (i===0||b.campaigns[i-1].replyDay<=c.bookedDay);})
  && new Set(b.campaigns.map(c=>c.customerId)).size===b.campaigns.length&&b.feesPaid===b.campaigns.reduce((a,c)=>a+c.fee,0);
const promoReady=s=>s&&promoDay(s.day)&&promoUint(s.cash)&&promoUint(s.fame??0)&&(s.fame??0)<=100&&Array.isArray(s.contracts)&&Array.isArray(s.history)
  && (s.marketHistory===undefined||Array.isArray(s.marketHistory)) && s.contracts.length>0&&s.contracts.every(c=>c?.status==='paid')&&!s.clientProjectActive&&!s.afterWorkOutings?.activeTrip&&
  (['review','complete'].includes(s.phase)||s.phase==='market'&&s.market?.status==='draft');
const promoInvalid=reason=>({valid:false,reason,action:null});
const promoSettled=c=>c?.status==='paid'&&c.delivered===c.quantity&&c.received===c.revenue&&promoUint(c.paidDay);
const promoMix=str=>{let n=2166136261;for(const c of str)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;};
const promoNaturalIds=day=>{const i=Math.floor((day-1)/7)*5%PROSPECT_CONTENT.length;return PROSPECT_CONTENT.slice(i,i+5).map(p=>p.id);};
function promoTarget(s,b,channel){
  const reply=s.day+channel.replyDays;
  const exclude=new Set([...b.campaigns.map(c=>c.customerId),...(s.marketHistory||[]).filter(promoSettled).map(c=>c.customerId),
    ...promoNaturalIds(s.day),...promoNaturalIds(reply)]);
  const choices=PROSPECT_CONTENT.filter(p=>!exclude.has(p.id)&&promoProduct(p));
  if(!choices.length)return null;
  const key=channel.id+':'+s.day+':'+b.campaigns.length,person=choices[promoMix('who:'+key)%choices.length];
  // Fame shifts the distribution but never promises a bulk inquiry or a sale.
  // Neither customer status nor concessions enter this roll. The chosen person's
  // own product's existing trial/bulk quantities and valuation are used unchanged.
  const chance=(channel.id==='district'?8:23)+Math.floor((s.fame??0)*.5);
  return {customerId:person.id,mode:promoMix('lot:'+key)%100<chance?'bulk':'trial'};
}

export function promotionStatus(state){
  const b=promoBook(state);if(!promoValidBook(b)||!promoDay(state?.day))return null;
  const last=b.campaigns.at(-1);
  return {booked:b.campaigns.length,feesPaid:b.feesPaid,waitCost:b.waitCost,
    pending:last&&last.replyDay>state.day?{id:last.id,channelId:last.channelId,bookedDay:last.bookedDay,replyDay:last.replyDay,fee:last.fee}:null,
    arrived:b.campaigns.filter(c=>c.replyDay<=state.day).length};
}
/** Ready ordinary repeats take priority. When all familiar buyers are between
 * restocks, keep enough for the least costly *actual settled order's* working gap. */
export function promotionReserve(state){
  if(!promoReady(state))return null;
  const projected={...state,phase:'portfolio',businessRound:(state.businessRound||0)+1,...(state.supplyPlanHistory?.length?{retailPlanning:true}:{})};
  const available=businessOpportunities(projected).flatMap(c=>c.options.filter(q=>q.id!=='repeat-prepaid'&&q.valid&&q.accepted!==false&&promoUint(q.cashRequired))
    .map(o=>({required:o.cashRequired,clientId:c.id,optionId:o.id,basis:'ready-repeat'})));
  if(available.length)return available.reduce((a,b)=>a.required<=b.required?a:b);
  const prior=state.contracts.flatMap(c=>{if(!promoUint(c.cost)||!promoUint(c.deposit??0)||!promoUint(c.operatingCost)||!c.clientId)return [];
    const required=Math.max(0,c.cost-(c.deposit??0)+c.operatingCost);
    return promoUint(required)?[{required,clientId:c.clientId,optionId:c.optionId??null,basis:'previous-contract'}]:[];});
  return prior.length?prior.reduce((a,b)=>a.required<=b.required?a:b):null;
}
export function previewPromotion(s,channelId){
  const ch=promoChannel(channelId);if(!ch)return promoInvalid('没有这个推广渠道。');
  if(!promoReady(s))return promoInvalid('先收好手上这笔生意，再刊登找客广告。');
  const b=promoBook(s),st=promotionStatus(s);if(!st)return promoInvalid('推广记录暂时无法核对。');
  if(st.pending)return promoInvalid('已经刊登过一份广告，先等这次回信。');
  const replyDay=s.day+ch.replyDays;if(!promoDay(replyDay))return promoInvalid('回信日期无法核对。');
  const reserve=promotionReserve(s);
  if(!reserve)return promoInvalid('还没有可核对的生意周转金额。');
  const waitBudget=ch.replyDays*30,minimum=reserve.required+ch.fee+waitBudget;
  if(!promoUint(minimum))return promoInvalid('推广所需周转金额无法核对。');
  const target=promoTarget(s,b,ch);if(!target)return promoInvalid('这期暂无未接洽的新买家，免费询盘照常。');
  const revision='ad1-'+promoMix([ch.id,s.day,s.cash,s.fame??0,b.campaigns.length,reserve.required].join(':')).toString(36)+'-'+b.campaigns.length;
  const shortfall=Math.max(0,minimum-s.cash),valid=shortfall===0;
  return {valid,reason:valid?'':'先留出下一单周转和等回信期间的日常开支。',channelId:ch.id,name:ch.name,quotedFee:ch.fee,
    day:s.day,replyDay,replyDays:ch.replyDays,possible:ch.possible,reserve,waitBudget,minimum,shortfall,cashAfterBooking:s.cash>=ch.fee?s.cash-ch.fee:null,revision,
    action:valid?{type:'BOOK_PROMOTION_V1',channelId:ch.id,quotedFee:ch.fee,revision,confirmed:true}:null};
}
export function promotionWaitPreview(s){
  const st=promotionStatus(s),wait=st?.pending;if(!promoReady(s)||!wait)return promoInvalid('没有可以等候的推广回信。');
  const days=wait.replyDay-s.day,cost=days*30,reserve=promotionReserve(s);
  if(!reserve||!promoUint(promoBook(s).waitCost+cost)||!promoUint(cost+reserve.required)||s.cash<cost+reserve.required)return promoInvalid('留足下一单周转后，手头不够付这段日常开支。');
  return {valid:true,reason:'',days,cost,cashAfter:s.cash-cost,replyDay:wait.replyDay,action:{type:'WAIT_PROMOTION_V1',campaignId:wait.id}};
}
/** Merge into the ordinary prospect inbox by person.id; never replace weekly
 * letters or paid repeaters. Merely reading a due letter does not mutate state. */
export function promotionLeads(s){
  if(!promoReady(s))return [];
  const b=promoBook(s);if(!promoValidBook(b))return [];
  const settled=new Set((s.marketHistory||[]).filter(c=>promoSettled(c)&&c.paidDay<=s.day).map(c=>c.customerId));
  return b.campaigns.filter(c=>c.replyDay<=s.day&&!settled.has(c.customerId)).map(c=>{
    const person=promoFind(c.customerId),product=promoProduct(person),base=product.offers[c.mode];
    const options=[{...base,id:'quote',mode:c.mode,followupDays:7},{...base,id:'concession',mode:c.mode,
      maxUnitPrice:Math.max(1,base.maxUnitPrice-Math.max(1,Math.floor(base.maxUnitPrice/16))),followupDays:3}];
    return {person,product,options,isRepeat:false,previous:null,opening:person.lines.inquiry[(c.id-1)%person.lines.inquiry.length],
      replyBy:null,repeatNumber:0,promotion:{campaignId:c.id,channelId:c.channelId,channelName:promoChannel(c.channelId).name,replyDay:c.replyDay,fee:c.fee}};
  });
}
export function canonicalPromotionAction(a){
  if(!promoObj(a)||typeof a.type!=='string'||!Object.hasOwn(PROMOTION_ACTION_KEYS,a.type)||!promoPlainKeys(a,PROMOTION_ACTION_KEYS[a.type]))return null;
  if(a.type==='BOOK_PROMOTION_V1'){
    if(a.confirmed!==true||!promoChannel(a.channelId)||!promoUint(a.quotedFee)||typeof a.revision!=='string'||a.revision.length>128)return null;
  }else if(!promoDay(a.campaignId))return null;
  return Object.fromEntries(PROMOTION_ACTION_KEYS[a.type].map(k=>[k,a[k]]));
}
export function applyPromotionAction(s,action){
  const a=canonicalPromotionAction(action);if(!a)return s;
  if(a.type==='BOOK_PROMOTION_V1'){
    const q=previewPromotion(s,a.channelId);
    if(!q.valid||a.revision!==q.revision||a.quotedFee!==q.quotedFee)return s;
    const b=promoBook(s),c=promoChannel(a.channelId),target=promoTarget(s,b,c);
    const receipt={id:b.campaigns.length+1,channelId:c.id,bookedDay:s.day,replyDay:q.replyDay,fee:c.fee,...target};
    return {...s,cash:s.cash-c.fee,promotionBook:{...b,campaigns:[...b.campaigns,receipt],feesPaid:b.feesPaid+c.fee}};
  }
  const q=promotionWaitPreview(s);
  if(!q.valid||q.action.campaignId!==a.campaignId)return s;
  const b=promoBook(s);
  return {...s,day:q.replyDay,cash:q.cashAfter,promotionBook:{...b,waitCost:b.waitCost+q.cost}};
}
