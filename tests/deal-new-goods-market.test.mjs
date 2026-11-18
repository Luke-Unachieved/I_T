import test from 'node:test';
import assert from 'node:assert/strict';
import {createDealRoom,reduceDealRoom,normalizeDealRoom,careerOpportunity,curationOffers} from '../src/deal-room-engine.js';
import {businessHomeView} from '../src/deal-room-home.js';
import {goodsPriceRecords} from '../src/deal-room-goods-prices.js';
import {encodeDealBackup,parseDealBackup} from '../src/deal-room-save.js';
import {MARKET_PRODUCTS} from '../src/deal-room-market-data.js';
import {previewMarket} from '../src/deal-room-market.js';
const take=(s,type,fields={})=>{const n=reduceDealRoom(s,{type,...fields});assert.notEqual(n,s,type);return n;};
function workshop(){let s=createDealRoom();for(const optionId of ['trial','ready','small']){s=take(s,'PROPOSE',{optionId});s=take(s,'ADVANCE');s=take(s,'NEXT_CLIENT');}return s;}
const home=s=>businessHomeView(s,{career:careerOpportunity(s),referrals:curationOffers(s)});
test('30 distinct articles: both buyer plans pass through the real shared cashbook',()=>{
 const base=workshop(),start=take(base,'OPEN_MARKET');
 assert.equal(new Set(MARKET_PRODUCTS.map(p=>p.id)).size,30);assert.equal(new Set(MARKET_PRODUCTS.map(p=>p.name)).size,30);
 assert.equal(new Set(MARKET_PRODUCTS.map(p=>p.category)).size,6);
 assert.match(home(base),/data-action="OPEN_MARKET"/);
 for(const p of MARKET_PRODUCTS)for(const [mode,source] of [['trial','stock'],['bulk','factory']]){
  const fields={productId:p.id,mode,source,unitPrice:p.offers[mode].maxUnitPrice},q=previewMarket(start,fields);
  assert.ok(q.valid,p.name+': '+q.reason);
  let s=take(start,'SIGN_MARKET',fields);
  assert.equal(s.cash,base.cash+q.deposit-q.goodsCost-q.freight);
  assert.equal(s.market.active.received,q.deposit);assert.equal(s.market.active.delivered,0);
  assert.equal(reduceDealRoom(s,{type:'CONTINUE_BUSINESS'}),s);
  assert.equal(reduceDealRoom(s,{type:'SIGN_MARKET',...fields}),s);
  s=take(s,'DELIVER_MARKET');assert.equal(s.market.active.delivered,q.quantity);
  if(mode==='bulk'){assert.equal(s.marketHistory,undefined);assert.equal(s.market.active.received,q.deposit);assert.equal(s.day,q.deliveryDay);s=take(s,'COLLECT_MARKET');}
  assert.equal(s.day,q.paymentDay);assert.equal(s.marketHistory.length,1);
  assert.equal(s.cash,base.cash+q.netProfit);assert.equal(s.marketHistory[0].received,q.revenue);
  assert.equal(reduceDealRoom(s,{type:'COLLECT_MARKET'}),s);
  assert.equal(goodsPriceRecords(s).find(x=>x.clientId==='market-'+p.id)?.product,p.name);
 }
 assert.ok(!base.market&&!start.market.active);
});
test('declined terms are cash-neutral; a negotiated quote and in-flight receivable restore against the same main journal',()=>{
 let s=take(workshop(),'OPEN_MARKET');const p=MARKET_PRODUCTS[0],f={productId:p.id,mode:'bulk',source:'factory',unitPrice:p.offers.bulk.maxUnitPrice};
 const sign=(s,props)=>reduceDealRoom(s,{type:'SIGN_MARKET',...f,...props});
 assert.equal(sign(s,{unitPrice:f.unitPrice+1}),s);assert.equal(sign(s,{surprise:1}),s);
 assert.equal(sign(s,{mode:'trial',unitPrice:1}),s);assert.equal(sign(s,{unitPrice:1.5}),s);
 assert.equal(previewMarket({...s,cash:0},f).valid,false);
 const seed=s;s=sign(s,{unitPrice:f.unitPrice-1});assert.notEqual(s,seed);
 assert.deepEqual(normalizeDealRoom(structuredClone(s)),s);
 s=take(s,'DELIVER_MARKET');const b=parseDealBackup(encodeDealBackup(s));assert.deepEqual(b.state,s);
 let settled=take(b.state,'COLLECT_MARKET');assert.deepEqual(normalizeDealRoom(settled),settled);
 const bad=structuredClone(settled);bad.marketHistory[0].received++;assert.throws(()=>normalizeDealRoom(bad));
 const closed=take(settled,'CLOSE_MARKET');assert.equal(closed.phase,seed.market.returnPhase);
 assert.deepEqual(closed.contracts,seed.contracts);assert.deepEqual(take(closed,'OPEN_MARKET').marketHistory,settled.marketHistory);
 assert.match(home(closed),/已结清 1 笔新品生意/);
});

test('the web quote desk keeps actionable prices, stock and accounts aligned with the main reducer',async()=>{
 const {marketView,bindMarket}=await import('../src/deal-room-market-view.js');
 let s=take(workshop(),'OPEN_MARKET'),ui={},html=marketView(s,ui);
 assert.equal((html.match(/data-market-product=/g)||[]).length,30);
 assert.ok(!marketView(s,{category:'差旅用品'}).includes('data-market-product="tray"'));
 const p=MARKET_PRODUCTS[0];ui={productId:p.id,mode:'bulk',source:'factory',unitPrice:p.offers.bulk.maxUnitPrice+1};
 ui.quoted=JSON.stringify(ui);html=marketView(s,ui);assert.match(html,/data-market-counter/);
 const handlers={},root={querySelectorAll:()=>[],querySelector(sel){return {addEventListener(_,f){handlers[sel]=f;},focus(){}};}};
 bindMarket(root,s,ui,()=>{},action=>{s=reduceDealRoom(s,action)});
 handlers['[data-market-counter]']();assert.equal(ui.unitPrice,p.offers.bulk.maxUnitPrice);
 handlers['[data-market-sign]']();assert.equal(s.market.status,'transit');
 html=marketView(s,{});assert.match(html,/本单未交货/);assert.match(html,/DELIVER_MARKET/);
 s=take(s,'DELIVER_MARKET');assert.match(marketView(s,{}),/COLLECT_MARKET/);
 s=take(s,'COLLECT_MARKET');assert.match(marketView(s,{}),/已经收齐的商品订单 · 1 单/);
});
