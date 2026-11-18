import {quoteCommitmentView} from './deal-room-quote-view.js';
const money=n=>`¥${Number(n||0).toLocaleString('zh-CN')}`;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function curationView(brief,draft,q,development=null,demo=null,availableCash=null){return `<section class="curation-controls"><button class="back-clients" data-action="BACK_FROM_CURATION">← 换一份引荐</button><h3>这次，由你搭配整组产品</h3><p class="brief">${esc(brief.purpose)}</p><div class="curation-budget"><span>整单报价 <b>${money(q.revenue)}</b></span><span>预算 ${money(brief.budget)}</span><progress aria-label="报价占预算" max="${brief.budget}" value="${Math.min(q.revenue||0,brief.budget)}"></progress></div>${sampleControls(brief,draft,development)}${demo?curationDemoView(demo):''}${materialWorkbench(draft)}<fieldset><legend>每种产品各多少件</legend>${[40,60].map(n=>`<button data-curation-quantity="${n}" aria-pressed="${draft.quantity===n}">${n} 套</button>`).join('')}</fieldset><fieldset><legend>怎么呈现</legend><button data-curation-pack="plain" aria-pressed="${draft.packaging==='plain'}">常规包装</button><button data-curation-pack="gift" aria-pressed="${draft.packaging==='gift'}" ${brief.giftAllowed?'':'disabled'}>${brief.giftAllowed?'整组礼盒':'日常补货，无需礼盒'}</button></fieldset>${quoteCommitmentView({cash:availableCash},q,{action:'SIGN_CURATION',quantityLabel:`${draft.quantity} 套`})}</section>`;}
function materialWorkbench(draft){
 const ids=draft?.products||[];
 return [['samir','杯盖与杯口','保温杯试用'],['ines','布面与桌沿','棉麻桌布试铺']].filter(([id])=>ids.includes(id)).map(([id,legend,title])=>{
  const cup=id==='samir',tag=cup?'flask':'linen',modes=cup?['看杯身','拧开倒茶','盖好带走']:['看折样','铺上桌沿','摆好双人位'];
  const captions=cup?['金属杯身和旋盖。','旋下杯盖，往杯口倒茶。','杯盖已旋回，拿起看看携带的样子。']:['折起来看棉麻的织纹与锁边。','展开一面，让布沿自然垂过桌角。',ids.includes('samir')?'摆两份餐具，把本次选的保温杯也带上桌。':'摆两份餐具，看看布面留给用餐的位置。'];
  return `<details class="material-study" data-study="${tag}"><summary>${title}<span>${legend}</span></summary><fieldset class="study-switches"><legend>${cup?'试用动作':'试铺方式'}</legend>${modes.map((v,i)=>`<input type="radio" class="study-choice mode-${i}" id="study-${tag}-${i}" name="study-${tag}" ${i===0?'checked':''}><label for="study-${tag}-${i}">${v}</label>`).join('')}<div class="study-frame"><svg viewBox="0 0 400 168" aria-hidden="true" focusable="false">${cup?flaskStudyArt():linenStudyArt(ids.includes('samir'))}</svg>${captions.map((s,i)=>`<p class="study-caption caption-${i}">${s}</p>`).join('')}</div></fieldset></details>`;
 }).join('');
}

