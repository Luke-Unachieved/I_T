import test from 'node:test';
import assert from 'node:assert/strict';
import {lifeRoomArt,lifeRoomView} from '../src/deal-room-life-view.js';
const state=(chair='window',coffee='window',record='window')=>({phase:'complete',cash:3960,contracts:[{status:'paid'}],personalLife:{purchases:['chair','coffee','record'].map(itemId=>({itemId})),positions:{chair,coffee,record},spent:3800}});
test('all eight independent arrangements keep coffee and record in separate horizontal lanes',()=>{
 for(const chair of ['window','inside'])for(const coffee of ['window','inside'])for(const record of ['window','inside']){
  const svg=lifeRoomArt(state(chair,coffee,record));
  assert.match(svg,new RegExp(`data-life-object="coffee"[^>]*transform="translate\\(0,${coffee==='inside'?-116:0}\\)"`));
  assert.match(svg,new RegExp(`data-life-object="record"[^>]*transform="translate\\(0,${record==='inside'?-116:0}\\)"`));
  // Coffee occupies x420..484, record x508..607; neither mode changes x.
  assert.ok(484<508);assert.match(svg,/M420 183h64v57h-64z/);assert.match(svg,/M508 210h99v30h-99z/);
 }
});
test('preview is local dashed treatment and purchase removes it without changing saved state',()=>{
 const empty={phase:'complete',cash:7760,contracts:[{status:'paid'}]},before=JSON.stringify(empty);
 for(const item of ['chair','coffee','record']){const preview=lifeRoomArt(empty,{preview:item});assert.match(preview,/class="life-preview-outline"/);assert.match(preview,/试摆 · 未购买/);assert.doesNotMatch(lifeRoomArt(state(),{preview:item}),/class="life-preview-outline"/);}
 assert.equal(JSON.stringify(empty),before);assert.doesNotMatch(lifeRoomArt(empty),/试摆 · 未购买/);
});
test('fixed perspective disc rotates local circle pattern and tonearm responds only to use',()=>{
 const active=lifeRoomArt(state(),{using:'record'}),idle=lifeRoomArt(state());
 assert.match(active,/translate\(555 212\) scale\(1 .382\)/);assert.match(active,/class="life-disc"/);assert.match(active,/M595 215v-12l-25 13/);assert.match(idle,/M595 215v-20h-9/);assert.doesNotMatch(idle,/class="life-disc"/);
 assert.match(lifeRoomArt(state(),{using:'coffee'}),/class="life-steam"/);assert.doesNotMatch(idle,/class="life-steam"/);
 assert.match(lifeRoomView(state('inside','inside','inside')),/放回桌面/);
});
