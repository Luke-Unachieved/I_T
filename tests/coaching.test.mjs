import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { newGame, forecast, act } from '../v38/engine/game.js';
import { quote } from '../v38/engine/quotes.js';
import { coachQuoteFilters, eventCoach, pageCoach, quoteRecommendation, recordCoachDecline, recordCoachReview, recordCoachVisit } from '../v38/ui/coaching.js';
import { certProgress, decisionInfo } from '../v38/engine/expansion.js';
import { ipoProgress } from '../v38/engine/strategy.js';
import { TRADE_EVENTS } from '../v38/data/events.js';
import { launchBrowser } from './helpers/chromium.mjs';
import { currentState, loadScenario } from './helpers/scenarios.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const enabled = process.env.V38_BROWSER === '1';
const completedTour = {version:2,visited:[],active:null,skipped:true};
const remainingDevelopmentTabs=['certifications','markets','economy','rivalry','partners','board-goals','ventures','listing','company-record'];
const introIds=['orders','finance','team',...remainingDevelopmentTabs,'offwork'];
async function settleWithCoach(page, coach) {
  const before = (await currentState(page)).week;
  await page.click(`${coach} [data-ui=coach-settlement]`);
  assert.equal((await currentState(page)).week,before,'guidance only opens the footer');
  await page.click('.week-controls [data-action=end-week]');
}
const present = selector => `Boolean(document.querySelector(${JSON.stringify(selector)}))`;

// Mature fixture with actual-shaped completed contracts, diversified factory demand,
// and enough cash to protect a genuine future order cohort. Cash alone is insufficient.
function seasonedOperationsFixture(game, quotes, money=1500000, profits=Array.from({length:12},(_,i)=>25000+i*500)) {
  const state=game.newGame({difficulty:'casual',seed:381});
  const inquiry=state.inquiries.find(item=>item.id==='w1-7');
  const bid=game.act(state,{type:'bid',inquiryId:inquiry.id,source:'factory',ratio:93});
  if (bid.error) throw Error(bid.error);
  const base=game.act(bid.state,{type:'end-week'}).state.orders[0];
  if (!base) throw Error('Fixture first factory contract did not win.');
  state.week=profits.length+1;
  state.cash=money;
  const ids=['clock','carafe','stapler','umbrella'];
  state.orders=profits.flatMap((profit,index)=>[0,1].map(slot=>({ ...structuredClone(base), id:`historical-${index}-${slot}`, productId:ids[(index*2+slot)%ids.length], staffId:null, status:'settled', contractWeek:index+1, deliveredWeek:index+1, dueWeek:index+2, deliverWeek:index+1, expectedPayWeek:index+1, productionLeft:0, shippingLeft:0, total:250000, foreignTotal:250000, cost:200000, shipping:2000, deposit:50000, workingCapital:152000, profit:48000, probability:1 })));
  state.history=profits.map((profit,index)=>({week:index+1,cash:money,loan:0,receivables:0,orders:0,profit,revenue:500000,inflow:500000,outflow:500000-profit,rep:state.company.rep,macro:{...state.macro},rank:1,valuation:money}));
  state.cumulativeRevenue=state.history.reduce((sum,row)=>sum+row.revenue,0);
  state.year.deliveries=state.orders.length;
  state.year.revenue=state.cumulativeRevenue;
  state.year.profit=state.history.reduce((sum,row)=>sum+row.profit,0);
  state.tutorial.done=true;
  return state;
}

test('simple assistant picks a real profitable quote without changing game state; other levels remain quiet', () => {
  const state = newGame({ difficulty: 'casual', seed: 381 });
  const prior = structuredClone(state);
  const html = pageCoach(state, { page: 'inquiries' });
  const id = html.match(/data-ui="quote-open" data-id="([^"]+)"/)?.[1];
  const inquiry = state.inquiries.find(item => item.id === id);
  assert.ok(inquiry, 'assistant must identify an actual inquiry');
  const recommendation = quoteRecommendation(state, inquiry);
  const actual = quote(state, inquiry, recommendation.config);
  assert.equal(actual.error, undefined);
  assert.equal(actual.profit, recommendation.offer.profit);
  assert.ok(actual.profit > 0 && actual.probability > 0);
  assert.ok(forecast(state, actual).every(item => item.hypothetical >= 0));
  assert.deepEqual(state, prior);
  for (const difficulty of ['normal', 'hard']) assert.equal(pageCoach(newGame({ difficulty }), { page: 'inquiries' }), '');
});

test('easy event coaching recommends a valid free response when cash is short', () => {
  const state = newGame({ difficulty: 'casual', seed: 381 });
  state.cash = 0;
  const template = TRADE_EVENTS.find(item => item.id === 'materials');
  const event = { ...template, id: 'event-test', code: template.id, type: 'trade-event' };
  const recommendation = eventCoach(state, event, decisionInfo(state, event).choices);
  assert.equal(recommendation.id, 'open');
  assert.match(recommendation.html, /不会新增立即支出/);
});

