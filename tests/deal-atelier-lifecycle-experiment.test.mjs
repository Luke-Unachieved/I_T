import test from 'node:test';import assert from 'node:assert/strict';
import {createAtelierLifecycle as create,reduceAtelierLifecycle as reduce,atelierAdoptionChoices as choices} from '../src/deal-room-atelier-lifecycle-experiment.js';
const world=()=>({day:22,cash:10390,curationHistory:[{status:'paid',referrerId:'mira',buyer:'Atelier · 生活方式买手店',products:['mira','samir','ines']}],collection:{model:'own',style:'botanical',products:['mira','samir','ines'],orders:[{status:'paid',buyerId:'northline',scope:'nonexclusive'}]}});
const draft={products:['mira','samir'],packaging:'plain',payment:'deposit30',versionId:'generic'};
function confirmed(s=world()) {let m=create(s,{referrerId:'mira'});m=reduce(m,{type:'SHOW_DISPLAY',lead:'mira'});return reduce(m,{type:'PROPOSE_PURCHASE',draft});}
function paid(){let m=reduce(confirmed(),{type:'SIGN_ATELIER_PROPOSAL'});m=reduce(m,{type:'DELIVER_ATELIER_ORDER'});return reduce(m,{type:'COLLECT_ATELIER_BALANCE'});}
test('signing, delivery and actual balance preserve cash identity and immutable world',()=>{
 const s=world(),before=structuredClone(s);let m=confirmed(s);const q=m.session.proposal;m=reduce(m,{type:'SIGN_ATELIER_PROPOSAL'});
 assert.equal(m.world.cash,s.cash+q.deposit-q.cost);assert.equal(m.orders[0].proposalOnly,false);assert.equal(choices(m).length,0);assert.equal(reduce(m,{type:'REOPEN_PROPOSAL'}),m);assert.equal(reduce(m,{type:'SIGN_ATELIER_PROPOSAL'}),m);
 m=reduce(m,{type:'DELIVER_ATELIER_ORDER'});assert.equal(m.world.day,q.deliveryDay);assert.equal(m.orders[0].status,'receivable');assert.equal(m.orders[0].received,q.deposit);assert.equal(reduce(m,{type:'DELIVER_ATELIER_ORDER'}),m);
 m=reduce(m,{type:'COLLECT_ATELIER_BALANCE'});assert.equal(m.world.cash,s.cash+q.netProfit);assert.equal(m.world.day,q.paymentDay);assert.equal(m.orders[0].operatingCostPaid,q.operatingCost);assert.equal(m.orders[0].received,q.revenue);assert.equal(reduce(m,{type:'COLLECT_ATELIER_BALANCE'}),m);assert.deepEqual(s,before);
});
test('only paid adoption offers exact reorder or actual sample re-talk, preserving history',()=>{
 const m=paid(),before=structuredClone(m),o=m.orders[0];assert.equal(choices(m)[0].use,o.use);
 let n=reduce(m,{type:'REORDER_ATELIER_ADOPTION',orderId:o.id});assert.equal(n.session.stage,'confirmed');assert.deepEqual(n.session.proposal.products,o.products);assert.equal(n.session.proposal.packaging,o.packaging);assert.ok(n.session.proposal.paymentDay>o.paymentDay);
 n=reduce(n,{type:'SIGN_ATELIER_PROPOSAL'});assert.equal(n.orders.length,2);assert.deepEqual(n.orders[0],o);
 n=reduce(m,{type:'REOPEN_ATELIER_ADOPTION',orderId:o.id});assert.equal(n.session.lead,'mira');assert.equal(n.session.stage,'drafting');assert.deepEqual(n.world,m.world);assert.deepEqual(m,before);
 assert.equal(reduce(m,{type:'REORDER_ATELIER_ADOPTION',orderId:'fake'}),m);
});
test('sign revalidates funds and rights; no future balance is spent in advance',()=>{
 let m=confirmed();m.world.cash=0;let n=reduce(m,{type:'SIGN_ATELIER_PROPOSAL'});assert.equal(n.orders.length,0);assert.equal(n.world.cash,0);
 m=confirmed();m.session.proposal.versionId='missing';n=reduce(m,{type:'SIGN_ATELIER_PROPOSAL'});assert.equal(n.orders.length,0);
});

