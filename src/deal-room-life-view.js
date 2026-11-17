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
function lifeRitual(state,ui){
 if(!state.personalLife?.purchases?.some(p=>p.itemId===ui.using))return '';
 if(ui.using==='books'){
  const n=Math.max(0,Math.min(3,state.personalLife.readingPage||0)),page=COLLECTION_PAGES[n];
  return `<section tabindex="-1" class="life-ritual life-reading" aria-label="沿街走走阅读书册"><div class="life-book"><div class="life-book-left"><small>沿街走走 · 我的藏书</small><h3>${page.title}</h3><span>书签停在第 ${n+1} / 4 篇</span></div><div class="life-book-right"><p aria-live="polite">${page.text}</p></div></div><div class="life-ritual-controls"><button data-life-book-step="previous" data-life-book-page="${n-1}" ${n===0?'disabled':''}>前一篇</button><button data-life-book-step="next" data-life-book-page="${n+1}" ${n===3?'disabled':''}>读下一篇</button><button data-life-end>夹好书签，合上书</button></div></section>`;
 }
 if(ui.using==='chair'){
  const n=Math.max(0,Math.min(2,Number.isInteger(ui.page)?ui.page:0)),page=LIFE_PAGES[n];
  return `<section tabindex="-1" class="life-ritual life-reading" aria-label="我的阅读角"><div class="life-book"><div class="life-book-left"><small>给自己的三页故事</small><h3>${page.title}</h3><span>${n+1} / 3</span></div><div class="life-book-right"><p>${page.text}</p></div></div><div class="life-ritual-controls"><button data-life-page-step="previous" data-life-page="${n-1}" ${n===0?'disabled':''}>往前翻</button><button data-life-page-step="next" data-life-page="${n+1}" ${n===2?'disabled':''}>再读一页</button><button data-life-end>合上书，留待下次</button></div></section>`;
 }
 if(ui.using==='coffee'){
  const short=ui.coffee==='short';
  return `<section tabindex="-1" class="life-ritual life-coffee" aria-label="给自己的咖啡"><svg viewBox="0 0 220 150" aria-label="${short?'小杯浓咖啡':'长杯淡咖啡'}"><ellipse cx="104" cy="128" rx="76" ry="12" fill="#ccb99c"/><path fill="#f4e8d3" stroke="#c5ac87" stroke-width="3" d="M50 47h112v55q-8 28-56 28T50 102z"/><path fill="none" stroke="#dec9a9" stroke-width="12" d="M163 61q55-8 29 39l-28 6"/><ellipse cx="106" cy="${short?79:55}" rx="${short?46:52}" ry="12" fill="#644432"/><path class="life-steam" fill="none" stroke="#fdf7e9" stroke-width="4" d="M88 43q-12-11 0-23m21 21q14-10 0-23m19 24q-9-9 0-20"/></svg><div><small>这杯，不用端给客户</small><h3>${short?'小杯，浓一点':'长杯，慢慢喝'}</h3><p>${short?'留一点香气，陪这一小段空闲。':'多留一会儿。杯子暖着，事情可以晚一点再说。'}</p><div class="life-ritual-controls"><button data-life-coffee="short" aria-pressed="${short}">想喝浓一点</button><button data-life-coffee="long" aria-pressed="${!short}">今天慢慢喝</button><button data-life-end>放下杯子</button></div></div></section>`;
 }
 return `<section tabindex="-1" class="life-ritual life-listening" aria-label="我的唱片时间"><div><small>晚间一面</small><h3>把这一刻留长一点</h3><p>${ui.soundOn?'一段轻轻的旋律，陪你坐一会儿。':'放好唱片，选个舒服的位置。'}</p></div><div class="life-ritual-controls"><button data-life-sound aria-pressed="${!!ui.soundOn}">${ui.soundOn?'关掉声音':'听听这张唱片'}</button><button data-life-end>收起唱片</button></div>${ui.soundError?'<p role="status">这次没能播放，先安静地坐一会儿。</p>':''}</section>`;
}
export function lifeRoomView(state,ui={}){
 const owned=id=>state.personalLife?.purchases?.some(p=>p.itemId===id);
 const choice=LIFE_ITEMS.find(i=>i.id===ui.preview),q=choice?lifePurchasePreview(state,choice.id):null;
 const active=LIFE_ITEMS.find(i=>i.id===ui.using&&owned(i.id)),arrival=LIFE_ITEMS.find(i=>i.id===ui.arrival&&owned(i.id));
 const welcome=arrival?({books:'书册送到了。把书签夹好，今晚从第一篇读起。',chair:'阅读角安顿好了。坐下来，翻开今晚的第一章。',coffee:'咖啡机到家了。第一杯，按自己的口味来。',record:'唱片有了自己的位置。今晚，试着慢一点。'}[arrival.id]):active?({books:'书签还夹在上次那一篇，接着读吧。',chair:'靠好一点，今天不看订单。',coffee:'热气升起来了。这杯留给自己。',record:'唱针落下，给自己留一段空闲。'}[active.id]):'窗外天色暗下来。什么也不买，也可以在这里坐一会儿。';
 return `<section class="life-panel" aria-label="下班后的家"><header><div><small>赚到的钱，也可以花在自己身上</small><h2>今晚不谈订单</h2></div><div>${ui.soundOn?'<button data-life-mute>关掉声音</button>':''}<button data-life-close>回工作室</button></div></header>${lifeRoomArt(state,ui)}<div class="life-welcome ${arrival?'life-delivery':''}" role="status"><p>${welcome}</p>${arrival?`<button data-life-use="${arrival.id}">${arrival.verb}</button>`:''}</div>${owned('books')||ui.preview==='books'?`<div class="life-book-shelf"><span aria-hidden="true">▥</span>《沿街走走》${owned('books')?`<button data-life-use="books">接着读 · 第 ${(state.personalLife.readingPage||0)+1} 篇</button>`:' · 翻看封面，尚未购买'}</div>`:''}${lifeRitual(state,ui)}<div class="life-actions">${LIFE_ITEMS.map(i=>owned(i.id)?`<div><strong>${i.name}</strong><button data-life-use="${i.id}" aria-pressed="${ui.using===i.id}">${ui.using===i.id?'放下，休息一会儿':i.verb}</button>${i.id==='books'?'':`<button data-life-place="${i.id}">${i.id==='chair'?(state.personalLife.positions[i.id]==='inside'?'摆回窗边':'换个位置'):(state.personalLife.positions[i.id]==='inside'?'放回桌面':'移到搁架')}</button>`}</div>`:`<button data-life-preview="${i.id}">${i.name}<small>${money(i.price)} · 先摆进家里看看</small></button>`).join('')}</div>${choice&&!owned(choice.id)?`<aside class="life-purchase"><h3>试摆：${choice.name}</h3><p>${choice.detail}</p><p>花费 ${money(choice.price)} · ${q.cashAfter<0?'还差 '+money(-q.cashAfter):'买完还剩 '+money(q.cashAfter)}</p><small>从手头现金支付，只付这一次，之后使用免费。试摆不会扣钱。</small><div><button data-life-buy="${choice.id}" ${q.valid?'':'disabled'}>${q.valid?'买下，留给自己':q.reason}</button><button data-life-cancel>先不买</button></div></aside>`:''}<footer>手头 ${money(state.cash)} · 已为生活花了 ${money(state.personalLife?.spent||0)}。生意以外，也留一点自己喜欢的生活。</footer></section>`;
}
// A short original phrase, locally synthesized only after the sound button.
// No autoplay, requests, external recording, or saved preference is involved.
let lifeSound=null;
function stopLifeSound(){if(lifeSound){clearTimeout(lifeSound.timer);lifeSound.context.close().catch(()=>{});lifeSound=null;}}
async function startLifeSound(win){
 stopLifeSound();const Audio=win.AudioContext||win.webkitAudioContext;if(!Audio)return false;
 try{
  const context=new Audio();lifeSound={context,timer:null};await context.resume();if(lifeSound?.context!==context)return null;const master=context.createGain();master.gain.value=.055;master.connect(context.destination);
  lifeSound.master=master;
  const phrase=()=>{if(!lifeSound||lifeSound.context!==context)return;const now=context.currentTime;
   for(const [n,frequency] of [261.63,329.63,392,329.63,293.66,349.23,440,349.23,261.63,329.63,392,523.25,440,392,329.63,261.63].entries()){
    const osc=context.createOscillator(),gain=context.createGain(),t=now+n*.65;osc.type='sine';osc.frequency.value=frequency;gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.65,t+.04);gain.gain.exponentialRampToValueAtTime(.001,t+1.5);osc.connect(gain);gain.connect(master);osc.start(t);osc.stop(t+1.55);
   }
   lifeSound.timer=setTimeout(phrase,11200);
  };phrase();return true;
 }catch{stopLifeSound();return false;}
}
let removeLifeVisibility=null;
export function bindLifeRoom(root,{getState,getUI,setUI:renderUI,dispatch,close}){
 // Capture at render time, not at click time: an async sound result must not
 // steal focus back after the player has moved to another control.
 const setUI=next=>{
  const active=root.ownerDocument.activeElement;
  const attrs=['data-life-book-step','data-life-page-step','data-life-coffee','data-life-sound','data-life-mute','data-life-end','data-life-use','data-life-room-use','data-life-place','data-life-preview','data-life-buy','data-life-cancel','data-life-close'];
  const attr=attrs.find(a=>active?.hasAttribute?.(a));
  const value=attr?active.getAttribute(attr):null;
  const scope=['.life-actions','.life-welcome','.life-ritual','.life-panel header'].find(s=>active?.closest?.(s));
  const matching=()=>attr?[...root.querySelectorAll('['+attr+']')].filter(e=>e.getAttribute(attr)===value&&(!scope||e.closest?.(scope))):[];
  const index=matching().indexOf(active);
  const ritualFocused=active===root.querySelector('.life-ritual');
  renderUI(next);
  const target=index>=0?matching()[index]:null;
  if(target&&!target.disabled)target.focus?.({preventScroll:true});
  else if(ritualFocused||index>=0&&['data-life-page-step','data-life-book-step'].includes(attr))root.querySelector('.life-ritual')?.focus?.({preventScroll:true});
 };
 const reveal=selector=>{const el=root.querySelector(selector);el?.focus?.({preventScroll:true});el?.scrollIntoView?.({block:'nearest'});};
 const focusControl=selector=>root.querySelector(selector)?.focus?.({preventScroll:true});
 const end=()=>{const id=getUI().using;stopLifeSound();setUI({...getUI(),using:'',arrival:'',soundOn:false,soundError:false});focusControl(`[data-life-use="${id}"]`);};
 const use=id=>{const ending=getUI().using===id;if(ending&&id==='record')stopLifeSound();setUI({...getUI(),using:ending?'':id,arrival:'',soundOn:ending&&id==='record'?false:!!getUI().soundOn,soundError:false});if(!ending)reveal('.life-ritual');};
 if(removeLifeVisibility)removeLifeVisibility();
 const doc=root.ownerDocument,hidden=()=>{if(doc.hidden&&lifeSound){stopLifeSound();setUI({...getUI(),soundOn:false});}};
 doc.addEventListener('visibilitychange',hidden);removeLifeVisibility=()=>doc.removeEventListener('visibilitychange',hidden);
 root.querySelector('[data-life-close]')?.addEventListener('click',()=>{stopLifeSound();removeLifeVisibility?.();removeLifeVisibility=null;close();});
 for(const e of root.querySelectorAll('[data-life-preview]'))e.onclick=()=>{stopLifeSound();setUI({...getUI(),preview:e.dataset.lifePreview,using:'',arrival:'',soundOn:false});};
 root.querySelector('[data-life-cancel]')?.addEventListener('click',()=>{const id=getUI().preview;setUI({...getUI(),preview:''});focusControl(`[data-life-preview="${id}"]`);});
 for(const e of root.querySelectorAll('[data-life-buy]'))e.onclick=()=>{const id=e.dataset.lifeBuy;if(!lifePurchasePreview(getState(),id).valid)return;dispatch({type:'BUY_LIFE_ITEM',itemId:id});if(getState().personalLife?.purchases?.some(p=>p.itemId===id)){setUI({...getUI(),preview:'',arrival:id});reveal(`[data-life-use="${id}"]`);}};
 for(const e of root.querySelectorAll('[data-life-use]'))e.onclick=()=>use(e.dataset.lifeUse);
 for(const e of root.querySelectorAll('[data-life-room-use]')){e.onclick=()=>use(e.dataset.lifeRoomUse);e.onkeydown=event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();use(e.dataset.lifeRoomUse);}};}
 for(const e of root.querySelectorAll('[data-life-place]'))e.onclick=()=>{dispatch({type:'ARRANGE_LIFE_ITEM',itemId:e.dataset.lifePlace,position:getState().personalLife.positions[e.dataset.lifePlace]==='inside'?'window':'inside'});setUI({...getUI(),arrival:''});focusControl(`[data-life-place="${e.dataset.lifePlace}"]`);};
 for(const e of root.querySelectorAll('[data-life-page]'))e.onclick=()=>setUI({...getUI(),page:Number(e.dataset.lifePage)});
 for(const e of root.querySelectorAll('[data-life-book-page]'))e.onclick=()=>{const page=Number(e.dataset.lifeBookPage);const step=e.dataset.lifeBookStep;dispatch({type:'READ_LIFE_BOOK',itemId:'books',page});const target=root.querySelector(`[data-life-book-step="${step}"]`);if(target&&!target.disabled)target.focus?.({preventScroll:true});else root.querySelector('.life-ritual')?.focus?.({preventScroll:true});};
 for(const e of root.querySelectorAll('[data-life-coffee]'))e.onclick=()=>setUI({...getUI(),coffee:e.dataset.lifeCoffee});
 root.querySelector('[data-life-end]')?.addEventListener('click',end);
 root.querySelector('[data-life-mute]')?.addEventListener('click',()=>{stopLifeSound();setUI({...getUI(),soundOn:false});});
 root.querySelector('[data-life-sound]')?.addEventListener('click',async event=>{event.currentTarget.disabled=true;if(getUI().soundOn){stopLifeSound();setUI({...getUI(),soundOn:false});return;}const ok=await startLifeSound(doc.defaultView);if(ok===null)return;if(getUI().using!=='record'){stopLifeSound();return;}setUI({...getUI(),soundOn:ok,soundError:!ok});});
}
