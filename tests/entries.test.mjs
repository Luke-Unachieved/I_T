import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const root = new URL('../', import.meta.url);
const read = file => readFile(new URL(file, root), 'utf8');
const sha = value => createHash('sha256').update(value).digest('hex');

test('default entry opens V38 while V37 and legacy remain byte-identical to the verified release', async () => {
  const [entry, classic, oldDeal, legacy] = await Promise.all(['index.html', 'classic.html', 'deal-room.html', 'legacy-game.html'].map(read));
  assert.match(entry, /v38\/ui\/app\.js/);
  assert.match(entry, /v38\/v38\.css/);
  assert.equal(sha(classic), '352eb2088978c6e96cf0ed01c159f54606a5f7dd645790289367511116b9cc73');
  assert.equal(classic, oldDeal);
  assert.equal(sha(legacy), 'c3965a148e4da0ecd4e697816446d75a5c9a6ae200f749283499a9ae18ffe5c6');
});
