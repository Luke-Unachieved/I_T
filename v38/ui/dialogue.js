// Direct speech is displayed in Chinese double quotes without changing the
// stored dialogue or adding a second pair around previously quoted lines.
export function quotedSpeech(value) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  const wrapped = (text.startsWith('“') && text.endsWith('”'))
    || (text.startsWith('「') && text.endsWith('」')) || (text.startsWith('"') && text.endsWith('"'));
  const inner = (wrapped ? text.slice(1, -1) : text).replaceAll('“', '‘').replaceAll('”', '’');
  return `“${inner}”`;
}
