import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { newGame, forecast, act } from '../v38/engine/game.js';
import { quote } from '../v38/engine/quotes.js';
import { eventCoach, pageCoach, quoteRecommendation } from '../v38/ui/coaching.js';
import { decisionInfo } from '../v38/engine/expansion.js';
import { TRADE_EVENTS } from '../v38/data/events.js';
import { launchBrowser } from './helpers/chromium.mjs';
import { currentState, loadScenario } from './helpers/scenarios.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const enabled = process.env.V38_BROWSER === '1';
const present = selector => `Boolean(document.querySelector(${JSON.stringify(selector)}))`;

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
  const build = (money, profits) => {
    const state = newGame({ difficulty: 'casual', seed: 381 });
    state.cash = money;
    state.history = profits.map((profit, index) => ({ week: index + 1, profit, revenue: 10000 }));
    return state;
  };
  const ui = { page: 'company', developmentTab: 'team', coachIntro: 4 };
  const rich = build(150000, [5000, 6000, 4000, 5000]);
  const recommended = pageCoach(rich, ui);
  const id = recommended.match(/data-id="([^"]+)" data-coach-action="hire"/)?.[1];
  const person = rich.candidates.find(candidate => candidate.id === id);
  assert.ok(person);
  assert.match(recommended, /建议聘用.*周薪.*新增 12 周工资.*预测最低余额/);
  const minimum = Math.min(...forecast({ ...rich, staff: [...rich.staff, person] }).map(row => row.hypothetical));
  assert.ok(recommended.includes(`¥${minimum.toLocaleString('zh-CN')}`));
  assert.equal(act(rich, { type: 'hire', id }).error, undefined);
  for (const state of [build(150000, []), build(1500, [5000,5000,5000,5000]), build(150000, [-5000,2500,-100,5000])]) {
    const deferred = pageCoach(state, ui);
    assert.match(deferred, /暂缓聘用/);
    assert.doesNotMatch(deferred, /data-coach-action="hire"/);
    assert.match(deferred, /未来 12 周最低余额/);
  }
});

test('development overview compares feasible actions while local pages state when no action is needed', () => {
  const state = newGame({difficulty:'casual',seed:381});
  const overview = {page:'company',developmentTab:'finance',developmentOverview:true,coachIntro:4};
  const local = tab => ({page:'company',developmentTab:tab,developmentOverview:false,coachIntro:4});
  const unchanged = pageCoach(state, overview);
  assert.match(unchanged, /发展总览.*本周不用操作/s);
  assert.doesNotMatch(unchanged, /data-coach-tab=|data-coach-action=/);
  const mature = {...state, cash:150000, history:[0,1,2,3].map(index=>({week:index+1,profit:5000,revenue:10000}))};
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
    assert.doesNotMatch(advice,/data-coach-tab=|data-coach-action=|data-coach-form=|data-ui="page"/);
  }
});

