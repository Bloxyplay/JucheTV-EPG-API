import { readFileSync } from 'fs';
import { join } from 'path';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  const { ch, date } = req.query;
  
  if (!ch || !date) {
    return res.status(400).json({ 
      error: 'Missing parameters. Use: ?ch=KCTV&date=2026-MM-DD' 
    });
  }
  
  // Only KCTV supported for now
  if (ch !== 'KCTV') {
    return res.status(404).json({ 
      error: 'Channel not found.' 
    });
  }
  
  const filePath = join(process.cwd(), 'epg', ch, `${date}.json`);
  
  try {
    // Attempt to read the actual EPG file
    const data = readFileSync(filePath, 'utf8');
    const json = JSON.parse(data);
    
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(json);
    
  } catch (error) {
    // FALLBACK: If file doesn't exist, generate an hour-by-hour EPG
    const defaultTitle = {
      ko: "조선중앙텔레비죤",
      en: "Wonderful Program",
      zh: "精彩节目",
      my: "အံ့သြဖွယ်အစီအစဉ်",
      ru: "Замечательная программа",
      ja: "素晴らしい番組",
      es: "Programa Maravilloso",
      fr: "Programme Merveilleux",
      de: "Wunderbares Programm",
      kk: "Керемет бағдарлама",
      bo: "ལེ་ཚན་ངོ་མཚར་ཅན།",
      mn: "Гайхамшигт хөтөлбөр"
    };

    const generatedPrograms = [];

    // Loop to create hour-by-hour programs from 09:00 to 22:00
    for (let i = 9; i < 22; i++) {
      const startHour = i.toString().padStart(2, '0');
      const endHour = (i + 1).toString().padStart(2, '0');
      
      generatedPrograms.push({
        start: `${startHour}:00`,
        end: `${endHour}:00`,
        title: defaultTitle,
        category: "General"
      });
    }

    // Add the final block from 22:00 to 22:15
    generatedPrograms.push({
      start: "22:00",
      end: "22:15",
      title: defaultTitle,
      category: "General"
    });

    const fallbackEPG = {
      channel: ch,
      date: date,
      source: "Korean Central Television (Juche TV)",
      programs: generatedPrograms
    };

    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(fallbackEPG);
  }
}
