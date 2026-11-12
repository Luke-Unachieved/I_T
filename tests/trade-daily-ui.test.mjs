import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../src/trade-app.js',import.meta.url),'utf8');
// Source contracts, not browser layout or end-to-end tests.
test('daily controls use explicit day reducer actions and retain current day',()=>{
 assert.match(source,/下一天 →/);assert.match(source,/快进 3 天/);assert.match(source,/快进 7 天/);
 assert.match(source,/apply\(\{type:'NEXT_DAY'\}\)/);
 assert.match(source,/type:'ADVANCE_DAYS',days:Number\(el.dataset.days\)/);
 assert.doesNotMatch(source,/type:'NEXT_WEEK'/);
 assert.match(source,/state\.day\+3/);assert.match(source,/state\.day\+7/);
});
test('order, receipt, quote and forecast display engine day fields',()=>{
 for(const field of ['deadlineDays','payLagDays','acceptedDay','shipDay','deliveryDay','dueDay','lateDays'])assert.ok(source.includes(field),field);
 assert.match(source,/q\.days/);assert.match(source,/s\.day/);
 assert.match(source,/fc.points.map\(p=>dayLabel\(p.day\)\)/);
 assert.doesNotMatch(source,/o\.(deliveryWeek|dueWeek|acceptedWeek)|r\.dueWeek|q\.weeks/);
 assert.match(source,/42 天最低现金/);assert.match(source,/每周运营/);assert.match(source,/采购价每周变动/);
});
test('pause feedback includes zero-day pauses and scopes approvals to concrete risk',()=>{
 assert.match(source,/advancedDays:result.advancedDays\?\?0/);
 assert.match(source,/requestedDays:result.requestedDays\?\?1/);
 assert.match(source,/pause:result.pause\?\?null/);
 assert.match(source,/剩余 /);assert.match(source,/未推进/);
 assert.match(source,/allowExpireOfferIds:p.offerIds/);assert.match(source,/allowFundingDay:p.day/);
 assert.doesNotMatch(source,/allowExpireOfferIds:true|allowFundingDay:true/);
 assert.match(source,/dayLabel\(loaded.day\)/);assert.match(source,/贸易经营-第\$\{state.day\}天.json/);
});

test('completed fast-forward cannot accidentally advance an extra day on confirmation',()=>{
 assert.match(source,/if\(days<=0\)return/);
 assert.match(source,/remainingDays:result.remainingDays/);
 assert.doesNotMatch(source,/Math.max\(1,.*requestedDays/);
});
