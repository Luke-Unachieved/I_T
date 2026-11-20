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
// At most twelve painted cartons; the inventory caption retains exact counts.
export function warehouseSceneBoxes(onHand,stage){
 if(!Number.isSafeInteger(onHand)||onHand<=0)return '';
 const offsets=stage==='highbay'?[7,69]:stage==='transit'?[17,66]:[11,68];
 return '<div class="wh-arrived-boxes" aria-hidden="true">'+Array.from({length:Math.min(onHand,12)},(_,i)=>{
  const row=Math.floor(i/4),col=i%4,x=offsets[0]+col*8+row*2,y=offsets[1]+row*6;
  return '<img class="wh-arrived-carton" src="assets/deal-warehouse-carton-paint.webp" alt="" draggable="false" style="left:'+x+'%;top:'+y+'%">';
 }).join('')+'</div>';
}
