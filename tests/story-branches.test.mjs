import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,reduce,parseSave,chatScene,dateScene,nextStory,canFinish,offers} from '../src/engine.js';
import {PEOPLE} from '../src/content.js';
import {STORY_EVENTS,storyEvent} from '../src/story.js';
import {DIALOGUE_BRANCHES,emptyDialogueMemories} from '../src/dialogue.js';
const act=(s,a)=>{const r=reduce(s,a);assert.ok(r.changed,r.message);return r.state;};
const night=(s,kind,id,response)=>{s=act(s,{type:'evening'});s=act(s,{type:kind,id,response});return act(s,{type:'rest'});};
function late(focus='boutique',operations='team',distribution='independent'){
 const s=createGame('分支测试');Object.assign(s,{stage:'founder',day:18,completed:10,startupOrders:7,cash:22000,rep:40,warehouse:2});
 Object.assign(s.story,{focus,operations,distribution,decisions:{first_credit:'lead',first_contract:'pilot',direction:focus,deadline:'explain',team:operations,partnership:distribution}});return s;
}

test('thirty-two authored callbacks differ by the actual first response for every character',()=>{
 let count=0;
 for(const kind of ['chat','date'])for(const p of PEOPLE){
  const results=[];
  for(const response of [0,1]){
   let s=createGame('回应',p.gender==='male'?'female':'male');s.stage='founder';s.completed=5;s.startupOrders=2;s.relations[p.id].trust=3;
   s=night(s,kind,p.id,response);s=night(s,kind,p.id,1-response);
   const scene=(kind==='chat'?chatScene:dateScene)(s,p.id);assert.equal(scene.branch,`${kind}:${p.id}:${response}`);
   assert.equal(scene.scene,DIALOGUE_BRANCHES[kind][p.id][response]);assert.ok(scene.scene.length>100&&scene.scene.length<900);assert.equal(scene.choices.length,2);
   s=night(s,kind,p.id,1);const record=s.dialogueMemories[p.id][kind][2];assert.equal(record.branch,scene.branch);assert.equal(record.scene,scene.scene);assert.equal(record.response,1);assert.deepEqual(parseSave(JSON.stringify(s)),s);
   results.push(scene.scene);count++;
  }
  assert.notEqual(results[0],results[1]);
 }
 assert.equal(count,32);
});

test('friendship branches remain equally available to both genders without economic or romantic bonuses',()=>{
 for(const p of PEOPLE)for(const gender of ['male','female'])for(const stage of ['employee','founder']){
  let a=createGame('朋友',gender);a.stage=stage;a.completed=5;a.startupOrders=stage==='founder'?2:0;if(p.unlock?.stage&&p.unlock.stage!==stage)continue;let b=structuredClone(a);
  for(let i=0;i<3;i++){a=night(a,'chat',p.id,0);b=night(b,'chat',p.id,1);}
  for(const key of ['cash','rep','ap','day','completed','startupOrders','staff','relations','story'])assert.deepEqual(a[key],b[key]);
  assert.equal(a.relations[p.id].status,'friend');assert.equal(a.relations[p.id].dates,0);
 }
});

test('repeated encounters and later hiring preserve the first recorded memories',()=>{
 let s=createGame();for(let i=0;i<3;i++)s=night(s,'chat','zhou',i%2);
 const before=structuredClone(s.dialogueMemories.zhou);s.stage='founder';s.completed=5;s.startupOrders=2;s.staff=['zhou'];
 for(let i=0;i<6;i++)s=night(s,'chat','zhou',1);
 assert.deepEqual(s.dialogueMemories.zhou,before);assert.equal(s.relations.zhou.chats,9);assert.deepEqual(parseSave(JSON.stringify(s)),s);
});

