import { useMemo } from 'react';
import type { Sleep } from '../types';
import type { RitualStep } from './useRituals';

/* ══════════════════════════════════════════════════════════════
   WONDER WEEKS — Leap Map (Франтиске Элс, издание 2026)
   ══════════════════════════════════════════════════════════════ */
export interface Leap {
  num: number;
  weekCenter: number;
  range: [number, number];
  name: string;
  nameRu: string;
  symptoms: string[];
  parentTips: string[];
}

const LEAPS: Leap[] = [
  {
    num: 1, weekCenter: 5, range: [4, 6],
    name: 'Sensations', nameRu: 'Ощущения',
    symptoms: ['Больше плачет', 'Хуже спит', 'Больше ест', 'Прижимается к маме'],
    parentTips: ['Больше контакта кожа-к-коже', 'Частое кормление по требованию', 'Белый шум для успокоения'],
  },
  {
    num: 2, weekCenter: 8, range: [7, 9],
    name: 'Patterns', nameRu: 'Паттерны',
    symptoms: ['Внимательнее к окружению', 'Капризнее', 'Требует внимания', 'Непредсказуемый сон'],
    parentTips: ['Показывайте контрастные картинки', 'Разговаривайте с малышом', 'Следите за признаками усталости'],
  },
  {
    num: 3, weekCenter: 12, range: [11, 13],
    name: 'Smooth Transitions', nameRu: 'Плавные переходы',
    symptoms: ['Капризность', 'Плохой аппетит', 'Цепляется за маму', 'Плохо засыпает'],
    parentTips: ['Мобиль над кроваткой', 'Гимнастика для ручек и ножек', 'Разнообразные текстуры для тактильного опыта'],
  },
  {
    num: 4, weekCenter: 19, range: [17, 21],
    name: 'Events', nameRu: 'События',
    symptoms: ['Самый длительный капризный период', 'Плохой сон', 'Отказ от еды', 'Требует постоянного внимания'],
    parentTips: ['Это самый трудный скачок — будьте терпеливы', 'Игры с причинно-следственной связью', 'Больше тактильного контакта'],
  },
  {
    num: 5, weekCenter: 26, range: [24, 28],
    name: 'Relationships', nameRu: 'Отношения',
    symptoms: ['Тревога разделения', 'Плачет когда мама уходит', 'Нарушения сна', 'Перепады настроения'],
    parentTips: ['Играйте в «ку-ку»', 'Не уходите тайком', 'Практикуйте короткие расставания'],
  },
  {
    num: 6, weekCenter: 37, range: [35, 39],
    name: 'Categories', nameRu: 'Категории',
    symptoms: ['Стеснительность', 'Капризность', 'Ночные пробуждения', 'Висит на маме'],
    parentTips: ['Сортировка предметов по цвету/форме', 'Книги с животными', 'Стабильный ритуал сна'],
  },
  {
    num: 7, weekCenter: 46, range: [44, 48],
    name: 'Sequences', nameRu: 'Последовательности',
    symptoms: ['Истерики', 'Ревность', 'Плохой аппетит', 'Нарушения сна'],
    parentTips: ['Пирамидки, стаканчики-вкладыши', 'Простые задачи с последовательностью', 'Терпение и постоянство'],
  },
  {
    num: 8, weekCenter: 55, range: [53, 57],
    name: 'Programs', nameRu: 'Программы',
    symptoms: ['Капризность', 'Цепляется за родителя', 'Ночные пробуждения', 'Требует своего'],
    parentTips: ['Ролевые игры', 'Самостоятельное кормление', 'Простые инструкции'],
  },
];

const LEAP_WARNING_DAYS = 5;

export type LeapStatus = 'before' | 'during' | 'after' | 'none';

export interface LeapInfo {
  status: LeapStatus;
  leapNumber: number | null;
  leap: Leap | null;
  warning: string | null;
  daysUntilStart: number | null;
  progressPct: number | null;
}

