import test from 'node:test';import assert from 'node:assert/strict';import{readFile}from'node:fs/promises';import{isolateDealPreview}from'../scripts/isolate-deal-preview.mjs';
test('actual portable QA copy replaces both save constants and whitelist, never silently shares offline storage',async()=>{
 const source=await readFile('artifacts/deal-room/再开一单就下班-开发候选.html','utf8');const key='trade-tycoon:isolated-check:v1';
 const html=isolateDealPreview(source,key);assert.equal(html.split(key).length-1,3);assert.ok(source.includes('trade-tycoon:deal-room-offline:v1'));
 assert.throws(()=>isolateDealPreview(html,key),/Unexpected/);assert.throws(()=>isolateDealPreview(source,'trade-tycoon:deal-room:v1'),/distinct/);
});
