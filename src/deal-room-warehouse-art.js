// Room architecture only. Whether goods have arrived is decided by the ledger,
// never by these paintings. Keep the three literals for standalone asset inlining.
export function warehouseSceneArt(capacity) {
  switch (capacity) {
    case 10: case 24: return 'assets/deal-warehouse-starter.webp';
    case 60: case 100: return 'assets/deal-warehouse-transit.webp';
    case 180: case 300: return 'assets/deal-warehouse-highbay.webp';
    default: return '';
  }
}

export function warehouseStage(capacity){
 return capacity>=180?{id:'highbay',name:'专业仓储'}:capacity>=60?{id:'transit',name:'周转仓'}:{id:'starter',name:'门市后仓'};
}
// Code-native illustrative loose cartons, not recovered original painting pixels.
// At most twelve visible cartons; the caption and optional rack retain exact counts.
export function warehouseSceneBoxes(onHand,stage){
 if(!Number.isSafeInteger(onHand)||onHand<=0)return '';
 const offsets=stage==='highbay'?[7,69]:stage==='transit'?[17,66]:[11,68];
 return '<svg class="wh-arrived-boxes" viewBox="0 0 100 66.67" aria-hidden="true">'+Array.from({length:Math.min(onHand,12)},(_,i)=>{
  const row=Math.floor(i/4),col=i%4,x=offsets[0]+col*8+row*2,y=offsets[1]*.6667+row*4;
  return '<g class="wh-arrived-carton" transform="translate('+x+' '+y+')"><ellipse cx="4" cy="7" rx="5" ry="1.2" fill="#15100b" opacity=".28"/><path d="M0 0 3-2 9 0 6 2Z" fill="#d3b18a"/><path d="M0 0 6 2v6L0 6Z" fill="#b38a61"/><path d="M6 2 9 0v6L6 8Z" fill="#856548"/><path d="m2-1 6 2-1 1-6-2Z" fill="#e4ccb0"/><path d="M2 3.2 4 3.8v1.8L2 5Z" fill="#e8d9c3"/></g>';
 }).join('')+'</svg>';
}
