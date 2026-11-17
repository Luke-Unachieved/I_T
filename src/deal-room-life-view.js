import {LIFE_ITEMS,lifePurchasePreview} from './deal-room-life.js';
const money=n=>'¥'+Number(n).toLocaleString('zh-CN');
/** All SVG and copy are authored constants; imported save strings never enter HTML. */
export function lifeRoomArt(state,{using='',preview='',arrival='',page=0,coffee='long',soundOn=false}={}){
 const owns=id=>state.personalLife?.purchases?.some(p=>p.itemId===id)||preview===id;
 const inside=id=>state.personalLife?.positions?.[id]==='inside';
 const x=id=>id==='chair'&&inside(id)?65:0;
 const y=id=>id!=='chair'&&inside(id)?-116:0;
 const interaction=id=>state.personalLife?.purchases?.some(p=>p.itemId===id)?`role="button" tabindex="0" data-life-room-use="${id}" aria-label="${({chair:'坐进阅读椅',coffee:'给自己做杯咖啡',record:'看看自己的唱片'})[id]}"`:'';
 const trial=id=>preview===id&&!state.personalLife?.purchases?.some(p=>p.itemId===id);
 const outline=(id,x,y,w,h)=>trial(id)?`<rect class="life-preview-outline" x="${x}" y="${y}" width="${w}" height="${h}" rx="8"/><text class="life-preview-label" x="${x+4}" y="${y-5}">试摆 · 未购买</text>`:'';
 return `<svg class="life-room" viewBox="0 0 680 360" role="group" aria-label="下班后的家：${owns('chair')?'阅读椅':'折叠椅'}、${owns('coffee')?'咖啡机':'空台面'}、${owns('record')?'唱片机':'空搁架'}"><defs><linearGradient id="life-sky" x2="0" y2="1"><stop stop-color="#283e5b"/><stop offset="1" stop-color="#d59b80"/></linearGradient><linearGradient id="life-chair-fabric" x2=".9" y2="1"><stop stop-color="#cb9471"/><stop offset=".55" stop-color="#b77a59"/><stop offset="1" stop-color="#89543e"/></linearGradient><linearGradient id="life-seat" x2="0" y2="1"><stop stop-color="#dbab86"/><stop offset="1" stop-color="#b97b56"/></linearGradient><radialGradient id="life-contact"><stop stop-color="#5d4837" stop-opacity=".34"/><stop offset="1" stop-color="#5d4837" stop-opacity="0"/></radialGradient><linearGradient id="life-warm-wall" x2="1" y2=".7"><stop stop-color="#f2dfbd"/><stop offset="1" stop-color="#d6c6b3"/></linearGradient><linearGradient id="life-window-light" x2="1" y2="1"><stop stop-color="#f7d9a1" stop-opacity=".44"/><stop offset="1" stop-color="#f7d9a1" stop-opacity="0"/></linearGradient><linearGradient id="life-wood" x2="0" y2="1"><stop stop-color="#d4ac7b"/><stop offset=".3" stop-color="#b48a5e"/><stop offset="1" stop-color="#9b7250"/></linearGradient><filter id="life-plaster"><feTurbulence type="fractalNoise" baseFrequency=".65" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".065"/></feComponentTransfer><feBlend in="SourceGraphic" mode="soft-light"/></filter></defs><path fill="url(#life-warm-wall)" d="M0 0h680v360H0z"/><path fill="#bea184" d="M0 265h680v95H0z"/><path fill="url(#life-window-light)" d="M40 26 280 26 640 360 80 360z"/><path stroke="#9a7c5e" opacity=".15" d="M0 300h680M0 338h680M130 265l-35 95m190-95 15 95m150-95 65 95"/><path fill="#f5e7cc" d="M0 265h680v5H0z"/><path fill="url(#life-sky)" stroke="#f5efe5" stroke-width="10" d="M40 25h240v193H40z"/><path stroke="#f5efe5" stroke-width="5" d="M160 25v193M40 125h240"/><path fill="#f8df94" d="M215 63a15 15 0 1 0 0 30a19 19 0 0 1 0-30"/><path fill="#52616f" d="M45 170h35v45H45zm45-20h45v65H90zm85 12h28v53h-28zm38-22h60v75h-60z"/><path fill="#ede1cd" opacity=".7" d="M20 12h24v220q-12-7-24 0zm263 0h27v220q-14-10-27 0z"/><path stroke="#c5b49b" fill="none" opacity=".55" d="M28 14v204m8-203v207m254-208v208m11-208v208"/><ellipse cx="245" cy="307" rx="185" ry="28" fill="#927b65" opacity=".22"/><path fill="#f0d6a7" d="M70 280h310l-30 48H40z"/>
 <g data-life-object="chair" ${interaction('chair')} transform="translate(${x('chair')},0)" class="${trial('chair')?'life-trial':'life-owned'} ${arrival==='chair'?'life-arrived':''}">${owns('chair')?`<ellipse cx="151" cy="309" rx="110" ry="13" fill="url(#life-contact)"/><path fill="url(#life-chair-fabric)" d="M80 206q0-30 30-30h92q30 0 30 30v64H80z"/><path fill="url(#life-seat)" d="M75 225q-15 0-15 20v40h185v-40q0-20-15-20v31H75z"/><path fill="#614c3d" d="M80 285h9v25h-9zm137 0h9v25h-9z"/><path fill="#e4c395" stroke="#b7926e" stroke-width="1.5" d="M107 200q35-7 70 0v45q-35 5-70 0z"/><path fill="none" stroke="#e2b28c" stroke-opacity=".65" stroke-width="2" d="M91 211q0-24 21-24h86q22 0 22 24M89 262h128"/>`:'<path stroke="#7a6a58" stroke-width="8" fill="#d5c2a3" d="M100 210h90v50h-90zm0 100 90-50m-90 0 90 50"/>'}${using==='chair'?'<path fill="#fff9e9" stroke="#80664a" d="M118 237q20-8 37 0q20-8 37 0v35q-18-8-37 0q-18-8-37 0z"/>':''}${outline('chair',54,170,198,144)}</g>
 <path fill="#6f5848" d="M390 247h235v12H390zm12 12h10v67h-10zm202 0h10v67h-10z"/><path fill="url(#life-wood)" d="M375 241h260v9H375z"/>
 ${owns('coffee')?`<g data-life-object="coffee" ${interaction('coffee')} transform="translate(0,${y('coffee')})" class="${trial('coffee')?'life-trial':'life-owned'} ${arrival==='coffee'?'life-arrived':''}"><path fill="#456c67" d="M420 183h64v57h-64z"/><path fill="#c4c6b9" d="M430 195h44v7h-44zm-1 32h47v10h-47z"/><path fill="#f4e6cf" d="M442 211h20v18h-20z"/><circle cx="474" cy="190" r="3" fill="#f6cf7b"/>${using==='coffee'?'<path class="life-steam" fill="none" stroke="#fff8df" stroke-width="3" d="M446 208q-10-8 0-16t0-16m10 30q10-8 0-16"/>':''}${outline('coffee',414,177,76,65)}</g>`:''}
 <path stroke="#8e7155" stroke-width="7" d="M384 124h240"/>
 ${owns('record')?`<g data-life-object="record" ${interaction('record')} transform="translate(0,${y('record')})" class="${trial('record')?'life-trial':'life-owned'} ${arrival==='record'?'life-arrived':''}"><path fill="#885f46" d="M508 210h99v30h-99z"/><ellipse cx="555" cy="212" rx="34" ry="13" fill="#303638"/><g transform="translate(555 212) scale(1 .382)"><g class="${using==='record'||soundOn?'life-disc':''}"><circle r="28" fill="none" stroke="#68706c" stroke-width="1"/><path stroke="#a7ac9c" d="M-24-12l9 5m29 13 10 7"/><circle r="7" fill="#e0a568"/></g></g><path stroke="#d7cbaf" stroke-width="3" fill="none" d="${using==='record'||soundOn?'M595 215v-12l-25 13':'M595 215v-20h-9'}"/>${outline('record',502,189,111,53)}</g>`:''}
 <path fill="#607b57" d="M330 235q-45-50-30-70q35 15 30 70q5-75 30-80q20 25-30 80"/><path fill="#b77c5c" d="M310 230h40l-8 42h-24z"/>
 <rect width="680" height="360" fill="#cbbba2" filter="url(#life-plaster)" opacity=".08" pointer-events="none"/>
 </svg>`;
}
const LIFE_PAGES=[
 {title:'第一章 · 慢下来的街道',text:'雨停的时候，面包店刚好出炉。她没有看时间，沿着街角多走了一站。那天，没有人催她快一点。'},
 {title:'第二章 · 靠窗的位置',text:'窗边一直留着一个座位。书翻到一半，阳光挪过杯沿。她把明天的事写在纸背，今天这一页，只留给自己。'},
 {title:'第三章 · 回家的路',text:'回程没有赶上那班车。她在河边坐下来，看远处的灯一盏盏亮起。原来晚一点，也会遇见不同的风景。'}
];
function lifeRitual(state,ui){
 if(!state.personalLife?.purchases?.some(p=>p.itemId===ui.using))return '';
 if(ui.using==='chair'){
  const n=Math.max(0,Math.min(2,Number.isInteger(ui.page)?ui.page:0)),page=LIFE_PAGES[n];
  return `<section tabindex="-1" class="life-ritual life-reading" aria-label="我的阅读角"><div class="life-book"><div class="life-book-left"><small>给自己的三页故事</small><h3>${page.title}</h3><span>${n+1} / 3</span></div><div class="life-book-right"><p>${page.text}</p></div></div><div class="life-ritual-controls"><button data-life-page="${n-1}" ${n===0?'disabled':''}>往前翻</button><button data-life-page="${n+1}" ${n===2?'disabled':''}>再读一页</button><button data-life-end>合上书，留待下次</button></div></section>`;
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
 const welcome=arrival?({chair:'阅读角安顿好了。坐下来，翻开今晚的第一章。',coffee:'咖啡机到家了。第一杯，按自己的口味来。',record:'唱片有了自己的位置。今晚，试着慢一点。'}[arrival.id]):active?({chair:'靠好一点，今天不看订单。',coffee:'热气升起来了。这杯留给自己。',record:'唱针落下，给自己留一段空闲。'}[active.id]):'窗外天色暗下来。什么也不买，也可以在这里坐一会儿。';
 return `<section class="life-panel" aria-label="下班后的家"><header><div><small>赚到的钱，也可以花在自己身上</small><h2>今晚不谈订单</h2></div><div>${ui.soundOn?'<button data-life-mute>关掉声音</button>':''}<button data-life-close>回工作室</button></div></header>${lifeRoomArt(state,ui)}<div class="life-welcome ${arrival?'life-delivery':''}" role="status"><p>${welcome}</p>${arrival?`<button data-life-use="${arrival.id}">${arrival.verb}</button>`:''}</div>${lifeRitual(state,ui)}<div class="life-actions">${LIFE_ITEMS.map(i=>owned(i.id)?`<div><strong>${i.name}</strong><button data-life-use="${i.id}" aria-pressed="${ui.using===i.id}">${ui.using===i.id?'放下，休息一会儿':i.verb}</button><button data-life-place="${i.id}">${i.id==='chair'?(state.personalLife.positions[i.id]==='inside'?'摆回窗边':'换个位置'):(state.personalLife.positions[i.id]==='inside'?'放回桌面':'移到搁架')}</button></div>`:`<button data-life-preview="${i.id}">${i.name}<small>${money(i.price)} · 先摆进家里看看</small></button>`).join('')}</div>${choice&&!owned(choice.id)?`<aside class="life-purchase"><h3>试摆：${choice.name}</h3><p>${choice.detail}</p><p>花费 ${money(choice.price)} · ${q.cashAfter<0?'还差 '+money(-q.cashAfter):'买完还剩 '+money(q.cashAfter)}</p><small>从手头现金支付，只付这一次，之后使用免费。试摆不会扣钱。</small><div><button data-life-buy="${choice.id}" ${q.valid?'':'disabled'}>${q.valid?'买下，留给自己':q.reason}</button><button data-life-cancel>先不买</button></div></aside>`:''}<footer>手头 ${money(state.cash)} · 已为生活花了 ${money(state.personalLife?.spent||0)}。生意以外，也留一点自己喜欢的生活。</footer></section>`;
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
export function bindLifeRoom(root,{getState,getUI,setUI,dispatch,close}){
 const reveal=selector=>{const el=root.querySelector(selector);el?.focus?.({preventScroll:true});el?.scrollIntoView?.({block:'nearest'});};
 const end=()=>{stopLifeSound();setUI({...getUI(),using:'',arrival:'',soundOn:false,soundError:false});};
 const use=id=>{const ending=getUI().using===id;if(ending&&id==='record')stopLifeSound();setUI({...getUI(),using:ending?'':id,arrival:'',soundOn:ending&&id==='record'?false:!!getUI().soundOn,soundError:false});if(!ending)reveal('.life-ritual');};
 if(removeLifeVisibility)removeLifeVisibility();
 const doc=root.ownerDocument,hidden=()=>{if(doc.hidden&&lifeSound){stopLifeSound();setUI({...getUI(),soundOn:false});}};
 doc.addEventListener('visibilitychange',hidden);removeLifeVisibility=()=>doc.removeEventListener('visibilitychange',hidden);
 root.querySelector('[data-life-close]')?.addEventListener('click',()=>{stopLifeSound();removeLifeVisibility?.();removeLifeVisibility=null;close();});
 for(const e of root.querySelectorAll('[data-life-preview]'))e.onclick=()=>{stopLifeSound();setUI({...getUI(),preview:e.dataset.lifePreview,using:'',arrival:'',soundOn:false});};
 root.querySelector('[data-life-cancel]')?.addEventListener('click',()=>setUI({...getUI(),preview:''}));
 for(const e of root.querySelectorAll('[data-life-buy]'))e.onclick=()=>{const id=e.dataset.lifeBuy;if(!lifePurchasePreview(getState(),id).valid)return;dispatch({type:'BUY_LIFE_ITEM',itemId:id});if(getState().personalLife?.purchases?.some(p=>p.itemId===id)){setUI({...getUI(),preview:'',arrival:id});reveal('.life-delivery');}};
 for(const e of root.querySelectorAll('[data-life-use]'))e.onclick=()=>use(e.dataset.lifeUse);
 for(const e of root.querySelectorAll('[data-life-room-use]')){e.onclick=()=>use(e.dataset.lifeRoomUse);e.onkeydown=event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();use(e.dataset.lifeRoomUse);}};}
 for(const e of root.querySelectorAll('[data-life-place]'))e.onclick=()=>{dispatch({type:'ARRANGE_LIFE_ITEM',itemId:e.dataset.lifePlace,position:getState().personalLife.positions[e.dataset.lifePlace]==='inside'?'window':'inside'});setUI({...getUI(),arrival:''});};
 for(const e of root.querySelectorAll('[data-life-page]'))e.onclick=()=>setUI({...getUI(),page:Number(e.dataset.lifePage)});
 for(const e of root.querySelectorAll('[data-life-coffee]'))e.onclick=()=>setUI({...getUI(),coffee:e.dataset.lifeCoffee});
 root.querySelector('[data-life-end]')?.addEventListener('click',end);
 root.querySelector('[data-life-mute]')?.addEventListener('click',()=>{stopLifeSound();setUI({...getUI(),soundOn:false});});
 root.querySelector('[data-life-sound]')?.addEventListener('click',async event=>{event.currentTarget.disabled=true;if(getUI().soundOn){stopLifeSound();setUI({...getUI(),soundOn:false});return;}const ok=await startLifeSound(doc.defaultView);if(ok===null)return;if(getUI().using!=='record'){stopLifeSound();return;}setUI({...getUI(),soundOn:ok,soundError:!ok});});
}
