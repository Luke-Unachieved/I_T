import test from 'node:test';
import assert from 'node:assert/strict';
import {collectionPitchView,collectionView,previewCollectionPitch} from '../src/deal-room-collection.js';
import {collectionBoardView} from '../src/deal-room-relationships.js';
const state=()=>({phase:'collection',cash:8520,day:20,collection:{status:'pitch',model:'own',pitchBuyer:'atelier',price:145,cost:80,style:'cream',products:['mira','samir'],orders:[],sampleCost:2490}});
test('pitch exposes true reserve and cash after signing; sleeve sample is included once',()=>{
 const s=state(),before=structuredClone(s),q=previewCollectionPitch(s,'sleeve'),html=collectionPitchView(s,'sleeve');
 assert.equal(q.cost,8240);assert.equal(q.revenue,12560);assert.equal(q.deposit,6280);
 for(const text of ['这单货款 ¥12,560','预计赚到 ¥4,080','客户先付定金 ¥6,280','现在要付 ¥8,240','签完还剩 ¥6,560','回款前需留 ¥240 日常开销','其中纸套出样 ¥1,200'])assert.ok(html.includes(text),text);
 assert.doesNotMatch(html,/保底订单|报价与额外投入/);assert.deepEqual(s,before);
});
test('series accounts use invested, remaining break-even and earned, not negative gain',()=>{
 const s=state();s.collection.status='sample';assert.match(collectionView(s,{}),/还差 ¥2,490 回本/);
 s.collection.orders=[{buyerId:'atelier',buyer:'Atelier',status:'paid',netProfit:2490,sets:50}];assert.match(collectionView(s,{}),/出样已回本/);
 s.collection.orders[0].netProfit=3000;assert.match(collectionView(s,{}),/已赚到 ¥510/);assert.doesNotMatch(collectionView(s,{}),/净增|¥-/);
});
test('private-label draft names actual funding while relationship board avoids tutorial voice',()=>{
 const s=state();s.collection.status='draft';const h=collectionView(s,{model:'private',style:'cream'});assert.match(h,/签完还剩/);assert.match(h,/预计赚到/);
 const board=collectionBoardView(s);assert.match(board,/客户合作与采用范围/);assert.doesNotMatch(board,/已有承诺决定/);
});
test('insufficient signing cash is a shortage, never an apparent overdraft',()=>{
 const s=state();s.cash=100;const q=previewCollectionPitch(s,'sleeve'),html=collectionPitchView(s,'sleeve');assert.equal(q.valid,false);assert.match(html,/还差 ¥1,860/);assert.doesNotMatch(html,/签完还剩 ¥-/);assert.match(html,/data-action="SIGN_COLLECTION_PITCH" disabled/);
 s.collection.status='draft';assert.match(collectionView(s,{model:'own',style:'cream'}),/出样还差 ¥2,390/);
});
