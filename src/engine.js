import {weekendMoment} from './weekend-scenes.js';
import {resolveWorkScene} from './work-branches.js';
import {isWeekend,canWorkToday} from './calendar.js';
import {PEOPLE, PRODUCTS, TACTICS, FACTORIES, SHIPMENTS, CHAT_REPLIES, INQUIRY_VARIANTS,WEEKEND_INQUIRIES} from './content.js';
import {STORY_EVENTS, storyEvent, RELATIONSHIP_ENDINGS, FINALES} from './story.js';
import {DATE_REPLIES,WORK_STORIES} from './relationships.js';
import {negotiationBrief,negotiationTerms,negotiationOptions} from './negotiation.js';
import {deliveryStory,deliveryMilestone} from './delivery-stories.js';
import {dialogueScene,emptyDialogueMemories,rememberDialogue,commitmentEcho} from './dialogue.js';
export const VERSION = 6;
export const clone = x => JSON.parse(JSON.stringify(x));
export const person = id => PEOPLE.find(p => p.id === id);
export function personUnlocked(s,id){const p=person(id),u=p?.unlock;return !!p&&(!u||s.completed>=(u.completed||0)&&(!u.stage||s.stage===u.stage)&&s.startupOrders>=(u.startup||0));}
export function createGame(name='小满', gender='female') {
 return {version:VERSION,name:String(name).trim().slice(0,12)||'小满',gender:gender==='male'?'male':'female',day:1,phase:'day',weekendWork:false,ap:3,cash:2500,rep:0,completed:0,startupOrders:0,stage:'employee',warehouse:1,logistics:0,staff:[],active:null,usedOffers:[],relations:Object.fromEntries(PEOPLE.map(p=>[p.id,{trust:0,status:'friend',chats:0,dates:0,lastInvite:0}])),eveningUsed:false,endingSeen:false,workStories:{},dialogueMemories:emptyDialogueMemories(),lastDelivery:null,story:{decisions:{},memories:{},focus:null,operations:null,distribution:null,finale:null},logs:[{day:1,title:'第一天，先把一件事做好',text:'在启航贸易，你将从一笔五金询盘开始。白天做生意，晚上把时间留给自己。'}]};
}
export function offers(s) {
 const make=(p,v={},featured=false)=>{
  const base={...p,...v},caseId=s.stage==='founder'?base.need:null;
  return {...base,id:`${s.day}-${p.id}`,product:p.id,revenue:p.revenue+(v.revenueDelta||0)+(s.warehouse-1)*1800,cost:p.cost+(v.costDelta||0)+(s.warehouse-1)*1000,negotiationCase:caseId,request:base.request+(caseId?' '+negotiationBrief(base.need):''),featured};
 };
 if(isWeekend(s)){
  const index=(Math.floor((s.day-1)/7)*2+(s.day%7===0?1:0))%WEEKEND_INQUIRIES.length;
  const scenario=WEEKEND_INQUIRIES[index];
  return [make(PRODUCTS.find(p=>p.id===scenario.product),scenario,true)];
 }
 // Recommendation rotates separately from customer variants. Keeping both on
 // the same three-day cycle recommended quality, quality, price indefinitely.
 // This changes only the highlight; every inquiry and its price remain intact.
 return PRODUCTS.map((p,i)=>make(p,INQUIRY_VARIANTS[p.id][(s.day-1)%3],i===Math.floor((s.day-1)/3)%PRODUCTS.length));
}
export function quote(s, factoryId=s.active?.factory, shipmentId='normal') {
 const a=s.active;if(!a)return null;
 const f=FACTORIES.find(x=>x.id===factoryId)||FACTORIES[0];const ship=SHIPMENTS.find(x=>x.id===shipmentId)||SHIPMENTS[0];
 const matched=a.tactic===a.need,terms=negotiationTerms(a,a.tactic);
 const sales=s.staff.some(id=>person(id).specialty==='sales')?150:0;
 const supply=s.staff.some(id=>person(id).specialty==='supply')?180:0;
 const brand=s.stage==='founder'&&s.story.focus==='brand';const team=s.story.operations==='team'?s.staff.length*120:0;const regional=s.story.distribution==='regional'&&a.product==='hinge'?600:0;
 const revenueParts={base:a.revenue,negotiation:terms.revenue,sales,brand:brand?700:0,team,regional};
 const revenue=Object.values(revenueParts).reduce((sum,value)=>sum+value,0);
 const cost=a.cost+300+terms.cost+f.cost-supply+ship.cost-(s.logistics?100:0)+(brand?300:0)-(s.story.operations==='network'?100:0);
 const deposit=Math.floor(revenue*.5);
 return {revenue,revenueParts,cost,deposit,reserve:Math.max(0,cost-ship.cost-deposit-f.credit),profit:revenue-cost,matched,planPoints:terms.plan,quality:f.quality+ship.quality+(s.staff.some(id=>person(id).specialty==='quality')?1:0)};
}
// Preview every actual plan rather than labelling a baseline quote as a minimum.
export function offerPreview(s,id){
 const offer=offers(s).find(o=>o.id===id);if(!offer)return null;
 const gains=[];
 for(const tactic of TACTICS)for(const factory of FACTORIES)for(const shipment of SHIPMENTS){
  const preview={...s,active:{...offer,tactic:tactic.id,factory:factory.id,reserve:0}};
  const q=quote(preview,factory.id,shipment.id);
  gains.push(s.stage==='employee'?Math.floor(q.profit*.3):q.profit);
 }
 return {min:Math.min(...gains),max:Math.max(...gains)};
}
export function reputation(s,shipmentId='normal'){if(!s.active)return null;const q=quote(s,s.active.factory,shipmentId),plan=q.planPoints,quality=q.quality>0?Math.min(3,q.quality):-1,speed=shipmentId==='express'&&s.active.need==='speed'?2:0,boutique=s.story.focus==='boutique'&&s.active.need==='quality'&&q.matched?1:0,independent=s.story.distribution==='independent'?1:0;return {plan,quality,speed,boutique,independent,total:plan+quality+speed+boutique+independent};}
export function shipmentNote(s,id){return id==='qc'&&s.active&&reputation(s,'normal').quality===reputation(s,'qc').quality?'本单品质已达上限；再验货仍花 ¥200，但不会额外增加品质口碑。':'';}
export function canStart(s){return s.stage==='employee'&&s.completed>=3&&s.rep>=6&&s.cash>=5000&&!!s.story.decisions.first_credit&&!!s.story.decisions.first_contract&&!s.active&&s.phase==='day';}
export function chatScene(s,id){return dialogueScene(s,id,'chat');}
export function dateScene(s,id){return dialogueScene(s,id,'date');}
export function workUnlocked(s,e){return !!e&&s.completed>=e.minCompleted&&(!e.stage||e.stage===s.stage)&&s.startupOrders>=(e.minStartup||0)&&(!e.requiresWork||!!s.workStories[e.requiresWork]);}
export function nextWorkStory(s){return WORK_STORIES.find(e=>!s.workStories[e.id]&&workUnlocked(s,e))||null;}
export function workScene(s,id,setting){const e=WORK_STORIES.find(e=>e.id===id);if(!e)return null;const place=setting||(s.stage==='employee'||s.staff.includes(e.person)?'office':'remote');const saved=s.workStories[id];if(saved?.scene)return {...e,setting:saved.setting,scene:saved.scene,branch:saved.branch||null,choices:e.choices.map((c,i)=>i===saved.response?{line:saved.line,reply:saved.reply}:c)};if(saved)return {...e,setting:place,scene:e[place],branch:null};return resolveWorkScene(s,e,place);}
// Only the immediately previous real receipt, never an invented customer history.
export function recentDeliveryForInquiry(s,offer){
 const r=s.lastDelivery;
 return r&&offer&&r.stage===s.stage&&r.buyer===offer.buyer&&r.product===offer.product?r:null;
}
export function canDate(s,id){const p=person(id),r=s.relations[id];return !!p&&personUnlocked(s,id)&&p.gender!==s.gender&&r.status!=='closed'&&r.trust>=2&&(!p.manager||s.stage==='founder')&&!PEOPLE.some(other=>other.id!==id&&s.relations[other.id].status==='partner');}
export function canCommit(s,id){return canDate(s,id)&&s.relations[id].status==='dating'&&s.relations[id].dates>=3&&s.relations[id].trust>=3;}
export function nextStory(s){return STORY_EVENTS.map(e=>storyEvent(s,e.id)).find(e=>!s.story.decisions[e.id]&&e.stage===s.stage&&s.completed>=(e.minCompleted||0)&&s.startupOrders>=(e.minStartup||0)&&(e.requires||[]).every(id=>s.story.decisions[id]))||null;}
export function finaleGoal(s){const brand=s.story.focus==='brand';return {title:brand?FINALES.brand.title:FINALES.boutique.title,orders:brand?10:8,rep:brand?0:35,cash:brand?18000:0,warehouse:brand?2:1};}
export function canFinish(s){if(s.stage!=='founder'||!s.story.focus||!s.story.decisions.partnership||!s.story.decisions.aftercare||!s.story.decisions.legacy||s.story.finale||s.active||s.phase!=='day')return false;const g=finaleGoal(s);return s.startupOrders>=g.orders&&s.rep>=g.rep&&s.cash>=g.cash&&s.warehouse>=g.warehouse&&(s.staff.length>0||s.warehouse>1||s.logistics>0);}
export function hasEnding(s){return s.stage==='founder'&&s.startupOrders>=3&&(s.staff.length>0||s.warehouse>1||s.logistics>0);}
export function chapter(s){return s.story.finale?'终章 · 航线仍在继续':s.stage==='employee'?(s.completed<3?'01 · 第一笔回声':'02 · 自己的方向'):(s.startupOrders<2?'03 · 向海而生':s.startupOrders<4?'04 · 把意外接住':s.startupOrders<6?'05 · 并肩向前':s.startupOrders<7?'06 · 谈判桌的另一端':!s.story.decisions.aftercare?'07 · 签收之后的信':'08 · 留给下一次的办法');}
function note(s,title,text){s.logs.unshift({day:s.day,title,text});s.logs=s.logs.slice(0,50);}
export function reduce(input,action){
 const s=clone(input);let message='',kind='success';
 const fail=text=>({state:input,message:text,kind:'warning',changed:false});
 const daytime=()=>s.phase==='day';const available=()=>canWorkToday(s)&&s.ap>0;
 switch(action.type){
 case 'weekend-time': {
  const moment=weekendMoment(s,action.id);if(!daytime()||!isWeekend(s)||s.weekendWork||!moment)return fail('这个白天的安排只在尚未开始工作的双休日可选。');
  s.phase='evening';message=moment.text;note(s,moment.title,message);break;
 }
 case 'weekend-work': {
  if(!daytime()||!isWeekend(s)||s.weekendWork)return fail('只有双休日白天需要另行选择工作。');
  s.weekendWork=true;message='今天的紧急交付由你自愿接手。随时可以结束工作，未完订单会保留，不默认同事加班。';note(s,'这个周末，由自己安排',message);break;
 }
 case 'accept': {
  if(!available()||s.active)return fail('先完成手上的订单，或留到明天。');
  const o=offers(s).find(o=>o.id===action.id);
  if(!o||s.usedOffers.includes(o.id))return fail('这笔询盘今天已经处理过了。');
  s.active={...o,step:'talk',tactic:null,factory:null,reserve:0};message=`打开了 ${o.buyer} 的询盘。先听懂需求，再谈条件。`;break;
 }
 case 'tactic': {
  if(!available()||s.active?.step!=='talk'||!TACTICS.some(t=>t.id===action.id))return fail('目前没有等待谈判的询盘。');
  s.active.tactic=action.id;s.active.step='factory';s.ap--;
  const terms=negotiationTerms(s.active,action.id);message=s.active.negotiationCase?`${s.active.buyer}：“${terms.response}” 条款：合同额 +¥${terms.revenue}，成本${terms.cost<0?' −¥'+(-terms.cost):' +¥'+terms.cost}，方案口碑 +${terms.plan}。`:action.id===s.active.need?`${s.active.buyer}：“${terms.response}” 合同额增加 ¥300。`:`${s.active.buyer}：“这个提议我可以接受。不过我最在意的仍是${{quality:'品质',price:'试单成本',speed:'交期'}[s.active.need]}。” 订单照常推进。`;break;
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
  const points=reputation(s,action.id),planPoints=points.plan,qualityPoints=points.quality,speedPoints=points.speed,boutiquePoints=points.boutique,independentPoints=points.independent,rep=points.total;s.rep+=rep;s.ap--;
  message=`${s.active.buyer} 已签收并结清尾款。${s.stage==='employee'?'提成':'净利润'} +¥${gain}，口碑 +${rep}（方案 +${planPoints}，${qualityPoints>0?'品质 +'+qualityPoints:'轻微瑕疵 −1'}${extra?'，提前交付 +2':''}${boutiquePoints?'，精品专长 +1':''}${independentPoints?'，独立口碑 +1':''}）。${q.quality===0?'新厂批次有轻微瑕疵；下次验货或安排质检同事，可以避免这项扣分。':'这次交付，让合作更近了一步。'}`;
  const story=deliveryStory({product:s.active.product,need:s.active.need,shipmentId:action.id,factoryId:s.active.factory,qualityPoints:points.quality,planPoints:points.plan,stage:s.stage,focus:s.story.focus,operations:s.story.operations,staffIds:[...s.staff],weekend:isWeekend(s),completed:s.completed});
  const milestone=deliveryMilestone({stage:s.stage,completed:s.completed,startupOrders:s.startupOrders,qualityPoints:points.quality,planPoints:points.plan});if(milestone)story.milestone=milestone;
  s.lastDelivery={number:s.completed,day:s.day,product:s.active.product,buyer:s.active.buyer,stage:s.stage,factory:s.active.factory,shipment:action.id,planTitle:negotiationOptions(s.active).find(t=>t.id===s.active.tactic).title,revenue:q.revenue,revenueParts:{...q.revenueParts},cost:q.cost,profit:q.profit,gain,reserve:s.active.reserve,points:{...points},story:{...story}};
  note(s,`${s.active.name} · 交付回信`,message+'\n\n'+story.customer+'\n'+story.team+(story.milestone?'\n\n'+story.milestone:''));s.usedOffers.push(s.active.id);s.active=null;break;
 }
 case 'cancel': {
  if(!daytime()||!s.active)return fail('没有需要取消的订单。');
  s.cash+=s.active.reserve;message=`暂缓这笔试单。${s.active.reserve?'预留垫资已原额退回。':''}当前版本不收取消费用。`;s.usedOffers.push(s.active.id);s.active=null;break;
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
  const paid=Math.min(s.cash,operating);s.cash+=salary-paid;s.day++;s.phase='day';s.weekendWork=false;s.ap=3;s.usedOffers=[];s.eveningUsed=false;
  message=salary?'新的一天。工资到账 ¥180。':`新的一天。${paid?`团队日薪支出 ¥${paid}。`:''}${operating>paid?'现金不足部分在当前版本中免除，不形成债务。':''}`;break;
 }
 case 'chat': {
  const p=person(action.id);if(!p||!personUnlocked(s,p.id)||s.phase!=='evening'||s.eveningUsed)return fail('每晚留一段完整的相处时间，或选择自己休息。');
  const r=s.relations[p.id],scene=chatScene(s,p.id),answer=action.response??0;if(!Number.isInteger(answer)||!scene.choices[answer])return fail('请选择一个有效回应。');const choice=scene.choices[answer];message=scene.scene+'\n\n你：“'+choice.line+'”\n'+choice.reply;rememberDialogue(s,p.id,'chat',scene,answer);r.chats++;r.trust=Math.min(12,r.trust+1);s.eveningUsed=true;note(s,`和${p.name}聊了一会儿`,message);break;
 }
 case 'date': {
  if(s.phase!=='evening'||s.eveningUsed||!canDate(s,action.id))return fail('约会需要双方熟悉、明确同意，且不存在直接上下级关系。');
  const p=person(action.id),r=s.relations[p.id],scene=dateScene(s,p.id),response=action.response??0;if(!Number.isInteger(response)||!scene.choices[response])return fail('请选择一个有效回应。');const answer=scene.choices[response];message=scene.scene+'\n\n你：“'+answer.line+'”\n'+answer.reply;rememberDialogue(s,p.id,'date',scene,response);r.dates++;if(r.status!=='partner')r.status='dating';s.eveningUsed=true;note(s,`与${p.name}的${isWeekend(s)?'周末':'下班'}时光`,message);break;
 }
 case 'work-story': {
  if(!daytime()||s.active)return fail('先完成手头的订单，再留一点时间给身边的人。');
  const scene=workScene(s,action.id),response=action.response;if(!scene||s.workStories[scene.id]||!workUnlocked(s,scene)||!Number.isInteger(response)||!scene.choices[response])return fail('这段工作日常还未开始，或已留下记录。');
  const answer=scene.choices[response];s.workStories[scene.id]={response,setting:scene.setting,day:s.day,branch:scene.branch,scene:scene.scene,line:answer.line,reply:answer.reply};message=scene.scene+'\n\n你：“'+answer.line+'”\n'+answer.reply;note(s,scene.title,message);break;
 }
 case 'commit': {
  if(s.phase!=='evening'||s.eveningUsed||!canCommit(s,action.id))return fail('至少相处 3 次、约会 3 次后，再在一个空闲的晚上认真谈谈。');
  for(const p of PEOPLE)if(p.id!==action.id&&s.relations[p.id].status==='dating')s.relations[p.id].status='friend';
  s.relations[action.id].status='partner';s.eveningUsed=true;s.dialogueMemories[action.id].commitment=commitmentEcho(s,action.id);if(!s.dialogueMemories[action.id].commitmentRecord)s.dialogueMemories[action.id].commitmentRecord={day:s.day,scene:RELATIONSHIP_ENDINGS[action.id],echo:s.dialogueMemories[action.id].commitment};message=RELATIONSHIP_ENDINGS[action.id]+(s.dialogueMemories[action.id].commitment?'\n\n'+s.dialogueMemories[action.id].commitment:'');note(s,`与${person(action.id).name} · 把心意说清楚`,message);break;
 }
 case 'story': {
  if(!daytime()||s.active)return fail('先完成手上的订单，再留出时间谈这件事。');
  const event=nextStory(s);if(!event||event.id!==action.id)return fail('这个章节暂未开启，或已经做出选择。');
  const choice=event.choices.find(c=>c.id===action.choice);if(!choice)return fail('请选择一个有效方案。');
  const fx=choice.effects||{};if(s.cash+(fx.cash||0)<0)return fail('暂时没有足够预算，可以选择无需预付的方案，或之后再来。');
  s.cash+=fx.cash||0;s.rep+=fx.rep||0;for(const key of ['focus','operations','distribution'])if(fx[key])s.story[key]=fx[key];
  s.story.memories ||= {};s.story.memories[event.id]={day:s.day,scene:event.scene,label:choice.label,detail:choice.detail,outcome:choice.outcome,branch:event.branch||null};s.story.decisions[event.id]=choice.id;message=choice.outcome;note(s,event.title,message);break;
 }
 case 'finale': {
  if(!canFinish(s))return fail('先完成合作章节与公司方向目标，再写下这份阶段答卷。');
  s.story.finale=s.story.focus;const end=FINALES[s.story.focus];message=end.scene;note(s,`事业终章 · ${end.title}`,message);break;
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
  if(!canStart(s))return fail('创业需要完成 3 单、两个创业前章节、口碑 6、现金 ¥5,000，且当前没有在途订单。');
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
  const p=person(action.id);if(!p||!personUnlocked(s,p.id)||!daytime()||s.stage!=='founder')return fail('创业后，可以在工作时间聊合作。');
  if(s.active)return fail('先完成在途订单，再确认新同事的入职，让报价与分工保持清楚。');
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
 if(typeof raw!=='string'||raw.length>100000)throw new Error('存档内容过大或无法读取。');
 const s=JSON.parse(raw);if(s&&s.version===1){s.version=2;s.story={decisions:{},focus:null,operations:null,distribution:null,finale:null};}if(s&&s.version===2){s.version=3;s.workStories={};}if(s&&s.version===3){s.version=4;s.lastDelivery=null;}if(s&&s.version===4){s.version=5;s.dialogueMemories=emptyDialogueMemories();}if(s&&s.version===5){s.version=6;s.weekendWork=false;for(const p of PEOPLE.filter(p=>p.unlock)){if(s.relations&&!Object.hasOwn(s.relations,p.id))s.relations[p.id]={trust:0,status:'friend',chats:0,dates:0,lastInvite:0};if(s.dialogueMemories&&!Object.hasOwn(s.dialogueMemories,p.id))s.dialogueMemories[p.id]={chat:[null,null,null],date:[null,null,null],commitment:null};}}
 const integer=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
 if(!s||s.version!==VERSION||!['male','female'].includes(s.gender)||typeof s.name!=='string'||s.name.length>12||!['day','evening'].includes(s.phase)||!['employee','founder'].includes(s.stage)||!integer(s.day,1,100000)||!integer(s.ap,0,3)||!integer(s.cash,0,1e12)||!integer(s.rep,0,1e9)||!integer(s.completed,0,1e9)||!integer(s.startupOrders,0,s.completed)||!integer(s.warehouse,1,2)||!integer(s.logistics,0,1)||!Array.isArray(s.staff)||new Set(s.staff).size!==s.staff.length||s.staff.some(id=>!person(id)?.recruit)||!Array.isArray(s.usedOffers)||s.usedOffers.some(id=>typeof id!=='string'||id.length>50)||typeof s.eveningUsed!=='boolean'||typeof s.endingSeen!=='boolean'||!Array.isArray(s.logs)||s.logs.length>50||s.logs.some(l=>!integer(l.day,1,s.day)||typeof l.title!=='string'||l.title.length>100||typeof l.text!=='string'||l.text.length>2000))throw new Error('存档结构不完整或版本不兼容。');
 if(typeof s.weekendWork!=='boolean'||!isWeekend(s)&&s.weekendWork)throw new Error('休息日安排异常。');
 if(!s.workStories||typeof s.workStories!=='object'||Array.isArray(s.workStories))throw new Error('工作日常记录异常。');
 for(const [id,entry] of Object.entries(s.workStories)){if(!WORK_STORIES.some(e=>e.id===id)||!entry||![0,1].includes(entry.response)||!['office','remote'].includes(entry.setting))throw new Error('工作日常选择无法识别。');if(entry.scene!==undefined&&(!integer(entry.day,1,s.day)||typeof entry.scene!=='string'||!entry.scene||entry.scene.length>1400||typeof entry.line!=='string'||!entry.line||entry.line.length>200||typeof entry.reply!=='string'||!entry.reply||entry.reply.length>700||!(entry.branch===null||typeof entry.branch==='string'&&/^work:[a-z_]+:[01]$/.test(entry.branch))))throw new Error('工作日常回忆无法识别。');}
 if(!s.relations||typeof s.relations!=='object'||Array.isArray(s.relations)||Object.keys(s.relations).some(id=>!PEOPLE.some(p=>p.id===id)))throw new Error('关系角色无法识别。');
 for(const p of PEOPLE){const r=s.relations?.[p.id];if(!r||!integer(r.trust,0,12)||!integer(r.chats,0,1e9)||!integer(r.dates,0,1e9)||!['friend','dating','partner','closed'].includes(r.status)||!integer(r.lastInvite,0,1e9)||p.gender===s.gender&&['dating','partner'].includes(r.status))throw new Error('关系数据不完整。');}
 if(!s.dialogueMemories||typeof s.dialogueMemories!=='object'||Array.isArray(s.dialogueMemories)||Object.keys(s.dialogueMemories).length!==PEOPLE.length||Object.keys(s.dialogueMemories).some(id=>!person(id)))throw new Error('人物回应记录异常。');
 for(const p of PEOPLE){
  const memory=s.dialogueMemories[p.id],text=(v,max)=>typeof v==='string'&&v.length>0&&v.length<=max;
  if(!memory||Array.isArray(memory)||!(memory.commitment===null||text(memory.commitment,500)))throw new Error('关系约定记录异常。');
  if(memory.commitmentRecord!=null){const r=memory.commitmentRecord;if(!r||Array.isArray(r)||!integer(r.day,1,s.day)||!text(r.scene,1000)||!(r.echo===null||text(r.echo,500)))throw new Error('关系确认快照异常。');}
  for(const kind of ['chat','date']){
   const records=memory[kind],count=s.relations[p.id][kind==='chat'?'chats':'dates'];
   if(!Array.isArray(records)||records.length!==3)throw new Error('人物回应记录不完整。');
   records.forEach((r,i)=>{
    if(r===null)return;
    if(i>=count||!r||Array.isArray(r)||!integer(r.day,1,s.day)||![0,1].includes(r.response)||!text(r.scene,900)||!text(r.line,200)||!text(r.reply,500)||!(r.branch===null||i===2&&records[0]&&r.branch===`${kind}:${p.id}:${records[0].response}`))throw new Error('人物回应无法识别。');
   });
  }
 }
 if(!s.story||typeof s.story!=='object'||!s.story.decisions||typeof s.story.decisions!=='object'||Array.isArray(s.story.decisions)||![null,'boutique','brand'].includes(s.story.focus)||![null,'team','network'].includes(s.story.operations)||![null,'independent','regional'].includes(s.story.distribution)||![null,'boutique','brand'].includes(s.story.finale)||s.story.finale&&s.story.finale!==s.story.focus)throw new Error('章节数据异常。');
 for(const [id,choice] of Object.entries(s.story.decisions)){const event=STORY_EVENTS.find(e=>e.id===id);if(!event||!event.choices.some(c=>c.id===choice))throw new Error('章节选择无法识别。');}
 if(s.story.memories===undefined)s.story.memories={};
 if(!s.story.memories||typeof s.story.memories!=='object'||Array.isArray(s.story.memories))throw new Error('章节回忆异常。');
 for(const [id,r] of Object.entries(s.story.memories)){
  const text=(v,max)=>typeof v==='string'&&v.length>0&&v.length<=max;
  if(!s.story.decisions[id]||!r||Array.isArray(r)||!integer(r.day,1,s.day)||!text(r.scene,1800)||!text(r.label,200)||!text(r.detail,500)||!text(r.outcome,1000)||!(r.branch===null||typeof r.branch==='string'&&/^career:[a-z_]+:[a-z_]+$/.test(r.branch)))throw new Error('章节回忆无法识别。');
 }
 if(PEOPLE.filter(p=>s.relations[p.id].status==='partner').length>1)throw new Error('正式关系数据异常。');
 if(s.active!==null){const a=s.active;if(!a||a.negotiationCase!=null&&a.negotiationCase!==a.need||!PRODUCTS.some(p=>p.id===a.product)||typeof a.id!=='string'||a.id.length>50||!['talk','factory','ship'].includes(a.step)||!integer(a.revenue,1,1e8)||!integer(a.cost,0,1e8)||a.revenue-a.cost<800||!integer(a.reserve,0,1e8)||!['price','quality','speed'].includes(a.need)||typeof a.name!=='string'||a.name.length>50||typeof a.buyer!=='string'||a.buyer.length>50||typeof a.request!=='string'||a.request.length>500||typeof a.market!=='string'||a.market.length>100||(a.step!=='talk'&&!TACTICS.some(t=>t.id===a.tactic))||(a.step==='ship'&&!FACTORIES.some(f=>f.id===a.factory)))throw new Error('在途订单数据异常。');}
 if(s.lastDelivery!==null){
  const r=s.lastDelivery,p=r?.points,story=r?.story,text=(v,max)=>typeof v==='string'&&v.length>0&&v.length<=max;
  if(!r||Array.isArray(r)||!integer(r.number,1,s.completed)||!integer(r.day,1,s.day)||!PRODUCTS.some(x=>x.id===r.product)||!['employee','founder'].includes(r.stage)||r.stage==='founder'&&s.stage!=='founder'||!FACTORIES.some(x=>x.id===r.factory)||!SHIPMENTS.some(x=>x.id===r.shipment)||!text(r.buyer,50)||!text(r.planTitle,120)||!integer(r.revenue,1,1e9)||!integer(r.cost,0,r.revenue)||r.profit!==r.revenue-r.cost||!integer(r.profit,0,1e9)||r.gain!==(r.stage==='employee'?Math.floor(r.profit*.3):r.profit)||!integer(r.reserve,0,1e9)||r.stage==='employee'&&r.reserve!==0||!p||!integer(p.plan,1,3)||![-1,1,2,3].includes(p.quality)||![0,2].includes(p.speed)||![0,1].includes(p.boutique)||![0,1].includes(p.independent)||p.total!==p.plan+p.quality+p.speed+p.boutique+p.independent||!integer(p.total,0,s.rep)||!story||!text(story.title,100)||!text(story.customer,500)||!text(story.team,500))throw new Error('最近交付记录异常。');
  if(story.milestone!==undefined&&!text(story.milestone,300))throw new Error('交付成长记录异常。');
  if(r.revenueParts!==undefined){const parts=r.revenueParts,keys=['base','negotiation','sales','brand','team','regional'];if(!parts||Array.isArray(parts)||Object.keys(parts).length!==keys.length||keys.some(k=>!integer(parts[k],k==='base'?1:0,1e9))||keys.reduce((sum,k)=>sum+parts[k],0)!==r.revenue)throw new Error('最近交付记录的合同额构成异常。');}
 }
 // Copy only the schema's known top-level keys, never render raw saved HTML.
 return Object.fromEntries(Object.keys(createGame()).map(k=>[k,clone(s[k])]));
}
