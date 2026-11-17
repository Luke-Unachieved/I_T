import test from 'node:test';import assert from 'node:assert/strict';
import {revisionArt,revisionView} from '../src/deal-room-revision-view.js';
test('new structural artwork opens its own tray, displays only real contents and does not change source',()=>{const goods=['mira','samir'],before=[...goods];const closed=revisionArt(false,goods),open=revisionArt(true,goods);assert.match(closed,/tidal-waves/);assert.match(open,/tray-open/);assert.match(open,/内托已打开/);assert.doesNotMatch(open,/data-product="ines"/);assert.deepEqual(goods,before);});
test('a signed new-version order cannot pretend to leave production without fulfilment',()=>{const html=revisionView({collectionRevision:{status:'production',active:{buyer:'Northline',sets:80,paymentDay:169}}});assert.match(html,/FULFIL_COLLECTION_REVISION/);assert.doesNotMatch(html,/CLOSE_COLLECTION_REVISION/);});

test('product structure has shaped materials, contact shadows and empty uncommissioned compartments',()=>{
 const html=revisionArt(true,['mira','samir']);
 for(const part of ['lamp-shade','lamp-stem','cup-lid','cup-body'])assert.ok(html.includes(`data-part="${part}"`));
 assert.equal((html.match(/data-product=/g)||[]).length,2);
 assert.match(html,/recessed-liner/);assert.match(html,/divider-thickness/);assert.match(html,/revision-metal/);
 assert.doesNotMatch(html,/data-product="ines"|<image|<animate/);
 const empty=revisionArt(true,[]);assert.doesNotMatch(empty,/data-product=/);
 const fabric=revisionArt(true,['ines']);assert.match(fabric,/data-part="fabric-fold"/);assert.match(fabric,/url\(#revision-weave\)/);assert.doesNotMatch(fabric,/data-product="mira"|data-product="samir"/);
 assert.match(html,/class="revision-sleeve"/);assert.match(html,/data-revision-open aria-pressed="true"/);
});
test('the open sleeve recedes above the contents at desktop and narrow widths',async()=>{const {readFile}=await import('node:fs/promises');const css=await readFile(new URL('../src/deal-room.css',import.meta.url),'utf8');assert.match(css,/\.tray-open \.revision-sleeve\{transform:translate\(10px,-15px\) scale\(\.94,\.28\) rotate\(-3deg\);transform-origin:180px 52px/);assert.match(css,/\.reduce-motion \.revision-sleeve\{transition:none\}/);assert.doesNotMatch(css,/translate\(6px,-35px\)/);});
