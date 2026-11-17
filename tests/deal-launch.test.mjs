import test from 'node:test';import assert from 'node:assert/strict';
import {createDealRoom,reduceDealRoom,normalizeDealRoom} from '../src/deal-room-engine.js';
import {launchBasis,launchReview} from '../src/deal-room-launch.js';
import {launchInvite} from '../src/deal-room-launch-view.js';
import {businessHomeView,careerRecapView} from '../src/deal-room-home.js';
const act=(s,type,more={})=>reduceDealRoom(s,{type,...more});
const finish=(s,optionId)=>act(act(act(s,'PROPOSE',{optionId}),'ADVANCE'),'NEXT_CLIENT');
function paidCase(){let s=createDealRoom();for(const id of ['trial','ready','season'])s=finish(s,id);s=act(s,'CONTINUE_BUSINESS');for(let i=0;i<2;i++)s=finish(act(s,'SELECT_CLIENT',{clientId:'mira'}),'repeat-small');s=act(s,'START_SUPPLY_PLAN',{clientId:'mira',firstBatch:'small',payment:'delivery'});s=act(act(s,'FULFIL_SUPPLY_PLAN'),'START_CLIENT_PROJECTS');for(const clientId of ['mira','samir','ines'])s=finish(act(s,'SELECT_CLIENT',{clientId}),'project-series');s=act(s,'START_CURATION',{clientId:'mira'});return act(act(s,'SIGN_CURATION',{products:['mira','samir','ines'],quantity:40,packaging:'gift'}),'FULFIL_CURATION');}

for(const route of ['private','atelier','northline'])test(`launch handover preserves purchased goods, identity and rights: ${route}`,()=>{
 let s=act(paidCase(),'START_COLLECTION');
 if(route==='private')s=act(s,'SIGN_COLLECTION',{model:'private',style:'cream'});
 else{s=act(s,'SIGN_COLLECTION',{model:'own',style:'botanical'});s=act(s,'OPEN_COLLECTION_PITCH',{buyerId:route});s=act(s,'SIGN_COLLECTION_PITCH',{optionId:'exclusive'});}
 assert.equal(launchBasis(s),null);s=act(s,'FULFIL_COLLECTION');s=act(s,'CLOSE_COLLECTION');
 const old=structuredClone(s.collection),cash=s.cash,day=s.day;s=act(s,'OPEN_LAUNCH_PROJECT');assert.equal(s.phase,'launch-project');assert.equal(launchBasis(s).buyerId,route==='private'?'northline':route);
 assert.equal(act(s,'HAND_OVER_LAUNCH'),s);assert.equal(act(s,'SET_LAUNCH',{field:'buyerId',value:'atelier'}),s);
 s=act(s,'SET_LAUNCH',{field:'arrangement',value:'individual'});s=act(s,'SET_LAUNCH',{field:'lead',value:'ines'});s=act(s,'REVIEW_LAUNCH');assert.equal(s.launchProject.status,'review');assert.match(launchReview(s,s.launchProject).reply,/桌布/);
 s=act(s,'REVISE_LAUNCH');s=act(s,'SET_LAUNCH',{field:'arrangement',value:'set'});s=act(s,'REVIEW_LAUNCH');s=act(s,'HAND_OVER_LAUNCH');assert.equal(s.launchProject.status,'handed');assert.equal(act(s,'HAND_OVER_LAUNCH'),s);assert.equal(act(s,'SET_LAUNCH',{field:'lead',value:'mira'}),s);assert.equal(s.cash,cash);assert.equal(s.day,day);assert.deepEqual(s.collection,old);assert.deepEqual(normalizeDealRoom(s),s);s=act(act(s,'CLOSE_LAUNCH_PROJECT'),'OPEN_LAUNCH_PROJECT');assert.equal(s.launchProject.status,'handed');assert.deepEqual(normalizeDealRoom(s),s);
 const invitation=launchInvite(s);assert.match(invitation,/<details[^>]*launch-archive/);assert.doesNotMatch(invitation,/已签买方的下一步/);assert.match(invitation,/已完成上市交接/);
 s=act(s,'CLOSE_LAUNCH_PROJECT');const home=businessHomeView(s,{career:{eligible:false,reason:''},referrals:[]});assert.ok(home.indexOf('career-focus')<home.indexOf('launch-archive'));assert.match(home,/看已交接的陈列/);if(route==='atelier'){const recap=careerRecapView(s);assert.match(recap,/这一程，交付完成/);assert.match(recap,/Atelier 已收到独家系列/);assert.match(recap,/继续自由经营/);assert.doesNotMatch(recap,/完整版|通关奖励/);}
});
test('a nonexclusive original is not silently relabelled a buyer-only handover',()=>{const s={collection:{model:'own',style:'cream',products:['mira'],orders:[{status:'paid',buyerId:'atelier',scope:'nonexclusive'}]}};assert.equal(launchBasis(s),null);});
