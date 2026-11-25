import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/chromium.mjs';
import { currentState, loadScenario } from './helpers/scenarios.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const options = { skip: process.env.V38_BROWSER !== '1', timeout: 90_000 };
const present = selector => `Boolean(document.querySelector(${JSON.stringify(selector)}))`;
const pause = millis => new Promise(resolve => setTimeout(resolve, millis));
const summaryCards = page => page.evaluate('Array.from(document.querySelectorAll("[data-summary-feedback]")).map(card=>card.dataset.summaryFeedback)');
const currency = value => '¥' + value.toLocaleString('zh-CN');

async function ready(page) {
  await page.goto();
  await page.waitFor(present('[data-form="new-game"]'));
}

async function settle(page, action = 'end-week') {
  // A deliberate new weekly action follows the previous dialog or submission.
  await pause(410);
  await page.click(`[data-action="${action}"]`);
  await page.waitFor(present('dialog.summary-dialog[open]'));
  return currentState(page);
}

async function card(page, kind, asset) {
  const selector = `[data-summary-feedback="${kind}"]`;
  await page.waitFor(present(selector));
  await page.evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center'})`);
  await page.waitFor(`(()=>{const f=document.querySelector(${JSON.stringify(selector+' .media-frame')}),i=f?.querySelector('img');return i?.naturalWidth>0&&f.dataset.mediaState==='loaded'&&Number(getComputedStyle(i).opacity)>.9&&i.getAttribute('data-media-src')==='assets/${asset}'})()`);
  await page.evaluate(`(async()=>{await document.querySelector(${JSON.stringify(selector+' img')}).decode();await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));})()`);
  const geometry = await page.evaluate(`(()=>{const c=document.querySelector(${JSON.stringify(selector)}), f=c.querySelector('.summary-feedback-art'), i=f.querySelector('img'), r=f.getBoundingClientRect(), style=getComputedStyle(i);return {width:r.width,height:r.height,nw:i.naturalWidth,nh:i.naturalHeight,visible:style.visibility==='visible'&&style.display!=='none'&&Number(style.opacity)>.9,text:c.innerText};})()`);
  assert.ok(Math.abs(geometry.height - geometry.width * geometry.nh / geometry.nw) < 1, 'Feedback image retains its native aspect');
  assert.equal(geometry.visible, true);
  return geometry;
}

async function visibleFooter(page) {
  const result = await page.evaluate(`(()=>{const d=document.querySelector('dialog[open]'),r=d.getBoundingClientRect(),f=d.querySelector('.dialog-footer').getBoundingClientRect();return {fits:document.documentElement.scrollWidth<=innerWidth+1&&d.scrollWidth<=d.clientWidth+1,footerVisible:f.top>=r.top&&f.bottom<=innerHeight+1,buttons:Array.from(d.querySelectorAll('.dialog-footer button')).map(b=>{const q=b.getBoundingClientRect(),target=document.elementFromPoint(q.x+q.width/2,q.y+q.height/2);return q.height>=44&&q.bottom<=innerHeight+1&&target?.closest('button')===b;})};})()`);
  assert.ok(result.fits && result.footerVisible && result.buttons.every(Boolean), JSON.stringify(result));
}

