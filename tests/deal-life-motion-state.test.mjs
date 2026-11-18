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
