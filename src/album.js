// The album only reflects completed, saved choices. It never grants progression.
export const CAREER_ART={office:'expansion/shared-office-presentation-v1.webp',boutique:'expansion/product-quality-table-v1.webp',brand:'expansion/brand-packaging-series-v1.webp',aftercare:'expansion/aftercare-verification-desk-v1.webp'};
export function growthPages(s){
 const d=s.story?.decisions||{},pages=[];
 if(s.stage==='founder')pages.push({id:'first-studio',art:'scenes/startup-studio-v1.webp',kicker:'正式开门',title:'从一张小桌开始',text:'交接以后，你租下自己的小工作室。桌子不大，每一件样品都有地方放。'});
 if(s.stage==='founder'&&s.warehouse>=2)pages.push({id:'expanded-studio',art:'scenes/expanded-studio-v1.webp',kicker:'第一次扩仓',title:'给下一笔生意，腾一点地方',text:'两排货架和更清楚的通道，让更大规模的询盘有了落脚点。成长来自你实际完成的扩仓，不预设谁来当同事。'});
 if(d.first_credit)pages.push({id:'first-credit',art:CAREER_ART.office,kicker:'初入职场',title:'方案上，有了你的名字',text:d.first_credit==='lead'?'第一次主讲，你把自己的判断讲给大家听。':'你讲谈判，同事补上交付，一份方案有了清楚的分工。'});
 if(d.direction&&['boutique','brand'].includes(s.story?.focus))pages.push({id:'own-direction',art:CAREER_ART[s.story.focus],kicker:'独立创业',title:s.story.focus==='brand'?'把名字交给一件产品':'让标准成为自己的底气',text:s.story.focus==='brand'?'自己的系列从一张标签开始，也把包装与档案成本交到你手里。':'公司选择把交付做深，让品质需求得到更有把握的回应。'});
 if(d.legacy)pages.push({id:'aftercare',art:CAREER_ART.aftercare,kicker:'稳定经营',title:'签收以后，也有回声',text:d.legacy==='share'?'你留下了不含客户资料的通用说明。下一次合作，可以少一些误解。':'你把额外支持的范围和时间写清，基础售后仍然保留。'});
 if(s.story?.finale)pages.push({id:'finale',art:CAREER_ART[s.story.finale],kicker:'事业终章',title:s.story.finale==='brand'?'属于你的航线':'小而有光',text:'你已经抵达这条事业路线的终章。它不是停业通知，下一份订单与生活仍由你决定。'});
 return pages;
}

// Only accepted, saved illustrations appear here. Missing variants never borrow
// another route's picture. The saved third scene, not today's first response,
// is the historical source of truth. Viewing this never changes the state.
const RELATIONSHIP_ART=Object.freeze({
 'date:cheng:0':'relationships/cheng-key-memory-0-v1.webp',
 'date:xu:0':'relationships/xu-key-memory-0-v1.webp',
 'date:cheng:1':'relationships/cheng-key-memory-1-v1.webp',
 'date:xu:1':'relationships/xu-key-memory-1-v1.webp',
 'date:gu:0':'relationships/gu-key-memory-0-v1.webp',
 'date:gu:1':'relationships/gu-key-memory-1-v1.webp',
 'date:xia:0':'relationships/xia-key-memory-0-v1.webp',
 'date:zhou:0':'relationships/zhou-key-memory-0-v1.webp',
 'date:tang:0':'relationships/tang-key-memory-0-v1.webp',
 'date:shen:0':'relationships/shen-key-memory-0-v1.webp',
 'date:lu:0':'relationships/lu-key-memory-0-v1.webp',
 'date:lu:1':'relationships/lu-key-memory-1-v1.webp',
 'date:shen:1':'relationships/shen-key-memory-1-v1.webp',
 'date:tang:1':'relationships/tang-key-memory-1-v1.webp',
 'date:xia:1':'relationships/xia-key-memory-1-v1.webp',
 'date:zhou:1':'relationships/zhou-key-memory-1-v1.webp'
});
export function relationshipArtwork(s,id){
 if(!(s.relations?.[id]?.dates>=3))return null;
 const branch=s.dialogueMemories?.[id]?.date?.[2]?.branch;
 return typeof branch==='string'&&branch.startsWith(`date:${id}:`)&&Object.hasOwn(RELATIONSHIP_ART,branch)?RELATIONSHIP_ART[branch]:null;
}
