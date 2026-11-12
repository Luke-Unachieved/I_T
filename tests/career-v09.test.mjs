import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,reduce,parseSave} from '../src/engine.js';
import {STORY_EVENTS,storyEvent} from '../src/story.js';
import {deliveryStory} from '../src/delivery-stories.js';
const rich=()=>{const s=createGame();Object.assign(s,{stage:'founder',completed:15,startupOrders:12,cash:20000});return s;};
const choose=(s,id,choice)=>{const r=reduce(s,{type:'story',id,choice});assert.ok(r.changed,r.message);return r.state;};
test('five career chapters carry distinct consequences from real earlier choices',()=>{
 const pairs={first_contract:['first_credit','lead','together'],direction:['first_contract','pilot','open'],deadline:['direction','boutique','brand'],team:['deadline','reserve','explain'],partnership:['first_contract','pilot','open']};
 for(const [id,[from,a,b]]of Object.entries(pairs)){
  const s=rich();s.story.decisions[from]=a;const one=storyEvent(s,id);s.story.decisions[from]=b;const two=storyEvent(s,id);
  assert.notEqual(one.scene,two.scene);assert.equal(one.branch,`career:${from}:${a}`);assert.equal(two.branch,`career:${from}:${b}`);
 }
});
test('recorded contingency preparation reduces the disclosed later process cost',()=>{
 for(const [deadline,cost]of [['reserve',550],['explain',700]]){
  let s=rich();s.story.decisions={direction:'boutique',deadline};s.story.focus='boutique';
  const event=storyEvent(s,'team');assert.equal(event.choices[0].effects.cash,-cost);assert.ok(event.choices[0].detail.includes(String(cost)));
  const before=s.cash;s=choose(s,'team','team');assert.equal(before-s.cash,cost);assert.equal(s.story.memories.team.detail,event.choices[0].detail);
 }
});
test('earlier trial framework changes the later disclosed service fee',()=>{
 for(const [first_contract,fee]of [['pilot',1700],['open',1500]]){
  let s=rich();s.story.decisions={first_credit:'lead',first_contract,direction:'brand',deadline:'explain',team:'network'};s.story.focus='brand';s.story.operations='network';
  const event=storyEvent(s,'partnership');assert.equal(event.choices[1].effects.cash,fee);const before=s.cash;s=choose(s,'partnership','regional');assert.equal(s.cash-before,fee);
 }
});
test('career review preserves actual scene and economic text after later choices',()=>{
 let s=createGame();s.completed=1;s=choose(s,'first_credit','together');s.completed=3;s=choose(s,'first_contract','pilot');
 const saved=structuredClone(s.story.memories.first_contract);s.story.decisions.first_credit='lead';s.stage='founder';s.staff=['zhou'];
 const reviewed=storyEvent(s,'first_contract');assert.equal(reviewed.scene,saved.scene);assert.equal(reviewed.choices[0].outcome,saved.outcome);assert.equal(reviewed.branch,saved.branch);
 assert.deepEqual(parseSave(JSON.stringify(s)).story.memories,s.story.memories);
});
test('legacy career choices do not acquire newly invented scenes or rewards',()=>{
 const s=rich();s.story.decisions={direction:'boutique',deadline:'reserve',team:'team'};delete s.story.memories;
 const old=storyEvent(s,'team');assert.equal(old.scene,STORY_EVENTS.find(e=>e.id==='team').scene);assert.equal(old.choices[0].effects.cash,-700);
 const copy=parseSave(JSON.stringify(s));assert.deepEqual(copy.story.memories,{});assert.equal(copy.cash,s.cash);
});
test('malformed chapter memories are rejected without accepting unknown event ids',()=>{
 let s=createGame();s.completed=1;s=choose(s,'first_credit','lead');
 for(const patch of [{day:0},{scene:[]},{outcome:'x'.repeat(1001)},{branch:'invented'}]){const t=structuredClone(s);Object.assign(t.story.memories.first_credit,patch);assert.throws(()=>parseSave(JSON.stringify(t)));}
 const t=structuredClone(s);t.story.memories.extra=t.story.memories.first_credit;assert.throws(()=>parseSave(JSON.stringify(t)));
});
test('weekend delivery recognition never implies colleagues were made to work',()=>{
 for(const stage of ['employee','founder']){
  const echo=deliveryStory({product:'hinge',stage,staffIds:['xia','zhou'],completed:1,qualityPoints:3,planPoints:2,need:'quality',shipmentId:'qc',weekend:true});
  assert.match(echo.team,/同事今天不必到场/);assert.doesNotMatch(echo.team,/林知夏|周屿|唐澈/);assert.ok(echo.customer.length>20);
 }
});
