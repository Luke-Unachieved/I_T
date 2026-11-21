import {openingRepeatComicScope} from './deal-room-opening-repeat-scope.js';

const story = {
 mira:{
  name:'米拉',
  inquiry:['mira-repeat-inquiry','米拉取出橱窗里的旧样灯，看向邻近的空展示台。','上回那盏灯先照样做，别换光色。我还想补几盏，空出来的位置正好能摆下。'],
  inspection:['mira-rollout-inspection','米拉把到货的新灯和店里的样灯并排点亮。','我先把两盏灯一起开着，比一比暖光。'],
  paid:['mira-repeat-paid','米拉把原款灯留在架旁，在柜台收好回执。','这次还是原来的暖光。回执我放回那只夹子，下回找得到。']
 },
 samir:{
  name:'萨米尔',
  inquiry:['samir-repeat-inquiry','萨米尔把旧样杯和一张未套上的纸套摆在一起。','之前那款杯子还能补吧？杯盖手感照旧，包装也按上回的来。'],
  inspection:['samir-ready-inspection','萨米尔从箱里取出素面保温杯，检查硬质旋盖。','这批还是无印字的。我先看看杯盖合不合。'],
  brandedInspection:['samir-branded-regular-inspection','萨米尔拆开纸箱，顺着定制纸套的边检查。','纸套照原样，我先看边上有没有翘。'],
  paid:['samir-ready-paid','萨米尔把素面保温杯放上架，再把单据收好。','这批素面的我另记了一笔。下回补货就照这张单找你。'],
  brandedPaid:['samir-branded-paid','萨米尔把套着纸套的保温杯摆上木架，在旁边的柜台收好单据。','纸套的样我还留着。下回要同款，不用再重新打样。']
 },
 ines:{
  name:'伊内斯',
  inquiry:['ines-repeat-inquiry','伊内斯检查旧桌布的包边，把它放在补货备忘旁。','我留了一条上次的布。就照这块补，包边的颜色别变。'],
  inspection:['ines-opening-inspection','伊内斯从箱里抽出一条桌布，展开检查尺寸和包边。','我先量一条，边沿也比一下。忙起来换布，得能跟旧的配上。'],
  paid:['ines-repeat-paid','伊内斯把同款桌布放在架边，在柜台收好这批的单据。','这批和旧的能配上。我把单子留下，哪天再补就照这份。']
 }
};

export function openingRepeatComicView(state,selected){
 const scope=openingRepeatComicScope(state,selected);
 if(!scope)return '';
 const record=story[scope.clientId],slot={inquiry:'inquiry','delivery-due':'inspection',paid:'paid'}[scope.stage];
 if(!record||!slot)return '';
 const key=scope.clientId==='samir'&&scope.specification==='branded'&&slot!=='inquiry'?'branded'+slot[0].toUpperCase()+slot.slice(1):slot;
 const item=record[key];if(!item)return '';
 const [asset,description,voice]=item,size=asset==='samir-branded-paid'?[1774,887]:[1440,720];
 return '<div class="ws-opening-comic-stage" data-repeat-comic-stage="'+scope.stage+'"><figure class="ws-equipment-comic"><img class="pv-art" src="assets/deal-client-comic-'+asset+'.webp" width="'+size[0]+'" height="'+size[1]+'" loading="lazy" alt="'+description+'"><figcaption>'+description+'</figcaption></figure><blockquote class="ws-opening-comic-voice"><p>'+voice+'</p><footer>'+record.name+'</footer></blockquote></div>';
}
