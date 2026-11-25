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
  autoRetry = 0,
} = {}) {
  if (typeof src !== 'string' || !assetPath.test(src)) return '';
  const size = ART_DIMENSIONS[src.slice('assets/'.length)];
  const retries = Number.isInteger(autoRetry) ? Math.max(0, Math.min(2, autoRetry)) : 0;
  return `<span class="media-frame ${esc(className)}" data-media-state="loading"${retries ? ` data-media-auto-retry="${retries}"` : ''}${size ? ` style="--media-ratio:${size[0] / size[1]}"` : ''}>
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
  const automatic = new WeakMap();
  const revealDelay = 90;
  let retryCount = 0;

  function reloadImage(image) {
    const source = image.dataset.mediaSrc;
    if (!assetPath.test(source) || !image.isConnected || !root.contains(image)) return;
    started.set(image, performance.now());
    setImageState(image, 'loading');
    retryCount += 1;
    image.src = `${source}?retry=${Date.now()}-${retryCount}`;
  }

  function failed(image) {
    const frame = image.closest('.media-frame');
    if (!frame || !image.isConnected || !root.contains(image)) return;
    const limit = Number(frame.dataset.mediaAutoRetry) || 0;
    const attempts = automatic.get(image) ?? { count: 0, timer: null };
    // Both an initial completed-but-failed check and an error event can reach
    // this path. Schedule only one retry for a particular image attempt.
    if (attempts.timer !== null) return;
    if (attempts.count < limit) {
      attempts.count += 1;
      setImageState(image, 'loading');
      attempts.timer = setTimeout(() => {
        attempts.timer = null;
        // A different era may have replaced this image while waiting.
        if (image.isConnected && root.contains(image)) reloadImage(image);
      }, attempts.count === 1 ? 250 : 900);
      automatic.set(image, attempts);
    } else {
      setImageState(image, 'error');
    }
  }

  const mark = state => ({ target }) => {
    if (!target.matches?.('img[data-media-image]')) return;
    if (state === 'error') { failed(target); return; }
    const attempts = automatic.get(target);
    if (attempts?.timer != null) clearTimeout(attempts.timer);
    automatic.delete(target);
    const start = started.get(target);
    setImageState(target, state, state === 'loaded' && start !== undefined && performance.now() - start >= revealDelay);
  };
  function prepare(image) {
    if (started.has(image)) return;
    started.set(image, performance.now());
    if (image.complete) {
      if (image.naturalWidth > 0) setImageState(image, 'loaded');
      else failed(image);
    }
  }
  root.addEventListener('load', mark('loaded'), true);
  root.addEventListener('error', mark('error'), true);

  root.addEventListener('click', event => {
    const frame = event.target.closest?.('[data-media-retry]')?.closest('.media-frame');
    const image = frame?.querySelector('img[data-media-image]');
    if (!image || frame.dataset.mediaState !== 'error') return;
    automatic.delete(image);
    reloadImage(image);
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
