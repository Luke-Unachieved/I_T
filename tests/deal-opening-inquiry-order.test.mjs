import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {buildDealHtml} from '../scripts/build-deal-standalone.mjs';
import {createDealRoom,reduceDealRoom,normalizeDealRoom,openFirstBuyers,firstBuyerProjection,quoteOptions,previewOffer,openingCurationOffers} from '../src/deal-room-engine.js';

import {encodeDealBackup,parseDealBackup} from '../src/deal-room-save.js';
const ids=['mira','samir','ines'], options={mira:['trial','rollout'],samir:['ready','branded'],ines:['small','season']};
const legacyDigests=[
 'a16532d5fb7e0dc8a775d91a24ce13bd601707685ce256e97f0f6c9063c557d1',
 '975f5b01820cea91ebbfe5f1c633b7e5cc92fa4bdd5de5cfd7a9a9800da5b0d9',
 'fc350789e80a6b4d930547c8e5f0ed03fb5cfeba5a52d629b6ba47a858ad0cea',
 '5fa0296e50a541543bbfbc6153f5f9ae6d5e984683f50d88e9c803d97b700560',
 '8c4f987c2a55e4935741f0f158074e2d68c56b8e20305e0a1d22e65290112a50',
 'abe80fda8f37d63099de2ac07b10eac515c0a06184aa183fe612424cc1f5db64',
 '00de4e46a6e9bcef1f626ef00393eb50fcadf7ca688578323e60272dc07af718',
 'ff43db371bee7f564cd96326d0431e0b9879f1e63bc1d712c91ebed7d0f04049'
]; // Serialized by the unmodified engine at d6ac55f.
function act(s,a){const n=reduceDealRoom(s,a);assert.notEqual(n,s,a.type);assert.deepEqual(normalizeDealRoom(JSON.parse(JSON.stringify(n))),n);return n;}
function route(order,choices){
 let s=createDealRoom();
 for(const [i,id] of order.entries()){
  const p=firstBuyerProjection(s,id),q=previewOffer(p,choices[id]);assert.equal(q.valid,true);
  const a=p===s?{type:'PROPOSE',optionId:q.id}:{type:'PROPOSE_OPENING_QUOTE',clientId:id,optionId:q.id};
  const signed=act(s,a);assert.equal(signed.cash,q.cashAfterSigning);assert.equal(signed.contracts.at(-1).clientId,id);
  assert.deepEqual(openFirstBuyers(signed),[]);assert.deepEqual(openingCurationOffers(signed),[]);
  s=act(signed,{type:'ADVANCE'});assert.equal(s.day,q.paymentDay);assert.equal(s.cash,q.cashAfterPayment);
  s=act(s,{type:'NEXT_CLIENT'});assert.equal(s.phase,i===2?'complete':'negotiating');
  if(i!==2)assert.deepEqual(openingCurationOffers(s),[]);
 }
 assert.deepEqual(s.contracts.map(c=>c.clientId),order);
 assert.equal(s.cash,5000+s.contracts.reduce((n,c)=>n+c.netProfit,0));assert.equal(s.history.length,9);
 assert.deepEqual(openingCurationOffers(s).map(c=>[c.id,c.deliveredQuantity]),ids.map(id=>[id,s.contracts.find(c=>c.clientId===id).quantity]));
 return s;
}
test('all six inquiry orders and eight lot combinations reconcile; default-route saves stay byte-identical',()=>{
 let n=0;const seen=new Set();
 for(const mira of options.mira)for(const samir of options.samir)for(const ines of options.ines){
  const choices={mira,samir,ines};
  for(const first of ids)for(const second of ids.filter(c=>c!==first)){
   const order=[first,second,ids.find(id=>id!==first&&id!==second)],s=route(order,choices);
   if(order.join()===ids.join()){
    assert.equal(s.openingOrderChosen,undefined);assert.equal(createHash('sha256').update(JSON.stringify(s)).digest('hex'),legacyDigests[n]);
   }
   seen.add(order.join()+'|'+Object.values(choices).join());
  }
  n++;
 }
 assert.equal(seen.size,48);
});
test('priority changes a real buying window, not client identity or gifts',()=>{
 const q={mira:'rollout',samir:'ready',ines:'season'},late=route(ids,q),early=route(['samir','ines','mira'],q);
 assert.deepEqual([late.day,late.cash],[26,7850]);assert.deepEqual([early.day,early.cash],[23,9040]);
 assert.deepEqual(early.contracts.map(c=>c.revenue),[4100,6200,4500]);assert.deepEqual(late.contracts.map(c=>c.revenue),[4500,2800,5800]);
});
test('browsing is free, refused offers remain unsigned, stale or malformed swaps may not reopen contracts',()=>{
 const s=createDealRoom(),initial=structuredClone(s),alt=(clientId,optionId)=>({type:'PROPOSE_OPENING_QUOTE',clientId,optionId});
 assert.equal(firstBuyerProjection(s,'invalid'),s);assert.equal(firstBuyerProjection(s,'samir').cash,s.cash);assert.deepEqual(s,initial);
 for(const a of [alt('samir','season'),alt('nobody','ready'),alt('mira','trial'),{...alt('samir','ready'),cash:1}])assert.equal(reduceDealRoom(s,a),s);
 let t=act(s,alt('samir','promise'));assert.equal(t.feedback.kind,'counter');assert.deepEqual(t.contracts,[]);
 assert.equal(t.cash,s.cash);assert.equal(t.day,s.day);assert.deepEqual(openingCurationOffers(t),[]);
 t=act(t,{type:'PROPOSE',optionId:'ready'});assert.equal(reduceDealRoom(t,alt('ines','season')),t);
 t=act(act(t,{type:'ADVANCE'}),{type:'NEXT_CLIENT'});assert.deepEqual(openFirstBuyers(t).map(c=>c.id),['mira','ines']);assert.equal(reduceDealRoom(t,alt('samir','ready')),t);
 const closed=route(['ines','samir','mira'],{ines:'season',samir:'ready',mira:'trial'});
 assert.equal(reduceDealRoom(closed,alt('samir','ready')),closed);assert.deepEqual(openFirstBuyers(act(closed,{type:'CONTINUE_BUSINESS'})),[]);
});
test('out-of-order partial orders export and restore without new unlocks or rewritten contracts',()=>{
 const initial=createDealRoom(),signed=act(initial,{type:'PROPOSE_OPENING_QUOTE',clientId:'ines',optionId:'season'}),paid=act(signed,{type:'ADVANCE'}),next=act(paid,{type:'NEXT_CLIENT'});
 for(const s of [initial,signed,paid,next])assert.deepEqual(parseDealBackup(encodeDealBackup(s)).state,s);
 const forged=JSON.parse(encodeDealBackup(next));forged.state.contracts[0].quantity++;assert.throws(()=>parseDealBackup(JSON.stringify(forged)));
 const changed=JSON.parse(encodeDealBackup(next));changed.state.history[0].clientId='mira';assert.throws(()=>parseDealBackup(JSON.stringify(changed)));
});
async function openingDesk(){
 const script=(await buildDealHtml()).match(/<script>([\s\S]*?)<\/script>/)[1];
 const key='trade-tycoon:deal-room-offline:v1',values=new Map();let writes=0;
 const localStorage={getItem:k=>values.get(k)??null,setItem(k,v){writes++;values.set(k,v);}};
 function load(){
  let html='',list=new Map(),singles=new Map();const stub=()=>({focus(){},setAttribute(){},scrollIntoView(){},addEventListener(t,f){this['on'+t]=f;}});
  const root={get innerHTML(){return html;},set innerHTML(text){html=text.replace(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/g,'test-image');list=new Map();singles=new Map();},querySelector(sel){
   if(!['#motion','.business h2','.counter','#opening-inbox-toggle'].includes(sel))return null;
   if(sel==='#opening-inbox-toggle'&&!html.includes('id="opening-inbox-toggle"'))return null;
   if(!singles.has(sel))singles.set(sel,stub());return singles.get(sel);
  },querySelectorAll(sel){
   const m=sel.match(/^\[(data-[a-z-]+)\]$/);if(!m)return [];
   if(list.has(sel))return list.get(sel);const k=m[1],name=k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
   const nodes=[...html.matchAll(new RegExp(k+'="([^"]+)"','g'))].map(([_,v])=>({...stub(),dataset:{[name]:v},getAttribute:()=>v}));
   list.set(sel,nodes);return nodes;
  }};
  const document={querySelector:()=>root,documentElement:{classList:{contains:()=>false,add(){}}}};
  new vm.Script(script).runInNewContext({document,localStorage,structuredClone,TextEncoder,console},{timeout:3000});
  function press(attr,v){const n=root.querySelectorAll('['+attr+']').find(x=>x.getAttribute()===v);assert.ok(n,attr+'='+v);n.onclick();}
  return {root,press};
 }
 return {load,values,key,get writes(){return writes;}};
}
test('shipped module bindings browse without saving and sign the viewed customer, including reload after a counter',async()=>{
 const desk=await openingDesk(),{load,values,key}=desk;
 let {root,press}=load();
 root.querySelector('#opening-inbox-toggle').onclick();assert.match(root.innerHTML,/未接的客户询盘/);
 press('data-first-buyer','ines');assert.match(root.innerHTML,/<h2[^>]*>Inês/);
 press('data-select','season');assert.match(root.innerHTML,/三成定金|30% 定金/);assert.equal(desk.writes,0);
 press('data-select','all-now');press('data-action','PROPOSE');
 const refused=JSON.parse(values.get(key));assert.equal(refused.cash,5000);assert.equal(refused.contracts.length,0);assert.equal(refused.clientIndex,2);
 ({root,press}=load());assert.match(root.innerHTML,/<h2[^>]*>Inês/);
 root.querySelector('#opening-inbox-toggle').onclick();press('data-first-buyer','samir');assert.equal(desk.writes,1);
 press('data-action','PROPOSE');assert.match(root.innerHTML,/Samir/);
 let saved=JSON.parse(values.get(key));assert.equal(saved.phase,'fulfilling');assert.equal(saved.contracts[0].clientId,'samir');assert.equal(saved.cash,2400);
 assert.doesNotMatch(root.innerHTML,/id="opening-inbox-toggle"/);
 press('data-action','ADVANCE');assert.match(root.innerHTML,/靠窗的阅读椅/);assert.match(root.innerHTML,/看看下一位客户/);
 press('data-action','NEXT_CLIENT');saved=JSON.parse(values.get(key));assert.equal(saved.clientIndex,0);assert.equal(saved.day,3);
 root.querySelector('#opening-inbox-toggle').onclick();assert.doesNotMatch(root.innerHTML,/data-first-buyer="samir"/);
});


