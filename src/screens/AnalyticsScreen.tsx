
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, StyleSheet, RefreshControl } from 'react-native';
import {
  Milk, Moon, Baby, Footprints, Brain, TrendingUp,
  Clock, Activity, Droplets, AlertCircle, TrendingDown,
  WifiOff, BarChart3, ChevronUp, ChevronDown, CalendarDays, Download, ChevronLeft, ChevronRight, Info,
  LineChart as LineChartIcon, PieChart as PieChartIcon
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
import * as XLSX from 'xlsx';

import { calcDayIndex, scoreColor } from '../utils/metrics';
import { callAI } from '../lib/ai';

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

// scoreColor is now imported from '../utils/metrics'

const Delta = ({ value, unit = "" }: { value: number; unit?: string }) => {
  if (!isFinite(value) || value === 0) return null;
  const up = value > 0;
  const color = up ? COLORS.scoreGreen : COLORS.scoreRed;
  const bg = up ? '#4DBFAA18' : '#E05A5A18';
  return (
    <View style={{ backgroundColor: bg, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1, marginLeft: 4, flexDirection: 'row', alignItems: 'center' }}>
      <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 9, color }}>
        {up ? "↑ " : "↓ "}{Math.abs(value)}{unit}
      </Text>
    </View>
  );
};

const StatCard = ({ icon: Icon, value, label, bg, iconColor, delta, deltaUnit }: any) => (
  <View style={styles.statCard}>
    <View style={[{ backgroundColor: bg }, styles.statIconWrapper]}>
      <Icon size={22} color={iconColor} strokeWidth={2} />
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', marginBottom: 2 }}>
      <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 20, color: '#0F172A', lineHeight: 24 }}>{value}</Text>
      {delta !== undefined && <Delta value={delta} unit={deltaUnit} />}
    </View>
    <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 11, color: '#6B6B80', lineHeight: 14 }} numberOfLines={2}>{label}</Text>
    {delta !== undefined && (
      <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 10, color: '#94A3B8', marginTop: 2 }}>vs пред.</Text>
    )}
  </View>
);

const GaugeArc = ({ score }: { score: number }) => {
  const r = 42, cx = 55, cy = 55;
  const circumference = Math.PI * r;
  const dash = (score / 100) * circumference;
  const color = scoreColor(score);
  return (
    <View style={{ width: 110, height: 76, alignItems: 'center' }}>
      <Svg width={110} height={110} viewBox="0 0 110 110">
        <Defs>
          <SvgLinearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor={color} />
            <Stop offset="100%" stopColor={score >= 70 ? "#3DBFAA" : color} />
          </SvgLinearGradient>
        </Defs>
        {/* Track */}
        <Path 
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke="#F0ECE8" strokeWidth={12} strokeLinecap="round"
        />
        {/* Fill */}
        <Path 
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke="url(#gaugeGrad)" strokeWidth={12} strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
        />
        <SvgText x={cx} y={cy - 2} textAnchor="middle" fontSize={26} fontWeight="900" fill={color} fontFamily="Nunito_900Black">
          {score}
        </SvgText>
        <SvgText x={cx} y={cy + 14} textAnchor="middle" fontSize={10} fontWeight="800" fill="#8A8A9E" fontFamily="Nunito_800ExtraBold">
          ИЗ 100
        </SvgText>
      </Svg>
    </View>
  );
};

