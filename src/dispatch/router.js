const norm = (s) => String(s ?? '').toUpperCase().replace(/\s+/g, ' ').trim();
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// a code ending in * is a prefix: "1056*" matches 1056005, 1056013, and so on.
// It only counts at the start of a line (the dispatcher code leads the email),
// so address numbers like "1004 BETHLEHEM PIKE" can't trigger it.
function codeRegex(code) {
  const c = norm(code);
  const wildcard = c.endsWith('*');
  const base = escapeRe(wildcard ? c.slice(0, -1) : c);
  if (wildcard) return { re: new RegExp(`^${base}[0-9A-Z]*(?![A-Z0-9-])`), leading: true };
  return { re: new RegExp(`(?<![A-Z0-9-])${base}(?![A-Z0-9-])`), leading: false };
}

// a code starting with "NAT " matches the parsed call type (the NAT: field) instead of the
// whole email, e.g. "NAT BUILDING FIRE" or "NAT RESCUE". Needs the callType option.
const NAT_PREFIX = 'NAT ';

function matchChannels(mappings, text, { callType } = {}) {
  const callHaystack = ` ${norm(callType)} `;
  const haystack = ` ${norm(text)} `;
  const lines = String(text ?? '')
    .toUpperCase()
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const byChannel = new Map();
  for (const { channelId, code } of mappings) {
    const c = norm(code);
    if (!c) continue;
    let hit;
    if (c.startsWith(NAT_PREFIX)) {
      const needle = c.slice(NAT_PREFIX.length).trim();
      hit = Boolean(callType && needle) && new RegExp(`(?<![A-Z0-9-])${escapeRe(needle)}(?![A-Z0-9-])`).test(callHaystack);
    } else {
      const { re, leading } = codeRegex(c);
      hit = leading ? lines.some((l) => re.test(l)) : re.test(haystack);
    }
    if (!hit) continue;
    if (!byChannel.has(channelId)) byChannel.set(channelId, []);
    byChannel.get(channelId).push(code);
  }
  return [...byChannel].map(([channelId, codes]) => ({ channelId, codes }));
}

module.exports = { matchChannels };