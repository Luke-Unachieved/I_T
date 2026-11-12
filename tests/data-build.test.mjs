import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
test('data mode and original mode have independent entry points and save keys',async()=>{
 const app=await readFile(new URL('../src/trade-app.js',import.meta.url),'utf8');
 const old=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
 assert.match(app,/const KEY='trade-tycoon:data:v2'/);assert.match(old,/const KEY='trade-tycoon:v1'/);
 assert.match(app,/before-import/);assert.match(app,/if\(damagedSave\)return/);assert.match(app,/parseTradeSave\(await file.text\(\)\)/);
 assert.match(await readFile(new URL('../classic.html',import.meta.url),'utf8'),/src\/app.js/);
 assert.match(await readFile(new URL('../trade.html',import.meta.url),'utf8'),/src\/trade-app.js/);
});
test('data build retains the original standalone bundle and removes module dependencies',async()=>{
 const script=await readFile(new URL('../scripts/build-data.mjs',import.meta.url),'utf8');
 assert.match(script,/standalone-v101/);assert.match(script,/classic.html/);
 const html=await readFile(new URL('../trade.html',import.meta.url),'utf8');
 assert.doesNotMatch(html,/https?:\/\//);
});
test('final built HTML preserves dollar literals and contains executable script only',async()=>{
 const {execFileSync}=await import('node:child_process');
 execFileSync(process.execPath,['scripts/build-data.mjs'],{cwd:new URL('..',import.meta.url),stdio:'pipe'});
 const html=await readFile(new URL('../artifacts/data-v2/index.html',import.meta.url),'utf8');
 const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
 assert.equal(scripts.length,1);assert.doesNotThrow(()=>new Function(scripts[0][1]));
 assert.ok(scripts[0][1].includes("const usd=cents=>'US$'+"));
 const outside=html.replace(/<script>[\s\S]*?<\/script>/g,'');
 assert.doesNotMatch(outside,/\$\{state\.|const usd=|function quoteOrder/);
});
