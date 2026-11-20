/** Original, individually coded product geometry. Shared 120 × 90 coordinate system.
 * Static SVG fragments only; the caller supplies the SVG and accessible name.
 * Object/light/dark tokens tint materials, not the distinguishing silhouettes.
 */
export const MARKET_PIECES_A=Object.freeze({
  tray: `<g stroke="#403f37" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round">
    <path d="M15 43 87 28 107 49 34 65Z" fill="var(--mk-dark,#7b9184)"/>
    <path d="m15 43 2 9 17 21 71-16 2-8-73 16Z" fill="var(--mk-object,#dfaf78)"/>
    <path d="m15 34 72-15 20 21-73 16Z" fill="var(--mk-light,#f6e5bb)"/>
    <path d="m15 34 2 9 17 21 71-16 2-8-73 16Z" fill="var(--mk-object,#dfaf78)"/>
    <path d="m27 36 57-11 12 13-57 12Z" fill="none"/>
    <path d="m21 41 9 10m66-10 5-1M35 62l64-14" fill="none"/>
  </g>`,
  carafe: `<g stroke="#403f37" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round">
    <path d="M74 31c28-9 31 32 5 33l-1-9c15-1 14-21-3-15" fill="var(--mk-light,#f6e5bb)"/>
    <path d="M40 15h37l-6 10 3 15c2 10 9 19 7 29-1 7-9 9-25 9s-23-3-24-9c-2-11 7-21 10-31l2-13-8-6Z" fill="var(--mk-light,#f6e5bb)"/>
    <path d="M38 53c10 4 28 4 38 0l4 15c0 6-8 8-24 8s-22-3-22-8Z" fill="var(--mk-dark,#7b9184)"/>
    <path d="M41 17c8 3 24 3 32 0M44 27h26M44 39l-6 12m1 9-1 6" fill="none"/>
  </g>`,
  'salad-bowl': `<g stroke="#403f37" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round">
    <ellipse cx="60" cy="71" rx="22" ry="6" fill="var(--mk-dark,#7b9184)"/>
    <path d="M17 31c3 28 16 42 43 42s40-14 43-42Z" fill="var(--mk-object,#dfaf78)"/>
    <ellipse cx="60" cy="31" rx="43" ry="16" fill="var(--mk-light,#f6e5bb)"/>
    <ellipse cx="60" cy="32" rx="34" ry="10" fill="var(--mk-dark,#7b9184)"/>
    <path d="M30 49c5 10 13 16 23 17m-7-25c10 2 22 2 31-1" fill="none"/>
  </g>`,
  'serving-tongs': `<g stroke="#403f37" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round">
    <path d="M30 18c-7-2-11 4-8 11l34 34 5-5-31-31c-4-4-1-6 2-4l47 24 3-7Z" fill="var(--mk-light,#f6e5bb)"/>
    <path d="m54 59 7-4 15 7c5 3 5 7 0 9 3 5-2 9-6 6-2 4-7 3-8-1Z" fill="var(--mk-dark,#7b9184)"/>
    <path d="m77 43 3-7 18 2c5 1 6 5 2 8 5 3 2 8-2 8 0 5-5 6-8 2Z" fill="var(--mk-dark,#7b9184)"/>
    <path d="m36 31 19 19m-13-22 26 13m-6 24 8 7m16-29 9 5" fill="none"/>
  </g>`,
  'pepper-mill': `<g stroke="#403f37" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round">
    <path d="M43 36c0 10 7 12 7 21 0 7-9 11-9 17 10 5 29 5 39 0 0-6-9-10-9-17 0-9 7-11 7-21Z" fill="var(--mk-object,#dfaf78)"/>
    <ellipse cx="60" cy="36" rx="18" ry="7" fill="var(--mk-light,#f6e5bb)"/>
    <path d="M60 29V17h23" fill="none"/>
    <rect x="82" y="12" width="14" height="10" rx="4" fill="var(--mk-dark,#7b9184)"/>
    <path d="M46 70c8 3 20 3 29 0M53 48c4 1 10 1 14 0m-14 8 1 8m12-8-1 8" fill="none"/>
    <ellipse cx="60" cy="30" rx="4" ry="2" fill="var(--mk-dark,#7b9184)"/>
  </g>`,
  dripper: `<g stroke="#403f37" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round">
    <path d="M86 31c25-8 27 21 5 27l-5-8c13-2 14-15 1-11" fill="var(--mk-object,#dfaf78)"/>
    <ellipse cx="58" cy="73" rx="26" ry="6" fill="var(--mk-object,#dfaf78)"/>
    <path d="M25 28 48 68v5c6 3 14 3 20 0v-5l23-40Z" fill="var(--mk-light,#f6e5bb)"/>
    <ellipse cx="58" cy="28" rx="33" ry="13" fill="var(--mk-object,#dfaf78)"/>
    <ellipse cx="58" cy="28" rx="25" ry="8" fill="var(--mk-light,#f6e5bb)"/>
    <ellipse cx="58" cy="32" rx="5" ry="2" fill="var(--mk-dark,#7b9184)"/>
    <path d="m38 43 13 22m-1-21 6 22m12-22-4 22m17-24-11 21" fill="none"/>
  </g>`,
  pitcher: `<g stroke="#403f37" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round">
    <path d="M80 30h13c15 0 14 27 2 32l-15 5v-9l10-4c7-3 8-16 1-16H80Z" fill="var(--mk-light,#f6e5bb)"/>
    <path d="M25 21 44 27h36l5 44c-7 9-38 10-48 1l-1-34Z" fill="var(--mk-dark,#7b9184)"/>
    <path d="M25 21c17-4 40-6 55 6-8 8-29 9-44 5Z" fill="var(--mk-light,#f6e5bb)"/>
    <path d="M35 23c15-3 32-2 40 4-8 4-20 4-33 2Z" fill="var(--mk-object,#dfaf78)"/>
    <path d="m44 41 2 23m9-25h9m-8 8h8m-7 8h8m-7 8h8" fill="none"/>
  </g>`,
  'knock-box': `<g stroke="#403f37" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round">
    <path d="m20 28 6 41c19 11 49 11 68 0l6-41Z" fill="var(--mk-object,#dfaf78)"/>
    <ellipse cx="60" cy="28" rx="40" ry="14" fill="var(--mk-light,#f6e5bb)"/>
    <ellipse cx="60" cy="29" rx="32" ry="9" fill="var(--mk-dark,#7b9184)"/>
    <path d="m31 19 56 14c4 1 4 7 0 8L31 27c-4-1-4-7 0-8Z" fill="var(--mk-dark,#7b9184)"/>
    <path d="M32 45 35 63c13 6 37 6 50 0m-34-31 2 2m9 0 3 1m4 4 2 1" fill="none"/>
    <path d="M31 71v4m58-4v4" fill="none" stroke-width="3"/>
  </g>`,
  scale: `<g stroke="#403f37" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round">
    <path d="M28 38h64l10 32c1 5-3 8-8 8H26c-5 0-9-3-8-8Z" fill="var(--mk-object,#dfaf78)"/>
    <path d="M18 68c25 5 59 5 84 0" fill="none"/>
    <ellipse cx="60" cy="33" rx="34" ry="17" fill="var(--mk-dark,#7b9184)"/>
    <ellipse cx="60" cy="29" rx="34" ry="17" fill="var(--mk-light,#f6e5bb)"/>
    <path d="M34 27c4-6 15-9 26-9" fill="none"/>
    <rect x="41" y="54" width="31" height="12" rx="2" fill="var(--mk-dark,#7b9184)"/>
    <path d="M48 58v4m8-4v4m8-4v4" fill="none" stroke="var(--mk-light,#f6e5bb)"/>
    <circle cx="83" cy="60" r="4" fill="var(--mk-light,#f6e5bb)"/>
  </g>`,
  'chopping-board': `<g stroke="#403f37" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round">
    <path d="M24 21h72c5 0 8 3 8 8v39c0 5-3 8-8 8H24c-5 0-8-3-8-8V29c0-5 3-8 8-8Z" fill="var(--mk-dark,#7b9184)"/>
    <rect x="16" y="15" width="88" height="54" rx="8" fill="var(--mk-object,#dfaf78)"/>
    <rect x="23" y="22" width="74" height="40" rx="5" fill="none"/>
    <rect x="80" y="31" width="9" height="22" rx="4.5" fill="var(--mk-light,#f6e5bb)"/>
    <path d="M30 31h37m-37 9h27m-27 9h35m-35 6h18" fill="none" opacity=".55"/>
    <path d="M25 71v5m70-5v5" fill="none" stroke-width="4"/>
  </g>`,
  napkin: `<g stroke="#403f37" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round">
    <path d="m19 58 37-46 44 50-38 16Z" fill="var(--mk-object,#dfaf78)"/>
    <path d="m24 59 30-39 3 46Z" fill="var(--mk-light,#f6e5bb)"/>
    <path d="m57 66 3-47 33 41-31 14Z" fill="var(--mk-dark,#7b9184)"/>
    <path d="m58 67-2-55 6 66m-34-19 23-30m16 1 22 28" fill="none"/>
    <path d="m24 64 31 10m13 0 26-11" fill="none" stroke-dasharray="2 3"/>
  </g>`,
  apron: `<g stroke="#403f37" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round">
    <path d="M47 26v-8c0-10 26-10 26 0v8h-6v-7c0-4-14-4-14 0v7Z" fill="var(--mk-dark,#7b9184)"/>
    <path d="m34 42-16 7 2 7 15-5m51-9 16 7-2 7-15-5" fill="var(--mk-dark,#7b9184)"/>
    <path d="M44 24h32c-1 12 3 19 10 22l5 31c-19 4-43 4-62 0l5-31c7-3 11-10 10-22Z" fill="var(--mk-object,#dfaf78)"/>
    <path d="M45 50h30v15c-10 4-20 4-30 0Z" fill="var(--mk-light,#f6e5bb)"/>
    <path d="M60 51v16m-21 7c14 2 28 2 42 0M48 31h24" fill="none" stroke-dasharray="2 3"/>
  </g>`,
  'oven-mitt': `<g stroke="#403f37" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round">
    <path d="M42 71 29 55c-5-6-10-14-5-18 6-5 12 4 18 7l-2-18c-1-9 5-15 14-15 11-1 20 4 22 13l5 27c2 9-1 15-5 21Z" fill="var(--mk-object,#dfaf78)"/>
    <path d="m39 64 39-5 3 17-37 3Z" fill="var(--mk-dark,#7b9184)"/>
    <path d="m47 20 24 28m-29-6 18 19m-13-28 24-6m-22 20 26-8M48 17l21 5m-21 1 3 35m10-43 5 44" fill="none" opacity=".6"/>
    <path d="m47 72 28-4" fill="none" stroke="var(--mk-light,#f6e5bb)" stroke-dasharray="2 3"/>
    <path d="m77 73 8 4c4 2 8-5 4-7l-9-3" fill="none"/>
  </g>`,
  'bath-mat': `<g stroke="#403f37" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round">
    <path d="m32 19 72 8 2 42-15 8-77-15Z" fill="var(--mk-dark,#7b9184)"/>
    <path d="m32 15 72 8-16 49-74-15Z" fill="var(--mk-light,#f6e5bb)"/>
    <path d="m35 22 61 7-12 35-61-12Z" fill="var(--mk-object,#dfaf78)"/>
    <path d="m38 28 50 6m-53 1 50 7m-53 0 51 8m-53-1 51 9" fill="none" stroke-width="3"/>
    <path d="m88 72 2-18c4-2 9-1 16 2l-1 13-14 8Z" fill="var(--mk-dark,#7b9184)"/>
    <path d="m94 60 1 1m5 1 1 1m-7 4 1 1m5 1 1 1" fill="none" stroke-width="2.8"/>
  </g>`,
  pillowcase: `<g stroke="#403f37" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round">
    <path d="m21 21 78 3c-3 17-2 35 2 50L20 70c5-15 5-32 1-49Z" fill="var(--mk-object,#dfaf78)"/>
    <path d="m29 28 51 2c-2 12-2 24 1 35l-53-2c3-12 3-23 1-35Z" fill="var(--mk-light,#f6e5bb)"/>
    <path d="m80 30 13-2c-2 13-2 27 1 40l-13-3c-3-11-3-23-1-35Z" fill="var(--mk-dark,#7b9184)"/>
    <path d="m80 30-8 5 2 26 7 4" fill="none"/>
    <path d="m34 33 36 1m-37 24 37 2m-46-33c3 12 3 25-1 38" fill="none" stroke-dasharray="2 3"/>
  </g>`
});
