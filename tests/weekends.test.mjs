import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,reduce,offers,parseSave} from '../src/engine.js';
import {weekday,isWeekend,canWorkToday} from '../src/calendar.js';
const act=(s,a)=>{const r=reduce(s,a);assert.ok(r.changed,r.message);return r.state;};
const next=s=>act(act(s,{type:'evening'}),{type:'rest'});
test('Saturday and Sunday are explicit opt-in work days, not mandatory attendance',()=>{
 let s=createGame();assert.equal(weekday(s),'周一');for(let i=0;i<5;i++)s=next(s);
 assert.equal(weekday(s),'周六');assert.ok(isWeekend(s));assert.equal(canWorkToday(s),false);
 assert.equal(reduce(s,{type:'accept',id:offers(s)[0].id}).changed,false);
 assert.ok(offers(s).every(o=>o.need==='speed'));
 const cash=s.cash;s=next(s);assert.equal(weekday(s),'周日');assert.equal(s.cash,cash+180);assert.equal(s.weekendWork,false);
 s=next(s);assert.equal(weekday(s),'周一');assert.equal(canWorkToday(s),true);assert.equal(s.completed,0);
});
test('weekend urgent work uses normal disclosed economics and can be interrupted',()=>{
 let s=createGame();s.day=6;const o=offers(s)[0];s=act(s,{type:'weekend-work'});assert.equal(reduce(s,{type:'weekend-work'}).changed,false);
 s=act(s,{type:'accept',id:o.id});s=act(s,{type:'tactic',id:o.need});const active=structuredClone(s.active);s=next(s);
 assert.deepEqual(s.active,active);assert.equal(s.weekendWork,false);assert.equal(reduce(s,{type:'factory',id:'steady'}).changed,false);
 s=next(s);assert.deepEqual(s.active,active);s=act(s,{type:'factory',id:'steady'});s=act(s,{type:'ship',id:'normal'});assert.equal(s.completed,1);
 assert.deepEqual(parseSave(JSON.stringify(s)),s);
});
test('weekend paid leave preserves existing employee and hired-staff commitments',()=>{
 let s=createGame();s.day=6;s.stage='founder';s.staff=['zhou'];s.cash=5000;const before=JSON.stringify(s.relations);
 s=next(s);assert.equal(s.cash,4920);assert.equal(JSON.stringify(s.relations),before);assert.equal(s.rep,0);
 s=next(s);assert.equal(s.cash,4840);assert.equal(s.day,8);assert.equal(s.completed,0);
});
test('weekends allow choosing personal time without money or work exchange',()=>{
 let s=createGame('休息','female');s.day=6;s.relations.zhou.trust=2;const cash=s.cash;
 s=act(s,{type:'evening'});s=act(s,{type:'date',id:'zhou',response:1});assert.equal(s.cash,cash);assert.equal(s.relations.zhou.dates,1);
 assert.equal(reduce(s,{type:'accept',id:offers(s)[0].id}).changed,false);s=act(s,{type:'rest'});assert.equal(s.day,7);
});
test('old v5 progress migrates to the same weekday and preserves in-flight orders',()=>{
 let old=createGame();old.day=5;old=act(old,{type:'accept',id:offers(old)[0].id});old=act(old,{type:'tactic',id:old.active.need});old=next(old);
 old.version=5;delete old.weekendWork;for(const id of ['xu','gu','cheng']){delete old.relations[id];delete old.dialogueMemories[id];}
 const s=parseSave(JSON.stringify(old));assert.equal(s.version,6);assert.equal(s.day,6);assert.equal(weekday(s),'周六');assert.equal(s.weekendWork,false);assert.deepEqual(s.active,old.active);assert.equal(s.cash,old.cash);
 for(const id of ['xu','gu','cheng']){assert.equal(s.relations[id].chats,0);assert.deepEqual(s.dialogueMemories[id].chat,[null,null,null]);}
});
test('weekday work opt-in and malformed calendar fields are rejected',()=>{
 const s=createGame();assert.equal(reduce(s,{type:'weekend-work'}).changed,false);
 for(const value of [undefined,1,'yes',null,true]){const bad={...s,weekendWork:value};assert.throws(()=>parseSave(JSON.stringify(bad)));}
});

test('a weekend daytime outing creates a real memory while keeping the evening free',()=>{
 for(const day of [6,7])for(const id of ['walk','home']){
  const s=createGame();s.day=day;const r=reduce(s,{type:'weekend-time',id});assert.ok(r.changed,r.message);assert.equal(r.state.phase,'evening');assert.equal(r.state.eveningUsed,false);assert.equal(r.state.cash,s.cash);assert.equal(r.state.rep,s.rep);assert.deepEqual(r.state.relations,s.relations);assert.match(r.state.logs[0].title,/留给自己的半天/);assert.ok(r.state.logs[0].text.length>60);
  assert.equal(reduce(r.state,{type:'weekend-time',id}).changed,false);assert.deepEqual(parseSave(JSON.stringify(r.state)),r.state);
 }
});
test('weekend personal mornings cannot be retroactively claimed after voluntary work',()=>{
 const s=createGame();assert.equal(reduce(s,{type:'weekend-time',id:'walk'}).changed,false);s.day=6;s.weekendWork=true;assert.equal(reduce(s,{type:'weekend-time',id:'walk'}).changed,false);s.weekendWork=false;assert.equal(reduce(s,{type:'weekend-time',id:'invalid'}).changed,false);
});
