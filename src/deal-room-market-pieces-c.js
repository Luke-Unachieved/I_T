// Original product drawings for the joint purchasing desk. The market frame provides
// the shared 120 × 90 coordinate system, dark outlines and tabletop shadow.
export const MARKET_PIECES_C = Object.freeze({
  'ratchet-set': `
    <g stroke="#353f40" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">
      <path d="m14 45 7-27q1-4 6-4h66q5 0 6 4l6 27Z" fill="#80918a"/>
      <path d="m21 41 5-21h66l6 21Z" fill="#d4dace"/>
      <path d="M15 45h89l7 24q1 4-3 5H13q-4-1-3-5Z" fill="#4e6962"/>
      <path d="m19 48-5 20h91l-5-20Z" fill="#a7b5a7"/>
      <path d="M42 74h7v3h-7Zm29 0h7v3h-7Z" fill="#d6b46e"/>
      <path d="M34 75h-3m58 0h-3" fill="none"/>
      <g fill="#b7c3c5">
        <path d="m28 29 6-3 6 3-1 9-6 2-6-3Zm15-2 6-3 6 3v10l-6 2-6-2Zm16-1 6-3 6 3 1 11-6 2-6-2Zm17-1 6-3 6 3 2 12-7 2-6-2Z"/>
        <path d="m28 29 5 2 7-2m3-2 6 3 6-3m4-1 6 3 6-3m5-1 6 3 6-3" fill="none"/>
      </g>
      <g fill="#465253" stroke="none">
        <path d="m31 29 3-1 3 1-4 1Zm15-2 3-1 3 1-3 1Zm16-1 3-1 3 1-3 1Zm17-1 3-1 3 1-3 1Z"/>
      </g>
      <path d="M25 51c-5 0-9 4-8 9s6 7 11 5l8-5 24 1 2-6-27-1c-3-2-6-4-10-3Z" fill="#c3ced0"/>
      <path d="m60 55 30-1q6 2 5 6l-4 3-30-2q-4-3-1-6Z" fill="#bc7655"/>
      <circle cx="25" cy="58" r="4" fill="#56646b"/>
      <path d="m24 56 3 1-1 3-3-1Z" fill="#e1e8e4" stroke-width="1"/>
      <path d="m68 57-1 3m8-3-1 3m8-3-1 3" fill="none" opacity=".65"/>
    </g>`,
  'lever-lock': `
    <g stroke="#393f3e" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
      <path d="m65 41 15-8 13 7v21l-15 9-13-8Z" fill="#9eaaab"/>
      <path d="m65 41 14 7 14-8m-14 8v22" fill="none"/>
      <path d="m83 35 5-3 14 7v24l-5 3-14-7Z" fill="#d3b384"/>
      <path d="m88 39 8 4v7l-8-4Z" fill="#647375"/>
      <path d="m88 39 5-2 8 4-5 2Z" fill="#d4dddd"/>
      <circle cx="91" cy="54" r="1" fill="#575c55"/>
      <path d="M31 20c-7 1-12 8-12 14s3 12 9 13l4-1 4-5-1-17Z" fill="#7e8d8d"/>
      <ellipse cx="33" cy="33" rx="10" ry="14" transform="rotate(18 33 33)" fill="#c8d2cd"/>
      <path d="M31 28q3-2 6 1l2 8q1 3 4 3l30-9q4-1 5 2l1 4-33 12q-10 3-13-5l-4-12Z" fill="#859da0"/>
      <path d="m36 32 3 9q3 4 8 2l28-9" fill="none" stroke="#edf2e9"/>
      <ellipse cx="35" cy="62" rx="9" ry="12" transform="rotate(17 35 62)" fill="#abbdbb"/>
      <path d="M35 57a3 3 0 0 1 2 5l1 4-6 1 1-5a3 3 0 0 1 2-5Z" fill="#384941"/>
      <path d="m49 68 9-4m-5 9 10-5" fill="none" stroke="#737b76" stroke-width="2.5"/>
    </g>`,
  'pet-harness': `
    <g stroke="#413e39" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 53c-7-13-4-30 3-37q4-4 8-1l9 5 10-5q6-3 10 1c8 10 10 24 5 37l-7-3c4-11 2-21-3-27l-9 5-10 1-9-6c-5 7-5 19-1 26Z" fill="#4b7c72"/>
      <path d="M18 48c11-4 16-9 18-17l8-3c3 9 10 15 19 17l-7 14-6 13-17 2-5-12Z" fill="#cb8a66"/>
      <path d="m24 50 12-8 5-8 5 7 10 8-6 12-4 7-10 1-5-10Z" fill="#dfaa7a"/>
      <path d="m17 53 11-3 4 7-12 5ZM54 48l10-4 4 7-11 5Z" fill="#648b7e"/>
      <rect x="55" y="47" width="11" height="7" rx="1.8" transform="rotate(-23 60 50)" fill="#394e49"/>
      <path d="m59 49 3-1" stroke="#e3d6b9"/>
      <path d="m35 29 9-2-1-6q-6-4-9 2Z" fill="#e8d3a0"/>
      <path d="M78 26c3-15 17-20 24-12 6 7-1 17-8 24l-5-4c9-8 13-15 10-18-4-4-12 2-15 12Z" fill="#6f9984"/>
      <path d="m79 25 6 1c-1 10 4 15 10 22s9 14 3 21-17 5-25 2l3-5c8 3 14 3 17-1 3-5-3-10-7-15-8-9-10-16-7-25Z" fill="#4c796f"/>
      <path d="m76 65-3 9-6-2 4-9Z" fill="#a5b9b4"/>
      <path d="M70 69c-5-2-9 0-9 4 0 4 5 5 8 1l4-5" fill="none" stroke="#53635e" stroke-width="3"/>
      <path d="m66 72 4-4" stroke="#d9dcca"/>
      <path d="m32 52 8 11 10-14" stroke="#a3684d" fill="none" stroke-dasharray="2 2"/>
    </g>`,
  'lint-refill': `
    <g stroke="#494840" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">
      <g transform="rotate(-17 57 37)">
        <path d="M31 21h51c6 1 10 8 10 16s-4 14-10 15H31Z" fill="#b7c9bc"/>
        <ellipse cx="31" cy="36.5" rx="10" ry="15.5" fill="#dbe4d6"/>
        <ellipse cx="31" cy="36.5" rx="4.5" ry="8" fill="#a18c6b"/>
        <path d="M52 24q4 9 18 23m7-21 5 6" fill="none" stroke="#7d9688" stroke-dasharray="2.5 3"/>
      </g>
      <g transform="rotate(14 57 56)">
        <path d="M34 39h47c8 0 14 7 14 16s-6 17-14 17H34Z" fill="#e8dcb4"/>
        <path d="M55 40 74 62l10-5c6 7 11 10 19 12-6 4-13 5-20 3l-13-4Z" fill="#faf0d8"/>
        <path d="M76 61c5 6 12 9 17 10" fill="none" stroke="#b9a687" stroke-width="1.2"/>
        <ellipse cx="33" cy="55.5" rx="12" ry="16.5" fill="#f6ecd0"/>
        <ellipse cx="33" cy="55.5" rx="7" ry="10.5" fill="#c8b288"/>
        <ellipse cx="32" cy="55.5" rx="4" ry="7.5" fill="#746956"/>
        <path d="m43 43 16 24" fill="none" stroke="#bda57f" stroke-dasharray="2.5 3"/>
      </g>
    </g>`
});
