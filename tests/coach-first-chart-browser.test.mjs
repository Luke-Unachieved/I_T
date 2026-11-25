import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/chromium.mjs';
import { SAVE_KEY } from '../v38/ui/save.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const enabled = process.env.V38_BROWSER === '1';
const coach = '.workspace > .coach-card';
const present = selector => `Boolean(document.querySelector(${JSON.stringify(selector)}))`;
const saved = page => page.evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(SAVE_KEY)}))`);
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function measure(page, selector) {
  return page.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)return null;const r=e.getBoundingClientRect(),style=getComputedStyle(e),d=document.querySelector('dialog[open]'),dock=document.querySelector('.nav')?.getBoundingClientRect(),upper=d?Math.max(0,d.getBoundingClientRect().top):0,lower=d?Math.min(innerHeight,d.getBoundingClientRect().bottom):(dock?.top??innerHeight),x=r.x+r.width/2,y=r.y+r.height/2;return {top:r.top,bottom:r.bottom,x,y,width:r.width,height:r.height,shown:r.top>=upper-1&&r.bottom<=lower+1&&r.left>=0&&r.right<=innerWidth+1,hit:e.contains(document.elementFromPoint(x,y)),text:e.innerText,background:style.backgroundColor,border:style.borderColor,color:style.color};})()`);
}

async function touch(page, selector, allowScroll = true) {
  let target = await measure(page, selector);
  assert.ok(target, `Missing player action ${selector}`);
  if (allowScroll && (!target.shown || !target.hit)) {
    await page.evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center',behavior:'instant'})`);
    target = await measure(page, selector);
  }
  assert.ok(target.shown && target.hit && target.width >= 44 && target.height >= 44, `Player cannot reach ${selector}: ${JSON.stringify(target)}`);
  await page.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: target.x, y: target.y }] });
  await page.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.coachReady();
}

async function chartIsActuallyVisible(page, nextSelector) {
  // Never call scrollIntoView in this assertion. The lesson's own button
  // must position the drawing, the two plotted scenarios and its onward CTA.
  const drawing = await measure(page, '.forecast-chart-balance .forecast-drawing');
  const chart = await measure(page, '.forecast-chart-balance');
  const legend = await measure(page, '.forecast-chart-balance .forecast-legend');
  const onward = await measure(page, nextSelector);
  assert.ok(await page.evaluate('document.activeElement.matches(".forecast-chart-balance")'), 'focus must land on the actual balance chart');
  assert.ok(drawing?.shown && drawing.hit && drawing.height >= 100, `Cash chart hidden below the mobile navigation: ${JSON.stringify(drawing)}`);
  assert.ok(legend?.shown && legend.text.includes('现有业务') && legend.text.includes('已提交报价全部中单'), `Both chart lines must be visible and explained: ${JSON.stringify(legend)}`);
  assert.ok(onward?.shown && onward.hit && onward.height >= 44, `Player cannot proceed from the actual chart: ${JSON.stringify(onward)}`);
  assert.ok(onward.top - chart.bottom >= 6, 'the highlighted chart ring must not touch or cover the continuation button');
  assert.ok(await page.evaluate(present('.forecast-chart-balance svg .chart-cash')));
  assert.ok(await page.evaluate(present('.forecast-chart-balance svg .chart-hypothesis')));
  assert.ok(await page.evaluate('document.documentElement.scrollWidth <= innerWidth+1'));
}

async function quote(page, id, manual = false) {
  await touch(page, `article[data-inquiry-id="${id}"] [data-ui="quote-open"]`);
  await page.waitFor(present('dialog[open] form[data-form="quote"]'));
  if (manual) {
    await page.evaluate('document.querySelector("dialog input[name=ratio]").focus()');
    await page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Home', code: 'Home', windowsVirtualKeyCode: 36 });
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Home', code: 'Home', windowsVirtualKeyCode: 36 });
    await page.coachReady();
  } else if (await page.evaluate(present('dialog [data-ui="coach-apply-quote"]'))) {
    await touch(page, 'dialog [data-ui="coach-apply-quote"]');
    await touch(page, 'dialog [data-ui="coach-review-submit"]', false);
  }
  await touch(page, 'dialog [data-form="quote"] button[type="submit"]');
  await page.waitFor('!document.querySelector("dialog").open');
  await pause(430);
}

