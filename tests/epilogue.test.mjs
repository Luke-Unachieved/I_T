import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {careerEpilogue} from '../src/epilogue.js';
import {createGame,parseSave,reduce} from '../src/engine.js';
import {PEOPLE} from '../src/content.js';
import {STORY_EVENTS} from '../src/story.js';

const founder=()=>({...createGame(),stage:'founder'});
const prose=echo=>[...echo.decisions.map(d=>d.text),echo.workplace,echo.evening].join('\n');
const freeze=value=>{if(value&&typeof value==='object'){Object.freeze(value);Object.values(value).forEach(freeze);}return value;};

test('all sixteen chapter choices have distinct, ordered, authored reflections',()=>{
 const state=founder();
 for(const event of STORY_EVENTS){
  const variants=event.choices.map(choice=>{
   state.story.decisions={[event.id]:choice.id};
   const result=careerEpilogue(state);
   assert.equal(result.decisions.length,1);
   assert.equal(result.decisions[0].id,event.id);
   assert.equal(result.decisions[0].title,event.title);
   return result.decisions[0].text;
  });
  assert.equal(new Set(variants).size,2);
 }
 state.story.decisions=Object.fromEntries([...STORY_EVENTS].reverse().map(e=>[e.id,e.choices[0].id]));
 assert.deepEqual(careerEpilogue(state).decisions.map(d=>d.id),STORY_EVENTS.map(e=>e.id));
});

test('missing and forged historical decisions do not fabricate a reflection',()=>{
 const state=founder();state.story.decisions={direction:'brand',first_credit:'<untrusted>',unknown:'lead'};
 state.story.focus='brand';state.story.operations='team';state.story.distribution='regional';
 const result=careerEpilogue(state);
 assert.deepEqual(result.decisions.map(d=>d.id),['direction']);
 assert.doesNotMatch(prose(result),/<untrusted>|undefined/);
 assert.deepEqual(careerEpilogue().decisions,[]);
 assert.deepEqual(careerEpilogue(null),careerEpilogue({}));
});

test('unhired founders stay solo even after choosing team processes',()=>{
 for(const operations of [null,'team','network'])for(const staff of [[],['shen','lu'],['unknown']]){
  const state=founder();state.staff=staff;state.story.operations=operations;
  const {workplace}=careerEpilogue(state);
  for(const p of PEOPLE)assert.ok(!workplace.includes(p.name));
  if(operations==='team')assert.match(workplace,/仍由你自己填写/);
  if(operations==='network')assert.match(workplace,/外部伙伴/);
 }
});

test('each actual employee appears only in the current workplace',()=>{
 const crew=PEOPLE.filter(p=>p.recruit);
 for(let mask=1;mask<8;mask++)for(const operations of ['team','network',null]){
  const state=founder();state.staff=crew.filter((_,i)=>mask&(1<<i)).map(p=>p.id);state.story.operations=operations;
  const result=careerEpilogue(state);
  for(const p of PEOPLE)assert.equal(result.workplace.includes(p.name),state.staff.includes(p.id));
  assert.doesNotMatch(result.workplace,/愿意加入的人|仍由你自己/);
 }
 const employee=createGame();employee.staff=['xia'];
 assert.match(careerEpilogue(employee).workplace,/启航/);
 assert.doesNotMatch(careerEpilogue(employee).workplace,/林知夏|招聘/);
});

test('eight consensual opposite-sex partners have their own evening',()=>{
 const endings=[];
 for(const p of PEOPLE){
  const state=founder();state.gender=p.gender==='female'?'male':'female';state.relations[p.id].status='partner';
  const {evening,workplace}=careerEpilogue(state);endings.push(evening);
  assert.match(evening,new RegExp(p.name));
  assert.ok(!workplace.includes(p.name));
  for(const other of PEOPLE.filter(x=>x.id!==p.id))assert.ok(!evening.includes(other.name));
 }
 assert.equal(new Set(endings).size,8);
});

