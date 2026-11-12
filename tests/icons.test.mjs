import test from 'node:test';
import assert from 'node:assert/strict';
import {uiIcon,ICON_NAMES} from '../src/icons.js';
test('twelve original icons are embedded, decorative and safe from untrusted names',()=>{
 assert.equal(ICON_NAMES.length,12);for(const n of ICON_NAMES){const svg=uiIcon(n);assert.match(svg,/aria-hidden="true"/);assert.match(svg,/focusable="false"/);assert.match(svg,/viewBox="0 0 24 24"/);assert.doesNotMatch(svg,/https?:|<image|<script/);}
 assert.doesNotMatch(uiIcon('<img src=x onerror=alert(1)>'),/onerror|<img/);
});