function flaskStudyArt(){return `<defs>
<linearGradient id="fs-wall" x2=".9" y2="1" gradientUnits="objectBoundingBox"><stop stop-color="#c4d4ce"/><stop offset="1" stop-color="#eee0cb"/></linearGradient>
<linearGradient id="fs-alloy"><stop stop-color="#516f70"/><stop offset=".16" stop-color="#95a9a4"/><stop offset=".33" stop-color="#d9dfd6"/><stop offset=".53" stop-color="#9dafaa"/><stop offset=".82" stop-color="#688481"/><stop offset="1" stop-color="#425c5e"/></linearGradient>
<linearGradient id="fs-glass"><stop stop-color="#f6f0d8" stop-opacity=".85"/><stop offset="1" stop-color="#aaa891" stop-opacity=".7"/></linearGradient>
<pattern id="fs-mat" width="7" height="5" patternUnits="userSpaceOnUse"><path d="m0 4 7-3m-2 4 3-1" stroke="#e9dbc0" stroke-opacity=".54" stroke-width=".9"/></pattern></defs>
<rect width="400" height="168" rx="8" fill="url(#fs-wall)"/><path d="M22 108V7h73v101m-3-54H22m36-47v102" fill="none" stroke="#f7eee2" stroke-width="5" opacity=".66"/><path d="M0 112 400 101v67H0" fill="#bd9874"/><path d="m0 133 400-25M0 157l400-35" stroke="#886646" stroke-opacity=".3"/>
<path d="m76 133 167-14 58 25-182 17z" fill="#a98e70"/><path d="m76 133 167-14 58 25-182 17z" fill="url(#fs-mat)"/><ellipse class="flask-shadow" cx="190" cy="140" rx="36" ry="5" fill="#4d4d42" opacity=".23"/>
<g class="flask-vessel"><path d="M176 65v9q-8 3-8 12v44q0 11 20 12t21-12V86q0-9-8-12v-9" fill="url(#fs-alloy)" stroke="#496864" stroke-width="1.8"/><path d="M174 81q-4 5-3 17v27" fill="none" stroke="#eef1dd" stroke-width="2.5" stroke-linecap="round"/><path d="M169 128q20 6 40-1v5q-5 11-21 10t-19-9z" fill="#5a7471"/><ellipse cx="188.5" cy="65" rx="13" ry="4" fill="#476461" stroke="#d5ded3" stroke-width="2"/><g fill="none" stroke="#708985" stroke-width="1.5"><path d="M176 68q13 4 25 0m-25 4q13 3 25 0"/></g><g class="flask-cap"><rect x="174" y="54" width="29" height="16" rx="4" fill="#586a5d" stroke="#354f49" stroke-width="1.5"/><ellipse cx="188.5" cy="54" rx="14" ry="4" fill="#97a28a"/><path d="M179 58v8m4-7v8m4-7v8m5-8v8m5-9v8" stroke="#afb59b" opacity=".6"/></g></g>
<g class="study-pitcher"><path d="M113 44q-23-10-22 7t17 16" fill="none" stroke="#9e9f88" stroke-width="5"/><path d="m105 38 12-4 26 5 13-3-10 15-5 23q-15 9-34-2z" fill="url(#fs-glass)" stroke="#7e8c7c" stroke-width="2"/><path d="m107 51 35 5-4 16q-13 6-28-2z" fill="#c28043" opacity=".9"/><path d="m111 44 2 10" stroke="#fffbdd" stroke-width="2"/></g>
<path class="flask-stream" d="M164 38q19 3 24 26" fill="none" stroke="#b77e40" stroke-width="2.6" stroke-linecap="round"/><g class="flask-steam" fill="none" stroke="#fff9de" stroke-width="2" stroke-linecap="round"><path d="M194 58q7-7 1-13t2-12m-13 23q-5-5-2-10"/></g>`;}

