import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,reduce,offers,nextStory,canStart,canFinish} from '../src/engine.js';
import {isWeekend} from '../src/calendar.js';
test('both genders can finish both careers while resting every weekend, without romance or hiring',()=>{
 for(const gender of ['male','female'])for(const focus of ['boutique','brand'])for(const weekends of ['rest','work']){
  let s=createGame('完整节奏',gender),workdays=0;
  const act=a=>{const r=reduce(s,a);assert.ok(r.changed,r.message);s=r.state;};
  function chapters(){let e;while((e=nextStory(s))){const choices={first_credit:'together',first_contract:'open',direction:focus,deadline:'explain',team:'network',partnership:'independent',aftercare:'guide',legacy:'share'};act({type:'story',id:e.id,choice:choices[e.id]});}}
  for(let guard=0;guard<45&&!s.story.finale;guard++){
   if(isWeekend(s)&&weekends==='rest'){act({type:'evening'});act({type:'rest'});continue;}
   if(isWeekend(s))act({type:'weekend-work'});workdays++;chapters();
   if(canStart(s)){act({type:'startup'});chapters();}
   // Keep a working-capital cushion rather than spending all cash on the first upgrade.
   if(s.stage==='founder'&&s.cash>=6000&&s.warehouse===1)act({type:'warehouse'});
   const o=offers(s)[0];act({type:'accept',id:o.id});act({type:'tactic',id:o.need});act({type:'factory',id:'steady'});act({type:'ship',id:o.need==='speed'?'express':'qc'});chapters();
   if(canFinish(s))act({type:'finale'});else{act({type:'evening'});act({type:'rest'});}
  }
  assert.equal(s.story.finale,focus);assert.equal(workdays,focus==='boutique'?11:13);assert.ok(s.day<20);assert.equal(s.staff.length,0);assert.ok(Object.values(s.relations).every(r=>r.chats===0&&r.dates===0));
 }
});
