import {PROMOTION_CHANNELS,previewPromotion,promotionStatus,promotionWaitPreview} from './deal-room-promotion.js';
const promoEsc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const promoMoney=n=>Number.isSafeInteger(n)?'¥'+n.toLocaleString('zh-CN'):'—';
const campaignCopy=Object.freeze({
 district:{before:'商报把版位排在门店进货那一栏。想先补一两个货架的店主，会先拿这页问价。',pending:'印刷样张发来了，工作室的联系方式就在商品下面。下一步就等店主回信。'},
 'cross-city':{before:'通讯会发给外地买手。有的想一次铺几家店，也有人先拿一小批试卖。',pending:'通讯发出后，编辑把这期转给了订阅买手。等来信到了，再看对方是试卖还是铺货。'}
});
export function promotionView(s,ui={}){
 const st=promotionStatus(s),q=ui.promotionChannel?previewPromotion(s,ui.promotionChannel):null,w=promotionWaitPreview(s);
 const state=st?.pending?'<p>版位已刊登。第 '+st.pending.replyDay+' 天会有一封询价，届时在收件箱看。</p><p>'+promoEsc(campaignCopy[st.pending.channelId]?.pending)+'</p>'+
  (w.valid?'<button type="button" data-promotion-wait>等到第 '+w.replyDay+' 天 · 日常开支 '+promoMoney(w.cost)+'</button>':''):
  '<p>只付一次版位费。回的是询价，不是已签订单；不投也照常收来信。</p>'+
  '<div class="ws-promo-options">'+PROMOTION_CHANNELS.map(c=>'<button type="button" data-promotion-channel="'+c.id+'">'+promoEsc(c.name)+' · '+promoMoney(c.fee)+'</button>').join('')+'</div>';
 const info=q&&!st?.pending?'<section class="ws-promo-quote"><h4>'+promoEsc(q.name??'刊登前核对')+'</h4>'+
  (q.replyDay?'<p>刊登费 '+promoMoney(q.quotedFee)+'。预计第 '+q.replyDay+' 天回信。'+promoEsc(q.possible)+'</p><p>'+promoEsc(campaignCopy[q.channelId]?.before)+'</p><p>另外留出 '+promoMoney(q.waitBudget)+' 日常开支和 '+promoMoney(q.reserve?.required)+' 接下一单。</p>':'')+
  (q.valid?'<button type="button" data-promotion-book>确认刊登 · '+promoMoney(q.quotedFee)+'</button>':
  '<p role="status">'+promoEsc(q.reason)+(q.shortfall?' 还差 '+promoMoney(q.shortfall)+'。':'')+'</p>')+'<button type="button" data-promotion-cancel>先不刊登</button></section>':'';
 return '<section class="ws-promo"><h3>推广获客</h3>'+state+info+'</section>';
}
export function bindPromotion(root,s,ui,rerender,dispatch){
 root.querySelectorAll('[data-promotion-channel]').forEach(b=>b.addEventListener('click',()=>{ui.promotionChannel=b.dataset.promotionChannel;rerender();}));
 root.querySelector('[data-promotion-cancel]')?.addEventListener('click',()=>{delete ui.promotionChannel;rerender();});
 root.querySelector('[data-promotion-book]')?.addEventListener('click',()=>{const a=previewPromotion(s,ui.promotionChannel).action;if(a){delete ui.promotionChannel;dispatch(a);}});
 root.querySelector('[data-promotion-wait]')?.addEventListener('click',()=>{const a=promotionWaitPreview(s).action;if(a)dispatch(a);});
}
