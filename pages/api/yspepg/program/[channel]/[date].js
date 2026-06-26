// pages/api/yspepg/program/[channel]/[date].js
// OR app/api/yspepg/program/[channel]/[date]/route.js
// This version generates protobuf ON-THE-FLY from your existing JSON API
// No need for .bin files!

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
  const dt = new Date(Date.UTC(year, month - 1, day, h - 9, m, 0));
  return Math.floor(dt.getTime() / 1000);
}

// PAGES ROUTER VERSION
export default async function handler(req, res) {
  const { channel, date } = req.query;

  // KCTV = fc06f469
  if (channel !== "fc06f469") {
    return res.status(404).json({ error: "Channel not found" });
  }

  if (!/^\d{8}$/.test(date)) {
    return res.status(400).json({ error: "Invalid date. Use YYYYMMDD" });
  }

  try {
    // Fetch from your existing JSON API
    const formattedDate = `${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}`;
    const apiRes = await fetch(`https://juche-tv-epg-api.vercel.app/api/bloxyplaytv?ch=KCTV&date=${formattedDate}`);

    if (!apiRes.ok) {
      throw new Error(`Upstream API error: ${apiRes.status}`);
    }

    const data = await apiRes.json();

    // Build protobuf
    const programBuffers = [];
    for (let i = 0; i < data.programs.length; i++) {
      const p = data.programs[i];
      const startTs = getPyongyangTimestamp(date, p.start);
      const endTs = getPyongyangTimestamp(date, p.end);
      const duration = endTs - startTs;
      const progId = `26${date.slice(4,6)}${date.slice(6,8)}${(i + 1).toString().padStart(4, '0')}`;

      let msg = Buffer.concat([]);
      msg = Buffer.concat([msg, encodeString(1, progId)]);
      msg = Buffer.concat([msg, encodeString(2, p.title.ko)]);
      msg = Buffer.concat([msg, encodeInt64(3, startTs)]);
      msg = Buffer.concat([msg, encodeInt64(4, endTs)]);
      msg = Buffer.concat([msg, encodeString(5, p.start)]);
      msg = Buffer.concat([msg, encodeString(6, p.end)]);
      msg = Buffer.concat([msg, encodeInt32(7, duration)]);
      msg = Buffer.concat([msg, encodeString(8, p.title.en)]);
      msg = Buffer.concat([msg, encodeString(9, "1")]);
      msg = Buffer.concat([msg, encodeString(10, "1")]);
      msg = Buffer.concat([msg, encodeString(11, p.title.zh)]);

      programBuffers.push(msg);
    }

    let top = encodeVarintField(1, 200);
    for (const msg of programBuffers) {
      const tag = Buffer.from([(2 << 3) | 2]);
      top = Buffer.concat([top, tag, encodeVarint(msg.length), msg]);
    }

    res.setHeader('Content-Type', 'application/x-protobuf');
    res.setHeader('Content-Length', top.length);
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.status(200).send(top);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
