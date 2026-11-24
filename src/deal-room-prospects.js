import {promotionLeads} from './deal-room-promotion.js';
import {MARKET_PRODUCTS} from './deal-room-market-data.js';
import {PROSPECT_CONTENT} from './deal-room-prospect-content.js';

const idPattern=/^(?:00[1-9]|0[1-9]\d|100)$/;
export const prospectIdValid=id=>typeof id==='string'&&idPattern.test(id);
export const prospectContentById=id=>prospectIdValid(id)?PROSPECT_CONTENT.find(row=>row.id===id)??null:null;
const draftPhase=s=>['review','complete'].includes(s.phase)||s.phase==='market'&&s.market?.status==='draft';
const pick=(items,n)=>items?.length?items[n%items.length]:'';

const declineKey=(row,day)=>row.promotion?'campaign:'+row.promotion.campaignId:
 (row.isRepeat?'repeat:'+row.previous.paidDay+':':'week:')+Math.floor((day-1)/7)+':'+row.person.id;
export function prospectRelationship(row){return (row?.repeatNumber??0)>=3?'VIP客户':row?.isRepeat?'稳定客户':'新客户';}
export function prospectInbox(s,{whileActive=false}={}){
 if(!s||!draftPhase(s)&&!whileActive||!Number.isSafeInteger(s.day)||s.day<1)return [];
 const duringOpening=s.market?.returnPhase==='opening';
 if(duringOpening){
  const busy=new Set([...(s.marketParked??[]),...(whileActive&&['transit','receivable'].includes(s.market?.status)?[s.market.active]:[])].map(a=>a?.customerId));
  const ignored=new Set(s.dismissedProspectLetters??[]);
  return promotionLeads(s).filter(row=>!busy.has(row.person.id)&&!ignored.has(declineKey(row,s.day)));
 }
 if(!s.contracts?.some(r=>r.status==='paid')||s.market?.returnPhase!=='familiar'&&s.contracts.some(r=>r.status!=='paid'))return [];
 const week=Math.floor((s.day-1)/7), closingDay=(week+1)*7, offset=week*5%PROSPECT_CONTENT.length;
 const paid=(s.marketHistory??[]).filter(r=>prospectIdValid(r.customerId)&&r.status==='paid'&&Number.isSafeInteger(r.paidDay)&&r.paidDay<=s.day&&r.delivered===r.quantity&&r.received===r.revenue);
 const previous=new Map();
 for(const receipt of paid){
  const entry=previous.get(receipt.customerId)??{count:0,last:receipt};
  if(receipt.paidDay>=entry.last.paidDay)entry.last=receipt;
  entry.count++;
  previous.set(receipt.customerId,entry);
 }
 function invite(person,entry){
  const k=Number(person.id)-1, matching=MARKET_PRODUCTS.filter(p=>p.category===person.category);
  const productId=entry?.last.productId??person.productId;
  const product=productId?MARKET_PRODUCTS.find(p=>p.id===productId):matching[k%matching.length];
  if(!product)return null;
  const mode=entry?'bulk':'trial', base=product.offers[mode];
  const discounted=Math.max(1,base.maxUnitPrice-Math.max(1,Math.floor(base.maxUnitPrice/16)));
  const options=entry?[{...base,id:'reorder',mode},...(entry.count>=3?[{...base,id:'vip-volume',mode,quantity:base.quantity+Math.ceil(base.quantity/4)}]:[])]:[
   {...base,id:'quote',mode,followupDays:7},
   {...base,id:'concession',mode,maxUnitPrice:discounted,followupDays:3},
  ];
  return {person,product,options,isRepeat:!!entry,previous:entry?.last??null,
   opening:entry?pick(person.lines.reorder,entry.count-1):pick(person.lines.inquiry,week),
   replyBy:entry?null:closingDay,repeatNumber:entry?.count??0};
 }
 const inbox=PROSPECT_CONTENT.slice(offset,offset+5).filter(p=>!previous.has(p.id)).map(p=>invite(p,null));
 for(const [id,entry] of previous){
  if(s.day<entry.last.paidDay+(entry.last.optionId==='concession'?3:7))continue;
  const person=prospectContentById(id);
  if(person)inbox.push(invite(person,entry));
 }
 const rows=inbox.filter(Boolean),ids=new Set(rows.map(r=>r.person.id));
 for(const lead of promotionLeads(s))if(!ids.has(lead.person.id)){ids.add(lead.person.id);rows.push(lead);}
 const ignored=new Set(s.dismissedProspectLetters??[]);
 const active=new Set([...(s.marketParked??[]),...(whileActive&&['transit','receivable'].includes(s.market?.status)?[s.market.active]:[])].map(a=>a?.customerId));
 return rows.filter(row=>!active.has(row.person.id)&&!ignored.has(declineKey(row,s.day)));
}

export function dismissProspect(s,customerId,checkedDay){
 if(s?.phase!=='market'||s.market?.status!=='draft'||s.day!==checkedDay)return s;
 const row=prospectInbox(s).find(r=>r.person.id===customerId);if(!row)return s;
 const n=structuredClone(s);
 n.dismissedProspectLetters=[...(n.dismissedProspectLetters??[]),declineKey(row,s.day)];
 n.feedback={kind:'prospect-dismissed',message:'已放弃这封询盘。没有签约或扣款。'};
 return n;
}
export function prospectPlan(s,customerId,optionId,previousPaidDay){
 const row=prospectInbox(s).find(r=>r.person.id===customerId), offer=row?.options.find(o=>o.id===optionId);
 if(!offer||optionId==='vip-volume'&&(!row.isRepeat||row.repeatNumber<3||row.previous?.paidDay!==previousPaidDay))return null;
 const {person,product,repeatNumber}=row;
 return {product,offer,buyer:person.displayName+' · '+person.organization,customerId,optionId,
  prospectVoice:{opening:row.opening,bargain:optionId==='concession'?pick(person.lines.bargain,repeatNumber):null,
   delivery:pick(person.lines.delivery,repeatNumber),settlement:pick(person.lines.settlement,repeatNumber)},
  ...(row.previous?{prospectPreviousPaidDay:row.previous.paidDay,prospectRepeat:true}:{})};
}
