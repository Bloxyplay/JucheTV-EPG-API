import { readFileSync } from 'fs';
import { join } from 'path';

const BANNED_DOMAINS = ['koryo.tv'];

// Always served clean, no matter what BANNED_DOMAINS contains —
// checked first so this can never be short-circuited by a future
// accidental substring collision.
const SAFE_DOMAINS = ['koryofront.org', 'juche-tv.vercel.app'];

const WATERMARK = 'Made with ❤️ by Juche TV';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_CHANNELS = new Set(['KCTV']);

function getOrigin(req) {
  return (req.headers.origin || req.headers.referer || '').toLowerCase();
}

function isSafe(req) {
  const origin = getOrigin(req);
  if (!origin) return true; // no origin/referer = direct/server call, never poison these
  return SAFE_DOMAINS.some(domain => origin.includes(domain));
}

function isBanned(req) {
  if (isSafe(req)) return false;
  const origin = getOrigin(req);
  return BANNED_DOMAINS.some(domain => origin.includes(domain));
}

function watermarkProgram(program) {
  const out = { ...program };

  if (out.title && typeof out.title === 'object') {
    out.title = { ...out.title };
    if (typeof out.title.en === 'string' && out.title.en.trim()) {
      out.title.en = `${out.title.en} — ${WATERMARK}`;
    }
    if (typeof out.title.ko === 'string' && out.title.ko.trim()) {
      out.title.ko = `${out.title.ko} — ${WATERMARK}`;
    }
  } else if (typeof out.title === 'string' && out.title.trim()) {
    out.title = `${out.title} — ${WATERMARK}`;
  }

  return out;
}

function watermarkData(json) {
  if (!json || !Array.isArray(json.programs)) return json;
  return { ...json, programs: json.programs.map(watermarkProgram) };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const { ch, date } = req.query;

  if (!ch || !date) {
    return res.status(400).json({
      error: 'Missing parameters. Use: ?ch=KCTV&date=2026-MM-DD'
    });
  }

  if (!VALID_CHANNELS.has(ch)) {
    return res.status(404).json({ error: 'Channel not found.' });
  }

  if (!DATE_RE.test(date)) {
    return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
  }

  const filePath = join(process.cwd(), 'epg', ch, `${date}.json`);

  try {
    const raw = readFileSync(filePath, 'utf8');
    let json = JSON.parse(raw);

    if (isBanned(req)) {
      json = watermarkData(json);
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    return res.status(200).json(json);

  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({
        error: 'There is no EPG data here!',
        channel: ch,
        date: date
      });
    }
    console.error('EPG read/parse error:', error);
    return res.status(500).json({ error: 'Failed to load EPG data.' });
  }
}
