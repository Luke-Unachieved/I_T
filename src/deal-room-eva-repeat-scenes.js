import {inquirySpeech} from './deal-room-inquiry-layout.js';
import {organicTrayRepeatLetter,organicTrayRepeatOrder} from './deal-room-tray-repeat-proof.js';

export const evaRepeatLetter=(state,row)=>organicTrayRepeatLetter(state,row,'001');
export const evaRepeatOrder=state=>organicTrayRepeatOrder(state,'001');

// Eva's trays are the shallow amber cafeteria model; no scene is shared with
// 006 just because both orders have the tray product ID.
const frames=Object.freeze({
 inquiry:['deal-client-comic-001-repeat-inquiry.webp','伊娃在医院食堂查看原来用的浅琥珀色托盘，把同一只托盘放在夹板旁，后面是空推车。'],
 inspection:['deal-client-comic-001-first-inspection.webp','伊娃从新到的纸箱取出浅琥珀色托盘，叠起两只新盘检查边沿。'],
 reorder:['deal-client-comic-001-reorder-v2.webp','伊娃把浅琥珀色托盘叠放在早餐台旁，再把单据放进分类夹。'],
 'vip-volume':['deal-client-comic-001-vip-volume-v2.webp','伊娃把备用的浅琥珀色托盘留在小推车上，再把单据放进分类夹。']
});
const image=frame=>'<img src="assets/'+frame[0]+'" width="1440" height="720" decoding="async" alt="'+frame[1]+'">';
export function evaRepeatInquiryView(letter){
 const line=letter.vip?`早餐台照常补 ${letter.base} 只就够。要是连备餐间的备用量也一起补，可以报 ${letter.vip} 只，还是这款托盘。`:
  `早餐台还缺这款托盘。麻烦补 ${letter.base} 只，规格和上批一样。`;
 return '<figure class="inquiry-comic">'+image(frames.inquiry)+'<figcaption>'+inquirySpeech(line)+'</figcaption></figure>';
}
export function evaRepeatAcceptedLine(letter,option){
 return option==='vip-volume'&&letter.vip?`好，就订 ${letter.vip} 只。早餐台先用，多的留在备餐间。`:
  `那就补 ${letter.base} 只，先把早餐台的缺口补上。`;
}
export function evaRepeatSpeech(scene){
 const vip=scene.option==='vip-volume';
 if(scene.stage==='waiting')return vip?'到货先送备餐间。我另外留了一辆小推车，装这次多订的盘子。':'到货先送备餐间。平时供早餐用的，这批都放那边。';
 if(scene.stage==='receivable')return vip?'盘子都点齐了。多订的那摞留作备用，尾款按合同的日期付。':'这批托盘都点齐了。早餐台照常用，尾款按合同的日期付。';
 return '';
}
const orderFigure=(frame,caption,kind)=>'<figure class="ws-order-comic ws-order-comic-'+kind+'">'+image(frame)+'<figcaption>'+caption+'</figcaption></figure>';
export function evaRepeatInspectionView(scene){
 return scene?.stage==='inspection'?orderFigure(frames.inspection,'到货抽检（待签收、尾款未收）','inspection'):'';
}
export function evaRepeatPaidView(scene){
 if(scene?.stage!=='paid'||!['reorder','vip-volume'].includes(scene.option))return '';
 const dialogue=scene.option==='vip-volume'?'备用盘就留推车上，早餐忙起来随手能补。单子我也收好了。':'早餐台这批盘子补齐了。签收联和回执我放一块，营养科来查也方便。';
 return orderFigure(frames[scene.option],'「'+dialogue+'」','paid');
}
