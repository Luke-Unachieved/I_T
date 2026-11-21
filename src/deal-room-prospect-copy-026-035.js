// Display-only substitutions for exact canonical lines, never for actions or saves.
import {prospectContent} from './deal-room-prospect-content.js';

const replacements={
 '026':{inquiry:{0:'新品试卖的通知贴出去了，开放厨房还缺一批用具。你先告诉我每箱装几件、哪天能到，我让轮班店长留地方。',1:'开放厨房就一排架子。先看看现货有多少吧，我数数哪层还能腾出来。'},delivery:{0:'到了找当天值班的店长。箱号写在清单旁边，等午市忙完我们再拆。'}},
 '027':{inquiry:{0:'厂门口那间咖啡亭要备货。库里有多少现货？我得先跟工会报个数。',1:'福利周只开厂南门这个点。你把装箱数和到货时间发我，我拿给排班的人看。'},reorder:{0:'南门早班问还能不能补一批。还是上次那款，每箱装的数没变吧？'}},
 '028':{inquiry:{0:'园艺市集那天，甜点台就支在温室入口。你先发外箱尺寸和到货日，我拿卷尺比一下。',1:'摊位的人问我能不能先定一小批。箱子能不能从温室口搬进去，还得看你发来的尺寸。'},delivery:{0:'到温室门口喊摊位负责人出来。箱单给他，别让货占着出品台。'}},
 '029':{inquiry:{0:'周末临河那间茶室订了席。每箱装几件、哪天送到？我好跟师傅把桌数对一下。',1:'你手上有多少现货？这批就给临河那间用，买多了柜里放不下。'},reorder:{0:'师傅拿着上回的箱单来找我，说照那款再添一点就好。装法有变，你先跟我说一声。'}},
 '030':{inquiry:{0:'教学展的样品桌还缺几件做演示的用具。先报现货有多少吧，我好按演示台数分。',1:'布展前我们得先上手试一遍。预计哪天能到，外箱有多大？我得留个地方开箱。'},delivery:{0:'到了交给负责布展的人。让他们照清单点箱号，别直接摆上演示桌。'}},
 '031':{inquiry:{0:'日间中心快办活动了，水台旁边就剩一条窄道。先发外箱尺寸和到货时间，我去量一眼。',1:'这批是社区日间中心用的。你先把每箱装的数量告诉我，我跟负责水台的人对一下。'},delivery:{0:'到了先找今天值班的护理员。箱单留给她，先别把箱子搁在水台边。'}},
 '032':{inquiry:{0:'咖啡车后头那张台子用完就得折起来。你报一下每箱几件、什么时候到，我好跟合伙人腾地方。',1:'车尾只剩一点空当。你手里有多少现货？我再量一下，看看能放几箱。'},reorder:{0:'合伙人想按上回的再订一点。还是那么大的箱子吗？我们得留出车尾那块地方。'}},
 '033':{inquiry:{0:'这几天新租户陆续搬进来，早餐台得添一批用具。你先把手头现货的数发我，我跟前台合计一下。',1:'早餐开得早，我得提前给楼层前台留话。外箱多大、大概哪天能送？'},delivery:{0:'送到楼里先找前台，箱单给他们。早餐台还在用，不在那里点箱。'}},
 '034':{inquiry:{0:'北翼还剩两间在翻修。布艺你先报能赶上的，有几件就说几件，我和客房领班再分。',1:'这批给北侧客房。领班还在量，你先把不同规格分开报。'},delivery:{0:'货到了通知客房领班。先照清单对箱号，颜色和规格看过再往房里摆。'}},
 '035':{inquiry:{0:'新生合住那套两居还没量完。先把不同规格分开报，我留给管楼的师傅看。',1:'公寓赶在新生搬来前收拾房间。现货有多少、能到哪天？我好知道先收哪一间。'},delivery:{0:'到了楼下找宿管师傅。请把清单和箱号给他，等验过再分到两间屋。'}}
};

export function displayProspectCopy026To035(customerId,stage,original){
 const row=Object.hasOwn(replacements,customerId)?replacements[customerId]:null;
 const edits=row&&Object.hasOwn(row,stage)?row[stage]:null;
 if(!edits||typeof original!=='string')return original;
 const index=prospectContent(customerId)?.lines?.[stage]?.indexOf(original);
 return Object.hasOwn(edits,index)?edits[index]:original;
}