export function getLeapStatus(ageWeeks: number): LeapInfo {
  for (const leap of LEAPS) {
    const [lo, hi] = leap.range;
    const warningWeekStart = lo - LEAP_WARNING_DAYS / 7;

    if (ageWeeks >= lo && ageWeeks <= hi) {
      const total = hi - lo;
      const elapsed = ageWeeks - lo;
      return {
        status: 'during', leapNumber: leap.num, leap,
        warning: `Скачок ${leap.num} «${leap.nameRu}» в процессе. Режим в мягком режиме (±30 мин).`,
        daysUntilStart: 0, progressPct: Math.round((elapsed / total) * 100),
      };
    }

    if (ageWeeks >= warningWeekStart && ageWeeks < lo) {
      const daysUntil = Math.round((lo - ageWeeks) * 7);
      return {
        status: 'before', leapNumber: leap.num, leap,
        warning: `Через ~${daysUntil} дн. начнётся скачок ${leap.num} «${leap.nameRu}».`,
        daysUntilStart: daysUntil, progressPct: null,
      };
    }

    if (ageWeeks > hi && ageWeeks <= hi + 1) {
      return {
        status: 'after', leapNumber: leap.num, leap,
        warning: `Скачок ${leap.num} «${leap.nameRu}» завершён!`,
        daysUntilStart: null, progressPct: 100,
      };
    }
  }
  return { status: 'none', leapNumber: null, leap: null, warning: null, daysUntilStart: null, progressPct: null };
}

/* ══════════════════════════════════════════════════════════════
   AGE-BASED NORMS
   ══════════════════════════════════════════════════════════════ */
export interface AgeNorms {
  ageLabel: string;
  totalSleepH: string;
  wakeWindowMin: [number, number];
  napsCount: string;
  feedsPerDay: string;
  specificActions: string[];
  alerts: string[];
}

const NORMS_TABLE: { maxWeeks: number; norms: AgeNorms }[] = [
  { maxWeeks: 4, norms: { ageLabel: '0–4 нед', totalSleepH: '16–18', wakeWindowMin: [40, 60], napsCount: '4–6', feedsPerDay: '8–12', specificActions: ['Пеленание', 'Белый шум 65–70 дБ', 'Кормление лёжа', 'Контакт кожа-к-коже'], alerts: ['Будить для кормления если спит >3–4ч ночью'] } },
  { maxWeeks: 8, norms: { ageLabel: '1–2 мес', totalSleepH: '14–17', wakeWindowMin: [60, 80], napsCount: '4–5', feedsPerDay: '7–10', specificActions: ['Tummy time 3–5 мин × 3 раза', 'Контакт глаза', 'Отслеживание предметов', 'Разговоры с малышом'], alerts: [] } },
  { maxWeeks: 12, norms: { ageLabel: '2–3 мес', totalSleepH: '14–16', wakeWindowMin: [75, 90], napsCount: '3–4', feedsPerDay: '6–8', specificActions: ['Погремушки', 'Мобиль', '«Разговор» с ребёнком', 'Гимнастика 10 мин'], alerts: [] } },
  { maxWeeks: 17, norms: { ageLabel: '3–4 мес', totalSleepH: '14–16', wakeWindowMin: [90, 120], napsCount: '3–4 → 3', feedsPerDay: '6–8', specificActions: ['Введение ритуала укладывания 5–7 мин', 'Начало отказа от пеленания', 'Перевороты'], alerts: ['⚠️ Регресс сна 4 месяцев — нормальное явление, продлится 2–4 недели'] } },
  { maxWeeks: 26, norms: { ageLabel: '4–6 мес', totalSleepH: '12–15', wakeWindowMin: [90, 150], napsCount: '3', feedsPerDay: '5–7', specificActions: ['Развивающий коврик', 'Тактильные игры', 'Чтение книг с картинками', 'Прикорм с 5.5–6 мес по показаниям педиатра'], alerts: [] } },
  { maxWeeks: 35, norms: { ageLabel: '6–8 мес', totalSleepH: '12–14', wakeWindowMin: [120, 180], napsCount: '2–3 → 2', feedsPerDay: '4–6 + прикорм', specificActions: ['Ползание', 'Сидение с поддержкой', '«Ку-ку»', 'Стаканчик-поильник', 'Прикорм: овощи, каши, фрукты'], alerts: [] } },
  { maxWeeks: 44, norms: { ageLabel: '8–10 мес', totalSleepH: '12–14', wakeWindowMin: [180, 210], napsCount: '2', feedsPerDay: '4–5 + прикорм', specificActions: ['Пинцетный захват', 'Finger food', 'Ходьба у опоры', 'Разворот на имя'], alerts: [] } },
  { maxWeeks: 999, norms: { ageLabel: '10–12 мес', totalSleepH: '11–14', wakeWindowMin: [210, 270], napsCount: '2', feedsPerDay: '3–4 + прикорм', specificActions: ['Кубики, сортеры', 'Первые слова', 'Самостоятельное питание', 'Ходьба с поддержкой'], alerts: ['Готовность к 1 сну — только с 15–18 мес, НЕ раньше'] } },
];

