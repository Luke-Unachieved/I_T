import test from 'node:test';
import assert from 'node:assert/strict';
import {createDealRoom,reduceDealRoom} from '../src/deal-room-engine.js';
import {encodeDealBackup,parseDealBackup} from '../src/deal-room-save.js';
import {marketBook,previewMarket} from '../src/deal-room-market.js';
import {marketView,bindMarket,marketAdviserQuote} from '../src/deal-room-market-view.js';
import {goodsPriceRecords} from '../src/deal-room-goods-prices.js';

function act(s,type,fields={}) {
  const next=reduceDealRoom(s,{type,...fields});
  assert.notEqual(next,s,type);
  return next;
}
function workspace() {
  let s=createDealRoom();
  for(const optionId of ['trial','ready','small']) {
    s=act(s,'PROPOSE',{optionId});
    s=act(s,'ADVANCE');
    s=act(s,'NEXT_CLIENT');
  }
  return act(s,'OPEN_MARKET');
}
const freshDraft = s=>act(act(s,'CLOSE_MARKET'),'OPEN_MARKET');
const roundTrip = s=>parseDealBackup(encodeDealBackup(s)).state;
const trial={productId:'tray',mode:'trial',source:'stock',unitPrice:37};
const toolOrder={productId:'ratchet-set',mode:'neighborhood',source:'factory',unitPrice:103};
const noChange=(s,type,fields={})=>assert.equal(reduceDealRoom(s,{type,...fields}),s);
function fiveSettled() {
  let s=workspace();
  for(let i=0;i<5;i++) s=freshDraft(act(act(s,'SIGN_MARKET',trial),'DELIVER_MARKET'));
  return s;
}
function registered() {
  let s=act(fiveSettled(),'SIGN_MARKET',trial);
  s=freshDraft(act(s,'DELIVER_MARKET'));
  return act(s,'REGISTER_NEIGHBORHOOD');
}

test('registration and the first letter require six paid ordinary market contracts',()=>{
  let s=fiveSettled();
  noChange(s,'REGISTER_NEIGHBORHOOD');noChange(s,'SIGN_MARKET',toolOrder);
  assert.doesNotMatch(marketView(s),/林妍/);
  const sixth={productId:'tray',mode:'bulk',source:'factory',unitPrice:32};
  s=act(act(s,'SIGN_MARKET',sixth),'DELIVER_MARKET');
  assert.equal(marketBook(s).receipts.length,5);
  noChange(s,'REGISTER_NEIGHBORHOOD');
  s=freshDraft(act(s,'COLLECT_MARKET'));
  assert.match(marketView(s),/采购台收件箱 · 联采登记/);
  noChange(s,'SIGN_MARKET',toolOrder);
  const previous=s;
  s=act(s,'REGISTER_NEIGHBORHOOD');
  assert.deepEqual([s.cash,s.day,s.contracts],[previous.cash,previous.day,previous.contracts]);
  assert.deepEqual(roundTrip(s),s);noChange(s,'REGISTER_NEIGHBORHOOD');
  assert.match(marketView(freshDraft(s)),/采购台收件箱 · 林妍的来信/);
  assert.equal((marketView(s).match(/data-neighborhood-product=/g)||[]).length,1);
  noChange(s,'SIGN_MARKET',{...toolOrder,productId:'lever-lock'});
  noChange(s,'SIGN_MARKET',{...toolOrder,unitPrice:104});
});

test('12, 18 and 24 stores advance only when their invoices clear; proceeds and saves replay at each stage',()=>{
  let s=registered();
  const previousContracts=s.contracts;
  for(const [stores,productId,unitPrice] of [[12,'ratchet-set',103],[18,'lever-lock',60],[24,'pet-harness',39]]) {
    const before=s, fields={...toolOrder,productId,unitPrice};
    const q=previewMarket(s,fields);
    assert.equal(q.stores,stores);assert.equal(q.valid,true);
    assert.equal(marketAdviserQuote(s,fields).netProfit,q.netProfit);
    assert.match(marketView(s,fields),/林妍的肖像/);
    if(stores===12) {
      assert.deepEqual([q.quantity,q.revenue,q.goodsCost,q.freight,q.operatingCost,q.netProfit],[432,44496,29376,218,390,14512]);
    } else {
      assert.equal((marketView(s).match(/data-neighborhood-product=/g)||[]).length,4);
    }
    s=act(s,'SIGN_MARKET',fields);
    assert.equal(s.cash,before.cash+q.deposit-q.cost);
    noChange(s,'CLOSE_MARKET');noChange(s,'COLLECT_MARKET');
    assert.match(marketView(s),/定金付好了/);assert.deepEqual(roundTrip(s),s);
    s=act(s,'DELIVER_MARKET');
    assert.equal(s.market.active.received,q.deposit);assert.equal(s.market.active.delivered,q.quantity);
    noChange(s,'REGISTER_NEIGHBORHOOD');noChange(s,'DELIVER_MARKET');noChange(s,'CLOSE_MARKET');
    assert.match(marketView(s),/这批货我签收/);assert.deepEqual(roundTrip(s),s);
    s=act(s,'COLLECT_MARKET');noChange(s,'COLLECT_MARKET');
    assert.equal(s.cash-before.cash,q.netProfit);assert.equal(s.market.active.received,q.revenue);
    assert.equal(s.day,q.paymentDay);assert.match(marketView(s),/财务已经付清/);
    assert.deepEqual(roundTrip(s),s);
    assert.equal(goodsPriceRecords(s).findLast(r=>r.clientId==='market-'+productId).priceSource,'门店联采');
    s=freshDraft(s);
  }
  assert.equal(marketBook(s).receipts.length,9);
  assert.deepEqual(s.contracts,previousContracts);
  assert.doesNotMatch(marketView(s),/data-neighborhood-product=/);
  assert.match(marketView(s),/三次联采的明细/);noChange(s,'SIGN_MARKET',toolOrder);
});

test('a letter opens a quote without spending, and a signed order requires the current quoted terms',()=>{
  let s=registered();const before=s,ui={},listeners={};
  const el=(label,dataset={})=>({dataset,addEventListener:(_,f)=>listeners[label]=f,focus(){}});
  const root={querySelectorAll:key=>key==='[data-neighborhood-product]'?[el('letter',{neighborhoodProduct:'ratchet-set'})]:[],
    querySelector:key=>key==='#market-unit-price'?{value:'103',addEventListener(){},focus(){}}:el(key)};
  bindMarket(root,s,ui,()=>{},a=>{s=reduceDealRoom(s,a);});
  listeners.letter();
  assert.equal(s,before);assert.equal(ui.mode,'neighborhood');
  assert.match(marketView(s,ui),/给我一个每套的报价/);
  assert.match(marketView(s,ui),/data-market-sign disabled/);
  listeners['[data-market-sign]']();assert.equal(s,before);
  listeners['[data-market-quote-form]']({preventDefault(){}});
  assert.match(marketView(s,ui),/林妍：¥103/);
  listeners['[data-market-sign]']();
  assert.equal(s.market.active.kind,'neighborhood');assert.equal(s.market.active.quantity,432);
});
