// Separate replay-stable three-payment tenders. V1 keeps the original dates
// and V2 changes only the signing cadence, not the weekly tender rules.
import {EQUIPMENT_MAX_DAYS} from './deal-room-equipment.js';
const rows=[
 ['excavator','履带式挖掘机','青屿工程设备租赁社',2,'台',32,5,84000,62000,45,15,12,3400,4400,1950,8,2500,22,18,57,'按合同清点两台主机及附件，核对交付记录。'],
 ['ultrasound','医院超声诊断设备组','海棠医疗设备采购处',3,'套',48,8,149000,109500,60,23,17,6800,5900,3100,12,4600,42,12,43,'按合同核对三套设备、装箱清单和到货交接记录。'],
 ['filling-line','整套果汁灌装生产线','溪港果品加工厂',1,'条',66,12,335000,253000,55,38,26,14000,15600,5600,18,8300,65,10,35,'全部分段到厂并完成合同约定的交接后，才收验收款。']
];
export const LEGACY_EQUIPMENT_PROJECTS=Object.freeze(rows.map(([id,name,buyer,units,unit,fame,proof,priceCap,factory,downPct,prep,transit,accept,freight,premium,delay,storage,lag,depositPct,progressPct,inspection],index)=>Object.freeze({id,name,buyer,units,unit,fame,proof,priceCap,factory,downPct,prep,transit,accept,freight,premium,delay,storage,lag,depositPct,progressPct,inspection,index})));
const SIGN='SIGN_LEGACY_EQUIPMENT_V1',SHIP='SHIP_LEGACY_EQUIPMENT_V1',ACCEPT='ACCEPT_LEGACY_EQUIPMENT_V1',COLLECT='COLLECT_LEGACY_EQUIPMENT_V1',REBOOK='REBOOK_LEGACY_EQUIPMENT_V1';
export const LEGACY_EQUIPMENT_SIGN_V2='SIGN_LEGACY_EQUIPMENT_V2';
const signTypes=new Set([SIGN,LEGACY_EQUIPMENT_SIGN_V2]);
const LIVE=Object.freeze({[SHIP]:'SHIP_LEGACY_EQUIPMENT_V2',[ACCEPT]:'ACCEPT_LEGACY_EQUIPMENT_V2',[COLLECT]:'COLLECT_LEGACY_EQUIPMENT_V2'});
const KIND='legacy-equipment-v1',PREP='legacy-preparing',TRANSIT='legacy-transit',OWED='legacy-receivable';
const keyset=(...s)=>Object.freeze(s),stageKeys=keyset('type','signedDay','day'),signKeys=keyset('type','projectId','lots','shipping','price','day');
export const LEGACY_EQUIPMENT_ACTION_KEYS=Object.freeze({[SIGN]:signKeys,[LEGACY_EQUIPMENT_SIGN_V2]:signKeys,[SHIP]:stageKeys,[ACCEPT]:stageKeys,[COLLECT]:stageKeys,[REBOOK]:stageKeys,...Object.fromEntries(Object.values(LIVE).map(type=>[type,stageKeys]))});
const uint=x=>Number.isSafeInteger(x)&&x>=0,positive=x=>uint(x)&&x>0,project=id=>LEGACY_EQUIPMENT_PROJECTS.find(p=>p.id===id);
const TIERS=Object.freeze([[1,0,0],[2,1,4],[4,3,8],[8,5,12],[16,8,16]].map(Object.freeze));
const legacyCadenceV2=Object.freeze({
 excavator:Object.freeze([2,5,3]),
 ultrasound:Object.freeze([3,5,3]),
 'filling-line':Object.freeze([4,5,3])
});
const tier=k=>TIERS.find(t=>t[0]===k),week=d=>Math.floor((d-1)/7),route=x=>['shared','reserved'].includes(x);
const fail=reason=>({valid:false,reason,action:null});
function draw(w,i,seed){let x=Math.imul((w+19)|0,0x45d9f3b)^Math.imul(i+seed,0x27d4eb2d);x=Math.imul(x^(x>>>16),0x45d9f3b);return (x^(x>>>16))>>>0;}
const clock=s=>!!s&&positive(s.day)&&uint(s.cash);
const receipted=(r,s)=>r?.status==='paid'&&uint(r.paidDay)&&r.paidDay<=s.day&&positive(r.quantity)&&r.delivered===r.quantity&&r.received===r.revenue&&uint(r.received);
function record(s){
 const paid=(s.marketHistory||[]).filter(r=>receipted(r,s));
 const core=(s.contracts||[]).filter(c=>c?.status==='paid');
 return {fame:s.fame??0,proof:core.length+paid.length,good:paid.filter(r=>[KIND,'equipment'].includes(r.kind)&&uint(r.netProfit)).length,paid};
}
const draftState=s=>clock(s)&&s.phase==='market'&&s.market?.status==='draft'&&Array.isArray(s.contracts)&&s.contracts.length>0&&s.contracts.every(c=>c?.status==='paid')&&
 (s.marketHistory===undefined||Array.isArray(s.marketHistory))&&uint(s.fame??0)&&(s.fame??0)<=100&&!s.afterWorkOutings?.activeTrip;
