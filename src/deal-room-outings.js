import {OUTING_COMPANIONS,FRIEND_EVENTS,outingTrip,friendEvent} from './deal-room-outings-content.js';
// After-work activities grant narrative souvenirs, never cash, fame, buyer trust
// or romantic progression. Browsing and deciding who to invite are UI state only.
// Keep old saves byte-compatible: materialise afterWorkOutings on first confirmed
// visit, and replay normal canonical actions rather than trusting imported totals.
export const OUTING_ACTION_KEYS=Object.freeze(Object.fromEntries(Object.entries({
 CONFIRM_OUTING_TRIP:['type','tripId','companionId','quotedCost','confirmed','revision'],
 INTERACT_OUTING_TRIP:['type','tripId','sceneId','revision'],
 RETURN_OUTING_TRIP:['type','tripId','revision'],
 CONFIRM_FRIEND_OUTING:['type','eventId','choiceId','companionId','quotedCost','confirmed','revision']
}).map(([k,v])=>[k,Object.freeze(v)])));
const uint=n=>Number.isSafeInteger(n)&&n>=0;
const companion=id=>OUTING_COMPANIONS.find(c=>c.id===id);
const tripOf=id=>typeof id==='string'?outingTrip(id):null;
const eventOf=id=>typeof id==='string'?friendEvent(id):null;
const choicesOf=(e,c)=>!!e&&!!companion(c)&&(!e.companionId||e.companionId===c);
const newBook=()=>({revision:0,spent:0,tripVisits:0,friendVisits:0,activeTrip:null,mementos:[],last:null});
const bookOf=s=>s&&!Object.hasOwn(s,'afterWorkOutings')?newBook():s?.afterWorkOutings;
const goodBook=b=>b&&uint(b.revision)&&uint(b.spent)&&uint(b.tripVisits)&&uint(b.friendVisits)&&Array.isArray(b.mementos)&&(!b.activeTrip||Array.isArray(b.activeTrip.seen));
const bad=reason=>({valid:false,reason,action:null});
const outingAfterWorkPhase=(s,phase)=>['review','complete'].includes(phase)||
 (phase==='market'&&(s.market?.status==='draft'&&!s.market.active||
  s.market?.status==='paid'&&s.market.active?.status==='paid'&&[undefined,'prospect','neighborhood'].includes(s.market.active.kind)));
