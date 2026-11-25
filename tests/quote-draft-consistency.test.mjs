import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { act, forecast, newGame } from '../v38/engine/game.js';
import { generateInquiries, quote } from '../v38/engine/quotes.js';
import { quoteRecommendation } from '../v38/ui/coaching.js';
import { SAVE_KEY } from '../v38/ui/save.js';
import { launchBrowser } from './helpers/chromium.mjs';
import { currentState, loadScenario } from './helpers/scenarios.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const options = { skip: process.env.V38_BROWSER !== '1', timeout: 90_000 };
const mobile = { width: 390, height: 844, mobile: true };
const apply = (state, action) => {
  const result = act(state, action);
  assert.ifError(result.error);
  return result.state;
};
const pause = millis => new Promise(resolve => setTimeout(resolve, millis));
const present = selector => `Boolean(document.querySelector(${JSON.stringify(selector)}))`;
const selectorFor = id => `.inquiry-thread [data-ui="quote-open"][data-id=${JSON.stringify(id)}]`;

async function start(page, state, inquiryId) {
  await page.goto();
  await page.waitFor(present('[data-form="new-game"],[data-ui="resume-save"]'));
  await loadScenario(page, `()=>(${JSON.stringify(state)})`);
  await page.click('.nav [data-page="inquiries"]');
  await page.click(selectorFor(inquiryId));
}

async function inspect(page) {
  return page.evaluate(`(()=>{
    const form=document.querySelector('form[data-form="quote"]');
    const proposal=JSON.parse(localStorage.getItem(${JSON.stringify(SAVE_KEY)})).view.quote.proposal;
    return { proposal, values:Object.fromEntries(new FormData(form)), branded:form.elements.branded?.checked??false,
      preview:document.querySelector('.quote-risk')?.innerText, coach:document.querySelector('dialog .coach-card')?.innerText,
      disabled:form.querySelector('button[type="submit"]').disabled };
  })()`);
}

async function adoptAndSubmit(page, inquiryId) {
  const before = await currentState(page);
  const inquiry = before.inquiries.find(item => item.id === inquiryId);
  const recommendation = quoteRecommendation(before, inquiry, { category:'', availability:'all', excludedIds:[] });
  assert.ok(recommendation, 'the existing inquiry has an executable alternative');
  if (await page.evaluate(present('dialog [data-ui="coach-apply-quote"]'))) {
    await page.click('dialog [data-ui="coach-apply-quote"]');
  }
  const adopted = await inspect(page);
  assert.match(adopted.coach, /已采用当前建议方案/);
  assert.equal(adopted.disabled, false);
  for (const [key, value] of Object.entries(recommendation.config)) {
    assert.equal(String(adopted.proposal[key] ?? ''), String(value ?? ''), key);
  }
  const minimum = `¥${recommendation.cashFloor.toLocaleString('zh-CN')}`;
  assert.ok(adopted.preview.includes(minimum) && adopted.coach.includes(minimum));
  const actual = { ...adopted.proposal, ...adopted.values, ratio:Number(adopted.values.ratio ?? adopted.proposal.ratio),
    extraTerms:Number(adopted.values.extraTerms ?? adopted.proposal.extraTerms), branded:adopted.branded,
    brandUnitPrice:Number(adopted.values.brandUnitPrice ?? adopted.proposal.brandUnitPrice) };
  const offer = quote(before, inquiry, actual);
  assert.ifError(offer.error);
  assert.equal(Math.min(...forecast(before, offer).map(row => row.hypothetical)), recommendation.cashFloor);
  await page.click('dialog [data-ui="coach-review-submit"]');
  assert.ok(await page.evaluate('document.activeElement.matches("form[data-form=quote] button[type=submit]")'));
  assert.deepEqual(await currentState(page), before, 'adopting and reviewing cannot submit a bid');
  await page.click('dialog form[data-form="quote"] button[type="submit"]');
  const after = await currentState(page);
  const submitted = after.bids.find(item => item.inquiryId === inquiryId);
  assert.ok(submitted);
  for (const key of ['source','ratio','extraTerms','staffId','financing','branded','unitPrice','total','profit','probability']) {
    assert.equal(String(submitted[key] ?? ''), String(recommendation.offer[key] ?? ''), key);
  }
  assert.deepEqual(page.errors, []);
  return submitted;
}

