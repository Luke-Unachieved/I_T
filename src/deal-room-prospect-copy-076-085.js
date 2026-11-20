// Presentation only. Canonical buyer, stage, and original line must match.
import {prospectContent} from './deal-room-prospect-content.js';

const copy={
 '076':{
  bargain:['营地按时交接借用的东西。要是可以提前送，麻烦把早到几天、总价多多少都写出来。'],
  delivery:['先在车棚外找收银员点箱，棚里还得给客人腾地方还东西。'],
  settlement:['钱付清了，麻烦把回执给营地收银员。他交班时好在这笔旁边画个勾。']},
 '077':{
  bargain:['领队得把货和地图一块儿备好。快的那档能在哪天到、贵多少？不晚我就用常规的。'],
  delivery:['到了先给街区领队打个招呼。客人取地图那阵门口走不动，箱子他会带你换个地方点。'],
  settlement:['这单已经付清。回执发领队一份，他从街上带队回来，正好把那页账补齐。']},
 '078':{
  bargain:['等换乘的人来一阵走一阵，收货不好临时挪。请把早到那档的日期和总价并排写一下。'],
  delivery:['站内导乘员接货。客人整行李那块别堆箱，他过来带你去点。'],
  settlement:['款结清了。回执留给站内导乘员，这班交完不用再叫下一班替我查。']},
 '079':{
  bargain:['早上集合前得把东西理好。快送那档多花多少钱？也写一下常规什么时候到。'],
  delivery:['东西到门口先找生活教练。要是在整队，箱子绕开集合区，留给他另外清点。'],
  settlement:['款已经付完。回执劳烦给生活教练，他把这次生活用品那笔划掉就行。']},
 '080':{
  bargain:['刚定了加场，短租柜台只能在开门前收货。能赶上的那档请写明到货日和价钱。'],
  delivery:['到场馆先找票务员。散场时柜台前都是人，等票务员带去空处再开箱。'],
  settlement:['已经结清。回执给票务员，他清完柜台就能把这笔单独归进去。']},
 '081':{
  bargain:['车队出发的日子定了。常规要是赶不上，把快那档多出来的运费和到货日告诉我。'],
  delivery:['先喊补给站伙计出来点箱。小窗口还得给司机买东西，别先把货摆上去。'],
  settlement:['钱付了。补给站伙计留了收货单，你把回执补给他，这次就齐了。']},
 '082':{
  bargain:['冬训出发日不能随意改。早到那档和常规价差多少？把各自能到的时间写在旁边。'],
  delivery:['箱子找线路教练点。客人出发前在过渡间加衣服，先别在那里开箱。'],
  settlement:['这批款结了。把回执给线路教练，他下撤后对最后一遍单。']},
 '083':{
  bargain:['亭里人少，不能一边取还一边接货。哪天能早一点送？快档的价我也一起看。'],
  delivery:['到了叫服务亭志愿者出来。游客取还用品的入口要留着，箱子请跟他去旁边点。'],
  settlement:['钱付完了。回执给服务亭志愿者，下次值班不用再帮忙找这笔。']},
 '084':{
  bargain:['跑团出发后，停靠亭能空一阵。你把快和慢分别哪天到、各多少钱发来，我看哪档合适。'],
  delivery:['到了先找领跑员。补水的人还得在亭里收拾水袋，货不要往他们脚边放。'],
  settlement:['这单已付清。回执给领跑员一份，他下次来集合时把采购那页收好。']},
 '085':{
  bargain:['能把货价跟运费拆开写吗？橱窗陈列的账分这两栏，我拿回去好核。'],
  delivery:['到店叫陈列店员出来点箱。橱窗还在对照新旧用法，不在玻璃前拆。'],
  settlement:['货款结清了。橱窗下周换不换东西，我先和陈列店员看看，不跟这张单混在一起。']}
};

export function displayProspectCopy076To085(id,stage,original){
 const row=Object.hasOwn(copy,id)?copy[id]:null;
 if(!row||!Object.hasOwn(row,stage)||typeof original!=='string')return original;
 const index=prospectContent(id)?.lines?.[stage]?.indexOf(original);
 return row[stage][index]??original;
}
