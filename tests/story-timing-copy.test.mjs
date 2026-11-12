import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('instant second chapter outcome does not claim a multi-day time jump',()=>{const s=readFileSync(new URL('../src/story.js',import.meta.url),'utf8');assert.ok(s.includes('这份方案也引起了一家规模更小的客户的兴趣。'));assert.ok(!s.includes('几天后'));});