test('team recommendation checks recent earnings and the new employee’s 12-week payroll', () => {
  const build = (money, profits) => seasonedOperationsFixture({newGame,act},{quote},money,profits);
  const ui = { page: 'company', developmentTab: 'team', coachTour: completedTour };
  const rich = build(1500000,Array(12).fill(25000));
  const recommended = pageCoach(rich, ui);
  const id = recommended.match(/data-id="([^"]+)" data-coach-action="hire"/)?.[1];
  const person = rich.candidates.find(candidate => candidate.id === id);
  assert.ok(person);
  assert.match(recommended, /建议聘用.*周薪.*新增 12 周工资.*预测最低余额/);
  const minimum = Math.min(...forecast({ ...rich, staff: [...rich.staff, person] }).map(row => row.hypothetical));
  assert.ok(recommended.includes(`¥${minimum.toLocaleString('zh-CN')}`));
  const hired=act(rich, { type: 'hire', id });
  assert.equal(hired.error,undefined);
  assert.match(pageCoach(hired.state,ui),/本周已经增加过人员/);
  assert.doesNotMatch(pageCoach(hired.state,ui),/data-coach-action="hire"/);
  const noDemand={...rich,orders:[]};
  assert.match(pageCoach(noDemand,ui),/实际业务瓶颈/);
  assert.doesNotMatch(pageCoach(noDemand,ui),/data-coach-action="hire"/);
  for (const state of [build(1500000, []), build(1500, Array(12).fill(25000)), build(1500000, [-5000,2500,-100,5000])]) {
    const deferred = pageCoach(state, ui);
    assert.match(deferred, /暂缓聘用|暂缓新支出/);
    assert.doesNotMatch(deferred, /data-coach-action="hire"/);
    assert.match(deferred, /未来 12 周最低余额|未来现金仍有缺口/);
  }
});

test('development overview compares feasible actions while local pages state when no action is needed', () => {
  const state = newGame({difficulty:'casual',seed:381});
  const overview = {page:'company',developmentTab:'finance',developmentOverview:true,coachTour:completedTour};
  const local = tab => ({page:'company',developmentTab:tab,developmentOverview:false,coachTour:completedTour});
  const unchanged = pageCoach(state, overview);
  assert.match(unchanged, /发展总览.*本周不用操作/s);
  assert.doesNotMatch(unchanged, /data-coach-tab=|data-coach-action=/);
  const mature = seasonedOperationsFixture({newGame,act},{quote});
  const team = pageCoach(mature,overview);
  assert.match(team, /建议聘用.*预测最低余额.*data-coach-tab="team"/s);
  assert.doesNotMatch(team, /data-coach-action="hire"/);
  assert.match(pageCoach(mature,local('team')), /data-coach-action="hire"/);
  const loan = {...mature, loan:10000};
  assert.match(pageCoach(loan,overview), /优先还款.*data-coach-tab="finance"/s);
  assert.match(pageCoach(loan,local('finance')), /data-coach-form="repay"/);
  for (const tab of ['finance','economy','partners','rivalry','board-goals','company-record']) {
    const advice = pageCoach(mature,local(tab));
    assert.match(advice,/本周不用操作/);
    assert.doesNotMatch(advice,/data-coach-action=|data-coach-form=/);
    assert.match(advice,/data-ui="page"|data-ui="coach-review-orders"|data-ui="coach-review-cash"|data-ui="coach-settlement"/, 'local no-action advice should still point to an onward step');
  }
});

test('development checks joint certification/market cost, sustained earnings, and real IPO proximity',()=>{
  const build=(money,profits)=>{const state=seasonedOperationsFixture({newGame,act},{quote},money,profits);state.company.rep=90;return state;};
  const certUi={page:'company',developmentTab:'certifications',coachTour:completedTour};
  const listingUi={page:'company',developmentTab:'listing',coachTour:completedTour};
  const early=build(1500000,Array(5).fill(25000));
  assert.ok(certProgress(early).find(item=>item.id==='export').available);
  assert.ok(ipoProgress(early,early.cash).actions.find(item=>item.id==='strategic-investment').available);
  assert.doesNotMatch(pageCoach(early,certUi),/data-coach-action="buy-cert"/);
  assert.doesNotMatch(pageCoach(early,listingUi),/data-coach-action="strategic-investment"/);
  const mature=build(1500000,Array(12).fill(25000));
  assert.match(pageCoach(mature,certUi),/资质与随后开拓该市场预计共需.*data-coach-action="buy-cert"/s);
  const tight={...mature,cash:490500};
  assert.ok(certProgress(tight).find(item=>item.id==='export').available,'individual cert is affordable');
  assert.doesNotMatch(pageCoach(tight,certUi),/data-coach-action="buy-cert"/,'cert plus real future market cost must fit');
  const funded={...mature,listing:{...mature.listing,stage:'funded',stake:82}};
  assert.ok(ipoProgress(funded,funded.cash).actions.find(item=>item.id==='restructure').available);
  assert.match(pageCoach(funded,listingUi),/等真实上市营收、净利与连续年度盈利/);
  assert.doesNotMatch(pageCoach(funded,listingUi),/data-coach-action="restructure"/);
});

