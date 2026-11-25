import { FRIEND_OUTINGS, OUTING_COMPANIONS, TRAVEL_OUTINGS } from '../data/outing-catalog.js';

export const LIFE_CATALOG = {
  properties: [
    { id: 'studio-room', label: '港边起居单间', price: 28000, asset: 'assets/deal-property-card-home-starter.webp',
      description: '一间简单的小屋，窗外能看见海港。可抵押给银行。' },
    { id: 'city-flat', label: '城南小公寓', price: 62000, asset: 'assets/deal-property-card-home-flat.webp',
      description: '一居室，窗台能晒到下午的阳光。可抵押给银行。' },
    { id: 'harbor-home', label: '海港边的家', price: 156000, asset: 'assets/deal-property-card-home-harbor.webp',
      description: '靠近出货口，傍晚能看到最后一班货轮。可抵押给银行。' },
    { id: 'city-loft', label: '老街挑高阁楼', price: 246000, asset: 'assets/v38-home-loft.webp',
      description: '两层起居空间、整面长窗和一张暖阳下的餐桌。可抵押给银行。' },
    { id: 'hill-villa', label: '山坡小别墅', price: 382000, asset: 'assets/deal-property-card-home-villa.webp',
      description: '有院子和工作间。可抵押给银行。' },
    { id: 'city-tower', label: '城市高层住宅', price: 780000, asset: 'assets/deal-property-card-home-tower.webp',
      description: '白天俯瞰街道，夜里在长窗前看整座城市亮灯。可抵押给银行。' },
    { id: 'river-duplex', label: '临江复式住宅', price: 1350000, asset: 'assets/v38-home-river-duplex.webp',
      description: '两层挑高客厅和开阔的江景，足够招待一桌好友。可抵押给银行。' },
    { id: 'seaside-estate', label: '海湾庄园', price: 2800000, asset: 'assets/v38-home-seaside-estate.webp',
      description: '临海露台、花园与泳池，忙碌之后可以真正慢下来。可抵押给银行。' },
  ],
  cars: [
    { id: 'hatch', label: '城市两厢车', price: 21800, asset: 'assets/deal-car-hatch.webp', description: '办完事去市场或回家，停车方便。' },
    { id: 'wagon', label: '轻旅旅行车', price: 56400, asset: 'assets/deal-car-wagon.webp', description: '周末能载上样品和行李出门。' },
    { id: 'camper', label: '升顶露营车', price: 92000, asset: 'assets/deal-car-camper.webp', description: '收起后座、支起车顶，周末可以沿岸慢慢走。' },
    { id: 'roadster', label: '周末敞篷车', price: 128000, asset: 'assets/deal-car-roadster.webp', description: '天气好时，开到海边再回来。' },
    { id: '4wd', label: '远征四驱越野车', price: 238000, asset: 'assets/deal-car-4wd.webp', description: '行李架和越野轮胎，适合山路与长途自驾。' },
    { id: 'gt', label: '电动 GT', price: 438000, asset: 'assets/deal-car-gt.webp', description: '安静的银色跑车，沿江大道的夜景正合适。' },
    { id: 'limo', label: '长轴礼宾轿车', price: 820000, asset: 'assets/deal-car-limo.webp', description: '宽敞的后排，适合重要商务接待和全家出行。' },
    { id: 'super', label: '熔金双门超跑', price: 1950000, asset: 'assets/deal-car-super.webp', description: '港口夕阳下的铜金色车身，是经营成熟后的赏心物。' },
  ],
  outings: [
    { id: 'flower-market', kind: 'quick', label: '约朋友逛花市', price: 240, energy: 14, asset: 'assets/deal-outing-result-flower-market-leaking-bucket.webp',
      description: '吃一顿晚饭，顺便把门口的花盆填满。' },
    { id: 'mending', kind: 'quick', label: '周末修补工坊', price: 480, energy: 21, asset: 'assets/deal-outing-result-bag-mending-stitched.webp',
      description: '放下报价表，做点能用手完成的事。' },
    { id: 'night-bus', kind: 'quick', label: '搭夜班车短途旅行', price: 1560, energy: 38, asset: 'assets/deal-outing-result-night-bus-rear-window.webp',
      description: '离开港口两天，回来再看下周的账。' },
    ...TRAVEL_OUTINGS,
    ...FRIEND_OUTINGS,
  ],
};

const PROPERTY_RESALE = 0.85;
const CAR_RESALE = 0.65;
const COLLATERAL_RATE = 0.55;
const find = (group, id) => LIFE_CATALOG[group].find(item => item.id === id);

export function initLife(state) {
  state.energy = 100;
  state.life = { properties: [], cars: [], memories: [], lastBreakWeek: 0, latestOuting: null };
}

const memoryList = state => Array.isArray(state.life?.memories) ? state.life.memories : [];
const remembers = (state, requirement, companionId) => memoryList(state).some(memory => (
  memory?.eventId === requirement.eventId && memory.choiceId === requirement.choiceId && memory.companionId === companionId
));

export function outingLockHint(state, activity) {
  if (!activity.requires || remembers(state, activity.requires, activity.companionId)) return '';
  const prerequisite = find('outings', activity.requires.eventId);
  const choice = prerequisite?.choices.find(item => item.id === activity.requires.choiceId);
  const person = OUTING_COMPANIONS.find(item => item.id === activity.companionId);
  return `先与${person?.name ?? '这位朋友'}完成「${prerequisite?.label ?? '上一段活动'}」中的「${choice?.label ?? '相关选择'}」。`;
}