export function getNorms(ageWeeks: number): AgeNorms {
  for (const entry of NORMS_TABLE) {
    if (ageWeeks <= entry.maxWeeks) return entry.norms;
  }
  return NORMS_TABLE[NORMS_TABLE.length - 1].norms;
}

/* ══════════════════════════════════════════════════════════════
   DAILY SCHEDULE GENERATOR
   ══════════════════════════════════════════════════════════════ */
export interface ScheduleBlock {
  time: string;
  activity: string;
  durationMin: number;
  actions: string[];
  icon: string;
  color: string;
  isFlexible?: boolean;
}

function fmtTime(h: number, m: number): string {
  return `${Math.floor(h).toString().padStart(2, '0')}:${Math.round(m).toString().padStart(2, '0')}`;
}

function addMinutes(timeStr: string, mins: number): string {
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m + mins;
  return fmtTime(Math.floor(total / 60) % 24, total % 60);
}

export function generateDailySchedule(ageWeeks: number, wakeUpTime = '07:00', isLeap = false): ScheduleBlock[] {
  const norms = getNorms(ageWeeks);
  const [wwMin, wwMax] = norms.wakeWindowMin;
  const avgWW = Math.round((wwMin + wwMax) / 2);
  const schedule: ScheduleBlock[] = [];
  let cursor = wakeUpTime;
  const flex = isLeap;

  schedule.push({ time: cursor, activity: 'Пробуждение', durationMin: 15, icon: '☀️', color: '#FEF3C7', actions: ['Открыть шторы — яркий свет', 'Приветственная песня', 'Смена подгузника'], isFlexible: flex });
  cursor = addMinutes(cursor, 15);

  schedule.push({ time: cursor, activity: 'Кормление', durationMin: ageWeeks < 12 ? 30 : 20, icon: '🍼', color: '#DBEAFE', actions: ageWeeks >= 26 ? ['Грудь/смесь + прикорм', 'Протереть лицо после еды'] : ['Грудь или смесь по требованию'], isFlexible: flex });
  cursor = addMinutes(cursor, ageWeeks < 12 ? 30 : 20);

  let naps: number;
  if (ageWeeks <= 4) naps = 5;
  else if (ageWeeks <= 8) naps = 4;
  else if (ageWeeks <= 17) naps = 3;
  else if (ageWeeks <= 35) naps = 3;
  else naps = 2;

  const napDurations = ageWeeks <= 8 ? Array(naps).fill(45) : ageWeeks <= 17 ? [90, 90, 45] : ageWeeks <= 35 ? [90, 90, 30] : [90, 90];

  for (let i = 0; i < naps && i < napDurations.length; i++) {
    const activityDur = Math.max(avgWW - 15, 30);
    schedule.push({ time: cursor, activity: i === 0 ? 'Активность' : `Активность ${i + 1}`, durationMin: activityDur, icon: '🧸', color: '#ECFDF5', actions: getActivityByAge(ageWeeks, i), isFlexible: flex });
    cursor = addMinutes(cursor, activityDur);

    schedule.push({ time: cursor, activity: i < naps - 1 ? `Сон ${i + 1}` : 'Кор. сон', durationMin: napDurations[i], icon: '💤', color: '#F3E8FF', actions: ['Затемнить комнату', 'Белый шум', 'Уложить сонным, не спящим'], isFlexible: flex });
    cursor = addMinutes(cursor, napDurations[i]);

    schedule.push({ time: cursor, activity: 'Кормление', durationMin: 20, icon: '🍼', color: '#DBEAFE', actions: ageWeeks >= 26 ? ['Грудь/смесь', 'Прикорм (если время основного приёма)'] : ['Грудь/смесь по требованию'], isFlexible: flex });
    cursor = addMinutes(cursor, 20);
  }

  schedule.push({ time: cursor, activity: 'Вечерняя активность', durationMin: 30, icon: '🧩', color: '#FEF3C7', actions: ['Тихие игры', 'Прогулка если позволяет время', 'Снижение стимуляции'], isFlexible: flex });
  cursor = addMinutes(cursor, 30);

  schedule.push({ time: cursor, activity: 'Купание', durationMin: ageWeeks <= 12 ? 5 : 10, icon: '🛁', color: '#D1FAE5', actions: ['Вода 37°С', 'Спокойная обстановка', 'Подготовка ко сну'], isFlexible: flex });
  cursor = addMinutes(cursor, ageWeeks <= 12 ? 5 : 10);

  const ritualDur = ageWeeks <= 12 ? 15 : ageWeeks <= 26 ? 25 : 30;
  schedule.push({ time: cursor, activity: 'Ритуал укладывания', durationMin: ritualDur, icon: '🌙', color: '#EDE4F8', actions: getBedtimeRitualSummary(ageWeeks), isFlexible: flex });
  cursor = addMinutes(cursor, ritualDur);

  schedule.push({ time: cursor, activity: 'Ночной сон', durationMin: 0, icon: '🌙', color: '#312E81', actions: ageWeeks <= 4 ? ['Ночные кормления каждые 3–4 ч', 'Будить если спит >4ч'] : ageWeeks <= 17 ? ['1–2 ночных кормления', 'Минимум света и разговоров'] : ['0–1 ночное кормление', 'Самозасыпание при пробуждении'], isFlexible: flex });

  return schedule;
}

