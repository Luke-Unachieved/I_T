import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/chromium.mjs';
import { currentState, loadScenario, dismissDecisions } from './helpers/scenarios.mjs';
import { SAVE_KEY } from '../v38/ui/save.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const enabled = process.env.V38_BROWSER === '1';
const coach = '.workspace > .coach-card';
const exists = selector => `Boolean(document.querySelector(${JSON.stringify(selector)}))`;
const storage = `JSON.parse(localStorage.getItem(${JSON.stringify(SAVE_KEY)}))`;
const saved = page => page.evaluate(storage);
const nav = (page, id) => page.click(`.nav [data-page="${id}"]`);

// Isolate post-introduction weeks without replaying the introductory tour for
// each scenario. The fixture only initializes state and completed intro flags;
// all quoted, withdrawn, reviewed, deferred, borrowed and leisure operations
// below use the actual visible browser controls.
async function postIntro(page, fixture, firstPage = 'office') {
  await page.goto();
  await page.waitFor(exists('[data-form="new-game"],[data-ui="resume-save"]'));
  await loadScenario(page, fixture);
  await nav(page, firstPage);
  await page.evaluate(`(()=>{const record=${storage};record.view.coachPrep=3;record.view.coachTour={version:2,visited:[],active:null,skipped:true};localStorage.setItem(${JSON.stringify(SAVE_KEY)},JSON.stringify(record));})()`);
  await page.send('Page.reload');
  await page.waitFor(exists('[data-ui="resume-save"]'));
  await page.click('[data-ui="resume-save"]');
  assert.equal((await saved(page)).view.coachTour.skipped, true);
  assert.equal((await saved(page)).view.coachPrep, 3);
}

async function reloadAndContinue(page) {
  await page.send('Page.reload');
  await page.waitFor(exists('[data-ui="resume-save"]'));
  await page.click('[data-ui="resume-save"]');
}

function coachButton(page, selector) {
  return page.click(`${coach} ${selector}`);
}

async function readRecommendation(page) {
  return page.evaluate(`document.querySelector('${coach} [data-ui="quote-open"]')?.dataset.id ?? null`);
}

async function reviewTask(page, selector) {
  const before = await saved(page);
  await coachButton(page, selector);
  const after = await saved(page);
  assert.deepEqual(after.state, before.state, 'viewing information must not execute a business operation');
  return after;
}

async function assertCoachReturnStyle(page, selector) {
  const colors = await page.evaluate(`(()=>{const button=document.querySelector(${JSON.stringify(selector)});const reference=document.querySelector('${coach} .coach-action');if(!button||!reference)return null;const style=el=>{const css=getComputedStyle(el);return {color:css.color,brightness:el.classList.contains('coach-action'),secondary:el.classList.contains('secondary')};};return {button:style(button),reference:style(reference)};})()`);
  assert.ok(colors, 'the contextual return and next recommendation must both exist');
  assert.deepEqual(colors.button, colors.reference, 'the contextual return must use the same gold assistant-action styling');
  assert.equal(colors.button.brightness, true);
  assert.equal(colors.button.secondary, false);
}

async function reviewPending(page, max = 10) {
  // Follow only passive information-review actions, never auto-submit,
  // borrow, hire, pay, settle or accept a recommendation.
  for (let i = 0; i < max; i++) {
    const current = await page.evaluate(`(()=>{const b=document.querySelector('${coach} [data-ui="coach-review-orders"],${coach} [data-ui="coach-review-cash"]');return b?{ui:b.dataset.ui,id:b.dataset.id??null}:null;})()`);
    if (!current) return;
    const before = await saved(page);
    const after = await reviewTask(page, `[data-ui="${current.ui}"]${current.id ? `[data-id="${current.id}"]` : ''}`);
    assert.notDeepEqual(after.view.coachReview, before.view.coachReview, 'a real review must acknowledge the reviewed current information');
    const returnSelector=current.id?`#${current.id} .order-section-body [data-ui=coach-review-next]`:'.forecast-panel [data-ui=coach-review-next]';
    const visibleReturn=await page.evaluate(`(()=>{const button=document.querySelector(${JSON.stringify(returnSelector)});const dock=document.querySelector('.nav').getBoundingClientRect();const r=button?.getBoundingClientRect();return Boolean(r&&r.width>0&&r.height>0&&r.top>=0&&r.bottom<dock.top);})()`);
    assert.ok(visibleReturn, `return to next recommendation must be visible beside the reviewed ${current.id??'cash forecast'}`);
    await assertCoachReturnStyle(page,returnSelector);
    await page.screenshot(`/tmp/v38-weekly-review-${current.id??'cash'}-${await page.evaluate('innerWidth')}.png`);
    await page.click(returnSelector);
    assert.ok(await page.evaluate(`document.activeElement.matches('${coach} .coach-action')`), 'the contextual return button focuses the next current suggestion');
    assert.deepEqual((await saved(page)).state,after.state,'returning to the coach must not settle or perform next action');
  }
  throw Error('review queue did not advance');
}

