import {cooperationDeskBriefs,previewCooperationDesk} from './deal-room-cooperation-desk-experiment.js';
/** Unshipped reversible communication prototype, NOT two balanced profit paths.
 * A reused sample costs no additional money or time. Responses below are explicit
 * design hypotheses, not historical customer demands or randomly hidden tastes.
 * No action signs an order, persists data, changes rights, cash or world time.
 */
const copy=x=>JSON.parse(JSON.stringify(x));
const leadNames={mira:'台灯',samir:'保温杯',ines:'桌布'};
export function createAtelierNegotiation(state,{referrerId}={}){
 const brief=cooperationDeskBriefs(state,{referrerId}).find(b=>b.buyerId==='atelier');
 if(!brief)return null;
 return {experimental:true,referrerId,buyerId:'atelier',stage:'choosing',mode:null,lead:null,shownVersionId:null,proposal:null,previousProposal:null,
  feedback:'买手初步想做完整礼赠。可以递完整方案，也可以先拿已交付样品讨论用途；展示不是签约。'};
}
export function atelierNegotiationOptions(state,session){
 const brief=session&&cooperationDeskBriefs(state,session).find(b=>b.buyerId==='atelier');if(!brief)return null;
 return {locked:session.stage==='confirmed',products:[...brief.availableProducts],minimumProducts:session.mode==='display'?2:brief.availableProducts.length,
  requiredProducts:session.mode==='display'?[session.lead]:[...brief.availableProducts],packaging:session.mode==='display'?['plain','gift']:['gift'],
  editable:session.stage==='confirmed'?[]:['products','packaging','payment','versionId','lampVersion'],canWithdraw:session.stage==='confirmed',noContract:true};
}
export function previewAtelierPurchase(state,session,draft={}){
 if(!session||!atelierNegotiationOptions(state,session))return {experimental:true,proposalOnly:true,valid:false,reason:'先选择真实合作案例。'};
 const q=previewCooperationDesk(state,{...draft,referrerId:session.referrerId,buyerId:'atelier'});
 if(session.stage==='confirmed')return {...q,valid:false,reason:'这份提案已被认可；要修改请先撤回重谈，尚未签约。'};
 if(session.mode!=='display'||!Number.isFinite(q.cost))return q;
 if((draft.versionId||'generic')!==session.shownVersionId)return {...q,valid:false,customerMatched:false,reason:'版本已变，请先展示这份实际版本，再确认用途与搭配。'};
 const fits=Array.isArray(draft.products)&&draft.products.length>=2&&draft.products.includes(session.lead);
 const reason=!fits?'让主推样品留在组合里，再配至少一件真实商品；想换主推可重新展示。':!q.rightsAllowed?q.rightsReason:!q.affordable?'现有现金不足以支持这份完整采购提案。':'用途与实物搭配清楚，可以交给客户确认；尚未签约。';
 return {...q,customerMatched:fits,customerReason:fits?'':'组合必须包含已展示的主推产品。',valid:fits&&q.rightsAllowed&&q.affordable,reason,
  use:draft.packaging==='plain'?'开放陈列，让顾客拿取体验':'完整礼赠，按组合带走'};
}
export function reduceAtelierNegotiation(state,session,action){
 if(!session||!action||!atelierNegotiationOptions(state,session))return session;
 if(action.type==='REOPEN_PROPOSAL'){
  if(session.stage!=='confirmed')return session;
  return {...session,stage:'drafting',previousProposal:copy(session.proposal),proposal:null,feedback:'已撤回未签提案。可以重新配商品和包装，已有样品和旧客户承诺不变。'};
 }
 if(session.stage==='confirmed')return session;
 if(action.type==='SHOW_DISPLAY'){
  const brief=cooperationDeskBriefs(state,session).find(b=>b.buyerId==='atelier');
  if(!brief.availableProducts.includes(action.lead))return session;
  const versionId=action.versionId||'generic';
  const rights=previewCooperationDesk(state,{referrerId:session.referrerId,buyerId:'atelier',products:[...brief.availableProducts],packaging:'gift',payment:'deposit30',versionId});
  if(!rights.rightsAllowed)return {...session,feedback:rights.rightsReason||rights.reason};
  return {...session,stage:'drafting',mode:'display',lead:action.lead,shownVersionId:versionId,proposal:null,previousProposal:null,
   feedback:`原先完整礼赠只是初步想法。这件${leadNames[action.lead]}可以做主推，再配至少一件，改为开放陈列让顾客试用，或保留礼赠用途。请重新列组合与包装，采购和付款尚未确认。`};
 }
 if(action.type==='START_WHOLE'||action.type==='PROPOSE_PURCHASE'){
  const next=action.type==='START_WHOLE'?{...session,mode:'whole',lead:null,shownVersionId:null,stage:'drafting'}:session;
  if(!['whole','display'].includes(next.mode))return session;
  const q=previewAtelierPurchase(state,next,action.draft);if(!q.valid)return {...next,feedback:q.reason};
  return {...next,stage:'confirmed',proposal:copy(q),previousProposal:null,feedback:'客户认可了这份具体提案，商品、包装和付款已一起列明。还没签约；要改可撤回重谈。'};
 }
 return session;
}
