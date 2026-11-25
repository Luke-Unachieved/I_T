// Weekly trade catalog adapted from the V37 market quotations. Values are game currency.
// Each source lists minimum order, unit price, stage days, units per carton, base freight,
// and additional freight per carton. The transport and purchase rules live in the engine.
const rows = [
  ["tray","可叠放餐盘托盘","餐桌器具","只","陶木现货联仓","餐具排产合作社",36,24,3,9,45,4,120,19,8,20,89,2,"自助餐台换盘需要单手抽出一只，潮湿台面也要拿得稳。"],
  ["carafe","耐热玻璃冷水壶","餐桌器具","把","陶木现货联仓","餐具排产合作社",24,36,4,6,75,10,72,29,9,12,125,5,"早餐台补冷水后直接上桌，壶嘴不能顺壁淌水。"],
  ["salad-bowl","沙拉碗","餐桌器具","只","陶木现货联仓","餐具排产合作社",48,19,3,12,55,6,144,15,7,24,101,3,"自助餐岛按份补菜，需要一摞碗不晃、不留积水。"],
  ["serving-tongs","不锈钢餐夹","餐桌器具","把","陶木现货联仓","餐具排产合作社",60,13,2,15,35,2,180,10,6,30,77,1,"熟食柜一只手夹取切片，员工闭店后统一挂起。"],
  ["pepper-mill","手摇胡椒研磨器","餐桌器具","只","陶木现货联仓","餐具排产合作社",30,30,3,8,45,4,90,24,8,15,89,2,"开放式餐桌让客人自行调节胡椒粗细。"],
  ["dripper","陶瓷手冲滤杯","咖啡与餐厨","只","餐厨配件联仓","餐厨器具合作厂",24,23,4,6,65,8,96,18,9,16,113,4,"手冲教学台用同一只滤杯演示两次稳定冲煮。"],
  ["pitcher","不锈钢拉花缸","咖啡与餐厨","只","餐厨配件联仓","餐厨器具合作厂",36,20,3,9,45,4,108,16,8,18,89,2,"新店训练奶泡拉花，尖嘴决定能否细流收尾。"],
  ["knock-box","咖啡粉渣盒","咖啡与餐厨","只","餐厨配件联仓","餐厨器具合作厂",18,39,4,5,65,8,60,31,10,10,113,4,"小吧台要接住整块粉饼，敲击时底座不能滑走。"],
  ["scale","电子厨房秤","咖啡与餐厨","台","餐厨配件联仓","餐厨器具合作厂",30,35,3,8,45,4,90,28,8,15,89,2,"烘焙间分装原料，称轻料与去皮都需稳定。"],
  ["chopping-board","双面砧板","咖啡与餐厨","块","餐厨配件联仓","餐厨器具合作厂",24,28,4,6,65,8,84,22,9,14,113,4,"后厨分区切配，板边能立起晾干。"],
  ["napkin","可机洗棉餐巾","家居布艺","条","布品成品仓","织造与缝制工坊",96,8,2,24,35,2,360,6,6,60,77,1,"旅馆早餐厅每天换洗，折好后要能竖在餐盘上。"],
  ["apron","厨房围裙","家居布艺","条","布品成品仓","织造与缝制工坊",36,24,3,9,35,2,120,19,8,20,77,1,"开放厨房员工需一人快速系好，前袋放得下点单本。"],
  ["oven-mitt","隔热烤箱手套","家居布艺","只","布品成品仓","织造与缝制工坊",48,15,3,12,45,4,144,12,8,24,89,2,"烘焙台转移热烤盘，手腕需受到足长覆盖。"],
  ["bath-mat","浴室地垫","家居布艺","块","布品成品仓","织造与缝制工坊",24,29,4,6,55,6,90,23,9,15,101,3,"旅宿淋浴出口换垫，地面潮湿时也要平整铺开。"],
  ["pillowcase","枕套","家居布艺","只","布品成品仓","织造与缝制工坊",48,17,3,12,45,4,168,13,7,28,89,2,"换房班组快速更换内芯，开口要包住枕头端面。"],
  ["bookend","书立","桌面办公","对","办公器具联仓","桌面用品制造社",30,23,3,8,55,6,96,18,8,16,101,3,"共享办公室书架分隔资料，两侧不可压伤桌面。"],
  ["laptop-stand","折叠笔记本支架","桌面办公","个","办公器具联仓","桌面用品制造社",18,46,4,5,55,6,60,37,10,10,101,3,"培训室快速收台，支架折起可纳入资料柜。"],
  ["display-board","桌面展示板","桌面办公","块","办公器具联仓","桌面用品制造社",48,14,2,12,45,4,156,11,7,26,89,2,"会展客户需反复更换桌签，陈列面不得遮住标题。"],
  ["file-box","文件收纳盒","桌面办公","只","办公器具联仓","桌面用品制造社",36,18,3,9,65,8,120,14,8,20,113,4,"联合办公按项目归档，标准文件夹可整夹放入。"],
  ["stapler","桌面订书机","桌面办公","台","办公器具联仓","桌面用品制造社",48,15,3,12,45,4,144,12,7,24,89,2,"前台整理多页签收单，单手操作后要自动回位。"],
  ["luggage-tag","行李挂牌","差旅用品","枚","差旅配件仓","差旅用品制造社",120,7,2,30,35,2,400,5,6,67,77,1,"旅行团用挂牌认领行李，公开面不能直接露出电话。"],
  ["passport-cover","护照夹","差旅用品","只","差旅配件仓","差旅用品制造社",60,14,3,15,35,2,180,11,7,30,77,1,"商务旅行套装需要护照夹同时收纳一张登机牌。"],
  ["neck-pillow","旅行颈枕","差旅用品","个","差旅配件仓","差旅用品制造社",30,27,4,8,65,8,96,21,9,16,113,4,"长途车站商店需要可压缩、上架能回弹的颈枕。"],
  ["umbrella","折叠雨伞","差旅用品","把","差旅配件仓","差旅用品制造社",36,33,3,9,55,6,120,26,8,20,101,3,"雨季访客到达时可随手带走，收进小包也不滴一路。"],
  ["packing-cube","行李分装袋","差旅用品","只","差旅配件仓","差旅用品制造社",72,13,2,18,35,2,216,10,7,36,77,1,"商旅门店做旅行收纳演示，需要可看见袋内衣物。"],
  ["vase","窄口花瓶","家居陈列","只","家居器物现货仓","生活器物工坊",24,29,4,6,75,10,72,23,10,12,125,5,"生活馆窗台做单枝展示，装水后不头重脚轻。"],
  ["planter","带接水碟花盆","家居陈列","只","家居器物现货仓","生活器物工坊",36,20,3,9,65,8,108,16,9,18,113,4,"陈列架摆真植物，浇水不能滴到下一层货。"],
  ["coat-hook","壁挂衣帽钩","家居陈列","个","家居器物现货仓","生活器物工坊",60,12,2,15,35,2,200,9,6,34,77,1,"玄关展示墙留挂包位，固定后不应划伤带子。"],
  ["clock","壁钟","家居陈列","只","家居器物现货仓","生活器物工坊",24,36,4,6,55,6,84,29,9,14,101,3,"样板房留安静阅读角，远处要能看清指针。"],
  ["basket","编织收纳篮","家居陈列","只","家居器物现货仓","生活器物工坊",30,25,4,8,65,8,96,20,9,16,113,4,"生活馆把毛毯装进篮内，顾客要能提起整篮。"],
  ["ratchet-set","棘轮套筒工具组","门店五金","套","桥东五金联仓","砺川工具厂",24,82,3,12,96,6,96,68,8,24,110,6,"维修柜按套出借，扳手、套筒和延长杆要能在盒内一眼点齐。"],
  ["lever-lock","室内执手门锁","门店五金","套","桥东五金联仓","桐里门锁厂",24,46,3,12,68,5,96,37,7,24,92,4,"样板门左右开向都有，执手换向后要能顺畅回位。"],
  ["pet-harness","宠物胸背牵引套装","宠物日用","套","栖禾用品联仓","竹影织带厂",36,29,3,12,52,4,120,23,7,24,76,3,"宠物店按尺码陈列，胸背和同色牵引绳要配在一个挂签下。"],
  ["lint-refill","粘毛器替换卷","宠物日用","卷","栖禾用品联仓","百川胶纸厂",72,5,2,24,36,3,240,4,6,48,58,2,"收银台旁卖替换芯，客人带旧手柄来也能配到合适的轴孔。"],
];

