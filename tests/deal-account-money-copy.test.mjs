import test from 'node:test';import assert from 'node:assert/strict';
import {accountView,previewAccount} from '../src/deal-room-account.js';
import {revisionRelationshipsView} from '../src/deal-room-revision-relationships.js';
const draft=()=>({phase:'account',day:72,cash:16630,account:{status:'draft',products:['mira','samir'],unitPrice:86,unitCost:64}});
test('signing shows actual payment, deposit and remainder instead of reserve as a payment',()=>{
 const s=draft(),before=structuredClone(s),q=previewAccount(s,'pilot'),html=accountView(s,'pilot');
 assert.equal(q.cashAfterSigning,5170);for(const t of ['现在要付','¥19,200','客户先付定金','¥7,740','签完还剩','¥5,170','这单货款</small><strong>¥25,800','回款前需留 ¥180 日常开销'])assert.ok(html.includes(t),t);
 assert.doesNotMatch(html,/需自备周转/);assert.ok(html.indexOf('这单货款')<html.indexOf('<details>'));assert.deepEqual(s,before);
 s.cash=100;assert.match(accountView(s,'pilot'),/还差<\/small><strong>¥11,360/);assert.match(accountView(s,'pilot'),/data-action="SIGN_ACCOUNT" disabled/);
});
test('expansion presents the same cash terms; proposal labels already distinguish unsigned work',()=>{
 const s=draft();s.accountHistory=[{...s.account,status:'paid',stores:3}];s.account.expansion=true;s.cash=23050;const html=accountView(s,'remaining');
 for(const t of ['现在要付','客户先付定金','签完还剩','¥11,590','付款明细'])assert.ok(html.includes(t));assert.doesNotMatch(html,/需自备周转/);
 const r=revisionRelationshipsView({collectionRevision:{status:'ready',orders:[]}},'revision-exclusive');assert.doesNotMatch(r,/可提案不是已采购/);assert.match(r,/签后此版不能提案/);assert.match(r,/此版仍可提案 · 未签/);
});
