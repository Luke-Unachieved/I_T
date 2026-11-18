import test from 'node:test';
import assert from 'node:assert/strict';
import {officeMemoryView,officeEarnedDisplay} from '../src/deal-room-office-view.js';
const order=(quantity,extra={})=>({clientId:'mira',status:'paid',quantity,signedDay:2,deliveryDay:5,paymentDay:7,revenue:4000,cost:2400,deposit:1000,balanceDue:3000,operatingCost:150,netProfit:1450,...extra});
test('sample memories show only actual paid contracts and no invented earnings',()=>{
 const state={contracts:[order(60),order(999,{status:'fulfilling'})]},before=JSON.stringify(state),html=officeMemoryView(state);
 assert.match(html,/60 件/);assert.doesNotMatch(html,/999 件/);assert.match(html,/1,450/);assert.match(html,/第 7 天/);assert.equal(JSON.stringify(state),before);
});
test('browsing selects real orders and defaults to the latest paid one',()=>{
 const state={contracts:[order(60),order(120)]};assert.match(officeMemoryView(state),/120 件/);assert.match(officeMemoryView(state,{workIndex:0}),/60 件/);assert.match(officeMemoryView(state,{workIndex:999}),/120 件/);
});
test('missing facts remain missing and unrecognized clients never enter markup',()=>{
 assert.equal(officeMemoryView({contracts:[]}), '');
 assert.equal(officeMemoryView({contracts:[order(1,{clientId:'<script>'})]}), '');
 assert.match(officeMemoryView({contracts:[order(1,{netProfit:undefined})]}),/未记录/);
});
test('highlight belongs only to a real completed sample',()=>{
 assert.match(officeEarnedDisplay({contracts:[order(60)]},'mira'),/class="office-earned-selected"/);
 assert.doesNotMatch(officeEarnedDisplay({contracts:[order(60)]},'samir'),/class="office-earned-selected"/);
});
