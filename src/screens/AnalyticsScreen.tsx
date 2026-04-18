import React, { useState, useEffect, useCallback } from 'react';
import { ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, RefreshControl } from 'react-native';
import {
  Milk, Moon, Baby, Footprints, Brain, TrendingUp,
  Clock, Activity, Droplets, BarChart3, ChevronLeft, ChevronRight, Info,
  Download, CalendarDays
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { useAuthStore } from '../store/authStore';
import withObservables from '@nozbe/with-observables';
import { database } from '../db';
import { BarChart, PieChart, LineChart } from 'react-native-gifted-charts';
import Skeleton from '../components/Skeleton';
const FileSystem = require('expo-file-system') as any;
import * as Sharing from 'expo-sharing';

import { calcDayIndex, scoreColor } from '../utils/metrics';
import { callAI } from '../lib/ai';

import { Wrapper } from '../components/ui/Wrapper';
import { Surface } from '../components/ui/Surface';
import { Typography } from '../components/ui/Typography';

const { width } = Dimensions.get('window');

const COLORS = {
  feed: "#2563EB", 
  feedBg: "#DBEAFE", 
  sleep: "#8B5CF6", 
  sleepBg: "#F3E8FF", 
  diaper: "#059669", 
  diaperBg: "#D1FAE5", 
  walk: "#F97316", 
  walkBg: "#FFEDD5", 
  textDate: "#0F172A",
  textGray: "#64748B",
  scoreGreen: "#4DBFAA", 
  scoreYellow: "#F0A500", 
  scoreRed: "#E05A5A", 
};

const Delta = ({ value, unit = "" }: { value: number; unit?: string }) => {
  if (!isFinite(value) || value === 0) return null;
  const up = value > 0;
  const color = up ? COLORS.scoreGreen : COLORS.scoreRed;
  const bg = up ? '#4DBFAA18' : '#E05A5A18';
  return (
    <Wrapper bg={bg} radius="sm" px={5} py={1} ml={4} dir="row" align="center">
      <Typography variant="tiny" weight="extraBold" style={{ fontSize: 9, color }}>
        {up ? "↑ " : "↓ "}{Math.abs(value)}{unit}
      </Typography>
    </Wrapper>
  );
};

const StatCard = ({ icon: Icon, value, label, bg, iconColor, delta, deltaUnit }: any) => (
  <Surface bg="white" p={16} radius="xl" variant="elevated" style={{ minWidth: 150, flex: 1, borderColor: '#E2E8F0', borderWidth: 1 }}>
    <Wrapper width={44} height={44} radius="lg" align="center" justify="center" mb={8} bg={bg}>
      <Icon size={22} color={iconColor} strokeWidth={2} />
    </Wrapper>
    <Wrapper dir="row" align="baseline" wrap="wrap" mb={2}>
      <Typography variant="h3" weight="black" color="#0F172A" style={{ fontSize: 20, lineHeight: 24 }}>{value}</Typography>
      {delta !== undefined && <Delta value={delta} unit={deltaUnit} />}
    </Wrapper>
    <Typography variant="tiny" weight="bold" color="#6B6B80" style={{ fontSize: 11, lineHeight: 14 }} numberOfLines={2}>{label}</Typography>
    {delta !== undefined && (
      <Typography variant="tiny" weight="bold" color="#94A3B8" mt={2} style={{ fontSize: 10 }}>vs пред.</Typography>
    )}
  </Surface>
);

const GaugeArc = ({ score }: { score: number }) => {
  const r = 42, cx = 55, cy = 55;
  const circumference = Math.PI * r;
  const dash = (score / 100) * circumference;
  const color = scoreColor(score);
  return (
    <Wrapper width={110} height={76} align="center">
      <Svg width={110} height={110} viewBox="0 0 110 110">
        <Defs>
          <SvgLinearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor={color} />
            <Stop offset="100%" stopColor={score >= 70 ? "#3DBFAA" : color} />
          </SvgLinearGradient>
        </Defs>
        <Path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#F0ECE8" strokeWidth={12} strokeLinecap="round" />
        <Path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="url(#gaugeGrad)" strokeWidth={12} strokeLinecap="round" strokeDasharray={`${dash} ${circumference}`} />
        <SvgText x={cx} y={cy - 2} textAnchor="middle" fontSize={26} fontWeight="900" fill={color} fontFamily="Nunito_900Black">{score}</SvgText>
        <SvgText x={cx} y={cy + 14} textAnchor="middle" fontSize={10} fontWeight="800" fill="#8A8A9E" fontFamily="Nunito_800ExtraBold">ИЗ 100</SvgText>
      </Svg>
    </Wrapper>
  );
};

const DayIndexCard = ({ score, rows, periodLabel }: any) => {
  const [showTooltip, setShowTooltip] = useState(false);
  return (
    <Surface bg="white" p={20} radius="xxl" variant="elevated" mb={20} borderWidth={1} borderColor="#E2E8F0">
      <Wrapper dir="row" justify="space-between" align="center" mb={20}>
        <Wrapper>
          <Wrapper as={TouchableOpacity} onPress={() => setShowTooltip(!showTooltip)} dir="row" align="center" style={{ gap: 6 }}>
             <Typography variant="h3" weight="black" color="#0F172A" style={{ fontSize: 20 }}>Индекс дня</Typography>
             <Info size={16} color="#94A3B8" />
          </Wrapper>
          {showTooltip && (
            <Wrapper mt={8} p={12} radius="xl" bg="#F0F4FA" borderWidth={1} borderColor="#E2E8F0" style={{ maxWidth: 260 }}>
              <Typography variant="tiny" weight="bold" color="#475569" style={{ fontSize: 11, lineHeight: 16 }}>
                Индекс считается на основе выполнения норм ВОЗ по кормлению, сну, прогулкам и подгузникам {periodLabel}.
              </Typography>
            </Wrapper>
          )}
          <Typography variant="tiny" weight="bold" color="#8A8A9E" mt={4} style={{ fontSize: 13 }}>Сводка {periodLabel}</Typography>
        </Wrapper>
        <GaugeArc score={score} />
      </Wrapper>
      <Wrapper gap={16} mt={8}>
        {rows.map((row: any) => {
           let IconComponent = Milk;
           if (row.label.includes('Сон')) IconComponent = Moon;
           if (row.label.includes('Подгузники')) IconComponent = Baby;
           if (row.label.includes('Прогулки')) IconComponent = Footprints;
           if (row.label.includes('Объём')) IconComponent = Milk;
           
           return (
             <Wrapper key={row.label}>
                <Wrapper dir="row" align="center" justify="space-between" mb={6}>
                   <Wrapper dir="row" align="center" gap={8}>
                      <Wrapper p={4} radius="sm" bg={`${row.color}15`}>
                         <IconComponent size={14} color={row.color} />
                      </Wrapper>
                      <Typography variant="tiny" weight="extraBold" color="#0F172A" style={{ fontSize: 13 }}>{row.label}</Typography>
                      <Typography variant="tiny" weight="bold" color="#475569" style={{ fontSize: 12 }}>— {row.val}</Typography>
                   </Wrapper>
                   <Typography variant="tiny" weight="black" style={{ fontSize: 13, color: scoreColor(row.score) }}>{row.score}%</Typography>
                </Wrapper>
                <Wrapper height={8} radius="sm" overflow="hidden" width="100%" bg="#F0ECE8" mb={4}>
                   <Wrapper height="100%" radius="sm" bg={scoreColor(row.score)} style={{ width: `${row.score}%` }} />
                </Wrapper>
                <Typography variant="tiny" weight="bold" color="#6B6B80" style={{ fontSize: 10, textAlign: 'right' }}>Норма ВОЗ: {row.norm}</Typography>
             </Wrapper>
           );
        })}
      </Wrapper>
    </Surface>
  );
};

const AnalyticsScreenContent = ({ feedingsAll = [], sleepsAll = [], diapersAll = [], walksAll = [] }: any) => {
  const { baby } = useAuthStore();
  const [period, setPeriod] = useState('day');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const { syncWithSupabase } = await import('../db/sync');
      await syncWithSupabase(true);
    } catch (e) {
      if (__DEV__) console.warn("Manual sync error", e);
    } finally {
      setRefreshing(false);
    }
  }, []);
  
  const [aiRecs, setAiRecs] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiLoaded, setAiLoaded] = useState(false);
  
  const [feedings, setFeedings] = useState<any[]>([]);
  const [sleeps, setSleeps] = useState<any[]>([]);
  const [diapers, setDiapers] = useState<any[]>([]);
  const [walks, setWalks] = useState<any[]>([]);

  const [prevFeedings, setPrevFeedings] = useState<any[]>([]);
  const [prevSleeps, setPrevSleeps] = useState<any[]>([]);
  const [prevDiapers, setPrevDiapers] = useState<any[]>([]);
  const [prevWalks, setPrevWalks] = useState<any[]>([]);

  useEffect(() => {
    setLoading(true);
    const now = new Date();
    const refDate = period === "day" ? new Date(selectedDate) : now;
    const daysBack = period === "day" ? 1 : period === "week" ? 7 : period === "month" ? 30 : 3650;
    
    const currentStart = new Date(refDate);
    if (period !== "all") {
       currentStart.setDate(currentStart.getDate() - (period === "day" ? 0 : daysBack));
    } else {
       currentStart.setFullYear(2000);
    }
    if (period === "day") currentStart.setHours(0, 0, 0, 0);
    
    const prevStart = new Date(currentStart);
    prevStart.setDate(prevStart.getDate() - daysBack);
    
    const currentEnd = period === "day" ? new Date(refDate) : new Date();
    if (period === "day") currentEnd.setHours(23, 59, 59, 999);

    const filterCurrent = (arr: any[]) => arr.filter(item => {
        const t = new Date(item.created_at).getTime();
        return t >= currentStart.getTime() && t <= currentEnd.getTime();
    });
    const filterPrev = (arr: any[]) => arr.filter(item => {
        const t = new Date(item.created_at).getTime();
        return t >= prevStart.getTime() && t < currentStart.getTime();
    });

    setFeedings(filterCurrent(feedingsAll));
    setPrevFeedings(filterPrev(feedingsAll));

    setSleeps(filterCurrent(sleepsAll));
    setPrevSleeps(filterPrev(sleepsAll));

    setDiapers(filterCurrent(diapersAll));
    setPrevDiapers(filterPrev(diapersAll));

    setWalks(filterCurrent(walksAll));
    setPrevWalks(filterPrev(walksAll));

    setLoading(false);
    setAiLoaded(false);
  }, [period, selectedDate, feedingsAll, sleepsAll, diapersAll, walksAll]);

  const fetchAiInsight = useCallback(async () => {
    setAiLoading(true);
    setAiLoaded(false);
    try {
       const prompt = `Ты педиатрический AI-ассистент. Проанализируй данные ребёнка (записей: кормлений ${feedings.length}, сна ${sleeps.length}, подгузников ${diapers.length}) и дай 3-4 конкретные персонализированные рекомендации. Верни только JSON массив оборванных строк ["рек1", "рек2"].`;
       const result = await callAI(prompt, {});
       if (result && typeof result === 'string') {
         try {
           const parsed = JSON.parse(result.match(/\[[\s\S]*\]/)?.[0] || "[]");
           setAiRecs(parsed.slice(0, 4));
         } catch {
           setAiRecs([result]);
         }
       } else {
         setAiRecs(["Достаточно данных для базовых рекомендаций. Продолжайте отмечать активности малыша."]);
       }
    } catch {
       setAiRecs(["⚠️ Не удалось получить рекомендации."]);
    }
    setAiLoading(false);
    setAiLoaded(true);
  }, [feedings.length, sleeps.length, diapers.length]);

  const handleExportExcel = async () => {
    try {
      const BOM = '\uFEFF';
      const sections: string[] = [];

      if (feedings.length > 0) {
        sections.push('--- КОРМЛЕНИЯ ---');
        sections.push('Дата,Тип');
        feedings.forEach((f: any) => {
          const date = new Date(f.created_at).toLocaleString('ru-RU');
          const type = f.type === 'breast' ? 'Грудь' : f.type === 'formula' ? 'Смесь' : 'Прикорм';
          sections.push(`"${date}","${type}"`);
        });
        sections.push('');
      }

      if (sleeps.length > 0) {
        sections.push('--- СОН ---');
        sections.push('Дата,Длительность (мин)');
        sleeps.forEach((s: any) => {
          const date = new Date(s.created_at).toLocaleString('ru-RU');
          sections.push(`"${date}",${Math.round(s.duration_seconds / 60)}`);
        });
        sections.push('');
      }

      if (diapers.length > 0) {
        sections.push('--- ПОДГУЗНИКИ ---');
        sections.push('Дата,Тип');
        diapers.forEach((d: any) => {
          const date = new Date(d.created_at).toLocaleString('ru-RU');
          const type = d.type === 'wet' ? 'Мокрый' : d.type === 'dirty' ? 'Грязный' : 'Оба';
          sections.push(`"${date}","${type}"`);
        });
        sections.push('');
      }

      if (walks.length > 0) {
        sections.push('--- ПРОГУЛКИ ---');
        sections.push('Дата,Длительность (мин)');
        walks.forEach((w: any) => {
          const date = new Date(w.created_at).toLocaleString('ru-RU');
          sections.push(`"${date}",${Math.round(w.duration_seconds / 60)}`);
        });
      }

      if (sections.length === 0) {
        sections.push('Нет данных для экспорта');
      }

      const csvContent = BOM + sections.join('\n');
      const uri = FileSystem.cacheDirectory + 'BabySync_Analytics.csv';

      await FileSystem.writeAsStringAsync(uri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });

      await Sharing.shareAsync(uri, {
        mimeType: 'text/csv',
        dialogTitle: 'Экспорт Аналитики',
      });
    } catch (e) {
      if (__DEV__) console.error("Export Error:", e);
    }
  };

  const ageMo = baby?.birthdate
    ? (Date.now() - new Date(baby.birthdate).getTime()) / (30.44 * 24 * 3600 * 1000)
    : 4;

  const totalFormulaVolumeML = feedings.reduce((a, f) => a + (f.formula_volume_ml || 0), 0);
  
  const daysInPeriod = period === "day" ? 1 : period === "week" ? 7 : period === "month" ? 30 : Math.max(1, feedings.length);
  const feedCountForIndex = period === "day" ? feedings.length : feedings.length / daysInPeriod;
  const sleepSecForIndex = period === "day" ? sleeps.reduce((a,s)=>a+s.duration_seconds,0) : sleeps.reduce((a,s)=>a+s.duration_seconds,0) / daysInPeriod;
  const diaperCountForIndex = period === "day" ? diapers.length : diapers.length / daysInPeriod;
  const walkMinForIndex = period === "day" ? walks.reduce((a,w)=>a+w.duration_seconds,0)/60 : (walks.reduce((a,w)=>a+w.duration_seconds,0)/60) / daysInPeriod;
  const formulaVolumeForIndex = period === "day" ? totalFormulaVolumeML : totalFormulaVolumeML / daysInPeriod;

  const { score, rows } = calcDayIndex(feedCountForIndex, sleepSecForIndex/3600, diaperCountForIndex, walkMinForIndex, ageMo, formulaVolumeForIndex);
  
  const periodLabel = period === "day" ? "сегодня" : period === "week" ? "за 7 дней" : period === "month" ? "за 30 дней" : "за всё время";

  const totalSleepSec = sleeps.reduce((acc, s) => acc + s.duration_seconds, 0);
  const totalSleepHr = Math.floor(totalSleepSec / 3600);
  const totalSleepMin = Math.floor((totalSleepSec % 3600) / 60);
  const totalSleepStr = totalSleepSec > 0 ? `${totalSleepHr}ч${totalSleepMin > 0 ? ` ${totalSleepMin}м` : ""}` : "0ч";

  const prevSleepSec = prevSleeps.reduce((acc, s) => acc + s.duration_seconds, 0);
  const deltaSleepHr = Math.round(((totalSleepSec - prevSleepSec) / 3600) * 10) / 10;

  const deltaFeedings = feedings.length - prevFeedings.length;
  const deltaDiapers = diapers.length - prevDiapers.length;

  const totalWalkSec = walks.reduce((acc, w) => acc + w.duration_seconds, 0);
  const totalWalkMinStr = Math.floor(totalWalkSec / 60);
  const totalWalkStr = totalWalkMinStr >= 60 ? `${Math.floor(totalWalkMinStr / 60)}ч ${totalWalkMinStr % 60}м` : `${totalWalkMinStr}м`;
  
  const prevWalkSec = prevWalks.reduce((acc, w) => acc + w.duration_seconds, 0);
  const deltaWalkMin = Math.round((totalWalkSec - prevWalkSec) / 60);

  const avgFeedingsPerDay = feedings.length > 0 ? (feedings.length / daysInPeriod).toFixed(1) : "—";
  const avgSleepSec = totalSleepSec / daysInPeriod;
  const avgSleepStr = totalSleepSec > 0 ? `${Math.floor(avgSleepSec / 3600)}ч ${Math.floor((avgSleepSec % 3600) / 60)}м` : "—";
  const avgWalkMin = walks.length > 0 ? Math.round(totalWalkSec / walks.length / 60) : 0;

  let daySec = 0, nightSec = 0;
  sleeps.forEach(s => {
    const endD = new Date(s.end_time || s.created_at);
    const start = new Date(endD.getTime() - s.duration_seconds * 1000);
    const h = start.getHours();
    if (h >= 7 && h < 19) daySec += s.duration_seconds;
    else nightSec += s.duration_seconds;
  });

  let wakeTotalMin = 0;
  let wakeCount = 0;
  if (sleeps.length >= 2) {
    const sorted = [...sleeps].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    for (let i = 0; i < sorted.length - 1; i++) {
      const wokeUpAt = new Date(sorted[i].created_at).getTime();
      const fellAsleepAt = new Date(new Date(sorted[i + 1].created_at).getTime() - sorted[i + 1].duration_seconds * 1000).getTime();
      const diffMin = (fellAsleepAt - wokeUpAt) / 60000;
      if (diffMin > 15 && diffMin < 600) { wakeTotalMin += diffMin; wakeCount++; }
    }
  }
  const avgWakeWin = wakeCount > 0 ? Math.round(wakeTotalMin / wakeCount) : 0;

  const feedingIntervals = () => {
    if (feedings.length < 2) return [];
    return feedings.slice(1).map((f, i) => {
      const prev = feedings[i];
      const diff = Math.round((new Date(f.created_at).getTime() - new Date(prev.created_at).getTime()) / 60000);
      if (diff < 0 || diff > 600) return null;
      return { value: diff, label: new Date(f.created_at).getHours() + "ч" };
    }).filter(Boolean) as { value: number; label: string }[];
  };
  const intervals = feedingIntervals();
  const avgIntervalMin = intervals.length ? Math.round(intervals.reduce((a, x) => a + x.value, 0) / intervals.length) : 0;

  const getBarData = () => {
    if (feedings.length === 0) return [];
    const hourlyGroups: Record<number, number> = {};
    feedings.forEach(f => {
       const d = new Date(f.created_at);
       const h = d.getHours();
       const vol = f.formula_volume_ml || f.solid_volume_g || (f.duration_seconds ? Math.round(f.duration_seconds / 60 * 10) : 0);
       hourlyGroups[h] = (hourlyGroups[h] || 0) + vol;
    });
    return Object.keys(hourlyGroups)
      .map(k => Number(k))
      .sort((a,b) => a - b)
      .map(h => ({
         value: hourlyGroups[h] || 0,
         label: `${h}:00`,
         frontColor: COLORS.feed,
      }));
  };
  const computedBarData = getBarData();
  const barData = computedBarData.length > 0 ? computedBarData : [{value: 0, label: '', frontColor: COLORS.feed}];

  const getPieData = () => {
    let wet = 0, dirty = 0, both = 0;
    diapers.forEach(d => {
       if (d.type === 'wet') wet++;
       else if (d.type === 'dirty') dirty++;
       else both++;
    });
    const total = wet + dirty + both;
    if (total === 0) return [{value: 1, color: '#E2E8F0', text: 'Пусто'}];
    const data = [];
    if (wet > 0) data.push({ value: Math.round((wet/total)*100), color: '#3B82F6', text: 'Мокрый', count: wet });
    if (dirty > 0) data.push({ value: Math.round((dirty/total)*100), color: '#059669', text: 'Грязный', count: dirty });
    if (both > 0) data.push({ value: Math.round((both/total)*100), color: '#8B5CF6', text: 'Оба', count: both });
    return data;
  };
  const pieData = getPieData();

  if (loading) {
     return (
       <Wrapper flex={1} bg="#FAFBFC" pt={Math.max(20, 60)}>
         <Wrapper px={20} pb={8} dir="row" justify="space-between">
           <Skeleton width={140} height={38} borderRadius={12} />
           <Skeleton width={80} height={36} borderRadius={12} />
         </Wrapper>
         <Wrapper px={20} pb={20}>
           <Skeleton width={110} height={20} borderRadius={8} />
         </Wrapper>
         <Wrapper mx={20} mb={20}>
           <Skeleton width="100%" height={48} borderRadius={24} />
         </Wrapper>
         <Wrapper mx={20} mb={16}>
           <Skeleton width="100%" height={160} borderRadius={24} />
         </Wrapper>
         <Wrapper px={20} dir="row" wrap="wrap" gap={12}>
           <Skeleton width="48%" height={110} borderRadius={20} />
           <Skeleton width="48%" height={110} borderRadius={20} />
           <Skeleton width="48%" height={110} borderRadius={20} />
           <Skeleton width="48%" height={110} borderRadius={20} />
         </Wrapper>
       </Wrapper>
     );
  }

  return (
    <ScrollView 
       style={{ flex: 1, backgroundColor: '#FAFBFC' }} 
       contentContainerStyle={{ paddingBottom: 100 }}
       refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366F1']} />}
       showsVerticalScrollIndicator={false}
    >
       <Wrapper px={20} pt={Math.max(20, 40)} pb={8} dir="row" align="center" justify="space-between">
          <Typography variant="h1" weight="black" color="#0F172A" style={{ fontSize: 32, letterSpacing: -0.5 }}>Аналитика</Typography>
          <Wrapper as={TouchableOpacity} onPress={handleExportExcel} height={36} px={12} radius="lg" bg="rgba(37, 99, 235, 0.1)" dir="row" align="center" justify="center">
             <Download size={16} color="#2563EB" style={{ marginRight: 4 }} />
             <Typography variant="tiny" weight="extraBold" color="#2563EB" style={{ fontSize: 13 }}>Excel</Typography>
          </Wrapper>
       </Wrapper>
       <Typography variant="tiny" weight="bold" color="#6B6B80" px={20} pb={20} style={{ fontSize: 15 }}>Панель данных</Typography>

       {/* Floating Pills for Period */}
       <Wrapper mx={20} bg="#E2E8F0" radius="xxl" p={4} dir="row" mb={20}>
          {[
            { id: 'day', label: 'Сегодня' },
            { id: 'week', label: '7 дней' },
            { id: 'month', label: '30 дней' },
            { id: 'all', label: 'Всё время' }
          ].map((p) => {
             const active = period === p.id;
             return (
               <Surface 
                  as={TouchableOpacity}
                  key={p.id} 
                  onPress={() => setPeriod(p.id)}
                  flex={1} py={8} radius="xl" align="center" justify="center"
                  bg={active ? 'white' : 'transparent'}
                  variant={active ? 'elevated' : 'flat'}
               >
                 <Typography variant="tiny" weight="extraBold" color={active ? '#0F172A' : '#64748B'} style={{ fontSize: 13 }}>{p.label}</Typography>
               </Surface>
             );
          })}
       </Wrapper>

       {/* Date Selector */}
       {period === 'day' && (
         <Surface dir="row" align="center" justify="space-between" bg="white" radius="xl" p={12} mx={20} mb={20} variant="elevated" borderWidth={1} borderColor="#F0ECE8">
            <Wrapper as={TouchableOpacity} onPress={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d); }} width={40} height={40} align="center" justify="center" bg="#F4F4F8" radius="lg">
               <ChevronLeft size={20} color="#8A8A9E" />
            </Wrapper>
            <Wrapper dir="row" align="center" gap={8}>
               <CalendarDays size={18} color="#2563EB" />
               <Typography variant="body" weight="black" color="#1A1A2E" style={{ fontSize: 15, letterSpacing: -0.2 }}>
                  {selectedDate.toLocaleDateString() === new Date().toLocaleDateString() ? 'Сегодня' : selectedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
               </Typography>
            </Wrapper>
            <Wrapper 
               as={TouchableOpacity}
               disabled={selectedDate.toLocaleDateString() === new Date().toLocaleDateString()}
               onPress={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d); }} 
               width={40} height={40} align="center" justify="center" bg={selectedDate.toLocaleDateString() === new Date().toLocaleDateString() ? 'transparent' : '#F4F4F8'} radius="lg"
            >
               <ChevronRight size={20} color={selectedDate.toLocaleDateString() === new Date().toLocaleDateString() ? '#D1D1DB' : '#8A8A9E'} />
            </Wrapper>
         </Surface>
       )}

       <Wrapper px={20}>
           <DayIndexCard score={score} rows={rows} periodLabel={periodLabel} />

           {/* Bento Stat Cards Grid */}
           <Wrapper dir="row" wrap="wrap" gap={12} mb={20}>
             <StatCard icon={Milk} iconColor={COLORS.feed} value={feedings.length} label="Кормлений" bg={COLORS.feedBg} delta={period !== "all" ? deltaFeedings : undefined} deltaUnit=" раз" />
             <StatCard icon={Moon} iconColor={COLORS.sleep} value={totalSleepStr} label="Сон всего" bg={COLORS.sleepBg} delta={period !== "all" ? deltaSleepHr : undefined} deltaUnit="ч" />
             <StatCard icon={Baby} iconColor={COLORS.diaper} value={diapers.length} label="Подгузники" bg={COLORS.diaperBg} delta={period !== "all" ? deltaDiapers : undefined} deltaUnit=" шт" />
             <StatCard icon={Footprints} iconColor={COLORS.walk} value={walks.length} label="Прогулок" bg={COLORS.walkBg} delta={period !== "all" ? deltaWalkMin : undefined} deltaUnit=" мин" />

             <StatCard icon={BarChart3} iconColor="#EF4444" value={feedings.length + sleeps.length + diapers.length + walks.length} label="Записей всего" bg="#FFE4E4" />
             <StatCard icon={TrendingUp} iconColor={COLORS.feed} value={avgFeedingsPerDay} label="Кормлений/день" bg={COLORS.feedBg} />
             <StatCard icon={Clock} iconColor={COLORS.sleep} value={avgSleepStr} label="Ср. сон/день" bg={COLORS.sleepBg} />
             {avgIntervalMin > 0 && <StatCard icon={Activity} iconColor="#059669" value={`${avgIntervalMin}м`} label="Ср. интервал" bg="#ECFDF5" />}
             {totalFormulaVolumeML > 0 && <StatCard icon={Droplets} iconColor="#F97316" value={`${totalFormulaVolumeML}мл`} label="Смесь всего" bg="#FFEDD5" />}
             {walks.length > 0 && <StatCard icon={Footprints} iconColor="#EF4444" value={totalWalkStr} label="Прогулок всего" bg="#FFE4E4" />}
             {walks.length > 0 && avgWalkMin > 0 && <StatCard icon={Clock} iconColor={COLORS.feed} value={`${avgWalkMin}м`} label="Ср. прогулка" bg={COLORS.feedBg} />}
           </Wrapper>

           {/* AI Insight Card */}
           <Surface bg="white" p={20} radius="xxl" variant="elevated" mb={20} borderWidth={1} borderColor="#E2E8F0">
              <Wrapper dir="row" align="center" justify="space-between" mb={16}>
                 <Wrapper dir="row" align="center" gap={12}>
                    <Wrapper width={40} height={40} radius="sm" bg="#8B5CF6" align="center" justify="center" style={{ shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 3 }}>
                       <Brain size={20} color="white" />
                    </Wrapper>
                    <Wrapper>
                       <Typography variant="body" weight="black" color="#0F172A" style={{ fontSize: 16 }}>AI-Рекомендации</Typography>
                       <Typography variant="tiny" weight="bold" color="#4DBFAA" style={{ fontSize: 9 }}>Персональный анализ</Typography>
                    </Wrapper>
                 </Wrapper>
                 {!aiLoading && (
                   <Wrapper as={TouchableOpacity} onPress={fetchAiInsight} px={12} py={6} radius="sm" bg="#F3E8FF">
                      <Typography variant="tiny" weight="extraBold" color="#8B5CF6" style={{ fontSize: 11 }}>Обновить</Typography>
                   </Wrapper>
                 )}
              </Wrapper>
              
              {aiLoading ? (
                 <Wrapper py={16} dir="row" align="center" gap={12}>
                    <ActivityIndicator size="small" color="#8B5CF6" />
                    <Typography variant="tiny" weight="bold" color="#6B6B80" style={{ fontSize: 12 }}>AI анализирует данные...</Typography>
                 </Wrapper>
              ) : aiRecs.length > 0 ? (
                 <Wrapper gap={10}>
                    {aiRecs.map((rec, i) => (
                       <Wrapper key={i} bg="#F8FAFC" p={12} radius="sm">
                          <Typography variant="tiny" weight="bold" color="#0F172A" style={{ fontSize: 13, lineHeight: 20 }}>{rec}</Typography>
                       </Wrapper>
                    ))}
                    <Typography variant="tiny" weight="bold" color="#6B6B80" align="center" mt={4} style={{ fontSize: 9 }}>⚕️ Только в информационных целях. Консультируйтесь с педиатром.</Typography>
                 </Wrapper>
              ) : (
                 <Wrapper py={16} align="center">
                    <Typography variant="tiny" weight="bold" color="#6B6B80" align="center" style={{ fontSize: 12 }}>Нажмите "Обновить" для генерации новых рекомендаций на основе последних данных.</Typography>
                 </Wrapper>
              )}
           </Surface>
           
           {/* Charts (BarChart) */}
           <Surface bg="white" p={20} radius="xxl" variant="elevated" mb={20} borderWidth={1} borderColor="#E2E8F0">
              <Wrapper width="100%" dir="row" align="center" mb={20}>
                 <Wrapper width={40} height={40} radius="sm" bg="#DBEAFE" align="center" justify="center" mr={12}>
                    <Milk size={20} color={COLORS.feed} />
                 </Wrapper>
                 <Wrapper>
                    <Typography variant="body" weight="black" color="#0F172A" style={{ fontSize: 18 }}>Кормления по часам</Typography>
                    <Typography variant="tiny" weight="bold" color="#6B6B80" style={{ fontSize: 12 }}>Объём по времени суток</Typography>
                 </Wrapper>
              </Wrapper>
              {barData.length === 1 && barData[0].value === 0 ? (
                 <Wrapper height={150} justify="center" align="center">
                   <Typography variant="tiny" weight="bold" color="#8A8A9E">Нет данных</Typography>
                 </Wrapper>
              ) : (
                 <Wrapper style={{ marginLeft: -10 }}>
                   <BarChart
                      data={barData.map(d => ({ ...d, frontColor: '#2563EB', value: d.value }))}
                      barWidth={12}
                      noOfSections={4}
                      barBorderRadius={4}
                      frontColor="#2563EB"
                      yAxisThickness={0}
                      xAxisThickness={0}
                      rulesColor="#E2E8F0"
                      hideRules={false}
                      width={width - 90}
                      spacing={barData.length > 5 ? 20 : 36}
                      initialSpacing={15}
                      yAxisTextStyle={{ color: '#6B6B80', fontSize: 10, fontFamily: 'Nunito_700Bold' }}
                      xAxisLabelTextStyle={{ color: '#6B6B80', fontSize: 10, fontFamily: 'Nunito_700Bold' }}
                      renderTooltip={(item: any) => {
                         return (
                           <Wrapper bg="rgba(255, 255, 255, 0.95)" p={8} radius="lg" borderColor="#E2E8F0" borderWidth={1} style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, transform: [{translateX: -20}, {translateY: -30}] }}>
                             <Typography variant="tiny" weight="extraBold" color="#6B6B80" mb={4} style={{ fontSize: 10 }}>{item.label}</Typography>
                             <Wrapper dir="row" align="center" gap={6}>
                               <Wrapper width={8} height={8} radius="xl" bg="#2563EB" />
                               <Typography variant="body" weight="black" color="#0F172A" style={{ fontSize: 14 }}>{item.value}</Typography>
                             </Wrapper>
                           </Wrapper>
                         )
                      }}
                   />
                 </Wrapper>
              )}
           </Surface>

           {intervals.length > 1 && (
             <Surface bg="white" p={20} radius="xxl" variant="elevated" mb={20} borderWidth={1} borderColor="#E2E8F0">
                <Wrapper width="100%" dir="row" align="center" mb={12}>
                   <Wrapper width={40} height={40} radius="sm" bg="#D1FAE5" align="center" justify="center" mr={12}>
                      <Clock size={20} color={COLORS.diaper} />
                   </Wrapper>
                   <Wrapper>
                      <Typography variant="body" weight="black" color="#0F172A" style={{ fontSize: 18 }}>Интервалы М/У Кормлениями</Typography>
                      <Typography variant="tiny" weight="bold" color="#6B6B80" style={{ fontSize: 12 }}>Минут между кормлениями</Typography>
                   </Wrapper>
                </Wrapper>
                {ageMo >= 4 && intervals.length >= 3 && intervals[intervals.length - 1].value > intervals[0].value && (
                  <Typography variant="tiny" weight="bold" color={COLORS.diaper} mb={16} style={{ fontSize: 12 }}>
                     📈 Интервал растёт — это норма для 4+ мес
                  </Typography>
                )}
                
                <Wrapper dir="row" align="center" mb={16} gap={6}>
                   <Wrapper px={8} py={4} bg="rgba(5, 150, 105, 0.1)" radius="sm">
                       <Typography variant="tiny" weight="extraBold" color="#059669" style={{ fontSize: 11 }}>Норма 2.5–3.5ч</Typography>
                   </Wrapper>
                </Wrapper>
                
                <Wrapper style={{ marginLeft: -10 }}>
                   <LineChart
                      data={intervals.map(d => ({ ...d, dataPointText: d.value.toString() }))}
                      color="#2563EB"
                      thickness={3}
                      dataPointsColor="#2563EB"
                      hideRules={false}
                      rulesColor="#E2E8F0"
                      yAxisThickness={0}
                      xAxisThickness={0}
                      width={width - 80}
                      areaChart
                      startFillColor="#2563EB"
                      startOpacity={0.2}
                      endOpacity={0}
                      showValuesAsDataPointsText
                      textShiftY={-10}
                      textShiftX={-10}
                      textFontSize={10}
                      textColor="#2563EB"
                      yAxisTextStyle={{ color: '#6B6B80', fontSize: 10, fontFamily: 'Nunito_700Bold' }}
                      showReferenceLine1={true}
                      referenceLine1Position={210}
                      referenceLine1Config={{ color: '#059669', type: 'dashed', dashWidth: 4, dashGap: 4, thickness: 1 }}
                      showReferenceLine2={true}
                      referenceLine2Position={150}
                      referenceLine2Config={{ color: '#059669', type: 'dashed', dashWidth: 4, dashGap: 4, thickness: 1 }}
                      initialSpacing={20}
                      spacing={50}
                   />
                </Wrapper>
             </Surface>
           )}

           {/* Sleep blocks timeline */}
           <Surface bg="white" p={20} radius="xxl" variant="elevated" mb={20} borderWidth={1} borderColor="#E2E8F0">
             <Wrapper dir="row" align="center" gap={8} mb={16}>
               <Clock size={20} color={COLORS.sleep} />
               <Wrapper>
                  <Typography variant="body" weight="black" color="#1A1A2E" style={{ fontSize: 18 }}>Блоки сна</Typography>
                  <Typography variant="tiny" weight="bold" color="#6B6B80" style={{ fontSize: 12 }}>Метрики и распределение по времени суток</Typography>
               </Wrapper>
             </Wrapper>
             
             {/* Sleep grid blocks */}
             <Wrapper dir="row" wrap="wrap" gap={8} mb={20}>
               <Surface p={12} radius="lg" flex={1} bg="#F4F7FB" style={{ minWidth: 140 }}>
                 <Typography variant="tiny" weight="extraBold" color="#8A8A9E" mb={4} uppercase style={{ fontSize: 11 }}>Дневной сон</Typography>
                 <Typography variant="h3" weight="black" color="#4E8FD4" style={{ fontSize: 16 }}>{Math.floor(daySec / 3600)}ч {Math.floor((daySec % 3600) / 60)}м</Typography>
                 <Typography variant="tiny" weight="bold" color="#6B6B80" mt={4} style={{ fontSize: 10 }}>с 07:00 до 19:00</Typography>
               </Surface>
               <Surface p={12} radius="lg" flex={1} bg="#EDE4F8" style={{ minWidth: 140 }}>
                 <Typography variant="tiny" weight="extraBold" color="#8A8A9E" mb={4} uppercase style={{ fontSize: 11 }}>Ночной сон</Typography>
                 <Typography variant="h3" weight="black" color="#8B6FD4" style={{ fontSize: 16 }}>{Math.floor(nightSec / 3600)}ч {Math.floor((nightSec % 3600) / 60)}м</Typography>
                 <Typography variant="tiny" weight="bold" color="#6B6B80" mt={4} style={{ fontSize: 10 }}>с 19:00 до 07:00</Typography>
               </Surface>
               <Surface p={12} radius="lg" flex={1} bg="#D4F3EC" style={{ minWidth: 140 }}>
                 <Typography variant="tiny" weight="extraBold" color="#8A8A9E" mb={4} uppercase style={{ fontSize: 11 }}>Ср. бодрствование</Typography>
                 <Typography variant="h3" weight="black" color="#2A9B7E" style={{ fontSize: 16 }}>{avgWakeWin >= 60 ? `${Math.floor(avgWakeWin / 60)}ч ${avgWakeWin % 60}м` : `${avgWakeWin}м`}</Typography>
                 <Typography variant="tiny" weight="bold" color="#6B6B80" mt={4} style={{ fontSize: 10 }}>между снами</Typography>
               </Surface>
               <Surface p={12} radius="lg" flex={1} bg="#F5F0E6" style={{ minWidth: 140 }}>
                 <Typography variant="tiny" weight="extraBold" color="#8A8A9E" mb={4} uppercase style={{ fontSize: 11 }}>Кол-во снов</Typography>
                 <Typography variant="h3" weight="black" color="#E69600" style={{ fontSize: 16 }}>{sleeps.length} шт.</Typography>
                 <Typography variant="tiny" weight="bold" color="#6B6B80" mt={4} style={{ fontSize: 10 }}>включая ночные пробуж.</Typography>
               </Surface>
             </Wrapper>

             <Wrapper p={16} bg="#FFFFFF" radius="xl" borderWidth={1} borderColor="#F0ECE8">
                <Wrapper dir="row" align="center" justify="space-between" mb={16}>
                  <Typography variant="body" weight="black" color="#1A1A2E" style={{ fontSize: 14 }}>График снов</Typography>
                  <Wrapper px={10} py={6} radius="lg" bg="#F5F3FF">
                    <Typography variant="tiny" weight="black" color="#8B5CF6" style={{ fontSize: 12 }}>{totalSleepStr}</Typography>
                  </Wrapper>
                </Wrapper>
                
                <Wrapper height={24} radius="lg" bg="#F4F4F8" width="100%">
                  {sleeps.map(s => {
                    const endD = new Date(s.end_time || s.created_at);
                    const start = new Date(endD.getTime() - s.duration_seconds * 1000);
                    const sp = ((start.getHours() * 60) + start.getMinutes()) / (24 * 60) * 100;
                    let wp = (s.duration_seconds / (24 * 3600)) * 100;
                    if (sp + wp > 100) wp = 100 - sp; 
                    
                    return (
                      <LinearGradient
                        key={s.id}
                        colors={['#A78BFA', '#8B5CF6']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={{ position: 'absolute', height: '100%', left: `${sp}%`, width: `${Math.max(1.5, wp)}%`, borderRadius: 12 }}
                      />
                    );
                  })}
                </Wrapper>
                
                <Wrapper dir="row" justify="space-between" mt={12} px={4}>
                  {["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "23:59"].map(t => (
                    <Typography key={t} variant="tiny" weight="extraBold" color="#6B6B80" style={{ fontSize: 9 }}>{t}</Typography>
                  ))}
                </Wrapper>
             </Wrapper>
           </Surface>

           <Surface bg="white" p={20} radius="xxl" variant="elevated" mb={20} borderWidth={1} borderColor="#E2E8F0">
              <Wrapper width="100%" dir="row" align="center" mb={24} justify="space-between">
                 <Wrapper dir="row" align="center">
                    <Wrapper width={40} height={40} radius="sm" bg="#ECFDF5" align="center" justify="center" mr={12}>
                       <Baby size={20} color="#059669" />
                    </Wrapper>
                    <Typography variant="body" weight="black" color="#0F172A" style={{ fontSize: 18 }}>Подгузники</Typography>
                 </Wrapper>
                 {diapers.length > 0 && (
                   <Wrapper px={12} py={4} radius="xxl" bg="#FFFFFF" borderWidth={1} borderColor="#E2E8F0">
                     <Typography variant="tiny" weight="extraBold" color="#1A1A2E" style={{ fontSize: 12 }}>{diapers.length} шт.</Typography>
                   </Wrapper>
                 )}
              </Wrapper>
              {pieData.length === 1 && pieData[0].text === 'Пусто' ? (
                 <Wrapper height={180} justify="center" align="center">
                   <Typography variant="tiny" weight="bold" color="#8A8A9E">Нет данных</Typography>
                 </Wrapper>
              ) : (
                <Wrapper dir="row" align="center" justify="space-between">
                  <Wrapper flex={1} align="center">
                    <PieChart
                       data={pieData}
                       donut
                       innerRadius={45}
                       radius={70}
                    />
                  </Wrapper>
                  <Wrapper flex={1} pl={10} gap={16}>
                     {pieData.sort((a,b) => b.value - a.value).map((p: any, i) => (
                        <Wrapper key={i}>
                           <Wrapper dir="row" align="center" justify="space-between" mb={8}>
                             <Wrapper dir="row" align="center" gap={8}>
                               <Wrapper width={10} height={10} radius="xl" bg={p.color} />
                               <Typography variant="body" weight="extraBold" color="#0F172A" style={{ fontSize: 14 }}>{p.text} <Typography variant="tiny" weight="bold" color="#64748B" style={{ fontSize: 13 }}>({p.count})</Typography></Typography>
                             </Wrapper>
                             <Typography variant="body" weight="black" style={{ fontSize: 14, color: p.color }}>{p.value}%</Typography>
                           </Wrapper>
                           <Wrapper height={6} radius="sm" bg="#F0ECE8" width="100%">
                             <Wrapper height="100%" radius="sm" bg={p.color} style={{ width: `${p.value}%` }} />
                           </Wrapper>
                        </Wrapper>
                     ))}
                  </Wrapper>
                </Wrapper>
              )}
           </Surface>
       </Wrapper>
    </ScrollView>
  );
};

const enhance = withObservables([], () => ({
  feedingsAll: database.collections.get('feedings').query().observe(),
  sleepsAll: database.collections.get('sleeps').query().observe(),
  diapersAll: database.collections.get('diapers').query().observe(),
  walksAll: database.collections.get('walks').query().observe(),
}));

const EnhancedAnalytics = enhance(AnalyticsScreenContent);

export default function AnalyticsScreen() {
  return <EnhancedAnalytics />;
}
