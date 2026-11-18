import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {buildDealHtml} from '../scripts/build-deal-standalone.mjs';
test('modern offline build contains a parseable classic script on native checkout line endings',async()=>{
 const html=await buildDealHtml();
 const match=html.match(/<script>([\s\S]*)<\/script>/);
 assert.ok(match,'standalone script is present');
 assert.doesNotMatch(match[1],/^import\s/m,'all module imports are bundled away');
 assert.doesNotMatch(match[1],/^export\s/m,'all module exports are bundled away');
 assert.doesNotThrow(()=>new vm.Script(match[1]));
});
