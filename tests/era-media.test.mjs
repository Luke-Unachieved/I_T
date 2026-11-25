import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/chromium.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const options = { skip: process.env.V38_BROWSER !== '1', timeout: 30_000 };
const form = '[data-form="new-game"]';
const frame = '[data-era-art] .media-frame';
const image = `${frame} img`;
const present = selector => `Boolean(document.querySelector(${JSON.stringify(selector)}))`;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const select = (page, name, value) => page.evaluate(`(()=>{const input=document.querySelector('${form} [name=${name}]');input.value=${JSON.stringify(value)};input.dispatchEvent(new Event('change',{bubbles:true}));})()`);

async function waitUntil(predicate, timeout = 5000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { if (predicate()) return; await pause(15); }
  throw Error('Timed out waiting for an actual image request');
}

async function intercept(page, decide) {
  const requests = [], held = [];
  const errors = [];
  page.on('Fetch.requestPaused', event => {
    requests.push(event.request.url);
    const instruction = decide(event, requests.length);
    if (instruction === 'hold') { held.push(event); return; }
    const command = instruction === 'fail' ? ['Fetch.failRequest', { requestId: event.requestId, errorReason: 'Failed' }] : ['Fetch.continueRequest', { requestId: event.requestId }];
    page.send(...command).catch(error => errors.push(error.message));
  });
  await page.send('Network.enable');
  await page.send('Network.setCacheDisabled', { cacheDisabled: true });
  await page.send('Fetch.enable', { patterns: [{ urlPattern: '*v38-era-*.webp*', requestStage: 'Request' }] });
  return { requests, held, errors };
}

function settings(page) {
  return page.evaluate(`(()=>{const f=document.querySelector(${JSON.stringify(form)});return Object.fromEntries(new FormData(f));})()`);
}

async function fillSettings(page) {
  await page.fill(`${form} [name=name]`, '时代插画重试验收');
  await select(page, 'origin', 'factory-heir');
  await select(page, 'difficulty', 'hard');
  // Pick another assistant through the actual visible choice.
  await page.click(`${form} .assistant-choice:nth-of-type(2)`);
  return settings(page);
}

async function measure(page) {
  return page.evaluate(`(()=>{const f=document.querySelector(${JSON.stringify(frame)}),i=f.querySelector('img'),r=f.getBoundingClientRect();return {state:f.dataset.mediaState,src:i.getAttribute('src'),loading:i.loading,priority:i.fetchPriority,native:[i.naturalWidth,i.naturalHeight],size:[r.width,r.height],fallback:!f.querySelector('.media-fallback').hidden};})()`);
}

async function loaded(page, year) {
  await page.waitFor(`(()=>{const frame=document.querySelector(${JSON.stringify(frame)}),img=frame?.querySelector('img');return frame?.dataset.mediaState==='loaded'&&img?.naturalWidth===722&&img?.naturalHeight===360&&img?.dataset.mediaSrc==='assets/v38-era-${year}.webp';})()`);
  await page.evaluate(`document.querySelector(${JSON.stringify(image)}).decode()`);
}

test('opening era art is eager and recovers from the first failed request without changing selection or form', options, async () => {
  const browser = await launchBrowser(root);
  try {
    const page = await browser.page({ width: 320, height: 568, mobile: true });
    const net = await intercept(page, (_event, n) => n === 1 ? 'fail' : 'hold');
    // Start navigation without waiting for load: the test deliberately holds
    // the eager retry and verifies the setting panel still works.
    await page.send('Page.navigate', { url: browser.base });
    await page.waitFor(present(form));
    await waitUntil(() => net.held.length === 1);
    assert.equal(net.requests.length, 2);
    assert.match(net.requests[0], /v38-era-2026\.webp$/);
    assert.match(net.requests[1], /v38-era-2026\.webp\?retry=/);
    const waiting = await measure(page);
    assert.equal(waiting.state, 'loading');
    assert.equal(waiting.loading, 'eager');
    assert.equal(waiting.priority, 'high');
    assert.equal(waiting.fallback, false, 'Do not flash an error while an automatic retry is pending');
    const before = await fillSettings(page);
    assert.equal(before.name, '时代插画重试验收');
    assert.equal(before.era, '2026');
    assert.equal(before.origin, 'factory-heir');
    assert.equal(before.difficulty, 'hard');
    await page.send('Fetch.continueRequest', { requestId: net.held[0].requestId });
    await loaded(page, '2026');
    const after = await measure(page);
    assert.deepEqual(after.size, waiting.size, 'Image replacement must not jump the settings form');
    assert.deepEqual(await settings(page), before);
    assert.equal(after.fallback, false);
    assert.deepEqual(net.errors, []);
  } finally { await browser.close(); }
});

