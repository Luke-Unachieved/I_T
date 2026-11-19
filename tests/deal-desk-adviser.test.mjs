import test from 'node:test';
import assert from 'node:assert/strict';
import {adviserView, bindAdviser, readAdviserChoice} from '../src/deal-room-adviser.js';
import {createDealRoom} from '../src/deal-room-engine.js';
import {marketAdviserQuote} from '../src/deal-room-market-view.js';

const ui = {choice:'fang',choosing:false};
const state = {phase:'market', day:70, cash:200000, history:[], market:{status:'draft'}};
function render(s, context={}) { return adviserView(s,context,ui); }

test('the four confirmed partners, skipping and returning are independent of the business save',()=>{
  const s = createDealRoom(), before = structuredClone(s);
  const choices = adviserView(s,{}, {choice:null,choosing:null});
  for (const name of ['方文斌','梁佳音','陶乐','许明珊','先自己来']) assert.ok(choices.includes(name));
  assert.match(render(s), /桌上的合同我来整理。先回哪封询盘，你定。/);
  const memory=new Map(), prefs={choice:null,choosing:true};
  const storage={setItem:(k,v)=>memory.set(k,v),getItem:k=>memory.get(k)};
  const handlers=new Map();
  const buttons=['fang','liang','tao','xu','solo'].map(id=>({dataset:{adviserChoice:id},addEventListener:(event,fn)=>handlers.set(id,fn)}));
  const root={querySelector:()=>null,querySelectorAll:()=>buttons};
  bindAdviser(root,prefs,storage,()=>{});
  for(const id of ['fang','liang','tao','xu','solo']){
    handlers.get(id)();
    assert.equal(readAdviserChoice(storage),id);
    assert.deepEqual(s,before);
  }
  assert.match(adviserView(s,{},prefs), /选助理/);
  assert.doesNotMatch(adviserView(s,{},prefs),/搭档便笺/);
  assert.equal(memory.size,1);
  assert.equal(readAdviserChoice({getItem(){throw Error('unavailable');}}),null);
});

test('the note projects the live quote, including cash, delivery, minimum order and true equipment charges',()=>{
  const low={...state,cash:1};
  const q=marketAdviserQuote(low,{productId:'tray',source:'stock',mode:'bulk',unitPrice:32});
  assert.ok(q.cashRequired>1);
  assert.ok(render(low,{quote:q}).includes((q.cashRequired-1).toLocaleString('zh-CN')));
  assert.match(render(state,{quote:{...q,deliveryDay:100,deadlineDay:90}}),/赶不上买方的交期/);
  const trial=marketAdviserQuote(state,{productId:'tray',source:'factory',mode:'trial',unitPrice:37});
  assert.match(render(state,{quote:trial}),/还没到起订量/);
  const receipt=(kind,productId)=>({status:'paid',kind,productId,stores:12,received:1500,revenue:1500,quantity:12,delivered:12,paidDay:60});
  const equipped={...state,marketHistory:[receipt('neighborhood','ratchet-set'),receipt('equipment','cold-chain')]};
  for(const shipping of ['standard','locked']){
    const quote=marketAdviserQuote(equipped,{equipmentId:'automated-warehouse',equipmentShipping:shipping});
    assert.ok(quote);assert.equal(quote.revenue-quote.goodsCost-quote.acceptanceFee-quote.freight-quote.operatingCost,quote.netProfit);
    const html=render(equipped,{quote});
    assert.match(html,/验收费用<\/dt><dd>¥135,000/);
    assert.ok(html.includes(quote.netProfit.toLocaleString('zh-CN')));
    assert.equal(html.includes('换船风险下预计净利'),shipping==='standard');
  }
});

test('settled orders stop collection reminders and a task link only focuses its destination',()=>{
  const buyer={productName:'工具',balanceDue:40000,paymentDay:80,received:50000};
  const pending={...state,market:{status:'receivable',active:buyer}};
  const finished={...state,market:{status:'paid',active:buyer}};
  assert.match(render(pending),/40,000 尾款/);
  assert.match(render(finished),/50,000 已收齐/);
  assert.doesNotMatch(render(finished),/查看应收尾款/);
  let clicked, focused=0, scrolled=0;
  const target={focus(){focused++;},scrollIntoView(){scrolled++;},matches:()=>true,click(){assert.fail('task link acted on contract');}};
  const link={dataset:{adviserFocus:'.business'},addEventListener:(ev,fn)=>clicked=fn};
  const root={querySelector:s=>s==='[data-adviser-focus]'?link:s==='.business'?target:null,querySelectorAll:()=>[]};
  bindAdviser(root,ui,null,()=>assert.fail('task link rerendered'));
  clicked();assert.equal(focused,1);assert.equal(scrolled,1);
});

test('the adviser mentions invitations only after the desk actually unlocks them',()=>{
  const row={status:'paid',mode:'trial',paidDay:60,signedDay:54,received:90,revenue:90,delivered:3,quantity:3,unitPrice:30,cost:60,operatingCost:12,netProfit:18,buyer:'甲',productId:'tray'};
  const before={...state,marketHistory:Array(5).fill(row)};
  assert.doesNotMatch(render(before),/林妍|设备来信/);
  const registered={...before,marketHistory:Array(6).fill(row),neighborhoodRegistered:true};
  assert.match(render(registered),/林妍把 12 家店的清单发来了/);
  const completed={...registered,marketHistory:[...registered.marketHistory,{...row,mode:'neighborhood',kind:'neighborhood',stores:12}]};
  assert.match(render(completed),/周岚有一封冷链仓配设备询价/);
});
