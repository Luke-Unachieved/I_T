import { CATEGORIES, TUTORIAL_BUYERS } from './core.js';

// Market routes add weeks to the domestic leg. All non-European markets settle in USD.
const market = (id, name, currency, shippingWeeks, tariffRate, categories, grades, fee, cert, buyers, map) =>
  Object.freeze({ id, name, currency, shippingWeeks, tariffRate, categories, grades, fee, cert, buyers, map });

export const MARKETS = Object.freeze([
  market('domestic', '国内', 'CNY', 0, 0, CATEGORIES, ['AAA', 'AA', 'A', 'BBB', 'BB', 'B'], 0, null, [], [73, 35]),
  market('se-asia', '东南亚', 'USD', 1, 0.035, ['咖啡与餐厨', '餐桌器具', '差旅用品'], ['AA', 'A', 'A', 'BBB', 'BB'], 8000, 'export', ['海峡集市', '河港生活', '棕榈百货', '椰岸供应', '红土商行', '南湾连锁'], [76, 53]),
  market('east-asia', '日韩', 'USD', 1, 0.05, ['桌面办公', '家居陈列', '宠物日用'], ['AAA', 'AA', 'AA', 'A', 'BBB'], 12000, 'audit', ['松原选物', '汐见家品', '白沙连锁', '春庭商行', '河畔物产', '高台供应'], [86, 34]),
  market('middle-east', '中东', 'USD', 2, 0.06, ['家居布艺', '差旅用品', '门店五金'], ['AA', 'A', 'BBB', 'BB', 'B'], 14500, 'audit', ['金泉百货', '绿洲工坊', '椰棕贸易', '暖砂酒店', '香料集市', '穹顶日用'], [60, 45]),
  market('europe', '欧洲', 'EUR', 3, 0.07, ['家居布艺', '咖啡与餐厨', '家居陈列'], ['AAA', 'AA', 'AA', 'A', 'BBB'], 22000, 'audit', ['旧桥家品', '晨露选物', '灰港商行', '海棠连锁', '松针百货', '灯塔厨房'], [49, 25]),
  market('north-america', '北美', 'USD', 3, 0.10, ['门店五金', '宠物日用', '桌面办公'], ['AAA', 'AA', 'A', 'A', 'BBB'], 38000, 'supplier', ['长湾采购', '红鹰连锁', '雪松家选', '湖岸配销', '云谷生活', '石鲸商社'], [16, 28]),
  market('latin-america', '拉美', 'USD', 4, 0.08, ['餐桌器具', '家居陈列', '差旅用品'], ['AA', 'A', 'BBB', 'BB', 'B'], 26000, 'supplier', ['安第斯市集', '黄杉商行', '洋流旅宿', '金瓜百货', '蓝墙生活', '棕榈门店'], [31, 73]),
  market('africa', '非洲', 'USD', 3, 0.07, ['门店五金', '咖啡与餐厨', '家居布艺'], ['AA', 'A', 'BBB', 'BB', 'B'], 24000, 'audit', ['红湾供销', '斜坡市集', '日晷商贸', '金沙酒店', '海杉零售', '虹谷商行'], [52, 62]),
]);

export const MARKET_BY_ID = Object.freeze(Object.fromEntries(MARKETS.map(item => [item.id, item])));

export const CERTIFICATIONS = Object.freeze([
  { id: 'export', name: '进出口经营权', fee: 12000, requires: null, deliveries: 10, rep: 65,
    description: '本地供应记录达标后，可以报海外单。', unlocks: ['东南亚'] },
  { id: 'audit', name: '验厂认证', fee: 25000, requires: 'export', revenue: 160000, staffRole: 'operations',
    description: '经过工厂审核后，可以接更多连锁订单。', unlocks: ['日韩', '中东', '欧洲', '非洲', '连锁采购'] },
  { id: 'supplier', name: '大连锁供应商名录', fee: 45000, requires: 'audit', netAssets: 180000, cleanWeeks: 26,
    description: '有稳定履约记录与资金实力后，可参与年度框架采购。', unlocks: ['北美', '拉美', '年度采购框架'] },
]);

