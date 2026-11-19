import test from 'node:test';
import assert from 'node:assert/strict';
import {createDealRoom,reduceDealRoom,normalizeDealRoom} from '../src/deal-room-engine.js';
import {encodeDealBackup,parseDealBackup} from '../src/deal-room-save.js';
import {marketBook,DAY_COST} from '../src/deal-room-market.js';
import {EQUIPMENT_PROJECTS,equipmentOpportunity,previewEquipment} from '../src/deal-room-equipment.js';
import {marketView,bindMarket} from '../src/deal-room-market-view.js';
import {goodsPriceRecords} from '../src/deal-room-goods-prices.js';

function take(state,type,fields={}) {
  const next = reduceDealRoom(state,{type,...fields});
  assert.notEqual(next,state,type);
  return next;
}
function unchanged(state,type,fields={}) {
  assert.equal(reduceDealRoom(state,{type,...fields}),state,type);
}
function workshop() {
  let s = createDealRoom();
  for (const optionId of ['trial','ready','small']) {
    s = take(s,'PROPOSE',{optionId}); s = take(s,'ADVANCE'); s = take(s,'NEXT_CLIENT');
  }
  return s;
}
function firstProject() {
  let s = workshop();
  for (let i=0;i<6;i++) {
    s = take(s,'OPEN_MARKET');
    s = take(s,'SIGN_MARKET',{productId:'tray',mode:'trial',source:'stock',unitPrice:37});
    s = take(take(s,'DELIVER_MARKET'),'CLOSE_MARKET');
  }
  s = take(take(s,'OPEN_MARKET'),'REGISTER_NEIGHBORHOOD');
  s = take(s,'SIGN_MARKET',{productId:'ratchet-set',mode:'neighborhood',source:'factory',unitPrice:103});
  s = take(s,'DELIVER_MARKET');
  assert.equal(equipmentOpportunity(s),null);
  s = take(s,'COLLECT_MARKET');
  return take(take(s,'CLOSE_MARKET'),'OPEN_MARKET');
}
function buyerSpeech(html,project) {
  const line = html.match(/class="equipment-buyer"[\s\S]*?<strong>([^<]+)<\/strong><br>“([^”]+)”/);
  assert.ok(line,'the current buyer speaks');
  assert.equal(line[1],project.buyer);
  return line[2];
}
function restore(state) {
  const copy = parseDealBackup(encodeDealBackup(state)).state;
  assert.deepEqual(copy,state);
  return copy;
}
function finish(s,shipping='standard') {
  const {id:projectId} = equipmentOpportunity(s);
  s = take(s,'SIGN_EQUIPMENT',{projectId,shipping});
  s = take(take(s,'SHIP_EQUIPMENT'),'DELIVER_MARKET');
  s = take(take(s,'COLLECT_MARKET'),'CLOSE_MARKET');
  return take(s,'OPEN_MARKET');
}