for (const viewport of [{ width: 320, height: 568, mobile: true }, { width: 390, height: 844, mobile: true }, { width: 1440, height: 1000 }]) {
  test(`actual quote, delivery and ordinary payment have distinct illustrated rewards at ${viewport.width}px`, options, async () => {
    const browser = await launchBrowser(root, { scenarios: true });
    try {
      const page = await browser.page(viewport);
      await ready(page);
      await loadScenario(page, `game=>{const state=game.newGame({name:'订单反馈实测',assistant:'fang',seed:381});state.tutorial.done=true;return state;}`);
      await page.click('nav [data-page="inquiries"]');
      await page.click('[data-ui="quote-open"]');
      await page.evaluate('(()=>{const ratio=document.querySelector("dialog input[name=ratio]");ratio.value="80";ratio.dispatchEvent(new Event("input",{bubbles:true}));})()');
      await page.click('dialog [data-form="quote"] button[type="submit"]');
      await page.waitFor('!document.querySelector("dialog").open');
      const offered = await currentState(page);
      assert.equal(offered.bids.length, 1);
      if (viewport.width === 390) {
        await page.send('Network.enable');
        await page.send('Network.setBlockedURLs', { urls: ['*v38-feedback-order-won.webp'] });
      }
      const won = await settle(page);
      assert.equal(won.summary.won.length, 1);
      assert.deepEqual(await summaryCards(page), ['won']);
      const identity = won.summary.won[0].orderId;
      const order = won.orders.find(item=>item.id===identity);
      if (viewport.width === 390) {
        await page.waitFor('document.querySelector("[data-summary-feedback=won] .media-frame")?.dataset.mediaState==="error"');
        const geometry = await page.evaluate('(()=>{const r=document.querySelector("[data-summary-feedback=won] .media-frame").getBoundingClientRect();return [r.width,r.height]})()');
        assert.match(await page.evaluate('document.querySelector("[data-summary-feedback=won]").innerText'), /第一单，拿下！/);
        await visibleFooter(page);
        await page.send('Network.setBlockedURLs', { urls: [] });
        await page.click('[data-summary-feedback="won"] [data-media-retry]');
        await page.waitFor('document.querySelector("[data-summary-feedback=won] .media-frame")?.dataset.mediaState==="loaded"');
        const restored = await page.evaluate('(()=>{const r=document.querySelector("[data-summary-feedback=won] .media-frame").getBoundingClientRect();return [r.width,r.height]})()');
        assert.deepEqual(restored, geometry, 'Failed artwork reserves the same space when retried');
      }
      const signed = await card(page, 'won', 'v38-feedback-order-won.webp');
      assert.match(signed.text, /第一单，拿下！/);
      assert.ok(signed.text.includes(order.buyer.name) && signed.text.includes(currency(order.total)) && signed.text.includes(currency(order.deposit)));
      await visibleFooter(page);
      await page.screenshot(`/tmp/trade-v38-feedback-${viewport.width}-won.png`);
      await page.click('dialog [data-ui="view-first-order"]');
      await page.waitFor('document.querySelector("#page-title")?.textContent.includes("订单")');
      const idle = await settle(page);
      assert.ok(!idle.summary.won.length && !idle.summary.delivered.length);
      assert.deepEqual(await summaryCards(page), [], 'An ordinary transit week has no fake order reward');
      await visibleFooter(page);
      await page.click('dialog [data-ui="close-dialog"]');

      const delivered = await settle(page);
      assert.ok(delivered.summary.delivered.includes(identity));
      assert.deepEqual(await summaryCards(page), ['delivered']);
      const invoice = delivered.receivables.find(item=>item.orderId===identity);
      assert.equal(invoice.status, 'open');
      const handoff = await card(page, 'delivered', 'v38-feedback-delivered.webp');
      assert.match(handoff.text, /第一批货送到了！/);
      assert.ok(await page.evaluate('document.querySelector("[data-summary-feedback=delivered]").classList.contains("summary-feedback-first")'));
      assert.ok(handoff.text.includes('待收') && handoff.text.includes(currency(invoice.amount)));
      assert.doesNotMatch(handoff.text, /款项已结清/);
      await visibleFooter(page);
      await page.screenshot(`/tmp/trade-v38-feedback-${viewport.width}-delivered.png`);
      await page.click('dialog [data-ui="close-dialog"]');

      const paid = await settle(page);
      assert.deepEqual(await summaryCards(page), ['paid']);
      const actual = paid.summary.cashBreakdown.inflow.customerPayment;
      assert.ok(actual > 0);
      assert.equal(paid.receivables.find(item=>item.id===invoice.id).status, 'paid');
      const received = await card(page, 'paid', 'v38-feedback-paid.webp');
      assert.ok(received.text.includes(currency(actual)) && received.text.includes('客户尾款'));
      assert.ok(await page.evaluate('document.querySelector("[data-summary-feedback=paid]").classList.contains("summary-feedback-first")'));
      await visibleFooter(page);
      await page.screenshot(`/tmp/trade-v38-feedback-${viewport.width}-paid.png`);
      const errors = page.errors.filter(message => viewport.width !== 390 || !message.includes('ERR_BLOCKED_BY_CLIENT'));
      assert.deepEqual(errors, []);
    } finally { await browser.close(); }
  });
}