export function canonicalLegacyEquipmentAction(a){
 if(!a||typeof a!=='object'||Array.isArray(a)||!Object.hasOwn(a,'type')||!Object.hasOwn(LEGACY_EQUIPMENT_ACTION_KEYS,a.type))return null;
 const fields=LEGACY_EQUIPMENT_ACTION_KEYS[a.type];if(Object.keys(a).length!==fields.length||!fields.every(k=>Object.hasOwn(a,k))||!positive(a.day))return null;
 if(signTypes.has(a.type)){if(!project(a.projectId)||!tier(a.lots)||!positive(a.price)||!route(a.shipping))return null;}
 else if(!positive(a.signedDay)||a.signedDay>a.day)return null;
 return Object.fromEntries(fields.map(k=>[k,a[k]]));
}
function terms(p,lots,shipping,price,start,version=1){
 const t=tier(lots);if(!p||!t||!positive(start)||!positive(price)||!route(shipping)||price>p.priceCap*lots||!([1,2].includes(version)))return null;
 const fast=version===2,[prep,transit,paymentLag]=fast?legacyCadenceV2[p.id]:[p.prep,p.transit,p.lag];
 const capped=p.priceCap*lots,goodsCost=p.factory*lots,acceptanceFee=p.accept*lots,freight=p.freight*lots+(shipping==='reserved'?p.premium*lots:0);
 const prepDays=prep+(fast?TIERS.indexOf(t):t[2]),transitDays=transit-(shipping==='reserved'?(fast?2:3):0),shipDay=start+prepDays;
 const plannedDeliveryDay=shipDay+transitDays,plannedPaymentDay=plannedDeliveryDay+paymentLag,slipDays=shipping==='shared'?(fast?2:p.delay):0;
 if(fast&&plannedPaymentDay+slipDays-start>EQUIPMENT_MAX_DAYS)return null;
 const deposit=Math.floor(price*(lots===1?p.depositPct:50)/100),progressDue=Math.floor(price*(lots===1?p.progressPct:30)/100),tailDue=price-deposit-progressDue;
 const supplierDown=Math.floor(goodsCost*p.downPct/100),supplierBalance=goodsCost-supplierDown,shipmentDue=supplierBalance+freight+prepDays*30,acceptDue=acceptanceFee+transitDays*30;
 const projectedOperatingCost=(plannedPaymentDay-start)*30,cost=goodsCost+freight+acceptanceFee;
 const riskCost=shipping==='shared'?lots*p.storage+slipDays*30:0,hold=supplierDown+shipmentDue+acceptDue-deposit;
 const cashRequired=Math.max(0,supplierDown-deposit,supplierDown+shipmentDue-deposit,hold+riskCost,hold+riskCost-progressDue+paymentLag*30);
 const ids=week(start)+':'+p.id;
 const q={kind:KIND,legacyProjectId:p.id,productId:p.id,productName:p.name,buyer:p.buyer,category:'设备项目',source:'factory',mode:'project',sourceName:'设备供货方',shipping,
  tenderId:ids,lots,quantity:1,unit:'单',unitPrice:price,price,priceCap:capped,physicalQuantity:p.units*lots,physicalUnit:p.unit,inspection:lots===1?p.inspection:'按本合同全部 '+p.units*lots+' '+p.unit+'的设备及清单逐批核对，整单交接后收验收款。',
  revenue:price,deposit,progressDue,tailDue,supplierDown,supplierBalance,shipmentDue,acceptDue,
  goodsCost,freight,acceptanceFee,cost,projectedOperatingCost,cashRequired,riskCost,projectedNet:price-cost-projectedOperatingCost,worstNet:price-cost-projectedOperatingCost-riskCost,
  signedDay:start,shipDay,plannedDeliveryDay,plannedPaymentDay,prepDays,transitDays,paymentLag,stationFee:shipping==='shared'?p.storage*lots:0,slipDays,
  rebookFee:shipping==='shared'?p.premium*lots:0,daysSaved:Math.floor(slipDays/2),...(fast?{equipmentTermsVersion:2}:{})};
 return Object.values(q).filter(x=>typeof x==='number').every(Number.isSafeInteger)&&Number.isSafeInteger(plannedPaymentDay+q.slipDays)?q:null;
}
export function legacyEquipmentOffers(s){
 if(!draftState(s))return [];
 const r=record(s),w=week(s.day),offers=[];
 for(const p of LEGACY_EQUIPMENT_PROJECTS){
  const odds=r.fame<p.fame?0:Math.min(90,44+Math.floor((r.fame-p.fame)*1.3)),id=w+':'+p.id;
  if(draw(w,p.index,71)%100>=odds||r.paid.some(o=>o.kind===KIND&&o.tenderId===id))continue;
  for(const [lots,min] of TIERS){if(r.good<min)continue;
   offers.push({projectId:p.id,name:p.name,buyer:p.buyer,tenderId:id,lots,physicalQuantity:p.units*lots,physicalUnit:p.unit,priceCap:p.priceCap*lots,opensDay:w*7+1,replyBy:w*7+7,proof:p.proof,proofMissing:Math.max(0,p.proof-r.proof),fame:p.fame});
  }
 }
 return offers;
}
export function previewLegacyEquipment(s,d,version=1){
 if(!draftState(s)||!d)return fail('请先结清手上的订单，再到采购台查看本期设备询价。');
 const p=project(d.projectId),t=tier(d.lots),match=legacyEquipmentOffers(s).find(o=>o.projectId===d.projectId&&o.lots===d.lots);
 if(!p||!t||!match)return fail('本批设备询价尚未开放或已过期。');
 if(!route(d.shipping)||!positive(d.price)||d.price>match.priceCap)return fail('整单报价须为本期买方接受的正整数金额。');
 const q=terms(p,d.lots,d.shipping,d.price,s.day,version);
 if(!q||!Number.isSafeInteger(s.cash+q.projectedNet)||!Number.isSafeInteger(s.cash+q.deposit-q.supplierDown))return fail('合同金额或日期超出可记录范围。');
 const reason=version===2&&Array.isArray(s.marketParked)&&s.marketParked.length?'先处理订单里暂存的采购，再签这笔设备合同。':match.proofMissing?'还需 '+match.proofMissing+' 笔已收齐的合同履历。':s.cash<q.cashRequired?'周转金不足，还差 ¥'+(q.cashRequired-s.cash)+'；不能拿尚未收到的验收款垫付。':'';
 const action=reason?null:{type:version===2?LEGACY_EQUIPMENT_SIGN_V2:SIGN,projectId:p.id,lots:d.lots,shipping:d.shipping,price:d.price,day:s.day};
 return {...q,valid:!reason,reason,action,cashAfterSigning:s.cash+q.deposit-q.supplierDown,cashAfterPayment:s.cash+q.projectedNet};
}
function orderAt(q,stage,rebooked=false){
 const p=project(q.legacyProjectId),shipped=stage!==PREP,accepted=stage===OWED||stage==='paid',paid=stage==='paid';
 const transfer=shipped&&q.shipping==='shared'&&draw(week(q.signedDay),p.index,101)%100<35;
 const days=transfer?q.slipDays-(rebooked?q.daysSaved:0):0;
 const deliveryDay=q.plannedDeliveryDay+days,paymentDay=deliveryDay+q.paymentLag,last=stage===PREP?q.signedDay:stage===TRANSIT?q.shipDay:stage===OWED?deliveryDay:paymentDay;
 const stationPaid=accepted&&transfer?q.stationFee:0,rebookPaid=transfer&&rebooked?q.rebookFee:0;
 const cost=q.cost+(transfer?q.stationFee:0)+rebookPaid,operatingCost=(paymentDay-q.signedDay)*30,operatingPaid=(last-q.signedDay)*30;
 const received=q.deposit+(accepted?q.progressDue:0)+(paid?q.tailDue:0),supplierPaid=q.supplierDown+(shipped?q.supplierBalance:0);
 const spent=supplierPaid+(shipped?q.freight:0)+(accepted?q.acceptanceFee:0)+stationPaid+rebookPaid+operatingPaid;
 return {...q,status:stage,transfer,rebooked,deliveryDay,paymentDay,delivered:accepted?1:0,physicalDelivered:accepted?q.physicalQuantity:0,
  received,balanceDue:q.revenue-received,supplierPaid,freightPaid:shipped?q.freight:0,acceptancePaid:accepted?q.acceptanceFee:0,stationPaid,rebookPaid,operatingPaid,operatingCost,cost,spent,
  netProfit:q.price-cost-operatingCost,...(paid?{paidDay:paymentDay,actualProfit:received-spent}:{})};
}
function activeAt(s,calendar){
 const a=s?.market?.active,stage=s?.market?.status;
 if(!clock(s)||s.phase!=='market'||a?.kind!==KIND||![PREP,TRANSIT,OWED].includes(stage)||a.status!==stage)return null;
 if(Object.hasOwn(a,'equipmentTermsVersion')&&a.equipmentTermsVersion!==2)return null;
 const q=terms(project(a.legacyProjectId),a.lots,a.shipping,a.price,a.signedDay,a.equipmentTermsVersion??1);
 if(!q||typeof a.rebooked!=='boolean')return null;
 const expected=orderAt(q,stage,a.rebooked);
 if(a.rebooked&&(!expected.transfer||stage===PREP)||!Object.keys(expected).every(k=>expected[k]===a[k]))return null;
 const currentDay=stage===PREP?q.signedDay:stage===TRANSIT?q.shipDay:expected.deliveryDay;
 return (calendar?s.day>=currentDay:s.day===currentDay)?{q,active:a,stage}:null;
}
// Read-only outlook of the existing signed route, without an optional
// rebooking. Uses the same transfer draw, stages and due amounts as settlement.
export function legacyEquipmentCashSchedule(state){
 const now=activeAt(state,true);if(!now)return [];
 const {q,active,stage}=now;
 const stages=stage===PREP?[TRANSIT,OWED,'paid']:stage===TRANSIT?[OWED,'paid']:['paid'];
 let before=active;
 return stages.map(target=>{
  const after=orderAt(q,target,active.rebooked);
  const day=target===TRANSIT?after.shipDay:target===OWED?after.deliveryDay:after.paymentDay;
  const expense=after.spent-before.spent-(after.operatingPaid-before.operatingPaid),income=after.received-before.received;
  before=after;return {day,expense,income};
 });
}
function intent(s,verb,calendar){
 const now=activeAt(s,calendar);if(!now)return null;
 const {q,active:a,stage}=now;
 if(a.equipmentTermsVersion===2&&!calendar&&verb!=='rebook')return null;
 let type,to,rebook=a.rebooked,date;
 if(verb==='rebook'){
  if(stage!==TRANSIT||!a.transfer||a.rebooked||s.day!==q.shipDay)return null;
  type=REBOOK;to=stage;rebook=true;date=s.day;
 }else{if(verb!==undefined)return null;
  [type,to,date]=stage===PREP?[SHIP,TRANSIT,q.shipDay]:stage===TRANSIT?[ACCEPT,OWED,a.deliveryDay]:[COLLECT,'paid',a.paymentDay];
 }
 if(calendar&&type!==REBOOK&&s.day!==date)return null;
 const n=orderAt(q,to,rebook),alreadyPaid=calendar?n.operatingPaid-a.operatingPaid:0;
 const out=n.spent-a.spent-alreadyPaid,income=n.received-a.received,cash=s.cash-out+income;
 // On arrival supplier costs/running costs must be affordable *before*
 // receiving the progress installment. Same rule for collecting the final tail.
 if(!uint(out)||!uint(income)||s.cash<out||!uint(cash)||date<s.day)return null;
 if(type===REBOOK){
  const toAcceptance=q.acceptanceFee+q.stationFee+(n.deliveryDay-s.day)*30;
  if(cash<toAcceptance||cash-toAcceptance+q.progressDue<q.paymentLag*30)return null;
 }
 return {n,cash,date,action:{type:calendar?(LIVE[type]||type):type,signedDay:q.signedDay,day:s.day}};
}
export function legacyEquipmentNextAction(s,verb){return intent(s,verb)?.action??null;}
export function legacyEquipmentCalendarAction(s,verb){return intent(s,verb,true)?.action??null;}
export function applyLegacyEquipmentAction(s,input,canStart=true){
 const a=canonicalLegacyEquipmentAction(input);if(!a)return s;
 if(signTypes.has(a.type)){
  const version=a.type===LEGACY_EQUIPMENT_SIGN_V2?2:1;
  if(!canStart||s?.day!==a.day)return s;const quote=previewLegacyEquipment(s,a,version);if(!quote.valid)return s;
  const q=terms(project(a.projectId),a.lots,a.shipping,a.price,a.day,version),order=orderAt(q,PREP);
  const n=structuredClone(s);n.cash=quote.cashAfterSigning;n.market.status=PREP;n.market.active=order;n.feedback={kind:'legacy-equipment-signed',message:order.productName+'整单签约，收客户定金 ¥'+order.deposit+'，付厂方订金 ¥'+order.supplierDown+'。'};return n;
 }
 const historic=Object.keys(LIVE).find(type=>LIVE[type]===a.type),type=historic||a.type;
 const plan=intent(s,type===REBOOK?'rebook':undefined,Boolean(historic));
 if(!plan||a.type!==plan.action.type||a.signedDay!==plan.action.signedDay||a.day!==plan.action.day)return s;
 const n=structuredClone(s),o=plan.n;n.day=plan.date;n.cash=plan.cash;n.market.active=o;n.market.status=o.status;
 const message=type===SHIP?'已付厂方尾款 ¥'+o.supplierBalance+' 和运费 ¥'+o.freight+'。'+(o.transfer?'接驳船改期；可等新船期，或付费争取早班。':'本批按约出运。'):
  type===REBOOK?'已付改订费 ¥'+o.rebookPaid+'，到货日提前至第 '+o.deliveryDay+' 天；场站费仍需支付。':
  type===ACCEPT?'整单已验收，已付验收费 ¥'+o.acceptanceFee+(o.stationPaid?' 和场站费 ¥'+o.stationPaid:'')+'，收到验收款 ¥'+o.progressDue+'。':
  '已实收尾款 ¥'+o.tailDue+'；整单收支结清，实际净利 ¥'+o.actualProfit+'。';
 n.feedback={kind:type===SHIP?'legacy-equipment-shipped':type===REBOOK?'legacy-equipment-rebooked':type===ACCEPT?'legacy-equipment-accepted':'market-paid',message};
 if(o.status==='paid')n.marketHistory=[...(n.marketHistory||[]),structuredClone(o)];
 return n;
}
