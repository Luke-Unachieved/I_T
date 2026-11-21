const openings=Object.freeze({
 fang:['方文斌','刚来了一封询盘。先看看对方要多少、哪天收货，再决定怎么报。'],
 liang:['梁佳音','电脑上那封新消息看见没？先看她要什么、什么时候收货。别急着报个漂亮价，手里的钱也得够。'],
 tao:['陶乐','今天先接一封试试。客户要多少、哪天交，这两样先看清。拿不准就回来问我，不用急着答应。'],
 xu:['许明珊','先开收件箱。看完数量和交期，再对采购成本。报价由你发；觉得不合适，这单可以不接。']
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
