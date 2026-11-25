import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/chromium.mjs';
import { currentState, loadScenario } from './helpers/scenarios.mjs';
import { SAVE_KEY } from '../v38/ui/save.js';
import { forecast } from '../v38/engine/game.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const enabled = process.env.V38_BROWSER === '1';
const present = selector => `Boolean(document.querySelector(${JSON.stringify(selector)}))`;
const saved = page => page.evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(SAVE_KEY)})).state`);
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const coach = '.workspace > .coach-card';
const quoteForm = 'dialog[open] form[data-form="quote"]';
const submit = `${quoteForm} button[type="submit"]`;
const seedOffers = [
  ['w1-1', 'stock'], ['w1-2', 'factory'], ['w1-3', 'stock'], ['w1-4', 'factory'],
  ['w1-5', 'factory'], ['w1-6', 'stock'], ['w1-7', 'factory'],
];

async function key(page, key, windowsVirtualKeyCode) {
  await page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key, code: key, windowsVirtualKeyCode });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, windowsVirtualKeyCode });
}

async function capacityText(page, used, capacity) {
  assert.equal(await page.evaluate('document.querySelector(".inquiry-sent-link").innerText.trim()'), used>capacity?`已报价 ${used} 笔（当前能力 ${capacity} 笔）`:`本周已报价 ${used} / ${capacity}`);
  if(used>capacity){
    assert.match(await page.evaluate('document.querySelector(".inquiry-guidance").innerText'),/已提交的报价仍然有效/);
    assert.ok(await page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'long shrink label must fit the narrow inbox');
  }
  assert.doesNotMatch(await page.evaluate('document.body.innerText'), /三个报价位|3 个报价位|已用报价位/);
}

async function openQuote(page, id) {
  await page.click(`article[data-inquiry-id="${id}"] [data-ui="quote-open"]`);
  await page.waitFor(present(quoteForm));
  assert.equal(await page.evaluate(`document.querySelector(${JSON.stringify(quoteForm)}).dataset.id`), id);
}

async function prepareQuote(page, source, staffId = '') {
  await page.click(`dialog label:has(input[name="source"][value="${source}"]:not(:disabled))`);
  await page.evaluate('document.querySelector("dialog input[name=ratio]").focus()');
  await key(page, 'Home', 36);
  await page.evaluate('document.querySelector("dialog select[name=staffId]").focus()');
  await key(page, 'Home', 36);
  if (staffId) await key(page, 'ArrowDown', 40);
  const fields = await page.evaluate('Object.fromEntries(new FormData(document.querySelector("dialog form[data-form=quote]")))');
  assert.equal(fields.source, source);
  assert.equal(fields.ratio, '80');
  assert.equal(fields.staffId, staffId);
}

async function submitQuote(page, id, expected) {
  assert.equal(await page.evaluate(`document.querySelector(${JSON.stringify(submit)}).disabled`), false, `valid ${id} must remain submittable`);
  await page.click(submit);
  await page.waitFor('!document.querySelector("dialog").open');
  const current = await saved(page);
  assert.equal(current.bids.length, expected);
  assert.equal(current.bids.at(-1).inquiryId, id);
  assert.equal(new Set(current.bids.map(bid => bid.inquiryId)).size, expected);
  await pause(410); // deliberately separate the confirmation from the next row gesture
}

async function currentFilter(page, value) {
  await page.evaluate(`(()=>{const select=document.querySelector('select[data-ui=inquiry-filter][name=availability]');select.value=${JSON.stringify(value)};select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
}

async function closeQuote(page) {
  await page.click('dialog [data-ui="close-dialog"]');
  await page.waitFor('!document.querySelector("dialog").open');
  await pause(410);
}

for (const viewport of [{ width: 320, height: 568, mobile: true, assistant: 'fang', initialCapacity: 5 }, { width: 390, height: 844, mobile: true, assistant: 'liang', initialCapacity: 4 }]) {
  test(`ordinary fresh company expands weekly quote capacity with real staff, preserving all bids and settlement at ${viewport.width}px`, { skip: !enabled, timeout: 120_000 }, async () => {
    const browser = await launchBrowser(root);
    try {
      const page = await browser.page(viewport);
      await page.goto(); await page.waitFor(present('[data-form="new-game"]'));
      // Only the opening form's random draw is fixed. Every business action
      // goes through normal player-facing controls in an ordinary new save.
      await page.evaluate('(()=>{const random=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=a=>{if(a instanceof Uint32Array&&a.length===1){a[0]=381;return a;}return random(a);};})()');
      await page.click(`label.assistant-choice:has(input[name="assistant"][value="${viewport.assistant}"])`);
      await page.evaluate('document.querySelector("[name=difficulty]").focus()');
      await key(page, 'Home', 36); await key(page, 'ArrowDown', 40);
      assert.equal(await page.evaluate('document.querySelector("[name=difficulty]").value'), 'normal');
      await page.fill('[name="name"]', `团队报价能力 ${viewport.width}`);
      await page.click('[data-form="new-game"] button[type="submit"]');
      const initial = await saved(page);
      const offers = seedOffers.slice(0, viewport.initialCapacity + 2);
      assert.equal(initial.difficulty, 'normal');
      assert.equal(initial.staff[0].id, viewport.assistant);
      assert.deepEqual(initial.inquiries.map(inquiry => inquiry.id), offers.map(([id]) => id));
      await page.click('[data-ui="skip-tutorial"]');
      await page.click('.nav [data-page="inquiries"]');
      await capacityText(page, 0, viewport.initialCapacity);

      for (let index = 0; index < 2; index++) {
        const [id, source] = offers[index];
        await openQuote(page, id); await prepareQuote(page, source, viewport.assistant); await submitQuote(page, id, index + 1);
      }
      // A draft saves a genuine employee choice before that employee gains
      // their third assignment; reopening it must reflect the new workload.
      await openQuote(page, offers[3][0]);
      await prepareQuote(page, offers[3][1], viewport.assistant);
      await closeQuote(page);
      await openQuote(page, offers[2][0]);
      await prepareQuote(page, offers[2][1], viewport.assistant);
      await submitQuote(page, offers[2][0], 3);
      await capacityText(page, 3, viewport.initialCapacity);
      assert.equal(await page.evaluate(present(`article[data-inquiry-id="${offers[0][0]}"] [data-ui="quote-open"]`)), false, 'submitted inquiry cannot be quoted twice');
      await currentFilter(page, 'available');
      assert.ok(await page.evaluate(present(`article[data-inquiry-id="${offers[3][0]}"] [data-ui="quote-open"]`)));
      await openQuote(page, offers[3][0]);
      assert.ok(await page.evaluate(`document.querySelector('dialog option[value="${viewport.assistant}"]').disabled`), 'employee with three commitments cannot be selected for a fourth');
      assert.equal(await page.evaluate(`document.querySelector(${JSON.stringify(submit)}).disabled`), true, 'restored draft with a now-full employee cannot submit');
      assert.match(await page.evaluate('document.querySelector("dialog .quote-risk").innerText'), /负责人.*3 笔报价或订单/);
      await page.screenshot(`/tmp/v38-capacity-${viewport.width}-staff-load.png`);
      await prepareQuote(page, offers[3][1]);
      await submitQuote(page, offers[3][0], 4);
      assert.equal((await saved(page)).bids.filter(bid => bid.staffId === viewport.assistant).length, 3);

      // Withdrawal immediately frees one place and the original customer
      // thread can be resubmitted. This includes the fourth quote at 390px.
      await page.click(`[data-action="withdraw-bid"][data-id="${offers[3][0]}"]`);
      await capacityText(page, 3, viewport.initialCapacity);
      await openQuote(page, offers[3][0]); await prepareQuote(page, offers[3][1]); await submitQuote(page, offers[3][0], 4);
      for (let index = 4; index < viewport.initialCapacity; index++) {
        await openQuote(page, offers[index][0]); await prepareQuote(page, offers[index][1]); await submitQuote(page, offers[index][0], index + 1);
      }
      await capacityText(page, viewport.initialCapacity, viewport.initialCapacity);
      assert.equal(await page.evaluate('document.querySelectorAll("article[data-inquiry-id]").length'), 0, 'available filter respects real team capacity');
      await currentFilter(page, 'all');
      await openQuote(page, offers[viewport.initialCapacity][0]);
      assert.equal(await page.evaluate(`document.querySelector(${JSON.stringify(submit)}).disabled`), true);
      assert.match(await page.evaluate('document.querySelector("dialog").innerText'), /团队本周报价能力已满/);
      await closeQuote(page);
      await page.screenshot(`/tmp/v38-capacity-${viewport.width}-full.png`);

      // Reload preserves the actual current quotes and dynamic capacity.
      const beforeReload = await saved(page);
      await page.send('Page.reload'); await page.waitFor(present('[data-ui="resume-save"]'));
      await page.click('[data-ui="resume-save"]');
      assert.deepEqual(await saved(page), beforeReload);
      await capacityText(page, viewport.initialCapacity, viewport.initialCapacity);

      // Hire real candidates through development, increasing capacity in the
      // same week. An operations assistant starts with four, not five.
      await page.click('.nav [data-page="company"]');
      await page.click('[data-ui="development-tab"][data-id="team"]');
      const candidate = (await saved(page)).candidates.find(person => person.role === 'sales');
      await page.click(`[data-action="hire"][data-id="${candidate.id}"]`);
      const expanded = viewport.initialCapacity + 2;
      assert.ok((await saved(page)).staff.some(person => person.id === candidate.id));
      await page.click('.nav [data-page="inquiries"]');
      await capacityText(page, viewport.initialCapacity, expanded);
      for (let index = viewport.initialCapacity; index < expanded; index++) {
        await openQuote(page, offers[index][0]); await prepareQuote(page, offers[index][1]); await submitQuote(page, offers[index][0], index + 1);
      }
      assert.equal(expanded, offers.length);
      await capacityText(page, expanded, expanded);

      // An unassigned hire can leave. The resulting reduced capacity is
      // prospective: already-submitted quotations still settle normally.
      const accepted = (await saved(page)).bids;
      await page.click('.nav [data-page="company"]'); await page.click('[data-ui="development-tab"][data-id="team"]');
      await page.click(`[data-action="dismiss-staff"][data-id="${candidate.id}"]`);
      assert.deepEqual((await saved(page)).bids, accepted);
      assert.equal((await saved(page)).staff.length, 1);
      await page.click('.nav [data-page="inquiries"]'); await capacityText(page, offers.length, viewport.initialCapacity);
      await page.screenshot(`/tmp/v38-capacity-${viewport.width}-shrink.png`);
      await page.click('.nav [data-page="offwork"]'); await page.click('.week-controls [data-action="end-week"]');
      await page.waitFor(present('dialog[open] .summary-totals'));
      const result = await saved(page);
      assert.equal(result.week, 2);
      assert.equal(result.bids.length, 0);
      assert.deepEqual([...result.summary.won, ...result.summary.lost].map(item => item.inquiryId).sort(), offers.map(([id]) => id).sort());
      assert.equal(result.summary.won.length + result.summary.lost.length, offers.length);
      assert.equal(result.orders.length, result.summary.won.length);
      assert.match(await page.evaluate('document.querySelector("dialog .summary-totals").innerText'), new RegExp(`中单\\s*${result.summary.won.length} 笔`));
      const rendered = await page.evaluate(`(()=>{const buyers=title=>{const heading=[...document.querySelectorAll('dialog h3')].find(h=>h.textContent===title);return [...heading?.nextElementSibling?.querySelectorAll('tbody tr')??[]].map(row=>row.cells[0].textContent.trim()).sort()};return {won:buyers('中单通知'),lost:buyers('未中单')};})()`);
      assert.deepEqual(rendered.won, result.summary.won.map(item => item.buyer.name).sort());
      assert.deepEqual(rendered.lost, result.summary.lost.map(item => item.buyer.name).sort());
      assert.deepEqual(page.errors, []);
      await page.screenshot(`/tmp/v38-capacity-${viewport.width}-summary.png`);
    } finally { await browser.close(); }
  });
}

test('after three submitted quotes the assistant recommends a genuinely profitable fourth, but stops for unsafe funds', { skip: !enabled, timeout: 90_000 }, async () => {
  const browser = await launchBrowser(root, { scenarios: true });
  try {
    const page = await browser.page({ width: 390, height: 844, mobile: true });
    await page.goto(); await page.waitFor(present('[data-form="new-game"]'));
    const fixture = `game=>{let s=game.newGame({name:'第四笔经营建议验收',seed:381,difficulty:'casual'});s.cash=150000;s.tutorial.done=true;for(const [id,source] of [['w1-1','stock'],['w1-2','factory'],['w1-3','stock']]){const result=game.act(s,{type:'bid',inquiryId:id,source,ratio:80});if(result.error)throw Error(result.error);s=result.state;}return s;}`;
    await loadScenario(page, fixture);
    await page.click('.nav [data-page="inquiries"]');
    const before = await currentState(page);
    assert.equal(before.bids.length, 3);
    const id = await page.evaluate(`document.querySelector('${coach} .coach-action[data-ui="quote-open"]')?.dataset.id`);
    assert.ok(id && !before.bids.some(bid => bid.inquiryId === id), 'safe distinct fourth offer must be recommended, not a forced settlement after three');
    await page.click(`${coach} [data-ui="quote-open"]`);
    if (await page.evaluate(present('dialog [data-ui="coach-apply-quote"]'))) await page.click('dialog [data-ui="coach-apply-quote"]');
    await page.click('dialog [data-ui="coach-review-submit"]');
    assert.equal((await currentState(page)).bids.length, 3, 'review never submits automatically');
    await page.click(submit);
    const after = await currentState(page);
    assert.equal(after.bids.length, 4);
    assert.equal(after.bids.at(-1).inquiryId, id);
    assert.ok(after.bids.at(-1).profit > 0 && forecast(after).every(row => row.hypothetical >= 5000));
    await page.screenshot('/tmp/v38-capacity-safe-fourth.png');

    // Same genuine first three commitments, but cash exhausted and no credit
    // room. No fourth recommendation may be manufactured to fill capacity.
    const shortage = { ...before, cash: 1, loan: before.creditLine };
    await loadScenario(page, `game=>(${JSON.stringify(shortage)})`);
    await page.click('.nav [data-page="inquiries"]');
    assert.equal(await page.evaluate(present(`${coach} .coach-action[data-ui="quote-open"]`)), false);
    assert.match(await page.evaluate(`document.querySelector('${coach}').innerText`), /现金|资金|周转/);
    assert.equal((await currentState(page)).bids.length, 3);
    // Manual preview is still available below the team limit and explicitly
    // reports the resulting cash shortfall rather than inventing a slot error.
    await openQuote(page, 'w1-4');
    assert.ok(await page.evaluate(present('dialog [data-tour="cash-forecast"].negative')));
    assert.match(await page.evaluate('document.querySelector("dialog [data-tour=cash-forecast]").innerText'), /还差|缺口|不足/);
    assert.equal(await page.evaluate(`document.querySelector(${JSON.stringify(submit)}).disabled`), false);
    assert.deepEqual(page.errors, []);
  } finally { await browser.close(); }
});

test('unused team capacity does not release inventory already reserved for another quotation', { skip: !enabled, timeout: 90_000 }, async () => {
  const browser = await launchBrowser(root, { scenarios: true });
  try {
    const page = await browser.page({ width: 320, height: 568, mobile: true });
    await page.goto(); await page.waitFor(present('[data-form="new-game"]'));
    // Seed 381 has two legitimate carafe inquiries. Inventory of 144 is
    // sufficient for the second only until the first reserves its 72 units.
    await loadScenario(page, `game=>{let s=game.newGame({name:'库存约束验收',seed:381,difficulty:'normal',assistant:'fang'});s.tutorial.done=true;s.inventory.push({productId:'carafe',quantity:144,unitCost:10});for(const [id,source] of [['w1-1','stock'],['w1-2','inventory'],['w1-3','stock']]){const result=game.act(s,{type:'bid',inquiryId:id,source,ratio:80});if(result.error)throw Error(result.error);s=result.state;}return s;}`);
    await page.click('.nav [data-page="inquiries"]');
    await capacityText(page, 3, 5);
    assert.equal(await page.evaluate(present('article[data-inquiry-id="w1-2"] [data-ui="quote-open"]')), false);
    await openQuote(page, 'w1-5');
    assert.ok(await page.evaluate('document.querySelector(\'dialog input[name=source][value=inventory]\').disabled'));
    assert.match(await page.evaluate('document.querySelector(\'dialog label:has(input[name=source][value=inventory])\').innerText'), /预留量.*库存不足/);
    await prepareQuote(page, 'factory');
    await submitQuote(page, 'w1-5', 4);
    const state = await currentState(page);
    assert.equal(state.bids.find(bid => bid.inquiryId === 'w1-2').source, 'inventory');
    assert.equal(state.bids.find(bid => bid.inquiryId === 'w1-5').source, 'factory');
    assert.equal(state.inventory.find(item => item.productId === 'carafe').quantity, 144, 'quotation reserves inventory before settlement without immediately consuming it');
    assert.deepEqual(page.errors, []);
  } finally { await browser.close(); }
});

test('a reduced simple-mode team explains prior valid bids and view-only remaining letters without an impossible fraction',{skip:!enabled,timeout:90000},async()=>{
  const browser=await launchBrowser(root,{scenarios:true});
  try {
    const page=await browser.page({width:320,height:568,mobile:true});
    await page.goto();await page.waitFor(present('[data-form=new-game]'));
    await loadScenario(page,`game=>{let s=game.newGame({difficulty:'casual',seed:381,assistant:'fang'});s.cash=150000;s.tutorial.done=true;const hire=game.act(s,{type:'hire',id:'tao'});if(hire.error)throw Error(hire.error);s=hire.state;for(const [id,source] of ${JSON.stringify(seedOffers.slice(0,6))}){const result=game.act(s,{type:'bid',inquiryId:id,source,ratio:80});if(result.error)throw Error(result.error);s=result.state;}return s;}`);
    await page.click('.nav [data-page=company]');
    await page.click('[data-ui=development-tab][data-id=team]');
    const original=(await currentState(page)).bids;
    await page.click('[data-action=dismiss-staff][data-id=tao]');
    assert.deepEqual((await currentState(page)).bids,original);
    await page.click('.nav [data-page=inquiries]');
    await capacityText(page,6,5);
    const coachCopy=await page.evaluate(`document.querySelector('${coach}').innerText`);
    assert.match(coachCopy,/已报价 6 笔（当前能力 5 笔）.*已提交的报价仍然有效/s);
    assert.doesNotMatch(coachCopy,/6\s*\/\s*5/);
    await openQuote(page,'w1-7');
    assert.equal(await page.evaluate(`document.querySelector(${JSON.stringify(submit)}).disabled`),true);
    assert.match(await page.evaluate('document.querySelector("dialog .coach-card").innerText'),/已报价 6 笔（当前能力 5 笔）.*已经提交的报价仍然有效/s);
    assert.match(await page.evaluate('document.querySelector("dialog [data-quote-preview=submit]").innerText'),/已报价 6 笔（当前能力 5 笔）.*已提交的报价仍然有效/s);
    await page.screenshot('/tmp/v38-capacity-shrink-casual-320.png');
    assert.deepEqual((await currentState(page)).bids,original);
    assert.deepEqual(page.errors,[]);
  }finally{await browser.close();}
});
