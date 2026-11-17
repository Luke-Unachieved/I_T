import test from 'node:test';
import assert from 'node:assert/strict';
import {createOpeningGame,reduceOpening,normalizeOpeningSave,quoteOpening,currentOpeningOrders,businessCustomers,paymentOptions,cargoCapacity,berthUpgrade,outstandingPayment,nextBusinessDemand} from '../src/rework-opening.js';
function move(s,type,orderId,route,extra={}){const r=reduceOpening(s,{type,orderId,route,...extra});assert.equal(r.feedback.ok,true,r.feedback.message);return r.state;}
function sale(s,id,route='sea'){for(const t of ['PURCHASE','SHIP','DELIVER'])s=move(s,t,id,route);return s;}
function completed(){let s=createOpeningGame();s=sale(s,'quick');s=sale(s,'urgent','express');s=sale(s,'large');s=move(s,'COLLECT','large');s=move(s,'INVEST',null,null,{choice:'express'});s=sale(s,'port-quick','express');s=sale(s,'port-large','express');s=sale(s,'port-urgent','express');s=move(s,'COLLECT','port-large');s=move(s,'NEXT_STAGE');s=sale(s,'choice-bulk','express');s=sale(s,'choice-regular','sea');s=move(s,'COLLECT','choice-bulk');return s;}
function business(){return move(completed(),'START_BUSINESS');}
function finishRound(s){for(const order of currentOpeningOrders(s)){s=sale(s,order.id,'express');}for(const order of currentOpeningOrders(s).filter(o=>o.status==='receivable').sort((a,b)=>a.collectionDay-b.collectionDay)){if(s.orders.find(o=>o.id===order.id).status==='receivable')s=move(s,'COLLECT',order.id);}return s;}
test('finished three-stage saves enter business only explicitly and preserve every historical contract',()=>{
 const old=completed(),snapshot=structuredClone(old.orders);delete old.businessRound;delete old.berthCount;delete old.berthInvestmentCost;
 const normalized=normalizeOpeningSave(old);assert.ok(normalized);assert.equal(normalized.businessRound,0);assert.equal(normalized.ending,true);assert.deepEqual(normalized.orders,snapshot);
 assert.equal(reduceOpening(createOpeningGame(),{type:'START_BUSINESS'}).feedback.ok,false);
 const s=move(normalized,'START_BUSINESS');assert.equal(s.businessRound,1);assert.equal(s.stage,3);assert.equal(s.ending,false);assert.equal(s.cash,old.cash);assert.equal(s.day,old.day);assert.deepEqual(s.orders.slice(0,10),snapshot);assert.equal(currentOpeningOrders(s).length,2);assert.ok(normalizeOpeningSave(s));
});
test('payment choice changes real quote and locks on procurement without changing earlier contracts',()=>{
 let s=business();const o=currentOpeningOrders(s)[0],prior=JSON.stringify(s.orders.slice(0,10));const choices=paymentOptions(s,o.id);assert.equal(choices.find(x=>x.id==='credit').selected,true);
 const credit=quoteOpening(s,o.id,'express');s=move(s,'SET_PAYMENT',o.id,null,{paymentTerms:'cash'});const cash=quoteOpening(s,o.id,'express');assert.equal(cash.revenue,Math.floor(credit.revenue*.92));assert.equal(cash.payLag,0);assert.equal(credit.collectionDay-cash.collectionDay,6);assert.equal(JSON.stringify(s.orders.slice(0,10)),prior);
 s=move(s,'PURCHASE',o.id);const denied=reduceOpening(s,{type:'SET_PAYMENT',orderId:o.id,paymentTerms:'credit'});assert.equal(denied.feedback.ok,false);assert.equal(denied.state,s);s=move(s,'SHIP',o.id,'express');s=move(s,'DELIVER',o.id);assert.equal(s.orders.find(x=>x.id===o.id).status,'paid');assert.equal(businessCustomers(s)[0].repeatPaid,1);assert.ok(normalizeOpeningSave(s));
});
test('repeat rounds keep stable quantities, require paid invoices, and derive growth from paid orders',()=>{
 let s=business();assert.equal(reduceOpening(s,{type:'NEXT_BUSINESS_ROUND'}).feedback.ok,false);const contracts=currentOpeningOrders(s).map(o=>({customerId:o.customerId,quantity:o.quantity,baseRevenue:o.baseRevenue}));s=finishRound(s);assert.equal(s.ending,true);assert.deepEqual(businessCustomers(s).map(c=>c.completed),[1,1]);const day=s.day,cash=s.cash;s=move(s,'NEXT_BUSINESS_ROUND');assert.equal(s.businessRound,2);assert.equal(s.day,day);assert.equal(s.cash,cash);assert.deepEqual(currentOpeningOrders(s).map(o=>({customerId:o.customerId,quantity:o.quantity,baseRevenue:o.baseRevenue})),contracts);assert.ok(normalizeOpeningSave(s));s=finishRound(s);assert.deepEqual(businessCustomers(s).map(c=>c.repeatPaid),[2,2]);assert.ok(normalizeOpeningSave(s));
});
test('second berth is a one-time cash investment with a trading reserve and stable cargo slots',()=>{
 assert.equal(berthUpgrade(completed()).available,false);let s=business();s.cash=2500;assert.equal(berthUpgrade(s).available,false);s.cash=10000;const original=s.investmentCost;s=move(s,'EXPAND_BERTH');assert.equal(s.cash,7500);assert.equal(s.berthInvestmentCost,2500);assert.equal(s.investmentCost,original);assert.equal(cargoCapacity(s),2);assert.equal(berthUpgrade(s).available,false);
 const [a,b]=currentOpeningOrders(s);s=move(s,'PURCHASE',a.id);s=move(s,'PURCHASE',b.id);assert.deepEqual(currentOpeningOrders(s).map(o=>o.berthIndex),[0,1]);assert.ok(normalizeOpeningSave(s));const bad=structuredClone(s);currentOpeningOrders(bad)[1].berthIndex=0;assert.equal(normalizeOpeningSave(bad),null);
});
test('two-ship delivery cannot skip the earlier arrival and charges elapsed days only once',()=>{
 let s=business();s.cash=12000;s=move(s,'EXPAND_BERTH');const [a,b]=currentOpeningOrders(s);s=move(s,'PURCHASE',a.id);s=move(s,'SHIP',a.id,'sea');s=move(s,'PURCHASE',b.id);s=move(s,'SHIP',b.id,'express');const day=s.day,cost=s.operatingCostPaid;const denied=reduceOpening(s,{type:'DELIVER',orderId:a.id});assert.equal(denied.feedback.ok,false);assert.equal(denied.state,s);
 s=move(s,'DELIVER',b.id);assert.equal(s.day,day+1);assert.equal(s.orders.find(o=>o.id===a.id).status,'shipping');assert.equal(s.orders.find(o=>o.id===a.id).berthIndex,0);assert.equal(s.orders.find(o=>o.id===b.id).berthIndex,1);s=move(s,'DELIVER',a.id);assert.equal(s.day,day+4);assert.equal(s.operatingCostPaid-cost,200);assert.ok(normalizeOpeningSave(s));
});
test('another packed cargo freight and shared runway remain reserved during parallel purchase',()=>{
 let s=business();s.cash=12000;s=move(s,'EXPAND_BERTH');const [a,b]=currentOpeningOrders(s);s=move(s,'PURCHASE',a.id);const q=quoteOpening(s,b.id,'express');assert.ok(q.otherFreightReserve>0);assert.ok(q.sharedOperatingReserve>=q.operatingReserve);
 s.cash=q.cashNeeded+q.operatingReserve;const constrained=quoteOpening(s,b.id,'express');assert.ok(constrained.cashAfterReserve<0);assert.equal(constrained.valid,false);
});
test('business save validation rejects unrecognized customers, altered contract terms and unfinished past rounds',()=>{
 const s=business();for(const mutate of [x=>currentOpeningOrders(x)[0].customerId='unknown',x=>currentOpeningOrders(x)[0].baseRevenue++,x=>currentOpeningOrders(x)[0].revenue++,x=>currentOpeningOrders(x)[0].paymentTerms='free',x=>x.orders.push({...currentOpeningOrders(x)[0],id:'made-up'}),x=>x.businessRound=99,x=>currentOpeningOrders(x)[0].purchaseCost=0]){const bad=structuredClone(s);mutate(bad);assert.equal(normalizeOpeningSave(bad),null);}
 const next=move(finishRound(s),'NEXT_BUSINESS_ROUND');const bad=structuredClone(next);bad.orders.find(o=>o.businessRound===1).status='receivable';assert.equal(normalizeOpeningSave(bad),null);
});