test('three reachable contracts progress from actual retail settlement through indivisible shipment, acceptance and final payment',()=>{
  let s = firstProject();
  const start = s.cash;
  const revenues = [1200000,2400000,10720000];
  let total = 0;
  for (const [index,project] of EQUIPMENT_PROJECTS.entries()) {
    const projectId = project.id, draft = {projectId,shipping:'standard'};
    const before = s.cash, beforeRows = marketBook(s).receipts.length;
    assert.equal(equipmentOpportunity(s).id,projectId);
    const html = marketView(s,{equipmentId:projectId}), q = previewEquipment(s,projectId,'standard',DAY_COST);
    assert.equal(buyerSpeech(html,project),project.dialogue.draft);
    assert.equal(q.valid,true); assert.equal(q.revenue,revenues[index]);
    assert.equal(q.cost,q.goodsCost+q.freight+q.acceptanceFee);
    assert.equal(q.netProfit,q.revenue-q.cost-q.operatingCost);
    assert.match(html,/顺利时预计净利/); assert.match(html,/换船风险下预计净利/);
    assert.match(html,/验收费用/); assert.match(html,/总成本（含日常开支）/);
    if (index===1) { assert.equal(q.acceptanceFee,135000); assert.match(html,/135,000/); }
    if (index===2) {
      assert.equal(q.netProfit,1670740); assert.equal(q.quantity,32);
      assert.equal(project.consignees.reduce((n,p)=>n+p.quantity,0),32);
      assert.match(html,/各厂按清单接货，整单一起出运，到齐后统一验收/);
      assert.doesNotMatch(html,/分批|分期出运/);
    }
    const low = {...s,cash:q.cashRequired-1};
    unchanged(low,'SIGN_EQUIPMENT',draft);
    assert.match(marketView(low,{equipmentId:projectId}),/开工前还差 ¥1/);
    s = restore(take(s,'SIGN_EQUIPMENT',draft));
    assert.match(buyerSpeech(marketView(s),project),/预付款/);
    assert.equal(s.market.status,'preparing'); assert.equal(s.cash,before+q.deposit-q.cost);
    unchanged(s,'CLOSE_MARKET'); unchanged(s,'DELIVER_MARKET'); unchanged(s,'COLLECT_MARKET');
    unchanged(s,'SIGN_EQUIPMENT',draft);
    s = restore(take(s,'SHIP_EQUIPMENT'));
    assert.match(buyerSpeech(marketView(s),project),/整批发出|同批上船/);
    const shipment = s.market.active;
    assert.equal(s.day,q.shipDay); assert.equal(shipment.delivered,0);
    assert.equal(shipment.received,q.deposit); unchanged(s,'SHIP_EQUIPMENT');
    if (index===0) assert.equal(shipment.transfer,false);
    if (index===1) assert.equal(shipment.transfer,true);
    assert.equal(s.cash,before+q.deposit-q.cost-(s.day-q.signedDay)*DAY_COST-shipment.stationPaid);
    s = restore(take(s,'DELIVER_MARKET'));
    assert.match(buyerSpeech(marketView(s),project),/验收[^。]*。?[^。]*尾款/);
    assert.equal(s.day,shipment.deliveryDay); assert.equal(s.market.active.delivered,q.quantity);
    assert.equal(s.market.active.received,q.deposit); unchanged(s,'DELIVER_MARKET'); unchanged(s,'CLOSE_MARKET');
    assert.equal(marketBook(s).receipts.length,beforeRows);
    s = restore(take(s,'COLLECT_MARKET'));
    assert.match(buyerSpeech(marketView(s),project),/尾款.{0,3}付清/);
    const paid = s.market.active;
    assert.equal(s.day,paid.paymentDay); assert.equal(paid.operatingPaid,paid.operatingCost);
    assert.equal(paid.received,paid.revenue); assert.equal(marketBook(s).receipts.length,beforeRows+1);
    assert.equal(paid.netProfit,paid.revenue-paid.cost-paid.operatingCost); assert.equal(s.cash,before+paid.netProfit);
    assert.equal(s.cash,paid.cashAfterPayment); unchanged(s,'COLLECT_MARKET');
    assert.ok(goodsPriceRecords(s).some(r=>r.product===project.name&&r.revenue===paid.revenue&&r.quantity===paid.quantity));
    total+=paid.netProfit;
    s = take(take(s,'CLOSE_MARKET'),'OPEN_MARKET');
    unchanged(s,'SIGN_EQUIPMENT',draft);
  }
  assert.equal(s.cash,start+total); assert.equal(equipmentOpportunity(s),null);
  assert.doesNotMatch(marketView(s),/data-equipment-open/);
});

