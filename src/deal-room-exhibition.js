import {officeAvailable} from './deal-room-office.js';
export const EXHIBITION_THEMES=Object.freeze({journey:'一路怎么走来',favorites:'现在最喜欢的搭配'});
export const EXHIBITION_NOTES=Object.freeze({'first-step':'还记得迈出这一步的时候','try-new':'这一次，我愿意试试新东西','made-it':'从一份想法，到真的做成','slow-down':'看着它，想让日子慢一点',favorite:'不是因为赚得最多，只是现在很喜欢'});
export const EXHIBITION_ACTION_KEYS=Object.freeze({SAVE_PRIVATE_EXHIBITION:['type','theme','entries']});
const product=id=>({mira:{id:'mira',name:'台灯',kind:'lamp'},samir:{id:'samir',name:'保温杯',kind:'cup'},ines:{id:'ines',name:'棉麻桌布',kind:'linen'}}[id]);
export function exhibitionAvailable(state){return officeAvailable(state)&&!!state.officeAnnex;}
export function exhibitionWorks(state){
 const rows=[],valid=c=>c?.status==='paid'&&Number.isSafeInteger(c.quantity)&&c.quantity>0&&Number.isInteger(c.deliveryDay)&&c.deliveryDay>=0&&c.deliveryDay<=state.day;
 for(const [i,c] of (state.contracts||[]).entries())if(valid(c)&&product(c.clientId)){
  const p={...product(c.clientId)};if(c.clientId==='mira'&&c.specification==='developed-studio')p.name='三档调光台灯';if(c.clientId==='mira'&&c.specification==='developed-line')p.name='暖光量产台灯';
  rows.push({sourceId:'order-'+i,title:`${c.clientName||c.clientId} · ${p.name}`,buyer:c.clientName||c.clientId,products:[p],quantity:c.quantity,deliveryDay:c.deliveryDay,kind:'order'});
 }
 for(const [i,c] of (state.curationHistory||[]).entries())if(valid(c)&&typeof c.buyer==='string'&&c.buyer.trim()&&Array.isArray(c.products)&&c.products.length>0&&c.products.length<=3&&new Set(c.products).size===c.products.length&&c.products.every(product))rows.push({sourceId:'case-'+i,title:`${c.buyer} · ${c.products.length} 款选品`,buyer:c.buyer,products:c.products.map(id=>({...product(id),...(id==='mira'&&c.lampVersion==='developed'?{name:'三档调光台灯'}:{})})),quantity:c.quantity,deliveryDay:c.deliveryDay,kind:'case'});
 return rows;
}
export function canonicalExhibitionAction(a){
 if(!a||typeof a!=='object'||Array.isArray(a)||a.type!=='SAVE_PRIVATE_EXHIBITION'||Object.keys(a).length!==3||!Object.hasOwn(EXHIBITION_THEMES,a.theme)||!Array.isArray(a.entries)||a.entries.length<1||a.entries.length>3||!a.entries.some(Boolean))return null;
 if(a.entries.some(e=>e!==null&&(typeof e!=='object'||Array.isArray(e)||Object.keys(e).length!==2||typeof e.sourceId!=='string'||(!/^(order|case)-(0|[1-9][0-9]*)$/.test(e.sourceId)||!Number.isSafeInteger(Number(e.sourceId.split('-')[1])))||!Object.hasOwn(EXHIBITION_NOTES,e.note)))||new Set(a.entries.filter(Boolean).map(e=>e.sourceId)).size!==a.entries.filter(Boolean).length)return null;
 return {type:a.type,theme:a.theme,entries:a.entries.map(e=>e?({sourceId:e.sourceId,note:e.note}):null)};
}
export function applyExhibitionAction(state,action){
 const a=canonicalExhibitionAction(action);if(!a||!exhibitionAvailable(state))return state;
 const works=exhibitionWorks(state);if(a.entries.some(e=>e&&!works.some(w=>w.sourceId===e.sourceId)))return state;
 const entries=a.entries.map(e=>e?({...e,work:structuredClone(works.find(w=>w.sourceId===e.sourceId))}):null);
 const previous=state.privateExhibitions?.at(-1);if(previous?.day===state.day&&previous.theme===a.theme&&JSON.stringify(previous.entries)===JSON.stringify(entries))return state;
 const s=structuredClone(state);s.privateExhibitions=[...(s.privateExhibitions||[]),{id:'exhibition-'+(s.privateExhibitions?.length||0),day:s.day,theme:a.theme,entries}];return s;
}
