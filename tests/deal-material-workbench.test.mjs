import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createDealRoom,reduceDealRoom,previewCuration} from '../src/deal-room-engine.js';
import {curationView} from '../src/deal-room-curation-view.js';
import {buildDealHtml} from '../scripts/build-deal-standalone.mjs';
const act=(s,type,a={})=>reduceDealRoom(s,{type,...a});
const completed=['trial','ready','small'].reduce((s,optionId)=>act(act(act(s,'PROPOSE',{optionId}),'ADVANCE'),'NEXT_CLIENT'),createDealRoom());
const state=act(completed,'START_OPENING_CURATION',{clientId:'ines'});
function show(products,packaging='plain',quantity=40){const d={products,quantity,packaging},q=previewCuration(state,d);return {q,d,html:curationView(state.curation,d,q,null,null,state.cash)};}
test('the actual paid introduction offers only the selected physical samples, not a pretend adoption',()=>{
 assert.equal(state.phase,'curating');assert.equal(state.curation.anchor,'ines');
 const before=structuredClone(state);
 for(const [products,flask,linen,pair] of [[['mira'],false,false,false],[['samir','mira'],true,false,false],[['ines','mira'],false,true,false],[['samir','ines'],true,true,true]]){const {html}=show(products);assert.equal(html.includes('data-study="flask"'),flask);assert.equal(html.includes('data-study="linen"'),linen);assert.equal(html.includes('class="linen-paired-flask"'),pair);}
 const {d,q,html}=show(['samir','ines']);assert.ok(q.valid);assert.deepEqual(state,before);
 assert.match(html,/拧开倒茶/);assert.match(html,/铺上桌沿/);
 const signed=act(state,'SIGN_CURATION',d),paid=act(signed,'FULFIL_CURATION');assert.equal(signed.cash,q.cashAfterSigning);assert.equal(paid.cash,q.cashAfterPayment);assert.equal(paid.day,q.paymentDay);assert.deepEqual(paid.curationHistory.at(-1).products,['samir','ines']);
 const blocked=show(['mira','samir','ines'],'gift',60);assert.equal(blocked.q.valid,false);assert.match(blocked.html,/SIGN_CURATION" disabled/);
});
test('both three-pose workbenches are closed by default and expose native named, labelled keyboard radios, with no trade actions',()=>{
 const {html}=show(['samir','ines']);const fragments=[...html.matchAll(/<details class="material-study"[^>]*>[\s\S]*?<\/details>/g)].map(m=>m[0]);assert.equal(fragments.length,2);
 for(const [i,f] of fragments.entries()){const tag=i===0?'flask':'linen';assert.doesNotMatch(f,/<details[^>]*\bopen\b|data-action|<img|<image |<script|<animate|tabindex="-1"/);assert.equal((f.match(/ checked/g)||[]).length,1);assert.equal((f.match(/<input type="radio"/g)||[]).length,3);assert.equal((f.match(new RegExp('name="study-'+tag+'"','g'))||[]).length,3);for(let j=0;j<3;j++){assert.ok(f.includes('for="study-'+tag+'-'+j+'"'));assert.ok(f.includes('id="study-'+tag+'-'+j+'"'));assert.ok(f.includes('caption-'+j+'"'));}const ids=[...f.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);for(const m of f.matchAll(/url\(#([^\)]+)\)/g))assert.ok(ids.includes(m[1]));}
});
test('offline bundle includes the vector studies and scoped pose, reduced motion and narrow-screen handling',async()=>{
 const css=readFileSync(new URL('../src/deal-room-quote-view.css',import.meta.url),'utf8');
 for(const marker of ['.mode-1:checked~.study-frame .flask-cap','.mode-2:checked~.study-frame .flask-vessel','.mode-1:checked~.study-frame .linen-open','.mode-2:checked~.study-frame .linen-place','@keyframes study-pour','@media(prefers-reduced-motion:reduce)','.study-choice:focus-visible+label','min-height:44px'])assert.ok(css.includes(marker),marker);
 const html=await buildDealHtml();assert.ok(html.includes('function materialWorkbench('));assert.ok(html.includes('class="flask-cap"'));assert.ok(html.includes('class="linen-open"'));assert.ok(html.includes('@keyframes study-pour'));
});