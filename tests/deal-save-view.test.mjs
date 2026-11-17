import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {createDealRoom,reduceDealRoom} from '../src/deal-room-engine.js';
import {DEAL_SAVE_KEY,encodeDealBackup} from '../src/deal-room-save.js';
import {dealSaveView,bindDealSaveTools} from '../src/deal-room-save-view.js';
import {buildDealHtml} from '../scripts/build-deal-standalone.mjs';
function harness(raw=JSON.stringify(createDealRoom())){
 const panel={open:true,text:'',preview:null,message:''},map=new Map([[DEAL_SAVE_KEY,raw]]),nodes=new Map(),downloads=[];let restored=null;
 const storage={getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,v)};
 const root={querySelector:k=>{if(!nodes.has(k))nodes.set(k,{});return nodes.get(k);}};
 const render=()=>bindDealSaveTools(root,{panel,storage,getState:createDealRoom,render,onRestored:s=>{restored=s;},download:(...a)=>downloads.push(a)});render();
 return {panel,map,storage,downloads,restored:()=>restored,click:id=>nodes.get(id).onclick(),input:text=>{nodes.get('#deal-save-text').value=text;nodes.get('#deal-save-text').oninput();}};
}
const progressed=()=>reduceDealRoom(createDealRoom(),{type:'PROPOSE',optionId:'trial'});
test('paste preview is read-only; explicit confirm restores verified state after preserving old raw',()=>{
 const h=harness(),original=h.map.get(DEAL_SAVE_KEY),next=progressed();h.input(encodeDealBackup(next));h.click('#deal-save-preview');assert.equal(h.map.get(DEAL_SAVE_KEY),original);assert.equal(h.restored(),null);assert.equal(h.panel.preview.summary.cash,next.cash);h.click('#deal-save-confirm');assert.deepEqual(h.restored(),next);assert.equal(h.map.get(DEAL_SAVE_KEY+':before-restore'),original);
});
test('cancel, malformed text and edits after preview never restore',()=>{
 const h=harness(),raw=h.map.get(DEAL_SAVE_KEY);h.input(encodeDealBackup(progressed()));h.click('#deal-save-preview');h.click('#deal-save-cancel');assert.equal(h.restored(),null);h.click('#deal-save-preview');h.input('broken');h.click('#deal-save-confirm');assert.equal(h.map.get(DEAL_SAVE_KEY),raw);assert.equal(h.restored(),null);h.click('#deal-save-preview');assert.equal(h.panel.preview,null);assert.match(h.panel.message,/不是有效备份/);assert.doesNotMatch(h.panel.message,/Unexpected|SyntaxError|not valid JSON/);
});
test('changed save and write denial do not cause success callback',()=>{
 const h=harness();h.input(encodeDealBackup(progressed()));h.click('#deal-save-preview');h.map.set(DEAL_SAVE_KEY,'new raw');h.click('#deal-save-confirm');assert.equal(h.restored(),null);assert.match(h.panel.message,/变化/);
 h.click('#deal-save-preview');h.storage.setItem=()=>{throw new Error('quota');};h.click('#deal-save-confirm');assert.equal(h.restored(),null);assert.equal(h.map.get(DEAL_SAVE_KEY),'new raw');
});
test('raw corrupt export preserves exact bytes and valid export carries modern envelope',()=>{
 const h=harness(' broken\n');h.click('#deal-save-raw');assert.equal(h.downloads[0][0],' broken\n');assert.match(h.downloads[0][1],/\.txt$/);h.click('#deal-save-download');assert.equal(JSON.parse(h.downloads[1][0]).type,'deal-room');assert.equal(h.map.get(DEAL_SAVE_KEY),' broken\n');
});
test('footer is escaped, collapsed by default and contains no file picker or upload',()=>{
 const html=dealSaveView({text:'</textarea><script>x</script>',message:'<bad>'});assert.doesNotMatch(html,/<details[^>]+open/);assert.match(html,/&lt;\/textarea&gt;/);assert.doesNotMatch(html,/<input|type="file"|<script>/);assert.match(html,/先查看恢复内容/);
});
test('standalone contains scoped save tools and valid script with offline-only key',async()=>{
 const html=await buildDealHtml(),script=html.match(/<script>([\s\S]*)<\/script>/)[1];assert.doesNotThrow(()=>new vm.Script(script));assert.match(script,/trade-tycoon:deal-room-offline:v1/);assert.doesNotMatch(script,/trade-tycoon:deal-room:v1/);assert.match(script,/bindDealSaveTools\(root/);
 const app=await readFile(new URL('../src/deal-room-app.js',import.meta.url),'utf8');assert.match(app,/saveDealProgress\(dealStorage,state/);assert.match(app,/location.reload\(\)/);
});

test('copy retrieval exports valid envelopes or exact invalid text without replacing or deleting anything',()=>{
 const h=harness(),before=JSON.stringify(progressed()),bad='broken copy\n';h.map.set(DEAL_SAVE_KEY+':before-restore',before);h.map.set(DEAL_SAVE_KEY+':unreadable-backup',bad);const snapshot=[...h.map.entries()];
 h.click('#deal-save-before');assert.equal(JSON.parse(h.downloads[0][0]).type,'deal-room');assert.deepEqual(JSON.parse(h.downloads[0][0]).state,progressed());assert.match(h.downloads[0][1],/可恢复.json$/);assert.match(h.panel.message,/已发起/);
 h.click('#deal-save-unreadable');assert.equal(h.downloads[1][0],bad);assert.match(h.downloads[1][1],/原文.txt$/);assert.match(h.panel.message,/不是可直接恢复/);assert.deepEqual([...h.map.entries()],snapshot);assert.equal(h.restored(),null);
});
test('missing retained copy is explicit and produces no download',()=>{
 const h=harness();h.click('#deal-save-before');assert.match(h.panel.message,/没有保留这份恢复前进度/);h.click('#deal-save-unreadable');assert.match(h.panel.message,/没有保留这份异常进度原件/);assert.equal(h.downloads.length,0);
});
