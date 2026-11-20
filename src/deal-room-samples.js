/** Visible samples bind to real quote identities; no cosmetic-only choices. */
export function sampleSelection(sample,purpose='opening',openingCustom=false){
 if(sample==='plain')return 'ready';
 if(sample==='custom')return purpose==='restock'?'branded':openingCustom?'branded-opening':'promise';
 return null;
}
export function selectedSample(option){return option==='ready'?'plain':['branded','branded-opening','promise'].includes(option)?'custom':null;}
const productAtlas='assets/deal-products-v1.webp';
export function sampleSvg(kind,custom=false){
 const index=kind==='lamp'?0:kind==='cup'?1:2;
 const box=kind==='cup'&&custom?'<image class="sample-box" href="assets/deal-work-sample-carton.webp" x="78" y="43" width="104" height="119" preserveAspectRatio="xMaxYMid meet"/>':'';
 return `<svg viewBox="0 0 200 190" aria-hidden="true">${box}<g ${kind==='cup'&&custom?'transform="translate(-10 8) scale(.92)"':''}><svg class="sample-crop" x="0" y="0" width="200" height="190" viewBox="0 0 200 190" style="overflow:hidden;width:200px;height:190px"><image href="${productAtlas}" x="${-index*200}" y="0" width="600" height="200"/></svg></g></svg>`;
}

export function cupPaperProofArt(side,label){
 const src=side==='back'?'assets/deal-work-sleeve-back.webp':'assets/deal-work-sleeve-front.webp';
 const aria=String(label).replace(/[&"<>]/g,c=>({'&':'&amp;','"':'&quot;','<':'&lt;','>':'&gt;'}[c]));
 return `<svg viewBox="0 0 420 170" role="img" aria-label="${aria}"><image href="${src}" width="420" height="170"/></svg>`;
}

/** Visual only. The accepted studio sample follows the selected real Mira quote. */
export function developedQuoteSample(state,selected,brightness=1){
 const d=selected==='second-developed-lamp'?state.secondSupplier:state.productDevelopment;
 if(state.phase!=='negotiating'||!state.businessRound||state.clientProjectActive||state.clientIndex!==0||!['developed-lamp','second-developed-lamp'].includes(selected)||d?.status!=='active'||d.factory!=='studio')return '';
 const level=[0,1,2].includes(brightness)?brightness:1;
 return `<div class="sample-piece picked single quote-lamp-sample"><div class="lamp-trial" aria-label="已验三档调光台灯 · ${['夜间柔光','桌面阅读','陈列亮光'][level]}" style="--sample-light:${[.25,.55,1][level]};--lamp-brightness:${[.75,.95,1.12][level]}"><div class="sample-glow"></div><div class="trial-lamp"></div></div><span>已验三档调光样 · 本次报价型号</span><div class="sample-switch" role="group" aria-label="试报价中的实物灯">${['夜间柔光','桌面阅读','陈列亮光'].map((name,i)=>`<button data-light="${i}" aria-pressed="${level===i}">${name}</button>`).join('')}</div></div>`;
}