function chooseOuting(state, trip, action, ops) {
  const locked = outingLockHint(state, trip);
  if (locked) return { error: locked };
  const detailed = trip.kind !== 'quick';
  const choice = detailed ? trip.choices.find(item => item.id === action.choiceId) : trip;
  if (!choice) return { error: '请选择这项活动中想体验的场景。' };
  if (trip.companionId && action.companionId && trip.companionId !== action.companionId) {
    return { error: '这项活动应与对应的朋友同行。' };
  }
  const companionId = detailed ? (trip.companionId ?? action.companionId ?? 'solo') : null;
  const companion = OUTING_COMPANIONS.find(item => item.id === companionId);
  if (detailed && !companion && (trip.kind === 'friend' || companionId !== 'solo')) {
    return { error: '请选择一位可同行的朋友。' };
  }
  if (state.cash < choice.price) return { error: '当前现金不足以支付这次活动。' };
  ops.profit(-ops.spend(choice.price));
  const restored = Math.min(choice.energy, 100 - state.energy);
  state.energy += restored;
  state.life.lastBreakWeek = state.week;
  const result = { id: trip.id, label: trip.label, asset: trip.asset, description: trip.description, price: choice.price, restored, week: state.week };
  if (detailed) {
    const echo = trip.echo && remembers(state, trip.echo.requires, companionId) ? trip.echo : null;
    result.choiceId = choice.id;
    result.choiceLabel = choice.label;
    result.companionName = companion?.name ?? '独自出发';
    result.text = choice.text;
    result.asset = echo?.asset ?? choice.asset ?? null;
    result.dialogue = echo?.companionLines[companionId] ?? choice.companionLines?.[companionId] ?? trip.companionLines?.[companionId] ?? '';
    if (choice.epilogue) {
      const { title, text, asset, alt, companionLines } = choice.epilogue;
      result.epilogue = { title, text, asset, alt, dialogue: companionLines?.[companionId] ?? '' };
    }
    if (trip.kind === 'friend') {
      if (!Array.isArray(state.life.memories)) state.life.memories = [];
      const requirement = { eventId: trip.id, choiceId: choice.id };
      if (!remembers(state, requirement, companionId)) state.life.memories.push({ ...requirement, companionId });
    }
  }
  state.life.latestOuting = result;
  ops.log('life', `${trip.label}，恢复 ${restored} 点精力。`);
  return {};
}

export function lifeAssets(state) {
  const { properties = [], cars = [] } = state.life ?? {};
  return properties.reduce((sum, item) => sum + (find('properties', item.id)?.price ?? 0), 0)
    + cars.reduce((sum, id) => sum + (find('cars', id)?.price ?? 0), 0);
}

export function collateral(state) {
  return (state.life?.properties ?? []).reduce((sum, item) => sum
    + (item.pledged ? Math.floor((find('properties', item.id)?.price ?? 0) * COLLATERAL_RATE) : 0), 0);
}

export function lifeWeek(state, { fast = false } = {}) {
  state.energy = Math.max(0, state.energy - (fast ? 4 : 1));
}

export function lifeAction(state, action, ops) {
  const id = action.id;
  const home = find('properties', id);
  const car = find('cars', id);
  const property = state.life.properties.find(item => item.id === id);
  switch (action.type) {
    case 'buy-property': {
      if (!home || property) return { error: '这处房产不可购买。' };
      if (state.cash < home.price) return { error: '当前现金不足以支付房款。' };
      ops.spend(home.price);
      state.life.properties.push({ id, pledged: false });
      ops.log('life', `买下${home.label}，记入资产。`);
      return {};
    }
    case 'mortgage': {
      if (!home || !property || property.pledged) return { error: '须持有尚未抵押的房产。' };
      property.pledged = true;
      ops.log('life', `抵押${home.label}，授信增加 ¥${Math.floor(home.price * COLLATERAL_RATE).toLocaleString('zh-CN')}。`);
      return {};
    }
    case 'unmortgage': {
      if (!home || !property?.pledged) return { error: '这处房产未抵押。' };
      if (state.loan > Math.max(0, state.creditLine - Math.floor(home.price * COLLATERAL_RATE))) {
        return { error: '请先归还这处房产所担保的贷款。' };
      }
      property.pledged = false;
      ops.log('life', `解除${home.label}的抵押。`);
      return {};
    }
    case 'sell-property': {
      if (!home || !property || property.pledged) return { error: '只能出售持有且未抵押的房产。' };
      const price = Math.floor(home.price * PROPERTY_RESALE);
      ops.profit(ops.receive(price) - home.price);
      state.life.properties = state.life.properties.filter(item => item.id !== id);
      ops.log('life', `出售${home.label}，实收 ¥${price.toLocaleString('zh-CN')}。`);
      return {};
    }
    case 'buy-car': {
      if (!car || state.life.cars.includes(id)) return { error: '这辆车不可购买。' };
      if (state.cash < car.price) return { error: '当前现金不足以支付车辆费用。' };
      ops.spend(car.price);
      state.life.cars.push(id);
      ops.log('life', `把${car.label}开回了家。`);
      return {};
    }
    case 'sell-car': {
      if (!car || !state.life.cars.includes(id)) return { error: '这辆车尚未持有。' };
      const price = Math.floor(car.price * CAR_RESALE);
      ops.profit(ops.receive(price) - car.price);
      state.life.cars = state.life.cars.filter(item => item !== id);
      ops.log('life', `卖出${car.label}，实收 ¥${price.toLocaleString('zh-CN')}。`);
      return {};
    }
    case 'outing': {
      const trip = find('outings', id);
      if (!trip) return { error: '请选择一项可安排的活动。' };
      if (state.life.lastBreakWeek === state.week) return { error: '本周已外出休息，请下周再安排。' };
      return chooseOuting(state, trip, action, ops);
    }
    default: return null;
  }
}
