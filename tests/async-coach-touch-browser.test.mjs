import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/chromium.mjs';
import { currentState } from './helpers/scenarios.mjs';
import { act, forecast, newGame } from '../v38/engine/game.js';
import { quote } from '../v38/engine/quotes.js';
import { TRADE_EVENTS } from '../v38/data/events.js';
import { pageCoach } from '../v38/ui/coaching.js';
import { SAVE_KEY } from '../v38/ui/save.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const options = { skip: process.env.V38_BROWSER !== '1', timeout: 180_000 };
const pageCard = '.workspace > .coach-card';
const pending = '[data-coach-pending]';
const navSelector = id => `.nav [data-page="${id}"]`;
const route = id => `!!document.querySelector(${JSON.stringify(navSelector(id) + '[aria-current=page]')})`;
const exists = selector => `Boolean(document.querySelector(${JSON.stringify(selector)}))`;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

function finishWeek(state) {
  let next = act(state, { type: 'end-week' }).state;
  for (const event of [...next.events]) {
    const result = event.choices.map(choice => act(next, { type: 'resolve-event', id: event.id, choice: choice.id })).find(result => !result.error);
    if (!result) throw Error('fixture event has no valid choice');
    next = result.state;
  }
  return act(next, { type: 'dismiss-summary' }).state;
}

function operatingFixture() {
  let state = newGame({ seed: 920, difficulty: 'casual', origin: 'buyer' });
  for (let week = 0; week < 8; week++) {
    const offers = state.inquiries.flatMap(inquiry => ['stock', 'factory'].map(source => ({ inquiry, source, value: quote(state, inquiry, { source, ratio: 90 }) })))
      .filter(item => !item.value.error && item.value.profit > 0 && item.value.probability > 0)
      .sort((a, b) => b.value.profit * b.value.probability - a.value.profit * a.value.probability);
    for (const item of offers) {
      if (state.bids.length >= 3 || state.bids.some(bid => bid.inquiryId === item.inquiry.id)) continue;
      const result = act(state, { type: 'bid', inquiryId: item.inquiry.id, source: item.source, ratio: 90 });
      if (!result.error && forecast(result.state).every(row => row.hypothetical > 8000)) state = result.state;
    }
    state = finishWeek(state);
  }
  assert.ok(!state.bankrupt && state.orders.length >= 5, 'actual operations produce a mature fixture');
  return act(state, { type: 'tutorial', step: 5, done: true }).state;
}

function eventFixture(seed) {
  let state = newGame({ seed, difficulty: 'casual' });
  const award = act(state, { type: 'bid', inquiryId: state.inquiries[0].id, source: 'stock', ratio: 80 });
  assert.equal(award.error, undefined);
  state = act(award.state, { type: 'end-week' }).state;
  assert.ok(state.orders.length, 'real awarded contract for the quality decision');
  const quality = TRADE_EVENTS.find(event => event.id === 'quality');
  state = act(state, { type: 'dismiss-summary' }).state;
  state.events = [{ ...quality, id: `quality-${seed}`, code: quality.id, type: 'trade-event', orderId: state.orders[0].id }];
  return act(state, { type: 'tutorial', step: 5, done: true }).state;
}

// Deliberately avoid the normal helper's coachReady wait. The fixture setup
// only renders the real state; every subsequent UI action is a trusted touch.
async function loadPending(page, state) {
  await page.evaluate(`(async()=>{const app=await import('/v38/ui/app.js');app.__scenarioForTest(${JSON.stringify(state)});})()`);
}

