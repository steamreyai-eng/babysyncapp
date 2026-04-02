
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform, Alert, KeyboardAvoidingView } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { database } from '../db';
import { Sleep } from '../db/models/Sleep';
import { useAuthStore } from '../store/authStore';
import { triggerHaptic } from '../utils/haptics';
import withObservables from '@nozbe/with-observables';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EditRecordModal from '../components/EditRecordModal';
import { useTimerStore } from '../store/timerStore';
import { startSleepTimerNotification, cancelSleepTimerNotification } from '../lib/timerNotifications';

const LOCATIONS = [
  { id: 'crib', label: 'Кроватка', icon: 'bed', color: '#8B5CF6' },
  { id: 'stroller', label: 'Коляска', icon: 'walk', color: '#059669' },
  { id: 'arms', label: 'На руках', icon: 'heart', color: '#F97316' },
  { id: 'car', label: 'Авто', icon: 'car', color: '#2563EB' },
];

function SleepScreenContent({ sleeps }: { sleeps: Sleep[] }) {
  const navigation = useNavigation();
  const session = useAuthStore(state => state.session);
  const activeParent = useAuthStore(state => state.activeParent);
  const babyBirthdate = session?.user?.user_metadata?.baby_birthdate;
  const insets = useSafeAreaInsets();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [mode, setMode] = useState<'timer' | 'manual'>('timer');
  const { sleepConfig, setSleepConfig, clearSleepTimer } = useTimerStore();
  const { location, quality, isRunning, startTime } = sleepConfig;
  const setLocation = (l: string) => setSleepConfig({ location: l });
  const setQuality = (q: number) => setSleepConfig({ quality: q });
  
  const [seconds, setSeconds] = useState(0);

  const [manualStart, setManualStart] = useState(new Date());
  const [manualEnd, setManualEnd] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);

  const [timerStartInput, setTimerStartInput] = useState(new Date());
  const [showTimerStartPicker, setShowTimerStartPicker] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      setSeconds(Math.floor((Date.now() - (startTime || Date.now())) / 1000));
      interval = setInterval(() => {
        setSeconds(Math.floor((Date.now() - (startTime || Date.now())) / 1000));
      }, 1000);
    } else {
      setSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isRunning, startTime]);

  const handleStartTimer = () => {
    const stime = timerStartInput.getTime();
    setSleepConfig({ startTime: stime, isRunning: true });
    startSleepTimerNotification(stime);
  };

  const handleStopSave = async () => {
    setSleepConfig({ isRunning: false });
    if (seconds > 0) {
       try {
         await database.write(async () => {
           await database.get<Sleep>('sleeps').create(sleep => {
             sleep.duration_seconds = seconds;
             sleep.location = location;
             sleep.quality = quality;
             sleep.start_time = startTime || Date.now() - (seconds * 1000);
             sleep.end_time = Date.now();
             sleep.created_at = startTime || Date.now() - (seconds * 1000);
             sleep.recorded_by = activeParent;
           });
         });
       } catch (error) {
         Alert.alert("Ошибка", "Не удалось сохранить сон.");
       }
    }
    triggerHaptic('success');
    cancelSleepTimerNotification();
    clearSleepTimer();
    setSeconds(0);
  };

  const handleManualSave = async () => {
    if (manualEnd.getTime() <= manualStart.getTime()) return;
    const durationSeconds = Math.floor((manualEnd.getTime() - manualStart.getTime()) / 1000);
    
    try {
      await database.write(async () => {
        await database.get<Sleep>('sleeps').create(sleep => {
          sleep.duration_seconds = durationSeconds;
          sleep.location = location;
          sleep.quality = quality;
          sleep.start_time = manualStart.getTime();
          sleep.end_time = manualEnd.getTime();
          sleep.created_at = manualStart.getTime();
          sleep.recorded_by = activeParent;
        });
      });
      triggerHaptic('success');
      setQuality(0);
      setManualStart(new Date());
      setManualEnd(new Date());
    } catch (error) {
      Alert.alert("Ошибка", "Не удалось сохранить сон.");
    }
  };

  const handleDeleteRecord = (record: Sleep) => {
    Alert.alert(
      "Удалить запись?",
      "Это действие нельзя отменить",
      [
        { text: "Отмена", style: "cancel" },
        { text: "Удалить", style: "destructive", onPress: async () => {
            try {
              await database.write(async () => {
                await record.markAsDeleted();
              });
              triggerHaptic('success');
            } catch (error) {
              Alert.alert("Ошибка", "Не удалось удалить запись");
            }
        }}
      ]
    );
  };

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const sec = s % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const fmtDur = (s: number) => {
    const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}ч ${m}м` : `${m}м`;
  };

  const safeTime = (val: any) => {
    if (!val) return 0;
    if (val instanceof Date) return val.getTime();
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      if (/^\d+$/.test(val)) return parseInt(val, 10);
      return new Date(val).getTime();
    }
    return new Date(val).getTime() || 0;
  };

  const fmtTime = (ms: any) => {
    const t = safeTime(ms) || 0;
    if (!t) return '--:--';
    const d = new Date(t);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  // Stats Logic
  const todaysSleeps = sleeps.filter(s => {
    const d = new Date(s.created_at);
    return d.getDate() === selectedDate.getDate() && 
           d.getMonth() === selectedDate.getMonth() && 
           d.getFullYear() === selectedDate.getFullYear();
  }).sort((a,b) => b.created_at - a.created_at);

  const totalSecs = todaysSleeps.reduce((a, s) => a + s.duration_seconds, 0);
  const maxSecs = todaysSleeps.reduce((max, s) => Math.max(max, s.duration_seconds), 0);

  // AI Logic
  let wakeWindowH = 1; let wakeWindowM = 30;
  if (babyBirthdate) {
    const ageMo = (Date.now() - new Date(babyBirthdate).getTime()) / (1000 * 3600 * 24 * 30.44);
    if (ageMo < 1) { wakeWindowH = 1; wakeWindowM = 0; }
    else if (ageMo < 3) { wakeWindowH = 1; wakeWindowM = 30; }
    else if (ageMo < 6) { wakeWindowH = 2; wakeWindowM = 0; }
    else if (ageMo < 9) { wakeWindowH = 2; wakeWindowM = 30; }
    else if (ageMo < 12) { wakeWindowH = 3; wakeWindowM = 0; }
    else { wakeWindowH = 4; wakeWindowM = 0; }
  }

  let nextSleepMsg = "—";
  let showAIPrediction = false;

  const sortedSleeps = [...sleeps].sort((a,b) => b.created_at - a.created_at);

  if (sortedSleeps.length >= 3 && selectedDate.toDateString() === new Date().toDateString()) {
    showAIPrediction = true;
    const recentSleeps = sortedSleeps.slice(0, 10);
    const wakeIntervals = [];

    for (let i = 0; i < recentSleeps.length - 1; i++) {
        const currentSleep = recentSleeps[i];
        const prevSleep = recentSleeps[i + 1];

        const currentStartMs = safeTime(currentSleep.start_time) || safeTime(currentSleep.created_at);
        const prevEndMs = safeTime(prevSleep.end_time) || (safeTime(prevSleep.created_at) + (prevSleep.duration_seconds || 0) * 1000);

        const intervalMs = currentStartMs - prevEndMs;
        if (intervalMs > 0 && intervalMs < 8 * 3600000) {
            wakeIntervals.push(intervalMs);
        }
    }

    let avgWakeMs = (wakeWindowH * 3600000) + (wakeWindowM * 60000);
    if (wakeIntervals.length > 0) {
        avgWakeMs = wakeIntervals.reduce((a, b) => a + b, 0) / wakeIntervals.length;
    }

    const lastSleepItem = sortedSleeps[0];
    const endMs = safeTime(lastSleepItem.end_time) || (safeTime(lastSleepItem.created_at) + (lastSleepItem.duration_seconds || 0) * 1000);

    const timeSinceWakeMs = Date.now() - endMs;
    const diffMs = avgWakeMs - timeSinceWakeMs;

    if (diffMs < 0) {
        const overMs = Math.abs(diffMs);
        const oh = Math.floor(overMs / 3600000);
        const om = Math.floor((overMs % 3600000) / 60000);
        nextSleepMsg = `Пора спать (прошло лишних ${oh > 0 ? `${oh}ч ` : ""}${om}м)`;
    } else {
        const dh = Math.floor(diffMs / 3600000);
        const dm = Math.floor((diffMs % 3600000) / 60000);
        nextSleepMsg = `Примерно через ${dh > 0 ? `${dh}ч ` : ""}${dm}м`;
    }
  }

  const changeDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FAFBFC' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <View style={{ paddingTop: Math.max(insets.top, 16), paddingHorizontal: 16, paddingBottom: 16, backgroundColor: '#FAFBFC', flexDirection: 'row', alignItems: 'center' }}>
           <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, marginRight: 16, borderWidth: 1, borderColor: '#E2E8F0' }}>
               <Ionicons name="arrow-back" size={24} color="#1A1A2E" />
           </TouchableOpacity>
           <View>
               <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 24, color: '#1A1A2E' }}>Сон</Text>
           </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: Math.max(insets.bottom, 40) }}>
        
        {/* Date Selector */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white', borderRadius: 20, padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 2, marginBottom: 20 }}>
          <TouchableOpacity onPress={() => changeDate(-1)} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#F4F4F8', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="chevron-back" size={20} color="#8A8A9E" />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="calendar" size={18} color="#8B5CF6" style={{ marginRight: 8 }} />
            <Text style={{ fontSize: 15, fontFamily: 'Nunito_800ExtraBold', color: '#1A1A2E' }}>
              {selectedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
            </Text>
          </View>
          <TouchableOpacity onPress={() => changeDate(1)} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#F4F4F8', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="chevron-forward" size={20} color="#8A8A9E" />
          </TouchableOpacity>
        </View>

          <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 15, color: '#8A8A9E', marginBottom: 16 }}>Сон и режим</Text>

        {/* AI Prediction */}
        {showAIPrediction && (
          <View style={{ backgroundColor: '#FDF7E7', borderRadius: 24, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#F0DDB3', flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
              <Ionicons name="sparkles" size={24} color="#E69600" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, fontFamily: 'Nunito_800ExtraBold', color: '#E69600', textTransform: 'uppercase', marginBottom: 4 }}>AI-Прогноз режима</Text>
              <Text style={{ fontSize: 15, fontFamily: 'Nunito_900Black', color: '#1A1A2E' }}>Следующий сон: {nextSleepMsg}</Text>
              <Text style={{ fontSize: 12, fontFamily: 'Nunito_800ExtraBold', color: '#8A8A9E', marginTop: 4 }}>Окно бодрствования ~{wakeWindowH > 0 ? `${wakeWindowH}ч ` : ""}{wakeWindowM > 0 ? `${wakeWindowM}м` : ""}</Text>
            </View>
          </View>
        )}

        {/* Input Card */}
        <View style={{ backgroundColor: 'white', borderRadius: 24, padding: 20, shadowColor: '#8B5CF6', shadowOpacity: 0.08, shadowRadius: 20, elevation: 4, borderWidth: 1, borderColor: '#F0ECE8', marginBottom: 20 }}>
          
          {isRunning && (
            <View style={{ backgroundColor: '#8B6FD4', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#4ADE80', borderWidth: 2, borderColor: 'white', marginRight: 10 }} />
                <Text style={{ color: 'white', fontFamily: 'Nunito_800ExtraBold', fontSize: 14 }}>Сон идёт</Text>
              </View>
              <Text style={{ color: 'white', fontFamily: 'Nunito_900Black', fontSize: 18 }}>{fmt(seconds)}</Text>
            </View>
          )}

          <View style={{ flexDirection: 'row', backgroundColor: '#F4F4F8', borderRadius: 16, padding: 4, marginBottom: 24 }}>
            <TouchableOpacity onPress={() => setMode('timer')} style={{ flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: mode === 'timer' ? 'white' : 'transparent', alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}>
              <Ionicons name="time" size={16} color={mode === 'timer' ? '#8B6FD4' : '#8A8A9E'} />
              <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 13, color: mode === 'timer' ? '#8B6FD4' : '#8A8A9E', marginLeft: 8 }}>Таймер</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMode('manual')} style={{ flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: mode === 'manual' ? 'white' : 'transparent', alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}>
              <Ionicons name="calendar" size={16} color={mode === 'manual' ? '#8B6FD4' : '#8A8A9E'} />
              <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 13, color: mode === 'manual' ? '#8B6FD4' : '#8A8A9E', marginLeft: 8 }}>Вручную</Text>
            </TouchableOpacity>
          </View>

          {mode === 'timer' ? (
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 11, color: '#8B6FD4', textTransform: 'uppercase', marginBottom: 8 }}>Таймер сна</Text>
              <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 64, color: '#1A1A2E', letterSpacing: -2 }}>{fmt(seconds)}</Text>
              <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 12, color: '#8A8A9E', marginTop: 12 }}>{isRunning ? "⏺ Запись активна..." : "Нажмите начать, когда малыш уснет"}</Text>
              {!isRunning && (
                <View style={{ marginTop: 16, alignItems: 'center', width: '100%' }}>
                  <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 11, color: '#8A8A9E', textTransform: 'uppercase', marginBottom: 6 }}>Начать с времени:</Text>
                  <TouchableOpacity onPress={() => setShowTimerStartPicker(true)} style={{ backgroundColor: '#F4F4F8', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12 }}>
                    <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 16, color: '#1A1A2E' }}>{timerStartInput.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</Text>
                  </TouchableOpacity>
                  {showTimerStartPicker && (
                    <DateTimePicker value={timerStartInput} mode="time" display="default" is24Hour onChange={(e, d) => { setShowTimerStartPicker(Platform.OS === 'ios'); if(d) setTimerStartInput(d); }} />
                  )}
                </View>
              )}
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 11, color: '#8B6FD4', textTransform: 'uppercase', marginBottom: 8 }}>Уснул(а)</Text>
                <TouchableOpacity onPress={() => setShowStartPicker(true)} style={{ backgroundColor: '#F4F4F8', padding: 16, borderRadius: 16 }}>
                  <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 16, color: '#1A1A2E' }}>{manualStart.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</Text>
                </TouchableOpacity>
                {showStartPicker && (
                  <DateTimePicker value={manualStart} mode="time" display="default" is24Hour onChange={(e, d) => { setShowStartPicker(Platform.OS === 'ios'); if(d) setManualStart(d); }} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 11, color: '#8B6FD4', textTransform: 'uppercase', marginBottom: 8 }}>Проснулся(ась)</Text>
                <TouchableOpacity onPress={() => setShowEndPicker(true)} style={{ backgroundColor: '#F4F4F8', padding: 16, borderRadius: 16 }}>
                  <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 16, color: '#1A1A2E' }}>{manualEnd.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</Text>
                </TouchableOpacity>
                {showEndPicker && (
                  <DateTimePicker value={manualEnd} mode="time" display="default" is24Hour onChange={(e, d) => { setShowEndPicker(Platform.OS === 'ios'); if(d) setManualEnd(d); }} />
                )}
              </View>
            </View>
          )}

          <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 11, color: '#8A8A9E', textTransform: 'uppercase', marginBottom: 8 }}>Место сна</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
            {LOCATIONS.map(loc => (
              <TouchableOpacity key={loc.id} onPress={() => setLocation(loc.id)} style={{ flex: 1, aspectRatio: 0.9, backgroundColor: location === loc.id ? loc.color : '#F4F4F8', borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                  <Ionicons name={loc.icon as any} size={18} color={location === loc.id ? loc.color : '#8A8A9E'} />
                </View>
                <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 10, color: location === loc.id ? 'white' : '#8A8A9E' }}>{loc.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 11, color: '#8A8A9E', textTransform: 'uppercase', marginBottom: 8 }}>Качество сна</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
            {[1,2,3,4,5].map(s => (
              <TouchableOpacity key={s} onPress={() => setQuality(s)}>
                <Ionicons name={s <= quality ? "star" : "star-outline"} size={36} color={s <= quality ? '#F0A500' : '#E0DDD8'} />
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity onPress={() => { cancelSleepTimerNotification(); clearSleepTimer(); setSeconds(0); }} style={{ flex: 0.8, backgroundColor: '#F4F4F8', height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 14, color: '#8A8A9E' }}>Сброс</Text>
            </TouchableOpacity>

            {mode === 'timer' ? (
              isRunning ? (
                <TouchableOpacity onPress={handleStopSave} style={{ flex: 2, backgroundColor: '#D94F4F', height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
                  <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 14, color: 'white' }}>Остановить</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={handleStartTimer} style={{ flex: 2, backgroundColor: '#8B6FD4', height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
                  <Ionicons name="play" size={16} color="white" style={{ marginRight: 8 }} />
                  <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 14, color: 'white' }}>Начать сон</Text>
                </TouchableOpacity>
              )
            ) : (
              <TouchableOpacity onPress={handleManualSave} style={{ flex: 2, backgroundColor: manualEnd.getTime() <= manualStart.getTime() ? '#D1D1DB' : '#8B6FD4', height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 14, color: 'white' }}>Сохранить</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Stats */}
        <View style={{ backgroundColor: 'white', borderRadius: 24, padding: 20, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 16, elevation: 2, borderWidth: 1, borderColor: '#F0ECE8', marginBottom: 20 }}>
          <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 16, color: '#1A1A2E', marginBottom: 16 }}>Сон за {selectedDate.toLocaleDateString() === new Date().toLocaleDateString() ? "сегодня" : selectedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</Text>
          
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
            <View style={{ flex: 1, backgroundColor: '#8B6FD410', borderRadius: 16, padding: 12, alignItems: 'center' }}>
              <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 11, color: '#8B6FD4', textTransform: 'uppercase', marginBottom: 4 }}>Всего</Text>
              <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 16, color: '#8B6FD4' }}>{totalSecs > 0 ? fmtDur(totalSecs) : '—'}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: '#F4F4F8', borderRadius: 16, padding: 12, alignItems: 'center' }}>
              <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 11, color: '#8A8A9E', textTransform: 'uppercase', marginBottom: 4 }}>Сеансов</Text>
              <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 16, color: '#1A1A2E' }}>{todaysSleeps.length}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: '#F4F4F8', borderRadius: 16, padding: 12, alignItems: 'center' }}>
              <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 11, color: '#8A8A9E', textTransform: 'uppercase', marginBottom: 4 }}>Макс.</Text>
              <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 16, color: '#1A1A2E' }}>{maxSecs > 0 ? fmtDur(maxSecs) : '—'}</Text>
            </View>
          </View>

          {todaysSleeps.length > 0 && (
            <View style={{ gap: 12 }}>
              {todaysSleeps.slice(0, 5).map(s => {
                const renderRightActions = () => (
                  <View style={{ flexDirection: 'row', width: 140 }}>
                    <TouchableOpacity onPress={() => setEditTarget({ kind: 'sleep', record: s })} style={{ flex: 1, backgroundColor: '#8B6FD4', justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name="pencil" size={20} color="white" />
                      <Text style={{ color: 'white', fontSize: 10, fontFamily: 'Nunito_800ExtraBold', marginTop: 4 }}>Изменить</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteRecord(s as Sleep)} style={{ flex: 1, backgroundColor: '#D94F4F', borderTopRightRadius: 16, borderBottomRightRadius: 16, justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name="trash" size={20} color="white" />
                      <Text style={{ color: 'white', fontSize: 10, fontFamily: 'Nunito_800ExtraBold', marginTop: 4 }}>Удалить</Text>
                    </TouchableOpacity>
                  </View>
                );

                return (
                 <View key={s.id} style={{ marginBottom: 12, backgroundColor: '#F4F4F8', borderRadius: 16, overflow: 'hidden' }}>
                  <Swipeable renderRightActions={renderRightActions} friction={2} rightThreshold={40}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F4F4F8', padding: 12, borderRadius: 16 }}>
                      <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                        <Ionicons name="moon" size={20} color="#8B6FD4" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 15, color: '#1A1A2E' }}>{fmtDur(s.duration_seconds)}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                          <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 12, color: '#8A8A9E', marginRight: 8 }}>{LOCATIONS.find(l => l.id === s.location)?.label}</Text>
                          {s.quality > 0 && (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Ionicons name="star" size={10} color="#F0A500" style={{ marginRight: 2 }} />
                              <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 11, color: '#F0A500' }}>{s.quality}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                        <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 12, color: '#1A1A2E' }}>{fmtTime(s.start_time || s.created_at)}</Text>
                        <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 12, color: '#1A1A2E', marginTop: 2 }}>{fmtTime(s.end_time || (safeTime(s.created_at) + (s.duration_seconds * 1000)))}</Text>
                      </View>
                    </View>
                  </Swipeable>
                 </View>
                );
              })}
            </View>
          )}
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 16, alignItems: 'center' }}>
          <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 16, color: '#8A8A9E' }}>К трекеру</Text>
        </TouchableOpacity>
      </ScrollView>
      <EditRecordModal target={editTarget} onClose={() => setEditTarget(null)} />
      </KeyboardAvoidingView>
    </View>
  );
}

const enhance = withObservables([], () => ({
  sleeps: database.collections.get<Sleep>('sleeps').query().observe(),
}));

export default enhance(SleepScreenContent);

