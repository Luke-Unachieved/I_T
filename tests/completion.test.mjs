import {isWeekend} from '../src/calendar.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,reduce,offers,offerPreview,parseSave,workScene,nextWorkStory,nextStory,canStart,canFinish} from '../src/engine.js';
import {TACTICS,FACTORIES,SHIPMENTS,PEOPLE} from '../src/content.js';
import {WORK_STORIES} from '../src/relationships.js';
const action=(s,a)=>{const r=reduce(s,a);assert.ok(r.changed,r.message);return r.state;};
const later=WORK_STORIES.filter(e=>e.stage==='founder');

test('inquiry income range matches actual employee settlement, including expensive plans',()=>{
 const s=createGame(),offer=offers(s)[0],range=offerPreview(s,offer.id),gains=[];
 for(const t of TACTICS)for(const f of FACTORIES)for(const sh of SHIPMENTS){
  let a=action(s,{type:'accept',id:offer.id});a=action(a,{type:'tactic',id:t.id});a=action(a,{type:'factory',id:f.id});a=action(a,{type:'ship',id:sh.id});
  gains.push(a.lastDelivery.gain);
 }
 assert.deepEqual(range,{min:Math.min(...gains),max:Math.max(...gains)});
 assert.equal(range.min,480);assert.equal(range.max,795);
});

test('founder income ranges include company effects across all current offers and plans',()=>{
 for(const focus of ['brand','boutique'])for(const operations of ['team','network'])for(const distribution of ['regional','independent'])for(const day of [1,2,3]){
  const s=createGame();Object.assign(s,{stage:'founder',cash:100000,day,warehouse:2,logistics:1,staff:['xia','zhou','tang']});Object.assign(s.story,{focus,operations,distribution});
  for(const offer of offers(s)){
   const range=offerPreview(s,offer.id),gains=[];
   for(const t of TACTICS)for(const f of FACTORIES)for(const sh of SHIPMENTS){
    let a=action(s,{type:'accept',id:offer.id});a=action(a,{type:'tactic',id:t.id});a=action(a,{type:'factory',id:f.id});a=action(a,{type:'ship',id:sh.id});gains.push(a.lastDelivery.gain);
   }
   assert.deepEqual(range,{min:Math.min(...gains),max:Math.max(...gains)});
  }
 }
});

test('inquiry preview does not mutate state or substitute a stale offer',()=>{
 const s=createGame(),before=JSON.stringify(s);Object.freeze(s);
 assert.equal(offerPreview(s,'2-hinge'),null);assert.equal(offerPreview(s,'forged'),null);
 assert.deepEqual(offerPreview(s,'1-hinge'),offerPreview({...s,gender:'male'},'1-hinge'));
 assert.equal(JSON.stringify(s),before);
});

test('all seventeen founder moments have complete dual responses and require their milestone',()=>{
 assert.equal(later.length,17);assert.equal(WORK_STORIES.length,24);
 for(const e of later){
  assert.equal(e.choices.length,2);assert.notEqual(e.choices[0].reply,e.choices[1].reply);
  for(const text of [e.office,e.remote,...e.choices.flatMap(c=>[c.line,c.reply])])assert.ok(typeof text==='string'&&text.length>8&&text.length<260);
  let s=createGame();s.completed=100;s.startupOrders=e.minStartup;if(e.requiresWork)s.workStories[e.requiresWork]={response:0,setting:'remote'};
  assert.equal(reduce(s,{type:'work-story',id:e.id,response:0}).changed,false);
  s.stage='founder';s.startupOrders=e.minStartup-1;
  assert.equal(reduce(s,{type:'work-story',id:e.id,response:0}).changed,false);
  s.startupOrders=e.minStartup;if(e.requiresWork)s.workStories[e.requiresWork]={response:0,setting:'remote'};
  assert.equal(reduce(s,{type:'work-story',id:e.id,response:0}).changed,true);
 }
});

test('founder moments preserve all economic and relationship values, and replay safely',()=>{
 for(const gender of ['female','male'])for(const e of later)for(const response of [0,1]){
  const s=createGame('测试',gender);Object.assign(s,{stage:'founder',completed:13,startupOrders:10});if(e.requiresWork)s.workStories[e.requiresWork]={response:0,setting:'remote'};
  const r=reduce(s,{type:'work-story',id:e.id,response});assert.ok(r.changed);
  for(const key of ['cash','rep','ap','day','phase','completed','startupOrders','staff','relations','story','lastDelivery'])assert.deepEqual(r.state[key],s[key]);
  assert.equal(reduce(r.state,{type:'work-story',id:e.id,response}).changed,false);
  assert.deepEqual(parseSave(JSON.stringify(r.state)),r.state);
 }
});

test('founder memories preserve office versus remote setting after later recruitment',()=>{
 for(const e of later){
  const s=createGame();Object.assign(s,{stage:'founder',completed:13,startupOrders:10});if(e.requiresWork)s.workStories[e.requiresWork]={response:0,setting:'remote'};
  assert.equal(workScene(s,e.id).setting,'remote');
  const after=action(s,{type:'work-story',id:e.id,response:0});
  if(PEOPLE.find(p=>p.id===e.person).recruit){
   after.staff=[e.person];assert.equal(workScene(after,e.id).setting,'remote');
   assert.equal(workScene(after,e.id,after.workStories[e.id].setting).setting,'remote');
  }
 }
});

test('both complete business routes can include all twenty-four moments without any romance',()=>{
 for(const focus of ['boutique','brand']){
  let s=createGame('无恋爱完整路线');
  for(let day=0;day<35&&(!s.story.finale||Object.keys(s.workStories).length<24);day++){
   let e;while((e=nextStory(s))){const choice=e.id==='direction'?focus:e.choices.find(c=>s.cash+(c.effects.cash||0)>=0).id;s=action(s,{type:'story',id:e.id,choice});}
   if(canStart(s))s=action(s,{type:'startup'});
   while((e=nextStory(s))){const choice=e.id==='direction'?focus:e.choices.find(c=>s.cash+(c.effects.cash||0)>=0).id;s=action(s,{type:'story',id:e.id,choice});}
   while((e=nextWorkStory(s)))s=action(s,{type:'work-story',id:e.id,response:0});
   if(s.stage==='founder'&&s.warehouse===1&&s.cash>=1400)s=action(s,{type:'warehouse'});
   if(canFinish(s))s=action(s,{type:'finale'});
   if(s.story.finale&&Object.keys(s.workStories).length===24)break;
   if(isWeekend(s)&&!s.weekendWork)s=action(s,{type:'weekend-work'});const offer=offers(s)[0];s=action(s,{type:'accept',id:offer.id});s=action(s,{type:'tactic',id:offer.need});s=action(s,{type:'factory',id:'steady'});s=action(s,{type:'ship',id:'normal'});s=action(action(s,{type:'evening'}),{type:'rest'});
  }
  assert.equal(s.story.finale,focus);assert.equal(Object.keys(s.workStories).length,24);
  for(const r of Object.values(s.relations))assert.deepEqual([r.chats,r.dates,r.status],[0,0,'friend']);
  assert.deepEqual(parseSave(JSON.stringify(s)),s);
 }
});
