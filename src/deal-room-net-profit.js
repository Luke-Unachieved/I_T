// Keep the currency, labels and other monetary fields neutral. The number
// carries its sign in text as well as the visual gain/loss color.
export function netProfitAmount(value,{currency='¥'}={}){
 if(!Number.isSafeInteger(value))return '—';
 const sign=value>0?'+':value<0?'−':'',digits=Math.abs(value).toLocaleString('zh-CN');
 return sign+currency+(value===0?digits:'<span class="ws-net-profit ws-net-profit--'+(value>0?'gain':'loss')+'">'+digits+'</span>');
}
