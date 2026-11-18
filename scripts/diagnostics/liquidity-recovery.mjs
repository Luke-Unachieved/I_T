import assert from 'node:assert/strict';
import {createDealRoom,reduceDealRoom,normalizeDealRoom,previewCuration,businessOpportunities,openingCurationOffers} from '../../src/deal-room-engine.js';
const act=(s,type,x={})=>{const n=reduceDealRoom(s,{type,...x});assert.notEqual(n,s,`rejected ${type}`);return n;};
const finish=(s,id)=>act(act(act(s,'PROPOSE',{optionId:id}),'ADVANCE'),'NEXT_CLIENT');
let s=createDealRoom();for(const id of ['trial','ready','season'])s=finish(s,id);s=act(s,'CONTINUE_BUSINESS');for(let i=0;i<2;i++){s=act(s,'SELECT_CLIENT',{clientId:'mira'});s=finish(s,'repeat-small');}s=act(act(s,'START_SUPPLY_PLAN',{clientId:'mira',firstBatch:'small',payment:'delivery'}),'FULFIL_SUPPLY_PLAN');for(const itemId of ['chair','coffee','books','record','records'])s=act(s,'BUY_LIFE_ITEM',{itemId});s=act(s,'BUY_OFFICE_IMPROVEMENT');assert.equal(s.cash,1560);assert.deepEqual(normalizeDealRoom(s),s);
const start=structuredClone(s),result={start:{day:s.day,cash:s.cash},offers:openingCurationOffers(s).map(o=>o.id)};
// Historical ordinary-quote shortfall; later prepaid quotes are deliberately excluded.
// The real back action still permits the original curation route.
let back=act(s,'CONTINUE_RETAIL_BUSINESS');assert.equal(businessOpportunities(back).some(o=>o.options.some(q=>q.id!=='repeat-prepaid'&&q.valid)),false);back=act(back,'BACK_FROM_CLIENTS');assert.equal(back.phase,'review');assert.deepEqual(normalizeDealRoom(back),back);
s=act(back,'START_OPENING_CURATION',{clientId:'mira'});
const draft={products:['mira','samir','ines'],quantity:40,packaging:'plain'};
const quote=previewCuration(s,draft);assert.equal(quote.valid,true);assert.equal(quote.netProfit,2420);
result.quote=quote;s=act(s,'SIGN_CURATION',draft);result.afterSigning={day:s.day,cash:s.cash};s=act(s,'FULFIL_CURATION');assert.deepEqual(normalizeDealRoom(s),s);assert.equal(s.cash,3980);result.afterPayment={day:s.day,cash:s.cash};
const again=act(s,'CONTINUE_RETAIL_BUSINESS');result.recoveredRepeatOrders=businessOpportunities(again).flatMap(o=>o.options.filter(q=>q.valid).map(q=>({buyer:o.id,id:q.id,cashRequired:q.cashRequired})));assert.ok(result.recoveredRepeatOrders.length);
// Explicit sensitivity fixture: NOT the user's QA save, not a recovered canonical 5040 history.
// Same already-open opening brief and quote, only initial available cash varied to QA's figure.
const richer=act({...start,cash:5040},'START_OPENING_CURATION',{clientId:'mira'}),rq=previewCuration(richer,draft);assert.equal(rq.valid,true);let paid=act(act(richer,'SIGN_CURATION',draft),'FULFIL_CURATION');assert.equal(paid.cash,7460);result.cash5040Sensitivity={notActualQASave:true,quoteValid:rq.valid,afterSigning:rq.cashAfterSigning,afterPayment:paid.cash,net:rq.netProfit,requirement:'same opening curation invitation still available'};
console.log(JSON.stringify(result,null,2));
