import test from 'node:test';import assert from 'node:assert/strict';
import {bindLifeRoom} from '../src/deal-room-life-view.js';
function harness(initial={using:'chair',page:0}){
 let ui=initial,nodes=[],scrolls=0;
 const doc={activeElement:null,addEventListener(){},removeEventListener(){},defaultView:{}};
 function node(attrs={},disabled=false){return {attrs,disabled,dataset:Object.fromEntries(Object.entries(attrs).map(([k,v])=>[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase()),v])),hasAttribute:a=>Object.hasOwn(attrs,a),getAttribute:a=>attrs[a],addEventListener(type,fn){this['on'+type]=fn;},focus(options){assert.deepEqual(options,{preventScroll:true});doc.activeElement=this;},scrollIntoView(){scrolls++;}};}
 const root={ownerDocument:doc,querySelectorAll(sel){const a=sel.slice(1,-1);return nodes.filter(n=>n.hasAttribute(a));},querySelector(sel){return sel==='.life-ritual'?nodes[0]:this.querySelectorAll(sel)[0]||null;}};
 const draw=()=>{
  doc.activeElement={tagName:'BODY'};
  nodes=[node({'ritual':''}),node({'data-life-page-step':'previous','data-life-page':String((ui.page||0)-1)},!ui.page),node({'data-life-page-step':'next','data-life-page':String((ui.page||0)+1)},ui.page===2),node({'data-life-coffee':'short'}),node({'data-life-coffee':'long'}),node({'data-life-use':'chair'}),node({'data-life-use':'chair'}),node({'data-life-sound':''}),node({'data-life-close':''})];
  bindLifeRoom(root,{getState:()=>({}),getUI:()=>ui,setUI:next=>{ui=next;draw();},dispatch(){},close(){}});
 };
 draw();
 return {doc,root,ui:()=>ui,nodes:()=>nodes,scrolls:()=>scrolls,click(n){doc.activeElement=n;return n.onclick({currentTarget:n});}};
}
test('page focus follows semantic next/previous, boundary falls back to reading section without scrolling',()=>{
 const h=harness();h.click(h.nodes()[2]);assert.equal(h.ui().page,1);assert.equal(h.doc.activeElement,h.nodes()[2]);
 h.click(h.nodes()[2]);assert.equal(h.ui().page,2);assert.equal(h.doc.activeElement,h.nodes()[0]);
 h.click(h.nodes()[1]);assert.equal(h.ui().page,1);assert.equal(h.doc.activeElement,h.nodes()[1]);assert.equal(h.scrolls(),0);
});
test('coffee choices preserve focus and repeated matching controls retain their own position',()=>{
 const h=harness({using:'coffee'});h.click(h.nodes()[3]);assert.equal(h.ui().coffee,'short');assert.equal(h.doc.activeElement,h.nodes()[3]);
 h.click(h.nodes()[4]);assert.equal(h.ui().coffee,'long');assert.equal(h.doc.activeElement,h.nodes()[4]);
 // Toggle off chair so the intentional opening ritual focus does not apply.
 const c=harness({using:'chair'});c.click(c.nodes()[6]);assert.equal(c.doc.activeElement,c.nodes()[6]);assert.equal(c.scrolls(),0);
});
test('async unavailable audio result preserves focus moved after click, not the old sound button',async()=>{
 const h=harness({using:'record'});const pending=h.click(h.nodes()[7]);h.doc.activeElement=h.nodes()[8];await pending;
 assert.equal(h.ui().soundError,true);assert.equal(h.doc.activeElement,h.nodes()[8]);assert.equal(h.scrolls(),0);
});
