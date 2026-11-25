// Browser-only broker. The expensive planners stay pure and are unchanged;
// this module cancels an obsolete game generation and coalesces queued edits.
// A failed worker never falls back to blocking the main thread.
const planKey = (kind, payload) => JSON.stringify([kind, payload]);
const timeoutMs = 120000;
const maxCompleted = 40;

export class CoachPlanning {
  constructor(workerFactory = () => new Worker(new URL('./coach-worker.js', import.meta.url), { type: 'module' })) {
    this.workerFactory = workerFactory;
    this.revision = 0;
    this.sequence = 0;
    this.completed = new Map();
    this.queue = new Map();
  }

  select(state) {
    if (this.state === state) return;
    this.stop();
    this.state = state;
    this.revision += 1;
    this.completed.clear();
    this.queue.clear();
  }

  stop() {
    clearTimeout(this.timer);
    clearTimeout(this.pumpTimer);
    this.worker?.terminate();
    this.worker = null;
    this.active = null;
    this.installed = false;
  }

  key(kind, payload) { return planKey(kind, payload); }

  remember(key, value) {
    this.completed.delete(key);
    this.completed.set(key, value);
    if (this.completed.size > maxCompleted) this.completed.delete(this.completed.keys().next().value);
  }

  seed(state, kind, payload, result) {
    this.select(state);
    this.remember(planKey(kind, payload), { status: 'ready', result });
  }

  lookup(state, kind, payload) {
    this.select(state);
    return this.completed.get(planKey(kind, payload)) ?? { status: 'pending' };
  }

  request(state, kind, payload, callback, { delay = 0, retry = false } = {}) {
    this.select(state);
    const key = planKey(kind, payload);
    if (retry) this.completed.delete(key);
    const known = this.completed.get(key);
    if (known) return known;
    if (this.active?.key === key) {
      this.active.callback = callback;
      this.queue.delete(kind);
      return { status: 'pending' };
    }
    this.queue.set(kind, { key, kind, payload, callback, notBefore: Date.now() + delay });
    this.pump();
    return { status: 'pending' };
  }

  // Do not waste time on a queued request for a dialog the player has closed.
  discard(kind) { this.queue.delete(kind); }

  pump() {
    if (this.active || !this.queue.size || !this.state) return;
    const task = this.queue.get('event') ?? this.queue.get('quote') ?? this.queue.get('page');
    const delay = task.notBefore - Date.now();
    if (delay > 0) {
      clearTimeout(this.pumpTimer);
      this.pumpTimer = setTimeout(() => this.pump(), delay);
      return;
    }
    this.queue.delete(task.kind);
    const known = this.completed.get(task.key);
    if (known) { task.callback(known); queueMicrotask(() => this.pump()); return; }
    this.active = { ...task, id: ++this.sequence, revision: this.revision };
    try {
      if (!this.worker) {
        const worker = this.workerFactory();
        this.worker = worker;
        worker.addEventListener('message', event => { if (this.worker === worker) this.receive(event.data); });
        worker.addEventListener('error', event => { if (this.worker === worker) this.fail(event.message || 'worker error'); });
        worker.addEventListener('messageerror', () => { if (this.worker === worker) this.fail('worker message error'); });
      }
      const { id, revision, kind, payload } = this.active;
      this.worker.postMessage({ id, revision, kind, payload, ...(this.installed ? {} : { state: this.state }) });
      this.installed = true;
      this.timer = setTimeout(() => this.fail('planning timeout'), timeoutMs);
    } catch (error) { this.fail(String(error?.message ?? error)); }
  }

  receive({ id, revision, result, error }) {
    const task = this.active;
    if (!task || task.id !== id || revision !== this.revision) return;
    this.finish(task, error ? { status: 'error', error } : { status: 'ready', result });
  }

  finish(task, value) {
    clearTimeout(this.timer);
    this.active = null;
    this.remember(task.key, value);
    // A consumer may synchronously re-read its cached result, so remember it
    // first and clear active before callback. Always continue another request.
    try { task.callback(value); } finally { queueMicrotask(() => this.pump()); }
  }

  fail(error) {
    const outstanding = [this.active, ...this.queue.values()].filter(Boolean);
    this.stop();
    this.queue.clear();
    for (const task of outstanding) this.remember(task.key, { status: 'error', error });
    queueMicrotask(() => {
      for (const task of outstanding) task.callback({ status: 'error', error });
    });
  }
}
