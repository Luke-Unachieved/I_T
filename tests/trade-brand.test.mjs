import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import * as economy from '../src/trade-economy.js';
const app=await readFile(new URL('../src/trade-app.js',import.meta.url),'utf8');
const key='trade-tycoon:data:v2';
function boot(entries=[]){
 const storage=new Map(entries),elements=new Map();
 const node=id=>{if(!elements.has(id))elements.set(id,{innerHTML:'',addEventListener(){},close(){this.open=false;},querySelector(){return node('child');},classList:{add(){},remove(){}}});return elements.get(id);};
 const context=vm.createContext({...economy,document:{querySelector:node},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},window:{scrollTo(){}},setTimeout,clearTimeout,console});
 vm.runInContext(app.replace(/^import[^\n]+\n/,''),context);
 return {storage,elements,context};
}
test('new title is consistent and current navigation does not expose the retired mode',async()=>{
 for(const file of ['index.html','trade.html'])assert.match(await readFile(new URL('../'+file,import.meta.url),'utf8'),/<title>外贸不靠外貌<\/title>/);
 assert.doesNotMatch(app,/向海而生|外贸达人|href="classic.html"|原版入口/);
 const {elements}=boot();assert.match(elements.get('#trade-app').innerHTML,/外贸不靠<br>外貌/);
 assert.doesNotMatch(elements.get('#trade-app').innerHTML,/classic.html/);
});
test('renaming keeps existing company name, progress and all legacy save bytes unchanged',()=>{
 const state=economy.createTradeGame('向海贸易'),raw=JSON.stringify(state),legacy='legacy-exact-bytes';
 const {storage,elements,context}=boot([[key,raw],['trade-tycoon:v1',legacy],['trade-tycoon:standalone:v1',legacy]]);
 assert.equal(storage.get(key),raw);assert.equal(storage.get('trade-tycoon:v1'),legacy);assert.equal(storage.get('trade-tycoon:standalone:v1'),legacy);
 assert.match(elements.get('#trade-app').innerHTML,/向海贸易/);
 for(const tab of ['market','company','ledger','desk']){vm.runInContext(`tab='${tab}';render()`,context);assert.doesNotMatch(elements.get('#trade-app').innerHTML,/href="classic.html"/);}
 assert.equal(storage.get(key),raw);
});
test('release preserves the old link without branding the current game as the old title',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../artifacts/data-v2/release-manifest.json',import.meta.url),'utf8'));
 assert.equal(manifest.title,'外贸不靠外貌');assert.equal(manifest.saveKey,key);assert.equal(manifest.legacy,'classic.html');
 const classic=await readFile(new URL('../artifacts/data-v2/classic.html',import.meta.url));
 const original=await readFile(new URL('../artifacts/standalone-v101/外贸达人养成记-v1.0.1.html',import.meta.url));assert.deepEqual(classic,original);
});

test('confirmed import clears old delivery receipt and fast-forward intent, keeps imported progress',()=>{
 const before=economy.createTradeGame('原公司'), imported=economy.createTradeGame('导入公司');
 const {context,storage}=boot([[key,JSON.stringify(before)],['trade-tycoon:v1','untouched']]);
 context.importFixture=imported;
 vm.runInContext("lastReceipt={orders:2,profit:800,cash:900,markets:1};lastAdvance={remainingDays:3,pause:{code:'funding_shortfall'}};importCandidate=importFixture;handle({target:{closest:()=>({dataset:{action:'confirm-import'}})}})",context);
 assert.equal(vm.runInContext('lastReceipt',context),null);assert.equal(vm.runInContext('lastAdvance',context),null);
 assert.equal(JSON.parse(storage.get(key)).name,'导入公司');assert.equal(JSON.parse(storage.get(key+':before-import')).name,'原公司');
 assert.equal(storage.get('trade-tycoon:v1'),'untouched');
 const after=storage.get(key);vm.runInContext("handle({target:{closest:()=>({dataset:{action:'confirm-advance'}})}})",context);assert.equal(storage.get(key),after);
 const reloaded=boot([...storage]);assert.equal(reloaded.storage.get(key),after);
});
