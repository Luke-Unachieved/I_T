import {cooperationChapter} from '../src/deal-room-cooperation.js';
import {caseGrowthView} from '../src/deal-room-case-growth-view.js';
import test from 'node:test';import assert from 'node:assert/strict';
import {createDealRoom,reduceDealRoom,normalizeDealRoom} from '../src/deal-room-engine.js';
import {studioProjectEligibility,studioProjectReview,previewStudioProjectOrder} from '../src/deal-room-studio-project.js';
import {studioProjectView,studioProjectInvite} from '../src/deal-room-studio-project-view.js';
const act=(s,type,x={})=>{const n=reduceDealRoom(s,{type,...x});assert.notEqual(n,s,type);return n;};
function ready(){let s=createDealRoom();for(const optionId of ['trial','ready','small'])for(const a of [{type:'PROPOSE',optionId},{type:'ADVANCE'},{type:'NEXT_CLIENT'}])s=reduceDealRoom(s,a);
 s=act(s,'START_OPENING_CURATION',{clientId:'mira'});s=act(s,'SIGN_CURATION',{products:['mira','samir'],quantity:40,packaging:'plain'});s=act(s,'FULFIL_CURATION');s=act(s,'START_COLLECTION');s=act(s,'SIGN_COLLECTION',{model:'own',style:'botanical'});s=act(s,'OPEN_COLLECTION_PITCH',{buyerId:'northline'});s=act(s,'SIGN_COLLECTION_PITCH',{optionId:'retain'});s=act(s,'FULFIL_COLLECTION');s=act(s,'CLOSE_COLLECTION');s=act(s,'SIGN_FIRST_CATALOGUE_ORDER',{referrerId:'mira',lampVersion:'standard'});s=act(s,'FULFIL_CASE_GROWTH');return act(s,'CLOSE_CASE_GROWTH');}
test('natural two-product original has a real supported use without linen or new ownership',()=>{
 let s=ready();assert.deepEqual(studioProjectEligibility(s,'independent').briefs,['reading-drink']);assert.match(studioProjectInvite(s),/OPEN_STUDIO_READING_PAIR/);const old=structuredClone(s.caseGrowthHistory);
 s=act(s,'OPEN_STUDIO_READING_PAIR');assert.equal(s.studioProject.briefId,'reading-drink');const html=studioProjectView(s);assert.match(html,/data-studio-value="reading-drink"/);assert.doesNotMatch(html,/data-studio-field="briefId" data-studio-value="(?:hosting|reading)"/);assert.doesNotMatch(html,/studio-object ines/);
 assert.equal(studioProjectReview(s,{...s.studioProject,light:'soft'}).valid,false);s=act(s,'REVIEW_STUDIO_PROJECT');assert.deepEqual(s.studioProject.products,['mira','samir']);let q=previewStudioProjectOrder(s,s.studioProject);if(q.waitingUntil>s.day)s=act(s,'WAIT_STUDIO_PROJECT');q=previewStudioProjectOrder(s,s.studioProject);assert.equal(q.valid,true,q.reason);assert.equal(q.revenue,4600);assert.equal(q.cost,2560);assert.equal(q.netProfit,1770);
 s=act(s,'SIGN_STUDIO_PROJECT_ORDER');s=act(s,'FULFIL_CASE_GROWTH');assert.deepEqual(s.caseGrowthHistory.slice(0,-1),old);assert.deepEqual(s.caseGrowthHistory.at(-1).products,['mira','samir']);assert.equal(s.caseGrowthHistory.at(-1).studioBrief,'reading-drink');const receipt=caseGrowthView(s);assert.match(receipt,/阅读与饮水/);assert.match(receipt,/已确认的陈列与原稿保留/);assert.doesNotMatch(receipt,/undefined|重新提出另一套陈列/);assert.deepEqual(normalizeDealRoom(s),s);
 s=act(s,'CLOSE_CASE_GROWTH');assert.equal(cooperationChapter(s).nextAction.label,'可选 · 回访已确认方案');assert.doesNotMatch(cooperationChapter(s).step,/新的用途可以/);assert.match(studioProjectInvite(s),/回访已确认方案/);assert.doesNotMatch(studioProjectInvite(s),/提出下一种用途/);
 s=act(s,'OPEN_STUDIO_READING_PAIR');const revisit=studioProjectView(s);assert.match(revisit,/确认方案与原稿保留/);assert.doesNotMatch(revisit,/后续可以提出另一个主题|调整下一次主题|data-action="REVISE_STUDIO_PROJECT"/);assert.deepEqual(normalizeDealRoom(s),s);
});
test('old invalid draft replays unchanged, new entry preserves it until explicit selection',()=>{
 let s=act(ready(),'OPEN_STUDIO_PROJECT',{direction:'independent'});assert.equal(s.studioProject.briefId,'reading');s=act(s,'SET_STUDIO_PROJECT',{field:'briefId',value:'hosting'});s=act(s,'REVIEW_STUDIO_PROJECT');assert.equal(s.studioProject.status,'draft');assert.deepEqual(normalizeDealRoom(s),s);s=act(s,'KEEP_STUDIO_PROJECT');const before=structuredClone(s.studioProjectDrafts.independent);s=act(s,'OPEN_STUDIO_READING_PAIR');assert.deepEqual(s.studioProject,before);s=act(s,'SET_STUDIO_PROJECT',{field:'briefId',value:'reading-drink'});s=act(s,'REVIEW_STUDIO_PROJECT');assert.equal(s.studioProject.status,'approved');assert.deepEqual(normalizeDealRoom(s),s);
});
test('new use cannot create products or be used for a different direction',()=>{
 const s=ready();for(const products of [['mira','ines'],['samir','ines'],['mira','samir','ines']]){const other={...s,collection:{...s.collection,products}};assert.equal(studioProjectEligibility(other,'independent').briefs.includes('reading-drink'),false);assert.equal(reduceDealRoom(other,{type:'OPEN_STUDIO_READING_PAIR'}),other);}
 assert.equal(reduceDealRoom(s,{type:'OPEN_STUDIO_READING_PAIR',direction:'group'}),s);
});
