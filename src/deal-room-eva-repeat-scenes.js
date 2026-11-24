import {comicDialogueBlock} from './deal-room-opening-dialogue.js';
import {inquirySpeech} from './deal-room-inquiry-layout.js';
import {organicTrayRepeatLetter,organicTrayRepeatOrder} from './deal-room-tray-repeat-proof.js?v=36';

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
 const line=letter.vip?`光补早餐台的话，${letter.base} 只就够了。备餐间也想留点备用的，麻烦再报个 ${letter.vip} 只的价。两档都要上次那款。`:
  `早餐台这边想再添 ${letter.base} 只托盘，麻烦按上次那款给我报个价。`;
 return '<figure class="inquiry-comic">'+image(frames.inquiry)+'<figcaption>'+inquirySpeech(line)+'</figcaption></figure>';
}
export function evaRepeatAcceptedLine(letter,option){
 return option==='vip-volume'&&letter.vip?`好，就订 ${letter.vip} 只。早餐台先用，多的留在备餐间。`:
  `那就补 ${letter.base} 只，先把早餐台的缺口补上。`;
}
export function evaRepeatSpeech(scene){
 const vip=scene.option==='vip-volume';
 if(scene.stage==='waiting')return vip?'货到了麻烦送到备餐间。多订的那批先不上桌，我留了辆小推车放。':'这批都是早餐台用的。到了麻烦送到备餐间，我在那儿收货。';
 if(scene.stage==='receivable')return vip?'数量对上了。多订的那摞我留着备用，尾款按约好的日子打。':'托盘都点过了，数量没问题。尾款我们按约好的日子打。';
 return '';
}
const orderFigure=(frame,caption,kind)=>'<figure class="ws-order-comic ws-order-comic-'+kind+'">'+image(frame)+'<figcaption>'+caption+'</figcaption></figure>';
export function evaRepeatInspectionView(scene){
 return scene?.stage==='inspection'?orderFigure(frames.inspection,'到货抽检（待签收、尾款未收）','inspection'):'';
}
export function evaRepeatPaidView(scene){
 if(scene?.stage!=='paid'||!['reorder','vip-volume'].includes(scene.option))return '';
 const dialogue=scene.option==='vip-volume'?'备用盘就留推车上，早餐忙起来随手能补。单子我也收好了。':'新旧能摞到一块儿，早班收起来省地方。以后补也别换款。';
 return '<figure class="ws-order-comic ws-order-comic-paid">'+image(frames[scene.option])+'<figcaption class="comic-narration">'+frames[scene.option][1]+'</figcaption></figure>'+comicDialogueBlock('伊娃',dialogue);
}
