import {createDealRoom} from '../src/deal-room-engine.js';
import test from 'node:test';import assert from 'node:assert/strict';
import {homeLifeView,businessHomeView} from '../src/deal-room-home.js';
const state={phase:'complete',contracts:[{status:'paid',netProfit:100}],personalLife:{spent:2000,purchases:[{itemId:'chair'},{itemId:'coffee'}]},officeImprovement:{price:3600}};
test('life entry reflects bought items and actual spending, without inventing extra rewards',()=>{
 const before=JSON.stringify(state),html=homeLifeView(state);assert.match(html,/阅读角 · 自己的咖啡/);assert.match(html,/¥2,000/);assert.doesNotMatch(html,/周末唱片/);assert.match(html,/open-office-annex/);assert.equal(JSON.stringify(state),before);
});
test('unavailable life and unbought office do not claim ownership or unlock a room',()=>{
 assert.equal(homeLifeView({...state,phase:'negotiating'}),'');assert.equal(homeLifeView({...state,contracts:[]}), '');
 const html=homeLifeView({...state,officeImprovement:null,personalLife:null});assert.doesNotMatch(html,/open-office-annex|已经为家里添置/);assert.match(html,/去看看喜欢的物件/);
});
test('home exposes existing destinations once rather than adding a new economic action',()=>{
 const html=businessHomeView({...createDealRoom(),...state},{career:{eligible:false,reason:''},referrals:[]});
 for(const id of ['open-personal-life','open-office-improvement','open-office-annex'])assert.equal(html.split(`id="${id}"`).length-1,1);
 assert.ok(html.indexOf('class="home-life"')<html.indexOf('class="other-business"'));
});
