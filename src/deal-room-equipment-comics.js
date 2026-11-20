const art={
 'cold-chain':['assets/deal-work-product-cold-chain.webp','库区人员依次核对机组，联动试机时对照温度曲线。'],
 'automated-warehouse':['assets/deal-work-product-automated-warehouse.webp','同一个测试托盘入库，再出库复核定位。'],
 'filling-lines':['assets/deal-work-product-filling-lines.webp','机身号与交接单对应，再检查灌装和封口记录。'],
 excavator:['assets/deal-work-product-excavator.webp','工地核验挖掘机与附件，结清后挖出第一铲土。'],
 ultrasound:['assets/deal-work-product-ultrasound.webp','交接员核对设备，结清后的空检查室旁备有值班表。']
};
export function equipmentComicFor(a,status){
 const legacy=a?.kind==='legacy-equipment-v1',id=legacy?a.legacyProjectId:a?.productId;
 if(!Object.hasOwn(art,id)||(!legacy&&a?.kind!=='equipment'))return null;
 if(legacy!==['excavator','ultrasound'].includes(id))return null;
 if(a.status!==status||!Number.isSafeInteger(a.quantity)||a.quantity<=0||a.delivered!==a.quantity||
    (legacy&&(!Number.isSafeInteger(a.physicalQuantity)||a.physicalQuantity<=0||a.physicalDelivered!==a.physicalQuantity))||
    (status==='paid'?!(Number.isSafeInteger(a.revenue)&&a.received===a.revenue):legacy||status!=='receivable'))return null;
 const [src,alt]=art[id];return {art:src,alt};
}
export function equipmentComicView(a,status){
 const pic=equipmentComicFor(a,status);
 return pic?'<figure class="ws-equipment-comic"><img class="pv-art" src="'+pic.art+'" alt="'+pic.alt+'" width="960" height="640"></figure>':'';
}
