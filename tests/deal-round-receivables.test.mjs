import test from 'node:test';import assert from 'node:assert/strict';
import {createDealRoom,reduceDealRoom as reduce,normalizeDealRoom,previewOffer,businessOpportunities} from '../src/deal-room-engine.js';
import {roundReceivableSummary as summary,advanceRoundTime,previewRoundSigning} from '../src/deal-room-round-receivables.js';
const act=(s,type,data={})=>{const n=reduce(s,{type,...data});assert.notEqual(n,s,type);return n;};
function start(enable=true){let s=createDealRoom();for(const optionId of ['trial','ready','small'])for(const a of [{type:'PROPOSE',optionId},{type:'ADVANCE'},{type:'NEXT_CLIENT'}])s=reduce(s,a);s=act(s,'CONTINUE_BUSINESS');return enable?act(s,'ENABLE_ROUND_RECEIVABLES'):s;}
const sign=(s,id,optionId='repeat-scale')=>act(act(s,'SELECT_CLIENT',{clientId:id}),'PROPOSE',{optionId});
const deliver=s=>act(s,'DELIVER_ROUND_ORDER');
function verify(s){assert.deepEqual(normalizeDealRoom(s),s);const rows=s.contracts.filter(c=>c.roundReceivable);assert.equal(rows.reduce((n,c)=>n+c.operatingCost,0),(s.day-s.roundReceivables.startDay)*30);}
test('delivery opens actual second contract window; intermediate due receipts settle once without double daily cost',()=>{
 let s=start(),initial=s.cash,day=s.day;s=sign(s,'mira');assert.equal(reduce(s,{type:'ADVANCE'}),s);s=deliver(s);assert.equal(s.day,day+4);assert.equal(s.phase,'portfolio');assert.equal(summary(s).outstanding,3990);assert.equal(businessOpportunities(s).find(o=>o.id==='mira').available,false);verify(s);
 s=sign(s,'samir');s=deliver(s);assert.equal(s.day,day+8);assert.equal(s.contracts.at(-2).status,'paid');assert.equal(s.contracts.at(-1).status,'receivable');verify(s);
 assert.equal(reduce(s,{type:'FINISH_ROUND_RECEIVABLES'}),s);s=act(s,'WAIT_ROUND_RECEIPT');assert.equal(s.day,day+13);verify(s);assert.equal(reduce(s,{type:'WAIT_ROUND_RECEIPT'}),s);
 assert.equal(s.cash,initial+1600+1700-13*30);assert.equal(summary(s).canFinish,true);s=act(s,'FINISH_ROUND_RECEIVABLES');assert.equal(s.phase,'review');assert.deepEqual(normalizeDealRoom(s),s);
 s=act(s,'CONTINUE_BUSINESS');s=act(s,'ENABLE_ROUND_RECEIVABLES');assert.equal(summary(s).signed,0);
});
test('all ordered pairs and small/scale terms replay and settle accounting, including last customer',()=>{
 for(const a of ['mira','samir','ines'])for(const b of ['mira','samir','ines'])for(const first of ['repeat-small','repeat-scale'])for(const second of ['repeat-small','repeat-scale']){
 let s=start(),cash=s.cash;s=deliver(sign(s,a,first));if(a===b&&summary(s).outstanding)s=act(s,'WAIT_ROUND_RECEIPT');s=deliver(sign(s,b,second));while(summary(s).outstanding)s=act(s,'WAIT_ROUND_RECEIPT');verify(s);
 const rows=s.contracts.filter(c=>c.roundReceivable);assert.equal(s.cash,cash+rows.reduce((n,c)=>n+c.netProfit,0));s=act(s,'FINISH_ROUND_RECEIVABLES');assert.deepEqual(normalizeDealRoom(s),s);
 }
});
test('same-day due payments all settle once, dates cannot rewind',()=>{
 const s={day:5,cash:1000,businessRound:1,roundReceivables:{active:true,round:1},contracts:['mira','samir'].map(clientId=>({clientId,businessRound:1,roundReceivable:true,status:'receivable',paymentDay:7,balanceDue:500,profit:300,operatingCost:0,netProfit:300}))};
 assert.equal(advanceRoundTime(s,7),true);assert.equal(s.cash,1940);assert.equal(s.contracts.reduce((n,c)=>n+c.operatingCost,0),60);assert.equal(advanceRoundTime(s,7),true);assert.equal(s.cash,1940);const before=structuredClone(s);assert.equal(advanceRoundTime(s,6),false);assert.deepEqual(s,before);
});
test('future receipt never pays current procurement and low cash cannot start an unfinishable round',()=>{
 let s=start();s=deliver(sign(s,'mira'));s={...s,cash:1};const selected={...s,phase:'negotiating',clientIndex:1};const q=previewOffer(selected,'repeat-scale');assert.equal(q.valid,false);assert.match(q.reason,/未来尾款/);
 const old=start(false);old.cash=0;assert.equal(reduce(old,{type:'ENABLE_ROUND_RECEIVABLES'}),old);
 const due={...s,cash:100,day:13},base={cost:50,deposit:0,profit:50,revenue:100,balanceDue:100,operatingCost:300,deliveryDay:15,paymentDay:23,reason:''};assert.equal(previewRoundSigning({...due,phase:'negotiating'},base,'samir').valid,false);
});
test('old rounds remain old; mode gates pause/back/other businesses and strict save tampering',()=>{
 let old=start(false);old=sign(old,'ines');const day=old.contracts.at(-1).paymentDay;old=act(old,'ADVANCE');assert.equal(old.day,day);assert.equal(old.roundReceivables,undefined);assert.deepEqual(normalizeDealRoom(old),old);
 let s=start();for(const type of ['BACK_FROM_CLIENTS','CONTINUE_BUSINESS','START_CLIENT_PROJECTS','START_COLLECTION','ENABLE_ROUND_RECEIVABLES','WAIT_ROUND_RECEIPT','FINISH_ROUND_RECEIVABLES'])assert.equal(reduce(s,{type}),s);
 s=act(s,'SELECT_CLIENT',{clientId:'mira'});s=act(s,'BACK_TO_CLIENTS');s=deliver(sign(s,'mira'));for(const type of ['PAUSE_CLIENT_PROJECTS','BACK_FROM_CLIENTS','ADVANCE','NEXT_CLIENT'])assert.equal(reduce(s,{type}),s);
 const bad=structuredClone(s);bad.contracts.at(-1).status='paid';assert.throws(()=>normalizeDealRoom(bad));assert.deepEqual(normalizeDealRoom(s),s);
});

