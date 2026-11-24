import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/chromium.mjs';
import { currentState, dismissDecisions, loadScenario } from './helpers/scenarios.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const enabled = process.env.V38_BROWSER === '1';
const options = { skip: !enabled, timeout: 90_000 };
const present = selector => `Boolean(document.querySelector(${JSON.stringify(selector)}))`;
const body = 'document.body.innerText';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function createCompany(page, name = '体验问题回归') {
  await page.goto();
  await page.waitFor(present('[data-form="new-game"]'));
  await page.fill('[data-form="new-game"] [name="name"]', name);
  await page.click('[data-form="new-game"] button[type="submit"]');
  await page.waitFor(present('#page-title'));
}
async function key(page, key, code, windowsVirtualKeyCode) {
  await page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key, code, windowsVirtualKeyCode });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode });
}
async function doubleClick(page, selector) {
  const target = await page.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.scrollIntoView({block:'center',behavior:'instant'});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...target });
  for (const clickCount of [1, 2]) {
    if (clickCount === 2) await pause(70);
    await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...target, button: 'left', clickCount });
    await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...target, button: 'left', clickCount });
  }
}
async function noOverflow(page, label) {
  const result = await page.evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth})');
  assert.ok(result.scroll <= result.width + 1, `${label}: ${JSON.stringify(result)}`);
}
async function waitUntil(predicate) {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > 8000) throw new Error('Expected intercepted image requests did not arrive');
    await pause(25);
  }
}

test('B01: a blocked required module gives a visible retry that recovers without a blank startup', options, async () => {
  const browser = await launchBrowser(root);
  try {
    const page = await browser.page({ width: 390, height: 844, mobile: true });
    await page.send('Network.enable');
    await page.send('Network.setCacheDisabled', { cacheDisabled: true });
    await page.send('Network.setBlockedURLs', { urls: ['*v38/ui/app.js*'] });
    await page.goto();
    await page.waitFor(present('[data-boot-retry]:not([hidden])'));
    assert.match(await page.evaluate(body), /加载.*检查网络|没能加载[\s\S]*网络/);
    assert.equal(await page.evaluate(present('[data-form="new-game"]')), false);
    await noOverflow(page, 'bootstrap error');
    await page.send('Network.setBlockedURLs', { urls: [] });
    await page.click('[data-boot-retry]');
    await page.waitFor(present('[data-form="new-game"]'));
    assert.equal(await page.evaluate(present('[data-boot-retry]')), false);
  } finally { await browser.close(); }
});

test('E01/E10: real double banking submits once, corrected Chinese forms remain usable', options, async () => {
  const browser = await launchBrowser(root, { scenarios: true });
  try {
    const page = await browser.page();
    await page.goto();
    await page.waitFor(present('[data-form="new-game"]'));
    await page.click('[data-form="new-game"] button[type="submit"]');
    await page.waitFor('document.querySelector("[data-form=new-game] [data-field-error]")?.textContent.trim().length>0');
    assert.match(await page.evaluate('document.querySelector("[data-form=new-game] [data-field-error]").innerText'), /公司.*名|名字/);
    assert.equal(await page.evaluate('document.querySelector("[name=name]").getAttribute("aria-invalid")'), 'true');
    await page.fill('[data-form="new-game"] [name="name"]', '重复借还款验收');
    await page.click('[data-form="new-game"] button[type="submit"]');
    await page.waitFor(present('#page-title'));
    await page.click('[data-ui="page"][data-page="company"]');
    const initial = await currentState(page);
    await page.fill('[data-form="borrow"] [name="amount"]', String(initial.creditLine + 1));
    await page.click('[data-form="borrow"] button[type="submit"]');
    assert.match(await page.evaluate('document.querySelector("[data-form=borrow] [data-field-error]").innerText'), /额度|最多|借/);
    assert.equal((await currentState(page)).cash, initial.cash);
    await page.fill('[data-form="borrow"] [name="amount"]', '1000');
    await page.click('[data-form="borrow"] button[type="submit"]');
    assert.equal((await currentState(page)).loan, 1000);
    assert.match(await page.evaluate(body), /借款[\s\S]*1,000/);
    assert.equal(await page.evaluate('document.querySelector("[data-form=borrow] [name=amount]").value'), '');
    await page.fill('[data-form="borrow"] [name="amount"]', '5000');
    await doubleClick(page, '[data-form="borrow"] button[type="submit"]');
    assert.equal((await currentState(page)).loan, 6000);
    assert.equal((await currentState(page)).cash, initial.cash + 6000);
    await page.fill('[data-form="repay"] [name="amount"]', '5000');
    await doubleClick(page, '[data-form="repay"] button[type="submit"]');
    assert.equal((await currentState(page)).loan, 1000);
    assert.equal((await currentState(page)).cash, initial.cash + 1000);
    await page.fill('[data-form="borrow"] [name="amount"]', '1000');
    await page.click('[data-form="borrow"] button[type="submit"]');
    assert.equal((await currentState(page)).loan, 2000, 'A fresh edited banking instruction should not be suppressed');
    assert.equal(await page.evaluate(present('[data-field-error][role="alert"]:not(:empty)')), false);
  } finally { await browser.close(); }
});

