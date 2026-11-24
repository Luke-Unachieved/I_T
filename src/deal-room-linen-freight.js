import {netProfitAmount} from './deal-room-net-profit.js';
import {specialtyMilestoneView} from './deal-room-specialty-calendar.js';
// Independent fixed buyer brief. Goods are at a Spanish consolidation warehouse;
// freight and dates below are this fictional contract's terms, not market rates.
const freightKinds=['OPEN_LINEN_FREIGHT','CLOSE_LINEN_FREIGHT','SIGN_LINEN_GROUPAGE','SIGN_LINEN_SPLIT','RECEIVE_LINEN_FREIGHT'];
export const LINEN_FREIGHT_ACTIONS=Object.freeze(Object.fromEntries(freightKinds.map(type=>[type,['type']])));
export function canonicalLinenFreight(a){return a&&Object.hasOwn(LINEN_FREIGHT_ACTIONS,a.type)&&Object.keys(a).length===1?{type:a.type}:null;}
const currency=n=>'¥'+n.toLocaleString('zh-CN');
function referral(s){return (s.contracts||[]).find(c=>c.clientId==='ines'&&c.status==='paid'&&c.businessRound>0&&Number.isSafeInteger(c.paymentDay)&&c.paymentDay<=s.day);}
export function linenFreightQuote(s,mode){
 if(s.phase!=='linen-freight'||s.linenFreight?.status!=='draft'||!['groupage','split'].includes(mode)||!referral(s))return null;
 const split=mode==='split',goodsCost=3200,freight=split?1040:470,cost=goodsCost+freight,goodsRevenue=5200,serviceFee=split?240:0,revenue=goodsRevenue+serviceFee,deposit=revenue*3/10;
 const lots=split?[{quantity:20,transport:'快件',after:3,balance:896},{quantity:80,transport:'拼车',after:8,balance:2912}]:[{quantity:100,transport:'拼车',after:12,balance:3640}];
 const operatingCost=lots.at(-1).after*30;
 let received=0,needed=0;for(const l of lots){needed=Math.max(needed,l.after*30-received);received+=l.balance;}
 const required=cost-deposit+needed;
 return {mode,goodsCost,freight,cost,goodsRevenue,serviceFee,revenue,deposit,lots,operatingCost,required,valid:s.cash>=required,netProfit:revenue-cost-operatingCost};
}
export function applyLinenFreight(s,a,canStart,{calendar=false}={}){
 if(!canonicalLinenFreight(a))return s;const p=s.linenFreight,t=a.type,home=['review','complete'].includes(s.phase);
 if(t==='OPEN_LINEN_FREIGHT'){
  if(!home||!referral(s)||p&&p.status!=='paid'||!p&&!canStart)return s;
  const n=structuredClone(s);n.linenFreight??={status:'draft'};n.phase='linen-freight';return n;
 }
 if(s.phase!=='linen-freight'||!p)return s;
 if(t==='CLOSE_LINEN_FREIGHT'&&['draft','paid'].includes(p.status)){const n=structuredClone(s);if(p.status==='draft')delete n.linenFreight;n.phase='review';return n;}
 if(['SIGN_LINEN_GROUPAGE','SIGN_LINEN_SPLIT'].includes(t)){
  const q=linenFreightQuote(s,t==='SIGN_LINEN_SPLIT'?'split':'groupage');if(!canStart||!q?.valid)return s;
  const n=structuredClone(s);n.cash+=q.deposit-q.cost;n.linenFreight={...q,status:'transit',signedDay:s.day,index:0,delivered:0,received:q.deposit};return n;
 }
 if(t==='RECEIVE_LINEN_FREIGHT'&&p.status==='transit'){
  const lot=p.lots[p.index];if(!lot)return s;const day=p.signedDay+lot.after,expense=calendar?0:(day-s.day)*30;
  if(s.day!==(calendar?day:p.signedDay+(p.index?p.lots[p.index-1].after:0))||s.cash<expense)return s;
  const n=structuredClone(s),f=n.linenFreight;if(!calendar)n.day=day;n.cash+=lot.balance-expense;f.index++;f.delivered+=lot.quantity;f.received+=lot.balance;
  if(f.index===f.lots.length){f.status='paid';f.paidDay=day;}return n;
 }
 return s;
}
export function linenFreightInvite(s){
 if(!referral(s))return '';const p=s.linenFreight;
 return `<section class="business-route"><small>Inês 引荐 · 葡萄牙展陈采购</small><h3>${p?.status==='paid'?'里斯本展陈方签收的 100 条桌布':'100 条桌布，要不要把预展那箱先发？'}</h3><p>${p?.status==='paid'?'发运、签收与货款已对清，可回看这张运单。':'货源在西班牙，里斯本展陈方想先拿 20 条预摆，也接受晚一点整批交。'}</p><button data-action="OPEN_LINEN_FREIGHT">${p?.status==='paid'?'回看签收与结款':'比较两份运单'} →</button></section>`;
}
function board(s,p){
 const draft=p.status==='draft',quantity=draft?0:p.delivered;
 const bundles=Array.from({length:10},(_,i)=>`<i class="freight-bale ${i<quantity/10?'arrived':'on-road'}" aria-hidden="true"></i>`);
 const zone=(caption,xs)=>`<div><strong>${caption}</strong><div class="freight-bales">${xs.join('')}</div></div>`;
 return `<section class="workspace freight-workspace" aria-label="跨境发运板"><figure class="freight-board"><small>织物展 · 发运联</small><h2>西班牙集货仓 → 里斯本</h2><div class="freight-zones">${zone(draft?'备发 100 条':'在途 '+(100-quantity)+' 条',bundles.slice(quantity/10))}${zone('已签收 '+quantity+' 条',bundles.slice(0,quantity/10))}</div><figcaption>每捆 10 条 · ${draft?'尚未发运':p.status==='paid'?'全部签收，货款结清':'等展陈方签收后更新'}</figcaption></figure></section>`;
}
export function linenFreightView(s){
 const p=s.linenFreight;if(!p)return '';
 const review=p.status==='draft',done=p.status==='paid',day=review?s.day:p.signedDay,lot=p.lots?.[p.index];
 const fact=(label,value)=>`<div><dt>${label}</dt><dd>${value}</dd></div>`;
 const freightCard=q=>`<article class="freight-card"><h3>${q.mode==='split'?'20 条快件先到，80 条随后到':'100 条整批拼车'}</h3><p>${q.mode==='split'?'首批赶预展，赶展服务费 '+currency(q.serviceFee)+'。':'不赶预展，整批用于后续布展；不收赶展费。'}</p><ul class="freight-dates">${q.lots.map(l=>`<li>第 ${day+l.after} 天 · ${l.quantity} 条${l.transport}签收，到账 ${currency(l.balance)}</li>`).join('')}</ul><dl class="freight-facts">${fact('运费',currency(q.freight))+fact('签后手头',currency(s.cash+q.deposit-q.cost))+fact('预计净赚',netProfitAmount(q.netProfit))}</dl><details><summary>查看货款和支出</summary><dl class="freight-facts">${fact('货款',currency(q.goodsRevenue))+fact('工厂款',currency(q.goodsCost))+fact('签约定金',currency(q.deposit))+fact('日常开支',currency(q.operatingCost))}</dl><p>签约时付清工厂款和运费。</p></details><button data-action="${q.mode==='split'?'SIGN_LINEN_SPLIT':'SIGN_LINEN_GROUPAGE'}" ${q.valid?'':'disabled'}>${q.valid?'按这张运单签约':'周转还差 '+currency(q.required-s.cash)}</button></article>`;
 const detail=review?`<blockquote>“西班牙仓有我们要的那款桌布。预展先铺 20 条就够。要是不方便分两批发，那就一起到，留给后面的场次用。”</blockquote>${['groupage','split'].map(id=>freightCard(linenFreightQuote(s,id))).join('')}`:`<p>工厂款 ${currency(p.goodsCost)} · 运费 ${currency(p.freight)} · 这单${done?'实际':'预计'}净赚 <b>${netProfitAmount(p.netProfit)}</b>。</p><p>已到账 ${currency(p.received)} / ${currency(p.revenue)}（含签约定金 ${currency(p.deposit)}）。</p>${p.lots.map((l,i)=>`<p>${i<p.index?'已签收':'待签收'} · 第 ${day+l.after} 天 · ${l.quantity} 条${l.transport} · ${i<p.index?'已收':'应收'} ${currency(l.balance)}</p>`).join('')}${lot?`${specialtyMilestoneView(s)}`:''}`;
 return `<header><div class="brand"><small>葡萄牙展陈采购</small><h1>跨境发运</h1></div><div class="wallet"><span>第 ${s.day} 天</span><strong>${currency(s.cash)}</strong><small>可用资金</small></div></header>${board(s,p)}<section class="business"><h2 tabindex="-1">${review?'同一批桌布，两种走法':done?'里斯本签收完成':'核对在途货物'}</h2>${detail}${review||done?`<button data-action="CLOSE_LINEN_FREIGHT">${done?'回工作室':'先不签，回工作室'}</button>`:''}</section>`;
}