function trusted(){let s=finishRound(business());s=move(s,'NEXT_BUSINESS_ROUND');s=finishRound(s);return move(s,'NEXT_BUSINESS_ROUND');}
test('deposit unlock uses two earlier paid repeats and cannot be applied retroactively',()=>{
 let s=business();let o=currentOpeningOrders(s)[0];assert.equal(paymentOptions(s,o.id).find(x=>x.id==='deposit').disabled,true);assert.equal(reduceOpening(s,{type:'SET_PAYMENT',orderId:o.id,paymentTerms:'deposit'}).feedback.ok,false);
 s=finishRound(s);s=move(s,'NEXT_BUSINESS_ROUND');const roundTwo=currentOpeningOrders(s)[0].id;s=finishRound(s);assert.equal(businessCustomers(s)[0].depositUnlocked,true);assert.equal(businessCustomers(s)[0].repeatTarget,2);
 s=move(s,'NEXT_BUSINESS_ROUND');o=currentOpeningOrders(s)[0];assert.equal(paymentOptions(s,o.id).find(x=>x.id==='deposit').disabled,false);assert.equal(paymentOptions(s,roundTwo).find(x=>x.id==='deposit').disabled,true);
 const bad=structuredClone(s),past=bad.orders.find(x=>x.id===roundTwo);past.paymentTerms='deposit';past.depositReceived=Math.floor(past.baseRevenue*.3);assert.equal(normalizeOpeningSave(bad),null);
});
test('procurement deposit unlocks working capital, pays once, and later collects only the balance',()=>{
 let s=trusted(),o=currentOpeningOrders(s)[0];const credit=quoteOpening(s,o.id,'express');s.cash=credit.cashNeeded+credit.sharedOperatingReserve-1;assert.equal(quoteOpening(s,o.id,'express').valid,false);
 s=move(s,'SET_PAYMENT',o.id,null,{paymentTerms:'deposit'});let q=quoteOpening(s,o.id,'express');assert.equal(q.valid,true);assert.equal(q.deposit,Math.floor(o.baseRevenue*.3));assert.equal(q.balanceDue,o.revenue-q.deposit);const cash=s.cash,day=s.day,fullRevenue=o.revenue,cost=q.purchaseCost,deposit=q.deposit;
 s=move(s,'PURCHASE',o.id);o=s.orders.find(x=>x.id===o.id);assert.equal(s.cash,cash+deposit-cost);assert.equal(o.depositReceived,deposit);assert.equal(outstandingPayment(o),fullRevenue-deposit);assert.ok(normalizeOpeningSave(s));assert.equal(quoteOpening(s,o.id,'express').deposit,0);
 assert.equal(reduceOpening(s,{type:'PURCHASE',orderId:o.id}).state,s);assert.equal(reduceOpening(s,{type:'SET_PAYMENT',orderId:o.id,paymentTerms:'cash'}).feedback.ok,false);
 s=move(s,'SHIP',o.id,'express');s=move(s,'DELIVER',o.id);s=move(s,'COLLECT',o.id);assert.equal(s.cash,cash+fullRevenue-cost-180-(s.day-day)*50);assert.equal(outstandingPayment(s.orders.find(x=>x.id===o.id)),0);assert.ok(normalizeOpeningSave(s));assert.equal(reduceOpening(s,{type:'COLLECT',orderId:o.id}).feedback.ok,false);
});
test('automatic due receipts pay deposit balances rather than full invoices',()=>{
 let s=trusted();s.cash=20000;s=move(s,'EXPAND_BERTH');const [a,b]=currentOpeningOrders(s);for(const o of [a,b])s=move(s,'SET_PAYMENT',o.id,null,{paymentTerms:'deposit'});
 // Bulk express + 6-day credit and regular sea + 3-day credit both pay on day +7.
 s=move(s,'PURCHASE',a.id);const parallel=quoteOpening(s,b.id,'sea');assert.ok(parallel.otherFreightReserve>0);assert.equal(parallel.cashAfterReserve,s.cash-parallel.cashNeeded-parallel.otherFreightReserve-parallel.sharedOperatingReserve);s=move(s,'SHIP',a.id,'express');s=move(s,'PURCHASE',b.id);s=move(s,'SHIP',b.id,'sea');s=move(s,'DELIVER',a.id);s=move(s,'DELIVER',b.id);
 const pending=currentOpeningOrders(s);assert.equal(pending[0].collectionDay,pending[1].collectionDay);const total=pending.reduce((n,o)=>n+outstandingPayment(o),0),cash=s.cash,days=pending[0].collectionDay-s.day;
 s=move(s,'COLLECT',a.id);assert.equal(s.cash,cash+total-days*50);assert.ok(currentOpeningOrders(s).every(o=>o.status==='paid'));assert.ok(normalizeOpeningSave(s));
});
test('deposit save schema rejects early money, wrong amounts and grafted deposits on old contracts',()=>{
 let open=trusted(),o=currentOpeningOrders(open)[0];open=move(open,'SET_PAYMENT',o.id,null,{paymentTerms:'deposit'});assert.ok(normalizeOpeningSave(open));const early=structuredClone(open);currentOpeningOrders(early)[0].depositReceived=1320;assert.equal(normalizeOpeningSave(early),null);
 const packed=move(open,'PURCHASE',o.id);for(const amount of [undefined,0,1,1321]){const bad=structuredClone(packed);bad.orders.find(x=>x.id===o.id).depositReceived=amount;assert.equal(normalizeOpeningSave(bad),null);}
 const bad=structuredClone(packed);bad.orders.find(x=>x.id==='quick').depositReceived=0;assert.equal(normalizeOpeningSave(bad),null);
 const old=business();assert.ok(old.orders.every(x=>x.depositReceived==null));assert.ok(normalizeOpeningSave(old));
});
test('first second-repeat payment announces trust once, including automatic simultaneous payment',()=>{
 let s=finishRound(business());s=move(s,'NEXT_BUSINESS_ROUND');s.cash=20000;s=move(s,'EXPAND_BERTH');const [a,b]=currentOpeningOrders(s);for(const [o,route] of [[a,'express'],[b,'sea']]){s=move(s,'PURCHASE',o.id);s=move(s,'SHIP',o.id,route);}s=move(s,'DELIVER',a.id);s=move(s,'DELIVER',b.id);
 const result=reduceOpening(s,{type:'COLLECT',orderId:a.id});assert.equal(result.feedback.ok,true);assert.equal((result.feedback.message.match(/愿意先付定金了/g)||[]).length,2);s=move(result.state,'NEXT_BUSINESS_ROUND');const c=currentOpeningOrders(s)[0];s=sale(s,c.id,'express');const later=reduceOpening(s,{type:'COLLECT',orderId:c.id});assert.equal(later.feedback.ok,true);assert.doesNotMatch(later.feedback.message,/愿意先付定金了/);
});