test('E02: tutorial next and ESC always return to a usable current target', options, async () => {
  const browser = await launchBrowser(root);
  try {
    const page = await browser.page();
    await createCompany(page);
    await page.click('[data-ui="page"][data-page="inquiries"]');
    await page.click('[data-ui="quote-open"]');
    await page.waitFor(present('dialog[open] [data-ui="tutorial-next"]'));
    await key(page, 'Escape', 'Escape', 27);
    assert.equal(await page.evaluate('document.querySelector("dialog").open'), false);
    assert.match(await page.evaluate('document.querySelector(".tutorial").innerText'), /2 \/ 5/);
    assert.equal(await page.evaluate('document.activeElement.dataset.ui'), 'quote-open');
    await page.click('[data-ui="quote-open"]');
    await page.click('dialog [data-ui="tutorial-next"]');
    assert.equal(await page.evaluate('document.querySelector("dialog").open'), false);
    assert.match(await page.evaluate('document.querySelector(".tutorial").innerText'), /4 \/ 5/);
    assert.equal(await page.evaluate('document.activeElement.dataset.tour'), 'end-week');
    await page.click('[data-action="end-week"]');
    await page.waitFor('document.querySelector("dialog[open] #modal-title")?.textContent.includes("本周小结")');
  } finally { await browser.close(); }
});

test('E04: no-save boundary is visible before play and when leaving, without promising recovery', options, async () => {
  const browser = await launchBrowser(root);
  try {
    const page = await browser.page();
    await page.goto();
    await page.waitFor(present('[data-session-warning="opening"]'));
    assert.match(await page.evaluate('document.querySelector("[data-session-warning=opening]").innerText'), /刷新.*关闭[\s\S]*(结束|重新|重开)|不保存/);
    await page.fill('[name="name"]', '会话边界验收');
    await page.click('[data-form="new-game"] button[type="submit"]');
    await page.waitFor(present('#page-title'));
    await page.click('[data-ui="page"][data-page="offwork"]');
    assert.match(await page.evaluate('document.querySelector("[data-session-warning=leaving]").innerText'), /刷新.*关闭[\s\S]*(结束|重新|重开)|不保存/);
    await page.send('Page.reload');
    await page.waitFor(present('[data-form="new-game"]'));
    assert.equal(await page.evaluate('document.querySelector("[name=name]").value'), '');
  } finally { await browser.close(); }
});

test('E05: held product and comic requests cannot shift the mobile price control when released', options, async () => {
  const browser = await launchBrowser(root);
  try {
    const page = await browser.page({ width: 390, height: 844, mobile: true });
    const held = new Map();
    page.on('Fetch.requestPaused', event => held.set(event.requestId, event.request.url));
    await page.send('Network.enable');
    await page.send('Network.setCacheDisabled', { cacheDisabled: true });
    await page.send('Fetch.enable', { patterns: [
      { urlPattern: '*deal-work-product-lamp-trial.webp*', requestStage: 'Request' },
      { urlPattern: '*deal-client-comic-mira-trial-paid.webp*', requestStage: 'Request' },
    ] });
    await createCompany(page);
    await page.click('[data-ui="page"][data-page="inquiries"]');
    await page.click('[data-ui="quote-open"]');
    await page.click('dialog details:has(.buyer-comic) > summary');
    await waitUntil(() => held.size >= 2);
    const measure = `(()=>{const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {top:r.top,height:r.height}};return {product:rect('dialog .media-frame.quote-product-image'),comic:rect('dialog .media-frame.buyer-comic'),slider:rect('dialog input[name=ratio]')}})()`;
    const before = await page.evaluate(measure);
    assert.ok(before.product.height > 100 && before.comic.height > 100);
    for (const requestId of held.keys()) await page.send('Fetch.continueRequest', { requestId });
    await page.send('Fetch.disable');
    await page.waitFor(`['.quote-product-image','.buyer-comic'].every(s=>document.querySelector('dialog .media-frame'+s)?.dataset.mediaState==='loaded')`);
    const after = await page.evaluate(measure);
    for (const key of ['product', 'comic', 'slider']) {
      assert.ok(Math.abs(after[key].height - before[key].height) < 2, `${key}: reserved height changed`);
      assert.ok(Math.abs(after[key].top - before[key].top) < 3, `${key}: vertical position moved`);
    }
  } finally { await browser.close(); }
});