test('a restored inventory draft whose real stock was liquidated cannot silently become a cash purchase', options, async () => {
  const browser = await launchBrowser(root, { scenarios:true });
  try {
    const page = await browser.page(mobile);
    let state = newGame({ difficulty:'casual', seed:381 });
    state.tutorial.done = true;
    state.cash = 220000;
    const inquiry = state.inquiries[0];
    state = apply(state, { type:'invest-venture', id:'warehouse' });
    state = apply(state, { type:'purchase-stock', productId:inquiry.productId, quantity:Math.max(inquiry.quantity,400) });
    await start(page, state, inquiry.id);
    await page.click('form[data-form="quote"] input[name="source"][value="inventory"]');
    assert.equal((await inspect(page)).proposal.source, 'inventory');
    await page.click('dialog [data-ui="close-dialog"]');
    await page.click('.nav [data-page="orders"]');
    await page.click(`[data-action="liquidate"][data-id=${JSON.stringify(inquiry.productId)}]`);
    assert.equal((await currentState(page)).inventory.length, 0);
    await pause(410);
    await page.click('.nav [data-page="inquiries"]');
    await page.click(selectorFor(inquiry.id));
    const stale = await inspect(page);
    assert.equal(stale.proposal.source, 'inventory', 'restoring a draft must not silently change a user-selected source');
    assert.equal(stale.disabled, true, 'a missing inventory source cannot be submitted as stock');
    assert.match(stale.coach, /库存|货源/);
    assert.match(stale.preview, /库存|货源/);
    assert.equal(await page.evaluate('document.querySelector("input[name=source]:checked")?.value'), 'inventory');
    assert.ok(await page.evaluate('document.querySelector("input[name=source][value=inventory]").disabled'));
    const submitted = await adoptAndSubmit(page, inquiry.id);
    assert.notEqual(submitted.source, 'inventory');
  } finally { await browser.close(); }
});

test('a restored draft with a dismissed staff member shows the lost assignment and requires a new choice', options, async () => {
  const browser = await launchBrowser(root, { scenarios:true });
  try {
    const page = await browser.page(mobile);
    let state = newGame({ difficulty:'casual', seed:381 });
    state.tutorial.done = true;
    state.cash = 220000;
    const person = state.candidates[0];
    const inquiry = state.inquiries[0];
    state = apply(state, { type:'hire', id:person.id });
    await start(page, state, inquiry.id);
    await page.evaluate(`(()=>{const input=document.querySelector('select[name="staffId"]');input.value=${JSON.stringify(person.id)};input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    assert.equal((await inspect(page)).proposal.staffId, person.id);
    await page.click('dialog [data-ui="close-dialog"]');
    await page.click('.nav [data-page="company"]');
    await page.click('[data-ui="development-tab"][data-id="team"]');
    await page.click(`[data-action="dismiss-staff"][data-id=${JSON.stringify(person.id)}]`);
    assert.equal((await currentState(page)).staff.some(item=>item.id===person.id), false);
    await pause(410);
    await page.click('.nav [data-page="inquiries"]');
    await page.click(selectorFor(inquiry.id));
    const stale = await inspect(page);
    assert.equal(stale.proposal.staffId, person.id);
    assert.equal(stale.disabled, true, 'a missing assigned staff member must not silently become a different assignment');
    assert.match(stale.coach, /负责人|员工/);
    assert.match(stale.preview, /负责人|员工/);
    assert.equal(await page.evaluate('document.querySelector("select[name=staffId]").value'), person.id);
    assert.ok(await page.evaluate('document.querySelector("select[name=staffId]").selectedOptions[0].disabled'));
    const submitted = await adoptAndSubmit(page, inquiry.id);
    assert.notEqual(submitted.staffId, person.id);
  } finally { await browser.close(); }
});

test('leaving brand pricing keeps the actual normal slider, recommendation text and submitted proposal consistent', options, async () => {
  const browser = await launchBrowser(root, { scenarios:true });
  try {
    const page = await browser.page(mobile);
    let state = newGame({ difficulty:'casual', seed:19, origin:'buyer' });
    state.cash = 450000;
    state.company.rep = 95;
    state.company.certs = ['export','audit','brand','supplier'];
    state.company.markets = ['domestic','se-asia','europe','north-america','middle-east'];
    state = apply(state, { type:'invest-venture', id:'brand' });
    for (const person of state.candidates.filter(item => item.role === 'sales').slice(0,2)) state = apply(state, { type:'hire', id:person.id });
    state = apply(state, { type:'invest-venture', id:'warehouse' });
    state = apply(state, { type:'purchase-stock', productId:'clock', quantity:400 });
    // Reachable branded-commerce fixture: an existing branded investment and
    // open markets, with actual generated week-16 inquiries.
    state.week = 16;
    state.inquiries = generateInquiries(state);
    state.tutorial.done = true;
    const inquiry = state.inquiries.find(item => {
      const rec = quoteRecommendation(state, item, {category:'',availability:'all',excludedIds:[]});
      return rec?.config.branded && rec.config.ratio > 105;
    });
    assert.ok(inquiry);
    await start(page, state, inquiry.id);
    await page.click('dialog [data-ui="coach-apply-quote"]');
    const branded = await inspect(page);
    assert.ok(branded.branded && branded.proposal.ratio > 105);
    await page.click('dialog input[name="branded"]');
    const normal = await inspect(page);
    assert.equal(normal.branded, false);
    assert.equal(normal.proposal.branded, false);
    assert.ok(normal.proposal.ratio >= 80 && normal.proposal.ratio <= 105);
    assert.equal(Number(normal.values.ratio), normal.proposal.ratio);
    const actual = quote(await currentState(page), inquiry, normal.proposal);
    assert.ifError(actual.error);
    assert.doesNotMatch(normal.coach, /请选择有效货源、报价和账期|当前改动还不能提交/);
    const submitted = await adoptAndSubmit(page, inquiry.id);
    assert.equal(submitted.branded, true);
  } finally { await browser.close(); }
});
