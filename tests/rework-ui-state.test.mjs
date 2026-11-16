import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import * as engine from '../src/rework-opening.js';
const source=fs.readFileSync(new URL('../src/rework-app.js',import.meta.url),'utf8').replace(/^import[^\n]+\n/,'').replaceAll('import.meta.url',JSON.stringify('https://game.invalid/src/rework-app.js'));
function storage(){const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),data};}
function boot(search,local,session){const events={},root={innerHTML:'',addEventListener:(type,fn)=>events[type]=fn};vm.runInNewContext(source,{...engine,structuredClone,URL,URLSearchParams,location:{search},document:{querySelector:()=>root},localStorage:local,sessionStorage:session,fetch:()=>Promise.reject(new Error('No art needed for storage test')),confirm:()=>true});return {root,act:(action,id)=>events.click({target:{closest:()=>({dataset:{action,id}})}})}}
test('trial tabs never read or overwrite normal progress; refresh keeps only that tab trial',()=>{
 const local=storage(),a=storage(),b=storage();const old=engine.createOpeningGame();old.cash=4321;local.setItem(engine.STORAGE_KEY,JSON.stringify(old));const before=local.getItem(engine.STORAGE_KEY);
 const first=boot('?trial=1',local,a);assert.match(first.root.innerHTML,/1,800/);first.act('PURCHASE','quick');assert.equal(local.getItem(engine.STORAGE_KEY),before);assert.equal(JSON.parse(a.getItem(engine.STORAGE_KEY+':trial')).cash,1400);
 assert.match(boot('?trial=1',local,a).root.innerHTML,/1,400/);assert.match(boot('?trial=1',local,b).root.innerHTML,/1,800/);assert.match(boot('',local,b).root.innerHTML,/4,321/);
});
test('storage failure is reported without stopping the in-memory game',()=>{
 const broken={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}};const app=boot('?trial=1',broken,broken);app.act('PURCHASE','quick');assert.match(app.root.innerHTML,/1,400/);assert.match(app.root.innerHTML,/浏览器没有保存这次进度/);
});
test('open contracts show the real latest quote movement and explicit relative deadline',()=>{
 let s=engine.createOpeningGame();const local=storage();for(const type of ['PURCHASE','SHIP','DELIVER'])s=engine.reduceOpening(s,{type,orderId:'quick',route:'sea'}).state;
 local.setItem(engine.STORAGE_KEY,JSON.stringify(s));const app=boot('',local,storage());assert.match(app.root.innerHTML,/本批毛利 ↑ \+¥100/);assert.match(app.root.innerHTML,/本批毛利 ↓ −¥120/);assert.match(app.root.innerHTML,/接单后 2 天内交付/);
 app.act('PURCHASE','urgent');assert.match(app.root.innerHTML,/最晚第 7 天交付/);
});
