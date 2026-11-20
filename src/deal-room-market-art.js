// Exact SKU-specific crops of the approved product artwork; no generic stand-in.
const plates=Object.freeze({
  "tray":"assets/deal-market-thumb-tray.webp",
  "carafe":"assets/deal-market-thumb-carafe.webp",
  "salad-bowl":"assets/deal-market-thumb-salad-bowl.webp",
  "serving-tongs":"assets/deal-market-thumb-serving-tongs.webp",
  "pepper-mill":"assets/deal-market-thumb-pepper-mill.webp",
  "dripper":"assets/deal-market-thumb-dripper.webp",
  "pitcher":"assets/deal-market-thumb-pitcher.webp",
  "knock-box":"assets/deal-market-thumb-knock-box.webp",
  "scale":"assets/deal-market-thumb-scale.webp",
  "chopping-board":"assets/deal-market-thumb-chopping-board.webp",
  "napkin":"assets/deal-market-thumb-napkin.webp",
  "apron":"assets/deal-market-thumb-apron.webp",
  "oven-mitt":"assets/deal-market-thumb-oven-mitt.webp",
  "bath-mat":"assets/deal-market-thumb-bath-mat.webp",
  "pillowcase":"assets/deal-market-thumb-pillowcase.webp",
  "bookend":"assets/deal-market-thumb-bookend.webp",
  "laptop-stand":"assets/deal-market-thumb-laptop-stand.webp",
  "display-board":"assets/deal-market-thumb-display-board.webp",
  "file-box":"assets/deal-market-thumb-file-box.webp",
  "stapler":"assets/deal-market-thumb-stapler.webp",
  "luggage-tag":"assets/deal-market-thumb-luggage-tag.webp",
  "passport-cover":"assets/deal-market-thumb-passport-cover.webp",
  "neck-pillow":"assets/deal-market-thumb-neck-pillow.webp",
  "umbrella":"assets/deal-market-thumb-umbrella.webp",
  "packing-cube":"assets/deal-market-thumb-packing-cube.webp",
  "vase":"assets/deal-market-thumb-vase.webp",
  "planter":"assets/deal-market-thumb-planter.webp",
  "coat-hook":"assets/deal-market-thumb-coat-hook.webp",
  "clock":"assets/deal-market-thumb-clock.webp",
  "basket":"assets/deal-market-thumb-basket.webp",
  "ratchet-set":"assets/deal-market-thumb-ratchet-set.webp",
  "lever-lock":"assets/deal-market-thumb-lever-lock.webp",
  "pet-harness":"assets/deal-market-thumb-pet-harness.webp",
  "lint-refill":"assets/deal-market-thumb-lint-refill.webp"
});
const families=Object.freeze({
 '餐桌器具':'table','咖啡与餐厨':'kitchen','家居布艺':'linen',
 '桌面办公':'desk','差旅用品':'travel','家居陈列':'home','门店五金':'desk','宠物日用':'linen'
});
export function marketPlate(product){
 if(!product||!Object.hasOwn(plates,product.id))return '';
 const family=Object.hasOwn(families,product.category)?families[product.category]:'table';
 // All contexts have the human-readable product name alongside this decorative image.
 return `<span class="market-plate mk-${family}" aria-hidden="true"><img src="${plates[product.id]}" alt="" width="320" height="240" loading="lazy" decoding="async"></span>`;
}