async function chooseInquiryPage(page) {
  // Required reviews may route to the order/office pages. Return manually to
  // the inquiry app once actual current commitments were reviewed.
  await reviewPending(page);
  await nav(page, 'inquiries');
  await reviewPending(page);
  if ((await saved(page)).view.page !== 'inquiries') await nav(page, 'inquiries');
}

for (const viewport of [{ width: 390, height: 844, mobile: true }, { width: 320, height: 568, mobile: true }]) {
  test(`weekly coach tracks manual quote choices and same-week declines at ${viewport.width}px`, { skip: !enabled, timeout: 120_000 }, async () => {
    const browser = await launchBrowser(root, { scenarios: true });
    try {
      const page = await browser.page(viewport);
      await postIntro(page, `game=>{const s=game.newGame({difficulty:'casual',seed:381});s.tutorial.done=true;return s;}`, 'inquiries');
      const first = await readRecommendation(page);
      assert.ok(first);
      const beforeDecline = await currentState(page);
      await coachButton(page, `[data-ui="coach-skip-inquiry"][data-id="${first}"]`);
      assert.match(await page.evaluate('document.querySelector(".action-feedback")?.textContent??""'),/这条询盘本周先略过/);
      assert.deepEqual(await currentState(page), beforeDecline);
      const next = await readRecommendation(page);
      assert.ok(next && next !== first, 'replace the recommendation instead of repeating the rejected inquiry');
      assert.ok((await saved(page)).view.coachDeclined.inquiries.includes(first));

      // Ignore the replacement, choose a different visible two-source inquiry
      // from a deterministic week, and change both supplier and price ourselves.
      const alternate = ['w1-2','w1-4','w1-5','w1-7'].find(id => id !== first && id !== next);
      assert.ok(alternate);
      await page.click(`article[data-inquiry-id="${alternate}"] [data-ui="quote-open"]`);
      await page.waitFor(exists('dialog[open] form[data-form="quote"]'));
      const source = await page.evaluate('document.querySelector("dialog input[name=source]:checked").value');
      const changedSource = source === 'stock' ? 'factory' : 'stock';
      const sourceSelector = `dialog input[name="source"][value="${changedSource}"]:not(:disabled)`;
      assert.ok(await page.evaluate(exists(sourceSelector)));
      await page.click(sourceSelector);
      await page.evaluate('document.querySelector("dialog [name=ratio]").focus()');
      await page.send('Input.dispatchKeyEvent', { type:'rawKeyDown', key:'ArrowLeft', code:'ArrowLeft', windowsVirtualKeyCode:37 });
      await page.send('Input.dispatchKeyEvent', { type:'keyUp', key:'ArrowLeft', code:'ArrowLeft', windowsVirtualKeyCode:37 });
      await page.coachReady();
      assert.equal(await page.evaluate('document.querySelector("dialog [name=ratio]").value'), '99');
      assert.equal(await page.evaluate('document.querySelector("dialog [name=source]:checked").value'), changedSource);
      const draftFeedback=await page.evaluate('document.querySelector("dialog [data-quote-preview=coach]").innerText');
      assert.match(draftFeedback,/你的报价方案可保留|你的改动有经营风险/);
      assert.match(draftFeedback,/你的方案预计中单率.*订单利润.*最低余额/s);
      assert.match(draftFeedback,/保留我的方案/);
      await page.evaluate('document.querySelector("dialog").scrollTop=0');
      await page.screenshot(`/tmp/v38-weekly-manual-quote-${viewport.width}.png`);
      assert.equal((await currentState(page)).bids.length, 0, 'reviewing a different proposal does not submit anything');
      await page.click('dialog [data-ui="close-dialog"]');
      await reloadAndContinue(page);
      await page.click(`article[data-inquiry-id="${alternate}"] [data-ui="quote-open"]`);
      assert.equal(await page.evaluate('document.querySelector("dialog [name=ratio]").value'), '99');
      assert.equal(await page.evaluate('document.querySelector("dialog [name=source]:checked").value'), changedSource);
      await page.click('dialog [data-ui=coach-review-submit]');
      assert.ok(await page.evaluate('document.activeElement.matches("dialog form[data-form=quote] button[type=submit]")'));
      assert.equal((await currentState(page)).bids.length,0);
      await page.click('dialog form[data-form="quote"] button[type="submit"]');
      const manual = (await saved(page)).state.bids[0];
      assert.equal(manual.inquiryId, alternate);
      assert.equal(manual.source, changedSource);
      assert.equal(manual.ratio, 99);
      assert.ok(manual.profit > 0);

      // Choose the next safe proposal the assistant actually finds after the
      // player's manual bid, but only submit by pressing the real quote button.
      await chooseInquiryPage(page);
      const second = await readRecommendation(page);
      assert.ok(second && ![first,alternate].includes(second));
      await coachButton(page, '[data-ui="quote-open"]');
      if (await page.evaluate(exists('dialog [data-ui="coach-apply-quote"]'))) await page.click('dialog [data-ui="coach-apply-quote"]');
      await page.click('dialog form[data-form="quote"] button[type="submit"]');
      assert.deepEqual((await saved(page)).state.bids.map(item=>item.inquiryId), [alternate,second]);

      await nav(page,'inquiries');
      await page.click(`[data-action="withdraw-bid"][data-id="${alternate}"]`);
      assert.deepEqual((await saved(page)).state.bids.map(item=>item.inquiryId), [second]);
      assert.ok((await saved(page)).view.coachDeclined.inquiries.includes(alternate));
      await chooseInquiryPage(page);
      const third = await readRecommendation(page);
      assert.ok(third && ![first,alternate,second].includes(third), 'remaining quote must not repeat any declined, withdrawn or submitted inquiry');
      await page.screenshot(`/tmp/v38-weekly-deviation-${viewport.width}.png`);

      // A refusal is a recommendation preference, not another game rule.
      await page.click(`article[data-inquiry-id="${alternate}"] [data-ui="quote-open"]`);
      assert.equal(await page.evaluate('document.querySelector("dialog form[data-form=quote] button[type=submit]").disabled'), false);
      await page.click('dialog [data-ui="close-dialog"]');
      await nav(page,'company');
      await page.click('[data-ui="development-tab"][data-id="team"]');
      assert.equal((await saved(page)).view.developmentTab,'team');
      await nav(page,'offwork');
      assert.equal((await saved(page)).view.page,'offwork');
      await reloadAndContinue(page);
      assert.equal((await saved(page)).view.page,'offwork');
      assert.deepEqual((await saved(page)).state.bids.map(item=>item.inquiryId), [second]);
      const declined = (await saved(page)).view.coachDeclined.inquiries;
      assert.ok([first,alternate].every(id=>declined.includes(id)));
      await chooseInquiryPage(page);
      assert.ok(![first,alternate,second].includes(await readRecommendation(page)));
      const oldWeek=(await saved(page)).state.week;
      await nav(page,'offwork');
      await page.click('.week-controls [data-action=end-week]');
      await dismissDecisions(page);
      assert.equal((await saved(page)).state.week,oldWeek+1);
      assert.deepEqual((await saved(page)).view.coachDeclined.inquiries, [], 'declines expire after the actual week changes');
      assert.ok(await page.evaluate('document.documentElement.scrollWidth <= innerWidth+1'));
      assert.deepEqual(page.errors, []);
    } finally { await browser.close(); }
  });
}

