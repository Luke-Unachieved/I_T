import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {openOutings,outingsView,bindOutings} from '../src/deal-room-outings-view.js';
import {applyOutingAction,outingSummary} from '../src/deal-room-outings.js';
import {OUTING_TRIPS,FRIEND_EVENTS} from '../src/deal-room-outings-content.js';
const home=()=>({phase:'review',day:27,cash:40200,contracts:['mira','samir','ines'].map(clientId=>({clientId,status:'paid'})),history:[],fame:19});
const unescape=s=>s.replaceAll('&amp;','&').replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&quot;','"').replaceAll('&#39;',"'");
// Drives only buttons actually present/enabled in each rendered panel, with the
// same delegated handler and actual reducer as the app. Not a browser/pixel QA.
function harness(state=home(),section='menu',assets={}){
 const ui={};openOutings(ui,section);let current,html='',backs=0;const calls=[];
 const root={querySelector:q=>q==='[data-outings-panel]'?current:null,contains:h=>h===current};
 const render=()=>{
  html=outingsView(state,ui,assets);const h={nodes:[],contains:n=>h.nodes.includes(n)};
  h.nodes=[...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)].map(([,a,body])=>{const n={dataset:{oo:a.match(/data-oo="([^"]+)"/)?.[1],ooId:a.match(/data-oo-id="([^"]+)"/)?.[1]},label:unescape(body.replace(/<[^>]*>/g,'')),disabled:/\bdisabled\b/.test(a)};n.closest=sel=>sel==='[data-oo]'?n:null;return n;});
  current=h;bindOutings(root,state,ui,render,a=>{calls.push(a);state=applyOutingAction(state,a);render();},()=>{backs++;});
 };
 render();
 return {get state(){return state;},get html(){return html;},get backs(){return backs;},get panel(){return current;},calls,ui,render,
  hit(k,id){const n=current.nodes.find(x=>x.dataset.oo===k&&(id===undefined||x.dataset.ooId===id));assert(n,'missing '+k+':'+id);assert(!n.disabled,'disabled '+k+':'+id);current.onclick({target:n});}};
}
test('direct after-work panel groups travel and friends, locks plainly, browsing/back do not charge',()=>{
 const h=harness(),original=structuredClone(h.state);assert.match(h.html,/今晚去哪儿/);assert.match(h.html,/约朋友/);h.hit('trips');
 for(const t of OUTING_TRIPS)assert.ok(h.html.includes(t.name));h.hit('trip','balloon');assert.match(h.html,/山谷热气球/);assert.match(h.html,/¥3,980/);assert.match(h.html,/同行不加价/);
 assert.equal(h.panel.nodes.filter(n=>n.dataset.oo==='companion').length,5);assert.match(h.html,/data-oo-id="solo" aria-pressed="true"/);h.hit('trips');h.hit('menu');h.hit('close');assert.equal(h.backs,1);assert.deepEqual(h.calls,[]);assert.deepEqual(h.state,original);
 const l=harness({...home(),contracts:[]},'trips');assert.match(l.html,/三位开场客户/);assert.equal(l.panel.nodes.length,1);
});
test('paid journey requires explicit confirmation; cancelled and detached controls cannot charge; both scenes appear and return preserves day',()=>{
 const h=harness(home(),'trips');h.hit('trip','balloon');h.hit('companion','xu');h.hit('trip-review');
 assert.match(h.html,/同行：许明珊/);assert.match(h.html,/¥36,220/);let old=h.panel,oldConfirm=old.nodes.find(n=>n.dataset.oo==='confirm');
 h.hit('cancel');old.onclick({target:oldConfirm});assert.equal(h.calls.length,0);h.hit('trip-review');h.hit('confirm');
 assert.deepEqual(h.calls[0],{type:'CONFIRM_OUTING_TRIP',tripId:'balloon',companionId:'xu',quotedCost:3980,confirmed:true,revision:0});assert.equal(h.state.cash,36220);assert.match(h.html,/与许明珊同行/);
 for(const scene of OUTING_TRIPS.find(t=>t.id==='balloon').interactions){
  h.hit('scene',scene.id);assert(h.html.includes(scene.outcome));assert(h.html.includes(scene.companionLines.xu));assert(h.panel.nodes.some(n=>n.dataset.ooId===scene.id&&n.disabled));
 }
 assert.equal(h.state.cash,36220);h.hit('return');assert.equal(h.state.day,27);assert.equal(h.state.phase,'review');assert.match(h.html,/我的出门记忆（2）/);assert.match(h.html,/今晚去哪儿/);
});
test('costless companion-specific event is visible on the first page; positive-cost choices and cancellation never auto-dispatch',()=>{
 const h=harness(home(),'friends');h.hit('friend','liang');assert.match(h.html,/陶/);assert.match(h.html,/下一页/);h.hit('next');h.hit('prev');h.hit('event','pottery-yard');
 const ev=FRIEND_EVENTS.find(e=>e.id==='pottery-yard'),free=ev.choices.find(x=>x.cost===0);h.hit('friend-choice',free.id);assert.match(h.html,/确认参加 · 免费/);h.hit('cancel');assert.equal(h.calls.length,0);
 h.hit('friend-choice',free.id);h.hit('confirm');assert(h.html.includes(free.outcome));assert.equal(h.state.cash,40200);assert.equal(h.state.day,27);
 h.hit('friends-back');h.hit('friend','liang');
 const paidEvent=FRIEND_EVENTS.find(e=>!e.companionId&&e.choices.some(x=>x.cost>0)),choice=paidEvent.choices.find(x=>x.cost>0);
 for(let i=0;i<10&&!h.panel.nodes.some(n=>n.dataset.ooId===paidEvent.id);i++)h.hit('next');
 h.hit('event',paidEvent.id);h.hit('friend-choice',choice.id);assert.match(h.html,/确认支付/);assert.equal(h.state.cash,40200);h.hit('confirm');
 assert.equal(h.state.cash,40200-choice.cost);assert.equal(h.state.fame,19);assert.equal(outingSummary(h.state).friendVisits,2);assert.equal(h.state.day,27);
});
test('insufficient funds disable commitment including paid friend branches, solo is possible when completely broke',()=>{
 const poor=harness({...home(),cash:0},'trips');poor.hit('trip','sail-charter');assert.match(poor.html,/钱还不够/);assert(!poor.panel.nodes.some(x=>x.dataset.oo==='trip-review'));
 poor.hit('trips');poor.hit('trip','paper-boat');poor.hit('trip-review');poor.hit('confirm');assert.match(poor.html,/独自出发/);assert.equal(poor.state.cash,0);poor.hit('return');assert.equal(poor.state.day,27);
 const h=harness({...home(),cash:0},'friends');h.hit('friend','xu');const ev=FRIEND_EVENTS.find(e=>!e.companionId&&e.choices.some(x=>x.cost>0));
 for(let i=0;i<10&&!h.panel.nodes.some(n=>n.dataset.ooId===ev.id);i++)h.hit('next');h.hit('event',ev.id);h.hit('friend-choice',ev.choices.find(x=>x.cost>0).id);
 assert.match(h.html,/钱还不够/);assert(!h.panel.nodes.some(x=>x.dataset.oo==='confirm'));h.hit('cancel');assert.equal(h.calls.length,0);assert.equal(h.state.day,27);
});
test('stale/altered previews cannot be submitted and scene art is optional, keyed, escaped and local only',()=>{
 const s=home(),ui={};openOutings(ui,'trips');Object.assign(ui.outings,{screen:'trip',tripId:'balloon'});assert.doesNotMatch(outingsView(s,ui),/<img/);
 for(const src of ['https://example.com/private.png','assets/../private.webp','javascript:alert(1)','data:image/svg+xml;base64,ABC'])assert.doesNotMatch(outingsView(s,ui,{'trip:balloon':src}),/<img/);
 assert.match(outingsView(s,ui,{'trip:balloon':'assets/verified-balloon.webp'}),/src="assets\/verified-balloon.webp"/);assert.doesNotMatch(outingsView(s,ui,{'trip:pottery':'assets/other.webp'}),/<img/);
 const h=harness(s,'trips');h.hit('trip','balloon');h.hit('trip-review');h.state.cash-=10;h.render();assert.match(h.html,/请重新核对/);assert(!h.panel.nodes.some(x=>x.dataset.oo==='confirm'));assert.equal(h.calls.length,0);
});
test('all scoped controls have 44px mobile targets and stacking breakpoint; no assertions about untested browser pixels',async()=>{
 const css=await readFile(new URL('../src/deal-room-outings.css',import.meta.url),'utf8');assert.match(css,/\.outings-room button\{min-height:44px/);assert.match(css,/@media\(max-width:440px\)/);assert.match(css,/focus-visible/);
});
