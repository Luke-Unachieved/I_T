// Display only. Select against exact original canonical strings.
import {prospectContent} from './deal-room-prospect-content.js';
const copy={
 '096':{delivery:['到旧仓库先喊开馆值班员。进门那张水泥台留给人看展，去侧面找块地方点箱。','清单先留给值班员。他要比完规格才往水泥台上摆，别随空箱带走。','开馆以后门口有人拍照，先在外头等。值班员出来领你去点这批。'],settlement:['钱付清了。回执发我，值班员手里那张签收单就能归档。','这张单已经结了。下回水泥台换什么，等他们撤完这批陈列再议。']},
 '097':{delivery:['软装店员负责点货。模拟客厅那边要给客人看搭配，箱子请放在她指的位置。','把规格单交给店员。她要拿着跟客厅里留的位置比，纸单别夹进拆出的包材。','有人在里面看搭配时，不用把箱子推过沙发。先叫店员出来接。'],settlement:['本单款已付。回执给软装店员一份，别和客人那张搭配单装在一起。','账清了。下次改的是套搭配，不见得还是这批货，我对完再问。']},
 '098':{delivery:['到了给站内理货员打招呼。边柜旁都是赶车的人，先跟他去里面点箱。','请把规格清单给理货员。小件要点过才上边柜，包装可以带走，单子要留。','赶上进站发车那一拨就先缓缓，理货员出来以后再找空地方卸。'],settlement:['已经付清。回执放理货员的交班单旁边，下一班不用追这笔。','款已经付了。边柜缺多少还要等这班点一下，不跟本单一起算。']},
 '099':{delivery:['到小店喊理货员出来。窗台就一掌宽，给客人试摆的，箱子拿到里面那块空地清点。','单子别跟纸壳一起卷起来。理货员得拿去比窗台那几格到底摆不摆得下。','找不到开箱的地方就先叫人，别压着窗边那摞旧书点货。'],settlement:['货款付过了。签收单夹在店里的进货本，回执给我补在同一页。','这单已经付清。窗台上想留哪几样得试摆过才知道，下次我再给你数。']},
 '100':{delivery:['到馆先找场地同事点箱。沿窗那半层留给陈列，没点清先别把东西往窗边搬。','规格由场地同事核。清单交给他；上半层前先把箱子点齐，不必跟着空包装转一圈。','沿窗正有人看展就先停在下面，场地同事会来带你去接货。'],settlement:['这笔已结，回执给场地同事。他可以跟沿窗展示那张签收联一起收好。','款付清了。等半层的陈列换完再看缺不缺，不先按这张单订。']}
};
export function displayProspectCopy096To100Followups(id,stage,original){
 const row=Object.hasOwn(copy,id)?copy[id]:null;
 if(!row||!Object.hasOwn(row,stage)||typeof original!=='string')return original;
 const index=prospectContent(id)?.lines?.[stage]?.indexOf(original);
 return row[stage][index]??original;
}
