// Original fictional project specifications. Costs are fixed game-contract terms in CNY.
export const EQUIPMENT_PROJECTS = [
  {
    id: 'cold-chain', name: '冷链仓配设备', buyer: '周岚', company: '澄湾冷链配送中心',
    brief: '冷库扩建了八个温区，每区一套制冷机组，控制柜和温度记录仪随主机到货。',
    dialogue: {
      draft: '八个温区都要验。请把到场测试的钱也算进报价，我核完总数就能签。',
      preparing: '预付款打过去了。装箱时，请把机组和控制柜的温区编号对上。',
      transit: '八套机组整批发出了。我这边按温区排好试机顺序，等设备到港。',
      receivable: '八个温区都试过了，温度曲线也核对过。验收单我签了，尾款按合同日期付。',
      paid: '尾款已经付清。这八套机组的温度记录，我和验收单一起收好了。'
    },
    supplier: '北衡制冷装配厂', quantity: 8, unit: '套', unitPrice: 150000,
    goodsCost: 900000, freight: 33000, acceptanceFee: 15000, depositPercent: 78,
    deliveryDays: 14, paymentLag: 7, prepDays: 3,
    lockedPremium: 6400, slipDays: 5, stationFee: 3600, rebookFee: 1800, daysSaved: 3,
    shipping: '八套机组整批送到配送中心，按温区编号开箱就位。',
    inspection: '逐区核对机组编号，联动试机并记录温度曲线，八套验毕后签整单验收单。'
  },
  {
    id: 'automated-warehouse', name: '自动化仓储设备', buyer: '程哲', company: '泊川自动仓',
    brief: '六个拣选区要换上穿梭车、输送段与控制柜，交付时按区核对设备编号。',
    dialogue: {
      draft: '六个区的设备归在一张订单里。通电联调、出入库复核过关，我再签验收单。',
      preparing: '预付款已付。穿梭车和控制柜都按拣选区编号，现场接线时好核对。',
      transit: '六套设备整批发出了。我等这班船到港，再安排六个区一起联调。',
      receivable: '六个区的出入库测试都通过了，整仓验收单已签。尾款到期我来安排。',
      paid: '尾款付清了。六个拣选区的联调记录也都在这份验收单里。'
    },
    supplier: '嘉序仓储系统厂', quantity: 6, unit: '套', unitPrice: 400000,
    goodsCost: 1709000, freight: 96000, acceptanceFee: 135000, depositPercent: 75,
    deliveryDays: 20, paymentLag: 10, prepDays: 5,
    lockedPremium: 23000, slipDays: 7, stationFee: 15000, rebookFee: 7600, daysSaved: 4,
    shipping: '六套拣选设备整批运到仓库，按拣选区清单就位。',
    inspection: '核对六区设备编号，逐区测试进出库和定位，整仓联调完成后签收。'
  },
  {
    id: 'filling-lines', name: '整套果汁灌装生产线', buyer: '四厂联合采购组', company: '澄港食品联采',
    brief: '买方要给多处新厂配齐生产线。各厂按清单接货，整单一起出运，到齐后统一验收。',
    dialogue: {
      draft: '请把三十二条线列在同一份出运单。四厂各自核对编号，我们收齐接货清单后整单验收。',
      preparing: '三十二条线的预付款已付。请照四厂的清单，标好每条线送哪一家。',
      transit: '三十二条线同批上船了。四家厂各自照清单接货，到齐后由我们一起验。',
      receivable: '四厂的接货单都齐了，三十二条线已整单验收。尾款到期由联采组付。',
      paid: '尾款已经付清。四厂的接货清单和整单验收单放在一起，往后好查。'
    },
    supplier: '衡远食品装备厂', quantity: 32, unit: '条', unitPrice: 335000,
    goodsCost: 8568000, freight: 320000, acceptanceFee: 160000, depositPercent: 80,
    deliveryDays: 28, paymentLag: 14, prepDays: 7,
    lockedPremium: 72000, slipDays: 9, stationFee: 47000, rebookFee: 25000, daysSaved: 6,
    shipping: '32 条灌装线整批出运，各厂按清单接货。联采组汇总四厂签收与试机记录，整单验收。',
    inspection: '逐线核对机身编号、灌装量和封口记录。32 条线全部合格后，联采组出具整单验收单。',
    consignees: [
      {name:'东浦食品一厂', quantity:10}, {name:'西湾食品二厂', quantity:8},
      {name:'南桥食品三厂', quantity:8}, {name:'北岸食品四厂', quantity:6}
    ]
  }
];
for (const project of EQUIPMENT_PROJECTS) {
  if (project.consignees) {
    project.consignees.forEach(Object.freeze);
    Object.freeze(project.consignees);
  }
  Object.freeze(project.dialogue);
  Object.freeze(project);
}
Object.freeze(EQUIPMENT_PROJECTS);

export function equipmentOpportunity(state) {
  const settled = (state.marketHistory || []).filter(order =>
    order.status === 'paid' && order.received === order.revenue &&
    order.delivered === order.quantity && order.paidDay <= state.day);
  if (!settled.some(order => order.kind === 'neighborhood' && order.stores === 12)) return null;
  return EQUIPMENT_PROJECTS.find(project => !settled.some(order =>
    order.kind === 'equipment' && order.productId === project.id)) || null;
}

