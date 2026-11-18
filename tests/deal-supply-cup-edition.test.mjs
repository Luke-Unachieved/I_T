import test from 'node:test';
import assert from 'node:assert/strict';
import {goodsPriceRecords,priorSupplyAgreements,supplyCupEdition} from '../src/deal-room-goods-prices.js';
import {supplyDraftView} from '../src/deal-room-supply-view.js';

// Signed terms from the normal D12 and D33 Samir mandates. The intervening
// paid pop-up is the packaging change; it is not retroactive to the D12 lot.
const clients=[{id:'samir',name:'Samir'}];
const contract=(status,optionId,specification,paymentDay)=>({clientId:'samir',status,optionId,specification,paymentDay});
const contracts=[contract('paid','ready',undefined,6),contract('paid','repeat-small','standard',11),contract('paid','project-series','branded',28)];
function plan(signedDay,branded,payment='delivery'){
 const full=branded?10500:9300,cost=branded?7200:6300,revenue=payment==='delivery'?full*.96:full,finishDay=signedDay+(payment==='delivery'?8:12);
 return {clientId:'samir',clientName:'Samir',product:'不锈钢保温杯',signedDay,status:'paid',finishDay,cost,revenue,payment,totalQuantity:240,deposit:payment==='deposit'?full*.3:0,
  terms:{firstMinimum:80,firstMaximum:160},lots:[80,160].map((quantity,i)=>({id:i?'second':'first',quantity,cost:cost*quantity/240,revenue:revenue*quantity/240,startDay:signedDay+(i?5:0),deliveryDay:signedDay+(i?8:3),paymentDay:payment==='delivery'?signedDay+(i?8:3):finishDay}))};
}
test('repeat negotiation and the price book distinguish the two paid editions without repricing past contracts',()=>{
 const old=plan(12,false),brand=plan(33,true),s={contracts,day:41,supplyPlanHistory:[old,brand]},
 before=JSON.stringify(s),record=goodsPriceRecords(s).filter(r=>r.priceSource),offers=priorSupplyAgreements(s,clients);
 assert.deepEqual(record.map(r=>[r.specification,r.revenue/r.quantity]),[['supply-cup-plain',37.2],['supply-cup-plain',37.2],['supply-cup-branded',42],['supply-cup-branded',42]]);
 assert.match(offers,/Samir · 无印字现货[\s\S]*?每件 ¥37\.2/);assert.match(offers,/Samir · 定制包装[\s\S]*?每件 ¥42/);
 assert.equal(priorSupplyAgreements(s,[]),'');assert.equal(supplyCupEdition(brand,[...contracts.slice(0,2),{...contracts[2],status:'receivable'}]),null);
 const unseen=goodsPriceRecords({...s,contracts:[]}).filter(r=>r.priceSource);assert.equal(new Set(unseen.map(r=>r.specification)).size,2);assert.ok(unseen.every(r=>r.product.endsWith('包装未核实')));
 for(const [p,id,price] of [[old,'无印字现货','37.2'],[brand,'定制包装','42'],[plan(33,true,'deposit'),'定制包装','43.75']]){
  const preview={...p,valid:true,deposit:0,balanceDue:p.revenue,operatingCost:240,cashRequired:4900,cashAfterSigning:9000,netProfit:p.revenue-p.cost-240};
  const html=supplyDraftView({clients},{clientId:'samir',firstBatch:'small',payment:p.payment},preview);assert.ok(html.includes(id+' · 保温杯'));assert.ok(html.includes('本次每只 ¥'+price+'。'));
 }
 assert.equal(JSON.stringify(s),before);
});