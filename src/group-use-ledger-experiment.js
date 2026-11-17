/** Isolated asset-use experiment. readingTarget is an explicitly supplied trial
 * brief, NOT a request inferred from historic orders. Nothing writes canonical
 * history, stock depletion, money, dates or permissions. */
const clone=x=>JSON.parse(JSON.stringify(x));
const empty=()=>({mira:0,samir:0,ines:0});
const integer=n=>Number.isSafeInteger(n)&&n>=0;
export function createGroupUseLedger(state,{referrerId,readingTarget}={}){
 if(typeof referrerId!=='string'||!integer(readingTarget)||readingTarget<1)return null;
 const rooms=empty(),tea=empty(),sources=[];let movableDimming=0;
 for(const [index,h] of (state.caseGrowthHistory||[]).entries()){
  if(h.status!=='paid'||h.purpose!=='studio-project'||h.studioDirection!=='group'||h.agreement!=='private'||h.referrerId!==referrerId||!integer(h.deliveryDay)||h.deliveryDay>state.day)continue;
  let bedside=0,welcome=0;
  if(h.allocationVersion===1){
   bedside=h.allocation?.bedside;welcome=h.allocation?.welcome;
   if(!integer(bedside)||!integer(welcome)||bedside+welcome!==h.quantity||h.productQuantities?.mira!==bedside||h.productQuantities?.samir!==bedside+welcome||h.productQuantities?.ines!==welcome)continue;
  }else if(h.allocationVersion===undefined&&integer(h.quantity)&&h.quantity>0){
   if(h.studioBrief==='bedside')bedside=h.quantity;else if(h.studioBrief==='welcome')welcome=h.quantity;else continue;
  }else continue;
  const expected=['mira','samir','ines'].filter(id=>id==='mira'?bedside>0:id==='samir'?bedside+welcome>0:welcome>0);
  if(!Array.isArray(h.products)||h.products.length!==expected.length||expected.some(id=>!h.products.includes(id)))continue;
  rooms.mira+=bedside;rooms.samir+=bedside;tea.samir+=welcome;tea.ines+=welcome;
  if(h.lampVersion==='developed')movableDimming+=bedside;
  sources.push({historyIndex:index,deliveryDay:h.deliveryDay,bedside,welcome,lampVersion:h.lampVersion||'standard'});
 }
 if(!sources.length||![...Object.values(rooms),...Object.values(tea),movableDimming].every(integer))return null;
 const totals={mira:rooms.mira,samir:rooms.samir+tea.samir,ines:tea.ines};
 return {experimental:true,referrerId,readingTarget,targetSource:'explicit-trial-brief',sources,rooms,tea,publicReading:empty(),totals,movableDimming,originalRoomLamps:rooms.mira,draft:null,decision:null,feedback:'已交付的用途实物持续在用，不会因日期经过而消失。'};
}
export function previewGroupUse(model,quantity){
 if(!model)return {valid:false,reason:'没有真实集团用途交付。'};
 const shortfall=Math.max(0,model.readingTarget-model.publicReading.mira);
 const reason=model.decision?'本次使用安排已确认，不能重复转移。':!integer(quantity)||quantity<1?'请选择正整数盏数。':quantity>shortfall?'超过公共阅读区当前明确缺口。':quantity>model.movableDimming||quantity>model.rooms.mira?'现有客房没有足够已交付调光灯，不能借用未采购或不支持的型号。':'';
 return {valid:!reason,reason,quantity,readingTarget:model.readingTarget,readingShortfallBefore:shortfall,readingShortfallAfter:Math.max(0,shortfall-(integer(quantity)?quantity:0)),roomLampsAfter:model.rooms.mira-(integer(quantity)?quantity:0),roomLampsUnavailable:integer(quantity)?quantity:0};
}
export function reduceGroupUseLedger(model,action={}){
 if(!model)return model;
 if(action.type==='RETURN_GROUP_LAMPS'){
  if(model.decision?.kind!=='transferred'||model.decision.returned)return model;
  const n=clone(model),q=n.decision.quantity;n.rooms.mira+=q;n.publicReading.mira-=q;n.movableDimming+=q;n.decision.returned=true;n.feedback='暂借灯已归还客房，公共阅读区的缺口重新出现。';return n;
 }
 if(model.decision)return model;
 if(action.type==='PROPOSE_GROUP_USE'){
  const q=previewGroupUse(model,action.quantity);return q.valid?{...model,draft:q,feedback:'这只是待确认安排；转出的灯将不再同时服务原床头。'}:{...model,feedback:q.reason};
 }
 if(action.type==='WITHDRAW_GROUP_USE')return {...model,draft:null,feedback:'未确认安排已撤回，实物位置不变。'};
 if(action.type==='KEEP_GROUP_ROOMS')return {...model,draft:null,decision:{kind:'kept'},feedback:'保留原客房安排；公共阅读区尚未获得这些灯，不扣关系或费用。'};
 if(action.type==='CONFIRM_GROUP_USE'){
  if(!model.draft)return model;const q=previewGroupUse(model,model.draft.quantity);if(!q.valid)return {...model,feedback:q.reason};
  const n=clone(model);n.rooms.mira-=q.quantity;n.publicReading.mira+=q.quantity;n.movableDimming-=q.quantity;n.decision={kind:'transferred',quantity:q.quantity,returned:false};n.draft=null;n.feedback='客户确认暂转实物；公共阅读区得到灯，原客房相应减少，合同和总数量不变。';return n;
 }
 return model;
}