export function previewEquipment(state, projectId, shipping, dailyCost) {
  const project = equipmentOpportunity(state);
  if (!project || project.id !== projectId || !['standard','locked'].includes(shipping) ||
      state.phase !== 'market' || state.market?.status !== 'draft') return null;
  const {quantity, unit, unitPrice, goodsCost, acceptanceFee} = project;
  const revenue = quantity * unitPrice;
  const deposit = Math.floor(revenue * project.depositPercent / 100);
  const flexible = shipping === 'standard';
  const freight = project.freight + (flexible ? 0 : project.lockedPremium);
  const cost = goodsCost + freight + acceptanceFee;
  const shipDay = state.day + project.prepDays;
  const deliveryDay = state.day + project.deliveryDays;
  const paymentDay = deliveryDay + project.paymentLag;
  const operatingCost = (paymentDay - state.day) * dailyCost;
  const netProfit = revenue - cost - operatingCost;
  const stationFee = flexible ? project.stationFee : 0;
  const slipDays = flexible ? project.slipDays : 0;
  const riskNetProfit = netProfit - stationFee - slipDays * dailyCost;
  const cashRequired = Math.max(0, cost - deposit + operatingCost + stationFee + slipDays * dailyCost);
  const cashAfterSigning = state.cash - cost + deposit;
  const cashAfterPayment = state.cash + netProfit;
  if (![state.day, state.cash, shipDay, deliveryDay, paymentDay + slipDays, cashRequired, cashAfterSigning,
        cashAfterPayment, state.cash + riskNetProfit].every(Number.isSafeInteger) ||
      state.day < 0 || state.cash < 0) return null;
  return {
    kind: 'equipment', mode: 'project', source: 'factory', category: '设备项目',
    productId: project.id, productName: project.name, buyer: project.buyer, shipping,
    sourceName: project.supplier, inspection: project.inspection, quantity, unit, unitPrice,
    revenue, goodsCost, freight, acceptanceFee, cost, operatingCost, deposit,
    balanceDue: revenue - deposit, netProfit, riskNetProfit, stationFee, slipDays,
    rebookFee: flexible ? project.rebookFee : 0, daysSaved: flexible ? project.daysSaved : 0,
    cashRequired, cashAfterSigning, cashAfterPayment, signedDay: state.day, shipDay,
    plannedDeliveryDay: deliveryDay, deliveryDay, paymentDay, valid: state.cash >= cashRequired
  };
}

// A fixed connecting-vessel calendar makes the actual sailing repeatable on save replay.
// Locked space always sails to plan. Ordinary bookings learn of transfers on departure.
export function advanceEquipmentShipping(state, dailyCost, calendar = false) {
  const a = state.market?.active;
  if (state.phase !== 'market' || state.market.status !== 'preparing' ||
      a?.kind !== 'equipment' || a.status !== 'preparing' || (calendar ? state.day !== a.shipDay : state.day !== a.signedDay)) return state;
  const transfer = a.shipping === 'standard' && a.shipDay % 3 === 0;
  const delay = transfer ? a.slipDays : 0;
  const stationPaid = transfer ? a.stationFee : 0;
  const expense = (a.shipDay - a.signedDay) * dailyCost;
  if (state.cash < (calendar ? 0 : expense) + stationPaid) return state;
  const next = structuredClone(state), order = next.market.active;
  next.day = a.shipDay;
  next.cash -= (calendar ? 0 : expense) + stationPaid;
  order.operatingPaid += expense;
  order.transfer = transfer;
  order.stationPaid = stationPaid;
  order.rebookPaid = 0;
  order.deliveryDay += delay;
  order.paymentDay += delay;
  order.cost += stationPaid;
  order.operatingCost += delay * dailyCost;
  order.netProfit = order.revenue - order.cost - order.operatingCost;
  order.cashAfterPayment -= stationPaid + delay * dailyCost;
  order.status = next.market.status = 'transit';
  next.feedback = {kind:'equipment-shipped', message:transfer
    ? '货物已整批出运。船公司通知接驳船改期，场站费已扣；可以等原班次，也可以改订较早的接驳船。'
    : '货物已整批出运，船公司确认按约定船期到港。'};
  return next;
}

export function canRebookEquipment(state, dailyCost) {
  const a = state.market?.active;
  if (state.phase !== 'market' || state.market.status !== 'transit' ||
      a?.kind !== 'equipment' || !a.transfer || a.rebookPaid || state.day !== a.shipDay) return false;
  const daysToPayment = a.paymentDay - a.daysSaved - state.day;
  return state.cash >= a.rebookFee + daysToPayment * dailyCost;
}

export function rebookEquipment(state, dailyCost) {
  if (!canRebookEquipment(state, dailyCost)) return state;
  const next = structuredClone(state), a = next.market.active;
  next.cash -= a.rebookFee;
  a.rebookPaid = a.rebookFee;
  a.cost += a.rebookFee;
  a.deliveryDay -= a.daysSaved;
  a.paymentDay -= a.daysSaved;
  a.operatingCost -= a.daysSaved * dailyCost;
  a.netProfit = a.revenue - a.cost - a.operatingCost;
  a.cashAfterPayment += a.daysSaved * dailyCost - a.rebookFee;
  next.feedback = {kind:'equipment-rebooked', message:'接驳船已改订，场站费照收；到港和尾款日期已更新。'};
  return next;
}
