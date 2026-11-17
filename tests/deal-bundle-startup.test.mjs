import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {buildDealHtml} from '../scripts/build-deal-standalone.mjs';
import {createDealRoom,reduceDealRoom,normalizeDealRoom} from '../src/deal-room-engine.js';

// Executes the WHOLE shipped inline script, not extracted render expressions.
// Minimal DOM boundary only: no layout, images, browser permissions or user events.
// Unsupported APIs deliberately throw rather than being swallowed by a broad Proxy.
const html=await buildDealHtml();
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
assert.equal(scripts.length,1,'modern artifact must have exactly one executable bundle');
const script=scripts[0],key='trade-tycoon:deal-room-offline:v1';
function boot(source,raw=null){
 const values=new Map(raw===null?[]:[[key,raw]]),motion={onclick:null};
 const root={innerHTML:'',querySelector(selector){return selector==='#motion'?motion:null;},querySelectorAll(){return [];}};
 const classes=new Set();
 const document={querySelector(selector){assert.equal(selector,'#deal-room');return root;},documentElement:{classList:{contains:c=>classes.has(c),add:c=>classes.add(c)}}};
 const context=vm.createContext({document,localStorage:{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v))},TextEncoder,structuredClone,console});
 new vm.Script(source,{filename:'modern-standalone-startup.js'}).runInContext(context,{timeout:3000});
 assert.ok(root.innerHTML.length>1000,'startup must render real content, not merely parse');
 assert.match(root.innerHTML,/class="workspace/);
 assert.equal(typeof motion.onclick,'function','startup reaches final event binding');
 return {markup:root.innerHTML,values};
}
function pitchSave(){
 const act=(s,type,extra={})=>{const n=reduceDealRoom(s,{type,...extra});assert.notEqual(n,s,type);return n;};
 let s=createDealRoom();for(const optionId of ['trial','ready','small'])for(const a of [{type:'PROPOSE',optionId},{type:'ADVANCE'},{type:'NEXT_CLIENT'}])s=reduceDealRoom(s,a);
 s=act(s,'START_OPENING_CURATION',{clientId:'mira'});s=act(s,'SIGN_CURATION',{products:['mira','samir'],quantity:40,packaging:'plain'});s=act(s,'FULFIL_CURATION');s=act(s,'START_COLLECTION');s=act(s,'SIGN_COLLECTION',{model:'own',style:'botanical'});s=act(s,'OPEN_COLLECTION_PITCH',{buyerId:'northline'});s=act(s,'SIGN_COLLECTION_PITCH',{optionId:'retain'});s=act(s,'FULFIL_COLLECTION');s=act(s,'OPEN_COLLECTION_PITCH',{buyerId:'atelier'});
 assert.deepEqual(normalizeDealRoom(s),s);return JSON.stringify(s);
}
test('full modern bundle boots new progress and reaches rendered controls',()=>{assert.match(boot(script).markup,/Mira/);});
test('full modern bundle reloads legal saved pitch whose exclusive option is unavailable',()=>{
 const raw=pitchSave(),result=boot(script,raw);assert.match(result.markup,/Atelier/);assert.match(result.markup,/保留/);assert.equal(result.values.get(key),raw,'opening the page must not rewrite the saved contract');
});
test('startup harness detects the historical state-before-initialization TDZ, unlike syntax-only checks',()=>{
 const anchor="let state=createDealRoom(),selected=''";assert.equal(script.split(anchor).length,2);
 const regressed=script.replace(anchor,'void state.collection;\n'+anchor);
 assert.doesNotThrow(()=>new vm.Script(regressed));
 assert.throws(()=>boot(regressed),error=>error.name==='ReferenceError'&&/before initialization/.test(error.message));
});
test('full bundle boots completed-case home with supplier opportunity',()=>{
 let s=JSON.parse(pitchSave());s=reduceDealRoom(s,{type:'BACK_COLLECTION_PITCH'});s=reduceDealRoom(s,{type:'CLOSE_COLLECTION'});assert.ok(['review','complete'].includes(s.phase));
 const result=boot(script,JSON.stringify(s));assert.ok(result.markup.includes('合作正在长大'));
 const regressed=script.replace(/return \{SAMPLE_FACTORIES,[^}]+\};/,exports=>exports.replace(',hasLampDevelopmentCase',''));assert.notEqual(regressed,script);assert.throws(()=>boot(regressed,JSON.stringify(s)),error=>/hasLampDevelopmentCase/.test(error.message));
});
test('whole standalone boots second supplier draft, received and accepted cabinet',()=>{
 const a=(s,type,x={})=>reduceDealRoom(s,{type,...x}),finish=(s,id)=>a(a(a(s,'PROPOSE',{optionId:id}),'ADVANCE'),'NEXT_CLIENT');
 let s=createDealRoom();for(const id of ['trial','ready','season'])s=finish(s,id);s=a(s,'CONTINUE_BUSINESS');for(let i=0;i<2;i++){s=a(s,'SELECT_CLIENT',{clientId:'mira'});s=finish(s,'repeat-small');}s=a(a(s,'START_SUPPLY_PLAN',{clientId:'mira',firstBatch:'small',payment:'delivery'}),'FULFIL_SUPPLY_PLAN');s=a(a(s,'START_DEVELOPMENT'),'COMMISSION_SAMPLE',{factory:'line'});s=a(a(s,'RECEIVE_SAMPLE'),'ACCEPT_SAMPLE');s=a(s,'OPEN_SECOND_SUPPLIER');assert.match(boot(script,JSON.stringify(s)).markup,/委托这家出样/);s=a(a(s,'COMMISSION_SECOND_SAMPLE'),'RECEIVE_SECOND_SAMPLE');assert.match(boot(script,JSON.stringify(s)).markup,/ACCEPT_SECOND_SAMPLE/);s=a(a(s,'ACCEPT_SECOND_SAMPLE'),'OPEN_SECOND_SUPPLIER');assert.match(boot(script,JSON.stringify(s)).markup,/data-light/);s=a(s,'CLOSE_SECOND_SUPPLIER');const cabinet=boot(script.replace("let careerFocus=''","let careerFocus='product'"),JSON.stringify(s)).markup;assert.match(cabinet,/暖光标准台灯 · 量产留样/);assert.match(cabinet,/三档调光台灯 · 工作室留样/);s=a(s,'START_OPENING_CURATION',{clientId:'mira'});const curation=boot(script,JSON.stringify(s)).markup;assert.match(curation,/data-lamp-version="developed"/);assert.doesNotMatch(curation,/新工厂至少180盏起做，这份40\/60套组合仍用原供应商/);
});
