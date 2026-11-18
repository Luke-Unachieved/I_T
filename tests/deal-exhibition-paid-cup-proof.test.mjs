import test from 'node:test';
import assert from 'node:assert/strict';
import {createDealRoom,reduceDealRoom} from '../src/deal-room-engine.js';
import {exhibitionView} from '../src/deal-room-exhibition-view.js';
const act=(s,type,fields={})=>reduceDealRoom(s,{type,...fields});
const finish=(s,optionId)=>act(act(act(s,'PROPOSE',{optionId}),'ADVANCE'),'NEXT_CLIENT');
const open=(s)=>act(act(s,'CONTINUE_BUSINESS'),'SELECT_CLIENT',{clientId:'samir'});
const tour=(s,i)=>exhibitionView(s,{draft:{theme:'journey',entries:[{sourceId:'order-'+i,note:'first-step'},null,null]},touring:true});
test('the display uses only the paid package belonging to this cup, including the exact side the buyer approved',()=>{
 const plain=['trial','ready','small'].reduce(finish,createDealRoom());assert.doesNotMatch(tour(plain,1),/sample-box|data-paid-cup-proof/);
 const original=['trial','branded','small'].reduce(finish,createDealRoom());assert.match(tour(original,1),/sample-box/);
 for(const [id,side] of [['cup-front-proof','front'],['cup-back-proof','back']]){
  const signed=act(open(original),'PROPOSE',{optionId:id}),i=signed.contracts.length-1;
  assert.doesNotMatch(exhibitionView(signed),/data-paid-cup-proof| · (独立背贴|正面印标)<\/option>/);
  const s=act(signed,'ADVANCE'),before=structuredClone(s),html=tour(s,i);
  assert.match(html,new RegExp('data-paid-cup-proof="'+side+'"'));assert.match(html,/sample-box/);
  assert.match(html,side==='front'?/标签直接印在正面留白处，背面没有贴纸/:/正面保留原图案，背面有独立纸贴/);
  assert.doesNotMatch(tour(s,1),/data-paid-cup-proof/);assert.deepEqual(s,before);
 }
});
