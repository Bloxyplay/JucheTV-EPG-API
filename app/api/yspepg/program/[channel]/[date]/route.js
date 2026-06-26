// pages/api/yspepg/program/[channel]/[date].js
import { readFileSync } from 'fs';
import { join } from 'path';

export default function handler(req, res) {
  const { channel, date } = req.query;

  // KCTV = fc06f469 (md5("KCTV")[:8])
  if (channel !== "fc06f469") {
    return res.status(404).json({ error: "Channel not found" });
  }

  if (!/^\d{8}$/.test(date)) {
    return res.status(400).json({ error: "Invalid date. Use YYYYMMDD" });
  }

  try {
    const filePath = join(process.cwd(), 'public', 'epg', `kctv_${date}.bin`);
    const buffer = readFileSync(filePath);

    res.setHeader('Content-Type', 'application/x-protobuf');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.status(200).send(buffer);
  } catch (err) {
    res.status(404).json({ error: "EPG not found for this date" });
  }
}