test('public demand preview matches new contracts and rotates bounded real quantities and terms',()=>{
 assert.deepEqual(nextBusinessDemand(createOpeningGame()),[]);let s=finishRound(trusted());
 const before=JSON.stringify(s),preview=nextBusinessDemand(s);assert.equal(JSON.stringify(s),before);assert.deepEqual(preview.map(o=>[o.demandType,o.quantity,o.deadlineDays,o.payLag]),[['urgent',48,2,1],['bulk',29,6,5]]);
 s=move(s,'NEXT_BUSINESS_ROUND');assert.deepEqual(currentOpeningOrders(s).map(({status,...o})=>o),preview);assert.ok(normalizeOpeningSave(s));
 for(let i=0;i<3;i++){s=finishRound(s);s=move(s,'NEXT_BUSINESS_ROUND');assert.ok(normalizeOpeningSave(s));}assert.deepEqual(currentOpeningOrders(s).map(o=>o.demandType),preview.map(o=>o.demandType));
});
test('legacy fixed contracts stay byte-identical at every lifecycle status, only the next batch upgrades',()=>{
 let s=business();delete s.demandStartRound;for(const o of s.orders){delete o.demandVersion;delete o.demandType;delete o.demandLabel;}
 const id=currentOpeningOrders(s)[0].id;
 for(const type of ['PURCHASE','SHIP','DELIVER','COLLECT']){const before=JSON.stringify(s.orders);const restored=normalizeOpeningSave(s);assert.ok(restored);assert.equal(JSON.stringify(restored.orders),before);s=move(restored,type,id,'express');}
 s=finishRoundRemaining(s);const history=JSON.stringify(s.orders);s=move(s,'NEXT_BUSINESS_ROUND');assert.equal(s.demandStartRound,2);assert.equal(JSON.stringify(s.orders.slice(0,-2)),history);assert.ok(normalizeOpeningSave(s));
});
function finishRoundRemaining(s){for(const o of currentOpeningOrders(s).filter(o=>o.status==='open'))s=sale(s,o.id,'express');for(const o of currentOpeningOrders(s).filter(o=>o.status==='receivable').sort((a,b)=>a.collectionDay-b.collectionDay)){if(s.orders.find(x=>x.id===o.id).status==='receivable')s=move(s,'COLLECT',o.id);}return s;}
test('demand save validation rejects mismatched variants, versions, quantities, prices and migration boundary',()=>{
 const s=move(finishRound(trusted()),'NEXT_BUSINESS_ROUND');for(const mutate of [x=>currentOpeningOrders(x)[0].demandVersion=2,x=>currentOpeningOrders(x)[0].demandType='regular',x=>currentOpeningOrders(x)[0].quantity++,x=>currentOpeningOrders(x)[0].baseRevenue++,x=>currentOpeningOrders(x)[0].deadlineDays++,x=>currentOpeningOrders(x)[0].payLag++,x=>delete x.demandStartRound,x=>x.demandStartRound=5]){const bad=structuredClone(s);mutate(bad);assert.equal(normalizeOpeningSave(bad),null);}
});
test('mixed urgent and bulk demand supports deposit-funded parallel shipment without skipping delivery',()=>{
 let s=move(finishRound(trusted()),'NEXT_BUSINESS_ROUND');s.cash=12000;s=move(s,'EXPAND_BERTH');const [a,b]=currentOpeningOrders(s);for(const o of [a,b])s=move(s,'SET_PAYMENT',o.id,null,{paymentTerms:'deposit'});
 for(const [o,route] of [[a,'express'],[b,'sea']]){assert.equal(quoteOpening(s,o.id,route).valid,true);s=move(s,'PURCHASE',o.id);s=move(s,'SHIP',o.id,route);assert.ok(normalizeOpeningSave(s));}
 assert.equal(reduceOpening(s,{type:'DELIVER',orderId:b.id}).feedback.ok,false);s=move(s,'DELIVER',a.id);s=move(s,'COLLECT',a.id);s=move(s,'DELIVER',b.id);s=move(s,'COLLECT',b.id);assert.ok(s.ending);assert.ok(normalizeOpeningSave(s));
});

