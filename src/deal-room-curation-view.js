import {netProfitAmount} from './deal-room-net-profit.js';
import {DAY_COST} from './deal-room-market.js?v=36';
import {openingDialogueQuote} from './deal-room-opening-dialogue.js';
import {CURATION_PRODUCTS} from './deal-room-engine.js?v=36';
import {quoteCommitmentView} from './deal-room-quote-view.js?v=36';
import {sampleSvg} from './deal-room-samples.js';
const money=n=>`¥${Number(n||0).toLocaleString('zh-CN')}`;
const speaker=brief=>brief.giftAllowed?'Élise':'Adrian';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function buyerSpeech(buyer,message,live=false){
 if(typeof buyer!=='string'||!buyer.trim()||typeof message!=='string'||!message.trim())return '';
 const line=message.trim(), punctuated=/[。！？…]$/.test(line)?line:line+'。';
 return `<figure class="curation-buyer-speech"${live?' role="status"':''}><figcaption>${esc(buyer.trim())}：</figcaption><blockquote>${esc(openingDialogueQuote(punctuated))}</blockquote></figure>`;
}
// A counteroffer changes exactly one existing choice. Keep the referrer's anchor,
// a specifically selected dimmer and the current packaging. A budget fit is not a signature.
function curationBudgetCounter(brief,q,availableCash){
 if(!q||q.valid!==false||!String(q.reason).startsWith('超过预算 ')||!Number.isSafeInteger(brief?.budget)||q.revenue<=brief.budget||!Number.isSafeInteger(q.cost)||q.deposit*2!==q.revenue||![40,60].includes(q.quantity)||!q.products?.includes(brief.anchor))return '';
 const offers=[];
 function add(attr,label,revenue,cost,operating=q.operatingCost){
  if(![revenue,cost].every(Number.isSafeInteger)||revenue<=0||cost<0||revenue>brief.budget)return;
  const needed=cost-Math.floor(revenue/2)+operating,shortfall=Number.isSafeInteger(availableCash)?Math.max(0,needed-availableCash):0;
  offers.push(`<button class="quote" ${attr}><strong>${esc(label)}</strong><span>货款 ${money(revenue)}，预计净赚 ${netProfitAmount(revenue-cost-operating)}</span>${shortfall?`<small>预算可接受，工作室周转还差 ${money(shortfall)}。</small>`:''}</button>`);
 }
 // Same packaging, model and due terms: both quantity and merchandise cost scale.
 if(q.quantity===60)add('data-curation-quantity="40"','保留整组，改为 40 套',q.price*40,q.cost/q.quantity*40,q.operatingCost-(q.quantityExtraDays||0)*DAY_COST);
 if(q.products.length===3)for(const item of CURATION_PRODUCTS){
  if(item.id===brief.anchor||!q.products.includes(item.id)||item.id==='mira'&&q.lampVersion==='developed')continue;
  add(`data-curation-product="${item.id}"`,`保留 ${q.quantity} 套，不放${item.name}`,q.revenue-q.quantity*item.price,q.cost-q.quantity*item.cost);
 }
 if(!offers.length)return '';
 return `<section class="curation-counteroffer" aria-label="买手的预算回价">${buyerSpeech(speaker(brief),`这次我最多能批 ${money(brief.budget)}。主推款和包装先别动，你看还能从哪儿省一点？`)}<div class="quotes">${offers.join('')}</div><small>选一项调整报价，不会签单。</small></section>`;
}
function curationProductChoices(brief,draft,q,demo){
 const selected=q.products||[],developed=q.lampVersion==='developed';
 return `<fieldset class="curation-products"><legend>选商品</legend><div class="curation-product-picks">${CURATION_PRODUCTS.map(p=>{
  const anchor=p.id===brief.anchor,checked=selected.includes(p.id),dimmer=p.id==='mira'&&developed;
  const title=dimmer?'三档调光台灯':p.name,unit=p.id==='mira'?'盏':p.id==='samir'?'只':'条';
  const content=`${sampleSvg(p.kind,draft.packaging==='gift')}<strong>${esc(title)}</strong><small>${money(dimmer?75:p.price)} / ${unit}</small>${anchor?'<small class="curation-main-item">主推款</small>':''}`;
  return anchor?`<div class="curation-product-choice curation-anchor">${content}</div>`:`<button type="button" class="curation-product-choice" data-curation-product="${p.id}" aria-pressed="${checked}">${content}</button>`;
 }).join('')}</div>${selected.length<2?'<small class="curation-hint">在主推款之外，至少再选一款。</small>':''}${curationProductDetail(draft,demo)}</fieldset>`;
}
function curationAmounts(brief,q){
 const priced=Number.isSafeInteger(q.revenue)&&q.revenue>=0,budget=Number.isSafeInteger(brief.budget),diff=priced&&budget?brief.budget-q.revenue:null;
 return `<div class="curation-budget-area">
  <dl class="curation-amounts" aria-label="报价与预算">
   <div><dt>整单报价</dt><dd>${priced?money(q.revenue):'待选择'}</dd></div>
   <div><dt>客户预算</dt><dd>${budget?money(brief.budget):'待确认'}</dd></div>
  </dl>
  ${diff===null?'':`<p class="curation-budget-result ${diff<0?'curation-over':''}">${diff===0?'正好是客户的预算。':`${diff>0?'比预算少':'超出预算'} ${money(Math.abs(diff))}。`}</p>`}
 </div>`;
}
export function curationView(brief,draft,q,development=null,demo=null,availableCash=null){
 const counter=curationBudgetCounter(brief,q,availableCash),shown=counter?{...q,reason:'先把报价调到买手预算内，再签单。'}:q;
 return `<section class="curation-controls ws-referral-sheet">
 <div class="curation-purpose"><p><strong>买手需要</strong>${esc(brief.purpose)}</p><button type="button" class="back-clients" data-action="BACK_FROM_CURATION">‹ 返回客户机会</button></div>
 ${curationProductChoices(brief,draft,q,demo)}${sampleControls(brief,draft,development)}
 <div class="curation-order-picks">
 <fieldset class="curation-pick-set"><legend>订购量</legend><div class="curation-pick-buttons">${[40,60].map(n=>`<button data-curation-quantity="${n}" aria-pressed="${draft.quantity===n}">${n} 套</button>`).join('')}</div></fieldset>
 <fieldset class="curation-pick-set"><legend>包装</legend><div class="curation-pick-buttons"><button data-curation-pack="plain" aria-pressed="${draft.packaging==='plain'}">常规包装</button><button data-curation-pack="gift" aria-pressed="${draft.packaging==='gift'}" ${brief.giftAllowed?'':'disabled'}>整组礼盒</button></div>${brief.giftAllowed?'':'<small class="curation-hint">日常补货只用常规包装。</small>'}</fieldset>
 </div>
 ${curationAmounts(brief,q)}${counter}
 <h3 class="curation-settlement-title">签约与回款</h3>
 ${quoteCommitmentView({cash:availableCash},shown,{action:'SIGN_CURATION',quantityLabel:`${draft.quantity} 套`})}</section>`;
}
// This optional details row sits with the products, never between the
// calculated budget and signing. Keep it present across a lamp rerender.
function curationProductDetail(draft,demo){
 const studies=materialWorkbench(draft);
 if(!demo&&!studies)return '';
 return `<details class="curation-product-details"${demo?.open?' open':''}><summary>商品详情与试用</summary>
 <div class="curation-studies"><small class="curation-study-note">试用免费</small>${demo?curationDemoView(demo):''}${studies}</div></details>`;
}
function materialWorkbench(draft){
 const ids=draft?.products||[];
 return [['samir','试杯'],['ines','试铺桌布']].filter(([id])=>ids.includes(id)).map(([id,title])=>{
  const cup=id==='samir',tag=cup?'flask':'linen',modes=cup?['看杯身','拧开倒茶','盖好带走']:['看折样','铺上桌沿','摆好双人位'];
  const captions=cup?['金属杯身和旋盖。','旋下杯盖，往杯口倒茶。','杯盖已旋回，拿起看看携带的样子。']:['折起来看棉麻的织纹与锁边。','展开一面，让布沿自然垂过桌角。',ids.includes('samir')?'摆两份餐具，把本次选的保温杯也带上桌。':'摆两份餐具，看看布面留给用餐的位置。'];
  return `<details class="material-study" data-study="${tag}"><summary><span class="study-expand">展开${title}</span><span class="study-collapse">收起${title}</span></summary><fieldset class="study-switches"><legend>${cup?'试用动作':'试铺方式'}</legend>${modes.map((v,i)=>`<input type="radio" class="study-choice mode-${i}" id="study-${tag}-${i}" name="study-${tag}" ${i===0?'checked':''}><label for="study-${tag}-${i}">${v}</label>`).join('')}<div class="study-frame">${cup?flaskStudyArt():linenStudyArt(ids.includes('samir'))}${captions.map((s,i)=>`<p class="study-caption caption-${i}">${s}</p>`).join('')}</div></fieldset></details>`;
 }).join('');
}

