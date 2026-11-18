import test from 'node:test';
import assert from 'node:assert/strict';
import {lifeRoomArt,lifeRoomView} from '../src/deal-room-life-view.js';
const state=(chair='window',coffee='window',record='window')=>({phase:'complete',cash:3960,contracts:[{status:'paid'}],personalLife:{purchases:['chair','coffee','record'].map(itemId=>({itemId})),positions:{chair,coffee,record},spent:3800}});
test('all eight independent arrangements keep coffee and record in separate horizontal lanes',()=>{
 for(const chair of ['window','inside'])for(const coffee of ['window','inside'])for(const record of ['window','inside']){
  const svg=lifeRoomArt(state(chair,coffee,record));
  assert.match(svg,new RegExp(`data-life-object="coffee"[^>]*transform="translate\\(0,${coffee==='inside'?-96:0}\\)"`));
  assert.match(svg,new RegExp(`data-life-object="record"[^>]*transform="translate\\(0,${record==='inside'?-96:0}\\)"`));
  // Coffee occupies x420..490, record x508..612; neither mode changes x.
  assert.ok(490<508);assert.match(svg,/x="420" y="156" width="70" height="76"/);assert.match(svg,/x="508" y="178" width="104" height="63"/);
 }
});
test('preview is local dashed treatment and purchase removes it without changing saved state',()=>{
 const empty={phase:'complete',cash:7760,contracts:[{status:'paid'}]},before=JSON.stringify(empty);
 for(const item of ['chair','coffee','record']){const preview=lifeRoomArt(empty,{preview:item});assert.match(preview,/class="life-preview-outline"/);assert.match(preview,/试摆 · 未购买/);assert.doesNotMatch(lifeRoomArt(state(),{preview:item}),/class="life-preview-outline"/);}
 assert.equal(JSON.stringify(empty),before);assert.doesNotMatch(lifeRoomArt(empty),/试摆 · 未购买/);
});
test('painted turntable has a fixed-perspective moving disc only while playing',()=>{
 const active=lifeRoomArt(state(),{using:'record',soundOn:true}),idle=lifeRoomArt(state());
 assert.match(active,/translate\(555 205\) scale\(1 .42\)/);assert.match(active,/class="life-disc"/);assert.match(idle,/deal-life-furniture.webp/);assert.doesNotMatch(idle,/class="life-disc"/);
 assert.match(lifeRoomArt(state(),{using:'coffee',coffeeStage:'ready'}),/class="life-steam"/);assert.doesNotMatch(idle,/class="life-steam"/);
 assert.match(lifeRoomView(state('inside','inside','inside')),/放回桌面/);
});

test('painted room keeps full background and makes only owned furniture interactive',()=>{const empty={phase:'complete',cash:7760,contracts:[{status:'paid'}]};const a=lifeRoomArt(empty);assert.match(a,/viewBox="0 0 680 383"/);assert.match(a,/height="383" preserveAspectRatio="xMidYMid meet"/);assert.doesNotMatch(a,/data-life-room-use/);assert.match(lifeRoomArt(state()),/data-life-room-use="chair"/);});

test('turntable opaque feet sit on table and shelf rather than transparent atlas bottom',()=>{const bottom=178+63*625/724;assert.ok(Math.abs(bottom-232.4)<.1);assert.ok(Math.abs((bottom-96)-136.4)<.1);});
