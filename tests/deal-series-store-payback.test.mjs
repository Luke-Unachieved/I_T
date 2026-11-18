import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {buildDealHtml} from '../scripts/build-deal-standalone.mjs';
import {createDealRoom,reduceDealRoom,normalizeDealRoom} from '../src/deal-room-engine.js';
import {collectionView} from '../src/deal-room-collection.js';
import {paidSeriesStoreOrders} from '../src/deal-room-account.js';
const act=(s,type,extra={})=>{const n=reduceDealRoom(s,{type,...extra});assert.notEqual(n,s,type);return n;};
const finish=(s,id)=>act(act(act(s,'PROPOSE',{optionId:id}),'ADVANCE'),'NEXT_CLIENT');
function series(products,both=false){
 let s=createDealRoom();for(const id of ['trial','ready','season'])s=finish(s,id);
 s=act(s,'CONTINUE_BUSINESS');for(const clientId of ['mira','samir'])s=finish(act(s,'SELECT_CLIENT',{clientId}),'repeat-scale');
 s=act(act(s,'START_SUPPLY_PLAN',{clientId:'samir',firstBatch:'small',payment:'delivery'}),'FULFIL_SUPPLY_PLAN');
 s=act(s,'START_OPENING_CURATION',{clientId:products[0]});s=act(act(s,'SIGN_CURATION',{products,quantity:40,packaging:'plain'}),'FULFIL_CURATION');
 s=act(act(s,'START_COLLECTION'),'SIGN_COLLECTION',{model:'own',style:'cream'});
 for(const buyerId of (both?['northline','atelier']:['northline']))s=act(act(act(s,'OPEN_COLLECTION_PITCH',{buyerId}),'SIGN_COLLECTION_PITCH',{optionId:'retain'}),'FULFIL_COLLECTION');
 return act(s,'CLOSE_COLLECTION');
}
const review=s=>collectionView(act(s,'OPEN_COLLECTION'),{});
const pilot=(s,basis='START_ACCOUNT_FROM_COLLECTION')=>act(act(act(act(s,basis,basis==='START_ACCOUNT'?{referrerId:'mira'}:{}),'SIGN_ACCOUNT',{optionId:'pilot'}),'FULFIL_ACCOUNT'),'CLOSE_ACCOUNT');
const expand=(s,basisId=null)=>{s=act(s,'OPEN_ACCOUNT_EXPANSION');if(basisId)s=act(s,'SET_ACCOUNT_EXPANSION_BASIS',{basisId});return act(act(act(s,'SIGN_ACCOUNT_EXPANSION'),'FULFIL_ACCOUNT_EXPANSION'),'CLOSE_ACCOUNT');};
const money=n=>'¥'+n.toLocaleString('zh-CN');
test('paid as-ordered six-store deliveries turn a reported sample loss into the actual gain for all three double-product originals',()=>{
 for(const [products,base,each,earned] of [[['mira','ines'],1800,2520,4350],[['mira','samir'],1980,3120,5730],[['samir','ines'],1680,2520,4230]]){
  const start=series(products);assert.ok(review(start).includes('还差 '+money(2490-base)+' 回本'));assert.equal(start.collection.orders[0].netProfit,base);
  const signed=act(act(start,'START_ACCOUNT_FROM_COLLECTION'),'SIGN_ACCOUNT',{optionId:'pilot'});assert.deepEqual(paidSeriesStoreOrders(signed),[]);
  const three=act(act(signed,'FULFIL_ACCOUNT'),'CLOSE_ACCOUNT');assert.equal(paidSeriesStoreOrders(three).length,1);
  assert.ok(review(three).includes('已赚到 '+money(base+each-2490)));
  const six=expand(three),before=structuredClone(six),html=review(six);assert.equal(six.day,67);
  assert.ok(html.includes('已赚到 '+money(earned)));assert.ok(html.includes('2 笔，6 家店，净赚 '+money(2*each)));
  assert.ok(!html.includes('还差'));assert.deepEqual(six,before);assert.deepEqual(normalizeDealRoom(six),six);
 }
});
test('generic and separately developed revision store batches do not pay back the original artwork a second time',()=>{
 const start=series(['mira','ines'],true),base=start.collection.orders.reduce((n,o)=>n+o.netProfit,0)-2490;
 const generic=pilot(start,'START_ACCOUNT');assert.ok(review(generic).includes('0 笔，0 家店，净赚 ¥0'));
 const mixed=expand(generic,'original'),second=mixed.accountHistory.at(-1);
 assert.ok(review(mixed).includes('已赚到 '+money(base+second.netProfit)));assert.ok(review(mixed).includes('1 笔，3 家店'));
 let r=act(act(act(start,'OPEN_COLLECTION_REVISION'),'COMMISSION_COLLECTION_REVISION'),'RECEIVE_COLLECTION_REVISION');
 r=act(act(act(r,'SIGN_COLLECTION_REVISION',{buyerId:'northline',scope:'revision-exclusive'}),'FULFIL_COLLECTION_REVISION'),'CLOSE_COLLECTION_REVISION');
 const both=expand(pilot(r),'revision:tidal-grid'),receipts=paidSeriesStoreOrders(both);assert.equal(receipts.length,2);
 assert.equal(receipts[1].seriesSource.versionId,'revision:tidal-grid');const html=review(both);assert.ok(html.includes('已赚到 '+money(base+receipts[0].netProfit)));assert.ok(html.includes('1 笔，3 家店'));
 // Wrong version/spec evidence and unsigned/unsatisfied contracts cannot inflate a project report.
 for(const mutate of [a=>a.seriesSource.orderIndex=99,a=>a.seriesSource.scope='whole-exclusive',a=>a.status='fulfilling',a=>a.products=['mira'],a=>a.unitPrice+=5]){
  const malformed=structuredClone(both);mutate(malformed.accountHistory[0]);assert.equal(paidSeriesStoreOrders(malformed).some(o=>!o.seriesSource.versionId),false);
 }
});
test('the bundled series board displays the paid-contract reconciliation without changing the game state',async()=>{
 const six=act(expand(pilot(series(['mira','ines']))),'OPEN_COLLECTION');
 const script=(await buildDealHtml()).match(/<script>([\s\S]*?)<\/script>/)[1];
 const root={innerHTML:'',querySelector:k=>k==='#motion'?{}:null,querySelectorAll:()=>[]};
 const ctx=vm.createContext({TextEncoder,structuredClone,document:{querySelector:()=>root,documentElement:{classList:{contains:()=>false,add(){}}}},localStorage:{getItem:()=>null,setItem(){throw Error('read-only visit cannot save')}}});
 new vm.Script(script).runInContext(ctx,{timeout:3000});ctx.fixture=six;vm.runInContext('state=structuredClone(fixture);render();',ctx);
 assert.match(root.innerHTML,/扣除出样后，已赚到 ¥4,350/);assert.match(root.innerHTML,/买手系列订单净赚 ¥1,800/);assert.match(root.innerHTML,/2 笔，6 家店，净赚 ¥5,040/);
 assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(state)',ctx)),six);
});