test('assistant treats one real weekly repayment as complete but permits additional manual repayment and reassesses next week',()=>{
  const state=newGame({difficulty:'casual',seed:381});state.cash=150000;state.loan=10000;state.inquiries=[];
  const ui={page:'company',developmentTab:'finance',coachTour:completedTour,coachPrep:3};
  assert.match(pageCoach(state,ui),/data-coach-form="repay"/);
  const partial=act(state,{type:'repay',amount:3000});assert.ifError(partial.error);
  assert.equal(partial.state.period.cashBreakdown.outflow.repayment,3000);
  assert.match(pageCoach(partial.state,ui),/本周已归还 ¥3,000.*剩余贷款 ¥7,000/);
  for(const page of ['office','inquiries','orders','company','offwork']) {
    const advice=pageCoach(partial.state,{...ui,page});assert.doesNotMatch(advice,/data-coach-form="repay"|data-id="growth:repay/);
  }
  const extra=act(partial.state,{type:'repay',amount:1000});assert.ifError(extra.error);
  assert.equal(extra.state.loan,6000);
  assert.equal(extra.state.period.cashBreakdown.outflow.repayment,4000);
  assert.match(pageCoach(extra.state,ui),/本周已归还 ¥4,000.*剩余贷款 ¥6,000/);
  const next=act(extra.state,{type:'end-week'});assert.ifError(next.error);
  assert.equal(next.state.week,state.week+1);
  assert.equal(next.state.period.cashBreakdown.outflow.repayment??0,0);
  assert.match(pageCoach(next.state,ui),/data-coach-form="repay"/);
});

test('simple coaching prioritizes actionable finances and rest, can settle with no eligible quote, and does not repeat bids', () => {
  const state = newGame({ difficulty: 'casual', seed: 381 });
  const inquiry = state.inquiries.find(item => quoteRecommendation(state, item));
  const recommended = quoteRecommendation(state, inquiry);
  const submitted = act(state, { type: 'bid', inquiryId: inquiry.id, ...recommended.config }).state;
  const prep = {page:'inquiries', coachPrep:0};
  assert.match(pageCoach(submitted, prep), /首笔报价.*data-page="office" data-coach-tab="cash-forecast"/s);
  assert.match(pageCoach(submitted, prep), /data-ui="coach-skip-prep"/);
  prep.page = 'office'; assert.ok(recordCoachVisit(submitted, prep));
  assert.match(pageCoach(submitted, prep), /预测最低.*data-coach-tab="finance"/s);
  prep.page = 'company'; prep.developmentTab = 'finance'; assert.ok(recordCoachVisit(submitted, prep));
  assert.match(pageCoach(submitted, prep), /备用资金.*无需借款.*data-page="offwork"/s);
  prep.page = 'offwork'; assert.ok(recordCoachVisit(submitted, prep));
  assert.equal(prep.coachPrep, 3); assert.equal(recordCoachVisit(submitted, prep), false);
  for (const page of ['office', 'orders', 'offwork']) {
    const html = pageCoach(submitted, { page, coachPrep:3 });
    assert.match(html, /data-page="inquiries"/);
    assert.doesNotMatch(html, /data-ui="coach-settlement"/);
  }
  const continuation = pageCoach(submitted, {page:'inquiries', coachPrep:3});
  assert.match(continuation, /已报价 1\/3 笔.*预计.*建议再报.*最低余额/s);
  assert.match(continuation, /data-ui="quote-open"/);
  assert.doesNotMatch(continuation, new RegExp(`data-id="${inquiry.id}"`));
  const filtered = pageCoach(submitted, {page:'inquiries', coachPrep:3, filters:{category:'test-nonexistent', availability:'available'}});
  assert.match(filtered, /当前筛选没有合适的方案.*data-ui="coach-all-inquiries"/s);
  let filled = state;
  for (let index = 0; index < 3; index++) {
    const html = pageCoach(filled, {page:'inquiries', coachPrep:3});
    const id = html.match(/data-ui="quote-open" data-id="([^"]+)"/)?.[1];
    const next = filled.inquiries.find(item => item.id === id);
    const recommendation = quoteRecommendation(filled, next);
    assert.ok(next && recommendation && recommendation.offer.profit > 0 && !filled.bids.some(item=>item.inquiryId===id));
    assert.ok(forecast(filled,recommendation.offer).every(row=>row.hypothetical>=5500));
    const result = act(filled, { type:'bid',inquiryId:id,...recommendation.config });
    assert.equal(result.error, undefined);
    filled = result.state;
  }
  assert.equal(filled.bids.length, 3);
  const completed={page:'inquiries',coachPrep:3};
  assert.match(pageCoach(filled,completed),/核对新增现金承诺.*data-ui="coach-review-cash"/s);
  assert.equal(recordCoachReview(filled,completed,'cash'),true);
  assert.equal(recordCoachReview(filled,completed,'cash'),false);
  assert.match(pageCoach(filled,completed), /三个报价位已用完.*data-page="offwork".*data-ui="coach-settlement"/s);
  assert.doesNotMatch(pageCoach(filled, {page:'inquiries',coachPrep:3}), /data-ui="quote-open"/);
  const unsuitable = {...submitted, inquiries:submitted.inquiries.map(item=>item.id===inquiry.id ? item : {...item,minRep:101})};
  for (const page of ['inquiries','office','orders','offwork']) {
    const view={page,coachPrep:3};
    assert.match(pageCoach(unsuitable,view),/data-ui="coach-review-cash"/);
    recordCoachReview(unsuitable,view,'cash');
    const html = pageCoach(unsuitable,view);
    if (page==='inquiries'||page==='office') assert.match(html,/其余询盘暂时没有/);
    if (page!=='offwork') assert.match(html,/data-page="offwork"/);
    assert.match(html,/data-ui="coach-settlement"/);
    assert.doesNotMatch(html,/data-ui="quote-open"/);
  }
  let awarded = act(filled, {type:'end-week'}).state;
  const late = structuredClone(awarded);
  late.orders.find(order => order.total >= 8400).dueWeek = late.week;
  assert.match(pageCoach(late, {page:'inquiries',coachTour:completedTour}), /交期风险.*data-page="orders"/s);
  assert.match(pageCoach(late, {page:'orders',coachTour:completedTour}), /data-coach-action="expedite"/);
  for (let tries = 0; tries < 8 && !awarded.receivables.some(item => item.status === 'open'); tries++) {
    const result = act(awarded, {type:'end-week'}); assert.equal(result.error, undefined); awarded = result.state;
  }
  const due = awarded.receivables.find(item => item.status === 'open');
  assert.ok(due && due.dueWeek <= awarded.week);
  assert.doesNotMatch(pageCoach(awarded, {page:'inquiries',coachTour:completedTour}), /先跟进逾期应收款/);
  assert.match(pageCoach(awarded, {page:'orders',coachTour:completedTour}), /正常账期，先等待回款/);
  assert.doesNotMatch(pageCoach(awarded, {page:'orders',coachTour:completedTour}), /data-coach-action="collect"/);
  const inTerm = structuredClone(awarded);
  inTerm.receivables.find(item => item.id === due.id).dueWeek = inTerm.week + 2;
  assert.doesNotMatch(pageCoach(inTerm, {page:'inquiries',coachTour:completedTour}), /先跟进逾期应收款/);
  assert.doesNotMatch(pageCoach(inTerm, {page:'orders',coachTour:completedTour}), /data-coach-action="collect"/);
  const overdue = structuredClone(inTerm);
  const unpaid = overdue.receivables.find(item => item.id === due.id);
  unpaid.status = 'overdue'; unpaid.originalDueWeek = overdue.week - 2;
  // Postponed payment week may still be in the future. Overdue status is authoritative.
  assert.match(pageCoach(overdue, {page:'inquiries',coachTour:completedTour}), /逾期应收款.*data-page="orders".*data-coach-tab="orders-receivables"/s);
  assert.match(pageCoach(overdue, {page:'orders',coachTour:completedTour}), /data-coach-action="collect"/);
  for(const page of ['office','inquiries','company','offwork'])assert.match(pageCoach(overdue,{page,coachTour:completedTour}),/逾期应收款.*data-coach-tab="orders-receivables"/s);
  const optional={page:'orders',coachTour:completedTour};
  assert.equal(recordCoachDecline(overdue,optional,'tasks',`order:collect:${unpaid.id}`),true);
  assert.match(pageCoach(overdue,optional),/你选择本周暂缓催款/);
  assert.doesNotMatch(pageCoach(overdue,optional),/data-coach-action="collect"/);
  const debt=structuredClone(inTerm);debt.cash=200000;
  const bad=debt.receivables.find(item=>item.id===due.id);bad.status='bad-debt';bad.insuranceDueWeek=null;bad.amount=Math.max(bad.amount,10000);
  for(const page of ['office','inquiries','company','offwork'])assert.match(pageCoach(debt,{page,coachTour:completedTour}),/坏账可以尝试追回.*data-coach-tab="orders-receivables"/s);
  assert.match(pageCoach(debt,{page:'orders',coachTour:completedTour}),/data-coach-action="sue"/);
  const competing = structuredClone(overdue);
  competing.receivables.unshift({ ...unpaid, id: 'newer-overdue', amount: unpaid.amount * 2, originalDueWeek: overdue.week - 1 });
  assert.ok(pageCoach(competing, {page:'orders',coachTour:completedTour}).includes(`data-id="${unpaid.id}" data-coach-action="collect"`));
  const reminded = structuredClone(overdue);
  reminded.receivables.find(item => item.id === due.id).reminderWeek = reminded.week;
  assert.doesNotMatch(pageCoach(reminded, {page:'orders',coachTour:completedTour}), /data-coach-action="collect"/);
  const emergency = structuredClone(inTerm); emergency.cash = -100;
  assert.match(pageCoach(emergency, {page:'orders',coachTour:completedTour}), /data-coach-action="factor"/);
  assert.doesNotMatch(pageCoach(emergency, {page:'orders',coachTour:completedTour}), /data-coach-action="collect"/);
  const noQuotes = { ...state, inquiries: [] };
  assert.match(pageCoach(noQuotes, { page: 'inquiries' }), /data-ui="coach-settlement"/);
  const crisis = newGame({ difficulty:'casual', seed:381 });
  crisis.cash = -100;
  crisis.creditLine = 0;
  assert.match(pageCoach(crisis,{page:'inquiries'}), /暂停新增支出/);
  assert.doesNotMatch(pageCoach(crisis,{page:'inquiries'}), /data-ui="coach-settlement"|data-ui="quote-open"/);
  const credit = { ...crisis, creditLine: 30000 };
  assert.match(pageCoach(credit, {page:'inquiries'}), /data-page="company" data-coach-tab="finance"/);
  const tired = newGame({difficulty:'casual', seed:381}); tired.energy = 15;
  assert.match(pageCoach(tired, {page:'inquiries'}), /精力偏低.*data-page="offwork"/s);
  assert.match(pageCoach(tired, {page:'offwork'}), /恢复 \d+ 点精力.*(?:data-coach-action="outing"|data-ui="coach-select-outing")/s);
});

