import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/chromium.mjs';
import { currentState, dismissDecisions, loadScenario } from './helpers/scenarios.mjs';
import { SAVE_KEY } from '../v38/ui/save.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const enabled = process.env.V38_BROWSER === '1';
const options = { skip: !enabled, timeout: 90_000 };
const present = selector => `Boolean(document.querySelector(${JSON.stringify(selector)}))`;
const body = 'document.body.innerText';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const settlementNav = '[data-ui="page"][data-page="offwork"]';
const weekActions = '[data-action="end-week"], [data-action="advance-four"]';

async function enterSettlement(page) {
  if (!await page.evaluate(present(`${settlementNav}[aria-current="page"]`))) await page.click(settlementNav);
}

async function settleWeek(page) {
  await enterSettlement(page);
  await page.click('#week-controls [data-action="end-week"]');
}

const chooseStandard = page => page.evaluate(`(()=>{const difficulty=document.querySelector('[name=difficulty]');difficulty.value='normal';difficulty.dispatchEvent(new Event('change',{bubbles:true}));})()`);

async function createCompany(page, name = '体验问题回归') {
  await page.goto();
  await page.waitFor(present('[data-form="new-game"]'));
  await chooseStandard(page);
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
    await chooseStandard(page);
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

test('rapid modal submission cannot advance the week on a phone, and settlement remains keyboard accessible', options, async () => {
  const browser = await launchBrowser(root);
  try {
    const page = await browser.page({ width: 390, height: 844, mobile: true });
    await page.goto();
    await page.waitFor(present('[data-form="new-game"]'));
    await page.fill('[data-form="new-game"] [name="name"]', '报价重复点击验收');
    await page.evaluate(`(()=>{const choice=document.querySelector('[name=difficulty]');choice.value='hard';choice.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await page.click('[data-form="new-game"] button[type="submit"]');
    await page.click('[data-ui="skip-tutorial"]');
    await page.click('nav [data-ui="page"][data-page="inquiries"]');
    await page.click('[data-ui="quote-open"]');
    await page.evaluate(`document.querySelector('dialog input[name=ratio]').focus()`);
    await key(page, 'Home', 'Home', 36);
    await page.click('dialog [data-ui="close-dialog"]');
    await page.click('[data-ui="quote-open"]');
    await page.goto();
    await page.waitFor(present('[data-ui="resume-save"]'));
    await page.click('[data-ui="resume-save"]');
    await page.waitFor(present('dialog[open] [data-form="quote"]'));
    const stored = () => page.evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(SAVE_KEY)})).state`);
    const before = await stored();
    const point = await page.evaluate(`(()=>{const button=document.querySelector('dialog [data-form=quote] [type=submit]');button.scrollIntoView({block:'center',behavior:'instant'});const r=button.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 });
    await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 });
    await page.waitFor('!document.querySelector("dialog").open');
    const behind = await page.evaluate(`document.elementFromPoint(${point.x},${point.y})?.closest('button')?.dataset.action`);
    assert.ok(!['end-week', 'advance-four'].includes(behind), `Weekly controls must be unreachable beneath the quote, got ${behind}`);
    assert.equal(await page.evaluate(present(weekActions)), false, 'Inquiries must not contain real settlement actions');
    await pause(60);
    await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 2 });
    await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 2 });
    const after = await stored();
    assert.equal(after.week, before.week, 'Second tap must not accidentally advance the week');
    assert.equal(after.cash, before.cash);
    assert.equal(after.bids.length, 1);
    assert.equal(await page.evaluate(present('[data-page="inquiries"][aria-current="page"]')), true);
    await enterSettlement(page);
    await page.evaluate(`document.querySelector('#week-controls [data-action=end-week]').focus()`);
    assert.equal(await page.evaluate('document.activeElement.dataset.action'), 'end-week');
    await key(page, ' ', 'Space', 32);
    await page.waitFor('document.querySelector("dialog[open] #modal-title")?.textContent.includes("本周小结")');
    assert.equal((await stored()).week, before.week + 1, 'Keyboard activation remains available immediately');
    assert.deepEqual(page.errors, []);
  } finally { await browser.close(); }
});

test('a repeated phone withdrawal cannot remove the next pending quotation', options, async () => {
  const browser = await launchBrowser(root, { scenarios: true });
  try {
    const page = await browser.page({ width: 390, height: 844, mobile: true });
    await page.goto();
    await page.waitFor(present('[data-form="new-game"]'));
    await loadScenario(page, `game=>{const state=game.newGame({name:'撤回报价重复点击验收',assistant:'fang',seed:381});state.tutorial.done=true;return state;}`);
    await page.click('nav [data-ui="page"][data-page="inquiries"]');
    for (let count = 0; count < 3; count++) {
      const id = await page.evaluate(`Array.from(document.querySelectorAll('[data-ui=quote-open]')).find(button=>button.innerText.trim()==='算价')?.dataset.id`);
      assert.ok(id);
      await page.click(`[data-ui="quote-open"][data-id="${id}"]`);
      await page.evaluate(`document.querySelector('dialog input[name=ratio]').focus()`);
      await key(page, 'Home', 'Home', 36);
      await page.click('dialog [data-form="quote"] button[type="submit"]');
      await page.waitFor('!document.querySelector("dialog").open');
      await pause(420);
    }
    const before = await currentState(page);
    assert.equal(before.bids.length, 3);
    const first = before.bids[0].inquiryId, second = before.bids[1].inquiryId;
    const point = await page.evaluate(`(()=>{const button=document.querySelector('[data-action=withdraw-bid][data-id="${first}"]');button.scrollIntoView({block:'center',behavior:'instant'});const r=button.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 });
    await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 });
    const behind = await page.evaluate(`document.elementFromPoint(${point.x},${point.y})?.closest('button')?.dataset.id`);
    assert.equal(behind, second, 'Fixture must expose the next quote at the same screen point');
    await pause(60);
    await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 2 });
    await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 2 });
    const after = await currentState(page);
    assert.deepEqual(after.bids.map(bid=>bid.inquiryId), before.bids.slice(1).map(bid=>bid.inquiryId));
    assert.equal(after.cash, before.cash);
    const deliberate = await page.evaluate(`(()=>{const r=document.querySelector('[data-action=withdraw-bid][data-id="${second}"]').getBoundingClientRect();return {x:r.left+8,y:r.y+r.height/2}})()`);
    assert.ok(Math.hypot(deliberate.x-point.x,deliberate.y-point.y)>8);
    await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...deliberate, button: 'left', clickCount: 1 });
    await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...deliberate, button: 'left', clickCount: 1 });
    assert.deepEqual((await currentState(page)).bids.map(bid=>bid.inquiryId), [before.bids[2].inquiryId]);
    assert.deepEqual(page.errors, []);
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
    assert.equal(await page.evaluate('document.activeElement.dataset.ui'), 'coach-settlement');
    assert.equal(await page.evaluate(present(weekActions)), false);
    await page.click('.tutorial [data-ui="coach-settlement"]');
    assert.ok(await page.evaluate(present(`${settlementNav}[aria-current="page"]`)));
    assert.equal(await page.evaluate('document.activeElement.dataset.action'), 'end-week');
    await page.click('#week-controls [data-action="end-week"]');
    await page.waitFor('document.querySelector("dialog[open] #modal-title")?.textContent.includes("本周小结")');
  } finally { await browser.close(); }
});

