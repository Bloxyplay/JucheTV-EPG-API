// api/xmltv.js — GET /api/xmltv?days=2
// Builds an XMLTV guide from the same JSON EPG sources the site uses.
// KCTV: primary bloxyplaytv, falls back to KoryoFront if primary fails/empty.
// Sports TV / Ryongnamsan TV: primary only (no fallback source exists).

const CHANNELS = [
  {
    id: 'KCTV',
    name: 'Korean Central Television',
    icon: 'https://resources-juchetv.vercel.app/channels/assets/images/Korean-Central-Television.png',
    primary: (ds) => `https://juche-tv-epg-api.vercel.app/api/bloxyplaytv?ch=KCTV&date=${ds}`,
    fallback: (ds) => `https://juche-tv.vercel.app/api/KoryoFront?date=${ds}`,
  },
  {
    id: 'Sports-tv',
    name: 'Sports TV',
    icon: 'https://resources-juchetv.vercel.app/channels/assets/images/Sports-TV.png',
    primary: (ds) => `https://juche-tv-epg-api.vercel.app/api/bloxyplaytv?ch=sports-tv&date=${ds}`,
    fallback: null,
  },
  {
    id: 'Ryongnamsan',
    name: 'Ryongnamsan TV',
    icon: 'https://resources-juchetv.vercel.app/channels/assets/images/Ryongnamsan-tv.png',
    primary: (ds) => `https://juche-tv-epg-api.vercel.app/api/bloxyplaytv?ch=ryongnamsan&date=${ds}`,
    fallback: null,
  },
];

// ---- date helpers (Pyongyang = UTC+9, no DST) ----
function pyongyangNow() {
  return new Date(Date.now() + 9 * 60 * 60000 - new Date().getTimezoneOffset() * 60000 * 0 + 0);
}
function dsOf(d) {
  // d assumed already shifted to KST wall-clock via toISO trick below
  return d.toISOString().slice(0, 10);
}
function kstDateString(offsetDays) {
  const utcNow = new Date();
  const kst = new Date(utcNow.getTime() + 9 * 3600000);
  kst.setUTCDate(kst.getUTCDate() + offsetDays);
  return kst.toISOString().slice(0, 10);
}
function isoHHMM(iso) {
  if (!iso) return null;
  const m = /T(\d{2}):(\d{2})/.exec(iso);
  return m ? `${m[1]}:${m[2]}` : null;
}
function xmltvStamp(ds, hhmm) {
  // ds = 'YYYY-MM-DD', hhmm = 'HH:MM' (already Pyongyang wall-clock)
  const [y, mo, da] = ds.split('-');
  const [h, mi] = hhmm.split(':');
  return `${y}${mo}${da}${h}${mi}00 +0900`;
}
function addDays(ds, n) {
  const d = new Date(ds + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// ---- normalizers (mirrors the on-site logic, keeps date separate from time) ----
function normalizeJuche(raw) {
  return (raw.programs || []).map((p) => ({
    start: isoHHMM(p.start_time),
    end: isoHHMM(p.end_time),
    title: { en: p.title_en || '', ko: p.title_ko || '' },
    category: { en: p.program_type_en || p.genre || '', ko: p.program_type_ko || '' },
  })).filter((p) => p.start);
}
function normalizeKoryofront(raw) {
  return (raw.programs || []).map((p) => {
    const cat = p.category || '';
    const t = p.title;
    return {
      start: p.start || null,
      end: p.end || null,
      title: { en: (t && typeof t === 'object' ? t.en : (typeof t === 'string' ? t : '')) || '', ko: (t && typeof t === 'object' ? t.ko : '') || '' },
      category: { en: typeof cat === 'string' ? cat : (cat.en || ''), ko: typeof cat === 'string' ? cat : (cat.ko || '') },
    };
  }).filter((p) => p.start);
}
function normalizeEpgWrapped(raw) {
  const progs = (raw.epg && raw.epg.programs) || [];
  return progs.map((p) => {
    const t = p.title || {}, c = p.category || {};
    return {
      start: isoHHMM(p.start),
      end: isoHHMM(p.end),
      title: { en: t.en || '', ko: t.ko || '' },
      category: { en: c.en || '', ko: c.ko || '' },
    };
  }).filter((p) => p.start);
}
function normalizeFlatIso(raw) {
  return (raw.programs || []).map((p) => {
    const t = p.title || {}, c = p.category || {};
    return {
      start: isoHHMM(p.startTime),
      end: isoHHMM(p.endTime),
      title: { en: t.en || '', ko: t.ko || '' },
      category: { en: c.en || '', ko: c.ko || '' },
    };
  }).filter((p) => p.start);
}
function normalizePrimary(raw) {
  if (raw && raw.epg && Array.isArray(raw.epg.programs)) return normalizeEpgWrapped(raw);
  if (raw && Array.isArray(raw.programs) && raw.programs.length && raw.programs[0] && raw.programs[0].startTime) return normalizeFlatIso(raw);
  return normalizeJuche(raw);
}
function sortByStart(progs) {
  return progs.slice().sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
}
function withEnds(progs) {
  for (let i = 0; i < progs.length; i++) {
    if (!progs[i].end) progs[i].end = progs[i + 1] ? progs[i + 1].start : '24:00';
  }
  return progs;
}

async function fetchJSON(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function loadDayProgrammes(ch, ds) {
  try {
    const raw = await fetchJSON(ch.primary(ds));
    const progs = withEnds(sortByStart(normalizePrimary(raw)));
    if (progs.length) return progs;
    throw new Error('empty');
  } catch (e) {
    if (!ch.fallback) return [];
    try {
      const raw = await fetchJSON(ch.fallback(ds));
      const progs = withEnds(sortByStart(normalizeKoryofront(raw)));
      return progs;
    } catch (e2) {
      return [];
    }
  }
}

function xmlEscape(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export default async function handler(req, res) {
  const days = Math.min(Math.max(parseInt(req.query.days || '2', 10) || 2, 1), 7);
  const todayDS = kstDateString(0);

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += `<tv generator-info-name="Juche TV" generator-url="https://juche-tv.vercel.app">\n`;
  for (const ch of CHANNELS) {
    xml += `  <channel id="${ch.id}">\n`;
    xml += `    <display-name>${xmlEscape(ch.name)}</display-name>\n`;
    xml += `    <icon src="${xmlEscape(ch.icon)}"/>\n`;
    xml += `  </channel>\n`;
  }

  for (const ch of CHANNELS) {
    for (let i = 0; i < days; i++) {
      const ds = addDays(todayDS, i);
      const progs = await loadDayProgrammes(ch, ds);
      for (const p of progs) {
        // overnight wrap: if end <= start, it lands on the next calendar day
        const endDs = p.end <= p.start ? addDays(ds, 1) : ds;
        const startStamp = xmltvStamp(ds, p.start);
        const stopStamp = xmltvStamp(endDs, p.end === '24:00' ? '00:00' : p.end);
        xml += `  <programme start="${startStamp}" stop="${stopStamp}" channel="${ch.id}">\n`;
        if (p.title.en) xml += `    <title lang="en">${xmlEscape(p.title.en)}</title>\n`;
        if (p.title.ko) xml += `    <title lang="ko">${xmlEscape(p.title.ko)}</title>\n`;
        if (p.category.en) xml += `    <category lang="en">${xmlEscape(p.category.en)}</category>\n`;
        if (p.category.ko) xml += `    <category lang="ko">${xmlEscape(p.category.ko)}</category>\n`;
        xml += `  </programme>\n`;
      }
    }
  }

  xml += `</tv>\n`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
  res.status(200).send(xml);
}
