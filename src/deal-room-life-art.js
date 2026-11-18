/** Painted room layers; ownership, preview, position and use remain real UI state. */
export function paintedLifeRoomArt(state,ui={}){
 const ids=['chair','coffee','record'],owns=id=>state.personalLife?.purchases?.some(p=>p.itemId===id),trial=id=>ui.preview===id&&!owns(id);
 const active=id=>id==='record'?!!ui.soundOn:ui.using===id;
 const layout={chair:[60,155,195,175],coffee:[420,156,70,76],record:[508,178,104,63]};
 const art=(id,i)=>{
  if(!owns(id)&&!trial(id))return id==='chair'?'<image href="assets/deal-life-folding.webp" x="70" y="188" width="155" height="145" preserveAspectRatio="none"/>':'';
  const [x,y,w,h]=layout[id],inside=state.personalLife?.positions?.[id]==='inside',dx=id==='chair'&&inside?65:0,dy=id!=='chair'&&inside?-96:0;
  const label={chair:'坐进阅读椅',coffee:'给自己做杯咖啡',record:'看看自己的唱片'}[id];
  return `<g data-life-object="${id}" transform="translate(${dx},${dy})" class="${trial(id)?'life-trial':'life-owned'} ${ui.arrival===id?'life-arrived':''}" ${owns(id)?`role="button" tabindex="0" data-life-room-use="${id}" aria-label="${label}"`:''}><ellipse cx="${x+w/2}" cy="${id==='record'?y+h*625/724:y+h-2}" rx="${w*.46}" ry="${id==='chair'?8:3}" fill="#4a3529" opacity=".22"/><svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${i*724} 0 724 724" preserveAspectRatio="none" overflow="hidden"><image href="assets/deal-life-furniture.webp" width="2172" height="724"/></svg>${active(id)&&id==='chair'?'<path fill="#fff9e9" stroke="#80664a" d="M115 255q20-8 37 0q20-8 37 0v35q-18-8-37 0q-18-8-37 0z"/>':''}${active(id)&&id==='coffee'?'<path class="life-steam" fill="none" stroke="#fff8df" stroke-width="2" d="M446 199q-8-8 0-14t0-14m10 25q8-8 0-15"/>':''}${active(id)&&id==='record'?'<g aria-hidden="true" transform="translate(555 205) scale(1 .42)"><g class="life-disc"><circle r="17" fill="#282a29"/><circle r="5" fill="#c78b64"/><circle r="1.5" fill="#f6e6c6"/><path stroke="#f4d9a6" stroke-opacity=".6" fill="none" stroke-width="1" d="M-20-10l7 4m25 12 7 3"/></g></g>':''}${trial(id)?`<rect class="life-preview-outline" x="${x-3}" y="${y-3}" width="${w+6}" height="${h+6}" rx="8"/><text class="life-preview-label" x="${x}" y="${y-7}">试摆 · 未购买</text>`:''}</g>`;
 };
 return `<svg class="life-room life-room-painted" viewBox="0 0 680 383" role="group" aria-label="下班后的家：${owns('chair')||trial('chair')?'阅读椅':'折叠椅'}、${owns('coffee')||trial('coffee')?'咖啡机':'空台面'}、${owns('record')||trial('record')?'唱片机':'空搁架'}"><image href="assets/deal-life-empty.webp" width="680" height="383" preserveAspectRatio="xMidYMid meet"/>${ids.map(art).join('')}</svg>`;
}
