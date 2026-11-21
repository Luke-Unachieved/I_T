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
 ?(c.deliveryDay<=7?'开业用的这批杯子先摆上架。先不加印，看看客人喜欢哪一款。':'无印字的杯子放原来的架子上。这个款要再补，我照这张单找你。')
 :c.optionId==='branded-opening'?'开业用的杯子已经上架，纸套照这个版样留一份。':'纸套样我会收好。下回补杯子，就照这版印。';
 return '<div class="ws-opening-comic-stage" data-opening-comic-stage="paid"><figure class="ws-equipment-comic ws-opening-paid"><img class="pv-art" src="assets/deal-client-comic-samir-'+art+'-paid.webp" width="'+(isReady?1440:1774)+'" height="'+(isReady?720:887)+'" loading="lazy" alt="萨米尔把'+label+'摆上木架，又在柜台收好单据"><figcaption>萨米尔把'+label+'摆上架，回到柜台收好单据。</figcaption></figure><blockquote class="ws-opening-comic-voice"><p>'+line+'</p><footer>萨米尔</footer></blockquote></div>';
}