test('all eight commitments remember either real first-date preference, with no bonus or imposed future',()=>{
 for(const p of PEOPLE){const echoes=[];
  for(const response of [0,1]){
   let s=createGame('约定',p.gender==='male'?'female':'male');s.stage='founder';s.completed=5;s.startupOrders=2;
   for(let i=0;i<3;i++)s=night(s,'chat',p.id,0);
   for(let i=0;i<3;i++)s=night(s,'date',p.id,response);
   s=act(s,{type:'evening'});const before=structuredClone(s);s=act(s,{type:'commit',id:p.id});
   assert.equal(s.cash,before.cash);assert.equal(s.rep,before.rep);assert.ok(s.dialogueMemories[p.id].commitment);assert.deepEqual(parseSave(JSON.stringify(s)),s);echoes.push(s.dialogueMemories[p.id].commitment);
   const close=act(s,{type:'boundary',id:p.id});assert.equal(close.relations[p.id].status,'closed');assert.equal(close.cash,s.cash);
  }
  assert.notEqual(echoes[0],echoes[1]);
 }
});

test('v1 through v4 migrate resources and unknown replies without inventing branch history',()=>{
 for(const version of [1,2,3,4]){
  let s=late();s=act(s,{type:'accept',id:offers(s)[0].id});s=act(s,{type:'tactic',id:'quality'});s=act(s,{type:'factory',id:'steady'});
  s.version=version;delete s.dialogueMemories;s.relations.zhou.chats=2;s.relations.zhou.trust=3;
  if(version===1)delete s.story;if(version<3)delete s.workStories;if(version<4)delete s.lastDelivery;
  const migrated=parseSave(JSON.stringify(s));assert.equal(migrated.version,6);for(const key of ['cash','rep','active','relations','completed','startupOrders'])assert.deepEqual(migrated[key],s[key]);
  assert.deepEqual(migrated.dialogueMemories,emptyDialogueMemories());assert.equal(chatScene(migrated,'zhou').branch,null);
 }
});

test('old finished careers remain finished while new follow-up chapters stay playable',()=>{
 const s=late('brand');s.version=4;delete s.dialogueMemories;s.story.finale='brand';s.startupOrders=10;s.completed=13;
 const migrated=parseSave(JSON.stringify(s));assert.equal(migrated.story.finale,'brand');assert.equal(canFinish(migrated),false);assert.equal(nextStory(migrated).id,'aftercare');
 const after=act(migrated,{type:'story',id:'aftercare',choice:'guide'});assert.equal(after.story.finale,'brand');assert.equal(nextStory(after).id,'legacy');
});

test('malformed memories, mismatched branches and future records fail import',()=>{
 let source=createGame();for(let i=0;i<3;i++)source=night(source,'chat','zhou',0);
 const changes=[s=>delete s.dialogueMemories,s=>s.dialogueMemories.fake={},s=>s.dialogueMemories.zhou.chat.pop(),s=>s.dialogueMemories.zhou.chat[2].branch='chat:xia:0',s=>s.dialogueMemories.zhou.chat[2].branch='chat:zhou:1',s=>s.dialogueMemories.zhou.chat[0].day=s.day+1,s=>s.dialogueMemories.zhou.chat[0].response=2,s=>s.dialogueMemories.zhou.chat[0].scene='x'.repeat(901),s=>s.dialogueMemories.zhou.commitment=9,s=>s.relations.zhou.chats=0];
 for(const change of changes){const s=structuredClone(source);change(s);assert.throws(()=>parseSave(JSON.stringify(s)));}
 assert.deepEqual(parseSave(JSON.stringify(source)),source);
});

test('invalid or duplicate-night choices cannot create or replace response history',()=>{
 const s=act(createGame(),{type:'evening'});for(const response of [-1,2,'1'])assert.equal(reduce(s,{type:'chat',id:'zhou',response}).changed,false);
 const after=act(s,{type:'chat',id:'zhou',response:1});assert.equal(reduce(after,{type:'chat',id:'zhou',response:0}).changed,false);assert.equal(after.dialogueMemories.zhou.chat[0].response,1);
});

