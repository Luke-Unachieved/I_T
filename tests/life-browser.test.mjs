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
  test(`life apps have a real home scene, focused catalogs, saved folds and back navigation at ${viewport.width}px`, { skip: !enabled, timeout: 120_000 }, async () => {
    const browser = await launchBrowser(root, { scenarios: true });
    try {
      const page = await browser.page(viewport);
      const life = id => page.click(`[data-ui="life-app"][data-id="${id}"]`);
      const currentApp = () => page.evaluate('document.querySelector("[data-life-app-page]").dataset.lifeAppPage');
      await page.goto();
      await page.waitFor(present('[data-form="new-game"]'));
      await loadScenario(page, `(game)=>{const s=game.newGame({name:'下班生活验收',assistant:'fang',seed:381});s.cash=6000000;s.creditLine=game.creditLimit(s);s.energy=0;s.tutorial.done=true;return s;}`);
      await page.click('.nav [data-page="offwork"]');
      assert.equal(await currentApp(), 'home');
      assert.equal(await page.evaluate('document.querySelectorAll("[data-ui=life-app]").length'), 5);
      assert.equal(await page.evaluate('document.querySelectorAll("[data-life-id]").length'), 0);
      await page.waitFor('document.querySelector(".life-app-room img")?.naturalWidth>0');
      const room = await page.evaluate(`(()=>{const art=document.querySelector('.life-app-room'),img=art.querySelector('img'),r=art.getBoundingClientRect();return{src:img.getAttribute('src'),ratio:r.width/r.height,native:img.naturalWidth/img.naturalHeight,fit:getComputedStyle(img).objectFit};})()`);
      assert.equal(room.src, 'assets/deal-afterwork-original-room.webp');
      assert.ok(Math.abs(room.ratio-room.native)<.01 && room.fit==='contain',JSON.stringify(room));
      await checkWidth(page);
      await page.screenshot(`/tmp/v38-life-app-${viewport.width}-home.png`);

      await life('rest');
      assert.equal(await currentApp(), 'rest');
      assert.equal(await page.evaluate('document.querySelectorAll("[data-life-id]").length'), 3);
      assert.ok(await page.evaluate('document.querySelector("[data-action=outing][data-id=flower-market]").getClientRects().length>0'));
      await life('home');
      await life('trips');
      assert.equal(await currentApp(), 'trips');
      assert.equal(await page.evaluate('document.querySelectorAll("[data-life-id]").length'), 8);
      assert.equal(await page.evaluate('document.querySelectorAll("details.outing-card[open]").length'), 0);
      await page.click('[data-life-id="trip-night-train"] > summary');
      await page.waitFor('document.querySelector("[data-life-id=trip-night-train] .outing-detail-art img")?.naturalWidth>0');
      const travelLayout = await page.evaluate(`(()=>{const card=document.querySelector('[data-life-id=trip-night-train]'), img=card.querySelector('.outing-detail-art').getBoundingClientRect(), label=card.querySelector('.outing-card-label').getBoundingClientRect();return {open:card.open,photoWidth:img.width,photoTop:img.top,labelBottom:label.bottom};})()`);
      assert.ok(travelLayout.open && travelLayout.photoWidth > 140 && travelLayout.photoTop >= travelLayout.labelBottom - 1, JSON.stringify(travelLayout));
      await page.screenshot(`/tmp/v38-life-app-${viewport.width}-train.png`);
      await checkWidth(page);

      await life('home');
      await life('friends');
      assert.equal(await currentApp(), 'friends');
      assert.equal(await page.evaluate('document.querySelectorAll("[data-life-id]").length'), 50);
      assert.equal(await page.evaluate('document.querySelectorAll("[data-life-disclosure][open]").length'), 0);
      await page.click('#life-friends-streets > summary');
      assert.match(await page.evaluate('document.querySelector("[data-life-id=friend-laundry-rain] .outing-card-label").innerText'), /免费或 ¥12/);
      await page.click('#life-friends-fang > summary');
      const locked = await page.evaluate('document.querySelector("[data-life-id=friend-fang-stool-fit] .outing-card-label").innerText');
      assert.match(locked, /尚未开放/);
      assert.match(locked, /方文斌/);
      await page.click('#life-friends-streets > summary');
      await page.waitFor(`JSON.parse(localStorage.getItem(${JSON.stringify(SAVE_KEY)}))?.view.lifeCollapsed?.includes('life-friends-streets')`);
      await page.send('Page.reload');
      await page.waitFor(present('[data-ui="resume-save"]'));
      await page.click('[data-ui="resume-save"]');
      assert.equal(await currentApp(), 'friends');
      assert.ok(await page.evaluate('document.querySelector("#life-friends-fang").open && !document.querySelector("#life-friends-streets").open'));
      await checkWidth(page);
      await life('home');
      assert.match(await page.evaluate('document.querySelector("[data-save-indicator]").innerText'), /已自动存档/);

      await life('property');
      assert.equal(await currentApp(), 'property');
      assert.equal(await page.evaluate('document.querySelectorAll("[data-life-id]").length'), 8);
      await page.evaluate('document.querySelector("[data-life-id=city-loft]").scrollIntoView({block:"center"})');
      await page.waitFor('document.querySelector("[data-life-id=city-loft] img")?.naturalWidth>0');
      await page.click('[data-action="buy-property"][data-id="city-loft"]');
      assert.equal((await currentState(page)).life.properties[0].id, 'city-loft');
      await checkWidth(page);
      await life('home');
      await page.waitFor('document.querySelector(".life-app-room img")?.naturalWidth>0');
      assert.equal(await page.evaluate('document.querySelector(".life-app-room img").getAttribute("src")'), 'assets/v38-home-loft.webp');
      await life('car');
      assert.equal(await currentApp(), 'car');
      assert.equal(await page.evaluate('document.querySelectorAll("[data-life-id]").length'), 8);
      await page.click('.nav [data-page=offwork]');
      assert.equal(await currentApp(), 'home');

      await life('trips');
      await page.click('[data-life-id="trip-night-train"] > summary');
      await page.click('[data-outing-id="trip-night-train"] button[type="submit"]');
      assert.equal((await currentState(page)).life.latestOuting.id, 'trip-night-train');
      assert.equal(await currentApp(), 'trips');
      assert.ok(await page.evaluate('document.activeElement.closest("#latest-outing")'));
      await page.waitFor('document.querySelector("#latest-outing img")?.naturalWidth>0');
      await page.screenshot(`/tmp/v38-life-app-${viewport.width}-result.png`);
      await checkWidth(page);
      await life('home');
      assert.ok(await page.evaluate(present('#latest-outing')));
      assert.deepEqual(page.errors, []);
    } finally { await browser.close(); }
  });
}

