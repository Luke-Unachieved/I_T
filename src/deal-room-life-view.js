import {spendingLiquidityView} from './deal-room-spending.js';
import {paintedLifeRoomArt} from './deal-room-life-art.js';
import {LIFE_ITEMS,lifePurchasePreview} from './deal-room-life.js';
const money=n=>'¥'+Number(n).toLocaleString('zh-CN');
/** All SVG and copy are authored constants; imported save strings never enter HTML. */
export function lifeRoomArt(state,ui={}){return paintedLifeRoomArt(state,ui);}
const COLLECTION_PAGES=[
 {title:'一 · 迟到的早晨',text:'巷口的早餐铺换了蓝色门帘。老板把最后一张煎饼翻过面，问她今天怎么不赶路。她想了想，说，今天想趁热吃完。门外一辆自行车慢慢过去，车筐里的葱叶晃了两下。'},
 {title:'二 · 旧物店的空盒',text:'她在旧物店找到一只铁盒，盒盖印着已经停航的轮船。店主说里面原本装什么，谁也不知道。她没有急着放东西进去，只把它带回窗边。空着的地方，也可以留给以后。'},
 {title:'三 · 绕远一点',text:'桥在修，回家得绕过花市。她起初有些不情愿，直到看见一盆刚开的白花。卖花人正收摊，让她带走一枝折下来的。那晚桌上没有花瓶，一只喝完水的玻璃杯也很好。'},
 {title:'四 · 灯还亮着',text:'楼下书店关门前，她把借来的伞还了回去。店员正在给书包牛皮纸，两人聊起昨夜的雨。走出店门时她回头看了一眼，灯还亮着。明天不一定再下雨，但她已经知道，可以在哪儿停一停。'}
];
const LIFE_PAGES=[
 {title:'第一章 · 慢下来的街道',text:'雨停的时候，面包店刚好出炉。她没有看时间，沿着街角多走了一站。那天，没有人催她快一点。'},
 {title:'第二章 · 靠窗的位置',text:'窗边一直留着一个座位。书翻到一半，阳光挪过杯沿。她把明天的事写在纸背，今天这一页，只留给自己。'},
 {title:'第三章 · 回家的路',text:'回程没有赶上那班车。她在河边坐下来，看远处的灯一盏盏亮起。原来晚一点，也会遇见不同的风景。'}
];
const RECORD_TRACKS={
 evening:{title:'晚间一面',description:'熟悉的第一张，轻轻陪你坐一会儿。',step:.65,type:'sine',notes:[261.63,329.63,392,329.63,293.66,349.23,440,349.23,261.63,329.63,392,523.25,440,392,329.63,261.63]},
 rain:{title:'雨后散步',description:'慢一点的拍子，留出呼吸和停顿。',step:.9,type:'sine',notes:[293.66,369.99,440,554.37,493.88,440,369.99,329.63,293.66,440,493.88,554.37,587.33,554.37,440,369.99,329.63,369.99,440,329.63,293.66,246.94,293.66,293.66]},
 dance:{title:'街角小舞步',description:'短促轻快的音符，脚尖也想跟着动一动。',step:.38,type:'triangle',notes:[261.63,392,329.63,392,523.25,440,392,329.63,293.66,440,349.23,440,587.33,523.25,440,349.23,329.63,493.88,392,493.88,659.25,587.33,523.25,392,349.23,440,523.25,440,392,329.63,293.66,261.63]}
};
function soundVolume(value){return Number.isFinite(Number(value))?Math.max(0,Math.min(100,Math.round(Number(value)))):55;}
function listeningView(state,ui,preview=false){
 const owned=state.personalLife?.purchases?.some(p=>p.itemId==='records'),key=preview?(ui.recordPreview||'rain'):(owned?state.personalLife.recordTrack||'evening':'evening'),track=RECORD_TRACKS[key]||RECORD_TRACKS.evening;
 return `<section tabindex="-1" class="life-ritual life-listening" aria-label="${preview?'周末唱片试听':'我的唱片时间'}"><div><small>${preview?'先听一小段，再决定带不带回家':'今晚的唱片'}</small><h3>${track.title}</h3><p>${track.description}</p></div>${owned||preview?`<div class="life-record-choices" role="group" aria-label="选择唱片">${Object.entries(RECORD_TRACKS).filter(([id])=>!preview||id!=='evening').map(([id,t])=>`<button data-life-track="${id}" aria-pressed="${id===key}">${t.title}</button>`).join('')}</div>`:''}<div class="life-ritual-controls"><button data-life-sound aria-pressed="${!!ui.soundOn}">${ui.soundOn?'关掉声音':preview?'试听这一面':'听听这张唱片'}</button>${preview?'':'<button data-life-end>收起唱片</button>'}</div><label class="life-volume">唱片音量 <input data-life-volume type="range" min="0" max="100" step="5" value="${soundVolume(ui.volume)}" aria-label="唱片音量"><output data-life-volume-value>${soundVolume(ui.volume)}%</output></label><p data-life-volume-status role="status">${ui.soundError?'这次没能播放，先安静地坐一会儿。':ui.soundOn?(soundVolume(ui.volume)===0?'唱片在转，当前静音。':preview?'正在试听一小段。':'正在听：'+track.title):'唱针抬起，屋里安静下来。'}</p></section>`;
}
export function nextCoffeeStage(stage){return ({beans:'ground',ground:'ready',ready:'enjoyed'})[stage]||null;}
export function coffeeRitualView(ui={}){
 const stage=['ground','ready','enjoyed'].includes(ui.coffeeStage)?ui.coffeeStage:'beans',short=ui.coffee==='short';
 const full=['ready','enjoyed'].includes(stage),next=nextCoffeeStage(stage);
 const heading={beans:'先选今天的这一杯',ground:'咖啡粉准备好了',ready:short?'小杯浓咖啡，做好了':'长杯咖啡，做好了',enjoyed:'这一刻，留给自己'}[stage];
 const text={beans:'把豆子放进磨豆机。浓一点，还是留一大杯慢慢喝？',ground:'刚磨好的香气散开了。把手柄装好，接下来让热水穿过咖啡粉。',ready:'杯口升起热气。不必赶下一单，端起来尝一口吧。',enjoyed:short?'小小一口，香气在舌尖多停了一会儿。':'捧着暖杯子，慢慢喝。窗外的光，也不必急着过去。'}[stage];
 const beans=stage==='beans'?'<g class="life-coffee-beans" fill="#62422d" stroke="#c7a581" stroke-width="2"><ellipse cx="74" cy="21" rx="8" ry="12"/><path d="M74 10q-5 11 0 22"/><ellipse cx="105" cy="16" rx="8" ry="12"/><path d="M105 5q-5 11 0 22"/><ellipse cx="135" cy="24" rx="8" ry="12"/><path d="M135 13q-5 11 0 22"/></g>':'';
 const ground=stage==='ground'?'<g class="life-coffee-ground"><path d="M65 34q40-24 80 0" fill="#684632"/><path d="M60 35h90l-9 12H69z" fill="#b8b8a7"/><path d="M145 37h45" stroke="#555d58" stroke-width="8" stroke-linecap="round"/></g>':'';
 return `<section tabindex="-1" class="life-ritual life-coffee coffee-${stage}" aria-label="给自己的咖啡"><svg viewBox="0 0 220 150" role="img" aria-label="${full?(short?'小杯浓咖啡':'长杯淡咖啡'):stage==='ground'?'装好咖啡粉的手柄与空杯':'咖啡豆与空杯'}"><ellipse cx="104" cy="128" rx="76" ry="12" fill="#ccb99c"/><g class="life-coffee-cup"><path fill="#f4e8d3" stroke="#c5ac87" stroke-width="3" d="M50 47h112v55q-8 28-56 28T50 102z"/><path fill="none" stroke="#dec9a9" stroke-width="12" d="M163 61q55-8 29 39l-28 6"/><ellipse cx="106" cy="${full?(short?79:55):57}" rx="${full&&short?46:52}" ry="12" fill="${full?'#644432':'#d8c9af'}"/>${full?'<path class="life-steam" fill="none" stroke="#fdf7e9" stroke-width="4" d="M88 43q-12-11 0-23m21 21q14-10 0-23m19 24q-9-9 0-20"/>':''}</g>${beans}${ground}${stage==='ready'?'<path class="life-coffee-pour" aria-hidden="true" fill="none" stroke="#8b6040" stroke-linecap="round" stroke-width="4" d="M106 2v52"/>':''}</svg><div><small>这杯，不用端给客户</small><h3>${heading}</h3><p role="status">${text}</p>${!full?`<div class="life-ritual-controls" role="group" aria-label="咖啡杯型"><button data-life-coffee="short" aria-pressed="${short}">小杯，浓一点</button><button data-life-coffee="long" aria-pressed="${!short}">长杯，慢慢喝</button></div>`:''}<div class="life-ritual-controls">${next?`<button data-life-coffee-step="${stage}">${{beans:'磨好这份咖啡豆',ground:'装上手柄，开始萃取',ready:'端起杯子，尝一口'}[stage]}</button>`:''}${stage==='enjoyed'&&['chair','books'].includes(ui.coffeeReturn)?'<button data-life-reading-return>带着咖啡，回到刚才那页</button>':''}<button data-life-end>${stage==='enjoyed'?'放下杯子，收好咖啡角':'先收起来'}</button></div></div></section>`;
}
export function readingCompanionsView(state,ui){
 const owns=id=>state.personalLife?.purchases?.some(p=>p.itemId===id);
 const coffee=owns('coffee'),ready=coffee&&ui.coffeeStage==='enjoyed',music=owns('record')&&ui.soundOn;
 if(!coffee&&!music)return '';
 return `<aside class="life-reading-companions" aria-label="陪我读书的小物件">${ready?`<svg viewBox="0 0 96 72" role="img" aria-label="${ui.coffee==='short'?'浓咖啡':'长杯咖啡'}就在书旁"><ellipse cx="42" cy="60" rx="34" ry="6" fill="#c9b38f"/><path d="M17 20h49v26q-4 13-24 13T17 46z" fill="#f9edd8" stroke="#af9675"/><path d="M65 26q27-3 19 16l-18 5" stroke="#d0b999" stroke-width="6" fill="none"/><ellipse cx="41" cy="${ui.coffee==='short'?35:23}" rx="23" ry="5" fill="#76503a"/></svg>`:''}<div>${ready?'<p>书翻到这里，咖啡也在手边了。</p>':coffee?'<button data-life-reading-coffee>给这一页配杯咖啡</button>':''}${music?'<small>唱片还在轻轻转，不急着翻到下一页。</small>':''}</div></aside>`;
}
function lifeRitual(state,ui){
 if(ui.preview==='records'&&!state.personalLife?.purchases?.some(p=>p.itemId==='records'))return listeningView(state,ui,true);
 if(!state.personalLife?.purchases?.some(p=>p.itemId===ui.using))return '';
 if(ui.using==='books'){
  const n=Math.max(0,Math.min(3,state.personalLife.readingPage||0)),page=COLLECTION_PAGES[n];
  return `<section tabindex="-1" class="life-ritual life-reading" aria-label="沿街走走阅读书册"><div class="life-book"><div class="life-book-left"><small>沿街走走 · 我的藏书</small><h3>${page.title}</h3><span>书签停在第 ${n+1} / 4 篇</span></div><div class="life-book-right"><p aria-live="polite">${page.text}</p></div></div>${readingCompanionsView(state,ui)}<div class="life-ritual-controls"><button data-life-book-step="previous" data-life-book-page="${n-1}" ${n===0?'disabled':''}>前一篇</button><button data-life-book-step="next" data-life-book-page="${n+1}" ${n===3?'disabled':''}>读下一篇</button><button data-life-end>夹好书签，合上书</button></div></section>`;
 }
 if(ui.using==='chair'){
  const n=Math.max(0,Math.min(2,Number.isInteger(ui.page)?ui.page:0)),page=LIFE_PAGES[n];
  return `<section tabindex="-1" class="life-ritual life-reading" aria-label="我的阅读角"><div class="life-book"><div class="life-book-left"><small>给自己的三页故事</small><h3>${page.title}</h3><span>${n+1} / 3</span></div><div class="life-book-right"><p>${page.text}</p></div></div>${readingCompanionsView(state,ui)}<div class="life-ritual-controls"><button data-life-page-step="previous" data-life-page="${n-1}" ${n===0?'disabled':''}>往前翻</button><button data-life-page-step="next" data-life-page="${n+1}" ${n===2?'disabled':''}>再读一页</button><button data-life-end>合上书，留待下次</button></div></section>`;
 }
 if(ui.using==='coffee')return coffeeRitualView(ui);
 return listeningView(state,ui);
}
export function lifeRoomView(state,ui={}){
 const owned=id=>state.personalLife?.purchases?.some(p=>p.itemId===id);
 const choice=LIFE_ITEMS.find(i=>i.id===ui.preview),q=choice?lifePurchasePreview(state,choice.id):null;
 const active=LIFE_ITEMS.find(i=>i.id===ui.using&&owned(i.id)),arrival=LIFE_ITEMS.find(i=>i.id===ui.arrival&&owned(i.id));
 const welcome=arrival?({records:'周末唱片摆好了。挑一面，听听今晚的声音。',books:'书册送到了。把书签夹好，今晚从第一篇读起。',chair:'阅读角安顿好了。坐下来，翻开今晚的第一章。',coffee:'咖啡机到家了。第一杯，按自己的口味来。',record:'唱片有了自己的位置。今晚，试着慢一点。'}[arrival.id]):active?({records:'上次选的唱片还在这里，随时可以换一面。',books:'书签还夹在上次那一篇，接着读吧。',chair:'靠好一点，今天不看订单。',coffee:'热气升起来了。这杯留给自己。',record:'唱针落下，给自己留一段空闲。'}[active.id]):'窗外天色暗下来。什么也不买，也可以在这里坐一会儿。';
 return `<section class="life-panel" aria-label="下班后的家"><header><div><small>赚到的钱，也可以花在自己身上</small><h2>今晚不谈订单</h2></div><div>${ui.soundOn?'<button data-life-mute>关掉声音</button>':''}<button data-life-close>回工作室</button></div></header>${lifeRoomArt(state,ui)}<div class="life-welcome ${arrival?'life-delivery':''}" role="status"><p>${welcome}</p>${arrival?`<button data-life-use="${arrival.id}">${arrival.verb}</button>`:''}</div>${owned('books')||ui.preview==='books'?`<div class="life-book-shelf"><span aria-hidden="true">▥</span>《沿街走走》${owned('books')?`<button data-life-use="books">接着读 · 第 ${(state.personalLife.readingPage||0)+1} 篇</button>`:' · 翻看封面，尚未购买'}</div>`:''}${lifeRitual(state,ui)}<div class="life-actions">${LIFE_ITEMS.map(i=>owned(i.id)?`<div><strong>${i.name}</strong><button data-life-use="${i.id}" aria-pressed="${ui.using===i.id}">${ui.using===i.id?'放下，休息一会儿':i.verb}</button>${['books','records'].includes(i.id)?'':`<button data-life-place="${i.id}">${i.id==='chair'?(state.personalLife.positions[i.id]==='inside'?'摆回窗边':'换个位置'):(state.personalLife.positions[i.id]==='inside'?'放回桌面':'移到搁架')}</button>`}</div>`:`<button data-life-preview="${i.id}">${i.name}<small>${money(i.price)} · ${i.id==='records'?'先听听再选':'先摆进家里看看'}</small></button>`).join('')}</div>${choice&&!owned(choice.id)?`<aside class="life-purchase"><h3>${choice.id==='records'?'试听':'试摆'}：${choice.name}</h3><p>${choice.detail}</p><p>花费 ${money(choice.price)} · ${q.cashAfter<0?'还差 '+money(-q.cashAfter):'买完还剩 '+money(q.cashAfter)}</p>${q.valid?spendingLiquidityView(state,choice.price):''}<small>从手头现金支付，只付这一次，之后使用免费。${choice.id==='records'?'试听':'试摆'}不会扣钱。</small><div><button data-life-buy="${choice.id}" ${q.valid?'':'disabled'}>${q.valid?'买下，留给自己':q.reason}</button><button data-life-cancel>先不买</button></div></aside>`:''}<footer>手头 ${money(state.cash)} · 已为生活花了 ${money(state.personalLife?.spent||0)}。生意以外，也留一点自己喜欢的生活。</footer></section>`;
}
// Original authored phrases, locally synthesized only after the sound button.
// Selection may persist, but playback never auto-resumes; no requests or recordings.
let lifeSound=null;
function stopLifeSound(){if(lifeSound){clearTimeout(lifeSound.timer);lifeSound.context.close().catch(()=>{});lifeSound=null;}}
async function startLifeSound(win,key='evening',preview=false,onEnded=()=>{},volume=55){
 stopLifeSound();const Audio=win.AudioContext||win.webkitAudioContext;if(!Audio)return false;
 try{
  const context=new Audio();lifeSound={context,timer:null};await context.resume();if(lifeSound?.context!==context)return null;const master=context.createGain();master.gain.value=soundVolume(volume)/1000;master.connect(context.destination);
  lifeSound.master=master;
  const track=RECORD_TRACKS[key]||RECORD_TRACKS.evening,notes=preview?track.notes.slice(0,6):track.notes,duration=track.type==='triangle'?.28:1.5;
  const phrase=()=>{if(!lifeSound||lifeSound.context!==context)return;const now=context.currentTime;
   for(const [n,frequency] of notes.entries()){
    const osc=context.createOscillator(),gain=context.createGain(),t=now+n*track.step;osc.type=track.type;osc.frequency.value=frequency;gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.65,t+.04);gain.gain.exponentialRampToValueAtTime(.001,t+duration);osc.connect(gain);gain.connect(master);osc.start(t);osc.stop(t+duration+.05);
   }
   lifeSound.timer=setTimeout(preview?()=>{if(lifeSound?.context===context){stopLifeSound();onEnded();}}:phrase,(notes.length*track.step+duration+.05)*1000);
  };phrase();return true;
 }catch{stopLifeSound();return false;}
}
let removeLifeVisibility=null;
export function bindLifeRoom(root,{getState,getUI,setUI:renderUI,dispatch,close}){
 // Capture at render time, not at click time: an async sound result must not
 // steal focus back after the player has moved to another control.
 const setUI=next=>{
  const active=root.ownerDocument.activeElement;
  const attrs=['data-life-volume','data-life-track','data-life-book-step','data-life-page-step','data-life-coffee','data-life-coffee-step','data-life-reading-coffee','data-life-reading-return','data-life-sound','data-life-mute','data-life-end','data-life-use','data-life-room-use','data-life-place','data-life-preview','data-life-buy','data-life-cancel','data-life-close'];
  const attr=attrs.find(a=>active?.hasAttribute?.(a));
  const value=attr?active.getAttribute(attr):null;
  const scope=['.life-actions','.life-welcome','.life-ritual','.life-panel header'].find(s=>active?.closest?.(s));
  const matching=()=>attr?[...root.querySelectorAll('['+attr+']')].filter(e=>e.getAttribute(attr)===value&&(!scope||e.closest?.(scope))):[];
  const index=matching().indexOf(active);
  const ritualFocused=active===root.querySelector('.life-ritual');
  renderUI(next);
  const target=index>=0?matching()[index]:null;
  if(target&&!target.disabled)target.focus?.({preventScroll:true});
  else if(ritualFocused||index>=0&&['data-life-page-step','data-life-book-step','data-life-coffee-step'].includes(attr))root.querySelector('.life-ritual')?.focus?.({preventScroll:true});
 };
 const reveal=selector=>{const el=root.querySelector(selector);el?.focus?.({preventScroll:true});el?.scrollIntoView?.({block:'nearest'});};
 const focusControl=selector=>root.querySelector(selector)?.focus?.({preventScroll:true});
 const end=()=>{const id=getUI().using;stopLifeSound();setUI({...getUI(),using:'',arrival:'',soundOn:false,soundError:false});focusControl(`[data-life-use="${id}"]`);};
 const use=id=>{const ending=getUI().using===id,wasPreview=getUI().preview==='records';if(wasPreview||ending&&['record','records'].includes(id))stopLifeSound();setUI({...getUI(),preview:'',using:ending?'':id,coffeeStage:id==='coffee'?'beans':getUI().coffeeStage,arrival:'',soundOn:wasPreview||ending&&['record','records'].includes(id)?false:!!getUI().soundOn,soundError:false});if(!ending)reveal('.life-ritual');};
 if(removeLifeVisibility)removeLifeVisibility();
 const doc=root.ownerDocument,hidden=()=>{if(doc.hidden&&lifeSound){stopLifeSound();setUI({...getUI(),soundOn:false});}};
 doc.addEventListener('visibilitychange',hidden);removeLifeVisibility=()=>doc.removeEventListener('visibilitychange',hidden);
 root.querySelector('[data-life-close]')?.addEventListener('click',()=>{stopLifeSound();removeLifeVisibility?.();removeLifeVisibility=null;close();});
 for(const e of root.querySelectorAll('[data-life-preview]'))e.onclick=()=>{stopLifeSound();setUI({...getUI(),preview:e.dataset.lifePreview,using:'',arrival:'',soundOn:false});};
 root.querySelector('[data-life-cancel]')?.addEventListener('click',()=>{const id=getUI().preview;stopLifeSound();setUI({...getUI(),preview:'',soundOn:false});focusControl(`[data-life-preview="${id}"]`);});
 for(const e of root.querySelectorAll('[data-life-buy]'))e.onclick=()=>{const id=e.dataset.lifeBuy;if(!lifePurchasePreview(getState(),id).valid)return;stopLifeSound();dispatch({type:'BUY_LIFE_ITEM',itemId:id});if(getState().personalLife?.purchases?.some(p=>p.itemId===id)){setUI({...getUI(),preview:'',arrival:id,soundOn:false});reveal(`[data-life-use="${id}"]`);}};
 for(const e of root.querySelectorAll('[data-life-use]'))e.onclick=()=>use(e.dataset.lifeUse);
 for(const e of root.querySelectorAll('[data-life-room-use]')){e.onclick=()=>use(e.dataset.lifeRoomUse);e.onkeydown=event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();use(e.dataset.lifeRoomUse);}};}
 for(const e of root.querySelectorAll('[data-life-place]'))e.onclick=()=>{dispatch({type:'ARRANGE_LIFE_ITEM',itemId:e.dataset.lifePlace,position:getState().personalLife.positions[e.dataset.lifePlace]==='inside'?'window':'inside'});setUI({...getUI(),arrival:''});focusControl(`[data-life-place="${e.dataset.lifePlace}"]`);};
 for(const e of root.querySelectorAll('[data-life-page]'))e.onclick=()=>setUI({...getUI(),page:Number(e.dataset.lifePage)});
 for(const e of root.querySelectorAll('[data-life-book-page]'))e.onclick=()=>{const page=Number(e.dataset.lifeBookPage);const step=e.dataset.lifeBookStep;dispatch({type:'READ_LIFE_BOOK',itemId:'books',page});const target=root.querySelector(`[data-life-book-step="${step}"]`);if(target&&!target.disabled)target.focus?.({preventScroll:true});else root.querySelector('.life-ritual')?.focus?.({preventScroll:true});};
 for(const e of root.querySelectorAll('[data-life-coffee]'))e.onclick=()=>{if(['short','long'].includes(e.dataset.lifeCoffee))setUI({...getUI(),coffee:e.dataset.lifeCoffee});};
 root.querySelector('[data-life-coffee-step]')?.addEventListener('click',event=>{
  const ui=getUI(),stage=ui.coffeeStage||'beans';
  if(ui.using!=='coffee'||!getState().personalLife?.purchases?.some(p=>p.itemId==='coffee')||event.currentTarget.dataset.lifeCoffeeStep!==stage)return;
  const next=nextCoffeeStage(stage);if(next)setUI({...ui,coffeeStage:next});
 });
 root.querySelector('[data-life-reading-coffee]')?.addEventListener('click',()=>{
  const ui=getUI(),owns=id=>getState().personalLife?.purchases?.some(p=>p.itemId===id);
  if(!['chair','books'].includes(ui.using)||!owns(ui.using)||!owns('coffee'))return;
  setUI({...ui,coffeeReturn:ui.using,using:'coffee',coffeeStage:'beans',arrival:'',preview:''});reveal('.life-ritual');
 });
 root.querySelector('[data-life-reading-return]')?.addEventListener('click',()=>{
  const ui=getUI(),owns=id=>getState().personalLife?.purchases?.some(p=>p.itemId===id);
  if(ui.using!=='coffee'||ui.coffeeStage!=='enjoyed'||!['chair','books'].includes(ui.coffeeReturn)||!owns('coffee')||!owns(ui.coffeeReturn))return;
  setUI({...ui,using:ui.coffeeReturn,coffeeReturn:'',arrival:''});reveal('.life-ritual');
 });
 root.querySelector('[data-life-end]')?.addEventListener('click',end);
 root.querySelector('[data-life-mute]')?.addEventListener('click',()=>{stopLifeSound();setUI({...getUI(),soundOn:false});});
 for(const e of root.querySelectorAll('[data-life-track]'))e.onclick=()=>{const track=e.dataset.lifeTrack;if(!Object.hasOwn(RECORD_TRACKS,track))return;stopLifeSound();if(getUI().preview==='records'){setUI({...getUI(),recordPreview:track,soundOn:false,soundError:false});}else{dispatch({type:'SELECT_LIFE_RECORD',itemId:'records',track});setUI({...getUI(),soundOn:false,soundError:false});}focusControl(`[data-life-track="${track}"]`);};
 root.querySelector('[data-life-volume]')?.addEventListener('input',event=>{const volume=soundVolume(event.currentTarget.value),ui=getUI();if(lifeSound?.master)lifeSound.master.gain.value=volume/1000;ui.volume=volume;const output=root.querySelector('[data-life-volume-value]');if(output)output.textContent=volume+'%';const status=root.querySelector('[data-life-volume-status]');if(status&&ui.soundOn)status.textContent=volume===0?'唱片在转，当前静音。':ui.preview==='records'?'正在试听一小段。':'正在听：'+(RECORD_TRACKS[getState().personalLife?.recordTrack||'evening']||RECORD_TRACKS.evening).title;});
 root.querySelector('[data-life-sound]')?.addEventListener('click',async event=>{event.currentTarget.disabled=true;if(getUI().soundOn){stopLifeSound();setUI({...getUI(),soundOn:false});return;}const preview=getUI().preview==='records',key=preview?(getUI().recordPreview||'rain'):(getState().personalLife?.recordTrack||'evening');const ok=await startLifeSound(doc.defaultView,key,preview,()=>{if(getUI().preview==='records')setUI({...getUI(),soundOn:false});},soundVolume(getUI().volume));if(ok===null)return;if(!['record','records'].includes(getUI().using)&&getUI().preview!=='records'){stopLifeSound();return;}setUI({...getUI(),soundOn:ok,soundError:!ok});});
}
