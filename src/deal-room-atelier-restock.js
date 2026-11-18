// One replenishment of the same Atelier-exclusive design. No new licence, stock
// pool, client, passive revenue or permission to sell the work to someone else.
const TERMS={small:{sets:40,production:5,lag:0,depositRate:50},season:{sets:60,production:7,lag:4,depositRate:30}};
const styles={botanical:'枝叶纹样',cream:'米杏纸套',charcoal:'炭黑礼盒'};
const goods={mira:'便携台灯',samir:'保温杯',ines:'棉麻桌布'};
export const ATELIER_RESTOCK_ACTIONS=Object.freeze(Object.fromEntries(['OPEN_ATELIER_RESTOCK','CLOSE_ATELIER_RESTOCK','DECLINE_ATELIER_RESTOCK','SIGN_ATELIER_RESTOCK_SMALL','SIGN_ATELIER_RESTOCK_SEASON','DELIVER_ATELIER_RESTOCK','COLLECT_ATELIER_RESTOCK'].map(k=>[k,['type']])));
export function canonicalAtelierRestock(a){return a&&Object.hasOwn(ATELIER_RESTOCK_ACTIONS,a.type)&&Object.keys(a).length===1?{type:a.type}:null;}
export function atelierRestockBasis(s){
 const c=s.collection,h=s.launchProject;
 if(c?.model!=='own'||c.exclusiveBuyer!=='atelier'||h?.status!=='handed'||!['set','individual'].includes(h.arrangement)||!c.products?.includes(h.lead)||!Number.isSafeInteger(h.handedDay)||h.handedDay>s.day)return null;
 const index=c.orders.findIndex(o=>o.status==='paid'&&o.buyerId==='atelier'&&o.scope==='whole-exclusive'&&o.optionId==='exclusive'&&o.negotiated&&Number.isSafeInteger(o.licenceFee)&&o.licenceFee>0&&Number.isSafeInteger(o.sampleCost)&&o.sampleCost>=0&&Number.isSafeInteger(o.paymentDay)&&o.paymentDay<=h.handedDay);
 if(index<0)return null;const o=c.orders[index],price=(o.revenue-o.licenceFee)/o.sets,cost=(o.cost-o.sampleCost)/o.sets;
 if(![price,cost,o.sets].every(Number.isSafeInteger)||price<=cost||cost<=0||o.sets<=0||!Object.hasOwn(styles,o.style)||!Array.isArray(c.products)||!c.products.length||!c.products.every(id=>Object.hasOwn(goods,id)))return null;
 // This buyer checks the first display after one ten-day selling period.
 // It is an explicit review date, not a claim that all original units sold out.
 return {sourceOrderIndex:index,sourcePaidDay:o.paymentDay,firstSets:o.sets,handedDay:h.handedDay,reviewDay:h.handedDay+10,products:[...c.products],style:o.style,lampVersion:c.lampVersion||'standard',unitPrice:price,unitCost:cost};
}
export function previewAtelierRestock(s,term){
 const b=atelierRestockBasis(s),p=Object.hasOwn(TERMS,term)?TERMS[term]:null;
 if(!b||!p||s.phase!=='atelier-restock'||s.atelierRestock?.status!=='draft'||s.day<b.reviewDay)return null;
 const revenue=b.unitPrice*p.sets,cost=b.unitCost*p.sets,deposit=Math.floor(revenue*p.depositRate/100),operatingCost=(p.production+p.lag)*30,required=cost-deposit+operatingCost;
 return {...b,term,buyerId:'atelier',scope:'same-exclusive-goods',licenceFee:0,sampleCost:0,...p,revenue,cost,deposit,balanceDue:revenue-deposit,operatingCost,requiredCash:required,signedDay:s.day,deliveryDay:s.day+p.production,paymentDay:s.day+p.production+p.lag,netProfit:revenue-cost-operatingCost,cashAfterSigning:s.cash+deposit-cost,cashAfterPayment:s.cash+revenue-cost-operatingCost,valid:s.cash>=required};
}
export function applyAtelierRestock(s,action,canStart){
 if(!canonicalAtelierRestock(action))return s;const t=action.type,old=s.atelierRestock,home=['review','complete'].includes(s.phase);
 if(t==='OPEN_ATELIER_RESTOCK'){
  const b=atelierRestockBasis(s);if(!home||!b||s.day<b.reviewDay||old&&!['paid','declined'].includes(old.status))return s;
  const n=structuredClone(s);n.atelierRestock??={status:'draft'};n.phase='atelier-restock';return n;
 }
 if(s.phase!=='atelier-restock'||!old)return s;
 if(t==='CLOSE_ATELIER_RESTOCK'&&['draft','paid','declined'].includes(old.status)){const n=structuredClone(s);if(old.status==='draft')delete n.atelierRestock;n.phase='review';return n;}
 if(t==='DECLINE_ATELIER_RESTOCK'&&old.status==='draft'){
  const n=structuredClone(s);n.atelierRestock={status:'declined',day:s.day};n.phase='review';n.feedback={kind:'atelier-restock-declined',message:'这次补货已婉拒。已完成的首单与原来的独家约定都不变。'};return n;
 }
 if(t==='SIGN_ATELIER_RESTOCK_SMALL'||t==='SIGN_ATELIER_RESTOCK_SEASON'){
  const q=previewAtelierRestock(s,t==='SIGN_ATELIER_RESTOCK_SMALL'?'small':'season');if(!canStart||!q?.valid)return s;
  const n=structuredClone(s);n.cash=q.cashAfterSigning;n.atelierRestock={...q,status:'production'};n.feedback={kind:'atelier-restock-signed',message:'Élise 确认补货。只按实物付钱，不再支付独家授权费。'};return n;
 }
 if(t==='DELIVER_ATELIER_RESTOCK'&&old.status==='production'){
  const n=structuredClone(s),p=n.atelierRestock;if(s.day!==p.signedDay)return s;n.day=p.deliveryDay;n.cash-=p.production*30;p.status=p.lag?'receivable':'paid';if(!p.lag)n.cash+=p.balanceDue;
  n.feedback={kind:'atelier-restock-delivered',message:p.lag?'Atelier 已收到原版补货，尾款到约定日才入账。':'Atelier 收到补货，尾款也已结清。'};return n;
 }
 if(t==='COLLECT_ATELIER_RESTOCK'&&old.status==='receivable'){
  if(s.day!==old.deliveryDay)return s;const n=structuredClone(s);n.day=old.paymentDay;n.cash+=old.balanceDue-old.lag*30;n.atelierRestock.status='paid';n.feedback={kind:'atelier-restock-paid',message:'这次同版补货的尾款到了。'};return n;
 }
 return s;
}
export function atelierRestockProfit(s){
 const p=s.atelierRestock;if(p?.status!=='paid')return 0;const b=atelierRestockBasis(s),term=TERMS[p.term];
 if(!b||!term||p.buyerId!=='atelier'||p.scope!=='same-exclusive-goods'||p.licenceFee!==0||p.sampleCost!==0||p.sourceOrderIndex!==b.sourceOrderIndex||p.sourcePaidDay!==b.sourcePaidDay||p.signedDay<b.reviewDay||p.style!==b.style||p.lampVersion!==b.lampVersion||JSON.stringify(p.products)!==JSON.stringify(b.products)||p.unitPrice!==b.unitPrice||p.unitCost!==b.unitCost||p.sets!==term.sets||p.deliveryDay!==p.signedDay+term.production||p.paymentDay!==p.deliveryDay+term.lag||p.paymentDay>s.day)return 0;
 const revenue=b.unitPrice*term.sets,cost=b.unitCost*term.sets,net=revenue-cost-(term.production+term.lag)*30;
 return p.revenue===revenue&&p.cost===cost&&p.netProfit===net?net:0;
}
const cash=n=>'¥'+Number(n).toLocaleString('zh-CN');
export function atelierRestockInvite(s){
 const b=atelierRestockBasis(s);if(!b)return '';const p=s.atelierRestock;
 if(s.day<b.reviewDay)return `<p class="brief">Atelier 已接收独家系列。Élise 会在第 ${b.reviewDay} 天做完首轮陈列复盘，再来谈是否补货。</p>`;
 if(p?.status==='declined')return '<small>已婉拒 Atelier 本次补货；原独家合同不变。</small>';
 return `<section class="business-route"><small>Élise · Atelier</small><h3>${p?.status==='paid'?'独家系列的第二批也卖出去了':'“上次那套，能再补一批吗？”'}</h3><p>${p?.status==='paid'?`${p.sets} 套同版商品已经交付，货款已收齐。`:'首轮陈列复盘后，Élise 想沿用原版补货。你可以再供一批，也可以婉拒。'}</p><button data-action="OPEN_ATELIER_RESTOCK">${p?.status==='paid'?'看这批补货的账':'看看 Atelier 的补货询盘'} →</button></section>`;
}
export function atelierRestockView(s){
 const b=atelierRestockBasis(s),p=s.atelierRestock;if(!b||!p)return '';
 if(p.status==='declined')return '<p>已婉拒这批补货；原独家合同不变。</p><button data-action="CLOSE_ATELIER_RESTOCK">回工作室</button>';
 const names=b.products.map(id=>id==='mira'&&b.lampVersion==='developed'?'三档调光台灯':goods[id]).join('、');
 const spec=`<p class="brief"><strong>Atelier 原版 · ${styles[b.style]}</strong> · ${names}</p><p>沿用已交付的 ${b.firstSets} 套首单：每套货价 ${cash(b.unitPrice)}，制作 ${cash(b.unitCost)}。这批不重收授权费，也不再出样。</p>`;
 if(p.status==='draft')return `<button class="back-clients" data-action="CLOSE_ATELIER_RESTOCK">← 先放一放</button><h3>Atelier 的同版补货</h3><blockquote>“上次的配色和包装不用改。可以先补 40 套，或者一次给我们 60 套，多留几天账期。”</blockquote>${spec}<div class="quotes">${Object.keys(TERMS).map(term=>{const q=previewAtelierRestock(s,term);return `<section class="quote"><strong>${q.sets} 套 · ${q.lag?'整批补货，留 4 天账期':'小批补货，交货结清'}</strong><p>货款 ${cash(q.revenue)} · 定金 ${cash(q.deposit)} · 尾款 ${cash(q.balanceDue)} · 制作 ${cash(q.cost)}。签后手头 ${cash(q.cashAfterSigning)}。</p><p>第 ${q.deliveryDay} 天交货，第 ${q.paymentDay} 天结清。日常开支 ${cash(q.operatingCost)}，这单净赚 ${cash(q.netProfit)}，预计收清后手头 ${cash(q.cashAfterPayment)}。</p><button data-action="${term==='small'?'SIGN_ATELIER_RESTOCK_SMALL':'SIGN_ATELIER_RESTOCK_SEASON'}" ${q.valid?'':'disabled'}>${q.valid?'确认按这份条件供货':'周转还差 '+cash(q.requiredCash-s.cash)}</button></section>`;}).join('')}</div><button class="quiet" data-action="DECLINE_ATELIER_RESTOCK">婉拒这一次，不动原合同</button>`;
 return `<h3>${p.status==='production'?'同版补货已经签下':p.status==='receivable'?'Atelier 已收货，尾款未到':'Atelier 的补货已结清'}</h3>${spec}<p>${p.sets} 套 · 总货款 ${cash(p.revenue)} · 已收定金 ${cash(p.deposit)} · ${p.status==='paid'?'尾款已收齐':'尾款 '+cash(p.balanceDue)}。</p><p>第 ${p.deliveryDay} 天交货，第 ${p.paymentDay} 天收齐。日常开支 ${cash(p.operatingCost)}，${p.status==='paid'?'实际':'预计'}净赚 ${cash(p.netProfit)}。</p><button class="primary" data-action="${p.status==='production'?'DELIVER_ATELIER_RESTOCK':p.status==='receivable'?'COLLECT_ATELIER_RESTOCK':'CLOSE_ATELIER_RESTOCK'}">${p.status==='production'?(p.lag?'完成原版制作，交给 Atelier':'完成制作，交货收尾款'):p.status==='receivable'?'等到约定日，收清尾款':'回工作室'} →</button>`;
}
