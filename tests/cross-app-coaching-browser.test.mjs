import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/chromium.mjs';
import { LIFE_CATALOG } from '../v38/engine/life.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const enabled = process.env.V38_BROWSER === '1';
const coach = '.workspace > .coach-card';
const visible = selector => `Boolean(document.querySelector(${JSON.stringify(selector)}))`;
const snapshot = "JSON.parse(localStorage.getItem('trade-tycoon:weekly:v38:v1'))";
const saved = page => page.evaluate(snapshot);

async function openSuggestedQuote(page) {
  await page.click(`${coach} [data-ui="quote-open"]`);
  await page.waitFor(visible('dialog[open] [data-quote-preview="coach"]'));
  assert.equal(await page.evaluate(visible('dialog[open] .tutorial')), false, 'simple-mode quote shows only the assistant, not a competing basic tutorial');
  if (await page.evaluate(visible('dialog [data-ui="coach-apply-quote"]'))) await page.click('dialog [data-ui="coach-apply-quote"]');
  await page.waitFor(visible('dialog [data-ui="coach-review-submit"]'));
}

async function submitSuggestedQuote(page) {
  const before = (await saved(page)).state.bids.length;
  await page.click('dialog [data-ui="coach-review-submit"]');
  assert.equal(await page.evaluate('document.activeElement.matches("form[data-form=quote] button[type=submit]")'), true);
  assert.equal((await saved(page)).state.bids.length, before);
  await page.click('dialog form[data-form="quote"] button[type="submit"]');
  await page.waitFor(`!document.querySelector('dialog').open && ${snapshot}.state.bids.length === ${before+1}`);
}

async function closeDecisions(page) {
  for (let attempt = 0; attempt < 20; attempt++) {
    if (!(await page.evaluate(visible('dialog[open]')))) return;
    if (await page.evaluate(visible('dialog[open] [data-ui="close-dialog"]'))) {
      await page.click('dialog[open] [data-ui="close-dialog"]');
    } else if (await page.evaluate(visible('dialog[open] [data-action="resolve-event"].primary:not(:disabled)'))) {
      await page.click('dialog[open] [data-action="resolve-event"].primary:not(:disabled)');
    } else if (await page.evaluate(visible('dialog[open] [data-action="resolve-event"]:not(:disabled)'))) {
      await page.click('dialog[open] [data-action="resolve-event"]:not(:disabled)');
    } else throw new Error('Expected an actionable weekly summary or decision.');
  }
  throw new Error('Too many consecutive decisions.');
}

