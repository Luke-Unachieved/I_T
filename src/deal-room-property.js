// Modern studio purchases. Browsing is a projection only; no storage, UI, clock,
// business settlement, relationship or automatic upgrade is touched here.
const propRows = (kind, rows) => rows.map(([id,name,price,fame,kindLabelOnly=false]) =>
  Object.freeze({id,kind,name,price,fame,nameStatus:kindLabelOnly?'type-label':'recorded',
    priceStatus:price===null?'unverified':'recorded'}));

export const PROPERTY_CATALOG = Object.freeze([
  ...propRows('office', [
    ['office-window','窗边工作室',24800,5], ['office-loft','挑高办公室',42800,5],
    ['office-yard','庭院办公室',68800,5], ['office-city','城景办公室',98000,5],
    ['office-river','临水办公室',138000,5], ['office-wide','景观长窗办公室',198000,5],
    ['office-terrace','露台办公室',278000,5], ['office-sky','天际办公室',428000,5]
  ]),
  ...propRows('home', [
    ['home-starter','工作室起居角',0,0],['home-flat','旧公寓',24800,0],
    ['home-harbor','海港小屋',108000,0],['home-tower','城市高层',428000,0],
    ['home-villa','庭院别墅',1680000,15]
  ]),
  ...propRows('car', [
    ['car-hatch','巷口小两厢',3800,5],['car-wagon','海蓝长途旅行车',18800,10],
    // Initial three-car screenshot lists a sports car for 56,800, NOT this camper.
    ['car-camper','升顶露营车',null,10,true],
    ['car-roadster','双座敞篷',1018000,15,true],['car-4wd','远征四驱',1180000,15,true],
    ['car-gt','电动 GT',1380000,15,true],['car-limo','长轴礼宾轿车',1880000,15,true],
    ['car-super','熔金中置双门',2780000,15]
  ])
]);
const propItem = id => PROPERTY_CATALOG.find(x=>x.id===id);
const propMoney = n => Number.isSafeInteger(n) && n>=0;
const propRecord = x => x!==null && typeof x==='object' && !Array.isArray(x);
const propHas = (o,k) => Object.prototype.hasOwnProperty.call(o,k);
const propFields = (o,ks) => propRecord(o) && Object.keys(o).length===ks.length && ks.every(k=>propHas(o,k));
const starterReceipt = () => ({id:'home-starter',paid:0,day:0});
const propRates = x => Number((BigInt(x)*7n)/10n);
const propValidReceipt = x => propRecord(x) && !!propItem(x.id) && propMoney(x.paid) && propMoney(x.day)
  && (x.id!=='home-starter' || x.paid===0);
const propValidHoldings = h => propRecord(h) && Array.isArray(h.owned) && h.owned.every(propValidReceipt)
  && new Set(h.owned.map(r=>r.id)).size===h.owned.length && h.owned.some(r=>r.id==='home-starter')
  && Array.isArray(h.purchases) && h.purchases.every(p=>propValidReceipt(p) && propMoney(p.price)
    && propMoney(p.credit) && p.credit<=p.price && p.paid===p.price-p.credit)
  && propRecord(h.active) && ['office','home','car'].every(k =>
    h.active[k]===null ? k!=='home' : h.owned.some(r=>r.id===h.active[k] && propItem(r.id).kind===k));

/** Detached read model. null means malformed holdings; never overwrite them. */
export function propertyHoldings(state) {
  if (!propRecord(state)) return null;
  const stored=state.propertyAssets;
  if (stored!==undefined && !propValidHoldings(stored)) return null;
  const h=stored===undefined ? {owned:[starterReceipt()],active:{office:null,home:'home-starter',car:null},purchases:[]}
    : structuredClone(stored);
  // Only the shipped legacy window-studio purchase has a verified shape. Keep
  // its exact receipt; do not mint fame, charge the price difference or change the annex.
  const legacy=state.officeImprovement;
  if (legacy?.id==='window-studio' && !h.owned.some(r=>r.id==='office-window')) {
    if (!propMoney(legacy.price)||!propMoney(legacy.day)) return null;
    h.owned.push({id:'office-window',paid:legacy.price,day:legacy.day});
    if(h.active.office===null) h.active.office='office-window';
  }
  return h;
}

