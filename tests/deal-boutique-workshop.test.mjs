import test from 'node:test';
import assert from 'node:assert/strict';
import {createDealRoom,reduceDealRoom,normalizeDealRoom,careerOpportunity} from '../src/deal-room-engine.js';
import {businessHomeView,careerRecapView} from '../src/deal-room-home.js';
const go=(s,type,data={})=>{const n=reduceDealRoom(s,{type,...data});assert.notEqual(n,s,type);return n;};
const sell=(s,optionId)=>go(go(go(s,'PROPOSE',{optionId}),'ADVANCE'),'NEXT_CLIENT');
function repeats(clients=['mira','ines']){
 let s=['trial','ready','small'].reduce(sell,createDealRoom());s=go(s,'CONTINUE_BUSINESS');
 for(const clientId of clients)s=sell(go(s,'SELECT_CLIENT',{clientId}),'repeat-small');return s;
}
const plan=(s,id='ines',payment='delivery')=>go(s,'START_SUPPLY_PLAN',{clientId:id,firstBatch:'small',payment});
const desk=s=>businessHomeView(s,{career:careerOpportunity(s),referrals:[]});
const closed=s=>careerRecapView(s).includes('把熟客生意做稳了');
test('a boutique can finish through actual returning customers and a paid profitable mandate, with no design, chain or reward',()=>{
 const clients=repeats(),signed=plan(clients);assert.match(desk(clients),/只做熟客，也能做成一间精品工作室/);assert.equal(closed(clients),false);assert.equal(closed(signed),false);
 const s=go(signed,'FULFIL_SUPPLY_PLAN'),original=structuredClone(s);assert.equal(s.day,21);assert.equal(s.cash,12504);assert.equal(s.collection,undefined);assert.ok(!s.accountHistory?.length);
 assert.match(desk(s),/id="finish-session">为这间精品工作室收个尾/);
 const html=careerRecapView(s);for(const term of ['精品工作室收尾','Mira','Inês','第 16 天交了 50 件','第 21 天再交 100 件','¥9,504','净赚 ¥2,964','¥7,504','可用资金 ¥12,504','自己的成交单价','id="resume-work"'])assert.ok(html.includes(term),term);
 assert.deepEqual(s,original);assert.deepEqual(normalizeDealRoom(s),s);assert.equal(go(s,'CONTINUE_BUSINESS').cash,s.cash);
 const later=go(plan(clients,'mira','deposit'),'FULFIL_SUPPLY_PLAN');assert.ok(closed(later));assert.ok(careerRecapView(later).includes('第 '+later.supplyPlan.finishDay+' 天收齐'));
});
test('more orders for just one buyer, missing payments, a loss or unrelated projects do not masquerade as a boutique outcome',()=>{
 const mono=go(plan(repeats(['mira','mira']),'mira'),'FULFIL_SUPPLY_PLAN');assert.equal(closed(mono),false);
 const s=go(plan(repeats()),'FULFIL_SUPPLY_PLAN'),p=s.supplyPlanHistory[0];
 for(const partial of [{status:'fulfilling'},{eventIndex:1},{netProfit:0},{finishDay:s.day+1},{balanceDue:0}])assert.equal(closed({...s,supplyPlanHistory:[{...p,...partial}]}),false);
 assert.equal(closed({...s,retailOperatingCost:20000}),false);
 for(const rev of [{status:'receivable'},{projectId:'mira'},{netProfit:0}])assert.equal(closed({...s,contracts:s.contracts.map(c=>c.businessRound&&c.clientId==='mira'?{...c,...rev}:c)}),false);
 let design=go(s,'START_OPENING_CURATION',{clientId:'mira'});design=go(go(design,'SIGN_CURATION',{products:['mira','samir'],quantity:40,packaging:'plain'}),'FULFIL_CURATION');design=go(go(design,'START_COLLECTION'),'SIGN_COLLECTION',{model:'own',style:'cream'});design=go(design,'CLOSE_COLLECTION');assert.equal(closed(design),false);
});
