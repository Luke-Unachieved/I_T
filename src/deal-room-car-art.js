// Only game-owned model IDs resolve. Literal runtime paths also let the offline
// packer embed the same assets; no paths or lookup keys come from a saved price.
export const CAR_ART_BY_ID = Object.freeze({
  'car-hatch': 'assets/deal-car-hatch.webp',
  'car-wagon': 'assets/deal-car-wagon.webp',
  'car-camper': 'assets/deal-car-camper.webp',
  'car-roadster': 'assets/deal-car-roadster.webp',
  'car-4wd': 'assets/deal-car-4wd.webp',
  'car-gt': 'assets/deal-car-gt.webp',
  'car-limo': 'assets/deal-car-limo.webp',
  'car-super': 'assets/deal-car-super.webp'
});
export function carArt(assetId) {
  return typeof assetId === 'string' && Object.hasOwn(CAR_ART_BY_ID,assetId) ? CAR_ART_BY_ID[assetId] : null;
}