function paintedStudy(poses){
 return poses.map((src,i)=>`<img class="study-pose pose-${i}" src="${src}" width="840" height="420" alt="" loading="lazy" decoding="async">`).join('');
}
function flaskStudyArt(){
 return paintedStudy(['assets/deal-work-study-flask-body.webp','assets/deal-work-study-flask-pour.webp','assets/deal-work-study-flask-carry.webp']);
}
function linenStudyArt(pair){
 return paintedStudy(['assets/deal-work-study-linen-fold.webp','assets/deal-work-study-linen-drape.webp',pair?'assets/deal-work-study-linen-setting-flask.webp':'assets/deal-work-study-linen-setting.webp']);
}

export function businessFeedback(state,{viewingCase=null,supplyDraft=null}={}){
 if(state.feedback?.kind==='personal-life')return (state.feedback.message||'').replace('这是个人消费，不会提高订单收益。','');
 if(state.feedback?.kind==='account-back')return '这份采购先放一放。';
 if(state.history?.at(-1)?.type==='CLOSE_CASE_GROWTH'&&state.caseGrowth?.status==='paid')return '这批已结清，客户留在合作簿里；下次按门店实际需求继续谈。';
 if(viewingCase)return `${viewingCase.buyer} · 第 ${viewingCase.deliveryDay} 天已交付，货款已收齐。`;
 if(supplyDraft)return '按客户两次收货日期，谈妥付款安排。';
 const group=state.caseGrowth?.active;
 if(state.phase==='case-growth'&&state.caseGrowth?.status==='paid'&&state.feedback?.kind==='case-growth-paid'&&group?.agreement==='private'&&group.buyer==='集团采购 · 匿名供货')
  return state.feedback.message.replace(`，净赚 ${group.netProfit}。`,'。');
 if(state.feedback?.kind==='supply-complete')return `两批货已收齐，净赚 ${money(state.supplyPlan.netProfit)}。`;
 return state.feedback?.message||'一位海外客户发来了采购需求。';
}

