import {sampleSvg} from './deal-room-samples.js';
import {revisionRelationshipsView} from './deal-room-revision-relationships.js';
import {revisionOpportunity,previewRevisionOrder} from './deal-room-collection-revision.js';
const cash=n=>`¥${Number(n||0).toLocaleString('zh-CN')}`;
export function revisionInvite(state){const o=revisionOpportunity(state),r=state.collectionRevision;if(!o.available&&!r)return '';return `<section class="revision-invite"><small>Northline · 新版本洽谈</small><h3>${r?'潮汐版 · 设计与合作记录':'旧原稿不能独家，新设计呢？'}</h3><p>${r?'查看潮汐系列与买手订单。':'买手想要自己的新系列。可以另做图样与内托，也可以继续经营旧款。'}</p><button data-action="OPEN_COLLECTION_REVISION">${r?'回到新版本工作台':'先看这份新要求'} →</button></section>`;}
const revisionCompartments=[
 ['mira','lamp',42,125,89,84],['samir','cup',135,114,100,75],['ines','linen',231,96,91,82]
];
export function revisionArt(open=false,products=[]){
 const src=open?'assets/deal-work-tidal-open.webp':'assets/deal-work-tidal-closed.webp';
 const goods=open?revisionCompartments.filter(([id])=>products.includes(id)).map(([id,kind,x,y,w,h])=>
  `<svg data-product="${id}" x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 200 190">${sampleSvg(kind)}</svg>`).join(''):'';
 return `<div class="revision-art ${open?'tray-open':''}"><svg viewBox="0 0 360 230" role="img" aria-label="潮汐波线外套与独立分格内托${open?'，内托已打开':''}"><image href="${src}" width="360" height="230"/>${goods}</svg><button data-revision-open aria-pressed="${open}">${open?'合上波线外套':'打开，看看分格内托'}</button><small>潮汐系列 · 波线外套与分格内托</small></div>`;
}
export function revisionView(state,scope='revision-nonexclusive'){
 const r=state.collectionRevision;if(!r)return '';
 const back='<button class="back-clients" data-action="CLOSE_COLLECTION_REVISION">← 回工作室</button>';
 if(r.status==='draft')return `${back}<h3>给新系列留出自己的内托</h3><p>新画潮汐波线，改成分格内托。原稿与已有专用版本继续按旧约供货。</p><p>独立开发 ${cash(3200)} · 4 天开支 ${cash(120)}。确认后，接下来 4 天用于打样；拿到实样再回工作室。出样不保证买手下单。</p><button class="primary" data-action="COMMISSION_COLLECTION_REVISION" ${state.cash>=3320?'':'disabled'}>委托这份新设计与实样 →</button>`;
 if(r.status==='sampling')return `<h3>工厂在试新的分格内托</h3><p>出样费已付。第 ${r.sampleDay} 天拿样，期间开支 ${cash(120)}。</p><button class="primary" data-action="RECEIVE_COLLECTION_REVISION">等到第 ${r.sampleDay} 天，取回这版实物样 →</button>`;
 if(r.status==='production')return `${revisionRelationshipsView(state,r.active.scope)}<h3>${r.active.buyer} · 新版本已签</h3><p>${r.active.sets} 套 · 第 ${r.active.paymentDay} 天收齐。</p><button class="primary" data-action="FULFIL_COLLECTION_REVISION">交付潮汐分格系列 →</button>`;
 const north=(r.orders||[]).some(o=>o.buyerId==='northline'&&o.status==='paid'),atelier=(r.orders||[]).some(o=>o.buyerId==='atelier'&&o.status==='paid'),buyerId=north?'atelier':'northline';
 const locked=north&&r.exclusiveBuyer,done=locked||atelier;
 if(done)return `${back}${revisionRelationshipsView(state,r.exclusiveBuyer?'revision-exclusive':'revision-nonexclusive')}<h3>这版新设计，有了自己的合作范围</h3><p>${locked?'Northline 的独家范围只限潮汐版。工作室原系列仍按原有约定供货。':'Northline 与 Atelier 都已收到潮汐系列。'}</p>${r.orders.map(o=>`<p>${o.buyer} · ${o.sets} 套已交付 · 净赚 ${cash(o.netProfit)}</p>`).join('')}<small>潮汐系列开发投入 ${cash(r.investment)}。</small>`;
 const option=north?'revision-nonexclusive':scope,q=previewRevisionOrder(state,{buyerId,scope:option});
 return `${back}<h3>${north?'带着新版本去见Atelier':'Northline：只要这版，不碰旧稿'}</h3>${north?'<p>新版本仍可复用。Atelier已提出这份采购条件，你可以签约，也可以先做旧款。</p>':`<div class="quotes"><button data-revision-scope="revision-nonexclusive" aria-pressed="${option==='revision-nonexclusive'}">保留潮汐版复用权<br><small>也可向 Atelier 供这款</small></button><button data-revision-scope="revision-exclusive" aria-pressed="${option==='revision-exclusive'}">仅潮汐版专供Northline<br><small>首批较大、含授权费；这款只供 Northline</small></button></div>`}${revisionRelationshipsView(state,option)}<p>${q.sets} 套 · 第 ${q.paymentDay} 天收齐</p><div class="offer"><div><small>这单货款</small><strong>${cash(q.revenue)}</strong></div><div><small>现在要付</small><strong>${cash(q.cost)}</strong></div><div><small>客户先付定金</small><strong>${cash(q.deposit)}</strong></div><div><small>预计本单赚到</small><strong>${cash(q.netProfit)}</strong></div></div><p class="brief">${q.cost>=q.deposit?`自己垫 ${cash(q.cost-q.deposit)}`:`定金付完制作后余 ${cash(q.deposit-q.cost)}`} · ${state.cash+q.deposit-q.cost<0?`现金还差 ${cash(q.cost-q.deposit-state.cash)}`:`签完还剩 ${cash(state.cash+q.deposit-q.cost)}`}</p><small>此前出样已付 ${cash(r.investment)}。</small><details><summary>付款与收益明细</summary><p>尾款 ${cash(q.balanceDue)} · 回款前日常开销 ${cash(q.operatingCost)}${q.licenceFee?` · 货款含授权费 ${cash(q.licenceFee)}`:""}。本单收益已扣制作与日常开销，不再扣此前出样。</p></details>${q.valid?'':`<p class="counter">${q.reason}</p>`}<button class="primary" data-revision-sign data-buyer="${buyerId}" data-scope="${option}" ${q.valid?'':'disabled'}>确认这版的范围与采购 →</button>`;
}