test('older saved life views open the app home and retain the folded activity defaults', { skip: !enabled, timeout: 120_000 }, async () => {
  const browser = await launchBrowser(root, { scenarios: true });
  const key = JSON.stringify(SAVE_KEY);
  try {
    const page = await browser.page({ width: 390, height: 844, mobile: true });
    await page.goto();
    await page.waitFor(present('[data-form="new-game"]'));
    await loadScenario(page, `game=>{const s=game.newGame({seed:381});s.tutorial.done=true;return s;}`);
    await page.click('.nav [data-page=offwork]');
    await page.evaluate(`(()=>{const record=JSON.parse(localStorage.getItem(${key}));delete record.view.lifeApp;delete record.view.lifeDisclosureVersion;record.view.lifeCollapsed=['life-car'];localStorage.setItem(${key},JSON.stringify(record));})()`);
    await page.send('Page.reload');
    await page.waitFor(present('[data-ui="resume-save"]'));
    await page.click('[data-ui="resume-save"]');
    assert.ok(await page.evaluate(present('[data-life-app-page="home"]')));
    await page.click('[data-ui=life-app][data-id=friends]');
    assert.deepEqual(await page.evaluate('Array.from(document.querySelectorAll("[data-life-disclosure][open]")).map(e=>e.id)'), []);
    await page.click('#life-friends-streets > summary');
    await page.waitFor(`!JSON.parse(localStorage.getItem(${key})).view.lifeCollapsed.includes('life-friends-streets')`);
    await page.send('Page.reload');
    await page.waitFor(present('[data-ui="resume-save"]'));
    await page.click('[data-ui="resume-save"]');
    assert.ok(await page.evaluate(present('[data-life-app-page="friends"]')));
    assert.deepEqual(await page.evaluate('Array.from(document.querySelectorAll("[data-life-disclosure][open]")).map(e=>e.id)'), ['life-friends-streets']);
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
    await page.click('[data-ui=life-app][data-id=trips]');
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

    await page.click('[data-ui=life-app][data-id=home]');
    await page.click('[data-ui=life-app][data-id=property]');
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