for (const viewport of [{ width: 1440, height: 1000 }, { width: 320, height: 568, mobile: true }]) {
  test(`real Chromium simple assistant guides each section and can fill a quote at ${viewport.width}px`, { skip: !enabled, timeout: 120_000 }, async () => {
    const browser = await launchBrowser(root, { scenarios: true });
    try {
      const page = await browser.page(viewport);
      await page.goto();
      await page.waitFor(present('[data-form="new-game"]'));
      await loadScenario(page, `(game)=>game.newGame({difficulty:'casual',seed:381})`);
      await page.waitFor(present('.workspace > .coach-card'));
      const labels = ['office','orders','offwork','company','inquiries'];
      for (const id of labels) {
        await page.click(`.nav [data-page="${id}"]`);
        assert.ok(await page.evaluate(present('.workspace > .coach-card')));
        const overflow = await page.evaluate('document.documentElement.scrollWidth-innerWidth');
        assert.ok(overflow <= 1, `${id} overflows by ${overflow}px`);
      }
      await page.click('.workspace > .coach-card [data-ui="quote-open"]');
      await page.waitFor(present('dialog[open] [data-quote-preview="coach"]'));
      await page.screenshot(`/tmp/trade-v38-coach-quote-${viewport.width}.png`);
      const canApply = await page.evaluate(present('dialog [data-ui="coach-apply-quote"]'));
      if (canApply) await page.click('dialog [data-ui="coach-apply-quote"]');
      assert.match(await page.evaluate('document.querySelector("dialog .coach-card").innerText'), /已采用当前建议方案/);
      assert.equal((await currentState(page)).bids.length, 0);
      assert.equal(await page.evaluate('document.querySelector("dialog button[type=submit]").disabled'), false);
      await page.click('dialog [data-ui="close-dialog"]');
      await page.click('.nav [data-page="company"]');
      for (const id of ['finance','team','certifications','markets','economy','rivalry','partners','board-goals','ventures','listing','company-record']) {
        await page.click(`[data-ui="development-tab"][data-id="${id}"]`);
        assert.ok(await page.evaluate(present('.workspace > .coach-card')));
      }
      await loadScenario(page, `(game)=>{const s=game.newGame({difficulty:'casual',seed:381});s.events=[{id:'test-event',type:'trade-event',code:'materials',title:'供应商调价通知',text:'供应商调价',choices:[{id:'reserve',label:'锁定采购价',cost:700,policy:{weeks:5,materialDelta:-12}},{id:'open',label:'按现价采购',macro:{materials:7}}]}];return s;}`);
      await page.click('.workspace > .coach-card [data-ui="show-event"]');
      await page.waitFor(present('dialog .coach-card'));
      assert.equal(await page.evaluate('document.querySelectorAll("dialog [data-action=resolve-event].primary").length'), 1);
      await page.click('dialog [data-action=resolve-event].primary');
      assert.equal((await currentState(page)).events.length, 0);
      await loadScenario(page, `(game)=>{const s=game.newGame({difficulty:'casual',seed:381});s.energy=15;return s;}`);
      await page.click('.workspace > .coach-card [data-page="offwork"]');
      const detailed = await page.evaluate(present('.workspace > .coach-card [data-ui="coach-select-outing"]'));
      if (detailed) {
        const detail = await page.evaluate(`(()=>{const button=document.querySelector('.workspace > .coach-card [data-ui="coach-select-outing"]');return {id:button.dataset.id, choice:button.dataset.choice};})()`);
        await page.click('.workspace > .coach-card [data-ui="coach-select-outing"]');
        assert.equal(await page.evaluate(`(()=>{const form=[...document.querySelectorAll('form[data-outing-id]')].find(item=>item.dataset.outingId===${JSON.stringify(detail.id)});return form.querySelector('input[name=choiceId]:checked').value;})()`), detail.choice);
      } else await page.click('.workspace > .coach-card [data-ui="coach-target"][data-coach-action="outing"]');
      assert.equal((await currentState(page)).energy, 15, 'reviewing a rest option must not spend or rest yet');
      assert.deepEqual(page.errors, []);
    } finally { await browser.close(); }
  });
}

