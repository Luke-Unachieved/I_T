import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const src=await readFile(new URL('../src/trade-app.js',import.meta.url),'utf8');
// These are source/presentation contracts, not claims of browser or economic QA.
test('USD quote is conditional, keeps RMB fallback, defaults to tail-only locking',()=>{
 assert.match(src,/fxMode:'locked'/);
 assert.match(src,/o.currency==='USD'\?usd\(o.usdUnitCents\):money\(o.price\)/);
 assert.match(src,/q.fx\?usd\(q.fx.usdCents\):money\(q.revenue\)/);
 assert.match(src,/id="quote-fx"/);assert.match(src,/'quote-fx':'fxMode'/);
 assert.match(src,/尾款结汇/);assert.match(src,/锁汇费 · 签约扣款/);
 assert.match(src,/按当前汇率估算，非保证到账/);
 assert.match(src,/f.minTail/);assert.match(src,/f.maxTail/);
 assert.match(src,/disabled=!q.valid\|\|\(fc.stressMinimum\?\?fc.minimum\)<0/);
});
test('FX history shows only observed weeks with explicit units, not future quotes',()=>{
 const section=src.slice(src.indexOf('function fxMarket()'),src.indexOf('function market()'));
 assert.match(section,/state.priceHistory.map/);assert.match(section,/fxRateAt\(h.week\)/);
 assert.match(section,/1 美元 =/);assert.match(section,/游戏内汇率/);
 assert.doesNotMatch(section,/fxRateAt\([^)]*week\s*\+/);
 assert.match(src,/估计待结汇/);assert.match(src,/按签约汇率估算，非保证到账/);
});
test('FX detail renders locked or floating tail with no fake guaranteed range',()=>{
 const fn=src.slice(src.indexOf('function fxQuote('),src.indexOf('function confirmation('));
 const context={money:v=>'¥'+v,usd:v=>'US$'+(v/100).toFixed(2),fxRate:v=>(v/10000).toFixed(4)};
 vm.createContext(context);vm.runInContext(fn,context);
 const fx={mode:'locked',usdCents:100000,tailUsdCents:30000,signRate:72000,lockedRate:72000,fee:13,estimatedTail:2160,minTail:1920,maxTail:2400};
 const locked=context.fxQuote({fx});assert.match(locked,/锁定尾款/);assert.match(locked,/1 美元 = 7.2000 元/);assert.doesNotMatch(locked,/压力区间/);
 const spot=context.fxQuote({fx:{...fx,mode:'spot',fee:0}});assert.match(spot,/尾款估值/);assert.match(spot,/¥1920～¥2400/);assert.match(spot,/非保证到账/);
});
test('upgrade backup precedes migrated assignment and never replaces existing backup',()=>{
 const init=src.slice(src.indexOf('try{legacyAvailable='),src.indexOf('function save()'));
 function run({raw,backup=null,failParse=false,failStore=false}){
  const data=new Map([['trade-tycoon:data:v2',raw],...(backup?[['trade-tycoon:data:v2:before-upgrade',backup]]:[])]);
  const c={KEY:'trade-tycoon:data:v2',state:null,damagedSave:null,saveWarning:'',legacyAvailable:false,parseTradeSave:()=>{if(failParse)throw Error();return{ruleset:5};},localStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>{if(failStore)throw Error();data.set(k,v);}}};
  vm.createContext(c);vm.runInContext(init,c);return{c,data};
 }
 let r=run({raw:'{"ruleset":4}'});assert.equal(r.data.get('trade-tycoon:data:v2:before-upgrade'),'{"ruleset":4}');assert.equal(r.c.state.ruleset,5);assert.equal(r.data.get('trade-tycoon:data:v2'),'{"ruleset":4}');
 r=run({raw:'{"ruleset":4}',backup:'earlier'});assert.equal(r.data.get('trade-tycoon:data:v2:before-upgrade'),'earlier');
 r=run({raw:'bad',failParse:true});assert.equal(r.c.state,null);assert.equal(r.c.damagedSave,'bad');assert.equal(r.data.has('trade-tycoon:data:v2:before-upgrade'),false);
 r=run({raw:'{"ruleset":4}',failStore:true});assert.equal(r.c.state,null);assert.equal(r.c.damagedSave,'{"ruleset":4}');
 assert.match(src,/export-upgrade/);assert.match(src,/贸易经营-升级前存档.json/);
});