async function deferWorkerReplies(page) {
  // Keep real Worker computation and its result, but defer delivery in the
  // test browser. This deterministically exercises navigation during pending
  // work and responses belonging to screens the player has already left.
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => {
    const NativeWorker=window.Worker;
    window.Worker=class DeferredReplyWorker extends NativeWorker {
      addEventListener(type,listener,options) {
        if(type!=='message')return super.addEventListener(type,listener,options);
        return super.addEventListener(type,event=>setTimeout(()=>{
          if(typeof listener==='function')listener.call(this,event);else listener.handleEvent(event);
        },900),options);
      }
    };
  })()` });
}

async function point(page, selector, { scroll = false } = {}) {
  return page.evaluate(`(() => {
    const el=document.querySelector(${JSON.stringify(selector)});
    if (!el) return null;
    if (${scroll}) el.scrollIntoView({ block:'center', behavior:'instant' });
    const r=el.getBoundingClientRect(), x=r.x+r.width/2, y=r.y+r.height/2, hit=document.elementFromPoint(x,y);
    return { x,y, hit:el.contains(hit), disabled:Boolean(el.disabled), width:r.width,height:r.height,top:r.top,bottom:r.bottom,label:el.innerText };
  })()`);
}

async function touch(page, selector, opts = {}) {
  const target = await point(page, selector, opts);
  assert.ok(target && target.hit && !target.disabled, `actual touch cannot reach ${selector}: ${JSON.stringify(target)}`);
  await page.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{ x:target.x, y:target.y, id:0 }] });
  await page.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] });
  return target;
}

async function swipeEvent(page, width, height) {
  const x = width / 2, start = height * .8, end = height * .3;
  await page.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{ x,y:start,id:0 }] });
  for (let i = 1; i <= 8; i++) {
    await page.send('Input.dispatchTouchEvent', { type:'touchMove', touchPoints:[{ x,y:start+(end-start)*i/8,id:0 }] });
    await pause(15);
  }
  await page.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] });
  await pause(250);
}

const allNavHit = `Array.from(document.querySelectorAll('.nav [data-ui=page]')).every(button=>{
  const r=button.getBoundingClientRect();
  return button.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));
})`;

const cardSignature = card => card && ({
  title: card.querySelector('h3')?.textContent,
  body: card.querySelector('.coach-copy p')?.textContent,
  actions: [...card.querySelectorAll('.coach-actions button')].map(b => [b.textContent, b.dataset.ui, b.dataset.page, b.dataset.id, b.dataset.coachTab, b.dataset.coachAction]),
});

async function assertCurrentCard(page) {
  const record = await page.evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(SAVE_KEY)}))`);
  assert.ok(record?.view, 'ordinary navigation persisted the current view');
  const state = await currentState(page);
  const expected = pageCoach(state, record.view);
  const signatures = await page.evaluate(`(() => {
    const signature=${cardSignature.toString()};
    return {
      actual:signature(document.querySelector(${JSON.stringify(pageCard)})),
      expected:signature(new DOMParser().parseFromString(${JSON.stringify(expected)},'text/html').querySelector('.coach-card')),
    };
  })()`);
  assert.deepEqual(signatures.actual, signatures.expected, 'late advice must correspond to the current saved page and view');
}

async function recordVisibleCards(page) {
  await page.evaluate(`(() => {
    const signature=${cardSignature.toString()};
    window.__settledCards=[];
    const observer=new MutationObserver(()=>{
      const card=document.querySelector(${JSON.stringify(pageCard)});
      const view=JSON.parse(localStorage.getItem(${JSON.stringify(SAVE_KEY)})||'null')?.view;
      const route=document.querySelector('.nav [aria-current=page]')?.dataset.page;
      if(!view||!route||!card||card.matches('[data-coach-pending],[data-coach-error]'))return;
      window.__settledCards.push({route,view,signature:signature(card)});
    });
    observer.observe(document.querySelector('#v38-root'),{subtree:true,childList:true,attributes:true});
    window.__stopSettledCards=()=>observer.disconnect();
  })()`);
}

async function assertNoStaleCards(page, state) {
  const cards=await page.evaluate('window.__stopSettledCards();window.__settledCards');
  assert.ok(cards.length, 'at least one completed card was observed');
  const checked=new Set();
  for(const card of cards){
    const key=JSON.stringify(card);
    if(checked.has(key))continue;
    checked.add(key);
    assert.equal(card.route,card.view.page,'recorded view corresponds to selected tab');
    const expected=pageCoach(state,card.view);
    const signature=await page.evaluate(`(()=>{const signature=${cardSignature.toString()};return signature(new DOMParser().parseFromString(${JSON.stringify(expected)},'text/html').querySelector('.coach-card'));})()`);
    assert.deepEqual(card.signature,signature,`settled advice must belong to ${card.route}`);
  }
}

