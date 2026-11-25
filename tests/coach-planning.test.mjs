import test from 'node:test';
import assert from 'node:assert/strict';
import { CoachPlanning } from '../v38/ui/coach-planning.js';

class FakeWorker {
  listeners = new Map();
  messages = [];
  terminated = false;
  addEventListener(kind, listener) { this.listeners.set(kind, listener); }
  postMessage(message) { this.messages.push(structuredClone(message)); }
  terminate() { this.terminated = true; }
  respond(message, result) { this.listeners.get('message')?.({ data: { id: message.id, revision: message.revision, result } }); }
  error(message) { this.listeners.get('error')?.({ message }); }
}

function fixture() {
  const workers = [];
  const broker = new CoachPlanning(() => { const worker = new FakeWorker(); workers.push(worker); return worker; });
  return { workers, broker };
}

const tick = () => new Promise(resolve => setImmediate(resolve));

test('planning a newer business state cancels old computation and cannot accept old results', async () => {
  const { workers, broker } = fixture();
  const seen = [];
  const first = { week: 1, cash: 50000 };
  const second = { week: 2, cash: 45000 };
  const payload = { ui: { page: 'inquiries' } };
  try {
    assert.deepEqual(broker.request(first, 'page', payload, result => seen.push(['old', result])), { status: 'pending' });
    const old = workers[0].messages[0];
    assert.deepEqual(old.state, first);
    broker.request(second, 'page', payload, result => seen.push(['new', result]));
    assert.equal(workers[0].terminated, true);
    const current = workers[1].messages[0];
    assert.ok(current.revision > old.revision);
    assert.deepEqual(current.state, second);
    workers[0].respond(old, { html: 'old' });
    workers[1].respond({ ...current, revision: old.revision }, { html: 'wrong revision' });
    assert.deepEqual(seen, []);
    workers[1].respond(current, { html: 'new' });
    assert.deepEqual(seen, [['new', { status: 'ready', result: { html: 'new' } }]]);
    assert.equal(broker.lookup(second, 'page', payload).result.html, 'new');
    assert.equal(broker.request(second, 'page', payload, () => assert.fail('cached requests return immediately')).status, 'ready');
    assert.equal(workers[1].messages.length, 1);
  } finally { broker.stop(); }
});

test('rapid quote edits coalesce to the latest input and retain one snapshot, then discard closed-dialog jobs', async () => {
  const { workers, broker } = fixture();
  const state = { week: 32, cash: 30000 };
  const seen = [];
  const quote = ratio => ({ inquiryId: 'w32-2', model: { ratio } });
  try {
    broker.request(state, 'page', { ui: { page: 'inquiries' } }, result => seen.push(result));
    const worker = workers[0];
    broker.request(state, 'quote', quote(80), () => assert.fail('superseded draft'));
    broker.request(state, 'quote', quote(91), () => assert.fail('superseded draft'));
    broker.request(state, 'quote', quote(98), result => seen.push(result));
    assert.equal(worker.messages.length, 1);
    worker.respond(worker.messages[0], { html: 'page' });
    await tick();
    assert.equal(worker.messages.length, 2);
    assert.equal(worker.messages[1].payload.model.ratio, 98);
    assert.equal('state' in worker.messages[1], false, 'reuse the exact immutable snapshot rather than clone on every edit');
    broker.request(state, 'quote', quote(104), () => assert.fail('dialog closed'));
    broker.discard('quote');
    worker.respond(worker.messages[1], { html: 'draft 98' });
    await tick();
    assert.equal(worker.messages.length, 2);
    assert.deepEqual(seen.map(x => x.result.html), ['page', 'draft 98']);
    const adopted = { inquiryId: 'w32-2', model: { ratio: 92 } };
    const adoptedResult = { html: 'adopted', recommendation: { config: { ratio: 92 } } };
    broker.seed(state, 'quote', adopted, adoptedResult);
    assert.deepEqual(broker.lookup(state, 'quote', adopted), { status: 'ready', result: adoptedResult });
  } finally { broker.stop(); }
});

test('worker errors reach current pending advice, and an explicit retry starts a new worker', async () => {
  const { workers, broker } = fixture();
  const state = { week: 2, cash: 50000 };
  const payload = { eventId: 'w2-1' };
  const seen = [];
  try {
    broker.request(state, 'event', payload, result => seen.push(result));
    workers[0].error('unavailable');
    await tick();
    assert.equal(workers[0].terminated, true);
    assert.equal(broker.lookup(state, 'event', payload).status, 'error');
    assert.equal(seen[0].status, 'error');
    assert.equal(broker.request(state, 'event', payload, result => seen.push(result), { retry: true }).status, 'pending');
    const worker = workers[1];
    assert.deepEqual(worker.messages[0].state, state);
    worker.respond(worker.messages[0], { recommendation: null });
    assert.deepEqual(seen[1], { status: 'ready', result: { recommendation: null } });
  } finally { broker.stop(); }
});
