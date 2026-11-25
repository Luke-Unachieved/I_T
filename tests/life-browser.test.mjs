import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/chromium.mjs';
import { currentState, loadScenario } from './helpers/scenarios.mjs';
import { SAVE_KEY } from '../v38/ui/save.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const enabled = process.env.V38_BROWSER === '1';
const present = selector => `Boolean(document.querySelector(${JSON.stringify(selector)}))`;

async function checkWidth(page) {
  const layout = await page.evaluate('({w:innerWidth,doc:document.documentElement.scrollWidth})');
  assert.ok(layout.doc <= layout.w + 1, JSON.stringify(layout));
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844, mobile: true }, { width: 320, height: 568, mobile: true }]) {
  test(`life disclosures keep activity groups folded, retain saved selections, and show real illustrations at ${viewport.width}px`, { skip: !enabled, timeout: 120_000 }, async () => {
    const browser = await launchBrowser(root, { scenarios: true });
    try {
      const page = await browser.page(viewport);
      await page.goto();
      await page.waitFor(present('[data-form="new-game"]'));
      await loadScenario(page, `(game)=>{const s=game.newGame({name:'折叠生活验收',assistant:'fang',seed:381});s.cash=6000000;s.creditLine=game.creditLimit(s);s.energy=0;s.tutorial.done=true;return s;}`);
      await page.click('[data-ui="page"][data-page="offwork"]');
      const sections = await page.evaluate('Array.from(document.querySelectorAll("[data-life-disclosure]")).map(e=>({id:e.id,open:e.open}))');
      assert.equal(sections.length, 14);
      assert.deepEqual(sections.filter(section => section.open).map(section => section.id), ['life-rest', 'life-property', 'life-car']);
      assert.equal(await page.evaluate(present('[data-ui="life-anchor"], .life-shortcuts')), false);
      assert.equal(await page.evaluate('document.querySelectorAll("#life-rest [data-life-id]").length'), 61);
      assert.equal(await page.evaluate('document.querySelectorAll("#life-property [data-life-id]").length'), 8);
      assert.equal(await page.evaluate('document.querySelectorAll("#life-car [data-life-id]").length'), 8);
      await checkWidth(page);

      await page.click('#life-quick > summary');
      assert.ok(await page.evaluate('document.querySelector("[data-action=outing][data-id=flower-market]").getClientRects().length>0'));
      await page.click('#life-quick > summary');
      await page.click('#life-travel > summary');
      await page.click('[data-life-id="trip-night-train"] > summary');
      await page.waitFor('document.querySelector("[data-life-id=trip-night-train] .outing-detail-art img")?.naturalWidth>0');
      const travelLayout = await page.evaluate(`(()=>{const card=document.querySelector('[data-life-id=trip-night-train]'), img=card.querySelector('.outing-detail-art').getBoundingClientRect(), label=card.querySelector('.outing-card-label').getBoundingClientRect();return {open:card.open,photoWidth:img.width,photoTop:img.top,labelBottom:label.bottom};})()`);
      assert.ok(travelLayout.open && travelLayout.photoWidth > 140 && travelLayout.photoTop >= travelLayout.labelBottom - 1, JSON.stringify(travelLayout));
      await page.screenshot(`/tmp/v38-life-fold-${viewport.width}-train.png`);
      await checkWidth(page);

      await page.click('#life-friends > summary');
      await page.click('#life-friends-streets > summary');
      assert.match(await page.evaluate('document.querySelector("[data-life-id=friend-laundry-rain] .outing-card-label").innerText'), /免费或 ¥12/);
      await page.click('#life-friends-fang > summary');
      const locked = await page.evaluate('document.querySelector("[data-life-id=friend-fang-stool-fit] .outing-card-label").innerText');
      assert.match(locked, /尚未开放/);
      assert.match(locked, /方文斌/);
      await page.click('#life-friends > summary');
      await page.click('#life-property > summary');
      await page.waitFor(`JSON.parse(localStorage.getItem(${JSON.stringify(SAVE_KEY)}))?.view.lifeCollapsed?.includes('life-property')`);
      await page.click('[data-ui="page"][data-page="office"]');
      await page.click('[data-ui="page"][data-page="offwork"]');
      assert.ok(await page.evaluate('!document.querySelector("#life-friends").open && !document.querySelector("#life-property").open'));
      assert.match(await page.evaluate('document.querySelector("[data-save-indicator]").innerText'), /已自动存档/);

      await page.send('Page.reload');
      await page.waitFor(present('[data-ui="resume-save"]'));
      await page.click('[data-ui="resume-save"]');
      assert.ok(await page.evaluate('!document.querySelector("#life-property").open && !document.querySelector("#life-friends").open'));
      await page.click('#life-property > summary');
      assert.equal(await page.evaluate('document.querySelector("#life-property").open'), true);
      await page.evaluate('document.querySelector("[data-life-id=city-loft]").scrollIntoView({block:"center"})');
      await page.waitFor('document.querySelector("[data-life-id=city-loft] img")?.naturalWidth>0');
      await page.click('[data-action="buy-property"][data-id="city-loft"]');
      assert.equal((await currentState(page)).life.properties[0].id, 'city-loft');
      assert.equal(await page.evaluate('document.querySelector("#life-friends").open'), false);
      await checkWidth(page);

      await page.click('#life-rest > summary');
      await page.waitFor(`JSON.parse(localStorage.getItem(${JSON.stringify(SAVE_KEY)}))?.view.lifeCollapsed?.includes('life-rest')`);
      await page.click('#life-rest > summary');
      assert.equal(await page.evaluate('document.querySelector("#life-rest").open'), true);
      await page.click('[data-life-id="trip-night-train"] > summary');
      await page.click('[data-outing-id="trip-night-train"] button[type="submit"]');
      assert.equal((await currentState(page)).life.latestOuting.id, 'trip-night-train');
      assert.ok(await page.evaluate('document.activeElement.closest("#latest-outing")'));
      await page.waitFor('document.querySelector("#latest-outing img")?.naturalWidth>0');
      await page.screenshot(`/tmp/v38-life-fold-${viewport.width}-result.png`);
      await checkWidth(page);
      assert.deepEqual(page.errors, []);
    } finally { await browser.close(); }
  });
}