function outingBlock(s){
 if(!s||!Number.isSafeInteger(s.day)||s.day<1||!uint(s.cash))return '当前日期或经营资金无效。';
 const b=bookOf(s);
 if(!goodBook(b)||!uint(b.revision+1))return '出游记录无效或已达上限。';
 if(b.activeTrip)return '旅程还没结束，可以先返回下班。';
 if(!Array.isArray(s.contracts)||!['mira','samir','ines'].every(id=>s.contracts.some(c=>c?.clientId===id&&c.status==='paid'&&!c.businessRound&&!c.projectId)))return '三位开场客户的首单都收齐后，就能下班出门。';
 if(!outingAfterWorkPhase(s,s.phase)){
  if(s.phase==='market'&&s.market?.status==='paid'&&s.market.active?.status==='paid')
   return '这笔订单已经结清。先点「回工作室」，再安排出门。';
  return '先把手上这段工作收好，再安排下班。';
 }
 if(s.contracts.some(c=>!c||c.status!=='paid'))return '先处理尚未结清的合同。';
 return '';
}
export function outingsAvailable(s){return !outingBlock(s);}
// Check the saved decision, not which page the player last had open.
function friendChapterUnlocked(event,companionId,mementos){
 const {requires}=event;
 return !requires||Array.isArray(mementos)&&mementos.some(m=>m.kind==='friend'&&m.placeId===requires.eventId&&m.choiceId===requires.choiceId&&m.companionId===companionId);
}
export function availableFriendEvents(companionId,mementos=[]){
 return FRIEND_EVENTS.filter(e=>choicesOf(e,companionId)&&friendChapterUnlocked(e,companionId,mementos));
}
export function outingSummary(s){
 const b=bookOf(s);
 if(!goodBook(b))return {valid:false,revision:null,activeTrip:null,mementos:[],reason:'出游记录无效。'};
 return {valid:true,...structuredClone(b),available:outingsAvailable(s),reason:outingBlock(s)};
}
export function canonicalOutingAction(a){
 if(!a||typeof a!=='object'||Array.isArray(a)||!Object.hasOwn(a,'type')||!Object.hasOwn(OUTING_ACTION_KEYS,a.type))return null;
 const keys=OUTING_ACTION_KEYS[a.type];
 if(Object.keys(a).length!==keys.length||!keys.every(k=>Object.hasOwn(a,k))||!uint(a.revision))return null;
 if(a.type==='CONFIRM_OUTING_TRIP'){
  const t=tripOf(a.tripId);if(!t||(a.companionId!==null&&!companion(a.companionId))||a.confirmed!==true||!uint(a.quotedCost)||a.quotedCost!==t.fare)return null;
 }else if(a.type==='CONFIRM_FRIEND_OUTING'){
  const e=eventOf(a.eventId),o=e?.choices.find(x=>x.id===a.choiceId);
  if(!choicesOf(e,a.companionId)||!o||a.confirmed!==true||!uint(a.quotedCost)||a.quotedCost!==o.cost)return null;
 }else{
  const t=tripOf(a.tripId);if(!t||a.type==='INTERACT_OUTING_TRIP'&&!t.interactions.some(x=>x.id===a.sceneId))return null;
 }
 return Object.fromEntries(keys.map(k=>[k,a[k]]));
}
function quote(s,draft,cost,type,visits){
 const reason=outingBlock(s),b=bookOf(s),cashAfter=uint(s?.cash)?s.cash-cost:null;
 const why=reason||(!uint(cost)||!uint(b.spent+cost)||!uint(visits+1)?'这笔消费超出可记录范围。':s.cash<cost?'手头的钱还不够，可以改选免费活动。':'');
 const revision=goodBook(b)?b.revision:null;
 return {valid:!why,reason:why,cost,cashAfter,revision,action:why?null:{type,...draft,quotedCost:cost,confirmed:true,revision}};
}
export function previewOutingTrip(s,draft){
 const trip=tripOf(draft?.tripId),id=draft?.companionId===undefined?null:draft.companionId;
 if(!trip||id!==null&&!companion(id))return bad('请选择清单中的行程，独自去或邀请一位朋友。');
 return {...quote(s,{tripId:trip.id,companionId:id},trip.fare,'CONFIRM_OUTING_TRIP',bookOf(s)?.tripVisits),name:trip.name,companionId:id,companionName:companion(id)?.name??'独自出发'};
}
export function previewFriendOuting(s,draft){
 const e=eventOf(draft?.eventId),o=e?.choices.find(x=>x.id===draft.choiceId),id=draft?.companionId;
 if(!choicesOf(e,id)||!o)return bad('请选择一位朋友，再选这场活动的一种走法。');
 if(!friendChapterUnlocked(e,id,bookOf(s)?.mementos))return bad('这段故事还没到。先和这位朋友去看看前一场。');
 return {...quote(s,{eventId:e.id,choiceId:o.id,companionId:id},o.cost,'CONFIRM_FRIEND_OUTING',bookOf(s)?.friendVisits),name:e.name,label:o.label,companionId:id,companionName:companion(id).name};
}
function remember(b,{kind,placeId,choiceId,companionId,day}){
 // Each actual outcome can be revisited. The same combination earns no duplicate
 // memento. The latest result remains readable even on repeat.
 const duplicate=b.mementos.some(m=>m.kind===kind&&m.placeId===placeId&&m.choiceId===choiceId&&m.companionId===companionId);
 const entry={kind,placeId,choiceId,companionId,day};
 if(!duplicate)b.mementos.push(entry);
 b.last=entry;
}
export function outingMoment(m){
 if(!m)return null;
 const p=m.kind==='trip'?tripOf(m.placeId):m.kind==='friend'?eventOf(m.placeId):null;
 const choice=(p?.interactions??p?.choices)?.find(x=>x.id===m.choiceId);
 if(!p||!choice)return null;
 return {name:p.name,label:choice.label,outcome:choice.outcome,companionName:companion(m.companionId)?.name??null,
  companionLine:m.companionId?(choice.companionLines?.[m.companionId]??null):null};
}
export function applyOutingAction(s,action,canStart=true){
 const a=canonicalOutingAction(action),prior=bookOf(s);
 if(!a||!goodBook(prior)||!uint(prior.revision+1)||prior.revision!==a.revision)return s;
 const starting=a.type==='CONFIRM_OUTING_TRIP'||a.type==='CONFIRM_FRIEND_OUTING';
 if(starting){
  if(!canStart)return s;
  const q=a.type==='CONFIRM_OUTING_TRIP'?previewOutingTrip(s,a):previewFriendOuting(s,a);
  if(!q.valid||q.cost!==a.quotedCost)return s;
  const n=structuredClone(s),b=n.afterWorkOutings??=newBook();b.revision++;b.spent+=q.cost;n.cash=q.cashAfter;
  if(a.type==='CONFIRM_OUTING_TRIP'){
   b.tripVisits++;b.activeTrip={tripId:a.tripId,companionId:a.companionId,paid:q.cost,day:s.day,returnPhase:s.phase,seen:[]};n.phase='outing-trip';
   n.feedback={kind:'outing-depart',message:q.name+'，'+(a.companionId?'与'+q.companionName+'同行。':'独自出发。')+(q.cost?'行程已付 ¥'+q.cost+'。':'这趟免费。')};
  }else{
   b.friendVisits++;remember(b,{kind:'friend',placeId:a.eventId,choiceId:a.choiceId,companionId:a.companionId,day:s.day});
   n.feedback={kind:'outing-friend',message:outingMoment(b.last).outcome};
  }
  return n;
 }
 const active=prior.activeTrip;
 if(s.phase!=='outing-trip'||!active||active.tripId!==a.tripId||!outingAfterWorkPhase(s,active.returnPhase))return s;
 if(a.type==='INTERACT_OUTING_TRIP'&&active.seen.includes(a.sceneId))return s;
 const n=structuredClone(s),b=n.afterWorkOutings;b.revision++;
 if(a.type==='INTERACT_OUTING_TRIP'){
  b.activeTrip.seen.push(a.sceneId);remember(b,{kind:'trip',placeId:a.tripId,choiceId:a.sceneId,companionId:active.companionId,day:s.day});
  n.feedback={kind:'outing-scene',message:outingMoment(b.last).outcome};
 }else{
  n.phase=active.returnPhase;b.activeTrip=null;n.feedback={kind:'outing-return',message:'回到下班时间。行程已结束，没有新增支出。'};
 }
 return n;
}
