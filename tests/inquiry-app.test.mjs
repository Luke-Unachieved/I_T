import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/chromium.mjs';
import { currentState, loadScenario } from './helpers/scenarios.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const enabled = process.env.V38_BROWSER === '1';
const present = selector => `Boolean(document.querySelector(${JSON.stringify(selector)}))`;
const noOverflow = async page => assert.ok(await page.evaluate('document.documentElement.scrollWidth<=innerWidth+1 && document.body.scrollWidth<=innerWidth+1'));
async function settleImage(page, selector) {
  await page.waitFor(`(()=>{const f=document.querySelector(${JSON.stringify(selector)}),i=f?.querySelector('img');return f?.dataset.mediaState==='loaded'&&i?.naturalWidth>0})()`);
  await page.evaluate(`(async()=>{const f=document.querySelector(${JSON.stringify(selector)}),i=f.querySelector('img');await i.decode();await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));})()`);
  await page.waitFor(`Number(getComputedStyle(document.querySelector(${JSON.stringify(selector)}+' img')).opacity)>.98`);
  await page.evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
}
const select = (page, selector, value) => page.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('change',{bubbles:true}));})()`);

for (const viewport of [{width:320,height:568,mobile:true},{width:390,height:844,mobile:true},{width:1440,height:1000}]) {
  test(`inquiry app real Chromium ${viewport.width}px: open a buyer message, preserve draft, submit, filter and withdraw`, {skip:!enabled,timeout:120000}, async () => {
    const browser = await launchBrowser(root,{scenarios:true});
    try {
      const page=await browser.page(viewport);
      await page.goto();
      await page.waitFor(present('[data-form="new-game"]'));
      // A deterministic new standard game only; no historical bids, orders or drafts are injected.
      await loadScenario(page,`game=>{const state=game.newGame({name:'客户来信验收',difficulty:'normal',seed:381});state.tutorial.done=true;return state;}`);
      await page.click('.nav [data-page="inquiries"]');
      const before=await currentState(page);
      const id=await page.evaluate('document.querySelector(".inquiry-thread [data-ui=quote-open].primary").dataset.id');
      const row=`.inquiry-thread[data-inquiry-id=${JSON.stringify(id)}]`;
      const inquiry=before.inquiries.find(item=>item.id===id);
      assert.ok(inquiry);
      assert.equal(await page.evaluate(`document.querySelector('${row} .inquiry-thread-preview').innerText`),`“${inquiry.buyer.line}”`);
      assert.ok(await page.evaluate('Array.from(document.querySelectorAll(".inquiry-thread-preview")).every(e=>e.innerText.startsWith("“")&&e.innerText.endsWith("”"))'));
      assert.ok(await page.evaluate(present(`${row} .buyer-avatar`)));
      assert.match(await page.evaluate(`document.querySelector('${row}').innerText`),new RegExp(inquiry.productName));
      await settleImage(page,`${row} .product-thumb`);
      await noOverflow(page);
      await page.screenshot(`/tmp/v38-inquiry-app-${viewport.width}-list.png`);
      // Use the actual pointer on the buyer message, not the explicit quote button.
      await page.click(`${row} .inquiry-thread-preview`);
      await page.waitFor(present('dialog[open] [data-form="quote"]'));
      assert.equal(await page.evaluate('document.querySelector("dialog form[data-form=quote]").dataset.id'),id);
      assert.equal(await page.evaluate('document.querySelector("dialog .inquiry-message-bubble").innerText'),`“${inquiry.buyer.line}”`);
      await settleImage(page,'dialog .quote-product-image');
      await noOverflow(page);
      await page.screenshot(`/tmp/v38-inquiry-app-${viewport.width}-thread.png`);
      await page.evaluate('(()=>{const e=document.querySelector("dialog [name=ratio]");e.value="80";e.dispatchEvent(new Event("input",{bubbles:true}));})()');
      await page.click('dialog [data-ui="close-dialog"]');
      await page.waitFor('!document.querySelector("dialog").open');
      assert.equal(await page.evaluate('document.activeElement.dataset.id'),id);
      await page.click(`${row} .inquiry-thread-open`);
      assert.equal(await page.evaluate('document.querySelector("dialog [name=ratio]").value'),'80');
      assert.match(await page.evaluate('document.querySelector("dialog .trade-header").innerText'),/已恢复/);
      await page.click('dialog [data-form="quote"] button[type=submit]');
      await page.waitFor('!document.querySelector("dialog").open');
      const submitted=await currentState(page);
      assert.equal(submitted.bids.length,1);
      assert.equal(submitted.bids[0].inquiryId,id);
      assert.equal(submitted.cash,before.cash);
      assert.match(await page.evaluate(`document.querySelector('${row}').innerText`),/已报价/);
      assert.equal(await page.evaluate(present(`${row} [data-ui=quote-open]`)),false);
      await select(page,'[data-ui="inquiry-filter"][name=availability]','available');
      assert.equal(await page.evaluate(present(row)),false);
      await select(page,'[data-ui="inquiry-filter"][name=availability]','all');
      assert.ok(await page.evaluate(present(row)));
      await select(page,'[data-ui="inquiry-filter"][name=category]',inquiry.category);
      assert.ok(await page.evaluate(present(row)));
      const visibleIds=await page.evaluate('Array.from(document.querySelectorAll(".inquiry-thread"),e=>e.dataset.inquiryId)');
      assert.ok(visibleIds.every(visible=>before.inquiries.find(item=>item.id===visible)?.category===inquiry.category));
      await select(page,'[data-ui="inquiry-filter"][name=category]','');
      await page.click('.inquiry-sent-link');
      await page.waitFor('scrollY>0');
      await noOverflow(page);
      await page.screenshot(`/tmp/v38-inquiry-app-${viewport.width}-sent.png`);
      await page.click(`.inquiry-sent-quote [data-action="withdraw-bid"][data-id=${JSON.stringify(id)}]`);
      const withdrawn=await currentState(page);
      assert.equal(withdrawn.bids.length,0);
      assert.equal(withdrawn.cash,before.cash);
      assert.ok(await page.evaluate(present(`${row} [data-ui=quote-open]`)));
      assert.deepEqual(page.errors,[]);
    } finally {await browser.close();}
  });
}
