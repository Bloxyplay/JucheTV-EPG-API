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
    ko: "조선중앙텔레비죤 시험화면",
    en: "Korean Central Television Test Card",
    zh: "朝鲜中央电视台测试卡",
    my: "ကိုရီးယားဗဟိုရုပ်မြင်သံကြား စမ်းသပ်ကတ်",
    ru: "Испытательная таблица Корейского центрального телевидения",
    ja: "朝鮮中央テレビジョン テストカード",
    es: "Carta de ajuste de la Televisión Central de Corea",
    fr: "Mire de la Télévision centrale coréenne",
    de: "Testbild des Koreanischen Zentralfernsehens",
    kk: "Корея орталық теледидарының сынақ кестесі",
    bo: "ཁྲའོ་ཞན་ཀྲུང་དབྱང་བརྙན་འཕྲིན་ཁང་གི་ཚོད་ལྟའི་བྱང་བུ།",
    kham: "ཁྲའོ་ཞན་ཀྲུང་དབྱང་བརྙན་འཕྲིན་ཁང་གི་ཚོད་ལྟའི་བྱང་བུ།",
    amdo: "ཁྲའོ་ཞན་ཀྲུང་དབྱང་བརྙན་འཕྲིན་ཁང་གི་ཚོད་ལྟའི་བྱང་བུ།",
    mn: "Солонгосын Төв Телевизийн хяналтын хуудас"
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
  },
  anthemTitle: {
    ko: "조선중앙텔레비죤 애국가 및 오늘의 방송순서",
    en: "Korean Central Television Startup National Anthem & Today's Order",
    zh: "朝鲜中央电视台开台国歌与今日节目单",
    my: "ကိုရီးယားဗဟိုရုပ်မြင်သံကြား နိုင်ငံတော်သီချင်းနှင့် ယနေ့အစီအစဉ်",
    ru: "Гимн открытия Корейского центрального телевидения и программа передач на сегодня",
    ja: "朝鮮中央テレビジョン 開始国歌および今日の放送順序",
    es: "Himno Nacional de Apertura de la Televisión Central de Corea y Programación de Hoy",
    fr: "Hymne national d'ouverture de la Télévision centrale coréenne et programme d'aujourd'hui",
    de: "Nationalhymne zur Eröffnung des Koreanischen Zentralfernsehens und heutiges Programm",
    kk: "Корея орталық теледидарының ашылу гимні және бүгінгі бағдарлама",
    bo: "ཁྲའོ་ཞན་ཀྲུང་དབྱང་བརྙན་འཕྲིན་ཁང་གི་སྒོ་འབྱེད་རྒྱལ་གླུ་དང་དེ་རིང་གི་ལེ་ཚན་ཐོ་གཞུང་།",
    kham: "ཁྲའོ་ཞན་ཀྲུང་དབྱང་བརྙན་འཕྲིན་ཁང་གི་སྒོ་འབྱེད་རྒྱལ་གླུ་དང་དེ་རིང་གི་ལེ་ཚན་ཐོ་གཞུང་།",
    amdo: "ཁྲའོ་ཞན་ཀྲུང་དབྱང་བརྙན་འཕྲིན་ཁང་གི་སྒོ་འབྱེད་རྒྱལ་གླུ་དང་དེ་རིང་གི་ལེ་ཚན་ཐོ་གཞུང་།",
    mn: "Солонгосын Төв Телевизийн нээлтийн төрийн дуулал ба өнөөдрийн хөтөлбөр"
  },
  anthemCategory: {
    ko: "방송개시",
    en: "Opening Broadcast",
    zh: "开台",
    my: "ထုတ်လွှင့်မှုစတင်ခြင်း",
    ru: "Начало вещания",
    ja: "放送開始",
    es: "Inicio de transmisión",
    fr: "Début des émissions",
    de: "Sendebeginn",
    kk: "Эфирдің басталуы",
    bo: "རྒྱང་སྲིང་འགོ་འཛུགས།",
    kham: "རྒྱང་སྲིང་འགོ་འཛུགས།",
    amdo: "རྒྱང་སྲིང་འགོ་འཛུགས།",
    mn: "Нэвтрүүлгийн эхлэл"
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
    
    if (json.programs && Array.isArray(json.programs)) {
      
      // Get the dynamic start time of the first JSON program to link the anthem's end time
      const firstProgramStartTime = json.programs.length > 0 ? json.programs[0].start : "09:30"; 
      
      // 1. Prepare morning Off-Air block
      const startOffAir = {
        start: "23:00",
        end: "08:25",
        title: programTranslations.offAirTitle,
        category: programTranslations.offAirCategory
      };

      // 2. Prepare standalone Test Card block
      const startTestCard = {
        start: "08:25",
        end: "09:00",
        title: programTranslations.testCardTitle,
        category: programTranslations.testCardCategory
      };

      // 3. Prepare Anthem & Order block linking up to the very first broadcast
      const startAnthem = {
        start: "09:00",
        end: firstProgramStartTime, 
        title: programTranslations.anthemTitle,
        category: programTranslations.anthemCategory
      };

      // Prepend the items to the beginning of the EPG array in chronological order
      json.programs.unshift(startOffAir, startTestCard, startAnthem);

      // 4. Prepare evening Off-Air block
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
