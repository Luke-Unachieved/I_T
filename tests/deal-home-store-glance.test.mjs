import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {createDealRoom,reduceDealRoom,normalizeDealRoom} from '../src/deal-room-engine.js';
import {accountCompletionGlance,businessHomeView,hasNextStudioUse} from '../src/deal-room-home.js';
import {studioProjectEligibility} from '../src/deal-room-studio-project.js';
const actions=JSON.parse(fs.readFileSync(new URL('fixtures/deal-group-day169-actions.json',import.meta.url)));
const mature=()=>reduceDealRoom(actions.reduce(reduceDealRoom,createDealRoom()),{type:'CLOSE_STUDIO_PROJECT'});
const context={career:{eligible:false,reason:''},referrals:[]};
test('six fulfilled stores are visible on home before optional archives without changing state',()=>{
 const s=mature(),before=structuredClone(s),h=businessHomeView(s,context),g=accountCompletionGlance(s);
 assert.equal((g.match(/role="listitem"/g)||[]).length,6);assert.match(g,/六家店都已收货/);assert.match(g,/货款已收齐/);
 assert.ok(h.indexOf('account-completion-glance')<h.indexOf('class="other-business"'));
 assert.deepEqual(s,before);assert.deepEqual(normalizeDealRoom(s),s);
 for(const history of [[],s.accountHistory.slice(0,1),s.accountHistory.map(x=>({...x,status:'production'}))])assert.equal(accountCompletionGlance({...s,accountHistory:history}),'');
});
test('store labels preserve distinct actual batch versions and escape display text',()=>{
 const s={accountHistory:[{status:'paid',stores:3,seriesSource:{label:'原稿植物版'}},{status:'paid',stores:3,seriesSource:{label:'潮汐 <script> 版'}}]};const h=accountCompletionGlance(s);
 assert.match(h,/3 家店 · 原稿植物版/);assert.match(h,/3 家店 · 潮汐 &lt;script&gt; 版/);assert.doesNotMatch(h,/<script>/);
 assert.equal((h.match(/第 \d 家店已收货/g)||[]).length,6);
});
test('completed career offers reveal only existing unfinished use briefs, not invented projects',()=>{
 const s=mature(),h=businessHomeView(s,context);assert.equal(hasNextStudioUse(s),true);assert.match(h,/<details class="career-alternatives" open><summary>下一份用途合作/);
 const done=structuredClone(s);for(const direction of ['independent','group']){const e=studioProjectEligibility(done,direction);if(e.valid)for(const studioBrief of e.briefs)done.caseGrowthHistory.push({status:'paid',purpose:'studio-project',studioDirection:direction,referrerId:e.referrerId,studioBrief,agreement:e.agreement,products:[],quantity:1,deliveryDay:done.day,netProfit:0});}
 // Read-only display fixture represents all available briefs having deliveries.
 assert.equal(hasNextStudioUse(done),false);assert.doesNotMatch(businessHomeView(done,context),/下一份用途合作/);
 assert.equal(hasNextStudioUse(createDealRoom()),false);assert.doesNotMatch(businessHomeView(createDealRoom(),context),/下一份用途合作/);
});
test('office and life entries have shared touch and visible keyboard focus styles',()=>{
 const css=fs.readFileSync(new URL('../src/deal-room.css',import.meta.url),'utf8');assert.match(css,/\.office-entry button,\.personal-life-entry button\{[^}]*min-height:44px/);assert.match(css,/\.office-entry button:focus-visible,\.personal-life-entry button:focus-visible\{[^}]*outline:3px/);assert.match(css,/grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
});
test('whole standalone starts mature home with completion strip and existing next-use actions',async()=>{
 const {buildDealHtml}=await import('../scripts/build-deal-standalone.mjs'),vm=await import('node:vm');
 const script=(await buildDealHtml()).match(/<script>([\s\S]*?)<\/script>/)[1],s=mature();
 const root={innerHTML:'',querySelector(sel){return sel==='#motion'?{}:null;},querySelectorAll(){return [];}};
 const ctx=vm.createContext({document:{querySelector:()=>root,documentElement:{classList:{contains:()=>false,add(){}}}},localStorage:{getItem:()=>JSON.stringify(s),setItem(){}},TextEncoder,structuredClone,console});
 new vm.Script(script).runInContext(ctx,{timeout:3000});assert.match(root.innerHTML,/六家店都已收货/);assert.match(root.innerHTML,/下一份用途合作/);
});
