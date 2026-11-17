import test from 'node:test';
import assert from 'node:assert/strict';
import {lifeRoomView,lifeRoomArt,bindLifeRoom} from '../src/deal-room-life-view.js';
const state={phase:'complete',cash:3960,contracts:[{status:'paid'}],personalLife:{purchases:['chair','coffee','record'].map(itemId=>({itemId})),positions:{chair:'window',coffee:'window',record:'window'},spent:3800}};
test('arrival is local, all objects can be directly used, book pages and coffee actually differ',()=>{
 const before=JSON.stringify(state);assert.match(lifeRoomView(state,{arrival:'chair'}),/阅读角安顿好了/);assert.match(lifeRoomArt(state),/data-life-room-use="chair"/);
 const page0=lifeRoomView(state,{using:'chair',page:0}),page1=lifeRoomView(state,{using:'chair',page:1});assert.notEqual(page0,page1);assert.match(page0,/慢下来的街道/);assert.match(page1,/靠窗的位置/);assert.match(lifeRoomView(state,{using:'chair',page:99}),/回家的路/);
 assert.match(lifeRoomView(state,{using:'coffee',coffee:'short'}),/小杯浓咖啡/);assert.match(lifeRoomView(state,{using:'coffee',coffee:'long'}),/长杯淡咖啡/);assert.equal(JSON.stringify(state),before);
});
test('music can accompany reading without masquerading as saved progression',()=>{const html=lifeRoomView(state,{using:'chair',soundOn:true});assert.match(html,/class="life-disc"/);assert.match(html,/给自己的三页故事/);assert.match(html,/data-life-mute/);assert.doesNotMatch(lifeRoomView(state),/data-life-mute/);});
test('audio starts only after explicit click and is closed on leaving; binding is otherwise silent',async()=>{
 let created=0,closed=0,notes=0;const handlers=new Map();let ui={using:'record'};
 const gain=()=>({gain:{value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}});
 class FakeAudio{constructor(){created++;this.currentTime=0;this.destination={};}async resume(){}createGain(){return gain();}createOscillator(){notes++;return {frequency:{value:0},connect(){},start(){},stop(){}};}async close(){closed++;}}
 const doc={defaultView:{AudioContext:FakeAudio},addEventListener(){},removeEventListener(){}};
 const root={ownerDocument:doc,querySelectorAll:()=>[],querySelector:s=>({addEventListener:(_,f)=>handlers.set(s,f)})};
 bindLifeRoom(root,{getState:()=>state,getUI:()=>ui,setUI:n=>{ui=n;},dispatch:()=>assert.fail('sound must not dispatch'),close:()=>{}});assert.equal(created,0);
 await handlers.get('[data-life-sound]')({currentTarget:{}});assert.equal(created,1);assert.equal(notes,16);assert.equal(ui.soundOn,true);
 handlers.get('[data-life-close]')();assert.equal(closed,1);
});
test('leaving while audio activation is pending prevents a late sound leak',async()=>{
 const handlers=new Map();let ui={using:'record'},release,closed=0,notes=0;
 class SlowAudio{constructor(){this.destination={};}resume(){return new Promise(r=>{release=r;});}async close(){closed++;}createGain(){notes++;throw Error('should not schedule after leaving');}}
 const root={ownerDocument:{defaultView:{AudioContext:SlowAudio},addEventListener(){},removeEventListener(){}},querySelectorAll:()=>[],querySelector:s=>({addEventListener:(_,f)=>handlers.set(s,f)})};
 bindLifeRoom(root,{getState:()=>state,getUI:()=>ui,setUI:n=>{ui=n;},dispatch(){},close:()=>{ui={};}});
 const pending=handlers.get('[data-life-sound]')({currentTarget:{}});handlers.get('[data-life-close]')();release();await pending;assert.equal(closed,1);assert.equal(notes,0);
});
