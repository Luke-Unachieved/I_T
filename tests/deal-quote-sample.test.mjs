import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {developedQuoteSample} from '../src/deal-room-samples.js';
const state={phase:'negotiating',businessRound:3,clientIndex:0,productDevelopment:{status:'active',factory:'studio'}};
test('selected accepted studio quote presents three actual sample light levels without state mutation',()=>{
 const before=structuredClone(state);for(let i=0;i<3;i++){const html=developedQuoteSample(state,'developed-lamp',i);assert.match(html,/本次报价型号/);assert.equal((html.match(/data-light=/g)||[]).length,3);assert.match(html,new RegExp(`data-light="${i}" aria-pressed="true"`));assert.ok(html.includes(`--sample-light:${[.25,.55,1][i]}`));}assert.deepEqual(state,before);
});
test('ordinary quote, unaccepted sample, line factory and unrelated buyer cannot show studio controls',()=>{
 assert.equal(developedQuoteSample(state,'repeat-small'),'');for(const change of [{phase:'fulfilling'},{clientIndex:1},{businessRound:0},{clientProjectActive:true},{productDevelopment:{status:'received',factory:'studio'}},{productDevelopment:{status:'active',factory:'line'}},{productDevelopment:null}])assert.equal(developedQuoteSample({...state,...change},'developed-lamp'),'');
});
test('app routes the selected sample into the existing table and reuses the existing light handler',async()=>{
 const app=await readFile(new URL('../src/deal-room-app.js',import.meta.url),'utf8');assert.match(app,/developedQuoteSample\(state,selected,sampleBrightness\)/);assert.match(app,/:quoteLampSample\|\|`<div class="sample-piece picked single">/);assert.match(app,/sampleBrightness=Number\(b.dataset.light\)/);
});
test('shipped bundle executes the actual developed quote render path with its sample helper in scope',async()=>{
 const {buildDealHtml}=await import('../scripts/build-deal-standalone.mjs'),vm=await import('node:vm');
 const script=(await buildDealHtml()).match(/<script>([\s\S]*?)<\/script>/)[1];
 const root={innerHTML:'',querySelector:s=>s==='#motion'?{}:null,querySelectorAll:()=>[]};
 const context=vm.createContext({TextEncoder,document:{querySelector:()=>root,documentElement:{classList:{contains:()=>false}}},localStorage:{getItem:()=>null,setItem(){}}});
 // Explicit render fixture, not a browser session or claimed legal save replay.
 const fixture={...state,day:52,cash:13320,history:[],contracts:[{clientId:'mira',clientName:'Mira · Forma 家居',status:'paid',quantity:60,product:'便携台灯',netProfit:100,deliveryDay:5}],feedback:{kind:'new-client',message:'看新型号'}};
 new vm.Script(script+'\nstate='+JSON.stringify(fixture)+';selected="developed-lamp";render();').runInContext(context,{timeout:3000});
 assert.match(root.innerHTML,/quote-lamp-sample/);assert.match(root.innerHTML,/本次报价型号/);assert.equal((root.innerHTML.match(/data-light=/g)||[]).length,3);
 new vm.Script('selected="repeat-small";render();').runInContext(context,{timeout:3000});assert.doesNotMatch(root.innerHTML,/quote-lamp-sample/);
});