const DayIndexCard = ({ score, rows, periodLabel }: any) => {
  const [showTooltip, setShowTooltip] = useState(false);
  return (
    <View style={styles.card}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <View>
          <TouchableOpacity onPress={() => setShowTooltip(!showTooltip)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
             <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 20, color: '#0F172A' }}>Индекс дня</Text>
             <Info size={16} color="#94A3B8" />
          </TouchableOpacity>
          {showTooltip && (
            <View style={{ marginTop: 8, padding: 12, borderRadius: 16, backgroundColor: '#F0F4FA', borderWidth: 1, borderColor: '#E2E8F0', maxWidth: 260 }}>
              <Text style={{ fontSize: 11, fontFamily: 'Nunito_700Bold', color: '#475569', lineHeight: 16 }}>
                Индекс считается на основе выполнения норм ВОЗ по кормлению, сну, прогулкам и подгузникам {periodLabel}.
              </Text>
            </View>
          )}
          <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 13, color: '#8A8A9E', marginTop: 4 }}>Сводка {periodLabel}</Text>
        </View>
        <GaugeArc score={score} />
      </View>
      <View style={{ gap: 16, marginTop: 8 }}>
        {rows.map((row: any) => {
           let IconComponent = Milk;
           if (row.label.includes('Сон')) IconComponent = Moon;
           if (row.label.includes('Подгузники')) IconComponent = Baby;
           if (row.label.includes('Прогулки')) IconComponent = Footprints;
           if (row.label.includes('Объём')) IconComponent = Milk;
           
           return (
             <View key={row.label}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                   <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ padding: 4, borderRadius: 8, backgroundColor: `${row.color}15` }}>
                         <IconComponent size={14} color={row.color} />
                      </View>
                      <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 13, color: '#0F172A' }}>{row.label}</Text>
                      <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 12, color: '#475569' }}>— {row.val}</Text>
                   </View>
                   <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 13, color: scoreColor(row.score) }}>{row.score}%</Text>
                </View>
                <View style={{ height: 8, borderRadius: 4, overflow: 'hidden', width: '100%', backgroundColor: '#F0ECE8', marginBottom: 4 }}>
                   <View style={{ height: '100%', borderRadius: 4, width: `${row.score}%`, backgroundColor: scoreColor(row.score) }} />
                </View>
                <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 10, color: '#6B6B80', textAlign: 'right' }}>Норма ВОЗ: {row.norm}</Text>
             </View>
           );
        })}
      </View>
    </View>
  );
};

