import { ART_DIMENSIONS } from '../data/art-dimensions.js';

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
  const size = ART_DIMENSIONS[src.slice('assets/'.length)];
  return `<span class="media-frame ${esc(className)}" data-media-state="loading"${size ? ` style="--media-ratio:${size[0] / size[1]}"` : ''}>
    <img data-media-image data-media-src="${esc(src)}" src="${esc(src)}" alt="${esc(alt)}"${size ? ` width="${size[0]}" height="${size[1]}"` : ''} loading="${lazy ? 'lazy' : 'eager'}" decoding="async"${lazy ? '' : ' fetchpriority="high"'}>
    <span class="media-fallback" hidden><span role="status">${esc(fallback)}</span>${retry ? '<button type="button" data-media-retry>重试图片</button>' : ''}</span>
  </span>`;
}

function setImageState(image, state, reveal = false) {
  const frame = image.closest('.media-frame');
  if (!frame) return;
  if (frame.dataset.mediaState === state && state !== 'loading') return;
  frame.dataset.mediaState = state;
  delete frame.dataset.mediaReveal;
  if (reveal) frame.dataset.mediaReveal = 'true';
  frame.querySelector('.media-fallback').hidden = state !== 'error';
}

export function wireMedia(root) {
  const started = new WeakMap();
  const revealDelay = 90;
  const mark = state => ({ target }) => {
    if (!target.matches?.('img[data-media-image]')) return;
    const start = started.get(target);
    setImageState(target, state, state === 'loaded' && start !== undefined && performance.now() - start >= revealDelay);
  };
  function prepare(image) {
    if (started.has(image)) return;
    started.set(image, performance.now());
    if (image.complete) setImageState(image, image.naturalWidth > 0 ? 'loaded' : 'error');
  }
  root.addEventListener('load', mark('loaded'), true);
  root.addEventListener('error', mark('error'), true);

  let retryCount = 0;
  root.addEventListener('click', event => {
    const frame = event.target.closest?.('[data-media-retry]')?.closest('.media-frame');
    const image = frame?.querySelector('img[data-media-image]');
    if (!image || frame.dataset.mediaState !== 'error') return;
    const source = image.dataset.mediaSrc;
    if (!assetPath.test(source)) return;
    started.set(image, performance.now());
    setImageState(image, 'loading');
    retryCount += 1;
    image.src = `${source}?retry=${Date.now()}-${retryCount}`;
  });

  for (const image of root.querySelectorAll('img[data-media-image]')) prepare(image);
  const observer = new MutationObserver(records => {
    for (const record of records) for (const node of record.addedNodes) {
      if (node.matches?.('img[data-media-image]')) prepare(node);
      for (const image of node.querySelectorAll?.('img[data-media-image]') ?? []) prepare(image);
    }
  });
  observer.observe(root, { childList: true, subtree: true });
}
