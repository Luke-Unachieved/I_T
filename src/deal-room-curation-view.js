const money=n=>`¥${Number(n||0).toLocaleString('zh-CN')}`;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function curationView(brief,draft,q,development=null,demo=null){return `<section class="curation-controls"><button class="back-clients" data-action="BACK_FROM_CURATION">← 换一份引荐</button><h3>这次，由你搭配整组产品</h3><p class="brief">${esc(brief.purpose)}</p><div class="curation-budget"><span>整单报价 <b>${money(q.revenue)}</b></span><span>预算 ${money(brief.budget)}</span><progress aria-label="报价占预算" max="${brief.budget}" value="${Math.min(q.revenue||0,brief.budget)}"></progress></div>${sampleControls(brief,draft,development)}${demo?curationDemoView(demo):''}<fieldset><legend>每种产品各多少件</legend>${[40,60].map(n=>`<button data-curation-quantity="${n}" aria-pressed="${draft.quantity===n}">${n} 套</button>`).join('')}</fieldset><fieldset><legend>怎么呈现</legend><button data-curation-pack="plain" aria-pressed="${draft.packaging==='plain'}">常规包装</button><button data-curation-pack="gift" aria-pressed="${draft.packaging==='gift'}" ${brief.giftAllowed?'':'disabled'}>${brief.giftAllowed?'整组礼盒':'日常补货，无需礼盒'}</button></fieldset>${q.valid?`<div class="offer"><div><small>这组净赚</small><strong>${money(q.netProfit)}</strong></div><div><small>交货</small><strong>第 ${q.deliveryDay} 天</strong></div><div><small>收齐</small><strong>第 ${q.paymentDay} 天</strong></div></div>`:`<p class="counter" role="status">${esc(q.reason)}</p>`}<details><summary>报价与支出</summary><p>每套报价 ${money(q.price)} · 采购包装 ${money(q.cost)} · 日常支出 ${money(q.operatingCost)}<br>先收五成 ${money(q.deposit)}，余款 ${money(q.balanceDue)}</p></details><button class="primary" data-action="SIGN_CURATION" ${q.valid?'':'disabled'}>把这组搭配交给买手 →</button></section>`;}
export function businessFeedback(state,{viewingCase=null,supplyDraft=null}={}){
 if(state.history?.at(-1)?.type==='CLOSE_CASE_GROWTH'&&state.caseGrowth?.status==='paid')return '这批已结清，客户留在合作簿里；下次按门店实际需求继续谈。';
 if(viewingCase)return `${viewingCase.buyer} · 第 ${viewingCase.deliveryDay} 天已交付，货款已收齐。`;
 if(supplyDraft)return '按客户两次收货日期，谈妥付款安排。';
 if(state.feedback?.kind==='supply-complete')return `两批货已收齐，净赚 ${money(state.supplyPlan.netProfit)}。`;
 return state.feedback?.message||'一位海外客户发来了采购需求。';
}

function sampleControls(brief,draft,development){
 if(development?.status!=='active'||!(draft.products||[]).includes('mira'))return '';
 if(development.factory!=='studio')return '<p class="brief sample-boundary">新工厂至少180盏起做，这份40/60套组合仍用原供应商。</p>';
 if(!brief.giftAllowed)return '<p class="brief sample-boundary">Northline：按原来的标准灯补货，不需要加价调光。新样留给主题选品。</p>';
 return `<fieldset class="curation-version"><legend>带哪一版台灯给买手</legend><button data-lamp-version="standard" aria-pressed="${draft.lampVersion!=='developed'}">旧款 · ¥55 / 盏</button><button data-lamp-version="developed" aria-pressed="${draft.lampVersion==='developed'}">三档调光 · ¥75 / 盏</button><small>主题买手接受调光新样，但不会增加整组预算。</small></fieldset>`;
}

/** Trying the actual selected sample is free; no hidden approval, money or time reward. */
export function curationDemoModel(brief,draft,{open=false,room='day',brightness=1}={}){
 if(!(draft.products||[]).includes('mira'))return null;
 const developed=draft.lampVersion==='developed',night=room==='night';
 const level=developed&&[0,1,2].includes(brightness)?brightness:1;
 const message=!brief.giftAllowed?'我按原规格补货，门店不用重新教店员。新功能这次先不用。':night?(developed?(level===0?'这档柔光适合睡前。同一盏能从看书切到床头，不只是多一个开关。':level===1?'看书可以；睡前我想再柔一点，试试低一档？':'这一档照陈列很醒目，睡前就太亮了。试试低一档？'):'旧款就是这一档。做日常台灯没问题，不能把调光当卖点。'):(developed?(level===0?'白天看样有点暗。把它调亮，我想看清桌上这组搭配。':'白天的搭配看清了。再试试晚上，看看新功能值不值得占这份预算。'):'这版用途直接。省下的预算可以留给更多套数或另一件搭配。');
 return {open,room:night?'night':'day',developed,level,glow:night?[.25,.6,1][level]:[.12,.3,.65][level],message,buyer:brief.giftAllowed?'Élise':'Adrian'};
}
export function curationDemoView(demo){
 return `<section class="buyer-demo"><button class="demo-toggle" id="toggle-buyer-demo" aria-expanded="${demo.open}">${demo.open?'收起试用':'和买手一起试灯'} ${demo.open?'↑':'→'}</button>${demo.open?`<div class="demo-controls"><div class="buyer-demo-preview ${demo.room}" role="img" aria-label="${demo.developed?'调光样品':'旧款样品'} · ${demo.room==='night'?'夜间':'白天'} · ${['柔光','阅读亮度','亮光'][demo.level]}" style="--sample-light:${demo.glow};--lamp-brightness:${[.75,.95,1.12][demo.level]}"><div class="sample-glow"></div><div class="trial-lamp"></div></div><div role="group" aria-label="试用环境">${[['day','白天陈列'],['night','夜间使用']].map(([id,name])=>`<button data-demo-room="${id}" aria-pressed="${demo.room===id}">${name}</button>`).join('')}</div>${demo.developed?`<div role="group" aria-label="给买手试灯亮度">${['柔光','阅读','亮光'].map((name,i)=>`<button data-demo-light="${i}" aria-pressed="${demo.level===i}">${name}</button>`).join('')}</div>`:'<small>旧款固定亮度；切换环境不会改产品。</small>'}<p role="status"><strong>${demo.buyer}</strong>：${demo.message}</p><small>只试样，不签单、不收费。成交仍按下面的方案。</small></div>`:''}</section>`;
}

export function toggleCurationProduct(draft,id,anchor){
 if(id===anchor||!['mira','samir','ines'].includes(id))return draft;
 const next={...draft,products:draft.products.includes(id)?draft.products.filter(p=>p!==id):[...draft.products,id]};
 if(!next.products.includes('mira'))delete next.lampVersion;
 return next;
}
