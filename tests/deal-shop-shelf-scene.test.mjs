import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createDealRoom,reduceDealRoom,normalizeDealRoom} from '../src/deal-room-engine.js';
import {shopShelfScene} from '../src/deal-room-shop-trial.js';
import {buildDealHtml} from '../scripts/build-deal-standalone.mjs';
const source=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const route=JSON.parse(source('./fixtures/deal-group-day169-actions.json'));
const act=(s,type,x={})=>{const n=reduceDealRoom(s,{type,...x});assert.notEqual(n,s,type);return n;};
function draft(){let s=route.reduce(reduceDealRoom,createDealRoom());for(const type of ['CLOSE_STUDIO_PROJECT','OPEN_STOCK_PROCUREMENT','SIGN_STOCK_PROCUREMENT','FULFIL_STOCK_PROCUREMENT','CLOSE_STOCK_PROCUREMENT','OPEN_SHOP_TRIAL'])s=act(s,type,type==='SIGN_STOCK_PROCUREMENT'?{factoryMode:'batch'}:{});return s;}
const count=(h,needle)=>h.split(needle).length-1;
function places(h,shelf,box){assert.equal(count(h,'data-lamp-place="shelf"'),shelf);assert.equal(count(h,'data-lamp-place="box"'),box);}
test('twelve actual preview positions show 8+4 or twelve; comparing never touches stock or price',()=>{
 const d=draft(),b=structuredClone(d),regular=shopShelfScene(d),all=shopShelfScene(d,'shelf');
 for(const h of [regular,all]){places(h,12,0);assert.match(h,/拟送展 12 盏/);assert.doesNotMatch(h,/已退回工作室|尚未结算/);}
 assert.equal(count(regular,'shop-real-lamp trial-only'),4);assert.equal(count(all,'shop-real-lamp trial-only'),0);
 assert.match(regular,/data-shop-shelf-toggle="shelf"/);assert.match(all,/data-shop-shelf-toggle="regular"/);
 assert.deepEqual(d,b);assert.equal(d.stockProcurement.remaining,48);
});
test('sent lamps remain in the shop until settlement; only the settled eight-lamp contract moves four to the return box',()=>{
 for(const terms of ['regular','shelf']){const d=draft(),s=act(d,'SIGN_SHOP_TRIAL',{terms});const shown=shopShelfScene(s,terms==='regular'?'shelf':'regular','send');
  places(shown,12,0);assert.match(shown,/data-shop-motion="send"/);assert.match(shown,/尚未结算/);assert.doesNotMatch(shown,/data-shop-shelf-toggle=/);
  const n=act(s,'SETTLE_SHOP_TRIAL'),h=shopShelfScene(n,'regular','settle'),reopened=shopShelfScene(n);
  places(h,terms==='regular'?8:12,terms==='regular'?4:0);assert.equal(n.stockProcurement.remaining,terms==='regular'?40:36);
  assert.match(h,terms==='regular'?/4 盏已退回工作室/:/没有退货/);assert.match(h,/data-shop-motion="settle"/);
  assert.match(reopened,/data-shop-motion="still"/);assert.deepEqual(normalizeDealRoom(n),n);
 }
});
test('standalone shelf click previews terms with focus, then actual contract determines all physical positions; reopening is still',async()=>{
 const html=await buildDealHtml(),script=new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
 const initial=draft();let saved=JSON.stringify(initial),controller,focused=0,handlers={};
 const root={innerHTML:'',querySelector(selector){if(selector==='#motion')return {};if(selector==='[data-shop-shelf-toggle]'){const m=this.innerHTML.match(/data-shop-shelf-toggle="(regular|shelf)"/);if(!m)return null;controller={dataset:{shopShelfToggle:m[1]},addEventListener(_,fn){handlers.toggle=fn;},focus(){focused++;}};return controller;}return null;},
 querySelectorAll(selector){if(selector!=='[data-action]')return [];return [...this.innerHTML.matchAll(/data-action="([A-Z_]+)"/g)].map(m=>{const b={dataset:{action:m[1]}};Object.defineProperty(b,'onclick',{set(fn){handlers[m[1]]=fn;}});return b;});}};
 const run=()=>script.runInNewContext({document:{querySelector:()=>root,documentElement:{classList:{contains:()=>false,add(){}}}},localStorage:{getItem:k=>k.endsWith(':reduced-motion')?null:saved,setItem:(k,v)=>{saved=v;}},TextEncoder,structuredClone,console},{timeout:3000});
 run();assert.match(root.innerHTML,/data-shop-split="split"/);handlers.toggle({currentTarget:controller});assert.match(root.innerHTML,/data-shop-split="whole"/);assert.equal(focused,1);assert.deepEqual(JSON.parse(saved),initial);
 handlers.SIGN_SHOP_TRIAL();assert.match(root.innerHTML,/data-shop-motion="send"/);places(root.innerHTML,12,0);assert.equal(JSON.parse(saved).shopTrial.terms,'shelf');
 handlers.SETTLE_SHOP_TRIAL();assert.match(root.innerHTML,/data-shop-motion="settle"/);places(root.innerHTML,12,0);
 run();assert.match(root.innerHTML,/data-shop-motion="still"/);assert.match(root.innerHTML,/店里留下 12 盏/);assert.doesNotMatch(root.innerHTML,/aria-label="产品样品"/);
 assert.match(html,/@media\(prefers-reduced-motion:reduce\)\{\.shop-window-card \.shop-real-lamp\{animation:none!important\}/);assert.match(html,/\.reduce-motion \.shop-window-card \.shop-real-lamp\{animation:none!important\}/);
});
