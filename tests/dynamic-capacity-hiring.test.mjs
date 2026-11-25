import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import * as game from '../v38/engine/game.js';
import { quote, quoteCapacity } from '../v38/engine/quotes.js';
import { pageCoach } from '../v38/ui/coaching.js';
import { launchBrowser } from './helpers/chromium.mjs';
import { currentState, loadScenario } from './helpers/scenarios.mjs';
import { SAVE_KEY } from '../v38/ui/save.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const enabled=process.env.V38_BROWSER==='1';
const view={page:'company',developmentTab:'team',developmentOverview:false,coachTour:{version:2,visited:[],skipped:true,active:null},coachPrep:3};

// The prior contracts are seeded, based on a real awarded order. Today's
// bids are genuine engine submissions, so capacity and the new opportunity
// follow exactly the same validation as a player's ordinary live game.
function matureCapacityFixture(game,quotes,extraQuantity=8) {
  const base=game.newGame({difficulty:'casual',seed:381});
  const first=game.act(base,{type:'bid',inquiryId:'w1-7',source:'factory',ratio:93});
  const won=game.act(first.state,{type:'end-week'}).state.orders[0];
  if(!won)throw Error('Expected actual awarded contract');
  base.week=13;base.cash=500000;base.company.rep=64;base.tutorial.done=true;
  base.inquiries=base.inquiries.map(item=>({...item,week:13,dueWeek:item.dueWeek+12,expiresWeek:item.expiresWeek+12}));
  base.orders=Array.from({length:48},(_,i)=>{
    const week=Math.floor(i/4)+1;
    return {...structuredClone(won),id:`history-${i}`,source:'stock',status:'settled',probability:1,staffId:null,contractWeek:week,deliveredWeek:week,dueWeek:week+1,deliverWeek:week,expectedPayWeek:week,productionLeft:0,shippingLeft:0};
  });
  base.history=Array.from({length:12},(_,i)=>({week:i+1,cash:500000,loan:0,receivables:0,orders:0,profit:8000,revenue:32000,inflow:32000,outflow:24000,rep:64,macro:{...base.macro},rank:1,valuation:500000}));
  base.year.deliveries=48;base.year.revenue=384000;base.year.profit=96000;base.cumulativeRevenue=384000;
  let state=base;
  for(const id of ['w1-7','w1-1','w1-4','w1-5','w1-2']){
    const inquiry=state.inquiries.find(item=>item.id===id);
    const source=quotes.quote(state,inquiry,{source:'factory',ratio:93}).error?'stock':'factory';
    const result=game.act(state,{type:'bid',inquiryId:id,source,ratio:93});
    if(result.error)throw Error(result.error);
    state=result.state;
  }
  state.inquiries=state.inquiries.map(item=>state.bids.some(bid=>bid.inquiryId===item.id)?item:{...item,quantity:item.quantity*extraQuantity,terms:0});
  return state;
}

