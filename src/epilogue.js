import {LATE_WORK_STORIES} from './work-branches.js';
import {EXTRA_EVENINGS} from './people-expansion.js';
import {PEOPLE} from './content.js';
import {STORY_EVENTS} from './story.js';

// Read-only reflections. Do not award resources, invent old choices, or save a
// second ending state. The last two paragraphs describe the current life, so a
// later hire or a changed relationship is reflected honestly on review.
const REFLECTIONS = {
 first_credit:{
  lead:'你还留着第一次主讲用的那份方案。起初，你担心问题会落到自己身上；后来，能把判断讲清楚，成了客户愿意找你的理由。',
  together:'那次晨会上，你讲谈判，同事补交付。你记住了各自把擅长的事做好时，一份方案会怎样变得完整。如今安排合作，你仍先把分工说清楚。'
 },
 first_contract:{
  pilot:'第一份大机会被你改成了一季试单。期限、范围和采购量都留在纸上。后来再面对诱人的数字，你也会先问：这份承诺，自己接得住吗？',
  open:'你曾让一笔大订单停在谈判桌上，保留了非独家的条件。那份没有立刻换来签字的方案，提醒着你，公司有权选择下一笔生意。'
 },
 direction:{
  boutique:'样品档案里多了一页又一页记录。你选择把每次交付做深，公司的名字便慢慢和具体的标准连在一起。做得多大，仍有商量的余地。',
  brand:'最初那张标签还留在抽屉里。你给自己的系列定下样式，也承担了相应的包装与档案成本。现在看见向海的名字，你知道每个字背后要把哪些事做好。'
 },
 deadline:{
  reserve:'那次船期变化，你为更早的航线付了一笔预留费用。账上看得见这笔支出，备忘里也留下了处理办法。下一次承诺交期，你会先确认还有多少余量。',
  explain:'那次船期变化，你把能做到的数量和日期提前告诉客户。邮件里没有“应该没问题”。你为公司留下了一种习惯：消息难开口时，也别留到最后一天。'
 },
 team:{
  team:'岗位与交接方式被写成了一页纸，谁来做都能看懂。你为这套流程投入过成本，也记住了一个位置应当先有清楚的职责，再去邀请合适的人。',
  network:'你把验货、拍样与文件整理拆开，同外部伙伴分工。公司保留了轻量的协作方式，每一笔交付仍有人把最后一关。'
 },
 aftercare:{
  fieldcheck:'你为签收后的问题投入了一次远程复核，留下能重现差异的记录。货款结清以后仍愿意把结果追完，成了公司承诺的一部分。',
  guide:'你没有在资料不全时猜答案，而是先给客户一张排查页，等待真实反馈。那封尚未结束的信，让你学会给不知道的地方留出位置。'
 },
 legacy:{
  share:'你把这次处理整理成不含客户资料的通用说明。经验走出自己的桌面，也带着适用条件，让下一次合作少一些误解。',
  service:'额外支持被你写成有范围、有时段的服务，基础售后没有被拿走。公司能多做什么、不能答应什么，都比一张更大的报价单更清楚。'
 },
 partnership:{
  independent:'最后一次回到启航的会议室，你把共同的交付标准摆在桌上，也保留了独立发展的空间。合作的起点，已经是双方能为彼此做好什么。',
  regional:'地域、产品与期限被你一项项圈明。区域合作给合页系列带来一条渠道，其他方向仍由你安排。那张名片上的身份，终于和你谈出的条件一致。'
 }
};

const EVENINGS = {
 xia:'收好工作记录后，你给林知夏发了条消息，问周末要不要去早市。你们已经认真确认过彼此的心意，下一次见面仍可以从一件普通的小事开始。',
 zhou:'下班前，你和周屿商量今晚散步走哪条路。你们已经把心意说清楚，见面时可以继续聊生意，也可以把今天的工作留在电脑里。',
 tang:'你和唐澈又提起那本地图册，约好找个晚上慢慢翻。目的地还可以商量，两个人各自的工作和计划，也都留得下位置。',
 shen:'沈照晚问你什么时候有空喝咖啡。离开原来的公司之后，你们已经以平等的身份确认了关系。这一回，你先看自己的安排，再认真回复她。',
 lu:'陆砚舟发来夜市那家热饮摊的位置，问今晚要不要一起走走。合同上的分歧可以留到工作时再谈，见面的安排仍由你们一起决定。'
};

export function careerEpilogue(state={}) {
 const s=state||{},record=s.story?.decisions||{};
 const decisions=STORY_EVENTS.flatMap(event=>{
  const choice=event.choices.find(item=>item.id===record[event.id]);
  const text=choice&&REFLECTIONS[event.id]?.[choice.id];
  return text?[{id:event.id,title:event.title,text}]:[];
 });
 // These are the player's saved words, not new inferred participation or rewards.
 const workReflections=s.stage==='founder'?PEOPLE.flatMap(p=>{
  const event=LATE_WORK_STORIES.find(e=>e.person===p.id),r=event&&s.workStories?.[event.id];
  if(!r||!Number.isSafeInteger(r.day)||r.day<1||r.day>s.day||typeof r.line!=='string'||!r.line||typeof r.reply!=='string'||!r.reply)return [];
  return [{id:event.id,person:p.name,title:event.title,day:r.day,line:r.line,text:r.reply}];
 }):[];
 const hired=s.stage==='founder'&&Array.isArray(s.staff)
  ?PEOPLE.filter(p=>p.recruit&&s.staff.includes(p.id)):[];
 let workplace;
 if(s.stage!=='founder')workplace='启航的工作台上，下一份询盘还等着你打开。先把眼前的事情做好，未来的公司也可以慢慢想。';
 else if(hired.length){
  const tasks=hired.map(p=>({xia:'林知夏核对样品记录',zhou:'周屿整理客户的询价',tang:'唐澈确认工厂的回复'}[p.id]));
  workplace=tasks.join('，')+'。这些位置，是你们分别谈清职责后决定一起做的。'+(s.story?.operations==='team'?'交接页就放在手边，各自做完的部分都有迹可循。':'你把需要配合的事项记下来，再安排下一笔交付。');
 }else if(s.story?.operations==='team')workplace='交接页摆在工作台上，目前仍由你自己填写。流程已经准备好，招聘可以等到遇见愿意加入的人，再认真谈一次。';
 else if(s.story?.operations==='network')workplace='工作室里仍由你掌舵，外部伙伴按分工配合。收好今天的文件，你给自己腾出一块干净的桌面，留给下一份方案。';
 else workplace='工作室里仍由你自己安排订单。下一步要扩大团队，还是保留现在的节奏，可以等你想清楚再决定。';
 const partners=PEOPLE.filter(p=>['male','female'].includes(s.gender)&&p.gender!==s.gender&&s.relations?.[p.id]?.status==='partner'&&(!p.manager||s.stage==='founder'));
 const evening=partners.length===1?EVENINGS[partners[0].id]:'合上电脑，剩下的时间是自己的。今晚可以去海边走走，约朋友吃饭，也可以直接回家休息。这份答卷已经完整，生活还可以继续按你的节奏往前。';
 return {decisions,workReflections,workplace,evening};
}

Object.assign(EVENINGS,EXTRA_EVENINGS);
