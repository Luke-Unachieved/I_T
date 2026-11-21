import {inquirySpeech} from './deal-room-inquiry-layout.js';
import {organicTrayRepeatLetter,organicTrayRepeatOrder} from './deal-room-tray-repeat-proof.js';

export const lukaRepeatLetter=(state,row)=>organicTrayRepeatLetter(state,row,'006');
export const lukaRepeatOrder=state=>organicTrayRepeatOrder(state,'006');

// Each entry is registered only after checking the actual encoded asset.
const art=Object.freeze({
 reorderInquiry:['deal-client-comic-006-reorder-inquiry.webp',1440,720,'卢卡在备餐间查看架上的同款灰色托盘，拿一只旧盘到工作台核对。'],
 vipInquiry:['deal-client-comic-006-vip-inquiry.webp',1440,720,'卢卡先看平时存放灰色托盘的架子，再看看备用推车还有多少空间。'],
 inspection:['deal-client-comic-006-repeat-inspection.webp',1774,887,'卢卡从纸箱取出同款灰色托盘，和原先的托盘叠在一起检查。'],
 reorderPaid:['deal-client-comic-006-reorder-paid.webp',1440,720,'卢卡放下手机，把签收联和回执一起收进纸夹。'],
 vipPaid:['deal-client-comic-006-vip-paid.webp',1774,887,'卢卡把灰色托盘推到会展备餐区，把加订留用的盘子另放一摞，再把一张单据夹进本子。']
});
function picture(frame,lazy=false){
 const [file,w,h,alt]=frame;
 return '<img src="assets/'+file+'" width="'+w+'" height="'+h+'" decoding="async" alt="'+alt+'"'+(lazy?' loading="lazy"':'')+'>';
}
export function lukaRepeatInquiryView(letter){
 const frame=letter.vip?art.vipInquiry:art.reorderInquiry;
 const line=letter.vip?`接下来两场展要用盘。照常补 ${letter.base} 只也行，要是把下一场的备用量一起补上，就报 ${letter.vip} 只。两种都用原来的规格。`:
  `备餐间还用得上这款托盘。麻烦再补 ${letter.base} 只，规格跟上批一样。`;
 const speech=inquirySpeech(line);
 return frame?'<figure class="inquiry-comic">'+picture(frame)+'<figcaption>'+speech+'</figcaption></figure>':speech;
}
export function lukaRepeatAcceptedLine(letter,option){
 return option==='vip-volume'&&letter.vip?`那就加到 ${letter.vip} 只。多的留给下一场，托盘规格不变。`:`好，这次按常规补 ${letter.base} 只。照这个报价把合同发来吧。`;
}
export function lukaRepeatOrderSpeech(scene){
 if(scene.stage==='waiting')return '到货先找我。我拿一只旧盘跟新盘比一下，看能不能叠在一起。';
 if(scene.stage==='receivable')return '新旧托盘叠得上，都点清了。尾款按合同的日期付。';
 return '';
}
const orderFigure=(frame,caption,kind,lazy=false)=>'<figure class="ws-order-comic ws-order-comic-'+kind+'">'+picture(frame,lazy)+'<figcaption>'+caption+'</figcaption></figure>';
export function lukaRepeatInspectionView(scene){
 if(!art.inspection||!scene||!['inspection','paid'].includes(scene.stage))return '';
 const replay=scene.stage==='paid';
 const figure=orderFigure(art.inspection,replay?'交货时，卢卡把新盘和旧盘叠在一起核对规格。':'到货抽检（待签收、尾款未收）','inspection',replay);
 return replay?'<details class="ws-work-story ws-order-comic-replay"><summary>回看验收</summary>'+figure+'</details>':figure;
}
export function lukaRepeatPaidView(scene){
 if(scene?.stage!=='paid')return '';
 const vip=scene.option==='vip-volume',frame=vip?art.vipPaid:art.reorderPaid;
 const dialogue=vip?'多订的托盘单独放了一摞。下一场一开门就能推过去。':'签收联和回执我放一块，下回查起来方便。';
 return frame?orderFigure(frame,'「'+dialogue+'」','paid'):'';
}