test('E06: failed optional comic explains the failure, retries, and keeps the quote usable', options, async () => {
  const browser = await launchBrowser(root);
  try {
    const page = await browser.page({ width: 390, height: 844, mobile: true });
    await page.send('Network.enable');
    await page.send('Network.setCacheDisabled', { cacheDisabled: true });
    await page.send('Network.setBlockedURLs', { urls: ['*deal-work-product-lamp-trial.webp*', '*deal-client-comic-mira-trial-paid.webp*'] });
    await createCompany(page);
    await page.click('[data-ui="page"][data-page="inquiries"]');
    await page.click('[data-ui="quote-open"]');
    await page.click('dialog details:has(.buyer-comic) > summary');
    await page.waitFor(`document.querySelector('dialog .media-frame.buyer-comic')?.dataset.mediaState==='error'`);
    const failure = await page.evaluate('document.querySelector("dialog .media-frame.buyer-comic .media-fallback").innerText');
    assert.match(failure, /图片|漫画/);
    assert.match(failure, /未.*加载|加载.*失败|重试/);
    assert.equal(await page.evaluate('document.querySelector("dialog [data-form=quote] button[type=submit]").disabled'), false);
    await page.send('Network.setBlockedURLs', { urls: [] });
    await page.click('dialog .buyer-comic [data-media-retry]');
    await page.waitFor(`document.querySelector('dialog .media-frame.buyer-comic')?.dataset.mediaState==='loaded'`);
    await page.click('dialog [data-form="quote"] button[type="submit"]');
    await page.waitFor('!document.querySelector("dialog").open');
    assert.match(await page.evaluate(body), /已用报价位 1 \/ 3/);
  } finally { await browser.close(); }
});

test('E07/E08: 320px summary opens on results and long company names wrap away from the version badge', options, async () => {
  const browser = await launchBrowser(root);
  try {
    const page = await browser.page({ width: 320, height: 568, mobile: true });
    const company = 'HARBORINTERNATIONALTRADING26';
    await createCompany(page, company);
    for (const tab of ['office', 'inquiries', 'company']) {
      await page.click(`[data-ui="page"][data-page="${tab}"]`);
      const header = await page.evaluate(`(()=>{const e=document.querySelector('.page-header .eyebrow'),b=document.querySelector('.page-header>.badge');const er=e.getBoundingClientRect(),br=b.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(e);return {text:e.textContent,box:{left:er.left,right:er.right},badge:{left:br.left,right:br.right,top:br.top,bottom:br.bottom},runs:[...range.getClientRects()].map(r=>({left:r.left,right:r.right,top:r.top,bottom:r.bottom}))}})()`);
      assert.ok(header.text.includes(company));
      for (const run of header.runs) {
        assert.ok(run.left >= -1 && run.right <= 321, `Text outside viewport: ${JSON.stringify(run)}`);
        assert.ok(run.right <= header.badge.left + 1 || run.left >= header.badge.right - 1 || run.bottom <= header.badge.top + 1 || run.top >= header.badge.bottom - 1, 'Company text overlaps version badge');
      }
      await noOverflow(page, tab);
    }
    await page.click('[data-action="end-week"]');
    await page.waitFor(present('dialog[open] .summary-scroll'));
    const opening = await page.evaluate(`(()=>{const s=document.querySelector('dialog[open] .summary-scroll'),h=document.querySelector('dialog[open] #modal-title'),t=document.querySelector('dialog[open] .summary-totals');const hr=h.getBoundingClientRect(),tr=t.getBoundingClientRect();return {scroll:s.scrollTop,titleTop:hr.top,titleBottom:hr.bottom,totalsTop:tr.top,totalsBottom:tr.bottom,height:innerHeight}})()`);
    assert.ok(opening.scroll <= 1);
    assert.ok(opening.titleTop >= 0 && opening.titleBottom < opening.height);
    assert.ok(opening.totalsTop >= 0 && opening.totalsBottom < opening.height, 'First cash results should be in view');
    assert.equal(await page.evaluate('document.activeElement.id'), 'modal-title');
  } finally { await browser.close(); }
});

