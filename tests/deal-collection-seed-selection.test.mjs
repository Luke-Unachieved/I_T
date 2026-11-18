import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';
import {createDealRoom,reduceDealRoom as reduce,normalizeDealRoom} from '../src/deal-room-engine.js';
import {collectionQuote,collectionView,collectionSeedChoices,selectedCollectionSeed} from '../src/deal-room-collection.js';
import {studioProjectEligibility} from '../src/deal-room-studio-project.js';
import {buildDealHtml} from '../scripts/build-deal-standalone.mjs';
const a=(s,type,x={})=>{const n=reduce(s,{type,...x});assert.notEqual(n,s,type+' in '+s.phase);return n;},finish=(s,id)=>a(a(a(s,'PROPOSE',{optionId:id}),'ADVANCE'),'NEXT_CLIENT');
function cases(model=false){
 let s=createDealRoom();for(const id of ['trial','ready','season'])s=finish(s,id);
 s=a(s,'START_OPENING_CURATION',{clientId:'mira'});s=a(s,'SIGN_CURATION',{products:['mira','samir'],quantity:40,packaging:'plain'});s=a(s,'FULFIL_CURATION');
 s=a(s,'CONTINUE_BUSINESS');for(let i=0;i<2;i++)s=finish(a(s,'SELECT_CLIENT',{clientId:'mira'}),'repeat-small');
 s=a(a(s,'START_SUPPLY_PLAN',{clientId:'mira',firstBatch:'small',payment:'delivery'}),'FULFIL_SUPPLY_PLAN');
 if(model)s=a(a(a(a(s,'START_DEVELOPMENT'),'COMMISSION_SAMPLE',{factory:'studio'}),'RECEIVE_SAMPLE'),'ACCEPT_SAMPLE');
 s=a(s,'START_CLIENT_PROJECTS');for(const clientId of ['mira','samir','ines'])s=finish(a(s,'SELECT_CLIENT',{clientId}),'project-focus');
 s=a(s,'START_CURATION',{clientId:'samir'});s=a(s,model?'SIGN_CURATION_SAMPLE':'SIGN_CURATION',{products:model?['mira','samir']:['samir','ines'],quantity:40,packaging:'plain',...(model?{lampVersion:'developed'}:{})});return a(s,'FULFIL_CURATION');
}
const sign=x=>a(x,'SIGN_OWN_COLLECTION_FROM_CASE',{referrerId:'samir',style:'botanical'});
test('D46 fair preview: choose one real, entirely paid combination before sampling, without buying or advancing the calendar',()=>{
 const h=cases(),d=a(h,'START_COLLECTION'),snapshot=structuredClone(d);assert.equal(d.day,46);assert.equal(d.cash,18330);assert.deepEqual(collectionSeedChoices(d).map(o=>[o.referrerId,o.day,o.current]),[['mira',23,true],['samir',46,false]]);
 const select={model:'own',style:'botanical',sourceId:'samir'};assert.deepEqual(selectedCollectionSeed(d,select).products,['samir','ines']);assert.match(collectionView(d,select),/保温杯、棉麻桌布。.*待客陈列、迎宾茶台/);assert.doesNotMatch(collectionView(d,select),/客房床头/);assert.equal(selectedCollectionSeed(d,{...select,model:'private'}),null);
 assert.deepEqual(d,snapshot);const back=a(d,'BACK_FROM_COLLECTION');assert.equal(back.cash,h.cash);assert.equal(back.day,h.day);assert.deepEqual(back.curationHistory,h.curationHistory);
 const chosen=sign(d);assert.deepEqual(chosen.collection.products,['samir','ines']);assert.equal(chosen.collection.price,90);assert.equal(chosen.collection.cost,50);assert.deepEqual(chosen.collection.seedCase,{referrerId:'samir',paymentDay:46});assert.equal(chosen.day,49);assert.equal(chosen.cash,15840);assert.deepEqual(chosen.contracts,h.contracts);assert.deepEqual(chosen.curationHistory,h.curationHistory);assert.deepEqual(normalizeDealRoom(chosen),chosen);
 assert.equal(reduce(chosen,{type:'SIGN_OWN_COLLECTION_FROM_CASE',referrerId:'mira',style:'cream'}),chosen);
});
test('changed goods reach a real buyer and later distinct sellable uses after earning the relevant relationships',()=>{
 const h=cases();let s=sign(a(h,'START_COLLECTION'));assert.equal(collectionQuote(s,'own','atelier').revenue,5100);
 s=a(a(a(a(s,'OPEN_COLLECTION_PITCH',{buyerId:'atelier'}),'SIGN_COLLECTION_PITCH',{optionId:'retain'}),'FULFIL_COLLECTION'),'CLOSE_COLLECTION');
 s=a(a(a(a(s,'OPEN_CASE_GROWTH',{referrerId:'samir'}),'SIGN_FIRST_CATALOGUE_ORDER',{referrerId:'samir',lampVersion:'standard'}),'FULFIL_CASE_GROWTH'),'CLOSE_CASE_GROWTH');
 s=a(a(a(a(s,'OPEN_CASE_GROWTH',{referrerId:'mira'}),'SIGN_CASE_GROWTH',{agreement:'private',products:['mira','samir'],packaging:'plain',terms:'delivery'}),'FULFIL_CASE_GROWTH'),'CLOSE_CASE_GROWTH');
 assert.equal(s.day,69);assert.equal(s.cash,22120);assert.equal(studioProjectEligibility(s,'independent').canOffer,true);assert.deepEqual(studioProjectEligibility(s,'independent').briefs,['hosting']);assert.equal(studioProjectEligibility(s,'group').canOffer,true);assert.deepEqual(studioProjectEligibility(s,'group').briefs,['welcome']);assert.deepEqual(s.curationHistory,h.curationHistory);
});
test('original and private defaults unchanged; historical source, exact model, and specific source selection are enforced',()=>{
 const d=a(cases(),'START_COLLECTION'),base=a(d,'SIGN_COLLECTION',{model:'own',style:'botanical'}),privateQ=collectionQuote(d,'private'),p=a(d,'SIGN_COLLECTION',{model:'private',style:'cream'});assert.deepEqual(base.collection.products,['mira','samir']);assert.equal(base.collection.seedCase,undefined);assert.equal(base.cash,15840);assert.deepEqual(p.collection.active,privateQ);assert.equal(p.collection.seedCase,undefined);assert.deepEqual(normalizeDealRoom(p),p);
 const n={type:'SIGN_OWN_COLLECTION_FROM_CASE',referrerId:'samir',style:'cream'};
 for(const x of [{...n,products:['mira','ines']},{...n,model:'private'},{...n,style:['cream']},{...n,referrerId:'ines'},{...n,referrerId:'mira'}])assert.equal(reduce(d,x),d);
 for(const change of [z=>z.curationHistory[1].status='production',z=>z.curationHistory[1].paymentDay=z.day+1,z=>z.curationHistory[1].lampVersion='fake',z=>z.curationHistory[1].products=['samir','other'],z=>z.cash=2489]){const bad=structuredClone(d);change(bad);assert.equal(reduce(bad,n),bad);}
 const rich=a(cases(true),'START_COLLECTION'),modern=sign(rich);assert.equal(modern.collection.lampVersion,'developed');assert.deepEqual(modern.collection.products,['mira','samir']);assert.equal(modern.collection.price,123);assert.equal(modern.collection.cost,71);assert.match(collectionView(rich,{model:'own',style:'cream',sourceId:'samir'}),/三档调光台灯、保温杯/);
});
test('the historically selected Northline stock remains the default when a store order came first; both alternate cases and private baseline stay independent',()=>{
 const h=cases();let s=a(a(a(a(h,'START_ACCOUNT',{referrerId:'samir'}),'SIGN_ACCOUNT',{optionId:'pilot'}),'FULFIL_ACCOUNT'),'CLOSE_ACCOUNT');
 s=a(s,'START_COLLECTION');assert.deepEqual(s.collection.products,['samir','ines']);assert.equal(collectionSeedChoices(s).find(x=>x.referrerId==='samir').current,true);const q=collectionQuote(s,'private');
 const own=a(s,'SIGN_OWN_COLLECTION_FROM_CASE',{referrerId:'mira',style:'botanical'});assert.deepEqual(own.collection.products,['mira','samir']);assert.deepEqual(own.accountHistory,s.accountHistory);assert.deepEqual(a(s,'SIGN_COLLECTION',{model:'private',style:'cream'}).collection.active,q);
});
test('bundled controls update real desk objects without writing the journal; private switch-back and the eventual sample sign use correct goods',async()=>{
 const d=a(cases(),'START_COLLECTION'),code=(await buildDealHtml()).match(/<script>([\s\S]*?)<\/script>/)[1],key='trade-tycoon:deal-room-offline:v1';
 for(const final of ['private','own']){
  let state=d,writes=0,buttons=new Map(),focused='';
  const root={html:'',set innerHTML(v){this.html=v;buttons=new Map();for(const m of v.matchAll(/<button[^>]*?\b(data-(?:collection-model|collection-source|action))="([^"]*)"[^>]*>/g)){const [,attr,val]=m;const obj={getAttribute:k=>k===attr?val:null,dataset:{[attr.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]:val},focus(){focused=attr+':'+val;},scrollIntoView(){}};buttons.set(attr+':'+val,obj);}},get innerHTML(){return this.html;},querySelector(sel){return sel==='#motion'?{}:null;},querySelectorAll(sel){const m=sel.match(/^\[(data-[\w-]+)\]$/);return m?[...buttons.entries()].filter(([k])=>k.startsWith(m[1]+':')).map(([,b])=>b):[];}};
  const context=vm.createContext({document:{querySelector:()=>root,documentElement:{classList:{contains:()=>false,add(){}}}},localStorage:{getItem:k=>k===key?JSON.stringify(state):null,setItem(k,v){if(k===key){writes++;state=JSON.parse(v);}}},structuredClone,TextEncoder,console});
  new vm.Script(code).runInContext(context,{timeout:3000});const initial=writes,click=k=>{const b=buttons.get(k);assert.equal(typeof b?.onclick,'function',k);b.onclick();};
  click('data-collection-model:own');click('data-collection-source:samir');assert.equal(focused,'data-collection-source:samir');assert.equal(writes,initial);const hero=root.html.match(/aria-label="产品样品">([\s\S]*?)<\/section>/)[1];assert.match(hero,/棉麻桌布/);assert.doesNotMatch(hero,/便携台灯/);
  assert.match(root.html,/第 46 天结清 · 40 套/);click('data-collection-source:');assert.match(root.html,/这次出样：便携台灯、保温杯/);click('data-collection-source:samir');
  if(final==='private'){click('data-collection-model:private');assert.doesNotMatch(root.html,/data-collection-source=/);}click('data-action:SIGN_COLLECTION');
  assert.equal(writes,initial+1);assert.deepEqual(state.collection.products,final==='private'?['mira','samir']:['samir','ines']);assert.equal(state.collection.model,final);assert.deepEqual(normalizeDealRoom(state),state);
 }
});
