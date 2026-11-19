import assert from 'node:assert/strict';
import test from 'node:test';
import {PROSPECT_CONTENT,prospectContent} from '../src/deal-room-prospect-content.js';
import {MARKET_PRODUCTS} from '../src/deal-room-market-data.js';

const phases=['inquiry','bargain','reorder','delivery','settlement'];
const categoryNames=[...new Set(MARKET_PRODUCTS.slice(0,30).map(p=>p.category))];

test('restored introductions have 100 stable fictional buyers and 1,240 written lines',()=>{
 assert.equal(PROSPECT_CONTENT.length,100);
 assert.equal(new Set(PROSPECT_CONTENT.map(p=>p.displayName)).size,100);
 assert.equal(new Set(PROSPECT_CONTENT.map(p=>p.organization)).size,100);
 assert.deepEqual(categoryNames,['餐桌器具','咖啡与餐厨','家居布艺','桌面办公','差旅用品','家居陈列']);
 const all=[];
 for(const [index,p] of PROSPECT_CONTENT.entries()){
  assert.equal(p.id,String(index+1).padStart(3,'0'));
  assert.equal(prospectContent(p.id),p);
  assert.ok(p.market.length>=2&&p.organization.length>=3);
  if(p.productId)assert.equal(MARKET_PRODUCTS.find(g=>g.id===p.productId)?.category,p.category);
  assert.equal(p.category,categoryNames[p.categoryIndex]);
  assert.deepEqual(Object.keys(p.lines),phases);
  assert.deepEqual(phases.map(phase=>p.lines[phase].length),[index<40?4:3,2,2,3,2]);
  assert.ok(Object.isFrozen(p)&&Object.isFrozen(p.lines));
  for(const phase of phases){
   assert.ok(Object.isFrozen(p.lines[phase]));
   for(const line of p.lines[phase]){
    assert.ok(line.length>=16&&line.length<=105,`${p.id} ${phase}: ${line}`);
    assert.doesNotMatch(line,/@[oper]|[<>]|\{\{|待补|占位|TODO|NaN|undefined/);
    assert.match(line,/[。？]$/);
    all.push(line);
   }
  }
 }
 assert.equal(all.length,1240);
 assert.equal(new Set(all).size,1240);
 for(const id of ['000','101',null,1,'__proto__','constructor'])assert.equal(prospectContent(id),null);
});

test('lifecycle copy stays in its commercial moment and buyers have specific in-world details',()=>{
 const joon=prospectContent('008');
 assert.deepEqual([joon.displayName,joon.organization,joon.market,joon.productId],['Joon Lim','红珊夜宵','釜山','serving-tongs']);
 assert.match(joon.lines.inquiry[0],/表姐挨着出摊/);
 assert.match(joon.lines.bargain[0],/我们俩都好分摊/);
 const p=prospectContent('018');
 assert.match(p.lines.inquiry.join(' '),/临街吧台/);
 assert.match(p.lines.delivery.join(' '),/早班咖啡师/);
 for(const p of PROSPECT_CONTENT){
  assert.doesNotMatch([...p.lines.inquiry,...p.lines.bargain,...p.lines.delivery].join(' '),/款已经结清|款已付清|货款已经付了|已经把款付了/);
  assert.match(p.lines.reorder.join(' '),/上[次回]|再[走补订配]|来询/);
  for(const line of p.lines.settlement)assert.match(line,/付|结清/,p.id);
 }
});
