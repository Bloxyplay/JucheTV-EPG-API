import { readFileSync } from 'fs';
import { join } from 'path';

// Translation dictionaries for the auto-added programs
const programTranslations = {
  offAirTitle: {
    ko: "방송 종료",
    en: "Off Air",
    zh: "停播",
    my: "ထုတ်လွှင့်မှုရပ်နားခြင်း",
    ru: "Конец эфира",
    ja: "放送休止",
    es: "Fin de transmisión",
    fr: "Fin de diffusion",
    de: "Sendeschluss",
    kk: "Эфирдің аяқталуы",
    bo: "རྒྱང་སྲིང་མཚམས་འཇོག",
    kham: "རྒྱང་སྲིང་མཚམས་འཇོག",
    amdo: "རྒྱང་སྲིང་མཚམས་འཇོག",
    mn: "Нэвтрүүлгийн төгсгөл"
  },
  offAirCategory: {
    ko: "텔레비죤 방송 종료",
    en: "Television OFF AIR",
    zh: "电视停播",
    my: "ရုပ်မြင်သံကြား ထုတ်လွှင့်မှုရပ်နားခြင်း",
    ru: "Телевидение ВНЕ ЭФИРА",
    ja: "テレビ放送休止",
    es: "Televisión FUERA DEL AIRE",
    fr: "Télévision HORS ANTENNE",
    de: "Fernsehen SENDESCHLUSS",
    kk: "Теледидар ЭФИРДЕН ТЫС",
    bo: "བརྙན་འཕྲིན་རྒྱང་སྲིང་མཚམས་འཇོག",
    kham: "བརྙན་འཕྲིན་རྒྱང་སྲིང་མཚམས་འཇོག",
    amdo: "བརྙན་འཕྲིན་རྒྱང་སྲིང་མཚམས་འཇོག",
    mn: "Телевизийн нэвтрүүлэг ЗОГССОН"
  },
  testCardTitle: {
    ko: "조선중앙텔레비죤 시험화면 및 방송개시곡",
    en: "Korean Central Television Test Card & Opening Anthem",
    zh: "朝鲜中央电视台测试卡与开台曲",
    my: "ကိုရီးယားဗဟိုရုပ်မြင်သံကြား စမ်းသပ်ကတ်နှင့် အဖွင့်သီချင်း",
    ru: "Испытательная таблица Корейского центрального телевидения и гимн открытия",
    ja: "朝鮮中央テレビジョン テストカードおよび放送開始曲",
    es: "Carta de ajuste de la Televisión Central de Corea y el himno de apertura",
    fr: "Mire de la Télévision centrale coréenne et hymne d'ouverture",
    de: "Testbild des Koreanischen Zentralfernsehens und Eröffnungshymne",
    kk: "Корея орталық теледидарының сынақ кестесі және ашылу гимні",
    bo: "ཁྲའོ་ཞན་ཀྲུང་དབྱང་བརྙན་འཕྲིན་ཁང་གི་ཚོད་ལྟའི་བྱང་བུ་དང་སྒོ་འབྱེད་གླུ་དབྱངས།",
    kham: "ཁྲའོ་ཞན་ཀྲུང་དབྱང་བརྙན་འཕྲིན་ཁང་གི་ཚོད་ལྟའི་བྱང་བུ་དང་སྒོ་འབྱེད་གླུ་དབྱངས།",
    amdo: "ཁྲའོ་ཞན་ཀྲུང་དབྱང་བརྙན་འཕྲིན་ཁང་གི་ཚོད་ལྟའི་བྱང་བུ་དང་སྒོ་འབྱེད་གླུ་དབྱངས།",
    mn: "Солонгосын Төв Телевизийн хяналтын хуудас ба нээлтийн сүлд дуу"
  },
  testCardCategory: {
    ko: "텔레비죤 시험화면",
    en: "Television Test Card",
    zh: "电视测试卡",
    my: "ရုပ်မြင်သံကြား စမ်းသပ်ကတ်",
    ru: "Телевизионная испытательная таблица",
    ja: "テレビテストカード",
    es: "Carta de ajuste de televisión",
    fr: "Mire de télévision",
    de: "Fernseh-Testbild",
    kk: "Теледидар сынақ кестесі",
    bo: "བརྙན་འཕྲིན་ཚོད་ལྟའི་བྱང་བུ།",
    kham: "བརྙན་འཕྲིན་ཚོད་ལྟའི་བྱང་བུ།",
    amdo: "བརྙན་འཕྲིན་ཚོད་ལྟའི་བྱང་བུ།",
    mn: "Телевизийн хяналтын хуудас"
  }
};

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
    const data = readFileSync(filePath, 'utf8');
    const json = JSON.parse(data);
    
    // Check if programs array exists to inject the new schedules
    if (json.programs && Array.isArray(json.programs)) {
      
      // 1. Prepare morning Off-Air block
      const startOffAir = {
        start: "23:00",
        end: "08:25",
        title: programTranslations.offAirTitle,
        category: programTranslations.offAirCategory
      };

      // 2. Prepare Test Card block
      const startTestCard = {
        start: "08:25",
        end: "09:00",
        title: programTranslations.testCardTitle,
        category: programTranslations.testCardCategory
      };

      // Prepend the items to the beginning of the EPG array
      json.programs.unshift(startOffAir, startTestCard);

      // 3. Prepare evening Off-Air block
      // To prevent overlapping with the dynamic length of daily programming, 
      // we check the final program's end time (e.g. "22:30"). 
      // If none exists, it defaults to your requested "22:00".
      const lastProgram = json.programs[json.programs.length - 1];
      const dynamicEndStartTime = lastProgram ? lastProgram.end : "22:00";

      const endOffAir = {
        start: dynamicEndStartTime, 
        end: "23:00",
        title: programTranslations.offAirTitle,
        category: programTranslations.offAirCategory
      };

      // Append the final off-air block to the end of the EPG array
      json.programs.push(endOffAir);
    }
    
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(json);
    
  } catch (error) {
    res.status(404).json({ 
      error: 'There is no EPG data here!', 
      channel: ch, 
      date: date 
    });
  }
}