for (const { width, height } of [{ width:320, height:568 }, { width:390, height:844 }]) {
  test(`physical mobile navigation and event choice remain responsive while assistant work is pending at ${width}px`, options, async () => {
    const browser = await launchBrowser(root, { scenarios:true });
    const page = await browser.page({ width, height, mobile:true });
    try {
      await page.send('Emulation.setTouchEmulationEnabled', { enabled:true, maxTouchPoints:1 });
      await deferWorkerReplies(page);
      await page.goto();
      await page.waitFor(exists('[data-form=new-game]'));
      const grown = JSON.parse(JSON.stringify(operatingFixture()));
      await page.send('Emulation.setCPUThrottlingRate', { rate:6 });
      await loadPending(page, grown);
      assert.ok(await page.evaluate(exists(pending)), 'assistant work is visibly pending before navigation');
      await recordVisibleCards(page);
      await page.screenshot(`/tmp/v38-async-${width}-pending.png`);
      let whilePending = 0;
      const timings = [];
      for (const id of ['inquiries','orders','company','offwork','office','inquiries']) {
        if (await page.evaluate(exists(pending))) whilePending++;
        const started = performance.now();
        await touch(page, navSelector(id));
        await page.waitFor(route(id), 5_000);
        timings.push(Math.round(performance.now() - started));
      }
      assert.ok(whilePending >= 2, 'genuine pending work overlapped rapid navigation');
      assert.ok(await page.evaluate(allNavHit), 'the native tabs are not inert');
      assert.deepEqual(await currentState(page), grown, 'only navigation occurred');

      // An open quote may be closed immediately, even if its assistant card
      // has not finished. A late response must not reopen the modal.
      await touch(page, 'article[data-inquiry-id] [data-ui=quote-open]', { scroll:true });
      await page.waitFor(exists('dialog[open] [data-form=quote]'));
      assert.ok(await page.evaluate(exists('dialog [name=ratio], dialog [name=brandUnitPrice]')));
      await touch(page, 'dialog [data-ui=close-dialog]');
      await page.waitFor('!document.querySelector("dialog").open');
      await touch(page, navSelector('company'));
      await page.waitFor(route('company'));
      await page.coachReady();
      assert.ok(await page.evaluate(route('company') + ' && !document.querySelector("dialog").open'));
      await assertCurrentCard(page);
      await assertNoStaleCards(page,grown);
      await page.screenshot(`/tmp/v38-async-${width}-settled-company.png`);

      // The event's actual buttons and the new visible jump must be reachable
      // without waiting for the async recommendation, even on a short screen.
      await loadPending(page, eventFixture(381));
      await touch(page, '.app-notices [data-ui=show-event]', { scroll:true });
      await page.waitFor(exists('dialog[open] #event-choice-list'));
      const open = await page.evaluate(`(() => {
        const d=document.querySelector('dialog');
        return {pending:!!d.querySelector(${JSON.stringify(pending)}),modal:d.matches(':modal'),before:d.scrollTop,choices:d.querySelectorAll('[data-action=resolve-event]:not(:disabled)').length};
      })()`);
      assert.ok(open.pending && open.modal && open.choices > 0, 'manual event choices already exist during assistant computation');
      const jump = await point(page, 'dialog [data-ui=event-show-options]');
      assert.ok(jump?.hit && jump.height >= 44 && jump.bottom <= height, 'visible event choice jump at first render');
      await page.screenshot(`/tmp/v38-async-${width}-event-cue.png`);
      await touch(page, 'dialog [data-ui=event-show-options]');
      const target = await point(page, '#event-choice-list [data-action=resolve-event]:not(:disabled)');
      assert.ok(target?.hit, 'jump exposes a real event decision without resolving it');
      assert.equal((await currentState(page)).events.length, 1);
      await page.screenshot(`/tmp/v38-async-${width}-event-jumped.png`);
      await touch(page, '#event-choice-list [data-action=resolve-event]:not(:disabled)');
      await page.waitFor('!document.querySelector("dialog").open');
      assert.equal((await currentState(page)).events.length, 0);
      await touch(page, navSelector('orders'));
      await page.waitFor(route('orders'));
      await page.coachReady();
      assert.ok(await page.evaluate(allNavHit), 'after valid manual choice all five navigation controls are physical targets');
      await assertCurrentCard(page);
      await page.screenshot(`/tmp/v38-async-${width}-event-cleared.png`);

      // A player can also use a real swipe rather than the jump button.
      await loadPending(page, eventFixture(381));
      await touch(page, '.app-notices [data-ui=show-event]', { scroll:true });
      await page.waitFor(exists('dialog[open] #event-choice-list'));
      await page.coachReady();
      await swipeEvent(page, width, height);
      await page.waitFor('document.querySelector("dialog").scrollTop > 0');
      await page.screenshot(`/tmp/v38-async-${width}-event-swiped.png`);
      const reachable = await page.evaluate(`Array.from(document.querySelectorAll('dialog [data-action=resolve-event]:not(:disabled)')).some(b=>{const r=b.getBoundingClientRect();return b.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})`);
      assert.ok(reachable, 'swiping reaches at least one actual event choice');
      assert.deepEqual(page.errors, []);
      console.log(JSON.stringify({ width, whilePending, navigationMs:timings }));
    } finally {
      await browser.close();
    }
  });
}
