import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {buildReworkHtml,portableManifest} from '../scripts/build-rework-standalone.mjs';
test('portable game embeds its assets, boots without network modules and keeps a separate save',async()=>{
 const html=await buildReworkHtml(),code=html.match(/<script>([\s\S]*)<\/script>/)[1];assert.doesNotMatch(code,/\bimport\s|\bfetch\s*\(/);assert.doesNotMatch(code,/\/assets\/rework-(harbor-painted|cargo-boat|warehouse-annex|express-dock)\.webp/);assert.match(code,/data:image\/webp;base64,/);assert.doesNotMatch(html,/<(?:script|link)[^>]+(?:src|href)=/);
 const events={},root={innerHTML:'',addEventListener:(type,fn)=>events[type]=fn},writes=new Map(),storage={getItem:()=>null,setItem:(k,v)=>writes.set(k,v)};
 vm.runInNewContext(code,{structuredClone,URLSearchParams,location:{search:''},localStorage:storage,sessionStorage:storage,document:{querySelector:()=>root},confirm:()=>true});assert.match(root.innerHTML,/仓库、货船与客户港口/);assert.match(root.innerHTML,/1,800/);
 events.click({target:{closest:()=>({dataset:{action:'PURCHASE',id:'quick'}})}});assert.match(root.innerHTML,/1,400/);assert.equal(writes.size,1);assert.ok(writes.has('trade-tycoon:standalone:v1'));
});

test('portable manifest identifies exact bytes without pretending release approval',async()=>{
 const html=await buildReworkHtml(),m=portableManifest(html);assert.equal(m.channel,'candidate');assert.equal(m.bytes,Buffer.byteLength(html));assert.match(m.sha256,/^[a-f0-9]{64}$/);assert.equal(m.buildId,m.sha256.slice(0,12));assert.deepEqual(m,portableManifest(html));assert.notEqual(m.sha256,portableManifest(html+' ').sha256);assert.equal(m.networkAssetsRequired,false);
});
