import {sampleSvg} from './deal-room-samples.js';
import {spendingLiquidityView} from './deal-room-spending.js';
import {officePreview,officeCompletedWork,OFFICE_IMPROVEMENT} from './deal-room-office.js';
const money=n=>'¥'+n.toLocaleString('en-US');
const names={mira:'Mira 的台灯',samir:'Samir 的保温杯',ines:'Inês 的桌布'};
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
 return `<section class="office-work-memory" aria-label="自己的合作陈列"><h3>每件样品，都有一笔自己的生意</h3><div class="office-memory-picks" role="group" aria-label="翻看哪件样品">${ids.map(id=>`<button data-office-client="${id}" aria-pressed="${id===selected}">${names[id]}</button>`).join('')}</div><article class="office-memory-card" tabindex="-1"><div class="office-memory-sample">${sampleSvg(kind)}</div><div><small>${names[selected]} · 已收齐 ${index+1} / ${orders.length} 笔</small><h3>${Number.isSafeInteger(c.quantity)?c.quantity+' 件，已经交到客户手里':'这一笔合作，已经收齐货款'}</h3><ol class="office-memory-route"><li><strong>${day(c.signedDay)}</strong><span>签约 · 预付 ${value(c.deposit)}</span></li><li><strong>${day(c.deliveryDay)}</strong><span>交付 ${Number.isSafeInteger(c.quantity)?c.quantity+' 件':'货物'}</span></li><li><strong>${day(c.paymentDay)}</strong><span>收齐 · 尾款 ${value(c.balanceDue)}</span></li></ol><p class="office-memory-return">这笔留下 <strong>${value(c.netProfit)}</strong><small>货款 ${value(c.revenue)}，减去采购 ${value(c.cost)} 与期间开支 ${value(c.operatingCost)}。</small></p></div></article>${orders.length>1?`<div class="office-memory-navigation"><button data-office-order="${index-1}" data-office-order-client="${selected}" ${index===0?'disabled':''}>前一笔合作</button><span>第 ${index+1} / ${orders.length} 笔</span><button data-office-order="${index+1}" data-office-order-client="${selected}" ${index===orders.length-1?'disabled':''}>后一笔合作</button></div>`:''}<p>不是别人的成功故事。这件样品，来自你已经做成的合作。</p></section>`;
}
export function officeImprovementView(state,ui={}){
 const q=officePreview(state),modern=q.owned||ui.compare!=='original';
 const works=officeCompletedWork(state),ids=[...new Set(works.map(w=>w.clientId))].filter(id=>names[id]);
 return `<section class="office-improvement-panel"><header><div><small>让工作的地方，也合自己的心意</small><h2>${q.owned?'自己的窗边工作室':'给工作室换个布置'}</h2></div><button data-office-close>回工作室</button></header><section class="office-environment ${modern?'office-improved':''} ${ui.shade?'office-shaded':''} ${ui.rest&&modern?'office-resting':''}" aria-label="${modern?'窗边工作室布置':'现在的工作室'}"><div class="office-curtain"></div>${modern?officeEarnedDisplay(state,ui.works?ui.workClient:null):''}${modern?`<button class="office-window-control" data-office-shade aria-pressed="${!!ui.shade}">${ui.shade?'让阳光进来':'拉上纱帘'}</button><button class="office-bench-control" data-office-rest aria-pressed="${!!ui.rest}">${ui.rest?'回到桌前':'去窗边坐一会儿'}</button>${ids.length?`<button class="office-shelf-control" data-office-works aria-expanded="${!!ui.works}">熟客订单 · ${works.length} 笔</button>`:''}`:''}<p class="office-scene-note">${ui.rest&&modern?'换到窗边，给自己留一个舒服的位置。':modern?'陈列有自己的位置，窗边也留出了休息角。':'熟悉的桌子，照样能把生意做好。'}</p></section>${ui.works&&modern?officeMemoryView(state,ui):''}${!q.owned?`<div class="office-comparison"><button data-office-compare="original">现在的布置</button><button data-office-compare="improved">看看新布置</button></div><h3>${OFFICE_IMPROVEMENT.name}</h3><p>整理陈列角，添上窗边软垫休息位和纱帘。一次布置费，无后续租金。</p><p>一次花费 <strong>${money(q.price)}</strong> · ${q.cashAfter>=0?'布置完还剩 '+money(q.cashAfter):'还差 '+money(q.shortfall)}</p>${q.valid?spendingLiquidityView(state,q.price):''}<div class="office-purchase-actions"><button data-office-buy ${q.valid?'':'disabled'}>就按这个布置</button><button data-office-close>先不花这笔钱</button></div>`:'<p>不用赶着接下一单。拉上纱帘，或到窗边歇一会儿。</p>'}<small>手头 ${money(state.cash)}</small></section>`;
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
