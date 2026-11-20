import {officeAvailable} from './deal-room-office.js';
export const ANNEX_PRICE=24000;
export const ANNEX_ACTION_KEYS=Object.freeze({BUY_OFFICE_ANNEX:['type'],SET_ANNEX_DISPLAY:['type','slot','sampleId'],SET_ANNEX_DOOR:['type','open'],SET_ANNEX_LIGHT:['type','light']});
export function annexSamples(state){
 const paid=id=>(state.contracts||[]).some(c=>c.status==='paid'&&c.clientId===id);
 const rows=[['mira','台灯','lamp'],['samir','保温杯','cup'],['ines','棉麻桌布','linen']].filter(([id])=>paid(id)).map(([id,name,kind])=>({id,name,kind}));
 for(const factory of ['studio','line'])if([state.productDevelopment,state.secondSupplier].some(s=>s?.status==='active'&&s.factory===factory))rows.push({id:factory,name:factory==='studio'?'三档调光留样':'暖光量产留样',kind:'lamp'});
 for(const [index,c] of (state.curationHistory||[]).entries()){
  if(!c||typeof c!=='object'||c.status!=='paid'||!Array.isArray(c.products)||!c.products.length||c.products.length>3||new Set(c.products).size!==c.products.length||!c.products.every(id=>['mira','samir','ines'].includes(id))||!Number.isInteger(c.deliveryDay)||c.deliveryDay<0||c.deliveryDay>state.day||!Number.isSafeInteger(c.quantity)||c.quantity<=0||typeof c.buyer!=='string'||!c.buyer.trim())continue;
  rows.push({id:'case-'+index,name:`合作 ${index+1} · ${c.buyer}`,kind:'case',caseIndex:index,buyer:c.buyer,products:c.products.map(id=>({id,kind:{mira:'lamp',samir:'cup',ines:'linen'}[id],name:id==='mira'&&c.lampVersion==='developed'?'三档调光台灯':{mira:'台灯',samir:'保温杯',ines:'棉麻桌布'}[id]})),quantity:c.quantity,deliveryDay:c.deliveryDay,packaging:c.packaging==='gift'?'整组礼盒':'常规包装'});
 }
 return rows;
}
export function annexPreview(state){const owned=!!state.officeAnnex,available=officeAvailable(state)&&!!state.officeImprovement,validCash=Number.isSafeInteger(state.cash)&&state.cash>=0;return {owned,available,valid:available&&!owned&&validCash&&state.cash>=ANNEX_PRICE,price:ANNEX_PRICE,cashAfter:validCash?state.cash-ANNEX_PRICE:null};}
export function canonicalAnnexAction(a){
 if(!a||typeof a!=='object'||Array.isArray(a)||!Object.hasOwn(ANNEX_ACTION_KEYS,a.type))return null;
 const keys=ANNEX_ACTION_KEYS[a.type];if(Object.keys(a).length!==keys.length||keys.some(k=>!Object.hasOwn(a,k)))return null;
 if(a.type==='SET_ANNEX_DISPLAY'&&(![0,1].includes(a.slot)||(!['','mira','samir','ines','studio','line'].includes(a.sampleId)&&!(typeof a.sampleId==='string'&&/^case-(0|[1-9][0-9]{0,3})$/.test(a.sampleId)))))return null;
 if(a.type==='SET_ANNEX_DOOR'&&typeof a.open!=='boolean')return null;
 if(a.type==='SET_ANNEX_LIGHT'&&!['day','warm'].includes(a.light))return null;
 return Object.fromEntries(keys.map(k=>[k,a[k]]));
}
export function applyAnnexAction(state,action){
 const a=canonicalAnnexAction(action);if(!a||!annexPreview(state).available)return state;
 if(a.type==='BUY_OFFICE_ANNEX'){
  if(!annexPreview(state).valid)return state;const s=structuredClone(state);s.cash-=ANNEX_PRICE;s.officeAnnex={id:'sample-terrace',price:ANNEX_PRICE,day:state.day,display:['',''],doorOpen:false,light:'day'};s.feedback={kind:'office-annex',message:'样品会客室安顿好了。挑两件做成的产品摆上桌，再去露台走走。'};return s;
 }
 if(!state.officeAnnex)return state;const d=state.officeAnnex;
 if(a.type==='SET_ANNEX_DISPLAY'&&(d.display[a.slot]===a.sampleId||a.sampleId&&!annexSamples(state).some(x=>x.id===a.sampleId)||a.sampleId&&d.display[1-a.slot]===a.sampleId))return state;
 if(a.type==='SET_ANNEX_DOOR'&&d.doorOpen===a.open||a.type==='SET_ANNEX_LIGHT'&&d.light===a.light)return state;
 const s=structuredClone(state);if(a.type==='SET_ANNEX_DISPLAY')s.officeAnnex.display[a.slot]=a.sampleId;if(a.type==='SET_ANNEX_DOOR')s.officeAnnex.doorOpen=a.open;if(a.type==='SET_ANNEX_LIGHT')s.officeAnnex.light=a.light;return s;
}
