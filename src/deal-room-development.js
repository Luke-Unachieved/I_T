// A delivered lamp case is practical supplier experience; no unrelated repeat-order grind.
export function hasLampDevelopmentCase(state){return (state.curationHistory||[]).some(c=>c.status==='paid'&&c.products?.includes('mira'));}
/** Fictional supplier samples. A reusable capability, not a compulsory next order. */
export const SAMPLE_FACTORIES={
 studio:{name:'澄光小批工作室',title:'三档调光台灯',cost:2400,days:4,quantity:60,revenue:4200,productionCost:2700,deliveryDays:4,payLag:0,feature:'一件样品可试三档亮度；以后可接 60 盏的小批调光灯。',limit:'单件制作成本高，不靠大批低价竞争。'},
 line:{name:'恒序灯具工厂',title:'暖光标准台灯',cost:1800,days:3,quantity:180,revenue:6300,productionCost:4140,deliveryDays:5,payLag:7,feature:'工厂为这版锁定整批生产；以后可按新成本接 180 盏整批采购。',limit:'这一版至少 180 盏起做；小单仍走原供应商。'}
};
export function developmentOffer(state){
 const d=state.productDevelopment;if(d?.status!=='active')return null;const f=SAMPLE_FACTORIES[d.factory];
 return {id:'developed-lamp',title:f.title+(d.factory==='studio'?' · 小批展示':' · 整批铺货'),exchange:d.factory==='studio'?'用你验过的三档调光样品报价；交货付款。':'使用新工厂批量成本；180 盏起做，先付三成、留七天账期。',quantity:f.quantity,revenue:f.revenue,cost:f.productionCost,deliveryDays:f.deliveryDays,payLag:f.payLag,deposit:d.factory==='line'?Math.floor(f.revenue*.3):0,accepted:true,reason:'',specification:'developed-'+d.factory};
}
export function developmentView(state,selected='studio',brightness=1){
 const d=state.productDevelopment,f=SAMPLE_FACTORIES[d.factory||selected];
 const receipt=d.status==='active'?(state.contracts||[]).findLast(c=>c.status==='paid'&&c.optionId==='developed-lamp'&&c.specification==='developed-'+d.factory):null;
 const escapeReceipt=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const adoption=receipt?`<section class="sample-adoption" aria-label="这版样品的实际交付"><strong>这版灯，已经交到客户手上</strong><p>${escapeReceipt(receipt.clientName)} · ${receipt.quantity} 盏<br>第 ${receipt.deliveryDay} 天交付 · 货款已收齐</p></section>`:'';
 if(d.status==='draft')return `<button class="back-clients" data-action="CLOSE_DEVELOPMENT">← 先不付出样费</button><h3>下次不只转发工厂目录</h3><p class="brief">开发一版可以反复报价的灯。两家工厂愿意出样，工艺和接单方式不同；旧台灯仍能照常做。</p><div class="quotes">${Object.entries(SAMPLE_FACTORIES).map(([id,v])=>`<button data-factory="${id}" class="quote ${id===selected?'chosen':''}" aria-pressed="${id===selected}"><strong>${v.name}</strong><span>${v.title} · 出样 ¥${v.cost} · ${v.days} 天</span></button>`).join('')}</div><p>${f.feature}</p><p class="brief">${f.limit}</p><details><summary>这版以后能怎么报价</summary><p>${f.quantity} 盏 · 整单 ¥${f.revenue} · 采购 ¥${f.productionCost}<br>${f.deliveryDays} 天交货 · ${f.payLag?`交货后 ${f.payLag} 天收齐`:'交货收齐'} · 扣除日常开支后预计净赚 ¥${f.revenue-f.productionCost-(f.deliveryDays+f.payLag)*30}</p></details><p class="brief">出样及这 ${f.days} 天工作室开支合计 ¥${f.cost+f.days*30}。样品做好后，还要由买手决定是否下单。</p><button class="primary" data-action="COMMISSION_SAMPLE" ${state.cash>=f.cost+f.days*30?'':'disabled'}>付出样费，拿这家的实物样 →</button>`;
 if(d.status==='sampling')return `<h3>${f.name} 正在做样</h3><p class="brief">出样已付 ¥${f.cost}。第 ${d.sampleDay} 天到样，期间工作室开支 ¥${f.days*30}。</p><button class="primary" data-action="RECEIVE_SAMPLE">拆开寄来的样品 →</button>`;
 return `<h3>${f.title} · 工厂实物样</h3><div class="lamp-trial" style="--sample-light:${d.factory==='studio'?[.25,.55,1][brightness]:.55};--lamp-brightness:${d.factory==='studio'?[.75,.95,1.12][brightness]:.95}"><div class="sample-glow"></div><div class="trial-lamp"></div></div>${d.factory==='studio'?`<div class="sample-switch" role="group" aria-label="试灯亮度">${['夜间柔光','桌面阅读','陈列亮光'].map((name,i)=>`<button data-light="${i}" aria-pressed="${brightness===i}">${name}</button>`).join('')}</div><p class="brief">同一盏灯，按用途调亮度。Mira 的小批展示方案可以用这一版。</p>`:'<p class="brief">暖光标准版，亮度固定，180 盏起订。</p>'}${adoption}<p class="brief">新订单可以选这款灯，旧订单仍照原样交付。</p><button class="primary" data-action="${d.status==='active'?'CLOSE_SAMPLE':'ACCEPT_SAMPLE'}">${d.status==='active'?'回工作室':'留下验过的样品，带去谈单'} →</button>`;
}
