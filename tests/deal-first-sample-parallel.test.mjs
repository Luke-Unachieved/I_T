import test from 'node:test';
import assert from 'node:assert/strict';
import {createDealRoom,reduceDealRoom,normalizeDealRoom,quoteOptions} from '../src/deal-room-engine.js';
import {developmentView} from '../src/deal-room-development.js';
import {careerProjects} from '../src/deal-room-career-focus.js';
const run=(s,type,data={})=>{const n=reduceDealRoom(s,{type,...data});assert.notEqual(n,s,type);return n;};
const finish=(s,optionId)=>run(run(run(s,'PROPOSE',{optionId}),'ADVANCE'),'NEXT_CLIENT');
function commissioned(factory){let s=createDealRoom();for(const id of ['trial','ready','season'])s=finish(s,id);
 s=run(s,'START_OPENING_CURATION',{clientId:'mira'});s=run(s,'SIGN_CURATION',{products:['mira','samir'],quantity:40,packaging:'plain'});s=run(s,'FULFIL_CURATION');s=run(s,'START_CASE_DEVELOPMENT');return run(s,'COMMISSION_SAMPLE',{factory});}
function trade(s,clientId){s=run(s,'CONTINUE_BUSINESS');s=run(s,'SELECT_CLIENT',{clientId});assert.ok(!quoteOptions(s).some(o=>o.id==='developed-lamp'));s=finish(s,'repeat-small');return s.phase==='portfolio'?run(s,'BACK_FROM_CLIENTS'):s;}
const next=s=>careerProjects(s).find(p=>p.id==='product').actions.find(a=>a.type==='COLLECT_FIRST_SAMPLE');
test('first factory makes the sample while a real order is fulfilled; only the remaining idle days cost money',()=>{
 let s=commissioned('studio');const start=s.day,fee=s.productDevelopment.investment;
 assert.match(developmentView(s),/data-action="PAUSE_FIRST_SAMPLE"/);s=run(s,'PAUSE_FIRST_SAMPLE');s=trade(s,'mira');assert.equal(s.day,start+1);
 const before=s.cash;assert.match(next(s).label,/3 天.*¥90/);s=run(s,'COLLECT_FIRST_SAMPLE');assert.equal(s.day,start+4);assert.equal(s.cash,before-90);assert.equal(s.productDevelopment.investment,fee+90);assert.equal(s.productDevelopment.status,'received');assert.deepEqual(normalizeDealRoom(s),s);
 s=run(s,'PAUSE_FIRST_SAMPLE');assert.match(next(s).label,/已经到货/);const hold=s.cash;s=run(s,'COLLECT_FIRST_SAMPLE');assert.equal(s.day,start+4);assert.equal(s.cash,hold);
 s=run(s,'ACCEPT_SAMPLE');s=run(run(s,'CONTINUE_BUSINESS'),'SELECT_CLIENT',{clientId:'mira'});assert.ok(quoteOptions(s).some(o=>o.id==='developed-lamp'));
});
test('a later retrieval neither rewinds time nor bills days twice; uninterrupted legacy waiting is unchanged',()=>{
 const c=commissioned('line'),original=run(c,'RECEIVE_SAMPLE');assert.equal(original.day,c.day+3);assert.equal(original.cash,c.cash-90);
 let s=run(c,'PAUSE_FIRST_SAMPLE');s=trade(s,'ines');s=trade(s,'samir');assert.ok(s.day>c.productDevelopment.sampleDay);const receipt=s.contracts.at(-1),day=s.day,cash=s.cash;
 s=run(s,'COLLECT_FIRST_SAMPLE');assert.equal(s.day,day);assert.equal(s.cash,cash);assert.equal(s.productDevelopment.investment,1800);assert.deepEqual(s.contracts.at(-1),receipt);assert.deepEqual(normalizeDealRoom(s),s);
});

test('the completed topic desk keeps an existing sample reachable, without buying another or resetting the project result',async()=>{
 const {businessHomeView}=await import('../src/deal-room-home.js');
 const {careerOpportunity}=await import('../src/deal-room-engine.js');
 let s=['trial','ready','season'].reduce(finish,createDealRoom());s=run(s,'CONTINUE_BUSINESS');
 for(const clientId of ['mira','ines'])s=finish(run(s,'SELECT_CLIENT',{clientId}),'repeat-small');
 s=run(run(s,'START_SUPPLY_PLAN',{clientId:'mira',firstBatch:'small',payment:'delivery'}),'FULFIL_SUPPLY_PLAN');
 s=run(run(run(s,'START_DEVELOPMENT'),'COMMISSION_SAMPLE',{factory:'studio'}),'PAUSE_FIRST_SAMPLE');const due=s.productDevelopment.sampleDay;
 s=run(s,'START_CLIENT_PROJECTS');for(const clientId of ['samir','mira','ines'])s=finish(run(s,'SELECT_CLIENT',{clientId}),'project-series');
 assert.equal(s.feedback.kind,'projects-complete');assert.equal(due,33);assert.equal(s.day,54);
 const desk=businessHomeView(s,{career:careerOpportunity(s),referrals:[]});assert.match(desk,/本轮客户计划已兑现/);assert.match(desk,/data-action="COLLECT_FIRST_SAMPLE"/);assert.match(desk,/拆看已经到货/);
 const picked=run(s,'COLLECT_FIRST_SAMPLE');assert.equal(picked.day,s.day);assert.equal(picked.cash,s.cash);assert.deepEqual(picked.contracts,s.contracts);assert.deepEqual(normalizeDealRoom(picked),picked);
});