test('every customer demand has a profitable funded route at worst published purchase prices',()=>{
 const base=completed();let minimum=Infinity;const comparisons=[];
 // Quote matrix, not a claim of player playthrough: preserve canonical customer terms,
 // vary investment and published price extremes to detect mandatory losing contracts.
 for(const investment of ['warehouse','express'])for(let round=4;round<=6;round++){
  const seed=structuredClone(base);seed.investment=investment;seed.businessRound=round-1;
  for(const o of seed.orders.filter(o=>o.stage===3))o.status='paid';
  const offers=nextBusinessDemand(seed);
  for(const offer of offers){const s={...seed,day:100,cash:20000,prices:{cups:45,lights:80,textiles:55},orders:[...seed.orders,{...offer,status:'open'}],businessRound:round};
   const quotes=['sea','express'].map(r=>quoteOpening(s,offer.id,r)).filter(q=>q.valid);assert.ok(quotes.length,offer.customerId+offer.demandType);
   const best=Math.max(...quotes.map(q=>q.profit-q.operatingReserve));minimum=Math.min(minimum,best);assert.ok(best>0,`${investment}/${offer.customerId}/${offer.demandType}: ${best}`);
   if(investment==='warehouse'&&offer.demandType==='bulk'&&quotes.length===2){const sea=quotes.find(q=>q.route==='sea'),fast=quotes.find(q=>q.route==='express');assert.ok(sea.profit-sea.operatingReserve>fast.profit-fast.operatingReserve);comparisons.push(offer.customerId);}
  }
 }
 assert.equal(minimum,42);assert.equal(comparisons.length,4);
});

