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
test('growth plaques count only actual invested procurement or booked express benefits',()=>{
 let base=engine.createOpeningGame();for(const id of ['quick','urgent','large']){for(const type of ['PURCHASE','SHIP','DELIVER'])base=engine.reduceOpening(base,{type,orderId:id,route:id==='urgent'?'express':'sea'}).state;if(id==='large')base=engine.reduceOpening(base,{type:'COLLECT',orderId:id}).state;}
 for(const choice of ['warehouse','express']){
  let s=engine.reduceOpening(base,{type:'INVEST',choice}).state;const local=storage();local.setItem(engine.STORAGE_KEY,JSON.stringify(s));assert.match(boot('',local,storage()).root.innerHTML,/累计省[^<]*<\/span><b>¥0/);
  const id=choice==='warehouse'?'port-quick':'port-urgent';s=engine.reduceOpening(s,{type:'PURCHASE',orderId:id}).state;if(choice==='express')s=engine.reduceOpening(s,{type:'SHIP',orderId:id,route:'express'}).state;
  local.setItem(engine.STORAGE_KEY,JSON.stringify(s));const html=boot('',local,storage()).root.innerHTML;
  if(choice==='warehouse')assert.match(html,/货仓累计省采购<\/span><b>¥80/);else{assert.match(html,/快线累计省运费<\/span><b>¥120/);assert.match(html,/比普通快运少用 1 天/);}
 }
});
test('cash-constrained contract shows exact shortfall and a receivable recovery action',()=>{
 let s=engine.createOpeningGame();for(const type of ['PURCHASE','SHIP','DELIVER'])s=engine.reduceOpening(s,{type,orderId:'large',route:'sea'}).state;
 const local=storage();local.setItem(engine.STORAGE_KEY,JSON.stringify(s));const app=boot('',local,storage());app.act('select','urgent');assert.match(app.root.innerHTML,/还差 ¥400/);assert.match(app.root.innerHTML,/¥2,100 在第 12 天到账/);assert.match(app.root.innerHTML,/查看这笔待收款/);
 app.act('select','large');assert.match(app.root.innerHTML,/等到收款 · 推进 7 天/);
});
test('third-stage result separates this stage cash gain from lifetime earnings without fabricating absent history',()=>{
 let s=engine.createOpeningGame();const act=(type,id,route)=>{s=engine.reduceOpening(s,{type,orderId:id,route}).state;};const sale=(id,route='sea')=>{for(const type of ['PURCHASE','SHIP','DELIVER'])act(type,id,route);};
 sale('quick');sale('urgent','express');sale('large');act('COLLECT','large');s=engine.reduceOpening(s,{type:'INVEST',choice:'warehouse'}).state;
 sale('port-quick');sale('port-urgent','express');sale('port-large');act('COLLECT','port-large');s=engine.reduceOpening(s,{type:'NEXT_STAGE'}).state;const startCash=s.cash,startDay=s.day;
 sale('choice-bulk');sale('choice-urgent','express');act('COLLECT','choice-bulk');const local=storage();local.setItem(engine.STORAGE_KEY,JSON.stringify(s));let html=boot('',local,storage()).root.innerHTML;
 assert.match(html,/这一程 · 2 位客户/);assert.ok(html.includes('+'+'¥'+(s.cash-startCash).toLocaleString('zh-CN')));assert.ok(html.includes((s.day-startDay)+' 天 · 已扣'));assert.match(html,/累计净赚/);assert.match(html,/出货至回款/);
 s.history=[];local.setItem(engine.STORAGE_KEY,JSON.stringify(s));html=boot('',local,storage()).root.innerHTML;assert.doesNotMatch(html,/这一程 ·/);assert.match(html,/累计净赚/);
});
