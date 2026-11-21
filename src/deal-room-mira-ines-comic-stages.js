import {openingContractMilestone} from './deal-room-opening-calendar.js';

const scenes = {
  trialPaid: {
    asset: 'deal-client-comic-mira-trial-paid.webp',
    alt: '米拉在一间门店点亮黄铜台灯，随后把单据收进夹子',
    caption: '米拉先把台灯摆进一家店的橱窗，再把单据收好。',
    speaker: '米拉', line: '先留在这一家。等店员听听客人怎么问，我们再聊下一批。'
  },
  trialInspection: {
    asset: 'deal-client-comic-mira-rollout-inspection.webp',
    alt: '米拉打开纸箱，把一盏新到的黄铜台灯摆到店里的样灯旁',
    caption: '米拉把一盏新灯和店里的样灯并排点亮。',
    speaker: '米拉', line: '橱窗先试一盏。我想看看隔着玻璃，还是不是这个暖色。'
  },
  rolloutInspection: {
    asset: 'deal-client-comic-mira-rollout-inspection.webp',
    alt: '米拉拆箱，把新到的黄铜台灯和店里的同款样灯并排点亮',
    caption: '米拉把新到的灯和样灯并排点亮，核对两盏灯的颜色。',
    speaker: '米拉', line: '先把两盏并排开着。灯要分到三家店，不能一盏偏黄，一盏偏白。'
  },
  rolloutPaid: {
    asset: 'deal-client-comic-mira-rollout-paid.webp',
    alt: '米拉把三家门店的文件夹排在桌上，把单据收进其中一本',
    caption: '米拉把这批铺货的单据归到三家店的文件夹里。',
    speaker: '米拉', line: '往后哪家店想再添灯，我就翻那一本，不必从头把整批都查一遍。'
  },
  inesSeasonPaid: {
    asset: 'deal-client-comic-ines-season-paid.webp',
    alt: '伊内斯把同款包边桌布放上架，然后在桌布旁归档一张单据',
    caption: '伊内斯收好这批桌布，把单据另放一份。',
    speaker: '伊内斯', line: '陈列这批的单子我单独收着。下次换季，就不用重新找规格了。'
  },
  inesRestockPaid: {
    asset: 'deal-client-comic-ines-season-paid.webp',
    alt: '伊内斯把同款包边桌布放上架，然后在桌布旁归档一张单据',
    caption: '伊内斯把这批补货放上架，收好单据。',
    speaker: '伊内斯', line: '这批就按店里补货记。哪边要换桌布，照这份规格找就行。'
  },
  inesSmallPaid: {
    asset: 'deal-client-comic-ines-small-paid.webp',
    alt: '伊内斯铺平米白桌布，把两张交货单分别放进文件夹',
    caption: '伊内斯把两家店的交货单分开归档。',
    speaker: '伊内斯', line: '两家店的单子我分开收着。哪边要补，我好查是哪一批。'
  },
  inesSmall: {
    asset: 'deal-client-comic-ines-opening-inspection.webp',
    alt: '伊内斯从纸箱里抽出棉麻桌布，摊开检查布边',
    caption: '伊内斯抽出一条桌布，摊开量布边。',
    speaker: '伊内斯', line: '先看这条。两家店的桌子一样大，垂下来得差不多才行。'
  },
  inesSeason: {
    asset: 'deal-client-comic-ines-opening-inspection.webp',
    alt: '伊内斯从纸箱里抽出棉麻桌布，摊开检查布边',
    caption: '伊内斯把新到的桌布铺开，沿包边量尺寸。',
    speaker: '伊内斯', line: '这批赶上换陈列了。先看看铺开是什么样，别只看叠起来的颜色。'
  },
  inesRestock: {
    asset: 'deal-client-comic-ines-opening-inspection.webp',
    alt: '伊内斯从纸箱里抽出棉麻桌布，摊开检查布边',
    caption: '伊内斯拿出一条补货桌布，展开核对尺寸和布边。',
    speaker: '伊内斯', line: '这批按平时补货收。先量这一条，别跟店里原来那叠差出一截。'
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
 const [quantity,prep,lag]=timing;
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
 return '<div class="ws-opening-comic-stage" data-opening-comic-stage="'+comic.stage+'"><figure class="ws-equipment-comic ws-opening-'+comic.stage+'"><img class="pv-art" src="assets/'+comic.asset+'" width="1440" height="720" loading="lazy" alt="'+comic.alt+'"><figcaption>'+comic.caption+'</figcaption></figure><blockquote class="ws-opening-comic-voice"><p>'+comic.line+'</p><footer>'+comic.speaker+'</footer></blockquote></div>';
}
