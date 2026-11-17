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
test('both sample and offer handlers use focus-preserving render without saving',()=>{for(const attr of ['data-sample','data-select']){const line=source.split('\n').find(l=>l.includes(`querySelectorAll('[${attr}]').forEach`));assert.ok(line.includes(`renderKeepingChoiceFocus(b,'${attr}')`));assert.ok(!line.includes('save('));}});
test('only the two intended handlers call the helper',()=>{
 const calls=source.split('\n').filter(line=>line.includes('renderKeepingChoiceFocus(')&&!line.startsWith('function '));
 assert.equal(calls.length,2);
 for(const line of calls){
  const match=line.match(/querySelectorAll\('\[(data-sample|data-select)\]'\)/);
  assert.ok(match,'unexpected selector or unbound b');
  assert.ok(line.includes(`renderKeepingChoiceFocus(b,'${match[1]}')`));
 }
});
