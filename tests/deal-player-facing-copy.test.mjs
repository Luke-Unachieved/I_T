import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {launchView,launchInvite} from '../src/deal-room-launch-view.js';
import {revisionView} from '../src/deal-room-revision-view.js';
import {supplyDraftView} from '../src/deal-room-supply-view.js';
import {careerRecapView} from '../src/deal-room-home.js';

function launchState(privateLabel=false){return {collection:{model:privateLabel?'private':'own',exclusiveBuyer:privateLabel?undefined:'atelier',style:'cream',products:['mira','samir'],orders:[{status:'paid',buyerId:privateLabel?'northline-private':'atelier',buyer:privateLabel?'Northline':'Atelier',scope:'whole-exclusive',sets:80,paymentDay:20}]},launchProject:{status:'handed',arrangement:'set',lead:'mira'}};}
test('handover copy describes the player result without erasing exclusivity or changing state',()=>{
 for(const privateLabel of [false,true]){const s=launchState(privateLabel),before=structuredClone(s),html=launchView(s)+launchInvite(s);
 assert.match(html,/陈列交接完成，门店准备上新/);assert.match(html,privateLabel?/不可转售给其他客户/:/本系列仅供这位买手/);
 assert.doesNotMatch(html,/查看不会新增采购|旧合同与权利不变|不扩大或解除/);assert.deepEqual(s,before);}
});
test('new sample still discloses upfront investment, time and absence of an order',()=>{
 const s={cash:5000,collectionRevision:{status:'draft'}},before=structuredClone(s),html=revisionView(s);
 assert.match(html,/¥3,200/);assert.match(html,/4 天开支 ¥120/);assert.match(html,/出样后还需争取买手订单/);assert.deepEqual(s,before);
 const low=revisionView({...s,cash:3319});assert.match(low,/COMMISSION_COLLECTION_REVISION" disabled/);
});
test('two-lot proposal keeps its discount, deposit and payment timing prominent',()=>{
 const o={clients:[{id:'mira',name:'Mira'}]},d={clientId:'mira',payment:'deposit'},p={lots:[{quantity:60,deliveryDay:5},{quantity:120,deliveryDay:9}],deposit:1000,balanceDue:2000,finishDay:13,cashRequired:1500,netProfit:510,valid:true};
 const before=structuredClone(p),html=supplyDraftView(o,d,p);
 assert.match(html,/预计净赚/);assert.match(html,/让价 4%/);assert.match(html,/末批交货后 4 天结清/);assert.match(html,/签约先收 ¥1,000/);assert.match(html,/尾款 ¥2,000/);assert.deepEqual(p,before);
});
test('recap never claims a save succeeded and retains the paused-time explanation',()=>{
 const s={day:1,cash:5000,contracts:[],curationHistory:[],accountHistory:[]};const before=structuredClone(s),html=careerRecapView(s);
 assert.doesNotMatch(html,/进度已保存|不能把已经给出的承诺抹掉|已签承诺与客户记录保留/);assert.match(html,/离开页面不会自动推进日期或扣款/);assert.deepEqual(s,before);
});
test('view copy bans only specific developer explanations, not financial or rights terms',()=>{
 const targets={
  'deal-room-account.js':[/不自动借用其他客户的专用版本/,/不会替旧店换货/],
  'deal-room-studio-project-view.js':[/不再整套重买/,/原合同、已确认规格和客户用品保留/],
  'deal-room-revision-view.js':[/不和旧版授权混算/,/这单净赚不等于整版回本/]
 };
 for(const [file,patterns] of Object.entries(targets)){const source=readFileSync(new URL('../src/'+file,import.meta.url),'utf8');for(const pattern of patterns)assert.doesNotMatch(source,pattern);}
 const account=readFileSync(new URL('../src/deal-room-account.js',import.meta.url),'utf8');assert.match(account,/本单不含原 3 家店换货/);assert.match(account,/新增 3 店预计净赚/);
 const revision=readFileSync(new URL('../src/deal-room-revision-view.js',import.meta.url),'utf8');assert.match(revision,/未计入本单预计净赚/);assert.match(revision,/仅潮汐版专供Northline/);
});