export const CERTIFICATION_BY_ID = Object.freeze(Object.fromEntries(CERTIFICATIONS.map(item => [item.id, item])));

export const DEFAULT_MACRO = Object.freeze({ usd: 7.15, eur: 7.85, freight: 100, materials: 100, consumer: 100 });

export function currencyRate(state, currency) {
  if (currency === 'USD') return state.macro?.usd ?? DEFAULT_MACRO.usd;
  if (currency === 'EUR') return state.macro?.eur ?? DEFAULT_MACRO.eur;
  return 1;
}

export const STAFF_ROLES = Object.freeze({
  sales: { label: '业务员', salary: 460, commission: 0.012, effect: '增加询盘，提高中单率' },
  operations: { label: '跟单员', salary: 520, commission: 0.006, effect: '降低延期和质检问题' },
  finance: { label: '财务', salary: 560, commission: 0.004, effect: '加快催款，降低融资成本' },
});

export const FINANCING = Object.freeze({
  standard: { label: '普通账期', text: '按买家信用判断回款风险。' },
  'letter-of-credit': { label: '信用证', threshold: 10000, text: '银行信用保障回款，买家办理有成本，中单率略降。' },
  insured: { label: '出口信用保险', premiumRate: 0.022, recovery: 0.82, text: '先付保费，遇到坏账可追回大部分货款。' },
});

export const EXPORT_REBATE_RATE = 0.04;

export function tradePolicy(state, marketId) {
  return (state.policies ?? []).filter(item => item.untilWeek >= state.week && (!item.market || item.market === marketId))
    .reduce((changes, item) => ({
      tariffDelta: changes.tariffDelta + (item.tariffDelta ?? 0),
      delayWeeks: changes.delayWeeks + (item.delayWeeks ?? 0),
      rebateDelta: changes.rebateDelta + (item.rebateDelta ?? 0),
      materialDelta: changes.materialDelta + (item.materialDelta ?? 0),
      freightDelta: changes.freightDelta + (item.freightDelta ?? 0),
      interestDelta: changes.interestDelta + (item.interestDelta ?? 0),
    }), { tariffDelta: 0, delayWeeks: 0, rebateDelta: 0, materialDelta: 0, freightDelta: 0, interestDelta: 0 });
}

// Match V37 illustrated events to the customer's new business relationship milestones.
const eventArt = {
  mira: { first: 'mira-trial-paid', repeat: 'mira-repeat-inquiry', payment: 'mira-repeat-paid', inspection: 'mira-rollout-inspection', concession: '001-concession-v2' },
  samir: { first: 'samir-ready-paid', repeat: 'samir-repeat-inquiry', payment: 'samir-branded-paid', inspection: 'samir-branded-opening-inspection', concession: '006-concession' },
  ines: { first: 'ines-small-paid', repeat: 'ines-repeat-inquiry', payment: 'ines-repeat-paid', inspection: 'ines-opening-inspection', concession: '010-concession-v2' },
};
const comicsByEvent = { first: 'quote', repeat: 'quote', payment: 'quote', inspection: 'quote', concession: 'concession' };

export function clientComic(buyer, event = 'repeat') {
  const buyerId = typeof buyer === 'string' ? buyer : buyer?.id;
  if (!buyerId) return null;
  const specific = eventArt[buyerId]?.[event];
  if (specific) return `assets/deal-client-comic-${specific}.webp`;
  const fromTutorial = TUTORIAL_BUYERS.find(item => item.id === buyerId)?.comic;
  if (fromTutorial) return fromTutorial;
  const index = typeof buyer === 'object' ? buyer.comicIndex : 0;
  if (!Number.isInteger(index) || index < 1 || index > 100) return null;
  return `assets/deal-client-comic-${String(index).padStart(3, '0')}-${comicsByEvent[event] ?? 'quote'}.webp`;
}
