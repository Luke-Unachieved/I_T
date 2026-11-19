import vm from 'node:vm';
import test from 'node:test';import assert from 'node:assert/strict';import{readFile}from'node:fs/promises';import{isolateDealPreview}from'../scripts/isolate-deal-preview.mjs';
test('actual portable QA copy replaces both save constants and whitelist, never silently shares offline storage',async()=>{
 const source=await readFile('artifacts/deal-room/再开一单就下班-开发候选.html','utf8');const key='trade-tycoon:isolated-check:v1';
 const html=isolateDealPreview(source,key);assert.equal(html.split(key).length-1,3);assert.ok(source.includes('trade-tycoon:deal-room-offline:v1'));
 const reads=[], writes=[], values=new Map();
 const root={
  innerHTML:'',
  querySelector(selector){return selector==='#motion'?{}:null;},
  querySelectorAll(selector){
   if(selector!=='[data-adviser-choice]'||!this.innerHTML.includes('data-adviser-choice="fang"'))return [];
   return [{dataset:{adviserChoice:'fang'},addEventListener:(_,handler)=>{choose=handler;}}];
  }
 };
 let choose;
 const storage={getItem(k){reads.push(k);return values.get(k)??null;},setItem(k,v){writes.push(k);values.set(k,v);}};
 const context={localStorage:storage,document:{querySelector:()=>root,documentElement:{classList:{contains:()=>false}}},TextEncoder,structuredClone};
 new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]).runInNewContext(context,{timeout:3000});
 assert.equal(typeof choose,'function');
 choose();
 assert.ok(reads.every(k=>k===key||k.startsWith(key+':')));
 assert.deepEqual(writes,[key+':adviser']);
 assert.equal(values.get(key+':adviser'),'fang');
 const wrongWhitelist=source.replace("new Set([DEAL_SAVE_KEY,'trade-tycoon:deal-room-offline:v1'])","new Set([DEAL_SAVE_KEY]); void('trade-tycoon:deal-room-offline:v1')");
 assert.throws(()=>isolateDealPreview(wrongWhitelist,key),/isolation failed/);
 assert.throws(()=>isolateDealPreview(html,key),/Unexpected/);assert.throws(()=>isolateDealPreview(source,'trade-tycoon:deal-room:v1'),/distinct/);
});