test('arrivals on the same departure calendar cover locked space, transfer and optional one-time paid rebooking',()=>{
  const desk = finish(firstProject());
  const projectId='automated-warehouse';
  const normal=previewEquipment(desk,projectId,'standard',DAY_COST);
  const locked=previewEquipment(desk,projectId,'locked',DAY_COST);
  assert.equal(locked.netProfit,locked.riskNetProfit);
  assert.doesNotMatch(marketView(desk,{equipmentId:projectId,equipmentShipping:'locked'}),/换船风险下预计净利/);
  const start=shipping=>take(take(desk,'SIGN_EQUIPMENT',{projectId,shipping}),'SHIP_EQUIPMENT');
  const calm=start('locked'), late=start('standard');
  assert.equal(calm.market.active.transfer,false); assert.equal(calm.market.active.deliveryDay,locked.deliveryDay);
  unchanged(calm,'REBOOK_EQUIPMENT');
  assert.equal(late.market.active.transfer,true);
  assert.equal(late.market.active.deliveryDay,normal.deliveryDay+normal.slipDays);
  assert.equal(late.market.active.netProfit,normal.riskNetProfit);
  assert.match(marketView(late),/场站费照收/);
  const newSailing=restore(take(late,'REBOOK_EQUIPMENT')), a=newSailing.market.active;
  assert.equal(a.stationPaid,normal.stationFee);
  assert.equal(a.deliveryDay,late.market.active.deliveryDay-normal.daysSaved);
  assert.equal(a.paymentDay,late.market.active.paymentDay-normal.daysSaved);
  assert.equal(a.netProfit,normal.riskNetProfit-normal.rebookFee+normal.daysSaved*DAY_COST);
  assert.equal(a.cost,a.goodsCost+a.freight+a.acceptanceFee+a.stationPaid+a.rebookPaid);
  assert.equal(newSailing.cash,late.cash-normal.rebookFee);
  unchanged(newSailing,'REBOOK_EQUIPMENT');
  const keep=take(take(late,'DELIVER_MARKET'),'COLLECT_MARKET');
  const changed=restore(take(take(newSailing,'DELIVER_MARKET'),'COLLECT_MARKET'));
  assert.equal(changed.cash-keep.cash,-normal.rebookFee+normal.daysSaved*DAY_COST);
  assert.equal(changed.market.active.cashAfterPayment,changed.cash);
  const bad=structuredClone(changed);bad.market.active.acceptanceFee++;
  assert.throws(()=>normalizeDealRoom(bad));
  const cashPoor={...late,cash:normal.rebookFee+(a.paymentDay-late.day)*DAY_COST-1};
  unchanged(cashPoor,'REBOOK_EQUIPMENT');
  assert.ok(take(cashPoor,'DELIVER_MARKET').cash>=0);
});

test('checking a project and changing cabins only edits the quote until the player confirms',()=>{
  const s=firstProject(), original=structuredClone(s), ui={}, selectors=new Map();
  const root={querySelector:()=>null,querySelectorAll(sel) {
    const dataset={'[data-equipment-open]':{equipmentOpen:'cold-chain'},
      '[data-equipment-shipping]':{equipmentShipping:'locked'},'[data-equipment-sign]':{equipmentSign:'cold-chain'}}[sel];
    return dataset ? [{dataset,addEventListener(_,cb){selectors.set(sel,cb);}}] : [];
  }};
  let action=null;
  bindMarket(root,s,ui,()=>{},a=>{action=a;});
  selectors.get('[data-equipment-open]')(); selectors.get('[data-equipment-shipping]')();
  assert.equal(ui.equipmentId,'cold-chain'); assert.equal(ui.equipmentShipping,'locked');
  assert.equal(action,null); assert.deepEqual(s,original);
  selectors.get('[data-equipment-sign]')();
  assert.deepEqual(action,{type:'SIGN_EQUIPMENT',projectId:'cold-chain',shipping:'locked'});
  assert.equal(reduceDealRoom(s,action).market.status,'preparing');
  unchanged(s,'SIGN_EQUIPMENT',{projectId:'filling-lines',shipping:'locked'});
  unchanged(s,'SIGN_EQUIPMENT',{projectId:'cold-chain',shipping:'unknown'});
  unchanged(s,'SIGN_EQUIPMENT',{...action,acceptanceFee:0});
  assert.equal(previewEquipment({...s,day:Number.MAX_SAFE_INTEGER},'cold-chain','locked',DAY_COST),null);
  const early=take(workshop(),'OPEN_MARKET');
  unchanged(early,'SIGN_EQUIPMENT',{projectId:'cold-chain',shipping:'locked'});
});
