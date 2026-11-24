import {spendingLiquidityView} from './deal-room-spending.js?v=36';
import {annexPreview,annexSamples} from './deal-room-annex.js';
import {sampleSvg} from './deal-room-samples.js';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function annexItemArt(item){return item.kind==='case'?`<div class="annex-case-products">${item.products.map(p=>`<div class="annex-case-product annex-kind-${p.kind}">${sampleSvg(p.kind)}</div>`).join('')}</div><span>合作 ${item.caseIndex+1}</span>`:`${sampleSvg(item.kind)}<span>${escape(item.name)}</span>`;}
function annexCaseNotes(display,samples){
 const selected=display.map((id,slot)=>({item:samples.find(x=>x.id===id),slot})).filter(x=>x.item?.kind==='case');
 if(!selected.length)return '';
 return `<details class="annex-case-notes"><summary>已陈列的合作（${selected.length} 组）</summary>${selected.map(({item,slot})=>`<article><small>${slot===0?'左边':'右边'}已交付的选品组合</small><h3>${escape(item.buyer)}</h3><p>${item.products.map(p=>escape(p.name)).join('、')}，每款 ${item.quantity} 件，${item.packaging}</p><small>第 ${item.deliveryDay} 天交付</small></article>`).join('')}</details>`;
}
const money=n=>'¥'+Number(n).toLocaleString('zh-CN');
export function annexView(state,ui={}){
 const q=annexPreview(state),d=state.officeAnnex||ui.preview||{display:['',''],doorOpen:false,light:'day'},samples=annexSamples(state),outside=!!ui.terrace&&d.doorOpen;
 const light=d.light==='warm'?'暖灯':'日光',place=outside?'露台':'会客室';
 return `<section class="annex-panel room-edition"><header class="room-heading"><div><small>${q.owned?'':'免费预览'}</small><h2>样品会客室</h2></div><button class="room-back" data-annex-close>回工作室</button></header>
 <figure class="room-picture"><div class="annex-viewport"><div class="annex-scene ${d.light==='warm'?'annex-warm':''} ${outside?'annex-outside':''}" role="img" aria-label="${outside?'露台的城市与绿植':'样品陈列桌与窗外露台'}，${light}，推拉门${d.doorOpen?'打开':'关闭'}"><div class="annex-doorway"><div class="annex-glass ${d.doorOpen?'annex-door-open':''}"></div></div><div class="annex-light-wash"></div><div class="annex-table">${d.display.map((id,slot)=>{const item=samples.find(x=>x.id===id);return item?`<div class="annex-sample annex-slot-${slot} annex-kind-${item.kind}">${annexItemArt(item)}</div>`:'';}).join('')}</div></div></div>
 <figcaption class="room-caption" role="status"><b>${place}</b><span>${light}，推拉门${d.doorOpen?'已开':'已关'}</span></figcaption>
 <div class="room-actions annex-controls"><button data-annex-door aria-pressed="${d.doorOpen}">${d.doorOpen?'关上推拉门':'打开推拉门'}</button><button data-annex-terrace ${!d.doorOpen?'disabled':''} aria-pressed="${outside}">${outside?'回到样品桌':'去露台'}</button><button data-annex-light aria-pressed="${d.light==='warm'}">${d.light==='warm'?'关掉暖灯':'打开暖灯'}</button></div></figure>
 <aside class="room-side">
 <fieldset class="annex-display"><legend>陈列桌</legend>${[0,1].map(slot=>`<label>${slot===0?'左边':'右边'}<select data-annex-display="${slot}"><option value="" ${!d.display[slot]?'selected':''}>先留空</option>${samples.map(item=>`<option value="${item.id}" ${d.display[slot]===item.id?'selected':''} ${d.display[1-slot]===item.id?'disabled':''}>${escape(item.name)}</option>`).join('')}</select></label>`).join('')}</fieldset>
 ${annexCaseNotes(d.display,samples)}
 ${!q.owned?`<section class="room-purchase annex-purchase"><h3>加一间会客室</h3><p>原办公室保留。</p><div class="room-cost"><small>一次付清</small><strong>${money(q.price)}</strong></div><p class="room-balance">${q.cashAfter>=0?'布置完还剩 '+money(q.cashAfter):'还差 '+money(-q.cashAfter)}</p>${q.valid?spendingLiquidityView(state,q.price):''}<button class="room-primary" data-annex-buy ${q.valid?'':'disabled'}>买下会客室</button></section>`:''}
 </aside></section>`;
}
export function bindAnnex(root,{getState,getUI,setUI,dispatch,close}){
 const focus=(attr,value)=>{const nodes=[...root.querySelectorAll('['+attr+']')];(value===undefined?nodes[0]:nodes.find(n=>n.getAttribute(attr)===value))?.focus?.({preventScroll:true});};
 const config=()=>getState().officeAnnex||getUI().preview||{display:['',''],doorOpen:false,light:'day'};
 const change=(action,previewPatch,attr,value)=>{if(getState().officeAnnex)dispatch(action);else setUI({...getUI(),preview:{...config(),...previewPatch}});focus(attr,value);};
 root.querySelectorAll('[data-annex-close]').forEach(b=>b.onclick=close);
 root.querySelector('[data-annex-door]')?.addEventListener('click',()=>{const open=!config().doorOpen;if(!open&&getUI().terrace)setUI({...getUI(),terrace:false});change({type:'SET_ANNEX_DOOR',open},{doorOpen:open},'data-annex-door');});
 root.querySelector('[data-annex-light]')?.addEventListener('click',()=>{const light=config().light==='day'?'warm':'day';change({type:'SET_ANNEX_LIGHT',light},{light},'data-annex-light');});
 root.querySelector('[data-annex-terrace]')?.addEventListener('click',()=>{if(!config().doorOpen)return;setUI({...getUI(),terrace:!getUI().terrace});focus('data-annex-terrace');});
 root.querySelectorAll('[data-annex-display]').forEach(b=>b.onchange=()=>{const slot=Number(b.dataset.annexDisplay),sampleId=b.value,display=[...config().display];display[slot]=sampleId;change({type:'SET_ANNEX_DISPLAY',slot,sampleId},{display},'data-annex-display',String(slot));});
 root.querySelector('[data-annex-buy]')?.addEventListener('click',()=>{if(!annexPreview(getState()).valid)return;const chosen=structuredClone(config());dispatch({type:'BUY_OFFICE_ANNEX'});if(!getState().officeAnnex)return;for(const [slot,sampleId] of chosen.display.entries())if(sampleId)dispatch({type:'SET_ANNEX_DISPLAY',slot,sampleId});if(chosen.doorOpen)dispatch({type:'SET_ANNEX_DOOR',open:true});if(chosen.light==='warm')dispatch({type:'SET_ANNEX_LIGHT',light:'warm'});setUI({...getUI(),preview:undefined,terrace:false});focus('data-annex-display','0');});
}
