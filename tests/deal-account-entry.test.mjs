import test from 'node:test';import assert from 'node:assert/strict';
import {createDealRoom,reduceDealRoom,normalizeDealRoom,currentClient} from '../src/deal-room-engine.js';
import {previewAccount,accountView,accountReceipt,accountCoverage,canExpandAccount} from '../src/deal-room-account.js';
const act=(s,type,more={})=>reduceDealRoom(s,{type,...more});
const finish=(s,optionId)=>act(act(act(s,'PROPOSE',{optionId}),'ADVANCE'),'NEXT_CLIENT');
function paidCase(rounds=1){let s=createDealRoom();for(const id of ['trial','ready','season'])s=finish(s,id);for(let r=0;r<rounds;r++){s=act(s,'CONTINUE_BUSINESS');for(let i=0;i<2;i++)s=finish(act(s,'SELECT_CLIENT',{clientId:'mira'}),'repeat-small');}s=act(s,'START_SUPPLY_PLAN',{clientId:'mira',firstBatch:'small',payment:'delivery'});s=act(act(s,'FULFIL_SUPPLY_PLAN'),'START_CLIENT_PROJECTS');for(const clientId of ['mira','samir','ines'])s=finish(act(s,'SELECT_CLIENT',{clientId}),'project-series');s=act(s,'START_CURATION',{clientId:'mira'});return act(act(s,'SIGN_CURATION',{products:['mira','samir','ines'],quantity:40,packaging:'gift'}),'FULFIL_CURATION');}

import {businessHomeView} from '../src/deal-room-home.js';
test('new entry offers three stores only; legacy selected quote remains operable',()=>{
 const s=act(paidCase(),'START_ACCOUNT',{referrerId:'mira'}),html=accountView(s,'pilot');
 assert.match(html,/data-account-option="pilot"/);assert.doesNotMatch(html,/data-account-option="(?:rollout|funded)"|一次签六店/);
 for(const id of ['rollout','funded']){const legacy=accountView(s,id);assert.match(legacy,new RegExp('data-account-option="'+id+'" aria-pressed="true"'));assert.match(legacy,/data-action="SIGN_ACCOUNT"/);}
});
test('historical funded six-store signing restores and fulfills exactly once',()=>{
 const s=act(paidCase(),'START_ACCOUNT',{referrerId:'mira'}),q=previewAccount(s,'funded');assert.equal(q.valid,true);
 const signed=act(s,'SIGN_ACCOUNT',{optionId:'funded'}),restored=normalizeDealRoom(JSON.parse(JSON.stringify(signed)));
 assert.deepEqual(restored,signed);assert.match(accountView(restored,'pilot'),/6 家门店/);assert.match(accountView(restored,'pilot'),/data-action="FULFIL_ACCOUNT"/);
 const done=act(restored,'FULFIL_ACCOUNT');assert.equal(done.cash,s.cash+q.netProfit);assert.equal(accountCoverage(done),6);assert.deepEqual(normalizeDealRoom(done),done);assert.equal(act(done,'FULFIL_ACCOUNT'),done);
});
test('three stores expose continuation before closed details; remaining contract reaches real six-store total',()=>{
 const start=act(paidCase(),'START_ACCOUNT',{referrerId:'mira'}),q=previewAccount(start,'pilot');
 let s=act(act(act(start,'SIGN_ACCOUNT',{optionId:'pilot'}),'FULFIL_ACCOUNT'),'CLOSE_ACCOUNT');
 const html=businessHomeView(s,{career:{eligible:false,reason:''},referrals:[]});
 assert.ok(html.indexOf('data-action="OPEN_ACCOUNT_EXPANSION"')<html.indexOf('<details'));assert.match(html,/余下三家店，接着做吗/);
 const original=structuredClone(s.accountHistory[0]);s=act(s,'OPEN_ACCOUNT_EXPANSION');const q2=previewAccount(s,'remaining');
 s=act(act(s,'SIGN_ACCOUNT_EXPANSION'),'FULFIL_ACCOUNT_EXPANSION');assert.equal(accountCoverage(s),6);assert.equal(s.day,start.day+12);assert.equal(s.cash,start.cash+q.netProfit+q2.netProfit);assert.deepEqual(s.accountHistory[0],original);assert.deepEqual(normalizeDealRoom(s),s);
});

test('historical full-price six-store contract also survives replay and payment',()=>{
 const s=act(paidCase(10),'START_ACCOUNT',{referrerId:'mira'}),q=previewAccount(s,'rollout');assert.equal(q.valid,true);
 const signed=act(s,'SIGN_ACCOUNT',{optionId:'rollout'}),restored=normalizeDealRoom(JSON.parse(JSON.stringify(signed)));
 assert.deepEqual(restored,signed);const done=act(restored,'FULFIL_ACCOUNT');assert.equal(accountCoverage(done),6);assert.equal(done.cash,s.cash+q.netProfit);assert.deepEqual(normalizeDealRoom(done),done);
});
