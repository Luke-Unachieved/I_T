import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../src/trade-app.js',import.meta.url),'utf8');
// UI source and formatter contracts, not browser/engine evidence.
test('payment choice is limited to USD non-flagship with standard reset and engine action forwarding',()=>{
 assert.match(source,/o.currency==='USD'&&o.kind!=='flagship'/);
 assert.match(source,/paymentTerms:'standard'/);assert.match(source,/PAYMENT_TERMS.map/);
 assert.match(source,/'quote-terms':'paymentTerms'/);assert.match(source,/options=\{\.\.\.quoteOptions\}/);
 assert.match(source,/type:'ACCEPT',offerId:id,\.\.\.options/);
 assert.match(source,/o.paymentTerms\?\.depositRate\?\?o.offer.depositRate/);
 assert.match(source,/o.paymentTerms\?\.payLagDays\?\?o.payLagDays/);
 assert.match(source,/r.paymentTerms\?`订金/);assert.match(source,/r.paymentTerms.depositRate/);assert.match(source,/r.paymentTerms.payLagDays/);
});
test('comparison holds other choices constant and limits feedback to profit and timing',()=>{
 const helper=source.slice(source.indexOf('function paymentComparison('),source.indexOf('function fxQuote('));
 assert.match(helper,/\.\.\.quoteOptions,paymentTerms:'standard'/);
 assert.doesNotMatch(helper,/chanceDiff|cashDiff|条件价差/);
 const base={profit:1000,chance:88,settlementDay:50};
 const c={state:{},quoteId:'a',quoteOptions:{supplier:'reliable',fxMode:'locked'},money:n=>'¥'+n,quoteOrder:()=>base,forecastCash:()=>({minimum:6000})};
 vm.createContext(c);vm.runInContext(helper,c);
 const q={offer:{kind:'long'},paymentTerms:{id:'cashflow',depositRate:40,payLagDays:14,priceAdjustment:-4},profit:600,chance:76,settlementDay:36};
 const html=c.paymentComparison(q,{minimum:7000});
 for(const text of ['订金 40%','交付后 14 天收尾款','少赚¥400','早14 天收款'])assert.ok(html.includes(text),text);
 assert.doesNotMatch(html,/推荐|危险|少垫|最低现金|成交率/);
 const floating=c.paymentComparison({...q,fx:{mode:'spot'},profit:1300,settlementDay:64},{minimum:5000});assert.match(floating,/预计多赚¥300/);assert.match(floating,/晚14 天收款/);
});
test('standard legacy and fixed flagship display actual original terms without fake proposal',()=>{
 const helper=source.slice(source.indexOf('function paymentComparison('),source.indexOf('function fxQuote('));
 const q={offer:{kind:'flagship',depositRate:15},payLagDays:7,profit:500,chance:80,settlementDay:30};
 const c={state:{},quoteId:'a',quoteOptions:{},money:n=>'¥'+n,quoteOrder:()=>q,forecastCash:()=>({minimum:5000})};
 vm.createContext(c);vm.runInContext(helper,c);
 const html=c.paymentComparison(q,{minimum:5000});
 assert.match(html,/订金 15%/);assert.match(html,/交付后 7 天/);assert.match(html,/按原询盘付款条件/);assert.match(html,/框架试单条件固定/);
});
