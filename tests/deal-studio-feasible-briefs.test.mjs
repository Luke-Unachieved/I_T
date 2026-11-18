import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {buildDealHtml} from '../scripts/build-deal-standalone.mjs';
import {createDealRoom,reduceDealRoom,normalizeDealRoom} from '../src/deal-room-engine.js';
import {studioProjectEligibility,previewStudioProjectOrder} from '../src/deal-room-studio-project.js';
import {studioProjectInvite,studioProjectView} from '../src/deal-room-studio-project-view.js';
import {cooperationChapter} from '../src/deal-room-cooperation.js';
const a=(s,type,extra={})=>{const t=reduceDealRoom(s,{type,...extra});if(t===s)throw Error(type+' '+JSON.stringify(extra)+' at '+s.day+' '+s.phase + ' '+s.feedback.message);return t};
const finish=(s,id)=>a(a(a(s,'PROPOSE',{optionId:id}),'ADVANCE'),'NEXT_CLIENT');
function route(products){
let s=createDealRoom();for(const id of ['trial','ready','season'])s=finish(s,id);
s=a(s,'CONTINUE_BUSINESS');for(let i=0;i<2;i++)s=finish(a(s,'SELECT_CLIENT',{clientId:'mira'}),'repeat-small');
s=a(s,'START_SUPPLY_PLAN',{clientId:'mira',firstBatch:'small',payment:'delivery'});s=a(s,'FULFIL_SUPPLY_PLAN');s=a(a(a(a(s,'START_DEVELOPMENT'),'COMMISSION_SAMPLE',{factory:'studio'}),'RECEIVE_SAMPLE'),'ACCEPT_SAMPLE');
s=a(s,'START_CLIENT_PROJECTS');for(const id of ['mira','samir','ines'])s=finish(a(s,'SELECT_CLIENT',{clientId:id}),'project-focus');
s=a(s,'START_CURATION',{clientId:products[0]});s=a(s,'SIGN_CURATION',{products,quantity:40,packaging:'gift'});s=a(s,'FULFIL_CURATION');
s=a(s,'OPEN_CASE_GROWTH',{referrerId:products[0]});s=a(a(a(s,'SIGN_CASE_GROWTH',{agreement:'portfolio',products,packaging:'plain',terms:'delivery'}),'FULFIL_CASE_GROWTH'),'CLOSE_CASE_GROWTH');
s=a(a(s,'START_COLLECTION'),'SIGN_COLLECTION',{model:'own',style:'botanical'});s=a(a(a(s,'OPEN_COLLECTION_PITCH',{buyerId:'atelier'}),'SIGN_COLLECTION_PITCH',{optionId:'sleeve'}),'FULFIL_COLLECTION');s=a(s,'CLOSE_COLLECTION');
s=a(s,'OPEN_CASE_GROWTH',{referrerId:products[0]});s=a(a(a(s,'SIGN_CATALOGUE_ORDER',{lampVersion:'standard'}),'FULFIL_CASE_GROWTH'),'CLOSE_CASE_GROWTH');
const other=products[0]==='mira'?'samir':'mira';s=a(s,'START_CURATION',{clientId:other});s=a(s,'SIGN_CURATION',{products:['mira','samir','ines'],quantity:40,packaging:'plain'});s=a(s,'FULFIL_CURATION');
s=a(s,'OPEN_CASE_GROWTH',{referrerId:other});s=a(s,'SIGN_CASE_GROWTH',{agreement:'private',products:['mira','samir','ines'],packaging:'plain',terms:'delivery'});s=a(s,'FULFIL_CASE_GROWTH');s=a(s,'CLOSE_CASE_GROWTH');return s;
}

