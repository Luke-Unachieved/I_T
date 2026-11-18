import test from 'node:test';
import assert from 'node:assert/strict';
import {createDealRoom,reduceDealRoom,normalizeDealRoom} from '../src/deal-room-engine.js';
import {LIFE_ITEMS,canonicalLifeAction,lifePurchasePreview,applyLifeAction} from '../src/deal-room-life.js';
import {lifeRoomView} from '../src/deal-room-life-view.js';
const ready=()=>({ ...createDealRoom(),phase:'review',contracts:[{status:'paid'}] });
test('legacy fresh save is untouched and still canonical',()=>{const s=createDealRoom();assert.equal(applyLifeAction(s,{type:'BUY_LIFE_ITEM',itemId:'chair'}),s);assert.deepEqual(normalizeDealRoom(s),s);assert.equal('personalLife' in s,false);});
test('buy subtracts cash once and changes nothing in business or time',()=>{const s=ready(),before=structuredClone(s),a={type:'BUY_LIFE_ITEM',itemId:'chair'},n=applyLifeAction(s,a);assert.deepEqual(s,before);assert.equal(n.cash,4200);assert.equal(n.day,s.day);assert.deepEqual(n.contracts,s.contracts);assert.deepEqual(n.history,s.history);assert.equal(n.personalLife.spent,800);assert.equal(applyLifeAction(n,a),n);});
test('prices cannot be supplied or tampered and purchase is atomic',()=>{const s=ready();for(const a of [{type:'BUY_LIFE_ITEM',itemId:'chair',price:0},{type:'BUY_LIFE_ITEM',itemId:'__proto__'},{type:'ARRANGE_LIFE_ITEM',itemId:'chair',position:'anywhere'}])assert.equal(canonicalLifeAction(a),null);for(const cash of [799,-1,NaN,Infinity,3.5]){const r={...s,cash};assert.equal(applyLifeAction(r,{type:'BUY_LIFE_ITEM',itemId:'chair'}),r);}assert.equal(applyLifeAction({...s,cash:800},{type:'BUY_LIFE_ITEM',itemId:'chair'}).cash,0);});
test('arranging only owned objects costs nothing and repeats are noop',()=>{let s=ready();assert.equal(applyLifeAction(s,{type:'ARRANGE_LIFE_ITEM',itemId:'chair',position:'inside'}),s);s=applyLifeAction(s,{type:'BUY_LIFE_ITEM',itemId:'chair'});const n=applyLifeAction(s,{type:'ARRANGE_LIFE_ITEM',itemId:'chair',position:'inside'});assert.equal(n.cash,s.cash);assert.equal(n.personalLife.positions.chair,'inside');assert.equal(applyLifeAction(n,{type:'ARRANGE_LIFE_ITEM',itemId:'chair',position:'inside'}),n);});
test('preview and cancel do not mutate money/state, owned objects and interactions visibly differ',()=>{let s={...ready(),cash:8000},before=JSON.stringify(s);const basic=lifeRoomView(s);assert.match(lifeRoomView(s,{preview:'coffee'}),/试摆：家用咖啡机/);assert.equal(JSON.stringify(s),before);for(const i of LIFE_ITEMS)s=applyLifeAction(s,{type:'BUY_LIFE_ITEM',itemId:i.id});assert.equal(s.cash,1740);assert.equal(s.personalLife.spent,6260);assert.notEqual(basic,lifeRoomView(s));assert.match(lifeRoomView(s,{using:'coffee',coffeeStage:'ready'}),/class="life-steam"/);assert.match(lifeRoomView(s,{using:'record',soundOn:true}),/class="life-disc"/);assert.equal(lifePurchasePreview(s,'record').owned,true);});
test('standalone integration recipe supports real earned-game replay without changing old journal',()=>{let old=createDealRoom();for(const optionId of ['trial','ready','small']){old=reduceDealRoom(old,{type:'PROPOSE',optionId});old=reduceDealRoom(old,{type:'ADVANCE'});old=reduceDealRoom(old,{type:'NEXT_CLIENT'});}assert.equal(old.phase,'complete');assert.deepEqual(normalizeDealRoom(old),old);const a={type:'BUY_LIFE_ITEM',itemId:'chair'};const next=applyLifeAction(old,a);assert.equal(next.cash,old.cash-800);assert.deepEqual(normalizeDealRoom(old),old);});