test('late scenes acknowledge business direction and chosen channels and never invent hires',()=>{
 const scenes=new Set();for(const focus of ['brand','boutique'])for(const operations of ['team','network'])for(const distribution of ['independent','regional']){
  const s=late(focus,operations,distribution),e=storyEvent(s,'aftercare');scenes.add(e.scene);assert.ok(e.scene.includes(focus==='brand'?'标签':'合页'));assert.ok(e.scene.includes(distribution==='regional'?'区域合作':'直接'));
  const before=JSON.stringify(s);const one=storyEvent(s,'aftercare');one.choices[0].effects.cash=0;assert.equal(storyEvent(s,'aftercare').choices[0].effects.cash,-500);assert.equal(JSON.stringify(s),before);
 }
 assert.equal(scenes.size,4);
});

test('the first follow-up changes the next scene, price, reputation and final reflection',()=>{
 for(const focus of ['brand','boutique'])for(const operations of ['team','network']){
  const variants=[];for(const first of ['fieldcheck','guide'])for(const final of ['share','service']){
   let s=late(focus,operations),before=structuredClone(s);assert.equal(nextStory(s).id,'aftercare');s=act(s,{type:'story',id:'aftercare',choice:first});
   assert.equal(s.cash,before.cash+(first==='fieldcheck'?-500:0));assert.equal(s.rep,before.rep+(first==='fieldcheck'?3:1));assert.equal(nextStory(s),null);
   s.startupOrders=focus==='brand'?9:8;s.completed=s.startupOrders+3;const e=nextStory(s);assert.equal(e.id,'legacy');assert.ok(e.scene.includes(operations==='team'?'交接':'外部伙伴'));
   const choice=e.choices.find(c=>c.id===final),cash=s.cash,rep=s.rep;s=act(s,{type:'story',id:'legacy',choice:final});assert.equal(s.cash,cash+(choice.effects.cash||0));assert.equal(s.rep,rep+(choice.effects.rep||0));
   assert.equal(reduce(s,{type:'story',id:'legacy',choice:final}).changed,false);assert.deepEqual(parseSave(JSON.stringify(s)),s);variants.push(e.scene);
   s.startupOrders=focus==='brand'?10:8;s.completed=s.startupOrders+3;assert.equal(canFinish(s),true);s=act(s,{type:'finale'});assert.equal(s.story.finale,focus);
  }
  assert.notEqual(variants[0],variants[2]);
 }
});

test('follow-ups have safe no-upfront routes, cannot skip prerequisites or change a quote',()=>{
 let s=late();s.cash=0;assert.equal(reduce(s,{type:'story',id:'aftercare',choice:'fieldcheck'}).changed,false);
 assert.equal(reduce(s,{type:'story',id:'legacy',choice:'service'}).changed,false);s=act(s,{type:'story',id:'aftercare',choice:'guide'});
 s.startupOrders=8;s.completed=11;assert.equal(reduce(s,{type:'story',id:'legacy',choice:'share'}).changed,false);s=act(s,{type:'story',id:'legacy',choice:'service'});assert.equal(s.cash,600);
 let pending=late();pending=act(pending,{type:'accept',id:offers(pending)[0].id});assert.equal(reduce(pending,{type:'story',id:'aftercare',choice:'guide'}).changed,false);
});

test('all dynamic chapter choices remain complete and have a zero-upfront option',()=>{
 for(const focus of ['brand','boutique'])for(const first of ['fieldcheck','guide'])for(const e of STORY_EVENTS){
  const s=late(focus);s.story.decisions.aftercare=first;const actual=storyEvent(s,e.id);assert.equal(actual.choices.length,2);assert.ok(actual.choices.some(c=>(c.effects.cash||0)>=0));
  for(const c of actual.choices)for(const text of [actual.scene,c.label,c.detail,c.outcome])assert.ok(typeof text==='string'&&text.length>6&&text.length<2000);
 }
});


test('commitment snapshots reject impossible dates and malformed imported prose',()=>{
 const s=createGame();s.dialogueMemories.zhou.commitmentRecord={day:s.day+1,scene:'当时的场景',echo:null};assert.throws(()=>parseSave(JSON.stringify(s)),/确认快照/);
 s.dialogueMemories.zhou.commitmentRecord={day:1,scene:42,echo:null};assert.throws(()=>parseSave(JSON.stringify(s)),/确认快照/);
});
