import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import * as e from '../src/trade-economy.js';
const rich=()=>{const s=e.createTradeGame('扩张测试');s.cash=200000;s.metrics.orders=8;s.reputation=8;return s;};
const act=(s,type,extra={})=>e.reduceTrade(s,{type,...extra});
test('v5 old save migrates once without money, date or offer changes',()=>{
 const old=rich();old.ruleset=5;delete old.expansion;
 const n=e.parseTradeSave(old);assert.equal(n.ruleset,6);assert.deepEqual(n.expansion,{warehouse:0,branches:{}});
 assert.deepEqual({...n,ruleset:5,expansion:undefined},{...old,expansion:undefined});assert.deepEqual(e.parseTradeSave(n),n);
});
test('warehouse has explicit cost, slot, weekly overhead and quoted saving',()=>{
 const s=rich(),q=e.quoteOrder(s,s.offers[0].id),r=act(s,'EXPAND_WAREHOUSE');
 assert.equal(r.state.cash,s.cash-8000);assert.equal(e.capacity(r.state),e.capacity(s)+1);assert.equal(e.weeklyCost(r.state),e.weeklyCost(s)+100);
 const after=e.quoteOrder(r.state,s.offers[0].id);assert.equal(after.freight,Math.round(q.freight*.95));assert.equal(after.freightSaving,q.freight-after.freight);assert.deepEqual(e.parseTradeSave(r.state),r.state);
 const two=act(r.state,'EXPAND_WAREHOUSE').state;assert.equal(two.cash,s.cash-24000);assert.equal(act(two,'EXPAND_WAREHOUSE').changed,false);
});
test('branches cost money and only boost matching market, managers stay unique',()=>{
 const s=rich(),q=e.quoteOrder(s,s.offers[0].id);let n=act(s,'OPEN_BRANCH',{market:'asia'}).state;
 assert.equal(n.cash,s.cash-16000);assert.equal(e.capacity(n),e.capacity(s)+1);assert.equal(e.weeklyCost(n),e.weeklyCost(s)+180);
 assert.equal(e.quoteOrder(n,n.offers[0].id).chance,q.chance+3);
 n=act(n,'APPOINT',{market:'asia',manager:'chen'}).state;assert.equal(e.quoteOrder(n,n.offers[0].id).chance,Math.min(98,q.chance+8));
 n=act(n,'OPEN_BRANCH',{market:'middle'}).state;assert.equal(act(n,'APPOINT',{market:'middle',manager:'chen'}).changed,false);
 assert.equal(e.expansionBonus(n,'europe').chance,0);assert.deepEqual(e.parseTradeSave(n),n);
});
test('reputation loss does not corrupt an established branch or block appointments',()=>{
 let s=act(rich(),'OPEN_BRANCH',{market:'europe'}).state;s.reputation=7;
 assert.deepEqual(e.parseTradeSave(s),s);assert.equal(act(s,'APPOINT',{market:'europe',manager:'lin'}).changed,true);
});
test('old contracts keep their costs and dates during expansion and appointment',()=>{
 let s=rich();s=act(s,'ACCEPT',{offerId:s.offers[0].id,markup:-10}).state;assert.equal(s.active.length,1);const contract=structuredClone(s.active[0]);
 s=act(s,'EXPAND_WAREHOUSE').state;s=act(s,'OPEN_BRANCH',{market:'asia'}).state;s=act(s,'APPOINT',{market:'asia',manager:'zhou'}).state;
 assert.deepEqual(s.active[0],contract);assert.deepEqual(e.parseTradeSave(s),s);
});
test('cash checks reject expansion atomically and locked markets stay locked',()=>{
 const s=e.createTradeGame();s.cash=8000;const before=JSON.stringify(s);assert.equal(act(s,'EXPAND_WAREHOUSE').changed,false);assert.equal(JSON.stringify(s),before);
 assert.equal(act(s,'OPEN_BRANCH',{market:'europe'}).changed,false);assert.equal(act(s,'APPOINT',{market:'asia',manager:'bad'}).changed,false);
});
test('manager change and dismissal respect seven days and one handover charge',()=>{
 let s=act(rich(),'OPEN_BRANCH',{market:'asia'}).state;s=act(s,'APPOINT',{market:'asia',manager:'chen'}).state;
 assert.equal(act(s,'APPOINT',{market:'asia',manager:'lin'}).changed,false);assert.equal(act(s,'DISMISS',{market:'asia'}).changed,false);
 s=act(s,'ADVANCE_DAYS',{days:7}).state;const cash=s.cash;s=act(s,'DISMISS',{market:'asia'}).state;assert.equal(s.cash,cash-600);
 s=act(s,'APPOINT',{market:'asia',manager:'zhou'}).state;assert.equal(s.cash,cash-600);assert.deepEqual(e.parseTradeSave(s),s);
});
test('malformed expansion imports rejected, including duplicate managers',()=>{
 for(const ex of [null,{warehouse:-1,branches:{}},{warehouse:0,branches:[]},{warehouse:0,branches:{bogus:{manager:null,appointedDay:0}}},{warehouse:0,branches:{asia:{manager:'chen',appointedDay:1},middle:{manager:'chen',appointedDay:1}}}]){const s=rich();s.expansion=ex;assert.throws(()=>e.parseTradeSave(s));}
 const s=rich();delete s.expansion;assert.throws(()=>e.parseTradeSave(s));
});
test('expansion company view and quote show real benefits without extra navigation',async()=>{
 const src=await readFile(new URL('../src/trade-app.js',import.meta.url),'utf8'),nodes=new Map();
 const node=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',addEventListener(){},classList:{add(){},remove(){}}});return nodes.get(id);};
 const s=rich(),c=vm.createContext({...e,document:{querySelector:node},localStorage:{getItem:k=>k==='trade-tycoon:data:v2'?JSON.stringify(s):null,setItem(){}},window:{scrollTo(){}},setTimeout:()=>0,clearTimeout(){}});
 vm.runInContext(src.replace(/^import[^\n]+\n/,''),c);const html=vm.runInContext('company()',c);
 assert.match(html,/出口集货仓/);assert.match(html,/东南亚子公司/);assert.match(html,/不是通关条件/);assert.match(html,/每级并行订单 \+1/);
});