const source = (name, minQuantity, unitCost, days, packSize, freightBase, freightPerBox) =>
  Object.freeze({ name, minQuantity, unitCost, days, packSize, freightBase, freightPerBox });

function product(id, name, category, unit, asset, brief, stock, factory) {
  return Object.freeze({ id, name, category, unit, asset, brief, sources: Object.freeze({ stock, factory }) });
}

const regularProducts = rows.map(([id, name, category, unit, stockName, factoryName, ...values]) =>
  product(id, name, category, unit, id === 'carafe' ? 'assets/deal-market-thumb-carafe.webp' : `assets/v38-product-thumb-${id}.webp`, values.at(-1),
    source(stockName, ...values.slice(0, 6)), source(factoryName, ...values.slice(6, 12))));

const openingProducts = [
  product('lamp-trial', '三档调光台灯', '家居陈列', '盏', 'assets/deal-work-product-lamp-trial.webp', '先订一批柜台样品，确认调光手感和包装。',
    source('桥南灯具联仓', 12, 54, 3, 6, 120, 8), source('金禾照明厂', 144, 43, 10, 12, 180, 5)),
  product('thermos-branded', '便携保温杯', '咖啡与餐厨', '只', 'assets/deal-work-product-thermos-branded.webp', '杯盖好拧紧，外盒留一面放店标。',
    source('滨江日用联仓', 32, 36, 4, 8, 100, 6), source('玉丰不锈钢厂', 256, 27, 10, 16, 180, 4)),
  product('linen-small', '棉麻桌布', '家居布艺', '条', 'assets/deal-work-product-linen-small.webp', '先核对样布颜色，整批的纹路和尺寸要一致。',
    source('栖纺现货仓', 24, 41, 4, 8, 135, 7), source('庭织布艺厂', 144, 31, 10, 12, 200, 5)),
];