for (const viewport of [{ width: 320, height: 568, mobile: true }, { width: 390, height: 844, mobile: true }]) {
  test(`first cash lesson actually shows the chart, and later routine reviews remain readable optional choices at ${viewport.width}px`, { skip: !enabled, timeout: 90_000 }, async () => {
    const browser = await launchBrowser(root);
    try {
      const page = await browser.page(viewport);
      await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
      await page.goto(); await page.waitFor(present('[data-form="new-game"]'));
      // Fix only the genuine opening form RNG draw, avoiding a seeded state
      // or artificially completed first-time learning flags.
      await page.evaluate('(()=>{const random=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=a=>{if(a instanceof Uint32Array&&a.length===1){a[0]=381;return a;}return random(a);};})()');
      await page.fill('[name="name"]', '新人现金指导验收');
      await touch(page, '[data-form="new-game"] button[type="submit"]');
      assert.equal((await saved(page)).state.difficulty, 'casual');
      await touch(page, `${coach} [data-page="inquiries"].coach-action`);
      await quote(page, 'w1-1');
      const first = await saved(page);
      assert.equal(first.state.bids.length, 1);
      const firstGuide = `${coach} [data-ui="coach-review-cash"].coach-action`;
      assert.ok(await page.evaluate(present(firstGuide)), 'after first quote, learning cash flow is the genuine main recommendation');
      assert.equal(await page.evaluate(`document.querySelectorAll('${coach} .coach-action').length`), 1, 'the first-time cash lesson has one clear primary action');
      await page.screenshot(`/tmp/v38-first-chart-${viewport.width}-guide.png`);
      await touch(page, firstGuide, false);
      assert.match(await page.evaluate('document.querySelector("#page-title").innerText'), /办公室/);
      assert.deepEqual((await saved(page)).state, first.state, 'cash explanation never creates a payment or changes the quote');
      const finance = '.forecast-panel [data-page="company"][data-coach-tab="finance"]';
      await chartIsActuallyVisible(page, finance);
      await page.screenshot(`/tmp/v38-first-chart-${viewport.width}-arrived.png`);
      await touch(page, finance, false);
      assert.equal(await page.evaluate('document.querySelector("[data-development-panel]").dataset.developmentPanel'), 'finance');
      assert.match(await page.evaluate(`document.querySelector('${coach}').innerText`), /备用资金|授信/);
      await touch(page, `${coach} [data-page="offwork"].coach-action`, false);
      assert.match(await page.evaluate('document.querySelector("#page-title").innerText'), /下班/);
      await touch(page, `${coach} [data-page="inquiries"].coach-action`);

      // This second modest ordinary quote follows the learned first chart.
      // It does not create an urgent funding change or repeat that lesson.
      await quote(page, 'w1-3', true);
      assert.equal((await saved(page)).state.bids.length, 2);
      assert.equal(await page.evaluate(present(`${coach} [data-ui="coach-review-cash"].coach-action`)), false);
      for (let i = 0; i < 10 && await page.evaluate(present(`${coach} [data-ui="coach-skip-inquiry"]`)); i++) {
        await touch(page, `${coach} [data-ui="coach-skip-inquiry"]`);
        await pause(430);
      }
      const optional = `${coach} [data-ui="coach-review-cash"].quiet`;
      await page.waitFor(present(optional));
      assert.ok(await page.evaluate(present(`${coach} [data-ui="coach-settlement"].coach-action`)), 'ordinary review must not block continuing business');
      const secondary = await measure(page, optional);
      const primary = await measure(page, `${coach} [data-ui="coach-settlement"].coach-action`);
      assert.match(secondary.text, /可选/);
      assert.ok(secondary.height >= 44 && secondary.width >= 44 && secondary.background !== 'rgba(0, 0, 0, 0)' && secondary.border !== 'rgba(0, 0, 0, 0)', `Optional action needs a clear button surface: ${JSON.stringify(secondary)}`);
      assert.notEqual(secondary.background, primary.background, 'routine review remains secondary to the actual operating choice');
      await page.screenshot(`/tmp/v38-first-chart-${viewport.width}-optional.png`);
      const beforeOptional = await saved(page);
      await touch(page, optional);
      const returnLink = '.forecast-panel [data-ui="coach-review-next"]';
      await chartIsActuallyVisible(page, returnLink);
      await touch(page, returnLink, false);
      assert.ok(await page.evaluate(`document.activeElement.matches('${coach} .coach-action')`));
      assert.deepEqual((await saved(page)).state, beforeOptional.state);
      assert.deepEqual(page.errors, []);
    } finally { await browser.close(); }
  });
}
