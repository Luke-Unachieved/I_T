import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../src/deal-room-app.js',import.meta.url),'utf8');
const context={};vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('function businessMotionView(')),context);
const motion=(kind,event)=>context.businessMotionView({feedback:{kind}},event);
test('a delivery without receipt is shown as a parcel, not money',()=>{
 const html=motion('round-delivered','delivering');assert.match(html,/gesture-delivery/);assert.doesNotMatch(html,/gesture-coin/);
});
test('confirmed paid feedback has a receipt gesture',()=>{assert.match(motion('account-paid','receiving'),/gesture-receipt/);});
test('navigation and failed or unrecognized states do not invent a reward',()=>{
 assert.equal(motion('paid',''), '');assert.equal(motion('paid','arriving'),'');assert.equal(motion('counter','receiving'),'');
});
test('signing has an authored signature and no money token',()=>{
 const html=motion('collection-signed','signing');assert.match(html,/gesture-ink/);assert.doesNotMatch(html,/gesture-coin/);
});
