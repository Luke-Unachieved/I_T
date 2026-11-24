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
 const first=firstOrder(s);
 const date=c=>c.status==='receivable'?c.paymentDay:c.deliveryDay;
 const due=(s.contracts||[]).filter(c=>opening(c)&&['fulfilling','receivable'].includes(c.status)&&date(c)<=s.day)
  .sort((a,b)=>date(a)-date(b))[0];
 const fix=(sel,why)=>has(sel)?{sel,why}:null;
 const open=tab=>fix('[data-workspace-open="'+tab+'"]',tab==='inbox'?'看客户需要什么、哪天交货。':'核对交货日和回款日。')||
  fix('[data-workspace-tab="'+tab+'"]',tab==='inbox'?'看客户需要什么、哪天交货。':'核对交货日和回款日。');
 if(walkthroughDone(s))return {complete:true};
 if(!validHours(s))return null;
 if(view.tab==='afterwork'){
  if(due)return fix('[data-workspace-continue]','先处理今天到期的订单。')||open('orders');
  if(!first)return fix('[data-workspace-tab="inbox"]','回询盘挑一封客户来信。');
  return fix('[data-workspace-sleep-confirm]','确认今天的开支，进入下一天。')||
   fix('[data-workspace-sleep]','先查看开支；这一步还不会过天。');
 }
 if(!first){
  if(view.tab==='office')return fix('[data-workspace-intro="open"]','打开询盘，看客户的需求和交期。')||open('inbox');
  if(view.tab==='inbox')return fix('[data-first-buyer]','打开一封来信，先看需求和交期。')||
   fix('.opening-ask[data-action="PROPOSE"]:not(:disabled)','把方案发给客户确认，还不会签约或扣款。')||
   fix('[data-action="PROPOSE"]:not(:disabled)','接受条款并签约；签约后要垫付备货款。')||
   fix('.inquiry-choices button[aria-pressed="false"]:not(:disabled)','比较另一种报价的数量、交期和回款。');
  return open('inbox');
 }
 if(view.tab==='orders'){
  const order=view.detail??due??first;
  if(has(ONE))return fix(ONE,order.status==='receivable'?'把到期尾款记入账本。':
    order.deliveryDay===order.paymentDay?'交货，货款今天一并到账。':'先确认交货，到了回款日再收尾款。');
  if(due||!view.detail&&!everSlept(s)){
   const pick=due||first;
   return fix('[data-workspace-order-detail="'+pick.clientId+'"]',due?'这笔订单今天有待办，打开处理。':'打开刚签的订单，看看哪天交货、哪天回款。')||
    (due&&view.detail?open('orders'):null);
  }
 }
 if(due||view.tab!=='orders'&&!everSlept(s))return open('orders');
 return fix('[data-workspace-tab="afterwork"]','去下班页；在那儿休息才能推进日期。');
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
  if(step?.sel||on&&preference==='running'&&!step?.complete){
   if(!preference)set('running');
   const target=step?.sel?pick(step.sel):null;
   const panel=doc.createElement('aside');
   panel.className='ws-opening-guide';panel.setAttribute('aria-label','新手指引');
   const copy=doc.createElement('p');copy.id='ws-opening-guide-copy';
   if(target){
    const bold=doc.createElement('strong');
    bold.textContent='点「'+label(target)+'」';
    copy.append(bold,doc.createTextNode('：'+step.why));
    panel.append(copy);
   }else panel.classList.add('ws-guide-paused');
   const close=doc.createElement('button');
   close.type='button';close.className='ws-guide-close';close.textContent='关闭教程';
   close.onclick=()=>{
    set('off');
    remove(root);
    if(target?.isConnected)target.focus?.({preventScroll:true});
   };
   panel.append(close);
   if(!target){root.prepend(panel);return;}
   const intro=target.matches?.('[data-workspace-intro="open"]')?target.closest('.ws-intro-dialogue'):null;
   if(intro)root.setAttribute('data-opening-guide-context','intro');
   target.setAttribute('data-opening-guide-target','');
   const desc=target.getAttribute('aria-describedby');
   target.setAttribute('aria-describedby',(desc?desc+' ':'')+copy.id);
   const rail=intro?target.parentElement:target.closest('.inquiry-actions, .ws-nav, .inquiry-choices, .ws-agenda, .ws-original-note');
   (rail||target).before(panel);
   // Keep the highlighted real control discoverable after each player-driven render.
   const frame=doc.defaultView?.requestAnimationFrame;
   if(frame)frame.call(doc.defaultView,()=>{
    if(!target.isConnected||!target.hasAttribute('data-opening-guide-target'))return;
    const a=panel.getBoundingClientRect(),b=target.getBoundingClientRect();
    const top=Math.min(a.top,b.top),bottom=Math.max(a.bottom,b.bottom),height=doc.defaultView.innerHeight;
    if(top<6||bottom>height-6)target.scrollIntoView?.({block:'center',behavior:'instant'});
   });
   return;
  }

 };
 return {update,reset:({fresh=false}={})=>{
  auto=fresh;
  // Only a confirmed restart begins a different game. Refreshing the same
  // save preserves its current guide state, and importing a save skips it.
  set(fresh?'':'off');
 }};
}
