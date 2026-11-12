import {TACTICS} from './content.js';
const EMPLOYEE_REPLIES={
 hinge:{quality:'把合页开合的样品记录和质保范围写清，我就能比较这次的批次。按这个方案谈。',price:'先少量试卖合页，不把库存一下压满，这个起步规模合适。',speed:'先到的合页能配合第一批柜门安装，后面的排期也请写清。'},
 tool:{quality:'工具材质和装箱照片都能核对，这能帮我先把返修顾虑说清。',price:'先用小批量工具试卖，后续补货再看店里的实际需要。',speed:'先保证急用的工具规格，其他后补，我就能安排现场了。'},
 handle:{quality:'门把手的样品和批次标准一起看，色差的顾虑就有了核对依据。',price:'先少量配门把手试装，这样不必一次承担全部库存。',speed:'先交急用的门把手，把两批日期说清，我就能安排安装。'}
};
// The first employee orders teach matching. Founder orders add two reasonable priorities.
const CASES={
 quality:{brief:'关键规格不能降，但包装可以简化。品质把握和首批预算，请给我两个能比较的方案。',primary:{title:'守住批次标准，保留完整交付资料',detail:'合同额 +¥300，成本不变；方案口碑 +3。客户更认可标准清楚、可追溯的承诺。',revenue:300,cost:0,plan:3,response:'完整的标准和资料值得保留。先按这个方案合作。'},secondary:{id:'price',title:'不动关键规格，改用简洁包装',detail:'合同额 +¥150，包装成本 −¥300；方案口碑 +2。单笔利润更高，客户认可度略低。',revenue:150,cost:-300,plan:2,response:'关键规格不变的话，简洁包装我能接受。这批先把预算留稳。'}},
 price:{brief:'首单预算有限，但我也想给店里的新系列留一点展示空间。小试单和样品展示，你更建议哪一种？',primary:{title:'先做小批量，保留补货弹性',detail:'合同额 +¥300，成本不变；方案口碑 +3。先把客户最担心的库存压力降下来。',revenue:300,cost:0,plan:3,response:'这个规模让我敢先试卖。补货节奏就按你说的来。'},secondary:{id:'quality',title:'多配展示样品，争取系列溢价',detail:'合同额 +¥750，展示样品成本 +¥350；方案口碑 +2。净利润多一些，也占用更多样品预算。',revenue:750,cost:350,plan:2,response:'我愿意为展示样品留一笔预算。后续返单，还是要看试卖表现。'}},
 speed:{brief:'急用部分必须先到，余量可以晚一点。若能省些物流预算，我也愿意商量后补安排。',primary:{title:'先保急用部分，把交付日期说清',detail:'合同额 +¥300，成本不变；方案口碑 +3。优先回应开业或进场的时间压力。',revenue:300,cost:0,plan:3,response:'首批时间清楚，我就能安排现场。余货照约定跟进。'},secondary:{id:'price',title:'余量合并后补，节约拆批费用',detail:'合同额 +¥150，拆批成本 −¥300；方案口碑 +2。利润更高，但客户要多等余量。',revenue:150,cost:-300,plan:2,response:'急用数量能保障，余量我可以等。请把后补日期写清楚。'}}
};
export const negotiationBrief=need=>CASES[need]?.brief||'';
export function negotiationTerms(order,id){
 const t=TACTICS.find(t=>t.id===id),match=id===order.need,c=order.negotiationCase===order.need?CASES[order.need]:null;
 if(c&&match)return {...c.primary,kind:'primary'};
 if(c&&id===c.secondary.id)return {...c.secondary,kind:'secondary'};
 return {revenue:match?300:0,cost:0,plan:match?2:1,kind:match?'match':'standard',response:match?(EMPLOYEE_REPLIES[order.product]?.[order.need]||t?.response):'这个方向可以讨论，不过我更在意的条件还没有完全解决。'};
}
export function negotiationOptions(order){
 const c=order.negotiationCase===order.need?CASES[order.need]:null;if(!c)return TACTICS;
 return TACTICS.map(t=>t.id===order.need?{...t,...c.primary}:t.id===c.secondary.id?{...t,...c.secondary}:{...t,detail:t.detail+' 常规方案：价款和成本不变，方案口碑 +1。'});
}
