import test from 'node:test';
import assert from 'node:assert/strict';
import {FRIEND_EVENTS,OUTING_COMPANIONS,OUTING_TRIPS} from '../src/deal-room-outings-content.js';
import {OUTING_ACTION_KEYS,availableFriendEvents,outingSummary,outingMoment,outingsAvailable,previewOutingTrip,previewFriendOuting,canonicalOutingAction,applyOutingAction} from '../src/deal-room-outings.js';
const home=(phase='review')=>({phase,cash:50000,day:38,contracts:['mira','ines','samir'].map(clientId=>({clientId,status:'paid'})),history:[],fame:17,gender:'female',assistant:'someone-else'});
const apply=applyOutingAction;
const scene=(s,t,i=0)=>({type:'INTERACT_OUTING_TRIP',tripId:t.id,sceneId:t.interactions[i].id,revision:outingSummary(s).revision});
const back=(s,t)=>({type:'RETURN_OUTING_TRIP',tripId:t.id,revision:outingSummary(s).revision});
const paid=()=>OUTING_TRIPS.find(t=>t.fare>0);
test('optional visits do not charge or change the date when just browsing, cancelling or selecting a friend',()=>{
 const s=home(),old=structuredClone(s);const t=paid();const q=previewOutingTrip(s,{tripId:t.id});assert.equal(q.valid,true);assert.equal(q.companionId,null);
 for(const c of OUTING_COMPANIONS){const u=previewOutingTrip(s,{tripId:t.id,companionId:c.id});assert.equal(u.cost,q.cost);assert.equal(u.cashAfter,q.cashAfter);const list=availableFriendEvents(c.id);assert(list.length);const e=list[0];assert(previewFriendOuting(s,{eventId:e.id,companionId:c.id,choiceId:e.choices[0].id}).valid);}
 assert.deepEqual(s,old);assert.equal(Object.hasOwn(s,'afterWorkOutings'),false);assert.deepEqual(outingSummary(s).mementos,[]);
});
test('consent must exactly match price, selected trip, companion and current revision; duplicate sends do not charge',()=>{
 const s=home(),t=paid(),q=previewOutingTrip(s,{tripId:t.id,companionId:'liang'});assert(q.action);
 for(const wrong of [{...q.action,confirmed:false},{...q.action,confirmed:'yes'},{...q.action,quotedCost:0},{...q.action,revision:1},{...q.action,extra:'ok'},{...q.action,companionId:'not-a-person'}])assert.equal(apply(s,wrong),s);
 const a={...q.action};delete a.confirmed;assert.equal(canonicalOutingAction(a),null);assert.equal(apply(s,q.action,false),s);
 const n=apply(s,q.action);assert.equal(n.phase,'outing-trip');assert.equal(n.cash,s.cash-t.fare);assert.equal(n.day,s.day);assert.equal(n.afterWorkOutings.activeTrip.companionId,'liang');assert.equal(n.afterWorkOutings.spent,t.fare);
 assert.equal(apply(n,q.action),n);assert.equal(previewOutingTrip(n,{tripId:t.id}).valid,false);assert.deepEqual(n.contracts,s.contracts);assert.equal(n.fame,17);
});
test('money is real and nonnegative; free trips remain playable at zero cash; friend or romantic status is irrelevant',()=>{
 const s={...home(),cash:0};assert.equal(previewOutingTrip(s,{tripId:paid().id}).action,null);
 const t=OUTING_TRIPS.find(t=>t.fare===0);assert(t);
 for(const c of [null,...OUTING_COMPANIONS.map(c=>c.id)])for(const gender of ['female','male']){
  const input={...s,gender},n=apply(input,previewOutingTrip(input,{tripId:t.id,companionId:c}).action);
  assert.equal(n.phase,'outing-trip');assert.equal(n.cash,0);assert.equal(n.day,s.day);assert.equal(n.fame,17);assert.equal(n.afterWorkOutings.activeTrip.companionId,c);
 }
 const exact={...s,cash:paid().fare};assert.equal(apply(exact,previewOutingTrip(exact,{tripId:paid().id}).action).cash,0);
});
test('replay of two scenes, return, repeated trip and an optional early exit never reproduces charges or new same-choice mementos',()=>{
 const s=home('complete'),t=paid(),a=previewOutingTrip(s,{tripId:t.id,companionId:'xu'}).action;let n=apply(s,a);const first=scene(n,t),q1=apply(n,first),second=scene(q1,t,1),q2=apply(q1,second),close=back(q2,t),q3=apply(q2,close);
 assert.notEqual(outingMoment(q1.afterWorkOutings.last).outcome,outingMoment(q2.afterWorkOutings.last).outcome);assert(outingMoment(q1.afterWorkOutings.last).companionLine);
 assert.equal(apply(q1,{...first,revision:q1.afterWorkOutings.revision}),q1);assert.equal(apply(q2,second),q2);assert.equal(q3.phase,'complete');assert.equal(q3.day,s.day);assert.equal(q3.afterWorkOutings.activeTrip,null);assert.equal(q3.cash,s.cash-t.fare);assert.equal(q3.afterWorkOutings.mementos.length,2);assert.equal(apply(q3,close),q3);
 const journal=[a,first,second,close];assert.deepEqual(journal.reduce((p,a)=>apply(p,a),home('complete')),q3);assert.deepEqual(JSON.parse(JSON.stringify(q3)),q3);
 const q4=apply(q3,previewOutingTrip(q3,{tripId:t.id,companionId:'xu'}).action),q5=apply(q4,scene(q4,t)),q6=apply(q5,back(q5,t));assert.equal(q6.afterWorkOutings.mementos.length,2);assert.equal(q6.afterWorkOutings.tripVisits,2);assert.equal(q6.fame,17);assert.equal(q6.cash,s.cash-t.fare*2);
 const early=apply(n,back(n,t));assert.equal(early.cash,n.cash);assert.equal(early.phase,'complete');assert.equal(early.afterWorkOutings.mementos.length,0);
});
test('all 8 travel destinations offer 2 playable distinct outcomes, with optional accompaniment and no extra fee',()=>{
 assert.equal(OUTING_TRIPS.length,8);assert.equal(OUTING_COMPANIONS.length,4);assert.deepEqual(new Set(OUTING_COMPANIONS.map(c=>c.name)),new Set(['方文斌','梁佳音','陶乐','许明珊']));
 for(const t of OUTING_TRIPS){
  assert.equal(t.interactions.length,2);assert.notEqual(t.interactions[0].id,t.interactions[1].id);
  for(const id of [null,...OUTING_COMPANIONS.map(c=>c.id)]){
   let s=home();s=apply(s,previewOutingTrip(s,{tripId:t.id,companionId:id}).action);
   for(const [i,o] of t.interactions.entries()){s=apply(s,scene(s,t,i));const m=outingMoment(s.afterWorkOutings.last);assert.equal(m.outcome,o.outcome);if(id===null){assert.equal(m.companionLine,null);}else{assert(m.companionLine);}}
   s=apply(s,back(s,t));assert.equal(s.cash,50000-t.fare);assert.equal(s.afterWorkOutings.spent,t.fare);assert.equal(s.fame,17);
  }
 }
});
test('38 events and 79 branches are actually confirmable by an eligible friend; each event has a free route; paid choices charge exactly once',()=>{
 assert.equal(FRIEND_EVENTS.length,38);assert.equal(FRIEND_EVENTS.reduce((n,e)=>n+e.choices.length,0),79);let hasPaid=false;
 for(const e of FRIEND_EVENTS){
  assert(e.choices.some(o=>o.cost===0));const id=e.companionId??'tao',s=home(),outcomes=new Set();
  for(const o of e.choices){
   const draft={eventId:e.id,choiceId:o.id,companionId:id},q=previewFriendOuting(s,draft);
   assert(q.valid,e.id+':'+o.id);const n=apply(s,q.action);outcomes.add(outingMoment(n.afterWorkOutings.last).outcome);assert(outingMoment(n.afterWorkOutings.last).companionLine);assert.equal(n.phase,s.phase);assert.equal(n.day,s.day);assert.equal(n.cash,s.cash-o.cost);assert.equal(n.afterWorkOutings.friendVisits,1);assert.equal(n.afterWorkOutings.mementos.length,1);assert.equal(n.fame,17);assert.equal(apply(n,q.action),n);const twice=apply(n,previewFriendOuting(n,draft).action);assert.equal(twice.afterWorkOutings.mementos.length,1);assert.equal(twice.afterWorkOutings.friendVisits,2);
   hasPaid||=o.cost>0;assert.equal(previewFriendOuting({...s,cash:0},draft).valid,o.cost===0);
   if(e.companionId)assert.equal(previewFriendOuting(s,{...draft,companionId:OUTING_COMPANIONS.find(c=>c.id!==id).id}).valid,false);
  }
  assert.equal(outcomes.size,e.choices.length);
 }
 assert(hasPaid);
});
test('no free travel action, partial state mutation, skipping three opening settlements, or edited cost in public journal',()=>{
 const s=home(),t=paid(),a=previewOutingTrip(s,{tripId:t.id,companionId:'fang'}).action;
 for(const st of [{...s,phase:'negotiating'},{...s,contracts:[s.contracts[0],s.contracts[0],s.contracts[0]]},{...s,contracts:s.contracts.map(c=>({...c,projectId:'other'}))},{...s,cash:NaN},{...s,day:-1},{...s,contracts:[...s.contracts,{status:'receivable'}]}]){
  assert.equal(outingsAvailable(st),false);assert.equal(previewOutingTrip(st,{tripId:t.id}).valid,false);assert.equal(apply(st,a),st);
 }
 for(const bad of ['__proto__','constructor','fake']){assert.equal(previewOutingTrip(s,{tripId:bad}).action,null);assert.equal(canonicalOutingAction({...a,companionId:bad}),null);}
 assert.equal(canonicalOutingAction(Object.create(a)),null);assert.equal(canonicalOutingAction({...a,quotedCost:t.fare-1}),null);assert.equal(canonicalOutingAction({...a,revision:1.5}),null);
 assert.equal(apply(s,scene(s,t)),s);assert.equal(apply(s,back(s,t)),s);assert.equal(outingMoment(null),null);assert.equal(outingMoment({kind:'hacked'}),null);
 assert(!Object.keys(OUTING_ACTION_KEYS).some(x=>/FAME|REWARD|EARN/.test(x)));
});
