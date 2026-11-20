import {spendingLiquidityView} from './deal-room-spending.js';
import {paintedLifeRoomArt} from './deal-room-life-art.js';
import {lifeCatalogue,lifeLightLevel,lifePurchasePreview} from './deal-room-life.js';
const money=n=>'¥'+Number(n).toLocaleString('zh-CN');
// Percent coordinates follow the original image plane; unknown pictures get no precipitation.
const homeWeatherGlass={
 'home-starter':['0 0 100 66.67','21.6,.6 60,5.4 60,23.8 21.6,25.2'],
 'home-flat':['0 0 100 66.67','1,4 17,9 17,29 1,34'],
 'home-harbor':['0 0 100 66.67','25,15 65,15 65,36 25,36'],
 'home-tower':['0 0 100 66.67','10,6 31,14 31,40 10,45 10,6 34,16 50,15 50,38 34,40 34,16'],
 'home-villa':['0 0 100 66.67','23,11 48,11 48,42 23,44'],
 'furniture':['0 0 100 56.3','5,15 34,15 34,33 5,33']
};
export function exteriorWeatherSvg(weather,plane,glass){
 const kind=({'晴':'clear','阴':'cloud','雨':'rain','雪':'snow'})[weather];
 if(!['clear','cloud','rain','snow'].includes(kind)||!glass)return '';
 const rectColour={clear:'#ffe1a0',cloud:'#8d9da8',rain:'#708598',snow:'#e1ecf0'}[kind];
 const glyphs=kind==='rain'||kind==='snow'?Array.from({length:130},(_,i)=>{
   const x=(i*37+Math.floor(i/9)*11)%101,y=(i*17+Math.floor(i/6)*7)%68;
   return kind==='rain'?'<path d="m'+x+' '+y+' -.43 1.45" stroke="#dfedf4" stroke-width=".18"/>':'<circle cx="'+x+'" cy="'+y+'" r="'+(.16+(i%3)*.08)+'" fill="#fafafa"/>';
 }).join(''):'';
 return '<svg class="exterior-weather weather-'+kind+'" viewBox="'+plane+'" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><g style="clip-path:polygon('+glass.split(' ').map(pair=>pair.split(',').map((v,j)=>Number(v)*100/Number(plane.split(' ')[j+2])+'%').join(' ')).join(',')+');transform-box:view-box"><rect width="100%" height="100%" fill="'+rectColour+'" opacity="'+(kind==='clear'?'.14':'.31')+'"/><g class="exterior-particles">'+glyphs+'</g></g></svg>';
}
// Crop and stage come from the replayed garden; art choice never changes growth.
const BALCONY_CROPS={
 mint:{new:'assets/deal-life-balcony-mint-new.webp',growing:'assets/deal-life-balcony-mint-growing.webp',ready:'assets/deal-life-balcony-mint-ready.webp'},
 daisy:{new:'assets/deal-life-balcony-daisy-new.webp',growing:'assets/deal-life-balcony-daisy-growing.webp',ready:'assets/deal-life-balcony-daisy-ready.webp'}
};
function balconyArt(state,ui){
 const p=state.personalLife?.balconyGarden?.crop,age=p?state.day-p.plantedDay:0;
 const stage=!p?'empty':state.day>=p.readyDay?'ready':age<2?'new':'growing';
 const crop=p&&Object.hasOwn(BALCONY_CROPS,p.plant)?BALCONY_CROPS[p.plant][stage]:null;
 const alt='自己的小阳台：木凳、种植槽'+(crop?'和'+(p.plant==='mint'?'薄荷':'雏菊'):'');
 const caption=ui.preview==='balcony'?'改造预览 · 尚未购买':p?(p.plant==='mint'?'薄荷':'雏菊')+' · '+({new:'刚发芽',growing:'生长中',ready:'可以收了'})[stage]:'木凳和种植槽，等你播种。';
 const weather=({晴:'clear',阴:'cloud',雨:'rain',雪:'snow'})[ui.weather]||'';
 // Background weather stops above the railing; never tint the bench/soil/foreground plant.
 const outside=exteriorWeatherSvg(ui.weather,'0 0 100 66.67','40,0 100,0 100,27 27,27 27,17 29,13 32,5 39,4');
 return `<figure class="balcony-picture" data-balcony-weather="${weather}" data-balcony-stage="${stage}"><div class="balcony-raster-scene"><img class="balcony-backdrop" src="assets/deal-life-balcony-scene.webp" width="1200" height="800" alt="${alt}">${outside}${crop?`<img class="balcony-crop" src="${crop}" alt="" aria-hidden="true">`:''}</div><figcaption>${caption}</figcaption></figure>`;
}
function balconyRitual(state,ui){
 const g=state.personalLife.balconyGarden||{},p=g.crop,ready=p&&state.day>=p.readyDay,n=p?.plant==='mint'?'薄荷':'雏菊';
 return `<section class="life-ritual balcony-ritual" tabindex="-1" aria-label="我的阳台"><div><h3>${p?(ready?n+'可以收了':n+'在慢慢长'):'今天，往木槽里种什么？'}</h3>${p?`<p>第 ${p.plantedDay} 天种下。 ${ready?'回来的正是时候。':'第 '+p.readyDay+' 天起可以收；去做生意，不必守在这里。'}</p>${ready?`<button data-balcony-harvest ${p.plant==='mint'&&g.teaPacket?'disabled':''}>${p.plant==='mint'?(g.teaPacket?'先泡掉上一包薄荷，再来采':'采薄荷，留一包泡茶'):(g.flowers?'剪新花，换下旧花束':'摘一束，做成桌上的干花')}</button>`:''}`:'<div class="life-ritual-controls"><button data-balcony-plant="mint">种薄荷 · 4 个经营日</button><button data-balcony-plant="daisy">种雏菊 · 7 个经营日</button></div>'}${g.teaPacket?'<button data-balcony-brew>用收下的薄荷泡一杯</button>':''}${ui.balconyTea?'<p role="status">坐在木凳上，把这杯自己种的薄荷茶慢慢喝完。</p>':''}${g.flowers?'<p>一束阳台的干花已经摆在屋里。</p>':''}<button data-life-end>关上阳台门，回屋</button></div></section>`;
}
const driedPosy='<img class="garden-posy" src="assets/deal-life-prop-dried-daisies.webp" alt="自己在阳台种的雏菊干花">';

