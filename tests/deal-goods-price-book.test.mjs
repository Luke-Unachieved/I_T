import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';
import {createDealRoom,reduceDealRoom,previewOffer,currentClient} from '../src/deal-room-engine.js';
import {goodsPriceRecords,comparePriorUnitPrice} from '../src/deal-room-goods-prices.js';
import {careerRecapView} from '../src/deal-room-home.js';import {buildDealHtml} from '../scripts/build-deal-standalone.mjs';
const act=(s,type,extra={})=>{const n=reduceDealRoom(s,{type,...extra});assert.notEqual(n,s,type);return n;};
const deal=(s,id)=>act(act(act(s,'PROPOSE',{optionId:id}),'ADVANCE'),'NEXT_CLIENT');
function home(){let s=createDealRoom();for(const id of ['trial','ready','season'])s=deal(s,id);return s;}
test('an actual quote compares the last settled same-client same-SKU invoice; freight service never inflates the goods price',async()=>{
 const start=home();let s=act(act(start,'CONTINUE_BUSINESS'),'SELECT_CLIENT',{clientId:'ines'});const q=previewOffer(s,'repeat-small'),client=currentClient(s);
 assert.match(comparePriorUnitPrice(s,q,client),/150 件，每件 ¥41\.33；这次每件 ¥66，高 ¥24\.67/);
 assert.equal(comparePriorUnitPrice(s,{...q,specification:'other'},client),'');assert.equal(comparePriorUnitPrice(s,q,{id:'samir',product:client.product}),'');
 const js=(await buildDealHtml()).match(/<script>([\s\S]*?)<\/script>/)[1];const root={innerHTML:'',querySelector(q){return q==='#motion'?{}:null;},querySelectorAll(){return [];}};
 new vm.Script(js).runInNewContext({document:{querySelector:()=>root,documentElement:{classList:{contains:()=>false,add(){}}}},localStorage:{getItem:k=>k.endsWith(':reduced-motion')?null:JSON.stringify(s),setItem(){}},TextEncoder,structuredClone,console},{timeout:2500});assert.match(root.innerHTML,/上次同客同款/);
 s=deal(s,'repeat-small');s=deal(act(s,'SELECT_CLIENT',{clientId:'mira'}),'repeat-small');s=act(act(s,'OPEN_LINEN_FREIGHT'),'SIGN_LINEN_SPLIT');s=act(s,'RECEIVE_LINEN_FREIGHT');assert.ok(!goodsPriceRecords(s).some(r=>r.priceSource==='里斯本展陈'));s=act(act(s,'RECEIVE_LINEN_FREIGHT'),'CLOSE_LINEN_FREIGHT');const row=goodsPriceRecords(s).find(r=>r.priceSource==='里斯本展陈');assert.equal(row.revenue/row.quantity,52);assert.equal(row.separateServiceFee,240);assert.match(careerRecapView(s),/货款 ¥5,200 · 每件 ¥52[^<]*另收赶展服务费 ¥240/);
});
test('the paid factory lot and sold shop quantities price separately, without counting returns or unsold lamps; supply batches retain their own invoices',()=>{
 const actions=JSON.parse(readFileSync(new URL('./fixtures/deal-group-day169-actions.json',import.meta.url)));let s=actions.reduce(reduceDealRoom,createDealRoom());s=act(s,'CLOSE_STUDIO_PROJECT');s=act(act(s,'OPEN_STOCK_PROCUREMENT'),'SIGN_STOCK_PROCUREMENT',{factoryMode:'batch'});assert.ok(!goodsPriceRecords(s).some(o=>o.priceSource==='集团阅读位'));s=act(act(s,'FULFIL_STOCK_PROCUREMENT'),'CLOSE_STOCK_PROCUREMENT');
 for(const terms of ['regular','shelf']){let x=act(act(s,'OPEN_SHOP_TRIAL'),'SIGN_SHOP_TRIAL',{terms});assert.ok(!goodsPriceRecords(x).some(o=>o.priceSource==='街角小店'));x=act(act(x,'SETTLE_SHOP_TRIAL'),'CLOSE_SHOP_TRIAL');const lot=goodsPriceRecords(x).filter(o=>o.specification==='generic-lot');assert.deepEqual(lot.map(o=>[o.quantity,o.revenue/o.quantity]),[[12,75],terms==='regular'?[8,75]:[12,60]]);assert.match(careerRecapView(x),/集团阅读位 · 第/);}
 let x=act(home(),'CONTINUE_BUSINESS');for(let i=0;i<2;i++)x=deal(act(x,'SELECT_CLIENT',{clientId:'mira'}),'repeat-small');x=act(act(x,'START_SUPPLY_PLAN',{clientId:'mira',firstBatch:'small',payment:'deposit'}),'FULFIL_SUPPLY_PLAN');const plan=x.supplyPlanHistory.at(-1),rows=goodsPriceRecords(x).filter(r=>r.specification==='supply-plan');assert.deepEqual(rows.map(r=>[r.quantity,r.revenue,r.paidDay]),plan.lots.map(l=>[l.quantity,l.revenue,l.paymentDay]));
});