/** Currency values are whole yuan. No payout if an allowance exceeds the new price. */
export function propertyPreview(state,id,tradeInId=null) {
  const item=propItem(id)||null, h=propertyHoldings(state);
  const held=h?.owned.find(r=>r.id===id)||null;
  const q={item,valid:false,reason:'',owned:!!held,active:!!item&&h?.active[item.kind]===id,
    price:item?.price??null,tradeInId,tradeInAllowance:0,creditUsed:0,cashDue:null,cashAfter:null,shortfall:null,fameGain:0};
  const no=reason=>({...q,reason});
  if(!item) return no('没有这项资产');
  if(!h || !propMoney(state.cash) || !propMoney(state.day) ||
    !(state.fame===undefined || (propMoney(state.fame)&&state.fame<=100))) return no('账目暂时无法核对');
  if(held) return no('已经拥有');
  if(item.price===null) return no('暂未开放购买');
  if(tradeInId!==null){
    const old=h.owned.find(r=>r.id===tradeInId);
    if(!old || old.id==='home-starter' || old.id===id || item.kind==='office' ||
      item.kind!==propItem(old.id)?.kind) return no('这项资产不能用于本次置换');
    q.tradeInAllowance=propRates(old.paid);
    q.creditUsed=Math.min(q.tradeInAllowance,item.price);
  }
  q.cashDue=item.price-q.creditUsed;
  q.shortfall=Math.max(0,q.cashDue-state.cash);
  if(q.shortfall) return no('可用资金不足');
  q.cashAfter=state.cash-q.cashDue;
  // Do not farm publicity by repeatedly buying back the very same car or house.
  q.fameGain=h.purchases.some(p=>p.id===id)?0:Math.min(item.fame,100-(state.fame??0));
  return {...q,valid:true};
}

export const PROPERTY_ACTION_KEYS=Object.freeze({
  BUY_PROPERTY:Object.freeze(['type','assetId']),
  TRADE_IN_PROPERTY:Object.freeze(['type','assetId','tradeInId']),
  SWITCH_PROPERTY:Object.freeze(['type','assetId'])
});
export function canonicalPropertyAction(action){
  if(!propRecord(action) || typeof action.type!=='string' || !propHas(PROPERTY_ACTION_KEYS,action.type)) return null;
  const ks=PROPERTY_ACTION_KEYS[action.type];
  if(!propFields(action,ks)||!propItem(action.assetId)) return null;
  if(action.type==='TRADE_IN_PROPERTY' && (!propItem(action.tradeInId)||action.tradeInId===action.assetId))return null;
  return Object.fromEntries(ks.map(k=>[k,action[k]]));
}

/** Invalid/repeated actions return the original reference; the caller owns journaling. */
export function applyPropertyAction(state,action){
  const a=canonicalPropertyAction(action);
  if(!a)return state;
  const h=propertyHoldings(state);
  if(!h)return state;
  const item=propItem(a.assetId);
  if(a.type==='SWITCH_PROPERTY'){
    if(!h.owned.some(r=>r.id===item.id) || h.active[item.kind]===item.id)return state;
    h.active[item.kind]=item.id;
    return {...state,propertyAssets:h};
  }
  const q=propertyPreview(state,item.id,a.tradeInId??null);
  if(!q.valid)return state;
  if(q.tradeInId!==null)h.owned=h.owned.filter(r=>r.id!==q.tradeInId);
  const receipt={id:item.id,day:state.day,paid:q.cashDue};
  h.owned.push(receipt);
  h.active[item.kind]=item.id;
  h.purchases.push({...receipt,price:q.price,credit:q.creditUsed,tradeInId:q.tradeInId});
  return {...state,cash:q.cashAfter,fame:(state.fame??0)+q.fameGain,propertyAssets:h};
}
