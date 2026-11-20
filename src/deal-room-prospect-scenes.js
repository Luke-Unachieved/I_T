import {prospectExtraScenes} from './deal-room-prospect-scenes-extra.js';
const extraProducts=Object.freeze({'011':'tray','012':'carafe','013':'salad-bowl','014':'serving-tongs','015':'pepper-mill'});
// Extra correspondence, not contract terms. Only read on the individual quote
// after a buyer has agreed to a price, at settlement, or inside a repeat letter.
const scenes={
 '006':[
 '照常规价走吧。会展中心的领班拿着这份报价就能对账，不用再去问布展的人。',
 '这个价我能向餐饮主管交代。等散场清点完托盘，我早点把缺口告诉你。',
 '宴会撤台到半夜，会计拿着你那张单子，一笔笔和各桌领用数核完了。',
 '你留的余地我记得。下一场还没开门，我已经把要补的数单独记下来了。',
 '这次不是开馆那场宴会。两个小展共用一个备餐间，我把两边的领用数合在这封信里。'],
 '007':[
 '就照这个数。周六街坊来拼桌，领班问我外头那几张桌够不够用，我得让她心里有底。',
 '那敢情好，午市买菜的钱不用挪了。我去跟领班说，还是先顾外头那几桌。',
 '午市收桌后，我妈把最后一张送货单从围裙里掏出来。好了，货对上了，款也结了。',
 '上回你肯让一点，我就没等库房见底。这次来信的时候，店里还有得用。',
 '翻柜台本时我还笑呢，领班怕我忘，拿红笔圈了个「外桌」。上次的规格没抄错吧？咱们先对一遍。'],
 '008':[
 '行，我这就给表姐拍一张。她那边夹青菜，我这边夹虾，俩摊挨得再近，夹子也不能串。',
 '这下不用跟表姐凑着买、轮着用了。钱我俩各记各的，你不用替我们拆两张单。',
 '夜市一收，表姐来数她那摊的餐夹。两边的数加起来正好，这回没有一把记错账。',
 '表姐把上回那张低一点的报价夹在摊账里。还没到忙的时候，她就问我能不能再找你。',
 '表姐把她那页摊账拍来了。我一瞧，她连「菜摊的别拿去夹虾」都给我写上了。先对规格，数我俩自己分。'],
 '009':[
 '好。抬头留餐饮组，别写道具组。上回有人在盒饭台借了张桌子，会计追着我问了半天。',
 '这个数能交代了。我把报价转给现场制片，他正等着锁餐车的单子，省得开机了还满场找他。',
 '财务终于找到那张收货单了：没在制片办公室，在餐车副驾驶的夹板上。',
 '上回的价给餐车留了点余量。这次还没换外景地，制片就让我先联系你。',
 '上次你找得到盒饭台，这回可别照旧地址跑。组里要出外景，餐车停哪儿我再发，收货还是找我们餐饮组。'],
 '010':[
 '好，就按这一批。小院开门了不等于每张桌都有人坐，管家说先把早餐那几桌摆齐。',
 '这价管家能松口气。送的时候让车停巷口吧，院门窄，我叫人出来接。',
 '客人退房以后，我有空把早餐间的箱子逐一打开了。货和账都是对的。',
 '上回少付的那一点，老板在采购本边画了记号。这次排早餐，他先让我来问你。',
 '上回说送早餐间，你还记得吧？这次街坊也来订早饭，我先把天井里的桌数一遍，不照房间数报给你。'],
 '018':[
 '临街吧台我自己看着。先按这个价，午后没那么忙，我再慢慢核每箱多少。',
 '这个价我不用再找合伙人商量了。下回还缺，我会趁早班开机前找你。',
 '早班交接时我看见了那张回执，就压在磨豆机旁的记事本下面。',
 '你上次让我少跑了一趟合伙人的办公室。这次还没用完，我先把要补的量算给你。',
 '早班同事把上次收货的记事本翻给我看，规格不用重问。这回只核新单的数量。']
};
export function prospectSceneLine(id,stage,option,productId){
 const row=Object.hasOwn(scenes,id)?scenes[id]:Object.hasOwn(extraProducts,id)&&extraProducts[id]===productId?prospectExtraScenes[id]:null;if(!row)return '';
 if(stage==='repeat')return row[4];
 if(option!=='concession'&&option!=='quote')return '';
 const i=stage==='agreed'?0:stage==='paid'?2:-1;
 return i<0?'':row[i+(option==='concession'?1:0)];
}


