import test from 'node:test';
import assert from 'node:assert/strict';
import {PEOPLE} from '../src/content.js';
import {WORK_STORIES} from '../src/relationships.js';
import {createGame,reduce,personUnlocked,canDate,workScene,parseSave} from '../src/engine.js';
import {memoryTitle} from '../src/memory-titles.js';
const act=(s,a)=>{const r=reduce(s,a);assert.ok(r.changed,r.message);return r.state;};
const founder=()=>Object.assign(createGame(),{stage:'founder',completed:13,startupOrders:10,cash:30000});
test('eight adult characters offer four opposite-sex possibilities per protagonist',()=>{
 assert.equal(PEOPLE.length,8);for(const gender of ['female','male'])assert.equal(PEOPLE.filter(p=>p.gender!==gender).length,4);
 for(const p of PEOPLE){assert.ok(p.age>=18);assert.equal(p.chats.length,3);assert.equal(p.dates.length,3);for(const kind of ['chat','date'])for(let i=0;i<3;i++)assert.ok(memoryTitle(p.id,kind,i).length>3);}
});
test('new collaborators appear at verified work stages rather than all on the first day',()=>{
 let s=createGame();for(const id of ['xu','gu','cheng']){assert.equal(personUnlocked(s,id),false);s.relations[id].trust=3;assert.equal(canDate(s,id),false);const night={...s,phase:'evening'};assert.equal(reduce(night,{type:'chat',id}).changed,false);}
 s.completed=2;assert.ok(personUnlocked(s,'xu'));assert.equal(personUnlocked(s,'cheng'),false);
 s.completed=3;assert.ok(personUnlocked(s,'cheng'));assert.equal(personUnlocked(s,'gu'),false);
 s.stage='founder';s.startupOrders=1;assert.equal(personUnlocked(s,'gu'),false);s.startupOrders=2;assert.ok(personUnlocked(s,'gu'));
});
test('all sixteen cross-stage echoes depend on a real earlier response',()=>{
 const sources={xu_limits_written:'xu_repeatable',gu_revision_story:'gu_series_voice',cheng_clear_return:'cheng_handover',zhou_after_hours:'zhou_side_by_side',xia_own_standard:'xia_small_details',tang_fair_quote:'tang_backup_plan',shen_hand_over:'shen_own_judgment',lu_return_invitation:'lu_equal_table',xu_repeatable:'xu_sample_first',gu_series_voice:'gu_first_label',cheng_handover:'cheng_first_route',zhou_consistent_day:'zhou_after_hours',xia_standard_return:'xia_own_standard',tang_long_partner:'tang_fair_quote',shen_leave_space:'shen_hand_over',lu_real_invitation:'lu_return_invitation'};
 for(const [id,source]of Object.entries(sources)){
  const s=founder();assert.equal(workScene(s,id).branch,null);const a=structuredClone(s),b=structuredClone(s);a.workStories[source]={response:0,setting:'remote'};b.workStories[source]={response:1,setting:'remote'};
  assert.equal(workScene(a,id).branch,`work:${source}:0`);assert.equal(workScene(b,id).branch,`work:${source}:1`);assert.notEqual(workScene(a,id).scene,workScene(b,id).scene);
 }
});
test('new work memories retain exact scene, reply and day despite later staffing changes',()=>{
 let s=founder();s.workStories.zhou_side_by_side={response:1,setting:'remote'};const scene=workScene(s,'zhou_after_hours');
 s=act(s,{type:'work-story',id:scene.id,response:0});const saved=structuredClone(s.workStories[scene.id]);assert.equal(saved.scene,scene.scene);assert.equal(saved.line,scene.choices[0].line);assert.equal(saved.reply,scene.choices[0].reply);assert.equal(saved.day,s.day);
 s.workStories.zhou_side_by_side.response=0;s.staff=['zhou'];s.day=2;const replay=workScene(s,scene.id);assert.equal(replay.scene,saved.scene);assert.equal(replay.setting,'remote');assert.equal(replay.choices[0].reply,saved.reply);assert.deepEqual(parseSave(JSON.stringify(s)).workStories[scene.id],saved);
});
test('legacy work records stay original rather than retroactively gaining new branches',()=>{
 const s=founder();s.workStories.zhou_side_by_side={response:0,setting:'remote'};s.workStories.zhou_after_hours={response:1,setting:'remote'};
 const e=WORK_STORIES.find(e=>e.id==='zhou_after_hours');assert.equal(workScene(s,e.id).scene,e.remote);assert.equal(workScene(s,e.id).branch,null);assert.deepEqual(parseSave(JSON.stringify(s)).workStories,s.workStories);
});
test('late work scenes require their actual preceding encounter, not just a high order count',()=>{
 const s=founder();assert.equal(reduce(s,{type:'work-story',id:'zhou_consistent_day',response:0}).changed,false);
 s.workStories.zhou_after_hours={response:0,setting:'remote'};const before=structuredClone(s);const after=act(s,{type:'work-story',id:'zhou_consistent_day',response:1});
 for(const key of ['cash','rep','ap','relations','staff','startupOrders'])assert.deepEqual(after[key],before[key]);
});
test('corrupt recorded stage memories cannot enter the save',()=>{
 let s=founder();s=act(s,{type:'work-story',id:'xu_sample_first',response:0});
 for(const patch of [{day:2},{scene:'x'.repeat(1401)},{line:null},{reply:[]},{branch:'arbitrary'}]){const bad=structuredClone(s);Object.assign(bad.workStories.xu_sample_first,patch);assert.throws(()=>parseSave(JSON.stringify(bad)));}
});

