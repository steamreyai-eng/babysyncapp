/* ── Interpolation Helper ── */
function interpolate(ageMo: number, points: { m: number; min: number; max: number }[]) {
  if (ageMo <= points[0].m) return { min: points[0].min, max: points[0].max };
  if (ageMo >= points[points.length - 1].m) return { min: points[points.length - 1].min, max: points[points.length - 1].max };
  for (let i = 0; i < points.length - 1; i++) {
    if (ageMo >= points[i].m && ageMo < points[i + 1].m) {
      const ratio = (ageMo - points[i].m) / (points[i + 1].m - points[i].m);
      return {
        min: points[i].min + (points[i + 1].min - points[i].min) * ratio,
        max: points[i].max + (points[i + 1].max - points[i].max) * ratio,
      };
    }
  }
  return { min: points[0].min, max: points[0].max };
}

/* ── Formula Volume Norms (WHO/AAP, ml/day) ── */
export function getFormulaVolumeNorm(ageMo: number) {
  const norm = interpolate(ageMo, [
    { m: 0, min: 450, max: 720 },
    { m: 1, min: 540, max: 840 },
    { m: 2, min: 720, max: 960 },
    { m: 6, min: 720, max: 960 },
    { m: 12, min: 600, max: 900 }
  ]);
  return { min: Math.round(norm.min), max: Math.round(norm.max) };
}

/* ── Day Index ── */
export function calcDayIndex(
  feedingCount: number,
  sleepHours: number,
  diaperCount: number,
  walkMinutes: number,
  ageMo: number,
  formulaVolumeML: number = 0
): { score: number; rows: any[] } {
  // Age-based count norms (for breast / general)
  const feedCountRaw = interpolate(ageMo, [
    { m: 0, min: 8, max: 12 },
    { m: 2, min: 7, max: 10 },
    { m: 4, min: 6, max: 8 },
    { m: 6, min: 5, max: 7 },
    { m: 12, min: 4, max: 6 }
  ]);
  const feedCountNorm = { min: Math.round(feedCountRaw.min), max: Math.round(feedCountRaw.max) };

  const sleepNormRaw = interpolate(ageMo, [
    { m: 0, min: 16.0, max: 18.0 },
    { m: 2, min: 15.0, max: 17.0 },
    { m: 4, min: 14.0, max: 16.0 },
    { m: 6, min: 13.0, max: 15.0 },
    { m: 12, min: 11.0, max: 14.0 }
  ]);
  const sleepNorm = { min: Math.round(sleepNormRaw.min * 10) / 10, max: Math.round(sleepNormRaw.max * 10) / 10 };

  const diaperNorm = { min: 5, max: 8 };

  const score100 = (val: number, min: number, max: number, penalizeOver = true) => {
    if (val >= min && val <= max) return 100;
    if (val < min) return Math.max(0, Math.round((val / min) * 100));
    if (!penalizeOver) return 100;
    return Math.max(0, Math.round((1 - (val - max) / max) * 100));
  };

  // Feed score: volume-based for formula, count-based for breast
  let feedScore: number;
  const volNorm = getFormulaVolumeNorm(ageMo);
  if (formulaVolumeML > 0) {
    const volScore = score100(formulaVolumeML, volNorm.min, volNorm.max);
    const countScore = score100(feedingCount, feedCountNorm.min, feedCountNorm.max);
    feedScore = Math.round(volScore * 0.7 + countScore * 0.3);
  } else {
    feedScore = score100(feedingCount, feedCountNorm.min, feedCountNorm.max);
  }

  const sleepScore = score100(sleepHours, sleepNorm.min, sleepNorm.max);
  const diaperScore = score100(diaperCount, diaperNorm.min, diaperNorm.max);
  const walkScore = score100(walkMinutes, 20, 60, false);
  const score = Math.round((feedScore + sleepScore + diaperScore + walkScore) / 4);

  // Determine feeding display based on whether we have formula data
  const hasFormula = formulaVolumeML > 0;

  const feedVal = hasFormula
    ? `${Math.round(formulaVolumeML)} мл`
    : `${feedingCount} раз`;
  const feedNormStr = hasFormula
    ? `${volNorm.min}–${volNorm.max} мл/сут`
    : `${feedCountNorm.min}–${feedCountNorm.max}/сутки`;
  const feedLabel = hasFormula ? "Кормление (объём)" : "Кормления";

  const sleepNormStr = `${sleepNorm.min.toFixed(1)}–${sleepNorm.max.toFixed(1)}ч/сутки`;

  const rows = [
    { label: feedLabel, val: feedVal, norm: feedNormStr, score: feedScore, color: "#2563EB" },
    { label: "Сон", val: `${sleepHours.toFixed(1)}ч`, norm: sleepNormStr, score: sleepScore, color: "#8B5CF6" },
    { label: "Подгузники", val: `${diaperCount} шт`, norm: "5–8/сутки", score: diaperScore, color: "#059669" },
    { label: "Прогулки", val: `${Math.round(walkMinutes)} мин`, norm: "20–60мин/день", score: walkScore, color: "#F97316" },
  ];

  return { score, rows };
}

export function scoreColor(s: number) {
  if (s >= 70) return "#4DBFAA";
  if (s >= 40) return "#F0A500";
  return "#E05A5A";
}
