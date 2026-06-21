import { readFileSync } from 'fs';
import { join } from 'path';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  const { ch, date } = req.query;
  
  if (!ch || !date) {
    return res.status(400).json({ 
      error: 'Missing parameters. Use: ?ch=KCTV&date=2026-06-21' 
    });
  }
  
  // Only KCTV supported for now
  if (ch !== 'KCTV') {
    return res.status(404).json({ 
      error: 'Channel not found. Only KCTV is available.' 
    });
  }
  
  const filePath = join(process.cwd(), 'epg', ch, `${date}.json`);
  
  try {
    const data = readFileSync(filePath, 'utf8');
    const json = JSON.parse(data);
    
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(json);
    
  } catch (error) {
    res.status(404).json({ 
      error: 'EPG not found for this date', 
      channel: ch, 
      date: date 
    });
  }
}
