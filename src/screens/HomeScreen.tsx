
import React, { useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Dimensions, DeviceEventEmitter } from 'react-native';
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
// FAB is rendered globally in App.tsx — no need to import here
import { COLORS, FONTS } from '../lib/theme';
import { useRoutineEngine } from '../hooks/useRoutineEngine';

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
  const wakeWindowMs = (() => {
    if (ageMo < 1) return 60 * 60000;
    if (ageMo < 3) return 90 * 60000;
    if (ageMo < 6) return 120 * 60000;
    if (ageMo < 9) return 150 * 60000;
    if (ageMo < 12) return 180 * 60000;
    return 240 * 60000;
  })();

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
  React.useEffect(() => {
    const bName = baby?.name || "Малыш";
    let tip = "";
    const nowMs = Date.now();
    if (lastSleep) {
      const lastSleepEndMs = getSleepEndMs(lastSleep);
      if (nowMs - lastSleepEndMs > wakeWindowMs) {
        const wh = Math.floor(wakeWindowMs / 3600000), wm = Math.round((wakeWindowMs % 3600000) / 60000);
        tip = `Окно бодрствования (${wh > 0 ? `${wh}ч ` : ""}${wm}м) подошло к концу. ${bName} может переутомиться — самое время укладывать спать.`;
      }
    }
    if (!tip && lastFeeding) {
      const fedMsAgo = nowMs - new Date(lastFeeding.created_at).getTime();
      let avgIntervalMs = 0;
      if (feedings.length >= 3) {
        const intervals = feedings.slice(0, 5).map((f:any, i:any, arr:any) =>
          i + 1 < arr.length ? new Date(arr[i].created_at).getTime() - new Date(arr[i + 1].created_at).getTime() : null
        ).filter(Boolean) as number[];
        avgIntervalMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      }
      const target = avgIntervalMs > 0 ? avgIntervalMs : 3 * 3600000;
      if (fedMsAgo > target) tip = `С прошлого кормления прошло больше обычного. Возможно, ${bName} уже проголодался.`;
      else if (fedMsAgo / 3600000 > 3.5) tip = `Прошло уже ${Math.floor(fedMsAgo / 3600000)}ч после еды. Пора предложить кормление.`;
    }
    if (!tip && lastDiaper) {
      const dh = (nowMs - new Date(lastDiaper.created_at).getTime()) / 3600000;
      if (dh > 4 && lastDiaper.type === "wet") tip = `Подгузник не меняли уже ${Math.floor(dh)} часа. Стоит проверить.`;
      else if (dh > 6) tip = `Давно не было смены подгузника. Проверьте, комфортно ли малышу.`;
    }
    if (!tip) {
      if (feedings.length === 0 && sleeps.length === 0) tip = "Начните вести записи, чтобы я мог анализировать режим малыша.";
      else {
        const dCnt = diapers.filter((d:any) => new Date(d.created_at).getDate() === new Date().getDate()).length;
        if (dCnt < 4 && new Date().getHours() > 18) tip = `Сегодня было маловато смен подгузника (${dCnt} шт). Норма — 4–8 в день.`;
        else tip = `Режим в норме. ${bName} отлично справляется!`;
      }
    }
    setAiTip(tip);
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
      console.warn("Error adding task", e);
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
      console.warn("Error toggling task", e);
    }
  };

  const deleteTask = async (task: any) => {
    try {
      await database.write(async () => {
        await task.markAsDeleted();
      });
    } catch (e) {
      console.warn("Error deleting task", e);
    }
  };

  const activeTasksCount = tasks.filter((t:any) => !t.is_completed).length;

  const scrollRef = useRef<ScrollView>(null);
  const [activeDot, setActiveDot] = useState(0);

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const itemWidth = 110 + 12;
    setActiveDot(Math.min(Math.max(Math.round(offsetX / itemWidth), 0), quickCards.length - 1));
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header */}
        <View style={{ paddingHorizontal: 16, paddingTop: Math.max(16, 40), paddingBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View>
               <LinearGradient
                 colors={['#4E8FD4', '#3DBFAA']}
                 start={{ x: 0, y: 0 }}
                 end={{ x: 1, y: 1 }}
                 style={{ width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center', shadowColor: '#4E8FD4', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.32, shadowRadius: 20, elevation: 6 }}
               >
                 <Baby size={30} color="white" />
               </LinearGradient>
               {/* Pulsing dot */}
               <View style={{ position: 'absolute', bottom: -2, right: -2, width: 16, height: 16, borderRadius: 8, backgroundColor: '#3DBFAA', borderColor: '#F6F2EB', borderWidth: 2 }} />
            </View>
            <View>
              <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 21, color: '#1A1A2E', letterSpacing: -0.3 }}>{babyName}</Text>
              <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 13, color: '#8A8A9E', marginTop: 1 }}>{babyAge}</Text>
            </View>
          </View>
          <TouchableOpacity 
             style={{ width: 44, height: 44, backgroundColor: 'white', borderRadius: 22, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 4 }}
          >
            <Bell size={18} color="#8A8A9E" />
            <View style={{ position: 'absolute', top: 8, right: 8, width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#D94F4F', borderColor: 'white', borderWidth: 1.5 }} />
          </TouchableOpacity>
        </View>

        {/* Shift Panel — Web design replica */}
        <TouchableOpacity 
          onPress={transferShift}
          activeOpacity={0.9}
          style={{ marginHorizontal: 16, marginBottom: 16, borderRadius: 20, padding: 16, shadowColor: '#4E8FD4', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.38, shadowRadius: 28, elevation: 8, overflow: 'hidden' }}
        >
          <LinearGradient
            colors={['#4E8FD4', '#3A78C0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 20 }}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Users size={12} color="rgba(255,255,255,0.75)" />
            <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 11, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase' }}>ТЕКУЩАЯ СМЕНА</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 17, color: '#FFFFFF' }}>{isMom ? "Мама активна" : "Папа активен"}</Text>
              <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 12, color: 'rgba(255,255,255,0.72)', marginTop: 2 }}>Нажмите «Передать» для смены</Text>
            </View>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.4)', borderWidth: 1, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 }}>
              <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 12, color: '#FFFFFF' }}>Передать →</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Quick Cards Row (Web styling with signal backgrounds) */}
        <View style={{ marginBottom: 16 }}>
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
                <TouchableOpacity 
                   key={card.id}
                   onPress={() => navigation.navigate(card.route)}
                   style={{ width: 110, backgroundColor: card.signalColor.bg, padding: 14, borderRadius: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}
                >
                   {card.signalColor.dot !== 'transparent' && (
                      <View style={{ position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: card.signalColor.dot, shadowColor: card.signalColor.dot, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 6, elevation: 2 }} />
                   )}
                   <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginBottom: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 }}>
                       <card.Icon size={19} color={card.iconColor} />
                   </View>
                   <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 12, color: '#1A1A2E', marginBottom: 2 }}>{card.label}</Text>
                   <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 11, color: card.signalColor.text, marginBottom: 2 }}>{card.time}</Text>
                   <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 11, color: '#8A8A9E' }} numberOfLines={1}>{card.sub}</Text>
                </TouchableOpacity>
             ))}
          </ScrollView>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 8 }}>
            {quickCards.map((_, i) => (
              <View key={i} style={{ width: activeDot === i ? 16 : 5, height: 5, borderRadius: 2.5, backgroundColor: activeDot === i ? '#2563EB' : '#D1D5DB' }} />
            ))}
          </View>
        </View>

        {/* Leap / Скачок Card */}
        {engine.leapInfo.status !== 'none' && engine.leapInfo.leap && (
          <TouchableOpacity 
            onPress={() => navigation.navigate('Routine')}
            activeOpacity={0.8}
            style={{ 
              marginHorizontal: 16, marginBottom: 16, borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center',
              backgroundColor: engine.leapInfo.status === 'during' ? '#F59E0B' : engine.leapInfo.status === 'before' ? '#8B5CF6' : '#4DBFAA'
            }}
          >
            <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 16, backgroundColor: 'rgba(255,255,255,0.2)' }}>
              {engine.leapInfo.status === 'after' ? <CheckCircle size={22} color="#FFFFFF" /> : <Zap size={22} color="#FFFFFF" />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 16, color: '#FFFFFF' }}>Скачок {engine.leapInfo.leapNumber}: «{engine.leapInfo.leap.nameRu}»</Text>
              <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>
                {engine.leapInfo.status === 'during' ? `Мягкий режим · ${engine.leapInfo.progressPct === 0 ? '< 1' : engine.leapInfo.progressPct}% пройдено` :
                 engine.leapInfo.status === 'before' ? `Начнётся через ~${engine.leapInfo.daysUntilStart} дн.` : 
                 'Скачок завершён ✓'}
              </Text>
            </View>
            <ChevronRight size={20} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {/* AI Insight */}
        <TouchableOpacity 
          onPress={() => DeviceEventEmitter.emit('openAIBubble')}
          activeOpacity={0.9}
          style={{ marginHorizontal: 16, marginBottom: 16, backgroundColor: '#F5F7FF', borderRadius: 20, padding: 16, borderColor: '#E0E7FF', borderWidth: 1, shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 3, overflow: 'hidden' }}
        >
           {/* Decorative blur */}
           <View style={{ position: 'absolute', top: -48, right: -48, width: 128, height: 128, borderRadius: 64, backgroundColor: 'rgba(99, 102, 241, 0.15)', transform: [{ scale: 2 }] }} />
           
           <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, zIndex: 10 }}>
               <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(99, 102, 241, 0.15)' }}>
                 <Bot size={15} color="#4F46E5" />
               </View>
               <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 11, color: '#4F46E5', textTransform: 'uppercase' }}>AI-ИНСАЙТ ДНЯ</Text>
           </View>
           <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 13, color: '#1E1B4B', lineHeight: 20, zIndex: 10 }}>{aiTip || "Анализирую данные..."}</Text>
           <View 
             style={{ marginTop: 12, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#4F46E5', alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 }}
           >
             <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 12, color: '#FFFFFF' }}>Спросить AI</Text>
             <ChevronRight size={14} color="#FFFFFF" />
           </View>
        </TouchableOpacity>

        {/* Task Checklist (Задачи на смену) */}
        <View style={{ marginHorizontal: 16, marginBottom: 16, borderRadius: 24, padding: 16, borderColor: '#F5EAD6', borderWidth: 1, backgroundColor: '#EEF2FF' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ClipboardList size={18} color="#6366F1" />
              <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 18, color: '#6366F1' }}>Задачи на смену</Text>
            </View>
            {activeTasksCount > 0 && (
              <View style={{ backgroundColor: '#6366F1', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
                 <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 10, color: '#FFFFFF' }}>{activeTasksCount} ост.</Text>
              </View>
            )}
          </View>

          <View style={{ marginBottom: 12, maxHeight: 200 }}>
            {(!tasks || tasks.length === 0) ? (
              <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 12, color: '#A0A0B0', textAlign: 'center', paddingVertical: 8 }}>Нет активных задач</Text>
            ) : (
              tasks.map((t:any) => (
                <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10, borderRadius: 12, backgroundColor: '#FFFFFF', borderColor: '#F5EAD6', borderWidth: 1, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 }}>
                  <TouchableOpacity onPress={() => toggleTask(t)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, opacity: t.is_completed ? 0.6 : 1 }}>
                    {t.is_completed ? <CheckCircle size={20} color="#4DBFAA" /> : <Circle size={20} color="#E0DDD8" />}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: t.is_completed ? 'Nunito_700Bold' : 'Nunito_800ExtraBold', fontSize: 13, color: t.is_completed ? '#A0A0B0' : '#1A1A2E', textDecorationLine: t.is_completed ? 'line-through' : 'none' }}>
                        {t.title}
                      </Text>
                      <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 9, color: '#AAA' }}>
                        {t.due_time ? `До: ${new Date(safeTime(t.due_time)).toLocaleString("ru-RU", { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} • ` : ""}Добавил(а): {t.recorded_by === "mom" ? "Мама" : "Папа"}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteTask(t)} style={{ padding: 6, borderRadius: 8, backgroundColor: '#FFE4E4', opacity: t.is_completed ? 1 : 0.2 }}>
                    <Trash2 size={14} color="#D94F4F" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput 
              placeholder="Напр. дать витамин Д" 
              placeholderTextColor="#8A8A9E"
              style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontFamily: 'Nunito_700Bold', fontSize: 13, color: '#1A1A2E' }}
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
              onSubmitEditing={addTask}
            />
            <TouchableOpacity 
              onPress={() => setShowTaskPicker(true)}
              style={{ height: 40, paddingHorizontal: newTaskTime ? 12 : 0, width: newTaskTime ? 'auto' : 40, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E0DDD8' }}
            >
              {newTaskTime ? (
                <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 11, color: '#6366F1' }}>
                  {newTaskTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              ) : (
                <Calendar size={18} color="#6366F1" />
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={addTask} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: '#6366F1', borderRadius: 12, shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 }}>
              <Plus size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Events */}
        <View style={{ marginHorizontal: 16, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 16, marginBottom: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 3 }}>
           <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 18, color: '#1A1A2E', marginBottom: 12 }}>Последние события</Text>
           {allEvents.length === 0 ? (
              <Text style={{ textAlign: 'center', color: '#8A8A9E', fontFamily: 'Nunito_700Bold', fontSize: 12, paddingVertical: 16 }}>Нет записей. Используйте кнопку + чтобы добавить.</Text>
           ) : (
              <View style={{ gap: 12 }}>
                 {allEvents.map((ev) => (
                    <View key={ev.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={{ width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: ev.bg }}>
                            <ev.Icon size={18} color={ev.iconColor} />
                        </View>
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 13, color: '#1A1A2E' }} numberOfLines={1}>{ev.title}</Text>
                            {ev.who && (
                               <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, backgroundColor: ev.whoBg }}>
                                  <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 10, color: '#FFFFFF' }}>{ev.who}</Text>
                               </View>
                            )}
                        </View>
                        <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 11, color: '#8A8A9E' }}>{ev.timeStr}</Text>
                    </View>
                 ))}
              </View>
           )}
        </View>
      </ScrollView>

      {/* FAB is rendered globally in App.tsx */}

      {/* Task Time Picker */}
      <DateTimePickerModal
        visible={showTaskPicker}
        value={newTaskTime || new Date()}
        mode="time"
        is24Hour={true}
        onChange={(selectedDate) => { if (selectedDate) setNewTaskTime(selectedDate); }}
        onClose={() => setShowTaskPicker(false)}
      />
    </View>
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
