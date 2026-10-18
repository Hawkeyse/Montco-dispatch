const LABELS = ['MAP/BOX', 'PRE-PLAN', 'XST', 'MUN', 'NAT', 'ADC', 'TIME', 'NOTES', 'NOTE', 'TRUCKS', 'UNITS'];
const LABEL_RE = new RegExp(`\\b(${LABELS.join('|')})\\s*:`, 'gi');
const INCIDENT_RE = /(?:^|[\s,])I?#\s*([A-Z0-9]{4,})/i;
const INLINE_INCIDENT_RE = /,?\s*\bI#\s*[A-Z0-9]{4,}\s*,?/gi;
const AT_RE = /#[A-Z0-9]{4,}\s+at\s+(.+?)(?::|$)/i;
const MAX_GROUP = 40;

const clean = (s) => {
  const v = s?.trim().replace(/^[,;\s]+|[,;\s]+$/g, '');
  return v && /[A-Za-z0-9]/.test(v) ? v : undefined;
};

const fieldKey = (label) => {
  const k = label.toUpperCase();
  return k === 'NOTE' ? 'NOTES' : k;
};

function parseDispatch({ subject = '', body = '' } = {}) {
  const raw = String(body || '').trim() || String(subject || '').trim();
  let text = raw.replace(/\s+/g, ' ');

  const leadingCode = text.match(/^(\d{5,})\b/)?.[1];

  let group;
  const cut = text.lastIndexOf(' - ');
  if (cut !== -1) {
    const tail = text.slice(cut + 3).trim();
    if (tail && tail.length <= MAX_GROUP) {
      group = tail;
      text = text.slice(0, cut);
    }
  }

  const incidentId = text.match(INCIDENT_RE)?.[1]?.toUpperCase();
  text = text.replace(INLINE_INCIDENT_RE, ',');

  const seen = new Set();
  const matches = [...text.matchAll(LABEL_RE)].filter((m) => {
    const k = fieldKey(m[1]);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const fields = {};
  matches.forEach((m, i) => {
    const start = m.index + m[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    fields[fieldKey(m[1])] = clean(text.slice(start, end));
  });

  const head = text.slice(0, matches.length ? matches[0].index : text.length);
  const atMatch = head.match(AT_RE);
  const structured = matches.length > 0 || Boolean(atMatch);

  let address;
  let place;
  let apt;
  if (structured) {
    address =
      atMatch?.[1] ??
      head.replace(/(?:^|[\s,])I?#\s*[A-Z0-9]{4,}/i, '').replace(/^\s*\d{5,}\s+/, '');
    address = address.replace(/@.*$/, '').replace(/:\s*$/, '');
    place = head.match(/@\s*([^,]+)/)?.[1];
    apt = head.match(/\bAPT:\s*([^\s,]+)/i)?.[1];
  }

  return {
    leadingCode,
    incidentId,
    address: clean(address),
    apt: clean(apt),
    place: clean(place),
    crossStreets: fields.XST,
    municipality: fields.MUN,
    callType: fields.NAT,
    mapBox: fields['MAP/BOX'],
    prePlan: fields['PRE-PLAN'],
    adc: clean(fields.ADC?.split(',')[0]),
    time: fields.TIME,
    notes: fields.NOTES,
    units: fields.TRUCKS ?? fields.UNITS,
    group: clean(group),
    raw,
  };
}

module.exports = { parseDispatch };