import test from 'node:test';
import assert from 'node:assert/strict';
import { act, forecast, newGame } from '../v38/engine/game.js';
import { quote, quoteCapacity } from '../v38/engine/quotes.js';
import { ASSISTANTS } from '../v38/data/core.js';
import { readSave, writeSave } from '../v38/ui/save.js';
import { dialogContent } from '../v38/ui/shell.js';

const apply=(state,action)=>{
  const result=act(state,action);
  assert.ifError(result.error);
  return result.state;
};
const stockBid=id=>({type:'bid',inquiryId:id,source:'stock',ratio:80,extraTerms:0});
const allWinStock=state=>state.inquiries.filter(inquiry=>{
  const offer=quote(state,inquiry,stockBid(inquiry.id));
  return !offer.error&&offer.probability===1;
});
const fresh=()=>{
  const state=newGame({seed:381,assistant:'fang'});
  state.cash=220000; // Solvent fixture isolates capacity and actual transaction accounting.
  return state;
};
const week=state=>{
  while(state.events.length){
    const event=state.events[0];
    const choice=event.choices.find(candidate=>!act(state,{type:'resolve-event',eventId:event.id,choice:candidate.id}).error);
    assert.ok(choice,'there is a legal event response');
    state=apply(state,{type:'resolve-event',eventId:event.id,choice:choice.id});
  }
  return apply(state,{type:'end-week'});
};

function rejectWithoutChange(state,action,message) {
  const before=structuredClone(state);
  const rejected=act(state,action);
  assert.match(rejected.error,message);
  assert.equal(rejected.state,state);
  assert.deepEqual(state,before);
}

function memorySave(state) {
  const store={raw:null,getItem(){return this.raw;},setItem(key,raw){this.raw=raw;}};
  assert.equal(writeSave(state,{page:'inquiries'},null,store).status,'ready');
  const saved=readSave(store);
  assert.equal(saved.status,'ready');
  assert.deepEqual(saved.record.state,state);
  return saved.record.state;
}

test('owner capacity plus the real team roles gives 4–5 opening quotes and grows with hires',()=>{
  for(const assistant of ASSISTANTS){
    const state=newGame({seed:381,assistant:assistant.id});
    assert.equal(state.staff.length,1);
    assert.equal(quoteCapacity(state),3+(state.staff[0].role==='sales'?2:1));
    assert.ok(quoteCapacity(state)>3);
  }
  let state=fresh();
  assert.equal(quoteCapacity(state),5);
  const sales=state.candidates.find(person=>person.role==='sales');
  const operations=state.candidates.find(person=>person.role==='operations');
  const finance=state.candidates.find(person=>person.role==='finance');
  state=apply(state,{type:'hire',id:sales.id});assert.equal(quoteCapacity(state),7);
  state=apply(state,{type:'hire',id:operations.id});assert.equal(quoteCapacity(state),8);
  state=apply(state,{type:'hire',id:finance.id});assert.equal(quoteCapacity(state),9);
  // Capacity is calculated from the current roster, not a saved integer or a
  // replacement global cap. A manual departure removes that role's contribution.
  state=apply(state,{type:'dismiss-staff',id:operations.id});assert.equal(quoteCapacity(state),8);
  state=apply(state,{type:'dismiss-staff',id:sales.id});assert.equal(quoteCapacity(state),6);
  state=apply(state,{type:'dismiss-staff',id:finance.id});assert.equal(quoteCapacity(state),5);
});