const clientStories=Object.freeze({
 '006':{product:'tray',
  quote:['assets/deal-client-comic-006-quote.webp','散场后还有一笔账','宴会散场后，会展买手和会计一起对领用单。'],
  concession:['assets/deal-client-comic-006-concession.webp','开门前记下的缺口','下一场宴会还没开门，会展买手先把托盘缺口记了下来。']},
 '007':{product:'carafe',
  quote:['assets/deal-client-comic-007-quote.webp','围裙里的最后一张单','午市收桌后，玛丽索尔的母亲从围裙口袋找出最后一张送货单。'],
  concession:['assets/deal-client-comic-007-concession.webp','壶还没用完','架上还有水壶，玛丽索尔已经在写下一次补货的来信。']},
 '008':{product:'serving-tongs',quote:['assets/deal-client-comic-008-quote.webp','两家摊各点各的','夜市收摊后，林俊和表姐分别点数各摊的餐夹。'],
  concession:['assets/deal-client-comic-008-concession.webp','摊账里夹着的报价','林俊把旧报价夹进摊账，表姐趁夜市还不忙问起补货。']},
 '009':{product:'serving-tongs',
  quote:['assets/deal-client-comic-009-quote.webp','餐车里找着了','弗蕾娅在餐车副驾找到那张收货单，拿去和会计核对。'],
  concession:['assets/deal-client-comic-009-concession.webp','还没换外景地','餐车还停在原片场，制片请弗蕾娅先问问供货。']},
 '010':{product:'pepper-mill',
  quote:['assets/deal-client-comic-010-quote.webp','等客人退了房','卢卡斯在早餐间逐箱点货，再把研磨器与单据对上。'],
  concession:['assets/deal-client-comic-010-concession.webp','采购本边的记号','老板在采购本边画了个记号，让卢卡斯排早餐时先来问。']},
 '011':{product:'tray',
  quote:['assets/deal-client-comic-011-quote.webp','传菜窗递出来的单','领班把最后一摞托盘推上架，小馆买手从传菜窗接过签收单。'],
  concession:['assets/deal-client-comic-011-concession.webp','露台也点齐了','露台撤完桌，两边用过的托盘各点一遍，小馆买手合上账本。']},
 '012':{product:'carafe',
  quote:['assets/deal-client-comic-012-quote.webp','壶把朝哪边','学生助理检查壶把，把隔挡留回箱里，食堂买手收起签收单。'],
  concession:['assets/deal-client-comic-012-concession.webp','交班本上的歪壶','学生助理点数后，在交班本上画了一把歪壶给晚班留记号。']},
 '013':{product:'salad-bowl',
  quote:['assets/deal-client-comic-013-quote.webp','球馆侧门交接','球馆签收窗旁摆着要交接的一摞沙拉碗。'],
  concession:['assets/deal-client-comic-013-concession.webp','没人排队的时候','洗好的沙拉碗倒扣在台面，附近的出餐区已经安静下来。']},
 '014':{product:'serving-tongs',
  quote:['assets/deal-client-comic-014-quote.webp','夹在席位图背后的单','婚宴侧厅的餐夹和席位图放在一起，领用单从图背露出一角。'],
  concession:['assets/deal-client-comic-014-concession.webp','柜里多的那一把','收台后把餐夹一只只摆好，柜里的是正厅那把，不是多送的。']},
 '015':{product:'pepper-mill',
  quote:['assets/deal-client-comic-015-quote.webp','粗一点还是细一点','领班在小碟里试磨两种粗细的胡椒。'],
  concession:['assets/deal-client-comic-015-concession.webp','这不是给客人看的','负责人把试磨的两碟胡椒当成了展品。']},
 '018':{product:'knock-box',
  quote:['assets/deal-client-comic-018-quote.webp','早班交接时','卢西亚在磨豆机旁翻开记事本，发现下面压着回执。'],
  concession:['assets/deal-client-comic-018-concession.webp','趁没用完先点数','卢西亚清点吧台现有用品，估算下次需要补多少。']}
});
export function prospectComicView(order,status){
 if(status!=='paid'||order?.status!=='paid'||order.kind!=='prospect'||order.prospectRepeat||!Number.isSafeInteger(order.quantity)||order.quantity<=0||!Number.isSafeInteger(order.revenue)||order.revenue<=0||order.delivered!==order.quantity||order.received!==order.revenue)return '';
 const entry=Object.hasOwn(clientStories,order.customerId)?clientStories[order.customerId]:null;
 if(!entry||entry.product!==order.productId||!['quote','concession'].includes(order.optionId)||!Object.hasOwn(entry,order.optionId))return '';
 const [art,title,alt]=entry[order.optionId];
 return '<details class="ws-work-story"><summary>'+title+'</summary><figure><img src="'+art+'" alt="'+alt+'" loading="lazy"></figure></details>';
}
