import { readFileSync } from 'fs';
import { join } from 'path';

// Translation dictionaries for the auto-added programs
const programTranslations = {
  offAirTitle: {
    ko: "방송 종료",
    en: "Off Air.",
    zh: "停播",
    my: "ထုတ်လွှင့်မှုရပ်နားခြင်း",
    ru: "Конец эфира",
    ja: "放送休止",
    es: "Fin de transmisión",
    fr: "Fin de diffusion",
    de: "Sendeschluss",
    kk: "Эфирдің аяқталуы",
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
    mn: "Нэвтрүүлгийн эхлэл"
  }
};

// Helpers for new lean structure
const fmtDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const fmtISO = (d, time) => `${fmtDate(d)}T${time}:00+09:00`;

const computeDuration = (startISO, endISO) => {
  const start = new Date(startISO);
  const end = new Date(endISO);
  const diffMs = end - start;
  if (diffMs <= 0) return { duration: 'PT0M', minutes: 0 };
  const minutes = Math.round(diffMs / 60000);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  let dur = 'PT';
  if (h > 0) dur += `${h}H`;
  if (m > 0 || h === 0) dur += `${m}M`;
  return { duration: dur, minutes };
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { ch, date } = req.query;

  if (!ch || !date) {
    return res.status(400).json({
      error: 'Missing parameters. Use: ?ch=KCTV&date=YYYY-MM-DD'
    });
  }

  if (ch !== 'KCTV') {
    return res.status(404).json({
      error: 'Channel not found.'
    });
  }

  const filePath = join(process.cwd(), 'epg', ch, `${date}.json`);

  try {
    const data = readFileSync(filePath, 'utf8');
    const json = JSON.parse(data);

    if (!json.programs || !Array.isArray(json.programs)) {
      return res.status(500).json({ error: 'Invalid EPG data: missing programs array' });
    }

    // Detect structure
    const isOldStructure = typeof json.channel === 'string';
    const isNewStructure = typeof json.channel === 'object' && json.channel !== null;

    if (!isOldStructure && !isNewStructure) {
      return res.status(500).json({ error: 'Unrecognized EPG structure' });
    }

    if (isOldStructure) {
      // ========== OLD STRUCTURE ==========
      const firstProgramStart = json.programs.length > 0 ? json.programs[0].start : '09:30';
      const lastProgram = json.programs[json.programs.length - 1];
      const dynamicEndStart = lastProgram ? lastProgram.end : '22:00';

      const startOffAir = {
        start: '23:00',
        end: '08:25',
        title: programTranslations.offAirTitle,
        category: programTranslations.offAirCategory
      };
      const startTestCard = {
        start: '08:25',
        end: '09:00',
        title: programTranslations.testCardTitle,
        category: programTranslations.testCardCategory
      };
      const startAnthem = {
        start: '09:00',
        end: firstProgramStart,
        title: programTranslations.anthemTitle,
        category: programTranslations.anthemCategory
      };
      const endOffAir = {
        start: dynamicEndStart,
        end: '23:00',
        title: programTranslations.offAirTitle,
        category: programTranslations.offAirCategory
      };

      json.programs.unshift(startOffAir, startTestCard, startAnthem);
      json.programs.push(endOffAir);

    } else {
      // ========== NEW LEAN STRUCTURE ==========
      const [year, month, day] = date.split('-').map(Number);
      const prevDay = new Date(year, month - 1, day - 1);
      const currDay = new Date(year, month - 1, day);
      const dateSlug = date.replace(/-/g, '');

      const firstProgramStartISO =
        json.programs.length > 0 ? json.programs[0].start_time : fmtISO(currDay, '09:30');
      const lastProgram = json.programs[json.programs.length - 1];
      const dynamicEndStartISO = lastProgram ? lastProgram.end_time : fmtISO(currDay, '22:00');

      const buildLeanEntry = (idSuffix, startISO, endISO, titleKo, titleEn, ptypeKo, ptypeEn, genre, descKo, descEn, extra = {}) => {
        const dur = computeDuration(startISO, endISO);
        return {
          program_id: `kctv-${dateSlug}-${idSuffix}`,
          start_time: startISO,
          end_time: endISO,
          title_ko: titleKo,
          title_en: titleEn,
          program_type_ko: ptypeKo,
          program_type_en: ptypeEn,
          genre,
          description_ko: descKo,
          description_en: descEn,
          is_live: extra.is_live ?? false,
          is_rerun: extra.is_rerun ?? false,
          original_broadcast_date: extra.original_broadcast_date ?? '',
          off_air: extra.off_air ?? false,
          kim_jong_un_featured: extra.kim_jong_un_featured ?? false,
          foreign_origin: extra.foreign_origin ?? false,
          origin_country: extra.origin_country ?? ''
        };
      };

      const startOffAirISOStart = fmtISO(prevDay, '23:00');
      const startOffAirISOEnd = fmtISO(currDay, '08:25');
      const startOffAir = buildLeanEntry(
        'offair-start',
        startOffAirISOStart,
        startOffAirISOEnd,
        programTranslations.offAirTitle.ko,
        programTranslations.offAirTitle.en,
        programTranslations.offAirCategory.ko,
        programTranslations.offAirCategory.en,
        'test_pattern',
        '방송 중단. 테스트 패턴.',
        'Off-air period with test pattern and tone.',
        { off_air: true }
      );

      const testCardISOStart = fmtISO(currDay, '08:25');
      const testCardISOEnd = fmtISO(currDay, '09:00');
      const startTestCard = buildLeanEntry(
        'testcard',
        testCardISOStart,
        testCardISOEnd,
        programTranslations.testCardTitle.ko,
        programTranslations.testCardTitle.en,
        programTranslations.testCardCategory.ko,
        programTranslations.testCardCategory.en,
        'test_pattern',
        '조선중앙텔레비죤 시험화면.',
        'KCTV test card with color bars and 1kHz tone.'
      );

      const anthemISOStart = fmtISO(currDay, '09:00');
      const startAnthem = buildLeanEntry(
        'anthem',
        anthemISOStart,
        firstProgramStartISO,
        programTranslations.anthemTitle.ko,
        programTranslations.anthemTitle.en,
        programTranslations.anthemCategory.ko,
        programTranslations.anthemCategory.en,
        'sign_on',
        '애국가 및 오늘의 방송순서.',
        "National anthem, songs of the Great Leaders, and today's program schedule."
      );

      const endOffAirISOEnd = fmtISO(currDay, '23:00');
      const endOffAir = buildLeanEntry(
        'offair-end',
        dynamicEndStartISO,
        endOffAirISOEnd,
        programTranslations.offAirTitle.ko,
        programTranslations.offAirTitle.en,
        programTranslations.offAirCategory.ko,
        programTranslations.offAirCategory.en,
        'test_pattern',
        '방송 중단.',
        'Off-air period until next broadcast day.',
        { off_air: true }
      );

      json.programs.unshift(startOffAir, startTestCard, startAnthem);
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
