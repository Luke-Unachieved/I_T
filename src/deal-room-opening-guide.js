// A view-only coach for the first order; never dispatches a game action.
const ONE='[data-opening-specific-milestone], [data-opening-milestone]';
const label=x=>((x.matches?.('[data-first-buyer], [data-workspace-continue]')?x.querySelector('strong')?.textContent:null)||x.textContent).trim().replace(/^←\s*|\s*[›→]$/g,'');
const opening=o=>o&&['mira','samir','ines'].includes(o.clientId)&&!o.businessRound&&!o.projectId;
const isSleep=t=>['SLEEP_TO_NEXT_DAY','SLEEP_TO_NEXT_DAY_V2'].includes(t);
const everSlept=s=>(s.history||[]).some(a=>isSleep(a.type));
const firstOrder=s=>(s.contracts||[]).find(opening);
const walkthroughDone=s=>firstOrder(s)?.status==='paid'&&everSlept(s);
const validHours=s=>['negotiating','fulfilling','paid'].includes(s?.phase)&&!s.businessRound&&!s.clientProjectActive;
export function guideStep(view,s,has){
 if(view.picker||view.nested)return null;
 const hasOrder=view.tab==='orders';
 const orders=(s.contracts||[]).filter(opening);
 const first=orders[0];
 const date=c=>c.status==='receivable'?c.paymentDay:c.deliveryDay;
 const due=orders.filter(c=>['fulfilling','receivable'].includes(c.status)&&date(c)<=s.day)
  .sort((a,b)=>date(a)-date(b))[0];
 const slept=everSlept(s);
 const fix=(sel,why)=>has(sel)?{sel,why}:null;
 const open=tab=>has('[data-workspace-open="'+tab+'"]')?'[data-workspace-open="'+tab+'"]':'[data-workspace-tab="'+tab+'"]';
 if(walkthroughDone(s))return {complete:true};
 if(!validHours(s))return null;
 if(view.tab==='afterwork'){
  if(slept&&!due&&isSleep((s.history||[]).at(-1)?.type)&&!has('[data-workspace-sleep-confirm]'))
   return fix('[data-workspace-tab="office"]','，看看今天的待办。');
  return fix('[data-workspace-sleep-confirm]','，推进一天并扣上面写的开支。')||
   fix('[data-workspace-sleep]','，先看开支，这一步还不会过天。')||
   (due&&fix('[data-workspace-continue]','，办完今天到期的订单才能休息。'));
 }
 if(!first){
  if(view.tab==='office')return fix(has('[data-workspace-intro="open"]')?'[data-workspace-intro="open"]':open('inbox'),'，看看客户要多少、哪天要货。');
  if(view.tab==='inbox'){
   return fix('[data-first-buyer]','或其他来信，先看需求和交货日期。')||
    fix('.opening-ask[data-action="PROPOSE"]:not(:disabled)','，请客户确认条件，不会签约或扣钱。')||
    fix('[data-action="PROPOSE"]:not(:disabled)','前先核对交货和回款日期。签了就要垫备货款。')||
    fix('.inquiry-choices button[aria-pressed="false"]:not(:disabled)','，换个方案比较数量、交期和回款。');
  }
 }
 if(hasOrder){
  const order=view.detail??due??first;
  if(has(ONE))return fix(ONE,order?.status==='receivable'
   ?'，把到期尾款记入账本。'
   :order?.deliveryDay===order?.paymentDay
    ?'，交货当天就能收到货款。'
    :'，先记交货，尾款到日子再收。');
  const pick=due||(!slept&&!view.detail?first:null);
  if(pick)return fix('[data-workspace-order-detail="'+pick.clientId+'"]',due?(due.status==='receivable'?'，这笔尾款今天到期。':'，这笔货今天到期。'):'，看交货日和回款日。')||
   (due&&view.detail?fix('[data-workspace-open="orders"]','，找今天到期的那一单。'):null);
  if(!slept)return fix('.ws-orders-end [data-workspace-open="afterwork"]','，准备收工；想接单也可以继续看询盘。')||
   (view.detail&&fix('[data-workspace-tab="afterwork"]','，先看看今天的工作室开支。'))||
   fix('[data-opening-next-day]','只过一天，订单仍按约定日期处理。');
 }
 if(view.tab==='office'&&(due||!slept))return fix(open('orders'),due?'，先办今天到期的订单。':'，先看哪天交货、哪天回款。');
 return null;
}