test('simple coaching prioritizes actionable finances and rest, can settle with no eligible quote, and does not repeat bids', () => {
  const state = newGame({ difficulty: 'casual', seed: 381 });
  const inquiry = state.inquiries.find(item => quoteRecommendation(state, item));
  const recommended = quoteRecommendation(state, inquiry);
  const submitted = act(state, { type: 'bid', inquiryId: inquiry.id, ...recommended.config }).state;
  for (const page of ['office', 'inquiries']) {
    const html = pageCoach(submitted, { page });
    assert.match(html, /data-action="end-week">结束本周，查看结果/);
    assert.doesNotMatch(html, /data-ui="quote-open"/);
  }
  let filled = state;
  for (let index = 0; index < 3; index++) {
    const item = filled.inquiries.map(inquiry => ({ inquiry, recommendation: quoteRecommendation(filled, inquiry) }))
      .filter(item => item.recommendation).sort((a,b) => b.recommendation.score-a.recommendation.score)[0];
    const result = act(filled, { type:'bid',inquiryId:item.inquiry.id,...item.recommendation.config });
    assert.equal(result.error, undefined);
    filled = result.state;
  }
  assert.equal(filled.bids.length, 3);
  assert.match(pageCoach(filled, {page:'inquiries'}), /data-action="end-week"/);
  assert.doesNotMatch(pageCoach(filled, {page:'inquiries'}), /data-ui="quote-open"/);
  let awarded = act(filled, {type:'end-week'}).state;
  const late = structuredClone(awarded);
  late.orders.find(order => order.total >= 8400).dueWeek = late.week;
  assert.match(pageCoach(late, {page:'inquiries',coachIntro:4}), /交期风险.*data-page="orders"/s);
  assert.match(pageCoach(late, {page:'orders',coachIntro:4}), /data-coach-action="expedite"/);
  for (let tries = 0; tries < 8 && !awarded.receivables.some(item => item.status === 'open'); tries++) {
    const result = act(awarded, {type:'end-week'}); assert.equal(result.error, undefined); awarded = result.state;
  }
  const due = awarded.receivables.find(item => item.status === 'open');
  assert.ok(due && due.dueWeek <= awarded.week);
  assert.doesNotMatch(pageCoach(awarded, {page:'inquiries',coachIntro:4}), /先跟进逾期应收款/);
  assert.match(pageCoach(awarded, {page:'orders',coachIntro:4}), /正常账期，先等待回款/);
  assert.doesNotMatch(pageCoach(awarded, {page:'orders',coachIntro:4}), /data-coach-action="collect"/);
  const inTerm = structuredClone(awarded);
  inTerm.receivables.find(item => item.id === due.id).dueWeek = inTerm.week + 2;
  assert.doesNotMatch(pageCoach(inTerm, {page:'inquiries',coachIntro:4}), /先跟进逾期应收款/);
  assert.doesNotMatch(pageCoach(inTerm, {page:'orders',coachIntro:4}), /data-coach-action="collect"/);
  const overdue = structuredClone(inTerm);
  const unpaid = overdue.receivables.find(item => item.id === due.id);
  unpaid.status = 'overdue'; unpaid.originalDueWeek = overdue.week - 2;
  // Postponed payment week may still be in the future. Overdue status is authoritative.
  assert.match(pageCoach(overdue, {page:'inquiries',coachIntro:4}), /逾期应收款.*data-page="orders".*data-coach-tab="orders-receivables"/s);
  assert.match(pageCoach(overdue, {page:'orders',coachIntro:4}), /data-coach-action="collect"/);
  const competing = structuredClone(overdue);
  competing.receivables.unshift({ ...unpaid, id: 'newer-overdue', amount: unpaid.amount * 2, originalDueWeek: overdue.week - 1 });
  assert.ok(pageCoach(competing, {page:'orders',coachIntro:4}).includes(`data-id="${unpaid.id}" data-coach-action="collect"`));
  const reminded = structuredClone(overdue);
  reminded.receivables.find(item => item.id === due.id).reminderWeek = reminded.week;
  assert.doesNotMatch(pageCoach(reminded, {page:'orders',coachIntro:4}), /data-coach-action="collect"/);
  const emergency = structuredClone(inTerm); emergency.cash = -100;
  assert.match(pageCoach(emergency, {page:'orders',coachIntro:4}), /data-coach-action="factor"/);
  assert.doesNotMatch(pageCoach(emergency, {page:'orders',coachIntro:4}), /data-coach-action="collect"/);
  const noQuotes = { ...state, inquiries: [] };
  assert.match(pageCoach(noQuotes, { page: 'inquiries' }), /data-action="end-week"/);
  const crisis = newGame({ difficulty:'casual', seed:381 });
  crisis.cash = -100;
  crisis.creditLine = 0;
  assert.match(pageCoach(crisis,{page:'inquiries'}), /暂停新增支出/);
  assert.doesNotMatch(pageCoach(crisis,{page:'inquiries'}), /data-action="end-week"|data-ui="quote-open"/);
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
      await page.waitFor(present(`${coach} [data-action="end-week"]`));
      await page.click(`${coach} [data-action="end-week"]`);
      await page.waitFor(present('dialog [data-ui="view-first-order"]'));
      assert.equal((await currentState(page)).week, 2);
      assert.ok((await currentState(page)).orders.length > 0);
      await page.click('dialog [data-ui="view-first-order"]');
      assert.match(await page.evaluate('document.querySelector("#page-title").innerText'), /订单/);
      await page.click(`${coach} [data-coach-tab="finance"]`);
      await page.waitFor(present(`${coach} [data-coach-tab="team"]`));
      await page.click(`${coach} [data-coach-tab="team"]`);
      assert.match(await page.evaluate(`document.querySelector('${coach}').innerText`), /暂缓聘用/);
      await page.click(`${coach} [data-page="offwork"]`);
      assert.match(await page.evaluate('document.querySelector("#page-title").innerText'), /下班/);
      assert.match(await page.evaluate(`document.querySelector('${coach}').innerText`), /精力充足/);
      await page.click(`${coach} [data-page="inquiries"]`);
      assert.ok(await page.evaluate(present(`${coach} [data-ui="quote-open"]`)), 'the completed orientation returns to a real quote');
      assert.equal(await page.evaluate(`JSON.parse(localStorage.getItem('trade-tycoon:weekly:v38:v1')).view.coachIntro`), 4);
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
    await loadScenario(page,`(game)=>{const s=game.newGame({difficulty:'casual',seed:381});s.cash=150000;s.week=5;s.history=[1,2,3,4].map(week=>({week,cash:130000+week*5000,loan:0,receivables:0,orders:0,profit:5000,revenue:10000,inflow:10000,outflow:5000,rep:s.company.rep,macro:{...s.macro},rank:1,valuation:100000}));s.tutorial.done=true;return s;}`);
    await page.click('.nav [data-page="company"]');
    assert.match(await page.evaluate(`document.querySelector('${coach}').innerText`), /发展总览.*建议聘用/s);
    assert.ok(await page.evaluate(present(`${coach} [data-coach-tab="team"]`)));
    await page.screenshot('/tmp/v38-coach-development-overview-390.png');
    await page.click('[data-ui="development-tab"][data-id="finance"]');
    assert.match(await page.evaluate(`document.querySelector('${coach}').innerText`), /本周不用操作/);
    assert.equal(await page.evaluate(present(`${coach} [data-coach-tab]`)),false);
    assert.equal(await page.evaluate(`JSON.parse(localStorage.getItem('trade-tycoon:weekly:v38:v1')).view.developmentOverview`),false);
    await page.click('.nav [data-page="company"]');
    await page.click(`${coach} [data-coach-tab="team"]`);
    assert.equal(await page.evaluate('document.querySelector("[data-ui=development-tab][data-id=team]").getAttribute("aria-pressed")'),'true');
    assert.ok(await page.evaluate(present(`${coach} [data-coach-action="hire"]`)));
    await page.click(`${coach} [data-coach-action="hire"]`);
    assert.equal(await page.evaluate('document.activeElement.dataset.action'),'hire');
    await page.click('[data-ui="development-tab"][data-id="economy"]');
    assert.match(await page.evaluate(`document.querySelector('${coach}').innerText`), /本周不用操作/);
    assert.equal(await page.evaluate(present(`${coach} [data-ui="page"]`)),false);
    assert.deepEqual(page.errors,[]);
  }finally{await browser.close()}
});