test('an actual group relationship is not an invitation without a feasible use; the independent buyer stays available',()=>{
 const s=route(['mira','ines']),e=studioProjectEligibility(s,'group');assert.deepEqual([s.day,s.cash],[84,23450]);assert.equal(e.valid,true);assert.deepEqual(e.briefs,[]);assert.equal(e.canOffer,false);
 const offer=studioProjectInvite(s);assert.doesNotMatch(offer,/data-studio-direction="group"/);assert.match(offer,/data-studio-direction="independent"/);
 assert.equal(cooperationChapter(s).nextAction?.direction,'independent');
 // A previously opened draft remains recoverable and has a truthful way out.
 const old=a(s,'OPEN_STUDIO_PROJECT',{direction:'group'});assert.deepEqual(normalizeDealRoom(old),old);
 const html=studioProjectView(old);assert.match(html,/这份原稿没有杯/);assert.match(html,/data-action="KEEP_STUDIO_PROJECT"/);assert.doesNotMatch(html,/data-action="REVIEW_STUDIO_PROJECT"|data-action="SIGN_STUDIO_PROJECT_ORDER"/);
});
function delivered(s,brief){
 s=a(s,'OPEN_STUDIO_PROJECT',{direction:'group'});
 if(s.studioProject.briefId!==brief)s=a(s,'SET_STUDIO_PROJECT',{field:'briefId',value:brief});
 for(const [field,value] of Object.entries(brief==='bedside'?{lampVersion:'developed',layout:'table',light:'soft'}:{layout:'table'}))s=a(s,'SET_STUDIO_PROJECT',{field,value});
 s=a(s,'REVIEW_STUDIO_PROJECT');const q=previewStudioProjectOrder(s,s.studioProject);if(q.waitingUntil>s.day)s=a(s,'WAIT_STUDIO_PROJECT');
 s=a(a(a(s,'SIGN_STUDIO_PROJECT_ORDER'),'FULFIL_CASE_GROWTH'),'CLOSE_CASE_GROWTH');return a(s,'OPEN_STUDIO_PROJECT',{direction:'group'});
}
test('two-product contracts close the actual group use without soliciting an impossible second installation; three products keep the other commission',()=>{
 for(const [pair,brief,day,cash] of [[['mira','samir'],'bedside',97,26980],[['samir','ines'],'welcome',101,24740]]){
  const s=delivered(route(pair),brief),copy=structuredClone(s),html=studioProjectView(s);
  assert.deepEqual([s.day,s.cash],[day,cash]);assert.match(html,/60 组已交付/);assert.match(html,/已在使用/);assert.doesNotMatch(html,/data-action="PROPOSE_GROUP_CHANGE"|可以为这里准备一份方案/);
  const home=a(s,'KEEP_STUDIO_PROJECT');assert.match(studioProjectInvite(home),/已交付；可回看场所里正在使用的用品/);assert.deepEqual(s,copy);
 }
 const broad=delivered(route(['mira','samir','ines']),'bedside');assert.match(studioProjectView(broad),/data-action="PROPOSE_GROUP_CHANGE"/);
 assert.equal(a(broad,'PROPOSE_GROUP_CHANGE').studioProject.briefId,'welcome');
});
test('the bundled home desk opens the real available tea-table brief, preserves a saved draft, and never issues a purchase',async()=>{
 const script=(await buildDealHtml()).match(/<script>([\s\S]*?)<\/script>/)[1];
 let html='',nodes=new Map();const root={get innerHTML(){return html;},set innerHTML(v){html=v.replace(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/g,'image');nodes=new Map();},querySelector:k=>k==='#motion'?{}:null,querySelectorAll:k=>{
  if(k!=='[data-studio-direction]')return [];if(!nodes.has(k))nodes.set(k,[...html.matchAll(/data-studio-direction="([^"]+)"/g)].map(m=>({dataset:{studioDirection:m[1]}})));return nodes.get(k);
 }};
 const context=vm.createContext({TextEncoder,structuredClone,document:{querySelector:()=>root,documentElement:{classList:{contains:()=>false,add(){}}}},localStorage:{getItem:()=>null,setItem(){}}});
 new vm.Script(script).runInContext(context,{timeout:3000});
 const enter=s=>{context.fixture=s;vm.runInContext('state=structuredClone(fixture);render();',context);};
 const saved=()=>JSON.parse(vm.runInContext('JSON.stringify(state)',context));
 const s=route(['samir','ines']);for(const [direction,brief] of [['group','welcome'],['independent','hosting']]){
  enter(s);const button=root.querySelectorAll('[data-studio-direction]').find(n=>n.dataset.studioDirection===direction);assert.ok(button,direction);button.onclick();
  const opened=saved();assert.deepEqual([opened.studioProject.briefId,opened.studioProject.status,opened.cash,opened.day],[brief,'draft',s.cash,s.day]);assert.deepEqual(opened.caseGrowthHistory,s.caseGrowthHistory);assert.deepEqual(normalizeDealRoom(opened),opened);
  const draft=a(a(opened,'SET_STUDIO_PROJECT',{field:'layout',value:'shelf'}),'KEEP_STUDIO_PROJECT');
  enter(draft);root.querySelectorAll('[data-studio-direction]').find(n=>n.dataset.studioDirection===direction).onclick();
  assert.deepEqual(saved().studioProject,draft.studioProjectDrafts[direction]);
 }
});
