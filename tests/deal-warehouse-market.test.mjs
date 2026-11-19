import test from 'node:test';
import assert from 'node:assert/strict';
import {createDealRoom,reduceDealRoom} from '../src/deal-room-engine.js';
import {encodeDealBackup,parseDealBackup} from '../src/deal-room-save.js';
import {warehouseSummary,previewWarehouseIssue} from '../src/deal-room-warehouse.js';
import {previewMarket} from '../src/deal-room-market.js';
import {MARKET_PRODUCTS} from '../src/deal-room-market-data.js';

const take=(s,type,fields={})=>{const n=reduceDealRoom(s,{type,...fields});assert.notEqual(n,s,type);return n;};
test('a normal order can use paid arrived warehouse goods and charges only outbound freight in cash',()=>{
 let s=createDealRoom();
 for(const optionId of ['trial','ready','small']){s=take(s,'PROPOSE',{optionId});s=take(s,'ADVANCE');s=take(s,'NEXT_CLIENT');}
 s=take(s,'OPEN_MARKET');
 const p=MARKET_PRODUCTS[0],offer=p.offers.trial;
 const boxes=Math.ceil(offer.quantity/p.sources.stock.packSize);
 const draft={productId:p.id,mode:'trial',source:'warehouse',unitPrice:offer.maxUnitPrice};
 const buy={productId:p.id,source:'stock',boxes,revision:warehouseSummary(s).revision};
 s=take(s,'BUY_WAREHOUSE_STOCK',buy);
 assert.equal(previewMarket(s,draft).valid,false);
 assert.equal(reduceDealRoom(s,{type:'BUY_WAREHOUSE_STOCK',...buy}),s);
 s=take(s,'WAIT_WAREHOUSE_STOCK',{revision:warehouseSummary(s).revision});
 const q=previewMarket(s,draft),issue=previewWarehouseIssue(s,draft.productId,offer.quantity);
 assert.ok(q.valid,q.reason);
 assert.equal(q.goodsCost,issue.bookCost);
 assert.equal(q.cashPayable,q.freight);
 let n=take(s,'SIGN_MARKET',draft);
 assert.equal(n.cash,s.cash+q.deposit-q.freight);
 assert.equal(warehouseSummary(n).issuedQuantity,offer.quantity);
 assert.equal(warehouseSummary(n).usedBoxes,boxes-issue.freedBoxes);
 assert.equal(reduceDealRoom(n,{type:'SIGN_MARKET',...draft}),n);
 n=take(n,'DELIVER_MARKET');
 if(n.market.status==='receivable')n=take(n,'COLLECT_MARKET');
 assert.equal(n.cash,s.cash+q.revenue-q.freight-q.operatingCost);
 assert.equal(n.market.active.netProfit,q.revenue-q.freight-q.operatingCost-issue.bookCost);
 assert.deepEqual(parseDealBackup(encodeDealBackup(n)).state,n);
});
