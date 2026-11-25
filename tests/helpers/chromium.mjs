import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';

const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg' };

export async function launchBrowser(root, { scenarios = false } = {}) {
  const server = createServer(async (req, res) => {
    const relative = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/+/, '') || 'index.html';
    if (relative === 'favicon.ico') { res.writeHead(204).end(); return; }
    const filename = path.resolve(root, relative);
    if (!filename.startsWith(path.resolve(root) + path.sep)) { res.writeHead(403).end(); return; }
    try {
      let body = await readFile(filename);
      // This export exists only in this isolated test server's response. Production files
      // are never changed, and normal onboarding tests use the unmodified response.
      if (scenarios && relative === 'v38/ui/app.js') body = Buffer.concat([body, Buffer.from('\nexport function __scenarioForTest(value,firstViews){state=value;ui=freshUi();ui.coachFirstViews=coachFirstViewRecord(firstViews,value,{coachLearning:false});render();}\nexport function __stateForTest(){return structuredClone(state);}\n')]);
      res.writeHead(200, { 'content-type': mime[path.extname(filename)] || 'application/octet-stream' }).end(body);
    }
    catch { res.writeHead(404).end('Not found'); }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}/`;
  const profile = await mkdtemp(path.join(tmpdir(), 'trade-v38-browser-'));
  const executable = process.env.CHROMIUM || '/usr/bin/chromium';
  const args = [
    '--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu',
    '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
  ];
  const reap = process.platform === 'linux';
  const chrome = spawn(reap ? 'python3' : executable, reap ? [fileURLToPath(new URL('./chromium-launch.py', import.meta.url)), executable, ...args] : args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let output = '';
  let endpoint;
  try {
    endpoint = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Chromium did not expose DevTools within 15 seconds')), 15_000);
      chrome.once('error', error => { clearTimeout(timeout); reject(error); });
      chrome.once('exit', code => { clearTimeout(timeout); reject(new Error(`Chromium exited ${code}: ${output.slice(-1000)}`)); });
      chrome.stderr.on('data', chunk => {
        output += chunk;
        const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/);
        if (match) { clearTimeout(timeout); resolve(new URL(match[1]).origin.replace('ws:', 'http:')); }
      });
    });
  } catch (error) {
    if (chrome.pid && chrome.exitCode === null && chrome.signalCode === null) { const exited = once(chrome, 'exit'); chrome.kill(); await exited; }
    server.close(); await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); throw error;
  }
  const pages = [];
  return {
    base,
    async page({ width = 1440, height = 1000, mobile = false } = {}) {
      const info = await (await fetch(`${endpoint}/json/new?about:blank`, { method: 'PUT' })).json();
      const ws = new WebSocket(info.webSocketDebuggerUrl);
      await once(ws, 'open');
      let nextId = 0;
      const pending = new Map();
      const subscriptions = new Map();
      const errors = [];
      ws.addEventListener('message', event => {
        const message = JSON.parse(event.data);
        if (message.id) {
          const request = pending.get(message.id);
          if (!request) return;
          pending.delete(message.id); clearTimeout(request.timeout);
          if (message.error) request.reject(new Error(JSON.stringify(message.error))); else request.resolve(message.result);
        }
        if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
        if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') errors.push(message.params.entry.text);
        for (const listener of subscriptions.get(message.method) ?? []) listener(message.params);
      });
      const send = (method, params = {}) => new Promise((resolve, reject) => {
        const id = ++nextId;
        const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15_000);
        pending.set(id, { resolve, reject, timeout }); ws.send(JSON.stringify({ id, method, params }));
      });
      const evaluate = async expression => {
        const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
        if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
        return result.result.value;
      };
      const page = {
        errors, send, evaluate,
        on(method, listener) {
          const listeners = subscriptions.get(method) ?? new Set();
          subscriptions.set(method, listeners); listeners.add(listener);
          return () => listeners.delete(listener);
        },
        async waitFor(expression, timeout = 10_000) {
          const start = Date.now();
          while (Date.now() - start < timeout) {
            if (await evaluate(expression)) return;
            await new Promise(resolve => setTimeout(resolve, 35));
          }
          throw new Error(`Browser condition timed out: ${expression}`);
        },
        async goto(relative = '') {
          await send('Page.navigate', { url: new URL(relative, base).href });
          await page.waitFor('document.readyState === "complete"');
        },
        async coachReady(timeout = 60_000) {
          // Functional tests wait for the advice visible to the player, just as
          // they wait for a page to load. Raw CDP inputs remain available for
          // latency, concurrent-input and stale-response regressions.
          await page.waitFor(`(()=>{const modal=document.querySelector('dialog[open]');const root=modal||document.querySelector('#v38-root');return !root?.querySelector('[data-coach-pending]');})()`,timeout);
        },
        async click(selector, { waitForCoach = true } = {}) {
          const target = await evaluate(`(() => {const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing target '+${JSON.stringify(selector)});e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,disabled:e.disabled};})()`);
          if (target.disabled) throw new Error(`Target is disabled: ${selector}`);
          await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: target.x, y: target.y });
          await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: target.x, y: target.y, button: 'left', clickCount: 1 });
          await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: target.x, y: target.y, button: 'left', clickCount: 1 });
          if(waitForCoach)await page.coachReady();
        },
        async fill(selector, value) {
          await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);
          await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65, modifiers: 2 });
          await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65, modifiers: 2 });
          await send('Input.insertText', { text: value });
        },
        async screenshot(filename) {
          const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
          const { writeFile } = await import('node:fs/promises');
          await writeFile(filename, Buffer.from(data, 'base64'));
        },
      };
      await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
      pages.push(ws);
      return page;
    },
    async close() {
      for (const ws of pages) ws.close();
      if (chrome.exitCode === null && chrome.signalCode === null) { const exited = once(chrome, 'exit'); chrome.kill('SIGTERM'); await exited; }
      await new Promise(resolve => server.close(resolve));
      await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    },
  };
}
