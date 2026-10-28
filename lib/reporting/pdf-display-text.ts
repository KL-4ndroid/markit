/** Bound user-authored labels in the fixed five-page summary, preserving Unicode. */
export function compactPdfText(value: string, limit = 36): string {
  const characters = Array.from(value.replace(/\s+/g, ' ').trim());
  return characters.length <= limit ? characters.join('') : `${characters.slice(0, limit - 1).join('')}…`;
}

/** Long unbroken CJK/Latin labels must not escape a react-pdf table cell. */
export function wrapPdfText(value: string, limit = 36, lineLength = 18): string {
  const characters = Array.from(compactPdfText(value, limit));
  const lines: string[] = [];
  for (let offset = 0; offset < characters.length; offset += lineLength) {
    lines.push(characters.slice(offset, offset + lineLength).join(''));
  }
  return lines.join('\n');
}
