import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/chromium.mjs';
import { currentState, loadScenario } from './helpers/scenarios.mjs';
import { SAVE_KEY } from '../v38/ui/save.js';
import { quotedSpeech } from '../v38/ui/dialogue.js';

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
      assert.equal(await page.evaluate(present('[data-action=end-week],[data-action=advance-four]')), false, 'office does not advance the week');
      await page.click('.nav [data-page="offwork"]');
      assert.equal(await currentApp(), 'home');
      assert.deepEqual(await page.evaluate('Array.from(document.querySelectorAll("[data-ui=life-app]")).map(e=>e.dataset.id)'), ['trips', 'friends', 'property', 'car']);
      assert.equal(await page.evaluate('document.querySelectorAll("[data-life-id]").length'), 0);
      await page.waitFor('document.querySelector(".life-app-room img")?.naturalWidth>0');
      const room = await page.evaluate(`(()=>{const art=document.querySelector('.life-app-room'),img=art.querySelector('img'),r=art.getBoundingClientRect();return{src:img.getAttribute('src'),ratio:r.width/r.height,native:img.naturalWidth/img.naturalHeight,fit:getComputedStyle(img).objectFit};})()`);
      assert.equal(room.src, 'assets/deal-afterwork-original-room.webp');
      assert.ok(Math.abs(room.ratio-room.native)<.01 && room.fit==='contain',JSON.stringify(room));
      await checkWidth(page);
      const firstScreen = await page.evaluate(`(()=>{
        const footer=document.querySelector('.week-controls'),content=document.querySelector('.workspace > .page-content'),r=footer.getBoundingClientRect();
        const restart=document.querySelector('.restart-panel');
        return {lastChild:footer.nextElementSibling===restart&&restart===document.querySelector('.workspace').lastElementChild,restartTop:restart.getBoundingClientRect().top,restartCount:document.querySelectorAll('[data-ui=request-restart]').length,position:getComputedStyle(footer).position,contentBottom:content.getBoundingClientRect().bottom,footerTop:r.top,footerBottom:r.bottom,navTop:document.querySelector('.nav').getBoundingClientRect().top};
      })()`);
      assert.ok(firstScreen.lastChild && firstScreen.contentBottom <= firstScreen.footerTop+1, JSON.stringify(firstScreen));
      assert.ok(firstScreen.restartTop>=firstScreen.footerBottom&&firstScreen.restartCount===1, 'the clearly separate restart panel is below settlement');
      assert.ok(!['fixed', 'sticky'].includes(firstScreen.position), JSON.stringify(firstScreen));
      if (viewport.mobile) assert.ok(firstScreen.footerBottom > firstScreen.navTop, 'the footer is below the initial life content');
      await page.screenshot(`/tmp/v38-life-app-${viewport.width}-home.png`);

      await life('trips');
      assert.equal(await currentApp(), 'trips');
      assert.equal(await page.evaluate('document.querySelectorAll("[data-life-id]").length'), 9);
      assert.equal(await page.evaluate('document.querySelectorAll("details.outing-card[open]").length'), 0);
      await page.click('[data-life-id="night-bus"] > summary');
      assert.match(await page.evaluate('document.querySelector("[data-life-id=night-bus] .outing-card-label").innerText'), /¥1,560.*精力 \+38/);
      assert.ok(await page.evaluate('document.querySelector("[data-action=outing][data-id=night-bus]").getClientRects().length>0'));
      await page.click('[data-life-id="night-bus"] > summary');
      await page.click('[data-life-id="trip-night-train"] > summary');
      await page.waitFor('document.querySelector("[data-life-id=trip-night-train] .outing-detail-art img")?.naturalWidth>0');
      const travelLayout = await page.evaluate(`(()=>{const card=document.querySelector('[data-life-id=trip-night-train]'), img=card.querySelector('.outing-detail-art').getBoundingClientRect(), label=card.querySelector('.outing-card-label').getBoundingClientRect();return {open:card.open,photoWidth:img.width,photoTop:img.top,labelBottom:label.bottom};})()`);
      assert.ok(travelLayout.open && travelLayout.photoWidth > 140 && travelLayout.photoTop >= travelLayout.labelBottom - 1, JSON.stringify(travelLayout));
      await page.screenshot(`/tmp/v38-life-app-${viewport.width}-train.png`);
      await checkWidth(page);

      await life('home');
      await life('friends');
      assert.equal(await currentApp(), 'friends');
      assert.equal(await page.evaluate('document.querySelectorAll("[data-life-id]").length'), 52);
      assert.equal(await page.evaluate('document.querySelectorAll("[data-life-disclosure][open]").length'), 0);
      await page.click('#life-friends-streets > summary');
      await page.click('[data-life-id="flower-market"] > summary');
      assert.match(await page.evaluate('document.querySelector("[data-life-id=flower-market] .outing-card-label").innerText'), /¥240.*精力 \+14/);
      assert.ok(await page.evaluate('document.querySelector("#life-friends-streets [data-action=outing][data-id=flower-market]").getClientRects().length>0'));
      await page.click('#life-friends-culture > summary');
      await page.click('[data-life-id="mending"] > summary');
      assert.match(await page.evaluate('document.querySelector("[data-life-id=mending] .outing-card-label").innerText'), /¥480.*精力 \+21/);
      assert.ok(await page.evaluate('document.querySelector("#life-friends-culture [data-action=outing][data-id=mending]").getClientRects().length>0'));
      await page.click('#life-friends-culture > summary');
      assert.match(await page.evaluate('document.querySelector("[data-life-id=friend-laundry-rain] .outing-card-label").innerText'), /免费或 ¥12/);
      await page.click('#life-friends-fang > summary');
      await page.waitFor(`document.querySelector('#life-friends-fang').open && !JSON.parse(localStorage.getItem(${JSON.stringify(SAVE_KEY)})).view.lifeCollapsed.includes('life-friends-fang')`);
      const locked = await page.evaluate('document.querySelector("[data-life-id=friend-fang-stool-fit] .outing-card-label").innerText');
      assert.match(locked, /尚未开放/);
      assert.match(locked, /方文斌/);
      await page.click('#life-friends-streets > summary');
      await page.waitFor(`!document.querySelector('#life-friends-streets').open && JSON.parse(localStorage.getItem(${JSON.stringify(SAVE_KEY)}))?.view.lifeCollapsed?.includes('life-friends-streets')`);
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

      // Ending the week is an explicit action at the bottom of the offwork page.
      const beforeWeek = (await currentState(page)).week;
      await page.evaluate('document.querySelector(".week-controls").scrollIntoView({block:"center",behavior:"instant"})');
      const footer = await page.evaluate(`(()=>{
        const r=document.querySelector('.week-controls').getBoundingClientRect(),nav=document.querySelector('.nav').getBoundingClientRect();
        const controls=Array.from(document.querySelectorAll('[data-action=end-week],[data-action=advance-four]'));
        return {top:r.top,bottom:r.bottom,navTop:nav.top,height:innerHeight,actions:controls.map(button=>{
          const b=button.getBoundingClientRect(),hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);
          return {action:button.dataset.action,inFooter:Boolean(button.closest('.week-controls')),clickable:button.contains(hit)&&!button.disabled};
        })};
      })()`);
      assert.deepEqual(footer.actions, [{action:'end-week',inFooter:true,clickable:true},{action:'advance-four',inFooter:true,clickable:true}]);
      if (viewport.mobile) assert.ok(footer.top >= 0 && footer.bottom <= footer.navTop+1, JSON.stringify(footer));
      else assert.ok(footer.top >= 0 && footer.bottom <= footer.height+1, JSON.stringify(footer));
      assert.equal((await currentState(page)).week, beforeWeek);
      await page.click('.week-controls [data-action=end-week]');
      await page.waitFor('document.querySelector("dialog[open] #modal-title")?.textContent.includes("本周小结")');
      assert.equal((await currentState(page)).week, beforeWeek+1);
      await page.click('dialog [data-ui="close-dialog"]');
      assert.equal(await currentApp(), 'home');
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
    // A saved view from the former separate weekend-rest app must resolve to the new home.
    await page.evaluate(`(()=>{const record=JSON.parse(localStorage.getItem(${key}));record.view.lifeApp='rest';localStorage.setItem(${key},JSON.stringify(record));})()`);
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

