import {LIFE_ITEMS,lifePurchasePreview} from './deal-room-life.js';
const money=n=>'¥'+Number(n).toLocaleString('zh-CN');
/** All SVG and copy are authored constants; imported save strings never enter HTML. */
export function lifeRoomArt(state,{using='',preview=''}={}){
 const owns=id=>state.personalLife?.purchases?.some(p=>p.itemId===id)||preview===id;
 const x=id=>state.personalLife?.positions?.[id]==='inside'?65:0;
 return `<svg class="life-room" viewBox="0 0 680 360" role="img" aria-label="下班后的家：${owns('chair')?'阅读椅':'折叠椅'}、${owns('coffee')?'咖啡机':'空台面'}、${owns('record')?'唱片机':'空搁架'}"><defs><linearGradient id="life-sky" x2="0" y2="1"><stop stop-color="#283e5b"/><stop offset="1" stop-color="#d59b80"/></linearGradient></defs><path fill="#e8dac6" d="M0 0h680v360H0z"/><path fill="#bea184" d="M0 265h680v95H0z"/><path fill="#f5e7cc" d="M0 265h680v5H0z"/><path fill="url(#life-sky)" stroke="#f5efe5" stroke-width="10" d="M40 25h240v193H40z"/><path stroke="#f5efe5" stroke-width="5" d="M160 25v193M40 125h240"/><path fill="#f8df94" d="M215 63a15 15 0 1 0 0 30a19 19 0 0 1 0-30"/><path fill="#52616f" d="M45 170h35v45H45zm45-20h45v65H90zm85 12h28v53h-28zm38-22h60v75h-60z"/><ellipse cx="245" cy="307" rx="185" ry="28" fill="#927b65" opacity=".22"/><path fill="#f0d6a7" d="M70 280h310l-30 48H40z"/>
 <g transform="translate(${x('chair')},0)">${owns('chair')?`<path fill="#9a583f" d="M80 206q0-30 30-30h92q30 0 30 30v64H80z"/><path fill="#c98059" d="M75 225q-15 0-15 20v40h185v-40q0-20-15-20v31H75z"/><path fill="#614c3d" d="M80 285h9v25h-9zm137 0h9v25h-9z"/><path fill="#e4c395" d="M107 200h70v45h-70z"/>`:'<path stroke="#7a6a58" stroke-width="8" fill="#d5c2a3" d="M100 210h90v50h-90zm0 100 90-50m-90 0 90 50"/>'}${using==='chair'?'<path fill="#fff9e9" stroke="#80664a" d="M118 237q20-8 37 0q20-8 37 0v35q-18-8-37 0q-18-8-37 0z"/>':''}</g>
 <path fill="#6f5848" d="M390 247h235v12H390zm12 12h10v67h-10zm202 0h10v67h-10z"/><path fill="#d5b185" d="M375 241h260v9H375z"/>
 ${owns('coffee')?`<g transform="translate(${x('coffee')*-1},0)"><path fill="#456c67" d="M420 183h64v57h-64z"/><path fill="#c4c6b9" d="M430 195h44v7h-44zm-1 32h47v10h-47z"/><path fill="#f4e6cf" d="M442 211h20v18h-20z"/><circle cx="474" cy="190" r="3" fill="#f6cf7b"/>${using==='coffee'?'<path class="life-steam" fill="none" stroke="#fff8df" stroke-width="3" d="M446 208q-10-8 0-16t0-16m10 30q10-8 0-16"/>':''}</g>`:''}
 <path stroke="#8e7155" stroke-width="7" d="M384 124h240"/>
 ${owns('record')?`<g transform="translate(${x('record')*-1},0)"><path fill="#885f46" d="M508 210h99v30h-99z"/><ellipse cx="555" cy="212" rx="34" ry="13" fill="#303638"/><g class="${using==='record'?'life-disc':''}"><path stroke="#a7ac9c" d="M538 204l34 16m-35-1 33-14"/><ellipse cx="555" cy="212" rx="7" ry="3" fill="#e0a568"/></g><path stroke="#d7cbaf" stroke-width="3" fill="none" d="M595 215v-12l-25 13"/></g>`:''}
 <path fill="#607b57" d="M330 235q-45-50-30-70q35 15 30 70q5-75 30-80q20 25-30 80"/><path fill="#b77c5c" d="M310 230h40l-8 42h-24z"/>
 </svg>`;
}
export function lifeRoomView(state,ui={}){
 const owned=id=>state.personalLife?.purchases?.some(p=>p.itemId===id);
 const choice=LIFE_ITEMS.find(i=>i.id===ui.preview),q=choice?lifePurchasePreview(state,choice.id):null;
 const active=LIFE_ITEMS.find(i=>i.id===ui.using&&owned(i.id));
 return `<section class="life-panel" aria-label="下班后的家"><header><div><small>赚到的钱，也可以花在自己身上</small><h2>今晚不谈订单</h2></div><button data-life-close>回工作室</button></header>${lifeRoomArt(state,ui)}<p role="status">${active?({chair:'把书翻开，今晚没有需要签字的地方。',coffee:'热气升起来了。这杯留给自己。',record:'唱片轻轻转起来。可以什么也不赶。'}[active.id]):'窗外天色暗下来。什么也不买，也可以在这里坐一会儿。'}</p><div class="life-actions">${LIFE_ITEMS.map(i=>owned(i.id)?`<div><strong>${i.name}</strong><button data-life-use="${i.id}" aria-pressed="${ui.using===i.id}">${ui.using===i.id?'放下，休息一会儿':i.verb}</button><button data-life-place="${i.id}">${state.personalLife.positions[i.id]==='inside'?'摆回窗边':'换个位置'}</button></div>`:`<button data-life-preview="${i.id}">${i.name}<small>${money(i.price)} · 先摆进家里看看</small></button>`).join('')}</div>${choice&&!owned(choice.id)?`<aside class="life-purchase"><h3>试摆：${choice.name}</h3><p>${choice.detail}</p><p>花费 ${money(choice.price)} · 买后可用资金 ${money(q.cashAfter)}</p><small>从手头现金支付，只付这一次，之后使用免费。试摆不会扣钱。</small><div><button data-life-buy="${choice.id}" ${q.valid?'':'disabled'}>${q.valid?'买下，留给自己':q.reason}</button><button data-life-cancel>先不买</button></div></aside>`:''}<footer>手头 ${money(state.cash)} · 已为生活花了 ${money(state.personalLife?.spent||0)}。生意以外，也留一点自己喜欢的生活。</footer></section>`;
}
export function bindLifeRoom(root,{getState,getUI,setUI,dispatch,close}){
 root.querySelector('[data-life-close]')?.addEventListener('click',close);
 for(const e of root.querySelectorAll('[data-life-preview]'))e.onclick=()=>setUI({...getUI(),preview:e.dataset.lifePreview,using:''});
 root.querySelector('[data-life-cancel]')?.addEventListener('click',()=>setUI({...getUI(),preview:''}));
 for(const e of root.querySelectorAll('[data-life-buy]'))e.onclick=()=>{dispatch({type:'BUY_LIFE_ITEM',itemId:e.dataset.lifeBuy});setUI({...getUI(),preview:''});};
 for(const e of root.querySelectorAll('[data-life-use]'))e.onclick=()=>setUI({...getUI(),using:getUI().using===e.dataset.lifeUse?'':e.dataset.lifeUse});
 for(const e of root.querySelectorAll('[data-life-place]'))e.onclick=()=>dispatch({type:'ARRANGE_LIFE_ITEM',itemId:e.dataset.lifePlace,position:getState().personalLife.positions[e.dataset.lifePlace]==='inside'?'window':'inside'});
}