test('timely branded opening delivery preserves existing costs and earns the branded reorder, not a second deadline reward',()=>{
 const s=createDealRoom(),samir=firstBuyerProjection(s,'samir'),q=previewOffer(samir,'branded-opening'),restock=previewOffer(samir,'branded');
 assert.equal(q.accepted,true);assert.equal(q.valid,true);
 for(const k of ['quantity','revenue','cost','deposit','deliveryDay','paymentDay','netProfit'])assert.equal(q[k],restock[k],k);
 assert.deepEqual([q.quantity,q.deliveryDay,q.paymentDay,q.netProfit],[120,6,9,1560]);
 assert.ok(!quoteOptions(samir).some(o=>o.id==='promise'));
 const order=['samir','ines','mira'],plain=route(order,{samir:'ready',ines:'season',mira:'trial'}),custom=route(order,{samir:q.id,ines:'season',mira:'trial'});
 assert.deepEqual([custom.day,custom.cash],[23,8240]);assert.deepEqual([plain.day,plain.cash],[17,8520]);
 assert.equal(custom.contracts[0].specification,'branded');assert.equal(custom.contracts[1].revenue,5800);assert.equal(plain.contracts[1].revenue,6200);
 const back=act(act(custom,{type:'CONTINUE_BUSINESS'}),{type:'SELECT_CLIENT',clientId:'samir'});
 assert.equal(previewOffer(back,'repeat-small').specification,'branded');assert.equal(previewOffer(back,'branded-opening').valid,false);
});
test('the custom opening order is unavailable after another first delivery; regular branded replenishment remains possible',()=>{
 let s=createDealRoom();for(const a of [{type:'PROPOSE',optionId:'trial'},{type:'ADVANCE'},{type:'NEXT_CLIENT'}])s=act(s,a);
 assert.equal(s.day,4);assert.equal(quoteOptions(s).some(o=>o.id==='branded-opening'),false);
 assert.equal(reduceDealRoom(s,{type:'PROPOSE',optionId:'branded-opening'}),s);assert.equal(previewOffer(s,'promise').accepted,false);
 assert.equal(previewOffer(s,'ready').deliveryDay,6);assert.equal(previewOffer(s,'branded').deliveryDay,9);
 // The contractual cutoff itself is inclusive; day 2 is a boundary fixture, not another natural start.
 const samir=firstBuyerProjection(createDealRoom(),'samir');
 assert.equal(previewOffer({...samir,day:2},'branded-opening').deliveryDay,7);
 assert.equal(previewOffer({...samir,day:3},'branded-opening').valid,false);
});
test('selecting the actual custom cup on the first morning signs the opening order, and the paid receipt survives reload',async()=>{
 const desk=await openingDesk(),{load,values,key}=desk;let {root,press}=load();
 root.querySelector('#opening-inbox-toggle').onclick();assert.match(root.innerHTML,/现货、定制都赶得上第 7 天开业/);
 press('data-first-buyer','samir');press('data-sample','custom');
 assert.match(root.innerHTML,/定制包装第 6 天到，赶上第 7 天开业；第 9 天收齐货款/);assert.doesNotMatch(root.innerHTML,/data-repair=|定制包装要延后/);
 assert.equal(desk.writes,0);press('data-action','PROPOSE');let s=JSON.parse(values.get(key));
 assert.deepEqual([s.phase,s.cash,s.contracts[0].optionId,s.contracts[0].specification],['fulfilling',2200,'branded-opening','branded']);
 ({root,press}=load());assert.match(root.innerHTML,/class="sample-box"/);
 press('data-action','ADVANCE');s=JSON.parse(values.get(key));assert.deepEqual([s.day,s.cash,s.contracts[0].status],[9,6560,'paid']);
 ({root}=load());assert.match(root.innerHTML,/开业定制杯第 6 天交付，货款已收齐/);
});
