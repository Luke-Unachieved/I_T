import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/chromium.mjs';
import { currentState, dismissDecisions, loadScenario } from './helpers/scenarios.mjs';

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

test('real Chromium: preserved classic and legacy pages both boot at their distinct URLs', { skip: !enabled, timeout: 60_000 }, async () => {
  const browser = await launchBrowser(root);
  try {
    const page = await browser.page();
    await page.goto('classic.html');
    await page.waitFor(present('#deal-room button'));
    assert.equal(await page.evaluate(present('#v38-root')), false);
    assert.doesNotMatch(await page.evaluate(content), /正在打开工作室/);
    await page.goto('legacy-game.html');
    await page.waitFor(present('#trade-app #start-form'));
    assert.equal(await page.evaluate(present('#v38-root')), false);
    assert.match(await page.evaluate(content), /开张，接第一笔生意/);
    assert.deepEqual(page.errors, []);
  } finally { await browser.close(); }
});

test('real Chromium: a funded 52-week calendar displays annual settlement and can continue', { skip: !enabled, timeout: 120_000 }, async () => {
  const browser = await launchBrowser(root, { scenarios: true });
  try {
    const page = await browser.page();
    await createCompany(page, '全年经营验收');
    await loadScenario(page, `(game)=>{const state=game.newGame({name:'全年经营验收',assistant:'fang',seed:381});state.cash=200000;state.tutorial.done=true;return state;}`);
    await page.click('[data-ui="page"][data-page="company"]');
    await page.fill('[data-form="borrow"] [name="amount"]', '20000');
    await page.click('[data-form="borrow"] button[type="submit"]');
    assert.match(await page.evaluate(content), /220,000/);
    let annual = false;
    for (let i = 0; i < 60 && (await currentState(page)).week < 53; i++) {
      await page.click('[data-action="advance-four"]');
      await page.waitFor(present('dialog[open]'));
      const text = await page.evaluate('document.querySelector("dialog").innerText');
      assert.doesNotMatch(text, /公司破产|NaN|undefined/);
      annual ||= /年度结算.*第 1 年/.test(text);
      await dismissDecisions(page);
    }
    assert.ok(annual);
    assert.match(await page.evaluate(content), /第 2 年 · 第 1 周/);
    await page.click('[data-action="end-week"]');
    await page.waitFor(present('dialog[open]'));
    assert.match(await page.evaluate('document.querySelector("dialog").innerText'), /第 53 周/);
    assert.deepEqual(page.errors, []);
  } finally { await browser.close(); }
});

for (const viewport of [{ name: 'desktop', width: 1440, height: 1000 }, { name: 'iphone13', width: 390, height: 844, mobile: true }]) {
  test(`real Chromium ${viewport.name}: hire, certify, open a market, insure export and factor its invoice`, { skip: !enabled, timeout: 120_000 }, async () => {
    const browser = await launchBrowser(root, { scenarios: true });
    try {
      const page = await browser.page(viewport);
      await page.goto();
      await page.waitFor(present('[data-form="new-game"]'));
      await loadScenario(page, `(game)=>{const state=game.newGame({name:'扩张界面验收',assistant:'fang',seed:381});state.cash=300000;state.company.rep=75;state.year.deliveries=10;state.tutorial.done=true;return state;}`);
      await page.click('[data-ui="page"][data-page="company"]');
      const initial = await currentState(page);
      const candidate = initial.candidates.find(person => person.role === 'sales');
      await page.click(`[data-action="hire"][data-id="${candidate.id}"]`);
      assert.equal((await currentState(page)).staff.length, initial.staff.length + 1);
      await page.click('[data-action="buy-cert"][data-id="export"]');
      assert.ok((await currentState(page)).company.certs.includes('export'));
      await page.click('[data-action="open-market"][data-id="se-asia"]');
      assert.ok((await currentState(page)).company.markets.includes('se-asia'));
      await noOverflow(page, 'expanded company');
      await page.screenshot(`/tmp/trade-v38-phase2-${viewport.name}-company.png`);
      await page.click('[data-action="end-week"]');
      await page.waitFor(present('dialog[open]'));
      await dismissDecisions(page);
      await loadScenario(page, `(game,quotes)=>{const state=${JSON.stringify(await currentState(page))};const inquiry=state.inquiries.find(item=>item.market==='se-asia'&&!quotes.quote(state,item,{source:'stock',ratio:80}).error);if(!inquiry)throw Error('Missing eligible export inquiry');inquiry.terms=3;return state;}`);
      const inquiry = (await currentState(page)).inquiries.find(item => item.market === 'se-asia');
      await page.click('[data-ui="page"][data-page="inquiries"]');
      await page.click(`[data-ui="quote-open"][data-id="${inquiry.id}"]`);
      await page.waitFor(present('dialog[open] [data-form="quote"]'));
      await page.evaluate(`(()=>{for(const [name,value] of [['ratio','80'],['financing','insured'],['staffId',${JSON.stringify(candidate.id)}]]){const e=document.querySelector('dialog [name='+name+']');e.value=value;e.dispatchEvent(new Event('input',{bubbles:true}));}})()`);
      const quotation = await page.evaluate('document.querySelector("dialog").innerText');
      assert.match(quotation, /出口信用保险/);
      assert.match(quotation, /退税/);
      assert.doesNotMatch(quotation, /NaN|undefined|\[object Object\]/);
      await noOverflow(page, 'insured export quotation');
      await page.screenshot(`/tmp/trade-v38-phase2-${viewport.name}-quote.png`);
      await page.click('dialog [data-form="quote"] button[type="submit"]');
      await page.waitFor('!document.querySelector("dialog").open');
      for (let i = 0; i < 14 && !(await currentState(page)).receivables.some(item => item.status === 'open' || item.status === 'overdue'); i++) {
        await page.click('[data-action="end-week"]');
        await page.waitFor(present('dialog[open]'));
        await dismissDecisions(page);
      }
      const before = await currentState(page);
      const invoice = before.receivables.find(item => item.status === 'open' || item.status === 'overdue');
      assert.ok(invoice, 'Real delivered export should produce an invoice');
      await page.click('[data-ui="page"][data-page="orders"]');
      assert.match(await page.evaluate(content), /退税/);
      await page.click(`[data-action="factor"][data-id="${invoice.id}"]`);
      const factored = await currentState(page);
      assert.equal(factored.receivables.find(item => item.id === invoice.id).status, 'factored');
      assert.ok(factored.cash > before.cash);
      await page.click('details:has(table[aria-label="最近回款"]) > summary');
      assert.match(await page.evaluate(content), /保理到账/);
      await noOverflow(page, 'export orders and factoring');
      await page.screenshot(`/tmp/trade-v38-phase2-${viewport.name}-orders.png`);
      assert.deepEqual(page.errors, []);
    } finally { await browser.close(); }
  });
}
