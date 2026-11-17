import test from 'node:test';import assert from 'node:assert/strict';
import {sampleSvg} from '../src/deal-room-samples.js';
test('product atlas crop overrides descendant SVG overflow and dimensions',()=>{
 for(const kind of ['lamp','cup','linen'])for(const custom of [false,true]){
  const html=sampleSvg(kind,custom);
  assert.match(html,/class="sample-crop"[^>]+style="overflow:hidden;width:200px;height:190px"/);
  assert.match(html,new RegExp(`x="${kind==='lamp'?0:kind==='cup'?-200:-400}" y="0" width="600"`));
 }
});
