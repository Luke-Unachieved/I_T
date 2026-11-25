import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/chromium.mjs';
import { currentState, loadScenario } from './helpers/scenarios.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const enabled = process.env.V38_BROWSER === '1';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function doubleClickAtSamePoint(page, selector) {
  const point = await page.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.scrollIntoView({block:'center',behavior:'instant'});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
  for (const clickCount of [1, 2]) {
    if (clickCount === 2) await pause(70);
    await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount });
    await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount });
  }
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 320, height: 568, mobile: true }]) {
  test(`rapid life and investment gestures cannot execute a second balance-changing action at ${viewport.width}px`, { skip: !enabled, timeout: 120_000 }, async () => {
    const browser = await launchBrowser(root, { scenarios: true });
    try {
      const page = await browser.page(viewport);
      await page.goto();
      await page.waitFor('Boolean(document.querySelector("[data-form=new-game]"))');
      await loadScenario(page, `(game)=>{let s=game.newGame({name:'高速点击验收',assistant:'fang',seed:381});s.cash=6000000;s.company.rep=88;s.company.certs=['export','audit','supplier'];s.company.markets=['domestic','se-asia'];s.creditLine=game.creditLimit(s);s.tutorial.done=true;s=game.act(s,{type:'buy-property',id:'studio-room'}).state;s=game.act(s,{type:'invest-venture',id:'warehouse'}).state;return s;}`);
      await page.click('[data-ui="page"][data-page="offwork"]');
      await page.click('[data-ui="life-anchor"][data-id="life-property"]');
      const before = await currentState(page);
      await doubleClickAtSamePoint(page, '[data-action="sell-property"][data-id="studio-room"]');
      let state = await currentState(page);
      assert.equal(state.cash, before.cash + Math.floor(28000 * 0.85));
      assert.deepEqual(state.life.properties, []);
      assert.match(await page.evaluate('document.querySelector(".action-feedback").innerText'), /出售款已到账/);
      await pause(480);
      await page.click('[data-action="buy-property"][data-id="studio-room"]');
      state = await currentState(page);
      assert.deepEqual(state.life.properties, [{ id: 'studio-room', pledged: false }]);
      await page.click('[data-action="buy-property"][data-id="city-flat"]');
      assert.equal((await currentState(page)).life.properties.length, 2);

      await page.click('[data-ui="page"][data-page="company"]');
      await page.click('[data-ui="development-tab"][data-id="ventures"]');
      const starting = await currentState(page);
      assert.equal(starting.ventures.warehouse, 1);
      await doubleClickAtSamePoint(page, '[data-action="invest-venture"][data-id="warehouse"]');
      assert.equal((await currentState(page)).ventures.warehouse, 2);
      await pause(480);
      await page.click('[data-action="invest-venture"][data-id="warehouse"]');
      assert.equal((await currentState(page)).ventures.warehouse, 3);

      const targets = await page.evaluate(`(()=>{const find=()=>document.querySelector('form[data-form=invest-venture]:has([name=id][value=factory])');const form=find();const target=form.elements.target.value;const alternate=Array.from(form.elements.target.options).find(o=>!o.disabled&&o.value!==target)?.value;form.requestSubmit();const next=find();next.elements.target.value=target;next.requestSubmit();if(alternate){const other=find();other.elements.target.value=alternate;other.requestSubmit();}return {target,alternate};})()`);
      const factories = (await currentState(page)).ventures.factory;
      assert.equal(factories[targets.target], 1);
      assert.ok(targets.alternate);
      assert.equal(factories[targets.alternate], 1);
      assert.deepEqual(page.errors, []);
    } finally { await browser.close(); }
  });
}