test('two hundred repeat contracts survive legal bounded play and save round trips',t=>{
 let s=business();const startCash=s.cash;
 for(let round=1;round<=100;round++){
  if(round>1)s=move(s,'NEXT_BUSINESS_ROUND');
  s=finishRound(s);const raw=JSON.stringify(s),restored=normalizeOpeningSave(raw);assert.ok(restored,`round ${round}`);assert.equal(restored.cash,s.cash);assert.equal(restored.completed,s.completed);assert.ok(Number.isSafeInteger(s.cash)&&s.cash>=0);s=restored;
 }
 assert.equal(s.completed,208);assert.ok(s.cash>startCash);assert.equal(businessCustomers(s).reduce((n,c)=>n+c.repeatPaid,0),200);assert.ok(Buffer.byteLength(JSON.stringify(s))<5*1024*1024);
 t.diagnostic(`100 batches / 200 repeat contracts; day=${s.day}; cash=${s.cash}; save bytes=${Buffer.byteLength(JSON.stringify(s))}`);
});

test('one completed repeat permits passing only the other unsigned contract without money or trust rewards',()=>{
 let s=business();const [a,b]=currentOpeningOrders(s);
 assert.equal(reduceOpening(s,{type:'PASS_BUSINESS_ORDER',orderId:b.id}).feedback.ok,false);
 s=move(s,'SET_PAYMENT',a.id,null,{paymentTerms:'cash'});s=sale(s,a.id,'express');const before=structuredClone(s),counts=businessCustomers(s).map(x=>x.repeatPaid);
 s=move(s,'PASS_BUSINESS_ORDER',b.id);assert.equal(s.cash,before.cash);assert.equal(s.day,before.day);assert.equal(s.completed,before.completed);assert.equal(s.stageTarget,1);assert.equal(s.ending,true);assert.deepEqual(businessCustomers(s).map(x=>x.repeatPaid),counts);assert.ok(normalizeOpeningSave(s));
 assert.equal(reduceOpening(s,{type:'PASS_BUSINESS_ORDER',orderId:b.id}).feedback.ok,false);assert.equal(reduceOpening(s,{type:'PURCHASE',orderId:b.id}).feedback.ok,false);
 s=move(normalizeOpeningSave(s),'NEXT_BUSINESS_ROUND');assert.equal(currentOpeningOrders(s).length,2);assert.equal(s.stageTarget,2);assert.ok(currentOpeningOrders(s).every(x=>x.status==='open'));assert.ok(normalizeOpeningSave(s));
});
test('passing cannot cancel cargo or receivables and forged skipped rounds are rejected',()=>{
 let s=business();const [a,b]=currentOpeningOrders(s);s=move(s,'SET_PAYMENT',a.id,null,{paymentTerms:'cash'});s=sale(s,a.id,'express');const unsigned=structuredClone(s);
 s=move(s,'PURCHASE',b.id);for(const type of ['PASS_BUSINESS_ORDER'])assert.equal(reduceOpening(s,{type,orderId:b.id}).feedback.ok,false);
 s=move(s,'SHIP',b.id,'express');assert.equal(reduceOpening(s,{type:'PASS_BUSINESS_ORDER',orderId:b.id}).feedback.ok,false);s=move(s,'DELIVER',b.id);assert.equal(reduceOpening(s,{type:'PASS_BUSINESS_ORDER',orderId:b.id}).feedback.ok,false);
 const skipped=move(unsigned,'PASS_BUSINESS_ORDER',b.id);
 for(const mutate of [x=>delete x.orders.find(o=>o.id===b.id).passed,x=>x.orders.find(o=>o.id===b.id).purchaseCost=0,x=>x.orders.find(o=>o.id===b.id).depositReceived=1,x=>{x.orders.find(o=>o.id===a.id).status='declined';x.orders.find(o=>o.id===a.id).passed=true;}]){const bad=structuredClone(skipped);mutate(bad);assert.equal(normalizeOpeningSave(bad),null);}
});

test('selective batches preserve customer growth and save validity over a bounded 30-round run',()=>{
 let s=business();const expected=new Map(businessCustomers(s).map(c=>[c.id,0]));
 for(let n=1;n<=30;n++){const orders=currentOpeningOrders(s),chosen=orders[n%2],passed=orders[(n+1)%2];s=move(s,'SET_PAYMENT',chosen.id,null,{paymentTerms:'cash'});s=sale(s,chosen.id,'express');expected.set(chosen.customerId,expected.get(chosen.customerId)+1);s=move(s,'PASS_BUSINESS_ORDER',passed.id);const restored=normalizeOpeningSave(JSON.stringify(s));assert.ok(restored);assert.equal(restored.cash,s.cash);assert.equal(restored.stageTarget,1);assert.deepEqual(businessCustomers(restored).map(c=>[c.id,c.repeatPaid]),[...expected]);s=restored;if(n<30)s=move(s,'NEXT_BUSINESS_ROUND');}
 assert.equal(s.completed,38);assert.equal(businessCustomers(s).every(c=>c.depositUnlocked),true);
});
