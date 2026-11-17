import test from 'node:test';import assert from 'node:assert/strict';
import {createDealRoom,reduceDealRoom,normalizeDealRoom} from '../src/deal-room-engine.js';
import {careerProjects} from '../src/deal-room-career-focus.js';
import {hasLampDevelopmentCase} from '../src/deal-room-development.js';
const act=(s,type,x={})=>reduceDealRoom(s,{type,...x});
function opening(){let s=createDealRoom();for(const optionId of ['trial','ready','small'])for(const type of ['PROPOSE','ADVANCE','NEXT_CLIENT'])s=act(s,type,type==='PROPOSE'?{optionId}:{});return s;}
test('real delivered lamp case opens supplier comparison without unrelated supply-plan grind',()=>{
 let s=opening();assert.equal(act(s,'START_CASE_DEVELOPMENT'),s);s=act(s,'START_OPENING_CURATION',{clientId:'mira'});s=act(s,'SIGN_CURATION',{products:['mira','samir'],quantity:40,packaging:'plain'});assert.equal(act(s,'START_CASE_DEVELOPMENT'),s);s=act(s,'FULFIL_CURATION');
 assert.equal(hasLampDevelopmentCase(s),true);assert.equal(s.supplyPlanHistory?.length||0,0);assert.equal(act(s,'START_DEVELOPMENT'),s,'legacy action retains its replay behavior');assert.equal(careerProjects(s).find(p=>p.id==='product').actions[0].type,'START_CASE_DEVELOPMENT');
 const before=structuredClone(s);s=act(s,'START_CASE_DEVELOPMENT');assert.equal(s.phase,'development');assert.equal(s.cash,before.cash);assert.equal(s.day,before.day);assert.equal(act(s,'START_CASE_DEVELOPMENT'),s);assert.deepEqual(normalizeDealRoom(s),s);
 s=act(s,'CLOSE_DEVELOPMENT');assert.equal(s.cash,before.cash);s=act(s,'START_CASE_DEVELOPMENT');s=act(s,'COMMISSION_SAMPLE',{factory:'studio'});s=act(s,'RECEIVE_SAMPLE');s=act(s,'ACCEPT_SAMPLE');assert.equal(s.cash,before.cash-2520);assert.equal(s.day,before.day+4);assert.deepEqual(s.curationHistory,before.curationHistory);assert.deepEqual(normalizeDealRoom(s),s);
});
test('lamp access requires real paid case, not any unrelated delivery or draft',()=>{for(const c of [{status:'production',products:['mira']},{status:'paid',products:['samir','ines']},{}])assert.equal(hasLampDevelopmentCase({curationHistory:[c]}),false);});
