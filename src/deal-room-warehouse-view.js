import {MARKET_PRODUCTS} from './deal-room-market-data.js';
import {WAREHOUSE_TIERS,warehouseAvailable,warehouseSummary,previewWarehousePurchase,previewWarehouseExpansion,previewWarehouseWait} from './deal-room-warehouse.js';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cash=n=>Number.isSafeInteger(n)?'¥'+n.toLocaleString('zh-CN'):'—';
const day=n=>Number.isSafeInteger(n)?'第 '+n+' 天':'待确认';
const fact=(name,val)=>'<div><dt>'+esc(name)+'</dt><dd>'+esc(val)+'</dd></div>';
const productById=id=>MARKET_PRODUCTS.find(p=>p.id===id);
const sourceLabel=id=>id==='factory'?'工厂排产':'现货货源';
const baysPerPage=30;
const stockKey=d=>JSON.stringify([d.revision,d.productId,d.source,d.boxes]);
function makeDraft(summary,ui){
 const product=productById(ui.warehouseProduct)||MARKET_PRODUCTS[0];
 const source=ui.warehouseSource==='factory'?'factory':'stock',supplier=product.sources[source];
 return {product,supplier,d:{productId:product.id,source,boxes:ui.warehouseBoxes??Math.ceil(supplier.minQuantity/supplier.packSize),revision:summary.revision}};
}
// A warehouse diagram, not an editable plan. A bay derives from a remaining
// physical pack (including a partially used pack), or an inbound reservation.
// Placing the fulfilled lots first keeps this a diagram rather than a claim
// about a fixed shelf address across days or after stock has been issued.
function bays(summary,ui){
 const rows=[...summary.lots.filter(x=>x.arrived),...summary.lots.filter(x=>!x.arrived)];
 const all=[];
 for(const lot of rows){
  const p=productById(lot.productId);
  for(let i=0;i<lot.boxes;i++){
   const units=Math.min(lot.packSize,lot.remaining-i*lot.packSize);
   all.push({state:lot.arrived?'stocked':'reserved',label:p.name+' '+units+p.unit+' · '+(lot.arrived?'已上架，可供货':'在途占位，'+day(lot.arrivalDay)+'到仓'),partial:lot.arrived&&units<lot.packSize});
  }
 }
 while(all.length<summary.capacity)all.push({state:'empty',label:'空仓位',partial:false});
 const pages=Math.ceil(all.length/baysPerPage),page=Math.min(pages-1,Math.max(0,Number.isSafeInteger(ui.warehouseShelfPage)?ui.warehouseShelfPage:0));
 const start=page*baysPerPage,list=all.slice(start,start+baysPerPage);
 const pageNav=pages>1?'<nav class="wh-pages" aria-label="仓区翻页"><button type="button" data-wh-page="'+(page-1)+'" '+(!page?'disabled':'')+'>上一区</button><span>第 '+(page+1)+' / '+pages+' 区 · 仓位 '+(start+1)+'–'+(start+list.length)+'</span><button type="button" data-wh-page="'+(page+1)+'" '+(page+1>=pages?'disabled':'')+'>下一区</button></nav>':'';
 return '<section class="wh-rack" aria-labelledby="wh-rack-title"><div class="wh-bar"><h3 id="wh-rack-title" tabindex="-1">仓位图</h3><strong>'+ (summary.freeBoxes===0?'仓位已占满':'空余 '+summary.freeBoxes+' 箱位')+'</strong></div><p class="wh-caption">每格一个箱位。实箱已到仓；虚线只是在途占位，不能出库。</p>'+
 '<ol class="wh-bays" start="'+(start+1)+'">'+list.map((b,i)=>'<li class="wh-bay wh-'+b.state+'" aria-label="'+esc('仓位 '+(start+i+1)+'：'+b.label)+'" title="'+esc(b.label)+'"><span class="wh-slot-number" aria-hidden="true">'+(start+i+1)+'</span>'+
 (b.state==='stocked'?'<span aria-hidden="true" class="wh-carton"></span>':b.state==='reserved'?'<span class="wh-reserved-word" aria-hidden="true">在途</span>':'')+
 (b.partial?'<small class="wh-partial" aria-hidden="true">散箱</small>':'')+'</li>').join('')+'</ol>'+pageNav+
 '<div class="wh-key"><span>实箱 / 已到 '+summary.onHandBoxes+' 箱</span><span>虚线 / 在途 '+summary.inTransitBoxes+' 箱</span><span>空格 / 可用 '+summary.freeBoxes+' 箱</span></div></section>';
}
function lots(summary){
 if(!summary.items.length)return '<section class="wh-section"><h3>库内商品</h3><p>目前没有备货。可以按订单直接采购，不必先囤货或扩仓。</p></section>';
 return '<section class="wh-section"><h3>库内商品</h3><ul class="wh-stock-list">'+summary.items.map(r=>'<li><strong>'+esc(r.name)+'</strong><span>已到，可供 '+esc(r.onHand+r.unit)+' · 在途 '+esc(r.inTransit+r.unit)+'</span></li>').join('')+
 '</ul><details><summary>查看各批到货日期和剩余数量</summary><ul class="wh-stock-list">'+summary.lots.map(l=>{const p=productById(l.productId);return '<li><strong>'+esc(p.name)+' · '+esc(l.boxes)+' 箱位</strong><span>'+esc(sourceLabel(l.source)+' · '+day(l.day)+'下单，'+day(l.arrivalDay)+(l.arrived?'已到仓':'到仓'))+'</span><span>'+esc((l.arrived?'在库剩余 ':'运输中 ')+l.remaining+p.unit+' · 每整箱 '+l.packSize+p.unit+' · 剩余入账成本 '+cash(l.bookCost))+'</span></li>';}).join('')+'</ul></details></section>';
}
function stockForm(state,summary,ui){
 const {product,supplier:f,d}=makeDraft(summary,ui),q=previewWarehousePurchase(state,d),reviewed=ui.warehouseChecked===stockKey(d);
 const categories=[...new Set(MARKET_PRODUCTS.map(p=>p.category))];
 const items=categories.map(cat=>'<optgroup label="'+esc(cat)+'">'+MARKET_PRODUCTS.filter(p=>p.category===cat).map(p=>'<option value="'+esc(p.id)+'" '+(p.id===d.productId?'selected':'')+'>'+esc(p.name)+'</option>').join('')+'</optgroup>').join('');
 return '<section class="wh-section wh-purchase"><h3>备一批常规商品</h3><p>货源按整箱发货。现在付采购和运费，到货前只占仓位；是否能拿来履约，到时看订单的实际商品和数量。</p>'+
 '<form data-wh-form><div class="wh-form-grid"><label for="wh-product">商品<select id="wh-product">'+items+'</select></label><label for="wh-source">采购货源<select id="wh-source">'+['stock','factory'].map(k=>'<option value="'+k+'" '+(k===d.source?'selected':'')+'>'+esc(sourceLabel(k)+' · '+product.sources[k].name)+'</option>').join('')+'</select></label><label for="wh-boxes">采购箱数<input id="wh-boxes" type="number" inputmode="numeric" min="1" max="300" step="1" value="'+esc(d.boxes)+'" required></label></div>'+
 '<p class="wh-caption">'+esc('每箱 '+f.packSize+product.unit+'，至少 '+Math.ceil(f.minQuantity/f.packSize)+' 箱。采购单价 '+cash(f.unitCost)+'/'+product.unit+'；基础运费 '+cash(f.freightBase)+'，每箱另加 '+cash(f.freightPerBox)+'。')+'</p>'+
 '<button type="submit">核对箱数和费用</button></form><p data-wh-change hidden role="status">箱数已改，请重新核对费用。</p>'+
 '<div data-wh-costs><dl class="wh-facts">'+fact('采购商品数量',Number.isSafeInteger(q.quantity)?q.quantity+product.unit:'—')+fact('采购货款',cash(q.goodsCost))+fact('运费',cash(q.freight))+fact('本次实付',cash(q.cost))+fact('支付后可用现金',cash(q.cashAfter))+fact('预计到仓',day(q.arrivalDay))+fact('最晚到货前须留现金',cash(q.operatingReserve))+fact('采购后空余箱位',Number.isSafeInteger(q.freeAfter)&&q.freeAfter>=0?q.freeAfter+' 箱':'不足')+'</dl>'+
 (q.reason?'<p class="wh-warning" role="status" tabindex="-1" data-wh-reject>'+esc(q.reason)+'</p>':'')+
 (reviewed&&q.valid?'<p role="status">已核对 '+q.boxes+' 箱。确认后立即付款，不会收到客户货款，也不推进日期。</p>':'')+
 '<button type="button" data-wh-buy class="wh-strong" '+(q.valid&&reviewed?'':'disabled')+'>'+esc(Number.isSafeInteger(q.cost)?'付 '+cash(q.cost)+'，预订 '+q.boxes+' 箱':'确认备货')+'</button></div></section>';
}
function expansion(state,summary){
 const t=summary.nextTier,q=t?previewWarehouseExpansion(state,{target:t.capacity,revision:summary.revision}):null;
 return '<section class="wh-section"><h3>扩充仓位</h3>'+(!t?'<p>已到最大仓容 '+summary.capacity+' 箱。</p>':'<p>'+esc('当前 '+summary.capacity+' 箱，下一档 '+t.capacity+' 箱，增加 '+q.addedBoxes+' 箱位。不改变现有库存。')+'</p>'+
 '<button type="button" data-wh-expand '+(q.valid?'':'disabled')+'>'+esc('付 '+cash(t.price)+'，扩至 '+t.capacity+' 箱')+'</button>'+
 (q.valid?'<p class="wh-caption">支付后手头现金 '+esc(cash(q.cashAfter))+'。</p>':'<p class="wh-warning">'+esc(q.reason)+'</p>'))+
 '<details><summary>所有仓容与每次扩仓费用</summary><ul class="wh-tiers">'+WAREHOUSE_TIERS.map((t,i)=>'<li><span>'+t.capacity+' 箱'+(t.capacity===summary.capacity?' · 当前':'')+'</span><span>'+(i?'本次 '+cash(t.price):'初始免费')+'</span></li>').join('')+'</ul></details></section>';
}
function waitView(state,m){
 if(!m.nextArrivalDay)return '';
 const q=previewWarehouseWait(state);
 return '<section class="wh-section wh-incoming"><h3>下一批在路上</h3><p>'+esc(day(q.arrivalDay)+'到仓，距今 '+q.days+' 天。等到那天会扣工作室日常开支 '+cash(q.operatingCost)+'。'+(m.lastArrivalDay>m.nextArrivalDay?'其他更晚的批次仍在路上。':''))+'</p>'+
 '<button type="button" data-wh-wait '+(q.valid?'':'disabled')+'>'+esc('等到'+day(q.arrivalDay)+' · 开支 '+cash(q.operatingCost))+'</button>'+
 (q.valid?'<p class="wh-caption">届时手头现金 '+esc(cash(q.cashAfter))+'。</p>':'<p class="wh-warning">'+esc(q.reason)+'</p>')+'</section>';
}
import {warehouseSceneArt} from './deal-room-warehouse-art.js';
export function warehouseView(state,ui={}){
 const m=warehouseSummary(state),ready=warehouseAvailable(state);
 const head='<header class="wh-head"><div><small>工作室资产</small><h2 tabindex="-1" id="wh-title">自有仓库</h2></div><button type="button" data-warehouse-back>返回上一页</button></header>';
 if(!m.valid)return '<section class="wh-panel">'+head+'<p role="status">'+esc(m.reason)+'</p></section>';
 const updated=String(state.feedback?.kind||'').startsWith('warehouse-')?state.feedback.message:'';
 const art=warehouseSceneArt(m.capacity),scene=art?'<img class="wh-scene" alt="" width="960" height="640" decoding="async" src="'+art+'">':'';
 return '<section class="wh-panel" aria-labelledby="wh-title">'+head+'<div class="wh-wallet"><span>'+esc(day(state.day))+' · 可用现金</span><strong>'+esc(cash(state.cash))+'</strong></div>'+scene+
 (updated?'<p class="wh-feedback" role="status">'+esc(updated)+'</p>':'')+
 '<p class="wh-summary">已占 <strong>'+m.usedBoxes+' / '+m.capacity+'</strong> 箱位。提前备货会占用现金，只有已到仓的商品可以用于订单。</p>'+bays(m,ui)+
 (ready?waitView(state,m):'')+lots(m)+(ready?stockForm(state,m,ui)+expansion(state,m):'<p class="wh-warning" role="status">请先结清手上的订单，再来安排仓储。</p>')+'</section>';
}
export function bindWarehouse(root,state,ui,rerender,dispatch,close){
 const get=sel=>root.querySelector(sel),event=(s,t,fn)=>get(s)?.addEventListener(t,fn);
 const focus=selector=>{rerender();get(selector)?.focus?.();};
 event('[data-warehouse-back]','click',()=>close());
 root.querySelectorAll('[data-wh-page]').forEach(b=>b.addEventListener('click',()=>{ui.warehouseShelfPage=Number(b.dataset.whPage);focus('#wh-rack-title');}));
 const m=warehouseSummary(state);if(!m.valid||!warehouseAvailable(state))return;
 event('#wh-product','change',e=>{ui.warehouseProduct=e.currentTarget.value;delete ui.warehouseBoxes;delete ui.warehouseChecked;focus('#wh-product');});
 event('#wh-source','change',e=>{ui.warehouseSource=e.currentTarget.value;delete ui.warehouseBoxes;delete ui.warehouseChecked;focus('#wh-source');});
 const inp=get('#wh-boxes');
 event('#wh-boxes','input',()=>{ui.warehouseBoxes=inp.value===''?'':Number(inp.value);delete ui.warehouseChecked;
  if(get('[data-wh-costs]'))get('[data-wh-costs]').hidden=true;if(get('[data-wh-change]'))get('[data-wh-change]').hidden=false;if(get('[data-wh-buy]'))get('[data-wh-buy]').disabled=true;
 });
 event('[data-wh-form]','submit',e=>{e.preventDefault();if(!inp)return;ui.warehouseBoxes=inp.value===''?'':Number(inp.value);
  const {d}=makeDraft(m,ui),q=previewWarehousePurchase(state,d);ui.warehouseChecked=stockKey(d);focus(q.valid?'[data-wh-buy]':'[data-wh-reject]');
 });
 event('[data-wh-buy]','click',()=>{const {d}=makeDraft(m,ui);if(ui.warehouseChecked!==stockKey(d)||!previewWarehousePurchase(state,d).valid)return;delete ui.warehouseChecked;dispatch({type:'BUY_WAREHOUSE_STOCK',...d});get('#wh-title')?.focus?.();});
 event('[data-wh-expand]','click',()=>{if(!m.nextTier)return;const d={target:m.nextTier.capacity,revision:m.revision};if(previewWarehouseExpansion(state,d).valid){delete ui.warehouseChecked;dispatch({type:'EXPAND_WAREHOUSE',...d});get('#wh-title')?.focus?.();}});
 event('[data-wh-wait]','click',()=>{const q=previewWarehouseWait(state);if(q.valid){delete ui.warehouseChecked;dispatch({type:'WAIT_WAREHOUSE_STOCK',revision:q.revision});get('#wh-title')?.focus?.();}});
}
