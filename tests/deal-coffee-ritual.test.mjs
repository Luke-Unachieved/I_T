import test from 'node:test';
import assert from 'node:assert/strict';
import {coffeeRitualView,nextCoffeeStage} from '../src/deal-room-life-view.js';
import {paintedLifeRoomArt} from '../src/deal-room-life-art.js';
test('opening coffee begins with beans and an empty cup, not a completed drink',()=>{
 const html=coffeeRitualView();assert.match(html,/coffee-beans/);assert.match(html,/咖啡豆与空杯/);assert.doesNotMatch(html,/life-coffee-pour|life-steam/);
});
test('grind, extract and drink are ordered steps and end without infinite rewards',()=>{
 assert.equal(nextCoffeeStage('beans'),'ground');assert.equal(nextCoffeeStage('ground'),'ready');assert.equal(nextCoffeeStage('ready'),'enjoyed');assert.equal(nextCoffeeStage('enjoyed'),null);assert.equal(nextCoffeeStage('invalid'),null);
 assert.match(coffeeRitualView({coffeeStage:'ground'}),/装好咖啡粉的手柄与空杯/);
 assert.match(coffeeRitualView({coffeeStage:'ready',coffee:'short'}),/小杯浓咖啡/);
 assert.match(coffeeRitualView({coffeeStage:'ready'}),/life-coffee-pour/);
 assert.doesNotMatch(coffeeRitualView({coffeeStage:'enjoyed'}),/data-life-coffee-step|life-coffee-pour/);
});
test('room steam follows actual ritual readiness and never an unowned machine',()=>{
 const state={personalLife:{purchases:[{itemId:'coffee'}]}};
 assert.doesNotMatch(paintedLifeRoomArt(state,{using:'coffee',coffeeStage:'beans'}),/life-steam/);
 assert.match(paintedLifeRoomArt(state,{using:'coffee',coffeeStage:'ready'}),/life-steam/);
 assert.doesNotMatch(paintedLifeRoomArt({}, {using:'coffee',coffeeStage:'ready'}),/life-steam/);
});
