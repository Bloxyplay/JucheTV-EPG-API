import { readFileSync } from 'fs';
import { join } from 'path';

// Translation dictionaries — ko, en, zh, my, ru, ja
const programTranslations = {
  offAirTitle: {
    ko: "방송 종료",
    en: "Off Air",
    zh: "停播",
    my: "ထုတ်လွှင့်မှုရပ်နားခြင်း",
    ru: "Конец эфира",
    ja: "放送休止"
  },
  offAirCategory: {
    ko: "텔레비죤 방송 종료",
    en: "Television OFF AIR",
    zh: "电视停播",
    my: "ရုပ်မြင်သံကြား ထုတ်လွှင့်မှုရပ်နားခြင်း",
    ru: "Телевидение ВНЕ ЭФИРА",
    ja: "テレビ放送休止"
  },
  testCardTitle: {
    ko: "조선중앙텔레비죤 시험화면",
    en: "Korean Central Television Test Card",
    zh: "朝鲜中央电视台测试卡",
    my: "ကိုရီးယားဗဟိုရုပ်မြင်သံကြား စမ်းသပ်ကတ်",
    ru: "Испытательная таблица Корейского центрального телевидения",
    ja: "朝鮮中央テレビジョン テストカード"
  },
  testCardCategory: {
    ko: "텔레비죤 시험화면",
    en: "Television Test Card",
    zh: "电视测试卡",
    my: "ရုပ်မြင်သံကြား စမ်းသပ်ကတ်",
    ru: "Телевизионная испытательная таблица",
    ja: "テレビテストカード"
  },
  anthemTitle: {
    ko: "조선중앙텔레비죤 애국가 및 오늘의 방송순서",
    en: "Korean Central Television Startup National Anthem & Today's Order",
    zh: "朝鲜中央电视台开台国歌与今日节目单",
    my: "ကိုရီးယားဗဟိုရုပ်မြင်သံကြား နိုင်ငံတော်သီချင်းနှင့် ယနေ့အစီအစဉ်",
    ru: "Гимн открытия Корейского центрального телевидения и программа передач на сегодня",
    ja: "朝鮮中央テレビジョン 開始国歌および今日の放送順序"
  },
  anthemCategory: {
    ko: "방송개시",
    en: "Opening Broadcast",
    zh: "开台",
    my: "ထုတ်လွှင့်မှုစတင်ခြင်း",
    ru: "Начало вещания",
    ja: "放送開始"
  },
  closingCategory: {
    ko: "방송마감",
    en: "Closing Broadcast",
    zh: "收台",
    my: "ထုတ်လွှင့်မှုပိတ်သိမ်းခြင်း",
    ru: "Конец вещания",
    ja: "放送終了"
  }
};

// Specialized translations for Ryongnamsan TV
const ryongTranslations = {
  testCardTitle: {
    ko: "룡남산텔레비죤 시험화면",
    en: "Ryongnamsan Television Test Card",
    zh: "龙南山电视台测试卡",
    my: "ရယုံနမ်ဆန် ရုပ်မြင်သံကြား စမ်းသပ်ကတ်",
    ru: "Испытательная таблица телевидения Рённамсан",
    ja: "竜南山テレビ テストカード"
  },
  anthemTitle: {
    ko: "룡남산텔레비죤 애국가 및 오늘의 방송순서",
    en: "Ryongnamsan TV Startup National Anthem & Today's Programs",
    zh: "龙南山电视台开台国歌与今日节目单",
    my: "ရယုံနမ်ဆန် ရုပ်မြင်သံကြား နိုင်ငံတော်သီချင်းနှင့် ယနေ့အစီအစဉ်",
    ru: "Гимн открытия телевидения Рённамсан и программа передач на сегодня",
    ja: "竜南山テレビ 開始国歌および今日の放送順序"
  },
  tomorrowTitle: {
    ko: "룡남산텔레비죤 래일의 방송순서",
    en: "Ryongnamsan Television Tomorrow's Order",
    zh: "龙南山电视台明日节目单",
    my: "ရယုံနမ်ဆန် ရုပ်မြင်သံကြား မနက်ဖြန်အစီအစဉ်",
    ru: "Программа передач телевидения Рённамсан на завтра",
    ja: "竜南山テレビ 明日の放送順序"
  },
  closingTitle: {
    ko: "방송 마감",
    en: "Ryongnamsan Television Closing",
    zh: "收台",
    my: "ရယုံနမ်ဆန် ရုပ်မြင်သံကြား ပိတ်သိမ်းခြင်း",
    ru: "Закрытие эфира телевидения Рённамсан",
    ja: "竜南山テレビ 放送終了"
  }
};

