import {PEOPLE, PRODUCTS} from './content.js';

// Authored delivery echoes only. Accounting and saved snapshots belong to the engine.
// Add product scenes here rather than inferring a customer's use from their name.
const PRODUCT_SCENES = {
 hinge:{
  titles:['柜门合上的声音','样品走进了房间'],
  good:['合页装上柜门，试着开合几次，声音很轻。','试装的柜门开合平稳，合页没有发出异响。'],
  ordinary:'合页已经拿去试装，接下来会留意开合表现。',
  defect:'合页边沿有些轻微外观瑕疵，装柜门前还得先挑一遍。'
 },
 tool:{
  titles:['工具箱打开以后','货架上的新位置'],
  good:['工具套装打开试过，握柄和接头都很稳。','拿套装做了一次小修理，工具用着顺手。'],
  ordinary:'工具套装已摆上试用台，准备让店员逐件试用。',
  defect:'工具手柄上有些轻微外观瑕疵，上架前还得先挑一遍。'
 },
 handle:{
  titles:['门把手装上之后','一扇门有了着落'],
  good:['门把手并排试装后，拉丝纹路和颜色很一致。','门把手装上试用的门，握感和表面都合适。'],
  ordinary:'门把手已经拿去试装，接下来会看看整排装好的效果。',
  defect:'门把手表面有些轻微外观瑕疵，并排试装时能看出来。'
 }
};
const FALLBACK_SCENE = {
 titles:['一封交付回信','货物到了以后'],
 good:['这批货已经试用过，表现稳定。','实物已经收到，使用起来很顺手。'],
 ordinary:'这批货已收到，接下来会安排试用。',
 defect:'这批货有些轻微外观瑕疵，使用前还得先挑一遍。'
};
const TEAM_LINES = {
 xia:{
  defect:'林知夏放大客户的瑕疵照片：“这几处，跟留样放在一起看。”',
  checked:'林知夏把验货记录放回样品旁：“这封回信也留在这里。”',
  ordinary:['林知夏读完回信，把桌边歪着的样品扶正了。','林知夏把客户提到的细节圈出来，又把邮件转回给你。']
 },
 zhou:{
  defect:'周屿读完回信，把“已收到”和“待处理”分开记下。',
  checked:'周屿读了两遍客户对核查的评价：“这句，我想留下来。”',
  ordinary:['周屿读完回信，轻轻敲了敲桌面：“有回音了。”','周屿把回信往下翻了翻：“原来这批货是这样用起来的。”']
 },
 tang:{
  defect:'唐澈把瑕疵照片和工厂留样放在一起，没有急着收起。',
  checked:'唐澈将核查记录夹回工厂资料：“这回对得上。”',
  ordinary:['唐澈合上工厂资料：“行，这批货有着落了。”','唐澈看到试用的消息，把样品盒挪回了原来的位置。']
 }
};

function variation(completed){
 return Number.isSafeInteger(completed)&&completed>0?(completed-1)%2:0;
}

function customerPriority({product,need,shipmentId,qualityPoints,planPoints}){
 const addressed=Number.isFinite(planPoints)&&planPoints>=2;
 if(need==='speed'){
  if(shipmentId==='express')return addressed?'急用部分提前到了，现场能先安排起来。':'货提前到了，急用数量的安排还需要说清楚。';
  return addressed?'急用部分按约定排期到货，我就照这个日期安排现场。':'货按常规排期到了，但急用部分的安排还没完全解决。';
 }
 if(need==='price')return addressed?'这次的安排能接受，后续补货还要看实际使用。':'货收到了，不过首单的预算压力还在。';
 if(need==='quality'){
  if(!addressed)return '货已收到，不过我在意的批次标准还需要说清楚。';
  if(qualityPoints<0)return '原本约好的品质要求，还得跟进这处问题。';
  return qualityPoints>=2?({hinge:'开合表现和先前说的标准一致，这次的核对有了依据。',tool:'试用结果能和材料说明对上，我会把这份记录留给店员。',handle:'并排装好的效果符合这次标准，门上的细节也看得清楚。'}[product]||'这次的批次表现，让我更敢安排后面的使用。'):'先按这批试用，后面还想再看看批次稳定性。';
 }
 return '';
}

function founderDirection({focus,operations,qualityPoints},hasStaff){
 let line='';
 if(focus==='boutique')line=qualityPoints<0?'精品交付的档案里，也留下了这处没做好的细节。':'精品交付档案里，多了一封讲实际使用的回信。';
 if(focus==='brand')line=qualityPoints<0?'印着自家名字的包装旁，添上了待改的外观细节。':'自家品牌的样册旁，添上了这次实际使用的回信。';
 if(operations==='network')line+='外部协作的交付资料也已归到同一处。';
 if(operations==='team')line+=hasStaff?'这次收尾顺着已有分工完成。':'交接页暂时仍由你自己填完。';
 return line;
}

