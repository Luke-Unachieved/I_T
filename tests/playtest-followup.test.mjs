import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,reduce,parseSave,chatScene,workScene,offers} from '../src/engine.js';
import {PRODUCTS,INQUIRY_VARIANTS} from '../src/content.js';
import {negotiationTerms} from '../src/negotiation.js';
import {deliveryStory} from '../src/delivery-stories.js';
const act=(s,a)=>{const r=reduce(s,a);assert.ok(r.changed,r.message);return r.state;};

test('recommendations vary early needs without changing any inquiry economics or an accepted order',()=>{
 const first=[1,2,3].map(day=>offers({...createGame(),day}).find(o=>o.featured));
 assert.deepEqual(first.map(o=>o.need),['quality','price','speed']);
 for(const day of [1,2,3,4,5,8,9,10,11,12,15]){
  const s={...createGame(),day},before=structuredClone(s),list=offers(s);assert.equal(list.filter(o=>o.featured).length,1);
  for(const p of PRODUCTS){const v=INQUIRY_VARIANTS[p.id][(day-1)%3],o=list.find(o=>o.product===p.id);
   assert.equal(o.need,v.need||p.need);assert.equal(o.revenue,p.revenue+(v.revenueDelta||0));assert.equal(o.cost,p.cost+(v.costDelta||0));
   assert.equal(o.buyer,v.buyer||p.buyer);
  }assert.deepEqual(s,before);
 }
 let s=act(createGame(),{type:'accept',id:'1-hinge'});s=act(s,{type:'tactic',id:'quality'});const order=structuredClone(s.active);
 s=act(act(s,{type:'evening'}),{type:'rest'});assert.deepEqual(s.active,order);assert.deepEqual(parseSave(JSON.stringify(s)).active,order);
});

test('employee matching replies describe the actual product and keep the original public reward',()=>{
 const replies=new Set();
 for(const product of PRODUCTS)for(const need of ['quality','price','speed']){
  let s=createGame();s=act(s,{type:'accept',id:`1-${product.id}`});s.active.need=need;
  const before=structuredClone(s.active),terms=negotiationTerms(s.active,need),result=reduce(s,{type:'tactic',id:need});
  assert.equal(terms.revenue,300);assert.equal(terms.cost,0);assert.equal(terms.plan,2);assert.equal(terms.kind,'match');
  assert.ok(result.changed);assert.ok(result.message.includes(terms.response));assert.match(result.message,/合同额增加 ¥300/);
  assert.deepEqual(s.active,before);replies.add(terms.response);
 }assert.equal(replies.size,9);
});

test('quality delivery echoes use product-specific consequences without rewriting older receipts',()=>{
 const replies=PRODUCTS.map(p=>deliveryStory({product:p.id,need:'quality',shipmentId:'normal',factoryId:'steady',qualityPoints:2,planPoints:2,stage:'employee',completed:1}).customer);
 assert.match(replies[0],/开合表现/);assert.match(replies[1],/材料说明/);assert.match(replies[2],/并排装好的效果/);
 let s=createGame();for(const a of [{type:'accept',id:'1-hinge'},{type:'tactic',id:'quality'},{type:'factory',id:'steady'},{type:'ship',id:'normal'}])s=act(s,a);
 s.lastDelivery.story.customer='旧版当时保存的完整回信。';const old=structuredClone(s.lastDelivery);
 assert.deepEqual(parseSave(JSON.stringify(s)).lastDelivery,old);s=act(act(s,{type:'evening'}),{type:'rest'});assert.deepEqual(s.lastDelivery,old);
});

test('Zhou daytime division of work differs from the second evening phone scene',()=>{
 for(const gender of ['female','male'])for(const response of [0,1]){
  let s=createGame('不同的一天',gender);s.completed=1;
  s=act(s,{type:'evening'});s=act(s,{type:'chat',id:'zhou',response:0});s=act(s,{type:'rest'});
  const before=structuredClone(s),work=workScene(s,'zhou_side_by_side');
  assert.match(work.scene,/两封草稿|包装工序/);assert.doesNotMatch(work.scene,/电话|话筒|三个数字|三个关键条件/);
  s=act(s,{type:'work-story',id:'zhou_side_by_side',response});
  for(const key of ['cash','rep','ap','completed','relations','eveningUsed'])assert.deepEqual(s[key],before[key]);
  s=act(s,{type:'evening'});const chat=chatScene(s,'zhou');assert.match(chat.scene,/电话.*三个数字/);
  assert.notEqual(chat.scene,work.scene);s=act(s,{type:'chat',id:'zhou',response});
  assert.equal(s.workStories.zhou_side_by_side.scene,work.scene);
  assert.equal(s.dialogueMemories.zhou.chat[1].scene,chat.scene);
  assert.deepEqual(parseSave(JSON.stringify(s)),s);
 }
});

test('work-copy revision preserves historical prose and the meanings of later callbacks',()=>{
 for(const response of [0,1]){
  let s=createGame();s.completed=1;s=act(s,{type:'work-story',id:'zhou_side_by_side',response});
  const record=s.workStories.zhou_side_by_side;
  record.scene='客户的语音一条接一条。周屿没有替你抢过话筒，而是把你刚才说的三个关键条件记在纸上。等电话挂断，他将纸推过来：“你已经把问题拆开了。剩下的，我们一项一项补。”';
  const old=structuredClone(record);s=parseSave(JSON.stringify(s));const replay=workScene(s,'zhou_side_by_side');
  assert.equal(replay.scene,old.scene);assert.deepEqual(replay.choices[response],{line:old.line,reply:old.reply});
  Object.assign(s,{stage:'founder',completed:5,startupOrders:2});
  const later=workScene(s,'zhou_after_hours');assert.equal(later.branch,`work:zhou_side_by_side:${response}`);
  assert.match(later.scene,response===0?/负责写信.*挑不清楚/:/条件与交期分开负责/);
  assert.deepEqual(s.workStories.zhou_side_by_side,old);
  const fresh=createGame();Object.assign(fresh,{stage:'founder',completed:3});
  const remote=workScene(fresh,'zhou_side_by_side');assert.equal(remote.setting,'remote');
  assert.match(remote.scene,/包装工序/);assert.doesNotMatch(remote.scene,/电话|话筒|三个数字/);
 }
});
