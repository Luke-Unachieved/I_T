// Display only. Select against exact original canonical strings.
import {prospectContent} from './deal-room-prospect-content.js';
const copy={
 '096':{
  delivery:["到旧仓库叫当班的人出来。进门水泥台边有人看展，绕到侧面再点花瓶。","清单给值班的人。他先核瓶口和高度，再往水泥台上放。空箱带走，纸单留下。","刚开馆门口有人拍照，就先在外头等一下。值班的出来带你去开箱。"],
  settlement:["钱付齐了。值班的人手上还有签收单，回执给我，我一块儿收好。","这批瓶子结了。下一次水泥台摆什么，等撤完这批再问。"]
 },
 '097':{
  delivery:["到了叫负责搭配的店员出来。沙发那边有人看样板间，花盆先在外头点。","单子递给店员，她得看花盆和托碟的规格，别随着空箱带走。","里头有人试坐就别推箱子从沙发边过。店员会出来给你指个空处。"],
  settlement:["店员浇水试过，碟子接得住。款打了，回执给店员一份，别压在客人的搭配单下。","这批结了。下一套客厅怎么搭还没定，我弄明白再来问货。"]
 },
 '098':{
  delivery:["到了叫站里的理货员。边柜旁都是赶车的人，去他指的地方点箱。","挂钩照单点完才能摆，单子递给理货的人，泡纸和空箱另收。","先问北站理货员什么时间方便接，再从边门来。客人赶车就别在柜台边拆。"],
  settlement:["已付款。回执放在理货员的交班材料里，下班不用再找。","挂钩款齐了。下次边柜缺什么先让当班的人数，不跟这一张单并。"]
 },
 '099':{
  delivery:["到店叫理货的人，他出来点箱。窗台留给客人试摆，不是拆包的地方。","单子别跟纸壳卷走。理货的人得比窗台上的空位来核钟的尺寸。","找不到开箱的地方就在门外叫我。别拿箱角去压窗边的旧书。"],
  settlement:["钱已经付了。签收单夹在进货本里，回执发我，我也夹进去。","小钟这单清了。窗边还要试挂一轮，差哪款我到时另问你。"]
 },
 '100':{
  delivery:["到馆门口叫场地的人先收。窗边半层有人看陈列，箱子在楼下点完再搬。","单子交场地同事核篮子规格。等他把箱数点齐，我们再一起上货梯。","半层有人看展就先停在下面。场地的人会下来带你去点货。"],
  settlement:["这笔付了，回执给场地同事，跟窗边那一批的签收单放一块儿。","编织篮这单清了。等半层的陈列换完，缺几个我再找你，不照旧单先订。"]
 }
};
export function displayProspectCopy096To100Followups(id,stage,original){
 const row=Object.hasOwn(copy,id)?copy[id]:null;
 if(!row||!Object.hasOwn(row,stage)||typeof original!=='string')return original;
 const index=prospectContent(id)?.lines?.[stage]?.indexOf(original);
 return row[stage][index]??original;
}