test('founder chats with former colleagues establish independent contexts',async()=>{
 const {chatScene}=await import('../src/engine.js');const s=founder();
 for(const id of ['xia','zhou','tang'])for(let i=0;i<2;i++){
  s.relations[id].chats=i;const separate=chatScene(s,id);assert.match(separate.scene,/各自|练习|虚构|没有带出客户|不含客户/);
  s.staff=[id];const together=chatScene(s,id);assert.notEqual(together.scene,separate.scene);s.staff=[];
 }
});

test('independent collaborators do not inherit a manager romance restriction',()=>{
 for(const [gender,id,completed]of [['male','xu',2],['female','cheng',3]]){
  const s=createGame('相识',gender);s.completed=completed;s.relations[id].trust=2;assert.ok(canDate(s,id));assert.equal(s.stage,'employee');
 }
 for(const [gender,id]of [['male','shen'],['female','lu']]){const s=createGame('职业边界',gender);s.relations[id].trust=3;assert.equal(canDate(s,id),false);s.stage='founder';assert.ok(canDate(s,id));}
});


test('a declined industry invitation stays declined and offers a real second refusal',()=>{
 for(const gender of ['female','male'])for(const response of [0,1]){
  let s=Object.assign(createGame('自主决定',gender),{stage:'founder',completed:13,startupOrders:10,cash:30000});
  s=act(s,{type:'work-story',id:'lu_return_invitation',response:1});
  const before=structuredClone(s),event=workScene(s,'lu_real_invitation');
  assert.match(event.scene,/明确谢绝/);assert.match(event.scene,/新一轮邀请/);assert.match(event.scene,/不等于答应参加/);
  assert.match(event.choices[0].line,/如果以后参加/);assert.match(event.choices[1].line,/这一轮仍不参加/);
  s=act(s,{type:'work-story',id:event.id,response});
  for(const key of ['cash','rep','ap','relations','staff','startupOrders','day','phase'])assert.deepEqual(s[key],before[key]);
  const record=s.workStories[event.id];assert.equal(record.line,event.choices[response].line);assert.equal(record.reply,event.choices[response].reply);
  assert.equal(record.branch,'work:lu_return_invitation:1');
  assert.match(record.reply,response===0?/不列进这次议程/:/不替你报名/);
  assert.deepEqual(parseSave(JSON.stringify(s)),s);
  assert.equal(reduce(s,{type:'work-story',id:event.id,response:1-response}).changed,false);
 }
});

test('conditional invitation answers never mutate original choices or the other path',()=>{
 const e=WORK_STORIES.find(e=>e.id==='lu_real_invitation'),original=structuredClone(e);
 const s=founder();s.workStories.lu_return_invitation={response:1,setting:'remote'};
 assert.notDeepEqual(workScene(s,e.id).choices,e.choices);assert.deepEqual(e,original);
 s.workStories.lu_return_invitation.response=0;assert.deepEqual(workScene(s,e.id).choices,original.choices);
 delete s.workStories.lu_return_invitation;assert.deepEqual(workScene(s,e.id).choices,original.choices);
});

test('invitation replay retains saved prose even if the earlier answer or staffing changes',()=>{
 let s=founder();s=act(s,{type:'work-story',id:'lu_return_invitation',response:1});
 s=act(s,{type:'work-story',id:'lu_real_invitation',response:1});
 const saved=structuredClone(s.workStories.lu_real_invitation);
 s.workStories.lu_return_invitation.response=0;s.staff=['zhou'];s.day=2;
 const replay=workScene(s,'lu_real_invitation');
 assert.equal(replay.scene,saved.scene);assert.equal(replay.choices[1].line,saved.line);assert.equal(replay.choices[1].reply,saved.reply);
 assert.equal(replay.setting,saved.setting);assert.deepEqual(parseSave(JSON.stringify(s)).workStories.lu_real_invitation,saved);
});

test('legacy invitation records do not acquire a newly authored refusal retrospectively',()=>{
 const s=founder(),e=WORK_STORIES.find(e=>e.id==='lu_real_invitation');
 s.workStories.lu_return_invitation={response:1,setting:'remote'};
 s.workStories.lu_real_invitation={response:1,setting:'remote'};
 const original=structuredClone(s.workStories),legacy=workScene(s,e.id);
 assert.equal(legacy.scene,e.remote);assert.equal(legacy.branch,null);assert.deepEqual(legacy.choices,e.choices);
 assert.deepEqual(parseSave(JSON.stringify(s)).workStories,original);
});