function getActivityByAge(ageWeeks: number, sessionIdx: number): string[] {
  if (ageWeeks <= 4) return ['Контакт кожа-к-коже', 'Tummy time 1–2 мин'];
  if (ageWeeks <= 8) return ['Tummy time 3–5 мин', 'Чёрно-белые картинки', 'Разговоры с малышом'];
  if (ageWeeks <= 12) return ['Погремушки', 'Мобиль', 'Гимнастика'];
  if (ageWeeks <= 17) return ['Развивающий коврик', 'Перевороты', 'Хватание предметов'];
  if (ageWeeks <= 26) return sessionIdx === 0 ? ['Развивающий коврик', 'Тактильные игры', 'Прогулка'] : ['Чтение книг', 'Игра на полу', 'Музыка'];
  if (ageWeeks <= 35) return sessionIdx === 0 ? ['Ползание', '«Ку-ку»', 'Пирамидки'] : ['Finger food практика', 'Стаканчик-поильник', 'Сенсорные игры'];
  if (ageWeeks <= 44) return ['Пинцетный захват', 'Ходьба у опоры', 'Простые сортеры'];
  return ['Кубики', 'Сортеры', 'Первые слова', 'Ролевые игры'];
}

function getBedtimeRitualSummary(ageWeeks: number): string[] {
  if (ageWeeks <= 12) return ['Массаж → Кормление → Пеленание + белый шум → Фраза-якорь'];
  if (ageWeeks <= 26) return ['Массаж + пижама → Кормление (не до сна) → Колыбельная → Белый шум'];
  return ['Массаж + пижама + спальный мешок → Книга → Кормление → Колыбельная → Укладывание'];
}

