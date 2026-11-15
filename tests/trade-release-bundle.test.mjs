import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {createTradeGame} from '../src/trade-economy.js';
const path=new URL('../artifacts/data-v2/',import.meta.url),key='trade-tycoon:data:v2';
const html=await readFile(new URL('index.html',path),'utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
function launch(entries=[]){
 const storage=new Map(entries),elements=new Map();
 const node=id=>{if(!elements.has(id))elements.set(id,{innerHTML:'',addEventListener(){},classList:{add(){},remove(){}}});return elements.get(id);};
 const context=vm.createContext({document:{querySelector:node},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},window:{scrollTo(){}},setTimeout:()=>0,clearTimeout(){},console});
 vm.runInContext(scripts[0][1],context,{timeout:1000});return {storage,elements};
}
test('shipping HTML hash, byte size and dependency-free script match release manifest',async()=>{
 const manifest=JSON.parse(await readFile(new URL('release-manifest.json',path),'utf8'));
 assert.equal(scripts.length,1);assert.equal(manifest.bytes,Buffer.byteLength(html));assert.equal(manifest.sha256,createHash('sha256').update(html).digest('hex'));
 assert.doesNotMatch(html,/<script[^>]+src=|<link[^>]+rel="stylesheet"|<img[^>]+src="https?:/i);
 assert.doesNotMatch(scripts[0][1],/\bfetch\s*\(|\bXMLHttpRequest\b/);
});
test('actual compiled bundle boots a new game and never fabricates saved progress',()=>{
 const {storage,elements}=launch();assert.match(elements.get('#trade-app').innerHTML,/再开一单/);assert.equal(storage.has(key),false);
});
test('actual compiled bundle loads current save without overwriting bytes or legacy saves',()=>{
 const s=createTradeGame('公司<script>坏名字</script>'),raw=JSON.stringify(s);
 const {storage,elements}=launch([[key,raw],['trade-tycoon:v1','unchanged']]);
 assert.equal(storage.get(key),raw);assert.equal(storage.get('trade-tycoon:v1'),'unchanged');
 assert.match(elements.get('#trade-app').innerHTML,/公司&lt;script&gt;/);assert.doesNotMatch(elements.get('#trade-app').innerHTML,/<script>坏名字/);
});
test('actual compiled bundle leaves a corrupt save recoverable instead of replacing it',()=>{
 const raw='{broken';const {storage,elements}=launch([[key,raw]]);assert.equal(storage.get(key),raw);assert.match(elements.get('#trade-app').innerHTML,/存档/);
});