test('E04: auto-save restores a pending quote, weekly summary and pending event, and reopening preserves progress', options, async () => {
  const browser = await launchBrowser(root, { scenarios: true });
  try {
    const page = await browser.page();
    await page.goto();
    await page.waitFor(present('[data-session-warning="opening"]'));
    assert.match(await page.evaluate('document.querySelector("[data-session-warning=opening]").innerText'), /自动存档.*继续经营/);
    await chooseStandard(page);
    await page.fill('[name="name"]', '自动存档验收');
    await page.click('[data-form="new-game"] button[type="submit"]');
    await page.waitFor(present('#page-title'));
    await page.click('[data-ui="page"][data-page="inquiries"]');
    await page.click('[data-ui="quote-open"]');
    await page.evaluate('(()=>{const e=document.querySelector("dialog input[name=ratio]");e.value="80";e.dispatchEvent(new Event("input",{bubbles:true}));})()');
    const quoting = await currentState(page);
    const resume = async () => {
      await page.goto();
      await page.waitFor(present('[data-ui="resume-save"]'));
      await page.click('[data-ui="resume-save"]');
      await page.waitFor(present('#page-title'));
    };
    await resume();
    assert.deepEqual(await currentState(page), quoting);
    assert.equal(await page.evaluate('document.querySelector("dialog[open] input[name=ratio]").value'), '80');
    await page.click('dialog [data-form="quote"] button[type="submit"]');
    await settleWeek(page);
    const settled = await currentState(page);
    assert.equal(settled.week, 2);
    assert.ok(settled.orders.length > 0);
    await resume();
    assert.deepEqual(await currentState(page), settled);
    assert.match(await page.evaluate('document.querySelector("dialog[open]").innerText'), /本周小结/);
    await dismissDecisions(page);
    await loadScenario(page, `(game)=>{const s=game.newGame({name:'自动存档验收',seed:381});s.tutorial.done=true;s.events.push({id:'pending-demo',type:'ipo-celebration',title:'上市成功',text:'继续经营',choices:[{id:'continue',label:'继续经营'}]});return s;}`);
    assert.equal(await page.evaluate(present(weekActions)), false);
    assert.ok(await page.evaluate(present('.app-notices [data-ui="show-event"]')));
    await enterSettlement(page);
    assert.equal(await page.evaluate(present('#week-controls [data-action="end-week"]')), false);
    assert.ok(await page.evaluate(present('#week-controls [data-action="advance-four"]:disabled')));
    await page.click('#week-controls [data-ui="show-event"]');
    await key(page, 'Escape', 'Escape', 27);
    const pending = await currentState(page);
    await resume();
    assert.deepEqual(await currentState(page), pending);
    assert.match(await page.evaluate('document.querySelector("dialog[open]").innerText'), /上市成功/);
    await dismissDecisions(page);
    await page.click('[data-ui="page"][data-page="offwork"]');
    assert.ok(await page.evaluate(present('.workspace > #week-controls + .restart-panel:last-child')));
    assert.match(await page.evaluate('document.querySelector(".restart-panel h2").innerText'), /^重新开局$/);
    assert.match(await page.evaluate('document.querySelector(".restart-panel").innerText'), /当前存档会被覆盖/);
    assert.equal(await page.evaluate('document.querySelector(".restart-panel [data-ui=request-restart]").innerText'), '重新开局');
    assert.match(await page.evaluate('document.querySelector("[data-session-warning=leaving]").innerText'), /自动保存.*继续经营/);
    assert.match(await page.evaluate('document.querySelector("[data-save-indicator]").innerText'), /已自动存档/);
    const original = await currentState(page);
    const opened = await browser.page();
    await opened.goto();
    await opened.waitFor(present('[data-ui="resume-save"]'));
    await opened.click('[data-ui="resume-save"]');
    await opened.waitFor(present('#page-title'));
    assert.deepEqual(await currentState(opened), original);
    assert.equal(await opened.evaluate('document.querySelector("#page-title").textContent'), '下班');
    await opened.click('[data-ui="request-restart"]');
    assert.match(await opened.evaluate('document.querySelector("dialog[open]").innerText'), /确认重新开局.*从第 1 周重新经营.*覆盖当前存档/s);
    await opened.click('dialog [data-ui="close-dialog"]');
    assert.deepEqual(await currentState(opened), original);
    await opened.click('[data-ui="request-restart"]');
    await opened.click('dialog [data-ui="restart"]');
    await opened.waitFor(present('[data-form="new-game"]'));
    assert.equal(await opened.evaluate('document.querySelector("[name=difficulty]").value'), 'casual');
    assert.equal((await opened.evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(SAVE_KEY)})).state.company.name`)), original.company.name);
    await opened.fill('[name="name"]', '新的独立工作室');
    await opened.click('[data-form="new-game"] button[type="submit"]');
    assert.equal((await currentState(opened)).company.name, '新的独立工作室');
    assert.equal((await currentState(opened)).week, 1);
    assert.equal((await currentState(opened)).difficulty, 'casual');
    assert.deepEqual(opened.errors, []);
  } finally { await browser.close(); }
});

test('save recovery: damaged records stay intact, failed writes can retry and a stale tab never overwrites a newer save', options, async () => {
  const browser = await launchBrowser(root, { scenarios: true });
  const keyName = JSON.stringify(SAVE_KEY);
  const read = `localStorage.getItem(${keyName})`;
  try {
    const page = await browser.page();
    await page.goto();
    await page.waitFor(present('[data-form="new-game"]'));
    await page.evaluate("localStorage.setItem('trade-tycoon:deal-room:v1','经典工作室存档');localStorage.setItem('trade-tycoon:data:v2','旧版存档')");
    const blocked = await page.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `(()=>{const get=Storage.prototype.getItem;window.restoreRead=()=>{Storage.prototype.getItem=get};Storage.prototype.getItem=function(k){if(k===${keyName})throw new DOMException('denied','SecurityError');return get.call(this,k)}})()`,
    });
    await page.goto();
    await page.waitFor(present('[data-ui="reread-save"]'));
    assert.match(await page.evaluate(body), /无法访问存档/);
    await page.evaluate('window.restoreRead()');
    await page.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: blocked.identifier });
    await page.click('[data-ui="reread-save"]');
    await page.waitFor(present('[data-form="new-game"]'));
    await page.evaluate(`localStorage.setItem(${keyName}, '破损记录')`);
    await page.goto();
    await page.waitFor(present('[data-ui="reread-save"]'));
    assert.match(await page.evaluate(body), /存档无法读取/);
    assert.equal(await page.evaluate(read), '破损记录');
    await page.click('[data-ui="prepare-new-game"]');
    await page.click('[data-ui="cancel-new-game"]');
    assert.equal(await page.evaluate(read), '破损记录');
    await page.click('[data-ui="prepare-new-game"]');
    await page.click('[data-ui="confirm-new-game"]');
    await chooseStandard(page);
    await page.evaluate(`(()=>{const write=Storage.prototype.setItem;window.restoreStorage=()=>{Storage.prototype.setItem=write};Storage.prototype.setItem=function(k,v){if(k===${keyName})throw new DOMException('full','QuotaExceededError');return write.call(this,k,v)}})()`);
    await page.fill('[name="name"]', '存档恢复验收');
    await page.click('[data-form="new-game"] button[type="submit"]');
    await page.waitFor(present('[data-save-warning]:not([hidden])'));
    assert.match(await page.evaluate(body), /自动存档失败/);
    assert.equal(await page.evaluate(read), '破损记录');
    await page.evaluate('window.restoreStorage()');
    await page.click('[data-save-warning]:not([hidden]) [data-ui="retry-save"]');
    assert.equal(await page.evaluate(present('[data-save-warning]:not([hidden])')), false);
    const old = await page.evaluate(read);
    assert.equal(JSON.parse(old).state.company.name, '存档恢复验收');
    const newer = await browser.page();
    await newer.goto();
    await newer.waitFor(present('[data-ui="resume-save"]'));
    await newer.click('[data-ui="resume-save"]');
    await newer.click('[data-ui="page"][data-page="company"]');
    await newer.fill('[data-form="borrow"] [name="amount"]', '5000');
    await newer.click('[data-form="borrow"] button[type="submit"]');
    const latest = await newer.evaluate(read);
    assert.equal(JSON.parse(latest).state.loan, 5000);
    await page.click('[data-ui="page"][data-page="inquiries"]');
    await page.waitFor(present('[data-save-warning]:not([hidden])'));
    assert.match(await page.evaluate(body), /其他页面.*更新/);
    assert.equal(await page.evaluate(read), latest);
    assert.equal(await page.evaluate("localStorage.getItem('trade-tycoon:deal-room:v1')"), '经典工作室存档');
    assert.equal(await page.evaluate("localStorage.getItem('trade-tycoon:data:v2')"), '旧版存档');
    assert.deepEqual(page.errors, []);
    assert.deepEqual(newer.errors, []);
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
    await pause(250);
    assert.equal(await page.evaluate('getComputedStyle(document.querySelector("dialog .quote-product-image")).animationName'), 'media-wait');
    assert.equal(await page.evaluate('document.querySelector("dialog .quote-product-image").dataset.mediaState'), 'loading');
    await page.screenshot('/tmp/trade-v38-image-transition-wait.png');
    const measure = `(()=>{const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {top:r.top,height:r.height}};return {product:rect('dialog .media-frame.quote-product-image'),comic:rect('dialog .media-frame.buyer-comic'),slider:rect('dialog input[name=ratio]')}})()`;
    const before = await page.evaluate(measure);
    assert.ok(before.product.height > 100 && before.comic.height > 100);
    for (const requestId of held.keys()) await page.send('Fetch.continueRequest', { requestId });
    await page.send('Fetch.disable');
    await page.waitFor(`['.quote-product-image','.buyer-comic'].every(s=>document.querySelector('dialog .media-frame'+s)?.dataset.mediaState==='loaded')`);
    assert.ok(await page.evaluate(`['.quote-product-image','.buyer-comic'].every(s=>document.querySelector('dialog .media-frame'+s)?.dataset.mediaReveal==='true')`));
    assert.equal(await page.evaluate('getComputedStyle(document.querySelector("dialog .quote-product-image img")).animationName'), 'media-reveal');
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

test('E07/E08: 320px summary opens on results and long company names wrap away from the calendar', options, async () => {
  const browser = await launchBrowser(root);
  try {
    const page = await browser.page({ width: 320, height: 568, mobile: true });
    const company = 'HARBORINTERNATIONALTRADING26';
    await createCompany(page, company);
    for (const tab of ['office', 'inquiries', 'company']) {
      await page.click(`[data-ui="page"][data-page="${tab}"]`);
      const header = await page.evaluate(`(()=>{const e=document.querySelector('.page-header .eyebrow'),b=document.querySelector('.page-header>.current-time');const er=e.getBoundingClientRect(),br=b.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(e);return {text:e.textContent,calendar:b.innerText,box:{left:er.left,right:er.right},badge:{left:br.left,right:br.right,top:br.top,bottom:br.bottom},runs:[...range.getClientRects()].map(r=>({left:r.left,right:r.right,top:r.top,bottom:r.bottom}))}})()`);
      assert.ok(header.text.includes(company));
      assert.match(header.calendar, /2026 年[\s\S]*第 1 周/);
      for (const run of header.runs) {
        assert.ok(run.left >= -1 && run.right <= 321, `Text outside viewport: ${JSON.stringify(run)}`);
        assert.ok(run.right <= header.badge.left + 1 || run.left >= header.badge.right - 1 || run.bottom <= header.badge.top + 1 || run.top >= header.badge.bottom - 1, 'Company text overlaps calendar');
      }
      await noOverflow(page, tab);
    }
    await enterSettlement(page);
    assert.ok(await page.evaluate(present('.workspace > #week-controls + .restart-panel:last-child')));
    for (const action of ['advance-four', 'end-week']) {
      assert.ok(await page.evaluate(`(() => {const button=document.querySelector('#week-controls [data-action="${action}"]');button.scrollIntoView({block:'center',behavior:'instant'});const rect=button.getBoundingClientRect();return rect.width>=44&&rect.height>=44&&rect.top>=0&&rect.bottom<=innerHeight&&button.contains(document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2))&&!button.disabled;})()`), `Footer ${action} must be accessible at 320px`);
    }
    await page.click('#week-controls [data-action="end-week"]');
    await page.waitFor(present('dialog[open] .summary-scroll'));
    const opening = await page.evaluate(`(()=>{const s=document.querySelector('dialog[open] .summary-scroll'),h=document.querySelector('dialog[open] #modal-title'),t=document.querySelector('dialog[open] .summary-totals');const hr=h.getBoundingClientRect(),tr=t.getBoundingClientRect();return {scroll:s.scrollTop,titleTop:hr.top,titleBottom:hr.bottom,totalsTop:tr.top,totalsBottom:tr.bottom,height:innerHeight}})()`);
    assert.ok(opening.scroll <= 1);
    assert.ok(opening.titleTop >= 0 && opening.titleBottom < opening.height);
    assert.ok(opening.totalsTop >= 0 && opening.totalsBottom < opening.height, 'First cash results should be in view');
    assert.equal(await page.evaluate('document.activeElement.id'), 'modal-title');
  } finally { await browser.close(); }
});

test('calendar shows the selected era and advances across a year boundary on all pages', options, async () => {
  const browser = await launchBrowser(root, { scenarios: true });
  try {
    const page = await browser.page({ width: 390, height: 844, mobile: true });
    await page.goto();
    await page.waitFor(present('[data-form="new-game"]'));
    await loadScenario(page, `(game)=>{const s=game.newGame({name:'港湾贸易',era:'2008',seed:381});s.week=52;s.cash=1000000;s.tutorial.done=true;return s;}`);
    assert.match(await page.evaluate('document.querySelector(".current-time").innerText'), /2008 年[\s\S]*第 52 周/);
    await settleWeek(page);
    await dismissDecisions(page);
    for (const tab of ['office', 'inquiries', 'orders', 'company', 'offwork']) {
      await page.click(`[data-ui="page"][data-page="${tab}"]`);
      assert.match(await page.evaluate('document.querySelector(".current-time").innerText'), /2009 年[\s\S]*第 1 周[\s\S]*经营第 53 周/);
      await noOverflow(page, tab);
    }
    assert.doesNotMatch(await page.evaluate(body), /结束这一周，安排接下来的经营|收好这周的账本/);
    await page.screenshot('/tmp/v38-current-time-390.png');
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

test('event illustration failure reserves its frame, retries, and leaves the decision usable', options, async () => {
  const browser = await launchBrowser(root, { scenarios: true });
  try {
    const page = await browser.page({ width: 390, height: 844, mobile: true });
    await page.goto();
    await page.waitFor(present('[data-form="new-game"]'));
    await page.send('Network.enable');
    await page.send('Network.setBlockedURLs', { urls: ['*v38-event-materials.webp*'] });
    await loadScenario(page, `(game)=>{const s=game.newGame({name:'事件插画验收',seed:381});s.tutorial.done=true;s.events=[{id:'test-materials',type:'trade-event',code:'materials',title:'供应商调价通知',text:'原料商通知近期将涨价。',comic:'assets/v38-event-materials.webp',choices:[{id:'reserve',label:'锁定采购价',cost:700,policy:{weeks:5,materialDelta:-12}},{id:'open',label:'按现价采购',macro:{materials:7}}]}];return s;}`);
    await page.click('[data-ui="show-event"]');
    await page.waitFor(present('dialog .event-comic[data-media-state="error"]'));
    const before = await page.evaluate('document.querySelector("dialog .event-comic").getBoundingClientRect().height');
    assert.ok(before > 100);
    assert.match(await page.evaluate('document.querySelector("dialog .event-comic").innerText'), /插画暂时无法显示/);
    assert.ok(await page.evaluate(present('dialog [data-action="resolve-event"][data-choice="open"]:not(:disabled)')));
    await page.send('Network.setBlockedURLs', { urls: [] });
    await page.click('dialog .event-comic [data-media-retry]');
    await page.waitFor('document.querySelector("dialog .event-comic img").naturalWidth > 0');
    const after = await page.evaluate('document.querySelector("dialog .event-comic").getBoundingClientRect().height');
    assert.equal(after, before);
    await page.screenshot('/tmp/v38-event-image-retry.png');
    await page.click('dialog [data-action="resolve-event"][data-choice="open"]');
    assert.equal((await currentState(page)).events.length, 0);
    assert.deepEqual(page.errors, []);
  } finally { await browser.close(); }
});

test('product frames reserve the original artwork ratio for every catalog item', options, async () => {
  const browser = await launchBrowser(root, { scenarios: true });
  try {
    const page = await browser.page({ width: 390, height: 844, mobile: true });
    await page.goto();
    await page.waitFor(present('[data-form="new-game"]'));
    await loadScenario(page, `async(game)=>{const {PRODUCTS}=await import('/v38/data/core.js');const s=game.newGame({name:'图片比例验收',seed:381});s.tutorial.done=true;const base=s.inquiries[0];s.inquiries=PRODUCTS.map(p=>({...base,id:'layout-'+p.id,productId:p.id,productName:p.name,category:p.category,unit:p.unit,asset:p.asset,quantity:p.sources.stock.minQuantity, dueWeek:10}));return s;}`);
    await page.click('[data-ui="page"][data-page="inquiries"]');
    const shapes = await page.evaluate(`Array.from(document.querySelectorAll('.inquiry-product .product-thumb'),frame=>{
      const img=frame.querySelector('img'),r=frame.getBoundingClientRect();
      return {src:img.dataset.mediaSrc,width:r.width,height:r.height,expected: r.width*Number(img.getAttribute('height'))/Number(img.getAttribute('width'))};
    })`);
    assert.equal(shapes.length,37);
    for (const shape of shapes) {
      assert.ok(shape.width > 0 && Math.abs(shape.height-shape.expected) <= 2, JSON.stringify(shape));
    }
    assert.ok(await page.evaluate('document.documentElement.scrollWidth <= innerWidth+1'));
    for (const id of ['apron','clock','lamp-trial']) {
      await page.click(`[data-ui="quote-open"][data-id="layout-${id}"]`);
      await page.waitFor('document.querySelector("dialog .quote-product-image img")?.naturalWidth>0');
      const shape=await page.evaluate(`(()=>{const f=document.querySelector('dialog .quote-product-image'),i=f.querySelector('img'),r=f.getBoundingClientRect();return {height:r.height,expected:r.width*i.naturalHeight/i.naturalWidth}})()`);
      assert.ok(Math.abs(shape.height-shape.expected)<=2, JSON.stringify(shape));
      await page.click('dialog [data-ui="close-dialog"]');
      await pause(450);
    }
    assert.deepEqual(page.errors,[]);
  } finally { await browser.close(); }
});
