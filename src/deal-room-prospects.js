import {MARKET_PRODUCTS} from './deal-room-market-data.js';
import {PROSPECT_CONTENT} from './deal-room-prospect-content.js';

const idPattern=/^(?:00[1-9]|0[1-9]\d|100)$/;
export const prospectIdValid=id=>typeof id==='string'&&idPattern.test(id);
export const prospectContentById=id=>prospectIdValid(id)?PROSPECT_CONTENT.find(row=>row.id===id)??null:null;
const draftPhase=s=>['review','complete'].includes(s.phase)||s.phase==='market'&&s.market?.status==='draft';
const pick=(items,n)=>items?.length?items[n%items.length]:'';

export function prospectInbox(s){
 if(!s||!draftPhase(s)||!Number.isSafeInteger(s.day)||s.day<1||!s.contracts?.some(r=>r.status==='paid')||s.contracts.some(r=>r.status!=='paid'))return [];
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
  const options=entry?[{...base,id:'reorder',mode}]:[
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
 return inbox.filter(Boolean);
}

export function prospectPlan(s,customerId,optionId){
 const row=prospectInbox(s).find(r=>r.person.id===customerId), offer=row?.options.find(o=>o.id===optionId);
 if(!offer)return null;
 const {person,product,repeatNumber}=row;
 return {product,offer,buyer:person.displayName+' · '+person.organization,customerId,optionId,
  prospectVoice:{opening:row.opening,bargain:optionId==='concession'?pick(person.lines.bargain,repeatNumber):null,
   delivery:pick(person.lines.delivery,repeatNumber),settlement:pick(person.lines.settlement,repeatNumber)},
  ...(row.previous?{prospectPreviousPaidDay:row.previous.paidDay,prospectRepeat:true}:{})};
}