function linenStudyArt(pair){return `<defs><linearGradient id="ls-wall" x2=".95" y2="1"><stop stop-color="#d9c7ab"/><stop offset="1" stop-color="#f1e8d5"/></linearGradient><linearGradient id="ls-top" x2=".9" y2="1"><stop stop-color="#73968b"/><stop offset="1" stop-color="#acc0a6"/></linearGradient><linearGradient id="ls-drop" x2="1" y2="0"><stop stop-color="#657f76"/><stop offset=".3" stop-color="#adc0a5"/><stop offset=".48" stop-color="#789787"/><stop offset=".8" stop-color="#9eb89d"/><stop offset="1" stop-color="#637e72"/></linearGradient><pattern id="ls-weave" width="5" height="4" patternUnits="userSpaceOnUse"><path d="M0 1h5M1 0v4" fill="none" stroke="#f4f0d3" opacity=".34" stroke-width=".7"/></pattern></defs>
<rect width="400" height="168" rx="8" fill="url(#ls-wall)"/><path d="M259 112V10h100v102M257 54h104m-53-46v102" fill="none" stroke="#fbf0d7" opacity=".5" stroke-width="5"/><path d="M0 125 400 110v58H0" fill="#d4ba95"/><path d="m78 110 236-12-5 52M96 111l4 42" stroke="#705a44" stroke-width="8" fill="none"/><path d="m67 89 232-19 39 31-238 28z" fill="#ba9570" stroke="#937456" stroke-width="2"/><path d="m100 129 238-28v6l-239 27-32-34V89" fill="#917153"/>
<g class="linen-open"><path d="m58 88 242-22 47 35-249 29z" fill="url(#ls-top)"/><path d="m58 88 242-22 47 35-249 29z" fill="url(#ls-weave)"/><path d="m58 88 40 42 249-29-8 20-17 1-9 3-20-1-18 6-31 1-28 7-28-1-34 7-29-1-20 5-13-1-5-7-13-9z" fill="url(#ls-drop)"/><path d="m58 88 40 42 249-29-8 20-17 1-9 3-20-1-18 6-31 1-28 7-28-1-34 7-29-1-20 5-13-1-5-7-13-9z" fill="url(#ls-weave)"/><path d="m68 93 29 30 239-26M93 137l10 6 23-4 27 1 36-7 25 1 28-6 31-2 18-5 21 1 18-5" stroke="#ece0bd" stroke-width="1.6" fill="none" stroke-dasharray="4 2"/></g>
<g class="linen-fold"><path d="m132 93 63-11 46 15-65 13-44-12z" fill="#557669" stroke="#526e62"/><path d="m129 90 66-12 45 15-65 14z" fill="url(#ls-top)"/><path d="m129 90 66-12 45 15-65 14z" fill="url(#ls-weave)"/><path d="m138 91 39 12 52-10m-52 14 49-10" fill="none" stroke="#e7ddbd" stroke-width="1.4" stroke-dasharray="3 2"/></g>
<g class="linen-place"><g class="setting-left"><ellipse cx="146" cy="101" rx="27" ry="7.8" fill="#738577" opacity=".4"/><ellipse cx="145" cy="98" rx="26" ry="7" fill="#f8efd9" stroke="#938c76" stroke-width="1.3"/><ellipse cx="145" cy="98" rx="19" ry="4.5" fill="none" stroke="#c9bca0"/><path d="m110 96 8 10m-10-10 3 4 4-2m59-5 7 9" stroke="#687365" stroke-width="2" fill="none"/></g><g class="setting-right"><ellipse cx="263" cy="89" rx="22" ry="6" fill="#738577" opacity=".4"/><ellipse cx="262" cy="87" rx="21" ry="5.8" fill="#f8efd9" stroke="#938c76" stroke-width="1.2"/><ellipse cx="262" cy="87" rx="15" ry="3.6" fill="none" stroke="#c9bca0"/><path d="m235 85 6 7m46-10 5 7" stroke="#687365" stroke-width="1.6"/></g>${pair?'<g class="linen-paired-flask"><ellipse cx="205" cy="94" rx="10" ry="2.8" fill="#667b68" opacity=".4"/><path d="M199 63h10v6l3 2v18q0 5-8 5t-8-5V71l3-2z" fill="#91a9a0" stroke="#526c64"/><path d="M199 60h10v5h-10z" fill="#576c60"/><path d="M199 73v13" stroke="#dde6cf" stroke-width="1.6"/></g>':''}</g>`;}

export function businessFeedback(state,{viewingCase=null,supplyDraft=null}={}){
 if(state.feedback?.kind==='personal-life')return (state.feedback.message||'').replace('这是个人消费，不会提高订单收益。','把忙碌换成一点自己的日常。');
 if(state.feedback?.kind==='account-back')return '这份采购先放一放。';
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
 return `<section class="buyer-demo"><button class="demo-toggle" id="toggle-buyer-demo" aria-expanded="${demo.open}">${demo.open?'收起试用':'和买手一起试灯'} ${demo.open?'↑':'→'}</button>${demo.open?`<div class="demo-controls"><div class="buyer-demo-preview ${demo.room}" role="img" aria-label="${demo.developed?'调光样品':'旧款样品'} · ${demo.room==='night'?'夜间':'白天'} · ${['柔光','阅读亮度','亮光'][demo.level]}" style="--sample-light:${demo.glow};--lamp-brightness:${[.75,.95,1.12][demo.level]}"><div class="sample-glow"></div><div class="trial-lamp"></div></div><div role="group" aria-label="试用环境">${[['day','白天陈列'],['night','夜间使用']].map(([id,name])=>`<button data-demo-room="${id}" aria-pressed="${demo.room===id}">${name}</button>`).join('')}</div>${demo.developed?`<div role="group" aria-label="给买手试灯亮度">${['柔光','阅读','亮光'].map((name,i)=>`<button data-demo-light="${i}" aria-pressed="${demo.level===i}">${name}</button>`).join('')}</div>`:'<small>这盏灯只有一档亮度，换到夜间看看效果。</small>'}<p role="status"><strong>${demo.buyer}</strong>：${demo.message}</p><small>只试样，不签单、不收费。成交仍按下面的方案。</small></div>`:''}</section>`;
}