test('older saved life views retain top-level folds and gain the new folded activity defaults', { skip: !enabled, timeout: 120_000 }, async () => {
  const browser = await launchBrowser(root, { scenarios: true });
  const key = JSON.stringify(SAVE_KEY);
  try {
    const page = await browser.page({ width: 390, height: 844, mobile: true });
    await page.goto();
    await page.waitFor(present('[data-form="new-game"]'));
    await loadScenario(page, `game=>{const s=game.newGame({seed:381});s.tutorial.done=true;return s;}`);
    await page.click('.nav [data-page=offwork]');
    await page.evaluate(`(()=>{const record=JSON.parse(localStorage.getItem(${key}));delete record.view.lifeDisclosureVersion;record.view.lifeCollapsed=['life-car'];localStorage.setItem(${key},JSON.stringify(record));})()`);
    await page.send('Page.reload');
    await page.waitFor(present('[data-ui="resume-save"]'));
    await page.click('[data-ui="resume-save"]');
    assert.deepEqual(await page.evaluate('Array.from(document.querySelectorAll("[data-life-disclosure][open]")).map(e=>e.id)'), ['life-rest', 'life-property']);
    await page.click('#life-travel > summary');
    await page.waitFor(`JSON.parse(localStorage.getItem(${key})).view.lifeDisclosureVersion===1`);
    await page.send('Page.reload');
    await page.waitFor(present('[data-ui="resume-save"]'));
    await page.click('[data-ui="resume-save"]');
    assert.deepEqual(await page.evaluate('Array.from(document.querySelectorAll("[data-life-disclosure][open]")).map(e=>e.id)'), ['life-rest', 'life-travel', 'life-property']);
    assert.deepEqual(page.errors, []);
  } finally { await browser.close(); }
});

