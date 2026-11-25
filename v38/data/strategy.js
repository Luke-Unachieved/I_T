// Each scenario is a fictionalized commercial backdrop with a known weekly schedule.
export const ERAS = [
  { id: '2001', label: '入世红利', year: 2001, art: 'assets/v38-era-2001.webp', description: '买家积极，毛利较高，首次资质费用较低。',
    initial: { usd: 8.27, eur: 7.47, consumer: 122, freight: 88, materials: 86 },
    certFeeMultiplier: 0.8,
    schedule: [
      { week: 8, title: '第一波海外采购', text: '经销商多了询盘，样品采购回暖。', changes: { consumer: 17 } },
      { week: 28, title: '港口扩容', text: '新泊位投入使用，海运价格回落。', changes: { freight: -17 } },
    ] },
  { id: '2008', label: '金融危机', year: 2008, art: 'assets/v38-era-2008.webp', description: '海外信用收紧，坏账风险上升，随后国内需求恢复。',
    initial: { usd: 6.84, eur: 9.60, consumer: 73, freight: 87, materials: 95 },
    riskMultiplier: 1.5, overseasDemand: 0.65,
    schedule: [
      { week: 6, title: '海外采购推迟', text: '买家压缩订单，资金周转比规模更重要。', changes: { consumer: -15, freight: -9 } },
      { week: 30, title: '国内采购回暖', text: '零售商补充库存，国内询盘增加。', changes: { consumer: 27 } },
    ] },
  { id: '2018', label: '贸易摩擦', year: 2018, art: 'assets/v38-era-2018.webp', description: '北美关税逐步抬升，更多订单转向东南亚与中东。',
    initial: { usd: 6.62, eur: 7.78, consumer: 105, freight: 102, materials: 101 },
    schedule: [
      { week: 4, title: '第一轮北美关税', text: '北美路线新增关税附加费。', changes: { usd: 0.16 },
        policy: { market: 'north-america', tariffDelta: 0.07, weeks: 40 } },
      { week: 20, title: '关税再调整', text: '北美成本继续升高，东南亚与中东采购热度上升。', changes: { consumer: 7 },
        policy: { market: 'north-america', tariffDelta: 0.08, weeks: 50 },
        marketBoost: ['se-asia', 'middle-east'] },
    ] },
  { id: '2021', label: '运价暴涨', year: 2021, art: 'assets/v38-era-2021.webp', description: '海运报价高、交期长，提前布置仓储更有价值。',
    initial: { usd: 6.47, eur: 7.64, freight: 235, materials: 120, consumer: 116 },
    schedule: [
      { week: 8, title: '全球舱位吃紧', text: '争抢运力让船价再次上升。', changes: { freight: 130 },
        policy: { overseasOnly: true, delayWeeks: 1, weeks: 14 } },
      { week: 24, title: '航次逐步恢复', text: '大批替代航线恢复，运输成本回落。', changes: { freight: -105 } },
      { week: 45, title: '港口周转恢复', text: '此前积压的船货陆续离港。', changes: { freight: -80, materials: -10 } },
    ] },
  { id: '2026', label: '当下', year: 2026, art: 'assets/v38-era-2026.webp', description: '标准开局，按周积累履约记录和现金。',
    initial: {},
    schedule: [
      { week: 16, title: '春季采购展', text: '零售渠道集中看样，询盘更活跃。', changes: { consumer: 12 } },
      { week: 36, title: '秋季船期调整', text: '远洋航线投入新运力，运价回落。', changes: { freight: -10 } },
    ] },
];

export const ORIGINS = [
  { id: 'self-made', label: '白手起家', description: '¥50,000 初始现金，信誉 60。', cash: 50000, rep: 60 },
  { id: 'factory-heir', label: '工厂二代', description: '¥32,000 初始现金，已有一间餐具小工厂。', cash: 32000, rep: 60 },
  { id: 'buyer', label: '外企采购出身', description: '信誉 72，开局已有重点客户米拉。', cash: 47000, rep: 72 },
];

export const DIFFICULTIES = [
  { id: 'casual', label: '简单', description: '启动资金更多，回款风险更低。助理全程手把手带你经营，提前比较接下来几周的方案，并根据你的选择调整建议。', cashDelta: 28000, riskMultiplier: 0.75, rivalMultiplier: 0.95 },
  { id: 'normal', label: '标准', description: '常规启动资金、回款风险与市场竞争。助理提供基础入门提示，经营决策由你自己掌握。', cashDelta: 0, riskMultiplier: 1, rivalMultiplier: 1 },
  { id: 'hard', label: '困难', description: '启动资金更少，坏账风险更高，同行压价更激烈。助理只提供基础入门提示，经营需要你亲自判断。', cashDelta: -12000, riskMultiplier: 1.33, rivalMultiplier: 1.12 },
];