for (const viewport of [{ width: 320, height: 568, mobile: true }, { width: 390, height: 844, mobile: true }]) {
  test(`simple coach first-order workflow follows the actual controls at ${viewport.width}px`, { skip: !enabled, timeout: 120_000 }, async () => {
    const browser = await launchBrowser(root, { scenarios: true });
    try {
      const page = await browser.page(viewport);
      await page.goto();
      await page.waitFor(present('[data-form="new-game"]'));
      await loadScenario(page, `(game)=>game.newGame({difficulty:'casual',seed:381})`);
      const coach = '.workspace > .coach-card';
      await page.click(`${coach} [data-page="inquiries"]`);
      await page.click(`${coach} [data-ui="quote-open"]`);
      await page.waitFor(present('dialog [data-quote-preview="coach"]'));
      if (await page.evaluate(present('dialog [data-ui="coach-apply-quote"]'))) await page.click('dialog [data-ui="coach-apply-quote"]');
      await page.waitFor(present('dialog [data-ui="coach-review-submit"]'));
      await page.click('dialog [data-ui="coach-review-submit"]');
      assert.equal(await page.evaluate('document.activeElement.matches("form[data-form=quote] button[type=submit]")'), true);
      assert.equal((await currentState(page)).bids.length, 0);
      const location = await page.evaluate(`(()=>{const b=document.activeElement.getBoundingClientRect(),d=document.querySelector('dialog').getBoundingClientRect();return { visible:b.top>=d.top&&b.bottom<=d.bottom };})()`);
      assert.equal(location.visible,true);
      await page.click('dialog form[data-form="quote"] button[type="submit"]');
      assert.equal((await currentState(page)).bids.length, 1);
      assert.equal(await page.evaluate('document.activeElement.dataset.page'), 'office');
      assert.equal(await page.evaluate('Boolean(document.querySelector("[data-tour=end-week].tutorial-target"))'), false);
      await page.click(`${coach} [data-page="office"][data-coach-tab="cash-forecast"]`);
      assert.equal(await page.evaluate('document.activeElement.matches(".forecast-panel h2")'), true);
      assert.match(await page.evaluate('document.querySelector(".forecast-panel").innerText'), /已提交报价全部中单/);
      await page.screenshot(`/tmp/v38-coach-first-bid-cash-${viewport.width}.png`);
      await page.click('.forecast-panel [data-coach-tab="finance"]');
      assert.match(await page.evaluate(`document.querySelector('${coach}').innerText`), /备用资金.*无需借款/s);
      assert.equal((await currentState(page)).loan, 0);
      await page.click(`${coach} [data-page="offwork"]`);
      assert.equal(await page.evaluate(`JSON.parse(localStorage.getItem('trade-tycoon:weekly:v38:v1')).view.coachPrep`), 3);
      await page.click(`${coach} [data-page="inquiries"]`);
      assert.match(await page.evaluate(`document.querySelector('${coach}').innerText`), /建议再报 2 笔.*估算收益.*最低余额/s);
      await page.screenshot(`/tmp/v38-coach-multi-quote-${viewport.width}.png`);
      const ids = [(await currentState(page)).bids[0].inquiryId];
      for (let index=1; index<3;index++) {
        const next = await page.evaluate(`document.querySelector('${coach} [data-ui="quote-open"]').dataset.id`);
        assert.ok(!ids.includes(next)); ids.push(next);
        await page.click(`${coach} [data-ui="quote-open"]`);
        if (await page.evaluate(present('dialog [data-ui="coach-apply-quote"]'))) await page.click('dialog [data-ui="coach-apply-quote"]');
        await page.click('dialog [data-ui="coach-review-submit"]');
        assert.equal((await currentState(page)).bids.length,index);
        await page.click('dialog form[data-form="quote"] button[type="submit"]');
        assert.equal((await currentState(page)).bids.length,index+1);
      }
      await page.click(`${coach} [data-ui="coach-review-cash"]`);
      await page.waitFor(present('.forecast-panel [data-ui="coach-review-next"]'));
      await page.click('.forecast-panel [data-ui="coach-review-next"]');
      await page.waitFor(present(`${coach} [data-ui="coach-settlement"]`));
      assert.match(await page.evaluate(`document.querySelector('${coach}').innerText`),/三个报价位已用完/);
      assert.ok(await page.evaluate(present(`${coach} [data-page="offwork"]`)));
      await settleWithCoach(page, coach);
      await page.waitFor(present('dialog [data-ui="view-first-order"]'));
      assert.equal((await currentState(page)).week, 2);
      assert.ok((await currentState(page)).orders.length > 0);
      await page.click('dialog [data-ui="view-first-order"]');
      assert.match(await page.evaluate('document.querySelector("#page-title").innerText'), /订单/);
      await page.click(`${coach} [data-coach-tab="finance"]`);
      await page.waitFor(present(`${coach} [data-coach-tab="team"]`));
      await page.click(`${coach} [data-coach-tab="team"]`);
      assert.match(await page.evaluate(`document.querySelector('${coach}').innerText`), /暂缓聘用/);
      for(const tab of remainingDevelopmentTabs) {
        await page.click(`${coach} [data-coach-tab="${tab}"]`);
        assert.equal(await page.evaluate('document.querySelector("[data-development-panel]").dataset.developmentPanel'),tab);
      }
      await page.click(`${coach} [data-page="offwork"]`);
      assert.match(await page.evaluate('document.querySelector("#page-title").innerText'), /下班/);
      await page.click(`${coach} [data-ui=coach-finish-intro]`);
      await page.click(`${coach} [data-page="inquiries"]`);
      assert.ok(await page.evaluate(present(`${coach} [data-ui="quote-open"]`)), 'the completed orientation returns to a real quote');
      assert.deepEqual(new Set(await page.evaluate(`JSON.parse(localStorage.getItem('trade-tycoon:weekly:v38:v1')).view.coachTour.visited`)),new Set(introIds));
      // A single feasible inquiry must not prompt unnecessary extra offers.
      await loadScenario(page,`(game)=>{const s=game.newGame({difficulty:'casual',seed:381});s.inquiries=s.inquiries.map(item=>item.id==='w1-7'?item:{...item,minRep:101});return s;}`);
      await page.click(`${coach} [data-page="inquiries"]`);
      await page.click(`${coach} [data-ui="quote-open"]`);
      if (await page.evaluate(present('dialog [data-ui="coach-apply-quote"]'))) await page.click('dialog [data-ui="coach-apply-quote"]');
      await page.click('dialog [data-ui="coach-review-submit"]');
      await page.click('dialog form[data-form="quote"] button[type="submit"]');
      await page.click(`${coach} [data-ui="coach-skip-prep"]`);
      await page.click(`${coach} [data-ui="coach-review-cash"]`);
      await page.click('.forecast-panel [data-ui="coach-review-next"]');
      assert.match(await page.evaluate(`document.querySelector('${coach}').innerText`),/不必为了用完报价位.*其余询盘暂时没有/s);
      assert.equal(await page.evaluate(present(`${coach} [data-ui="quote-open"]`)),false);
      await page.screenshot(`/tmp/v38-coach-no-extra-quote-${viewport.width}.png`);
      await settleWithCoach(page, coach);
      assert.equal((await currentState(page)).week,2);
      assert.deepEqual(page.errors, []);
    } finally { await browser.close(); }
  });
}