export function lifeRoomArt(state,ui={}){return (ui.preview==='balcony'&&lifeCatalogue(state).some(i=>i.id==='balcony')||[ui.using,ui.arrival].includes('balcony')&&state.personalLife?.purchases?.some(i=>i.itemId==='balcony'))?balconyArt(state,ui):paintedLifeRoomArt(state,ui).replace('/><', '/>'+exteriorWeatherSvg(ui.weather,...homeWeatherGlass.furniture).replace('<svg class=','<svg width="680" height="383" class=')+'<');}
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
 return `<section tabindex="-1" class="life-ritual life-listening home-comic-ritual" aria-label="${preview?'周末唱片试听':'我的唱片时间'}"><figure class="home-record-frame" aria-label="唱片机特写"></figure><div class="life-ritual-copy"><small>${preview?'先听一小段，再决定带不带回家':'今晚的唱片'}</small><h3>${track.title}</h3><p>${track.description}</p></div>${owned||preview?`<div class="life-record-choices" role="group" aria-label="选择唱片">${Object.entries(RECORD_TRACKS).filter(([id])=>!preview||id!=='evening').map(([id,t])=>`<button data-life-track="${id}" aria-pressed="${id===key}">${t.title}</button>`).join('')}</div>`:''}<div class="life-ritual-controls"><button data-life-sound aria-pressed="${!!ui.soundOn}">${ui.soundOn?'关掉声音':preview?'试听这一面':'听听这张唱片'}</button>${preview?'':'<button data-life-end>收起唱片</button>'}</div><label class="life-volume">唱片音量 <input data-life-volume type="range" min="0" max="100" step="5" value="${soundVolume(ui.volume)}" aria-label="唱片音量"><output data-life-volume-value>${soundVolume(ui.volume)}%</output></label><p data-life-volume-status role="status">${ui.soundError?'这次没能播放，先安静地坐一会儿。':ui.soundOn?(soundVolume(ui.volume)===0?'唱片在转，当前静音。':preview?'正在试听一小段。':'正在听：'+track.title):'唱针抬起，屋里安静下来。'}</p></section>`;
}
export function nextCoffeeStage(stage){return ({beans:'ground',ground:'ready',ready:'enjoyed'})[stage]||null;}
export function coffeeRitualView(ui={}){
 const stage=['ground','ready','enjoyed'].includes(ui.coffeeStage)?ui.coffeeStage:'beans',short=ui.coffee==='short';
 const full=['ready','enjoyed'].includes(stage),next=nextCoffeeStage(stage);
 const heading={beans:'先选今天的这一杯',ground:'咖啡粉准备好了',ready:short?'小杯浓咖啡，做好了':'长杯咖啡，做好了',enjoyed:'这一刻，留给自己'}[stage];
 const text={beans:'把豆子放进磨豆机。浓一点，还是留一大杯慢慢喝？',ground:'刚磨好的香气散开了。把手柄装好，接下来让热水穿过咖啡粉。',ready:'杯口升起热气。不必赶下一单，端起来尝一口吧。',enjoyed:short?'小小一口，香气在舌尖多停了一会儿。':'捧着暖杯子，慢慢喝。窗外的光，也不必急着过去。'}[stage];
 const picture=stage==='beans'?'assets/deal-life-coffee-beans.webp':stage==='ground'?'assets/deal-life-coffee-ground.webp':short?'assets/deal-life-coffee-short.webp':'assets/deal-life-coffee-long.webp';
 const subject=full?(short?'小杯浓咖啡':'长杯淡咖啡'):stage==='ground'?'装好咖啡粉的手柄与空杯':'咖啡豆与空杯';
 return `<section tabindex="-1" class="life-ritual life-coffee home-comic-ritual coffee-${stage}" aria-label="给自己的咖啡"><figure class="life-coffee-frame" data-cup="${short?'short':'long'}"><img src="${picture}" width="768" height="512" alt="${subject}">${stage==='ready'?'<span class="life-coffee-vapor life-steam" aria-hidden="true"></span>':''}</figure><div class="life-ritual-copy"><small>给自己做杯咖啡</small><ol class="life-coffee-steps" aria-label="制作进度">${[["beans","磨豆"],["ground","萃取"],["ready","品尝"]].map(([id,label],i)=>`<li${id===stage?' aria-current="step"':(stage==="enjoyed"||["beans","ground","ready"].indexOf(stage)>i)?' data-done':''}>${label}</li>`).join('')}</ol><h3>${heading}</h3><p role="status">${text}</p>${!full?`<div class="life-ritual-controls" role="group" aria-label="咖啡杯型"><button data-life-coffee="short" aria-pressed="${short}">小杯，浓一点</button><button data-life-coffee="long" aria-pressed="${!short}">长杯，慢慢喝</button></div>`:''}<div class="life-ritual-controls">${next?`<button data-life-coffee-step="${stage}">${{beans:'磨好这份咖啡豆',ground:'装上手柄，开始萃取',ready:'端起杯子，尝一口'}[stage]}</button>`:''}${stage==='enjoyed'&&['chair','books'].includes(ui.coffeeReturn)?'<button data-life-reading-return>带着咖啡，回到刚才那页</button>':''}<button data-life-end>${stage==='enjoyed'?'放下杯子，收好咖啡角':'先收起来'}</button></div></div></section>`;
}
export function readingCompanionsView(state,ui){
 const owns=id=>state.personalLife?.purchases?.some(p=>p.itemId===id);
 const coffee=owns('coffee'),ready=coffee&&ui.coffeeStage==='enjoyed',music=owns('record')&&ui.soundOn;
 const flowers=state.personalLife?.balconyGarden?.flowers;if(!coffee&&!music&&!flowers)return '';
 return `<aside class="life-reading-companions" aria-label="陪我读书的小物件">${flowers?driedPosy:''}${ready?`<img class="life-reading-cup" src="${ui.coffee==='short'?'assets/deal-life-prop-cup-short.webp':'assets/deal-life-prop-cup-long.webp'}" alt="${ui.coffee==='short'?'浓咖啡':'长杯咖啡'}就在书旁">`:''}<div>${flowers?'<p>上次从阳台剪下的花，就摆在书旁。</p>':''}${ready?'<p>书翻到这里，咖啡也在手边了。</p>':coffee?'<button data-life-reading-coffee>给这一页配杯咖啡</button>':''}${music?'<small>唱片还在轻轻转，不急着翻到下一页。</small>':''}</div></aside>`;
}
function lampSwitch(state,ui){
 if(!state.personalLife?.purchases?.some(p=>p.itemId==='readinglamp'))return '';
 const n=lifeLightLevel(ui);
 return `<div class="life-ritual-controls lamp-switch" role="group" aria-label="阅读灯亮度">${['关灯','一档 · 微光','二档 · 柔光','三档 · 明亮'].map((s,i)=>`<button data-life-light-level="${i}" aria-pressed="${i===n}">${s}</button>`).join('')}</div>`;
}
function lifeRitual(state,ui){
 if(ui.preview==='records'&&!state.personalLife?.purchases?.some(p=>p.itemId==='records'))return listeningView(state,ui,true);
 if(!state.personalLife?.purchases?.some(p=>p.itemId===ui.using))return '';
 if(ui.using==='balcony')return balconyRitual(state,ui);
 if(ui.using==='readinglamp')return `<section tabindex="-1" class="life-ritual" aria-label="我的调光灯"><div><small>Mira 店里那款灯，如今也在自己家里</small><h3>今晚，把书页照亮一点</h3><p>灯和木边几摆在阅读椅旁。拧到顺眼的一档，再翻开想读的书。</p>${lampSwitch(state,ui)}<div class="life-ritual-controls"><button data-life-use="chair">坐下读一页</button>${state.personalLife.purchases.some(p=>p.itemId==='books')?'<button data-life-use="books">接着读《沿街走走》</button>':''}<button data-life-end>起身</button></div></div></section>`;
 if(ui.using==='books'){
  const n=Math.max(0,Math.min(3,state.personalLife.readingPage||0)),page=COLLECTION_PAGES[n];
  return `<section tabindex="-1" class="life-ritual life-reading home-comic-ritual" aria-label="沿街走走阅读书册"><div class="life-book" data-reading-light="${state.personalLife.purchases.some(p=>p.itemId==='readinglamp')?lifeLightLevel(ui):0}"><div class="life-book-left"><small>沿街走走 · 我的藏书</small><h3>${page.title}</h3><span>书签停在第 ${n+1} / 4 篇</span></div><div class="life-book-right"><p aria-live="polite">${page.text}</p></div></div>${lampSwitch(state,ui)}${readingCompanionsView(state,ui)}<div class="life-ritual-controls"><button data-life-book-step="previous" data-life-book-page="${n-1}" ${n===0?'disabled':''}>前一篇</button><button data-life-book-step="next" data-life-book-page="${n+1}" ${n===3?'disabled':''}>读下一篇</button><button data-life-end>夹好书签，合上书</button></div></section>`;
 }
 if(ui.using==='chair'){
  const n=Math.max(0,Math.min(2,Number.isInteger(ui.page)?ui.page:0)),page=LIFE_PAGES[n];
  return `<section tabindex="-1" class="life-ritual life-reading home-comic-ritual" aria-label="我的阅读角"><div class="life-book" data-reading-light="${state.personalLife.purchases.some(p=>p.itemId==='readinglamp')?lifeLightLevel(ui):0}"><div class="life-book-left"><small>给自己的三页故事</small><h3>${page.title}</h3><span>${n+1} / 3</span></div><div class="life-book-right"><p>${page.text}</p></div></div>${lampSwitch(state,ui)}${readingCompanionsView(state,ui)}<div class="life-ritual-controls"><button data-life-page-step="previous" data-life-page="${n-1}" ${n===0?'disabled':''}>往前翻</button><button data-life-page-step="next" data-life-page="${n+1}" ${n===2?'disabled':''}>再读一页</button><button data-life-end>合上书</button></div></section>`;
 }
 if(ui.using==='coffee')return coffeeRitualView(ui);
 return listeningView(state,ui);
}
function furnitureView(state,ui={}){
 const owned=id=>state.personalLife?.purchases?.some(p=>p.itemId===id);
 const catalogue=lifeCatalogue(state),choice=catalogue.find(i=>i.id===ui.preview),q=choice?lifePurchasePreview(state,choice.id):null;
 const active=catalogue.find(i=>i.id===ui.using&&owned(i.id)),arrival=catalogue.find(i=>i.id===ui.arrival&&owned(i.id));
 const welcome=arrival?({balcony:'窗外多了一处可以坐下的地方。苗和小铲子都在木槽旁。',readinglamp:'木边几摆在椅旁，自己的那盏灯也装好了。',records:'周末唱片摆好了。挑一面，听听今晚的声音。',books:'书册送到了。把书签夹好，今晚从第一篇读起。',chair:'阅读角安顿好了。坐下来，翻开今晚的第一章。',coffee:'咖啡机到家了。第一杯，按自己的口味来。',record:'唱片有了自己的位置。今晚，试着慢一点。'}[arrival.id]):active?({balcony:'推开门，看看自己种下的东西。',readinglamp:'手边就是开关，选个舒服的亮度。',records:'上次选的唱片还在这里，随时可以换一面。',books:'书签还夹在上次那一篇，接着读吧。',chair:'靠好一点，今天不看订单。',coffee:'热气升起来了。这杯留给自己。',record:'唱针落下，给自己留一段空闲。'}[active.id]):'窗外天色暗下来。什么也不买，也可以在这里坐一会儿。';
 const deep=!!(active&&active.id!=='balcony'||choice?.id==='records');
 return `<section class="life-panel home-comic" tabindex="-1" data-life-mode="${deep?'activity':'room'}" aria-label="下班后的家"><header><div><small>家具与收藏</small><h2>${arrival?'送到了':choice&&!owned(choice.id)?(choice.id==='records'?'试听周末双面唱片':choice.id==='balcony'?'预览小阳台':'摆进屋里看看'):active?active.name:'屋里这一角'}</h2></div><div>${ui.soundOn&&ui.preview!=='records'&&!['record','records'].includes(ui.using)?'<button data-life-mute>关掉声音</button>':''}<button data-home-furniture-done>收起家具</button></div></header><div class="home-comic-frame" tabindex="-1"><span class="home-panel-label">${arrival?'到家':choice&&!owned(choice.id)?'试摆':active?'使用中':'环顾房间'}</span>${lifeRoomArt(state,ui)}</div><div class="life-welcome ${arrival?'life-delivery':''}" role="status"><p>${choice&&!owned(choice.id)&&!arrival?choice.detail:welcome}</p>${state.personalLife?.balconyGarden?.flowers&&!ui.using&&!ui.preview?driedPosy:''}${arrival?`<button data-life-use="${arrival.id}">${arrival.verb}</button>`:''}</div>${ui.using!=='books'&&(owned('books')||ui.preview==='books')?`<div class="life-book-shelf"><img class="life-book-cover" src="assets/deal-life-prop-book.webp" alt="">《沿街走走》${owned('books')?`<button data-life-use="books">接着读 · 第 ${(state.personalLife.readingPage||0)+1} 篇</button>`:' · 翻看封面，尚未购买'}</div>`:''}${lifeRitual(state,ui)}${choice&&!owned(choice.id)?`<aside class="life-purchase"><h3>${choice.id==='balcony'?'改造预览':choice.id==='records'?'带回家':'试摆'}：${choice.name}</h3><p>花费 ${money(choice.price)} · ${q.cashAfter<0?'还差 '+money(-q.cashAfter):'买完还剩 '+money(q.cashAfter)}</p>${q.valid?spendingLiquidityView(state,choice.price):''}<small>从手头现金支付，只付这一次，之后使用免费。${choice.id==='balcony'?'预览':choice.id==='records'?'试听':'试摆'}不会扣钱。</small>${q.reason?'<p>'+homeEscape(q.reason)+'</p>':''}<div>${q.valid?('<button data-life-buy="'+choice.id+'" >'+(choice.id==='balcony'?'确认改造这处阳台':'买下，留给自己')+'</button>'):lifeProgressButton(q.nextStep)}<button data-life-cancel>${q.valid?'先不买':'收起预览'}</button></div></aside>`:''}<div class="life-actions">${catalogue.map(i=>owned(i.id)?`<div><strong>${i.name}</strong><button data-life-use="${i.id}" aria-pressed="${ui.using===i.id}">${ui.using===i.id?(i.id==='balcony'?'回到屋里':'放下，休息一会儿'):i.verb}</button>${['books','records','readinglamp','balcony'].includes(i.id)?'':`<button data-life-place="${i.id}">${i.id==='chair'?(state.personalLife.positions[i.id]==='inside'?'摆回窗边':'换个位置'):(state.personalLife.positions[i.id]==='inside'?'放回桌面':'移到搁架')}</button>`}</div>`:`<button data-life-preview="${i.id}">${i.name}<small>${money(i.price)} · ${i.id==='balcony'?'先看改造后的阳台':i.id==='records'?'先听听再选':'先摆进家里看看'}</small></button>`).join('')}</div><footer>手头 ${money(state.cash)} · 已为生活花了 ${money(state.personalLife?.spent||0)}。生意以外，也留一点自己喜欢的生活。</footer></section>`;
}
const homeEscape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const lifeProgressButton=q=>q&&['orders','inbox'].includes(q.tab)?'<button type="button" data-workspace-continue data-workspace-open="'+q.tab+'">'+homeEscape(q.label)+'</button>':'';
export function lifeRoomView(state,ui={},model={}){
 const angle=[0,1,2].includes(ui.angle)?ui.angle:0;
 const art=typeof model.art==='string'&&/^(assets\/deal-[a-z0-9-]+\.webp|data:image\/webp;base64,[A-Za-z0-9+/]+=*)$/.test(model.art)?model.art:'assets/deal-home-original-front.webp';
 const homeId=model.homeId||(!model.art?'home-starter':'');
 const chair=homeId==='home-starter'?lifePurchasePreview(state,'chair'):null;
 const firstChair=chair?.valid?'<div class="home-first-chair"><span>'+homeEscape(chair.item.name)+' · '+money(chair.item.price)+'</span><button type="button" data-home-first-chair>去挑阅读椅</button></div>':'';
 const panes=Object.hasOwn(homeWeatherGlass,homeId)?homeWeatherGlass[homeId]:null;
 const exterior=panes?exteriorWeatherSvg(model.weather,...panes):'';
 const q=model.sleep,show=!!ui.sleepOpen&&q?.valid;
 const sheet=show?'<section class="home-sleep-sheet" role="dialog" aria-labelledby="home-sleep-title"><h3 id="home-sleep-title">睡前看一眼</h3>'+
 (q.pending?.length?'<ul>'+q.pending.map(x=>'<li>'+homeEscape(x)+'</li>').join('')+'</ul>':'')+
 '<p>工作室日常开支 <strong>¥'+homeEscape(q.cost)+'</strong></p><button type="button" data-home-cancel>先不睡</button><button type="button" data-home-confirm>进入第 '+homeEscape(q.nextDay)+' 天</button></section>':'';
 return '<section class="home-original" aria-label="下班后的家"><header><button data-life-close type="button" aria-label="返回下班">‹ 返回下班</button><p class="home-location">'+homeEscape(model.area||'旧码头 · 工作室')+'</p><h2>'+homeEscape(model.name||'工作室起居角')+'</h2></header>'+firstChair+
 '<figure data-angle="'+angle+'"><img src="'+homeEscape(art)+'" alt="'+['房间全景','工作台近景','窗边近景'][angle]+'">'+exterior+'</figure><nav aria-label="房间视角"><button type="button" data-home-step="-1" aria-label="上一个视角">‹</button><span aria-live="polite">'+(angle+1)+' / 3</span><button type="button" data-home-step="1" aria-label="下一个视角">›</button></nav>'+
 '<div class="home-rest"><div><h3>休息</h3><small>'+(q&&!q.valid?homeEscape(q.reason):'明天是第 '+(Number.isSafeInteger(state.day)?state.day+1:'—')+' 天')+'</small></div>'+
 (q&&!q.valid?lifeProgressButton(q.nextStep):'<button type="button" data-home-sleep>睡到明天</button>')+'</div>'+sheet+
 '<details class="home-furniture"'+(ui.furnitureOpen||ui.using||ui.preview||ui.arrival?' open':'')+'><summary>家具与收藏</summary>'+furnitureView(state,{...ui,weather:model.weather})+'</details></section>';
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
export function bindLifeRoom(root,{getState,getUI,setUI:renderUI,dispatch,close,onSleepConfirm}){
 // Capture at render time, not at click time: an async sound result must not
 // steal focus back after the player has moved to another control.
 const setUI=next=>{
  const active=root.ownerDocument.activeElement;
  const attrs=['data-life-light-level','data-life-volume','data-life-track','data-life-book-step','data-life-page-step','data-life-coffee','data-life-coffee-step','data-life-reading-coffee','data-life-reading-return','data-life-sound','data-life-mute','data-life-end','data-life-use','data-life-room-use','data-life-place','data-life-preview','data-life-buy','data-life-cancel','data-life-close'];
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
 const reveal=(selector,block='nearest')=>{const el=root.querySelector(selector);el?.focus?.({preventScroll:true});el?.scrollIntoView?.({block});};
 const focusControl=selector=>root.querySelector(selector)?.focus?.({preventScroll:true});
 const end=()=>{const id=getUI().using;stopLifeSound();setUI({...getUI(),using:'',arrival:'',soundOn:false,soundError:false});focusControl(`[data-life-use="${id}"]`);};
 const use=id=>{const ending=getUI().using===id,wasPreview=getUI().preview==='records';if(wasPreview||ending&&['record','records'].includes(id))stopLifeSound();setUI({...getUI(),preview:'',using:ending?'':id,balconyTea:false,coffeeStage:id==='coffee'?'beans':getUI().coffeeStage,arrival:'',soundOn:wasPreview||ending&&['record','records'].includes(id)?false:!!getUI().soundOn,soundError:false});if(!ending){if(id==='balcony')reveal('.home-comic-frame','start');else reveal('.life-ritual');}};
 if(removeLifeVisibility)removeLifeVisibility();
 const doc=root.ownerDocument,hidden=()=>{if(doc.hidden&&lifeSound){stopLifeSound();setUI({...getUI(),soundOn:false});}};
 doc.addEventListener('visibilitychange',hidden);removeLifeVisibility=()=>doc.removeEventListener('visibilitychange',hidden);
 for(const b of root.querySelectorAll('[data-home-step]'))b.onclick=()=>{const d=Number(b.dataset.homeStep);if(d===1||d===-1)setUI({...getUI(),angle:((getUI().angle||0)+d+3)%3});};
 root.querySelector('[data-home-sleep]')?.addEventListener('click',()=>{setUI({...getUI(),sleepOpen:true});root.querySelector('[data-home-cancel]')?.focus?.();});
 root.querySelector('[data-home-cancel]')?.addEventListener('click',()=>{setUI({...getUI(),sleepOpen:false});root.querySelector('[data-home-sleep]')?.focus?.();});
 root.querySelector('[data-home-confirm]')?.addEventListener('click',()=>{stopLifeSound();onSleepConfirm?.();});
 root.querySelector('[data-home-furniture-done]')?.addEventListener('click',()=>{stopLifeSound();setUI({...getUI(),preview:'',using:'',arrival:'',soundOn:false,furnitureOpen:false});});
 root.querySelector('[data-life-close]')?.addEventListener('click',()=>{stopLifeSound();removeLifeVisibility?.();removeLifeVisibility=null;close();});
 const previewItem=id=>{stopLifeSound();setUI({...getUI(),preview:id,using:'',arrival:'',soundOn:false});reveal(id==='records'?'.life-listening':'.home-comic');};
 root.querySelector('[data-home-first-chair]')?.addEventListener('click',()=>{if(lifePurchasePreview(getState(),'chair').valid)previewItem('chair');});
 for(const e of root.querySelectorAll('[data-life-preview]'))e.onclick=()=>previewItem(e.dataset.lifePreview);
 root.querySelector('[data-life-cancel]')?.addEventListener('click',()=>{const id=getUI().preview;stopLifeSound();setUI({...getUI(),preview:'',soundOn:false});focusControl(`[data-life-preview="${id}"]`);});
 for(const e of root.querySelectorAll('[data-life-buy]'))e.onclick=()=>{const id=e.dataset.lifeBuy;if(!lifePurchasePreview(getState(),id).valid)return;stopLifeSound();dispatch({type:'BUY_LIFE_ITEM',itemId:id});if(getState().personalLife?.purchases?.some(p=>p.itemId===id)){setUI({...getUI(),preview:'',arrival:id,soundOn:false});reveal(`[data-life-use="${id}"]`);}};
 const gardenAction=(type,extra={})=>{if(getUI().using!=='balcony')return;const before=getState();dispatch({type,itemId:'balcony',...extra});if(getState()===before)return;setUI({...getUI(),balconyTea:type==='BREW_BALCONY_TEA'});reveal('.balcony-ritual');};
 for(const b of root.querySelectorAll('[data-balcony-plant]'))b.onclick=()=>gardenAction('PLANT_BALCONY',{plant:b.dataset.balconyPlant});
 root.querySelector('[data-balcony-harvest]')?.addEventListener('click',()=>gardenAction('HARVEST_BALCONY'));
 root.querySelector('[data-balcony-brew]')?.addEventListener('click',()=>gardenAction('BREW_BALCONY_TEA'));
 for(const e of root.querySelectorAll('[data-life-use]'))e.onclick=()=>use(e.dataset.lifeUse);
 for(const e of root.querySelectorAll('[data-life-room-use]')){e.onclick=()=>use(e.dataset.lifeRoomUse);e.onkeydown=event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();use(e.dataset.lifeRoomUse);}};}
 for(const e of root.querySelectorAll('[data-life-place]'))e.onclick=()=>{dispatch({type:'ARRANGE_LIFE_ITEM',itemId:e.dataset.lifePlace,position:getState().personalLife.positions[e.dataset.lifePlace]==='inside'?'window':'inside'});setUI({...getUI(),arrival:''});focusControl(`[data-life-place="${e.dataset.lifePlace}"]`);};
 for(const e of root.querySelectorAll('[data-life-light-level]'))e.onclick=()=>{
  const ui=getUI(),level=e.dataset.lifeLightLevel;
  if(!['0','1','2','3'].includes(level)||!['chair','books','readinglamp'].includes(ui.using)||!getState().personalLife?.purchases?.some(p=>p.itemId==='readinglamp'))return;
  setUI({...ui,readingLight:Number(level)});focusControl(`[data-life-light-level="${level}"]`);
 };
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
