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
  }
};

// Ryongnamsan TV uses {en, ko} bilingual format
const ryongnamsanTranslations = {
  testCardTitle: {
    en: "Ryongnamsan Television Test Card",
    ko: "룡남산텔레비죤 시험화면"
  },
  testCardCategory: {
    en: "Television Test Card",
    ko: "텔레비죤 시험화면"
  },
  anthemTitle: {
    en: "Ryongnamsan TV Startup National Anthem & Today's Programs",
    ko: "룡남산텔레비죤 애국가 및 오늘의 방송순서"
  },
  anthemCategory: {
    en: "Opening Broadcast",
    ko: "방송개시"
  },
  tomorrowOrderTitle: {
    en: "Ryongnamsan Television Tomorrow's Order",
    ko: "룡남산텔레비죤 내일의 방송순서"
  },
  tomorrowOrderCategory: {
    en: "Program Guide",
    ko: "방송순서 안내"
  },
  closingTitle: {
    en: "Ryongnamsan Television Closing",
    ko: "룡남산텔레비죤 방송종료"
  },
  closingCategory: {
    en: "Closing Broadcast",
    ko: "방송종료"
  },
  offAirTitle: {
    en: "Off Air",
    ko: "방송 종료"
  },
  offAirCategory: {
    en: "Television OFF AIR",
    ko: "텔레비죤 방송 종료"
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

// Parse an ISO datetime string with +09:00 offset into components
function parsePyongyangISO(isoStr) {
  const match = isoStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\+09:00$/);
  if (!match) return null;
  return {
    year: parseInt(match[1], 10),
    month: parseInt(match[2], 10),
    day: parseInt(match[3], 10),
    hour: parseInt(match[4], 10),
    minute: parseInt(match[5], 10),
    second: parseInt(match[6], 10)
  };
}

// Build an ISO datetime string in +09:00 from components
function buildPyongyangISO(year, month, day, hour, minute, second = 0) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}+09:00`;
}

// Add minutes to an ISO datetime string (always in +09:00 timezone)
function addMinutesISO(isoStr, minutes) {
  const parsed = parsePyongyangISO(isoStr);
  if (!parsed) {
    // Fallback: try to parse with Date and convert (shouldn't happen with our data)
    const d = new Date(isoStr);
    d.setMinutes(d.getMinutes() + minutes);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours() + 9)}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}+09:00`;
  }

  // Convert to total minutes since epoch (in +09:00)
  // Create a Date object from the components, treating them as +09:00
  const d = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day, parsed.hour - 9, parsed.minute, parsed.second));
  d.setUTCMinutes(d.getUTCMinutes() + minutes);

  // Extract UTC components and add 9 hours back to get +09:00 time
  const pad = (n) => String(n).padStart(2, '0');
  const y = d.getUTCFullYear();
  const mo = d.getUTCMonth() + 1;
  const da = d.getUTCDate();
  const h = d.getUTCHours() + 9;
  const mi = d.getUTCMinutes();
  const s = d.getUTCSeconds();

  // Handle hour overflow (e.g., 25 hours → next day 01:00)
  let finalHour = h;
  let finalDay = da;
  let finalMonth = mo;
  let finalYear = y;

  if (finalHour >= 24) {
    finalHour -= 24;
    finalDay += 1;
    // Handle month/year overflow (simplified - works for our use case)
    const daysInMonth = new Date(finalYear, finalMonth, 0).getDate();
    if (finalDay > daysInMonth) {
      finalDay = 1;
      finalMonth += 1;
      if (finalMonth > 12) {
        finalMonth = 1;
        finalYear += 1;
      }
    }
  }

  return buildPyongyangISO(finalYear, finalMonth, finalDay, finalHour, mi, s);
}

