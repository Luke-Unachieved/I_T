import {PROMOTION_CHANNELS,previewPromotion,promotionStatus} from './deal-room-promotion.js';
const promoEsc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const promoMoney=n=>Number.isSafeInteger(n)?'¥'+n.toLocaleString('zh-CN'):'—';
const campaignCopy=Object.freeze({
 district:{before:'广告会登在商报的进货栏。附近店主看中哪款，会来问价。',pending:'印刷样张发来了，联系方式印在商品下方。回信会进收件箱。'},
 'cross-city':{before:'通讯会发给外地买手。有的想一次铺几家店，也有人先拿一小批试卖。',pending:'编辑已把这期转给了订阅买手。回信会进收件箱。'}
});
export function promotionView(s,ui={}){
 const st=promotionStatus(s),q=ui.promotionChannel?previewPromotion(s,ui.promotionChannel):null;
 const state=st?.pending?'<p>'+promoEsc(campaignCopy[st.pending.channelId]?.pending||'广告已刊登，回信会进收件箱。')+'</p>'+
  '<p>第 '+st.pending.replyDay+' 天可以在收件箱查看回信。这几天可以照常接单、交货和收款。</p>':

  '<p>推广只收一次刊登费。买家有兴趣会先来问价，不推广也照常收到询盘。</p>'+
  '<div class="ws-promo-options">'+PROMOTION_CHANNELS.map(c=>'<button type="button" data-promotion-channel="'+c.id+'">'+promoEsc(c.name)+' · '+promoMoney(c.fee)+'</button>').join('')+'</div>';
 const info=q&&!st?.pending?'<section class="ws-promo-quote"><h4>'+promoEsc(q.name??'刊登前核对')+'</h4>'+
  (q.replyDay?'<p>刊登费 '+promoMoney(q.quotedFee)+'。预计第 '+q.replyDay+' 天回信。'+promoEsc(q.possible)+'</p><p>'+promoEsc(campaignCopy[q.channelId]?.before)+'</p><p>另需预留：日常开支 '+promoMoney(q.waitBudget)+'，下一单周转金 '+promoMoney(q.reserve?.required)+'。</p>':'')+
  (q.valid?'<button type="button" class="ws-control ws-control--main" data-promotion-book>确认刊登 · '+promoMoney(q.quotedFee)+'</button>':
  '<p role="status">'+promoEsc(q.reason)+(q.shortfall?' 还差 '+promoMoney(q.shortfall)+'。':'')+'</p>')+'<button type="button" class="ws-control ws-control--secondary" data-promotion-cancel>先不刊登</button></section>':'';
 return '<section class="ws-promo"><h3>推广获客</h3>'+state+info+'</section>';
}
export function bindPromotion(root,s,ui,rerender,dispatch){
 root.querySelectorAll('[data-promotion-channel]').forEach(b=>b.addEventListener('click',()=>{ui.promotionChannel=b.dataset.promotionChannel;rerender();}));
 root.querySelector('[data-promotion-cancel]')?.addEventListener('click',()=>{delete ui.promotionChannel;rerender();});
 root.querySelector('[data-promotion-book]')?.addEventListener('click',()=>{const a=previewPromotion(s,ui.promotionChannel).action;if(a){delete ui.promotionChannel;dispatch(a);}});
}
