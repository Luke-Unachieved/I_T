import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/chromium.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const enabled = process.env.V38_BROWSER === '1';
const present = selector => `Boolean(document.querySelector(${JSON.stringify(selector)}))`;
const content = 'document.body.innerText';

async function noOverflow(page, label) {
  const layout = await page.evaluate(`({width:innerWidth,scroll:document.documentElement.scrollWidth,body:document.body.scrollWidth})`);
  assert.ok(layout.scroll <= layout.width + 1, `${label}: document exceeds viewport: ${JSON.stringify(layout)}`);
  assert.ok(layout.body <= layout.width + 1, `${label}: body exceeds viewport: ${JSON.stringify(layout)}`);
}

async function createCompany(page, name) {
  await page.goto();
  await page.waitFor(present('[data-form="new-game"]'));
  assert.equal(await page.evaluate('document.querySelector("a[href=\\"classic.html\\"]")?.textContent'), '玩经典版（V37）');
  assert.ok(await page.evaluate(present('a[href="legacy-game.html"]')));
  await noOverflow(page, 'opening');
  await page.fill('[data-form="new-game"] [name="name"]', name);
  await page.click('[data-form="new-game"] button[type="submit"]');
  await page.waitFor(present('#page-title'));
}

for (const viewport of [{ name: 'desktop', width: 1440, height: 1000 }, { name: 'iphone13', width: 390, height: 844, mobile: true }]) {
  test(`real Chromium ${viewport.name}: five-step tutorial, bid, summary and every page`, { skip: !enabled, timeout: 120_000 }, async () => {
    const browser = await launchBrowser(root);
    try {
      const page = await browser.page(viewport);
      await createCompany(page, `${viewport.name} 贸易验收`);
      assert.match(await page.evaluate('document.querySelector(".tutorial").innerText'), /1 \/ 5/);
      await noOverflow(page, 'office');
      await page.click('[data-ui="page"][data-page="inquiries"]');
      assert.match(await page.evaluate('document.querySelector(".tutorial").innerText'), /2 \/ 5/);
      await page.waitFor(present('[data-ui="quote-open"]'));
      await page.click('[data-ui="quote-open"]');
      await page.waitFor(present('dialog[open] [data-form="quote"]'));
      assert.match(await page.evaluate('document.querySelector("dialog .tutorial").innerText'), /3 \/ 5/);
      assert.ok(await page.evaluate(present('dialog [data-tour="cash-forecast"]')));
      await page.evaluate('(() => {const e=document.querySelector("dialog input[name=ratio]");e.value="80";e.dispatchEvent(new Event("input",{bubbles:true}));})()');
      assert.match(await page.evaluate('document.querySelector("dialog").innerText'), /100%/);
      await noOverflow(page, 'quote');
      await page.screenshot(`/tmp/trade-v38-phase1-${viewport.name}-quote.png`);
      await page.click('dialog [data-form="quote"] button[type="submit"]');
      await page.waitFor('!document.querySelector("dialog").open');
      assert.match(await page.evaluate('document.querySelector(".tutorial").innerText'), /4 \/ 5/);
      assert.match(await page.evaluate(content), /已提交报价/);
      await page.click('[data-action="end-week"]');
      await page.waitFor('document.querySelector("dialog[open] #modal-title")?.textContent.includes("本周小结")');
      assert.match(await page.evaluate('document.querySelector("dialog .tutorial").innerText'), /5 \/ 5/);
      const summary = await page.evaluate('document.querySelector("dialog").innerText');
      assert.match(summary, /米拉/);
      assert.doesNotMatch(summary, /\[object Object\]|NaN|undefined/);
      await noOverflow(page, 'summary');
      await page.click('[data-ui="finish-tutorial"]');
      assert.equal(await page.evaluate('document.querySelector(".tutorial") !== null'), false);
      await page.click('dialog [data-ui="close-dialog"]');
      for (const id of ['office', 'inquiries', 'orders', 'company', 'offwork']) {
        await page.click(`[data-ui="page"][data-page="${id}"]`);
        await page.waitFor(present('#page-title'));
        await noOverflow(page, id);
        assert.doesNotMatch(await page.evaluate(content), /\[object Object\]|NaN|undefined/);
      }
      const controls = await page.evaluate(`Array.from(document.querySelectorAll('nav button,.week-controls button')).filter(e=>e.getClientRects().length).map(e=>({text:e.textContent.trim(),height:e.getBoundingClientRect().height,width:e.getBoundingClientRect().width}))`);
      assert.ok(controls.length >= 7);
      for (const control of controls) assert.ok(control.height >= 44 && control.width >= 44, `Small main control: ${JSON.stringify(control)}`);
      await page.click('[data-ui="page"][data-page="office"]');
      await page.screenshot(`/tmp/trade-v38-phase1-${viewport.name}.png`);
      assert.deepEqual(page.errors, []);
    } finally { await browser.close(); }
  });
}

test('real Chromium: a funded 52-week calendar displays annual settlement and can continue', { skip: !enabled, timeout: 120_000 }, async () => {
  const browser = await launchBrowser(root);
  try {
    const page = await browser.page();
    await createCompany(page, '全年经营验收');
    await page.click('[data-ui="skip-tutorial"]');
    await page.click('[data-ui="page"][data-page="company"]');
    await page.fill('[data-form="borrow"] [name="amount"]', '20000');
    await page.click('[data-form="borrow"] button[type="submit"]');
    assert.match(await page.evaluate(content), /70,000/);
    for (let i = 0; i < 13; i++) {
      await page.click('[data-action="advance-four"]');
      await page.waitFor(present('dialog[open]'));
      const text = await page.evaluate('document.querySelector("dialog").innerText');
      assert.doesNotMatch(text, /公司破产|NaN|undefined/);
      if (i === 12) assert.match(text, /年度结算.*第 1 年/);
      await page.click('dialog [data-ui="close-dialog"]');
    }
    assert.match(await page.evaluate(content), /第 2 年 · 第 1 周/);
    await page.click('[data-action="end-week"]');
    await page.waitFor(present('dialog[open]'));
    assert.match(await page.evaluate('document.querySelector("dialog").innerText'), /第 53 周/);
    assert.deepEqual(page.errors, []);
  } finally { await browser.close(); }
});
