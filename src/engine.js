import {PEOPLE, PRODUCTS, TACTICS, FACTORIES, SHIPMENTS} from './content.js';
export const VERSION = 1;
export const clone = x => JSON.parse(JSON.stringify(x));
export const person = id => PEOPLE.find(p => p.id === id);
export function createGame(name='小满', gender='female') {
 return {version:VERSION,name:String(name).trim().slice(0,12)||'小满',gender:gender==='male'?'male':'female',day:1,phase:'day',ap:3,cash:2500,rep:0,completed:0,startupOrders:0,stage:'employee',warehouse:1,logistics:0,staff:[],active:null,usedOffers:[],relations:Object.fromEntries(PEOPLE.map(p=>[p.id,{trust:0,status:'friend',chats:0,dates:0,lastInvite:0}])),eveningUsed:false,endingSeen:false,logs:[{day:1,title:'第一天，先把一件事做好',text:'在启航贸易，你将从一笔五金询盘开始。白天做生意，晚上把时间留给自己。'}]};
}
export function offers(s) {
 return PRODUCTS.map((p,i)=>({...p,id:`${s.day}-${p.id}`,product:p.id,revenue:p.revenue+(s.warehouse-1)*1800,cost:p.cost+(s.warehouse-1)*1000,featured:i===(s.day-1)%PRODUCTS.length}));
}
export function quote(s, factoryId=s.active?.factory, shipmentId='normal') {
 const a=s.active;if(!a)return null;
 const f=FACTORIES.find(x=>x.id===factoryId)||FACTORIES[0];const ship=SHIPMENTS.find(x=>x.id===shipmentId)||SHIPMENTS[0];
 const matched=a.tactic===a.need;
 const sales=s.staff.some(id=>person(id).specialty==='sales')?150:0;
 const supply=s.staff.some(id=>person(id).specialty==='supply')?180:0;
 const revenue=a.revenue+(matched?300:0)+sales;
 const cost=a.cost+300+f.cost-supply+ship.cost-(s.logistics?100:0);
 const deposit=Math.floor(revenue*.5);
 return {revenue,cost,deposit,reserve:Math.max(0,cost-ship.cost-deposit-f.credit),profit:revenue-cost,matched,quality:f.quality+ship.quality+(s.staff.some(id=>person(id).specialty==='quality')?1:0)};
}
export function canStart(s){return s.stage==='employee'&&s.completed>=3&&s.rep>=6&&s.cash>=5000&&!s.active&&s.phase==='day';}
export function canDate(s,id){const p=person(id),r=s.relations[id];return !!p&&p.gender!==s.gender&&r.status!=='closed'&&r.trust>=2&&(p.recruit||s.stage==='founder');}
export function hasEnding(s){return s.stage==='founder'&&s.startupOrders>=3&&(s.staff.length>0||s.warehouse>1||s.logistics>0);}
export function chapter(s){return s.stage==='employee'?(s.completed<3?'01 · 第一笔回声':'02 · 自己的方向'):(s.startupOrders<3?'03 · 向海而生':'04 · 并肩向前');}
function note(s,title,text){s.logs.unshift({day:s.day,title,text});s.logs=s.logs.slice(0,50);}
export function reduce(input,action){
 const s=clone(input);let message='',kind='success';
 const fail=text=>({state:input,message:text,kind:'warning',changed:false});
 const daytime=()=>s.phase==='day';const available=()=>daytime()&&s.ap>0;
 switch(action.type){
 case 'accept': {
  if(!available()||s.active)return fail('先完成手上的订单，或留到明天。');
  const o=offers(s).find(o=>o.id===action.id);
  if(!o||s.usedOffers.includes(o.id))return fail('这笔询盘今天已经处理过了。');
  s.active={...o,step:'talk',tactic:null,factory:null,reserve:0};message=`打开了 ${o.buyer} 的询盘。先听懂需求，再谈条件。`;break;
 }
 case 'tactic': {
  if(!available()||s.active?.step!=='talk'||!TACTICS.some(t=>t.id===action.id))return fail('目前没有等待谈判的询盘。');
  s.active.tactic=action.id;s.active.step='factory';s.ap--;
  message=action.id===s.active.need?`${s.active.buyer}：“${TACTICS.find(t=>t.id===action.id).response}” 合同额增加 ¥300。`:`${s.active.buyer}：“这个提议我可以接受。不过我最在意的仍是${{quality:'品质',price:'试单成本',speed:'交期'}[s.active.need]}。” 订单照常推进。`;break;
 }
 case 'factory': {
  if(!available()||s.active?.step!=='factory'||!FACTORIES.some(f=>f.id===action.id))return fail('请先谈妥报价。');
  const q=quote(s,action.id);
  if(s.stage==='founder'&&s.cash<q.reserve)return fail(`这家工厂需要垫资 ¥${q.reserve}。可以换账期方案，或先取消这笔询盘。`);
  s.active.factory=action.id;s.active.step='ship';s.active.reserve=s.stage==='founder'?q.reserve:0;
  s.cash-=s.active.reserve;s.ap--;message=s.stage==='founder'?`样品确认，已垫资 ¥${q.reserve}。回款时会连同利润一起返回。`:'公司承担货款。样品已确认，接下来安排出运。';break;
 }
 case 'ship': {
  if(!available()||s.active?.step!=='ship'||!SHIPMENTS.some(t=>t.id===action.id))return fail('请先完成工厂安排。');
  const q=quote(s,s.active.factory,action.id);const extra=action.id==='express'&&s.active.need==='speed';
  const gain=s.stage==='employee'?Math.floor(q.profit*.3):q.profit;
  s.cash+=s.active.reserve+gain;s.completed++;if(s.stage==='founder')s.startupOrders++;
  const rep=(q.matched?2:1)+(q.quality>0?1:0)+(extra?1:0);s.rep+=rep;s.ap--;
  message=`${s.active.buyer} 已签收并结清尾款。${s.stage==='employee'?'提成':'净利润'} +¥${gain}，口碑 +${rep}。${q.quality===0?'新厂批次有轻微瑕疵，客户建议下次加验货。':'这次交付，让合作更近了一步。'}`;
  note(s,`${s.active.name} · 顺利收款`,message);s.usedOffers.push(s.active.id);s.active=null;break;
 }
 case 'cancel': {
  if(!daytime()||!s.active)return fail('没有需要取消的订单。');
  s.cash+=s.active.reserve;message=`暂缓这笔试单。${s.active.reserve?'预留垫资已原额退回。':''}本原型不收取消费用。`;s.usedOffers.push(s.active.id);s.active=null;break;
 }
 case 'bridge': {
  if(!available()||s.stage!=='founder'||s.active)return fail('先处理完在途订单，再接代办工作。');
  s.cash+=350;s.ap--;message='替老客户核对了一份五金规格，收到代办服务费 ¥350。小生意也能撑起周转，不必借钱或接受不想要的关系。';note(s,'一份小小的周转支持',message);break;
 }
 case 'evening': {
  if(!daytime())return fail('已经下班了。');
  s.phase='evening';s.eveningUsed=false;message=s.active?'今天先到这里。未完成的订单明天接着处理。':'合上电脑。今晚的时间，由你决定。';break;
 }
 case 'rest': {
  if(s.phase!=='evening')return fail('先结束今天的工作。');
  const salary=s.stage==='employee'?180:0;const operating=s.stage==='founder'?s.staff.length*80:0;
  // The prototype never forces debt. Operating costs are limited to available cash.
  const paid=Math.min(s.cash,operating);s.cash+=salary-paid;s.day++;s.phase='day';s.ap=3;s.usedOffers=[];s.eveningUsed=false;
  message=salary?'新的一天。工资到账 ¥180。':`新的一天。${paid?`团队日薪支出 ¥${paid}。`:''}${operating>paid?'现金不足部分在本原型中免除，不形成债务。':''}`;break;
 }
 case 'chat': {
  const p=person(action.id);if(!p||s.phase!=='evening'||s.eveningUsed)return fail('每晚留一段完整的相处时间，或选择自己休息。');
  const r=s.relations[p.id];message=p.chats[r.chats%p.chats.length];r.chats++;r.trust=Math.min(12,r.trust+1);s.eveningUsed=true;note(s,`和${p.name}聊了一会儿`,message);break;
 }
 case 'date': {
  if(s.phase!=='evening'||s.eveningUsed||!canDate(s,action.id))return fail('约会需要双方熟悉、明确同意，且不存在直接上下级关系。');
  const p=person(action.id),r=s.relations[p.id];message=p.dates[r.dates%p.dates.length];r.dates++;r.status='dating';s.eveningUsed=true;note(s,`与${p.name}的下班时光`,message);break;
 }
 case 'boundary': {
  const p=person(action.id);if(!p)return fail('没有找到这个人。');
  const r=s.relations[p.id];r.status='closed';message=`你向${p.name}说明了自己的想法。对方尊重你的选择，合作与友谊照常，不会损失口碑或收益。`;note(s,'把关系说清楚',message);break;
 }
 case 'reopen': {
  const p=person(action.id);if(!p||p.gender===s.gender||s.relations[p.id].status!=='closed')return fail('当前无需调整关系边界。');
  s.relations[p.id].status='friend';message='你愿意重新了解彼此。是否约会，仍然由你在邀请前决定。';break;
 }
 case 'startup': {
  if(!canStart(s))return fail('创业需要完成 3 单、口碑 6、现金 ¥5,000，且当前没有在途订单。');
  s.cash-=3000;s.stage='founder';message='交接完成。你租下了一间小工作室，支付启动费用 ¥3,000。以后每一笔订单，都写着自己的名字。';note(s,'向海贸易，正式开门',message);break;
 }
 case 'warehouse': {
  if(!daytime()||s.stage!=='founder'||s.active||s.warehouse>=2||s.cash<1400)return fail('扩仓需要 ¥1,400，请先完成在途订单。首版最多 2 级。');
  s.cash-=1400;s.warehouse=2;message='增加了一排货架。新询盘的订单规模提升，采购与回款仍由一张卡片管理。';note(s,'小仓库，有了新空间',message);break;
 }
 case 'logistics': {
  if(!daytime()||s.stage!=='founder'||s.active||s.logistics>=1||s.cash<1000)return fail('物流合作需要 ¥1,000，请先完成在途订单。');
  s.cash-=1000;s.logistics=1;message='与拼箱代理建立固定合作。今后每单物流成本减少 ¥100。';note(s,'一条稳定的出海路线',message);break;
 }
 case 'recruit': {
  const p=person(action.id);if(!p||!daytime()||s.stage!=='founder')return fail('创业后，可以在工作时间聊合作。');
  if(s.staff.includes(p.id))return fail('你们已经在同一支团队。');
  if(!p.recruit)return fail(`${p.name}认真考虑后婉拒了邀请：“${p.promise}” 你们的关系不受影响。`);
  if(s.relations[p.id].trust<3||s.startupOrders<2)return fail(`${p.name}想先看看工作室的稳定性，也想多了解你的管理方式。完成 2 笔创业订单、相处 3 次后再聊，不需要恋爱。`);
  if(s.cash<1200)return fail('需要准备 ¥1,200 入职安排费。没有足够预算时，不急着给承诺。');
  s.cash-=1200;s.staff.push(p.id);message=`${p.name}考虑了岗位与待遇后，决定加入。${{quality:'每笔订单增加验货保障。',supply:'每笔订单采购成本减少 ¥180。',sales:'每笔订单合同额增加 ¥150。'}[p.specialty]}每日工资 ¥80。招聘与恋爱无关。`;note(s,`欢迎${p.name}加入`,message);break;
 }
 case 'ending': {
  if(!hasEnding(s)||s.endingSeen)return fail('继续把工作室经营稳定，故事还在前面。');
  s.endingSeen=true;message='从第一封询盘到自己的公司，你靠判断赢得信任，也保留了选择生活的权利。这只是向海贸易的第一章。';note(s,'阶段结局 · 航线由你定义',message);break;
 }
 default:return fail('没有发生变化。');
 }
 return {state:s,message,kind,changed:true};
}
export function parseSave(raw){
 const s=JSON.parse(raw);const integer=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
 if(!s||s.version!==VERSION||!['male','female'].includes(s.gender)||typeof s.name!=='string'||s.name.length>12||!['day','evening'].includes(s.phase)||!['employee','founder'].includes(s.stage)||!integer(s.day,1,100000)||!integer(s.ap,0,3)||!integer(s.cash,0,1e12)||!integer(s.rep,0,1e9)||!integer(s.completed,0,1e9)||!integer(s.startupOrders,0,s.completed)||!integer(s.warehouse,1,2)||!integer(s.logistics,0,1)||!Array.isArray(s.staff)||new Set(s.staff).size!==s.staff.length||s.staff.some(id=>!person(id)?.recruit)||!Array.isArray(s.usedOffers)||s.usedOffers.some(id=>typeof id!=='string'||id.length>50)||typeof s.eveningUsed!=='boolean'||typeof s.endingSeen!=='boolean'||!Array.isArray(s.logs)||s.logs.length>50||s.logs.some(l=>!integer(l.day,1,s.day)||typeof l.title!=='string'||l.title.length>100||typeof l.text!=='string'||l.text.length>2000))throw new Error('存档结构不完整或版本不兼容。');
 for(const p of PEOPLE){const r=s.relations?.[p.id];if(!r||!integer(r.trust,0,12)||!integer(r.chats,0,1e9)||!integer(r.dates,0,1e9)||!['friend','dating','closed'].includes(r.status)||!integer(r.lastInvite,0,1e9)||p.gender===s.gender&&r.status==='dating')throw new Error('关系数据不完整。');}
 if(s.active!==null){const a=s.active;if(!a||!PRODUCTS.some(p=>p.id===a.product)||typeof a.id!=='string'||a.id.length>50||!['talk','factory','ship'].includes(a.step)||!integer(a.revenue,1,1e8)||!integer(a.cost,0,1e8)||!integer(a.reserve,0,1e8)||!['price','quality','speed'].includes(a.need)||typeof a.name!=='string'||a.name.length>50||typeof a.buyer!=='string'||a.buyer.length>50||typeof a.request!=='string'||a.request.length>500||typeof a.market!=='string'||a.market.length>100||(a.step!=='talk'&&!TACTICS.some(t=>t.id===a.tactic))||(a.step==='ship'&&!FACTORIES.some(f=>f.id===a.factory)))throw new Error('在途订单数据异常。');}
 // Copy only the schema's known top-level keys, never render raw saved HTML.
 return Object.fromEntries(Object.keys(createGame()).map(k=>[k,clone(s[k])]));
}
