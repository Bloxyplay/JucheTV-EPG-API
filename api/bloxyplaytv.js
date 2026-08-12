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

// Helper: format date as YYYY-MM-DD
const fmtDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Helper: build ISO timestamp with +09:00 offset
const fmtISO = (d, time) => `${fmtDate(d)}T${time}:00+09:00`;

// Helper: compute duration string PTxxHyyM between two ISO timestamps
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

    // Detect structure: old = channel is string, new = channel is object
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
      // ========== NEW STRUCTURE ==========
      const [year, month, day] = date.split('-').map(Number);
      const prevDay = new Date(year, month - 1, day - 1);
      const currDay = new Date(year, month - 1, day);

      const dateSlug = date.replace(/-/g, '');
      const firstProgramStartISO =
        json.programs.length > 0 ? json.programs[0].start_time : fmtISO(currDay, '09:30');

      const lastProgram = json.programs[json.programs.length - 1];
      const dynamicEndStartISO = lastProgram ? lastProgram.end_time : fmtISO(currDay, '22:00');

      // Pre-broadcast off-air (crosses midnight from previous day)
      const startOffAirISOStart = fmtISO(prevDay, '23:00');
      const startOffAirISOEnd = fmtISO(currDay, '08:25');
      const startOffAirDur = computeDuration(startOffAirISOStart, startOffAirISOEnd);

      const startOffAir = {
        program_id: `kctv-${dateSlug}-offair-start`,
        title_ko: programTranslations.offAirTitle.ko,
        title_en: programTranslations.offAirTitle.en,
        title_romanized: '',
        program_type_ko: programTranslations.offAirCategory.ko,
        program_type_en: programTranslations.offAirCategory.en,
        start_time: startOffAirISOStart,
        end_time: startOffAirISOEnd,
        duration: startOffAirDur.duration,
        duration_minutes: startOffAirDur.minutes,
        genre: 'test_pattern',
        language: 'ko',
        description_ko: '방송 중단',
        description_en:
          'Off-air period. Modified Philips PM5544/PM5644 test pattern with color bars, clock, and 1kHz tone or patriotic music.',
        thumbnail: '',
        is_live: false,
        is_propaganda: false,
        is_ideological: false,
        broadcast_day_type: json.channel?.broadcast_day_type || 'weekday',
        off_air: true,
        broadcast_quality: 'hd',
        parental_rating: 'All Ages',
        kim_jong_un_featured: false,
        field_guidance_location: '',
        field_guidance_type: '',
        accompanying_officials: [],
        propaganda_tone: '',
        presenter_name: '',
        presenter_attire: '',
        ideological_theme: '',
        target_audience: 'general',
        repetition_count: 1,
        production_year: year,
        is_rerun: false,
        original_broadcast_date: '',
        foreign_origin: false,
        origin_country: '',
        dubbed_language: '',
        ideological_approval: true,
        censorship_applied: false,
        tape_delay_hours: null,
        preempts_regular_schedule: false,
        preempted_program: '',
        simulcast_channels: []
      };

      // Test card
      const testCardISOStart = fmtISO(currDay, '08:25');
      const testCardISOEnd = fmtISO(currDay, '09:00');
      const testCardDur = computeDuration(testCardISOStart, testCardISOEnd);

      const startTestCard = {
        program_id: `kctv-${dateSlug}-testcard`,
        title_ko: programTranslations.testCardTitle.ko,
        title_en: programTranslations.testCardTitle.en,
        title_romanized: '',
        program_type_ko: programTranslations.testCardCategory.ko,
        program_type_en: programTranslations.testCardCategory.en,
        start_time: testCardISOStart,
        end_time: testCardISOEnd,
        duration: testCardDur.duration,
        duration_minutes: testCardDur.minutes,
        genre: 'test_pattern',
        language: 'ko',
        description_ko: '조선중앙텔레비죤 시험화면',
        description_en: 'KCTV test card with color bars and tone.',
        thumbnail: '',
        is_live: false,
        is_propaganda: false,
        is_ideological: false,
        broadcast_day_type: json.channel?.broadcast_day_type || 'weekday',
        off_air: false,
        broadcast_quality: 'hd',
        parental_rating: 'All Ages',
        kim_jong_un_featured: false,
        field_guidance_location: '',
        field_guidance_type: '',
        accompanying_officials: [],
        propaganda_tone: '',
        presenter_name: '',
        presenter_attire: '',
        ideological_theme: '',
        target_audience: 'general',
        repetition_count: 1,
        production_year: year,
        is_rerun: false,
        original_broadcast_date: '',
        foreign_origin: false,
        origin_country: '',
        dubbed_language: '',
        ideological_approval: true,
        censorship_applied: false,
        tape_delay_hours: null,
        preempts_regular_schedule: false,
        preempted_program: '',
        simulcast_channels: []
      };

      // Anthem & program order
      const anthemISOStart = fmtISO(currDay, '09:00');
      const anthemDur = computeDuration(anthemISOStart, firstProgramStartISO);

      const startAnthem = {
        program_id: `kctv-${dateSlug}-anthem`,
        title_ko: programTranslations.anthemTitle.ko,
        title_en: programTranslations.anthemTitle.en,
        title_romanized: '',
        program_type_ko: programTranslations.anthemCategory.ko,
        program_type_en: programTranslations.anthemCategory.en,
        start_time: anthemISOStart,
        end_time: firstProgramStartISO,
        duration: anthemDur.duration,
        duration_minutes: anthemDur.minutes,
        genre: 'sign_on',
        language: 'ko',
        description_ko: '애국가 및 오늘의 방송순서',
        description_en:
          'National anthem, Songs of General Kim Il Sung and Kim Jong Il, and today\'s program schedule.',
        thumbnail: '',
        is_live: false,
        is_propaganda: true,
        is_ideological: true,
        broadcast_day_type: json.channel?.broadcast_day_type || 'weekday',
        off_air: false,
        broadcast_quality: 'hd',
        parental_rating: 'All Ages',
        kim_jong_un_featured: false,
        field_guidance_location: '',
        field_guidance_type: '',
        accompanying_officials: [],
        propaganda_tone: 'praising',
        presenter_name: '',
        presenter_attire: '',
        ideological_theme: 'juche',
        target_audience: 'general',
        repetition_count: 1,
        production_year: year,
        is_rerun: false,
        original_broadcast_date: '',
        foreign_origin: false,
        origin_country: '',
        dubbed_language: '',
        ideological_approval: true,
        censorship_applied: false,
        tape_delay_hours: null,
        preempts_regular_schedule: false,
        preempted_program: '',
        simulcast_channels: []
      };

      // Post-broadcast off-air
      const endOffAirISOEnd = fmtISO(currDay, '23:00');
      const endOffAirDur = computeDuration(dynamicEndStartISO, endOffAirISOEnd);

      const endOffAir = {
        program_id: `kctv-${dateSlug}-offair-end`,
        title_ko: programTranslations.offAirTitle.ko,
        title_en: programTranslations.offAirTitle.en,
        title_romanized: '',
        program_type_ko: programTranslations.offAirCategory.ko,
        program_type_en: programTranslations.offAirCategory.en,
        start_time: dynamicEndStartISO,
        end_time: endOffAirISOEnd,
        duration: endOffAirDur.duration,
        duration_minutes: endOffAirDur.minutes,
        genre: 'test_pattern',
        language: 'ko',
        description_ko: '방송 중단',
        description_en: 'Off-air period until next broadcast day.',
        thumbnail: '',
        is_live: false,
        is_propaganda: false,
        is_ideological: false,
        broadcast_day_type: json.channel?.broadcast_day_type || 'weekday',
        off_air: true,
        broadcast_quality: 'hd',
        parental_rating: 'All Ages',
        kim_jong_un_featured: false,
        field_guidance_location: '',
        field_guidance_type: '',
        accompanying_officials: [],
        propaganda_tone: '',
        presenter_name: '',
        presenter_attire: '',
        ideological_theme: '',
        target_audience: 'general',
        repetition_count: 1,
        production_year: year,
        is_rerun: false,
        original_broadcast_date: '',
        foreign_origin: false,
        origin_country: '',
        dubbed_language: '',
        ideological_approval: true,
        censorship_applied: false,
        tape_delay_hours: null,
        preempts_regular_schedule: false,
        preempted_program: '',
        simulcast_channels: []
      };

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
