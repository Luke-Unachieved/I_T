import {openingDialogueQuote} from './deal-room-opening-dialogue.js';
import {travelEpilogue} from './deal-room-outings-travel-extra.js';
import {outingSceneArt} from './deal-room-outings-art.js';
import {OUTING_COMPANIONS,OUTING_TRIPS,outingTrip,friendEvent,friendOutingEcho} from './deal-room-outings-content.js';
import {outingSummary,outingMoment,availableFriendEvents,previewOutingTrip,previewFriendOuting} from './deal-room-outings.js';
const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>Number.isSafeInteger(n)?'¥'+n.toLocaleString('zh-CN'):'—';
const price=n=>n===0?'免费':money(n);
const friendBy=id=>OUTING_COMPANIONS.find(c=>c.id===id);
const sections=['menu','trips','friends'];
const fresh=(section='menu')=>({screen:sections.includes(section)?section:'menu',tripId:null,companionId:null,friendId:null,eventId:null,choiceId:null,page:0,confirm:null});
export function openOutings(ui,section='menu'){ui.outings=fresh(section);return ui.outings;}
const button=(act,value,label,attrs='')=>`<button type="button" data-oo="${e(act)}"${value!=null?` data-oo-id="${e(value)}"`:''}${attrs?' '+attrs:''}>${label}</button>`;
const back=(label,act)=>button(act,null,e(label),'class="oo-back"');
// Old drawings show ambiguous close-up hands during first-person choices.
const observerOnlyFrames=new Set(['trip:paper-boat:fold','trip:pottery:center','trip:tidepool:map']);
function artView(assets,key,label){
 if(observerOnlyFrames.has(key))key=key.split(':').slice(0,2).join(':');
 const trip=/^trip:([a-z-]+)(?::([a-z-]+))?$/.exec(key);
 const src=assets&&Object.hasOwn(assets,key)?assets[key]:trip?outingSceneArt(trip[1],trip[2]??null):'';
 // Optional first-party raster only. Missing scene art stays text-first, no
 // substituted location/character art or external image request.
 if(typeof src!=='string'||!(/^(?:\.\/)?assets\/[A-Za-z0-9_/-]+\.(?:webp|png|jpe?g)$/i.test(src)||/^data:image\/(?:webp|png|jpeg);base64,[A-Za-z0-9+/]+=*$/i.test(src)))return '';
 return `<figure class="oo-art"><img src="${e(src)}" alt="${e(label)}"></figure>`;
}
function panel(s,contents){
 return `<section class="outings-room" data-outings-panel aria-label="下班出门">${contents}</section>`;
}
const title=(kicker,name,intro='')=>`<header class="oo-heading">${kicker?`<small>${e(kicker)}</small>`:''}<h2>${e(name)}</h2>${intro?`<p>${e(intro)}</p>`:''}</header>`;
function people(current,mode){
 const trip=mode==='travel',choices=[...(trip?[{id:null,name:'独自去'}]:[]),...OUTING_COMPANIONS];
 return `<fieldset class="oo-people"><legend>${trip?'谁一起去？':'想约谁？'}</legend>${choices.map(c=>button(trip?'companion':'friend',c.id??'solo',e(c.name),`aria-pressed="${current===c.id}"`)).join('')}</fieldset>`;
}
const comicRecord='assets/deal-outing-comic-record.webp',comicRehearsal='assets/deal-outing-comic-rehearsal.webp';
const comicChess='assets/deal-outing-comic-chess.webp',comicRepair='assets/deal-outing-comic-repair.webp';
const openingComics=Object.freeze({
 'fang-stool':'assets/deal-outing-comic-fang-stool.webp',
 'liang-proof':'assets/deal-outing-comic-liang-proof.webp',
 'tao-radio':'assets/deal-outing-comic-tao-radio.webp',
 'xu-map':'assets/deal-outing-comic-xu-map.webp',
 'fang-stool-fit':'assets/deal-outing-comic-fang-stool-fit.webp',
 'liang-proof-print':'assets/deal-outing-comic-liang-proof-print.webp',
 'tao-radio-call':'assets/deal-outing-comic-tao-radio-call.webp',
 'xu-map-walk':'assets/deal-outing-comic-xu-map-walk.webp',
 'fang-stool-note':'assets/deal-outing-comic-fang-stool-note.webp',
 'liang-proof-voice':'assets/deal-outing-comic-liang-proof-voice.webp',
 'tao-radio-tape':'assets/deal-outing-comic-tao-radio-tape.webp',
 'xu-map-bell':'assets/deal-outing-comic-xu-map-bell.webp',
 'library-shelf':'assets/deal-outing-reel-library-shelf.webp',
 'old-cinema':'assets/deal-outing-reel-old-cinema.webp',
 'flower-market':'assets/deal-outing-reel-flower-market.webp',
 'rice-roll':'assets/deal-outing-reel-rice-roll.webp',
 'night-bus':'assets/deal-outing-reel-night-bus.webp',
 'river-bench':'assets/deal-outing-reel-river-bench.webp',
 'laundry-rain':'assets/deal-outing-reel-laundry-rain.webp',
 'dry-umbrella':'assets/deal-outing-reel-dry-umbrella.webp',
 'bag-mending':'assets/deal-outing-reel-bag-mending.webp',
 'community-vase':'assets/deal-outing-reel-community-vase.webp',
 'court-lights':'assets/deal-outing-reel-court-lights.webp',
 'terrace-dusk':'assets/deal-outing-reel-terrace-dusk.webp',
 'pier-ferry':'assets/deal-outing-reel-pier-ferry.webp',
 'pocket-park':'assets/deal-outing-reel-pocket-park.webp',
 'covered-market':'assets/deal-outing-reel-covered-market.webp',
 'stationery':'assets/deal-outing-reel-stationery.webp',
 'awning-coffee':'assets/deal-outing-reel-awning-coffee.webp',
 'station-clock':'assets/deal-outing-reel-station-clock.webp'
});
// Only reuse an establishing frame when it also shows the chosen result beat.
const verifiedFriendResultFrames=Object.freeze({
 'old-cinema:first':['old-cinema','旧影院的木售票窗，旁边是褪色的电影海报。'],
 'library-shelf:first':['library-shelf','图书馆旧藏里翻开的报纸。'],
 'rice-roll:first':['rice-roll','粉皮摊掀开蒸屉，热气从屉口升起来。'],
 'covered-market:first':['covered-market','收摊后的菜场通道，地面还带着雨水。'],
 'bag-mending:first':['assets/deal-outing-result-bag-mending-stitched.webp','旧帆布包的提带缝上了新针脚，提起来也没再扯开。'],
 'night-bus:second':['assets/deal-outing-result-night-bus-rear-window.webp','从夜班公交的后窗望出去，街灯一盏盏远了。'],
 'flower-market:first':['assets/deal-outing-result-flower-market-leaking-bucket.webp','摊主接过漏水的花桶，把鞋尖的花瓣拂掉。']
});
function friendSpeech(id,line){
 const who=friendBy(id);if(!who||!line)return '';
 return '<div class="oo-speech"><i class="oo-speaker adviser-face adviser-'+who.id+'" aria-hidden="true"></i><blockquote><b>'+e(who.name)+'</b>'+e(openingDialogueQuote(line))+'</blockquote></div>';
}
function comicFrame(ev,assets,echo){
 // The rehearsal image identifies the source of the knocks. Never show it to
 // first-time visitors or a player returning with a different companion.
 const image=ev.id==='record-shop'?comicRecord:ev.id==='chess-park'?comicChess:ev.id==='small-stage'&&echo?comicRehearsal:ev.id==='front-stoop'&&echo?comicRepair:openingComics[ev.id]||null;
 const linked=ev.id==='small-stage'||ev.id==='front-stoop';
 const injected=!linked||echo?artView(assets,'friend:'+ev.id,ev.name):'';
 if(!image&&!injected)return '<p class="oo-voiceover comic-narration">'+e(ev.blurb)+'</p>';
 const pict=image?'<img src="'+e(image)+'" alt="'+e(ev.id==='small-stage'?'排练搭档站在门边打拍，旁边的歌手照拍子接唱。':ev.name)+'">':injected.replace(/^<figure class="oo-art">|<\/figure>$/g,'');
 const caption=ev.id==='record-shop'?'打烊前最后一首。唱到一半，墙那头敲了三下。':ev.id==='small-stage'?'排练场的门开了半边。里头还没唱完。':ev.id==='chess-park'?'棋盘旁有枚蓝瓶盖。二人谁都不肯挪它。':ev.blurb;
 return '<figure class="oo-comic-frame">'+pict+'<figcaption class="comic-narration">'+e(caption)+'</figcaption></figure>';
}
function travelPanel(assets,key,label,caption){
 const art=artView(assets,key,label);if(!art)return caption?'<p class="oo-voiceover comic-narration">'+e(caption)+'</p>':'';
 return '<figure class="oo-comic-frame oo-travel-frame">'+art.replace(/^<figure class="oo-art">|<\/figure>$/g,'')+(caption?'<figcaption class="comic-narration">'+e(caption)+'</figcaption>':'')+'</figure>';
}
function tripMoment(m,detail,assets){
 const extra=travelEpilogue(m.placeId,m.choiceId,m.companionId);
 if(!extra)return travelPanel(assets,'trip:'+m.placeId+':'+m.choiceId,detail.label,detail.outcome)+friendSpeech(m.companionId,detail.companionLine);
 return '<figure class="oo-comic-frame oo-travel-frame"><img alt="'+e(extra.alt)+'" src="'+e(extra.art)+'"><figcaption class="comic-narration">'+e(extra.caption)+'</figcaption></figure>'+friendSpeech(m.companionId,extra.companionLine);
}
const storyHeading=(name,kicker='')=>'<header class="oo-story-title">'+(kicker?'<small>'+e(kicker)+'</small>':'')+'<h2>'+e(name)+'</h2></header>';
function momentView(m,assets={},includeTravelArt=true){
 const detail=outingMoment(m);if(!detail)return '';
 const reveal=m.kind!=='friend'?null:m.placeId==='record-shop'&&m.choiceId==='follow-knocks'?[comicRehearsal,'不是敲门。第三下是给歌手的拍子。']:m.placeId==='chess-park'&&m.choiceId==='ask-blue-cap'?[comicRepair,'蓝盖压住的不是一张纸，是修车师傅还没下完的棋。']:null;
 if(reveal)return '<article class="oo-story oo-story-receipt"><figure class="oo-comic-frame"><img src="'+e(reveal[0])+'" alt="'+e(detail.outcome)+'"><figcaption class="comic-narration">'+e(reveal[1])+'</figcaption></figure>'+friendSpeech(m.companionId,detail.companionLine)+'</article>';
 const verified=m.kind==='friend'?verifiedFriendResultFrames[m.placeId+':'+m.choiceId]:null;
 if(verified){
  const [art,alt]=verified;
  return '<article class="oo-story oo-story-receipt"><figure class="oo-comic-frame"><img src="'+e(openingComics[art]??art)+'" alt="'+e(alt)+'"><figcaption class="comic-narration">'+e(detail.outcome)+'</figcaption></figure>'+friendSpeech(m.companionId,detail.companionLine)+'</article>';
 }
 if(m.kind==='trip'&&includeTravelArt)return '<article class="oo-story oo-story-receipt">'+tripMoment(m,detail,assets)+'</article>';
 return `<article class="oo-moment"><small>${e(detail.label)}</small><p class="comic-narration">${e(detail.outcome)}</p>${friendSpeech(m.companionId,detail.companionLine)}</article>`;
}
function memories(book,assets){
 if(!book.mementos.length)return '';
 return `<details class="oo-memories"><summary>出游纪念（${book.mementos.length}）</summary>${book.mementos.slice().reverse().map(m=>{const v=outingMoment(m);return v?`<details><summary>第 ${e(m.day)} 天 · ${e(v.name)} · ${e(v.label)}${v.companionName?' · '+e(v.companionName):''}</summary>${momentView(m,assets)}</details>`:'';}).join('')}</details>`;
}
function menu(book,assets){
 return back('← 返回下班','close')+title('收工之后','今晚去哪儿？')+`<div class="oo-menu">${button('trips',null,'<strong>旅行</strong><span>选个地方，一个人去或带位朋友。</span>')}${button('friends',null,'<strong>约朋友</strong><span>问问朋友今晚有空做什么。</span>')}</div>`+memories(book,assets);
}
function tripList(){
 return back('← 下班时间','menu')+title('下班 / 旅行','挑个目的地','先看看行程，选好再付。')+`<div class="oo-list">${OUTING_TRIPS.map(t=>{const art=outingSceneArt(t.id);return button('trip',t.id,`${art?`<img class="oo-trip-thumb" src="${e(art)}" alt="" loading="lazy">`:''}<span class="oo-trip-copy"><strong>${e(t.name)}</strong><small>${price(t.fare)}</small></span><span class="oo-trip-arrow" aria-hidden="true">›</span>`,'class="oo-trip-link"');}).join('')}</div>`;
}
function tripPreview(s,v,t,assets){
 const q=previewOutingTrip(s,{tripId:t.id,companionId:v.companionId??null});
 const line=v.companionId?t.companionLines[v.companionId]:null;
 return back('‹ 其他目的地','trips')+'<article class="oo-story oo-travel-story">'+storyHeading(t.name,'旅行')+travelPanel(assets,'trip:'+t.id,t.name,t.blurb)+
  people(v.companionId??null,'travel')+friendSpeech(v.companionId,line)+`<div class="oo-bill"><span>整趟费用</span><strong>${price(t.fare)}</strong></div><p class="oo-note">同行不加价。</p>`+
  (q.valid?button('trip-review',null,'核对行程','class="oo-main"'):`<p class="oo-alert" role="status">${e(q.reason)}</p>`)+'</article>';
}
const pageSize=5;
function friendList(v,b){
 const who=friendBy(v.friendId),all=who?availableFriendEvents(who.id,b.mementos):[],pages=Math.ceil(all.length/pageSize),page=Number.isSafeInteger(v.page)?Math.max(0,Math.min(v.page,pages-1)):0;
 // Particular-friend scenes go first rather than making a player scan all common events.
 const completed=new Set(b.mementos.filter(x=>x.kind==='friend'&&x.companionId===v.friendId).map(x=>x.placeId));
 const order=ev=>ev.requires&&!completed.has(ev.id)?0:ev.companionId&&!completed.has(ev.id)?1:ev.companionId?2:3;
 const ranked=all.slice().sort((a,b)=>order(a)-order(b));
 const subtitle=ev=>ev.requires&&!completed.has(ev.id)?'接着上回':
  ev.choices.length&&ev.choices.every(c=>c.cost===0)?'免费':
  ev.choices.some(c=>c.cost===0)?'有免费选项':'';

 return back('← 下班时间','menu')+title('下班 / 约朋友','找位朋友出门')+people(v.friendId,'friends')+(!who?'':`<h3>和${e(who.name)}一起</h3><div class="oo-list">${ranked.slice(page*pageSize,(page+1)*pageSize).map(ev=>{const sub=subtitle(ev);return button('event',ev.id,`<strong>${e(ev.name)}</strong>${sub?`<span>${e(sub)}</span>`:''}`);}).join('')}</div><div class="oo-pages">${button('prev',null,'上一页',page?'':'disabled')}<span>${page+1} / ${pages}</span>${button('next',null,'下一页',page+1<pages?'':'disabled')}</div>`);
}
function friendPreview(v,ev,assets,book){
 const id=v.friendId,echo=friendOutingEcho(ev.id,id,book.mementos),line=echo||ev.companionLines?.[id];
 return back('‹ 其他活动','friends-back')+'<article class="oo-story"><header class="oo-story-title"><h2>'+e(ev.name)+'</h2></header>'+
 comicFrame(ev,assets,echo)+friendSpeech(id,line)+
 '<section class="oo-branches"><h3>你想怎么做？</h3><div>'+ev.choices.map(o=>button('friend-choice',o.id,'<strong>'+e(o.label)+'</strong><span>'+price(o.cost)+'</span><i aria-hidden="true">›</i>')).join('')+'</div></section></article>';
}
function currentQuote(s,v){
 if(v.confirm?.kind==='trip')return previewOutingTrip(s,{tripId:v.tripId,companionId:v.companionId??null});
 if(v.confirm?.kind==='friend')return previewFriendOuting(s,{eventId:v.eventId,choiceId:v.choiceId,companionId:v.friendId});
 return null;
}
const sameQuote=(q,snapshot)=>q?.valid&&q.revision===snapshot?.revision&&q.cost===snapshot.cost&&q.cashAfter===snapshot.cashAfter&&JSON.stringify(q.action)===JSON.stringify(snapshot.action);
function confirmView(s,v){
 const c=v.confirm,q=currentQuote(s,v);
 if(!c||!sameQuote(q,c))return title('','请重新核对',q?.reason||'现金或选择已有变化。')+back('返回选择','cancel');
 const trip=c.kind==='trip',name=trip?q.name:q.name+' · '+q.label;
 return title('最后确认',name)+`<p class="oo-who">${q.companionId?'同行：'+e(q.companionName):'独自出发'}</p><div class="oo-bill"><span>本次花费</span><strong>${price(q.cost)}</strong></div><div class="oo-bill"><span>确认后手头剩余</span><strong>${money(q.cashAfter)}</strong></div><div class="oo-confirm">${button('cancel',null,'先不去')}${button('confirm',null,q.cost?'确认支付 '+money(q.cost):'确认参加 · 免费','class="oo-main"')}</div>`;
}
function activeTrip(s,b,assets){
 const a=b.activeTrip,t=outingTrip(a.tripId);if(!t)return panel(s,title('','找不到这段行程。'));
 const perso=friendBy(a.companionId),last=b.last?.kind==='trip'&&b.last.placeId===t.id&&b.last.companionId===a.companionId&&a.seen.includes(b.last.choiceId)?b.last:null;
 const detail=last?outingMoment(last):null;
 const frame=detail?tripMoment(last,detail,assets):travelPanel(assets,'trip:'+t.id,t.name,t.blurb)+friendSpeech(a.companionId,perso&&t.companionLines[perso.id]);
 return panel(s,'<article class="oo-story oo-travel-story">'+storyHeading(t.name,perso?'与'+perso.name+'同行':'独自出发')+frame+
  '<section class="oo-branches"><h3>停下来看看</h3><div>'+t.interactions.map(i=>button('scene',i.id,'<strong>'+e(i.label)+'</strong><span>'+(a.seen.includes(i.id)?'已体验':'')+'</span><i aria-hidden="true">›</i>',a.seen.includes(i.id)?'disabled':'')).join('')+'</div></section>'+button('return',null,'结束行程，回到下班','class="oo-return"')+'</article>');
}
export function outingsView(s,ui={},assets={}){
 const v=ui.outings??fresh(),b=outingSummary(s);
 if(b.valid&&s.phase==='outing-trip'&&b.activeTrip)return activeTrip(s,b,assets);
 if(!b.valid||!b.available)return panel(s,back('← 返回下班','close')+title('下班','稍后再出门',b.reason));
 if(v.screen==='confirm')return panel(s,confirmView(s,v));
 if(v.screen==='receipt'&&b.last?.kind==='friend')return panel(s,'<header class="oo-story-title oo-receipt-title"><small>今天的记忆</small><h2>'+e(outingMoment(b.last)?.name??'约朋友')+'</h2></header>'+momentView(b.last,assets)+'<div class="oo-story-exits">'+button('friends-back',null,'再看看其他活动')+button('menu',null,'返回出门菜单')+'</div>');
 if(v.screen==='trips')return panel(s,tripList());
 const t=outingTrip(v.tripId);
 if(v.screen==='trip'&&t)return panel(s,tripPreview(s,v,t,assets));
 const ev=friendEvent(v.eventId);
 if(v.screen==='event'&&ev&&friendBy(v.friendId)&&availableFriendEvents(v.friendId,b.mementos).some(x=>x.id===ev.id))return panel(s,friendPreview(v,ev,assets,b));
 if(v.screen==='friends')return panel(s,friendList(v,b));
 return panel(s,menu(b,assets));
}
export function bindOutings(root,s,ui,rerender,dispatch,close){
 const host=root.querySelector('[data-outings-panel]');if(!host)return;
 const v=ui.outings??openOutings(ui),b=outingSummary(s);
 // Bound to the rendered panel (not document); a detached/stale confirm cannot
 // send a second charge. The reducer independently rejects stale revisions.
 host.onclick=event=>{
  if(ui.outings!==v||root.contains&&!root.contains(host))return;
  const target=event.target?.closest?.('[data-oo]');if(!target||!host.contains(target)||target.disabled)return;
  const k=target.dataset.oo,id=target.dataset.ooId;
  if(s.phase==='outing-trip'&&b.activeTrip){
   const t=outingTrip(b.activeTrip.tripId);
   if(k==='scene'&&t?.interactions.some(o=>o.id===id)&&!b.activeTrip.seen.includes(id))dispatch({type:'INTERACT_OUTING_TRIP',tripId:t.id,sceneId:id,revision:b.revision});
   if(k==='return'){openOutings(ui,'menu');dispatch({type:'RETURN_OUTING_TRIP',tripId:b.activeTrip.tripId,revision:b.revision});}return;
  }
  if(k==='close'){openOutings(ui);close?.();return;}
  if(!b.available)return;
  const show=screen=>{v.confirm=null;v.screen=screen;rerender();};
  if(sections.includes(k)){openOutings(ui,k);rerender();return;}
  if(k==='trip'&&v.screen==='trips'&&outingTrip(id)){v.tripId=id;v.companionId=null;show('trip');return;}
  if(k==='companion'&&v.screen==='trip'&&(id==='solo'||friendBy(id))){v.companionId=id==='solo'?null:id;show('trip');return;}
  if(k==='friend'&&v.screen==='friends'&&friendBy(id)){v.friendId=id;v.page=0;show('friends');return;}
  if((k==='prev'||k==='next')&&v.screen==='friends'&&friendBy(v.friendId)){const max=Math.max(0,Math.ceil(availableFriendEvents(v.friendId,b.mementos).length/pageSize)-1);v.page=Math.min(max,Math.max(0,(v.page||0)+(k==='next'?1:-1)));show('friends');return;}
  if(k==='event'&&v.screen==='friends'&&availableFriendEvents(v.friendId,b.mementos).some(x=>x.id===id)){v.eventId=id;show('event');return;}
  if(k==='friends-back'){show('friends');return;}
  if(k==='cancel'&&v.screen==='confirm'){show(v.confirm?.kind==='friend'?'event':'trip');return;}
  if((k==='trip-review'&&v.screen==='trip')||(k==='friend-choice'&&v.screen==='event')){
   const kind=k==='trip-review'?'trip':'friend';if(kind==='friend')v.choiceId=id;
   v.confirm={kind};const q=currentQuote(s,v);v.confirm={kind,revision:q?.revision,cost:q?.cost,cashAfter:q?.cashAfter,action:q?.action};v.screen='confirm';rerender();return;
  }
  if(k==='confirm'&&v.screen==='confirm'){
   const c=v.confirm,q=currentQuote(s,v);if(!sameQuote(q,c)){rerender();return;}
   v.confirm=null;v.screen=c.kind==='friend'?'receipt':'menu';dispatch(q.action);
  }
 };
}
