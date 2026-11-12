// Offline reducer campaigns, not browser input or imported player progress.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createGame,reduce,offers,quote,nextStory,nextWorkStory,canStart,canFinish,canDate,canCommit,personUnlocked,parseSave} from '../src/engine.js';
import {PEOPLE} from '../src/content.js';
import {WORK_STORIES} from '../src/relationships.js';
import {isWeekend} from '../src/calendar.js';
import {relationshipArtwork} from '../src/album.js';

function completeCampaign(gender,focus,response){
 let s=createGame('完整游玩存档',gender),steps=0;
 const act=action=>{
  const before=JSON.stringify(s),result=reduce(s,action);
  assert.ok(result.changed,`${action.type}: ${result.message}`);
  assert.equal(JSON.stringify(s),before,'the reducer does not mutate its input');
  s=result.state;steps++;
  assert.deepEqual(parseSave(JSON.stringify(s)),s,`save after ${action.type}`);
 };
 const advanceStories=()=>{
  let e;
  while((e=nextStory(s))){
   const preferred=e.id==='direction'?focus:e.choices[response].id;
   const choice=e.choices.find(c=>c.id===preferred&&s.cash+(c.effects.cash||0)>=0)
    ||e.choices.find(c=>s.cash+(c.effects.cash||0)>=0);
   assert.ok(choice,'a reachable chapter always retains an affordable choice');
   act({type:'story',id:e.id,choice:choice.id});
  }
 };
 for(let i=0;i<90;i++){
  advanceStories();if(canStart(s))act({type:'startup'});advanceStories();
  if(!isWeekend(s)){let e;while((e=nextWorkStory(s)))act({type:'work-story',id:e.id,response});}
  if(s.stage==='founder'&&s.warehouse===1&&s.cash>=1400)act({type:'warehouse'});
  if(canFinish(s))act({type:'finale'});
  const chat=PEOPLE.find(p=>personUnlocked(s,p.id)&&s.relations[p.id].chats<3);
  const date=PEOPLE.find(p=>canDate(s,p.id)&&s.relations[p.id].dates<3);
  const commitment=PEOPLE.find(p=>canCommit(s,p.id)&&!s.dialogueMemories[p.id].commitmentRecord);
  if(s.story.finale&&Object.keys(s.workStories).length===WORK_STORIES.length&&!chat&&!date&&!commitment)break;
  if(!s.story.finale||Object.keys(s.workStories).length<WORK_STORIES.length){
   if(isWeekend(s)&&!s.weekendWork)act({type:'weekend-work'});
   const offer=offers(s)[0];act({type:'accept',id:offer.id});act({type:'tactic',id:offer.need});
   const factory=['steady','credit','value'].find(id=>s.stage==='employee'||quote(s,id).reserve<=s.cash);
   if(factory){act({type:'factory',id:factory});act({type:'ship',id:'normal'});}
   else{act({type:'cancel'});while(s.ap>0)act({type:'bridge'});}
  }
  act({type:'evening'});
  if(chat)act({type:'chat',id:chat.id,response});
  else if(commitment){
   act({type:'commit',id:commitment.id});
   const cash=s.cash,rep=s.rep,records=structuredClone(s.dialogueMemories[commitment.id]);
   act({type:'boundary',id:commitment.id});
   assert.equal(s.cash,cash);assert.equal(s.rep,rep);
   assert.deepEqual(s.dialogueMemories[commitment.id],records);
  }
  else if(date)act({type:'date',id:date.id,response});
  act({type:'rest'});
 }
 assert.equal(s.story.finale,focus);assert.equal(Object.keys(s.story.decisions).length,8);
 assert.equal(Object.keys(s.workStories).length,WORK_STORIES.length);
 for(const p of PEOPLE){
  assert.equal(s.relations[p.id].chats,3);
  if(p.gender===gender){assert.equal(s.relations[p.id].dates,0);assert.equal(relationshipArtwork(s,p.id),null);}
  else{
   assert.equal(s.relations[p.id].dates,3);assert.equal(s.relations[p.id].status,'closed');
   assert.ok(s.dialogueMemories[p.id].commitmentRecord);
   assert.equal(s.dialogueMemories[p.id].date[2].branch,`date:${p.id}:${response}`);
   assert.ok(relationshipArtwork(s,p.id),'earned historical artwork remains available');
  }
 }
 return {state:s,steps};
}

test('fully authored campaigns and relationship histories still fit their own import boundary',async t=>{
 const app=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
 const match=app.match(/if\(f\.size>(\d+)\)/);assert.ok(match,'review this test if the import size guard changes');
 const byteLimit=Number(match[1]);
 for(const gender of ['female','male'])for(const focus of ['boutique','brand'])for(const response of [0,1]){
  const {state,steps}=completeCampaign(gender,focus,response),exported=JSON.stringify(state,null,2);
  assert.ok(steps>200,'exercise a complete campaign, not a patched ending fixture');
  assert.ok(Buffer.byteLength(exported,'utf8')<=byteLimit,`${gender}/${focus}/${response}: own export exceeds the UI byte limit`);
  assert.deepEqual(parseSave(exported),state);
  assert.deepEqual(parseSave(JSON.stringify(parseSave(exported))),state);
  t.diagnostic(`${gender}/${focus}/choice-${response}: ${steps} actions, day ${state.day}, ${Buffer.byteLength(exported,'utf8')} export bytes`);
 }
});
