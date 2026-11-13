import test from 'node:test';
import assert from 'node:assert/strict';
import {createTradeGame,reduceTrade,parseTradeSave,quoteOrder,netWorth,capacity,weeklyCost,lifeItemCost} from '../src/trade-economy.js';
const act=(s,type,x={})=>reduceTrade(s,{type,...x});
const rich=()=>({...createTradeGame('生活验收'),cash:200000});
test('ruleset6 migration adds only empty optional life and keeps old state',()=>{
 const old=rich();old.ruleset=6;delete old.life;const next=parseTradeSave(old);
 assert.equal(next.ruleset,7);assert.deepEqual({...next,life:undefined,ruleset:6},{...old,life:undefined});assert.deepEqual(parseTradeSave(next),next);
});
test('personal purchases are optional spending, not business buffs or duplicate charges',()=>{
 const s=rich(),q=quoteOrder(s,s.offers[0].id);let n=act(s,'BUY_LIFE',{id:'car-city'}).state;
 assert.equal(n.cash,s.cash-10000);assert.equal(n.life.spent,10000);assert.equal(netWorth(n),netWorth(s)-10000);
 assert.deepEqual(quoteOrder(n,n.offers[0].id),q);assert.equal(capacity(n),capacity(s));assert.equal(weeklyCost(n),weeklyCost(s));
 assert.equal(act(n,'BUY_LIFE',{id:'car-city'}).changed,false);assert.equal(lifeItemCost(n,'car-tour'),35000);
 n=act(n,'BUY_LIFE',{id:'car-tour'}).state;assert.equal(n.cash,s.cash-45000);assert.equal(n.life.spent,45000);assert.equal(act(n,'BUY_LIFE',{id:'car-city'}).changed,false);assert.deepEqual(parseTradeSave(n),n);
});
test('spending rejects borrowed money and protects cash reserve atomically',()=>{
 const s=rich();s.debt=1;const snapshot=JSON.stringify(s);assert.equal(act(s,'BUY_LIFE',{id:'home-flat'}).changed,false);assert.equal(JSON.stringify(s),snapshot);
 s.debt=0;s.cash=11000;assert.equal(act(s,'BUY_LIFE',{id:'car-city'}).changed,false);assert.equal(s.cash,11000);
});
test('adult companions follow protagonist choice, are optional and have identical free/paid progress',()=>{
 for(const id of ['shen','lu']){
  const s=act(rich(),'BEGIN_RELATIONSHIP',{id}).state;
  const walk=act(s,'SPEND_TIME',{plan:'walk'}).state,dinner=act(s,'SPEND_TIME',{plan:'dinner'}).state;
  assert.deepEqual(walk.life.relationship,dinner.life.relationship);assert.match(dinner.life.memory,/晚饭/);assert.match(walk.life.memory,/江边/);assert.equal(walk.cash-dinner.cash,300);assert.equal(walk.day,s.day);
  assert.equal(act(walk,'SPEND_TIME',{plan:'walk'}).changed,false);
  assert.equal(walk.life.relationship.stage,1);assert.deepEqual(parseTradeSave(walk),walk);
  const end=act(walk,'END_RELATIONSHIP').state;assert.equal(end.life.relationship,null);assert.equal(end.cash,walk.cash);assert.equal(end.metrics.orders,walk.metrics.orders);
  assert.equal(act(end,'BEGIN_RELATIONSHIP',{id:id==='shen'?'lu':'shen'}).changed,false);
 }
});
test('free path reaches companionship with no economic effects or required spending',()=>{
 let s=act(createTradeGame(),'BEGIN_RELATIONSHIP',{id:'shen'}).state;let control=createTradeGame();
 for(let i=0;i<3;i++){
  s=act(s,'SPEND_TIME',{plan:'walk'}).state;
  if(i<2){s=act(s,'ADVANCE_DAYS',{days:7}).state;control=act(control,'ADVANCE_DAYS',{days:7}).state;}
 }
 assert.equal(s.life.relationship.stage,3);assert.equal(s.cash,control.cash);assert.equal(s.life.spent,0);assert.deepEqual(s.offers,control.offers);assert.equal(s.reputation,control.reputation);assert.deepEqual(parseTradeSave(s),s);
});
test('invalid life saves reject unsafe fields and incompatible companion identity',()=>{
 for(const patch of [null,{spent:-1},{home:'bad'},{car:'home-flat'},{protagonist:'bad'},{relationship:{id:'shen',stage:1,lastDay:1}},{relationship:{id:'lu',stage:1,lastDay:1},protagonist:'male'},{relationship:{id:'shen',stage:4,lastDay:1},protagonist:'male'}]){
  const s=rich();s.life=patch===null?null:{...s.life,...patch};assert.throws(()=>parseTradeSave(s));
 }
 const s=rich();delete s.life;assert.throws(()=>parseTradeSave(s));
});
test('life panel stays open after an action but does not add a primary navigation tab',async()=>{
 const {readFile}=await import('node:fs/promises'),vm=await import('node:vm'),economy=await import('../src/trade-economy.js');
 const src=await readFile(new URL('../src/trade-app.js',import.meta.url),'utf8'),nodes=new Map();
 const node=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',addEventListener(){},classList:{add(){},remove(){}}});return nodes.get(id);};
 const c=vm.createContext({...economy,document:{querySelector:node},localStorage:{getItem:k=>k==='trade-tycoon:data:v2'?JSON.stringify(rich()):null,setItem(){}},window:{scrollTo(){}},setTimeout:()=>0,clearTimeout(){}});
 vm.runInContext(src.replace(/^import[^\n]+\n/,''),c);assert.equal(vm.runInContext('tabs.length',c),4);
 node('.life-panel details').open=true;vm.runInContext("tab='company';apply({type:'BEGIN_RELATIONSHIP',id:'shen'})",c);
 assert.match(node('#trade-app').innerHTML,/life-panel"><details open>/);
 assert.match(node('#trade-app').innerHTML,/一起散步 · 免费/);
});
