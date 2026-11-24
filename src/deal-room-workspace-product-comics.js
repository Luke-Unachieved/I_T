const directions=Object.freeze({
 mira:['trial','便携台灯','lamp-trial','天一暗，店员点亮了橱窗里的那盏台灯。有人走过，又停下来往里看。','试卖那一批便携台灯亮在一扇橱窗里，有行人放慢脚步。'],
 samir:['branded','不锈钢保温杯','thermos-branded','这批用过的定制纸套留了一张，往后再印有个现成版样。','包装台上留着一张纸套样板，旁边的同款保温杯已经套好。'],
 ines:['small','棉麻桌布','linen-small','两家店各铺了一张。桌边垂下来的，都是同一道浅绿包边。','棉麻桌布在两家门店铺上试卖展示桌。']
});
const marketDirections=Object.freeze({
 tray:['可叠放餐盘托盘','tray','店员托起装着杯盘的托盘，又从摞里抽出一只。','店员先托起装有杯盘的托盘，再从叠盘中抽出一只。'],
 dripper:['陶瓷手冲滤杯','dripper','滤纸贴着杯壁，从玻璃接壶的一侧就能看到水往哪儿落。','陶瓷手冲滤杯在咖啡吧台上，店员用热水检查滤纸与滴落位置。'],
 'luggage-tag':['行李挂牌','luggage-tag','资料盖合上了。店员提起样箱检查挂牌绑带。','样箱挂牌合上资料盖，店员提起样箱检查绑带。'],
 'serving-tongs':['不锈钢餐夹','serving-tongs','试夹的是一片黄瓜。放下以后，店员合上餐夹检查锁扣。','店员夹起一片黄瓜，合拢餐夹后松手检查锁扣。'],
 'pepper-mill':['手摇胡椒研磨器','pepper-mill','同一个磨罐，先粗磨，再细磨。两撮放在白碟上，不用凑近也分得清。','厨师在白碟上试磨粗细两档，并检查研磨器底部。'],
 'knock-box':['咖啡粉渣盒','knock-box','粉饼敲下来，顺手提起内盒一冲。横杆跟着内盒出来，不用伸进底座去抠。','咖啡师敲落粉饼之后，提起带横杆的内盒清洗。'],
 "salad-bowl":["沙拉碗","salad-bowl","先把样碗叠起来，再把洗过的碗倒扣，看看碗底会不会留水。","备菜台上的叠碗和倒扣样碗底部。"],
 "pitcher":["不锈钢拉花缸","pitcher","倒一缸清水试手，收缸时留意水线落在缸嘴哪一边。","吧台人员试倒清水，镜头拉近缸嘴。"],
 "scale":["电子厨房秤","scale","空碗先去皮。再放上核样砝码，拿走后看看刻度回没回零。","放在电子厨房秤上的空碗和测试砝码。"],
 "chopping-board":["双面砧板","chopping-board","翻到另一面试摆，贴着台面看四只防滑脚有没有悬空。","翻转砧板后，从低处查看板底防滑脚。"],
 "apron":["厨房围裙","apron","先试腰带系在哪儿，再用餐具压住口袋，看看袋口的线。","试系围裙腰带并查看装有餐具的袋口。"],
 "oven-mitt":["隔热烤箱手套","oven-mitt","把袖口翻开看衬层，再戴着手套握一下盘边。","翻开隔热手套的袖口，随后隔着手套握住烤盘。"],
 "bath-mat":["浴室地垫","bath-mat","掀角看一眼防滑底。洗过再铺回去，顺着地面看边有没翘。","地垫防滑底与平铺后贴近地面的边缘。"],
 "pillowcase":["枕套","pillowcase","放进样枕，翻过来看搭口能遮住枕芯多少。","客房人员装入枕芯并从背面检查搭口。"],
 "bookend":["书立","bookend","把压斜的一排书扶起来，再低头看书立脚垫贴不贴架面。","书立顶住样书，近处可见底部与架面。"],
 "laptop-stand":["折叠笔记本支架","laptop-stand","展开卡稳再摆样机；拿走样机，收回支臂看看脚垫。","展开的银色支架与收拢后露出的脚垫。"],
 "display-board":["桌面展示板","display-board","旧纸样从侧槽抽出来，新纸样沿着同一道槽换进去。","从透明展示板边槽装入、抽换纸样。"],
 "file-box":["文件收纳盒","file-box","把样夹插进去，再扣住提孔抬一抬，看看两个盒子叠在哪儿受力。","文件夹放进纸盒，手扣住提孔抬至另一纸盒上方。"],
 "stapler":["桌面订书机","stapler","把约好厚度的样纸推进去，按完翻过来看看钉脚怎么折。","订书机咬住样纸，近景查看纸背的折脚。"],
 "passport-cover":["护照夹","passport-cover","拿一本空白尺寸样册试插试抽，留意袋口有没有蹭到纸边。","空白样册插入护照夹，随后抽出观察纸边。"],
 "neck-pillow":["旅行颈枕","neck-pillow","拆开压缩袋先等枕身松开，再翻到贴颈的一面看内缝。","颈枕从压缩袋取出，随后靠近内侧接缝观察。"],
 "umbrella":["折叠雨伞","umbrella","店员在门廊下检查伞杆，把伞收起来试装进伞套。","门廊里检查伞杆并试把收好的伞装入套内。"],
 "packing-cube":["行李分装袋","packing-cube","隔着网面找衣物。装到约定厚度，再把拉链拉过转角。","网面分装袋里叠着衣物，手在袋角试拉拉链。"],
 "vase":["窄口花瓶","vase","往细颈瓶里加一点水，放进一枝花，再低头看底部和台面交界。","细颈瓶试水插花与瓶底贴住台面的近景。"],
 "planter":["带接水碟花盆","planter","给花盆浇一点水，顺着排水口看接水碟和盆底怎么搭。","窗台上给样盆试水，近处查看底孔和接水碟。"],
 "coat-hook":["壁挂衣帽钩","coat-hook","先在样板墙对齐孔位，再用一段织带看看挂钩边缘怎么接触。","样板墙上的挂钩底座与钩缘上的蓝色织带。"],
 "clock":["壁钟","clock","正面和参考钟比一比，再贴近表盘看看两根针在轴上隔多远。","正面比对两只钟并从侧面查看壁钟针轴。"],
 "basket":["编织收纳篮","basket","提起装着布巾的样篮，抽一条出来看看篮沿会不会挂到布边。","提起布巾篮并从篮沿抽出一条布巾。"],
 "lint-refill":["粘毛器替换卷","lint-refill","粘毛卷滚过深色布样，用过的一层从斜口揭开。","粘毛卷试滚有毛絮的深布，随后沿斜口揭起旧层。"],
 "napkin":["可机洗棉餐巾","napkin","洗以前先比一下边线；洗过再把同一块布的四角摆回原处，看差多少。","洗前与洗后的同一块棉餐巾，手把四角沿边线对齐。"],
 "ratchet-set":["棘轮套筒工具组","ratchet-set","挑一只合适的套筒。贴近换向拨钮，试试受力行程和回程。","维修工选好套筒，近看棘轮拨钮与样件。"],
 "lever-lock":["室内执手门锁","lever-lock","先对齐样板门上的锁体和面板，装妥后轻压执手，看锁舌收放。","样板门上试装执手锁，再从门侧观察锁舌。"],
 "pet-harness":["宠物胸背牵引套装","pet-harness","按尺码把胸背带套在犬模上，沿着织带摸到扣具和接缝。","店员为犬模试穿胸背带，近看扣具和车线。"]
});
// Only include frames that are on disk and visually approved.
const workProductArt=Object.freeze({
 'lamp-trial':'assets/deal-work-product-lamp-trial.webp',
 'thermos-branded':'assets/deal-work-product-thermos-branded.webp',
 'linen-small':'assets/deal-work-product-linen-small.webp',
 tray:'assets/deal-work-product-tray.webp',
 dripper:'assets/deal-work-product-dripper.webp',
 'luggage-tag':'assets/deal-work-product-luggage-tag.webp',
 'serving-tongs':'assets/deal-work-product-serving-tongs.webp',
 'pepper-mill':'assets/deal-work-product-pepper-mill.webp',
 'knock-box':'assets/deal-work-product-knock-box.webp',
 "salad-bowl":"assets/deal-work-product-salad-bowl.webp",
 "pitcher":"assets/deal-work-product-pitcher.webp",
 "scale":"assets/deal-work-product-scale.webp",
 "chopping-board":"assets/deal-work-product-chopping-board.webp",
 "apron":"assets/deal-work-product-apron.webp",
 "oven-mitt":"assets/deal-work-product-oven-mitt.webp",
 "bath-mat":"assets/deal-work-product-bath-mat.webp",
 "pillowcase":"assets/deal-work-product-pillowcase.webp",
 "bookend":"assets/deal-work-product-bookend.webp",
 "laptop-stand":"assets/deal-work-product-laptop-stand.webp",
 "display-board":"assets/deal-work-product-display-board.webp",
 "file-box":"assets/deal-work-product-file-box.webp",
 "stapler":"assets/deal-work-product-stapler.webp",
 "passport-cover":"assets/deal-work-product-passport-cover.webp",
 "neck-pillow":"assets/deal-work-product-neck-pillow.webp",
 "umbrella":"assets/deal-work-product-umbrella.webp",
 "packing-cube":"assets/deal-work-product-packing-cube.webp",
 "vase":"assets/deal-work-product-vase.webp",
 "planter":"assets/deal-work-product-planter.webp",
 "coat-hook":"assets/deal-work-product-coat-hook.webp",
 "clock":"assets/deal-work-product-clock.webp",
 "basket":"assets/deal-work-product-basket.webp",
 "lint-refill":"assets/deal-work-product-lint-refill.webp",
 "napkin":"assets/deal-work-product-napkin.webp",
 "ratchet-set":"assets/deal-work-product-ratchet-set.webp",
 "lever-lock":"assets/deal-work-product-lever-lock.webp",
 "pet-harness":"assets/deal-work-product-pet-harness.webp"
});
export function workProductComicFor(row){
 if(row?.status!=='paid'||row.businessRound||row.projectId||!Object.hasOwn(directions,row.clientId))return null;
 const [decision,product,scene,caption,alt]=directions[row.clientId];
 if(row.optionId!==decision||row.product!==product||!Object.hasOwn(workProductArt,scene))return null;
 return {art:workProductArt[scene],caption,alt};
}
export function marketProductComicFor(row,status){
 if(!['receivable','paid'].includes(status)||row?.status!==status||!Number.isSafeInteger(row.quantity)||row.quantity<=0||row.delivered!==row.quantity||!Object.hasOwn(marketDirections,row.productId))return null;
 const [product,scene,caption,alt]=marketDirections[row.productId];
 if(row.productName!==product||!Object.hasOwn(workProductArt,scene))return null;
 return {art:workProductArt[scene],caption,alt};
}
function storyMarkup(comic,label='看看交货那天',isNarration=true){
 if(!comic)return '';
 return '<details class="ws-work-story"><summary>'+label+'</summary><figure><img src="'+comic.art+'" alt="'+comic.alt+'" loading="lazy"><figcaption'+(isNarration?' class="comic-narration"':'')+'>'+comic.caption+'</figcaption></figure></details>';
}
export function workProductComicView(row){return storyMarkup(workProductComicFor(row));}
export function marketProductComicView(row,status,{categoryDemo=false}={}){
 return storyMarkup(marketProductComicFor(row,status),categoryDemo?'托盘怎么验':'看看怎么验货',false);
}
