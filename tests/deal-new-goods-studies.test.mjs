import test from 'node:test';
import assert from 'node:assert/strict';
import {MARKET_PRODUCTS} from '../src/deal-room-market-data.js';
import {marketPlate} from '../src/deal-room-market-art.js';
import {marketView,bindMarket} from '../src/deal-room-market-view.js';
import {createDealRoom,reduceDealRoom} from '../src/deal-room-engine.js';
test('every traded SKU has its own local geometric study; the same object follows the order',()=>{
 const shapes=MARKET_PRODUCTS.map(p=>marketPlate(p).match(/<g fill="none"[\s\S]*<\/g>/)?.[0]);
 assert.equal(shapes.length,34);assert.ok(shapes.every(Boolean));assert.equal(new Set(shapes).size,34);
 for(const shape of shapes)assert.doesNotMatch(shape,/<(?:image|use|script|text|foreignObject)\b|(?:https?:|data:|onload=)/i);
 assert.equal(marketPlate({id:'__proto__'}),'');
 const act=(s,type,fields={})=>{const n=reduceDealRoom(s,{type,...fields});assert.notEqual(s,n,type);return n;};
 let s=createDealRoom();for(const optionId of ['trial','ready','small']){s=act(s,'PROPOSE',{optionId});s=act(s,'ADVANCE');s=act(s,'NEXT_CLIENT');}
 const p=MARKET_PRODUCTS[0];s=act(s,'OPEN_MARKET');const draft={productId:p.id,mode:'bulk',source:'factory',unitPrice:p.offers.bulk.maxUnitPrice-1};
 assert.ok(marketView(s,draft).includes(marketPlate(p)));
 s=act(s,'SIGN_MARKET',draft);s=act(s,'DELIVER_MARKET');assert.ok(marketView(s).includes(marketPlate(p)));assert.doesNotMatch(marketView(s),/data-market-repeat=/);
 s=act(s,'COLLECT_MARKET');s=act(s,'CLOSE_MARKET');s=act(s,'OPEN_MARKET');
 assert.match(marketView(s),/data-market-repeat="tray"/);
 const ui={},handlers={},root={querySelector:()=>null,querySelectorAll:sel=>sel==='[data-market-repeat]'?[{dataset:{marketRepeat:p.id},addEventListener:(_,f)=>handlers.repeat=f}]:[]};
 const before=structuredClone(s);bindMarket(root,s,ui,()=>{},()=>assert.fail('opening a prior quote must not dispatch a transaction'));handlers.repeat();
 for(const k of ['productId','mode','source','unitPrice'])assert.equal(ui[k],draft[k]);assert.equal(ui.quoted,null);
 assert.deepEqual(s,before);assert.match(marketView(s,ui),/报价与上次相同/);assert.match(marketView(s,ui),/data-market-sign disabled/);
});

test('only a requested quote gets a buyer reply; settled losses and the next inquiry display separate facts without changing prior save text',async()=>{
 const {marketReceiptText}=await import('../src/deal-room-market-view.js');
 const {normalizeDealRoom}=await import('../src/deal-room-engine.js');
 const act=(s,type,x={})=>{const n=reduceDealRoom(s,{type,...x});assert.notEqual(n,s,type);return n};
 let s=createDealRoom();for(const optionId of ['trial','ready','small']){s=act(s,'PROPOSE',{optionId});s=act(s,'ADVANCE');s=act(s,'NEXT_CLIENT');}
 s=act(s,'OPEN_MARKET');const p=MARKET_PRODUCTS[0],d={productId:p.id,mode:'trial',source:'stock',unitPrice:p.offers.trial.maxUnitPrice+1};
 assert.doesNotMatch(marketView(s,d),/买方拒绝|最高接受|超出预算/);
 const ui={...d,quoted:JSON.stringify(d)};assert.match(marketView(s,ui),/最高接受 ¥37/);
 const elements={},onInput={};for(const sel of ['#market-unit-price','[data-market-terms]','[data-market-edit-hint]','[data-market-sign]','.market-prior'])elements[sel]={addEventListener:(event,f)=>{if(sel==='#market-unit-price'&&event==='input')onInput.f=f;}};
 bindMarket({querySelector:s=>elements[s]||null,querySelectorAll:()=>[]},s,ui,()=>{},()=>assert.fail('typing a quote cannot create an order'));
 onInput.f({currentTarget:{value:'1'}});assert.equal(ui.quoted,null);assert.equal(ui.unitPrice,1);assert.ok(elements['[data-market-terms]'].hidden);assert.equal(elements['[data-market-edit-hint]'].hidden,false);assert.ok(elements['[data-market-sign]'].disabled);
 s=act(s,'SIGN_MARKET',{...d,unitPrice:1});s=act(s,'DELIVER_MARKET');
 const raw=JSON.stringify(s),restored=normalizeDealRoom(JSON.parse(raw));assert.deepEqual(restored,s);
 assert.equal(s.market.active.netProfit,-979);assert.match(s.feedback.message,/净赚 ¥-979/,'old canonical sentence remains replay compatible');
 assert.match(marketReceiptText(restored),/亏了 ¥979/);assert.doesNotMatch(marketView(restored),/净赚 ¥-979/);
 s=act(act(s,'CLOSE_MARKET'),'OPEN_MARKET');const next=marketView(s,{productId:MARKET_PRODUCTS[1].id});
 assert.doesNotMatch(next,/已收货并结清|亏了 ¥979/);assert.equal(s.marketHistory[0].netProfit,-979);
});
