import test from 'node:test';
import assert from 'node:assert/strict';
import {PROPERTY_CATALOG,PROPERTY_ACTION_KEYS,canonicalPropertyAction,propertyHoldings,propertyPreview,applyPropertyAction} from '../src/deal-room-property.js';

const fresh=(cash=5_000_000)=>({day:15,cash,phase:'review',history:[],contracts:[{status:'paid'}]});
const buy=(s,id)=>applyPropertyAction(s,{type:'BUY_PROPERTY',assetId:id});
const trade=(s,id,old)=>applyPropertyAction(s,{type:'TRADE_IN_PROPERTY',assetId:id,tradeInId:old});
const select=(s,id)=>applyPropertyAction(s,{type:'SWITCH_PROPERTY',assetId:id});

test('catalogue carries final schedules and never mistakes old convertible price for the camper',()=>{
  assert.deepEqual(PROPERTY_CATALOG.filter(x=>x.kind==='office').map(x=>x.price),[24800,42800,68800,98000,138000,198000,278000,428000]);
  assert.deepEqual(PROPERTY_CATALOG.filter(x=>x.kind==='home').map(x=>x.price),[0,24800,108000,428000,1680000]);
  assert.deepEqual(PROPERTY_CATALOG.filter(x=>x.kind==='car').map(x=>x.price),[3800,18800,null,1018000,1180000,1380000,1880000,2780000]);
  assert.equal(PROPERTY_CATALOG.find(x=>x.id==='car-camper').priceStatus,'unverified');
  assert.equal(PROPERTY_CATALOG.find(x=>x.id==='car-gt').nameStatus,'type-label');
  assert.equal(new Set(PROPERTY_CATALOG.map(x=>x.id)).size,21);
  for(const item of PROPERTY_CATALOG)assert.ok(Object.isFrozen(item));
});

test('preview is a projection: no state, date, progress, fee or fame change',()=>{
  const s=fresh(5000), before=structuredClone(s);
  const q=propertyPreview(s,'office-sky');
  assert.equal(q.shortfall,423000);assert.equal(q.valid,false);assert.equal(q.cashAfter,null);
  assert.strictEqual(buy(s,'office-sky'),s);
  const h=propertyHoldings(s);h.active.home='x';h.owned.length=0;
  assert.deepEqual(s,before);assert.equal(propertyHoldings(s).active.home,'home-starter');
  assert.strictEqual(buy(s,'car-camper'),s);
});

test('offices can be bought directly; buying and selecting own no business data',()=>{
  const s={...fresh(428000),fame:99,officeAnnex:{id:'sample-terrace',display:['mira']},personalLife:{purchases:[{itemId:'chair'}]}};
  const paid=buy(s,'office-sky');assert.equal(paid.cash,0);assert.equal(paid.fame,100);
  assert.equal(paid.propertyAssets.active.office,'office-sky');assert.strictEqual(buy(paid,'office-sky'),paid);
  assert.strictEqual(select(paid,'office-window'),paid);assert.equal(paid.day,s.day);assert.equal(paid.phase,s.phase);
  for(const k of ['history','contracts','officeAnnex','personalLife'])assert.deepEqual(paid[k],s[k]);
  assert.equal(s.cash,428000);assert.ok(!s.propertyAssets);
});

test('shipped window studio retains its true purchase price and annex without repricing',()=>{
  const s={...fresh(),officeImprovement:{id:'window-studio',day:4,price:3600},officeAnnex:{id:'sample-terrace'}};
  assert.deepEqual(propertyHoldings(s).owned.find(x=>x.id==='office-window'),{id:'office-window',paid:3600,day:4});
  assert.strictEqual(buy(s,'office-window'),s);
  const b=buy(s,'office-sky'),back=select(b,'office-window');assert.equal(back.propertyAssets.active.office,'office-window');
  assert.equal(back.fame,b.fame);assert.equal(back.cash,b.cash);assert.equal(back.propertyAssets.purchases.length,1);
  assert.deepEqual(back.officeImprovement,s.officeImprovement);assert.deepEqual(back.officeAnnex,s.officeAnnex);
});

