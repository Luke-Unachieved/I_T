import * as visuals from '../src/visuals.js';
import * as icons from '../src/icons.js';
import * as album from '../src/album.js';
import * as calendar from '../src/calendar.js';
import * as memories from '../src/memory-titles.js';
// Executes the actual UI module against tiny event/storage doubles. This is not
// a browser layout test and makes no claim about rendered pixel correctness.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import * as engine from '../src/engine.js';
import * as content from '../src/content.js';
import * as story from '../src/story.js';
import * as relationships from '../src/relationships.js';
import * as negotiation from '../src/negotiation.js';
import * as epilogue from '../src/epilogue.js';
const source=(await readFile(new URL('../src/app.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'');
const KEY='trade-tycoon:v1';
function ui(initial=null){
 const values=new Map(initial?[[KEY,JSON.stringify(initial)]]:[]),events={},nodes={};
 for(const id of ['app','dialog','toast','start-form','player-name','import-file'])nodes['#'+id]={innerHTML:'',textContent:'',value:'小满',classList:{add(){},remove(){}},addEventListener(type,fn){this[type]=fn;}};
 const dialog=nodes['#dialog'];Object.assign(dialog,{open:false,returnValue:'',onclose:null,showModal(){assert.equal(this.open,false);this.open=true;},close(value){this.open=false;this.returnValue=value;this.onclose?.();}});
 let failRemove=false;
 const localStorage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem(key){if(failRemove)throw Error('denied');values.delete(key);}};
 const context={...visuals,...icons,...album,...calendar,...memories,...engine,...content,...story,...relationships,...negotiation,...epilogue,localStorage,document:{querySelector:selector=>nodes[selector]||null},window:{addEventListener:(type,fn)=>events[type]=fn,scrollTo(){}},setTimeout:()=>1,clearTimeout(){},soundEnabled:()=>false,setSoundEnabled(){},playSound(){},FormData:class{get(){return '小满';}}};
 vm.runInNewContext(source,context,{filename:'app.js'});
 return {nodes,dialog,values,events,failRemove(){failRemove=true;},click(action,id=''){nodes['#app'].click({target:{closest:()=>({disabled:false,dataset:{action,id}})}});},choose(value){let prevented=false;dialog.onsubmit?.({submitter:{value},preventDefault(){prevented=true;}});if(prevented)return;dialog.open=false;dialog.returnValue=value;dialog.scrollTop=0;dialog.onclose?.();},current(){return JSON.parse(values.get(KEY));},sync(state){const raw=state?JSON.stringify(state):null;if(raw)values.set(KEY,raw);else values.delete(KEY);events.storage({key:KEY,newValue:raw});},async selectFile(text){nodes['#import-file'].files=[{size:10,text}];await nodes['#import-file'].onchange();}};
}
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};

test('company story count explains the real next milestone and opens only when available',()=>{
 const s=engine.createGame();s.completed=2;s.story.decisions.first_credit='together';const app=ui(s);app.click('tab','company');
 assert.match(app.nodes['#app'].innerHTML,/下一段创业前故事：大订单，也要有自己的条件/);
 assert.match(app.nodes['#app'].innerHTML,/再完成 1 笔订单后开启/);assert.match(app.nodes['#app'].innerHTML,/聊天、约会和工作小插曲不计入此项/);
 assert.doesNotMatch(app.nodes['#app'].innerHTML,/data-action="story-open"/);assert.deepEqual(app.current(),s);
 const ready=structuredClone(s);ready.completed=3;ready.ap=0;app.sync(ready);app.click('tab','company');
 assert.match(app.nodes['#app'].innerHTML,/故事已开启，现在可以进入/);
 assert.match(app.nodes['#app'].innerHTML,/data-action="story-open"[^>]*data-id="first_contract"/);
 app.click('story-open','first_contract');app.choose('cancel');assert.deepEqual(app.current(),ready);
 ready.phase='evening';app.sync(ready);app.click('tab','company');assert.match(app.nodes['#app'].innerHTML,/故事已开启，下个白天可以进入/);
 assert.match(app.nodes['#app'].innerHTML,/data-action="story-open"[^>]*disabled/);
});

test('defect receipt separates settled cash from unresolved quality with no invented task or charge',()=>{
 for(const factory of ['value','steady']){
  let s=engine.createGame();for(const a of [{type:'accept',id:'1-hinge'},{type:'tactic',id:'quality'},{type:'factory',id:factory},{type:'ship',id:'normal'}])s=engine.reduce(s,a).state;
  const app=ui(s),html=app.nodes['#app'].innerHTML;
  if(factory==='value'){assert.match(html,/品质问题已记录 · 未记录修复/);assert.match(html,/当前没有追加售后任务或隐含扣款/);assert.match(html,/结算完成不代表瑕疵已解决/);}
  else assert.doesNotMatch(html,/class="delivery-followup"/);
  assert.deepEqual(app.current(),s);
 }
});

test('credit terms explain current employee cost and founder working-capital benefit without changing the quote',()=>{
 for(const stage of ['employee','founder']){
  let s=engine.createGame();s.stage=stage;s=engine.reduce(s,{type:'accept',id:'1-hinge'}).state;s=engine.reduce(s,{type:'tactic',id:'quality'}).state;
  const before=engine.quote(s,'credit'),app=ui(s),html=app.nodes['#app'].innerHTML;
  assert.match(html,stage==='employee'?/现在由公司垫资，账期不会增加你的收益/:/账期让 ¥600 货款延至回款时支付/);
  assert.deepEqual(engine.quote(app.current(),'credit'),before);assert.deepEqual(app.current(),s);
 }
});

test('a second chat keeps the spent-evening reason beside the date button until tomorrow',()=>{
 let s=engine.createGame('约会说明','female');
 for(const action of [{type:'evening'},{type:'chat',id:'zhou',response:0},{type:'rest'},{type:'evening'},{type:'chat',id:'zhou',response:1}]){
  const result=engine.reduce(s,action);assert.ok(result.changed,result.message);s=result.state;
 }
 const app=ui(s);app.click('person-select','zhou');let html=app.nodes['#app'].innerHTML;
 assert.match(html,/data-action="date"[^>]*aria-describedby="date-hint-zhou"[^>]*disabled/);
 assert.match(html,/id="date-hint-zhou">今晚的相处机会已用完，明晚可以选择约会/);
 assert.doesNotMatch(html,/先聊过 2 次，再考虑约会/);assert.deepEqual(app.current(),s);
 app.click('rest');html=app.nodes['#app'].innerHTML;assert.match(html,/今晚可以选择约会/);
 assert.match(html,/data-action="date"[^>]*disabled/);
 app.click('evening');html=app.nodes['#app'].innerHTML;assert.doesNotMatch(html,/data-action="date"[^>]*disabled/);
 assert.match(html,/今晚可以选择约会，也可以只聊近况或休息/);assert.equal(app.current().relations.zhou.dates,0);
});

test('date explanations prioritize relationship boundaries and do not promise an unavailable tomorrow',()=>{
 for(const [id,patch,expected] of [
  ['zhou',s=>{s.relations.zhou.status='closed';},/现在保持朋友关系/],
  ['lu',()=>{},/在职期间保持职业边界，不能提出约会/],
  ['zhou',s=>{s.relations.tang.status='partner';},/你已有正式关系，暂不向其他人发起约会/]
 ]){
  const s=engine.createGame('边界说明','female');s.phase='evening';s.eveningUsed=true;s.relations[id].trust=3;patch(s);
  const app=ui(s);app.click('person-select',id);const html=app.nodes['#app'].innerHTML;
  assert.match(html,expected);assert.doesNotMatch(html,/明晚可以选择约会/);
  assert.match(html,/data-action="date"[^>]*disabled/);assert.deepEqual(app.current(),s);
 }
 const s=engine.createGame('朋友','female'),app=ui(s);app.click('person-select','xia');
 assert.doesNotMatch(app.nodes['#app'].innerHTML,/data-action="date"|id="date-hint-xia"/);
 app.click('person-select','zhou');assert.match(app.nodes['#app'].innerHTML,/id="date-hint-zhou">先聊过 2 次，再考虑约会/);
});

test('all six final illustrations open the stored scene without changing progress',()=>{
 for(const [id,branch] of [['xia',1],['zhou',1],['tang',1],['shen',1],['lu',0],['lu',1]]){
  const gender=['xia','shen'].includes(id)?'male':'female',s=engine.createGame('插画回忆',gender);
  Object.assign(s,{day:12,stage:'founder',completed:3});s.relations[id].dates=3;
  s.dialogueMemories[id].date[0]={day:1,response:branch,branch:null,scene:'第一次见面',line:'当时的选择',reply:'当时的回应'};
  s.dialogueMemories[id].date[2]={day:12,response:0,branch:`date:${id}:${branch}`,scene:'已保存的第三幕',line:'当时的选择',reply:'当时的回应'};
  const app=ui(s);app.click('memory-review',`${id}:date:2`);
  assert.ok(app.dialog.innerHTML.includes(`${id}-key-memory-${branch}-v1.webp`));
  assert.match(app.dialog.innerHTML,/已保存的第三幕/);app.choose('art');assert.match(app.dialog.innerHTML,/完整画面/);
  app.choose('zoom');assert.match(app.dialog.innerHTML,/is-zoomed/);app.choose('back');
  assert.match(app.dialog.innerHTML,/当时的回应/);assert.deepEqual(app.current(),s);
 }
});

test('a remote save dismisses an open conversation and stale callbacks cannot advance it',()=>{
 const initial=engine.createGame();initial.phase='evening';const app=ui(initial);app.click('chat','zhou');assert.ok(app.dialog.open);const stale=app.dialog.onclose;
 const incoming=engine.reduce(initial,{type:'chat',id:'zhou',response:1}).state;app.sync(incoming);
 assert.equal(app.dialog.open,false);app.dialog.returnValue='reply-0';stale();
 assert.deepEqual(app.current(),incoming);assert.match(app.nodes['#toast'].textContent,/进度已变化/);
});

test('a remote save cannot be deleted by an older reset confirmation',()=>{
 const initial=engine.createGame(),app=ui(initial);app.click('reset');const stale=app.dialog.onclose;
 const incoming=engine.reduce(initial,{type:'evening'}).state;app.sync(incoming);app.dialog.returnValue='confirm';stale();
 assert.deepEqual(app.current(),incoming);
});

test('a denied reset preserves current progress instead of showing a false new game',()=>{
 const initial=engine.createGame(),app=ui(initial);app.failRemove();app.click('reset');app.choose('confirm');
 assert.deepEqual(app.current(),initial);assert.match(app.nodes['#toast'].textContent,/当前进度已保留/);assert.match(app.nodes['#app'].innerHTML,/今日询盘/);
});

test('an import whose read is interrupted by remote progress cannot replace it',async()=>{
 const initial=engine.createGame(),app=ui(initial),wait=deferred();const pending=app.selectFile(()=>wait.promise);
 const incoming=engine.reduce(initial,{type:'evening'}).state;app.sync(incoming);wait.resolve(JSON.stringify(initial));await pending;
 assert.equal(app.dialog.open,false);assert.deepEqual(app.current(),incoming);assert.match(app.nodes['#toast'].textContent,/读取期间进度已变化/);
});

test('only the latest selected import can open a confirmation',async()=>{
 const app=ui(),first=deferred();const p=app.selectFile(()=>first.promise);const chosen=engine.createGame('后选存档');
 await app.selectFile(async()=>JSON.stringify(chosen));assert.match(app.dialog.innerHTML,/后选存档/);
 first.resolve(JSON.stringify(engine.createGame('先选存档')));await p;assert.match(app.dialog.innerHTML,/后选存档/);
 app.choose('confirm');assert.deepEqual(app.current(),chosen);
});

test('normal import cancel and confirm have distinct results',async()=>{
 const initial=engine.createGame(),imported=engine.createGame('另一个进度'),app=ui(initial);
 await app.selectFile(async()=>JSON.stringify(imported));app.choose('cancel');assert.deepEqual(app.current(),initial);
 await app.selectFile(async()=>JSON.stringify(imported));app.choose('confirm');assert.deepEqual(app.current(),imported);
});

test('invalid remote saves do not dismiss a valid current conversation',()=>{
 const initial=engine.createGame();initial.phase='evening';const app=ui(initial);app.click('chat','zhou');
 app.events.storage({key:KEY,newValue:'invalid json'});assert.ok(app.dialog.open);app.choose('reply-0');assert.equal(app.current().relations.zhou.chats,1);
});


test('today recap excludes previous-day records and allows an uneventful evening',()=>{
 const s=engine.createGame();s.day=6;s.phase='evening';s.logs=[{day:5,title:'昨天的相处',text:'不属于今天'}];
 const app=ui(s);assert.doesNotMatch(app.nodes['#app'].innerHTML,/昨天的相处|不属于今天/);assert.match(app.nodes['#app'].innerHTML,/今天可以不留下些什么/);
});

test('today recap includes at most two current-day records',()=>{
 const s=engine.createGame();s.day=6;s.phase='evening';s.logs=[{day:6,title:'今日最近',text:'甲'},{day:6,title:'今日其次',text:'乙'},{day:6,title:'今日更早',text:'丙'},{day:5,title:'昨日旧事',text:'丁'}];
 const app=ui(s),html=app.nodes['#app'].innerHTML;assert.match(html,/今日最近/);assert.match(html,/今日其次/);assert.doesNotMatch(html,/今日更早|昨日旧事/);
});

test('recruitment card explains prerequisites, costs and unavailable timing without advancing state',()=>{
 const s=engine.createGame();s.stage='founder';s.phase='evening';const app=ui(s);app.click('tab','people');
 const html=app.nodes['#app'].innerHTML;assert.match(html,/先完成 2 笔创业订单、相处 3 次/);assert.match(html,/入职 ¥1,200，每日工资 ¥80/);assert.match(html,/白天再聊工作邀请/);assert.deepEqual(app.current(),s);
});

test('new story remains reachable from the receipt and cancel keeps the chapter untouched',()=>{
 let s=engine.createGame();for(const a of [{type:'accept',id:'1-hinge'},{type:'tactic',id:'quality'},{type:'factory',id:'steady'},{type:'ship',id:'normal'}])s=engine.reduce(s,a).state;
 const app=ui(s);assert.match(app.nodes['#app'].innerHTML,/继续故事：把名字写在方案上/);app.click('story-open','first_credit');assert.ok(app.dialog.open);app.choose('cancel');assert.deepEqual(app.current(),s);
});

test('memory review preserves actual branch and escapes imported response text',()=>{
 let s=engine.createGame();for(let i=0;i<3;i++){s=engine.reduce(s,{type:'evening'}).state;s=engine.reduce(s,{type:'chat',id:'zhou',response:1}).state;s=engine.reduce(s,{type:'rest'}).state;}
 s.dialogueMemories.zhou.chat[2].line='<img src=x onerror=alert(1)>';const app=ui(s),before=app.current();app.click('memory-review','zhou:chat:2');
 assert.match(app.dialog.innerHTML,/回应了更早的选择/);assert.match(app.dialog.innerHTML,/把话说简单/);assert.ok(app.dialog.innerHTML.includes('&lt;img'));assert.ok(!app.dialog.innerHTML.includes('<img src=x'));app.choose('cancel');assert.deepEqual(app.current(),before);
});

test('legacy memory review explicitly marks the missing response instead of inventing one',()=>{
 const s=engine.createGame();s.relations.zhou.chats=3;const app=ui(s);app.click('memory-review','zhou:chat:2');assert.match(app.dialog.innerHTML,/旧版没有保存/);assert.ok(!app.dialog.innerHTML.includes('你：“'));
});

test('dynamic chapter UI shows the exact conditional charge and cancel preserves it',()=>{
 const s=engine.createGame();Object.assign(s,{stage:'founder',completed:12,startupOrders:9,cash:1000});Object.assign(s.story,{focus:'brand',operations:'network',distribution:'regional',decisions:{direction:'brand',deadline:'explain',team:'network',partnership:'regional',aftercare:'guide'}});
 const app=ui(s);app.click('story-open','legacy');assert.match(app.dialog.innerHTML,/现金 −¥300/);assert.match(app.dialog.innerHTML,/服务费 \+¥600/);app.choose('cancel');assert.deepEqual(app.current(),s);
 app.click('story-open','legacy');app.choose('story:share');assert.equal(app.current().cash,700);assert.equal(app.current().story.decisions.legacy,'share');
});

test('career finish is reachable from the latest delivery card after all eight chapters',()=>{
 let s=engine.createGame();for(const [type,id] of [['accept',engine.offers(s)[0].id],['tactic','quality'],['factory','steady'],['ship','normal']])s=engine.reduce(s,{type,id}).state;
 Object.assign(s,{stage:'founder',completed:11,startupOrders:8,cash:20000,rep:40,warehouse:2});Object.assign(s.story,{focus:'boutique',operations:'network',distribution:'independent',decisions:{first_credit:'lead',first_contract:'pilot',direction:'boutique',deadline:'explain',team:'network',partnership:'independent',aftercare:'guide',legacy:'share'}});
 const app=ui(s);assert.match(app.nodes['#app'].innerHTML,/事业目标已经达成/);assert.match(app.nodes['#app'].innerHTML,/写下事业终章 →/);app.click('finale');assert.equal(app.current().story.finale,'boutique');assert.match(app.dialog.innerHTML,/下一次，不必再从头解释/);
});

test('relationship confirmation opens a keepsake only after the approved choice',()=>{
 const s=engine.createGame();s.stage='founder';s.phase='evening';Object.assign(s.relations.zhou,{trust:3,chats:3,dates:3,status:'dating'});const app=ui(s);
 app.click('commit','zhou');app.choose('cancel');assert.equal(app.current().relations.zhou.status,'dating');
 app.click('commit','zhou');app.choose('confirm');assert.equal(app.current().relations.zhou.status,'partner');assert.ok(app.dialog.open);assert.match(app.dialog.innerHTML,/relationship-keepsake/);assert.match(app.dialog.innerHTML,/这段回忆已放进手账/);
 const before=JSON.stringify(app.current());app.choose('confirm');assert.equal(JSON.stringify(app.current()),before);
});
test('weekend work page does not summon a workplace encounter',()=>{
 const s=engine.createGame();Object.assign(s,{day:6,weekendWork:true,completed:3});const app=ui(s);assert.doesNotMatch(app.nodes['#app'].innerHTML,/data-action="work-story-open"/);
});
test('earned illustrated album appears without inventing unearned chapters',()=>{
 const s=engine.createGame();s.story.decisions.first_credit='lead';const app=ui(s);app.click('tab','journal');const html=app.nodes['#app'].innerHTML;
 assert.match(html,/方案上，有了你的名字/);assert.match(html,/shared-office-presentation-v1/);assert.doesNotMatch(html,/稳定经营<|属于你的航线/);
});

test('mobile character shortcuts select the last person without changing progress',()=>{
 const s=engine.createGame();Object.assign(s,{stage:'founder',completed:5,startupOrders:2});const app=ui(s),before=JSON.stringify(app.current());app.click('tab','people');assert.match(app.nodes['#app'].innerHTML,/选择想见的人/);
 app.click('person-select','cheng');let html=app.nodes['#app'].innerHTML;assert.equal((html.match(/class="person-card"/g)||[]).length,1);assert.match(html,/观鸟|船期|程见山/);assert.equal(JSON.stringify(app.current()),before);
 app.click('person-select','all');assert.equal((app.nodes['#app'].innerHTML.match(/class="person-card"/g)||[]).length,8);
});
test('a familiar character card displays recorded interaction rather than only first meeting',()=>{
 let s=engine.createGame();Object.assign(s,{completed:3,phase:'evening'});s=engine.reduce(s,{type:'chat',id:'cheng',response:1}).state;
 s.dialogueMemories.cheng.chat[0].line='<script>untrusted</script>';const app=ui(s);app.click('person-select','cheng');const html=app.nodes['#app'].innerHTML;
 assert.match(html,/你们已经留下的故事/);assert.match(html,/初识时的印象/);assert.match(html,/&lt;script&gt;untrusted&lt;\/script&gt;/);assert.doesNotMatch(html,/<script>untrusted/);
});

test('new game clears an old character filter whose person is not yet unlocked',()=>{
 const s=engine.createGame();Object.assign(s,{stage:'founder',completed:5,startupOrders:2});const app=ui(s);app.click('person-select','cheng');app.click('reset');app.choose('confirm');
 app.nodes['#start-form'].onsubmit({preventDefault(){}});app.click('tab','people');assert.equal((app.nodes['#app'].innerHTML.match(/class="person-card"/g)||[]).length,5);
});


test('new receipt explains the brand bonus without recomputing old company state',()=>{
 let s=engine.createGame();s.stage='founder';s.cash=20000;s.story.focus='brand';for(const [type,id] of [['accept',engine.offers(s)[0].id],['tactic','quality'],['factory','steady'],['ship','normal']])s=engine.reduce(s,{type,id}).state;
 s.story.focus='boutique';const app=ui(s);assert.match(app.nodes['#app'].innerHTML,/合同额构成/);assert.match(app.nodes['#app'].innerHTML,/自有品牌 ¥700/);delete s.lastDelivery.revenueParts;const legacy=ui(s);assert.doesNotMatch(legacy.nodes['#app'].innerHTML,/合同额构成/);
});
test('story reader makes below-fold choices and close option explicit without advancing',()=>{
 let s=engine.createGame();for(const [type,id] of [['accept',engine.offers(s)[0].id],['tactic','quality'],['factory','steady'],['ship','normal']])s=engine.reduce(s,{type,id}).state;
 const app=ui(s);app.click('story-open','first_credit');assert.match(app.dialog.innerHTML,/往下阅读后有 2 个选择/);assert.match(app.dialog.innerHTML,/关闭，稍后再继续/);app.choose('cancel');assert.deepEqual(app.current(),s);
});


test('people and journal views are not pushed down by an unrelated business teaser',()=>{
 let s=engine.createGame();for(const [type,id] of [['accept',engine.offers(s)[0].id],['tactic','quality'],['factory','steady'],['ship','normal']])s=engine.reduce(s,{type,id}).state;
 const app=ui(s);assert.match(app.nodes['#app'].innerHTML,/class="story-teaser"/);for(const tab of ['people','journal','company']){app.click('tab',tab);assert.doesNotMatch(app.nodes['#app'].innerHTML,/class="story-teaser"/);}assert.deepEqual(app.current(),s);
});
test('a declined work invitation keeps the relevant character nearby without a penalty',()=>{
 const s=engine.createGame();Object.assign(s,{stage:'founder',completed:5,startupOrders:2});const app=ui(s);app.click('tab','people');app.click('recruit','gu');assert.equal((app.nodes['#app'].innerHTML.match(/class="person-card"/g)||[]).length,1);assert.match(app.nodes['#app'].innerHTML,/顾予宁/);assert.equal(app.current().cash,s.cash);assert.equal(app.current().rep,s.rep);assert.deepEqual(app.current().relations,s.relations);
});


test('company upgrades explain evening, active-order and cash restrictions',()=>{
 const s=engine.createGame();s.stage='founder';s.phase='evening';let app=ui(s);app.click('tab','company');assert.match(app.nodes['#app'].innerHTML,/白天有空时再安排建设，不要求接单/);
 s.phase='day';s.cash=100;app=ui(s);app.click('tab','company');assert.match(app.nodes['#app'].innerHTML,/还差 ¥1,300 周转资金/);
 s.cash=20000;const active=engine.reduce(s,{type:'accept',id:engine.offers(s)[0].id}).state;app=ui(active);app.click('tab','company');assert.match(app.nodes['#app'].innerHTML,/先完成或暂缓在途订单/);
});


test('evening remembers the customer and next order step without requiring overtime',()=>{
 let s=engine.createGame();s.stage='founder';s.cash=20000;for(const [type,id] of [['accept',engine.offers(s)[0].id],['tactic','quality'],['factory','steady'],['evening','']])s=engine.reduce(s,{type,id}).state;
 const app=ui(s),html=app.nodes['#app'].innerHTML;assert.match(html,/保留中的订单/);assert.match(html,/Elena · 静音合页/);assert.match(html,/下一步：安排出运与回款/);assert.match(html,/不会因休息消失/);assert.deepEqual(app.current(),s);
});


test('ending a relationship preserves its confirmation as read-only history',()=>{
 const s=engine.createGame();s.stage='founder';s.phase='evening';Object.assign(s.relations.zhou,{trust:3,chats:3,dates:3,status:'dating'});const app=ui(s);app.click('commit','zhou');app.choose('confirm');app.choose('confirm');
 app.click('boundary','zhou');app.choose('confirm');assert.equal(app.current().relations.zhou.status,'closed');app.click('tab','journal');assert.match(app.nodes['#app'].innerHTML,/把心意说清楚（历史）/);const before=app.current();app.click('memory-review','zhou:partner:0');assert.match(app.dialog.innerHTML,/历史回忆 · 当前不处于正式关系/);assert.match(app.dialog.innerHTML,/回看不会恢复恋爱关系/);assert.match(app.dialog.innerHTML,/第 1 天/);app.choose('confirm');assert.deepEqual(app.current(),before);
});
test('unconfirmed dates do not invent a historical commitment',()=>{
 const s=engine.createGame();s.phase='evening';Object.assign(s.relations.zhou,{trust:3,chats:3,dates:3,status:'closed'});const app=ui(s);app.click('tab','journal');assert.doesNotMatch(app.nodes['#app'].innerHTML,/把心意说清楚（历史）/);app.click('memory-review','zhou:partner:0');assert.equal(app.dialog.open,false);
});

test('legacy ended relationships show only the saved promise, not invented date or scene',()=>{
 const s=engine.createGame();Object.assign(s.relations.zhou,{trust:3,chats:3,dates:3,status:'closed'});delete s.dialogueMemories.zhou.commitmentRecord;s.dialogueMemories.zhou.commitment='<b>当时记录的约定</b>';const app=ui(s);app.click('memory-review','zhou:partner:0');assert.match(app.dialog.innerHTML,/旧版没有保存完整确认场景/);assert.match(app.dialog.innerHTML,/&lt;b&gt;当时记录的约定&lt;\/b&gt;/);assert.doesNotMatch(app.dialog.innerHTML,/<b>当时记录/);assert.doesNotMatch(app.dialog.innerHTML,/第 1 天/);
});


test('unlocked character art is independently viewable without spending the evening',()=>{
 const initial=engine.createGame('看画','male');Object.assign(initial,{stage:'founder',completed:8,startupOrders:5,phase:'evening'});
 for(const p of content.PEOPLE){const app=ui(initial);app.click('tab','people');assert.match(app.nodes['#app'].innerHTML,new RegExp('查看'+p.name+'的角色立绘'));app.click('portrait-view',p.id);assert.ok(app.dialog.open);assert.match(app.dialog.innerHTML,new RegExp(p.name+'的角色立绘'));assert.match(app.dialog.innerHTML,/回到人物/);app.choose('cancel');assert.deepEqual(app.current(),initial);}
});
test('portrait viewer does not reveal unencountered characters or accept forged ids',()=>{
 for(const id of ['xu','gu','cheng','<script>']){const app=ui(engine.createGame());app.click('portrait-view',id);assert.equal(app.dialog.open,false);}
});
test('browser chrome uses the chosen warm-black theme',async()=>{
 const html=await readFile(new URL('../classic.html',import.meta.url),'utf8');assert.match(html,/name="theme-color" content="#111110"/);
});


test('company workspace and earned album reflect only actual founding and expansion',()=>{
 const original=engine.createGame();let app=ui(original);app.click('tab','company');assert.match(app.nodes['#app'].innerHTML,/harbor-office-v1/);assert.doesNotMatch(app.nodes['#app'].innerHTML,/expanded-studio-v1/);
 const founded={...original,stage:'founder'};app=ui(founded);app.click('tab','company');assert.match(app.nodes['#app'].innerHTML,/startup-studio-v1/);app.click('tab','journal');assert.match(app.nodes['#app'].innerHTML,/从一张小桌开始/);assert.doesNotMatch(app.nodes['#app'].innerHTML,/expanded-studio-v1/);
 const expanded={...founded,warehouse:2};app=ui(expanded);app.click('tab','company');assert.match(app.nodes['#app'].innerHTML,/expanded-studio-v1/);app.click('tab','journal');assert.match(app.nodes['#app'].innerHTML,/第一次扩仓/);assert.deepEqual(app.current(),expanded);
});
test('inquiries and active order use the correct product illustration',()=>{
 const initial=engine.createGame(),app=ui(initial);for(const id of ['hinge','tool','handle'])assert.match(app.nodes['#app'].innerHTML,new RegExp('products/'+id+'-v1'));
 app.click('accept','1-tool');assert.match(app.nodes['#app'].innerHTML,/order-title.*products\/tool-v1/);assert.doesNotMatch(app.nodes['#app'].innerHTML,/products\/hinge-v1/);
});
test('personal time picture appears only after the chosen real daytime activity',()=>{
 const s=engine.createGame();s.day=6;const app=ui(s);assert.doesNotMatch(app.nodes['#app'].innerHTML,/scenes\/(weekend-street|home-rest)/);
 app.click('weekend-time','home');assert.match(app.nodes['#app'].innerHTML,/scenes\/home-rest-v1/);assert.doesNotMatch(app.nodes['#app'].innerHTML,/weekend-street-v1/);assert.equal(app.current().eveningUsed,false);
});


test('earned relationship illustration review is read-only and leaves resources and status unchanged',()=>{
 const s=engine.createGame('插画回看','male');s.completed=3;s.day=8;s.relations.xu.dates=3;s.dialogueMemories.xu.date[0]={day:1,response:0,branch:null,scene:'首次相处',line:'当时的选择',reply:'当时的答复'};s.dialogueMemories.xu.date[2]={day:8,response:0,branch:'date:xu:0',scene:'当时的玻璃珠',line:'保留这点亮光',reply:'这不是一件需要修理的东西'};const app=ui(s);app.click('tab','journal');assert.match(app.nodes['#app'].innerHTML,/查看这一幕的插画/);app.click('memory-review','xu:date:2');assert.match(app.dialog.innerHTML,/relationships\/xu-key-memory-0-v1.webp/);assert.match(app.dialog.innerHTML,/当时的玻璃珠/);app.choose('confirm');assert.deepEqual(app.current(),s);
});
test('unrecorded, incomplete and unavailable scene art stays absent in the UI',()=>{
 const s=engine.createGame('旧档','male');s.completed=3;s.day=8;s.relations.xu.dates=3;s.dialogueMemories.xu.date[0]={day:1,response:0,branch:null,scene:'首次相处',line:'当时的选择',reply:'当时的答复'};let app=ui(s);app.click('tab','journal');assert.doesNotMatch(app.nodes['#app'].innerHTML,/查看这一幕的插画/);app.click('memory-review','xu:date:2');assert.doesNotMatch(app.dialog.innerHTML,/relationship-art|key-memory/);s.relations.xia.dates=3;s.dialogueMemories.xia.date[0]={day:1,response:1,branch:null,scene:'初次相处',line:'安静的海',reply:'好'};s.dialogueMemories.xia.date[2]={day:8,response:1,branch:null,scene:'旧版没有记录分支',line:'留在这里',reply:'好'};app=ui(s);app.click('memory-review','xia:date:2');assert.doesNotMatch(app.dialog.innerHTML,/relationship-art|key-memory/);
});

test('friendship expression and original portrait remain independently viewable without romance',()=>{
 const s=engine.createGame('朋友','female');s.relations.xia.chats=3;s.relations.xia.trust=3;const app=ui(s);app.click('tab','people');assert.match(app.nodes['#app'].innerHTML,/expressions\/xia-expression-v1.webp/);app.click('portrait-view','xia');assert.match(app.dialog.innerHTML,/初识印象/);assert.match(app.dialog.innerHTML,/熟悉后的笑意/);assert.match(app.dialog.innerHTML,/不需要约会/);assert.match(app.nodes['#app'].innerHTML,/2 版立绘 · 已解锁/);assert.match(app.dialog.innerHTML,/expressions\/xia-expression-v1.webp/);app.choose('familiar');assert.match(app.dialog.innerHTML,/expressions\/xia-expression-v1.webp/);app.choose('base');assert.match(app.dialog.innerHTML,/lin-zhixia-v1.webp/);app.choose('cancel');assert.deepEqual(app.current(),s);
});
test('unearned familiar portraits stay absent and do not replace historical conversation art',()=>{
 const s=engine.createGame();const app=ui(s);app.click('portrait-view','zhou');assert.doesNotMatch(app.dialog.innerHTML,/熟悉后的笑意|expressions\//);app.choose('cancel');s.relations.zhou.chats=3;s.relations.zhou.trust=3;s.phase='evening';const familiar=ui(s);familiar.click('chat','zhou');assert.doesNotMatch(familiar.dialog.innerHTML,/expressions\//);familiar.choose('cancel');assert.deepEqual(familiar.current(),s);
});

test('person card opens the saved scene directly and filters the journal without changing progress',()=>{
 const s=engine.createGame('回看','male');s.day=8;s.completed=3;s.relations.xu.chats=3;s.dialogueMemories.xu.chat[0]={day:1,response:1,branch:null,scene:'初次相处',line:'选收音机',reply:'好的'};s.dialogueMemories.xu.chat[2]={day:5,response:1,branch:'chat:xu:1',scene:'当时的收音机',line:'好好听',reply:'一起听'};
 const app=ui(s);app.click('tab','people');app.click('person-select','xu');assert.match(app.nodes['#app'].innerHTML,/回看这一幕/);app.click('memory-review','xu:chat:2');assert.match(app.dialog.innerHTML,/当时的收音机/);assert.match(app.dialog.innerHTML,/回到人物/);app.choose('cancel');app.click('memory-person','xu');const body=app.nodes['#app'].innerHTML;assert.match(body,/aria-label="选择回忆中的人物"/);assert.match(body,/memory-review" data-id="xu:chat:2/);assert.doesNotMatch(body,/memory-review" data-id="zhou:/);assert.deepEqual(app.current(),s);
});
test('earned CG zoom and return preserve original reading position and all progress',()=>{
 const s=engine.createGame('图','male');s.day=8;s.completed=3;s.relations.xu.dates=3;s.dialogueMemories.xu.date[0]={day:1,response:0,branch:null,scene:'初次相处',line:'慢慢逛',reply:'好'};s.dialogueMemories.xu.date[2]={day:8,response:0,branch:'date:xu:0',scene:'当时的玻璃珠',line:'保存',reply:'好'};
 const app=ui(s);app.click('memory-review','xu:date:2');app.dialog.scrollTop=240;app.choose('art');assert.equal(app.dialog.open,true);assert.match(app.dialog.innerHTML,/memory-art-viewer/);assert.doesNotMatch(app.dialog.innerHTML,/当时的玻璃珠<\/p>/);app.choose('zoom');assert.match(app.dialog.innerHTML,/is-zoomed/);assert.match(app.dialog.innerHTML,/横向和上下滚动/);app.choose('fit');assert.doesNotMatch(app.dialog.innerHTML,/art-zoom-viewport is-zoomed/);app.choose('back');assert.match(app.dialog.innerHTML,/当时的玻璃珠/);assert.equal(app.dialog.scrollTop,240);app.choose('cancel');assert.deepEqual(app.current(),s);
});
test('art viewer ignores forged and unearned routes and stale return callbacks',()=>{
 const s=engine.createGame('图','male');s.day=8;s.completed=3;const app=ui(s);for(const id of ['xu','constructor','<img>']){app.click('memory-art',id);assert.equal(app.dialog.open,false);}
 s.relations.xu.dates=3;s.dialogueMemories.xu.date[0]={day:1,response:0,branch:null,scene:'初次相处',line:'慢慢逛',reply:'好'};s.dialogueMemories.xu.date[2]={day:8,response:0,branch:'date:xu:0',scene:'玻璃珠',line:'保存',reply:'好'};app.sync(s);app.click('memory-art','xu');assert.match(app.dialog.innerHTML,/memory-art-viewer/);const stale=app.dialog.onclose;const incoming=engine.reduce(s,{type:'evening'}).state;app.sync(incoming);app.dialog.returnValue='zoom';stale();assert.equal(app.dialog.open,false);assert.deepEqual(app.current(),incoming);
});

test('journal person filter resets when a different saved game arrives',()=>{
 const s=engine.createGame('原档','male');s.completed=3;const app=ui(s);app.click('memory-person','xu');app.sync(engine.createGame('新档','female'));app.click('tab','journal');assert.match(app.nodes['#app'].innerHTML,/data-action="memory-person" data-id="all" aria-pressed="true"/);assert.match(app.nodes['#app'].innerHTML,/<h4>林知夏<\/h4>/);
});

test('third ordinary chat announces earned portrait beside feedback even with a paused order',()=>{
 let s=engine.createGame('朋友','female');s=engine.reduce(s,{type:'accept',id:engine.offers(s)[0].id}).state;s.phase='evening';s.relations.xia.chats=2;s.relations.xia.trust=2;const app=ui(s);app.click('tab','people');app.click('chat','xia');app.choose('reply-0');assert.match(app.nodes['#app'].innerHTML,/新的立绘 · 熟悉后的笑意/);assert.match(app.nodes['#app'].innerHTML,/看看林知夏的新表情/);assert.ok(app.current().active);const after=app.current();assert.equal(after.relations.xia.chats,3);assert.equal(after.relations.xia.dates,0);app.click('portrait-view','xia');app.choose('cancel');assert.deepEqual(app.current(),after);app.click('dismiss');assert.doesNotMatch(app.nodes['#app'].innerHTML,/新的立绘/);
});
test('expression feedback does not repeat for old unlocks or cancelled chats',()=>{
 const s=engine.createGame();s.phase='evening';s.relations.zhou.chats=3;s.relations.zhou.trust=3;const app=ui(s);app.click('tab','people');app.click('chat','zhou');app.choose('cancel');assert.doesNotMatch(app.nodes['#app'].innerHTML,/新的立绘/);app.click('chat','zhou');app.choose('reply-0');assert.doesNotMatch(app.nodes['#app'].innerHTML,/新的立绘/);
});
test('evening desk states whether todays optional interaction remains without requiring romance',()=>{
 const s=engine.createGame();s.phase='evening';const app=ui(s);assert.match(app.nodes['#app'].innerHTML,/今晚还可以相处 1 次/);app.click('tab','people');app.click('chat','zhou');app.choose('reply-0');app.click('tab','desk');assert.match(app.nodes['#app'].innerHTML,/今晚已经留下一段相处回忆/);assert.match(app.nodes['#app'].innerHTML,/回看身边的人/);app.click('rest');app.click('evening');assert.match(app.nodes['#app'].innerHTML,/今晚还可以相处 1 次/);
});


test('midgame previews the next real chapter rather than only a distant cash goal',()=>{
 const s=engine.createGame();Object.assign(s,{stage:'founder',day:11,startupOrders:5,completed:8,cash:21834,warehouse:2});Object.assign(s.story,{focus:'brand',decisions:{direction:'brand',deadline:'explain',team:'network'}});
 const app=ui(s),html=app.nodes['#app'].innerHTML;assert.match(html,/再完成 1 笔创业订单 · 下一段故事/);assert.match(html,/这一次，你坐在对面/);assert.match(html,/合作的范围与标准，由你重新商量/);assert.doesNotMatch(html,/data-action="story-open" data-id="partnership"/);assert.deepEqual(app.current(),s);
 for(const tab of ['people','journal','company']){app.click('tab',tab);assert.doesNotMatch(app.nodes['#app'].innerHTML,/aria-label="下一段事业故事"/);}
});
test('next chapter preview uses the actual route-dependent order threshold',()=>{
 const s=engine.createGame();Object.assign(s,{stage:'founder',day:12,startupOrders:7,completed:10});Object.assign(s.story,{focus:'brand',decisions:{direction:'brand',deadline:'explain',team:'network',partnership:'regional',aftercare:'fieldcheck'}});
 assert.match(ui(s).nodes['#app'].innerHTML,/再完成 2 笔创业订单/);s.story.focus='boutique';s.story.decisions.direction='boutique';assert.match(ui(s).nodes['#app'].innerHTML,/再完成 1 笔创业订单/);s.startupOrders=8;const html=ui(s).nodes['#app'].innerHTML;assert.doesNotMatch(html,/aria-label="下一段事业故事"/);assert.match(html,/data-action="story-open" data-id="legacy"/);
});
test('future chapter teaser respects evenings, default weekend rest, and completed careers',()=>{
 const s=engine.createGame();Object.assign(s,{stage:'founder',day:6,startupOrders:5,completed:8});Object.assign(s.story,{focus:'brand',decisions:{direction:'brand',deadline:'explain',team:'network'}});assert.doesNotMatch(ui(s).nodes['#app'].innerHTML,/aria-label="下一段事业故事"/);s.weekendWork=true;assert.match(ui(s).nodes['#app'].innerHTML,/aria-label="下一段事业故事"/);s.phase='evening';assert.doesNotMatch(ui(s).nodes['#app'].innerHTML,/aria-label="下一段事业故事"/);s.phase='day';s.story.finale='brand';assert.doesNotMatch(ui(s).nodes['#app'].innerHTML,/aria-label="下一段事业故事"/);
});


test('CG detail view starts horizontally centered without changing game state',()=>{
 const s=engine.createGame('图','male');s.day=8;s.completed=3;s.relations.xu.dates=3;s.dialogueMemories.xu.date[0]={day:1,response:0,branch:null,scene:'初次相处',line:'慢慢逛',reply:'好'};s.dialogueMemories.xu.date[2]={day:8,response:0,branch:'date:xu:0',scene:'玻璃珠',line:'保存',reply:'好'};
 const app=ui(s),viewport={scrollWidth:640,clientWidth:300,scrollLeft:0};app.dialog.querySelector=selector=>selector==='.art-zoom-viewport'?viewport:null;
 app.click('memory-art','xu');app.choose('zoom');assert.equal(viewport.scrollLeft,170);assert.deepEqual(app.current(),s);
 app.choose('fit');viewport.scrollWidth=200;app.choose('zoom');assert.equal(viewport.scrollLeft,0);app.choose('cancel');assert.deepEqual(app.current(),s);
});


test('delivery growth text is rendered safely without an extra modal or reward',()=>{
 let s=engine.createGame();const o=engine.offers(s)[0];
 for(const [type,id]of [['accept',o.id],['tactic',o.need],['factory','steady'],['ship','normal']])s=engine.reduce(s,{type,id}).state;
 s.lastDelivery.story.milestone='<img src=x onerror=alert(1)>';const app=ui(s),before=app.current();
 assert.match(app.nodes['#app'].innerHTML,/交付成长记录/);assert.match(app.nodes['#app'].innerHTML,/&lt;img src=x/);
 assert.doesNotMatch(app.nodes['#app'].innerHTML,/<img src=x/);assert.equal(app.dialog.open,false);assert.deepEqual(app.current(),before);
 delete s.lastDelivery.story.milestone;app.sync(s);assert.doesNotMatch(app.nodes['#app'].innerHTML,/交付成长记录/);
});

test('the previous order recap is optional escaped and never selects the old tactic',()=>{
 let s=engine.createGame();const o=engine.offers(s)[0];
 for(const [type,id]of [['accept',o.id],['tactic',o.need],['factory','value'],['ship','normal']])s=engine.reduce(s,{type,id}).state;
 s.ap=3;s.active={...o,step:'talk',reserve:0};s.lastDelivery.planTitle='<script>bad()</script>';
 const app=ui(s),before=app.current(),markup=app.nodes['#app'].innerHTML;
 assert.match(markup,/上次给这位客户交付同类产品时/);assert.match(markup,/有轻微瑕疵/);
 assert.ok(markup.includes('&lt;script&gt;bad()&lt;/script&gt;'));assert.doesNotMatch(markup,/<script>bad/);
 assert.match(markup,/不自动沿用上次方案/);assert.equal(app.current().active.step,'talk');assert.deepEqual(app.current(),before);
 s.active.buyer='Another';app.sync(s);assert.doesNotMatch(app.nodes['#app'].innerHTML,/上次给这位客户交付同类产品时/);
});


test('ending work reflections show only recorded answers and escape their text',()=>{
 let s=engine.createGame();Object.assign(s,{stage:'founder',completed:13,startupOrders:10,cash:30000,warehouse:2});s.story.focus='brand';s.story.finale='brand';
 for(const [id,response]of [['xu_repeatable',1],['xu_limits_written',0]])s=engine.reduce(s,{type:'work-story',id,response}).state;
 s.workStories.xu_limits_written.line='<img src=x onerror=alert(1)>';s.workStories.xu_limits_written.reply='<b>saved answer</b>';
 const app=ui(s),before=app.current();app.click('finale-review');
 assert.ok(app.dialog.open);assert.match(app.dialog.innerHTML,/和伙伴留下的工作习惯/);assert.match(app.dialog.innerHTML,/&lt;img src=x/);assert.match(app.dialog.innerHTML,/&lt;b&gt;saved answer/);
 assert.doesNotMatch(app.dialog.innerHTML,/<img src=x/);assert.match(app.dialog.innerHTML,/不代表加入公司或确认恋爱/);
 app.choose('cancel');assert.deepEqual(app.current(),before);
 delete s.workStories.xu_limits_written;app.sync(s);app.click('finale-review');assert.doesNotMatch(app.dialog.innerHTML,/和伙伴留下的工作习惯/);
});


test('journal describes the current authored work-scene count rather than an older build',()=>{
 const app=ui(engine.createGame());app.click('tab','journal');
 assert.ok(app.nodes['#app'].innerHTML.includes(`共有 ${relationships.WORK_STORIES.length} 段工作日常`));
});

test('third date announces newly saved artwork without interrupting and opens read-only art',()=>{
 let s=engine.createGame('插画提示','male');
 for(const action of [{type:'evening'},{type:'chat',id:'xia',response:0},{type:'rest'},{type:'evening'},{type:'chat',id:'xia',response:0},{type:'rest'},{type:'evening'},{type:'date',id:'xia',response:0},{type:'rest'},{type:'evening'},{type:'date',id:'xia',response:0},{type:'rest'},{type:'evening'}]){
  const r=engine.reduce(s,action);assert.ok(r.changed,r.message);s=r.state;
 }
 const app=ui(s);app.click('date','xia');app.choose('cancel');
 assert.doesNotMatch(app.nodes['#app'].innerHTML,/新的回忆插画已保存/);assert.deepEqual(app.current(),s);
 app.click('date','xia');app.choose('date-0');const saved=app.current();
 assert.equal(saved.relations.xia.dates,3);assert.equal(app.dialog.open,false);
 assert.match(app.nodes['#app'].innerHTML,/新的回忆插画已保存/);
 assert.match(app.nodes['#app'].innerHTML,/看看与林知夏的回忆插画/);
 app.click('memory-art','xia');assert.match(app.dialog.innerHTML,/xia-key-memory-0-v1.webp/);
 app.choose('back');assert.deepEqual(app.current(),saved);
 app.sync(saved);assert.doesNotMatch(app.nodes['#app'].innerHTML,/新的回忆插画已保存/);
 app.click('rest');app.click('evening');app.click('date','xia');app.choose('date-0');
 assert.doesNotMatch(app.nodes['#app'].innerHTML,/新的回忆插画已保存/);
});
