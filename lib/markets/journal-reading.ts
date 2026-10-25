/** Keep excerpts at Unicode code-point boundaries; never split an emoji surrogate pair. */
export function journalExcerpt(body: string, query = '', limit = 160) {
  const chars = Array.from(body);
  const max = Math.max(1, limit);
  const needle = query.trim().toLocaleLowerCase();
  const matchOffset = needle ? body.toLocaleLowerCase().indexOf(needle) : -1;
  const matchIndex = matchOffset < 0 ? -1 : Array.from(body.slice(0, matchOffset)).length;
  const isLong = chars.length > max || body.split('\n').length > 5;
  if (!isLong) return { text: body, truncated: false };
  const start = matchIndex < 0 ? 0 : Math.max(0, matchIndex - Math.floor(max / 3));
  const end = Math.min(chars.length, start + max);
  // Limit excessive blank lines too, while the expanded version stays untouched.
  const text = chars.slice(start, end).join('').replace(/\s+/g, ' ');
  return { text: `${start ? '…' : ''}${text}${end < chars.length ? '…' : ''}`, truncated: true };
}