test('all three original short activities keep their cost, energy and weekly limit in the new apps', { skip: !enabled, timeout: 120_000 }, async () => {
  const browser = await launchBrowser(root, { scenarios: true });
  try {
    const page = await browser.page({ width: 390, height: 844, mobile: true });
    await page.goto();
    await page.waitFor(present('[data-form="new-game"]'));
    for (const [id, app, group, cost, energy, otherApp, otherId, otherGroup] of [
      ['night-bus', 'trips', null, 1560, 38, 'friends', 'flower-market', 'streets'],
      ['flower-market', 'friends', 'streets', 240, 14, 'trips', 'night-bus', null],
      ['mending', 'friends', 'culture', 480, 21, 'trips', 'night-bus', null],
    ]) {
      await loadScenario(page, `game=>{const s=game.newGame({seed:381});s.cash=50000;s.energy=10;s.tutorial.done=true;return s;}`);
      await page.click('.nav [data-page="offwork"]');
      await page.click(`[data-ui=life-app][data-id="${app}"]`);
      if (group) await page.click(`#life-friends-${group} > summary`);
      await page.click(`[data-life-id="${id}"] > summary`);
      const before = await currentState(page);
      await page.click(`[data-action=outing][data-id="${id}"]`);
      const after = await currentState(page);
      assert.equal(after.cash, before.cash-cost, id);
      assert.equal(after.energy, before.energy+energy, id);
      assert.equal(after.life.lastBreakWeek, before.week, id);
      assert.equal(after.life.latestOuting.id, id);
      assert.equal(after.life.latestOuting.price, cost);
      assert.equal(after.life.latestOuting.restored, energy);
      assert.ok(await page.evaluate('document.activeElement.closest("#latest-outing")'));
      await page.waitFor('document.querySelector("#latest-outing img")?.naturalWidth>0');
      await page.click('[data-ui=life-app][data-id=home]');
      await page.click(`[data-ui=life-app][data-id="${otherApp}"]`);
      if (otherGroup) await page.click(`#life-friends-${otherGroup} > summary`);
      await page.click(`[data-life-id="${otherId}"] > summary`);
      assert.ok(await page.evaluate(`document.querySelector('[data-action=outing][data-id="${otherId}"]').disabled`), 'weekly limit shared across apps');
      assert.deepEqual(await currentState(page), after);
      await checkWidth(page);
    }
    assert.deepEqual(page.errors, []);
  } finally { await browser.close(); }
});