test('real Chromium generic development gives overview, active and targeted tabs give local advice', {skip:!enabled,timeout:120_000}, async()=>{
  const browser = await launchBrowser(root,{scenarios:true});
  try {
    const page = await browser.page({width:390,height:844,mobile:true});
    const coach='.workspace > .coach-card';
    await page.goto();
    await page.waitFor(present('[data-form="new-game"]'));
    await loadScenario(page,`(game,quotes)=>(${seasonedOperationsFixture.toString()})(game,quotes)`);
    await page.click('.nav [data-page="company"]');
    assert.match(await page.evaluate(`document.querySelector('${coach}').innerText`), /发展总览.*建议聘用/s);
    assert.ok(await page.evaluate(present(`${coach} [data-coach-tab="team"]`)));
    await page.screenshot('/tmp/v38-coach-development-overview-390.png');
    await page.click(`${coach} [data-coach-tab="team"]`);
    assert.match(await page.evaluate(`document.querySelector('${coach}').innerText`), /认识团队.*业务员.*建议聘用/s);
    assert.ok(await page.evaluate(present(`${coach} [data-coach-action="hire"]`)));
    assert.ok(await page.evaluate(present(`${coach} [data-ui="page"][data-page="orders"]`)), 'the optional introduction can continue without hiring');
    await page.click('[data-ui="development-tab"][data-id="finance"]');
    assert.match(await page.evaluate(`document.querySelector('${coach}').innerText`), /认识财务.*银行授信/s);
    await page.click(`${coach} [data-ui="coach-skip-intro"]`);
    assert.match(await page.evaluate(`document.querySelector('${coach}').innerText`), /本周不用操作/);
    assert.equal(await page.evaluate(present(`${coach} [data-coach-form],${coach} [data-coach-action]`)),false);
    assert.equal(await page.evaluate(`JSON.parse(localStorage.getItem('trade-tycoon:weekly:v38:v1')).view.developmentOverview`),false);
    await page.click('.nav [data-page="company"]');
    await page.click(`${coach} [data-coach-tab="team"]`);
    assert.equal(await page.evaluate('document.querySelector("[data-ui=development-tab][data-id=team]").getAttribute("aria-pressed")'),'true');
    assert.ok(await page.evaluate(present(`${coach} [data-coach-action="hire"]`)));
    await page.click(`${coach} [data-coach-action="hire"]`);
    assert.equal(await page.evaluate('document.activeElement.dataset.action'),'hire');
    await page.click('[data-ui="development-tab"][data-id="economy"]');
    assert.match(await page.evaluate(`document.querySelector('${coach}').innerText`), /本周不用操作/);
    assert.equal(await page.evaluate(present(`${coach} [data-coach-form],${coach} [data-coach-action]`)),false);
    assert.deepEqual(page.errors,[]);
  }finally{await browser.close()}
});

