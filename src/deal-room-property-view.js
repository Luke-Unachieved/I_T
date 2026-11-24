import {PROPERTY_CATALOG,propertyHoldings,propertyPreview,propertyActionBlock} from './deal-room-property.js?v=36';

const pvEsc=s=>String(s??'').replace(/[&<>"']/g,k=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[k]));
const pvCash=n=>Number.isSafeInteger(n)&&n>=0?'¥'+n.toLocaleString('zh-CN'):'—';
const pvTerms=Object.freeze({
  office:{title:'挑间办公室',back:'返回发展',place:'development',peek:'看办公室',use:'搬到这里',using:'正在使用',keep:'保留原办公室'},
  home:{title:'房产',back:'返回下班',place:'offwork',peek:'看房',use:'搬到这里住',using:'现在住在这里',keep:'保留名下的房子'},
  car:{title:'车行',back:'返回下班',place:'offwork',peek:'看车',use:'换开这辆',using:'现在开的车',keep:'保留名下的车'}
});
const pvTerm = k=>typeof k==='string' && Object.hasOwn(pvTerms,k)?pvTerms[k]:null;
const pvTitle=(k,h)=>k==='car'&&h?.owned.some(r=>PROPERTY_CATALOG.some(x=>x.kind==='car'&&x.id===r.id))?'车库':pvTerm(k)?.title;
const pvItem=(k,id)=>PROPERTY_CATALOG.find(x=>x.kind===k&&x.id===id);
const pvFact=(key,value)=>'<div><dt>'+pvEsc(key)+'</dt><dd>'+pvEsc(value)+'</dd></div>';
const pvBtn=(attr,text,cls='')=>'<button type="button" '+attr+(cls?' class="'+cls+'"':'')+'>'+pvEsc(text)+'</button>';

// Only a vetted per-asset local artwork map should be supplied by the host.
// An omitted artwork is simply a text catalogue entry, not a fake photo.
function pvArt(map,id){
  if(!map||!Object.hasOwn(map,id))return '';
  const url=map[id];
  if(typeof url!=='string'||!(/^assets\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_.-]+\.(?:webp|png|jpe?g|avif)$/i.test(url)||/^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/.test(url)))return '';
  return '<img class="pv-art" alt="" loading="lazy" decoding="async" src="'+pvEsc(url)+'">';
}
export function propertyEntriesView(state,place){
  const kinds=place==='development'?['office']:place==='offwork'?['home','car']:[];
  if(!kinds.length)return '';
  const holdings=propertyHoldings(state);
  return '<nav class="pv-entries" aria-label="'+(place==='development'?'办公场所':'房产与车辆')+'">'+kinds.map(k=>pvBtn('data-property-enter="'+k+'"',pvTitle(k,holdings),'pv-entry')).join('')+'</nav>';
}
export function bindPropertyEntries(root,open){
  if(typeof open!=='function')return;
  root.querySelectorAll('[data-property-enter]').forEach(b=>b.addEventListener('click',()=>{const k=b.dataset.propertyEnter;if(pvTerm(k))open(k);}));
}
const pvTradeables=(item,h)=>item.kind==='office'?[]:(h?.owned||[]).filter(r=>r.id!==item.id && r.id!=='home-starter' && pvItem(item.kind,r.id));
function pvSignature(q,s){return JSON.stringify([q.item?.id,q.tradeInId,s.day,s.cash,s.fame??0,q.price,q.creditUsed,q.cashDue,q.cashAfter,q.fameGain]);}
function pvTitlebar(title,sub,back,attr){
  return '<header class="pv-heading"><div><p class="pv-kicker">'+pvEsc(sub)+'</p><h2 tabindex="-1" data-pv-heading>'+pvEsc(title)+'</h2></div>'+pvBtn(attr,back,'pv-back')+'</header>';
}
function pvOwnedBadge(item,h,t){
  if(h?.active[item.kind]===item.id)return t.using;
  return h?.owned.some(r=>r.id===item.id)?'已拥有':'';
}
function pvCostText(item){return item.price===null?'暂未开售':item.id==='home-starter'?'起始住处':pvCash(item.price);}
function pvList(k,s,h,art){
  const t=pvTerm(k);
  return pvTitlebar(pvTitle(k,h),'可用资金 '+pvCash(s?.cash),t.back,'data-pv-exit')+
    (k==='office'?'<p class="pv-lead">钱够就能买，不必从第一间换起。</p>':'')+
    '<ul class="pv-list">'+PROPERTY_CATALOG.filter(x=>x.kind===k).map((item,i)=>{
      const status=pvOwnedBadge(item,h,t),img=pvArt(art,item.id);
      return '<li><button type="button" class="pv-tile" data-pv-open="'+item.id+'">'+img+
        '<span class="pv-tile-copy"><span class="pv-rank" aria-hidden="true">'+String(i+1).padStart(2,'0')+'</span>'+
        '<span><strong>'+item.name+'</strong><span class="pv-tile-status">'+(status||t.peek)+'</span></span>'+
        '<span class="pv-list-price">'+pvCostText(item)+'</span></span></button></li>';
    }).join('')+'</ul>';
}
function pvChoice(s,item,h,q){
  const olds=pvTradeables(item,h);
  if(!olds.length)return '';
  return '<label class="pv-trade">名下的'+(item.kind==='home'?'房子':'车')+'怎么处理？<select data-pv-trade>'+
    '<option value=""'+(q.tradeInId===null?' selected':'')+'>'+pvTerm(item.kind).keep+'，按标价买</option>'+
    olds.map(r=>{const itemOld=pvItem(item.kind,r.id),off=propertyPreview(s,item.id,r.id);
      return '<option value="'+r.id+'"'+(r.id===q.tradeInId?' selected':'')+'>'+itemOld.name+' · 原实付 '+pvCash(r.paid)+'，本次可抵 '+pvCash(off.creditUsed)+'</option>';}).join('')+
    '</select></label>';
}
function pvMoneyFacts(s,q){
  return '<dl class="pv-facts">'+pvFact('标价',pvCash(q.price))+
    (q.tradeInId?pvFact('旧资产抵扣','−'+pvCash(q.creditUsed)):'')+pvFact('这次要付',pvCash(q.cashDue))+
    (q.shortfall>0?pvFact('还差',pvCash(q.shortfall)):q.cashAfter!==null?pvFact('付完还剩',pvCash(q.cashAfter)):'')+
    (q.valid&&q.fameGain?pvFact('购入后知名度',(s.fame??0)+' → '+((s.fame??0)+q.fameGain)+' / 100'):'')+'</dl>';
}
function pvDetail(s,k,item,h,ui,art){
  const t=pvTerm(k),owned=h?.owned.find(r=>r.id===item.id);
  const q=propertyPreview(s,item.id,ui.tradeInId??null);
  const blocked=propertyActionBlock(s),allowed=!blocked;
  const unavailable='<p class="pv-status" role="status">'+pvEsc(blocked)+'</p>';
  const confirm=allowed&&q.valid&&ui.confirmation===pvSignature(q,s);
  let out=pvTitlebar(item.name,confirm?'最后核对':pvTitle(k,h),'返回'+pvTitle(k,h),'data-pv-list')+pvArt(art,item.id);
  if(!h) return out+'<p role="status">账目暂时无法核对。</p>';
  if(owned){
    const active=h.active[k]===item.id;
    return out+'<p class="pv-owned">'+(active?t.using:'已拥有')+'</p>'+
      (item.id==='home-starter'?'<p>这是你最初的住处，不作置换抵扣。</p>':
        '<dl class="pv-facts">'+pvFact('原实付',pvCash(owned.paid))+pvFact('购入时间','第 '+owned.day+' 天')+'</dl>')+
      (active?'':!allowed?unavailable:pvBtn('data-pv-switch="'+item.id+'"',t.use+'（免费）','pv-primary'));
  }
  if(item.price===null) return out+'<p class="pv-owned">暂未开售</p>';
  if(confirm){
    const old=q.tradeInId?pvItem(k,q.tradeInId):null;
    return out+(old?'<p class="pv-lead">确认后，'+old.name+' 将从你名下转出。</p>':'')+
      pvMoneyFacts(s,q)+pvBtn('data-pv-confirm',old?'确认置换，支付 '+pvCash(q.cashDue):'确认购买，支付 '+pvCash(q.cashDue),'pv-primary')+
      pvBtn('data-pv-cancel','返回修改','pv-back');
  }
  return out+'<p class="pv-lead">可用资金 '+pvCash(s.cash)+'</p>'+pvChoice(s,item,h,q)+
    (q.tradeInId?'<p class="pv-note">按旧资产当初实付的 70% 抵扣。'+(q.tradeInAllowance>q.creditUsed?'超出新价的部分不返现。':'')+'</p>':'')+
    pvMoneyFacts(s,q)+(!allowed?unavailable:q.valid?pvBtn('data-pv-review',q.tradeInId?'核对置换':'核对购买','pv-primary'):
      '<p class="pv-status" role="status">'+pvEsc(q.reason)+'</p>');
}
/** ui={kind:'office'|'home'|'car',assetId?,tradeInId?,confirmation?} is navigation state only. */
export function propertyView(state,ui={},options={}){
  const k=ui.kind,t=pvTerm(k);if(!t)return '';
  const h=propertyHoldings(state),item=pvItem(k,ui.assetId);
  return '<section class="pv-panel" data-pv-kind="'+k+'" aria-label="'+pvEsc(pvTitle(k,h))+'">'+
    (item?pvDetail(state,k,item,h,ui,options.detailArtById??options.artById):pvList(k,state,h,options.artById))+'</section>';
}
/** render replaces the panel, dispatch journals one approved business action.
 * All browsing and quote edits are local to ui. Hooks follow the current panel. */
export function bindPropertyView(root,state,ui,{render,dispatch,onBack,getState=()=>state}){
  const k=ui.kind,t=pvTerm(k);
  if(!t)return;
  const stateNow=()=>getState()||state;
  const reset=()=>{delete ui.tradeInId;delete ui.confirmation;};
  const show=(sel='[data-pv-heading]')=>{render();root.querySelector(sel)?.focus?.({preventScroll:true});};
  const on=(sel,evt,cb)=>root.querySelector(sel)?.addEventListener(evt,cb);
  let committed=false;
  root.querySelectorAll('[data-pv-open]').forEach(b=>b.addEventListener('click',()=>{
    const id=b.dataset.pvOpen;if(!pvItem(k,id))return;reset();ui.assetId=id;show();}));
  on('[data-pv-exit]','click',()=>{reset();delete ui.assetId;onBack(t.place);});
  on('[data-pv-list]','click',()=>{const prior=pvItem(k,ui.assetId)?.id;reset();delete ui.assetId;
    show(prior?'[data-pv-open="'+prior+'"]':'[data-pv-heading]');});
  on('[data-pv-trade]','change',e=>{
    const id=e.currentTarget.value,cur=pvItem(k,ui.assetId);
    if(!cur)return;
    if(id&&!pvTradeables(cur,propertyHoldings(stateNow())).some(r=>r.id===id))return;
    ui.tradeInId=id||null;delete ui.confirmation;show('[data-pv-trade]');});
  on('[data-pv-review]','click',()=>{
    const s=stateNow(),q=propertyPreview(s,ui.assetId,ui.tradeInId??null);
    if(propertyActionBlock(s)||!q.valid||q.item?.kind!==k)return;
    ui.confirmation=pvSignature(q,s);show();});
  on('[data-pv-cancel]','click',()=>{delete ui.confirmation;show('[data-pv-review]');});
  on('[data-pv-confirm]','click',()=>{
    if(committed)return;
    const s=stateNow(),q=propertyPreview(s,ui.assetId,ui.tradeInId??null);
    if(propertyActionBlock(s)||!q.valid||q.item?.kind!==k||ui.confirmation!==pvSignature(q,s)){
      delete ui.confirmation;show();return;
    }
    const action={type:q.tradeInId?'TRADE_IN_PROPERTY_V2':'BUY_PROPERTY_V2',assetId:q.item.id,
      ...(q.tradeInId?{tradeInId:q.tradeInId}:{}),checkedDay:s.day,quotedCost:q.cashDue,confirmed:true};
    committed=true;
    // The host may ask for a separate cash-risk confirmation. On cancellation
    // the same final quote remains retryable, but any committed purchase is one-shot.
    if(dispatch(action)===false){committed=false;return;}
    reset();});
  on('[data-pv-switch]','click',()=>{
    if(committed)return;
    const s=stateNow(),h=propertyHoldings(s),id=ui.assetId;
    if(propertyActionBlock(s))return;
    if(!pvItem(k,id)||!h?.owned.some(r=>r.id===id)||h.active[k]===id)return;
    committed=true;if(dispatch({type:'SWITCH_PROPERTY_V2',assetId:id,checkedDay:s.day})===false){committed=false;return;}reset();});
}