test('already submitted bids survive a reduced roster, save/restore, and real settlement of seven contracts',()=>{
  let state=fresh();
  const sales=state.candidates.find(person=>person.role==='sales');
  state=apply(state,{type:'hire',id:sales.id});
  state=apply(week(state),{type:'dismiss-summary'});
  const legal=allWinStock(state);
  assert.ok(legal.length>quoteCapacity(state));
  for(const inquiry of legal.slice(0,quoteCapacity(state)))state=apply(state,stockBid(inquiry.id));
  assert.equal(state.bids.length,7);
  rejectWithoutChange(state,stockBid(legal[7].id),/报价能力为 7 笔/);
  // None of the bids was assigned to the new hire, so the actual dismissal
  // is legal. Existing financial commitments are not silently discarded.
  const bidIds=state.bids.map(item=>item.id);
  const smaller=apply(state,{type:'dismiss-staff',id:sales.id});
  assert.equal(quoteCapacity(smaller),5);
  assert.deepEqual(smaller.bids.map(item=>item.id),bidIds);
  rejectWithoutChange(smaller,stockBid(legal[7].id),/报价能力为 5 笔/);
  let withdrawn=smaller;
  for(const inquiry of legal.slice(0,2))withdrawn=apply(withdrawn,{type:'withdraw-bid',inquiryId:inquiry.id});
  assert.equal(withdrawn.bids.length,5);
  rejectWithoutChange(withdrawn,stockBid(legal[7].id),/报价能力为 5 笔/);
  withdrawn=apply(withdrawn,{type:'withdraw-bid',inquiryId:legal[2].id});
  withdrawn=apply(withdrawn,stockBid(legal[7].id));
  assert.equal(withdrawn.bids.length,5);
  // Even with 7 pending and a now-small team, the original agreements to quote
  // still settle normally. The 12-week hypothetical includes every pending bid.
  const restored=memorySave(smaller);
  assert.equal(quoteCapacity(restored),5);
  const rows=forecast(restored);
  assert.equal(rows.length,12);
  assert.deepEqual(rows.map(row=>row.cash),forecast({...restored,bids:[]}).map(row=>row.cash));
  const closed=apply(restored,{type:'advance-four'});
  assert.equal(closed.week,restored.week+1,'fast advance stops for the actual tender results');
  assert.equal(closed.summary.won.length,7);
  assert.equal(closed.summary.lost.length,0);
  assert.equal(closed.orders.length,7);
  assert.equal(closed.bids.length,0);
  assert.deepEqual(new Set(closed.summary.won.map(item=>item.bidId)),new Set(bidIds));
  assert.equal(closed.summary.cashBreakdown.inflow.deposit,restored.bids.reduce((sum,bid)=>sum+bid.deposit,0));
  assert.equal(closed.summary.cashBreakdown.outflow.supplier,restored.bids.reduce((sum,bid)=>sum+bid.prepayment,0));
  assert.equal(closed.cash,restored.cash+closed.summary.inflow-closed.summary.outflow);
  assert.equal(closed.cash,rows[0].hypothetical);
  const recovered=memorySave(closed);
  assert.equal(recovered.summary.won.length,7);
  const feedback=dialogContent(recovered,{dialog:'summary'},'');
  assert.match(feedback,/data-summary-feedback="won"/);
  assert.match(feedback,/本次签下 7 笔合同/);
});

test('named employees still have the original three concurrent assignments while the team may quote more',()=>{
  let state=fresh();
  const extra=state.candidates.find(person=>person.role==='sales');
  state=apply(state,{type:'hire',id:extra.id});
  assert.equal(quoteCapacity(state),7);
  const legal=allWinStock(state);
  assert.ok(legal.length>=6);
  for(const inquiry of legal.slice(0,3))state=apply(state,{...stockBid(inquiry.id),staffId:'fang'});
  rejectWithoutChange(state,{...stockBid(legal[3].id),staffId:'fang'},/负责人已经跟进 3 笔/);
  state=apply(state,stockBid(legal[3].id));
  state=apply(state,{...stockBid(legal[4].id),staffId:extra.id});
  state=apply(state,stockBid(legal[5].id));
  assert.equal(state.bids.length,6);
  rejectWithoutChange(state,stockBid(legal[0].id),/已经提交/);
  rejectWithoutChange(state,{type:'dismiss-staff',id:extra.id},/报价或在途订单/);
  const won=apply(week(state),{type:'dismiss-summary'});
  assert.equal(won.orders.length,6);
  assert.equal(won.orders.filter(order=>order.staffId==='fang').length,3);
  const next=allWinStock(won)[0];
  assert.ok(next);
  rejectWithoutChange(won,{...stockBid(next.id),staffId:'fang'},/负责人已经跟进 3 笔/);
  assert.ok(!act(won,stockBid(next.id)).error,'the owner can use available team capacity without overloading the named staff');
});

