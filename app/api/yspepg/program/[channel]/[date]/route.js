// app/api/yspepg/program/[channel]/[date]/route.js
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET(request, { params }) {
  const { channel, date } = params;

  // KCTV = fc06f469
  if (channel !== "fc06f469") {
    return new Response(JSON.stringify({error: "Channel not found"}), {
      status: 404, headers: { "Content-Type": "application/json" }
    });
  }

  if (!/^\d{8}$/.test(date)) {
    return new Response(JSON.stringify({error: "Invalid date"}), {
      status: 400, headers: { "Content-Type": "application/json" }
    });
  }

  try {
    // Read pre-generated .bin file from public folder
    const filePath = join(process.cwd(), 'public', 'epg', `kctv_${date}.bin`);
    const buffer = readFileSync(filePath);

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/x-protobuf",
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "public, max-age=300"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({error: "EPG not found for this date"}), {
      status: 404, headers: { "Content-Type": "application/json" }
    });
  }
}