test('zero-contract opt-in can be cancelled and re-enabled without cost, but signed rounds cannot',()=>{
 let s=start(),cash=s.cash,day=s.day;s=act(s,'SELECT_CLIENT',{clientId:'mira'});assert.equal(reduce(s,{type:'CANCEL_ROUND_RECEIVABLES'}),s);s=act(s,'BACK_TO_CLIENTS');s=act(s,'CANCEL_ROUND_RECEIVABLES');assert.equal(s.phase,'portfolio');assert.equal(s.roundReceivables.active,false);assert.equal(s.cash,cash);assert.equal(s.day,day);assert.deepEqual(normalizeDealRoom(s),s);assert.equal(reduce(s,{type:'CANCEL_ROUND_RECEIVABLES'}),s);
 const legacy=sign(s,'mira');assert.equal(legacy.contracts.at(-1).roundReceivable,undefined);assert.deepEqual(normalizeDealRoom(act(legacy,'ADVANCE')),act(legacy,'ADVANCE'));
 s=act(s,'ENABLE_ROUND_RECEIVABLES');s=sign(s,'mira');assert.equal(reduce(s,{type:'CANCEL_ROUND_RECEIVABLES'}),s);s=deliver(s);assert.equal(reduce(s,{type:'CANCEL_ROUND_RECEIVABLES'}),s);assert.deepEqual(normalizeDealRoom(s),s);
});

test('one fully settled contract may close voluntarily without changing old two-order finish semantics',()=>{
 let s=start();assert.equal(summary(s).canCloseSettled,false);assert.equal(reduce(s,{type:'CLOSE_SETTLED_ROUND'}),s);
 s=sign(s,'samir','repeat-small');assert.equal(reduce(s,{type:'CLOSE_SETTLED_ROUND'}),s);s=deliver(s);assert.equal(summary(s).canCloseSettled,true);assert.equal(summary(s).canFinish,false);assert.equal(reduce(s,{type:'FINISH_ROUND_RECEIVABLES'}),s);
 const before=structuredClone(s);s=act(s,'CLOSE_SETTLED_ROUND');assert.equal(s.phase,'review');assert.equal(s.roundReceivables.active,false);assert.equal(s.cash,before.cash);assert.equal(s.day,before.day);assert.deepEqual(s.contracts,before.contracts);assert.equal(s.businessSigned,1);assert.deepEqual(normalizeDealRoom(s),s);assert.equal(reduce(s,{type:'CLOSE_SETTLED_ROUND'}),s);
 s=act(s,'CONTINUE_BUSINESS');s=act(s,'ENABLE_ROUND_RECEIVABLES');assert.equal(summary(s).signed,0);
});
test('settled close never releases outstanding production or receivables, including second signed contract',()=>{
 let s=deliver(sign(start(),'mira'));assert.equal(summary(s).canCloseSettled,false);assert.equal(reduce(s,{type:'CLOSE_SETTLED_ROUND'}),s);s=act(s,'WAIT_ROUND_RECEIPT');assert.equal(summary(s).canCloseSettled,true);
 s=act(s,'SELECT_CLIENT',{clientId:'samir'});assert.equal(reduce(s,{type:'CLOSE_SETTLED_ROUND'}),s);s=act(s,'PROPOSE',{optionId:'repeat-small'});assert.equal(summary(s).canCloseSettled,false);assert.equal(reduce(s,{type:'CLOSE_SETTLED_ROUND'}),s);s=deliver(s);assert.equal(summary(s).canCloseSettled,true);assert.equal(summary(s).canFinish,true);s=act(s,'CLOSE_SETTLED_ROUND');assert.deepEqual(normalizeDealRoom(s),s);
});
