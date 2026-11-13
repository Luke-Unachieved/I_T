import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import * as economy from '../src/trade-economy.js';
const source=await readFile(new URL('../src/trade-app.js',import.meta.url),'utf8');
function boot(){
 const state=economy.createTradeGame('反馈回归'),nodes=new Map(),storage=new Map([['trade-tycoon:data:v2',JSON.stringify(state)]]);
 const node=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',addEventListener(){},classList:{add(){},remove(){}}});return nodes.get(id);};
 const c=vm.createContext({...economy,document:{querySelector:node},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},window:{scrollTo(){}},setTimeout:()=>0,clearTimeout(){}});
 vm.runInContext(source.replace(/^import[^\n]+\n/,''),c);return {c,nodes};
}
test('advancing uses one persistent message, not generic notice plus duplicate toast',()=>{
 const {c,nodes}=boot();vm.runInContext("apply({type:'ADVANCE_DAYS',days:7})",c);
 assert.equal(vm.runInContext('notice',c),'');
 assert.equal(nodes.get('#trade-toast')?.textContent??'','');
 const html=vm.runInContext('advanceFeedback()',c);
 assert.match(html,/已推进 7 \/ 7 天/);assert.match(html,/运营及利息 ¥120/);assert.match(html,/询盘已更新/);
});
test('zero-day funding pause retains warning and scoped continue button',()=>{
 const {c}=boot();vm.runInContext("state.cash=0;state.day=7;state.week=1;apply({type:'NEXT_DAY'})",c);
 const html=vm.runInContext('advanceFeedback()',c);
 assert.match(html,/已推进 0 \/ 1 天/);assert.match(html,/缺¥120/);assert.match(html,/确认后继续/);
});
test('non-time operations still have their own visible result',()=>{
 const {c,nodes}=boot();vm.runInContext("apply({type:'BROKER'})",c);
 assert.match(vm.runInContext('notice',c),/代办收入/);assert.match(nodes.get('#trade-toast').textContent,/代办收入/);
});
function unlockOn(startDay){
 let s=economy.createTradeGame('解锁测试');s.metrics.orders=2;s.reputation=4;
 while(s.day<startDay)s=economy.reduceTrade(s,{type:'NEXT_DAY'}).state;
 let r=economy.reduceTrade(s,{type:'ACCEPT',offerId:s.offers[0].id,markup:-10});s=r.state;assert.equal(s.active.length,1);
 for(let i=0;i<40;i++){r=economy.reduceTrade(s,{type:'NEXT_DAY'});s=r.state;if(r.pause?.code==='market_unlocked')return r;}
 throw new Error('market not unlocked');
}
test('weekly-boundary unlock says new inquiries are here when board already includes them',()=>{
 const r=unlockOn(1);assert.ok(r.state.offers.some(o=>o.market==='middle'));
 assert.match(r.pause.message,/新市场询盘已到达/);assert.doesNotMatch(r.pause.message,/下一次/);
});
test('midweek unlock still explains the next weekly board refresh',()=>{
 const r=unlockOn(2);assert.equal(r.state.offers.some(o=>o.market==='middle'),false);assert.match(r.pause.message,/下一次/);
});
