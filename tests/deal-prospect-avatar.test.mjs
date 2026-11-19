import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { prospectAvatar } from '../src/deal-room-prospect-avatar.js';
const root = new URL('../assets/', import.meta.url);

test('prospect avatar cells follow stable row-major ordering and CSS anchors', () => {
  const seen = new Set();
  for (let n = 1; n <= 100; n++) {
    const id = String(n).padStart(3, '0'), rendered = prospectAvatar(id);
    assert.equal(rendered, prospectAvatar(n));
    assert.equal(rendered, prospectAvatar('prospect-' + id));
    assert.ok(rendered.includes('aria-hidden="true"'));
    assert.ok(rendered.includes("url('assets/deal-prospects-v1.webp')"));
    assert.ok(rendered.includes('background-size:1000% 1000%'));
    const match = rendered.match(/background-position:([\d.]+)% ([\d.]+)%/);
    assert.ok(match, id);
    assert.ok(Math.abs(Number(match[1]) - ((n-1)%10) * 100/9)<1e-5);
    assert.ok(Math.abs(Number(match[2]) - Math.floor((n-1)/10) * 100/9)<1e-5);
    seen.add(match[0]);
  }
  assert.equal(seen.size, 100);
});

test('invalid identifiers, injected URLs, booleans and arbitrary objects never return a different portrait', () => {
  for (const id of [null,undefined,false,true,{},[],{id:'001'},0,101,1.5,'','1','000','101','0011','__proto__','"><script>','prospect-999','assets/else.webp']) {
    assert.equal(prospectAvatar(id), '');
  }
});

test('shipping contact sheet and archival master have verified intact dimensions and bytes', async () => {
  const [runtime, master] = await Promise.all(['deal-prospects-v1.webp','deal-prospects-v1.source.webp'].map(name => readFile(new URL(name,root))));
  for (const file of [runtime,master]) {
    assert.equal(file.toString('ascii',0,4),'RIFF');
    assert.equal(file.toString('ascii',8,12),'WEBP');
    assert.equal(file.readUInt32LE(4)+8,file.length);
  }
  assert.equal(runtime.toString('ascii',12,16),'VP8 ');
  assert.equal(runtime.readUInt16LE(26)&16383,1600);
  assert.equal(runtime.readUInt16LE(28)&16383,1600);
  assert.equal(master.toString('ascii',12,16),'VP8L');
  assert.equal(master[20],0x2f);
  const dimensions=master.readUInt32LE(21);
  assert.equal((dimensions&0x3fff)+1,2000);
  assert.equal(((dimensions>>>14)&0x3fff)+1,2000);
  const hash = b => createHash('sha256').update(b).digest('hex');
  assert.equal(hash(runtime),'9b815d64db577d88728e7ad2d968d5ea202330057c19713e95faccd9626b5fef');
  assert.equal(hash(master),'66dca683618fe16994167967dfd2d6061d40ec33c5f09f5b56a52bbc5bab0e36');
});
