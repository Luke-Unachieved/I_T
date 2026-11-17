import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {createDealRoom,reduceDealRoom as reduce,normalizeDealRoom} from '../src/deal-room-engine.js';
import {stockProcurementOpportunity as opportunity,previewStockProcurement as quote,previewStudioProjectFromStock as adapter} from '../src/deal-room-stock-procurement.js';
const actions=JSON.parse(fs.readFileSync(new URL('./fixtures/deal-group-day169-actions.json',import.meta.url)));
const act=(s,type,x={})=>{const n=reduce(s,{type,...x});assert.notEqual(n,s,type);return n;};
function ready(){const s=actions.reduce((s,a)=>reduce(s,a),createDealRoom());assert.equal(s.day,169);assert.equal(s.cash,65320);assert.deepEqual(normalizeDealRoom(s),s);return act(s,'CLOSE_STUDIO_PROJECT');}
function purchased(mode='batch'){let s=act(ready(),'OPEN_STOCK_PROCUREMENT');s=act(s,'SIGN_STOCK_PROCUREMENT',{factoryMode:mode});assert.deepEqual(normalizeDealRoom(s),s);s=act(s,'FULFIL_STOCK_PROCUREMENT');return act(s,'CLOSE_STOCK_PROCUREMENT');}
function independent(s){s=act(s,'OPEN_STUDIO_PROJECT',{direction:'independent'});s=act(s,'REVISE_STUDIO_PROJECT');s=act(s,'SET_STUDIO_PROJECT',{field:'lampVersion',value:'developed'});return act(s,'REVIEW_STUDIO_PROJECT');}
test('existing canonical history remains identical; one new real-source inquiry has two explicit supplier offers',()=>{
 const old=ready(),history=structuredClone(old.caseGrowthHistory);assert.equal(opportunity(old).referrerId,'samir');let s=act(old,'OPEN_STOCK_PROCUREMENT');assert.equal(s.cash,old.cash);s=act(s,'CLOSE_STOCK_PROCUREMENT');assert.deepEqual(s.caseGrowthHistory,history);
 for(const [mode,cash,remaining,cost]of [['small',65380,0,720],['batch',63400,48,2700]]){s=purchased(mode);assert.equal(s.day,173);assert.equal(s.cash,cash);assert.equal(s.stockProcurement.remaining,remaining);assert.equal(s.stockProcurement.cost,cost);assert.equal(s.stockProcurement.delivered,12);assert.deepEqual(s.caseGrowthHistory,history);assert.deepEqual(normalizeDealRoom(s),s);s=act(s,'OPEN_STOCK_PROCUREMENT');assert.equal(reduce(s,{type:'SIGN_STOCK_PROCUREMENT',factoryMode:mode}),s);assert.equal(reduce(s,{type:'FULFIL_STOCK_PROCUREMENT'}),s);}
});
test('actual approved main contract consumes stock at signing, retains COGS, settles once and replays',()=>{
 let s=independent(purchased()),q=adapter(s);assert.equal(q.valid,true,q.reason);assert.equal(q.stockUsed,40);assert.equal(q.stockCost,1800);assert.equal(q.newProductionCost,1280);assert.equal(q.cost,3080);assert.equal(q.netProfit,1810);assert.equal(q.requiredCash,0);
 const cash=s.cash;s=act(s,'SIGN_STUDIO_PROJECT_FROM_STOCK');assert.equal(s.cash,cash+2580-1280);assert.equal(s.stockProcurement.remaining,8);assert.equal(s.stockProcurement.inventoryCost,360);assert.equal(reduce(s,{type:'SIGN_STUDIO_PROJECT_FROM_STOCK'}),s);assert.deepEqual(normalizeDealRoom(s),s);
 s=act(s,'FULFIL_CASE_GROWTH');assert.equal(s.cash,67010);assert.equal(s.day,182);assert.equal(s.caseGrowthHistory.at(-1).cost,3080);assert.equal(reduce(s,{type:'FULFIL_CASE_GROWTH'}),s);assert.deepEqual(normalizeDealRoom(s),s);
 const forged=structuredClone(s);forged.stockProcurement.remaining=48;assert.throws(()=>normalizeDealRoom(forged));
});
test('old sign still purchases all components; new path rejects missing stock, wrong specification and active contracts',()=>{
 let s=independent(purchased()),cash=s.cash;s=act(s,'SIGN_STUDIO_PROJECT_ORDER');assert.equal(s.cash,cash+2580-3080);assert.equal(s.stockProcurement.remaining,48);assert.deepEqual(normalizeDealRoom(s),s);
 s=independent(purchased('small'));assert.equal(adapter(s).valid,false);assert.equal(reduce(s,{type:'SIGN_STUDIO_PROJECT_FROM_STOCK'}),s);
 s=act(purchased(),'OPEN_STUDIO_PROJECT',{direction:'independent'});assert.equal(adapter(s).valid,false);const original=ready();assert.equal(opportunity({...original,productDevelopment:{status:'active',factory:'line'}}).available,false);
 s=act(original,'OPEN_STOCK_PROCUREMENT');const poor={...s,cash:839};assert.equal(quote(poor,'small').valid,false);assert.equal(reduce(poor,{type:'SIGN_STOCK_PROCUREMENT',factoryMode:'small'}),poor);s=act(s,'SIGN_STOCK_PROCUREMENT',{factoryMode:'batch'});assert.equal(reduce(s,{type:'CLOSE_STOCK_PROCUREMENT'}),s);assert.equal(reduce(s,{type:'OPEN_COLLECTION_REVISION'}),s);
});

