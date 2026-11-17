import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {createDealRoom,reduceDealRoom,normalizeDealRoom} from '../src/deal-room-engine.js';
import {studioProjectView} from '../src/deal-room-studio-project-view.js';
import {previewStudioProjectOrder} from '../src/deal-room-studio-project.js';
import {previewStudioAllocation} from '../src/deal-room-allocation.js';
const actions=JSON.parse(fs.readFileSync(new URL('./fixtures/deal-group-day169-actions.json',import.meta.url)));
function snapshots(){let s=createDealRoom();return actions.map(a=>{s=reduceDealRoom(s,a);return s;});}
const groupHistory=s=>(s.caseGrowthHistory||[]).filter(h=>h.status==='paid'&&h.purpose==='studio-project'&&h.studioDirection==='group');
test('mature actual group uses expose no automatic repeat-purchase or consumption wait buttons',()=>{
 const s=snapshots().at(-1);for(const briefId of ['bedside','welcome']){
  const visit=briefId===s.studioProject.briefId?s:reduceDealRoom(s,{type:'RESTORE_GROUP_SPEC',briefId});assert.equal(visit.studioProject.briefId,briefId);const html=studioProjectView(visit);
  assert.doesNotMatch(html,/data-action="(?:SIGN_STUDIO_PROJECT_ORDER|WAIT_STUDIO_PROJECT|SIGN_STUDIO_ALLOCATION|WAIT_STUDIO_ALLOCATION)"/);
  assert.match(html,/data-action="OPEN_STOCK_PROCUREMENT"/);assert.match(html,/已交付/);
 }
});
test('natural first group use and first other use retain actual signable purchase; explicit one-time allocation is not deleted',()=>{
 const states=snapshots(),candidate=s=>s.phase==='studio-project'&&s.studioProject?.direction==='group'&&s.studioProject.status==='approved'&&previewStudioProjectOrder(s,s.studioProject).valid;
 const first=states.find(s=>candidate(s)&&groupHistory(s).length===0);assert.ok(first);assert.match(studioProjectView(first),/data-action="SIGN_STUDIO_PROJECT_ORDER"/);
 const other=states.find(s=>candidate(s)&&s.studioProject.briefId==='welcome'&&groupHistory(s).some(h=>h.studioBrief==='bedside')&&!groupHistory(s).some(h=>h.studioBrief==='welcome'||h.allocationVersion===1&&h.allocation.welcome>0));assert.ok(other);assert.match(studioProjectView(other),/data-action="SIGN_STUDIO_PROJECT_ORDER"/);
 const allocation=states.find(s=>s.phase==='studio-project'&&previewStudioAllocation(s,'mixed').available&&!groupHistory(s).some(h=>h.allocationVersion===1));assert.ok(allocation);assert.match(studioProjectView(allocation,'mixed'),/data-action="SIGN_STUDIO_ALLOCATION"/);assert.match(studioProjectView(allocation,'mixed'),/40 床头 \+ 20 茶台/);
});
test('studio-to-new-inquiry navigation uses two canonical actions preserving approved plans and money',()=>{
 const original=snapshots().at(-1),cash=original.cash,day=original.day,p=structuredClone(original.studioProject);let s=reduceDealRoom(original,{type:'KEEP_STUDIO_PROJECT'});assert.equal(s.phase,'review');assert.deepEqual(s.studioProject,p);assert.deepEqual(s.studioProjectPlans,original.studioProjectPlans);assert.deepEqual(s.groupProjectSpecs,original.groupProjectSpecs);
 const plans=structuredClone(s.studioProjectPlans);s=reduceDealRoom(s,{type:'OPEN_STOCK_PROCUREMENT'});assert.equal(s.phase,'stock-procurement');assert.equal(s.stockProcurement.status,'draft');assert.equal(s.cash,cash);assert.equal(s.day,day);assert.deepEqual(s.studioProjectPlans,plans);assert.deepEqual(s.history.slice(-2),[{type:'KEEP_STUDIO_PROJECT'},{type:'OPEN_STOCK_PROCUREMENT'}]);assert.deepEqual(normalizeDealRoom(s),s);
 const app=fs.readFileSync(new URL('../src/deal-room-app.js',import.meta.url),'utf8');assert.match(app,/type==='OPEN_STOCK_PROCUREMENT'&&state.phase==='studio-project'\)state=reduceDealRoom\(state,\{type:'KEEP_STUDIO_PROJECT'\}\)/);
});
