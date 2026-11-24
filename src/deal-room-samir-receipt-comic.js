import {openingDialogueQuote} from './deal-room-opening-dialogue.js';
import {OPENING_TERMS_V2} from './deal-room-opening-calendar.js?v=36';
export function samirOpeningReceiptComic(state){
 const c=state?.contracts?.at(-1);
 if(state?.phase!=='paid'||state.businessRound||state.clientProjectActive||c?.status!=='paid'||c.businessRound||c.projectId||
 c.clientId!=='samir'||c.product!=='不锈钢保温杯'||![state.day,c.signedDay,c.deliveryDay,c.paymentDay].every(n=>Number.isSafeInteger(n)&&n>=1)||
 state.day<c.paymentDay)return '';
 const isReady=c.optionId==='ready',branded=['branded','branded-opening'].includes(c.optionId);
 if(!isReady&&!branded)return '';
 const [prep,lag]=c.openingTermsVersion===2?OPENING_TERMS_V2[c.optionId]:[isReady&&c.signedDay+2<=7?2:5,isReady?0:3];
 if(c.quantity!==(isReady?80:120)||
 c.deliveryDay!==c.signedDay+prep||c.paymentDay!==c.deliveryDay+lag||
 c.optionId==='branded-opening'&&c.deliveryDay>7)return '';
 const art=isReady?'ready':'branded',label=isReady?'无印字保温杯':'套着定制纸套的保温杯';
 const line=isReady
 ?(c.deliveryDay<=7?'开业前刚好送到，柜台那一排杯子不用留空了。':'开业已经过了，这批留给平时补货，账按这一单算。')
 :c.optionId==='branded-opening'?'定制杯正好赶上开业。我把纸套留个样，下回照它印。':'这批是补货。纸套我留个样，下回照它印。';
 return '<div class="ws-opening-comic-stage" data-opening-comic-stage="paid"><figure class="ws-equipment-comic ws-opening-paid"><img class="pv-art" src="assets/deal-client-comic-samir-'+art+'-paid.webp" width="'+(isReady?1440:1774)+'" height="'+(isReady?720:887)+'" loading="lazy" alt="萨米尔把'+label+'摆上木架，又在柜台收好单据"><figcaption class="comic-narration">萨米尔把'+label+'摆上架，回到柜台收好单据。</figcaption></figure><blockquote class="ws-opening-comic-voice"><p>'+openingDialogueQuote(line)+'</p><footer>萨米尔</footer></blockquote></div>';
}
