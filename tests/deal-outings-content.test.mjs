import assert from 'node:assert/strict';
import test from 'node:test';
import {OUTING_COMPANIONS,OUTING_TRIPS,FRIEND_EVENTS,outingTrip,friendEvent} from '../src/deal-room-outings-content.js';

const ids=['fang','liang','tao','xu'];
const fullProse=s=>typeof s==='string'&&s.length>=7&&/[。！？]$/.test(s)&&!/TODO|待补|占位|undefined|\{\{|[<>]/.test(s);
const checkVoices=rows=>{
 for(const row of rows){
  const voices=row.companionLines;
  assert.deepEqual(Object.keys(voices),ids,row.id);
  assert.equal(new Set(Object.values(voices)).size,4,row.id);
  assert.ok(Object.values(voices).every(fullProse),row.id);
  assert.ok(Object.isFrozen(voices),row.id);
 }
};
test('eight distinct restored trips give exact fares and two distinct visible interactions each',()=>{
 assert.deepEqual(OUTING_COMPANIONS,[{id:'fang',name:'方文斌'},{id:'liang',name:'梁佳音'},{id:'tao',name:'陶乐'},{id:'xu',name:'许明珊'}]);
 assert.deepEqual(OUTING_TRIPS.map(({id,name,fare})=>[id,name,fare]),[
  ['paper-boat','桥下放纸船',0],['shadow-show','巷尾皮影夜场',128],
  ['tidepool','退潮赶海',168],['pottery','陶房拉坯',480],
  ['cave-boat','溶洞泛舟',1180],['night-train','坐夜车看海',2280],
  ['balloon','山谷热气球',3980],['sail-charter','包一艘夜航帆船',39800]
 ]);
 const interactions=OUTING_TRIPS.flatMap(t=>{
  assert.equal(outingTrip(t.id),t);
  assert.equal(t.interactions.length,2);
  assert.ok(Object.isFrozen(t.interactions));
  assert.equal(new Set(t.interactions.map(x=>x.id)).size,2);
  assert.ok(fullProse(t.blurb));
  return t.interactions;
 });
 assert.equal(new Set(interactions.map(x=>x.outcome)).size,16);
 assert.ok(interactions.every(({outcome})=>fullProse(outcome)));
 checkVoices(OUTING_TRIPS);
 checkVoices(interactions);
 assert.equal(outingTrip('__proto__'),null);
});

test('38 friend outings have 79 authored endings, free options and four independent companion scenes',()=>{
 assert.equal(FRIEND_EVENTS.length,38);
 assert.equal(new Set(FRIEND_EVENTS.map(x=>x.id)).size,38);
 assert.equal(new Set(FRIEND_EVENTS.map(x=>x.name)).size,38);
 assert.equal(FRIEND_EVENTS.filter(x=>x.choices.length===3).length,3);
 const allEndings = FRIEND_EVENTS.flatMap(e=>{
  assert.equal(friendEvent(e.id),e);
  assert.ok(fullProse(e.blurb));
  assert.ok(Object.isFrozen(e.choices));
  assert.ok(e.choices.some(c=>c.cost===0));
  assert.equal(new Set(e.choices.map(x=>x.id)).size,e.choices.length);
  return e.choices;
 });
 assert.equal(allEndings.length,79);
 assert.equal(new Set(allEndings.map(x=>x.outcome)).size,79);
 assert.ok(allEndings.every(x=>fullProse(x.outcome)&&Number.isSafeInteger(x.cost)&&x.cost>=0));
 assert.equal(FRIEND_EVENTS.filter(e=>e.choices.every(c=>c.cost===0)).length,16);
 assert.deepEqual(FRIEND_EVENTS.filter(e=>e.companionId).map(e=>e.companionId).sort(),[...ids].sort());
 assert.equal(friendEvent('pottery-yard').companionId,'liang');
 assert.equal(friendEvent('constructor'),null);
 checkVoices(FRIEND_EVENTS);
});