test('optional trade-in is same-category only and uses historical cash actually paid, not current list or face value',()=>{
  const one=buy(fresh(),'home-flat'), two=trade(one,'home-harbor','home-flat');
  assert.equal(two.cash,one.cash-(108000-17360));
  assert.equal(two.propertyAssets.owned.find(x=>x.id==='home-harbor').paid,90640);
  assert.ok(!two.propertyAssets.owned.some(x=>x.id==='home-flat'));
  const three=propertyPreview(two,'home-tower','home-harbor');
  assert.equal(three.tradeInAllowance,63448);assert.equal(three.cashDue,364552);
  const kept=buy(one,'home-harbor');assert.ok(kept.propertyAssets.owned.some(x=>x.id==='home-flat'));
  assert.strictEqual(trade(one,'office-yard','home-flat'),one);
  assert.strictEqual(trade(one,'car-hatch','home-flat'),one);
  assert.strictEqual(trade(one,'home-harbor','home-starter'),one);
});

test('over-credit never pays out cash, cannot be reused, prior home can be selected for no charge',()=>{
  const a=buy(fresh(),'home-villa'), q=propertyPreview(a,'home-harbor','home-villa');
  assert.ok(q.tradeInAllowance>q.price);assert.equal(q.creditUsed,108000);assert.equal(q.cashDue,0);
  const b=trade(a,'home-harbor','home-villa');assert.equal(b.cash,a.cash);assert.equal(b.fame,15);
  assert.strictEqual(trade(b,'home-flat','home-villa'),b);const home=select(b,'home-starter');
  assert.equal(home.propertyAssets.active.home,'home-starter');assert.equal(home.cash,b.cash);assert.equal(home.fame,b.fame);
});

test('vehicle trade-in, switch and repurchase cannot farm publicity; previous receipts are retained',()=>{
  let a=buy(fresh(),'car-hatch');const b=buy(a,'car-wagon');assert.equal(b.fame,15);
  const switched=select(b,'car-hatch');assert.equal(switched.fame,15);assert.equal(switched.cash,b.cash);
  const c=trade(switched,'car-super','car-hatch');assert.equal(c.fame,30);assert.equal(c.propertyAssets.active.car,'car-super');
  const d=buy(c,'car-hatch');assert.equal(d.fame,c.fame);assert.equal(d.propertyAssets.purchases.length,4);
  assert.equal(d.propertyAssets.purchases[2].credit,2660);
  assert.equal(d.propertyAssets.purchases[2].tradeInId,'car-hatch');
});

test('failed and forged actions do not change balances or overwrite malformed legacy state',()=>{
  const s=fresh();assert.ok(Object.isFrozen(PROPERTY_ACTION_KEYS));
  for(const a of [null,{type:'__proto__'}, {type:'BUY_PROPERTY',assetId:'office-sky',price:1},
    {type:'TRADE_IN_PROPERTY',assetId:'car-wagon'}, {type:'BUY_PROPERTY',assetId:'not-a-car'},
    {type:'TRADE_IN_PROPERTY',assetId:'car-wagon',tradeInId:'car-wagon'}]){
    assert.equal(canonicalPropertyAction(a),null);assert.strictEqual(applyPropertyAction(s,a),s);
  }
  for(const bad of [{...s,cash:Infinity},{...s,day:-1},{...s,fame:101},{...s,propertyAssets:{}},
    {...s,officeImprovement:{id:'window-studio',day:1,price:NaN}}])assert.strictEqual(buy(bad,'car-wagon'),bad);
  const restore=JSON.parse(JSON.stringify(buy(s,'home-tower')));
  assert.equal(propertyPreview(restore,'home-villa','home-tower').creditUsed,299600);
});

test('old stored vehicle counts at its own price even when latest catalogue was repriced',()=>{
  const s=buy(fresh(),'car-roadster');
  s.propertyAssets.owned[1].paid=56801;s.propertyAssets.purchases[0].paid=56801;s.propertyAssets.purchases[0].price=56801;
  const q=propertyPreview(s,'car-gt','car-roadster');assert.equal(q.tradeInAllowance,39760);
});