test('historical adoption actions cannot replace a confirmed proposal before explicit withdrawal',()=>{
 const m=paid(),id=m.orders[0].id;const confirmed=reduce(m,{type:'REORDER_ATELIER_ADOPTION',orderId:id});
 for(const type of ['REORDER_ATELIER_ADOPTION','REOPEN_ATELIER_ADOPTION']){
  const rejected=reduce(confirmed,{type,orderId:id});assert.match(rejected.feedback,/先撤回/);assert.deepEqual(rejected.session,confirmed.session);assert.deepEqual(rejected.orders,confirmed.orders);assert.deepEqual(rejected.world,confirmed.world);
 }
 const withdrawn=reduce(confirmed,{type:'REOPEN_PROPOSAL'});assert.equal(withdrawn.session.stage,'drafting');
 const reopened=reduce(withdrawn,{type:'REOPEN_ATELIER_ADOPTION',orderId:id});assert.equal(reopened.session.stage,'drafting');assert.equal(reopened.session.proposal,null);
 const reordered=reduce(withdrawn,{type:'REORDER_ATELIER_ADOPTION',orderId:id});assert.equal(reordered.session.stage,'confirmed');
});
test('reserved signature holds deposit, explicit amendment settles delta before production and preserves original facts',()=>{
 let m=confirmed(),old=m.session.proposal;m=reduce(m,{type:'SIGN_ATELIER_RESERVED'});assert.equal(m.world.cash,10390+old.deposit);assert.equal(m.orders[0].factoryCostPaid,0);
 const signed=structuredClone(m);m=reduce(m,{type:'REQUEST_ATELIER_CHANGE',lead:'samir',draft:{products:['samir','ines'],packaging:'plain'}});
 assert.deepEqual(m.world,signed.world);assert.deepEqual(m.orders[0].products,['mira','samir']);assert.equal(m.orders[0].changeRequest.quote.lead,'samir');assert.equal(reduce(m,{type:'RELEASE_ATELIER_PRODUCTION'}).orders[0].status,'awaiting-production');
 m=reduce(m,{type:'ACCEPT_ATELIER_CHANGE'});const q=m.orders[0];assert.equal(q.lead,'samir');assert.equal(m.session.lead,'samir');assert.deepEqual(m.session.proposal.products,['samir','ines']);assert.equal(q.originalTerms.lead,'mira');assert.deepEqual(q.originalTerms.products,['mira','samir']);assert.equal(q.amendments.length,1);assert.equal(m.world.cash,10390+q.deposit);assert.equal(reduce(m,{type:'ACCEPT_ATELIER_CHANGE'}),m);
 m=reduce(m,{type:'RELEASE_ATELIER_PRODUCTION'});assert.equal(m.world.cash,10390+q.deposit-q.cost);assert.equal(m.orders[0].factoryCostPaid,q.cost);assert.equal(reduce(m,{type:'RELEASE_ATELIER_PRODUCTION'}),m);
 const blocked=reduce(m,{type:'REQUEST_ATELIER_CHANGE',draft:{packaging:'gift'}});assert.deepEqual(blocked.orders,m.orders);
 m=reduce(m,{type:'DELIVER_ATELIER_ORDER'});m=reduce(m,{type:'COLLECT_ATELIER_BALANCE'});assert.equal(m.world.cash,10390+q.netProfit);assert.equal(m.orders[0].received,q.revenue);
});
test('decline keeps old deposit, terms and date; gift date changes only on agreement; rights and funding still apply',()=>{
 let m=reduce(confirmed(),{type:'SIGN_ATELIER_RESERVED'}),base=structuredClone(m);m=reduce(m,{type:'REQUEST_ATELIER_CHANGE',draft:{packaging:'gift'}});assert.equal(m.orders[0].deliveryDay,base.orders[0].deliveryDay);
 const declined=reduce(m,{type:'DECLINE_ATELIER_CHANGE'});assert.deepEqual(declined.world,base.world);assert.equal(declined.orders[0].cost,base.orders[0].cost);assert.equal(declined.orders[0].amendments.length,0);
 m=reduce(m,{type:'ACCEPT_ATELIER_CHANGE'});assert.equal(m.orders[0].deliveryDay,28);assert.equal(m.world.day,22);assert.equal(m.world.cash,10390+m.orders[0].deposit);
 const invalid=reduce(base,{type:'REQUEST_ATELIER_CHANGE',lead:'samir',draft:{products:['samir','ines'],versionId:'original'}});assert.equal(invalid.orders[0].changeRequest,null);
 const poor=structuredClone(base);poor.world.cash=poor.orders[0].deposit;assert.equal(reduce(poor,{type:'REQUEST_ATELIER_CHANGE',draft:{packaging:'gift'}}).orders[0].changeRequest,null);
 assert.equal(reduce(base,{type:'DELIVER_ATELIER_ORDER'}),base);
});