test('full life media failures keep choices and holdings usable, and retry recovers without redrawing the page', { skip: !enabled, timeout: 120_000 }, async () => {
  const browser = await launchBrowser(root, { scenarios: true });
  try {
    const page = await browser.page({ width: 390, height: 844, mobile: true });
    await page.send('Network.enable');
    await page.send('Network.setCacheDisabled', { cacheDisabled: true });
    const openingArt = '*deal-outing-night-train-opening*';
    const resultArt = '*deal-outing-night-train-wake*';
    const homeArt = '*v38-home-loft*';
    await page.send('Network.setBlockedURLs', { urls: [openingArt, resultArt, homeArt] });
    await page.goto();
    await page.waitFor(present('[data-form="new-game"]'));
    await loadScenario(page, `(game)=>{const s=game.newGame({name:'插画重试验收',assistant:'fang',seed:381});s.cash=6000000;s.creditLine=game.creditLimit(s);s.energy=0;s.tutorial.done=true;return s;}`);
    await page.click('[data-ui="page"][data-page="offwork"]');
    await page.click('#life-travel > summary');
    await page.click('[data-life-id="trip-night-train"] > summary');
    const travelArt = '[data-life-id="trip-night-train"] .outing-detail-art';
    await page.waitFor(`document.querySelector(${JSON.stringify(travelArt)})?.dataset.mediaState==='error'`);
    assert.match(await page.evaluate(`document.querySelector(${JSON.stringify(travelArt)}).innerText`), /插画暂未加载.*重试图片/s);
    assert.equal(await page.evaluate(present('[data-life-id="trip-night-train"] .outing-thumb [data-media-retry]')), false);
    await page.evaluate(`(()=>{const f=document.querySelector('[data-outing-id=trip-night-train]');f.elements.companionId.value='liang';f.elements.choiceId.value='wake';})()`);
    await page.send('Network.setBlockedURLs', { urls: [resultArt, homeArt] });
    await page.click(`${travelArt} [data-media-retry]`);
    await page.waitFor(`document.querySelector(${JSON.stringify(travelArt)}).dataset.mediaState==='loaded'`);
    assert.equal(await page.evaluate('document.querySelector("[data-outing-id=trip-night-train]").elements.companionId.value'), 'liang');
    assert.equal(await page.evaluate('document.querySelector("[data-outing-id=trip-night-train]").elements.choiceId.value'), 'wake');
    await page.click('[data-outing-id="trip-night-train"] button[type="submit"]');
    const tripState = await currentState(page);
    assert.equal(tripState.life.latestOuting.id, 'trip-night-train');
    const latestArt = '#latest-outing > .outing-art';
    await page.waitFor(`document.querySelector(${JSON.stringify(latestArt)}).dataset.mediaState==='error'`);
    await page.send('Network.setBlockedURLs', { urls: [homeArt] });
    await page.click(`${latestArt} [data-media-retry]`);
    await page.waitFor(`document.querySelector(${JSON.stringify(latestArt)}).dataset.mediaState==='loaded'`);
    assert.deepEqual(await currentState(page), tripState);

    const propertyArt = '[data-life-id="city-loft"] .life-art';
    await page.evaluate(`document.querySelector(${JSON.stringify(propertyArt)}).scrollIntoView({block:'center'})`);
    await page.waitFor(`document.querySelector(${JSON.stringify(propertyArt)}).dataset.mediaState==='error'`);
    await page.send('Network.setBlockedURLs', { urls: [] });
    await page.click(`${propertyArt} [data-media-retry]`);
    await page.waitFor(`document.querySelector(${JSON.stringify(propertyArt)}).dataset.mediaState==='loaded'`);
    await page.click('[data-action="buy-property"][data-id="city-loft"]');
    assert.equal((await currentState(page)).life.properties[0].id, 'city-loft');
    await checkWidth(page);
    assert.deepEqual(page.errors.filter(message => !/(ERR_BLOCKED_BY_CLIENT|Failed to load resource)/.test(message)), []);
  } finally { await browser.close(); }
});
