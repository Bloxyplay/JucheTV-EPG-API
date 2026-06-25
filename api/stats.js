// /api/stats.js
// Vercel Serverless Function — Proxy for KCTV stats API
// Endpoint style: /api/stats?ch=kctv&source=juchetv
// Or path style: /api/stats/ch=kctv/juchetv
// Deploy this to your Vercel project under the /api/ directory

export default async function handler(req, res) {
  // ─── CORS ───
  const allowedOrigins = [
    'https://juchetv.vercel.app',
    'https://juchetv.com',
    'http://localhost:3000',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'null', // for file:// local testing
  ];

  const origin = req.headers.origin || '';
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=30');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ─── PARSE CHANNEL FROM URL ───
  // Supports ?ch=kctv&source=juchetv  OR  /api/stats/ch=kctv/juchetv
  let channel = 'kctv';
  let source = 'juchetv';

  if (req.query.ch) {
    channel = req.query.ch;
    source = req.query.source || source;
  } else if (req.url) {
    // Path-based: /api/stats/ch=kctv/juchetv
    const match = req.url.match(/ch=([^/&?]+)(?:\/([^/&?]+))?/);
    if (match) {
      channel = match[1];
      if (match[2]) source = match[2];
    }
  }

  // ─── BUILD UPSTREAM URL ───
  const upstreamBase = 'https://kctv.koryofront.org/api/stats';
  const upstreamUrl = channel !== 'kctv'
    ? `${upstreamBase}?ch=${encodeURIComponent(channel)}`
    : upstreamBase;

  try {
    const apiRes = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'JucheTV-StatusBot/1.0',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!apiRes.ok) {
      const text = await apiRes.text();
      return res.status(apiRes.status).json({
        error: 'Upstream API error',
        status: apiRes.status,
        statusText: apiRes.statusText,
        body: text.slice(0, 500),
        channel,
        source,
      });
    }

    const data = await apiRes.json();

    // Inject proxy metadata
    data._proxy = {
      fetchedAt: new Date().toISOString(),
      source: upstreamUrl,
      channel,
      requestedBy: source,
      cached: false,
    };

    return res.status(200).json(data);

  } catch (error) {
    console.error('Proxy fetch failed:', error);
    return res.status(502).json({
      error: 'Failed to fetch from upstream',
      message: error.message,
      channel,
      source,
      fetchedAt: new Date().toISOString(),
    });
  }
}