test('real Chromium assistant pre-fills recommended loan and repayment amounts without executing them', {skip:!enabled,timeout:120_000}, async()=>{
  const browser=await launchBrowser(root,{scenarios:true});
  try {
    const page=await browser.page({width:390,height:844,mobile:true});
    const coach='.workspace > .coach-card';
    await page.goto();
    await page.waitFor(present('[data-form="new-game"]'));
    await loadScenario(page,`(game)=>{const s=game.newGame({difficulty:'casual',seed:381});s.cash=150000;s.loan=10000;return s;}`);
    await page.click('.nav [data-page="company"]');
    await page.click(`${coach} [data-coach-tab="finance"]`);
    const repayment=Number(await page.evaluate(`document.querySelector('${coach} [data-coach-form="repay"]').dataset.coachAmount`));
    const before=await currentState(page);
    assert.ok(repayment>0 && repayment<=before.loan);
    await page.click(`${coach} [data-coach-form="repay"]`);
    assert.equal(Number(await page.evaluate('document.querySelector("form[data-form=repay] input[name=amount]").value')),repayment);
    assert.equal((await currentState(page)).loan,before.loan);
    await page.screenshot('/tmp/v38-coach-repay-prefill-390.png');
    await page.click('form[data-form="repay"] button[type="submit"]');
    assert.equal((await currentState(page)).loan,before.loan-repayment);
    await loadScenario(page,`(game)=>{const s=game.newGame({difficulty:'casual',seed:381});s.cash=-250;s.creditLine=30000;return s;}`);
    await page.click(`${coach} [data-page="company"][data-coach-tab="finance"]`);
    const borrowing=Number(await page.evaluate(`document.querySelector('${coach} [data-coach-form="borrow"]').dataset.coachAmount`));
    assert.ok(borrowing>0 && borrowing<=30000);
    await page.click(`${coach} [data-coach-form="borrow"]`);
    assert.equal(Number(await page.evaluate('document.querySelector("form[data-form=borrow] input[name=amount]").value')),borrowing);
    assert.equal((await currentState(page)).loan,0);
    assert.equal((await currentState(page)).cash,-250);
    await page.click('form[data-form="borrow"] button[type="submit"]');
    assert.equal((await currentState(page)).loan,borrowing);
    assert.equal((await currentState(page)).cash,borrowing-250);
    assert.deepEqual(page.errors,[]);
  }finally{await browser.close()}
});
