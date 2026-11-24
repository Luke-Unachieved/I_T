import {netProfitAmount} from './deal-room-net-profit.js';
import {previewStudioAllocation} from './deal-room-allocation.js';
import {groupStudioPurchaseEligibility} from './deal-room-group-use-eligibility.js';
import {sampleSvg} from './deal-room-samples.js';
const cash=n=>`¥${Number(n||0).toLocaleString('zh-CN')}`;
const names={mira:'调光台灯',samir:'保温杯',ines:'桌布'};
function purchaseMoney(q){
 if(!Number.isFinite(q?.revenue)||!Number.isFinite(q?.cashAfterSigning))return '';
 return `<div class="offer"><div><small>这单货款</small><strong>${cash(q.revenue)}</strong></div><div><small>现在要付</small><strong>${cash(q.cost)}</strong></div>${q.deposit?`<div><small>客户先付定金</small><strong>${cash(q.deposit)}</strong></div>`:''}<div><small>预计本单赚到</small><strong>${netProfitAmount(q.netProfit)}</strong></div></div><p class="brief">${q.deposit?`${q.cost>=q.deposit?`自己垫 ${cash(q.cost-q.deposit)}`:`定金付完制作后余 ${cash(q.deposit-q.cost)}`} · `:''}${q.cashAfterSigning<0?`现金还差 ${cash(-q.cashAfterSigning)}`:`签完还剩 ${cash(q.cashAfterSigning)}`}</p>`;
}
export function allocationReceipt(q,{compact=false}={}){
 if(q?.allocationVersion!==1)return '';
 return `${compact?'':`<div class="allocation-result" aria-label="这一批的实际用途分配"><div><strong>${q.allocation.bedside}</strong><span>处客房床头</span></div><div><strong>${q.allocation.welcome}</strong><span>处前厅茶台</span></div></div>`}<p class="brief">${Object.entries(q.productQuantities).filter(([,n])=>n>0).map(([id,n])=>`${names[id]} ${n} 件`).join(' · ')}。${q.allocation.welcome?'本单供 40 处床头、20 处前厅，其余下次再谈。':'前厅请求本批不纳入。'}</p>`;
}
export function allocationView(state,selection='bedside'){
 const q=previewStudioAllocation(state,selection);if(!q?.available||(state.caseGrowthHistory||[]).some(h=>h.status==='paid'&&h.allocationVersion===1&&h.referrerId===state.studioProject.referrerId))return '';
 const prior=groupStudioPurchaseEligibility(state).delivered;
 return `<section class="allocation-proposal" aria-label="同一批采购的用途协商"><blockquote class="buyer-counter">“总数还是 60 处。前厅也想摆 20 处，能从客房那批匀一点过来吗？不方便的话，就照原来全放床头。”</blockquote><div class="allocation-options">${['bedside','mixed'].map(id=>`<button data-studio-allocation="${id}" aria-pressed="${id===selection}"><strong>${id==='bedside'?'60 床头':'40 床头 + 20 茶台'}</strong><span>${id==='bedside'?'保留客房覆盖':'让出部分客房覆盖给前厅'}</span></button>`).join('')}</div><p class="brief allocation-prior">此前已交货：床头用品 ${prior.bedside} 组，前厅用品 ${prior.welcome} 组。下面只算这次准备签的 60 处。</p><div class="allocation-scenes" aria-label="本批拟供 ${q.allocation.bedside} 处床头，${q.allocation.welcome} 处前厅"><div class="allocation-room bedroom">${sampleSvg('lamp')}${sampleSvg('cup')}<b>${q.allocation.bedside} 处床头</b></div><div class="allocation-room welcome ${q.allocation.welcome?'':'not-included'}">${sampleSvg('cup')}${sampleSvg('linen')}<b>${q.allocation.welcome?q.allocation.welcome+' 处茶台':'前厅 · 本批未采购'}</b></div></div>${allocationReceipt(q,{compact:true})}${purchaseMoney(q)}<details><summary>付款明细</summary><p>第 ${q.paymentDay} 天收齐尾款 ${cash(q.balanceDue)} · 回款前日常开销 ${cash(q.operatingCost)}</p></details>${q.valid?'':`<p class="counter">${q.reason}</p>`}${q.waitingUntil>state.day?`<button class="quiet" data-action="WAIT_STUDIO_ALLOCATION" ${state.cash>=q.waitingCost?'':'disabled'}>等这批所需商品到第 ${q.waitingUntil} 天 · ${cash(q.waitingCost)}</button>`:''}<button class="primary" data-action="SIGN_STUDIO_ALLOCATION" ${q.valid?'':'disabled'}>确认这一批的用途与采购 →</button><small>这批按选定数量供货，沿用客户确认过的规格。</small></section>`;
}