for (const viewport of [{ width: 390, height: 844, mobile: true }, { width: 320, height: 568, mobile: true }]) {
test(`weekly coach follows outstanding invoices, deferred work and cash reviews across pages at ${viewport.width}px`, { skip: !enabled, timeout: 120_000 }, async () => {
  const browser = await launchBrowser(root, { scenarios: true });
  try {
    const page = await browser.page(viewport);
    // Start with an actual awarded and delivered contract, then isolate an
    // overdue payment and existing loan to make all next actions reproducible.
    await postIntro(page, `game=>{
      let s=game.newGame({difficulty:'casual',seed:381});
      const bid=game.act(s,{type:'bid',inquiryId:'w1-7',source:'factory',ratio:93});
      if(bid.error)throw Error(bid.error);s=bid.state;
      for(let n=0;n<10&&!s.receivables.some(x=>x.status==='open');n++){
        const result=game.act(s,{type:'end-week'});if(result.error)throw Error(result.error);
        s=result.state;s.summary=null;s.events=[];
      }
      const bill=s.receivables.find(x=>x.status==='open');
      if(!bill)throw Error('Missing actual receivable');
      bill.status='overdue';bill.originalDueWeek=s.week-1;bill.dueWeek=s.week+2;
      s.cash=160000;s.loan=6000;s.creditLine=game.creditLimit(s);s.inquiries=[];s.energy=100;s.tutorial.done=true;return s;
    }`, 'offwork');
    const starting = await saved(page);
    const bill = starting.state.receivables.find(item=>item.status==='overdue');
    assert.ok(bill);
    await nav(page,'orders');
    for (const id of ['orders-delivery','orders-receivables']) {
      await page.click(`#${id} > summary`);
      await page.waitFor(`!document.getElementById(${JSON.stringify(id)}).open && ${storage}.view.ordersCollapsed.includes(${JSON.stringify(id)})`);
    }
    await nav(page,'offwork');
    // Choose an unrelated life app ourselves. Guidance must follow the actual
    // invoice and navigate to its existing order control, not insist we rest.
    await page.click('[data-ui=life-app][data-id=property]');
    assert.ok(await page.evaluate(exists(`${coach} [data-page="orders"][data-coach-tab="orders-receivables"]`)));
    await coachButton(page,'[data-page="orders"][data-coach-tab="orders-receivables"]');
    assert.equal((await saved(page)).view.page,'orders');
    assert.ok(await page.evaluate('document.querySelector("#orders-receivables").open'));
    assert.ok(await page.evaluate(exists(`${coach} [data-coach-action="collect"][data-id="${bill.id}"]`)));
    await reviewTask(page,`[data-coach-action="collect"][data-id="${bill.id}"]`);
    assert.ok(await page.evaluate(`document.querySelector('[data-action="collect"][data-id="${bill.id}"]').getClientRects().length>0`));
    // Do not collect; choose the next suggested task instead.
    const tag = `order:collect:${bill.id}`;
    await reviewTask(page,`[data-ui="coach-defer-task"][data-id="${tag}"]`);
    assert.match(await page.evaluate('document.querySelector(".action-feedback")?.textContent??""'),/这项本周暂缓/);
    assert.ok((await saved(page)).view.coachDeclined.tasks.includes(tag));
    assert.equal((await saved(page)).state.receivables.find(item=>item.id===bill.id).reminderWeek,bill.reminderWeek);
    assert.equal(await page.evaluate(exists(`${coach} [data-coach-action="collect"][data-id="${bill.id}"]`)),false);
    assert.match(await page.evaluate(`document.querySelector('${coach}').innerText`),/暂缓.*逾期|逾期.*暂缓|暂缓.*催款|催款.*暂缓/s);
    await page.screenshot(`/tmp/v38-weekly-order-deferred-${viewport.width}.png`);

    await reviewPending(page);
    await nav(page,'company');
    await page.click('[data-ui="development-tab"][data-id="finance"]');
    await reviewPending(page);
    if ((await saved(page)).view.page!=='company') {
      await nav(page,'company');
      await page.click('[data-ui="development-tab"][data-id="finance"]');
    }
    assert.ok(await page.evaluate(exists(`${coach} [data-coach-form="repay"]`)), 'cash-positive existing loan should yield a real repayment suggestion');
    const prior = (await saved(page)).state;
    await reviewTask(page,'[data-coach-form="repay"]');
    const amount = Number(await page.evaluate('document.querySelector("form[data-form=repay] [name=amount]").value'));
    assert.ok(amount>0 && amount<=prior.loan);
    // Player repays a different amount instead of blindly accepting the
    // adviser amount, then verifies remaining debt and the next recommendation.
    const chosen = Math.max(1, Math.floor(amount/2));
    await page.fill('form[data-form=repay] [name=amount]',String(chosen));
    await page.click('form[data-form=repay] button[type=submit]');
    const after = (await saved(page)).state;
    assert.equal(after.loan,prior.loan-chosen);
    assert.equal(after.cash,prior.cash-chosen);
    assert.equal(after.receivables.find(item=>item.id===bill.id).reminderWeek,bill.reminderWeek);
    assert.ok((await saved(page)).view.coachDeclined.tasks.includes(tag));
    // A real partial payment satisfies the recommended repayment decision for
    // this week. No extra deferral button or repeated halving is necessary.
    assert.equal(after.period.cashBreakdown.outflow.repayment,chosen);
    assert.equal(await page.evaluate(exists(`${coach} [data-coach-form="repay"],${coach} [data-id^="growth:repay:"]`)),false);
    assert.match(await page.evaluate(`document.querySelector('${coach}').innerText`),/本周已归还/);
    await reviewPending(page);
    const reviews = (await saved(page)).view.coachReview;
    assert.ok(reviews['orders-receivables'] && reviews.cash, 'payment and cash reviews are distinct real checkpoints');
    assert.ok(reviews['orders-delivery'], 'previously folded delivery records should be reviewed too');
    assert.deepEqual((await saved(page)).state, after);

    // A second, manually chosen repayment changes the reviewed commitments.
    // The old review may not suppress the new cash forecast.
    await nav(page,'company');
    await page.click('[data-ui="development-tab"][data-id="finance"]');
    const additional = Math.min(1000,after.loan);
    assert.ok(additional>0);
    await page.fill('form[data-form=repay] [name=amount]',String(additional));
    await page.click('form[data-form=repay] button[type=submit]');
    const adjusted=(await saved(page)).state;
    assert.equal(adjusted.loan,after.loan-additional);
    assert.equal(adjusted.cash,after.cash-additional);
    assert.equal(adjusted.period.cashBreakdown.outflow.repayment,chosen+additional);
    assert.equal(await page.evaluate(exists(`${coach} [data-coach-form="repay"]`)),false);
    await reviewPending(page);
    const updatedReview=(await saved(page)).view.coachReview;
    assert.notEqual(updatedReview.cash.signature,reviews.cash.signature,'changed finance must be reviewed again');
    assert.equal(updatedReview['orders-receivables'].signature,reviews['orders-receivables'].signature,'unchanged invoice must not require repeat review');
    // The invoice remains manually accessible, even after deferring it.
    await nav(page,'orders');
    assert.ok(await page.evaluate(exists(`[data-action="collect"][data-id="${bill.id}"]:not(:disabled)`)));
    const reviewsBeforeReload = (await saved(page)).view.coachReview;
    await reloadAndContinue(page);
    assert.deepEqual((await saved(page)).state, adjusted);
    assert.deepEqual((await saved(page)).view.coachReview,reviewsBeforeReload);
    assert.ok((await saved(page)).view.coachDeclined.tasks.includes(tag));
    await nav(page,'company');
    await page.click('[data-ui="development-tab"][data-id="finance"]');
    assert.match(await page.evaluate(`document.querySelector('${coach}').innerText`),/本周已归还/);
    assert.equal(await page.evaluate(exists(`${coach} [data-coach-form="repay"]`)),false,'saved partial repayment remains acknowledged after refresh');
    const oldWeek=adjusted.week;
    await nav(page,'offwork');
    await page.click('.week-controls [data-action=end-week]');
    await dismissDecisions(page);
    assert.equal((await saved(page)).state.week,oldWeek+1);
    assert.equal((await saved(page)).state.period.cashBreakdown.outflow.repayment??0,0,'payment decision resets only on actual settlement');
    assert.ok(await page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'));
    assert.deepEqual(page.errors,[]);
  } finally { await browser.close(); }
});
}

for (const viewport of [{width:320,height:568,mobile:true},{width:390,height:844,mobile:true}]) {
test(`weekly coach shows actual leisure choices upon entering quiet-week entertainment at ${viewport.width}px`, { skip: !enabled, timeout: 120_000 }, async () => {
  const browser = await launchBrowser(root, { scenarios: true });
  try {
    const page = await browser.page(viewport);
    await postIntro(page, `game=>{const s=game.newGame({difficulty:'casual',seed:381});s.inquiries=[];s.energy=100;s.tutorial.done=true;return s;}`, 'office');
    const choices = await page.evaluate(`(()=>{const e=document.querySelector('${coach}');const l=e.querySelector('[data-page=offwork]'),w=e.querySelector('[data-ui=coach-settlement]');return l&&w?{leisure:l.textContent,week:w.textContent,leisureClass:l.className,weekClass:w.className}:null;})()`);
    assert.ok(choices, 'quiet week must offer both leisure and settlement');
    assert.equal(await page.evaluate(exists('.week-controls,[data-action=end-week],[data-action=advance-four]')),false,'office has no actual settlement controls');
    assert.equal(choices.leisureClass,choices.weekClass, 'leisure and settlement are equal alternatives without mandatory spending');
    const firstScreen = await page.evaluate(`(()=>{const rect=s=>document.querySelector(s).getBoundingClientRect();return{titleTop:rect('${coach} h3').top,leisureBottom:rect('${coach} [data-page=offwork]').bottom,settleBottom:rect('${coach} [data-ui=coach-settlement]').bottom,dockTop:rect('.nav').top};})()`);
    assert.ok(firstScreen.titleTop>=0 && Math.max(firstScreen.leisureBottom,firstScreen.settleBottom)<firstScreen.dockTop, JSON.stringify(firstScreen));
    await page.screenshot(`/tmp/v38-weekly-quiet-${viewport.width}.png`);
    const before=(await saved(page)).state;
    await coachButton(page,'[data-page=offwork]');
    assert.deepEqual((await saved(page)).state,before);
    assert.ok(await page.evaluate(exists('.life-app-room')), 'the home illustration remains available');
    assert.equal(await page.evaluate("getComputedStyle(document.querySelector('.week-controls')).position"),'static');
    const leisureScreen=await page.evaluate(`(()=>{const dock=document.querySelector('.nav').getBoundingClientRect();const rect=id=>{const r=document.querySelector('[data-ui=life-app][data-id='+id+']').getBoundingClientRect();return {top:r.top,bottom:r.bottom};};return {trips:rect('trips'),friends:rect('friends'),dock:dock.top};})()`);
    assert.ok(leisureScreen.trips.top>=0 && leisureScreen.friends.top>=0 && Math.max(leisureScreen.trips.bottom,leisureScreen.friends.bottom)<=leisureScreen.dock, 'guided arrival must actually show both entertainment choices without extra scrolling: '+JSON.stringify(leisureScreen));
    assert.ok(await page.evaluate(exists(`${coach} [data-ui=coach-settlement],.week-controls [data-action=end-week]`)), 'settlement stays available, not mandatory');
    await page.waitFor("Array.from(document.querySelectorAll('.life-app-tile-art')).every(frame=>frame.dataset.mediaState==='loaded')");
    assert.deepEqual(await page.evaluate("Array.from(document.querySelectorAll('.life-app-tile-art img')).map(img=>[img.dataset.mediaSrc,img.naturalWidth,img.naturalHeight])"),['trips','friends','property','car'].map(id=>[`assets/v38-life-app-${id}.webp`,768,512]));
    await page.screenshot(`/tmp/v38-guided-leisure-${viewport.width}.png`);
    await page.click('[data-ui=life-app][data-id=trips]');
    await page.click('[data-life-id=trip-paper-boat] > summary');
    const form='[data-outing-id=trip-paper-boat]';
    await page.click(`${form} button[type=submit]`);
    assert.equal((await saved(page)).state.life.lastBreakWeek,before.week);
    assert.equal((await saved(page)).state.cash,before.cash,'the manually chosen free leisure is not an assistant-imposed expense');
    assert.ok(await page.evaluate(exists(`${coach} [data-ui=coach-settlement]`)));
    assert.equal(await page.evaluate(exists(`${coach} [data-ui=coach-select-outing],${coach} [data-coach-action=outing]`)),false);
    const rested=(await saved(page)).state;
    await assertCoachReturnStyle(page,'#latest-outing [data-ui=coach-review-next]');
    await page.click('#latest-outing [data-ui=coach-review-next]');
    assert.ok(await page.evaluate(`document.activeElement.matches('${coach} [data-ui=coach-settlement]')`));
    assert.deepEqual((await saved(page)).state,rested,'the leisure result return control must not execute settlement');
    await reloadAndContinue(page);
    assert.equal((await saved(page)).view.lifeApp,'trips');
    assert.equal((await saved(page)).state.life.lastBreakWeek,before.week);
    assert.ok(await page.evaluate(exists(`${coach} [data-ui=coach-settlement]`)));
    await coachButton(page,'[data-ui=coach-settlement]');
    assert.equal((await saved(page)).state.week,before.week,'assistant settlement route only navigates');
    await page.click('.week-controls [data-action=end-week]');
    await page.waitFor(exists('dialog[open]'));
    await dismissDecisions(page);
    assert.equal((await saved(page)).state.week,before.week+1);
    assert.ok(await page.evaluate(exists(coach)), 'assistant remains present in the next week after introduction');
    assert.deepEqual(page.errors,[]);
  } finally { await browser.close(); }
});
}

test('a finance emergency follows manual navigation and the coach accepts a player-selected loan amount at 320px', { skip: !enabled, timeout: 120_000 }, async () => {
  const browser = await launchBrowser(root, { scenarios: true });
  try {
    const page = await browser.page({ width: 320, height: 568, mobile: true });
    await postIntro(page,`game=>{let s=game.newGame({difficulty:'casual',seed:381});const owned=game.act(s,{type:'buy-property',id:'city-flat'});if(owned.error)throw Error(owned.error);s=owned.state;s.cash=-2000;s.creditLine=game.creditLimit(s);s.inquiries=[];s.tutorial.done=true;return s;}`,'offwork');
    await page.click('[data-ui=life-app][data-id=car]');
    assert.ok(await page.evaluate(exists(`${coach} [data-page=company][data-coach-tab=finance]`)));
    const before=(await saved(page)).state;
    await coachButton(page,'[data-page=company][data-coach-tab=finance]');
    assert.equal((await saved(page)).view.developmentTab,'finance');
    await reviewTask(page,'[data-coach-form=borrow]');
    const suggested=Number(await page.evaluate('document.querySelector("form[data-form=borrow] input[name=amount]").value'));
    assert.equal(suggested,2000);
    const chosen=Math.min(10000,before.creditLine-before.loan);
    assert.ok(chosen>suggested,'test fixture must leave a meaningful alternate manual loan amount');
    await page.fill('form[data-form=borrow] input[name=amount]',String(chosen));
    await page.click('form[data-form=borrow] button[type=submit]');
    const after=(await saved(page)).state;
    assert.equal(after.cash,before.cash+chosen);
    assert.equal(after.loan,before.loan+chosen);
    assert.equal(await page.evaluate(exists(`${coach} [data-coach-form=borrow]`)),false);
    await nav(page,'orders');
    assert.equal((await saved(page)).view.page,'orders');
    assert.equal(await page.evaluate(exists(`${coach} [data-coach-form=borrow]`)),false);
    await page.evaluate(`document.querySelector('${coach}').scrollIntoView({block:'center'})`);
    await page.screenshot('/tmp/v38-weekly-emergency-cleared-320.png');
    assert.ok(await page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'));
    assert.deepEqual(page.errors,[]);
  } finally { await browser.close(); }
});

test('a matured operation receives a real cross-page development recommendation and hiring advances weekly guidance', { skip: !enabled, timeout: 120_000 }, async () => {
  const browser=await launchBrowser(root,{scenarios:true});
  try {
    const page=await browser.page({width:390,height:844,mobile:true});
    // Mature branch fixture: one genuinely awarded factory contract supplies
    // the shape of 12 historical profitable cohorts. History is synthesized
    // solely to make a justified development recommendation reachable.
    await postIntro(page,`game=>{
      const s=game.newGame({difficulty:'casual',seed:381});
      const bid=game.act(s,{type:'bid',inquiryId:'w1-7',source:'factory',ratio:93});
      const base=game.act(bid.state,{type:'end-week'}).state.orders[0];
      if(!base)throw Error('Missing awarded factory contract');
      s.week=13;s.cash=1500000;
      const products=['clock','carafe','stapler','umbrella'];
      s.orders=Array.from({length:12},(_,index)=>[0,1].map(slot=>({...structuredClone(base),id:'historical-'+index+'-'+slot,productId:products[(index*2+slot)%products.length],staffId:null,status:'settled',contractWeek:index+1,deliveredWeek:index+1,dueWeek:index+2,deliverWeek:index+1,expectedPayWeek:index+1,productionLeft:0,shippingLeft:0,total:250000,foreignTotal:250000,cost:200000,shipping:2000,deposit:50000,workingCapital:152000,profit:48000,probability:1}))).flat();
      s.history=Array.from({length:12},(_,index)=>({week:index+1,cash:s.cash,loan:0,receivables:0,orders:0,profit:25000,revenue:500000,inflow:500000,outflow:475000,rep:s.company.rep,macro:{...s.macro},rank:1,valuation:s.cash}));
      s.cumulativeRevenue=6000000;s.year.deliveries=s.orders.length;s.year.revenue=6000000;s.year.profit=300000;s.tutorial.done=true;s.creditLine=game.creditLimit(s);return s;
    }`,'offwork');
    await page.click('[data-ui=life-app][data-id=car]');
    assert.ok(await page.evaluate(exists(`${coach} [data-page=company][data-coach-tab=team]`)));
    await coachButton(page,'[data-page=company][data-coach-tab=team]');
    assert.equal((await saved(page)).view.developmentTab,'team');
    const candidateId=await page.evaluate(`document.querySelector('${coach} [data-coach-action=hire]')?.dataset.id??null`);
    assert.ok(candidateId);
    const prior=(await saved(page)).state;
    const candidate=prior.candidates.find(item=>item.id===candidateId);
    assert.ok(candidate);
    await reviewTask(page,`[data-coach-action=hire][data-id="${candidateId}"]`);
    assert.ok(await page.evaluate(`document.activeElement.matches('[data-action=hire][data-id="${candidateId}"]')`));
    await page.click(`[data-action=hire][data-id="${candidateId}"]`);
    const hired=(await saved(page)).state;
    assert.equal(hired.staff.length,prior.staff.length+1);
    assert.equal(hired.staff.find(item=>item.id===candidateId).salary,candidate.salary);
    assert.ok(!hired.candidates.some(item=>item.id===candidateId));
    assert.equal(hired.cash,prior.cash);
    assert.equal(await page.evaluate(exists(`${coach} [data-coach-action=hire]`)),false,'completed staffing must not become another hire demand in the same week');
    await nav(page,'office');
    assert.ok(await page.evaluate(exists(`${coach} .coach-action`)), 'weekly guidance must continue after development');
    await page.evaluate(`document.querySelector('${coach}').scrollIntoView({block:'center'})`);
    await page.screenshot('/tmp/v38-weekly-development-complete-390.png');
    assert.deepEqual(page.errors,[]);
  } finally { await browser.close(); }
});