test('unaffordable houses and cars and pledged sales explain disabled controls on mobile', { skip: !enabled, timeout: 120_000 }, async () => {
  const browser = await launchBrowser(root, { scenarios: true });
  try {
    for (const viewport of [{ width: 320, height: 568, mobile: true }, { width: 390, height: 844, mobile: true }]) {
      const page = await browser.page(viewport);
      await page.goto();
      await page.waitFor(present('[data-form="new-game"],[data-ui="resume-save"]'));
      await loadScenario(page, `game=>{const s=game.newGame({seed:381});s.cash=50000;s.tutorial.done=true;return s;}`);
      await page.click('.nav [data-page="offwork"]');
      await page.click('[data-ui=life-app][data-id=property]');
      const buttonInfo = selector => page.evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)}),r=el.getBoundingClientRect();return{disabled:el.disabled,label:el.innerText,overflow:el.scrollWidth>el.clientWidth+1,right:r.right};})()`);
      const expensiveHome = await buttonInfo('[data-action="buy-property"][data-id="city-flat"]');
      assert.equal(expensiveHome.disabled, true);
      assert.match(expensiveHome.label, /¥62,000.*现金不足/);
      assert.match(await page.evaluate('document.querySelector("[data-life-id=city-flat]").innerText'), /增加 ¥34,100 授信额度/);
      assert.equal(expensiveHome.overflow, false);
      assert.ok(expensiveHome.right <= viewport.width + 1);
      const room = await buttonInfo('[data-action="buy-property"][data-id="studio-room"]');
      assert.equal(room.disabled, false);
      assert.doesNotMatch(room.label, /现金不足/);
      await page.click('[data-action="buy-property"][data-id="studio-room"]');
      await page.click('[data-action="mortgage"][data-id="studio-room"]');
      const pledgedSale = await buttonInfo('[data-action="sell-property"][data-id="studio-room"]');
      assert.equal(pledgedSale.disabled, true);
      assert.match(pledgedSale.label, /¥23,800.*需先解除抵押/);
      assert.equal(pledgedSale.overflow, false);
      // The intentional reversal occurs after the existing double-gesture guard.
      await new Promise(resolve => setTimeout(resolve, 500));
      await page.click('[data-action="unmortgage"][data-id="studio-room"]');
      assert.equal((await buttonInfo('[data-action="sell-property"][data-id="studio-room"]')).disabled, false);
      await page.click('[data-ui=life-app][data-id=home]');
      await page.click('[data-ui=life-app][data-id=car]');
      const expensiveCar = await buttonInfo('[data-action="buy-car"][data-id="super"]');
      assert.equal(expensiveCar.disabled, true);
      assert.match(expensiveCar.label, /¥1,950,000.*现金不足/);
      assert.equal(expensiveCar.overflow, false);
      assert.ok(expensiveCar.right <= viewport.width + 1);
      await checkWidth(page);
      assert.deepEqual(page.errors, []);
    }
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
    assert.ok(tripState.life.latestOuting.dialogue);
    assert.equal(await page.evaluate('document.querySelector("#latest-outing > blockquote").innerText'), `${tripState.life.latestOuting.companionName}：“${tripState.life.latestOuting.dialogue}”`);
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

for(const viewport of [{width:320,height:568,mobile:true},{width:390,height:844,mobile:true}]) {
  test(`confirmed travel and friend choices reveal the matching comic, dialogue and epilogue without extra clicks at ${viewport.width}px`,{skip:!enabled,timeout:120000},async()=>{
    const browser=await launchBrowser(root,{scenarios:true});
    try {
      const page=await browser.page(viewport);
      await page.goto();
      await page.waitFor(present('[data-form=new-game]'));
      const fresh=`game=>{const s=game.newGame({seed:381,difficulty:'normal',assistant:'fang'});s.energy=10;s.cash=50000;s.tutorial.done=true;return s;}`;
      const launch=async app=>{await loadScenario(page,fresh);await page.click('.nav [data-page=offwork]');await page.click(`[data-ui=life-app][data-id=${app}]`);};
      const resume=async()=>{await page.send('Page.reload');await page.waitFor(present('[data-ui=resume-save]'));await page.click('[data-ui=resume-save]');};
      const resultVisible=async(selector,asset)=>{
        await page.waitFor(`document.querySelector(${JSON.stringify(selector)})?.naturalWidth>0`);
        const result=await page.evaluate(`(()=>{const image=document.querySelector(${JSON.stringify(selector)}),r=image.getBoundingClientRect();return {src:image.getAttribute('src'),shown:r.width>0&&r.height>0&&!image.closest('details:not([open])'),width:r.width,top:r.top,bottom:r.bottom};})()`);
        assert.equal(result.src,asset);
        assert.ok(result.shown&&result.width>=200,JSON.stringify(result));
        return result;
      };
      const main='#latest-outing > .outing-art img';
      const memory='#latest-outing .outing-memory';
      await launch('trips');
      assert.equal(await page.evaluate('document.querySelectorAll("details.outing-card[open]").length'),0);
      assert.equal(await page.evaluate(present('#latest-outing')),false);
      const before=await currentState(page);
      await page.click('[data-life-id=trip-night-train] > summary');
      const form='form[data-outing-id=trip-night-train]';
      await page.evaluate(`document.querySelector('${form} select[name=companionId]').focus()`);
      for(const [key,code] of [['Home',36],['ArrowDown',40],['ArrowDown',40]]){
        await page.send('Input.dispatchKeyEvent',{type:'rawKeyDown',key,code:key,windowsVirtualKeyCode:code});
        await page.send('Input.dispatchKeyEvent',{type:'keyUp',key,code:key,windowsVirtualKeyCode:code});
      }
      assert.equal(await page.evaluate(`document.querySelector('${form} select[name=companionId]').value`),'liang');
      await page.click(`${form} label:has(input[value=breakfast])`);
      assert.equal(await page.evaluate(`document.querySelector('${form} input[name=choiceId]:checked').value`),'breakfast');
      assert.deepEqual(await currentState(page),before,'choosing a branch is not a purchase');
      assert.equal(await page.evaluate(present('#latest-outing')),false);
      assert.equal(await page.evaluate(present('img[src="assets/deal-outing-night-train-breakfast.webp"]')),false,'the unconfirmed branch has no result image');
      await page.click(`${form} button[type=submit]`);
      const travel=await currentState(page),latest=travel.life.latestOuting;
      assert.equal(latest.choiceId,'breakfast');
      assert.equal(travel.cash,before.cash-latest.price);
      assert.equal(travel.energy,before.energy+latest.restored);
      assert.equal(latest.companionName,'梁佳音');
      assert.equal(latest.epilogue.asset,'assets/deal-trip-extra-train-bowl.webp');
      const primary=await resultVisible(main,'assets/deal-outing-night-train-breakfast.webp');
      assert.ok(primary.top>=-1&&primary.bottom<=viewport.height-40,JSON.stringify(primary));
      const toastBottom=await page.evaluate('document.querySelector(".action-feedback")?.getBoundingClientRect().bottom??0');
      assert.ok(primary.top>=toastBottom+4,'the immediate confirmation notice must not cover the chosen artwork');
      assert.ok(await page.evaluate(`document.querySelector('${memory}').open`),'additional comic is initially open, not another click');
      await resultVisible(`${memory} img`,latest.epilogue.asset);
      const copy=await page.evaluate(`document.querySelector('${memory}').innerText`);
      assert.ok(copy.includes(latest.epilogue.title)&&copy.includes(latest.epilogue.text)&&copy.includes(quotedSpeech(latest.epilogue.dialogue)),copy);
      assert.ok((await page.evaluate('document.querySelector("#latest-outing > blockquote").innerText')).includes(quotedSpeech(latest.dialogue)));
      assert.equal(await page.evaluate(present('#latest-outing img[src*="train-wake"]')),false);
      assert.equal(await page.evaluate(present('#latest-outing img[src*="train-buoy"]')),false);
      await page.screenshot(`/tmp/v38-life-result-travel-${viewport.width}.png`);
      await page.evaluate(`document.querySelector('${memory}').scrollIntoView({block:'center',behavior:'instant'})`);
      await page.screenshot(`/tmp/v38-life-result-epilogue-${viewport.width}.png`);
      await checkWidth(page);
      await resume();
      assert.deepEqual(await currentState(page),travel);
      assert.ok(await page.evaluate(`document.querySelector('${memory}').open`));
      await resultVisible(`${memory} img`,latest.epilogue.asset);
      await page.click('[data-ui=life-app][data-id=home]');
      assert.ok(await page.evaluate(`document.querySelector('${memory}').open`),'returning home also exposes the same finished trip');

      // Most friend episodes have one scene comic rather than a separate
      // image for each branch; keep that original scene and the chosen text.
      await launch('friends');
      assert.equal(await page.evaluate('document.querySelectorAll("[data-life-disclosure][open]").length'),0);
      assert.equal(await page.evaluate(present('#latest-outing')),false);
      const beforeFriend=await currentState(page);
      await page.click('#life-friends-fang > summary');
      await page.click('[data-life-id=friend-fang-stool] > summary');
      const friendForm='form[data-outing-id=friend-fang-stool]';
      await page.click(`${friendForm} label:has(input[value=second])`);
      assert.deepEqual(await currentState(page),beforeFriend);
      assert.equal(await page.evaluate(present('#latest-outing')),false);
      await page.click(`${friendForm} button[type=submit]`);
      const friend=await currentState(page),memoryResult=friend.life.latestOuting;
      assert.equal(memoryResult.choiceId,'second');
      assert.equal(memoryResult.asset,null,'the activity has only a shared scene, not an invented branch illustration');
      assert.equal(friend.cash,beforeFriend.cash-memoryResult.price);
      const friendArt=await resultVisible(main,'assets/deal-outing-comic-fang-stool.webp');
      const friendToast=await page.evaluate('document.querySelector(".action-feedback")?.getBoundingClientRect().bottom??0');
      assert.ok(friendArt.top>=friendToast+4,'the confirmation notice must not cover the friend scene');
      assert.ok((await page.evaluate('document.querySelector("#latest-outing").innerText')).includes(memoryResult.text));
      assert.ok((await page.evaluate('document.querySelector("#latest-outing > blockquote").innerText')).includes(quotedSpeech(memoryResult.dialogue)));
      assert.equal(await page.evaluate(present(memory)),false);
      assert.equal(await page.evaluate('document.querySelectorAll("details.outing-card[open]").length'),0);
      await page.screenshot(`/tmp/v38-life-result-friend-${viewport.width}.png`);
      await checkWidth(page);
      await resume();
      assert.deepEqual(await currentState(page),friend);
      await resultVisible(main,'assets/deal-outing-comic-fang-stool.webp');
      assert.deepEqual(page.errors,[]);
    }finally{await browser.close();}
  });
}
