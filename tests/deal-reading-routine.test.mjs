import test from 'node:test';import assert from 'node:assert/strict';
import {readingCompanionsView,lifeRoomView,bindLifeRoom} from '../src/deal-room-life-view.js';
const state={phase:'complete',cash:2000,contracts:[{status:'paid'}],personalLife:{purchases:['chair','coffee','books','record'].map(itemId=>({itemId})),positions:{},readingPage:2,spent:4060}};
test('reading combines only actually owned and used possessions',()=>{
 assert.equal(readingCompanionsView({}, {coffeeStage:'enjoyed',soundOn:true}),'');
 const plain=readingCompanionsView(state,{using:'books'});assert.match(plain,/data-life-reading-coffee/);assert.doesNotMatch(plain,/书旁|唱片还在/);
 const enjoyed=readingCompanionsView(state,{using:'books',coffeeStage:'enjoyed',soundOn:true});assert.match(enjoyed,/书旁/);assert.match(enjoyed,/唱片还在/);assert.doesNotMatch(enjoyed,/data-life-reading-coffee/);
});
test('both reading choices offer the routine and retain their actual page',()=>{
 assert.match(lifeRoomView(state,{using:'chair',page:1}),/给这一页配杯咖啡/);
 const html=lifeRoomView(state,{using:'books',coffeeStage:'enjoyed'});assert.match(html,/三 · 绕远一点/);assert.match(html,/书翻到这里/);
});
function harness(initial,game=state){
 let ui=initial;const handlers=new Map();const control={addEventListener(type,fn){},focus(){},scrollIntoView(){}};
 const root={ownerDocument:{activeElement:null,defaultView:{},addEventListener(){},removeEventListener(){}},querySelectorAll:()=>[],querySelector:selector=>({...control,addEventListener:(_,fn)=>handlers.set(selector,fn)})};
 bindLifeRoom(root,{getState:()=>game,getUI:()=>ui,setUI:next=>{ui=next;},dispatch:()=>assert.fail('routine must not charge, save or advance time'),close(){}});
 return {get:()=>ui,set:next=>{ui=next;},click:selector=>handlers.get(selector)()};
}
test('making a coffee returns to the chosen book without changing page, music or game state',()=>{
 const before=JSON.stringify(state),h=harness({using:'books',page:1,soundOn:true});h.click('[data-life-reading-coffee]');assert.equal(h.get().using,'coffee');assert.equal(h.get().coffeeReturn,'books');
 h.click('[data-life-reading-return]');assert.equal(h.get().using,'coffee');
 h.set({...h.get(),coffeeStage:'enjoyed'});h.click('[data-life-reading-return]');assert.equal(h.get().using,'books');assert.equal(h.get().page,1);assert.equal(h.get().soundOn,true);assert.equal(h.get().coffeeReturn,'');assert.equal(JSON.stringify(state),before);
});
test('unowned coffee and stale return actions cannot create a routine',()=>{
 const h=harness({using:'chair'},{personalLife:{purchases:[{itemId:'chair'}]}});h.click('[data-life-reading-coffee]');assert.equal(h.get().using,'chair');
 h.set({using:'record',coffeeReturn:'chair',coffeeStage:'enjoyed'});h.click('[data-life-reading-return]');assert.equal(h.get().using,'record');
});
