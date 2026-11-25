import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/chromium.mjs';
import { currentState, loadScenario } from './helpers/scenarios.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const enabled = process.env.V38_BROWSER === '1';
const present = selector => `Boolean(document.querySelector(${JSON.stringify(selector)}))`;

async function openDecision(page, fixture) {
  await loadScenario(page, fixture);
  await page.click('.app-notices [data-ui="show-event"]');
  await page.waitFor(present('dialog[open] [data-action="resolve-event"]'));
}

async function checkDecisionLayout(page, label) {
  // Measure the real visual bounds, including the five-pixel focus and
  // assistant recommendation ring, which extends outside the button box.
  const layout = await page.evaluate(`(()=>{
    const dialog=document.querySelector('dialog[open]');
    const rect=e=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height}};
    const choices=[...dialog.querySelectorAll('[data-action="resolve-event"]')].map(button=>({id:button.dataset.choice,rect:rect(button),recommended:button.classList.contains('coach-action'),describedBy:button.getAttribute('aria-describedby')}));
    const details=[...dialog.querySelectorAll('.decision-detail li')].map(line=>{const range=document.createRange();range.selectNodeContents(line);return {text:line.textContent,line:rect(line),row:rect(line.closest('.decision-option')),runs:[...range.getClientRects()].map(r=>({top:r.top,bottom:r.bottom,left:r.left,right:r.right}))};});
    const rows=[...dialog.querySelectorAll('.decision-option')].map(row=>rect(row));
    return {choices,details,rows,documentOverflow:document.documentElement.scrollWidth-innerWidth,dialogOverflow:dialog.scrollWidth-dialog.clientWidth,scrollable:dialog.scrollHeight>dialog.clientHeight};
  })()`);
  assert.ok(layout.documentOverflow <= 1 && layout.dialogOverflow <= 1, `${label}: horizontal overflow ${JSON.stringify(layout)}`);
  for (let i = 1; i < layout.rows.length; i++) {
    assert.ok(layout.rows[i].top - layout.rows[i - 1].bottom >= 10, `${label}: adjacent choice rows need room for their outlines`);
  }
  for (const choice of layout.choices) {
    assert.ok(choice.rect.width >= 44 && choice.rect.height >= 44, `${label}: undersized choice ${choice.id}`);
    // An outline must not cover the description of its own option or that
    // of a neighboring option. Use the text rectangles, not only list boxes.
    for (const detail of layout.details) {
      for (const run of detail.runs) {
        assert.ok(run.left >= detail.row.left - 1 && run.right <= detail.row.right + 1 && run.bottom <= detail.row.bottom + 1, `${label}: detail wraps outside its own row: ${detail.text}`);
        const overlap = run.left < choice.rect.right + 5 && run.right > choice.rect.left - 5 &&
          run.top < choice.rect.bottom + 5 && run.bottom > choice.rect.top - 5;
        assert.equal(overlap, false, `${label}: ${choice.id} paints over ${detail.text}`);
      }
    }
  }
  for (let i = 1; i < layout.choices.length; i++) {
    assert.ok(layout.choices[i].rect.top - layout.choices[i - 1].rect.bottom >= 10, `${label}: adjacent buttons or their outlines overlap`);
  }
  // A long dialog can scroll, but every choice must be reachable without
  // horizontal scrolling or being intercepted by another painted element.
  for (const choice of layout.choices) {
    const target = await page.evaluate(`(()=>{const b=document.querySelector('dialog[open] [data-action="resolve-event"][data-choice="${choice.id}"]');b.scrollIntoView({behavior:'instant',block:'center'});const r=b.getBoundingClientRect(),d=b.closest('dialog').getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;return {inside:r.top>=Math.max(0,d.top)-1&&r.bottom<=Math.min(innerHeight,d.bottom)+1&&r.left>=d.left&&r.right<=d.right,hit:b.contains(document.elementFromPoint(x,y))};})()`);
    assert.ok(target.inside && target.hit, `${label}: choice ${choice.id} is unreachable ${JSON.stringify(target)}`);
    if (choice.describedBy) assert.ok(await page.evaluate(present(`dialog #${choice.describedBy}`)), `${label}: choice lost its accessible description`);
  }
  return layout;
}

