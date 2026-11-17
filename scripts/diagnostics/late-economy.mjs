// Read-only simulation: production reducer, canonical action histories, no cash injection.
import assert from 'node:assert/strict';
import {createDealRoom,reduceDealRoom,normalizeDealRoom,businessOpportunities,previewOffer} from '../../src/deal-room-engine.js';
import {retailWait} from '../../src/deal-room-demand.js';
const act=(s,type,x={})=>{const n=reduceDealRoom(s,{type,...x});assert.notEqual(n,s,`Rejected ${type} ${JSON.stringify(x)} at ${s.phase}/${s.day}`);return n;};
const finish=(s,id)=>act(act(act(s,'PROPOSE',{optionId:id}),'ADVANCE'),'NEXT_CLIENT');
function base(){let s=createDealRoom();for(const id of ['trial','ready','season'])s=finish(s,id);s=act(s,'CONTINUE_BUSINESS');for(let i=0;i<2;i++){s=act(s,'SELECT_CLIENT',{clientId:'mira'});s=finish(s,'repeat-small');}s=act(act(s,'START_SUPPLY_PLAN',{clientId:'mira',firstBatch:'small',payment:'delivery'}),'FULFIL_SUPPLY_PLAN');assert.deepEqual(normalizeDealRoom(s),s);return s;}
function supplier(s,f){s=act(s,'START_DEVELOPMENT');s=act(s,'COMMISSION_SAMPLE',{factory:f});return act(act(s,'RECEIVE_SAMPLE'),'ACCEPT_SAMPLE');}
function both(s,f){s=supplier(s,f);for(const a of ['OPEN_SECOND_SUPPLIER','COMMISSION_SECOND_SAMPLE','RECEIVE_SECOND_SAMPLE','ACCEPT_SECOND_SAMPLE'])s=act(s,a);return s;}
const b=base(),deadline=b.day+60;
function run(name,setup,policy){let s=setup(structuredClone(b)),waitDays=0,orders=0,minCash=s.cash,stop='horizon',trace=[];for(let guard=0;guard<150;guard++){
 if(['review','complete'].includes(s.phase))s=act(s,'CONTINUE_RETAIL_BUSINESS');
 const candidates=businessOpportunities(s).flatMap(c=>c.options.filter(q=>q.valid&&q.paymentDay<=deadline).map(q=>({client:c.id,q})));
 const chosen=policy(candidates,s);
 if(chosen){s=act(s,'SELECT_CLIENT',{clientId:chosen.client});trace.push({day:s.day,client:chosen.client,option:chosen.q.id,net:chosen.q.netProfit,paymentDay:chosen.q.paymentDay});s=act(s,'PROPOSE',{optionId:chosen.q.id});minCash=Math.min(minCash,s.cash);s=act(act(s,'ADVANCE'),'NEXT_CLIENT');orders++;continue;}
 const waits=['mira','samir','ines'].map(id=>({id,w:retailWait(s,id)})).filter(x=>x.w?.valid&&x.w.day<deadline).sort((a,b)=>a.w.day-b.w.day);
 if(!waits.length){stop=candidates.length?'policy declined':'no feasible order/wait before horizon';break;}
 const w=waits[0];waitDays+=w.w.days;s=act(s,'WAIT_FOR_BUYER',{clientId:w.id});
 }
 assert.deepEqual(normalizeDealRoom(s),s);return {name,startDay:b.day,endDay:s.day,deadline,startCash:b.cash,endCash:s.cash,comparableCashAtDeadline:s.cash-(deadline-s.day)*30,delta:s.cash-b.cash,orders,actions:s.history.length-b.history.length,waitDays,minCash,stop,trace};}
const small=(cs,s)=>cs.filter(x=>x.q.id==='repeat-small').sort((a,b)=>b.q.netProfit/(b.q.paymentDay-s.day)-a.q.netProfit/(a.q.paymentDay-s.day))[0];
const bestRate=(cs,s)=>cs.sort((a,b)=>b.q.netProfit/(b.q.paymentDay-s.day)-a.q.netProfit/(a.q.paymentDay-s.day))[0];
const scenarios=[['rotate small',s=>s,small],['rotate scale',s=>s,cs=>cs.filter(x=>x.q.id==='repeat-scale').sort((a,b)=>b.q.netProfit-a.q.netProfit)[0]],['rotate best/day',s=>s,bestRate],['studio best/day',s=>supplier(s,'studio'),bestRate],['line best/day',s=>supplier(s,'line'),bestRate],['studio used + rotate',s=>supplier(s,'studio'),(cs,s)=>cs.find(x=>x.q.id==='developed-lamp')||small(cs,s)],['line used + rotate',s=>supplier(s,'line'),(cs,s)=>cs.find(x=>x.q.id==='developed-lamp')||small(cs,s)],['both studio first',s=>both(s,'studio'),bestRate],['both line first',s=>both(s,'line'),bestRate],...['mira','samir','ines'].map(id=>[`only ${id} small`,s=>s,cs=>cs.find(x=>x.client===id&&x.q.id==='repeat-small')])];
const result={base:{day:b.day,cash:b.cash},daysBudget:60,results:scenarios.map(([n,s,p])=>run(n,s,p))};

// Repeatable liquidity stress case, not a claim that every other career route is blocked.
let stress=base();for(const id of ['chair','coffee','books','record','records'])stress=act(stress,'BUY_LIFE_ITEM',{itemId:id});stress=act(stress,'BUY_OFFICE_IMPROVEMENT');
assert.deepEqual(normalizeDealRoom(stress),stress);
stress=act(stress,'CONTINUE_RETAIL_BUSINESS');
result.liquidity={cash:stress.cash,day:stress.day,options:businessOpportunities(stress).flatMap(c=>c.options.map(q=>({client:c.id,id:q.id,valid:q.valid,cashRequired:q.cashRequired,reason:q.reason})))};
console.log(JSON.stringify(result,null,2));
