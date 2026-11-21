const openings=Object.freeze({
 fang:['方文斌','早，我是方文斌。刚收到一封询盘。要不咱们先看看客户要多少、哪天要货，再商量怎么报价？'],
 liang:['梁佳音','早啊，我是梁佳音。刚有人来问货。我陪你看看她要什么、什么时候收货，也算算手头的钱够不够垫。'],
 tao:['陶乐','你好，我是陶乐！第一封询盘已经到了。你要是愿意，咱们就从这封开始。数量和交货日期要是有哪儿没看明白，随时叫我。'],
 xu:['许明珊','你好，我是许明珊。收件箱里有一封新询盘。等你看完数量和交期，我可以帮你核一下采购成本。合不合适，你看完再决定。']
});
export function officeIntroMode(state,status,seen,choice,pickerOpen=false){
 if(status!=='empty'||seen||state.day!==1||state.phase!=='negotiating'||state.history.length||state.contracts.length||choice==='solo'||pickerOpen)return '';
 return Object.hasOwn(openings,choice)?'welcome':'choose';
}
export function officeIntroView(mode,choice){
 if(mode==='choose')return '<section class="ws-first-choose" aria-label="开工前"><p>第一天。可以从上方的「选助理」找位搭档，也可以先看询盘。</p></section>';
 if(mode!=='welcome'||!Object.hasOwn(openings,choice))return '';
 const [name,line]=openings[choice];
 return '<div class="ws-first-intro"><section class="ws-intro-dialogue" aria-label="开工"><strong>'+name+'</strong><p>'+line+'</p><div><button type="button" data-workspace-intro="open">打开询盘</button><button type="button" data-workspace-intro="skip">跳过</button></div></section></div>';
}
