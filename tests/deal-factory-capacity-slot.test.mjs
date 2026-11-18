import test from 'node:test';import assert from 'node:assert/strict';
import {createDealRoom,reduceDealRoom,previewOffer} from '../src/deal-room-engine.js';
import {developmentView} from '../src/deal-room-development.js';
const act=(s,type,v={})=>reduceDealRoom(s,{type,...v});
const finish=(s,id)=>act(act(act(s,'PROPOSE',{optionId:id}),'ADVANCE'),'NEXT_CLIENT');
const who=(s,id)=>act(s,'SELECT_CLIENT',{clientId:id});
function supplier(second=false){
 let s=['trial','ready','small'].reduce(finish,createDealRoom());s=act(s,'START_OPENING_CURATION',{clientId:'mira'});s=act(s,'SIGN_CURATION',{products:['mira','samir'],quantity:40,packaging:'plain'});s=act(s,'FULFIL_CURATION');s=act(s,'START_CASE_DEVELOPMENT');s=act(s,'COMMISSION_SAMPLE',{factory:second?'studio':'line'});s=act(act(s,'RECEIVE_SAMPLE'),'ACCEPT_SAMPLE');
 if(second){s=act(s,'OPEN_SECOND_SUPPLIER');s=act(act(act(s,'COMMISSION_SECOND_SAMPLE'),'RECEIVE_SECOND_SAMPLE'),'ACCEPT_SECOND_SAMPLE');}
 return s;
}
test('only the proven bulk supplier can reserve one slot; use, skip and expiry have distinct cash and dates under the normal order engine',()=>{
 for(const second of [false,true]){
 const model=second?'second-developed-lamp':'developed-lamp',view=second?'OPEN_SECOND_SUPPLIER':'VIEW_DEVELOPMENT',close=second?'CLOSE_SECOND_SUPPLIER':'CLOSE_SAMPLE';
 let s=supplier(second),unproven=act(s,view);assert.equal(act(unproven,'BOOK_LINE_FACTORY_SLOT'),unproven);
 s=act(s,'CONTINUE_BUSINESS');s=finish(who(s,'mira'),model);s=finish(who(s,'ines'),'repeat-small');assert.equal(s.phase,'review');
 const desk=act(s,view);assert.match(developmentView(desk),/四天内签同款/);const booked=act(desk,'BOOK_LINE_FACTORY_SLOT');assert.equal(booked.cash,s.cash-90);assert.equal(booked.day,s.day);assert.equal(act(booked,'BOOK_LINE_FACTORY_SLOT'),booked);assert.deepEqual(booked.contracts,desk.contracts);
 const start=x=>act(act(x,close),'CONTINUE_BUSINESS');const offer=x=>previewOffer(who(start(x),'mira'),model);
 assert.equal(offer(desk).deliveryDay-s.day,5);assert.equal(offer(booked).deliveryDay-s.day,3);assert.equal(offer(booked).paymentDay-s.day,10);
 const normal=finish(who(start(desk),'mira'),model),used=finish(who(start(booked),'mira'),model);assert.equal(used.cash,normal.cash-30);assert.equal(used.day,normal.day-2);assert.equal(previewOffer(who(used,'mira'),model).deliveryDay-used.day,5);
 const late=finish(who(start(booked),'samir'),'repeat-scale');assert.ok(late.day>booked.lineFactorySlot.lastDay);const lateQ=previewOffer(who(late,'mira'),model);assert.equal(lateQ.deliveryDay-late.day,5);assert.equal(late.lineFactorySlot.fee,90);console.log(second?'second':'first',s.day,s.cash,'slot settled',used.day,used.cash,'standard',normal.day,normal.cash);
 }
});