/* ══════════════════════════════════════════════════════════════
   BEDTIME & MORNING RITUALS
   ══════════════════════════════════════════════════════════════ */
export interface BedtimeRitual {
  totalDurationMin: number;
  steps: RitualStep[];
  anchorPhrase: string;
  ageRange: string;
}

export interface MorningRitual {
  totalDurationMin: number;
  steps: RitualStep[];
}

export function generateBedtimeRitual(ageWeeks: number, babyName = 'малыш'): BedtimeRitual {
  const phrase = `Спокойной ночи, ${babyName}. Я рядом 💛`;
  if (ageWeeks <= 12) return { totalDurationMin: 15, ageRange: '0–3 мес', anchorPhrase: phrase, steps: [{ id: 'br1', icon: '🛁', label: 'Купание / обтирание 37°С', durationMin: 2 }, { id: 'br2', icon: '💆', label: 'Массаж с маслом', durationMin: 3 }, { id: 'br3', icon: '🍼', label: 'Кормление в тихой комнате', durationMin: 5 }, { id: 'br4', icon: '👕', label: 'Пеленание + белый шум', durationMin: 2 }, { id: 'br5', icon: '🌙', label: 'Укладывание сонным + фраза-якорь', durationMin: 1 }] };
  if (ageWeeks <= 26) return { totalDurationMin: 25, ageRange: '3–6 мес', anchorPhrase: phrase, steps: [{ id: 'br1', icon: '🛁', label: 'Купание', durationMin: 5 }, { id: 'br2', icon: '💆', label: 'Массаж + пижама', durationMin: 5 }, { id: 'br3', icon: '🍼', label: 'Кормление (не до полного сна!)', durationMin: 5 }, { id: 'br4', icon: '🎵', label: 'Колыбельная (одна и та же)', durationMin: 3 }, { id: 'br5', icon: '🌙', label: 'Укладывание + белый шум + фраза-якорь', durationMin: 2 }] };
  return { totalDurationMin: 30, ageRange: '6–12 мес', anchorPhrase: phrase, steps: [{ id: 'br1', icon: '🛁', label: 'Купание', durationMin: 5 }, { id: 'br2', icon: '💆', label: 'Массаж + пижама + спальный мешок', durationMin: 5 }, { id: 'br3', icon: '📖', label: 'Чтение 1–2 книг в кресле', durationMin: 10 }, { id: 'br4', icon: '🍼', label: 'Кормление / тёплое молоко', durationMin: 5 }, { id: 'br5', icon: '🎵', label: 'Колыбельная + укладывание', durationMin: 2 }, { id: 'br6', icon: '🌙', label: 'Фраза-якорь + выход из комнаты', durationMin: 1 }] };
}

export function generateMorningRitual(ageWeeks: number): MorningRitual {
  const baseSteps: RitualStep[] = [
    { id: 'mr1', icon: '☀️', label: 'Открыть шторы — яркий свет', durationMin: 2 },
    { id: 'mr2', icon: '👕', label: 'Смена подгузника + приветственная песня', durationMin: 5 },
    { id: 'mr3', icon: '🍼', label: 'Кормление', durationMin: 10 },
  ];
  if (ageWeeks <= 8) baseSteps.push({ id: 'mr4', icon: '🐣', label: 'Tummy time 3–5 мин', durationMin: 5 });
  else if (ageWeeks <= 26) baseSteps.push({ id: 'mr4', icon: '🧸', label: 'Активная игра на коврике', durationMin: 15 });
  else baseSteps.push({ id: 'mr4', icon: '🧸', label: 'Свободная игра / ползание', durationMin: 15 });
  return { totalDurationMin: baseSteps.reduce((s, st) => s + st.durationMin, 0), steps: baseSteps };
}

