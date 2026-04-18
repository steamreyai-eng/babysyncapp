
import React, { useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Dimensions, DeviceEventEmitter, RefreshControl } from 'react-native';
import { 
  Bell, Users, Milk, Moon, Droplets, Footprints, Bot, 
  Baby, ClipboardList, ChevronRight, CheckCircle, Circle, 
  Trash2, Plus, Calendar, Zap 
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore, getAgeLabel } from '../store/authStore';
import { useDataStore } from '../store/dataStore';
import { LinearGradient } from 'expo-linear-gradient';
import withObservables from '@nozbe/with-observables';
import { database } from '../db';
import { Q } from '@nozbe/watermelondb';
import DateTimePickerModal from '../components/DateTimePickerModal';
import { NotificationSettingsModal } from '../components/NotificationSettingsModal';
import { Wrapper } from '../components/ui/Wrapper';
import { Typography } from '../components/ui/Typography';
import { Surface } from '../components/ui/Surface';
import { IconCircle } from '../components/IconCircle';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { COLORS, FONTS, RADIUS } from '../lib/theme';
import { useRoutineEngine } from '../hooks/useRoutineEngine';
import { callAI } from '../lib/ai';
import { calculateWakeWindow, predictNextSleep, formatWakeWindow, type SleepLike } from '../lib/wakeWindowEngine';
import NetInfo from '@react-native-community/netinfo';

const MS_IN_24H = 24 * 3600 * 1000;
const { width } = Dimensions.get('window');