test('E09/E12: cash risk sign, quote draft, list anchor and fresh-dialog scroll stay consistent', options, async () => {
  const browser = await launchBrowser(root, { scenarios: true });
  try {
    const page = await browser.page({ width: 390, height: 844, mobile: true });
    await createCompany(page);
    await page.click('[data-ui="page"][data-page="inquiries"]');
    const before = await page.evaluate(`(()=>{const b=document.querySelector('[data-ui=quote-open]');b.scrollIntoView({block:'center',behavior:'instant'});return {top:b.getBoundingClientRect().top,scroll:scrollY,id:b.dataset.id}})()`);
    await page.click(`[data-ui="quote-open"][data-id="${before.id}"]`);
    const positive = await page.evaluate(`(()=>{const e=document.querySelector('dialog [data-tour=cash-forecast]');return {text:e.innerText,negative:e.classList.contains('negative')}})()`);
    assert.equal(positive.negative, false);
    assert.match(positive.text, /仍有|没有.*缺口|预计.*可用|最低现金/);
    await page.click('dialog input[name="ratio"]');
    await key(page, 'End', 'End', 35);
    assert.equal(await page.evaluate('document.querySelector("dialog input[name=ratio]").value'), '105');
    await page.evaluate('document.querySelector("dialog").scrollTop=document.querySelector("dialog").scrollHeight');
    await key(page, 'Escape', 'Escape', 27);
    const returned = await page.evaluate(`(()=>{const b=document.querySelector('[data-ui=quote-open][data-id="${before.id}"]');return{top:b.getBoundingClientRect().top,scroll:scrollY,focused:document.activeElement===b}})()`);
    // A newly visible retained-draft notice can change the document height;
    // the inquiry's viewport position is the player's return anchor.
    assert.ok(Math.abs(returned.top - before.top) < 3, `Before ${JSON.stringify(before)}; returned ${JSON.stringify(returned)}`);
    assert.ok(returned.focused);
    await page.click(`[data-ui="quote-open"][data-id="${before.id}"]`);
    assert.equal(await page.evaluate('document.querySelector("dialog input[name=ratio]").value'), '105', 'Unsubmitted pricing intent should survive closing');
    assert.ok(await page.evaluate('document.querySelector("dialog").scrollTop<2'));
    await key(page, 'Escape', 'Escape', 27);
    const next = await page.evaluate(`Array.from(document.querySelectorAll('[data-ui=quote-open]')).find(b=>b.dataset.id!==${JSON.stringify(before.id)}).dataset.id`);
    await page.click(`[data-ui="quote-open"][data-id="${next}"]`);
    assert.ok(await page.evaluate('document.querySelector("dialog").scrollTop<2'));
    assert.equal(await page.evaluate('document.querySelector("dialog input[name=ratio]").value'), '100');
    await key(page, 'Escape', 'Escape', 27);
    await loadScenario(page, `(game)=>{const s=game.newGame({name:'现金缺口提示',assistant:'fang',seed:381});s.cash=1;s.loan=s.creditLine;s.tutorial.done=true;return s;}`);
    await page.click('[data-ui="page"][data-page="inquiries"]');
    await page.click('[data-ui="quote-open"]');
    const warning = await page.evaluate(`(()=>{const e=document.querySelector('dialog [data-tour=cash-forecast]');return {text:e.innerText,negative:e.classList.contains('negative')}})()`);
    assert.ok(warning.negative);
    assert.match(warning.text, /还差|缺口|不足/);
  } finally { await browser.close(); }
});
