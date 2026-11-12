// Cross-chapter consequences. Existing choice ids remain stable.
// Called only for new decisions; old saves without a recorded scene keep the original text.
export function careerBranch(e,s){
 const d=s.story?.decisions||{};
 const echo=(source,lines)=>{if(!Object.hasOwn(lines,d[source]))return false;e.branch=`career:${source}:${d[source]}`;e.scene=lines[d[source]]+'\n\n'+e.scene;return true;};
 if(e.id==='first_contract')echo('first_credit',{
  lead:'第一次晨会之后，你成了这类询盘的主对接人。陆砚舟先请你说判断，唐澈等你讲完，才把产能表推过来。能独立主讲，并不意味着必须独自担下所有承诺。',
  together:'第一次晨会上你们分开讲了谈判和交付。这次，唐澈主动把产能表发到小组里，周屿则先整理客户的问题。陆砚舟把最后的条件留给你判断：一起准备，仍需要有人把范围说清。'
 });
 if(e.id==='direction')echo('first_contract',{
  pilot:'离职交接时，你把那份一季试单的执行记录留给了启航，没有带走客户资料。属于你的经验是另一件事：一项承诺可以先做小，验证以后再扩大。现在，这个习惯要用在自己的公司上。',
  open:'离职交接时，你把非独家客户的后续安排写清，没有带走原公司的名单。那次拒绝长期绑定的决定仍然有用：公司要留出选择下一笔生意的空间，也要有别人愿意选择它的理由。'
 });
 if(e.id==='deadline'){
  if(echo('direction',{
   boutique:'客户找你，不只是为了买到同样的五金。他把开业排期交给了你的交付标准。船期改变后，精品路线要回答的不是一句“我很可靠”，而是眼下到底哪一批、哪一天能到。',
   brand:'顾予宁将两批标签分开放好：“赶不上同一条船，就不要在包装里写同一个预计上架日。”这是自有系列第一次遇到交期变化。你既要安排货，也要决定自己的名字怎样面对一份未完成的承诺。'
  })){
   e.choices[0].outcome+=d.direction==='brand'?' 顾予宁把急用批次的说明单独标清，没有用一张好看的总标签盖住两种交付时间。':' 客户把这份分批排期留作开业准备表。你的服务标准第一次有了应付意外的实例。';
   e.choices[1].outcome+=d.direction==='brand'?' 你同步修订系列说明和上架日期，让包装与邮件说同一件事。品牌没有替你免去解释，却让解释有了一个一致的出口。':' 你把真实到货日期补进交付档案。信任没有变成免责条款，而是让对方更早知道如何安排。';
  }
 }
 if(e.id==='team'){
  if(echo('deadline',{
   reserve:'那次你付费预留的航线已经完成交付，唐澈整理的备忘也留了下来。如今重新整理岗位，可以复用那份排期检查表，少做一轮重复核对；但谁拥有最后确认权，还要重新谈。',
   explain:'那次分批交付留下了一长串往来邮件。客户一直知道下一步是什么，你自己却花了不少时间逐条解释。公司需要把这份耐心变成能交接的办法，不能只靠某一个人随时在线。'
  })&&d.deadline==='reserve'){
   e.choices[0].label='投入 ¥550，复用排期表并建立交接流程';
   e.choices[0].detail='现金 −¥550（已有排期表节省 ¥150 整理费）；每位正式员工使每单合同额额外 +¥120。仍需分别邀请。';
   e.choices[0].effects.cash=-550;
   e.choices[0].outcome='你复用了上次留下的排期检查表，少花 ¥150 重复整理费，再把职责、待遇和最终确认人写清。林知夏指出一个容易漏掉的环节，你给那一栏留了足够空间。准备流程不是把人填进格子，而是让对方看见自己能决定什么。';
  }
 }
 if(e.id==='partnership'){
  if(echo('first_contract',{
   pilot:'陆砚舟翻出当年由你提出的一季试单框架。客户资料仍属于启航，但那份公开的条款模板能够再次使用。他说：“范围和期限，你以前就谈得很清楚。这次要不要以同样的办法，试一条属于双方的新渠道？”',
   open:'沈照晚记得你当年保留非独家条件的那封邮件。没有被一张大单绑定，让你有机会接触不同需求。今天启航拿出的方案也保留边界，不要求你用整个公司的未来换这一季的合作。'
  })&&d.first_contract==='pilot'){
   e.choices[1].detail='首批样品档案服务费 +¥1,700（包含复用试单框架的整理服务）；今后合页订单合同额额外 +¥600。';
   e.choices[1].effects.cash=1700;
   e.choices[1].outcome='你沿用自己熟悉的一季试行框架，重新限定地域、产品和期限，没有复制旧客户资料。对方为样品档案和框架整理一并支付 ¥1,700。沈照晚把你的名片收好：“这个报价，写清了你真正做的事。”';
  }
 }
 return e;
}