test('sales hire for expanded capacity needs recurring profitable demand, safe actual opportunities and positive future comparison',()=>{
  const state=matureCapacityFixture(game,{quote});
  assert.equal(quoteCapacity(state),5);
  assert.equal(state.bids.length,5);
  const before=structuredClone(state);
  const recommendation=pageCoach(state,view);
  assert.match(recommendation,/建议聘用.*业务员.*近 12 周已有 12 周.*报价能力从 5 笔增至 7 笔.*模拟聘用后，可再考虑 2 笔.*周薪.*12 周工资.*data-coach-action="hire"/s);
  const id=recommendation.match(/data-id="([^"]+)" data-coach-action="hire"/)?.[1];
  assert.ok(state.candidates.some(person=>person.id===id&&person.role==='sales'));
  assert.deepEqual(state,before,'calculating the hire must leave the actual business unchanged');
  const hired=game.act(state,{type:'hire',id});
  assert.ifError(hired.error);
  assert.equal(quoteCapacity(hired.state),7);
  assert.equal(hired.state.bids.length,5,'hiring does not automatically submit the two additional possible offers');
  assert.match(pageCoach(hired.state,{...view,page:'inquiries'}),/data-ui="quote-open"/);
  assert.doesNotMatch(pageCoach(hired.state,view),/data-coach-action="hire"/);

  // A full week alone is insufficient. Keep one busy historical contract
  // cohort and ordinary profitable weeks, but remove repeated near-capacity.
  const oneOff={...state,orders:state.orders.filter((item,i)=>i%4===0||item.contractWeek===12)};
  assert.equal(oneOff.bids.length,quoteCapacity(oneOff));
  assert.doesNotMatch(pageCoach(oneOff,view),/data-coach-action="hire"|报价能力从 5 笔增至 7 笔/);
  const shortCash={...state,cash:18000,creditLine:0};
  assert.doesNotMatch(pageCoach(shortCash,view),/data-coach-action="hire"/);
  // With ordinary small extra inquiries the actual multi-week comparison
  // does not pay for the permanent extra salary, despite repeat demand.
  const lowBenefit=matureCapacityFixture(game,{quote},1);
  assert.match(pageCoach(lowBenefit,view),/新增报价能力在未来几周的比较中还没有带来高于暂缓招聘的收益/);
  assert.doesNotMatch(pageCoach(lowBenefit,view),/data-coach-action="hire"/);
  const withdrew=game.act(state,{type:'withdraw-bid',inquiryId:state.bids[0].inquiryId});
  assert.ifError(withdrew.error);
  assert.equal(withdrew.state.bids.length,4);
  assert.doesNotMatch(pageCoach(withdrew.state,view),/data-coach-action="hire"/);
});

test('real simple-mode team hire expands displayed capacity without submitting a quote, then resumes the next viable inquiry',{skip:!enabled,timeout:120000},async()=>{
  const browser=await launchBrowser(root,{scenarios:true});
  try {
    const page=await browser.page({width:390,height:844,mobile:true});
    await page.goto();
    await page.waitFor('Boolean(document.querySelector("[data-form=new-game]"))');
    await loadScenario(page,`(${matureCapacityFixture.toString()})`);
    await page.click('.nav [data-page=inquiries]');
    assert.match(await page.evaluate('document.querySelector(".inquiry-sent-link").innerText'),/本周已报价 5 \/ 5/);
    await page.click('.nav [data-page=company]');
    await page.click('[data-ui=development-tab][data-id=team]');
    const coach='.workspace > .coach-card';
    const actual=await currentState(page);
    const recommendation=await page.evaluate(`document.querySelector('${coach}').innerText`);
    assert.match(recommendation,/报价能力从 5 笔增至 7 笔/);
    const id=await page.evaluate(`document.querySelector('${coach} [data-coach-action=hire]').dataset.id`);
    await page.screenshot('/tmp/v38-capacity-recommend-hire-390.png');
    await page.click(`${coach} [data-coach-action=hire]`);
    assert.deepEqual(await currentState(page),actual,'reviewing the highlighted candidate does not hire');
    await page.click(`[data-action=hire][data-id="${id}"]:not(:disabled)`);
    const hired=await currentState(page);
    assert.equal(hired.staff.length,actual.staff.length+1);
    assert.deepEqual(hired.bids,actual.bids);
    await page.click('.nav [data-page=inquiries]');
    assert.match(await page.evaluate('document.querySelector(".inquiry-sent-link").innerText'),/本周已报价 5 \/ 7/);
    assert.ok(await page.evaluate(`Boolean(document.querySelector('${coach} [data-ui=quote-open]'))`));
    await page.screenshot('/tmp/v38-capacity-expanded-inquiry-390.png');
    const next=await page.evaluate(`document.querySelector('${coach} [data-ui=quote-open]').dataset.id`);
    assert.ok(!actual.bids.some(bid=>bid.inquiryId===next));
    await page.click(`${coach} [data-ui=quote-open]`);
    if(await page.evaluate('Boolean(document.querySelector("dialog [data-ui=coach-apply-quote]"))'))await page.click('dialog [data-ui=coach-apply-quote]');
    assert.equal((await currentState(page)).bids.length,5);
    await page.click('dialog form[data-form=quote] button[type=submit]');
    assert.equal((await currentState(page)).bids.length,6);
    assert.match(await page.evaluate('document.querySelector(".inquiry-sent-link").innerText'),/本周已报价 6 \/ 7/);
    assert.ok(await page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'));
    assert.deepEqual(page.errors,[]);
  }finally{await browser.close();}
});