export const PRODUCTS = Object.freeze([...regularProducts, ...openingProducts]);
export const PRODUCT_BY_ID = Object.freeze(Object.fromEntries(PRODUCTS.map(item => [item.id, item])));
export const CATEGORIES = Object.freeze([...new Set(PRODUCTS.map(item => item.category))]);

const adviserDetails = [
  ['fang', '方文斌', '擅长核对商谈条件'],
  ['liang', '梁佳音', '擅长安排采购和交付'],
  ['tao', '陶乐', '擅长理解客户和商品'],
  ['xu', '许明珊', '擅长梳理账期和周转'],
];

export const ASSISTANTS = Object.freeze(adviserDetails.map(([id, name, description], index) => Object.freeze({
  id, name, description,
  portrait: 'assets/deal-advisers-recovered.webp',
  portraitPosition: `${100 * index / (adviserDetails.length - 1)}% 0%`,
  office: `assets/deal-office-original-${id}.webp`,
})));

export const BUYER_TYPES = Object.freeze([
  { id: 'retail', label: '零售店', names: ['青埠日用', '南照杂货', '杏湾商行', '明矶家品', '橡塔选物', '新乔商店'], grades: ['A', 'BBB', 'BBB', 'BB', 'B'], lots: [1, 3], termLimit: 5, line: '请报一批门店补货，价格合适这周就能定。' },
  { id: 'chain', label: '连锁', names: ['衢枝连锁', '清蒲百货', '万笙连锁', '锦桥生活', '润澜百货', '白石家集'], grades: ['AAA', 'AA', 'A', 'A', 'BBB'], lots: [3, 7], termLimit: 12, line: '要给几家店统一补货，麻烦把批量价和账期写清楚。' },
  { id: 'food', label: '餐饮', names: ['石栈餐饮', '银秧食集', '桑梧茶舍', '白鹭餐社', '满窗咖啡', '栖蒲厨房'], grades: ['AA', 'A', 'BBB', 'BB', 'B'], lots: [1, 4], termLimit: 6, line: '营业时间不好挪，能按我们定的时间送到吗？' },
  { id: 'hotel', label: '酒店', names: ['溪堂旅馆', '照亭酒店', '紫帆宾馆', '回廊客舍', '蓝杉酒店', '方泉旅舍'], grades: ['AAA', 'AA', 'AA', 'A', 'BBB'], lots: [2, 6], termLimit: 10, line: '新一批客房等着开，请同时确认送货和批次。' },
  { id: 'online', label: '电商', names: ['岑木网店', '鲸湾在线', '北洲电商', '鹿远直购', '听雨网店', '日晒市集'], grades: ['AA', 'A', 'BBB', 'BB', 'B'], lots: [2, 5], termLimit: 7, line: '这一批要赶上专题页更新，尽量别错过档期。' },
]);