test('friendship, dating and closed boundaries never become a formal partner',()=>{
 for(const status of ['friend','dating','closed'])for(const gender of ['male','female']){
  const state=founder();state.gender=gender;
  for(const relation of Object.values(state.relations))Object.assign(relation,{status,trust:12,dates:8});
  const result=careerEpilogue(state);
  assert.match(result.evening,/答卷已经完整/);
  for(const p of PEOPLE)assert.ok(!result.evening.includes(p.name));
 }
});

test('invalid gender, direct-manager or multiple-partner data cannot imply romance',()=>{
 const same=founder();same.relations.xia.status='partner';
 assert.match(careerEpilogue(same).evening,/答卷已经完整/);
 const multiple=founder();multiple.relations.zhou.status='partner';multiple.relations.tang.status='partner';
 assert.match(careerEpilogue(multiple).evening,/答卷已经完整/);
 const employee=createGame();employee.relations.lu.status='partner';
 assert.match(careerEpilogue(employee).evening,/答卷已经完整/);
 const missing=founder();missing.gender=null;missing.relations.zhou.status='partner';
 assert.match(careerEpilogue(missing).evening,/答卷已经完整/);
});

test('review reflects later boundaries without changing historical choices',()=>{
 let state=founder();state.story.decisions={direction:'boutique'};state.relations.zhou.status='partner';
 const before=careerEpilogue(state);
 state=reduce(state,{type:'boundary',id:'zhou'}).state;
 const after=careerEpilogue(state);
 assert.deepEqual(after.decisions,before.decisions);
 assert.match(before.evening,/周屿/);assert.doesNotMatch(after.evening,/周屿/);
 state.staff=['xia'];
 assert.match(careerEpilogue(state).workplace,/林知夏/);
 assert.deepEqual(careerEpilogue(state).decisions,before.decisions);
});

test('reflections are pure, deterministic, fresh and mechanically gender-neutral',()=>{
 const state=founder();state.story.decisions=Object.fromEntries(STORY_EVENTS.map(e=>[e.id,e.choices[0].id]));state.staff=['xia','tang'];
 const before=structuredClone(state);freeze(state);
 const a=careerEpilogue(state),b=careerEpilogue(state);
 assert.deepEqual(a,b);assert.notEqual(a,b);assert.notEqual(a.decisions,b.decisions);assert.notEqual(a.decisions[0],b.decisions[0]);
 assert.deepEqual(state,before);
 assert.deepEqual(a,careerEpilogue({...before,gender:'male'}));
 a.decisions[0].text='caller edit';assert.deepEqual(careerEpilogue(state),b);
});

test('every choice combination stays short and contains no injected state or reward claims',()=>{
 for(let mask=0;mask<(1<<STORY_EVENTS.length);mask++){
  const state=founder();state.name='<script>doNotRun()</script>';
  state.story.decisions=Object.fromEntries(STORY_EVENTS.map((e,i)=>[e.id,e.choices[(mask>>i)&1].id]));
  const result=careerEpilogue(state);
  for(const paragraph of [...result.decisions.map(d=>d.text),result.workplace,result.evening]){
   assert.ok(paragraph.length>20&&paragraph.length<160,paragraph);
   assert.doesNotMatch(paragraph,/undefined|NaN|<script>|[¥￥+\d]|奖励|好感度/);
  }
 }
});

test('v1 migrated founders preserve missing chapter history and resource values',()=>{
 const old=founder();old.version=1;old.cash=8321;delete old.story;delete old.workStories;delete old.lastDelivery;
 const state=parseSave(JSON.stringify(old)),before=JSON.stringify(state);
 assert.deepEqual(careerEpilogue(state).decisions,[]);
 assert.equal(state.cash,8321);assert.equal(JSON.stringify(state),before);
});

test('finale renderer escapes each reflection and current-life paragraph',async()=>{
 const source=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
 for(const field of ['item.title','item.text','echo.workplace','echo.evening'])assert.ok(source.includes('${esc('+field+')}'));
 assert.ok(source.includes('现在的工作室 · 现在的生活'));
});
