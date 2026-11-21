import {lastTravelScenes} from './deal-room-outings-epilogue-last.js';
import {additionalTravelScenes} from './deal-room-outings-epilogue-extras.js';
// Only resolved choices have an epilogue. No random draw, spending or save writes.
const scenes={
 ...additionalTravelScenes,
 ...Object.fromEntries(Object.entries(lastTravelScenes).map(([id,choices])=>[id,{...additionalTravelScenes[id],...choices}])),
 'night-train':{
  wake:['红浮标','列车过了海堤，窗外闪过一枚红浮标。下一扇窗又看见它，原来是铁路线在岸边拐了个弯。','assets/deal-trip-extra-train-buoy.webp','晨光里的海堤和红浮标。',
   '就是刚才那枚。看，顶上掉了块漆。','我换了边窗户，它居然还在。','像不像它抄了条近路，跑到火车前头了？','再过一个弯就看不见了。这边角度正好。'],
  breakfast:['碗底那几粒虾皮','豆浆见了底，才发现碗底沉着几粒虾皮。隔壁桌一叫“照旧”，厨房就应了声：“知道，不放葱。”','assets/deal-trip-extra-train-bowl.webp','早餐店桌上见底的豆浆碗和一碟饼屑。',
   '原来虾皮都在碗底。怪不得喝着这么鲜。','我想在这儿住两天。下回也试试喊一声“照旧”。','我刚才光顾着吃饼了。给我看看，还真有。','不赶车就是好。坐到现在，碗里的东西才算吃明白了。']
 },
 'shadow-show':{
  lantern:['旧靴子透了光','师傅把皮影挂回灯边。靴尖有个针眼，灯一照，就在幕布上多出一颗星。刚才走夜路那场，星星竟是从这儿来的。','assets/deal-trip-extra-shadow-boot.webp','油灯照过皮靴的镂孔，在暗处投下一点亮光。',
   '刚才他把靴尖往上一抬，那颗星就出来了。','我还以为后台有谁专门管星星。','一只靴子，台下看是赶夜路，台后看还能管天上的事。','先别挪灯。站在这里，正好能同时看到针眼和那点光。'],
  puppet:['有人来接戏','影偶的胳膊还举着，幕布另一头忽然飞来一只小鸟，在它指尖停了一下。师傅隔着幕布问：“这回接住了吧？”','assets/deal-trip-extra-shadow-bird.webp','皮影戏幕上，一只小鸟正对着影偶举起的手臂。',
   '刚才胳膊停得正好。他等的就是这一下。','接住了！我还以为它会在半道拐回去。','原来举着胳膊不是招手，是在等鸟啊。','别急着放杆。鸟还没飞走呢。']
 }
};
export function travelEpilogue(routeId,choiceId,companionId){
 if(!Object.hasOwn(scenes,routeId)||!Object.hasOwn(scenes[routeId],choiceId))return null;
 const [title,caption,art,alt,...lines]=scenes[routeId][choiceId],n=['fang','liang','tao','xu'].indexOf(companionId);
 return {title,caption,art,alt,companionLine:n<0?'':lines[n]};
}
