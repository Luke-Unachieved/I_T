import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,reduce,workScene,parseSave} from '../src/engine.js';
import {careerEpilogue} from '../src/epilogue.js';
import {LATE_WORK_STORIES} from '../src/work-branches.js';
const founder=gender=>Object.assign(createGame('各自有路',gender),{stage:'founder',completed:13,startupOrders:10,cash:30000});
const act=(s,id,response)=>{const r=reduce(s,{type:'work-story',id,response});assert.ok(r.changed,r.message);return r.state;};
const added=['xu_limits_written','gu_revision_story','cheng_clear_return'];
test('new collaborators have late choices that require their own earlier encounter',()=>{
 for(const id of added){
  const e=LATE_WORK_STORIES.find(e=>e.id===id),s=founder('female');assert.ok(e);
  assert.equal(reduce(s,{type:'work-story',id,response:0}).changed,false);
  const texts=[];
  for(const previous of [0,1]){
   let r=act(s,e.requiresWork,previous),next=workScene(r,id);texts.push(next.scene);
   assert.equal(next.branch,'work:'+e.requiresWork+':'+previous);
   for(const response of [0,1]){
    const after=act(r,id,response),record=after.workStories[id];
    assert.equal(record.line,next.choices[response].line);assert.equal(record.reply,next.choices[response].reply);
    assert.equal(record.setting,'remote');assert.deepEqual(after.staff,[]);
    for(const key of ['cash','rep','ap','relations','day','startupOrders'])assert.deepEqual(after[key],r[key]);
    assert.deepEqual(parseSave(JSON.stringify(after)),after);
   }
  }
  assert.notEqual(texts[0],texts[1]);
 }
});
test('late work reflections require saved lines and never fill missing old history',()=>{
 const s=founder('male');assert.deepEqual(careerEpilogue(s).workReflections,[]);
 for(const e of LATE_WORK_STORIES){s.workStories[e.id]={response:0,setting:'remote'};}
 assert.deepEqual(careerEpilogue(s).workReflections,[]);
 s.workStories.not_a_scene={response:0,setting:'remote',day:1,line:'unknown',reply:'unknown'};
 assert.deepEqual(careerEpilogue(s).workReflections,[]);
});
test('all eight late work choices retain their exact actual answers in the ending recap',()=>{
 assert.equal(LATE_WORK_STORIES.length,8);
 for(const gender of ['female','male'])for(const e of LATE_WORK_STORIES)for(const response of [0,1]){
  let s=founder(gender);s=act(s,e.requiresWork,0);s=act(s,e.id,response);
  const original=JSON.stringify(s),r=s.workStories[e.id],echo=careerEpilogue(s).workReflections;
  assert.equal(echo.length,1);assert.equal(echo[0].id,e.id);assert.equal(echo[0].line,r.line);assert.equal(echo[0].text,r.reply);assert.equal(echo[0].day,r.day);
  assert.equal(JSON.stringify(s),original);s.workStories[e.requiresWork].response=1;
  assert.deepEqual(careerEpilogue(s).workReflections,echo);
 }
});
test('a future record or employee state cannot invent an achieved collaborator recap',()=>{
 let s=founder('female');s=act(s,'xu_repeatable',0);s=act(s,'xu_limits_written',1);
 const before=careerEpilogue(s).workReflections;assert.equal(before.length,1);
 s.workStories.xu_limits_written.day=s.day+1;assert.deepEqual(careerEpilogue(s).workReflections,[]);
 s.workStories.xu_limits_written.day=s.day;s.stage='employee';assert.deepEqual(careerEpilogue(s).workReflections,[]);
});
