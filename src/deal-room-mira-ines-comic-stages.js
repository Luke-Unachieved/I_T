import {openingDialogueQuote} from './deal-room-opening-dialogue.js';
import {openingContractMilestone,OPENING_TERMS_V2} from './deal-room-opening-calendar.js';

const scenes = {
  trialPaid: {
    asset: 'deal-client-comic-mira-trial-paid.webp',
    alt: '米拉在一间门店点亮黄铜台灯，随后把单据收进夹子',
    caption: '米拉先把台灯摆进一家店的橱窗，再把单据收好。',
    speaker: '米拉', line: '这笔我已经付清了。我先在这家摆上，卖得怎么样，回头跟你说。'
  },
  trialInspection: {
    asset: 'deal-client-comic-mira-rollout-inspection.webp',
    alt: '米拉打开纸箱，把一盏新到的黄铜台灯摆到店里的样灯旁',
    caption: '米拉把一盏新灯和店里的样灯并排点亮。',
    speaker: '米拉', line: '我先拿一盏跟样灯比比。光色一样，我就摆进橱窗试试。'
  },
  rolloutInspection: {
    asset: 'deal-client-comic-mira-rollout-inspection.webp',
    alt: '米拉拆箱，把新到的黄铜台灯和店里的同款样灯并排点亮',
    caption: '米拉把新到的灯和样灯并排点亮，核对两盏灯的颜色。',
    speaker: '米拉', line: '分到三家店的灯，不能有的偏黄、有的偏白。以后补货也得是这个光色。'
  },
  rolloutPaid: {
    asset: 'deal-client-comic-mira-rollout-paid.webp',
    alt: '米拉把三家门店的文件夹排在桌上，把单据收进其中一本',
    caption: '米拉把这批铺货的单据归到三家店的文件夹里。',
    speaker: '米拉', line: '三家店的账都在我这儿，你们对一笔就行。'
  },
  inesSeasonPaid: {
    asset: 'deal-client-comic-ines-season-paid.webp',
    alt: '伊内斯把同款包边桌布放上架，然后在桌布旁归档一张单据',
    caption: '伊内斯收好这批桌布，把单据另放一份。',
    speaker: '伊内斯', line: '换季那批的尾款我付了。我把单子留着，下次还要这款就照它报。'
  },
  inesRestockPaid: {
    asset: 'deal-client-comic-ines-season-paid.webp',
    alt: '伊内斯把同款包边桌布放上架，然后在桌布旁归档一张单据',
    caption: '伊内斯把这批补货放上架，收好单据。',
    speaker: '伊内斯', line: '这批补货的尾款我付了。我把规格存好，店里再缺就按这份补。'
  },
  inesSmallPaid: {
    asset: 'deal-client-comic-ines-small-paid.webp',
    alt: '伊内斯铺平米白桌布，把两张交货单分别放进文件夹',
    caption: '伊内斯把两家店的交货单分开归档。',
    speaker: '伊内斯', line: '两家店我先各摆一点，哪家卖得快，我再找你补。'
  },
  inesSmall: {
    asset: 'deal-client-comic-ines-opening-inspection.webp',
    alt: '伊内斯从纸箱里抽出棉麻桌布，摊开检查布边',
    caption: '伊内斯抽出一条桌布，摊开量布边。',
    speaker: '伊内斯', line: '我先量一条，再比比包边。给两家店的都按同一个样来。'
  },
  inesSeason: {
    asset: 'deal-client-comic-ines-opening-inspection.webp',
    alt: '伊内斯从纸箱里抽出棉麻桌布，摊开检查布边',
    caption: '伊内斯把新到的桌布铺开，沿包边量尺寸。',
    speaker: '伊内斯', line: '这批赶上换季陈列了。我先铺一条量量，尺寸对了就能摆出去。'
  },
  inesRestock: {
    asset: 'deal-client-comic-ines-opening-inspection.webp',
    alt: '伊内斯从纸箱里抽出棉麻桌布，摊开检查布边',
    caption: '伊内斯拿出一条补货桌布，展开核对尺寸和布边。',
    speaker: '伊内斯', line: '这批留作平时补货。我先量一条，得跟店里原来的尺寸对得上。'
  }
};
const day = n => Number.isSafeInteger(n) && n >= 1;
const format = {
  mira: {product:'便携台灯', trial:[60,3,0], rollout:[120,5,4]},
  ines: {product:'棉麻桌布', small:[50,3,0], season:[150,5,6]}
};

export function openingMiraInesComicStage(state){
 const c=state?.contracts?.at(-1);
 if(!c||state.businessRound||state.clientProjectActive||c.businessRound||c.projectId||!day(state.day))return null;
 if(!Object.hasOwn(format,c.clientId))return null;
 const model=format[c.clientId], timing=Object.hasOwn(model,c.optionId)&&model[c.optionId];
 if(!Array.isArray(timing)||c.product!==model.product||!day(c.signedDay)||!day(c.deliveryDay)||!day(c.paymentDay))return null;
 const [quantity,legacyPrep,legacyLag]=timing;
 const [prep,lag]=c.openingTermsVersion===2?OPENING_TERMS_V2[c.optionId]:[legacyPrep,legacyLag];
 if(c.quantity!==quantity||c.deliveryDay!==c.signedDay+prep||c.paymentDay!==c.deliveryDay+lag)return null;
 let stage, scene;
 if(state.phase==='paid'&&c.status==='paid'&&state.day>=c.paymentDay){
  stage='paid';
  if(c.clientId==='mira')scene=c.optionId==='trial'?scenes.trialPaid:scenes.rolloutPaid;
  else if(c.optionId==='small')scene=scenes.inesSmallPaid;
  else scene=c.deliveryDay<=11?scenes.inesSeasonPaid:scenes.inesRestockPaid;
 } else {
  const due=openingContractMilestone(state);
  if(!due?.delivery||state.day<due.day)return null;
  stage='inspection';
  if(c.clientId==='mira'){
   scene=c.optionId==='trial'?scenes.trialInspection:scenes.rolloutInspection;
  }else scene=c.optionId==='small'?scenes.inesSmall:c.deliveryDay<=11?scenes.inesSeason:scenes.inesRestock;
 }
 return {stage,clientId:c.clientId,optionId:c.optionId,...scene};
}

export function openingMiraInesComicView(state){
 const comic=openingMiraInesComicStage(state);
 if(!comic)return '';
 return '<div class="ws-opening-comic-stage" data-opening-comic-stage="'+comic.stage+'"><figure class="ws-equipment-comic ws-opening-'+comic.stage+'"><img class="pv-art" src="assets/'+comic.asset+'" width="1440" height="720" loading="lazy" alt="'+comic.alt+'"><figcaption class="comic-narration">'+comic.caption+'</figcaption></figure><blockquote class="ws-opening-comic-voice"><p>'+openingDialogueQuote(comic.line)+'</p><footer>'+comic.speaker+'</footer></blockquote></div>';
}
