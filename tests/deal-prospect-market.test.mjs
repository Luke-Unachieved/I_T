import test from 'node:test';
import assert from 'node:assert/strict';
import {createDealRoom,reduceDealRoom} from '../src/deal-room-engine.js';
import {encodeDealBackup,parseDealBackup} from '../src/deal-room-save.js';
import {prospectInbox} from '../src/deal-room-prospects.js';
import {previewMarket} from '../src/deal-room-market.js';
import {goodsPriceRecords} from '../src/deal-room-goods-prices.js';

const go=(s,type,fields={})=>{let n=reduceDealRoom(s,{type,...fields});assert.notEqual(n,s,type);return n;};
function bench(){let s=createDealRoom();for(const optionId of ['trial','ready','small']){s=go(s,'PROPOSE',{optionId});s=go(s,'ADVANCE');s=go(s,'NEXT_CLIENT');}return go(s,'OPEN_MARKET');}

test('one hundred additional rotating customers offer two meaningful first-order terms',()=>{
 const s=bench(),all=Array.from({length:20},(_,w)=>prospectInbox({...s,day:7*w+1})).flat();
 assert.equal(new Set(all.map(r=>r.person.id)).size,100);
 assert.equal(all.length,100);
 assert.ok(all.every(r=>r.options[0].maxUnitPrice>r.options[1].maxUnitPrice&&r.options[0].followupDays>r.options[1].followupDays));
 assert.equal(all.find(r=>r.person.displayName==='Joon Lim').product.name,'不锈钢餐夹');
 assert.ok(all.every(r=>r.opening&&r.product&&r.replyBy));
});

for(const [optionId,days] of [['quote',7],['concession',3]])test('paid prospect '+optionId+' keeps price, buyer, stock delivery, save and follow-up consistent',()=>{
 const s=bench(), row=prospectInbox(s)[0], o=row.options.find(x=>x.id===optionId);
 const fields={customerId:row.person.id,optionId,source:'stock',unitPrice:o.maxUnitPrice};
 const q=previewMarket(s,fields);
 assert.ok(q.valid,q.reason);
 assert.equal(reduceDealRoom(s,{type:'SIGN_PROSPECT_LOT_V1',...fields,unitPrice:o.maxUnitPrice+1}),s);
 let n=go(s,'SIGN_PROSPECT_LOT_V1',fields);
 assert.equal(previewMarket(n,fields).valid,false);
 n=go(n,'DELIVER_MARKET');
 if(n.market.status==='receivable')n=go(n,'COLLECT_MARKET');
 assert.equal(n.marketHistory[0].received,q.revenue);
 assert.equal(n.marketHistory[0].customerId,row.person.id);
 assert.equal(n.cash,s.cash+q.netProfit);
 assert.equal(goodsPriceRecords(n).filter(x=>x.clientId==='prospect-'+row.person.id).length,1);
 assert.equal(reduceDealRoom(n,{type:'COLLECT_MARKET'}),n);
 n=go(n,'CLOSE_MARKET');
 const stage=prospectInbox({...n,day:n.day+days-1});
 assert.ok(stage.every(x=>x.person.id!==row.person.id));
 const repeat=prospectInbox({...n,day:n.day+days}).find(x=>x.person.id===row.person.id);
 assert.equal(repeat.isRepeat,true);assert.deepEqual(repeat.options.map(x=>x.id),['reorder']);
 assert.deepEqual(parseDealBackup(encodeDealBackup(n)).state,n);
});
