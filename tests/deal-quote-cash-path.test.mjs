import test from 'node:test';
import assert from 'node:assert/strict';
import {quoteCashPathView} from '../src/deal-room-quote-view.js';
const offer={cashAfterSigning:1800,cashAfterPayment:4200,accepted:true};
test('quote cash sketch uses the three supplied amounts rather than inventing market data',()=>{
 const html=quoteCashPathView({cash:3200},offer);
 for(const amount of ['¥3,200','¥1,800','¥4,200'])assert.ok(html.includes(amount));
 assert.match(html,/后两项为预计/);assert.doesNotMatch(html,/NaN|Infinity|行情|最低现金/);
});
test('unagreed terms and invalid numbers never produce a confident cash path',()=>{
 assert.equal(quoteCashPathView({cash:3200},{...offer,accepted:false}),'');
 for(const cash of [NaN,Infinity,'3200',null])assert.equal(quoteCashPathView({cash},offer),'');
});
test('zero and negative milestones remain finite and negative cash is marked',()=>{
 assert.doesNotMatch(quoteCashPathView({cash:0},{cashAfterSigning:0,cashAfterPayment:0}),/NaN|Infinity/);
 assert.match(quoteCashPathView({cash:100},{cashAfterSigning:-200,cashAfterPayment:400}),/class="cash-path-negative"/);
});
test('overlapping round receipts are disclosed instead of presented as this order alone',()=>{
 assert.match(quoteCashPathView({cash:3200},offer,{roundActive:true}),/其他已签订单/);
});
