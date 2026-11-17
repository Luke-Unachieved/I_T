import {previewStudioProjectOrder} from './deal-room-studio-project.js';
import {SAMPLE_FACTORIES} from './deal-room-development.js';
/** Isolated inventory-risk experiment, not canonical state or a supplier MOQ rule.
 * New inquiries are explicitly authored trial assumptions, never inferred buyers.
 * No custom branding/design is supplied from generic lamp inventory. */
const copy=x=>JSON.parse(JSON.stringify(x));
const positive=n=>Number.isSafeInteger(n)&&n>0;
const standard=i=>i&&!i.requiresNameplate&&!i.customDesign&&(!i.packaging||i.packaging==='generic')&&(!i.specification||i.specification==='developed-studio');
function validInquiry(i){return standard(i)&&typeof i.clientId==='string'&&i.clientId.trim().length>0&&positive(i.quantity)&&positive(i.unitPrice)&&Number.isSafeInteger(i.quantity*i.unitPrice);}
function ledger(m){const factorySpend=m.batch?m.batch.cost:0,revenue=m.deliveries.reduce((n,d)=>n+d.revenue,0),soldCost=m.deliveries.reduce((n,d)=>n+d.cost,0),operatingCost=m.deliveries.reduce((n,d)=>n+d.operatingCost,0),inventoryCost=m.batch?m.batch.remaining*m.batch.unitCost:0;return {factorySpend,revenue,soldCost,operatingCost,inventoryCost,soldGrossMargin:revenue-soldCost,cashChange:m.cash-m.initialCash};}
function finish(m){m.ledger=ledger(m);return m;}
export function createGapProcurement(state,inquiry={}){
 const f=SAMPLE_FACTORIES.studio;
 if(state.productDevelopment?.status!=='active'||state.productDevelopment.factory!=='studio'||!validInquiry(inquiry)||inquiry.quantity>f.quantity||!Number.isSafeInteger(state.cash)||state.cash<0||!positive(state.day))return null;
 return finish({experimental:true,assumptions:{inquiries:'explicit-trial-brief',factoryOffer:'small-60-per-unit-is-trial-quote;batch-2700-is-current-60-unit-quote-not-MOQ',stockDelivery:'each-later-inquiry-must-explicitly-set-days'},initialCash:state.cash,cash:state.cash,day:state.day,batch:null,inquiries:[{...copy(inquiry),id:'inquiry-1',status:'open',specification:'developed-studio',packaging:'generic'}],activeInquiryId:'inquiry-1',deliveries:[],feedback:'客户询盘只需部分新灯；整批余货由工作室持有，没有保证销路。'});
}
export function previewGapProcurement(m,options={}){
 const factoryMode=typeof options==='string'?options:options.factoryMode||'small';
 const i=m?.inquiries.find(i=>i.id===m.activeInquiryId);if(!i)return {valid:false,reason:'没有待处理的明确询盘。'};
 const f=SAMPLE_FACTORIES.studio,fromStock=!!m.batch;
 if(!['small','batch'].includes(factoryMode))return {valid:false,reason:'请选择明确的小批或整批供应商报价。'};
 const days=fromStock?(i.stockDeliveryDays||0):f.deliveryDays,revenue=i.quantity*i.unitPrice,operatingCost=days*30,factoryCost=fromStock?0:factoryMode==='small'?i.quantity*60:f.productionCost,available=fromStock?m.batch.remaining:factoryMode==='small'?i.quantity:f.quantity,unitCost=fromStock?m.batch.unitCost:factoryMode==='small'?60:f.productionCost/f.quantity;
 const reason=i.status!=='open'?'该询盘已处理或正在生产。':fromStock&&m.batch.status!=='available'?'整批尚未收到，不能先拿在途货重复出库。':fromStock&&!positive(days)?'库存交付天数尚未作为试验条件明确。':available<i.quantity?'现有库存不足，没有自动补货或保证货源。':!Number.isSafeInteger(m.day+days)||!Number.isSafeInteger(m.cash+revenue)?'金额或日期超出安全范围。':m.cash<factoryCost+operatingCost?'当前现金不足以先付整批制作与交付前日费。':'';
 return {valid:!reason,reason,fromStock,factoryMode:fromStock?m.batch.factoryMode:factoryMode,factoryQuantity:available,unitCost,quantity:i.quantity,unitPrice:i.unitPrice,revenue,factoryCost,operatingCost,deliveryDays:days,deliveryDay:m.day+days,requiredCash:factoryCost+operatingCost,soldCost:i.quantity*unitCost,soldGrossMargin:revenue-i.quantity*unitCost,remaining:available-i.quantity,remainingCost:(available-i.quantity)*unitCost,cashAfterDelivery:m.cash-factoryCost-operatingCost+revenue};
}
export function reduceGapProcurement(m,action={}){
 if(!m)return m;const i=m.inquiries.find(i=>i.id===m.activeInquiryId),reject=feedback=>({...m,feedback});
 if(action.type==='ADD_INQUIRY'){
  if(m.activeInquiryId||m.batch?.status!=='available')return m;
  const x=action.inquiry||action;if(!validInquiry(x)||!positive(x.stockDeliveryDays)||x.stockDeliveryDays>30)return reject('新询盘须明确通用调光灯、数量、价格与试验交付天数；铭牌或定制不能直接用此库存。');
  const n=copy(m),id=`inquiry-${n.inquiries.length+1}`;n.inquiries.push({id,clientId:x.clientId,quantity:x.quantity,unitPrice:x.unitPrice,stockDeliveryDays:x.stockDeliveryDays,specification:'developed-studio',packaging:'generic',status:'open'});n.activeInquiryId=id;n.feedback='这是显式新增的试验询盘，不是余货自动产生了买家。';return n;
 }
 if(action.type==='DECLINE_INQUIRY'){
  if(i?.status!=='open')return m;const n=copy(m);n.inquiries.find(x=>x.id===i.id).status='declined';n.activeInquiryId=null;n.feedback='暂不承接，现金、货物与客户既有合同不变。';return n;
 }
 if(action.type==='BUY_FACTORY_BATCH'||action.type==='BUY_FOR_INQUIRY'){
  if(m.batch||i?.status!=='open')return m;const q=previewGapProcurement(m,action.factoryMode||'small');if(!q.valid)return reject(q.reason);
  const n=copy(m);n.cash-=q.factoryCost;n.batch={status:'production',factoryMode:q.factoryMode,quantity:q.factoryQuantity,remaining:q.factoryQuantity,unitCost:q.unitCost,cost:q.factoryCost,readyDay:q.deliveryDay};n.inquiries.find(x=>x.id===i.id).status='production';n.feedback=q.factoryMode==='small'?'按明确的小批试验报价支付制作款，不留计划外余货。':'已支付整批制作款；客户只采购询盘数量，其余货物风险由工作室承担。';return finish(n);
 }
 if(action.type==='FULFIL_FACTORY_INQUIRY'||action.type==='FULFIL_STOCK_INQUIRY'){
  const factory=action.type==='FULFIL_FACTORY_INQUIRY';if(!i)return m;if(factory?(i.status!=='production'||m.batch?.status!=='production'):(i.status!=='open'||m.batch?.status!=='available'))return m;
  let days;if(factory)days=m.batch.readyDay-m.day;else{const q=previewGapProcurement(m);if(!q.valid)return reject(q.reason);days=q.deliveryDays;}
  if(!Number.isSafeInteger(days)||days<0||m.cash<days*30||i.quantity>m.batch.remaining)return reject('现金或实物不足，不能履约。');
  const n=copy(m),o=n.inquiries.find(x=>x.id===i.id),revenue=o.quantity*o.unitPrice;if(!Number.isSafeInteger(n.cash+revenue))return reject('金额超出安全范围。');
  n.day+=days;n.cash+=revenue-days*30;n.batch.remaining-=o.quantity;n.batch.status='available';o.status='paid';n.deliveries.push({inquiryId:o.id,clientId:o.clientId,quantity:o.quantity,specification:'developed-studio',packaging:'generic',deliveryDay:n.day,revenue,cost:o.quantity*n.batch.unitCost,operatingCost:days*30});n.activeInquiryId=null;n.feedback='询盘货物已交付并收款；余货仍是库存成本，不是收入或利润。';return finish(n);
 }
 return m;
}