test('integrated journal survives canonical replay, export/import and autosave',async()=>{
 const {encodeDealBackup,parseDealBackup,saveDealProgress,loadDealSave}=await import('../src/deal-room-save.js');
 let s=createDealRoom();for(const optionId of ['trial','ready','small'])for(const a of [{type:'PROPOSE',optionId},{type:'ADVANCE'},{type:'NEXT_CLIENT'}])s=reduceDealRoom(s,a);
 const legacy=structuredClone(s),business=structuredClone(s.contracts),startCash=s.cash;
 for(const itemId of ['chair','coffee','record']){s=reduceDealRoom(s,{type:'BUY_LIFE_ITEM',itemId});s=reduceDealRoom(s,{type:'ARRANGE_LIFE_ITEM',itemId,position:'inside'});}
 assert.equal(s.history.length,legacy.history.length+6);assert.equal(s.cash,startCash-3800);assert.equal(s.day,legacy.day);assert.deepEqual(s.contracts,business);assert.deepEqual(normalizeDealRoom(s),s);assert.deepEqual(normalizeDealRoom(legacy),legacy);assert.deepEqual(parseDealBackup(encodeDealBackup(s)).state,s);
 const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};assert.equal(saveDealProgress(storage,s).ok,true);assert.deepEqual(loadDealSave(storage).state,s);
 assert.equal(reduceDealRoom(s,{type:'BUY_LIFE_ITEM',itemId:'chair'}),s);
 const modified=structuredClone(s);modified.personalLife.spent=0;assert.throws(()=>normalizeDealRoom(modified));
 const invented=structuredClone(s);invented.history.at(-2).price=0;assert.throws(()=>normalizeDealRoom(invented));
});
test('modern bundle includes life reducer before engine and no module imports',async()=>{
 const {buildDealHtml}=await import('../scripts/build-deal-standalone.mjs');const vm=await import('node:vm');const html=await buildDealHtml();const js=html.match(/<script>([\s\S]*)<\/script>/)[1];assert.doesNotThrow(()=>new vm.Script(js));assert.match(html,/open-personal-life/);assert.match(html,/life-panel/);assert.ok(js.indexOf('const {LIFE_ACTION_KEYS')<js.indexOf('function createDealRoom'));
});

test('pre-update chair snapshot and brief v18 wording both load without loosening accounts',async()=>{
 const {parseDealBackup,loadDealSave}=await import('../src/deal-room-save.js');
 let s=createDealRoom();for(const optionId of ['trial','ready','season'])for(const a of [{type:'PROPOSE',optionId},{type:'ADVANCE'},{type:'NEXT_CLIENT'}])s=reduceDealRoom(s,a);
 s=reduceDealRoom(s,{type:'BUY_LIFE_ITEM',itemId:'chair'});
 assert.equal(s.day,17);assert.equal(s.cash,7720);
 const prior=structuredClone(s);prior.feedback={kind:'personal-life',message:'靠窗的阅读椅送到了家里。花了 ¥800，这是个人消费，不会提高订单收益。'};
 assert.deepEqual(normalizeDealRoom(prior),s);
 const v18=structuredClone(prior);v18.feedback.message='靠窗的阅读椅送到了家里。花了 ¥800，给自己的下班时间添了一件喜欢的东西。';
 for(const snapshot of [prior,v18]){
  const text=JSON.stringify(snapshot);const storage={getItem:()=>text};assert.deepEqual(loadDealSave(storage).state,s);assert.equal(storage.getItem(),text);
  assert.deepEqual(parseDealBackup(JSON.stringify({type:'deal-room',version:1,state:snapshot})).state,s);
  const tamper=structuredClone(snapshot);tamper.cash++;assert.throws(()=>normalizeDealRoom(tamper));
 }
 const arbitrary=structuredClone(v18);arbitrary.feedback.message='invented';assert.throws(()=>normalizeDealRoom(arbitrary));
});
