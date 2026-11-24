import {netProfitAmount} from './deal-room-net-profit.js';
import {openingDialogueQuote} from './deal-room-opening-dialogue.js';
import {acceptedLampSample} from './deal-room-development.js?v=36';
import {groupStudioPurchaseEligibility} from './deal-room-group-use-eligibility.js';
import {stockProcurementInvite,stockStudioOption} from './deal-room-stock-view.js?v=36';
import {allocationView} from './deal-room-allocation-view.js?v=36';
import {studioProjectEligibility,studioProjectReview,previewStudioProjectOrder,groupProjectChange} from './deal-room-studio-project.js?v=36';
import {sampleSvg} from './deal-room-samples.js';
const cash=n=>`¥${Number(n||0).toLocaleString('zh-CN')}`;
const briefs={'reading-drink':{name:'阅读与饮水',products:['mira','samir']},reading:{name:'阅读一角',products:['mira','ines']},hosting:{name:'待客茶席',products:['samir','ines']},bedside:{name:'客房晚间床头',products:['mira','samir']},welcome:{name:'迎宾茶台',products:['samir','ines']}};
const goods={mira:['lamp','台灯'],samir:['cup','保温杯'],ines:['linen','桌布']};
function onlyDeliveredUse(state,direction){
 const e=studioProjectEligibility(state,direction);
 return e.valid&&e.briefs.length===1&&(state.caseGrowthHistory||[]).some(h=>h.status==='paid'&&h.purpose==='studio-project'&&h.studioDirection===direction&&h.referrerId===e.referrerId&&h.studioBrief===e.briefs[0]);
}
function purchaseMoney(q){
 if(!Number.isFinite(q?.revenue)||!Number.isFinite(q?.cashAfterSigning))return '';
 return `<div class="offer"><div><small>这单货款</small><strong>${cash(q.revenue)}</strong></div><div><small>现在要付</small><strong>${cash(q.cost)}</strong></div>${q.deposit?`<div><small>客户先付定金</small><strong>${cash(q.deposit)}</strong></div>`:''}<div><small>预计本单赚到</small><strong>${netProfitAmount(q.netProfit)}</strong></div></div><p class="brief">${q.deposit?`${q.cost>=q.deposit?`自己垫 ${cash(q.cost-q.deposit)}`:`定金付完制作后余 ${cash(q.deposit-q.cost)}`} · `:''}${q.cashAfterSigning<0?`现金还差 ${cash(-q.cashAfterSigning)}`:`签完还剩 ${cash(q.cashAfterSigning)}`}</p>`;
}
export function studioProjectInvite(state){
 const available=['independent','group'].filter(d=>studioProjectEligibility(state,d).canOffer);
 if(!available.length)return '';
 return `<section class="studio-invite"><small>工作室用途合作</small><h3>${available.every(d=>onlyDeliveredUse(state,d))?'回看已交付的用途方案':'不只交货，提出下一种用途'}</h3>${available.map(d=>`<button ${d==='independent'&&studioProjectEligibility(state,d).briefs.includes('reading-drink')?'data-action="OPEN_STUDIO_READING_PAIR"':`data-studio-direction="${d}"`}><strong>${onlyDeliveredUse(state,d)?'回访已确认方案':d==='independent'?'给概念店做工作室主题':'替集团主持场所方案'}</strong><span>${onlyDeliveredUse(state,d)?(d==='group'?'已交付；可回看场所里正在使用的用品':'已交付；按实际余货与需求谈补货'):state.studioProjectDrafts?.[d]?'继续准备中的新主题':state.studioProjectPlans?.[d]?.status==='approved'?'已有确认方案，继续经营':d==='independent'?'自己决定陈列组合，后续可调整主题':'按具体使用场所验样，确认后保留固定规格'}</span></button>`).join('')}</section>`;
}
function groupUseProgress(state){
 const p=state.studioProject;if(p.direction!=='group')return '';
 const history=(state.caseGrowthHistory||[]).filter(h=>h.status==='paid'&&h.purpose==='studio-project'&&h.studioDirection==='group'&&h.referrerId===p.referrerId);
 if(!history.length)return '';
 const possible=studioProjectEligibility(state,'group').briefs;
 return `<section class="group-use-progress" aria-label="集团场所的实际交付"><h4>这批货，用到了哪里</h4><div>${['bedside','welcome'].filter(id=>possible.includes(id)||history.some(h=>h.allocationVersion===1?h.allocation[id]>0:h.studioBrief===id)).map(id=>{const h=history.filter(x=>x.allocationVersion===1?x.allocation[id]>0:x.studioBrief===id).at(-1);return `<article class="${h?'delivered':'unfilled'}"><strong>${id==='bedside'?'客房床头':'前厅茶台'}</strong>${h?`<div class="group-use-products">${(h.allocationVersion===1?(id==='bedside'?['mira','samir']:['samir','ines']):h.products).map(g=>sampleSvg(goods[g][0])).join('')}</div><small>第 ${h.deliveryDay} 天 · ${h.allocationVersion===1?h.allocation[id]:h.quantity} 组已交付</small><p>${id==='bedside'?'调暗灯光，水杯放在伸手处。':'茶台铺好桌布，接待用杯不必连灯一起采购。'}</p>`:'<p>这里还没有收到用品。</p><small>可以为这里准备一份方案。</small>'}</article>`;}).join('')}</div></section>`;
}
// Each comparison uses its own already-approved specification, never the current draft.
function groupSpecSwitches(state,change){
 if(!change)return '';
 const p=state.studioProject,ids=Object.keys(change.approved),confirmed=ids.filter(id=>change.approved[id].status==='approved'&&studioProjectReview(state,change.approved[id]).valid);
 const compare=confirmed.length===2;
 return `<div class="group-specs">${ids.filter(id=>id!==p.briefId||p.status!=='approved').map(id=>{
  const spec=change.approved[id],use=groupStudioPurchaseEligibility(state,spec),q=compare&&confirmed.includes(id)&&use.canPurchase?previewStudioProjectOrder(state,spec):null;
  let detail=use.canPurchase?'':'<small class="group-spec-comparison">已用于客户场所 · 回看规格，不重复采购</small>';
  if(q){
   const waiting=q.waitingUntil>state.day;
   const after=waiting?previewStudioProjectOrder({...state,day:q.waitingUntil,cash:state.cash-q.waitingCost},spec):q;
   detail=`<small class="group-spec-comparison">${q.valid?'现在可采购':q.reason}${waiting?` · 等至第 ${q.waitingUntil} 天，等候支出 ${cash(q.waitingCost)}`:''}${Number.isFinite(after.netProfit)?`<br>${waiting?'等候后按当前条件：':'按当前条件：'}采购预计赚到 ${netProfitAmount(after.netProfit)} · 第 ${after.paymentDay} 天收齐${waiting?'（另计上述等候支出）':''}`:''} · 尚未签约</small>`;
  }
  return `<div><button class="quiet" data-action="RESTORE_GROUP_SPEC" data-brief-id="${id}">回到${briefs[id].name}已确认规格</button>${detail}</div>`;
 }).join('')}</div>`;
}
export function studioProjectView(state,allocationChoice='bedside'){
 const allocationPanel=allocationView(state,allocationChoice);
 const p=state.studioProject,indie=p.direction==='independent',b=briefs[p.briefId],approved=p.status==='approved',review=studioProjectReview(state,p),q=approved?previewStudioProjectOrder(state,p):null,hasLamp=b.products.includes('mira'),scope=studioProjectEligibility(state,p.direction),rawChange=groupProjectChange(state);
 const change=rawChange?{...rawChange,available:rawChange.available&&scope.briefs.includes(rawChange.next)}:null;
 // Older sessions may already be inside an unsupported draft. Show an actual
 // way forward, not a scene the buyer can never approve, and do not rewrite it.
 if(!approved&&!scope.briefs.includes(p.briefId))return `<div class="studio-detail"><button class="back-clients" data-action="KEEP_STUDIO_PROJECT">← 回工作室</button><h3>${scope.briefs.length?'用这份原稿已有的两件产品搭配':'这份原稿不适合集团的场所方案'}</h3><p>${scope.briefs.length?'换成实际交付过的搭配，再请客户确认。':'床头需要灯和杯，茶台需要杯和桌布；这份原稿没有杯。已交付的合作不变。'}</p>${scope.briefs.map(id=>`<button data-studio-field="briefId" data-studio-value="${id}">准备${briefs[id].name} →</button>`).join('')}</div>`;
 const use=groupStudioPurchaseEligibility(state);
 if(approved&&!indie&&!use.canPurchase&&!allocationPanel)return `<div class="studio-detail"><button class="back-clients" data-action="KEEP_STUDIO_PROJECT">← 回工作室</button><h3>${b.name} · 已在使用</h3><p class="brief">这批用品还在使用，客户暂时不需要补货。</p>${groupUseProgress(state)}${groupSpecSwitches(state,change)}${change?.available?`<aside class="group-change"><p>${openingDialogueQuote(change.message)}</p><button data-action="PROPOSE_GROUP_CHANGE">看看${briefs[change.next].name}的新需求 →</button></aside>`:''}${stockProcurementInvite(state)}</div>`;
 return `<div class="${allocationPanel?'allocation-active':'studio-detail'}"><button class="back-clients" data-action="KEEP_STUDIO_PROJECT">← 回工作室</button><h3>${allocationPanel?'同一批采购，先谈覆盖哪些场所':indie?(approved?'回看这份已确认的陈列':'这次，陈列由你提'):'先把场所里的用途试清楚'}</h3><blockquote class="buyer-counter" ${allocationPanel?'hidden':''}>${indie?(approved?'“就按这一版摆。店里要是需要添货，我再来跟你核数量和交期。”':'“货单我看过了。我想看看这两件摆在一起是什么样，能先摆一套给我看吗？”'):'“采购表先放放。先照我们实际用的地方摆一套，我看看顺不顺手。以后送来的，也得跟这套样品一样。”'}</blockquote><div class="studio-project-scene ${p.layout} ${p.light==='soft'&&p.lampVersion==='developed'?'soft':''}" aria-label="${b.name} · ${p.layout==='table'?'桌面陈列':'高架陈列'} · ${hasLamp?(p.light==='soft'&&p.lampVersion==='developed'?'柔光':'阅读光'):'不含灯具'}">${b.products.map(id=>`<div class="studio-object ${id}">${sampleSvg(goods[id][0])}<span>${id==='mira'&&p.lampVersion==='developed'?'三档调光台灯':goods[id][1]}</span></div>`).join('')}<div class="studio-surface"></div></div>${allocationPanel?`<details><summary>查看各处实际收到的用品</summary>${groupUseProgress(state)}</details>`:groupUseProgress(state)}${groupSpecSwitches(state,change)}${approved&&allocationPanel?allocationPanel:approved?`<div class="case-route-seal"><strong>${b.name} · 客户已确认</strong><span>${indie?(onlyDeliveredUse(state,p.direction)?'这份陈列已交付，等客户需要时再谈补货。':'这份工作室陈列由你署名，后续可以提出另一个主题。'):'集团后续会按这份规格采购；其他产品和原稿仍可向别的客户供货。'}</span></div>${Number.isFinite(q.paymentDay)?`<p>第 ${q.paymentDay} 天收齐货款</p>`:''}${stockStudioOption(state)?'<h4>方案一 · 全部重新制作</h4>':''}${purchaseMoney(q)}${q.valid?'':`<p class="counter">${q.reason}</p>`}${q.waitingUntil>state.day?`<button class="quiet case-wait" data-action="WAIT_STUDIO_PROJECT" ${state.cash>=q.waitingCost?'':'disabled'}>等所需商品到第 ${q.waitingUntil} 天 · ${cash(q.waitingCost)}</button>`:''}${[q.quantity,q.paymentDay,q.balanceDue,q.operatingCost].every(Number.isFinite)?`<details><summary>采购条件</summary><p>每款 ${q.quantity} 件 · 第 ${q.paymentDay} 天收齐尾款 ${cash(q.balanceDue)} · 回款前日常开销 ${cash(q.operatingCost)}</p></details>`:''}<button class="primary" data-action="SIGN_STUDIO_PROJECT_ORDER" ${q.valid?'':'disabled'}>${stockStudioOption(state)?'全部新做，确认这份采购':'按这份方案安排采购'} →</button>${stockStudioOption(state)}${indie?(onlyDeliveredUse(state,p.direction)?'':'<button class="quiet" data-action="REVISE_STUDIO_PROJECT">调整下一次主题</button>'):change?.available?`<aside class="group-change"><p>${openingDialogueQuote(change.message)}</p><button data-action="PROPOSE_GROUP_CHANGE">另做${briefs[change.next].name}方案</button><small>也可继续上面的原规格；不接新用途，不扣钱、不失去客户。</small></aside>`:''}`:`<fieldset class="growth-products"><legend>${indie?'这次想呈现什么':'客户准备使用在哪里'}</legend>${studioProjectEligibility(state,p.direction).briefs.map(id=>`<button data-studio-field="briefId" data-studio-value="${id}" aria-pressed="${p.briefId===id}">${briefs[id].name}</button>`).join('')}</fieldset><fieldset class="growth-products"><legend>把实物放在哪里</legend>${[['table','摆到桌面'],['shelf','放上高架']].map(([id,label])=>`<button data-studio-field="layout" data-studio-value="${id}" aria-pressed="${p.layout===id}">${label}</button>`).join('')}</fieldset>${hasLamp?`<fieldset class="growth-products"><legend>拿哪一版实物灯</legend>${[['standard','标准暖光'],['developed','已验调光样']].map(([id,label])=>`<button data-studio-field="lampVersion" data-studio-value="${id}" aria-pressed="${p.lampVersion===id}" ${id==='developed'&&!(!!acceptedLampSample(state,'studio'))?'disabled':''}>${label}</button>`).join('')}</fieldset><fieldset class="growth-products"><legend>现场试光</legend>${[['reading','阅读亮度'],['soft','睡前柔光']].map(([id,label])=>`<button data-studio-field="light" data-studio-value="${id}" aria-pressed="${p.light===id}">${label}</button>`).join('')}</fieldset>`:''}${state.feedback?.kind==='counter'?`<p class="counter" role="status">${state.feedback.message}</p>`:''}<button class="primary" data-action="REVIEW_STUDIO_PROJECT">请客户看这份实物方案 →</button><small>这里只确认用途，还不签采购、不扣款。</small>`}</div>`;
}
