import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const pkg=JSON.parse(await read('package.json'));
test('default artifact is modern while legacy fixture builds remain explicit',()=>{
 const s=pkg.scripts;
 assert.equal(s.build,'npm run build:modern');
 assert.equal(s['build:modern'],'node scripts/build-deal-standalone.mjs');
 assert.equal(s['build:legacy'],'node scripts/build-standalone.mjs && node scripts/build-data.mjs');
 assert.equal(s.pretest,'npm run build && npm run build:legacy');
 assert.equal(s.test,'node --test tests/*.test.mjs');
 assert.equal(s['build:data'],'npm run build:legacy:data');
 assert.equal(s['build:classic'],'npm run build:legacy:classic');
 assert.match(s.check,/^npm run check:modern && /);assert.match(s.check,/&& npm test$/);
});
test('entry documentation points to modern candidate without silently replacing legacy root',async()=>{
 for(const file of ['README.md','PUBLIC_GUIDE.md']){
  const text=await read(file);assert.match(text,/4173\/deal-room\.html/);assert.match(text,/artifacts\/deal-room\//);
  assert.match(text,/开发候选/);assert.match(text,/legacy/);assert.match(text,/index\.html/);
 }
 assert.match(await read('deal-room.html'),/deal-room-app\.js/);
 assert.match(await read('index.html'),/trade-app\.js/);
 assert.match(await read('README.md'),/<summary>原始策划原文（历史资料，不是当前玩法）<\/summary>/);
});
