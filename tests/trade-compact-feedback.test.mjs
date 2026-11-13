import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import * as economy from '../src/trade-economy.js';
const source=await readFile(new URL('../src/trade-app.js',import.meta.url),'utf8');
function boot(state){
 const storage=new Map([['trade-tycoon:data:v2',JSON.stringify(state)]]),nodes=new Map();
 const node=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',addEventListener(){},classList:{add(){},remove(){}}});return nodes.get(id);};
 const c=vm.createContext({...economy,document:{querySelector:node},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},window:{scrollTo(){}},setTimeout:()=>0,clearTimeout(){}});
 vm.runInContext(source.replace(/^import[^\n]+\n/,''),c);return {c,storage};
}
test('compact forecast retains all inflow/outflow and offers full daily detail',()=>{
 const s=economy.createTradeGame('测试'),{c,storage}=boot(s);const raw=storage.get('trade-tycoon:data:v2');
 const html=vm.runInContext('forecastSummary(forecastCash(state))',c);
 const before=html.split('<details')[0];assert.equal((before.match(/<tr>/g)||[]).length,8); // header + current + 6 operating days
 assert.match(html,/<details class="forecast-details"><summary>查看全部 43 天明细/);
 assert.equal((html.match(/<tr>/g)||[]).length,52);
 assert.equal(storage.get('trade-tycoon:data:v2'),raw);
});
test('next node selects earliest actual ship, delivery or receipt and escapes customer',()=>{
 const {c}=boot(economy.createTradeGame('测试'));
 vm.runInContext("state.active=[{paidShipping:false,shipDay:15,deliveryDay:29,offer:{customer:'<img>'}}];state.receivables=[{dueDay:8,customer:'早回款'}]",c);
 assert.match(vm.runInContext('nextMilestone()',c),/回款 · 第 8 天/);
 vm.runInContext('state.receivables=[]',c);const html=vm.runInContext('nextMilestone()',c);assert.match(html,/出运 · 第 15 天/);assert.match(html,/&lt;img&gt;/);
});
test('receipts appear on every tab, persist across quiet days, and can dismiss',()=>{
 const {c}=boot(economy.createTradeGame('测试'));
 vm.runInContext("lastReceipt={day:29,orders:1,profit:500,receipts:0,cash:-120,reputation:2,markets:0,estimated:1}",c);
 for(const tab of ['desk','market','company','ledger']){c.targetTab=tab;const html=vm.runInContext('tab=targetTab;shell()',c);assert.match(html,/第 29 天 · 经营回执/);assert.match(html,/实际回款/);assert.match(html,/浮动尾款估值/);}
 vm.runInContext("apply({type:'NEXT_DAY'})",c);assert.equal(vm.runInContext('lastReceipt.day',c),29);
 vm.runInContext("handle({target:{closest:()=>({dataset:{action:'receipt-dismiss'}})}})",c);assert.equal(vm.runInContext('lastReceipt',c),null);
});
test('air copy makes no same-day delivery promise, original contract timing remains unchanged',()=>{
 assert.doesNotMatch(source,/当日送达/);assert.doesNotMatch(economy.SHIPPING.find(s=>s.id==='air').description,/当天送达/);
 assert.equal(economy.SHIPPING.find(s=>s.id==='air').days,0);
});
