// Original code-native line icons. Decorative only: surrounding UI supplies labels.
const paths={
 desk:'M4 5h16v14H4z M8 3v4 M16 3v4 M4 10h16 M8 14h3 M8 17h7',
 people:'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M3 20v-2a6 6 0 0 1 12 0v2 M16 5a3 3 0 0 1 0 6 M18 14a5 5 0 0 1 3 4v2',
 company:'M4 20V9l8-5 8 5v11 M2 20h20 M9 20v-6h6v6 M8 10h1 M15 10h1',
 journal:'M6 3h14v18H6a3 3 0 0 1 0-6h14 M3 18V6a3 3 0 0 1 3-3 M9 7h7 M9 10h5',
 warehouse:'M3 21V9l9-6 9 6v12 M7 21V11h10v10 M7 15h10 M7 18h10 M2 21h20',
 ship:'M5 11V6h14v5 M9 6V3h6v3 M3 12l9-3 9 3-3 7H6z M2 22q3-3 5 0 3-3 5 0 3-3 5 0 3-3 5 0',
 check:'M21 12a9 9 0 1 1-4-7 M7 12l4 4 10-11',
 calendar:'M5 5h14v16H5z M8 3v4 M16 3v4 M5 10h14 M9 14h1 M14 14h1 M9 17h1',
 heart:'M12 21 4 13C-2 6 7 0 12 7 17 0 26 6 20 13z',
 message:'M4 4h16v12H9l-5 5z M8 8h8 M8 12h5',
 quality:'M12 3l3 2 4 1 1 7-3 5-5 3-5-3-3-5 1-7 4-1z M8 12l3 3 5-6',
 growth:'M3 21h18 M6 17v-4 M12 17V9 M18 17V5 M4 8l7-5h6'
};
export const ICON_NAMES=Object.keys(paths);
export function uiIcon(name){const path=paths[name]||paths.check;return `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg>`;}
