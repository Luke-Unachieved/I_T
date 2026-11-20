// Authored store briefs. Only paid contracts advance the buyer to the next footprint.
export const NEIGHBORHOOD_BUYER = '四邻百货联采 · 林妍';
const storeCounts = [12, 18, 24];
const termsByProduct = {
  'ratchet-set': {perStore:36, maxUnitPrice:103},
  'lever-lock': {perStore:30, maxUnitPrice:60},
  'pet-harness': {perStore:48, maxUnitPrice:39},
  'lint-refill': {perStore:96, maxUnitPrice:9}
};

export function neighborhoodRequest(receipts) {
  const ordinary = receipts.filter(r => r.mode === 'trial' || r.mode === 'bulk').length;
  if (ordinary < 6) return null;
  const completed = receipts.filter(r => r.kind === 'neighborhood').length;
  const stores = storeCounts[completed];
  if (!stores) return null;
  const ids = completed === 0 ? ['ratchet-set'] : Object.keys(termsByProduct);
  const offers = Object.fromEntries(ids.map(id => {
    const {perStore, maxUnitPrice} = termsByProduct[id];
    return [id, {quantity:perStore * stores, perStore, maxUnitPrice, deadlineDays:10, payLag:5, depositPercent:50}];
  }));
  return {stores, offers};
}
