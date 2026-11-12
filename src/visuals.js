// Artwork selection mirrors actual progress; viewing never advances the game.
export function workspaceArtwork(s){
 if(s.stage!=='founder')return {art:'harbor-office-v1.webp',title:'启航贸易的办公室'};
 return s.warehouse>=2?{art:'scenes/expanded-studio-v1.webp',title:'扩仓后的向海工作室'}:{art:'scenes/startup-studio-v1.webp',title:'刚开门的向海工作室'};
}
export function productArtwork(id){const map={hinge:'products/hinge-v1.webp',tool:'products/tool-v1.webp',handle:'products/handle-v1.webp'};return Object.hasOwn(map,id)?map[id]:null;}
export function personalArtwork(s){
 const options={'留给自己的半天 · 出门走走':{art:'scenes/weekend-street-v1.webp',title:'街巷与海风，留给自己的半天'},'留给自己的半天 · 在家慢慢过':{art:'scenes/home-rest-v1.webp',title:'在家，把时间留给自己'}};
 const event=(s.logs||[]).find(l=>l.day===s.day&&Object.hasOwn(options,l.title));
 return event?options[event.title]:null;
}

// Familiar expressions belong to friendship as much as romance. They are not
// used to rewrite historical scenes or unlock business advantages.
export function familiarPortrait(s,id){
 const paths={xia:'expressions/xia-expression-v1.webp',zhou:'expressions/zhou-expression-v1.webp',tang:'expressions/tang-expression-v1.webp',shen:'expressions/shen-expression-v1.webp',lu:'expressions/lu-expression-v1.webp',xu:'expressions/xu-expression-v1.webp',gu:'expressions/gu-expression-v1.webp',cheng:'expressions/cheng-expression-v1.webp'};
 return s?.relations?.[id]?.chats>=3&&Object.hasOwn(paths,id)?paths[id]:null;
}