function teamEcho(input,index,checked){
 const {stage,staffIds,need,qualityPoints}=input;
 if(input.weekend)return '你把回信和这一笔的记录放在一起，留待下个工作日核对。同事今天不必到场，周末的剩余时间仍由自己安排。'+(stage==='founder'?founderDirection(input,false):'');
 const ids=Array.isArray(staffIds)?staffIds:[];
 // Managers cannot join the startup. Being a friend is not being an employee.
 const available=PEOPLE.filter(p=>p.recruit&&TEAM_LINES[p.id]&&(stage==='employee'||ids.includes(p.id)));
 let line;
 if(available.length){
  const preferred=qualityPoints<0||checked||need==='quality'?'xia':need==='price'?'tang':'zhou';
  const colleague=available.find(p=>p.id===preferred)||available[index%available.length];
  const lines=TEAM_LINES[colleague.id];
  line=qualityPoints<0?lines.defect:checked?lines.checked:lines.ordinary[index];
 }else{
  line=qualityPoints<0?'工作室里，你把瑕疵照片留在桌上，这单还有要跟进的地方。':index===0?'工作室里，你读完回信，才把这笔订单的样品放回架上。':'工作室安静下来，你又看了一眼客户写下的实际用途。';
 }
 return line+(stage==='founder'?founderDirection(input,available.length>0):'');
}

/**
 * A deterministic, read-only view of a settled order, not a second simulation.
 * product: hinge | tool | handle; shipmentId: normal | qc | express;
 * factoryId: steady | credit | value; need: quality | price | speed;
 * stage: employee | founder; focus: null | boutique | brand;
 * operations: null | team | network; staffIds: recruited PEOPLE ids;
 * qualityPoints/planPoints: final settlement values; completed includes this order.
 * Plan 2 can also be a legacy founder match, so it never implies a specific tactic.
 * Returns only {title, customer, team}; no rewards, state changes or randomness.
 */
export function deliveryStory(input={}){
 const index=variation(input.completed);
 const product=PRODUCTS.find(p=>p.id===input.product);
 const scene=product?PRODUCT_SCENES[product.id]||FALLBACK_SCENE:FALLBACK_SCENE;
 const flawed=input.qualityPoints<0;
 const highQuality=Number.isFinite(input.qualityPoints)&&input.qualityPoints>=2;
 const staffedQuality=input.stage==='founder'&&Array.isArray(input.staffIds)&&input.staffIds.includes('xia');
 const inspected=input.shipmentId==='qc'||staffedQuality;
 const checked=!flawed&&highQuality&&inspected;
 let title=scene.titles[index];
 if(flawed)title='回信里的一处小瑕疵';
 else if(input.need==='speed'&&input.shipmentId==='express')title='急用的货先到了';
 else if(checked)title='核查有了回音';
 const usage=flawed?scene.defect:highQuality?scene.good[index]:scene.ordinary;
 let inspection='';
 if(checked)inspection='实物和核查记录对得上，这份仔细我看到了。';
 else if(!flawed&&inspected&&input.factoryId==='value'&&input.qualityPoints>0)inspection='新厂这批出货前补了外观复核，先从试用看起。';
 return {title,customer:usage+inspection+customerPriority(input),team:teamEcho(input,index,checked)};
}


// One recorded moment at exact milestones, not a reward or a completion flag.
export function deliveryMilestone(input={}){
 const {stage,completed,startupOrders,qualityPoints,planPoints}=input;
 let line='';
 if(stage==='employee'&&completed===1)line='第一封交付回信：你跟进的询盘，已经变成别人手里真正用得到的东西。';
 if(stage==='employee'&&completed===3)line='三笔交付留下了自己的判断。要不要创业、什么时候出发，仍可以等准备充分再决定。';
 if(stage==='founder'){
  const moments={
   1:'第一笔独立交付落定。公司的名字第一次和一份完成的记录放在一起，不再只是筹备页上的设想。',
   3:'三笔独立交付，积成了一小叠实际记录。你开始能用做过的事情，解释自己的公司怎样接住一份托付。',
   6:'六笔独立交付。从前需要反复核对的几项安排，现在已有自己的依据；下一次合作的边界，也可以由你认真提出。',
   10:'第十笔独立交付留下了记录。公司的大小不是唯一的刻度，哪些生意值得接、哪些时间想留给生活，仍由你决定。'
  };
  if(Number.isSafeInteger(startupOrders)&&startupOrders>0&&startupOrders<=completed)line=moments[startupOrders]||'';
 }
 if(!line)return '';
 if(qualityPoints<0)line+='这份记录也有尚待跟进的瑕疵，成长不等于每一次都毫无差错。';
 else if(planPoints===1)line+='尚未回应到的客户顾虑，也留在记录里，没有因为回款就被抹掉。';
 return line;
}