test('real Chromium 390px simple mode: chat inbox, draft/reload/withdraw, first order and coach-selected leisure app', { skip: !enabled, timeout: 120_000 }, async () => {
  const browser = await launchBrowser(root);
  try {
    const page = await browser.page({ width: 390, height: 844, mobile: true });
    await page.goto();
    await page.waitFor(visible('[data-form="new-game"]'));
    // Make the test reproducible while creating the new company through the ordinary opening form.
    await page.evaluate(`(()=>{const original=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=array=>{if(array instanceof Uint32Array&&array.length===1){array[0]=381;return array;}return original(array);};const menu=document.querySelector('[name=difficulty]');menu.value='casual';menu.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await page.fill('[data-form="new-game"] [name="name"]', '跨应用验收工作室');
    await page.click('[data-form="new-game"] button[type="submit"]');
    await page.click(`${coach} [data-page="inquiries"]`);
    const originalId = await page.evaluate(`document.querySelector('${coach} [data-ui="quote-open"]').dataset.id`);
    assert.ok(await page.evaluate(visible(`article[data-inquiry-id="${originalId}"] button[data-ui="quote-open"]`)), 'recommendation should correspond to a visible chat thread');
    await page.screenshot('/tmp/v38-cross-app-inbox-390.png');
    await openSuggestedQuote(page);
    const proposal = (await saved(page)).view.quote.proposal;
    await page.click('dialog [data-ui="close-dialog"]');
    assert.ok((await saved(page)).view.drafts.some(entry => entry[0] === originalId));
    await page.click(`article[data-inquiry-id="${originalId}"] [data-ui="quote-open"]`);
    await page.waitFor(visible('dialog[open] [data-form="quote"]'));
    assert.equal((await saved(page)).view.quote.id, originalId);
    assert.deepEqual((await saved(page)).view.quote.proposal, proposal);
    await page.goto();
    await page.waitFor(visible('[data-ui="resume-save"]'));
    await page.click('[data-ui="resume-save"]');
    await page.waitFor(visible('dialog[open] [data-form="quote"]'));
    assert.match(await page.evaluate('document.querySelector("dialog").innerText'), /已采用当前建议方案/);
    await page.screenshot('/tmp/v38-cross-app-quote-390.png');
    await submitSuggestedQuote(page);
    assert.equal((await saved(page)).state.bids[0].inquiryId, originalId);
    await page.click(`[data-action="withdraw-bid"][data-id="${originalId}"]`);
    await page.waitFor(`${snapshot}.state.bids.length===0`);
    await openSuggestedQuote(page);
    await submitSuggestedQuote(page);
    assert.ok(await page.evaluate(visible(`${coach} [data-page="office"]`)), 'first bid should prompt a meaningful page visit, not force settlement');
    await page.click('.week-controls [data-action="end-week"]'); // Player may choose to settle voluntarily with one quote.
    await page.waitFor(visible('dialog[open] [data-ui="view-first-order"]'));
    assert.equal((await saved(page)).state.week, 2);
    await page.click('dialog [data-ui="view-first-order"]');
    await page.click(`${coach} [data-coach-tab="finance"]`);
    await page.click(`${coach} [data-coach-tab="team"]`);
    assert.match(await page.evaluate(`document.querySelector('${coach}').innerText`), /暂缓聘用/);
    await page.click(`${coach} [data-page="offwork"]`);
    await page.waitFor(visible('[data-ui="life-app"][data-id="trips"]'));
    assert.deepEqual(await page.evaluate('Array.from(document.querySelectorAll("[data-ui=life-app]")).map(e=>e.dataset.id)'), ['trips', 'friends', 'property', 'car']);
    assert.equal((await saved(page)).view.coachIntro, 4);
    await page.waitFor(visible('.life-app-room[data-media-state="loaded"]'));
    await page.evaluate('document.querySelector(".life-app-room img").decode()');
    await page.screenshot('/tmp/v38-cross-app-launcher-390.png');
    await page.evaluate('document.querySelector(".life-app-menu").scrollIntoView({block:"start"})');
    await page.waitFor('Array.from(document.querySelectorAll(".life-app-tile-art")).every(frame=>frame.dataset.mediaState==="loaded")');
    await page.screenshot('/tmp/v38-cross-app-launcher-grid-390.png');
    await page.click('[data-ui="life-app"][data-id="property"]');
    assert.ok(await page.evaluate(visible('[data-life-app-page="property"]')));
    await page.click('[data-ui="life-app"][data-id="home"]');
    for (let cycle = 0; cycle < 5 && (await saved(page)).state.energy >= 85; cycle++) {
      await page.click('.week-controls [data-action="advance-four"]');
      await closeDecisions(page);
    }
    const before = (await saved(page)).state;
    assert.ok(before.energy < 85);
    const recommendation = await page.evaluate(`(()=>{const node=document.querySelector('${coach} [data-ui="coach-select-outing"],${coach} [data-coach-action="outing"]');return node?{id:node.dataset.id,choice:node.dataset.choice??null,detailed:node.dataset.ui==='coach-select-outing'}:null;})()`);
    assert.ok(recommendation, 'tired players should get a feasible specific leisure recommendation');
    const activity = LIFE_CATALOG.outings.find(item => item.id === recommendation.id);
    assert.ok(activity);
    const expectedApp = activity.kind === 'trip' || activity.id === 'night-bus' ? 'trips' : 'friends';
    const selector = recommendation.detailed ? `${coach} [data-ui="coach-select-outing"]` : `${coach} [data-coach-action="outing"]`;
    await page.click(selector);
    await page.waitFor(visible(`[data-life-app-page="${expectedApp}"]`));
    assert.equal((await saved(page)).state.energy, before.energy, 'coach navigation must not purchase rest');
    assert.equal((await saved(page)).view.lifeApp, expectedApp);
    const reviewControl = recommendation.detailed
      ? `form[data-form="outing"][data-outing-id="${activity.id}"] button[type="submit"]`
      : `[data-action="outing"][data-id="${activity.id}"]`;
    assert.ok(await page.evaluate(`document.querySelector(${JSON.stringify(reviewControl)})?.getClientRects().length>0`), 'recommended activity must be revealed, not hidden in a collapsed group or card');
    await page.screenshot('/tmp/v38-cross-app-rest-390.png');
    if (recommendation.detailed) {
      const form = `form[data-form="outing"][data-outing-id="${activity.id}"]`;
      assert.equal(await page.evaluate(`document.querySelector('${form} input[name="choiceId"]:checked').value`), recommendation.choice);
      await page.click(`${form} button[type="submit"]`);
    } else await page.click(`[data-action="outing"][data-id="${activity.id}"]`);
    const after = (await saved(page)).state;
    assert.equal(after.life.latestOuting.id, activity.id);
    assert.ok(after.energy > before.energy);
    assert.ok(await page.evaluate(visible('#latest-outing')));
    await page.goto();
    await page.waitFor(visible('[data-ui="resume-save"]'));
    await page.click('[data-ui="resume-save"]');
    await page.waitFor(visible(`[data-life-app-page="${expectedApp}"]`));
    assert.ok(await page.evaluate(visible('#latest-outing')));
    assert.equal((await saved(page)).state.energy, after.energy);
    const viewport = await page.evaluate('document.documentElement.scrollWidth-innerWidth');
    assert.ok(viewport <= 1);
    assert.deepEqual(page.errors, []);
  } finally { await browser.close(); }
});