export const BUYER_CREDITS = Object.freeze(['AAA', 'AA', 'A', 'BBB', 'BB', 'B']);

export const TUTORIAL_BUYERS = Object.freeze([
  { id: 'mira', name: '米拉', type: '零售店', credit: 'AA', productId: 'lamp-trial', quantity: 96, targetPrice: 88, depositRate: 15, terms: 1, deadline: 3,
    portrait: 'assets/deal-inquiry-mira.webp', comic: 'assets/deal-client-comic-mira-trial-paid.webp', line: '我想先试一批调光台灯。样品满意的话，再聊下一批。' },
  { id: 'samir', name: '萨米尔', type: '电商', credit: 'A', productId: 'thermos-branded', quantity: 256, targetPrice: 56, depositRate: 25, terms: 2, deadline: 4,
    portrait: 'assets/deal-inquiry-samir.webp', comic: 'assets/deal-client-comic-samir-ready-inspection.webp', line: '要赶商店开售，先告诉我能交几箱、什么时候到。' },
  { id: 'ines', name: '伊内斯', type: '酒店', credit: 'AA', productId: 'linen-small', quantity: 192, targetPrice: 62, depositRate: 20, terms: 3, deadline: 5,
    portrait: 'assets/deal-inquiry-ines.webp', comic: 'assets/deal-client-comic-ines-opening-inspection.webp', line: '换季布置想用这款桌布，麻烦把花色和交货时间写在报价里。' },
]);

export const RIVAL_COMPANIES = Object.freeze([
  { id: 'tide', name: '朝潮商贸', style: '激进' },
  { id: 'star', name: '鹿星供应', style: '稳健' },
  { id: 'grove', name: '梧桥进出口', style: '稳健' },
  { id: 'sprint', name: '青驿通贸', style: '激进' },
  { id: 'canvas', name: '白帆商贸', style: '稳健' },
  { id: 'quay', name: '北岸供销', style: '激进' },
  { id: 'stone', name: '恒石贸易', style: '稳健' },
  { id: 'kite', name: '纸鸢商行', style: '稳健' },
  { id: 'peak', name: '凌峰供应', style: '激进' },
  { id: 'willow', name: '柳津实业', style: '稳健' },
]);