test('remaining eight are reserved only once on the next real order; replay at reservation and delivery cannot deduct twice',()=>{
 let s=independent(purchased());s=act(act(s,'SIGN_STUDIO_PROJECT_FROM_STOCK'),'FULFIL_CASE_GROWTH');s=act(s,'CLOSE_CASE_GROWTH');s=act(s,'OPEN_STUDIO_PROJECT',{direction:'independent'});
 if(adapter(s).waitingUntil>s.day)s=act(s,'WAIT_STUDIO_PROJECT');const q=adapter(s);assert.equal(q.valid,true,q.reason);assert.equal(q.stockUsed,8);assert.equal(q.stockCost,360);assert.equal(q.newProductionCost,2720);assert.equal(q.cost,3080);assert.equal(q.netProfit,1810);
 const cash=s.cash;s=act(s,'SIGN_STUDIO_PROJECT_FROM_STOCK');assert.equal(s.cash,cash+2580-2720);assert.equal(s.stockProcurement.remaining,0);assert.equal(s.stockProcurement.stockUsed,48);const restored=normalizeDealRoom(JSON.parse(JSON.stringify(s)));assert.deepEqual(restored,s);assert.equal(reduce(restored,{type:'SIGN_STUDIO_PROJECT_FROM_STOCK'}),restored);
 s=act(restored,'FULFIL_CASE_GROWTH');assert.equal(s.cash,cash+1810+360);const after=normalizeDealRoom(JSON.parse(JSON.stringify(s)));assert.deepEqual(after,s);assert.equal(after.stockProcurement.remaining,0);assert.equal(reduce(after,{type:'FULFIL_CASE_GROWTH'}),after);
 s=act(act(after,'CLOSE_CASE_GROWTH'),'OPEN_STUDIO_PROJECT',{direction:'independent'});assert.equal(adapter(s).valid,false);
});

test('reporting separates realized profit, cash tied in inventory and reserved goods without double COGS',async()=>{
 const {stockProcurementAccounting:account}=await import('../src/deal-room-stock-procurement.js');const {careerRecap}=await import('../src/deal-room-home.js');
 let s=act(ready(),'OPEN_STOCK_PROCUREMENT');assert.equal(account(s).realizedProfit,0);s=act(s,'SIGN_STOCK_PROCUREMENT',{factoryMode:'batch'});assert.equal(account(s).inTransitCost,2700);assert.equal(account(s).cashChange,-2700);assert.equal(account(s).realizedProfit,0);
 s=purchased();assert.deepEqual(account(s),{realizedProfit:240,cashChange:-1920,inventoryCost:2160,reservedInventoryCost:0,inTransitCost:0,reusedStockCost:0});assert.equal(careerRecap(s).cash,63400);
 s=independent(s);s=act(s,'SIGN_STUDIO_PROJECT_FROM_STOCK');assert.equal(account(s).reservedInventoryCost,1800);assert.equal(account(s).inventoryCost,360);assert.equal(account(s).realizedProfit,240);
 s=act(s,'FULFIL_CASE_GROWTH');assert.equal(account(s).reservedInventoryCost,0);assert.equal(account(s).reusedStockCost,1800);assert.equal(account(s).realizedProfit+s.caseGrowthHistory.at(-1).netProfit,2050);assert.equal(s.cash-65320+account(s).inventoryCost,2050);assert.equal(careerRecap(s).cash,67010);
 assert.equal(account(purchased('small')).realizedProfit,60);
});
