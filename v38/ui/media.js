const assetPath = /^assets\/[\w.-]+\.(?:webp|png|jpe?g|svg)$/i;
const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = value => String(value).replace(/[&<>"']/g, character => entities[character]);

export function imageFrame(src, {
  className = '',
  alt = '',
  fallback = '图片暂时无法显示',
  lazy = true,
  retry = false,
} = {}) {
  if (typeof src !== 'string' || !assetPath.test(src)) return '';
  return `<span class="media-frame ${esc(className)}" data-media-state="loading">
    <img data-media-image data-media-src="${esc(src)}" src="${esc(src)}" alt="${esc(alt)}" loading="${lazy ? 'lazy' : 'eager'}" decoding="async"${lazy ? '' : ' fetchpriority="high"'}>
    <span class="media-fallback" hidden><span role="status">${esc(fallback)}</span>${retry ? '<button type="button" data-media-retry>重试图片</button>' : ''}</span>
  </span>`;
}

function setImageState(image, state) {
  const frame = image.closest('.media-frame');
  if (!frame) return;
  frame.dataset.mediaState = state;
  frame.querySelector('.media-fallback').hidden = state !== 'error';
}

export function wireMedia(root) {
  const mark = state => ({ target }) => {
    if (target.matches?.('img[data-media-image]')) setImageState(target, state);
  };
  root.addEventListener('load', mark('loaded'), true);
  root.addEventListener('error', mark('error'), true);

  let retryCount = 0;
  root.addEventListener('click', event => {
    const frame = event.target.closest?.('[data-media-retry]')?.closest('.media-frame');
    const image = frame?.querySelector('img[data-media-image]');
    if (!image || frame.dataset.mediaState !== 'error') return;
    const source = image.dataset.mediaSrc;
    if (!assetPath.test(source)) return;
    setImageState(image, 'loading');
    retryCount += 1;
    image.src = `${source}?retry=${Date.now()}-${retryCount}`;
  });

  for (const image of root.querySelectorAll('img[data-media-image]')) {
    if (image.complete) setImageState(image, image.naturalWidth > 0 ? 'loaded' : 'error');
  }
}