// Detect if a program is an auto-injected block depending on the JSON structure
function isAutoBlock(prog, structureType) {
  if (structureType === 'old') {
    const t = prog.title || {};
    return (
      prog.start === '23:00' ||
      prog.start === '08:25' ||
      prog.start === '09:00' ||
      t.ko === '방송 종료' ||
      t.ko === '조선중앙텔레비죤 시험화면' ||
      t.ko === '조선중앙텔레비죤 애국가 및 오늘의 방송순서'
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
      (prog.program_id || '').includes('anthem')
    );
  } else if (structureType === 'epgWrapper' || structureType === 'camelISO') {
    const t = prog.title || {};
    return (
      t.ko === '방송 종료' ||
      t.ko === '조선중앙텔레비죤 시험화면' ||
      t.ko === '조선중앙텔레비죤 애국가 및 오늘의 방송순서' ||
      t.ko === '룡남산텔레비죤 시험화면' ||
      t.ko === '룡남산텔레비죤 애국가 및 오늘의 방송순서' ||
      t.ko === '룡남산텔레비죤 내일의 방송순서' ||
      t.ko === '룡남산텔레비죤 방송종료' ||
      t.ko === '방송 종료'
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

    const [year, month, day] = date.split('-').map(Number);
    const prevDay = new Date(year, month - 1, day - 1);
    const currDay = new Date(year, month - 1, day);
    const nextDay = new Date(year, month - 1, day + 1);

    // ONLY INJECT AUTO-BLOCKS FOR KCTV
    if (ch === 'KCTV' && !hasAutoBlocks(programsArray, structureType)) {

      if (structureType === 'old') {
        // ========== OLD STRUCTURE ==========
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
        // ========== NEW LEAN STRUCTURE ==========
        const dateSlug = date.replace(/-/g, '');
        const firstProgramStartISO = programsArray.length > 0 ? programsArray[0].start_time : fmtISO(currDay, '09:30');
        const lastProgram = programsArray[programsArray.length - 1];
        const dynamicEndStartISO = lastProgram ? lastProgram.end_time : fmtISO(currDay, '22:00');

        const buildLeanEntry = (idSuffix, startISO, endISO, titleKo, titleEn, ptypeKo, ptypeEn, genre, descKo, descEn, extra = {}) => {
          return {
            program_id: `kctv-${dateSlug}-${idSuffix}`,
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

        programsArray.unshift(
          buildLeanEntry('offair-start', fmtISO(prevDay, '23:00'), fmtISO(currDay, '08:25'), programTranslations.offAirTitle.ko, programTranslations.offAirTitle.en, programTranslations.offAirCategory.ko, programTranslations.offAirCategory.en, 'test_pattern', '방송 중단.', 'Off-air.', { off_air: true, title_zh: programTranslations.offAirTitle.zh, title_ja: programTranslations.offAirTitle.ja, title_ru: programTranslations.offAirTitle.ru, title_my: programTranslations.offAirTitle.my }),
          buildLeanEntry('testcard', fmtISO(currDay, '08:25'), fmtISO(currDay, '09:00'), programTranslations.testCardTitle.ko, programTranslations.testCardTitle.en, programTranslations.testCardCategory.ko, programTranslations.testCardCategory.en, 'test_pattern', '시험화면.', 'Test card.', { title_zh: programTranslations.testCardTitle.zh, title_ja: programTranslations.testCardTitle.ja, title_ru: programTranslations.testCardTitle.ru, title_my: programTranslations.testCardTitle.my }),
          buildLeanEntry('anthem', fmtISO(currDay, '09:00'), firstProgramStartISO, programTranslations.anthemTitle.ko, programTranslations.anthemTitle.en, programTranslations.anthemCategory.ko, programTranslations.anthemCategory.en, 'sign_on', '애국가.', 'National anthem.', { title_zh: programTranslations.anthemTitle.zh, title_ja: programTranslations.anthemTitle.ja, title_ru: programTranslations.anthemTitle.ru, title_my: programTranslations.anthemTitle.my })
        );
        programsArray.push(
          buildLeanEntry('offair-end', dynamicEndStartISO, fmtISO(currDay, '23:00'), programTranslations.offAirTitle.ko, programTranslations.offAirTitle.en, programTranslations.offAirCategory.ko, programTranslations.offAirCategory.en, 'test_pattern', '방송 중단.', 'Off-air.', { off_air: true, title_zh: programTranslations.offAirTitle.zh, title_ja: programTranslations.offAirTitle.ja, title_ru: programTranslations.offAirTitle.ru, title_my: programTranslations.offAirTitle.my })
        );

      } else if (structureType === 'epgWrapper') {
        // ========== WRAPPER STRUCTURE ==========
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
        // ========== CAMELCASE ISO STRUCTURE ==========
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
    }

    // INJECT AUTO-BLOCKS FOR RYONGNAMSAN TV
    if ((ch === 'ryongnamsan' || ch === 'Ryongnamsan') && !hasAutoBlocks(programsArray, structureType)) {

      if (structureType === 'camelISO') {
        // ========== RYONGNAMSAN CAMELCASE ISO STRUCTURE ==========
        // Uses {en, ko} bilingual format for title and category
        const lastProgram = programsArray[programsArray.length - 1];
        const lastProgramEndISO = lastProgram ? lastProgram.endTime : fmtISO(currDay, '22:00');

        // Prepend: 17:25-18:00 Test Card, 18:00-18:08 Anthem
        programsArray.unshift(
          { 
            id: 'auto_testcard', 
            startTime: fmtISO(currDay, '17:25'), 
            endTime: fmtISO(currDay, '18:00'), 
            category: ryongnamsanTranslations.testCardCategory, 
            title: ryongnamsanTranslations.testCardTitle 
          },
          { 
            id: 'auto_anthem', 
            startTime: fmtISO(currDay, '18:00'), 
            endTime: fmtISO(currDay, '18:08'), 
            category: ryongnamsanTranslations.anthemCategory, 
            title: ryongnamsanTranslations.anthemTitle 
          }
        );

        // Append: Tomorrow's Order (5 min), Closing (1 min), Off Air until 17:25 next day
        const tomorrowOrderStartISO = lastProgramEndISO;
        const tomorrowOrderEndISO = addMinutesISO(tomorrowOrderStartISO, 5);
        const closingStartISO = tomorrowOrderEndISO;
        const closingEndISO = addMinutesISO(closingStartISO, 1);
        const offAirEndISO = fmtISO(nextDay, '17:25');

        programsArray.push(
          { 
            id: 'auto_tomorrow_order', 
            startTime: tomorrowOrderStartISO, 
            endTime: tomorrowOrderEndISO, 
            category: ryongnamsanTranslations.tomorrowOrderCategory, 
            title: ryongnamsanTranslations.tomorrowOrderTitle 
          },
          { 
            id: 'auto_closing', 
            startTime: closingStartISO, 
            endTime: closingEndISO, 
            category: ryongnamsanTranslations.closingCategory, 
            title: ryongnamsanTranslations.closingTitle 
          },
          { 
            id: 'auto_offair_end', 
            startTime: closingEndISO, 
            endTime: offAirEndISO, 
            category: ryongnamsanTranslations.offAirCategory, 
            title: ryongnamsanTranslations.offAirTitle 
          }
        );
      }
      // Note: Ryongnamsan only uses camelISO structure based on the provided sample.
      // If other structures are needed in the future, add them here.
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
