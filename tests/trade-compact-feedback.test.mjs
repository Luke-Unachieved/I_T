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
 const before=html.split('<details')[0];assert.equal((before.match(/class="cash-day"/g)||[]).length,7); // current + 6 operating days, now visual rows
 assert.match(html,/<details class="forecast-details"><summary>查看全部 43 天明细/);
 assert.equal((html.match(/<tr>/g)||[]).length,44);
 assert.equal(storage.get('trade-tycoon:data:v2'),raw);
});
test('next node selects earliest actual ship, delivery or receipt and escapes customer',()=>{
 const {c}=boot(economy.createTradeGame('测试'));
 vm.runInContext("state.active=[{paidShipping:false,shipDay:15,deliveryDay:29,offer:{customer:'<img>'}}];state.receivables=[{dueDay:8,customer:'早回款'}]",c);
 assert.match(vm.runInContext('nextMilestone()',c),/回款 · 第 8 天/);
 vm.runInContext('state.receivables=[];state.active.push({...state.active[0]})',c);const html=vm.runInContext('nextMilestone()',c);assert.match(html,/出运 · 第 15 天/);assert.match(html,/&lt;img&gt;/);
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
test('ledger shows ten recent entries and preserves escaped older history in disclosure',()=>{
 const {c}=boot(economy.createTradeGame('测试'));
 vm.runInContext("state.log=Array.from({length:60},(_,i)=>({day:60-i,text:'流水 '+i+' <img>'}))",c);
 const html=vm.runInContext('ledger()',c);
 assert.match(html,/查看更早 50 条流水/);
 const history=html.slice(html.indexOf('<h2>流水</h2>'));
 assert.equal((history.split('查看更早')[0].match(/流水 \d+ &lt;img&gt;/g)||[]).length,10);
 assert.equal((history.match(/流水 \d+ &lt;img&gt;/g)||[]).length,60);
 assert.equal(vm.runInContext('state.log.length',c),60);
 vm.runInContext('state.log=state.log.slice(0,5)',c);
 assert.doesNotMatch(vm.runInContext('ledger()',c),/查看更早/);
});
test('completed goal card shows optional continuation instead of stale preparation instructions',()=>{
 const {c}=boot(economy.createTradeGame('测试'));
 assert.match(vm.runInContext('goals()',c),/先准备验货与周转能力/);
 vm.runInContext('state.ending={day:134,orders:10,netWorth:77314}',c);
 const html=vm.runInContext('goals()',c);
 assert.match(html,/第一程目标已全部达成/);
 assert.doesNotMatch(html,/先准备验货与周转能力|3 单解锁中东/);
});
