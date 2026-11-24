/** Optional personal consumption. The core reducer owns action journaling.
 * No business buffs, automatic maintenance fees, refunds, time skips or storage. */
import {workspaceProgressCue} from './deal-room-workspace-sleep.js?v=36';

export const LIFE_ACTION_KEYS = Object.freeze({PLANT_BALCONY:['type','itemId','plant'],HARVEST_BALCONY:['type','itemId'],BREW_BALCONY_TEA:['type','itemId'],BUY_LIFE_ITEM:['type','itemId'],ARRANGE_LIFE_ITEM:['type','itemId','position'],READ_LIFE_BOOK:['type','itemId','page'],SELECT_LIFE_RECORD:['type','itemId','track']});
export const LIFE_ITEMS = Object.freeze([
 Object.freeze({id:'chair',name:'靠窗的阅读椅',price:800,detail:'把折叠椅换成宽一点的扶手椅，给自己留个读书角。',verb:'坐下来读一页'}),
 Object.freeze({id:'coffee',name:'家用咖啡机',price:1200,detail:'给自己做一杯，不是给客户准备的样品。',verb:'磨豆，做一杯咖啡'}),
 Object.freeze({id:'books',name:'《沿街走走》手工书册',price:260,detail:'四篇关于小城和散步的短章，配一枚布书签。放在阅读椅旁，想读时接着上次翻。',verb:'翻开我的书册'}),
 Object.freeze({id:'record',name:'唱片机与首张唱片',price:1800,detail:'给收藏的第一张唱片，留一个喜欢的角落。',verb:'放上一张唱片'}),
 Object.freeze({id:'records',name:'周末双面唱片',price:2200,detail:'一面是慢拍的《雨后散步》，另一面是轻快的《街角小舞步》。今晚想听哪一面？',verb:'挑一面周末唱片'})
]);
const readingLamp=Object.freeze({id:'readinglamp',name:'三档调光阅读角',price:760,detail:'你交给米拉的那款调光灯，也能在家里用。另向工厂订一盏家用灯（¥180），再配木边几和安装（¥580）。这是自己的新灯，不占客户的货或工作室留样。',verb:'试试我的三档灯'});
const balcony=Object.freeze({id:'balcony',name:'窗外的小阳台',price:9600,detail:'把闲置的小阳台改成自己的露台：防滑地板、木凳和一个种植槽。苗和用具都在这笔预算里。可以种薄荷留一包茶料，或把小花做成桌上的干花。',verb:'推开阳台门'});
const balconyOpen=s=>!!(s?.personalLife?.purchases?.length&&s.contracts?.some(c=>c.status==='paid'&&c.businessRound>0));
const itemFor=id=>id==='balcony'?balcony:id==='readinglamp'?readingLamp:LIFE_ITEMS.find(item=>item.id===id);
export function lifeReadingLampBasis(state){
 const suppliers={'developed-lamp':state?.productDevelopment,'second-developed-lamp':state?.secondSupplier};
 return (state?.contracts||[]).find(c=>c.clientId==='mira'&&c.status==='paid'&&c.specification==='developed-studio'&&Number.isSafeInteger(c.paymentDay)&&c.paymentDay<=state.day&&Object.hasOwn(suppliers,c.optionId)&&suppliers[c.optionId]?.status==='active'&&suppliers[c.optionId].factory==='studio')||null;
}
export function lifeCatalogue(state){
 const base=lifeReadingLampBasis(state)||state?.personalLife?.purchases?.some(p=>p.itemId==='readinglamp')?[...LIFE_ITEMS,readingLamp]:LIFE_ITEMS;
 return state&&(balconyOpen(state)||state.personalLife?.purchases?.some(p=>p.itemId==='balcony'))?[...base,balcony]:base;
}
export function lifeLightLevel(ui){return Number.isInteger(ui?.readingLight)&&ui.readingLight>=0&&ui.readingLight<=3?ui.readingLight:0;}
export function lifeAvailable(state){return ['review','complete'].includes(state?.phase)&&(state.contracts||[]).some(c=>c.status==='paid');}
export function lifePurchasePreview(state,id){
 const item=itemFor(id),owned=!!state?.personalLife?.purchases?.some(p=>p.itemId===id);
 const needsBasis=id==='readinglamp'&&!lifeReadingLampBasis(state);
 const needsChair=['books','readinglamp'].includes(id)&&!state?.personalLife?.purchases?.some(p=>p.itemId==='chair');
 const needsRecord=id==='records'&&!state?.personalLife?.purchases?.some(p=>p.itemId==='record');
 const needsHome=id==='balcony'&&!balconyOpen(state);
 const available=lifeAvailable(state),valid=!needsHome&&!needsBasis&&!needsRecord&&!needsChair&&!!item&&available&&!owned&&Number.isSafeInteger(state.cash)&&state.cash>=item.price;
 const gate=!available&&item&&!owned&&!needsHome&&!needsBasis&&!needsRecord&&!needsChair?workspaceProgressCue(state):null;
 return {item,owned,valid,cashAfter:item?state.cash-item.price:state.cash,reason:!item?'没有这件物品':owned?'已在家里':needsHome?'家里先添一件家具，再做完一单老客户的生意':needsBasis?'先给米拉交付这款调光灯，再收齐货款':needsChair?'先给阅读角添一把椅子':needsRecord?'先给家里添一台唱片机':gate?gate.reason:state.cash<item.price?'手头的钱还不够':'',...(gate?.tab?{nextStep:{tab:gate.tab,label:gate.label}}:{})};
}
export function canonicalLifeAction(a){
 if(!a||typeof a!=='object'||Array.isArray(a)||!Object.hasOwn(LIFE_ACTION_KEYS,a.type)||!itemFor(a.itemId))return null;
 const keys=LIFE_ACTION_KEYS[a.type];
 if(Object.keys(a).length!==keys.length||keys.some(k=>!Object.hasOwn(a,k)))return null;
 if(['PLANT_BALCONY','HARVEST_BALCONY','BREW_BALCONY_TEA'].includes(a.type)&&(a.itemId!=='balcony'||a.type==='PLANT_BALCONY'&&!['mint','daisy'].includes(a.plant)))return null;
 if(a.type==='ARRANGE_LIFE_ITEM'&&(['books','records','readinglamp','balcony'].includes(a.itemId)||!['window','inside'].includes(a.position)))return null;
 if(a.type==='READ_LIFE_BOOK'&&(a.itemId!=='books'||!Number.isInteger(a.page)||a.page<0||a.page>3))return null;
 if(a.type==='SELECT_LIFE_RECORD'&&(a.itemId!=='records'||!['evening','rain','dance'].includes(a.track)))return null;
 return Object.fromEntries(keys.map(k=>[k,a[k]]));
}
export function applyLifeAction(state,action){
 const a=canonicalLifeAction(action);if(!a||!lifeAvailable(state))return state;
 const owned=state.personalLife?.purchases?.find(p=>p.itemId===a.itemId);
 if(a.type==='BUY_LIFE_ITEM'){
  const q=lifePurchasePreview(state,a.itemId);if(!q.valid)return state;
  const next=structuredClone(state),life=next.personalLife||{purchases:[],positions:{},spent:0};
  life.purchases.push({itemId:a.itemId,price:q.item.price,day:state.day});life.spent+=q.item.price;if(!['readinglamp','balcony'].includes(a.itemId))life.positions[a.itemId]='window';
  next.personalLife=life;next.cash=q.cashAfter;next.feedback={kind:'personal-life',message:a.itemId==='balcony'?'阳台门打开了。木凳和种植槽都已安稳落地。':a.itemId==='records'?'两面周末唱片到了。今晚，想听哪一种节奏？':a.itemId==='books'?'《沿街走走》送到了，书签也夹好了。今晚读一篇吧。':`${q.item.name}送到了家里。花了 ¥${q.item.price}，这是个人消费，不会提高订单收益。`};return next;
 }
 if(['PLANT_BALCONY','HARVEST_BALCONY','BREW_BALCONY_TEA'].includes(a.type)){
  if(!owned)return state;const g=state.personalLife.balconyGarden||{};
  if(a.type==='PLANT_BALCONY'&&g.crop||a.type==='HARVEST_BALCONY'&&(!g.crop||state.day<g.crop.readyDay||g.crop.plant==='mint'&&g.teaPacket)||a.type==='BREW_BALCONY_TEA'&&!g.teaPacket)return state;
  const next=structuredClone(state),garden=next.personalLife.balconyGarden??={};
  if(a.type==='PLANT_BALCONY')garden.crop={plant:a.plant,plantedDay:state.day,readyDay:state.day+(a.plant==='mint'?4:7)};
  else if(a.type==='HARVEST_BALCONY'){if(garden.crop.plant==='mint')garden.teaPacket=true;else garden.flowers=true;delete garden.crop;}
  else garden.teaPacket=false;
  return next;
 }
 if(a.type==='SELECT_LIFE_RECORD'){
  if(!owned||a.track===(state.personalLife.recordTrack||'evening'))return state;
  const next=structuredClone(state);next.personalLife.recordTrack=a.track;return next;
 }
 if(a.type==='READ_LIFE_BOOK'){
  if(!owned||a.page===(state.personalLife.readingPage||0))return state;
  const next=structuredClone(state);next.personalLife.readingPage=a.page;return next;
 }
 if(!owned||state.personalLife.positions[a.itemId]===a.position)return state;
 const next=structuredClone(state);next.personalLife.positions[a.itemId]=a.position;return next;
}
