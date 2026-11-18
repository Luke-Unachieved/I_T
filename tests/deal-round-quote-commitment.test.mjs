import test from 'node:test';
import assert from 'node:assert/strict';
import {createDealRoom,reduceDealRoom,currentClient,previewOffer} from '../src/deal-room-engine.js';
import {quoteCommitmentView} from '../src/deal-room-quote-view.js';
const act=(s,type,p={})=>{const n=reduceDealRoom(s,{type,...p});assert.notEqual(n,s,type);return n;};
const finish=(s,id)=>act(act(act(s,'PROPOSE',{optionId:id}),'ADVANCE'),'NEXT_CLIENT');
const choose=(s,clientId)=>act(s,'SELECT_CLIENT',{clientId});
const quote=s=>quoteCommitmentView(s,previewOffer(s,'repeat-small'),{roundActive:true,client:currentClient(s)}).match(/aria-label="接下这单后的安排">([^<]+)/)?.[1];
test('the quoted first order can be the last; the second fills the round, exactly as the settlement controls do',()=>{
 let s=['trial','ready','small'].reduce(finish,createDealRoom());s=act(act(s,'CONTINUE_BUSINESS'),'ENABLE_ROUND_RECEIVABLES');
 const first=choose(s,'mira'),before=JSON.stringify(first);assert.equal(first.day,9);assert.match(quote(first),/也可以不接第二单/);assert.equal(JSON.stringify(first),before);
 const done=act(act(first,'PROPOSE',{optionId:'repeat-small'}),'DELIVER_ROUND_ORDER');assert.equal(done.day,10);assert.equal(act(done,'CLOSE_SETTLED_ROUND').phase,'review');
 const second=choose(done,'ines');assert.match(quote(second),/这单是本轮第二份采购/);assert.doesNotMatch(quote(second),/交货后可谈|也可以不接第二单/);
 const end=act(act(second,'PROPOSE',{optionId:'repeat-small'}),'DELIVER_ROUND_ORDER');assert.equal(act(end,'FINISH_ROUND_RECEIVABLES').phase,'review');
 let retail=act(['trial','ready','small'].reduce(finish,createDealRoom()),'CONTINUE_BUSINESS');for(const id of ['mira','ines'])retail=finish(choose(retail,id),'repeat-small');
 retail=act(act(retail,'START_SUPPLY_PLAN',{clientId:'mira',firstBatch:'small',payment:'delivery'}),'FULFIL_SUPPLY_PLAN');retail=act(act(retail,'CONTINUE_RETAIL_BUSINESS'),'ENABLE_ROUND_RECEIVABLES');
 const stocked=choose(retail,'mira'),shipping=previewOffer(stocked,'repeat-small').deliveryDay;assert.ok(quote(stocked).includes('门店卖 8 天，预计第 '+(shipping+8)+' 天再补货'));
});
