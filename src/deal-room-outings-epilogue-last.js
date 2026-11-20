// Caller gates on the resolved trip/choice. Each entry is title, result,
// asset, alt, then optional lines in fang / liang / tao / xu order.
// Solo callers use the shared result and do not append a voice line.
export const lastTravelScenes=Object.freeze({
 'cave-boat':Object.freeze({
  outline:Object.freeze(['那条线留在弯里','船出了洞口，眼睛慢慢适应了天光。回望时，刚才鼓出来的石壁已经藏进一条深色弯线，只剩水面还认得那个转角。','assets/deal-trip-extra-cave-outline.webp','洞内的灯照出凸起的石壁与水线；出洞回望，弯道已暗。',
  '我刚才拿水线当尺了。没那条线，还真看不出石头鼓到哪儿。',
  '照片大概只会剩黑乎乎的一块。记住它是个弯就够了。',
  '像小时候关台灯，书上有句话还亮在脑子里。',
  '已经到明水了。从这里回头看，反而不用伸着脖子找。'])
 }),
 balloon:Object.freeze({
  land:Object.freeze(['草尖靠回篮边','地面队把吊篮扶正，草叶重新靠到篮边。飞行员示意可以松手，远处那条田埂又成了一段走得到的路。','assets/deal-trip-extra-balloon-landing.webp','热气球已落在谷地草场，地面人员在藤篮旁，草叶靠着篮底。',
  '脚下不晃了。原来刚才那一下，我连肩膀都绷着。',
  '从上面看，这片草只有一种颜色。现在我数得出三种绿。',
  '我想把那条田埂走一遍。从地上走，应该比刚才长得多。',
  '等人家把绳收完再走。你看篮边这草，都慢慢弹回来了。'])
 }),
 'sail-charter':Object.freeze({
  twilight:Object.freeze(['最后一扇亮窗','船尾的浪一层层往外摊。岸上只剩一扇亮窗，在水上拉出一截金线；等船身转过一点，连那截金线也看不见了。','assets/deal-trip-extra-sail-twilight.webp','帆船船尾掠过渐暗的水面；岸边孤零零的一扇亮窗映出细长金光。',
  '再看一会儿吧。外套披好了就不着急回去。',
  '窗没灭，是咱们转了个角度。差点替人家把灯关了。',
  '我赌那屋里的人根本不知道，这边有人看他的窗看了半天。',
  '往栏杆里让一点。这个位置还能看着水，也不挡船员。'])
 })
});
