// UI aliases only. The verified replay journal retains the original buyer and
// organization strings, and groups receipts by those unmodified identity keys.
import {PROSPECT_CONTENT} from './deal-room-prospect-content.js';
const places={
 am:['荷兰','阿姆斯特丹'],rt:['荷兰','鹿特丹'],li:['葡萄牙','里斯本'],po:['葡萄牙','波尔图'],va:['西班牙','瓦伦西亚'],bi:['西班牙','毕尔巴鄂'],md:['西班牙','马德里'],ly:['法国','里昂'],ms:['法国','马赛'],na:['法国','南特'],br:['英国','布里斯托尔'],gl:['英国','格拉斯哥'],co:['丹麦','哥本哈根'],st:['瑞典','斯德哥尔摩'],os:['挪威','奥斯陆'],ha:['德国','汉堡'],mu:['德国','慕尼黑'],tu:['意大利','都灵'],ge:['意大利','热那亚'],du:['阿联酋','迪拜'],ab:['阿联酋','阿布扎比'],an:['土耳其','安卡拉'],iz:['土耳其','伊兹密尔'],sg:['新加坡','新加坡'],pe:['马来西亚','槟城'],kl:['马来西亚','吉隆坡'],jk:['印度尼西亚','雅加达'],bd:['印度尼西亚','万隆'],bn:['泰国','曼谷'],cm:['泰国','清迈'],tk:['日本','东京'],ko:['日本','神户'],bs:['韩国','釜山'],se:['韩国','首尔'],ma:['菲律宾','马尼拉'],ce:['菲律宾','宿务'],mb:['印度','孟买'],ch:['印度','金奈'],me:['墨西哥','梅里达'],gu:['墨西哥','瓜达拉哈拉'],sa:['智利','圣地亚哥'],vp:['智利','瓦尔帕莱索'],ba:['阿根廷','布宜诺斯艾利斯'],qu:['加拿大','魁北克城'],vc:['加拿大','温哥华'],ml:['澳大利亚','墨尔本'],pr:['捷克','布拉格'],au:['新西兰','奥克兰'],sh:['中国','上海'],xm:['中国','厦门'],nb:['中国','宁波']
};
// ID order is stable. A dash keeps the already authored personal name.
const roster=`
Eva Meijer|am
Pieter Vos|rt
Clara Vidal|va
-|nb
Inês Matos|po
Luca Ferri|tu
Marisol Ruiz|me
-|bs
Freya Nielsen|co
Lukas Berg|os
Nuno Reis|li
Emilia Soto|sa
Elif Aydın|an
-|sg
Margot Perrin|ly
Aya Ishii|ko
-|xm
Lucía Mora|md
Hugo Klein|ha
Joana Alves|po
Rania Mansour|du
Theo Martin|br
-|kl
Sanna Lind|st
Luis Paredes|gu
Émile Roy|qu
Mira Novak|pr
Pim Srisai|bn
-|pe
Paolo Riva|ge
Amélie Garnier|na
Hana Kim|se
Lea Vogel|mu
Sofia Ríos|bi
-|sh
Amina Khalil|ab
-|tk
Raúl Vega|va
Flora Hayes|ml
-|ma
Iwan Satria|jk
Elsa Moen|os
María Luz|ce
Elena Moretti|tu
Toby Evans|au
Marta Gil|li
Ece Kaya|iz
-|ma
Felix Braun|ha
Sari Putri|bd
Ida Holm|co
Helena Prado|ba
-|bs
Max Dubois|ms
Aline Morel|ly
Irfan Malik|kl
-|tk
Soraya Demir|iz
-|sg
Arun Nair|mb
Nina Kovař|pr
Maia Silva|po
Oliver Reed|gl
-|du
Dita Laras|jk
Tomas Havel|pr
Milo Janssen|rt
Isabel Lagos|vp
-|sg
Kenji Arai|ko
-|bd
Lina Cruz|ce
Vikram Menon|ch
Anong Prasert|bn
Lars Hagen|os
Gabriel Noel|qu
Fatima Saad|ab
-|mb
Nora Frisch|mu
Emma de Wit|am
-|vc
-|sa
Sven Dahl|st
Niran Chai|cm
Mikkel Lund|co
-|pe
Inês Duarte|li
Carlo Bassi|ge
Deniz Aras|iz
-|sg
Lotte Visser|am
Amira Zaki|du
Ana Fuentes|me
-|pr
-|xm
Marc Coste|ms
Bianca Rossi|tu
Naoki Abe|tk
Rosa Solís|gu
Chloe Fraser|gl
`.trim().split('\n');
// Chinese editions of the fictional buyers' names, in the same stable ID order.
// A dash denotes one of the six names already authored in Chinese.
// IDs 008/016/032/037/057/070/098: the source roster supplies Latin letters,
// not unique Hanja/Kanji. These surname-first Han renderings are fictional
// editorial choices, not recovered spellings of real people's legal names.
// Mixed-language names (e.g. Daniel Park, Owen Tan) likewise retain the
// authored form; buying in a city does not establish nationality or descent.
const chineseNames=`
伊娃·迈耶尔
彼得·福斯
克拉拉·比达尔
-
伊内斯·马托斯
卢卡·费里
玛丽索尔·鲁伊斯
林俊
弗蕾娅·尼尔森
卢卡斯·贝格
努诺·雷斯
埃米莉亚·索托
埃利夫·艾登
玛雅·陈
玛戈·佩兰
石井绫
-
露西亚·莫拉
胡戈·克莱因
若阿娜·阿尔维斯
拉尼娅·曼苏尔
西奥·马丁
娜迪娅·拉赫曼
桑娜·林德
路易斯·帕雷德斯
埃米尔·鲁瓦
米拉·诺瓦克
平·斯里赛
欧文·陈
保罗·里瓦
阿梅莉·加尼耶
金荷娜
莱娅·福格尔
索菲娅·里奥斯
-
阿米娜·哈利勒
森爱子
劳尔·维加
弗洛拉·海斯
梅·托雷斯
伊万·萨特里亚
埃尔莎·穆恩
玛丽亚·卢斯
埃莱娜·莫雷蒂
托比·埃文斯
玛尔塔·吉尔
埃杰·卡娅
阿莉西亚·克鲁斯
费利克斯·布劳恩
萨丽·普特里
伊达·霍尔姆
埃莱娜·普拉多
丹尼尔·朴
马克斯·杜布瓦
阿琳·莫雷尔
伊尔凡·马利克
佐藤里奈
索拉娅·德米尔
-
阿伦·奈尔
尼娜·科瓦日
玛娅·席尔瓦
奥利弗·里德
萨米拉·阿齐兹
迪塔·拉拉斯
托马什·哈维尔
米洛·扬森
伊莎贝尔·拉戈斯
利奥·王
新井健二
努尔·哈迪
莉娜·克鲁斯
维克拉姆·梅农
阿侬·巴瑟
拉尔斯·哈根
加布里埃尔·诺埃尔
法蒂玛·萨阿德
阿妮塔·拉奥
诺拉·弗里施
埃玛·德维特
-
安娜·维加
斯文·达尔
尼兰·猜
米克尔·隆德
艾丽丝·林
伊内斯·杜阿尔特
卡洛·巴西
德尼兹·阿拉斯
本·林
洛特·菲瑟尔
阿米拉·扎基
安娜·富恩特斯
马雷克·诺瓦克
-
马克·科斯特
比安卡·罗西
阿部直树
罗莎·索利斯
克洛伊·弗雷泽
`.trim().split('\n');
const words=new Map([['Mira','米拉'],['Samir','萨米尔'],['Inês','伊内斯'],['Élise','埃莉丝'],['Adrian','阿德里安']]),markets=new Map();
for(const [i,p] of PROSPECT_CONTENT.entries()){
 const [alias,k]=roster[i].split('|'),[country,city]=places[k];
 const organization=p.organization.replace(p.market,city);
 if(chineseNames[i]!=='-'){
   words.set(p.displayName,chineseNames[i]);
   if(alias!=='-')words.set(alias,chineseNames[i]);
 }
 if(organization!==p.organization)words.set(p.organization,organization);
 markets.set(p.id,country===city?country:country+' · '+city);
}
// Bound Latin aliases only, so e.g. Samira or Mirador are not translated
// as opening characters; Han text may legitimately adjoin a personal name.
const tokens=new RegExp([...words.keys()].sort((a,b)=>b.length-a.length).map(k=>/\p{Script=Latin}/u.test(k)?'(?<![\\p{Script=Latin}])'+k+'(?![\\p{Script=Latin}])':k).join('|'),'gu');
export function prospectDisplayText(text){return typeof text==='string'?text.replace(tokens,k=>words.get(k)):text;}
export function prospectMarketLabel(p){return markets.get(p?.id)??p?.market??'';}

// Paint only: do not change saved names, option IDs, searchable product keys
// or input values. Some established routes still emit their canonical spelling.
export function localizeBuyerDisplay(root){
 const walker=root?.ownerDocument?.createTreeWalker?.(root,4);
 if(!walker)return;
 for(let node=walker.nextNode();node;node=walker.nextNode()){
  if(node.parentElement?.closest('script,style,textarea,select,[contenteditable]'))continue;
  const shown=prospectDisplayText(node.nodeValue);
  if(shown!==node.nodeValue)node.nodeValue=shown;
 }
 for(const el of root.querySelectorAll('[aria-label],[title],[alt]')){
  for(const name of ['aria-label','title','alt']){
   const value=el.getAttribute(name),shown=prospectDisplayText(value);
   if(shown!==value)el.setAttribute(name,shown);
  }
 }
}