// Helpers for timestamps
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

// Helper for adding minutes to ISO strings
const addMinutesISO = (isoStr, mins) => {
  if (!isoStr) return isoStr;
  const d = new Date(isoStr);
  d.setMinutes(d.getMinutes() + mins);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${fmtDate(d)}T${h}:${m}:00+09:00`;
};

// Helper for adding minutes to HH:MM format strings
const addMinutesHHMM = (timeStr, mins) => {
  if (!timeStr) return timeStr;
  let [h, m] = timeStr.split(':').map(Number);
  m += mins;
  h += Math.floor(m / 60);
  m = m % 60;
  h = h % 24;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

// Detect if a program is an auto-injected block depending on the JSON structure
function isAutoBlock(prog, structureType) {
  if (structureType === 'old') {
    const t = prog.title || {};
    return (
      prog.start === '23:00' ||
      prog.start === '08:25' ||
      prog.start === '09:00' ||
      prog.start === '17:25' ||
      prog.start === '18:00' ||
      t.ko === '방송 종료' ||
      t.ko === '조선중앙텔레비죤 시험화면' ||
      t.ko === '조선중앙텔레비죤 애국가 및 오늘의 방송순서' ||
      t.ko === ryongTranslations.testCardTitle.ko ||
      t.ko === ryongTranslations.anthemTitle.ko ||
      t.ko === ryongTranslations.tomorrowTitle.ko ||
      t.ko === ryongTranslations.closingTitle.ko
    );
  } else if (structureType === 'lean') {
    return (
      prog.off_air === true ||
      prog.genre === 'test_pattern' ||
      prog.genre === 'sign_on' ||
      prog.genre === 'sign_off' ||
      prog.genre === 'music' ||
      prog.genre === 'weather' ||
      (prog.program_id || '').includes('offair') ||
      (prog.program_id || '').includes('testcard') ||
      (prog.program_id || '').includes('anthem') ||
      (prog.program_id || '').includes('tomorrow') ||
      (prog.program_id || '').includes('closing')
    );
  } else if (structureType === 'epgWrapper' || structureType === 'camelISO') {
    const t = prog.title || {};
    return (
      t.ko === '방송 종료' ||
      t.ko === '조선중앙텔레비죤 시험화면' ||
      t.ko === '조선중앙텔레비죤 애국가 및 오늘의 방송순서' ||
      t.ko === ryongTranslations.testCardTitle.ko ||
      t.ko === ryongTranslations.anthemTitle.ko ||
      t.ko === ryongTranslations.tomorrowTitle.ko ||
      t.ko === ryongTranslations.closingTitle.ko ||
      (prog.id || '').includes('auto_')
    );
  }
  return false;
}

// Check if the file already has auto-blocks injected
function hasAutoBlocks(programs, structureType) {
  if (!programs || programs.length === 0) return false;
  const first = programs[0];
  const last = programs[programs.length - 1];
  return isAutoBlock(first, structureType) && isAutoBlock(last, structureType);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { ch, date } = req.query;

  if (!ch || !date) {
    return res.status(400).json({
      error: 'Missing parameters. Use: ?ch=KCTV&date=YYYY-MM-DD'
    });
  }

  // ALLOWED CHANNELS
  const allowedChannels = ['KCTV', 'MRTV', 'sports-tv', 'Sports TV', 'ryongnamsan', 'Ryongnamsan'];
  if (!allowedChannels.includes(ch)) {
    return res.status(404).json({
      error: 'Channel not found.'
    });
  }

  const filePath = join(process.cwd(), 'epg', ch, `${date}.json`);
  const chLower = ch.toLowerCase();

  try {
    const data = readFileSync(filePath, 'utf8');
    const json = JSON.parse(data);

    let structureType = 'unknown';
    let programsArray = [];

    // Detect structure format
    if (json.epg && Array.isArray(json.epg.programs)) {
      structureType = 'epgWrapper';
      programsArray = json.epg.programs;
    } else if (json.programs && Array.isArray(json.programs)) {
      programsArray = json.programs;
      if (typeof json.channel === 'string') {
        structureType = 'old';
      } else if (typeof json.channel === 'object' && json.channel !== null) {
        const sampleProg = json.programs[0] || {};
        if (sampleProg.startTime || sampleProg.endTime) {
          structureType = 'camelISO';
        } else {
          structureType = 'lean';
        }
      }
    }

    if (structureType === 'unknown') {
      return res.status(500).json({ error: 'Unrecognized or invalid EPG data structure' });
    }

    // Helper for lean format assembly 
    const buildLeanEntry = (idSuffix, startISO, endISO, titleKo, titleEn, ptypeKo, ptypeEn, genre, descKo, descEn, extra = {}) => {
      const dateSlug = date.replace(/-/g, '');
      return {
        program_id: `${chLower}-${dateSlug}-${idSuffix}`,
        start_time: startISO,
        end_time: endISO,
        title_ko: titleKo,
        title_en: titleEn,
        title_zh: extra.title_zh || titleEn,
        title_ja: extra.title_ja || titleEn,
        title_ru: extra.title_ru || titleEn,
        title_my: extra.title_my || titleEn,
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

    const [year, month, day] = date.split('-').map(Number);
    const prevDay = new Date(year, month - 1, day - 1);
    const currDay = new Date(year, month - 1, day);
    const nextDay = new Date(year, month - 1, day + 1);

    // ONLY INJECT AUTO-BLOCKS IF KCTV OR RYONGNAMSAN HAS NOT YET BEEN MODIFIED
    if (!hasAutoBlocks(programsArray, structureType)) {
      
      // =========================== KCTV INJECTION LOGIC ===========================
      if (ch === 'KCTV') {
        if (structureType === 'old') {
          const firstProgramStart = programsArray.length > 0 ? programsArray[0].start : '09:30';
          const lastProgram = programsArray[programsArray.length - 1];
          const dynamicEndStart = lastProgram ? lastProgram.end : '22:00';

          programsArray.unshift(
            { start: '23:00', end: '08:25', title: programTranslations.offAirTitle, category: programTranslations.offAirCategory },
            { start: '08:25', end: '09:00', title: programTranslations.testCardTitle, category: programTranslations.testCardCategory },
            { start: '09:00', end: firstProgramStart, title: programTranslations.anthemTitle, category: programTranslations.anthemCategory }
          );
          programsArray.push({ start: dynamicEndStart, end: '23:00', title: programTranslations.offAirTitle, category: programTranslations.offAirCategory });

        } else if (structureType === 'lean') {
          const firstProgramStartISO = programsArray.length > 0 ? programsArray[0].start_time : fmtISO(currDay, '09:30');
          const lastProgram = programsArray[programsArray.length - 1];
          const dynamicEndStartISO = lastProgram ? lastProgram.end_time : fmtISO(currDay, '22:00');

          programsArray.unshift(
            buildLeanEntry('offair-start', fmtISO(prevDay, '23:00'), fmtISO(currDay, '08:25'), programTranslations.offAirTitle.ko, programTranslations.offAirTitle.en, programTranslations.offAirCategory.ko, programTranslations.offAirCategory.en, 'test_pattern', '방송 중단.', 'Off-air.', { off_air: true, title_zh: programTranslations.offAirTitle.zh, title_ja: programTranslations.offAirTitle.ja, title_ru: programTranslations.offAirTitle.ru, title_my: programTranslations.offAirTitle.my }),
            buildLeanEntry('testcard', fmtISO(currDay, '08:25'), fmtISO(currDay, '09:00'), programTranslations.testCardTitle.ko, programTranslations.testCardTitle.en, programTranslations.testCardCategory.ko, programTranslations.testCardCategory.en, 'test_pattern', '시험화면.', 'Test card.', { title_zh: programTranslations.testCardTitle.zh, title_ja: programTranslations.testCardTitle.ja, title_ru: programTranslations.testCardTitle.ru, title_my: programTranslations.testCardTitle.my }),
            buildLeanEntry('anthem', fmtISO(currDay, '09:00'), firstProgramStartISO, programTranslations.anthemTitle.ko, programTranslations.anthemTitle.en, programTranslations.anthemCategory.ko, programTranslations.anthemCategory.en, 'sign_on', '애국가.', 'National anthem.', { title_zh: programTranslations.anthemTitle.zh, title_ja: programTranslations.anthemTitle.ja, title_ru: programTranslations.anthemTitle.ru, title_my: programTranslations.anthemTitle.my })
          );
          programsArray.push(
            buildLeanEntry('offair-end', dynamicEndStartISO, fmtISO(currDay, '23:00'), programTranslations.offAirTitle.ko, programTranslations.offAirTitle.en, programTranslations.offAirCategory.ko, programTranslations.offAirCategory.en, 'test_pattern', '방송 중단.', 'Off-air.', { off_air: true, title_zh: programTranslations.offAirTitle.zh, title_ja: programTranslations.offAirTitle.ja, title_ru: programTranslations.offAirTitle.ru, title_my: programTranslations.offAirTitle.my })
          );

        } else if (structureType === 'epgWrapper') {
          const firstProgramStartISO = programsArray.length > 0 ? programsArray[0].start : fmtISO(currDay, '09:30');
          const lastProgram = programsArray[programsArray.length - 1];
          const dynamicEndStartISO = lastProgram ? lastProgram.end : fmtISO(currDay, '22:00');

          programsArray.unshift(
            { id: 'auto_offair_start', start: fmtISO(prevDay, '23:00'), end: fmtISO(currDay, '08:25'), category: programTranslations.offAirCategory, title: programTranslations.offAirTitle },
            { id: 'auto_testcard', start: fmtISO(currDay, '08:25'), end: fmtISO(currDay, '09:00'), category: programTranslations.testCardCategory, title: programTranslations.testCardTitle },
            { id: 'auto_anthem', start: fmtISO(currDay, '09:00'), end: firstProgramStartISO, category: programTranslations.anthemCategory, title: programTranslations.anthemTitle }
          );
          programsArray.push({ id: 'auto_offair_end', start: dynamicEndStartISO, end: fmtISO(currDay, '23:00'), category: programTranslations.offAirCategory, title: programTranslations.offAirTitle });

        } else if (structureType === 'camelISO') {
          const firstProgramStartISO = programsArray.length > 0 ? programsArray[0].startTime : fmtISO(currDay, '09:30');
          const lastProgram = programsArray[programsArray.length - 1];
          const dynamicEndStartISO = lastProgram ? lastProgram.endTime : fmtISO(currDay, '22:00');

          programsArray.unshift(
            { id: 'auto_offair_start', startTime: fmtISO(prevDay, '23:00'), endTime: fmtISO(currDay, '08:25'), category: programTranslations.offAirCategory, title: programTranslations.offAirTitle },
            { id: 'auto_testcard', startTime: fmtISO(currDay, '08:25'), endTime: fmtISO(currDay, '09:00'), category: programTranslations.testCardCategory, title: programTranslations.testCardTitle },
            { id: 'auto_anthem', startTime: fmtISO(currDay, '09:00'), endTime: firstProgramStartISO, category: programTranslations.anthemCategory, title: programTranslations.anthemTitle }
          );
          programsArray.push({ id: 'auto_offair_end', startTime: dynamicEndStartISO, endTime: fmtISO(currDay, '23:00'), category: programTranslations.offAirCategory, title: programTranslations.offAirTitle });
        }

      // ======================= RYONGNAMSAN TV INJECTION LOGIC =======================
      } else if (chLower === 'ryongnamsan') {
        if (structureType === 'old') {
          const firstProgramStart = programsArray.length > 0 ? programsArray[0].start : '18:08';
          const lastProgram = programsArray[programsArray.length - 1];
          const dynamicEndStart = lastProgram ? lastProgram.end : '22:00';
          
          const tomorrowEnd = addMinutesHHMM(dynamicEndStart, 8);
          const closingEnd = addMinutesHHMM(tomorrowEnd, 1);

          programsArray.unshift(
            { start: '23:00', end: '17:25', title: programTranslations.offAirTitle, category: programTranslations.offAirCategory },
            { start: '17:25', end: '18:00', title: ryongTranslations.testCardTitle, category: programTranslations.testCardCategory },
            { start: '18:00', end: firstProgramStart, title: ryongTranslations.anthemTitle, category: programTranslations.anthemCategory }
          );
          programsArray.push(
            { start: dynamicEndStart, end: tomorrowEnd, title: ryongTranslations.tomorrowTitle, category: programTranslations.closingCategory },
            { start: tomorrowEnd, end: closingEnd, title: ryongTranslations.closingTitle, category: programTranslations.closingCategory },
            { start: closingEnd, end: '17:25', title: programTranslations.offAirTitle, category: programTranslations.offAirCategory }
          );

        } else if (structureType === 'lean') {
          const firstProgramStartISO = programsArray.length > 0 ? programsArray[0].start_time : fmtISO(currDay, '18:08');
          const lastProgram = programsArray[programsArray.length - 1];
          const dynamicEndStartISO = lastProgram ? lastProgram.end_time : fmtISO(currDay, '22:00');

          const tomorrowEndISO = addMinutesISO(dynamicEndStartISO, 8);
          const closingEndISO = addMinutesISO(tomorrowEndISO, 1);
          const nextOffAirEndISO = fmtISO(nextDay, '17:25');

          programsArray.unshift(
            buildLeanEntry('offair-start', fmtISO(prevDay, '23:00'), fmtISO(currDay, '17:25'), programTranslations.offAirTitle.ko, programTranslations.offAirTitle.en, programTranslations.offAirCategory.ko, programTranslations.offAirCategory.en, 'test_pattern', '방송 중단.', 'Off-air.', { off_air: true, title_zh: programTranslations.offAirTitle.zh, title_ja: programTranslations.offAirTitle.ja, title_ru: programTranslations.offAirTitle.ru, title_my: programTranslations.offAirTitle.my }),
            buildLeanEntry('testcard', fmtISO(currDay, '17:25'), fmtISO(currDay, '18:00'), ryongTranslations.testCardTitle.ko, ryongTranslations.testCardTitle.en, programTranslations.testCardCategory.ko, programTranslations.testCardCategory.en, 'test_pattern', '시험화면.', 'Test card.', { title_zh: ryongTranslations.testCardTitle.zh, title_ja: ryongTranslations.testCardTitle.ja, title_ru: ryongTranslations.testCardTitle.ru, title_my: ryongTranslations.testCardTitle.my }),
            buildLeanEntry('anthem', fmtISO(currDay, '18:00'), firstProgramStartISO, ryongTranslations.anthemTitle.ko, ryongTranslations.anthemTitle.en, programTranslations.anthemCategory.ko, programTranslations.anthemCategory.en, 'sign_on', '애국가.', 'National anthem.', { title_zh: ryongTranslations.anthemTitle.zh, title_ja: ryongTranslations.anthemTitle.ja, title_ru: ryongTranslations.anthemTitle.ru, title_my: ryongTranslations.anthemTitle.my })
          );
          programsArray.push(
            buildLeanEntry('tomorrow', dynamicEndStartISO, tomorrowEndISO, ryongTranslations.tomorrowTitle.ko, ryongTranslations.tomorrowTitle.en, programTranslations.closingCategory.ko, programTranslations.closingCategory.en, 'sign_off', '래일의 방송순서.', "Tomorrow's order.", { title_zh: ryongTranslations.tomorrowTitle.zh, title_ja: ryongTranslations.tomorrowTitle.ja, title_ru: ryongTranslations.tomorrowTitle.ru, title_my: ryongTranslations.tomorrowTitle.my }),
            buildLeanEntry('closing', tomorrowEndISO, closingEndISO, ryongTranslations.closingTitle.ko, ryongTranslations.closingTitle.en, programTranslations.closingCategory.ko, programTranslations.closingCategory.en, 'sign_off', '방송 마감.', 'Closing.', { title_zh: ryongTranslations.closingTitle.zh, title_ja: ryongTranslations.closingTitle.ja, title_ru: ryongTranslations.closingTitle.ru, title_my: ryongTranslations.closingTitle.my }),
            buildLeanEntry('offair-end', closingEndISO, nextOffAirEndISO, programTranslations.offAirTitle.ko, programTranslations.offAirTitle.en, programTranslations.offAirCategory.ko, programTranslations.offAirCategory.en, 'test_pattern', '방송 중단.', 'Off-air.', { off_air: true, title_zh: programTranslations.offAirTitle.zh, title_ja: programTranslations.offAirTitle.ja, title_ru: programTranslations.offAirTitle.ru, title_my: programTranslations.offAirTitle.my })
          );

        } else if (structureType === 'epgWrapper') {
          const firstProgramStartISO = programsArray.length > 0 ? programsArray[0].start : fmtISO(currDay, '18:08');
          const lastProgram = programsArray[programsArray.length - 1];
          const dynamicEndStartISO = lastProgram ? lastProgram.end : fmtISO(currDay, '22:00');

          const tomorrowEndISO = addMinutesISO(dynamicEndStartISO, 8);
          const closingEndISO = addMinutesISO(tomorrowEndISO, 1);
          const nextOffAirEndISO = fmtISO(nextDay, '17:25');

          programsArray.unshift(
            { id: 'auto_offair_start', start: fmtISO(prevDay, '23:00'), end: fmtISO(currDay, '17:25'), category: programTranslations.offAirCategory, title: programTranslations.offAirTitle },
            { id: 'auto_testcard', start: fmtISO(currDay, '17:25'), end: fmtISO(currDay, '18:00'), category: programTranslations.testCardCategory, title: ryongTranslations.testCardTitle },
            { id: 'auto_anthem', start: fmtISO(currDay, '18:00'), end: firstProgramStartISO, category: programTranslations.anthemCategory, title: ryongTranslations.anthemTitle }
          );
          programsArray.push(
            { id: 'auto_tomorrow', start: dynamicEndStartISO, end: tomorrowEndISO, category: programTranslations.closingCategory, title: ryongTranslations.tomorrowTitle },
            { id: 'auto_closing', start: tomorrowEndISO, end: closingEndISO, category: programTranslations.closingCategory, title: ryongTranslations.closingTitle },
            { id: 'auto_offair_end', start: closingEndISO, end: nextOffAirEndISO, category: programTranslations.offAirCategory, title: programTranslations.offAirTitle }
          );

        } else if (structureType === 'camelISO') {
          const firstProgramStartISO = programsArray.length > 0 ? programsArray[0].startTime : fmtISO(currDay, '18:08');
          const lastProgram = programsArray[programsArray.length - 1];
          const dynamicEndStartISO = lastProgram ? lastProgram.endTime : fmtISO(currDay, '22:00');

          const tomorrowEndISO = addMinutesISO(dynamicEndStartISO, 8);
          const closingEndISO = addMinutesISO(tomorrowEndISO, 1);
          const nextOffAirEndISO = fmtISO(nextDay, '17:25');

          programsArray.unshift(
            { id: 'auto_offair_start', startTime: fmtISO(prevDay, '23:00'), endTime: fmtISO(currDay, '17:25'), category: programTranslations.offAirCategory, title: programTranslations.offAirTitle },
            { id: 'auto_testcard', startTime: fmtISO(currDay, '17:25'), endTime: fmtISO(currDay, '18:00'), category: programTranslations.testCardCategory, title: ryongTranslations.testCardTitle },
            { id: 'auto_anthem', startTime: fmtISO(currDay, '18:00'), endTime: firstProgramStartISO, category: programTranslations.anthemCategory, title: ryongTranslations.anthemTitle }
          );
          programsArray.push(
            { id: 'auto_tomorrow', startTime: dynamicEndStartISO, endTime: tomorrowEndISO, category: programTranslations.closingCategory, title: ryongTranslations.tomorrowTitle },
            { id: 'auto_closing', startTime: tomorrowEndISO, endTime: closingEndISO, category: programTranslations.closingCategory, title: ryongTranslations.closingTitle },
            { id: 'auto_offair_end', startTime: closingEndISO, endTime: nextOffAirEndISO, category: programTranslations.offAirCategory, title: programTranslations.offAirTitle }
          );
        }
      }
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
