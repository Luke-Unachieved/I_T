import test from 'node:test';
import assert from 'node:assert/strict';
import {MARKET_PRODUCTS} from '../src/deal-room-market-data.js';
import {marketPlate} from '../src/deal-room-market-art.js';
import {marketView,bindMarket} from '../src/deal-room-market-view.js';
import {createDealRoom,reduceDealRoom} from '../src/deal-room-engine.js';
test('every traded SKU has its own local geometric study; the same object follows the order',()=>{
 const shapes=MARKET_PRODUCTS.map(p=>marketPlate(p).match(/<g fill="none"[\s\S]*<\/g>/)?.[0]);
 assert.equal(shapes.length,30);assert.ok(shapes.every(Boolean));assert.equal(new Set(shapes).size,30);
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
