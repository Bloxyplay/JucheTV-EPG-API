import { readFileSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

const SECRET = process.env.TOKEN_SECRET;

const hits = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 20;

function isRateLimited(ip) {
  const now = Date.now();
  const record = hits.get(ip) || { count: 0, resetAt: now + WINDOW_MS };
  if (now > record.resetAt) {
    record.count = 0;
    record.resetAt = now + WINDOW_MS;
  }
  record.count++;
  hits.set(ip, record);
  return record.count > MAX_PER_WINDOW;
}

function verifyToken(ch, date, token, exp) {
  if (!token || !exp) return false;
  if (Date.now() > Number(exp)) return false;
  const expected = createHash('md5').update(`${ch}|${date}|${exp}|${SECRET}`).digest('hex');
  return expected === token;
}

function getRequestDomain(req) {
  const origin = req.headers['origin'] || req.headers['referer'];
  if (!origin) return null;
  try {
    return new URL(origin).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Rate limit exceeded. Try again shortly.' });
  }

  const koryoHeader = req.headers['x-koryo-tv'];
  const jucheHeader = req.headers['x-juche-tv'];
  const validKoryo = koryoHeader && koryoHeader === process.env.KORYO_HEADER_SECRET;
  const validJuche = jucheHeader && jucheHeader === process.env.JUCHE_HEADER_SECRET;

  const domain = getRequestDomain(req);

  let authorized;
  if (domain === 'koryofront.org') {
    authorized = validJuche;
  } else if (domain === 'juche-tv.vercel.app') {
    authorized = validKoryo;
  } else {
    authorized = validJuche && validKoryo;
  }

  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized: missing or invalid header(s) for this domain.' });
  }

  const { ch, date, token, exp } = req.query;

  if (!ch || !date) {
    return res.status(400).json({ error: 'Missing parameters. Use: ?ch=KCTV&date=2026-MM-DD&token=...&exp=...' });
  }

  if (!verifyToken(ch, date, token, exp)) {
    return res.status(401).json({ error: 'Missing, invalid, or expired token. Request one from /api/token.' });
  }

  if (ch !== 'KCTV') {
    return res.status(404).json({ error: 'Channel not found.' });
  }

  const filePath = join(process.cwd(), 'epg', ch, `${date}.json`);

  try {
    const data = readFileSync(filePath, 'utf8');
    const json = JSON.parse(data);
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(json);
  } catch (error) {
    res.status(404).json({ error: 'There is no EPG data here!', channel: ch, date: date });
  }
}
