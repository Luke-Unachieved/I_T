import test from 'node:test';import assert from 'node:assert/strict';
import {createDealRoom,reduceDealRoom,normalizeDealRoom} from '../src/deal-room-engine.js';
import {lifePurchasePreview,canonicalLifeAction} from '../src/deal-room-life.js';
import {lifeRoomView,bindLifeRoom} from '../src/deal-room-life-view.js';
import {encodeDealBackup,parseDealBackup} from '../src/deal-room-save.js';
const act=(s,type,x={})=>reduceDealRoom(s,{type,...x});
function earned(){let s=createDealRoom();for(const optionId of ['trial','ready','season'])for(const a of [{type:'PROPOSE',optionId},{type:'ADVANCE'},{type:'NEXT_CLIENT'}])s=reduceDealRoom(s,a);return s;}
const buy=(s,itemId)=>act(s,'BUY_LIFE_ITEM',{itemId});
test('optional record upgrade requires player, spends 2200 exactly once, no date or business buffs',()=>{
 let s=earned();assert.equal(lifePurchasePreview(s,'records').valid,false);assert.equal(buy(s,'records'),s);s=buy(s,'record');const old=structuredClone(s),next=buy(s,'records');assert.equal(next.cash,s.cash-2200);assert.equal(next.personalLife.spent,s.personalLife.spent+2200);assert.equal(next.day,s.day);assert.deepEqual(next.contracts,s.contracts);assert.deepEqual(s,old);assert.equal(buy(next,'records'),next);assert.equal(lifePurchasePreview({...s,cash:2199},'records').valid,false);
 assert.match(lifeRoomView(s,{preview:'records'}),/¥2,200/);assert.match(lifeRoomView(s,{preview:'records'}),new RegExp('买完还剩 ¥'+(s.cash-2200).toLocaleString('zh-CN')));assert.deepEqual(s,old);
});
test('selected record persists canonically without touching old purchase feedback or money',()=>{
 const old=buy(earned(),'record');let s=buy(old,'records'),cash=s.cash,day=s.day;s=act(s,'SELECT_LIFE_RECORD',{itemId:'records',track:'dance'});assert.equal(s.personalLife.recordTrack,'dance');assert.equal(s.cash,cash);assert.equal(s.day,day);assert.deepEqual(normalizeDealRoom(old),old);assert.deepEqual(parseDealBackup(encodeDealBackup(s)).state,s);assert.deepEqual(normalizeDealRoom(s),s);assert.match(lifeRoomView(s,{using:'record'}),/data-life-track="dance" aria-pressed="true"/);assert.equal(act(s,'SELECT_LIFE_RECORD',{itemId:'records',track:'dance'}),s);
 for(const a of [{type:'SELECT_LIFE_RECORD',itemId:'record',track:'dance'},{type:'SELECT_LIFE_RECORD',itemId:'records',track:'fake'},{type:'SELECT_LIFE_RECORD',itemId:'records',track:'rain',price:0}])assert.equal(canonicalLifeAction(a),null);
 assert.equal(act(old,'SELECT_LIFE_RECORD',{itemId:'records',track:'rain'}),old);const tampered=structuredClone(s);tampered.personalLife.recordTrack='rain';assert.throws(()=>normalizeDealRoom(tampered));
});
function audioHarness(initial,initialUI={using:'records'}){
 let s=initial,ui=initialUI,created=0,closed=0,focused='';const notes=[],handlers=new Map();
 const gain=()=>({gain:{value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}});
 class Audio{constructor(){created++;this.currentTime=0;this.destination={};}async resume(){}createGain(){return gain();}createOscillator(){const note={frequency:{value:0},connect(){},start(time){notes.push({frequency:this.frequency.value,type:this.type,time});},stop(){}};return note;}async close(){closed++;}}
 const doc={defaultView:{AudioContext:Audio},addEventListener(type,fn){handlers.set(type,fn);},removeEventListener(){},activeElement:null};
 const tracks=['evening','rain','dance'].map(track=>({dataset:{lifeTrack:track},focus(){focused=track;}}));
 const root={ownerDocument:doc,querySelectorAll(sel){return sel==='[data-life-track]'?tracks:[];},querySelector(sel){return tracks.find(e=>sel===`[data-life-track="${e.dataset.lifeTrack}"]`)||{addEventListener(type,fn){handlers.set(sel,fn);}};}};
 const draw=()=>bindLifeRoom(root,{getState:()=>s,getUI:()=>ui,setUI:n=>{ui=n;},dispatch:a=>{s=reduceDealRoom(s,a);draw();},close:()=>{ui={};}});draw();
 return {notes,handlers,tracks,doc,state:()=>s,ui:()=>ui,created:()=>created,closed:()=>closed,focused:()=>focused,clickSound:()=>handlers.get('[data-life-sound]')({currentTarget:{}})};
}
test('two purchased sides produce genuinely different notes, tempos and timbres; choosing a record is silent and focused',async()=>{
 const h=audioHarness(buy(buy(earned(),'record'),'records'));assert.equal(h.created(),0);
 h.tracks[1].onclick();assert.equal(h.created(),0);assert.equal(h.focused(),'rain');await h.clickSound();const rain=[...h.notes];assert.equal(rain.length,24);assert.equal(rain[1].time,.9);
 h.tracks[2].onclick();assert.equal(h.closed(),1);assert.equal(h.ui().soundOn,false);assert.equal(h.focused(),'dance');h.notes.length=0;await h.clickSound();assert.equal(h.notes.length,32);assert.equal(h.notes[1].time,.38);assert.notDeepEqual(h.notes.map(n=>n.frequency),rain.map(n=>n.frequency));assert.notEqual(h.notes[0].type,rain[0].type);h.handlers.get('[data-life-close]')();assert.equal(h.closed(),2);
});
test('preview only plays six notes after click, expires quietly, and cancel closes without spending',async t=>{
 const timers=[];t.mock.method(globalThis,'setTimeout',(fn,delay)=>{timers.push({fn,delay});return timers.length;});t.mock.method(globalThis,'clearTimeout',()=>{});
 const original=buy(earned(),'record'),h=audioHarness(original,{preview:'records'});assert.equal(h.created(),0);await h.clickSound();assert.equal(h.notes.length,6);assert.deepEqual(h.state(),original);timers.at(-1).fn();assert.equal(h.closed(),1);assert.equal(h.ui().soundOn,false);assert.equal(timers.length,1);
 await h.clickSound();h.handlers.get('[data-life-cancel]')();assert.equal(h.closed(),2);assert.equal(h.ui().preview,'');assert.equal(h.ui().soundOn,false);assert.deepEqual(h.state(),original);
});
test('hidden page stops owned music and no audio is started by rendering or importing',async()=>{
 const s=buy(buy(earned(),'record'),'records'),h=audioHarness(parseDealBackup(encodeDealBackup(s)).state);lifeRoomView(s,{using:'records'});assert.equal(h.created(),0);await h.clickSound();h.doc.hidden=true;h.handlers.get('visibilitychange')();assert.equal(h.closed(),1);assert.equal(h.ui().soundOn,false);
});
