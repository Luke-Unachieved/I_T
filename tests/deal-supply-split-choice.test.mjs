import test from 'node:test';
import assert from 'node:assert/strict';
import {createDealRoom,reduceDealRoom,previewSupplyPlan,careerOpportunity} from '../src/deal-room-engine.js';
import {supplyDraftView} from '../src/deal-room-supply-view.js';

test('first-lot size is selectable on the real repeat-client quotation and binds the quantity, cash and date of the signed plan',()=>{
 const act=(s,type,p={})=>{const next=reduceDealRoom(s,{type,...p});assert.notEqual(next,s,type);return next;};
 const finish=(s,id)=>act(act(act(s,'PROPOSE',{optionId:id}),'ADVANCE'),'NEXT_CLIENT');
 let s=['trial','ready','small'].reduce(finish,createDealRoom());s=act(s,'CONTINUE_BUSINESS');
 for(const clientId of ['mira','ines'])s=finish(act(s,'SELECT_CLIENT',{clientId}),'repeat-small');
 const opportunity=careerOpportunity(s);assert.equal(opportunity.eligible,true);assert.deepEqual([s.day,s.cash],[13,9540]);
 for(const payment of ['delivery','deposit'])for(const firstBatch of ['small','large']){
  const d={clientId:'mira',firstBatch,payment},p=previewSupplyPlan(s,d);
  assert.equal(p.valid,true);const html=supplyDraftView(opportunity,d,p);
  for(const [id,label] of [['small','60'],['large','120']]){
   const button=html.match(new RegExp('<button data-plan-first="'+id+'"[^>]*>[^<]+<\\/button>'))?.[0];
   assert.ok(button,id);assert.ok(button.includes('aria-pressed="'+(firstBatch===id)+'"'));assert.ok(button.includes(label+' 件'));
  }
  const signed=act(s,'START_SUPPLY_PLAN',d),lot=signed.supplyPlan.lots[0],small=firstBatch==='small';
  assert.deepEqual([lot.quantity,lot.deliveryDay,signed.supplyPlan.totalQuantity],[small?60:120,small?16:18,180]);
  assert.equal(signed.cash,p.cashAfterSigning);assert.equal(signed.supplyPlan.payment,payment);assert.equal(p.netProfit,payment==='delivery'?1560:1740);
  if(payment==='delivery')assert.deepEqual([signed.cash,lot.revenue],[small?7740:5940,small?2400:4800]);
 }
});
