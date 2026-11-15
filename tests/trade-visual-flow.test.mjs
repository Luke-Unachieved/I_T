import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import * as economy from '../src/trade-economy.js';
const app=await readFile(new URL('../src/trade-app.js',import.meta.url),'utf8');
function boot(s){
 const raw=JSON.stringify(s),nodes=new Map(),storage=new Map([['trade-tycoon:data:v2',raw]]);
 const node=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',addEventListener(){},classList:{add(){},remove(){}}});return nodes.get(id);};
 const c=vm.createContext({...economy,document:{querySelector:node},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},setTimeout:()=>0,clearTimeout(){},window:{scrollTo(){}}});
 vm.runInContext(app.replace(/^import[^\n]+\n/,''),c);return {c,storage,raw};
}
test('network is read-only, separates actual production/transport from collected delivery',()=>{
 const {c,storage,raw}=boot(economy.createTradeGame('港口'));
 c.fixture=[{offer:{market:'asia'},paidShipping:false},{offer:{market:'middle'},paidShipping:true},{offer:{market:'middle'},paidShipping:true}];
 vm.runInContext('state.active=fixture;state.receivables=[{amount:900,dueDay:20}];state.metrics.orders=3;',c);
 const html=vm.runInContext('tradeNetwork()',c);
 assert.match(html,/生产 1 单，运输 2 单，待收尾款 1 笔/);
 assert.match(html,/2 单履约 · 2 单运输/);assert.equal((html.match(/network-route carrying/g)||[]).length,1);
 assert.match(html,/尚未开通/);assert.match(html,/非实时船位/);assert.equal(storage.get('trade-tycoon:data:v2'),raw);
});
test('fresh company has no fake shipments or live animation',()=>{
 const {c}=boot(economy.createTradeGame('港口'));
 const html=vm.runInContext('tradeNetwork()',c);
 assert.match(html,/生产 0 单，运输 0 单，待收尾款 0 笔/);assert.doesNotMatch(html,/network-route carrying|animateMotion/);
});
test('contract timeline uses paid shipping flag, not passage of date alone',()=>{
 const {c}=boot(economy.createTradeGame('港口'));
 c.order={acceptedDay:1,shipDay:15,deliveryDay:29,dueDay:43,paidShipping:false};
 const production=vm.runInContext('contractStages(order)',c);
 assert.match(production,/class="current"[^]*?<strong>出运<\/strong>/);
 c.order.paidShipping=true;const transport=vm.runInContext('contractStages(order)',c);
 assert.match(transport,/class="current"[^]*?<strong>交付<\/strong>/);
 assert.equal((transport.match(/class="done"/g)||[]).length,2);assert.match(transport,/第 43 天/);
});
test('cost composition displays engine amounts with loss and spot-estimate labels',()=>{
 const {c}=boot(economy.createTradeGame('港口'));
 c.quote={cost:1000,freight:100,fx:{fee:20,mode:'spot'},penalty:10,profit:200};
 let html=vm.runInContext('profitComposition(quote)',c);
 for(const value of ['¥1,000','¥100','¥20','¥10','¥200'])assert.ok(html.includes(value));
 assert.match(html,/利润为估值/);assert.doesNotMatch(html,/NaN|Infinity/);
 c.quote.profit=-120;html=vm.runInContext('profitComposition(quote)',c);assert.match(html,/成本超过收入 ¥120/);assert.doesNotMatch(html,/class="profit"/);
});
test('empty cost composition remains finite and all legacy save bytes stay untouched',()=>{
 const {c,storage,raw}=boot(economy.createTradeGame('港口'));
 c.quote={cost:0,freight:0,penalty:0,profit:0};const html=vm.runInContext('profitComposition(quote)',c);
 assert.doesNotMatch(html,/NaN|Infinity/);assert.equal(storage.get('trade-tycoon:data:v2'),raw);
});
test('cash calendar keeps a common amount scale, negatives and exact figures',()=>{
 const {c,storage,raw}=boot(economy.createTradeGame('港口'));
 c.forecast={points:[{day:1,inflow:0,outflow:0,cash:18000},{day:2,inflow:1000,outflow:2000,cash:-100},{day:3,inflow:0,outflow:0,cash:-100}]};
 const html=vm.runInContext('forecastSummary(forecast)',c);
 assert.match(html,/所有柱条使用同一金额尺度/);assert.match(html,/width:50%/);assert.match(html,/width:100%/);assert.match(html,/cash-balance negative/);assert.match(html,/−¥100/);assert.match(html,/无回款/);assert.doesNotMatch(html,/NaN|Infinity/);assert.equal(storage.get('trade-tycoon:data:v2'),raw);
});
test('empty future cash calendar is finite without fabricated transactions',()=>{
 const {c}=boot(economy.createTradeGame('港口'));c.forecast={points:[{day:1,inflow:0,outflow:0,cash:0}]};
 const html=vm.runInContext('forecastSummary(forecast)',c);assert.match(html,/width:0%/);assert.doesNotMatch(html,/NaN|Infinity/);
});
test('finished-run results are collapsed, without removing results or cash warnings',()=>{
 const {c}=boot(economy.createTradeGame('收口'));
 vm.runInContext('state.ending={day:134,orders:9,netWorth:66633}',c);
 const html=vm.runInContext('desk()',c);assert.match(html,/milestone-fold"><details><summary>第一程已达成/);assert.match(html,/66,633/);assert.match(html,/本周询盘/);assert.doesNotMatch(html,/milestone-fold"><details open/);
});
test('cost legend labels do not repeat the exact breakdown amounts',()=>{
 const {c}=boot(economy.createTradeGame('收口'));c.quote={cost:1000,freight:100,profit:200};
 const html=vm.runInContext('profitComposition(quote)',c);const legend=html.split('class="cost-legend"')[1];assert.match(legend,/采购/);assert.doesNotMatch(legend,/¥/);assert.match(html,/采购 ¥1,000/);
});
test('inquiry baseline loss is styled as negative, not profitable green',()=>{
 const {c}=boot(economy.createTradeGame('亏损报价'));
 c.quoteOrder=(s,id)=>({profit:-321,revenue:1000});
 const html=vm.runInContext('desk()',c);assert.match(html,/class="number negative"><strong>−¥321/);assert.doesNotMatch(html,/class="number positive"><strong>−¥321/);
});
test('inquiries precede the operational map and goals no longer duplicate routes',()=>{
 const {c}=boot(economy.createTradeGame('先接单'));const html=vm.runInContext('desk()',c);
 assert.ok(html.indexOf('本周询盘')<html.indexOf('生意在路上'));assert.match(html,/<aside class="aside"><section class="panel trade-network"/);
 const goal=vm.runInContext('goals()',c);assert.doesNotMatch(goal,/route-map|<svg/);assert.match(goal,/欧洲框架试单/);
});