export function createOpeningGuide({storage,key,saveStatus}){
 const prefKey=key+':opening-walkthrough-v1';
 let preference='';
 try{preference=storage.getItem(prefKey)||'';}catch{}
 let auto=saveStatus==='empty';
 const set=v=>{preference=v;try{storage.setItem(prefKey,v);}catch{}};
 const remove=root=>{
  const panel=root.querySelector('.ws-opening-guide'), prev=root.querySelector('[data-opening-guide-target]');
  panel?.remove();
  root.removeAttribute?.('data-opening-guide-context');
  if(prev){
   prev.removeAttribute('data-opening-guide-target');
   const ids=(prev.getAttribute('aria-describedby')||'').split(/\s+/).filter(id=>id&&id!=='ws-opening-guide-copy');
   if(ids.length)prev.setAttribute('aria-describedby',ids.join(' '));else prev.removeAttribute('aria-describedby');
  }
 };
 const update=(root,state,view)=>{
  if(!root?.querySelector||!root.ownerDocument?.createElement)return;
  remove(root);
  const doc=root.ownerDocument,pick=selector=>[...root.querySelectorAll(selector)].find(x=>!x.disabled&&x.getAttribute('aria-disabled')!=='true'&&!x.closest('[hidden], [inert]')&&x.getClientRects().length>0);
  const on=preference==='running'||!preference&&auto;
  const step=on?guideStep(view,state,selector=>!!pick(selector)):null;
  if(step?.complete)set('done');
  if(step?.sel){
   if(!preference)set('running');
   const target=pick(step.sel);
   if(!target)return;
   const panel=doc.createElement('aside');
   panel.className='ws-opening-guide';panel.setAttribute('aria-label','新手指引');
   const copy=doc.createElement('p');copy.id='ws-opening-guide-copy';
   const bold=doc.createElement('strong');
   bold.textContent='点「'+label(target)+'」';
   copy.append(bold,doc.createTextNode(step.why));
   const intro=target.matches?.('[data-workspace-intro="open"]')?target.closest('.ws-intro-dialogue'):null;
   const nativeSkip=intro?.querySelector('[data-workspace-intro="skip"]');
   // Reuse the existing office control; other steps get only a tutorial dismissal.
   panel.append(copy);
   const close=nativeSkip||doc.createElement('button');
   const original=nativeSkip?.onclick;
   close.type='button';close.className='ws-guide-close';close.textContent='关闭教程';
   close.onclick=function(event){
    set('off');
    if(nativeSkip)return original?.call(this,event);
    remove(root);
    if(target.isConnected)target.focus?.({preventScroll:true});
   };
   panel.append(close);
   root.setAttribute?.('data-opening-guide-context',intro?'intro':view.tab);
   target.setAttribute('data-opening-guide-target','');
   const desc=target.getAttribute('aria-describedby');
   target.setAttribute('aria-describedby',(desc?desc+' ':'')+copy.id);
   // Keep the real grid children intact; a guide is not an action or a cell.
   const rail=intro?target.parentElement:target.closest('.inquiry-actions, .ws-nav, .inquiry-choices, .ws-agenda, .ws-original-note');
   if(rail)rail.before(panel);else target.before(panel);
   return;
  }

 };
 return {update,reset:({fresh=false}={})=>{
  auto=fresh;
  if(preference==='done'||preference==='off')return;
  // Reload resumes a running tutorial; intentionally replacing its game ends it.
  if(!fresh||preference==='running')set('off');
 }};
}