test('inventory remains reserved by actual bids beyond the former three-quote threshold',()=>{
  let state=fresh();
  state=apply(state,{type:'invest-venture',id:'warehouse'});
  const carafes=state.inquiries.filter(item=>item.productId==='carafe');
  assert.deepEqual(carafes.map(item=>item.quantity),[72,144]);
  state=apply(state,{type:'purchase-stock',productId:'carafe',quantity:150});
  const others=allWinStock(state).filter(item=>item.productId!=='carafe').slice(0,3);
  for(const inquiry of others)state=apply(state,stockBid(inquiry.id));
  state=apply(state,{...stockBid(carafes[0].id),source:'inventory'});
  assert.equal(state.bids.length,4);
  rejectWithoutChange(state,{...stockBid(carafes[1].id),source:'inventory'},/库存不足|库存已预留/);
  state=apply(state,{type:'withdraw-bid',inquiryId:carafes[0].id});
  state=apply(state,{...stockBid(carafes[1].id),source:'inventory'});
  rejectWithoutChange(state,{type:'liquidate',productId:'carafe',quantity:7},/可清仓库存不足/);
  state=apply(state,{type:'liquidate',productId:'carafe',quantity:6});
  assert.equal(state.inventory.reduce((sum,item)=>sum+item.quantity,0),144);
  const result=week(state);
  assert.equal(result.summary.won.length,4);
  assert.equal(result.inventory.length,0);
  assert.equal(result.orders.find(order=>order.source==='inventory').quantity,144);
});

test('expiration and actual cash risk remain meaningful when a larger team quotes more than three deals',()=>{
  let state=fresh();
  const legal=allWinStock(state);
  const expired=state.inquiries.find(item=>item.id===legal[0].id);
  expired.expiresWeek=state.week-1;
  rejectWithoutChange(state,stockBid(expired.id),/过了报价期限/);
  state.cash=1000;state.creditLine=0;
  // Capacity is a workload limit, not a magical capital grant. Manual input
  // can still expose the company to a cash deficit even before it is full.
  for(const inquiry of legal.slice(1,quoteCapacity(state)+1))state=apply(state,stockBid(inquiry.id));
  assert.equal(state.bids.length,quoteCapacity(state));
  assert.ok(Math.min(...forecast(state).map(row=>row.hypothetical))<0);
  const actual=week(state);
  assert.equal(actual.summary.won.length,quoteCapacity(state));
  assert.ok(actual.cash<0);
  assert.equal(actual.negativeWeeks,1);
  assert.equal(actual.bankrupt,false);
});

test('multiple real deliveries create distinct invoices, and mixed paid/bad-debt receipts reconcile correctly',()=>{
  let state=fresh();
  const inquiries=allWinStock(state).slice(0,quoteCapacity(state));
  assert.equal(inquiries.length,5);
  // Deliberately choose a long buyer term in this fixture to collect several
  // actual deliveries in one cohort before their separate credit outcomes.
  for(const item of inquiries)item.terms=8;
  for(const item of inquiries)state=apply(state,stockBid(item.id));
  state=week(state);
  assert.equal(state.summary.won.length,5);
  for(let i=0;i<8&&state.receivables.length<5;i++)state=week(state);
  assert.equal(state.receivables.length,5);
  assert.ok(state.receivables.every(item=>item.status==='open'||item.status==='overdue'));
  assert.equal(new Set(state.receivables.map(item=>item.orderId)).size,5);
  // Exercise known credit branches using genuine invoices, not fake cash.
  while(state.events.length){
    const event=state.events[0];const choice=event.choices.find(c=>!act(state,{type:'resolve-event',eventId:event.id,choice:c.id}).error);
    state=apply(state,{type:'resolve-event',eventId:event.id,choice:choice.id});
  }
  for(const invoice of state.receivables){invoice.buyer.credit='B';invoice.dueWeek=state.week;invoice.delays=2;}
  state.seed=7;
  const beforeBad=state.year.badDebts;
  const next=week(state);
  const paid=next.receivables.filter(item=>item.status==='paid');
  const debts=next.receivables.filter(item=>item.status==='bad-debt');
  assert.ok(paid.length>0&&debts.length>0);
  assert.equal(paid.length+debts.length,5);
  assert.equal(next.year.badDebts,beforeBad+debts.length);
  assert.equal(next.summary.cashBreakdown.inflow.customerPayment,paid.reduce((sum,item)=>sum+item.paidAmount,0));
  assert.ok(debts.every(item=>!item.paidAmount&&next.orders.find(order=>order.id===item.orderId).status==='bad-debt'));
  assert.equal(next.cash,state.cash+next.summary.inflow-state.period.inflow-next.summary.outflow+state.period.outflow);
  const again=week(next);
  assert.equal(again.summary.cashBreakdown.inflow.customerPayment??0,0,'settled/failed invoices must not be collected twice');
});