export function toggleCurationProduct(draft,id,anchor){
 if(id===anchor||!['mira','samir','ines'].includes(id))return draft;
 const next={...draft,products:draft.products.includes(id)?draft.products.filter(p=>p!==id):[...draft.products,id]};
 if(!next.products.includes('mira'))delete next.lampVersion;
 return next;
}

// Presentation-only wording. Historical feedback remains untouched for replay.
const playerStatusCopies=Object.freeze({
 '12盏灯已送到小店，按约定陈列4天后收款、收回留样。':'12盏灯已送到小店，按约定陈列4天后收款。',
 '尚未签约，回工作室看看其他业务。':'回到工作室，看看接下来做什么。',
 '方案已调整，还没有改变采购承诺。':'这一版摆好了，看看客户觉得合不合适。',
 '回到已确认规格，未签的新用途没有改变旧采购。':'先按上次确认的样子做，这份新想法以后再谈。',
 '回到工作室，本次询盘和库存记录保留。':'先回工作室，这份询盘留着再看。',
 '尚未签约，已换成这位买手实际采用过的版本；旧客户合同保持不变。':'这次拿买手用过的这版来谈，先看看门店的报价。',
 '首次合作直接采用已交付的工作室原稿。范围已签，待交付后记入实际采用。':'买手订下了工作室原稿这一版，接下来安排制作和交付。',
 '12盏已交付并收款。余货是工作室库存成本，不是收入或利润。':'12盏已交付，货款已收到。余下的灯留在工作室，等合适的新订单。',
 '现货已按合同预留扣出，只支付剩余商品与包装制作款；已付灯具成本仍计入本单成本。':'现货已留给这位客户，其他商品和包装也已安排制作。',
 '未签约，资金和日期保持不变。':'这份采购先放一放。',
 '回到工作室。未签方案没有改变任何案例权限。':'这次先不签，案例仍留在工作室。',
 '工厂收到出样委托。样品还未验收，不会提前加入报价。':'工厂正在打样，收到后先试灯再谈订单。',
 '把方案摆出来，再请客户判断用途。旧合作不会因此取消。':'把产品摆出来，看看客户想怎样使用。',
 '方案留在工作室，未签采购不会扣款。':'这份方案先留在工作室。',
 '先回工作室做别的业务。已交付案例保留，专题日期不会重排。':'先做别的生意，记得客户原定的收货日期。'
});
export function playerStatusText(text){
 const value=String(text??'');
 return playerStatusCopies[value]||value.replace('，这是个人消费，不会提高订单收益。','。').replace('，旧版订单没有改变。','。').replace('保留已交付的那件产品，再搭配一件，不必先做返单。','以之前交付的那件产品为主角，再搭配一件给买手看看。');
}

export function curationReceiptView(state){
 const c=state.curation;
 if(state.feedback?.kind!=='curation-paid'||c?.status!=='paid'||![c.balanceDue,c.netProfit,state.cash,c.quantity].every(Number.isFinite))return '';
 return `<section class="curation-receipt" aria-label="这笔合作的回款"><small>这一单做成了</small><h3>${esc(c.buyer)} 已收齐这组产品</h3><p>${c.products.length} 款产品，各 ${c.quantity} 件，已经摆进客户的店里。</p><dl><div><dt>尾款到账</dt><dd>${money(c.balanceDue)}</dd></div><div><dt>${c.netProfit<0?'本单亏损':'这次净赚'}</dt><dd>${money(Math.abs(c.netProfit))}</dd></div><div><dt>手头现在有</dt><dd>${money(state.cash)}</dd></div></dl><small>货款已收齐。可以看看下一份合作，也可以下班回家。</small></section>`;
}
