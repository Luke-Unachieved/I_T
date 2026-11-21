export function samirOpeningReceiptComic(state){
 const c=state?.contracts?.at(-1);
 if(state?.phase!=='paid'||state.businessRound||state.clientProjectActive||c?.status!=='paid'||c.businessRound||c.projectId||
 c.clientId!=='samir'||c.product!=='不锈钢保温杯'||![state.day,c.signedDay,c.deliveryDay,c.paymentDay].every(n=>Number.isSafeInteger(n)&&n>=1)||
 state.day<c.paymentDay)return '';
 const isReady=c.optionId==='ready',branded=['branded','branded-opening'].includes(c.optionId);
 if(!isReady&&!branded||c.quantity!==(isReady?80:120)||
 c.deliveryDay!==c.signedDay+(isReady&&c.signedDay+2<=7?2:5)||c.paymentDay!==c.deliveryDay+(isReady?0:3)||
 c.optionId==='branded-opening'&&c.deliveryDay>7)return '';
 const art=isReady?'ready':'branded',label=isReady?'无印字保温杯':'套着定制纸套的保温杯';
 const line=isReady
 ?(c.deliveryDay<=7?'这批无印字的赶上开业了，正好摆在柜台上。货到那天我就付清了。':'这批无印字的我留着补货，款已经结了。再缺货，我照这张单找你。')
 :c.optionId==='branded-opening'?'定制杯赶上开业了，货款也付清了。我留一张纸套，下回照这个样印。':'这批定制杯是补货用的，货款付清了。我把纸套留个样，下回照它印。';
 return '<div class="ws-opening-comic-stage" data-opening-comic-stage="paid"><figure class="ws-equipment-comic ws-opening-paid"><img class="pv-art" src="assets/deal-client-comic-samir-'+art+'-paid.webp" width="'+(isReady?1440:1774)+'" height="'+(isReady?720:887)+'" loading="lazy" alt="萨米尔把'+label+'摆上木架，又在柜台收好单据"><figcaption>萨米尔把'+label+'摆上架，回到柜台收好单据。</figcaption></figure><blockquote class="ws-opening-comic-voice"><p>'+line+'</p><footer>萨米尔</footer></blockquote></div>';
}
