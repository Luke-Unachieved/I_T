import test from'node:test';import assert from'node:assert/strict';
import{allocationReceipt}from'../src/deal-room-allocation-view.js';import{caseGrowthView}from'../src/deal-room-case-growth-view.js';
const q={allocationVersion:1,allocation:{bedside:40,welcome:20},productQuantities:{mira:40,samir:60,ines:20},products:['mira','samir','ines'],quantity:60,purpose:'studio-project',studioDirection:'group',studioBrief:'bedside',agreement:'private',terms:'delivery',paymentDay:155,balanceDue:6720,netProfit:2730};
test('mixed receipt and production never claim every product is 60 or invent a new specification',()=>{
 const receipt=allocationReceipt(q);assert.match(receipt,/调光台灯 40 件 · 保温杯 60 件 · 桌布 20 件/);assert.doesNotMatch(allocationReceipt(q,{compact:true}),/allocation-result/);
 for(const status of ['production','paid']){const html=caseGrowthView({caseGrowth:{status,active:q}},null);assert.match(html,/40 件/);assert.match(html,/20 件/);assert.doesNotMatch(html,/每款 60|你已能直接接目录补货|新用途固定规格/);}
 assert.equal(allocationReceipt({}), '');
});