async function touchChoice(page, id) {
  const point = await page.evaluate(`(()=>{const b=document.querySelector('dialog[open] [data-action="resolve-event"][data-choice="${id}"]');b.scrollIntoView({behavior:'instant',block:'center'});const r=b.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  await page.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
  await page.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

for (const viewport of [{ width: 320, height: 568, mobile: true }, { width: 390, height: 844, mobile: true }]) {
  test(`event choices preserve their descriptions, highlight and hit targets at ${viewport.width}px`, { skip: !enabled, timeout: 90_000 }, async () => {
    const browser = await launchBrowser(root, { scenarios: true });
    try {
      const page = await browser.page(viewport);
      await page.goto();
      await page.waitFor(present('[data-form="new-game"]'));

      // Create the same actual rival-failure event as the reported screenshot
      // by resolving a real week with a distressed rival. No hand-written fee
      // or choice labels can hide a mismatch with the engine's decisionInfo.
      await openDecision(page, `game=>{let s=game.newGame({name:'事件布局验收',seed:381,difficulty:'casual'});s.tutorial.done=true;const rival=s.rivals.find(r=>r.id==='willow');Object.assign(rival,{health:1,cash:-9000,scale:2});s=game.endWeek(s);s.summary=null;s.events=s.events.filter(e=>e.type==='rival-sale'&&e.rivalId==='willow');return s;}`);
      const before = await currentState(page);
      assert.equal(before.events[0].title, '柳津实业停止经营');
      assert.equal(before.events[0].fee, 5200);
      assert.match(await page.evaluate('document.querySelector("dialog .decision-detail").innerText'), /立即支出\s*¥5,200/);
      const rivalLayout = await checkDecisionLayout(page, 'rival-sale');
      assert.deepEqual(rivalLayout.choices.map(choice => choice.id), ['acquire', 'pass']);
      assert.equal(rivalLayout.choices[1].recommended, true);
      await page.screenshot(`/tmp/v38-event-rival-sale-${viewport.width}.png`);
      const rivalChoice = viewport.width === 320 ? 'acquire' : 'pass';
      await touchChoice(page, rivalChoice);
      const after = await currentState(page);
      assert.equal(after.events.length, 0);
      assert.equal(after.cash, before.cash - (rivalChoice === 'acquire' ? 5200 : 0));
      assert.equal(after.rivals.find(rival => rival.id === 'willow').status, rivalChoice === 'acquire' ? 'acquired' : 'failed');

      // The catalog's actual quality event has three options and multiple
      // lines of contract impact, including projected dates and penalties.
      await openDecision(page, `async game=>{const {TRADE_EVENTS}=await import('/v38/data/events.js');let s=game.newGame({name:'三选项布局验收',seed:381,difficulty:'casual'});s.tutorial.done=true;s=game.act(s,{type:'bid',inquiryId:s.inquiries[0].id,source:'stock',ratio:80}).state;s=game.endWeek(s);s.summary=null;const event=TRADE_EVENTS.find(item=>item.id==='quality');s.events=[{...event,id:'quality-layout',type:'trade-event',code:event.id,orderId:s.orders[0].id}];return s;}`);
      const qualityLayout = await checkDecisionLayout(page, 'quality');
      assert.deepEqual(qualityLayout.choices.map(choice => choice.id), ['rework', 'discount', 'return']);
      assert.ok(qualityLayout.details.length >= 5 && qualityLayout.scrollable, 'Long structured decision actually needs scrolling');
      await page.screenshot(`/tmp/v38-event-quality-${viewport.width}.png`);
      await touchChoice(page, 'return');
      assert.equal((await currentState(page)).events.length, 0);

      // A long policy explanation and illustration must wrap within its own
      // card, even before a subsequent option with no details.
      await openDecision(page, `async game=>{const {TRADE_EVENTS}=await import('/v38/data/events.js');const s=game.newGame({name:'长说明布局验收',seed:381,difficulty:'casual'});s.tutorial.done=true;const event=TRADE_EVENTS.find(item=>item.id==='materials');s.events=[{...event,id:'materials-layout',type:'trade-event',code:event.id}];return s;}`);
      const materialsLayout = await checkDecisionLayout(page, 'materials');
      assert.ok(materialsLayout.details.some(detail => detail.runs.length > 1));
      await page.screenshot(`/tmp/v38-event-materials-${viewport.width}.png`);
      await touchChoice(page, 'open');
      assert.equal((await currentState(page)).events.length, 0);

      // Choices with no impact detail still use the separate footer. Keep
      // that layout scrollable and visually separate at the same widths.
      await openDecision(page, `async game=>{const {TRADE_EVENTS}=await import('/v38/data/events.js');const s=game.newGame({name:'无明细布局验收',seed:381,difficulty:'casual'});s.tutorial.done=true;const event=TRADE_EVENTS.find(item=>item.id==='add-order');s.events=[{...event,id:'add-order-layout',type:'trade-event',code:event.id}];return s;}`);
      const footerLayout = await checkDecisionLayout(page, 'add-order');
      assert.equal(footerLayout.details.length, 0);
      assert.equal(footerLayout.choices.length, 2);
      await touchChoice(page, 'pass');
      assert.equal((await currentState(page)).events.length, 0);
      assert.deepEqual(page.errors, []);
    } finally { await browser.close(); }
  });
}
