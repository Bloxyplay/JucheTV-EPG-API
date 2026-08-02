import { createHash } from 'crypto';

const SECRET = process.env.TOKEN_SECRET;
const PROXY_SECRET = process.env.PROXY_SECRET;

function makeToken(ch, date, exp) {
  return createHash('md5').update(`${ch}|${date}|${exp}|${SECRET}`).digest('hex');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-PROXY-SECRET');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const { ch, date, type } = req.query;

  if (!ch || !date) {
    return res.status(400).json({ error: 'Missing ch or date' });
  }

  const isProxy = type === 'proxy';

  if (isProxy) {
    const provided = req.headers['x-proxy-secret'];
    if (!provided || provided !== PROXY_SECRET) {
      return res.status(403).json({ error: 'Invalid proxy secret' });
    }
  }

  const ttlMs = isProxy ? 2 * 60 * 60 * 1000 : 5 * 60 * 1000;
  const exp = Date.now() + ttlMs;
  const token = makeToken(ch, date, exp);

  res.status(200).json({
    token,
    exp,
    url: `https://juche-tv-epg-api.vercel.app/api/bloxyplaytv?ch=${ch}&date=${date}&token=${token}&exp=${exp}`
  });
}
