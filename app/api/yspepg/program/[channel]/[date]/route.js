// app/api/yspepg/program/[channel]/[date]/route.js
// URL: /api/yspepg/program/fc06f469/20260626
// KCTV channel ID = md5("KCTV")[:8] = fc06f469

function encodeVarint(value) {
  const result = [];
  while (value > 127) {
    result.push((value & 0x7f) | 0x80);
    value >>= 7;
  }
  result.push(value);
  return Buffer.from(result);
}

function encodeString(fieldNum, str) {
  const b = Buffer.from(str, 'utf-8');
  const tag = Buffer.from([(fieldNum << 3) | 2]);
  return Buffer.concat([tag, encodeVarint(b.length), b]);
}

function encodeVarintField(fieldNum, value) {
  const tag = Buffer.from([(fieldNum << 3) | 0]);
  return Buffer.concat([tag, encodeVarint(value)]);
}

function encodeInt64(fieldNum, value) {
  const tag = Buffer.from([(fieldNum << 3) | 1]);
  const buf = Buffer.allocUnsafe(8);
  buf.writeBigInt64LE(BigInt(value), 0);
  return Buffer.concat([tag, buf]);
}

function encodeInt32(fieldNum, value) {
  const tag = Buffer.from([(fieldNum << 3) | 5]);
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(value, 0);
  return Buffer.concat([tag, buf]);
}

function getPyongyangTimestamp(dateStr, timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const year = parseInt(dateStr.slice(0, 4));
  const month = parseInt(dateStr.slice(4, 6));
  const day = parseInt(dateStr.slice(6, 8));
  // Pyongyang Time = UTC+9
  const dt = new Date(Date.UTC(year, month - 1, day, h - 9, m, 0));
  return Math.floor(dt.getTime() / 1000);
}

// Channel ID mapping (MD5-based)
const CHANNEL_IDS = {
  "fc06f469": "KCTV",  // md5("KCTV")[:8]
};

// Fetch from your existing JSON API
async function getKCTVPrograms(dateStr) {
  // Format date for your existing API: 2026-06-26
  const formattedDate = `${dateStr.slice(0,4)}-${dateStr.slice(4,6)}-${dateStr.slice(6,8)}`;

  const res = await fetch(`https://juche-tv-epg-api.vercel.app/api/bloxyplaytv?ch=KCTV&date=${formattedDate}`);

  if (!res.ok) {
    throw new Error(`Failed to fetch EPG: ${res.status}`);
  }

  const data = await res.json();

  // Convert your JSON format to protobuf format
  return data.programs.map((p, index) => ({
    id: `26${dateStr.slice(4,6)}${dateStr.slice(6,8)}${(index + 1).toString().padStart(4, '0')}`,
    start: p.start,
    end: p.end,
    ko: p.title.ko,
    en: p.title.en,
    zh: p.title.zh
  }));
}

export async function GET(request, { params }) {
  const { channel, date } = params;

  // Validate date format (YYYYMMDD)
  if (!/^\d{8}$/.test(date)) {
    return new Response(JSON.stringify({error: "Invalid date format. Use YYYYMMDD"}), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  // Check if channel exists
  const channelName = CHANNEL_IDS[channel];
  if (!channelName) {
    return new Response(JSON.stringify({error: "Channel not found"}), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }

  // Get programs for this channel
  let programs;
  try {
    if (channelName === "KCTV") {
      programs = await getKCTVPrograms(date);
    } else {
      return new Response(JSON.stringify({error: "Channel not implemented"}), {
        status: 501,
        headers: { "Content-Type": "application/json" }
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({error: err.message}), {
      status: 502,
      headers: { "Content-Type": "application/json" }
    });
  }

  // Build program messages
  const programBuffers = [];
  for (const p of programs) {
    const startTs = getPyongyangTimestamp(date, p.start);
    const endTs = getPyongyangTimestamp(date, p.end);
    const duration = endTs - startTs;

    let msg = Buffer.concat([]);
    msg = Buffer.concat([msg, encodeString(1, p.id)]);
    msg = Buffer.concat([msg, encodeString(2, p.ko)]);
    msg = Buffer.concat([msg, encodeInt64(3, startTs)]);
    msg = Buffer.concat([msg, encodeInt64(4, endTs)]);
    msg = Buffer.concat([msg, encodeString(5, p.start)]);
    msg = Buffer.concat([msg, encodeString(6, p.end)]);
    msg = Buffer.concat([msg, encodeInt32(7, duration)]);
    msg = Buffer.concat([msg, encodeString(8, p.en)]);
    msg = Buffer.concat([msg, encodeString(9, "1")]);
    msg = Buffer.concat([msg, encodeString(10, "1")]);
    msg = Buffer.concat([msg, encodeString(11, p.zh)]);

    programBuffers.push(msg);
  }

  // Build top-level message
  let top = encodeVarintField(1, 200);
  for (const msg of programBuffers) {
    const tag = Buffer.from([(2 << 3) | 2]);
    top = Buffer.concat([top, tag, encodeVarint(msg.length), msg]);
  }

  return new Response(top, {
    status: 200,
    headers: {
      "Content-Type": "application/x-protobuf",
      "Content-Length": top.length.toString(),
      "Cache-Control": "public, max-age=300"
    }
  });
}
