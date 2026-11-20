import {officeWeatherView} from './deal-room-workspace-office-weather.js';
import {officeIntroView} from './deal-room-workspace-intro.js';
import {prospectDisplayText} from './deal-room-prospect-locale.js';
import {prospectInbox} from './deal-room-prospects.js';
import {equipmentOpportunity} from './deal-room-equipment.js';
import {neighborhoodRequest} from './deal-room-neighborhood.js';
import {marketBook} from './deal-room-market.js';
// Workspace pages are a view of the same ongoing day, never economic actions.
const tabs=Object.freeze([['office','办公室'],['inbox','询盘'],['orders','订单'],['development','发展'],['afterwork','下班']].map(Object.freeze));
const tabSet=new Set(tabs.map(([id])=>id));
const esc=v=>String(prospectDisplayText(v)??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>Number.isSafeInteger(n)||typeof n==='bigint'?'¥'+n.toLocaleString('zh-CN'):'—';
const valid=n=>Number.isSafeInteger(n)&&n>=0;
const safeRef=ref=>typeof ref==='string'&&/^[A-Za-z0-9:_-]{1,80}$/.test(ref)?ref:'';
const day=d=>valid(d)?'第 '+d+' 天':'日期待定';

export function workspaceNavView(selected='office',state=null,weather='',chrome='main'){
 const active=tabSet.has(selected)?selected:'office';
 const mast=state?'<div class="ws-mast">再开一单就下班</div>':'';
 if(chrome==='detail')return mast;
 const balance=state&&chrome==='main'?'<div class="ws-account"><div><small>'+esc(day(state.day))+(['晴','阴','雨','雪'].includes(weather)?' · '+weather:'')+'</small><h1>'+(active==='afterwork'?'下班以后':'我的贸易工作室')+'</h1></div><div><small>可用资金</small><strong>'+esc(money(state.cash))+'</strong></div></div>':'';
 return mast+balance+'<nav class="ws-nav" aria-label="工作室导航">'+tabs.map(([key,label])=>'<button type="button" data-workspace-tab="'+key+'"'+(key===active?' aria-current="page"':'')+'>'+label+'</button>').join('')+'</nav>';
}
function defaultPending(s){
 const jobs=[];const active=s.market?.active,status=s.market?.status?.replace(/^legacy-/,'');
 if(active&&['preparing','transit','receivable'].includes(status)){
  const next=status==='preparing'?['待出运',active.shipDay]:status==='transit'?['待交货',active.deliveryDay]:['待收尾款',active.paymentDay];
  jobs.push({title:next[0]+' · '+(active.productName||'采购台合同'),detail:day(next[1])+' · '+(active.buyer||'采购台客户')+(status==='receivable'&&valid(active.balanceDue)?' · 尾款 '+money(active.balanceDue):''),tab:'orders'});
 }
 for(const c of s.contracts||[]){
  if(!c||c.status==='paid'||!['fulfilling','receivable','production','transit'].includes(c.status))continue;
  const unpaid=c.status==='receivable';jobs.push({title:(unpaid?'待收尾款':'待交付')+' · '+(c.product||'已签订单'),detail:day(unpaid?c.paymentDay:c.deliveryDay)+' · '+(c.clientName||'已签客户')+(unpaid&&valid(c.balanceDue)?' · '+money(c.balanceDue):''),tab:'orders'});
 }
 if(s.phase==='negotiating')jobs.push({title:'有询盘要回复',detail:'先读客户要的货、数量和交期，再决定要不要报价。',tab:'inbox'});
 // Read the same outstanding mail as the inbox, including dismissed-letter filtering.
 if(['review','complete'].includes(s.phase)||s.phase==='market'&&status==='draft'){
  const letters=[...prospectInbox(s)].sort((a,b)=>(a.replyBy??Infinity)-(b.replyBy??Infinity));
  for(const r of letters)jobs.push({title:r.person.displayName,detail:r.product.name,when:valid(r.replyBy)?day(r.replyBy)+'截止':'待回复',tab:'inbox',ref:'prospect:'+r.person.id});
  const equipment=equipmentOpportunity(s),chain=neighborhoodRequest(marketBook(s).receipts);
  if(equipment)jobs.push({title:equipment.buyer,detail:equipment.name,when:'设备询价',tab:'inbox'});
  if(chain)jobs.push({title:'四邻百货联采 · 林妍',detail:chain.stores+' 家门店联采',when:'待回复',tab:'inbox'});
 }
 return jobs;
}
function itemList(items){
 return '<ul class="ws-items">'+items.filter(x=>x?.title).map(x=>{
  const ref=safeRef(x.ref),tag=tabSet.has(x.tab)?'button':'div';
  return '<li><'+tag+(tag==='button'?' type="button" data-workspace-open="'+x.tab+'"'+(ref?' data-workspace-ref="'+esc(ref)+'"':''):'')+'><span><strong>'+esc(x.title)+'</strong>'+(x.detail?'<small>'+esc(x.detail)+'</small>':'')+'</span>'+(tag==='button'?'<span class="ws-arrow" aria-hidden="true">→</span>':'')+'</'+tag+'></li>';
 }).join('')+'</ul>';
}
// This intentionally names its scope instead of pretending that every story
// ledger shares the fields of an ordinary contract. A broader normalized ledger
// can be injected as {scope,rows:[{product,customer,sales,cost}]}, settled only.
function ledgerRows(s,ledger){
 const validRow=r=>r&&valid(r.sales)&&valid(r.cost)&&typeof r.product==='string'&&r.product&&typeof r.customer==='string'&&r.customer;
 if(Array.isArray(ledger?.rows))return {scope:ledger.scope||'已结清合同',rows:ledger.rows.filter(r=>(!r.status||r.status==='paid')&&validRow(r))};
 const rows=[];
 for(const c of s.contracts||[])if(c?.status==='paid'){
  const r={sales:c.revenue,cost:c.cost,product:c.product,customer:c.clientName};if(validRow(r))rows.push(r);
 }
 for(const c of s.marketHistory||[])if(c?.status==='paid'&&valid(c.paidDay)&&c.paidDay<=s.day&&valid(c.quantity)&&c.quantity>0&&c.delivered===c.quantity&&c.received===c.revenue){
  const r={sales:c.revenue,cost:c.cost,product:c.productName,customer:c.buyer};if(validRow(r))rows.push(r);
 }
 return {scope:'已结清的常规合同和采购台订单；不含其他项目账、未收尾款或生活消费',rows};
}
function breakdown(rows,field){
 const groups=new Map();
 for(const r of rows){const k=r[field],v=groups.get(k)||{sales:0n,gross:0n,count:0};v.sales+=BigInt(r.sales);v.gross+=BigInt(r.sales)-BigInt(r.cost);v.count++;groups.set(k,v);}
 const sorted=[...groups].sort((a,b)=>a[1].sales===b[1].sales?a[0].localeCompare(b[0],'zh-CN'):a[1].sales>b[1].sales?-1:1);
 return '<ul class="ws-breakdown">'+sorted.map(([k,v])=>'<li><strong>'+esc(k)+'</strong><span>'+v.count+' 单 · 销售额 '+money(v.sales)+' · 毛利 '+money(v.gross)+'</span></li>').join('')+'</ul>';
}
function margin(gross,sales){
 if(!sales)return '—';
 const negative=gross<0n,magnitude=negative?-gross:gross,tenths=(magnitude*1000n+sales/2n)/sales;
 return (negative&&tenths?'-':'')+String(tenths/10n)+'.'+String(tenths%10n)+'%';
}
function ledgerView(s,input){
 const {rows,scope}=ledgerRows(s,input);let sales=0n,cost=0n;
 for(const r of rows){sales+=BigInt(r.sales);cost+=BigInt(r.cost);}
 const fact=(label,value)=>'<div><dt>'+label+'</dt><dd>'+esc(value)+'</dd></div>';
 return '<details class="ws-ledger"><summary aria-label="经营账本 · '+rows.length+' 笔已结清">销售账本</summary><p class="ws-muted">统计范围：'+esc(scope)+'。</p>'+
 (rows.length?'<dl class="ws-totals">'+fact('实际销售额',money(sales))+fact('直接成本',money(cost))+fact('销售毛利',money(sales-cost))+fact('毛利率',margin(sales-cost,sales))+'</dl><p class="ws-muted">毛利为销售额减合同直接成本，还没有扣工作室日常开支，不等于手头现金。</p><details><summary>按商品看</summary>'+breakdown(rows,'product')+'</details><details><summary>按客户看</summary>'+breakdown(rows,'customer')+'</details>':'<p>还没有符合这份口径的到账订单。签约和交货不会先记作已收销售额。</p>')+'</details>';
}
/** OFFICE ONLY: put the navigation and any existing partner controls alongside
 * it in the application. Pending/advice records navigate; they cannot sign/pay.
 * Optional model: officeName, improved, weather (verified display text),
 * pending/advice (array of {title,detail?,tab?,ref?}), ledger ({scope,rows}). */
export function workspaceOfficeView(state,model={}){
 if(!state)return '';
 const jobs=Array.isArray(model.pending)?model.pending:defaultPending(state);
 const advice=Array.isArray(model.advice)?model.advice:[];
 const improved=typeof model.improved==='boolean'?model.improved:state.officeImprovement?.id==='window-studio';
 const isLocal=src=>typeof src==='string'&&(/^assets\/deal-[a-z0-9-]+\.webp$/.test(src)||/^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/.test(src));
 const art=isLocal(model.art)?model.art:improved?'assets/deal-office-window-v1.webp':'assets/deal-office-original-desktop.webp';
 const room='<img class="ws-desk-scene" alt="" src="'+esc(art)+'">';
 const weather=['晴','阴','雨','雪'].includes(model.weather)?model.weather:'';
 const office=model.officeName||(improved?'窗边工作室':'起步工作室');
 const who=['liang','fang','tao','xu'].includes(model.adviserId)?model.adviserId:'';
 const portrait=who?'<i aria-hidden="true" class="ws-note-face adviser-'+who+'"></i>':'';
 const note=advice[0],lead=note?.text||note?.detail||({inbox:'先看最早截止的这单。',orders:'先看这笔订单的交付和回款。',development:'先看看有哪些获客渠道。',afterwork:'今天手上的事办完了。'})[note?.tab]||'';
 const row=x=>'<li><button type="button" data-workspace-open="'+(tabSet.has(x.tab)?x.tab:'inbox')+'"'+(safeRef(x.ref)?' data-workspace-ref="'+esc(x.ref)+'"':'')+'><span><strong>'+esc(x.title)+'</strong>'+(x.detail?'<small>'+esc(x.detail)+'</small>':'')+'</span>'+(x.when?'<em>'+esc(x.when)+'</em>':'')+'<b aria-hidden="true">›</b></button></li>';
 const rows=xs=>'<ul class="ws-agenda-rows">'+xs.map(row).join('')+'</ul>';
 return '<section class="ws-office ws-original-office" aria-labelledby="ws-office-title"><div class="ws-tabletop"><header class="ws-desk'+(improved?' ws-desk-window':'')+'" data-weather="'+weather+'">'+room+officeWeatherView(model.officeId,weather)+'<h2 id="ws-office-title" class="ws-offscreen" tabindex="-1">'+esc(office)+(model.weather?' · '+esc(model.weather):'')+'</h2>'+officeIntroView(model.intro,who)+'</header>'+
 '<section class="ws-agenda" aria-label="今日待办"><h3>未完成 <small>'+jobs.length+'</small></h3>'+(jobs.length?rows(jobs.slice(0,2)):'<p>今天没有待办。</p>')+
 (jobs.length>2?'<details><summary>其余 '+(jobs.length-2)+' 件</summary>'+rows(jobs.slice(2))+'</details>':'')+'</section></div>'+
 '<section class="ws-original-note" aria-label="工作建议"><h3>助理建议</h3>'+(note?'<div>'+portrait+'<div><p>'+esc(lead)+'</p>'+itemList([{title:note.title,tab:note.tab,ref:note.ref}])+'</div></div>':'<p>暂无额外建议。</p>')+'</section>'+ledgerView(state,model.ledger)+'</section>';
}
export function bindWorkspaceNav(root,onNavigate){
 if(typeof onNavigate!=='function')return;
 const buttons=[...root.querySelectorAll('[data-workspace-tab]')];
 for(const [i,b] of buttons.entries()){
  b.addEventListener('click',()=>{const k=b.dataset.workspaceTab;if(!tabSet.has(k)||b.getAttribute('aria-current')==='page')return;onNavigate(k,'');root.querySelector('[data-workspace-tab="'+k+'"]')?.focus?.({preventScroll:true});});
  b.addEventListener('keydown',e=>{const n=buttons.length,step={ArrowLeft:(i+n-1)%n,ArrowRight:(i+1)%n,Home:0,End:n-1}[e.key];if(step===undefined)return;e.preventDefault();buttons[step]?.focus?.();});
 }
 for(const b of root.querySelectorAll('[data-workspace-open]'))b.addEventListener('click',()=>{const k=b.dataset.workspaceOpen;if(tabSet.has(k))onNavigate(k,safeRef(b.dataset.workspaceRef));});
}
