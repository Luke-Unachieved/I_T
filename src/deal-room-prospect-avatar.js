// The static asset literal is also replaced with embedded WebP in the offline build.
// Every accepted ID maps to exactly one cell. No save/user text enters the markup.
const ATLAS = 'assets/deal-prospects-v1.webp';
function avatarNumber(id) {
  if (Number.isInteger(id)) return id >= 1 && id <= 100 ? id : 0;
  if (typeof id !== 'string') return 0;
  const matched = /^(?:prospect-)?(00[1-9]|0[1-9][0-9]|100)$/.exec(id);
  return matched ? Number(matched[1]) : 0;
}
export function prospectAvatar(id) {
  const n = avatarNumber(id);
  if (!n) return '';
  const pos = (v) => Number((v * 100 / 9).toFixed(6));
  const x = pos((n - 1) % 10), y = pos(Math.floor((n - 1) / 10));
  return `<span class="prospect-avatar" aria-hidden="true" style="display:inline-block;flex:none;width:var(--prospect-avatar-size,3.5rem);height:var(--prospect-avatar-size,3.5rem);border-radius:var(--prospect-avatar-radius,.5rem);background-color:#e9dfcb;background-image:url('${ATLAS}');background-repeat:no-repeat;background-size:1000% 1000%;background-position:${x}% ${y}%"></span>`;
}
