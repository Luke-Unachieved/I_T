const openingCustomers = ['mira', 'samir', 'ines'];
const openingAtlas = 'assets/deal-customers-v1.webp';
const prospectAtlas = 'assets/deal-prospects-v1.webp';

// The regular customer's comicIndex already identifies the same person in the
// 10 × 10 portrait sheet and in the numbered customer comics.
export function buyerPortrait(buyer, className = 'buyer-portrait') {
  const openingIndex = openingCustomers.indexOf(buyer?.id);
  const comicIndex = buyer?.comicIndex;
  if (openingIndex >= 0 || (Number.isInteger(comicIndex) && comicIndex >= 1 && comicIndex <= 100)) {
    const opening = openingIndex >= 0;
    const atlas = opening ? openingAtlas : prospectAtlas;
    const columns = opening ? 3 : 10;
    const index = opening ? openingIndex : comicIndex - 1;
    const position = value => value * 100 / (columns - 1);
    const x = position(index % columns);
    const y = position(Math.floor(index / columns));
    return `<span class="buyer-avatar ${className}" aria-hidden="true" style="background-image:url('${atlas}');background-size:${columns * 100}% ${columns * 100}%;background-position:${x}% ${y}%"></span>`;
  }

  const name = typeof buyer === 'string' ? buyer : buyer?.name;
  const initial = [...String(name || '客')][0];
  const escaped = initial.replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
  return `<span class="buyer-avatar ${className} buyer-avatar-placeholder" aria-hidden="true">${escaped}</span>`;
}
