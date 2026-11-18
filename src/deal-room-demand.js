/** Fictional buyer sell-through forecast, activated explicitly; never real-time. */
const RATE={mira:8,samir:16,ines:5};
export function retailDemand(state,clientId){
 if(!state.retailPlanning)return null;
 const sales=state.contracts.filter(c=>c.clientId===clientId&&c.retailPlanning&&(c.status==='paid'||(c.roundReceivable&&c.status==='receivable'&&c.deliveryDay<=state.day)));
 const plans=(state.supplyPlanHistory||[]).filter(p=>p.clientId===clientId&&p.retailPlanning).flatMap(p=>p.lots.map(l=>({quantity:l.quantity,deliveryDay:l.deliveryDay})));
 const lots=[...sales,...plans];
 const last=lots.at(-1);
 if(!last)return {ready:true,remaining:0,readyDay:state.day,rate:RATE[clientId],coverage:0};
 const rate=RATE[clientId];
 let stock=0,lastDay=0;for(const lot of lots.sort((a,b)=>a.deliveryDay-b.deliveryDay)){stock=Math.max(0,stock-(lot.deliveryDay-lastDay)*rate)+lot.quantity;lastDay=lot.deliveryDay;}
 const readyDay=lastDay+Math.ceil(stock/rate),remaining=Math.max(0,stock-(state.day-lastDay)*rate),lastQuantity=Math.max(last.quantity,remaining);
 return {ready:state.day>=readyDay,remaining,readyDay,rate,coverage:Math.ceil(lastQuantity/rate),lastQuantity};
}
export function retailWait(state,clientId=null){
 if(!state.retailPlanning||state.phase!=='portfolio')return null;
 if(clientId&&!Object.hasOwn(RATE,clientId))return null;
 const demands=(clientId?[clientId]:Object.keys(RATE)).map(id=>retailDemand(state,id));
 if(demands.some(d=>d.ready))return null;
 const day=Math.min(...demands.map(d=>d.readyDay)),days=day-state.day,cost=days*30;
 return {day,days,cost,valid:days>0&&state.cash>=cost};
}
// An explicit temporary closure is not ordinary paid waiting. Existing journals
// keep their original daily charges; no unpaid invoice or cash is manufactured.
export function retailPause(state,clientId){
 if(!Object.hasOwn(RATE,clientId)||!Number.isSafeInteger(state.cash)||state.cash<0)return null;
 if(state.roundReceivables?.active&&state.roundReceivables.round===state.businessRound)return null;
 if(state.contracts.some(c=>['fulfilling','receivable'].includes(c.status)))return null;
 const w=retailWait(state,clientId);
 return w&&w.days>0&&!w.valid?{day:w.day,days:w.days,cost:0}:null;
}
export function demandView(d){
 if(!d)return '';
 return `<div class="retail-demand ${d.ready?'demand-ready':''}"><span>${d.ready?'门店正在等下一批':`门店约余 ${d.remaining} 件 · 第 ${d.readyDay} 天再补货`}</span><div class="retail-shelf" aria-hidden="true">${Array.from({length:8},(_,i)=>`<i class="${!d.ready&&i<Math.ceil(d.remaining/(d.lastQuantity||1)*8)?'stocked':''}"></i>`).join('')}</div></div>`;
}

export function buyerWaitView(state){
 if(state.roundReceivables?.active&&state.roundReceivables.round===state.businessRound)return '';
 if(!state.retailPlanning||state.phase!=='portfolio')return '';
 const options=Object.entries({mira:'Mira',samir:'Samir',ines:'Inês'}).map(([id,name])=>({id,name,wait:retailWait(state,id)})).filter(o=>o.wait).sort((a,b)=>a.wait.day-b.wait.day);
 if(!options.length)return '';
 return `<details class="buyer-wait"><summary>想继续和某位客户合作？</summary><p>可以等对方的下一批采购，不必为了推进日历接其他单。也可以回工作室做别的业务。</p>${options.map(({id,name,wait:w})=>`<button data-wait-buyer="${id}" ${w.valid?'':'disabled'}><strong>等 ${name} 到第 ${w.day} 天</strong><span>${w.days} 天 · 工作室支出 ¥${w.cost}</span></button>${retailPause(state,id)?`<button data-pause-buyer="${id}"><strong>暂停营业，等 ${name} 到第 ${w.day} 天</strong><span>资金不足时暂关工作室 ${w.days} 天 · 不营业、不计日费、不产生收入；客户照常销售现货。</span></button>`:''}`).join('')}</details>`;
}