/* ══════════════════════════════════════════════════════════════
   WEEKLY ADAPTATIONS
   ══════════════════════════════════════════════════════════════ */
export function getWeeklyAdaptations(ageWeeks: number, sleepLogs: Sleep[], leapInfo: LeapInfo): string[] {
  const adaptations: string[] = [];
  const norms = getNorms(ageWeeks);
  const oneWeekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  const recentSleeps = sleepLogs.filter(s => new Date(s.created_at).getTime() > oneWeekAgo);

  if (recentSleeps.length > 0) {
    const avgDurMin = recentSleeps.reduce((s, sl) => s + sl.duration_seconds / 60, 0) / recentSleeps.length;
    const avgQuality = recentSleeps.reduce((s, sl) => s + sl.quality, 0) / recentSleeps.length;
    if (avgDurMin < 35 && ageWeeks > 8) adaptations.push(`Средний сон ${Math.round(avgDurMin)} мин — коротковато. Попробуйте затемнить комнату и использовать белый шум.`);
    if (avgQuality < 3 && avgQuality > 0) adaptations.push(`Среднее качество сна ${avgQuality.toFixed(1)}/5. Проверьте температуру (18–22°С).`);
  }

  if (leapInfo.status === 'during') adaptations.push(`Скачок ${leapInfo.leapNumber} — нормально, что режим нарушен. Добавьте больше контакта и гибкости ±30 мин к расписанию.`);
  if (leapInfo.status === 'after') adaptations.push(`Скачок ${leapInfo.leapNumber} завершён! Самое время закрепить обновлённый режим.`);

  norms.alerts.forEach(alert => { if (!adaptations.includes(alert)) adaptations.push(alert); });

  if (ageWeeks >= 14 && ageWeeks <= 16) adaptations.push('⚠️ Приближается регресс сна 4 месяцев. Начните формировать ритуал укладывания сейчас.');
  if (adaptations.length === 0) adaptations.push('Режим в норме! Продолжайте в том же духе 🌟');
  return adaptations;
}

/* ══════════════════════════════════════════════════════════════
   MAIN HOOK
   ══════════════════════════════════════════════════════════════ */
export interface RoutineEngineResult {
  ageWeeks: number;
  ageMo: number;
  leapInfo: LeapInfo;
  norms: AgeNorms;
  schedule: ScheduleBlock[];
  bedtimeRitual: BedtimeRitual;
  morningRitual: MorningRitual;
  adaptations: string[];
  nextReviewDate: string;
  sources: string[];
}

export function useRoutineEngine(birthdate: string | undefined, babyName: string | undefined, sleepLogs: Sleep[] = [], wakeUpTime = '07:00'): RoutineEngineResult {
  return useMemo(() => {
    const now = Date.now();
    const birthMs = birthdate ? new Date(birthdate).getTime() : now - 17 * 7 * 24 * 3600 * 1000;
    const ageMs = now - birthMs;
    const ageWeeks = Math.max(0, Math.floor(ageMs / (7 * 24 * 3600 * 1000)));
    const ageMo = ageMs / (30.44 * 24 * 3600 * 1000);

    const leapInfo = getLeapStatus(ageWeeks);
    const norms = getNorms(ageWeeks);
    const schedule = generateDailySchedule(ageWeeks, wakeUpTime, leapInfo.status === 'during');
    const bedtimeRitual = generateBedtimeRitual(ageWeeks, babyName || 'малыш');
    const morningRitual = generateMorningRitual(ageWeeks);
    const adaptations = getWeeklyAdaptations(ageWeeks, sleepLogs, leapInfo);
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + 7);

    return { ageWeeks, ageMo, leapInfo, norms, schedule, bedtimeRitual, morningRitual, adaptations, nextReviewDate: nextReview.toISOString().split('T')[0], sources: ['НЦЗД 2025', 'Wonder Weeks 2026', 'AAP Sleep Guidelines 2025', 'ВОЗ'] };
  }, [birthdate, babyName, sleepLogs, wakeUpTime]);
}
