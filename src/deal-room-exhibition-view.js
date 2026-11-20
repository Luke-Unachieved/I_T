import {exhibitionWorks,EXHIBITION_THEMES,EXHIBITION_NOTES} from './deal-room-exhibition.js';
import {sampleSvg,cupPaperProofArt} from './deal-room-samples.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const draftOf=ui=>ui.draft||{theme:'journey',entries:[null,null,null]};
const seriesNames={cream:'米杏纸套',charcoal:'炭黑礼盒',botanical:'枝叶纹样','tidal-grid':'独立波线图样 · 分格内托'};
const series=work=>work.seriesSource?`<p class="exhibition-series exhibition-series-${esc(work.seriesSource.style)}"><strong>${esc(work.seriesSource.label)}</strong><br>${seriesNames[work.seriesSource.style]||''} · ${esc(work.seriesSource.signature)}</p>`:'';
// Exhibition snapshots stay immutable. Recover the visible package only from the
// exact paid source order; never use the customer's latest edition for an older cup.
function exhibitedCup(state,work){
 const m=work?.kind==='order'&&/^order-(0|[1-9]\d*)$/.exec(work.sourceId);
 const c=m&&state.contracts?.[Number(m[1])];
 if(!c||c.status!=='paid'||c.clientId!=='samir'||c.clientName!==work.buyer||c.quantity!==work.quantity||c.deliveryDay!==work.deliveryDay||!Number.isSafeInteger(c.paidDay??c.paymentDay)||(c.paidDay??c.paymentDay)<c.deliveryDay||(c.paidDay??c.paymentDay)>state.day||work.products?.length!==1||work.products[0].id!=='samir')return null;
 if(c.optionId==='cup-front-proof'&&c.specification==='branded'&&c.product==='保温杯 · 正面印标纸套')return 'front';
 if(c.optionId==='cup-back-proof'&&c.specification==='branded'&&c.product==='保温杯 · 独立背贴纸套')return 'back';
 return c.product==='不锈钢保温杯'&&(c.optionId==='branded'||c.optionId==='branded-opening'||c.specification==='branded')?'custom':null;
}
function exhibitedPackage(edition){
 if(edition!=='front'&&edition!=='back')return '';
 const back=edition==='back',label=back?'背面独立贴签':'正面直接印标';
 return `<details class="exhibition-proof" data-paid-cup-proof="${edition}"><summary>翻看这批杯子的纸套 · ${label}</summary>${cupPaperProofArt(edition,back?'正面保留原图案，背面有独立纸贴':'标签直接印在正面留白处，背面没有贴纸')}<p>${back?'买手采用了保留正面图案、另在背面平贴标签的版本。':'买手采用了正面留白、标签直接印在平面上的版本。'}</p></details>`;
}
const art=(state,work,details=true)=>{
 const edition=exhibitedCup(state,work);
 return `<div class="exhibition-products ${details?'exhibition-detail-scale':'exhibition-wall-scale'}">${work.products.map(p=>`<div class="exhibition-product annex-kind-${p.kind}">${sampleSvg(p.kind,p.kind==='cup'&&!!edition)}</div>`).join('')}</div>${details?series(work)+exhibitedPackage(edition):''}`;
};
// The shared DOM painter leaves native select labels untouched. Translate
// only the three canonical opening names, retaining their shop and product.
const openingAliases={Mira:'米拉',Samir:'萨米尔','Inês':'伊内斯'};
function exhibitOptionTitle(work){
 return work.kind==='order'?work.title.replace(/^(Mira|Samir|Inês)(?= · )/,name=>openingAliases[name]):work.title;
}
function stationControls(state,works,draft,slot){
 const e=draft.entries[slot];
 return `<fieldset class="exhibition-slot"><legend>第 ${slot+1} 站</legend><label>放哪一件<select data-exhibition-source="${slot}"><option value="">先留白</option>${works.map(w=>`<option value="${w.sourceId}" ${e?.sourceId===w.sourceId?'selected':''} ${draft.entries.some((v,i)=>i!==slot&&v?.sourceId===w.sourceId)?'disabled':''}>第${w.deliveryDay}天 · ${esc(exhibitOptionTitle(w))}${({front:' · 正面印标',back:' · 独立背贴',custom:' · 定制包装'})[exhibitedCup(state,w)]||''}</option>`).join('')}</select></label>
 ${e?`<details class="exhibition-station-note"><summary>注记与顺序</summary><label>给自己的注记<select data-exhibition-note="${slot}">${Object.entries(EXHIBITION_NOTES).map(([id,text])=>`<option value="${id}" ${e.note===id?'selected':''}>${text}</option>`).join('')}</select></label><div class="exhibition-reorder"><button data-exhibition-move="${slot}" data-direction="-1" ${slot===0?'disabled':''}>往前一站</button><button data-exhibition-move="${slot}" data-direction="1" ${slot===2?'disabled':''}>往后一站</button></div></details>`:''}</fieldset>`;
}
export function exhibitionView(state,ui={}){
 const works=exhibitionWorks(state),draft=draftOf(ui),history=state.privateExhibitions||[],saved=Number.isInteger(ui.record)?history[ui.record]:null;
 const wallEntries=saved?saved.entries:draft.entries.map(e=>e?{...e,work:works.find(w=>w.sourceId===e.sourceId)}:null);
 const entries=wallEntries.filter(e=>e?.work),theme=saved?saved.theme:draft.theme;
 const touring=ui.touring||!!saved,index=Math.max(0,Math.min(entries.length,ui.step||0)),end=touring&&index===entries.length,active=touring&&!end?entries[index]:null;
 const stage=active?`第 ${index+1} / ${entries.length} 站`:end?'观展结束':'展墙预览';
 const portrait=`<figure class="room-picture"><div class="exhibition-wall-viewport"><div class="exhibition-wall" role="img" aria-label="三处作品壁龛，已布置 ${entries.length} 处">${wallEntries.map((e,i)=>e?.work?`<div class="exhibition-wall-work exhibition-wall-${i} ${active?.sourceId===e.sourceId?'exhibition-highlight':''}">${art(state,e.work,false)}</div>`:'').join('')}</div></div><figcaption class="room-caption"><b>${stage}</b><span>${saved?'第 '+saved.day+' 天留存':touring?EXHIBITION_THEMES[theme]:entries.length+' / 3 个展位'}</span></figcaption></figure>`;
 const edit=touring?'':`<fieldset class="exhibition-theme"><legend>选一个主题</legend>${Object.entries(EXHIBITION_THEMES).map(([id,name])=>`<button data-exhibition-theme="${id}" aria-pressed="${draft.theme===id}">${name}</button>`).join('')}</fieldset>
 ${[0,1,2].map(slot=>stationControls(state,works,draft,slot)).join('')}
 <button class="room-primary" data-exhibition-start ${entries.length?'':'disabled'}>开始观展</button><small>${entries.length?'可留空展位，逛完再决定是否留存。':'至少选一件作品，其他展位可以留白。'}</small>`;
 const visit=active?`<section class="exhibition-current" tabindex="-1" aria-label="第${index+1}站作品"><h3>${esc(active.work.title)}</h3>${art(state,active.work)}<p>第 ${active.work.deliveryDay} 天交付 · ${['case','account'].includes(active.work.kind)?'每款 ':''}${active.work.quantity} 件${active.work.kind==='account'?` · 第 ${active.work.paymentDay} 天收齐`:''}</p><blockquote>“${EXHIBITION_NOTES[active.note]}”</blockquote></section>
 <div class="exhibition-tour-controls"><button data-exhibition-prev ${index===0?'disabled':''}>上一站</button><button class="room-primary" data-exhibition-next>${index===entries.length-1?'结束观展':'去下一站'}</button></div>`:end?`<section class="exhibition-current" tabindex="-1"><h3>${theme==='journey'?'这些，都是一步步做成的':'这一次，按自己的喜欢来'}</h3><ol class="exhibition-lineup">${entries.map(e=>`<li>${esc(e.work.title)}</li>`).join('')}</ol>${saved?'<small>这场小展已留存</small>':'<button class="room-primary" data-exhibition-save>留存这场小展</button>'}</section>
 <div class="exhibition-tour-controls"><button data-exhibition-prev>再看最后一站</button>${entries.length>1?'<button data-exhibition-restart>从第一站重看</button>':''}</div>`:'';
 return `<section class="exhibition-panel room-edition"><header class="room-heading"><div><small>会客室 / 私人小展</small><h2>${touring?EXHIBITION_THEMES[theme]:'给自己办一场小展'}</h2>${touring?'':'<p class="exhibition-draft-hint">挑几件作品，按你喜欢的顺序摆。</p>'}</div><button class="room-back" data-exhibition-close>回会客室</button></header>
 ${portrait}<div class="room-side exhibition-console">${touring?visit:edit}
 ${touring&&!saved?'<button class="room-disclosure" data-exhibition-edit>再布置一下</button>':''}${saved?'<button class="room-disclosure" data-exhibition-new>另布置一场，旧记录留着</button>':''}</div>
 ${history.length?`<details class="exhibition-archive"><summary>以前留存的小展 · ${history.length} 场</summary>${history.map((r,i)=>`<button data-exhibition-record="${i}">第 ${r.day} 天 · ${EXHIBITION_THEMES[r.theme]} · ${r.entries.filter(Boolean).length} 站</button>`).join('')}</details>`:''}</section>`;
}
export function bindExhibition(root,{getState,getUI,setUI,dispatch,close}){
 const focus=(attr,value)=>{const ns=[...root.querySelectorAll('['+attr+']')],target=value===undefined?ns[0]:ns.find(n=>n.getAttribute(attr)===String(value)),fold=target?.closest?.('details');if(fold)fold.open=true;target?.focus?.({preventScroll:true});};
 const update=(patch,attr,value)=>{setUI({...getUI(),...patch});if(attr)focus(attr,value);};
 const setDraft=(d,attr,value)=>update({draft:d,touring:false,record:undefined,step:0},attr,value);
 const tourFocus=()=>{const station=root.querySelector('.exhibition-current');station?.focus?.({preventScroll:true});station?.scrollIntoView?.({block:'nearest'});};
 root.querySelector('[data-exhibition-close]')?.addEventListener('click',close);
 root.querySelectorAll('[data-exhibition-theme]').forEach(b=>b.onclick=()=>setDraft({...draftOf(getUI()),theme:b.dataset.exhibitionTheme},'data-exhibition-theme',b.dataset.exhibitionTheme));
 root.querySelectorAll('[data-exhibition-source]').forEach(b=>b.onchange=()=>{const slot=Number(b.dataset.exhibitionSource),d=structuredClone(draftOf(getUI())),sourceId=b.value;if(sourceId&&(!exhibitionWorks(getState()).some(w=>w.sourceId===sourceId)||d.entries.some((e,i)=>i!==slot&&e?.sourceId===sourceId)))return;d.entries[slot]=sourceId?{sourceId,note:d.entries[slot]?.note||'made-it'}:null;setDraft(d,'data-exhibition-source',slot);});
 root.querySelectorAll('[data-exhibition-note]').forEach(b=>b.onchange=()=>{const slot=Number(b.dataset.exhibitionNote),d=structuredClone(draftOf(getUI()));if(!d.entries[slot]||!Object.hasOwn(EXHIBITION_NOTES,b.value))return;d.entries[slot].note=b.value;setDraft(d,'data-exhibition-note',slot);});
 root.querySelectorAll('[data-exhibition-move]').forEach(b=>b.onclick=()=>{const slot=Number(b.dataset.exhibitionMove),target=slot+Number(b.dataset.direction),d=structuredClone(draftOf(getUI()));if(target<0||target>2)return;[d.entries[slot],d.entries[target]]=[d.entries[target],d.entries[slot]];setDraft(d,'data-exhibition-source',target);});
 root.querySelector('[data-exhibition-start]')?.addEventListener('click',()=>{if(!draftOf(getUI()).entries.some(Boolean))return;update({touring:true,step:0});tourFocus();});
 for(const [attr,delta]of [['data-exhibition-prev',-1],['data-exhibition-next',1]])root.querySelector('['+attr+']')?.addEventListener('click',()=>{update({step:Math.max(0,(getUI().step||0)+delta)});tourFocus();});
 root.querySelector('[data-exhibition-restart]')?.addEventListener('click',()=>{update({step:0});tourFocus();});
 root.querySelector('[data-exhibition-edit]')?.addEventListener('click',()=>update({touring:false,step:0},'data-exhibition-source',0));
 root.querySelector('[data-exhibition-new]')?.addEventListener('click',()=>update({record:undefined,touring:false,step:0,draft:{theme:'journey',entries:[null,null,null]}},'data-exhibition-source',0));
 root.querySelectorAll('[data-exhibition-record]').forEach(b=>b.onclick=()=>{const record=Number(b.dataset.exhibitionRecord);if(!getState().privateExhibitions?.[record])return;update({record,touring:true,step:0});tourFocus();});
 root.querySelector('[data-exhibition-save]')?.addEventListener('click',()=>{const d=draftOf(getUI());dispatch({type:'SAVE_PRIVATE_EXHIBITION',theme:d.theme,entries:d.entries});const record=(getState().privateExhibitions?.length||0)-1;if(record<0)return;update({record,touring:true,step:getState().privateExhibitions[record].entries.filter(Boolean).length});tourFocus();});
}
