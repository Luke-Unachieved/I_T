import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

// Export private reducers only in this in-memory test module. Product exports
// remain unchanged; relative imports resolve against the actual engine source.
const engineURL=new URL('../src/deal-room-engine.js',import.meta.url);
let source=await readFile(engineURL,'utf8');
source=source.replace(/from '\.\/([^']+)'/g,(_,file)=>"from '"+new URL(file,engineURL).href+"'");
source+='\nexport {reduceRecordedDeal,replayRecordedDeal};';
const engine=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));

function ownedLifeFixture(){
 let state=engine.createDealRoom();
 for(const optionId of ['trial','ready','small'])
  for(const action of [{type:'PROPOSE',optionId},{type:'ADVANCE'},{type:'NEXT_CLIENT'}])
   state=engine.reduceRecordedDeal(state,action);
 for(const itemId of ['chair','books','record','records'])
  state=engine.reduceRecordedDeal(state,{type:'BUY_LIFE_ITEM',itemId});
 assert.equal(state.personalLife.purchases.length,4);
 return state;
}
function compare(state,action){
 const before=JSON.stringify(state);
 const original=engine.reduceRecordedDeal(state,action);
 const fast=engine.replayRecordedDeal(state,action);
 assert.deepEqual(fast,original);
 assert.equal(fast===state,original===state,'preserve no-op identity');
 assert.equal(JSON.stringify(state),before,'neither reducer mutates input');
 return original;
}
test('cold replay fast path equals original for 1800 valid and rejected life-setting attempts',()=>{
 let state=ownedLifeFixture(),checks=0;
 for(let n=0;n<300;n++){
  const actions=[
   {type:'ARRANGE_LIFE_ITEM',itemId:'chair',position:n%2?'window':'inside'},
   {type:'READ_LIFE_BOOK',itemId:'books',page:n%4},
   {type:'SELECT_LIFE_RECORD',itemId:'records',track:['evening','rain','dance'][n%3]},
   {type:'READ_LIFE_BOOK',itemId:'books',page:4},
   {type:'SELECT_LIFE_RECORD',itemId:'records',track:'fake'},
   {type:'ARRANGE_LIFE_ITEM',itemId:'chair',position:'fake'}
  ];
  for(const action of actions){state=compare(state,action);checks++;}
 }
 assert.equal(checks,1800);
});
test('constructed 4095/4096 capacity and counter branches match original (not genuine full-save fixtures)',()=>{
 const state=ownedLifeFixture();
 let checks=0;
 // Deliberately fabricated history to isolate capacity branches. This does NOT
 // establish acceptance of a real 4096-action save or a full business playthrough.
 for(const length of [4095,4096]){
  const boundary={...state,history:Array.from({length},()=>({type:'NEXT_CLIENT'}))};
  for(const kind of ['counter','personal-life']){
   const input={...boundary,feedback:{kind,message:'test'}};
   compare(input,{type:'ARRANGE_LIFE_ITEM',itemId:'chair',position:input.personalLife.positions.chair==='window'?'inside':'window'});
   checks++;
  }
 }
 assert.equal(checks,4);
});
