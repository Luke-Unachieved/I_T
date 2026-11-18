import test from 'node:test';
import assert from 'node:assert/strict';
import {paintedLifeRoomArt} from '../src/deal-room-life-art.js';
const owned={personalLife:{purchases:[{itemId:'record'}]}};
test('opening the record shelf does not imply audio playback',()=>{
 assert.doesNotMatch(paintedLifeRoomArt(owned,{using:'record',soundOn:false}),/class="life-disc"/);
});
test('actual playback shows the rotating record',()=>{
 assert.match(paintedLifeRoomArt(owned,{using:'records',soundOn:true}),/class="life-disc"/);
});
test('silent state removes the rotating record even while another ritual is open',()=>{
 assert.doesNotMatch(paintedLifeRoomArt(owned,{using:'coffee',soundOn:false}),/class="life-disc"/);
});
test('an unowned record player does not appear merely because sound is enabled',()=>{
 assert.doesNotMatch(paintedLifeRoomArt({}, {soundOn:true}),/class="life-disc"/);
});

test('purchase arrival unwraps owned furniture but never an unpaid preview',()=>{
 assert.match(paintedLifeRoomArt(owned,{arrival:'record'}),/class="life-unwrapping"/);
 assert.doesNotMatch(paintedLifeRoomArt({}, {preview:'record',arrival:'record'}),/class="life-unwrapping"/);
 assert.doesNotMatch(paintedLifeRoomArt(owned,{}),/class="life-unwrapping"/);
});

test('owned books and weekend records visibly occupy the home with direct use controls',()=>{
 const state={personalLife:{purchases:[{itemId:'books'},{itemId:'records'}]}};
 const html=paintedLifeRoomArt(state);
 for(const id of ['books','records']){
  assert.match(html,new RegExp(`data-life-accessory="${id}"`));
  assert.match(html,new RegExp(`data-life-room-use="${id}"`));
 }
});
test('accessory previews cannot be used before purchase and empty homes omit them',()=>{
 const html=paintedLifeRoomArt({}, {preview:'books'});
 assert.match(html,/data-life-accessory="books"/);
 assert.doesNotMatch(html,/data-life-room-use="books"/);
 assert.doesNotMatch(paintedLifeRoomArt({}),/data-life-accessory=/);
});