function sampleControls(brief,draft,development){
 if(development?.status!=='active'||!(draft.products||[]).includes('mira'))return '';
 if(development.factory!=='studio')return '<p class="brief sample-boundary">新工厂至少180盏起做，这份40/60套组合仍用原供应商。</p>';
 if(!brief.giftAllowed)return '<p class="brief sample-boundary">Northline：按原来的标准灯补货，不需要加价调光。新样留给主题选品。</p>';
 return `<fieldset class="curation-version"><legend>带哪一版台灯给买手</legend><button data-lamp-version="standard" aria-pressed="${draft.lampVersion!=='developed'}">标准款 ¥55 / 盏</button><button data-lamp-version="developed" aria-pressed="${draft.lampVersion==='developed'}">三档调光 ¥75 / 盏</button><small>主题买手接受调光新样，但不会增加整组预算。</small></fieldset>`;
}

/** Trying the actual selected sample is free; no hidden approval, money or time reward. */
export function curationDemoModel(brief,draft,{open=false,room='day',brightness=1}={}){
 if(!(draft.products||[]).includes('mira'))return null;
 const developed=draft.lampVersion==='developed',night=room==='night';
 const level=developed&&[0,1,2].includes(brightness)?brightness:1;
 const message=!brief.giftAllowed?'这次还是补原来那款。店员都用熟了，新功能先不加。':night?(developed?(level===0?'这档放床头正好。看书开亮点，看完手边一调，也不用再开另一盏。':level===1?'看书可以；睡前我想再柔一点，试试低一档？':'摆在店里这样挺显眼，不过搁床头就刺眼了。帮我调低一档？'):'旧款就这一档吧？平时照桌子够了，店里别跟客人说还能调亮度。'):(developed?(level===0?'白天看样有点暗。把它调亮，我想看清桌上这组搭配。':'白天摆出来我看清了。再把屋里的灯关一下，我想看看这盏到晚上值不值那个差价。'):'旧款也够用。省下来的钱，要么多铺几套，要么再配一件。');
 return {open,room:night?'night':'day',developed,level,glow:night?[.25,.6,1][level]:[.12,.3,.65][level],message,buyer:speaker(brief)};
}
export function curationDemoView(demo){
 return `<section class="buyer-demo"><button class="demo-toggle" id="toggle-buyer-demo" aria-expanded="${demo.open}">${demo.open?'收起试灯':'展开试灯'}</button>${demo.open?`<div class="demo-controls">
 <div class="buyer-demo-preview ${demo.room}" role="img" aria-label="${demo.developed?'调光样品':'旧款样品'}，${demo.room==='night'?'夜间':'白天'}${demo.developed?'，'+['柔光','阅读亮度','亮光'][demo.level]:''}" style="--sample-light:${demo.glow};--lamp-brightness:${[.75,.95,1.12][demo.level]}"><div class="sample-glow"></div><div class="trial-lamp"></div></div>
 <div role="group" aria-label="试用环境">${[['day','白天陈列'],['night','夜间使用']].map(([id,name])=>`<button data-demo-room="${id}" aria-pressed="${demo.room===id}">${name}</button>`).join('')}</div>
 ${demo.developed?`<div role="group" aria-label="给买手试灯亮度">${['柔光','阅读','亮光'].map((name,i)=>`<button data-demo-light="${i}" aria-pressed="${demo.level===i}">${name}</button>`).join('')}</div>`:'<small class="curation-hint">固定一档亮度，切换上方环境看效果。</small>'}
 ${buyerSpeech(demo.buyer,demo.message,true)}
 </div>`:''}</section>`;
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
 return `<section class="curation-receipt" aria-label="这笔合作的回款"><small>这一单做成了</small><h3>${esc(c.buyer)} 已收齐这组产品</h3><p>${c.products.length} 款产品，各 ${c.quantity} 件，已经摆进客户的店里。</p><dl><div><dt>尾款到账</dt><dd>${money(c.balanceDue)}</dd></div><div><dt>${c.netProfit<0?'本单亏损':'这次净赚'}</dt><dd>${netProfitAmount(c.netProfit)}</dd></div><div><dt>手头现在有</dt><dd>${money(state.cash)}</dd></div></dl></section>`;
}