const HomeScreenContent = ({ feedings, sleeps, diapers, walks, tasks }: any) => {
  const { baby, activeParent } = useAuthStore();
  const { transferShift } = useDataStore();
  const navigation = useNavigation<any>();
  
  const engine = useRoutineEngine(baby?.birthdate, baby?.name, sleeps);

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskTime, setNewTaskTime] = useState<Date | null>(null);
  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const [notifModalOpen, setNotifModalOpen] = useState(false);

  const babyName = baby?.name || "Малыш";
  const babyAge = baby?.birthdate ? getAgeLabel(baby.birthdate) : "—";
  const isMom = activeParent === 'mom';

  const lastFeeding = feedings[0];
  const lastSleep = sleeps[0];
  const lastDiaper = diapers[0];
  const lastWalk = walks[0];

  const safeTime = (val: any) => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    if (typeof val === 'string' && /^\d+$/.test(val)) return parseInt(val, 10);
    return new Date(val).getTime();
  };

  const timeSince = (ms: any) => {
    const t = safeTime(ms);
    if (!t) return "—";
    const diff = Math.max(0, Math.floor((Date.now() - t) / 60000));
    if (diff < 60) return `${diff}м назад`;
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return m > 0 ? `${h}ч ${m}м назад` : `${h}ч назад`;
  };

  const getSleepEndMs = (s: any) =>
    s.end_time ? new Date(s.end_time).getTime() : new Date(s.created_at).getTime() + s.duration_seconds * 1000;

  const ageMo = baby?.birthdate ? (Date.now() - new Date(baby.birthdate).getTime()) / (30.44 * 24 * 3600 * 1000) : 4;
  const wakeResult = React.useMemo(
    () => calculateWakeWindow(ageMo, sleeps as SleepLike[]),
    [ageMo, sleeps]
  );
  const wakeWindowMs = wakeResult.wakeWindowMin * 60000;

  const feedingSignal = (() => {
    if (!lastFeeding) return 'neutral';
    const minAgo = (Date.now() - new Date(lastFeeding.created_at).getTime()) / 60000;
    if (minAgo < 150) return 'green';
    if (minAgo < 210) return 'yellow';
    return 'red';
  })();

  const sleepSignal = (() => {
    if (!lastSleep) return 'neutral';
    const endMs = getSleepEndMs(lastSleep);
    const awakeMs = Date.now() - endMs;
    if (awakeMs < wakeWindowMs * 0.75) return 'green';
    if (awakeMs < wakeWindowMs) return 'yellow';
    return 'red';
  })();

  const diaperSignal = (() => {
    if (!lastDiaper) return 'neutral';
    const hAgo = (Date.now() - new Date(lastDiaper.created_at).getTime()) / 3600000;
    if (hAgo < 3) return 'green';
    if (hAgo < 5) return 'yellow';
    return 'red';
  })();

  const getWalkEndMs = (w: any) =>
    safeTime(w.created_at) + (w.duration_seconds || 0) * 1000;

  const walkSignal = (() => {
    const todaysSecs = walks.filter((w:any) => new Date(w.created_at).getDate() === new Date().getDate()).reduce((s:any, w:any) => s + w.duration_seconds, 0);
    if (todaysSecs >= 90 * 60) return 'green';
    if (!lastWalk) return 'neutral';
    const hAgo = (Date.now() - getWalkEndMs(lastWalk)) / 3600000;
    if (hAgo < 4) return 'green';
    if (hAgo < 8) return 'yellow';
    return 'red';
  })();

  const SIGNAL_COLORS = {
    green: { bg: "#F0FBF8", dot: "#3DBFAA", text: "#2A9E8A" },
    yellow: { bg: "#FFF9EC", dot: "#E69600", text: "#C87800" },
    red: { bg: "#FFF0F0", dot: "#D94F4F", text: "#B83E3E" },
    neutral: { bg: "white", dot: "transparent", text: "#8A8A9E" },
  };

  const [aiTip, setAiTip] = React.useState<string | null>(null);
  const [aiTipIsReal, setAiTipIsReal] = React.useState(false);
  const aiCacheRef = React.useRef<{ text: string; ts: number } | null>(null);
  const AI_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

  // Generate algorithmic tip as fast fallback
  const getAlgorithmicTip = React.useCallback(() => {
    const bName = baby?.name || "Малыш";
    const nowMs = Date.now();
    if (lastSleep) {
      const lastSleepEndMs = getSleepEndMs(lastSleep);
      if (nowMs - lastSleepEndMs > wakeWindowMs) {
        const wakeLabel = formatWakeWindow(wakeResult);
        const wh = Math.floor(wakeWindowMs / 3600000), wm = Math.round((wakeWindowMs % 3600000) / 60000);
        return `Окно бодрствования (${wh > 0 ? `${wh}ч ` : ""}${wm}м) подошло к концу. ${bName} может переутомиться — самое время укладывать спать.`;
      }
    }
    if (lastFeeding) {
      const fedMsAgo = nowMs - new Date(lastFeeding.created_at).getTime();
      let avgIntervalMs = 0;
      if (feedings.length >= 3) {
        const intervals = feedings.slice(0, 5).map((f:any, i:any, arr:any) =>
          i + 1 < arr.length ? new Date(arr[i].created_at).getTime() - new Date(arr[i + 1].created_at).getTime() : null
        ).filter(Boolean) as number[];
        avgIntervalMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      }
      const target = avgIntervalMs > 0 ? avgIntervalMs : 3 * 3600000;
      if (fedMsAgo > target) return `С прошлого кормления прошло больше обычного. Возможно, ${bName} уже проголодался.`;
      if (fedMsAgo / 3600000 > 3.5) return `Прошло уже ${Math.floor(fedMsAgo / 3600000)}ч после еды. Пора предложить кормление.`;
    }
    if (lastDiaper) {
      const dh = (nowMs - new Date(lastDiaper.created_at).getTime()) / 3600000;
      if (dh > 4 && lastDiaper.type === "wet") return `Подгузник не меняли уже ${Math.floor(dh)} часа. Стоит проверить.`;
      if (dh > 6) return `Давно не было смены подгузника. Проверьте, комфортно ли малышу.`;
    }
    if (feedings.length === 0 && sleeps.length === 0) return "Начните вести записи, чтобы я мог анализировать режим малыша.";
    const dCnt = diapers.filter((d:any) => new Date(d.created_at).getDate() === new Date().getDate()).length;
    if (dCnt < 4 && new Date().getHours() > 18) return `Сегодня было маловато смен подгузника (${dCnt} шт). Норма — 4–8 в день.`;
    return `Режим в норме. ${bName} отлично справляется!`;
  }, [feedings, sleeps, diapers, wakeWindowMs, baby?.name, lastSleep, lastFeeding, lastDiaper]);

  // Show fast algorithmic tip first, then fetch real AI insight
  React.useEffect(() => {
    const algoTip = getAlgorithmicTip();
    setAiTip(algoTip);
    setAiTipIsReal(false);

    if (aiCacheRef.current && Date.now() - aiCacheRef.current.ts < AI_CACHE_TTL) {
      setAiTip(aiCacheRef.current.text);
      setAiTipIsReal(true);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const netState = await NetInfo.fetch();
        if (!netState.isConnected || cancelled) return;

        const bName = baby?.name || "Малыш";
        const ageMo = baby?.birthdate
          ? (Date.now() - new Date(baby.birthdate).getTime()) / (30.44 * 24 * 3600 * 1000)
          : null;

        const contextSummary = {
          baby: { age_months: ageMo ? Math.round(ageMo) : null, gender: baby?.gender },
          feedings_today: feedings.filter((f:any) => new Date(f.created_at).getDate() === new Date().getDate()).length,
          sleeps_today: sleeps.filter((s:any) => new Date(s.created_at).getDate() === new Date().getDate()).length,
          total_sleep_today_min: Math.round(sleeps.filter((s:any) => new Date(s.created_at).getDate() === new Date().getDate()).reduce((a:number, s:any) => a + s.duration_seconds, 0) / 60),
          diapers_today: diapers.filter((d:any) => new Date(d.created_at).getDate() === new Date().getDate()).length,
          last_feeding_min_ago: lastFeeding ? Math.round((Date.now() - new Date(lastFeeding.created_at).getTime()) / 60000) : null,
          last_sleep_ended_min_ago: lastSleep ? Math.round((Date.now() - getSleepEndMs(lastSleep)) / 60000) : null,
          wake_window_min: wakeResult.wakeWindowMin,
          wake_window_personalized: wakeResult.isPersonalized,
          wake_window_confidence: wakeResult.confidence,
        };

        const prompt = `Проанализируй текущий статус малыша и дай ОДИН краткий персонализированный инсайт (1-2 предложения, максимум 100 слов). Контекст: ${JSON.stringify(contextSummary)}. Ответ дай сразу текстом без кавычек и форматирования.`;

        const result = await callAI(prompt, contextSummary);
        if (result && !cancelled) {
          const cleanResult = result.replace(/^["|']+|["|']+$/g, '').trim();
          setAiTip(cleanResult);
          setAiTipIsReal(true);
          aiCacheRef.current = { text: cleanResult, ts: Date.now() };
        }
      } catch (e) {
        if (__DEV__) console.warn('AI insight fetch failed:', e);
      }
    })();

    return () => { cancelled = true; };
  }, [feedings, sleeps, diapers, wakeWindowMs, baby?.name]);
  
  const [bothActive24h, setBothActive24h] = React.useState(false);
  React.useEffect(() => {
     const ms24h = Date.now() - MS_IN_24H;
     const hasMom = feedings.some((f:any) => f.recorded_by === 'mom' && new Date(f.created_at).getTime() > ms24h) ||
                    sleeps.some((s:any) => s.recorded_by === 'mom' && new Date(s.created_at).getTime() > ms24h) ||
                    diapers.some((d:any) => d.recorded_by === 'mom' && new Date(d.created_at).getTime() > ms24h);
     const hasDad = feedings.some((f:any) => f.recorded_by === 'dad' && new Date(f.created_at).getTime() > ms24h) ||
                    sleeps.some((s:any) => s.recorded_by === 'dad' && new Date(s.created_at).getTime() > ms24h) ||
                    diapers.some((d:any) => d.recorded_by === 'dad' && new Date(d.created_at).getTime() > ms24h);
     setBothActive24h(hasMom && hasDad);
  }, [feedings, sleeps, diapers]);
  
  const quickCards = [
    {
      id: "Feeding",
      Icon: Milk,
      iconColor: COLORS.feeding.icon,
      label: "Кормление",
      time: lastFeeding ? timeSince(lastFeeding.created_at) : "—",
      sub: lastFeeding ? (lastFeeding.type === 'breast' ? 'Грудь' : lastFeeding.type === 'formula' ? `Смесь (${lastFeeding.formula_volume_ml || ''}мл)` : 'Прикорм') : "Нет данных",
      signalColor: SIGNAL_COLORS[feedingSignal as keyof typeof SIGNAL_COLORS],
      route: 'Feeding'
    },
    {
      id: "Sleep",
      Icon: Moon,
      iconColor: COLORS.sleep.icon,
      label: "Сон",
      time: lastSleep ? timeSince(getSleepEndMs(lastSleep)) : "—",
      sub: lastSleep ? `${Math.floor(lastSleep.duration_seconds / 3600)}ч ${Math.floor((lastSleep.duration_seconds % 3600) / 60)}м` : "Нет данных",
      signalColor: SIGNAL_COLORS[sleepSignal as keyof typeof SIGNAL_COLORS],
      route: 'Sleep'
    },
    {
      id: "Diaper",
      Icon: Droplets,
      iconColor: COLORS.diaper.icon,
      label: "Подгузник",
      time: lastDiaper ? timeSince(lastDiaper.created_at) : "—",
      sub: lastDiaper ? (lastDiaper.type === "wet" ? "Мокрый" : lastDiaper.type === "dirty" ? "Грязный" : "Оба") : "Нет данных",
      signalColor: SIGNAL_COLORS[diaperSignal as keyof typeof SIGNAL_COLORS],
      route: 'Diaper'
    },
    {
      id: "Walk",
      Icon: Footprints,
      iconColor: COLORS.walk.icon,
      label: "Прогулка",
      time: lastWalk ? timeSince(getWalkEndMs(lastWalk)) : "—",
      sub: lastWalk ? `${Math.floor(lastWalk.duration_seconds / 60)}м` : "Нет данных",
      signalColor: SIGNAL_COLORS[walkSignal as keyof typeof SIGNAL_COLORS],
      route: 'Walk'
    },
  ];

  const allEvents = [
    ...feedings.map((f:any) => ({
      id: `f_${f.id}`,
      timeStr: new Date(f.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      title: f.type === 'breast' ? 'Грудь' : f.type === 'formula' ? `Смесь (${f.formula_volume_ml || ''}мл)` : 'Прикорм',
      Icon: Milk, iconColor: COLORS.feeding.icon, bg: COLORS.feeding.bg,
      who: bothActive24h ? (f.recorded_by === "dad" ? "Папа" : "Мама") : null,
      whoBg: f.recorded_by === "dad" ? '#8B6FD4' : '#4E8FD4',
      ts: f.created_at,
    })),
    ...sleeps.map((s:any) => ({
      id: `s_${s.id}`,
      timeStr: new Date(s.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      title: `Сон (${Math.floor(s.duration_seconds / 3600)}ч ${Math.floor((s.duration_seconds % 3600) / 60)}м)`,
      Icon: Moon, iconColor: COLORS.sleep.icon, bg: COLORS.sleep.bg,
      who: bothActive24h ? (s.recorded_by === "dad" ? "Папа" : "Мама") : null,
      whoBg: s.recorded_by === "dad" ? '#8B6FD4' : '#4E8FD4',
      ts: s.created_at,
    })),
    ...diapers.map((d:any) => ({
      id: `d_${d.id}`,
      timeStr: new Date(d.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      title: `Подгузник (${d.type === "wet" ? "мокрый" : d.type === "dirty" ? "грязный" : "оба"})`,
      Icon: Droplets, iconColor: COLORS.diaper.icon, bg: COLORS.diaper.bg,
      who: bothActive24h ? (d.recorded_by === "dad" ? "Папа" : "Мама") : null,
      whoBg: d.recorded_by === "dad" ? '#8B6FD4' : '#4E8FD4',
      ts: d.created_at,
    })),
    ...walks.map((w:any) => ({
      id: `w_${w.id}`,
      timeStr: new Date(w.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      title: `Прогулка (${Math.floor(w.duration_seconds / 60)}м)`,
      Icon: Footprints, iconColor: COLORS.walk.icon, bg: COLORS.walk.bg,
      who: bothActive24h ? (w.recorded_by === "dad" ? "Папа" : "Мама") : null,
      whoBg: w.recorded_by === "dad" ? '#8B6FD4' : '#4E8FD4',
      ts: w.created_at,
    })),
  ].sort((a:any, b:any) => b.ts - a.ts).slice(0, 5);

  const addTask = async () => {
    if (!newTaskTitle.trim()) return;
    try {
      await database.write(async () => {
        await database.get('tasks').create((task: any) => {
          task.title = newTaskTitle.trim();
          task.is_completed = false;
          task.recorded_by = activeParent;
          if (newTaskTime) {
            task.due_time = String(newTaskTime.getTime());
          }
        });
      });
      setNewTaskTitle('');
      setNewTaskTime(null);
    } catch (e) {
      if (__DEV__) console.warn("Error adding task", e);
    }
  };

  const toggleTask = async (task: any) => {
    try {
      await database.write(async () => {
        await task.update((t: any) => {
          t.is_completed = !t.is_completed;
        });
      });
    } catch (e) {
      if (__DEV__) console.warn("Error toggling task", e);
    }
  };

  const deleteTask = async (task: any) => {
    try {
      await database.write(async () => {
        await task.markAsDeleted();
      });
    } catch (e) {
      if (__DEV__) console.warn("Error deleting task", e);
    }
  };

  const activeTasksCount = tasks.filter((t:any) => !t.is_completed).length;

  const scrollRef = useRef<ScrollView>(null);
  const [activeDot, setActiveDot] = useState(0);

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

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const itemWidth = 110 + 12;
    setActiveDot(Math.min(Math.max(Math.round(offsetX / itemWidth), 0), quickCards.length - 1));
  };

  return (
    <Wrapper flex={1} bg="background">
      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366F1']} />}
      >
        {/* Header */}
        <Wrapper px={16} pt={40} pb={16} dir="row" align="center" justify="space-between">
          <Wrapper dir="row" align="center" gap={12}>
            <View>
               <LinearGradient
                 colors={['#4E8FD4', '#3DBFAA']}
                 start={{ x: 0, y: 0 }}
                 end={{ x: 1, y: 1 }}
                 style={{ width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center', shadowColor: '#4E8FD4', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.32, shadowRadius: 20, elevation: 6 }}
               >
                 <Baby size={30} color="white" />
               </LinearGradient>
               <View style={{ position: 'absolute', bottom: -2, right: -2, width: 16, height: 16, borderRadius: 8, backgroundColor: '#3DBFAA', borderColor: '#F6F2EB', borderWidth: 2 }} />
            </View>
            <Wrapper>
              <Typography variant="h2">{babyName}</Typography>
              <Wrapper mt={1}>
                <Typography variant="caption" color="textMuted">{babyAge}</Typography>
              </Wrapper>
            </Wrapper>
          </Wrapper>
          <Surface 
             onPress={() => setNotifModalOpen(true)}
             variant="elevated" 
             width={44} 
             height={44} 
             radius="xl"
             align="center" 
             justify="center"
          >
            <Bell size={18} color="#8A8A9E" />
            <View style={{ position: 'absolute', top: 8, right: 8, width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#D94F4F', borderColor: 'white', borderWidth: 1.5 }} />
          </Surface>
        </Wrapper>

        {/* Shift Panel */}
        <Wrapper mx={16} mb={16}>
          <TouchableOpacity 
            onPress={transferShift}
            activeOpacity={0.9}
            style={{ borderRadius: 20, padding: 16, shadowColor: '#4E8FD4', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.38, shadowRadius: 28, elevation: 8, overflow: 'hidden' }}
          >
            <LinearGradient
              colors={['#4E8FD4', '#3A78C0']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 20 }}
            />
            <Wrapper dir="row" align="center" gap={6} mb={6}>
              <Users size={12} color="rgba(255,255,255,0.75)" />
              <Typography variant="caption" color="rgba(255,255,255,0.8)" uppercase>ТЕКУЩАЯ СМЕНА</Typography>
            </Wrapper>
            <Wrapper dir="row" align="center" justify="space-between">
              <Wrapper>
                <Typography variant="h3" color="white">{isMom ? "Мама активна" : "Папа активен"}</Typography>
                <Wrapper mt={2}>
                  <Typography variant="caption" color="rgba(255,255,255,0.72)">Нажмите «Передать» для смены</Typography>
                </Wrapper>
              </Wrapper>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.4)', borderWidth: 1, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 }}>
                <Typography variant="caption" color="white" weight="extraBold">Передать →</Typography>
              </View>
            </Wrapper>
          </TouchableOpacity>
        </Wrapper>

        {/* Quick Cards Row */}
        <Wrapper mb={16}>
          <ScrollView 
            ref={scrollRef}
            horizontal 
            showsHorizontalScrollIndicator={false} 
            snapToInterval={110 + 12} 
            decelerationRate="fast" 
            onScroll={handleScroll}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 4 }}
          >
             {quickCards.map((card) => (
                <Surface 
                   key={card.id}
                   onPress={() => navigation.navigate(card.route)}
                   variant="elevated"
                   bg={card.signalColor.bg}
                   width={110}
                   p={14}
                   radius="lg"
                >
                   {card.signalColor.dot !== 'transparent' && (
                      <View style={{ position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: card.signalColor.dot, shadowColor: card.signalColor.dot, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 6, elevation: 2 }} />
                   )}
                   <Surface variant="elevated" width={36} height={36} radius="sm" align="center" justify="center" mb={6}>
                       <card.Icon size={19} color={card.iconColor} />
                   </Surface>
                   <Wrapper mb={2}>
                     <Typography variant="caption" weight="extraBold">{card.label}</Typography>
                   </Wrapper>
                   <Wrapper mb={2}>
                     <Typography variant="tiny" color={card.signalColor.text}>{card.time}</Typography>
                   </Wrapper>
                   <Typography variant="tiny" color="textMuted" numberOfLines={1}>{card.sub}</Typography>
                </Surface>
             ))}
          </ScrollView>
          <Wrapper dir="row" justify="center" gap={6} mt={8}>
            {quickCards.map((_, i) => (
              <View key={i} style={{ width: activeDot === i ? 16 : 5, height: 5, borderRadius: 2.5, backgroundColor: activeDot === i ? '#2563EB' : '#D1D5DB' }} />
            ))}
          </Wrapper>
        </Wrapper>

        {/* Leap Card */}
        {engine.leapInfo.status !== 'none' && engine.leapInfo.leap && (
          <Wrapper mx={16} mb={16}>
            <Surface 
              onPress={() => navigation.navigate('Routine')}
              bg={engine.leapInfo.status === 'during' ? '#F59E0B' : engine.leapInfo.status === 'before' ? '#8B5CF6' : '#4DBFAA'}
              radius="lg"
              p={16}
              dir="row"
              align="center"
            >
              <IconCircle size="lg" bg="rgba(255,255,255,0.2)">
                {engine.leapInfo.status === 'after' ? <CheckCircle size={22} color="#FFFFFF" /> : <Zap size={22} color="#FFFFFF" />}
              </IconCircle>
              <Wrapper flex={1} ml={16}>
                <Typography variant="h4" color="white">Скачок {engine.leapInfo.leapNumber}: «{engine.leapInfo.leap.nameRu}»</Typography>
                <Wrapper mt={2}>
                  <Typography variant="caption" color="rgba(255,255,255,0.8)">
                    {engine.leapInfo.status === 'during' ? `Мягкий режим · ${engine.leapInfo.progressPct === 0 ? '< 1' : engine.leapInfo.progressPct}% пройдено` :
                     engine.leapInfo.status === 'before' ? `Начнётся через ~${engine.leapInfo.daysUntilStart} дн.` : 
                     'Скачок завершён ✓'}
                  </Typography>
                </Wrapper>
              </Wrapper>
              <ChevronRight size={20} color="#FFFFFF" />
            </Surface>
          </Wrapper>
        )}

        {/* AI Insight */}
        <Wrapper mx={16} mb={16}>
          <Surface 
            onPress={() => DeviceEventEmitter.emit('openAIBubble')}
            variant="elevated"
            bg="#F5F7FF"
            radius="lg"
            p={16}
            overflow="hidden"
          >
             {/* Decorative blur */}
             <View style={{ position: 'absolute', top: -48, right: -48, width: 128, height: 128, borderRadius: 64, backgroundColor: 'rgba(99, 102, 241, 0.15)', transform: [{ scale: 2 }] }} />
             
             <Wrapper dir="row" align="center" gap={8} mb={8} zIndex={10}>
                 <IconCircle size="xs" bg="rgba(99, 102, 241, 0.15)">
                   <Bot size={15} color="#4F46E5" />
                 </IconCircle>
                 <Typography variant="caption" color="#4F46E5" weight="extraBold" uppercase>{aiTipIsReal ? 'AI-ИНСАЙТ ДНЯ' : 'СМАРТ-ПОДСКАЗКА'}</Typography>
             </Wrapper>
             <View style={{ zIndex: 10 }}>
               <Typography variant="body" color="#1E1B4B">{aiTip || "Анализирую данные..."}</Typography>
             </View>
             
             <Wrapper mt={12} align="flex-start">
               <TouchableOpacity style={{ borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#4F46E5', flexDirection: 'row', alignItems: 'center', gap: 4, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 }}>
                 <Typography variant="caption" color="white" weight="extraBold">Спросить AI</Typography>
                 <ChevronRight size={14} color="#FFFFFF" />
               </TouchableOpacity>
             </Wrapper>
          </Surface>
        </Wrapper>

        {/* Task Checklist */}
        <Wrapper mx={16} mb={16}>
          <Surface radius="xl" p={16} bg="#EEF2FF" variant="outlined">
            <Wrapper dir="row" justify="space-between" align="center" mb={16}>
              <Wrapper dir="row" align="center" gap={8}>
                <ClipboardList size={18} color="#6366F1" />
                <Typography variant="h3" color="#6366F1">Задачи на смену</Typography>
              </Wrapper>
              {activeTasksCount > 0 && (
                <StatusBadge label={`${activeTasksCount} ост.`} tone="primary" />
              )}
            </Wrapper>

            <View style={{ marginBottom: 12, maxHeight: 200 }}>
              {(!tasks || tasks.length === 0) ? (
                <Wrapper py={8}><Typography variant="caption" color="textMuted" align="center">Нет активных задач</Typography></Wrapper>
              ) : (
                tasks.map((t:any) => (
                  <Surface key={t.id} dir="row" align="center" justify="space-between" p={10} radius="sm" variant="outlined" mb={8}>
                    <TouchableOpacity onPress={() => toggleTask(t)} style={{ flexDirection: 'row', alignItems: 'center', flex: 1, opacity: t.is_completed ? 0.6 : 1 }}>
                      <Wrapper mr={12}>
                        {t.is_completed ? <CheckCircle size={20} color="#4DBFAA" /> : <Circle size={20} color="#E0DDD8" />}
                      </Wrapper>
                      <Wrapper flex={1}>
                        <Typography
                          variant="caption"
                          weight={t.is_completed ? 'bold' : 'extraBold'}
                          color={t.is_completed ? '#A0A0B0' : 'textPrimary'}
                          style={{ textDecorationLine: t.is_completed ? 'line-through' : 'none' }}
                        >
                          {t.title}
                        </Typography>
                        <Wrapper mt={2}>
                          <Typography variant="tiny" color="#AAA">
                            {t.due_time ? `До: ${new Date(safeTime(t.due_time)).toLocaleString("ru-RU", { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} • ` : ""}Добавил(а): {t.recorded_by === "mom" ? "Мама" : "Папа"}
                          </Typography>
                        </Wrapper>
                      </Wrapper>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteTask(t)} style={{ padding: 6, borderRadius: 8, backgroundColor: '#FFE4E4', opacity: t.is_completed ? 1 : 0.2 }}>
                      <Trash2 size={14} color="#D94F4F" />
                    </TouchableOpacity>
                  </Surface>
                ))
              )}
            </View>

            <Wrapper dir="row" gap={8}>
              <TextInput 
                placeholder="Напр. дать витамин Д" 
                placeholderTextColor="#8A8A9E"
                style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontFamily: FONTS.bold, fontSize: 13, color: COLORS.foreground }}
                value={newTaskTitle}
                onChangeText={setNewTaskTitle}
                onSubmitEditing={addTask}
              />
              <TouchableOpacity 
                onPress={() => setShowTaskPicker(true)}
                style={{ height: 40, paddingHorizontal: newTaskTime ? 12 : 0, width: newTaskTime ? 'auto' : 40, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E0DDD8' }}
              >
                {newTaskTime ? (
                  <Typography variant="caption" weight="extraBold" color="#6366F1">
                    {newTaskTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                ) : (
                  <Calendar size={18} color="#6366F1" />
                )}
              </TouchableOpacity>
              <Surface onPress={addTask} tone="primary" variant="elevated" width={40} height={40} align="center" justify="center" radius="sm">
                <Plus size={18} color="#FFFFFF" />
              </Surface>
            </Wrapper>
          </Surface>
        </Wrapper>

        {/* Recent Events */}
        <Wrapper mx={16} mb={30}>
          <Surface radius="xl" p={16} variant="elevated">
             <Wrapper mb={12}>
               <Typography variant="h3">Последние события</Typography>
             </Wrapper>
             {allEvents.length === 0 ? (
                <EmptyState title="Нет записей" subtitle="Используйте кнопку + чтобы добавить." />
             ) : (
                <Wrapper gap={12}>
                   {allEvents.map((ev) => (
                      <Wrapper key={ev.id} dir="row" align="center" gap={12}>
                          <IconCircle size="sm" bg={ev.bg}>
                              <ev.Icon size={18} color={ev.iconColor} />
                          </IconCircle>
                          <Wrapper flex={1} dir="row" align="center" gap={6}>
                              <Typography variant="caption" weight="extraBold" numberOfLines={1}>{ev.title}</Typography>
                              {ev.who && (
                                 <StatusBadge label={ev.who} tone={ev.who === 'Папа' ? 'purple' : 'primary'} />
                              )}
                          </Wrapper>
                          <Typography variant="caption" color="textMuted">{ev.timeStr}</Typography>
                      </Wrapper>
                   ))}
                </Wrapper>
             )}
          </Surface>
        </Wrapper>
      </ScrollView>

      {/* Task Time Picker */}
      <DateTimePickerModal
        visible={showTaskPicker}
        value={newTaskTime || new Date()}
        mode="time"
        is24Hour={true}
        onChange={(selectedDate) => { if (selectedDate) setNewTaskTime(selectedDate); }}
        onClose={() => setShowTaskPicker(false)}
      />
      <NotificationSettingsModal isOpen={notifModalOpen} onClose={() => setNotifModalOpen(false)} />
    </Wrapper>
  );
};

const enhance = withObservables([], () => ({
  feedings: database.collections.get('feedings').query(Q.sortBy('created_at', Q.desc)).observe(),
  sleeps: database.collections.get('sleeps').query(Q.sortBy('created_at', Q.desc)).observe(),
  diapers: database.collections.get('diapers').query(Q.sortBy('created_at', Q.desc)).observe(),
  walks: database.collections.get('walks').query(Q.sortBy('created_at', Q.desc)).observe(),
  tasks: database.collections.get('tasks').query(Q.sortBy('created_at', Q.asc)).observe(),
}));

const EnhancedHomeScreenContent = enhance(HomeScreenContent);

export default function HomeScreen() {
  return <EnhancedHomeScreenContent />;
}
