import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../src/deal-room-app.js',import.meta.url),'utf8');
const body=source.slice(source.indexOf('function renderKeepingChoiceFocus('));
function run(values,index,nextValues=values){
 let focused=null, renderCount=0;
 const makeNodes=vs=>vs.map(v=>{const node={getAttribute:()=>v,focus:o=>{focused={v,o,index:items.indexOf(node)};}};return node;});
 let items=makeNodes(values);const old=items[index];
 const context={root:{querySelectorAll:()=>items},render:()=>{renderCount++;items=makeNodes(nextValues);}};
 vm.createContext(context);vm.runInContext(body,context);context.renderKeepingChoiceFocus(old,'data-select');
 return {focused,renderCount};
}
test('actual focus helper keeps selected rebuilt choice rather than body',()=>{const x=run(['trial','rollout'],1);assert.equal(x.focused.v,'rollout');assert.equal(x.focused.index,1);assert.equal(x.focused.o.preventScroll,true);assert.equal(x.renderCount,1);});
test('duplicate choices preserve originating terms control',()=>{assert.equal(run(['small','season','season','all-now'],2).focused.index,2);});
test('removed duplicate falls back to same semantic choice, missing choice is safe',()=>{assert.equal(run(['season','season'],1,['season']).focused.index,0);assert.equal(run(['season'],0,[]).focused,null);});
test('sample, offer and revision handlers use focus-preserving render without saving',()=>{for(const attr of ['data-sample','data-select','data-revision-scope','data-growth-product','data-growth-pack','data-curation-product','data-curation-quantity','data-curation-pack']){const line=source.split('\n').find(l=>l.includes(`querySelectorAll('[${attr}]').forEach`));assert.ok(line.includes(`renderKeepingChoiceFocus(b,'${attr}')`));assert.ok(!line.includes('save('));}});
test('only the eight intended handlers call the helper',()=>{
 const calls=source.split('\n').filter(line=>line.includes('renderKeepingChoiceFocus(')&&!line.startsWith('function '));
 assert.equal(calls.length,8);
 for(const line of calls){
  const match=line.match(/querySelectorAll\('\[(data-sample|data-select|data-revision-scope|data-growth-product|data-growth-pack|data-curation-product|data-curation-quantity|data-curation-pack)\]'\)/);
  assert.ok(match,'unexpected selector or unbound b');
  assert.ok(line.includes(`renderKeepingChoiceFocus(b,'${match[1]}')`));
 }
});

test('repair choices focus the resulting sample without saving or changing engine',()=>{
 const line=source.split('\n').find(l=>l.includes("querySelectorAll('[data-repair]').forEach"));
 assert.ok(!line.includes('save('));assert.ok(!line.includes('reduceDealRoom('));
 for(const repair of ['plain','restock']){
  let handler,focused=null,renders=0;
  const button={dataset:{repair}};
  const context={selected:'promise',event:'',sampleSelection:(s,mode)=>s==='plain'?'ready':mode==='restock'?'branded':'promise',render:()=>renders++,root:{querySelectorAll:()=>[button],querySelector:selector=>({focus:opts=>{focused={selector,opts};}})}};
  vm.createContext(context);vm.runInContext(line,context);button.onclick();
  assert.equal(context.selected,repair==='plain'?'ready':'branded');
  assert.equal(focused.selector,`[data-sample="${repair==='plain'?'plain':'custom'}"]`);
  assert.equal(focused.opts.preventScroll,true);assert.equal(renders,1);
 }
});
