// A game week starts on Monday. Dates are a game clock, not a real-world calendar.
export function weekday(s){return ['周一','周二','周三','周四','周五','周六','周日'][(s.day-1)%7];}
export function isWeekend(s){return (s.day-1)%7>=5;}
export function canWorkToday(s){return s.phase==='day'&&(!isWeekend(s)||s.weekendWork===true);}
export function weekendExplanation(s){return s.stage==='employee'
 ?'双休日可以不接单，日薪照常。也可以自愿处理一笔紧急交付，未完成的订单能留到之后。'
 :'双休日可以休息和约会，也可以自愿处理紧急交付。已招聘同事按原约定带薪休息，今天接单由你处理，沿用平日准备的资料与流程。';}