test('four-week summary groups delivery and customer payment instead of repeating scenes', options, async () => {
  const browser = await launchBrowser(root, { scenarios: true });
  try {
    const page = await browser.page({ width: 390, height: 844, mobile: true });
    await ready(page);
    await loadScenario(page, `game=>{let state=game.newGame({name:'多周反馈实测',assistant:'fang',seed:381});state.tutorial.done=true;state=game.act(state,{type:'bid',inquiryId:state.inquiries[0].id,source:'stock',ratio:80}).state;state=game.endWeek(state);state.summary=null;return state;}`);
    const state = await settle(page, 'advance-four');
    assert.ok(state.summary.weeks.length>1);
    assert.deepEqual(await summaryCards(page), ['delivered','paid']);
    assert.equal(await page.evaluate('document.querySelectorAll(".summary-feedback-first").length'), 1);
    const handoff = await card(page, 'delivered', 'v38-feedback-delivered.webp');
    assert.match(handoff.text, /款项已结清/);
    const received = await card(page, 'paid', 'v38-feedback-paid.webp');
    const total = state.summary.weeks.reduce((sum,week)=>sum+(week.cashBreakdown.inflow.customerPayment??0),0);
    assert.ok(received.text.includes(currency(total)));
    await visibleFooter(page);
    await page.screenshot('/tmp/trade-v38-feedback-multi.png');
  } finally { await browser.close(); }
});

test('three signed orders share one scene with the actual combined contract and deposit', options, async () => {
  const browser = await launchBrowser(root, { scenarios: true });
  try {
    const page = await browser.page({ width: 390, height: 844, mobile: true });
    await ready(page);
    await loadScenario(page, `game=>{let state=game.newGame({name:'多单反馈实测',assistant:'fang',seed:381});state.tutorial.done=true;for(const inquiry of state.inquiries.slice(0,3)){state=game.act(state,{type:'bid',inquiryId:inquiry.id,source:'stock',ratio:80}).state;}return state;}`);
    const won = await settle(page);
    assert.equal(won.summary.won.length, 3);
    assert.deepEqual(await summaryCards(page), ['won']);
    const signed = await card(page, 'won', 'v38-feedback-order-won.webp');
    const total = won.orders.reduce((sum,order)=>sum+order.total,0);
    assert.ok(signed.text.includes('3 笔合同') && signed.text.includes(currency(total)));
    assert.ok(signed.text.includes(currency(won.summary.cashBreakdown.inflow.deposit)));
    await visibleFooter(page);
  } finally { await browser.close(); }
});

test('legal recovery cash does not display a customer-payment reward', options, async () => {
  const browser = await launchBrowser(root, { scenarios: true });
  try {
    const page = await browser.page();
    await ready(page);
    await loadScenario(page, `game=>{let state=game.newGame({name:'诉讼回款反馈校验',assistant:'fang',seed:381});state.tutorial.done=true;state=game.act(state,{type:'bid',inquiryId:state.inquiries[0].id,source:'stock',ratio:80}).state;for(let i=0;i<3;i++)state=game.endWeek(state);state.summary=null;state.receivables[0].status='lawsuit';state.receivables[0].dueWeek=state.week;state.orders[0].status='bad-debt';return state;}`);
    const state = await settle(page);
    assert.ok(state.summary.cashBreakdown.inflow.legalRecovery > 0);
    assert.equal(state.summary.cashBreakdown.inflow.customerPayment ?? 0, 0);
    assert.deepEqual(await summaryCards(page), []);
  } finally { await browser.close(); }
});

test('insurance payout does not display a customer-payment reward', options, async () => {
  const browser = await launchBrowser(root, { scenarios: true });
  try {
    const page = await browser.page();
    await ready(page);
    await loadScenario(page, `game=>{let state=game.newGame({name:'保险理赔反馈校验',assistant:'fang',seed:381});state.tutorial.done=true;state=game.act(state,{type:'bid',inquiryId:state.inquiries[0].id,source:'stock',ratio:80}).state;for(let i=0;i<3;i++)state=game.endWeek(state);state.summary=null;const invoice=state.receivables[0];invoice.status='bad-debt';invoice.insuranceDueWeek=state.week;state.orders[0].status='bad-debt';state.queue.push({id:'scheduled-test',type:'insurance',amount:1000,orderId:invoice.orderId,invoiceId:invoice.id,dueWeek:state.week});return state;}`);
    const state = await settle(page);
    assert.equal(state.summary.cashBreakdown.inflow.insuranceRecovery, 1000);
    assert.equal(state.summary.cashBreakdown.inflow.customerPayment ?? 0, 0);
    assert.deepEqual(await summaryCards(page), []);
  } finally { await browser.close(); }
});
