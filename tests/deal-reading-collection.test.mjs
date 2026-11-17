import test from 'node:test';
import assert from 'node:assert/strict';
import {createDealRoom,reduceDealRoom,normalizeDealRoom} from '../src/deal-room-engine.js';
import {lifePurchasePreview,canonicalLifeAction} from '../src/deal-room-life.js';
import {lifeRoomView,bindLifeRoom} from '../src/deal-room-life-view.js';
import {encodeDealBackup,parseDealBackup} from '../src/deal-room-save.js';
function earned(){let s=createDealRoom();for(const optionId of ['trial','ready','season'])for(const a of [{type:'PROPOSE',optionId},{type:'ADVANCE'},{type:'NEXT_CLIENT'}])s=reduceDealRoom(s,a);return s;}
const buy=(s,itemId)=>reduceDealRoom(s,{type:'BUY_LIFE_ITEM',itemId});
test('book needs owned chair; preview/cancel free; purchase exactly once with no business bonus',()=>{
 let s=earned();assert.equal(lifePurchasePreview(s,'books').valid,false);assert.equal(buy(s,'books'),s);s=buy(s,'chair');const before=structuredClone(s);
 assert.match(lifeRoomView(s,{preview:'books'}),/四篇关于小城/);lifeRoomView(s,{});assert.deepEqual(s,before);
 const n=buy(s,'books');assert.equal(n.cash,s.cash-260);assert.equal(n.personalLife.spent,s.personalLife.spent+260);assert.equal(n.day,s.day);assert.deepEqual(n.contracts,s.contracts);assert.equal(buy(n,'books'),n);
 assert.equal(lifePurchasePreview({...s,cash:259},'books').valid,false);
});
test('four actual chapters, owned entry and persistent bookmark survive replay/import without money or time',()=>{
 const legacy=earned();let s=buy(buy(legacy,'chair'),'books');const cash=s.cash,day=s.day;const first=lifeRoomView(s,{using:'books'});assert.match(first,/迟到的早晨/);assert.match(first,/data-life-book-page="-1" disabled/);
 s=reduceDealRoom(s,{type:'READ_LIFE_BOOK',itemId:'books',page:2});assert.match(lifeRoomView(s,{using:'books'}),/绕远一点/);assert.match(lifeRoomView(s,{}),/接着读 · 第 3 篇/);assert.equal(s.cash,cash);assert.equal(s.day,day);
 assert.deepEqual(normalizeDealRoom(s),s);assert.deepEqual(parseDealBackup(encodeDealBackup(s)).state,s);assert.deepEqual(normalizeDealRoom(legacy),legacy);
 const altered=structuredClone(s);altered.personalLife.readingPage=3;assert.throws(()=>normalizeDealRoom(altered));
 const end=reduceDealRoom(s,{type:'READ_LIFE_BOOK',itemId:'books',page:3});assert.match(lifeRoomView(end,{using:'books'}),/data-life-book-page="4" disabled/);assert.equal(reduceDealRoom(end,{type:'READ_LIFE_BOOK',itemId:'books',page:3}),end);
});
test('unowned, malformed and injected reading actions cannot change state',()=>{
 const s=earned();assert.equal(reduceDealRoom(s,{type:'READ_LIFE_BOOK',itemId:'books',page:1}),s);
 for(const a of [{type:'READ_LIFE_BOOK',itemId:'chair',page:1},{type:'READ_LIFE_BOOK',itemId:'books',page:4},{type:'READ_LIFE_BOOK',itemId:'books',page:-1},{type:'READ_LIFE_BOOK',itemId:'books',page:1,price:0},{type:'READ_LIFE_BOOK',itemId:'books',page:1.5}])assert.equal(canonicalLifeAction(a),null);
});
test('bookmark next-button keeps keyboard focus after dispatch rerenders, final page focuses reader',()=>{
 let s=buy(buy(earned(),'chair'),'books'),focused='',handlers={};
 const doc={addEventListener(){},removeEventListener(){},defaultView:{}};
 const root={ownerDocument:doc,querySelectorAll(sel){return sel==='[data-life-book-page]'?[{dataset:{lifeBookPage:String((s.personalLife.readingPage||0)+1),lifeBookStep:'next'},set onclick(fn){handlers.next=fn;}}]:[];},querySelector(sel){if(sel==='[data-life-book-step="next"]')return {disabled:s.personalLife.readingPage===3,focus(){focused='next';}};if(sel==='.life-ritual')return {focus(){focused='reader';}};return null;}};
 const draw=()=>bindLifeRoom(root,{getState:()=>s,getUI:()=>({using:'books'}),setUI(){},dispatch(a){s=reduceDealRoom(s,a);draw();},close(){}});draw();handlers.next();assert.equal(focused,'next');handlers.next();handlers.next();assert.equal(focused,'reader');
 const html=lifeRoomView(s,{using:'books'});assert.match(html,/aria-label="沿街走走阅读书册"/);assert.match(html,/aria-live="polite"/);assert.match(html,/夹好书签，合上书/);
});
test('cancel preview, purchase, close book and rearrange return focus to surviving nearby controls',()=>{
 let s=buy(earned(),'chair'),ui={preview:'books'},focused='',nodes=[];
 const doc={activeElement:null,addEventListener(){},removeEventListener(){},defaultView:{}};
 const node=(attr,value='')=>({dataset:{[attr.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]:value},attr,value,hasAttribute:a=>a===attr,getAttribute:()=>value,addEventListener(t,fn){this['on'+t]=fn;},focus(){focused=attr+':'+value;doc.activeElement=this;},scrollIntoView(){}});
 const root={ownerDocument:doc,querySelectorAll(selector){return nodes.filter(n=>selector==='['+n.attr+']');},querySelector(selector){return nodes.find(n=>selector==='['+n.attr+']'||selector===`[${n.attr}="${n.value}"]`)||null;}};
 const draw=()=>{doc.activeElement=null;nodes=[node('data-life-preview','books'),node('data-life-place','chair')];if(ui.preview)nodes.push(node('data-life-cancel'),node('data-life-buy','books'));if(s.personalLife.purchases.some(p=>p.itemId==='books'))nodes.push(node('data-life-use','books'));if(ui.using)nodes.push(node('data-life-end'));bindLifeRoom(root,{getState:()=>s,getUI:()=>ui,setUI:n=>{ui=n;draw();},dispatch:a=>{s=reduceDealRoom(s,a);draw();},close(){}});};
 const click=selector=>root.querySelector(selector).onclick();draw();click('[data-life-cancel]');assert.equal(focused,'data-life-preview:books');
 ui={preview:'books'};draw();click('[data-life-buy]');assert.equal(focused,'data-life-use:books');
 ui={using:'books'};draw();click('[data-life-end]');assert.equal(focused,'data-life-use:books');
 click('[data-life-place]');assert.equal(focused,'data-life-place:chair');assert.equal(s.personalLife.positions.chair,'inside');
});
