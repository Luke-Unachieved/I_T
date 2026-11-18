import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createDealRoom,reduceDealRoom} from '../src/deal-room-engine.js';
import {settledUnitPriceGroups,settledUnitPricesView,careerRecapView} from '../src/deal-room-home.js';

const actions=JSON.parse(readFileSync(new URL('./fixtures/deal-group-day169-actions.json',import.meta.url)));
const settled=()=>actions.reduce(reduceDealRoom,createDealRoom());
test('receipt chart uses prices of actual settled single-item deals and excludes unpaid and mixed orders',()=>{
 const s=settled(), before=structuredClone(s), groups=settledUnitPriceGroups(s.contracts);
 assert.equal(groups.length,3);const lamps=groups.find(g=>g.name==='便携台灯');
 assert.deepEqual(lamps.rows.map(r=>r.signedDay),[1,17,18,31]);
 assert.deepEqual(lamps.rows.map(r=>r.revenue),[2400,2500,2500,2800]);
 const extra={...s.contracts[0],revenue:1234567,signedDay:333};
 const h=settledUnitPricesView([...s.contracts,{...extra,status:'receivable'},{...extra,status:'fulfilling'}]);
 assert.match(h,/¥46.67/);assert.match(h,/第 31 天签约/);assert.match(h,/60 件/);
 assert.match(h,/第 33 天收齐/);assert.match(h,/货款 ¥2,800/);assert.doesNotMatch(h,/333|Atelier|Northline|1,234,567/);
 assert.match(careerRecapView(s),/自己的成交单价/);assert.deepEqual(s,before);
});
test('standard, branded and developed articles stay distinct, including first branded order without a specification field',()=>{
 const {contracts}=settled(), [lamp,cup]=contracts;
 const branded={...cup,optionId:'branded'},repeat={...cup,optionId:'repeat-small',specification:'branded'};
 const studio={...lamp,product:'三档调光台灯',specification:'developed-studio',optionId:'developed-lamp'};
 const line={...lamp,product:'暖光标准台灯',specification:'developed-line',optionId:'second-developed-lamp'};
 const groups=settledUnitPriceGroups([lamp,cup,branded,repeat,studio,line]);
 assert.deepEqual(groups.map(g=>g.rows.length),[1,1,2,1,1]);
 assert.match(settledUnitPricesView([cup,branded]),/定制包装/);
});
test('small charts show observations, not forecasts: empty inputs, one point, flat values, recent window and safely escaped labels',()=>{
 const [lamp]=settled().contracts;assert.equal(settledUnitPricesView([]),'');
 assert.equal(settledUnitPricesView([{...lamp,status:'receivable'},{...lamp,quantity:0},{...lamp,revenue:Infinity}]),'');
 const only=settledUnitPricesView([{...lamp,product:'<img src=x>'}]);assert.doesNotMatch(only,/<img src/);assert.match(only,/&lt;img/);
 assert.match(settledUnitPricesView([{...lamp,paidDay:29}]),/第 29 天收齐/);assert.equal((only.match(/<circle /g)||[]).length,1);assert.doesNotMatch(only,/<polyline/);
 const records=Array.from({length:8},(_,i)=>({...lamp,signedDay:i+1,paymentDay:i+4,deliveryDay:i+4}));
 const groups=settledUnitPriceGroups(records),html=settledUnitPricesView(records);
 assert.deepEqual(groups[0].rows.map(r=>r.signedDay),[5,6,7,8]);assert.equal(records.length,8);
 assert.equal((html.match(/<circle /g)||[]).length,4);assert.doesNotMatch(html,/NaN|Infinity/);assert.match(html,/<polyline/);
});
