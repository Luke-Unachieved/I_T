export const LIFE_CATALOG = {
  properties: [
    { id: 'city-flat', label: '城南小公寓', price: 62000, asset: 'assets/deal-property-card-home-flat.webp',
      description: '一居室，窗台能晒到下午的阳光。可抵押给银行。' },
    { id: 'harbor-home', label: '海港边的家', price: 156000, asset: 'assets/deal-property-card-home-harbor.webp',
      description: '靠近出货口，傍晚能看到最后一班货轮。可抵押给银行。' },
    { id: 'hill-villa', label: '山坡小别墅', price: 382000, asset: 'assets/deal-property-card-home-villa.webp',
      description: '有院子和工作间。可抵押给银行。' },
  ],
  cars: [
    { id: 'hatch', label: '城市两厢车', price: 21800, asset: 'assets/deal-car-hatch.webp', description: '办完事去市场或回家，停车方便。' },
    { id: 'wagon', label: '轻旅旅行车', price: 56400, asset: 'assets/deal-car-wagon.webp', description: '周末能载上样品和行李出门。' },
    { id: 'roadster', label: '周末敞篷车', price: 128000, asset: 'assets/deal-car-roadster.webp', description: '天气好时，开到海边再回来。' },
  ],
  outings: [
    { id: 'flower-market', label: '约朋友逛花市', price: 240, energy: 14, asset: 'assets/deal-outing-result-flower-market-leaking-bucket.webp',
      description: '吃一顿晚饭，顺便把门口的花盆填满。' },
    { id: 'mending', label: '周末修补工坊', price: 480, energy: 21, asset: 'assets/deal-outing-result-bag-mending-stitched.webp',
      description: '放下报价表，做点能用手完成的事。' },
    { id: 'night-bus', label: '搭夜班车短途旅行', price: 1560, energy: 38, asset: 'assets/deal-outing-result-night-bus-rear-window.webp',
      description: '离开港口两天，回来再看下周的账。' },
  ],
};

const PROPERTY_RESALE = 0.85;
const CAR_RESALE = 0.65;
const COLLATERAL_RATE = 0.55;
const find = (group, id) => LIFE_CATALOG[group].find(item => item.id === id);

export function initLife(state) {
  state.energy = 100;
  state.life = { properties: [], cars: [], lastBreakWeek: 0, latestOuting: null };
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
      if (!trip || state.life.lastBreakWeek === state.week) return { error: '本周已外出休息，请下周再安排。' };
      if (state.cash < trip.price) return { error: '当前现金不足以支付这次活动。' };
      ops.profit(-ops.spend(trip.price));
      const restored = Math.min(trip.energy, 100 - state.energy);
      state.energy += restored;
      state.life.lastBreakWeek = state.week;
      state.life.latestOuting = { id, label: trip.label, asset: trip.asset, description: trip.description, restored, week: state.week };
      ops.log('life', `${trip.label}，恢复 ${restored} 点精力。`);
      return {};
    }
    default: return null;
  }
}
