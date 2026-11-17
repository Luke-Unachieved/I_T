/** Optional personal consumption. The core reducer owns action journaling.
 * No business buffs, automatic maintenance fees, refunds, time skips or storage. */
export const LIFE_ACTION_KEYS = Object.freeze({BUY_LIFE_ITEM:['type','itemId'],ARRANGE_LIFE_ITEM:['type','itemId','position'],READ_LIFE_BOOK:['type','itemId','page'],SELECT_LIFE_RECORD:['type','itemId','track']});
export const LIFE_ITEMS = Object.freeze([
 Object.freeze({id:'chair',name:'靠窗的阅读椅',price:800,detail:'把折叠椅换成宽一点的扶手椅，给自己留个读书角。',verb:'坐下来读一页'}),
 Object.freeze({id:'coffee',name:'家用咖啡机',price:1200,detail:'给自己做一杯，不是给客户准备的样品。',verb:'磨豆，做一杯咖啡'}),
 Object.freeze({id:'books',name:'《沿街走走》手工书册',price:260,detail:'四篇关于小城和散步的短章，配一枚布书签。放在阅读椅旁，想读时接着上次翻。',verb:'翻开我的书册'}),
 Object.freeze({id:'record',name:'唱片机与首张唱片',price:1800,detail:'给收藏的第一张唱片，留一个喜欢的角落。',verb:'放上一张唱片'}),
 Object.freeze({id:'records',name:'周末双面唱片',price:2200,detail:'雨后散步的慢拍，与街角小舞步的轻快旋律。给唱片机添两面不同的音乐，选一张陪今晚。',verb:'挑一面周末唱片'})
]);
const itemFor=id=>LIFE_ITEMS.find(item=>item.id===id);
export function lifeAvailable(state){return ['review','complete'].includes(state?.phase)&&(state.contracts||[]).some(c=>c.status==='paid');}
export function lifePurchasePreview(state,id){
 const item=itemFor(id),owned=!!state?.personalLife?.purchases?.some(p=>p.itemId===id);
 const needsChair=id==='books'&&!state?.personalLife?.purchases?.some(p=>p.itemId==='chair');
 const needsRecord=id==='records'&&!state?.personalLife?.purchases?.some(p=>p.itemId==='record');
 const valid=!needsRecord&&!needsChair&&!!item&&lifeAvailable(state)&&!owned&&Number.isSafeInteger(state.cash)&&state.cash>=item.price;
 return {item,owned,valid,cashAfter:item?state.cash-item.price:state.cash,reason:!item?'没有这件物品':owned?'已在家里':needsChair?'先给阅读角添一把椅子':needsRecord?'先给家里添一台唱片机':!lifeAvailable(state)?'先把当前合作处理完，再回家看看':state.cash<item.price?'手头的钱还不够':''};
}
export function canonicalLifeAction(a){
 if(!a||typeof a!=='object'||Array.isArray(a)||!Object.hasOwn(LIFE_ACTION_KEYS,a.type)||!itemFor(a.itemId))return null;
 const keys=LIFE_ACTION_KEYS[a.type];
 if(Object.keys(a).length!==keys.length||keys.some(k=>!Object.hasOwn(a,k)))return null;
 if(a.type==='ARRANGE_LIFE_ITEM'&&(['books','records'].includes(a.itemId)||!['window','inside'].includes(a.position)))return null;
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
  life.purchases.push({itemId:a.itemId,price:q.item.price,day:state.day});life.spent+=q.item.price;life.positions[a.itemId]='window';
  next.personalLife=life;next.cash=q.cashAfter;next.feedback={kind:'personal-life',message:a.itemId==='records'?'两面周末唱片到了。今晚，想听哪一种节奏？':a.itemId==='books'?'《沿街走走》送到了，书签也夹好了。今晚读一篇吧。':`${q.item.name}送到了家里。花了 ¥${q.item.price}，这是个人消费，不会提高订单收益。`};return next;
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
