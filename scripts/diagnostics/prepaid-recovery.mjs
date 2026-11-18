// Canonical earned state, no injected money/dates/history. Its full immutable
// pre-candidate evidence is docs/rework/CONSUMPTION_DEADLOCK_20261118.json.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {createDealRoom,reduceDealRoom,normalizeDealRoom,businessOpportunities} from '../../src/deal-room-engine.js';
const fixture=JSON.parse(fs.readFileSync(new URL('../../tests/fixtures/consumption-liquidity-190.json',import.meta.url)));
let s=createDealRoom();const trace=[];function act(action){const n=reduceDealRoom(s,action);assert.notEqual(n,s);s=n;trace.push({action,day:s.day,cash:s.cash});}
for(const action of fixture.history)act(action);assert.deepEqual(s,fixture);assert.deepEqual(normalizeDealRoom(s),s);
const before={day:s.day,cash:s.cash};act({type:'CONTINUE_BUSINESS'});
for(let i=0;i<2;i++){act({type:'SELECT_CLIENT',clientId:'ines'});act({type:'PROPOSE',optionId:'repeat-prepaid'});act({type:'ADVANCE'});act({type:'NEXT_CLIENT'});}
assert.equal(s.cash,2010);assert.deepEqual(normalizeDealRoom(s),s);
const ordinary=businessOpportunities(s).flatMap(c=>c.options.filter(q=>q.id==='repeat-small'&&q.valid).map(q=>({client:c.id,option:q.id,required:q.cashRequired})));
assert(ordinary.length);console.log(JSON.stringify({before,after:{day:s.day,cash:s.cash},ordinary,trace},null,2));
