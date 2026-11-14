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
 const context=vm.createContext({...economy,document:{querySelector:node},localStorage:{getItem:k=>values.get(k)??null,setItem(k,v){if(typeof fail==='function'?fail(k):fail)throw Error('quota');values.set(k,v);}},window:{scrollTo(){}},setTimeout:()=>0,clearTimeout(){}});
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
test('all recovery exports retain exact bytes and never modify saved state',()=>{
 const {context,values,click}=boot();context.downloads=[];
 vm.runInContext('download=(raw,name)=>downloads.push({raw,name})',context);
 for(const [action,suffix] of [['export-previous',':before-new-game'],['export-upgrade',':before-upgrade'],['export-backup',':before-import']]){
  const raw='{ "name": "原样字节" }';values.set('trade-tycoon:data:v2'+suffix,raw);
  const before=[...values];click(action);assert.equal(context.downloads.at(-1).raw,raw);assert.deepEqual([...values],before);
 }
});
test('missing recovery exports show a message without downloading or writing',()=>{
 const {context,values,nodes,click}=boot();context.downloads=[];
 vm.runInContext('download=(raw,name)=>downloads.push({raw,name})',context);
 const before=[...values];click('export-previous');
 assert.equal(context.downloads.length,0);assert.deepEqual([...values],before);
 assert.match(nodes.get('#trade-toast').textContent,/尚未重新开局/);
});

test('import write failure retains current UI and exact persisted save despite successful backup',()=>{
 const {context,values,nodes,click}=boot(k=>k==='trade-tycoon:data:v2');
 const original=values.get('trade-tycoon:data:v2');
 vm.runInContext("importCandidate=createTradeGame('导入公司');dialog.open=true",context);
 click('confirm-import');
 assert.equal(values.get('trade-tycoon:data:v2'),original);
 assert.equal(values.get('trade-tycoon:data:v2:before-import'),original);
 assert.equal(vm.runInContext('state.name',context),'旧公司');
 assert.equal(vm.runInContext('dialog.open',context),true);
 assert.match(nodes.get('#trade-toast').textContent,/当前进度未切换/);
});
test('successful import persists first, preserves prior save and clears stale warnings',()=>{
 const {context,values,click}=boot();const original=values.get('trade-tycoon:data:v2');
 vm.runInContext("importCandidate=createTradeGame('导入公司');dialog.open=true;saveWarning='旧警告'",context);
 click('confirm-import');
 assert.equal(parseTradeSave(values.get('trade-tycoon:data:v2')).name,'导入公司');
 assert.equal(values.get('trade-tycoon:data:v2:before-import'),original);
 assert.equal(vm.runInContext('state.name',context),'导入公司');
 assert.equal(vm.runInContext('dialog.open',context),false);
 assert.equal(vm.runInContext('saveWarning',context),'');
});
test('failed import from damaged save keeps recovery bytes and recovery screen intact',()=>{
 const {context,values,click}=boot(k=>k==='trade-tycoon:data:v2');
 values.set('trade-tycoon:data:v2','{ damaged original');
 vm.runInContext("state=null;damagedSave='{ damaged original';importCandidate=createTradeGame('导入公司');dialog.open=true",context);
 click('confirm-import');
 assert.equal(values.get('trade-tycoon:data:v2'),'{ damaged original');
 assert.equal(values.get('trade-tycoon:data:v2:before-import'),'{ damaged original');
 assert.equal(vm.runInContext('state',context),null);
 assert.equal(vm.runInContext('damagedSave',context),'{ damaged original');
});
test('desktop inquiry currencies reserve separate intrinsic-width columns',async()=>{
 const css=await readFile(new URL('../src/trade-style.css',import.meta.url),'utf8');
 assert.match(css,/@media\(min-width:701px\)\{\.inquiry\{grid-template-columns:minmax\(0,1fr\) max-content max-content 75px\}/);
});
