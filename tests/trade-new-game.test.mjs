import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const app=await readFile(new URL('../src/trade-app.js',import.meta.url),'utf8');
const replaceTradeRun=vm.runInNewContext('('+app.match(/function replaceTradeRun[\s\S]*?\n}/)[0]+')');
import {createTradeGame,parseTradeSave,reduceTrade} from '../src/trade-economy.js';
function store(fail){const values=new Map();return {values,setItem(k,v){if(fail?.(k))throw Error('quota');values.set(k,v);}};}
test('new run preserves recoverable previous state and uses unchanged save schema',()=>{
 const current=createTradeGame('原公司');const next=createTradeGame('新公司');
 const storage=store();replaceTradeRun(storage,'game',current,next);
 assert.deepEqual(parseTradeSave(storage.values.get('game:before-new-game')),parseTradeSave(JSON.stringify(current)));
 assert.deepEqual(parseTradeSave(storage.values.get('game')),parseTradeSave(JSON.stringify(next)));
 assert.equal(next.day,1);assert.equal(next.cash,18000);assert.equal(current.name,'原公司');
});
test('backup failure must stop before overwriting current run',()=>{
 const storage=store(k=>k.endsWith('before-new-game'));storage.values.set('game','original');
 assert.throws(()=>replaceTradeRun(storage,'game',createTradeGame(),createTradeGame()));
 assert.equal(storage.values.get('game'),'original');
});
test('new save write failure retains current persisted game and a recovery copy',()=>{
 const storage=store(k=>k==='game');const current=createTradeGame('原公司');storage.values.set('game',JSON.stringify(current));
 assert.throws(()=>replaceTradeRun(storage,'game',current,createTradeGame('新公司')));
 assert.equal(storage.values.get('game'),JSON.stringify(current));
 assert.equal(storage.values.get('game:before-new-game'),JSON.stringify(current));
});
test('new game has explicit confirmation, cancel and exportable backup; UI switches after successful storage',async()=>{
 const source=await readFile(new URL('../src/trade-app.js',import.meta.url),'utf8');
 assert.match(source,/confirmation\('重新开局'/);assert.match(source,/已有的上局备份将被替换/);
 assert.match(source,/取消不会改变当前进度/);assert.match(source,/导出上局存档/);
 assert.ok(source.indexOf('replaceTradeRun(localStorage,KEY,state,next)')<source.indexOf('closeDialog();state=next'));
});
import * as economy from '../src/trade-economy.js';
function boot(fail=false){
 const nodes=new Map(),values=new Map([['trade-tycoon:data:v2',JSON.stringify(createTradeGame('旧公司'))]]);
 const node=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',value:'新公司',open:false,addEventListener(){},showModal(){this.open=true;},close(){this.open=false;},classList:{add(){},remove(){}}});return nodes.get(id);};
 const context=vm.createContext({...economy,document:{querySelector:node},localStorage:{getItem:k=>values.get(k)??null,setItem(k,v){if(fail)throw Error('quota');values.set(k,v);}},window:{scrollTo(){}},setTimeout:()=>0,clearTimeout(){}});
 vm.runInContext(app.replace(/^import[^\n]+\n/,''),context);
 const click=action=>vm.runInContext(`handle({target:{closest:()=>({dataset:{action:'${action}'}})}})`,context);
 return {context,nodes,values,click};
}
test('open and cancel do not alter current save; confirm starts once and backup is parseable',()=>{
 const {context,values,click}=boot();const original=values.get('trade-tycoon:data:v2');
 click('new-game');click('close');assert.equal(values.get('trade-tycoon:data:v2'),original);
 click('new-game');click('confirm-new-game');
 assert.equal(vm.runInContext('state.name',context),'新公司');
 assert.equal(parseTradeSave(values.get('trade-tycoon:data:v2:before-new-game')).name,'旧公司');
 assert.equal(parseTradeSave(values.get('trade-tycoon:data:v2')).day,1);
});
test('storage failure keeps the active UI on the old company',()=>{
 const {context,click}=boot(true);click('new-game');click('confirm-new-game');
 assert.equal(vm.runInContext('state.name',context),'旧公司');
});
