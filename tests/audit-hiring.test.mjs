import test from 'node:test';
import assert from 'node:assert/strict';
import { act, forecast, netAssets, newGame } from '../v38/engine/game.js';
import { certProgress, marketProgress } from '../v38/engine/expansion.js';
import { pageCoach } from '../v38/ui/coaching.js';
import { planDevelopment } from '../v38/ui/development-planner.js';
import { plannerForecast } from '../v38/ui/quote-planner.js';

const visited={version:2,visited:[],active:null,skipped:true};
const view=tab=>({page:'company',developmentTab:tab,developmentOverview:false,coachTour:visited,coachPrep:3,coachReview:{},filters:{category:'all',availability:'all'}});
function matureFixture(){
  const state=newGame({difficulty:'casual',seed:920,assistant:'fang'});
  // Start with a real contract from the engine. The controlled history below
  // reproduces a seasoned exporter: a dozen profitable weeks, 24 completed
  // contracts, eight profitable overseas deliveries, no outstanding loan.
  const bid=act(state,{type:'bid',inquiryId:state.inquiries[0].id,source:'stock',ratio:80});
  assert.ifError(bid.error);
  const contract=act(bid.state,{type:'end-week'}).state.orders[0];
  assert.ok(contract);
  state.week=32;state.cash=180000;state.creditLine=100000;state.inquiries=[];state.tutorial.done=true;
  state.company.rep=95;state.company.certs=['export'];state.company.markets=['domestic','se-asia'];
  state.log=[{week:18,type:'market',text:'开拓东南亚'}];
  const ids=['clock','stapler','pet-harness','carafe','knock-box','dripper'];
  state.orders=Array.from({length:24},(_,i)=>({...structuredClone(contract),id:`historical-${i}`,productId:ids[i%6],market:i%3===0?'se-asia':'domestic',staffId:null,status:'settled',contractWeek:20+Math.floor(i/3),deliveredWeek:23+Math.floor(i/3),dueWeek:24+Math.floor(i/3),deliverWeek:23+Math.floor(i/3),expectedPayWeek:24+Math.floor(i/3),productionLeft:0,shippingLeft:0,total:30000,foreignTotal:30000,cost:22000,shipping:1000,deposit:9000,workingCapital:14000,profit:7000,probability:1}));
  state.history=Array.from({length:31},(_,i)=>({week:i+1,cash:state.cash,loan:0,receivables:0,orders:0,profit:5000,revenue:60000,inflow:60000,outflow:55000,rep:state.company.rep,macro:{...state.macro},rank:1,valuation:180000}));
  state.cumulativeRevenue=state.orders.reduce((sum,order)=>sum+order.total,0);
  state.year.deliveries=state.orders.length;state.year.revenue=state.cumulativeRevenue;state.year.profit=155000;
  return state;
}
const hireId=html=>html.match(/data-id="([^"]+)" data-coach-action="hire"/)?.[1];
const clearEvents=state=>{
  let s=state;
  while(s.events.length){
    const event=s.events[0];const result=event.choices.map(choice=>act(s,{type:'resolve-event',eventId:event.id,choice:choice.id})).find(result=>!result.error);
    assert.ok(result);s=result.state;
  }
  return s;
};

test('proven overseas demand and all-funded certification route can justify the first operations hire, even when direct savings alone do not',()=>{
  const state=matureFixture();
  const before=structuredClone(state);
  const audit=certProgress(state,netAssets(state)).find(item=>item.id==='audit');
  assert.equal(audit.available,false);
  assert.equal(audit.requirements.filter(item=>!item.met).length,1);
  const html=pageCoach(state,view('team'));
  const id=hireId(html);const person=state.candidates.find(item=>item.id===id);
  assert.ok(person&&person.role==='operations');
  assert.match(html,/8 笔盈利海外交付.*验厂认证只差在职跟单员.*预留 12 周工资.*认证费.*市场费.*合计.*预测最低余额.*不保证新增订单/s);
  assert.deepEqual(state,before,'checking advice must never hire, apply for certification or open a market');
  const hired=act(state,{type:'hire',id});assert.ifError(hired.error);
  assert.equal(hired.state.staff.length,2);
  assert.equal(hired.state.cash,state.cash,'hiring is only the first action; certificate and market fees have not been paid');
  assert.equal(hired.state.company.certs.includes('audit'),false);
  assert.equal(hired.state.company.markets.includes('east-asia'),false);
  assert.equal(certProgress(hired.state,netAssets(hired.state)).find(item=>item.id==='audit').available,true);
  assert.doesNotMatch(pageCoach(hired.state,view('certifications')),/data-coach-action="buy-cert"/,'one justified growth action per week');
  const next=act(hired.state,{type:'end-week'});assert.ifError(next.error);
  let later=clearEvents(act(next.state,{type:'dismiss-summary'}).state);
  const laterHtml=pageCoach(later,view('certifications'));
  assert.equal(certProgress(later,netAssets(later)).find(item=>item.id==='audit').available,true);
  assert.match(laterHtml,/data-id="audit" data-coach-action="buy-cert"|验厂认证资格已达到/,'later advice recognizes the real unlocked gate; the player can still defer its cost');
  const certified=act(later,{type:'buy-cert',id:'audit'});assert.ifError(certified.error);
  const market=marketProgress(certified.state).find(item=>item.id==='east-asia');
  const opened=act(certified.state,{type:market.canRefer?'referral':'open-market',id:market.id});assert.ifError(opened.error);
  const rows=[...forecast(opened.state),...plannerForecast(opened.state)];
  assert.ok(rows.every(row=>Math.min(row.cash,row.hypothetical)>0&&row.financing===0));
});

test('a week number or a certification checkbox alone never triggers the strategic hire',()=>{
  const cases=[
    [state=>{state.cash=80000;},/招聘、认证和市场费用至少需/],
    [state=>{for(const order of state.orders)order.market='domestic';},/盈利的海外交付有 0 笔/],
    [state=>{state.cumulativeRevenue=120000;},/还有其他申请条件未达到/],
    [state=>{state.log[0].week=30;},/最近才开拓海外市场/],
  ];
  for(const [modify,reason] of cases){
    const state=matureFixture();modify(state);
    const before=structuredClone(state);
    const html=pageCoach(state,view('team'));
    assert.match(html,/暂缓聘用/);assert.match(html,reason);
    assert.equal(hireId(html),undefined);
    assert.deepEqual(state,before);
  }
});

test('the evidenced staged hire is actually evaluated despite three higher-ranked safe alternatives',()=>{
  const state=matureFixture();
  const id=hireId(pageCoach(state,view('team')));
  const person=state.candidates.find(item=>item.id===id);
  assert.ok(person);
  const alternatives=state.candidates.filter(x=>x.role!=='operations').slice(0,3)
    .map((candidate,index)=>({action:{type:'hire',id:candidate.id},strategicValue:100-index}));
  assert.equal(alternatives.length,3);
  const staged={action:{type:'hire',id},strategicValue:10,stagedUnlock:'audit-market',stageCost:person.salary*12+25000+12000};
  const plan=planDevelopment(state,[...alternatives,staged],{reserve:68500});
  assert.ok(plan.choices.some(choice=>choice.action.id===id)||plan.rejected.some(item=>item.candidate.action?.id===id&&!item.reason.includes('本次先保留')),'strategic candidate gets an actual evaluation instead of being discarded by the rollout shortlist');
  assert.ok(!plan.rejected.some(item=>item.candidate.action?.id===id&&item.reason.includes('本次先保留')));
});