test('persistent failure stops after two automatic retries, then manual retry recovers with every opening setting preserved', options, async () => {
  const browser = await launchBrowser(root);
  try {
    const page = await browser.page({ width: 390, height: 844, mobile: true });
    let allow = false;
    const net = await intercept(page, () => allow ? 'continue' : 'fail');
    await page.goto();
    await page.waitFor(present(form));
    const before = await fillSettings(page);
    await page.waitFor(`document.querySelector(${JSON.stringify(frame)}).dataset.mediaState==='error'`);
    assert.equal(net.requests.length, 3, 'Initial request + exactly two automatic retries');
    assert.ok(net.requests.slice(1).every(url => /\?retry=/.test(url)));
    assert.notEqual(net.requests[1], net.requests[2]);
    assert.match(await page.evaluate(`document.querySelector(${JSON.stringify(frame)}).innerText`), /插画未能加载，请重试.*重试图片/s);
    assert.deepEqual(await settings(page), before);
    assert.equal(await page.evaluate(`document.querySelector('${form} button[type=submit]').disabled`), false);
    await pause(1050);
    assert.equal(net.requests.length, 3, 'Persistent failure must not trigger an infinite reload');
    await page.evaluate(`document.querySelector(${JSON.stringify(frame)}).scrollIntoView({block:'center',behavior:'instant'})`);
    await page.screenshot('/tmp/v38-era-media-persistent-390.png');
    allow = true;
    await page.click(`${frame} [data-media-retry]`);
    await loaded(page, '2026');
    assert.equal(net.requests.length, 4);
    assert.match(net.requests[3], /\?retry=/);
    assert.deepEqual(await settings(page), before);
    await page.screenshot('/tmp/v38-era-media-recovered-390.png');
    await page.click(`${form} button[type=submit]`);
    await page.waitFor(present('#page-title'));
    assert.match(await page.evaluate('document.querySelector(".current-time").innerText'), /2026/);
    assert.deepEqual(net.errors, []);
  } finally { await browser.close(); }
});

test('rapid era changes discard automatic retry timers for detached previews and retain the latest selection', options, async () => {
  const browser = await launchBrowser(root);
  try {
    const page = await browser.page({ width: 1440, height: 1000 });
    const net = await intercept(page, event => /v38-era-(2026|2001)\.webp/.test(event.request.url) ? 'hold' : 'continue');
    await page.send('Page.navigate', { url: browser.base });
    await page.waitFor(present(form));
    // Schedule the next selection at the target image's error event. The
    // production capture listener has already scheduled its retry at this
    // point, so this tests the actual detached-frame race without a flaky
    // sub-250ms wall-clock assertion when CI is running several browsers.
    const changeOnError = year => page.evaluate(`document.querySelector(${JSON.stringify(image)}).addEventListener('error',()=>{const select=document.querySelector('[name=era]');select.value=${JSON.stringify(year)};select.dispatchEvent(new Event('change',{bubbles:true}));},{once:true})`);
    await waitUntil(() => net.held.length === 1);
    await changeOnError('2001');
    await page.send('Fetch.failRequest', { requestId: net.held[0].requestId, errorReason: 'Failed' });
    await waitUntil(() => net.held.length === 2);
    await changeOnError('2021');
    await page.send('Fetch.failRequest', { requestId: net.held[1].requestId, errorReason: 'Failed' });
    await loaded(page, '2021');
    await pause(1400);
    assert.equal(net.requests.filter(url => /v38-era-2026\.webp/.test(url)).length, 1);
    assert.equal(net.requests.filter(url => /v38-era-2001\.webp/.test(url)).length, 1);
    assert.equal(net.requests.filter(url => /v38-era-2021\.webp/.test(url)).length, 1);
    assert.equal((await settings(page)).era, '2021');
    const latest = await measure(page);
    assert.equal(latest.src, 'assets/v38-era-2021.webp');
    assert.equal(latest.state, 'loaded');
    assert.equal(latest.fallback, false);
    assert.equal(await page.evaluate(`document.querySelectorAll(${JSON.stringify(frame)}).length`), 1);
    assert.deepEqual(net.errors, []);
    await page.evaluate(`document.querySelector(${JSON.stringify(frame)}).scrollIntoView({block:'center'})`);
    await page.screenshot('/tmp/v38-era-media-rapid-final-1440.png');
  } finally { await browser.close(); }
});
