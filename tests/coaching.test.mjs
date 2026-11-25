import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { newGame, forecast } from '../v38/engine/game.js';
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
      assert.deepEqual(page.errors, []);
    } finally { await browser.close(); }
  });
}
