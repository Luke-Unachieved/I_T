import test from 'node:test';
import assert from 'node:assert/strict';
import {createDealRoom,reduceDealRoom} from '../src/deal-room-engine.js';
import {encodeDealBackup,parseDealBackup} from '../src/deal-room-save.js';
import {previewOutingTrip,outingSummary} from '../src/deal-room-outings.js';
import {propertyHoldings} from '../src/deal-room-property.js';
import {workspaceWeather,workspaceHubView} from '../src/deal-room-workspace-hub.js';

const go=(s,type,fields={})=>{const n=reduceDealRoom(s,{type,...fields});assert.notEqual(n,s,type);return n;};
function done(){let s=createDealRoom();for(const optionId of ['trial','ready','small']){s=go(s,'PROPOSE',{optionId});s=go(s,'ADVANCE');s=go(s,'NEXT_CLIENT');}return s;}
test('property and outings enter the existing journal without changing prior state, purchase day or order history',()=>{
 const s=done(), snap=structuredClone(s);
 let n=go(s,'BUY_PROPERTY',{assetId:'car-hatch'});
 assert.deepEqual(s,snap);
 assert.equal(n.cash,s.cash-3800);assert.equal(n.day,s.day);
 assert.equal(propertyHoldings(n).active.car,'car-hatch');
 const trip=previewOutingTrip(n,{tripId:'paper-boat',companionId:null});
 assert.ok(trip.valid,trip.reason);
 n=go(n,trip.action.type,Object.fromEntries(Object.entries(trip.action).filter(([k])=>k!=='type')));
 assert.equal(n.phase,'outing-trip');assert.equal(reduceDealRoom(n,{type:'OPEN_MARKET'}),n);
 n=go(n,'INTERACT_OUTING_TRIP',{tripId:'paper-boat',sceneId:'fold',revision:outingSummary(n).revision});
 n=go(n,'RETURN_OUTING_TRIP',{tripId:'paper-boat',revision:outingSummary(n).revision});
 assert.equal(n.day,s.day);
 assert.deepEqual(n.contracts,s.contracts);
 assert.deepEqual(parseDealBackup(encodeDealBackup(n)).state,n);
});
test('after-work keeps distinct direct entrances and development opens customer opportunities',()=>{
 const s=done(),rest=workspaceHubView(s,'afterwork',true);
 assert.match(rest,/回家/);assert.match(rest,/房产/);assert.match(rest,/车行/);assert.match(rest,/旅行/);assert.match(rest,/约朋友/);
 assert.match(workspaceHubView(s,'development',true),/<details open><summary>客户机会/);
 assert.equal(workspaceWeather(60),workspaceWeather(60));
});

test('bedtime only advances once, lists an expiring inquiry and blocks active contracts',()=>{
 let s=done();
 const cash=s.cash,day=s.day;
 while(s.day%7!==0)s=go(s,'SLEEP_TO_NEXT_DAY',{checkedDay:s.day,acknowledgePending:true});
 const next={type:'SLEEP_TO_NEXT_DAY',checkedDay:s.day,acknowledgePending:true};
 const confirm=workspaceHubView(s,'afterwork',true,true);
 assert.match(confirm,/睡到明天/);assert.match(confirm,/询盘今天截止/);assert.match(confirm,/工作室开支 ¥30/);
 assert.equal(reduceDealRoom(s,{...next,acknowledgePending:false}),s);
 const n=go(s,'SLEEP_TO_NEXT_DAY',{checkedDay:s.day,acknowledgePending:true});
 assert.equal(n.day,s.day+1);assert.equal(n.cash,cash-30*(n.day-day));
 assert.equal(reduceDealRoom(n,next),n);
 assert.deepEqual(parseDealBackup(encodeDealBackup(n)).state,n);
 const active=go(createDealRoom(),'PROPOSE',{optionId:'trial'});
 assert.equal(reduceDealRoom(active,{type:next.type,checkedDay:active.day,acknowledgePending:true}),active);
});
