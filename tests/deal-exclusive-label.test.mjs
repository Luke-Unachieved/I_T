import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {collectionView} from '../src/deal-room-collection.js';
const collection=(model='own',exclusiveBuyer)=>({model,exclusiveBuyer,status:'complete',products:['mira','ines'],orders:[],sampleCost:100,price:100,cost:50});
test('completed exclusive heading names the actual buyer without relabeling private or reusable series',()=>{
 for(const buyer of ['atelier','northline']){const c=collection('own',buyer),html=collectionView({collection:c},{},{board:'<p>rights</p>'});assert.match(html,new RegExp(`<h3>${buyer==='atelier'?'Atelier':'Northline'} 独家系列已交付</h3>`));assert.doesNotMatch(html,/工作室的系列，留下来了/);}
 assert.match(collectionView({collection:collection()},{},{board:'<p>rights</p>'}),/<h3>工作室的系列，留下来了<\/h3>/);
 assert.match(collectionView({collection:collection('private')},{},{board:'<p>rights</p>'}),/<h3>Northline 的专用系列已交付<\/h3>/);
});
test('scene sign reflects completed exclusivity and preserves proposal previews',async()=>{
 const source=await readFile(new URL('../src/deal-room-app.js',import.meta.url),'utf8');
 const expression=source.match(/const collectionVisual=(.*);/)[1];const view=new Function('state','pitchVisual','collectionDraft','receipt','receiptMode',`return (${expression});`);
 const run=(c,p=null)=>view({phase:'collection',collection:c},p,{model:'own'},null,'delivered').buyer;
 assert.equal(run(collection('own','atelier')),'Atelier · 独家系列');assert.equal(run(collection('own','northline')),'Northline · 独家系列');assert.equal(run(collection()),'工作室 · 自有系列');assert.equal(run(collection('private')),'Northline · 专用系列');assert.equal(run(collection(),{scope:'whole-exclusive',buyer:'Atelier',sets:50}),'Atelier · 独家系列');
});
