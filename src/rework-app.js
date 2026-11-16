import {STORAGE_KEY,PRODUCTS,ROUTES,createOpeningGame,quoteOpening,reduceOpening,normalizeOpeningSave,availableInvestments,DAILY_OPERATING_COST,currentOpeningOrders,businessCustomers,paymentOptions,berthUpgrade,cargoCapacity,outstandingPayment} from './rework-opening.js';
const root=document.querySelector('#opening');
const isolatedTrial=new URLSearchParams(location.search).get('trial')==='1';
let progressStore;try{progressStore=isolatedTrial?sessionStorage:localStorage;}catch{}
const progressKey=isolatedTrial?STORAGE_KEY+':trial':STORAGE_KEY;
let state=createOpeningGame(),selected=null,feedback=null,harborArt='';
try {const saved=JSON.parse(progressStore.getItem(progressKey));state=normalizeOpeningSave(saved)||state;}catch{}
const yuan=n=>'¥'+Math.round(n).toLocaleString('zh-CN');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const product=id=>PRODUCTS.find(p=>p.id===id)?.name||'';
const goodsShapes={
 cups:'<path d="M9 9h14l-1 18H10z" fill="#e4b45e"/><path d="M10 5h12v5H10z" fill="#416e73"/><path d="M12 12h3v12h-3z" fill="#fae7bc"/><path d="M23 12h3v10h-4" fill="none" stroke="#416e73" stroke-width="2"/>',
 lights:'<path d="M11 5h10l6 13H5z" fill="#e4b45e"/><path d="M16 18v9m-7 1h14" fill="none" stroke="#416e73" stroke-width="3"/><path d="M14 7l-3 8" stroke="#fae7bc" stroke-width="2"/>',
 textiles:'<path d="M5 11l16-7 7 6-16 8z" fill="#e9c789"/><path d="M5 11v13l7 5V18z" fill="#be8757"/><path d="M12 18l16-8v13l-16 6z" fill="#77978b"/><path d="M16 16v11m5-14v11M6 17l6 6" stroke="#f4e5bd" stroke-width="2"/>'
};
const icon=id=>`<svg class="goods-icon" viewBox="0 0 32 32" aria-hidden="true">${goodsShapes[id]||goodsShapes.cups}</svg>`;
function button(text,action,id='',extra=''){return `<button data-action="${action}" data-id="${id}" ${extra}>${text}</button>`;}
function bestQuote(o){
 const preferred=quoteOpening(state,o.id,o.deadlineDays<4?'express':'sea');
 // A faster route can need less total working capital once daily costs apply.
 // Do not hide an affordable contract merely because the default sea quote fails.
 return preferred.valid?preferred:ROUTES.map(r=>quoteOpening(state,o.id,r.id)).find(q=>q.valid)||preferred;
}
function priceSpark(id){const history=(state.priceHistory||[]).slice(-12),v=history.map(h=>h.prices[id]);if(!v.length)return '';const low=Math.min(...v)*.9,high=Math.max(...v)*1.1,pts=v.map((n,i)=>[v.length===1?34:4+i*60/(v.length-1),24-(n-low)/(high-low)*20]);return `<svg class="price-spark" viewBox="0 0 68 28" role="img" aria-label="${product(id)}实际行情，${history.map(h=>'第'+h.day+'天 '+h.prices[id]+'元').join('，')}">${pts.length>1?`<polyline points="${pts.map(p=>p.join(',')).join(' ')}" fill="none" stroke="currentColor" stroke-width="2"/>`:''}${pts.map(([x,y])=>`<circle cx="${x}" cy="${y}" r="2.5" fill="currentColor"/>`).join('')}</svg>`;}
function market(){return `<div class="market-tape"><span class="market-label">工厂现价 <small>每箱</small></span>${PRODUCTS.map(p=>`<span><i>${icon(p.id)}</i> ${p.name} <b>${yuan(state.prices[p.id])}</b>${priceSpark(p.id)}<small class="${state.nextPrices[p.id]>state.prices[p.id]?'up':'down'}">下一批 ${yuan(state.nextPrices[p.id])} ${state.nextPrices[p.id]>state.prices[p.id]?'↗':state.nextPrices[p.id]<state.prices[p.id]?'↘':'→'}</small></span>`).join('')}<small class="price-rule">交付一单换一批行情 · 已购货不变价</small></div>`;}
function currentOrders(){return currentOpeningOrders(state);}
function isBusiness(){return (state.businessRound||0)>0;}
function cargoBusy(exceptId=''){return state.orders.filter(x=>x.id!==exceptId&&['packed','shipping'].includes(x.status)).length>=cargoCapacity(state);}
function marginMovement(o,q){
 if(o.status!=='open'||state.priceHistory.length<2||!currentOrders().some(x=>['receivable','paid'].includes(x.status)))return '';
 const previous=state.priceHistory.at(-2).prices,route=q.route;
 const difference=q.profit-quoteOpening({...state,prices:previous},o.id,route).profit;
 return difference?`<span class="margin-movement ${difference>0?'better':'worse'}">本批毛利 ${difference>0?'↑ +':'↓ −'}${yuan(Math.abs(difference))}</span>`:'';
}
function orderCards(){return `<section class="order-selection ${state.stage===3&&!isBusiness()?'choice-stage':''}"><div class="section-label"><div><span>今天的生意</span><h2>${isBusiness()?`熟客又来补货。`:state.stage===3?`四笔机会，选两笔做。`:`三笔来单，先做哪笔？`}</h2></div><p>${isBusiness()?`第 ${state.businessRound} 批回头单`:state.stage===3?`还可签 ${Math.max(0,2-(state.stageSigned||0))} 笔 · 采购即签约`:`赚得多、回款快，不一定是同一笔。`}</p></div><div class="order-cards">${currentOrders().map(o=>{if(o.status==='paid')return button(`<span>✓ ${esc(o.name)}</span><b>毛利 ${yuan(o.revenue-o.purchaseCost-o.freight)}</b><small>货款收齐</small>`,'select',o.id,'class="settled-order"');if(o.status==='declined')return `<div class="order-card declined"><span class="order-tag">本轮未合作</span><h3>${esc(o.name)}</h3><small>把精力留给选中的两位客户</small></div>`;const q=bestQuote(o),paid=o.status==='paid',declined=o.status==='declined',busy=cargoBusy();return `<button class="order-card ${o.id} ${o.deadlineDays<4?'urgent':''} ${paid?'paid':''} ${declined?'declined':''}" data-action="select" data-id="${o.id}" ${declined?'disabled':''}><div class="order-top"><span class="goods">${icon(o.product)}</span><span class="order-tag">${declined?'本轮未合作':paid?'已做成':o.status==='packed'?'已配货 · 待发运':o.status==='shipping'?'货在路上':o.status==='receivable'?'尾款待收':o.deadlineDays<4?'赶在开业前':o.payLag>0?'利润高 · 账期长':'小单 · 快回款'}</span></div><h3>${esc(o.name)}</h3><p>${o.quantity} 箱${product(o.product)} · ${o.status==='open'?`接单后 ${o.deadlineDays} 天内交付`:`最晚第 ${o.deadlineDay} 天交付`}</p><div class="order-bottom"><span>${paid?'订单毛利':o.status==='receivable'?'待收':'订单毛利'} <b>${yuan(paid?o.revenue-o.purchaseCost-o.freight:o.status==='receivable'?outstandingPayment(o):q.profit)}</b></span><strong>${declined?'—':paid?'✓':o.status==='packed'?'选船 →':o.status==='shipping'?'交付 →':o.status==='receivable'?'收款 →':'配货 →'}</strong></div>${marginMovement(o,q)}<small>${declined?'把精力留给选中的两位客户':paid?'钱已到账，港口多了一位老客户':o.status==='receivable'?`第 ${o.collectionDay} 天到账，货位已腾空`:o.status==='packed'?'货已在码头，选船就能出发':o.status==='shipping'?`第 ${o.arrivalDay} 天送到客户`:busy?'泊位已满，先交付一批货':o.deadlineDays<4?'按快运估算，海运赶不上':q.route==='express'?'按快运估算，少留周转金':o.payLag?`交付后 ${o.payLag} 天收款`:'交付就收钱'}</small></button>`;}).join('')}</div></section>`;}
function runningCost(days){return Math.max(0,days)*(state.dailyOperatingCost||0);}
function advanceReceipt(o,collect=false){const target=collect?o.collectionDay:o.arrivalDay,days=Math.max(0,target-state.day),income=(collect||o.payLag===0?outstandingPayment(o):0)+state.orders.filter(x=>x.id!==o.id&&x.status==='receivable'&&x.collectionDay<=target).reduce((n,x)=>n+outstandingPayment(x),0),cost=runningCost(days);return cost||income?`<div class="cash-equation"><span>回款 <b>+${yuan(income)}</b></span><span>日常 <b>−${yuan(cost)}</b></span><strong>现金 ${income>=cost?'+':'−'}${yuan(Math.abs(income-cost))}</strong></div>`:'';}
function cashJourney(o,q){
 const start=o.shipDay??(o.arrivalDay!=null?o.arrivalDay-q.transitDays:state.day),arrival=q.arrivalDay,end=q.collectionDay,total=Math.max(1,end-start),travel=Math.max(0,arrival-start),waiting=Math.max(0,end-arrival);
 const deposit=o.depositReceived??q.deposit??0;
 const progress=Math.max(0,Math.min(100,(state.day-start)/total*100)),received=['receivable','paid'].includes(o.status);
 return `<div class="cash-journey" aria-label="第 ${start} 天出货，第 ${arrival} 天交付，第 ${end} 天回款"><div class="journey-heading"><span>${o.status==='paid'?'这笔货款已回家':'钱跟着货，什么时候回来？'}</span><b>${o.status==='paid'?'已到账':Math.max(0,end-state.day)+' 天后回款'}</b></div><div class="journey-dates"><span>出货<small>第 ${start} 天</small></span><span>收货<small>第 ${arrival} 天</small></span><span>回款<small>第 ${end} 天</small></span></div><div class="cash-track"><span class="transit-segment" style="flex:${travel||.1}">${travel} 天运输</span>${waiting?`<span class="credit-segment" style="flex:${waiting}">${waiting} 天账期</span>`:''}${['shipping','receivable'].includes(o.status)?`<i style="left:${progress}%" title="今天，第 ${state.day} 天"></i>`:''}</div><div class="journey-cash"><span>${received?'客户已收货':deposit?'自垫货款＋运费':'垫货款＋运费'}<b>${received?'货位已腾空':yuan(q.purchaseCost+q.freight-deposit)}</b></span><span>${o.status==='paid'?'总共收到':deposit?'到期收尾款':'到期收到'}<b>+${yuan(o.status==='paid'?o.revenue:q.balanceDue??o.revenue)}</b></span></div></div>`;
}
function fundingRecovery(q,busy){
 if(busy||!q.onTime||q.cashAfterReserve>=0)return '';
 const due=state.orders.filter(x=>['receivable','shipping'].includes(x.status)).sort((a,b)=>a.collectionDay-b.collectionDay)[0];
 return `<div class="funding-recovery"><b>还差 ${yuan(-q.cashAfterReserve)}</b><small>${state.dailyOperatingCost?'已计入运费与日常预留':'已计入运费'}${due?`；${esc(due.name)}的 ${yuan(outstandingPayment(due))} 在第 ${due.collectionDay} 天到账。`:''}</small>${due?button(due.status==='shipping'?(due.payLag===0?'去交付并收款':'查看这批在途货'):'查看这笔待收款','select',due.id,'class="secondary"'):''}</div>`;
}
function routeChoices(o){
 const quotes=ROUTES.map(r=>({...r,quote:quoteOpening(state,o.id,r.id)}));
 const pending=state.orders.filter(x=>x.status==='receivable'&&x.collectionDay>=state.day);
 const end=Math.max(state.day+1,...quotes.map(x=>x.quote.collectionDay),...pending.map(x=>x.collectionDay));
 const percent=day=>Math.max(0,Math.min(100,(day-state.day)/(end-state.day)*100));
 const reference=pending.length?`<div class="route-pending">${pending.map(x=>`<span>◆ 待收 ${yuan(outstandingPayment(x))} <b>第 ${x.collectionDay} 天</b></span>`).join('')}</div>`:'';
 return reference+`<div class="route-choices">${quotes.map(r=>{const x=r.quote;return button(`<span>${r.id==='sea'?'⛵':'➜'} ${r.name}<small>${x.transitDays} 天运输 · 第 ${x.arrivalDay} 天送达</small></span><strong>${yuan(x.freight)} 运费</strong><div class="route-calendar" aria-label="第 ${x.arrivalDay} 天交付，第 ${x.collectionDay} 天回款${pending.map(p=>'，已有货款第 '+p.collectionDay+' 天到账').join('')}"><div class="route-calendar-track"><i class="route-travel" style="width:${percent(x.arrivalDay)}%"></i>${o.payLag?`<i class="route-credit" style="left:${percent(x.arrivalDay)}%;width:${percent(x.collectionDay)-percent(x.arrivalDay)}%"></i>`:''}${`<i class="payment-marker" style="left:${percent(x.collectionDay)}%"><b style="transform:translateX(${percent(x.collectionDay)<20?0:percent(x.collectionDay)>80?-100:-50}%)">本单第 ${x.collectionDay} 天回款</b></i>`}${pending.map(p=>`<i class="pending-marker" style="left:${percent(p.collectionDay)}%" title="待收 ${yuan(outstandingPayment(p))}，第 ${p.collectionDay} 天"></i>`).join('')}</div></div><small>${x.valid?'毛利 '+yuan(x.profit)+(state.dailyOperatingCost?' · 到本单收款日常 '+yuan(x.operatingReserve):''):esc(x.reason)}</small>`,'SHIP',o.id,`data-route="${r.id}" ${x.valid?'':'disabled'}`);}).join('')}</div>`;
}
function paymentChoices(o){
 const options=paymentOptions(state,o.id);if(!options.length)return '';
 return `<div class="payment-choices" aria-label="回头单收款条件">${options.map(x=>button(`<b>${x.id==='cash'?'让一点，当天收':x.id==='deposit'?'收三成定金':'原价，留账期'}</b><span>${x.id==='deposit'?`${yuan(x.deposit)} 先收 · ${yuan(x.revenue-x.deposit)} 尾款${x.disabled?' · '+esc(x.reason):''}`:`${yuan(x.revenue)} · ${x.payLag?'交付后 '+x.payLag+' 天':'交付即收'}`}</span>`,'SET_PAYMENT',o.id,`data-payment-terms="${x.id}" aria-pressed="${o.paymentTerms===x.id}" class="${o.paymentTerms===x.id?'chosen':''} ${x.id==='deposit'?'deposit-option':''}" ${x.disabled?'disabled':''}`)).join('')}</div>`;
}
function businessBoard(){
 const customers=businessCustomers(state),upgrade=berthUpgrade(state);
 return `<section class="business-board"><div class="customer-ledger">${customers.map(c=>`<div>${icon(c.product)}<span>${esc(c.name)}<small>复购收齐 ${c.repeatPaid} 单 · ${c.depositUnlocked?'可收三成定金':'再做成 '+Math.max(0,c.repeatTarget-c.repeatPaid)+' 单解锁定金'}</small></span><b class="loyalty-stamps" aria-label="${c.repeatPaid}次复购">${c.depositUnlocked?'◆':'●'.repeat(Math.min(c.repeatPaid,2))+'○'.repeat(Math.max(0,2-c.repeatPaid))}</b></div>`).join('')}</div>${cargoCapacity(state)<2?button(`<span><b>再建一个泊位</b><small>两批货同时出海 · 投入 ${yuan(upgrade.cost)}</small></span><strong>${upgrade.available?'扩建 →':'留足周转'}</strong>`,'EXPAND_BERTH','','class="berth-upgrade" '+(upgrade.available?'':'disabled')):`<div class="berth-owned">两座泊位已投入使用 · 两批货可并行</div>${businessCapitalRecovery()!=null?capitalMeter(businessCapitalRecovery()):''}`}${cargoCapacity(state)<2&&!upgrade.available?`<small class="reserve">${esc(upgrade.reason)}</small>`:''}</section>`;
}
function inspector(o){
 const q=bestQuote(o),needsSettlement=!!q.canSettle,busy=cargoBusy(o.id);
 let inner='';
 if(o.status==='open')inner=`${paymentChoices(o)}<div class="deal-facts"><div><small>现在配货</small><b>${yuan(q.purchaseCost)}</b></div><div><small>${q.route==='express'?'快运后':'海运后'}毛利</small><b class="positive">${yuan(q.profit)}</b></div><div><small>货款回到手里</small><b>${q.collectionDay-state.day} 天</b></div></div><p class="decision-note">${o.deadlineDays<4?'店铺马上开张。海运便宜，但赶不上这笔生意。':o.payLag>0?`货交出去，还要等 ${o.payLag} 天才收款。先看看手里的现金。`:'少占一点资金，交付当天就能接着做下一单。'}</p>${button(`${state.stage===3&&!isBusiness()?'签约并采购':'采购'} ${o.quantity} 箱 · ${yuan(q.purchaseCost)}`,'PURCHASE',o.id,`class="primary" ${busy||!q.valid?'disabled':''}`)}${q.deposit?`<div class="deposit-receipt">签约先收 <b>+${yuan(q.deposit)}</b><span>本次采购净垫 ${yuan(q.purchaseCost-q.deposit)}</span></div>`:''}<small class="reserve">${busy?'泊位已满，先交付一批货。':q.valid?`${q.discountSavings?'仓库省下 '+yuan(q.discountSavings)+' 采购费。':''}共留 ${yuan(q.freight+(q.otherFreightReserve||0))} 运费，${state.dailyOperatingCost?`共留 ${yuan(q.sharedOperatingReserve??q.operatingReserve)} 日常支出，周转余 ${yuan(q.cashAfterReserve)}。`:`发货后手里还有 ${yuan(q.cashAfterPayment)}。`}`:q.onTime&&q.cashAfterReserve<0?'':esc(q.reason)}</small>${fundingRecovery(q,busy)}`;
 else if(o.status==='packed')inner=`<p class="decision-note">货已配好。选一条能赶上交期的路线。</p>${routeChoices(o)}<small class="reserve">最晚第 ${o.deadlineDay} 天交付。采购价已经锁定。</small>`;
 else if(o.status==='shipping')inner=`<div class="deal-facts"><div><small>客户收到货</small><b>第 ${o.arrivalDay} 天</b></div><div><small>${o.depositReceived?'待收尾款':'货款'}</small><b>${yuan(outstandingPayment(o))}</b></div><div><small>到账</small><b>${o.payLag?'交付后 '+o.payLag+' 天':'交付当天'}</b></div></div>${needsSettlement?button(`交付并等回款 · 推进 ${Math.max(0,o.collectionDay-state.day)} 天`,'SETTLE',o.id,'class="primary"'):button(`送到客户手里 · 推进 ${Math.max(0,o.arrivalDay-state.day)} 天`,'DELIVER',o.id,'class="primary"')}${advanceReceipt(o,needsSettlement)}`;
 else if(o.status==='receivable'){
  const target=Math.max(state.day,o.collectionDay),blocker=state.orders.filter(x=>x.id!==o.id&&((x.status==='shipping'&&x.arrivalDay<target)||(x.status==='packed'&&target>state.day))).sort((a,b)=>(a.arrivalDay??Infinity)-(b.arrivalDay??Infinity))[0];
  const activeElsewhere=state.orders.some(x=>x.id!==o.id&&['packed','shipping'].includes(x.status));
  inner=`<div class="receipt"><span>${o.depositReceived?'客户已签收 · 等尾款':'客户已签收'}</span><b>${yuan(outstandingPayment(o))}</b><small>第 ${o.collectionDay} 天到账</small></div><p class="decision-note">${blocker?`${esc(blocker.name)}${blocker.status==='shipping'?'第 '+blocker.arrivalDay+' 天到港，先交付这批货。':'还在码头，先把这批货安排出发。'}`:currentOrders().some(x=>x.status==='open')?'货位已经空出来。先接别的生意，还是等这笔钱？':activeElsewhere?'另一个泊位的货还在办理，这笔到期货款可以先收。':'这批生意只剩回款，货物已交付，收到尾款就完成。'}</p>${blocker?button(blocker.status==='shipping'?'去交付这批货':'去安排这批货','select',blocker.id,'class="primary"'):button(`${o.collectionDay<=state.day?'收取到期货款':`等到收款 · 推进 ${o.collectionDay-state.day} 天`}`,'COLLECT',o.id,'class="primary"')}${blocker?'':advanceReceipt(o,true)}${currentOrders().some(x=>x.status==='open')?button('先看看下一笔生意','back','','class="secondary"'):''}`;
 }
 else inner=`<div class="receipt"><span>这一单，做成了</span><b>毛利 ${yuan(o.revenue-o.purchaseCost-o.freight)}</b><small>${o.quantity} 箱${product(o.product)}已经送达 · 货款全部收到</small></div>${button('回码头挑下一单','back','','class="primary"')}`;
 return `<section class="inspector"><header><div><span>${o.status==='open'?'先配货，再安排船':o.status==='packed'?'下一步 · 选船':o.status==='shipping'?'下一步 · 交付':o.status==='receivable'?'等钱回家':'成交记录'}</span><h2>${esc(o.name)} <small>${o.quantity} 箱${product(o.product)}</small></h2></div>${button('×','back','','aria-label="回到全部生意" class="close"')}</header>${['open','shipping','receivable'].includes(o.status)?cashJourney(o,q):''}${inner}</section>`;
}
function investmentResult(){
 const orders=state.orders.filter(o=>(o.stage||1)>=2);
 if(state.investment==='warehouse'){
  const saved=orders.reduce((n,o)=>n+(o.basePurchaseCost!=null&&o.purchaseCost!=null?o.basePurchaseCost-o.purchaseCost:0),0);
  return {value:saved,label:'货仓累计省采购',detail:`原货仓投入 ¥700 · 按已采购货物累计`};
 }
 if(state.investment==='express'){
  const shipped=orders.filter(o=>o.route==='express'&&o.freight!=null),saved=shipped.reduce((n,o)=>n+Math.max(0,300-o.freight),0),days=shipped.reduce((n,o)=>n+Math.max(0,2-o.transitDays),0);
  return {value:saved,label:'快线累计省运费',detail:`比普通快运少用 ${days} 天 · 原快线投入 ¥700`};
 }
 return null;
}
function sceneArt(){
 if(!harborArt)return '<img src="assets/rework-harbor.svg" alt="港口正在展开" draggable="false">';
 const addition=state.investment==='warehouse'?'<g class="new-business-asset"><use href="#warehouse" transform="translate(50 397) scale(.43)"/><path d="M53 466v-43m0 0h27l-6 8 6 8H53" stroke="#6c7152" stroke-width="2" fill="#eed27e"/></g>':state.investment==='express'?'<g class="new-business-asset express-terminal" transform="translate(486 365)"><title>固定快线专用码头</title><path d="M-40 24L25-12 119 39 52 79z" fill="#e6c782" stroke="#ad8650" stroke-width="3"/><path d="M52 79v14l67-39V39M-40 24v14l92 55V79" fill="#bb975d"/><path d="M-16 6v-43l41-22 52 28v44L36 36z" fill="#f5e7bd"/><path d="M36-14l41-17v44L36 36z" fill="#d2b77e"/><path d="M-24-39l49-28 61 32-50 28z" fill="#d8a33f"/><path d="M-7-29l22 12V0L-7-12m51-1l24-13v18L44 6" fill="#456e75"/><path d="M22 8l12 7-12 7m46 13l12 7-12 7" fill="none" stroke="#a46d2d" stroke-width="5"/><path d="M91 18v-82m0 0h45l-10 12 10 12H91" stroke="#3f6469" stroke-width="3" fill="#e9b94f"/><path d="M100-52h21m-6-6l6 6-6 6" fill="none" stroke="#466c68" stroke-width="3"/></g>':'';
 const activeOrders=state.orders.filter(o=>['packed','shipping'].includes(o.status));
 const completed=state.orders.filter(o=>o.status==='paid').slice(-8);
 const customerFlags=completed.map((o,i)=>`<g transform="translate(${930+i*26} ${206+i*2})"><path d="M0 0v-36" stroke="#42676b" stroke-width="3"/><path d="M0-36h19l-4 8 4 8H0z" fill="${{cups:'#e4b45e',lights:'#be7754',textiles:'#527e70'}[o.product]}"/></g>`).join('');
 const secondPier=cargoCapacity(state)>1?'<g class="second-pier"><title>新增第二泊位</title><path d="M426 516l104-60 205 112-105 61z" fill="#eddbac" stroke="#b49b67" stroke-width="3"/><path d="M426 516v17l204 113 105-61v-17L630 629z" fill="#b89a68"/><path d="M480 514l145 81m-115-99l145 81m-115-99l145 81" stroke="#d1ba86" stroke-width="3"/><path d="M565 566v-15m57 46v-16m62-16v-16" stroke="#42676b" stroke-width="8"/></g>':'';
 const partners=isBusiness()?businessCustomers(state).map((c,i)=>`<g class="partner-sign ${c.depositUnlocked?'trusted-client':''}" transform="translate(${i?1080:955} ${i?205:142})"><title>${esc(c.name)}，${c.repeatPaid}笔复购${c.depositUnlocked?'，定金合作已解锁':''}</title><path d="M0-20l30-17 31 17v42L30 39 0 22z" fill="${c.depositUnlocked?'#e8bc56':'#e9d7a8'}" stroke="${c.depositUnlocked?'#a7752d':'#af9770'}" stroke-width="3"/><svg x="10" y="-19" width="41" height="41" viewBox="0 0 32 32" aria-hidden="true">${goodsShapes[c.product]}</svg><circle cx="21" cy="25" r="4" fill="${c.repeatPaid>=1?'#466f5f':'#c3b58e'}"/><circle cx="40" cy="25" r="4" fill="${c.repeatPaid>=2?'#466f5f':'#c3b58e'}"/></g>`).join(''):'';
 let art=harborArt.replace('</svg>',addition+`<g aria-hidden="true">${isBusiness()?partners:customerFlags}</g>`+'</svg>');
 const template=art.match(/<g class="berthed-vessel"[\s\S]*?<\/g>/)?.[0];
 if(template){
  let lanes='';const ships=Array.from({length:cargoCapacity(state)},(_,slot)=>{
   const active=activeOrders.find((o,i)=>(o.berthIndex??i)===slot),shipping=active?.status==='shipping',fast=shipping&&active.route==='express';
   let ship=template.replace('transform="translate(661 430)"',`transform="translate(${slot?850:661} ${slot?525:430})"`);
   if(shipping){
    lanes+=`<g class="shipping-lane ${fast?'fast':'sea'}" aria-hidden="true"><path d="M${slot?965:780} ${slot?485:398}Q${slot?1120:900} ${slot?410:350} 1020 272" fill="none" stroke="${fast?'#fff0b4':'#e3f0dd'}" stroke-width="${fast?5:3}" stroke-dasharray="${fast?'0':'8 10'}"/>${fast?`<path d="M${slot?1050:875} ${slot?390:333}l18 7-4 19" fill="none" stroke="#b47b2d" stroke-width="6"/>`:''}</g>`;
    ship=ship.replace('<use class="vessel-cargo"',`${fast?'<path d="M115-23v-47m0 0h42l-12 10 12 10h-42" fill="#efbd51" stroke="#456c71" stroke-width="2"/>':''}<svg x="132" y="-12" width="46" height="46" viewBox="0 0 32 32" aria-hidden="true">${goodsShapes[active.product]}</svg><use class="vessel-cargo"`);
   }
   ship=ship.replace('class="berthed-vessel"',`class="berthed-vessel ${shipping?'in-transit':''} ${feedback?.action==='SHIP'&&feedback.orderId===active?.id?'departing-ship':''} ${active?'scene-object':''}" ${active?`role="button" tabindex="0" data-action="select" data-id="${active.id}" aria-label="${slot+1}号泊位，${esc(active.name)}，${shipping?'查看交付':'选船发运'}"`:''}`);
   return ship;
  }).join('');
  art=art.replace(template,secondPier+lanes+ships);
 }
 return art;
}
function berthControls(){
 const active=state.orders.filter(o=>['packed','shipping'].includes(o.status));
 return `<div class="berth-controls">${Array.from({length:cargoCapacity(state)},(_,slot)=>{const order=active.find((o,i)=>(o.berthIndex??i)===slot);return button(`<span>${slot+1}号泊位</span><b>${order?product(order.product)+' · '+order.quantity+'箱':'空位'}</b><small>${order?order.status==='shipping'?'第 '+order.arrivalDay+' 天交付 →':'选船发运 →':'挑一笔生意 →'}</small>`,order?'select':'back',order?.id||'');}).join('')}</div>`;
}
function investmentChoices(){return `<section class="investment-choice"><span class="eyebrow">赚到的钱，怎么再生钱？</span><h2>把码头做大一点。</h2><p>先走一条。新码头仓租与人员每天 ${yuan(DAILY_OPERATING_COST)}，快一天也能少花一天。</p>${availableInvestments(state).map(x=>button(`<span class="investment-icon">${x.id==='warehouse'?'▥':'➜'}</span><span><b>${esc(x.name)}</b><small>${x.id==='warehouse'?'新货九折入仓，同样的生意少垫一点钱。':'新港快运 1 天送到，每单只花 ¥180。'}</small><em>投资 ${yuan(x.cost)} · 余下 ${yuan(state.cash-x.cost)}</em></span>`,'INVEST',x.id,`class="investment-card" ${x.available?'':'disabled'}`)).join('')}<small class="reserve">第二批订单更大。仓库省采购费，快线省运费；回款慢的订单依然要留周转。</small></section>`;}
function stagePerformance(){
 const markers=isBusiness()?['START_BUSINESS','NEXT_BUSINESS_ROUND']:state.stage===3?['NEXT_STAGE']:['INVEST'],index=state.history.findLastIndex(x=>markers.includes(x.action));
 if(index<0)return null;
 const start=state.history[index],events=state.history.slice(index);
 if(!Number.isSafeInteger(start.day)||events.some(x=>!Number.isSafeInteger(x.cashDelta)))return null;
 return {capital:events.filter(x=>['INVEST','EXPAND_BERTH'].includes(x.action)).reduce((n,x)=>n-x.cashDelta,0),net:events.reduce((n,x)=>n+x.cashDelta,0),days:state.day-start.day,cost:events.reduce((n,x)=>n+(Number.isSafeInteger(x.operatingCost)?x.operatingCost:0),0)};
}
function businessCapitalRecovery(){
 if(!state.berthInvestmentCost)return null;
 const index=state.history.findLastIndex(x=>x.action==='EXPAND_BERTH');if(index<0)return null;
 const entries=state.history.slice(index+1);if(entries.some(x=>!Number.isSafeInteger(x.cashDelta)))return null;
 const purchased=new Set(entries.filter(x=>x.action==='PURCHASE').map(x=>x.orderId));
 const realized=state.orders.filter(o=>purchased.has(o.id)&&o.status==='paid').reduce((n,o)=>n+o.revenue-o.purchaseCost-o.freight,0);
 return realized-entries.reduce((n,x)=>n+(Number.isSafeInteger(x.operatingCost)?x.operatingCost:0),0);
}
function resultScore(performance,paid){
 if(!performance)return '';
 const operating=performance.net+(isBusiness()?performance.capital:0),recovery=businessCapitalRecovery();
 return `<div class="stage-result"><span>${isBusiness()?'这一批经营净赚':'这一程 · '+paid+' 位客户'}</span><b>${operating>=0?'+':'−'}${yuan(Math.abs(operating))}</b><small>${performance.days} 天 · 已扣 ${yuan(performance.cost)} 日常${!isBusiness()&&performance.capital?`和 ${yuan(performance.capital)} 建设投入`:''}</small>${isBusiness()&&performance.capital?`<div class="capital-split"><span>扩建投入 −${yuan(performance.capital)}</span><strong>现金净变 ${performance.net>=0?'+':'−'}${yuan(Math.abs(performance.net))}</strong></div>`:''}</div>${isBusiness()&&recovery!=null?capitalMeter(recovery):''}`;
}
function capitalMeter(recovery){return `<div class="capital-recovery"><span>扩建后已结净收益 <b>${yuan(recovery)} / ${yuan(state.berthInvestmentCost)}</b></span><div role="progressbar" aria-label="扩建后已结净收益" aria-valuemin="0" aria-valuemax="${state.berthInvestmentCost}" aria-valuenow="${Math.max(0,Math.min(state.berthInvestmentCost,recovery))}"><i style="width:${Math.max(0,Math.min(100,recovery/state.berthInvestmentCost*100))}%"></i></div></div>`;}
function render(){
 const active=state.orders.find(o=>['packed','shipping'].includes(o.status)),o=state.orders.find(o=>o.id===selected),receivables=state.orders.filter(o=>o.status==='receivable').sort((a,b)=>a.collectionDay-b.collectionDay),earned=state.orders.filter(o=>o.status==='paid').reduce((sum,o)=>sum+o.revenue-o.purchaseCost-o.freight,0),netEarned=earned-state.investmentCost-(state.berthInvestmentCost||0)-(state.operatingCostPaid||0);
 const growth=investmentResult(),performance=state.ending?stagePerformance():null;
 const current=currentOrders(),paid=current.filter(o=>o.status==='paid').length,investing=state.stage===1&&state.portUnlocked&&!state.ending;
 root.innerHTML=`<header class="game-header"><a href="${isolatedTrial?'rework.html?trial=1':'rework.html'}" class="brand">再开一单<small>就下班</small></a><div class="cash ${feedback?.ok&&feedback.cashDelta>0?'cash-received':''}"><small>手里的钱</small><strong>${yuan(state.cash)}</strong></div><span class="day">第 ${state.day} 天${state.dailyOperatingCost?`<small class="daily-cost">日常 −${yuan(state.dailyOperatingCost)} / 天</small>`:''}</span><button data-action="restart-prompt" class="restart">重新开张</button></header>${market()}<div class="play-area"><section class="harbor ${active?.status||''} ${state.investment||''} ${feedback?.action==='SHIP'?'departing':''} ${feedback?.action==='INVEST'?'just-invested':''}"><div class="scene-title"><span>${isBusiness()?'自己的生意 · 第 '+state.businessRound+' 批回头单':state.stage===1?'第一程 · 新港开张':state.stage===3?'第三程 · 生意有取舍':'第二程 · '+(state.investment==='warehouse'?'扩仓做大单':'快线抢生意')}</span><h1>${isBusiness()?'把客户，做成熟客。':state.ending?'生意，有了自己的路。':investing?'赚到了，该往前走了。':state.stage===3?'不必每一单都接。':state.stage===2?'码头长大了，生意也是。':'小码头，也能做大生意。'}</h1><p>${isBusiness()?`${cargoCapacity(state)} 个泊位 · ${businessCustomers(state).reduce((n,c)=>n+c.repeatPaid,0)} 笔复购已收齐`:state.ending?'这次投资，让下一批生意有了不同。':investing?'第一笔本钱已经赚回来。':state.stage===3?'四位客户，留两位合作。':state.stage===2?(state.investment==='warehouse'?'扩建仓库 · 新采购省 10%':'固定快线 · 1 天送到 / ¥180'):'做成三笔生意，赚下第一桶金。'}</p></div>${sceneArt()}${growth?`<div class="investment-result"><span>${growth.label}</span><b>${yuan(growth.value)}</b><small>${growth.detail}</small></div>`:''}<div class="goal-track" aria-label="本程 ${paid} / ${state.stageTarget||3} 笔已收齐">${current.map(x=>`<span class="${x.status==='paid'?'done':x.status==='declined'?'declined':''}" title="${esc(x.name)}">${x.status==='paid'?'✓':x.status==='declined'?'−':icon(x.product)}</span>`).join('')}<i>→</i><span class="new-port ${state.portUnlocked?'done':''}">⚑</span></div>${cargoCapacity(state)>1?berthControls():state.portUnlocked?'':active?button(`${active.status==='packed'?'▣ 货配好了，选船':'⛵ 货在路上，去交付'}`,'select',active.id,'class="scene-pin cargo-pin"'):current.some(x=>x.status==='open')?button('＋ 空货位，挑一笔生意','back','','class="scene-pin cargo-pin"'):''}${receivables.length?button(`${yuan(receivables.reduce((s,x)=>s+outstandingPayment(x),0))} 待收`,'select',receivables[0].id,'class="scene-pin receipt-pin"'):''}${state.completed?`<div class="harbor-sign">做成 ${state.completed} 单<small>${state.investment?'累计净赚':'已赚'} ${yuan(netEarned)}</small></div>`:''}${active?.status==='packed'?`<div class="cargo-stack" aria-hidden="true">${icon(active.product)}<span>${active.quantity} 箱</span></div>`:''}<div class="scene-caption">${state.ending?'货款收齐，生意稳稳站住':investing?'选一笔投资，码头会真正改变':active?.status==='shipping'?'点货船，送到客户手里':active?'货物已经来到码头':receivables.length&&!current.some(x=>x.status==='open')?'还有货款待收，点击回款单':'点击来单，货会进仓、出海、回款'}</div></section><aside class="workbench">${feedback?`<div class="feedback ${feedback.ok?'':'error'}" role="status"><span>${feedback.ok?'✓':'!'} ${esc(feedback.message)}</span>${button('×','dismiss','','aria-label="关闭提示"')}</div>`:''}${state.ending?`<section class="opening-finish"><span class="finish-flag">⚑</span><small>${isBusiness()?'这批回头单收齐了':state.stage===3?'第三程完成':'第二程完成'}</small><h2>${isBusiness()?'这批货款，收齐了。':'你选的路，做成了。'}</h2>${resultScore(performance,paid)}<p class="lifetime-result">开张至今 ${state.completed} 笔生意 · ${state.day-1} 天<br>累计净赚 <b>${yuan(netEarned)}</b>（含投资与日常支出）</p><div class="finish-summary">${state.investment==='warehouse'?'扩仓降低采购成本':'快线降低抢单成本'}<br>留住现金，才有下一笔生意。</div>${isBusiness()?button('接下一批回头单','NEXT_BUSINESS_ROUND','','class="primary"'):state.stage===2?button('去选下一批客户','NEXT_STAGE','','class="primary"'):`<div class="chosen-customers">${current.map(c=>`<span class="${c.status==='paid'?'done':'declined'}">${c.status==='paid'?'✓':'−'} ${esc(c.name)}<small>${c.status==='paid'?`毛利 ${yuan(c.revenue-c.purchaseCost-c.freight)}${Number.isSafeInteger(c.shipDay)?` · 出货至回款 ${c.collectionDay-c.shipDay} 天`:''}`:'本轮未选'}</small></span>`).join('')}</div>`}${state.stage===3&&!isBusiness()?button('留下这两位客户，继续经营','START_BUSINESS','','class="primary"'):''}${button('换一条经营路线，再试一次','RESTART','','class="secondary"')}</section>`:investing?investmentChoices():o?inspector(o):(isBusiness()?businessBoard():'')+orderCards()}</aside></div>`;
}
root.addEventListener('click',event=>{
 const el=event.target.closest('[data-action]');if(!el)return;const a=el.dataset.action;
 if(a==='select'){selected=el.dataset.id;feedback=null;render();return;}
 if(a==='back'){selected=null;render();return;}
 if(a==='dismiss'){feedback=null;render();return;}
 if(a==='restart-prompt'){if(!confirm('重新开张这份独立试玩？原版存档不会改变。'))return;}
 const result=reduceOpening(state,{type:a==='restart-prompt'?'RESTART':a,orderId:el.dataset.id,route:el.dataset.route,choice:el.dataset.id,paymentTerms:el.dataset.paymentTerms});state=result.state;feedback=result.feedback;
 if(result.feedback.ok){try{progressStore.setItem(progressKey,JSON.stringify(state));}catch{feedback={ok:false,message:'浏览器没有保存这次进度，请不要关闭页面。'};}if(['DELIVER','COLLECT','SETTLE','RESTART','restart-prompt','INVEST','NEXT_STAGE','START_BUSINESS','NEXT_BUSINESS_ROUND','EXPAND_BERTH'].includes(a))selected=null;else selected=el.dataset.id;}
 render();
});
render();

root.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&event.target.matches('.scene-object')){event.preventDefault();event.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});

fetch(new URL('../assets/rework-harbor.svg',import.meta.url)).then(r=>{if(!r.ok)throw new Error('Scene unavailable');return r.text();}).then(svg=>{harborArt=svg.replace('<svg ', '<svg class="harbor-art" role="group" aria-label="仓库、货船与客户港口" ');render();}).catch(()=>{});
