import {sampleSvg} from './deal-room-samples.js';
import {spendingLiquidityView} from './deal-room-spending.js?v=37';
import {officePreview,officeCompletedWork,OFFICE_IMPROVEMENT} from './deal-room-office.js';
const money=n=>'¥'+n.toLocaleString('en-US');
const names={mira:'米拉的台灯',samir:'萨米尔的保温杯',ines:'伊内斯的桌布'};
export function officeEarnedDisplay(state,selected){
 const ids=new Set(officeCompletedWork(state).map(work=>work.clientId));
 const positions={mira:{kind:'lamp',box:[590,73,80,80]},samir:{kind:'cup',box:[599,190,70,55]},ines:{kind:'linen',box:[563,292,145,40]}};
 const art=Object.entries(positions).filter(([id])=>ids.has(id)).map(([id,{kind,box}])=>`<svg data-office-earned="${id}" class="${selected===id?'office-earned-selected':''}" x="${box[0]}" y="${box[1]}" width="${box[2]}" height="${box[3]}" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">${sampleSvg(kind)}</svg>`).join('');
 return art?`<svg class="office-earned-art" viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">${art}</svg>`:'';
}
/** Read the contracts already on the shelf. Browsing never changes a contract or saved state. */
export function officeMemoryView(state,ui={}){
 const paid=(state.contracts||[]).filter(c=>c.status==='paid'&&Object.hasOwn(names,c.clientId));
 const ids=[...new Set(paid.map(c=>c.clientId))];if(!ids.length)return '';
 const selected=ids.includes(ui.workClient)?ui.workClient:ids[0],orders=paid.filter(c=>c.clientId===selected);
 const index=Number.isInteger(ui.workIndex)?Math.max(0,Math.min(orders.length-1,ui.workIndex)):orders.length-1,c=orders[index];
 const value=n=>Number.isSafeInteger(n)?money(n):'未记录',day=n=>Number.isSafeInteger(n)?`第 ${n} 天`:'未记录';
 const kind={mira:'lamp',samir:'cup',ines:'linen'}[selected];
 return `<section class="office-work-memory" aria-label="已交付订单的陈列柜"><h3>陈列柜里的订单</h3><div class="office-memory-picks" role="group" aria-label="翻看哪件样品">${ids.map(id=>`<button data-office-client="${id}" aria-pressed="${id===selected}">${names[id]}</button>`).join('')}</div><article class="office-memory-card" tabindex="-1"><div class="office-memory-sample">${sampleSvg(kind)}</div><div><small>${names[selected]} · 已收齐 ${index+1} / ${orders.length} 笔</small><h3>${Number.isSafeInteger(c.quantity)?c.quantity+' 件，已经交到客户手里':'这一笔合作，已经收齐货款'}</h3><ol class="office-memory-route"><li><strong>${day(c.signedDay)}</strong><span>${c.deposit>0?"签约 · 定金 "+value(c.deposit):"签约"}</span></li><li><strong>${day(c.deliveryDay)}</strong><span>交付 ${Number.isSafeInteger(c.quantity)?c.quantity+' 件':'货物'}</span></li><li><strong>${day(c.paymentDay)}</strong><span>${c.deposit>0?"尾款":"货款"}已收 · ${value(c.balanceDue)}</span></li></ol><p class="office-memory-return">这笔留下 <strong>${value(c.netProfit)}</strong><small>货款 ${value(c.revenue)}，减去采购 ${value(c.cost)} 与期间开支 ${value(c.operatingCost)}。</small></p></div></article>${orders.length>1?`<div class="office-memory-navigation"><button data-office-order="${index-1}" data-office-order-client="${selected}" ${index===0?'disabled':''}>前一笔合作</button><span>第 ${index+1} / ${orders.length} 笔</span><button data-office-order="${index+1}" data-office-order-client="${selected}" ${index===orders.length-1?'disabled':''}>后一笔合作</button></div>`:''}</section>`;
}
export function officeImprovementView(state,ui={}){
 const q=officePreview(state),modern=q.owned||ui.compare!=='original';
 const works=officeCompletedWork(state),ids=[...new Set(works.map(w=>w.clientId))].filter(id=>names[id]);
 const situation=modern?(ui.rest?'窗边休息角':'窗边工作室'):'现在的工作室';
 const lighting=modern?(ui.shade?'纱帘已拉上':'自然光'):'原布置';
 return `<section class="office-improvement-panel room-edition">
 <header class="room-heading"><div><small>工作室 / ${q.owned?'已布置':'布置预览'}</small><h2>${q.owned?'自己的窗边工作室':'给工作室换个布置'}</h2></div><button class="room-back" data-office-close>${q.owned?'回工作室':'先不买'}</button></header>
 <figure class="room-picture"><div class="office-environment ${modern?'office-improved':''} ${ui.shade?'office-shaded':''} ${ui.rest&&modern?'office-resting':''}" role="img" aria-label="${situation}，${lighting}"><div class="office-curtain"></div>${modern?officeEarnedDisplay(state,ui.works?ui.workClient:null):''}</div>
 <figcaption class="room-caption"><b>${situation}</b><span>${lighting}</span></figcaption>
 ${!q.owned?`<div class="office-comparison" role="group" aria-label="比较布置"><button data-office-compare="original" aria-pressed="${!modern}">现在的布置</button><button data-office-compare="improved" aria-pressed="${modern}">窗边新布置</button></div>`:''}</figure>
 <aside class="room-side">
 ${!q.owned?`<section class="room-purchase"><h3>${OFFICE_IMPROVEMENT.name}</h3><p>陈列柜、窗边软垫和纱帘。只付这一次，不加租金。</p><div class="room-cost"><small>一次花费</small><strong>${money(q.price)}</strong></div><p class="room-balance">${q.cashAfter>=0?'布置完还剩 '+money(q.cashAfter):'还差 '+money(q.shortfall)}</p>${q.valid?spendingLiquidityView(state,q.price):''}<button class="room-primary" data-office-buy ${q.valid?'':'disabled'}>就按这个布置</button></section>`:''}
 ${modern?`<section class="room-interact"><h3>${q.owned?'在工作室':'先体验一下'}</h3><div class="room-actions"><button data-office-shade aria-pressed="${!!ui.shade}">${ui.shade?'拉开纱帘':'拉上纱帘'}</button><button data-office-rest aria-pressed="${!!ui.rest}">${ui.rest?'回到桌前':'去窗边坐坐'}</button></div>
 ${ids.length?`<button class="room-disclosure" data-office-works aria-expanded="${!!ui.works}">${ui.works?'收起':'翻看'}熟客订单 · ${works.length} 笔</button>`:''}</section>`:''}
 </aside>${ui.works&&modern?officeMemoryView(state,ui):''}</section>`;
}
export function bindOfficeImprovement(root,state,ui,dispatch,render,close){
 root.querySelectorAll('[data-office-close]').forEach(b=>b.addEventListener('click',close));
 root.querySelectorAll('[data-office-compare]').forEach(b=>b.addEventListener('click',()=>{ui.compare=b.dataset.officeCompare;ui.rest=false;ui.works=false;render();root.querySelector('[data-office-compare="'+ui.compare+'"]')?.focus();}));
 for(const key of ['shade','rest','works'])root.querySelector('[data-office-'+key+']')?.addEventListener('click',()=>{ui[key]=!ui[key];render();root.querySelector('[data-office-'+key+']')?.focus();});
 root.querySelectorAll('[data-office-client]').forEach(b=>b.addEventListener('click',()=>{
  const id=b.dataset.officeClient;if(!(state.contracts||[]).some(c=>c.status==='paid'&&c.clientId===id&&Object.hasOwn(names,id)))return;
  ui.workClient=id;ui.workIndex=undefined;render();root.querySelector('[data-office-client="'+id+'"]')?.focus({preventScroll:true});
 }));
 root.querySelectorAll('[data-office-order]').forEach(b=>b.addEventListener('click',()=>{
  const id=b.dataset.officeOrderClient,index=Number(b.dataset.officeOrder),count=(state.contracts||[]).filter(c=>c.status==='paid'&&c.clientId===id).length;
  if(!Object.hasOwn(names,id)||!Number.isInteger(index)||index<0||index>=count)return;
  ui.workClient=id;ui.workIndex=index;render();root.querySelector('.office-memory-card')?.focus({preventScroll:true});
 }));
 root.querySelector('[data-office-buy]')?.addEventListener('click',()=>{if(officePreview(state).valid){dispatch({type:'BUY_OFFICE_IMPROVEMENT'});root.querySelector('[data-office-shade]')?.focus();}});
}
