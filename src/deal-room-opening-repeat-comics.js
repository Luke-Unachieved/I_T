import {openingRepeatComicScope} from './deal-room-opening-repeat-scope.js';

const story = {
 mira:{
  name:'米拉',
  inquiry:['mira-repeat-inquiry','米拉取出橱窗里的旧样灯，看向邻近的空展示台。','我想补原来那款暖光灯，光色别换。'],
  inspection:['mira-rollout-inspection','米拉把到货的新灯和店里的样灯并排点亮。','我先点一盏新灯，跟样灯比比光色。'],
  paid:['mira-repeat-paid','米拉把原款灯留在架旁，在柜台收好回执。','这批还是原来的暖光，款也付清了。回执我放回旧夹子，下回好找。']
 },
 samir:{
  name:'萨米尔',
  inquiry:['samir-repeat-inquiry','萨米尔把旧样杯和一张未套上的纸套摆在一起。','我想补无印字的那款，杯盖还用原来的。'],
  brandedInquiry:['samir-repeat-inquiry','萨米尔把旧样杯和一张未套上的纸套摆在一起。','我想补带定制纸套的那款，杯型和纸套都照旧。'],
  inspection:['samir-ready-inspection','萨米尔从箱里取出素面保温杯，检查硬质旋盖。','还是无印字的，我先拧一只，看看杯盖合不合。'],
  brandedInspection:['samir-branded-regular-inspection','萨米尔拆开纸箱，顺着定制纸套的边检查。','我先抽一只看看，纸套边上别翘。'],
  paid:['samir-ready-paid','萨米尔把素面保温杯放上架，再把单据收好。','这批无印字的我已经付清，回执留一份，下回补货好找。'],
  brandedPaid:['samir-branded-paid','萨米尔把套着纸套的保温杯摆上木架，在旁边的柜台收好单据。','这笔杯款结清了。我留着这张纸套，下回要同款就照它印。']
 },
 ines:{
  name:'伊内斯',
  inquiry:['ines-repeat-inquiry','伊内斯检查旧桌布的包边，把它放在补货备忘旁。','我还留着原来的布样。补货照它做，尺寸和包边颜色都别换。'],
  inspection:['ines-opening-inspection','伊内斯从箱里抽出一条桌布，展开检查尺寸和包边。','我先量一条，再拿旧布比比包边。两批得能换着用。'],
  paid:['ines-repeat-paid','伊内斯把同款桌布放在架边，在柜台收好这批的单据。','款我付清了。我把这批的单子跟上回放一起，下次照着报。']
 }
};

export function openingRepeatComicView(state,selected){
 const scope=openingRepeatComicScope(state,selected);
 if(!scope)return '';
 const record=story[scope.clientId],slot={inquiry:'inquiry','delivery-due':'inspection',paid:'paid'}[scope.stage];
 if(!record||!slot)return '';
 const key=scope.clientId==='samir'&&scope.specification==='branded'?'branded'+slot[0].toUpperCase()+slot.slice(1):slot;
 const item=record[key];if(!item)return '';
 const [asset,description,voice]=item,size=asset==='samir-branded-paid'?[1774,887]:[1440,720];
 return '<div class="ws-opening-comic-stage" data-repeat-comic-stage="'+scope.stage+'"><figure class="ws-equipment-comic"><img class="pv-art" src="assets/deal-client-comic-'+asset+'.webp" width="'+size[0]+'" height="'+size[1]+'" loading="lazy" alt="'+description+'"><figcaption>'+description+'</figcaption></figure><blockquote class="ws-opening-comic-voice"><p>'+voice+'</p><footer>'+record.name+'</footer></blockquote></div>';
}
