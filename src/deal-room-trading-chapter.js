import {SAMPLE_FACTORIES} from './deal-room-development.js';
// A trading outcome independent of brand ownership. Sources are canonical paid contracts,
// not button clicks, current cash, a licence or an abstract experience counter.
const productLabel={mira:'便携台灯',samir:'保温杯',ines:'棉麻桌布'};
const settled=(o,day)=>o?.status==='paid'&&[o.signedDay,o.deliveryDay,o.paymentDay,o.revenue,o.deposit,o.balanceDue].every(Number.isSafeInteger)&&o.signedDay>=0&&o.signedDay<=o.deliveryDay&&o.deliveryDay<=o.paymentDay&&o.paymentDay<=day&&o.revenue>0&&o.deposit>=0&&o.balanceDue>=0&&o.deposit+o.balanceDue===o.revenue;
function chainReceipts(state){
 const rows=state.accountHistory||[],pilot=rows[0],last=rows.at(-1);
 const shapes=rows.length===1&&!pilot?.expansion&&pilot?.stores===6&&['funded','rollout'].includes(pilot.optionId)||
  rows.length===2&&!pilot?.expansion&&pilot?.stores===3&&pilot.optionId==='pilot'&&last?.expansion===true&&last.stores===3&&last.optionId==='remaining'&&last.referrerId===pilot.referrerId&&last.signedDay>=pilot.paymentDay;
 if(!shapes||!rows.every(b=>settled(b,state.day)&&b.buyer==='Northline · 区域连锁采购'&&!b.seriesSource&&b.sets===100*b.stores&&Array.isArray(b.products)&&b.products.length>0&&b.products.every(id=>Object.hasOwn(productLabel,id))&&new Set(b.products).size===b.products.length))return null;
 const source=(state.curationHistory||[]).find(c=>settled(c,state.day)&&Number.isSafeInteger(c.quantity)&&c.quantity>0&&rows.every(b=>c.referrerId===b.referrerId&&c.referrerName===b.referrerName&&c.paymentDay<=b.signedDay&&JSON.stringify(c.products)===JSON.stringify(b.products)&&(c.lampVersion||'standard')===(b.lampVersion||'standard')));
 return source?{batches:rows,source,sets:rows.reduce((n,b)=>n+b.sets,0),revenue:rows.reduce((n,b)=>n+b.revenue,0),paymentDay:last.paymentDay}:null;
}
function modelReceipt(state){
 let first=null;
 for(const c of state.contracts||[]){
  if(!settled(c,state.day)||c.clientId!=='mira')continue;
  const supplier=c.optionId==='developed-lamp'?state.productDevelopment:c.optionId==='second-developed-lamp'?state.secondSupplier:null,kind=supplier?.factory;
  if(supplier?.status!=='active'||!Object.hasOwn(SAMPLE_FACTORIES,kind)||!Number.isInteger(supplier.sampleDay)||supplier.sampleDay>c.signedDay)continue;
  const f=SAMPLE_FACTORIES[kind],paidDay=c.paidDay??c.paymentDay;
  if(Number.isSafeInteger(paidDay)&&paidDay>=c.paymentDay&&paidDay<=state.day&&c.specification==='developed-'+kind&&c.quantity===f.quantity&&c.product===f.title&&(!first||paidDay<first.paidDay))first={kind,factory:f.name,product:f.title,contract:c,paidDay};
 }
 return first;
}
export function tradingChapter(state){
 const chain=chainReceipts(state);if(!chain)return null;
 const model=modelReceipt(state);
 return chain&&model?{chain,model,completedDay:Math.max(chain.paymentDay,model.paidDay)}:null;
}
const cash=n=>'¥'+n.toLocaleString('zh-CN');
export function tradingChapterView(t,focus='chain',settledLedger=''){
 const model=focus==='model',c=t.model.contract;
 return `<section class="career-recap" aria-label="贸易供货路线收尾"><small>第 ${t.completedDay} 天 · 贸易工作室</small><h3 tabindex="-1">做成了六家店的供货生意</h3><p>一份买手选品变成了六家门店的采购；另一款工厂新样，也成了 Mira 愿意付钱订的产品。</p><div class="career-directions" role="group" aria-label="选择要摆上桌的成果"><button data-trade-evidence="chain" aria-pressed="${!model}">看六店供货</button><button data-trade-evidence="model" aria-pressed="${model}">看新品采用</button></div><div class="recap-facts" aria-live="polite">${model?`<div><strong>${c.quantity} 盏</strong><span>Mira · ${t.model.product}</span></div><div><strong>${cash(c.revenue)}</strong><span>这批灯的货款，已收齐</span></div>`:`<div><strong>${t.chain.sets} 套</strong><span>Northline · 六家店的通用组合</span></div><div><strong>${cash(t.chain.revenue)}</strong><span>门店采购货款，已收齐</span></div>`}</div>${model?`<p>${t.model.factory} 的实物样转成了正式订单。第 ${c.deliveryDay} 天送到 Mira，第 ${t.model.paidDay} 天收清货款。</p><button class="quiet" data-action="${c.optionId==='second-developed-lamp'?'OPEN_SECOND_SUPPLIER':'VIEW_DEVELOPMENT'}">取出这笔订单的工厂留样 →</button>`:`<p>${t.chain.source.products.map(id=>id==='mira'&&t.chain.source.lampVersion==='developed'?'三档调光台灯':productLabel[id]).join('、')}。</p>${t.chain.batches.map((b,i)=>`<p>${b.stores===6?'六家门店':i?'后来三家':'首批三家'}：${b.sets} 套，第 ${b.deliveryDay} 天交货，第 ${b.paymentDay} 天收齐 ${cash(b.revenue)}。</p>`).join('')}<details><summary>翻开最初那份买手选品</summary><p>第 ${t.chain.source.paymentDay} 天，买手收到的 ${t.chain.source.quantity} 套选品已经结清。之后递给 Northline 的，是这份做过的组合。</p></details>`}${settledLedger}<button class="primary" id="resume-work">继续自由经营 →</button></section>`;
}
export function tradingChapterVisual(t,focus='chain'){
 const isModel=focus==='model',c=t.model.contract,b=t.chain.batches[0];
 return {buyer:isModel?'Mira · '+t.model.product:'Northline · 六店通用组合',referrerName:'工作室',anchor:null,status:'paid',packaging:'plain',products:isModel?['mira']:[...b.products],productNames:isModel?[t.model.product]:b.products.map(id=>id==='mira'&&b.lampVersion==='developed'?'三档调光台灯':productLabel[id]),quantityLabel:isModel?c.quantity+' 盏已交付':t.chain.sets+' 套已交付',lampVersion:isModel?(t.model.kind==='studio'?'developed':'standard'):b.lampVersion||'standard'};
}