const AnalyticsScreenContent = ({ feedingsAll = [], sleepsAll = [], diapersAll = [], walksAll = [] }: any) => {
  const { baby } = useAuthStore();
  const [period, setPeriod] = useState('day'); // 'day', 'week', 'month', 'all'
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const { syncWithSupabase } = await import('../db/sync');
      await syncWithSupabase(true);
    } catch (e) {
      console.warn("Manual sync error", e);
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
    const daysBack = period === "day" ? 1 : period === "week" ? 7 : period === "month" ? 30 : 3650; // all ~ 10 years
    
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
    setAiLoaded(false); // Reset AI on change
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
      const wb = XLSX.utils.book_new();
      
      const feedData = feedings.map((f: any) => ({
         "Дата": new Date(f.created_at).toLocaleString("ru-RU"),
         "Тип": f.type === 'breast' ? 'Грудь' : f.type === 'formula' ? 'Смесь' : 'Прикорм',
      }));
      const sleepData = sleeps.map((s: any) => ({
         "Дата": new Date(s.created_at).toLocaleString("ru-RU"),
         "Длительность (сек)": s.duration_seconds,
      }));
      const diaperData = diapers.map((d: any) => ({
         "Дата": new Date(d.created_at).toLocaleString("ru-RU"),
         "Тип": d.type,
      }));
      const walkData = walks.map((w: any) => ({
         "Дата": new Date(w.created_at).toLocaleString("ru-RU"),
         "Длительность (сек)": w.duration_seconds,
      }));
      
      if (feedData.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(feedData), "Кормления");
      if (sleepData.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sleepData), "Сны");
      if (diaperData.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(diaperData), "Подгу");
      if (walkData.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(walkData), "Прогулки");

      if (wb.SheetNames.length === 0) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ "Сообщение": "Нет данных" }]), "Пусто");
      }

      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const uri = FileSystem.cacheDirectory + `BabySync_Analytics.xlsx`;
      
      await FileSystem.writeAsStringAsync(uri, wbout, { encoding: FileSystem.EncodingType.Base64 });
      
      await Sharing.shareAsync(uri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Экспорт Аналитики',
      });
    } catch (e) {
      console.error("Export Error:", e);
    }
  };

  const ageMo = baby?.birthdate
    ? (Date.now() - new Date(baby.birthdate).getTime()) / (30.44 * 24 * 3600 * 1000)
    : 4;

  const totalFormulaVolumeML = feedings.reduce((a, f) => a + (f.formula_volume_ml || 0), 0);
  
  // Averages for day index depending on period
  const daysInPeriod = period === "day" ? 1 : period === "week" ? 7 : period === "month" ? 30 : Math.max(1, feedings.length);
  const feedCountForIndex = period === "day" ? feedings.length : feedings.length / daysInPeriod;
  const sleepSecForIndex = period === "day" ? sleeps.reduce((a,s)=>a+s.duration_seconds,0) : sleeps.reduce((a,s)=>a+s.duration_seconds,0) / daysInPeriod;
  const diaperCountForIndex = period === "day" ? diapers.length : diapers.length / daysInPeriod;
  const walkMinForIndex = period === "day" ? walks.reduce((a,w)=>a+w.duration_seconds,0)/60 : (walks.reduce((a,w)=>a+w.duration_seconds,0)/60) / daysInPeriod;
  const formulaVolumeForIndex = period === "day" ? totalFormulaVolumeML : totalFormulaVolumeML / daysInPeriod;

  const { score, rows } = calcDayIndex(feedCountForIndex, sleepSecForIndex/3600, diaperCountForIndex, walkMinForIndex, ageMo, formulaVolumeForIndex);
  
  const periodLabel = period === "day" ? "сегодня" : period === "week" ? "за 7 дней" : period === "month" ? "за 30 дней" : "за всё время";

  // --- STATS & DELTAS CALCULATION ---
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

  // Sleep Metrics
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

  // Feeding Intervals
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

  // --- BAR CHART DATA (Feed Volumes) ---
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

  // --- PIE CHART DATA (Diapers) ---
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
       <View style={{ flex: 1, backgroundColor: '#FAFBFC', paddingTop: Math.max(20, 60) }}>
         <View style={{ paddingHorizontal: 20, paddingBottom: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
           <Skeleton width={140} height={38} borderRadius={12} />
           <Skeleton width={80} height={36} borderRadius={12} />
         </View>
         <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
           <Skeleton width={110} height={20} borderRadius={8} />
         </View>
         <View style={{ marginHorizontal: 20, marginBottom: 20 }}>
           <Skeleton width="100%" height={48} borderRadius={24} />
         </View>
         <View style={{ marginHorizontal: 20, marginBottom: 16 }}>
           <Skeleton width="100%" height={160} borderRadius={24} />
         </View>
         <View style={{ paddingHorizontal: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
           <Skeleton width="48%" height={110} borderRadius={20} />
           <Skeleton width="48%" height={110} borderRadius={20} />
           <Skeleton width="48%" height={110} borderRadius={20} />
           <Skeleton width="48%" height={110} borderRadius={20} />
         </View>
       </View>
     );
  }

  return (
    <ScrollView 
       style={{ flex: 1, backgroundColor: '#FAFBFC' }} 
       contentContainerStyle={{ paddingBottom: 100 }}
       refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366F1']} />}
    >
       <View style={{ paddingHorizontal: 20, paddingTop: Math.max(20, 40), paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 32, color: '#0F172A', letterSpacing: -0.5 }}>Аналитика</Text>
          <TouchableOpacity 
             onPress={handleExportExcel}
             style={{ height: 36, paddingHorizontal: 12, borderRadius: 12, backgroundColor: 'rgba(37, 99, 235, 0.1)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
          >
             <Download size={16} color="#2563EB" style={{ marginRight: 4 }} />
             <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 13, color: '#2563EB' }}>Excel</Text>
          </TouchableOpacity>
       </View>
       <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 15, color: '#6B6B80', paddingHorizontal: 20, paddingBottom: 20 }}>Панель данных</Text>

       {/* Floating Pills for Period */}
       <View style={{ marginHorizontal: 20, backgroundColor: '#E2E8F0', borderRadius: 24, padding: 4, flexDirection: 'row', marginBottom: 20 }}>
          {[
            { id: 'day', label: 'Сегодня' },
            { id: 'week', label: '7 дней' },
            { id: 'month', label: '30 дней' },
            { id: 'all', label: 'Всё время' }
          ].map((p) => {
             const active = period === p.id;
             return (
               <TouchableOpacity 
                  key={p.id} 
                  onPress={() => setPeriod(p.id)}
                  style={{ flex: 1, paddingVertical: 8, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? 'white' : 'transparent', shadowColor: active ? '#000' : 'transparent', shadowOffset: { width: 0, height: 4 }, shadowOpacity: active ? 0.08 : 0, shadowRadius: 12, elevation: active ? 2 : 0 }}
               >
                 <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 13, color: active ? '#0F172A' : '#64748B' }}>{p.label}</Text>
               </TouchableOpacity>
             );
          })}
       </View>

       {/* Date Selector (Only in 'day' mode) */}
       {period === 'day' && (
         <View style={{ marginHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white', borderRadius: 20, padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 1, borderWidth: 1, borderColor: '#F0ECE8', marginBottom: 20 }}>
            <TouchableOpacity onPress={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d); }} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F4F8', borderRadius: 12 }}>
               <ChevronLeft size={20} color="#8A8A9E" />
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
               <CalendarDays size={18} color="#2563EB" />
               <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 15, color: '#1A1A2E', letterSpacing: -0.2 }}>
                  {selectedDate.toLocaleDateString() === new Date().toLocaleDateString() ? 'Сегодня' : selectedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
               </Text>
            </View>
            <TouchableOpacity 
               disabled={selectedDate.toLocaleDateString() === new Date().toLocaleDateString()}
               onPress={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d); }} 
               style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: selectedDate.toLocaleDateString() === new Date().toLocaleDateString() ? 'transparent' : '#F4F4F8', borderRadius: 12 }}
            >
               <ChevronRight size={20} color={selectedDate.toLocaleDateString() === new Date().toLocaleDateString() ? '#D1D1DB' : '#8A8A9E'} />
            </TouchableOpacity>
         </View>
       )}

       <View style={{ paddingHorizontal: 20 }}>
           <DayIndexCard score={score} rows={rows} periodLabel={periodLabel} />

           {/* Bento Stat Cards Grid */}
           <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
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
           </View>

           {/* AI Insight Card */}
           <View style={styles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                 <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center', shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 3 }}>
                       <Brain size={20} color="white" />
                    </View>
                    <View>
                       <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 16, color: '#0F172A' }}>AI-Рекомендации</Text>
                       <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 9, color: '#4DBFAA' }}>Персональный анализ</Text>
                    </View>
                 </View>
                 {!aiLoading && (
                   <TouchableOpacity onPress={fetchAiInsight} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: '#F3E8FF' }}>
                      <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 11, color: '#8B5CF6' }}>Обновить</Text>
                   </TouchableOpacity>
                 )}
              </View>
              
              {aiLoading ? (
                 <View style={{ paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <ActivityIndicator size="small" color="#8B5CF6" />
                    <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 12, color: '#6B6B80' }}>AI анализирует данные...</Text>
                 </View>
              ) : aiRecs.length > 0 ? (
                 <View style={{ gap: 10 }}>
                    {aiRecs.map((rec, i) => (
                       <View key={i} style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12 }}>
                          <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 13, color: '#0F172A', lineHeight: 20 }}>{rec}</Text>
                       </View>
                    ))}
                    <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 9, color: '#6B6B80', textAlign: 'center', marginTop: 4 }}>⚕️ Только в информационных целях. Консультируйтесь с педиатром.</Text>
                 </View>
              ) : (
                 <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                    <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 12, color: '#6B6B80', textAlign: 'center' }}>Нажмите "Обновить" для генерации новых рекомендаций на основе последних данных.</Text>
                 </View>
              )}
           </View>
           
           {/* Charts (BarChart) */}
           <View style={styles.card}>
              <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                 <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    <Milk size={20} color={COLORS.feed} />
                 </View>
                 <View>
                    <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 18, color: '#0F172A' }}>Кормления по часам</Text>
                    <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 12, color: '#6B6B80' }}>Объём по времени суток</Text>
                 </View>
              </View>
              {barData.length === 1 && barData[0].value === 0 ? (
                 <View style={{ height: 150, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: '#8A8A9E', fontFamily: 'Nunito_700Bold' }}>Нет данных</Text></View>
              ) : (
                 <View style={{ marginLeft: -10 }}>
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
                           <View style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', padding: 8, borderRadius: 12, borderColor: '#E2E8F0', borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, transform: [{translateX: -20}, {translateY: -30}] }}>
                             <Text style={{ fontFamily: 'Nunito_800ExtraBold', color: '#6B6B80', fontSize: 10, marginBottom: 4 }}>{item.label}</Text>
                             <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                               <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563EB' }} />
                               <Text style={{ fontFamily: 'Nunito_900Black', color: '#0F172A', fontSize: 14 }}>{item.value}</Text>
                             </View>
                           </View>
                         )
                      }}
                   />
                 </View>
              )}
           </View>

           {intervals.length > 1 && (
             <View style={styles.card}>
                <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                   <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                      <Clock size={20} color={COLORS.diaper} />
                   </View>
                   <View>
                      <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 18, color: '#0F172A' }}>Интервалы между кормлениями</Text>
                      <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 12, color: '#6B6B80' }}>Минут между кормлениями</Text>
                   </View>
                </View>
                {ageMo >= 4 && intervals.length >= 3 && intervals[intervals.length - 1].value > intervals[0].value && (
                  <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 12, color: COLORS.diaper, marginBottom: 16 }}>
                     📈 Интервал растёт — это норма для 4+ мес
                  </Text>
                )}
                
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 6 }}>
                   <View style={{ paddingHorizontal: 8, paddingVertical: 4, backgroundColor: 'rgba(5, 150, 105, 0.1)', borderRadius: 8 }}>
                       <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 11, color: '#059669' }}>Норма 2.5–3.5ч</Text>
                   </View>
                </View>
                
                <View style={{ marginLeft: -10 }}>
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
                </View>
             </View>
           )}

           {/* Sleep blocks timeline */}
           <View style={styles.card}>
             <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
               <Clock size={20} color={COLORS.sleep} />
               <View>
                  <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 18, color: '#1A1A2E' }}>Блоки сна</Text>
                  <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 12, color: '#6B6B80' }}>Метрики и распределение по времени суток</Text>
               </View>
             </View>
             
             {/* Sleep grid blocks */}
             <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
               <View style={[styles.sleepBlock, { backgroundColor: '#F4F7FB' }]}>
                 <Text style={styles.sleepBlockTitle}>Дневной сон</Text>
                 <Text style={[styles.sleepBlockValue, { color: '#4E8FD4' }]}>{Math.floor(daySec / 3600)}ч {Math.floor((daySec % 3600) / 60)}м</Text>
                 <Text style={styles.sleepBlockSub}>с 07:00 до 19:00</Text>
               </View>
               <View style={[styles.sleepBlock, { backgroundColor: '#EDE4F8' }]}>
                 <Text style={styles.sleepBlockTitle}>Ночной сон</Text>
                 <Text style={[styles.sleepBlockValue, { color: '#8B6FD4' }]}>{Math.floor(nightSec / 3600)}ч {Math.floor((nightSec % 3600) / 60)}м</Text>
                 <Text style={styles.sleepBlockSub}>с 19:00 до 07:00</Text>
               </View>
               <View style={[styles.sleepBlock, { backgroundColor: '#D4F3EC' }]}>
                 <Text style={styles.sleepBlockTitle}>Ср. бодрствование</Text>
                 <Text style={[styles.sleepBlockValue, { color: '#2A9B7E' }]}>{avgWakeWin >= 60 ? `${Math.floor(avgWakeWin / 60)}ч ${avgWakeWin % 60}м` : `${avgWakeWin}м`}</Text>
                 <Text style={styles.sleepBlockSub}>между снами</Text>
               </View>
               <View style={[styles.sleepBlock, { backgroundColor: '#F5F0E6' }]}>
                 <Text style={styles.sleepBlockTitle}>Кол-во снов</Text>
                 <Text style={[styles.sleepBlockValue, { color: '#E69600' }]}>{sleeps.length} шт.</Text>
                 <Text style={styles.sleepBlockSub}>включая ночные пробуж.</Text>
               </View>
             </View>

             <View style={{ padding: 16, backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#F0ECE8' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 14, color: '#1A1A2E' }}>График снов</Text>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: '#F5F3FF' }}>
                    <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 12, color: '#8B5CF6' }}>{totalSleepStr}</Text>
                  </View>
                </View>
                
                <View style={{ height: 24, borderRadius: 12, backgroundColor: '#F4F4F8', width: '100%' }}>
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
                </View>
                
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingHorizontal: 4 }}>
                  {["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "23:59"].map(t => (
                    <Text key={t} style={{ fontSize: 9, fontFamily: 'Nunito_800ExtraBold', color: '#6B6B80' }}>{t}</Text>
                  ))}
                </View>
             </View>
           </View>

           <View style={styles.card}>
              <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', marginBottom: 24, justifyContent: 'space-between' }}>
                 <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                       <Baby size={20} color="#059669" />
                    </View>
                    <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 18, color: '#0F172A' }}>Подгузники</Text>
                 </View>
                 {diapers.length > 0 && (
                   <View style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 100, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' }}>
                     <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 12, color: '#1A1A2E' }}>{diapers.length} шт.</Text>
                   </View>
                 )}
              </View>
              {pieData.length === 1 && pieData[0].text === 'Пусто' ? (
                 <View style={{ height: 180, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: '#8A8A9E', fontFamily: 'Nunito_700Bold' }}>Нет данных</Text></View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <PieChart
                       data={pieData}
                       donut
                       innerRadius={45}
                       radius={70}
                    />
                  </View>
                  <View style={{ flex: 1, paddingLeft: 10, gap: 16 }}>
                     {pieData.sort((a,b) => b.value - a.value).map((p: any, i) => (
                        <View key={i}>
                           <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                             <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                               <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: p.color }} />
                               <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 14, color: '#0F172A' }}>{p.text} <Text style={{ color: '#64748B', fontFamily: 'Nunito_700Bold', fontSize: 13 }}>({p.count})</Text></Text>
                             </View>
                             <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 14, color: p.color }}>{p.value}%</Text>
                           </View>
                           <View style={{ height: 6, borderRadius: 3, backgroundColor: '#F0ECE8', width: '100%' }}>
                             <View style={{ height: '100%', borderRadius: 3, backgroundColor: p.color, width: `${p.value}%` }} />
                           </View>
                        </View>
                     ))}
                  </View>
                </View>
              )}
           </View>

           {/* Stat Cards Grid moved to the top */}
       </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white', padding: 20, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 2, marginBottom: 20, borderColor: '#E2E8F0', borderWidth: 1
  },
  statCard: {
    backgroundColor: 'white', padding: 16, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 2, minWidth: 150, flex: 1, /* maxWidth: '48%', */ borderColor: '#E2E8F0', borderWidth: 1
  },
  statIconWrapper: {
    width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8
  },
  sleepBlock: {
    padding: 12, borderRadius: 14, flex: 1, minWidth: 140
  },
  sleepBlockTitle: {
    fontSize: 11, fontFamily: 'Nunito_800ExtraBold', color: '#8A8A9E', marginBottom: 4, textTransform: 'uppercase'
  },
  sleepBlockValue: {
    fontSize: 16, fontFamily: 'Nunito_900Black'
  },
  sleepBlockSub: {
    fontSize: 10, fontFamily: 'Nunito_700Bold', color: '#6B6B80', marginTop: 4
  }
});

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
