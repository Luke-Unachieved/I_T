import test from 'node:test';
import assert from 'node:assert/strict';
import {officeEarnedDisplay} from '../src/deal-room-office-view.js';
test('office display uses actual paid work, not signed contracts',()=>{
 const html=officeEarnedDisplay({contracts:[{clientId:'mira',status:'paid'},{clientId:'samir',status:'production'},{clientId:'ines',status:'paid'}]});
 assert.match(html,/data-office-earned="mira"/);assert.match(html,/data-office-earned="ines"/);assert.doesNotMatch(html,/data-office-earned="samir"/);
});
test('repeated orders do not pile up duplicate physical samples',()=>{
 const html=officeEarnedDisplay({contracts:[{clientId:'mira',status:'paid'},{clientId:'mira',status:'paid'}]});
 assert.equal((html.match(/data-office-earned="mira"/g)||[]).length,1);
});
test('no completed work leaves the display empty',()=>{assert.equal(officeEarnedDisplay({contracts:[]}), '');});
