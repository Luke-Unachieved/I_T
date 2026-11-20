// Display copy only: translate exact old lines where they are rendered.
// Never use this when building offers, journal entries or replay state.
import {prospectContent} from './deal-room-prospect-content.js';

const replacements={
 '016':{inquiry:{0:'新店刚开门，堂食和外卖还挤在一张台上。先按我问的数量报，达不到起订量就告诉我。'},delivery:{0:'箱子到了先找门店督导。外卖台还得出餐，别往那儿卸。'}},
 '017':{inquiry:{0:'烹饪课还没开，老师想先看一眼实物。有现货的话，能到哪天、分几箱？'},delivery:{0:'实训室开课时先别进。到了找老师，他会出来核对箱数。'}},
 '018':{inquiry:{0:'我们换菜单，吧台可没变宽。你把外箱尺寸发我，我先看看搬进来要不要挪东西。'},reorder:{0:'早班的人问我能不能再补一批。东西照旧就好；箱子要是换了尺寸，先告诉我。'}},
 '019':{inquiry:{0:'车站人又多起来了，外卖口忙得没空拆箱。最迟哪天能到？外箱最长那边也量一下，我得看能不能进后门。'},delivery:{0:'到候车厅找门店领班。清单和箱号留给我们，箱子等闲下来再拆。'}},
 '020':{inquiry:{0:'后窗那张小吧台要接读书会。你手上有多少现货？我数数周末能摆几桌。'},reorder:{0:'书店同事催我补点货。还是上回那款，装法有变的话，我得先给柜子腾地方。'}},
 '021':{inquiry:{0:'学员实操台缺一批器具。你先说现货能凑多少，我好算那几张桌怎么分。'},delivery:{0:'教室桌上可能还摆着面团。货到了喊讲师出来，清单带上，别在实操台拆箱。'}},
 '022':{inquiry:{0:'球馆快重新开了。检票口后面只留了一个小茶水位；我先看外箱尺寸和预计到货日。'},delivery:{0:'请先找场馆服务台。清单留在箱外，工作人员查得到箱号再接货。'}},
 '023':{inquiry:{0:'旅社的冲煮台是大家共用的。每箱装几件、预计什么时候送到？我得把话留给夜班前台。'},reorder:{0:'昨晚前台问起补货。我先确认一件事：跟上回比，每箱件数有变吗？'}},
 '024':{inquiry:{0:'直播换季，后台饮水位得补点东西。这回不等排产。库里能凑出一批的话，几天送得到？'},delivery:{0:'到了找导播助理，把清单和箱号交给他。直播灯亮着时，别搬着箱子往后台走。'}},
 '025':{inquiry:{0:'午夜场准备恢复，饮品台贴着散场通道。先发外箱尺寸和到货日，我得看看箱子能不能直接搬进去。'},delivery:{0:'到馆找影厅值班员。散场前别在饮品台拆箱，清单和箱号先留给他。'}}
};

export function displayProspectCopy(customerId,stage,original){
 const row=Object.hasOwn(replacements,customerId)?replacements[customerId]:null;
 const edits=row&&Object.hasOwn(row,stage)?row[stage]:null;
 if(!edits||typeof original!=='string')return original;
 const index=prospectContent(customerId)?.lines?.[stage]?.indexOf(original);
 return Object.hasOwn(edits,index)?edits[index]:original;
}
export const displayProspectCopy016To025=displayProspectCopy;