/** Read-only compatibility/cash illustration against a REAL currently open main
 * proposal. It does not reserve stock, sign, advance either world, or merge saves.
 * Original q keeps main-world dates/cash. Differences below are relative to q,
 * not a promise that the two independent timelines have been synchronized. */
export function previewExistingStudioStock(model,state){
 const p=state?.studioProject;
 const fail=(reason,originalQuote=null)=>({valid:false,reason,originalQuote,usedStock:0});
 if(state?.phase!=='studio-project'||p?.direction!=='independent'||p.status!=='approved')return fail('请先打开真实已批准、尚未签约的自主用途方案。');
 const q=previewStudioProjectOrder(state,p);
 if(!q.valid)return fail(q.reason,q);
 if(q.quantity!==40||q.lampVersion!=='developed'||!q.products.includes('mira'))return fail('这份采购没有明确采用已验三档调光灯，不能替换标准灯或不含灯的组合。',q);
 const b=model?.batch;
 if(!b||b.status!=='available'||b.unitCost!==45||!positive(b.remaining)||model.activeInquiryId)return fail('没有可用且未另行承诺的通用调光灯库存，或成本并非已核实的每盏45。',q);
 if(!standard(b)||!Number.isSafeInteger(b.quantity)||!Number.isSafeInteger(b.remaining)||b.remaining>b.quantity||b.cost!==b.quantity*b.unitCost)return fail('库存的通用规格、数量或原始成本无法核实。',q);
 const delivered=(model.deliveries||[]).reduce((n,d)=>n+d.quantity,0);
 if(delivered+b.remaining!==b.quantity||model.deliveries.some(d=>!standard(d)))return fail('库存与实际出库记录不一致，不能重复使用。',q);
 // Existing independent quote separately pays for its packaging and companions.
 // Reusing the unbranded lamp does not reuse or grant any artwork permissions.
 const costs={mira:45,samir:26,ines:24};
 if(q.products.some(id=>!Object.hasOwn(costs,id))||q.cost!==(q.products.reduce((n,id)=>n+costs[id],q.packaging==='gift'?8:0))*q.quantity)return fail('原方案灯具与其他商品、包装成本无法逐项核实。',q);
 const usedStock=Math.min(q.quantity,b.remaining),stockCostConsumed=usedStock*b.unitCost,newProductionCost=q.cost-usedStock*45;
 const costOfGoodsSold=newProductionCost+stockCostConsumed;
 return {valid:true,reason:'仅验证现货可用于这份已批准组合；未预留、未签约、未执行交付。',originalQuote:q,usedStock,remaining:b.remaining-usedStock,newProductionCost,stockCostConsumed,costOfGoodsSold,
  originalNetProfit:q.netProfit,netProfit:q.revenue-costOfGoodsSold-q.operatingCost,netProfitDifference:q.cost-costOfGoodsSold,
  originalCashChange:q.revenue-q.cost-q.operatingCost,cashChange:q.revenue-newProductionCost-q.operatingCost,cashChangeDifference:usedStock*45,
  originalRequiredCash:q.requiredCash,requiredCash:newProductionCost-q.deposit+q.operatingCost,
  cashAfterSigning:q.cashAfterSigning+usedStock*45,cashAfterPayment:q.cashAfterPayment+usedStock*45,
  timeline:'comparison-only-main-quote-dates-not-a-merged-save',stockReserved:false};
}
