import test from 'node:test';import assert from 'node:assert/strict';
import {createGapProcurement as create,previewGapProcurement as preview,reduceGapProcurement as reduce} from '../src/customer-gap-procurement-experiment.js';
const world=()=>({day:169,cash:65320,productDevelopment:{status:'active',factory:'studio'}}),inquiry={clientId:'samir',quantity:12,unitPrice:75};
const delivered=()=>reduce(reduce(create(world(),inquiry),{type:'BUY_FACTORY_BATCH',factoryMode:'batch'}),{type:'FULFIL_FACTORY_INQUIRY'});
test('explicit 60-lamp offer for a 12-lamp inquiry: cash loss and unsold cost remain distinct',()=>{
 const s=world(),before=structuredClone(s);let m=create(s,inquiry);assert.equal(preview(m,'batch').requiredCash,2820);assert.equal(preview(m,'batch').cashAfterDelivery,63400);
 m=reduce(m,{type:'BUY_FACTORY_BATCH',factoryMode:'batch'});assert.equal(m.cash,62620);assert.equal(m.day,169);assert.equal(m.batch.status,'production');assert.equal(m.ledger.revenue,0);assert.equal(reduce(m,{type:'BUY_FACTORY_BATCH',factoryMode:'batch'}),m);
 m=reduce(m,{type:'FULFIL_FACTORY_INQUIRY'});assert.equal(m.cash,63400);assert.equal(m.day,173);assert.equal(m.batch.remaining,48);assert.deepEqual(m.ledger,{factorySpend:2700,revenue:900,soldCost:540,operatingCost:120,inventoryCost:2160,soldGrossMargin:360,cashChange:-1920});assert.equal(m.deliveries[0].quantity,12);assert.equal(reduce(m,{type:'FULFIL_FACTORY_INQUIRY'}),m);assert.deepEqual(s,before);
});
test('explicit later inquiry spends existing actual inventory once and has explicit delivery time',()=>{
 let m=delivered();assert.equal(m.inquiries.length,1);m=reduce(m,{type:'ADD_INQUIRY',inquiry:{clientId:'another-trial-client',quantity:8,unitPrice:75,stockDeliveryDays:1}});assert.equal(preview(m).factoryCost,0);
 m=reduce(m,{type:'FULFIL_STOCK_INQUIRY'});assert.equal(m.cash,63970);assert.equal(m.day,174);assert.equal(m.batch.remaining,40);assert.equal(m.ledger.factorySpend,2700);assert.equal(m.ledger.revenue,1500);assert.equal(m.ledger.inventoryCost,1800);assert.equal(m.ledger.cashChange,-1350);assert.equal(reduce(m,{type:'FULFIL_STOCK_INQUIRY'}),m);
 m=reduce(m,{type:'ADD_INQUIRY',inquiry:{clientId:'trial',quantity:41,unitPrice:75,stockDeliveryDays:1}});assert.equal(preview(m).valid,false);assert.equal(reduce(m,{type:'FULFIL_STOCK_INQUIRY'}).batch.remaining,40);
});
test('decline, sample constraints, money, customization and unconfirmed times cannot fabricate fulfilment',()=>{
 const initial=create(world(),inquiry),declined=reduce(initial,{type:'DECLINE_INQUIRY'});assert.equal(declined.cash,65320);assert.equal(declined.day,169);assert.equal(declined.batch,null);
 assert.equal(create({...world(),productDevelopment:{status:'active',factory:'line'}},inquiry),null);assert.equal(create(world(),{...inquiry,requiresNameplate:true}),null);
 let m=create({...world(),cash:2819},inquiry);assert.equal(preview(m,'batch').valid,false);assert.equal(reduce(m,{type:'BUY_FACTORY_BATCH',factoryMode:'batch'}).batch,null);
 for(const extra of [{requiresNameplate:true},{customDesign:true},{packaging:'exclusive'},{stockDeliveryDays:undefined}]){m=delivered();const n=reduce(m,{type:'ADD_INQUIRY',inquiry:{clientId:'trial',quantity:8,unitPrice:75,stockDeliveryDays:1,...extra}});assert.equal(n.inquiries.length,1);}
});

test('explicit small trial quote is default and avoids forced unsold stock',()=>{
 let m=create(world(),inquiry);const q=preview(m,{factoryMode:'small'});assert.equal(q.factoryMode,'small');assert.equal(q.factoryCost,720);assert.equal(q.requiredCash,840);assert.equal(q.cashAfterDelivery,65380);assert.equal(q.remaining,0);
 m=reduce(m,{type:'BUY_FOR_INQUIRY'});assert.equal(m.cash,64600);assert.equal(m.batch.quantity,12);assert.equal(m.batch.unitCost,60);m=reduce(m,{type:'FULFIL_FACTORY_INQUIRY'});assert.equal(m.cash,65380);assert.equal(m.day,173);assert.equal(m.batch.remaining,0);assert.equal(m.ledger.inventoryCost,0);assert.equal(m.ledger.cashChange,60);assert.equal(m.ledger.soldCost,720);
});
