import test from 'node:test';import assert from 'node:assert/strict';
import {createAtelierWorkbench as create,reduceAtelierWorkbench as reduce} from '../src/deal-room-atelier-adoption-workbench-experiment.js';
const order=(packaging='plain')=>({id:'atelier-experiment-1',buyerId:'atelier',status:'paid',products:['mira','samir'],quantity:40,packaging,versionId:'generic',lead:'mira',use:'实际采用用途',revenue:4000,cost:2400,paymentDay:28});
test('only actual paid and supported contract goods can become a workbench',()=>{
 for(const status of ['production','receivable','confirmed'])assert.equal(create({...order(),status}),null);
 assert.equal(create({...order(),products:['fake']}),null);assert.equal(create({...order(),buyerId:'northline'}),null);
 const s=create(order());assert.deepEqual(Object.keys(s.products),['mira','samir']);assert.match(reduce(s,{type:'DEMONSTRATE_PRODUCT',productId:'ines'}).feedback,/不在/);
});
test('open display changes lead and actual product interaction, never signed facts',()=>{
 const o=order(),original=structuredClone(o),s=create(o);let n=reduce(s,{type:'SELECT_LEAD',productId:'samir'});assert.equal(n.lead,'samir');
 n=reduce(n,{type:'DEMONSTRATE_PRODUCT',productId:'mira'});assert.equal(n.products.mira.lightOn,true);n=reduce(n,{type:'DEMONSTRATE_PRODUCT',productId:'samir'});assert.equal(n.products.samir.lidOpen,true);
 assert.deepEqual(n.contract,original);assert.deepEqual(o,original);assert.equal(s.products.mira.lightOn,false);assert.equal('cash' in n,false);assert.equal('day' in n,false);
});
test('gift opens only purchased contents and closes them without changing contract',()=>{
 const o={...order('gift'),products:['mira','samir','ines']};let n=create(o);assert.equal(reduce(n,{type:'DEMONSTRATE_PRODUCT',productId:'ines'}).products.ines.unfolded,false);
 n=reduce(n,{type:'OPEN_BOX'});assert.equal(n.completeGiftSets,39);assert.equal(n.demonstrationSets,1);assert.equal(n.contract.quantity,40);for(const productId of o.products)n=reduce(n,{type:'DEMONSTRATE_PRODUCT',productId});assert.equal(n.products.ines.unfolded,true);
 const before=n.contract;n=reduce(n,{type:'CLOSE_BOX'});assert.equal(n.boxOpen,false);assert.equal(n.completeGiftSets,40);assert.equal(n.demonstrationSets,0);assert.deepEqual(n.products,{mira:{lightOn:false},samir:{lidOpen:false},ines:{unfolded:false}});assert.deepEqual(n.contract,before);
 assert.equal(reduce(n,{type:'SELECT_LEAD',productId:'samir'}).lead,'mira');
});
