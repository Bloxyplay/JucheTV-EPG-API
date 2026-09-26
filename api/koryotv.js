// api/epg.js — Vercel Serverless Function (Node 18+, uses global fetch)
// Proxies the embedded programme data from https://koryo.tv/schedule
//
// Endpoints:
//   /api/epg                    -> full dataset (all channels, all days)
//   /api/epg?channel=kctv       -> only one channel (kctv | ryongnamsan | sportstv)
//   /api/epg?date=2026-09-26    -> only one broadcast date (Asia/Pyongyang)
//   /api/epg?channel=kctv&date=2026-09-26  -> combined filters
//
// Deploy: put this file in an "api/" folder at your repo root and push to Vercel.

const SOURCE_URL = "https://koryo.tv/schedule";

// ---------- helpers ----------

/** Pull the koryo.tv page and extract the embedded schedule JSON. */
async function fetchSchedule() {
  const res = await fetch(SOURCE_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      "Accept": "text/html,application/xhtml+xml",
    },
    // follow the site's own refresh hints without hammering it
    next: { revalidate: 1800 }, // cached 30 min (ignored on classic Node runtime)
  });

  if (!res.ok) {
    throw new Error(`Upstream koryo.tv responded ${res.status}`);
  }

  const html = await res.text();

  // The schedule is a <script> block that starts with {"schema_version"
  const blocks = html.match(/<script[^>]*>([\s\S]*?)<\/script>/g) || [];
  for (const block of blocks) {
    const inner = block.replace(/^<script[^>]*>/, "").replace(/<\/script>$/, "").trim();
    if (inner.startsWith('{"schema_version"')) {
      return JSON.parse(inner);
    }
  }

  throw new Error("Could not locate embedded schedule JSON (site layout changed?)");
}

/** Filter events by query params, without mutating the cached source data. */
function applyFilters(data, { channel, date }) {
  const out = { ...data };
  if (channel) {
    out.channels = (out.channels || []).filter((c) => c.id === channel);
    out.events = (out.events || []).filter((e) => e.channel === channel);
    out.availability = (out.availability || []).filter((a) => a.channel === channel);
  }
  if (date) {
    out.events = (out.events || []).filter((e) => e.broadcast_date === date);
    out.availability = (out.availability || []).filter((a) => a.date === date);
    if (out.channels) {
      out.channels = out.channels.map((c) => ({
        ...c,
        dates: (c.dates || []).filter((d) => d === date),
      }));
    }
  }
  return out;
}

// ---------- vercel handler ----------

export default async function handler(req, res) {
  // CORS so browser apps / players can call it directly
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=3600");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const data = await fetchSchedule();
    const { channel, date } = req.query || {};

    // validate channel if provided
    if (channel && !(data.channels || []).some((c) => c.id === channel)) {
      return res.status(400).json({
        error: `Unknown channel "${channel}"`,
        available: (data.channels || []).map((c) => c.id),
      });
    }

    // validate date if provided
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format, use YYYY-MM-DD' });
    }

    const payload = channel || date ? applyFilters(data, { channel, date }) : data;

    return res.status(200).json({
      ...payload,
      proxy: {
        source: SOURCE_URL,
        served_at: new Date().toISOString(),
        filters: { channel: channel || null, date: date || null },
      },
    });
  } catch (err) {
    return res.status(502).json({
      error: "Failed to fetch schedule from koryo.tv",
      detail: err.message,
    });
  }
}
