import {openingContractMilestone} from './deal-room-opening-calendar.js';

function inspectionComic(scene,alt,caption){
 return `<figure class="ws-equipment-comic ws-opening-inspection"><img class="pv-art" src="assets/deal-client-comic-${scene}-inspection.webp" width="1440" height="720" loading="lazy" alt="${alt}"><figcaption class="comic-narration">${caption}</figcaption></figure>`;
}

export function openingInspectionView(state){
 const contract=openingContractMilestone(state)?.contract;
 if(contract?.status==='fulfilling'&&contract.clientId==='samir'&&contract.optionId==='ready'&&
    contract.product==='不锈钢保温杯'&&state.day===contract.deliveryDay){
  const comic=inspectionComic(
   'samir-ready',
   '萨米尔从打开的纸箱里拿出没有纸套的金色保温杯，然后检查深绿色杯盖',
   '萨米尔从纸箱里取出无印字的保温杯，试了试杯盖。'
  );
  return `${comic}
 <blockquote class="ws-opening-inspection-dialogue">“我先拧开一只，试试杯盖合不合。”</blockquote>`;
 }
 if(contract?.status!=='receivable'||state.day<contract.deliveryDay)return '';
 if(contract.clientId==='mira'&&contract.optionId==='rollout'&&contract.product==='便携台灯'){
  return inspectionComic('mira-rollout','米拉拆开纸箱，把到货的便携台灯和店里的同款样灯并排点亮','米拉把新到的台灯和店里的样灯摆在一起，比了比灯光。');
 }
 if(contract.clientId!=='samir'||contract.product!=='不锈钢保温杯')return '';
 if(contract.optionId==='branded'){
  const comic=inspectionComic(
   'samir-branded-regular',
   '萨米尔拆开箱子，检查金色保温杯上的橄榄枝纸套是否服帖',
   '萨米尔从箱里拿出一只保温杯，顺着纸套的边摸了一圈。'
  );
  return `${comic}
 <blockquote class="ws-opening-inspection-dialogue">“纸套边上没翘。这批我留着补货，收货后 ${contract.paymentDay-contract.deliveryDay} 天付清。”</blockquote>`;
 }
 if(contract.optionId!=='branded-opening'||contract.deliveryDay>7)return '';
 const comic=inspectionComic(
  'samir-branded-opening',
  '萨米尔从纸箱里拿出套着橄榄枝纹样纸套的金色保温杯，然后拧回深绿色杯盖',
  '萨米尔从到货箱里取出套着定制纸套的保温杯，又把杯盖拧了回去。'
 );
 return `${comic}
 <blockquote class="ws-opening-inspection-dialogue">“这批是开业用的，纸套是我选的那版。杯盖我也试过了，收货后 ${contract.paymentDay-contract.deliveryDay} 天我付清。”</blockquote>
 <div class="ws-signed-status"><strong>待收货款</strong><span>¥${contract.balanceDue.toLocaleString('zh-CN')}</span></div>`;
}
