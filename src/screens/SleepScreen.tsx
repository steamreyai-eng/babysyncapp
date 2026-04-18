import React, { useState, useEffect } from 'react';
import { ScrollView, TouchableOpacity, Platform, Alert, KeyboardAvoidingView } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import DateTimePickerModal from '../components/DateTimePickerModal';
import { database } from '../db';
import { Sleep } from '../db/models/Sleep';
import { useAuthStore } from '../store/authStore';
import { triggerHaptic } from '../utils/haptics';
import withObservables from '@nozbe/with-observables';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EditRecordModal from '../components/EditRecordModal';
import { useTimerStore } from '../store/timerStore';
import { startSleepTimerNotification, cancelSleepTimerNotification } from '../lib/timerNotifications';
import { formatWakeWindow, type SleepLike } from '../lib/wakeWindowEngine';
import {
  getLocalPrediction,
  fetchServerPrediction,
  invalidatePredictionCache,
  formatConfidence,
  formatLevel,
  type MLPrediction,
} from '../lib/sleepPredictor';

import { Wrapper } from '../components/ui/Wrapper';
import { Surface } from '../components/ui/Surface';
import { Typography } from '../components/ui/Typography';
import { ScreenHeader } from '../components/ScreenHeader';
import { DateSelector } from '../components/DateSelector';
import { SegmentedControl } from '../components/SegmentedControl';
import { IconCircle } from '../components/IconCircle';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { COLORS, RADIUS, SHADOWS } from '../lib/theme';

const LOCATIONS = [
  { id: 'crib', label: 'Кроватка', icon: 'bed' as const, color: '#8B5CF6' },
  { id: 'stroller', label: 'Коляска', icon: 'walk' as const, color: '#059669' },
  { id: 'arms', label: 'На руках', icon: 'heart' as const, color: '#F97316' },
  { id: 'car', label: 'Авто', icon: 'car' as const, color: '#2563EB' },
];

const MODE_ITEMS = [
  { key: 'timer', label: 'Таймер', icon: <Ionicons name="time" size={16} /> },
  { key: 'manual', label: 'Вручную', icon: <Ionicons name="calendar" size={16} /> },
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
    invalidatePredictionCache();
    setMlPrediction(getLocalPrediction(ageMo, sortedSleeps as unknown as SleepLike[]));
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
      invalidatePredictionCache();
      setMlPrediction(getLocalPrediction(ageMo, sortedSleeps as unknown as SleepLike[]));
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

  const todaysSleeps = sleeps.filter(s => {
    const d = new Date(s.created_at);
    return d.getDate() === selectedDate.getDate() && 
           d.getMonth() === selectedDate.getMonth() && 
           d.getFullYear() === selectedDate.getFullYear();
  }).sort((a,b) => b.created_at - a.created_at);

  const totalSecs = todaysSleeps.reduce((a, s) => a + s.duration_seconds, 0);
  const maxSecs = todaysSleeps.reduce((max, s) => Math.max(max, s.duration_seconds), 0);

  const sortedSleeps = [...sleeps].sort((a,b) => b.created_at - a.created_at);
  const ageMo = babyBirthdate
    ? (Date.now() - new Date(babyBirthdate).getTime()) / (1000 * 3600 * 24 * 30.44)
    : 4;

  const localPred = React.useMemo(
    () => getLocalPrediction(ageMo, sortedSleeps as unknown as SleepLike[]),
    [ageMo, sortedSleeps.length]
  );

  const [mlPrediction, setMlPrediction] = React.useState<MLPrediction>(localPred);

  React.useEffect(() => {
    setMlPrediction(prev => prev.source === 'server' ? prev : localPred);
  }, [localPred]);

  React.useEffect(() => {
    if (sortedSleeps.length < 3) return;
    if (selectedDate.toDateString() !== new Date().toDateString()) return;

    let cancelled = false;
    (async () => {
      const serverPred = await fetchServerPrediction(ageMo, babyBirthdate);
      if (serverPred && !cancelled) {
        setMlPrediction(serverPred);
      }
    })();

    return () => { cancelled = true; };
  }, [ageMo, sortedSleeps.length]);

  const showAIPrediction = sortedSleeps.length >= 1 && selectedDate.toDateString() === new Date().toDateString();
  const nextSleepMsg = mlPrediction.message;
  const wakeWindowMin = mlPrediction.wakeWindowMin;
  const wakeWindowLabel = `${Math.floor(wakeWindowMin / 60) > 0 ? `${Math.floor(wakeWindowMin / 60)}ч ` : ''}${wakeWindowMin % 60}м`;
  const confidenceLabel = formatConfidence(mlPrediction.confidence);
  const levelLabel = formatLevel(mlPrediction.level);

  const isL2 = mlPrediction.level === 'L2';
  const predColor = isL2 ? '#7C3AED' : '#E69600';
  const predBg = isL2 ? '#EDE9FE' : '#FDF7E7';
  const predBorder = isL2 ? '#C4B5FD' : '#F0DDB3';
  const predLabel = isL2 ? 'ML-ПРОГНОЗ' : mlPrediction.source === 'local' && mlPrediction.level === 'L1' ? 'ПЕРСОНАЛЬНЫЙ ПРОГНОЗ' : 'СМАРТ-ПОДСКАЗКА';

  return (
    <Wrapper flex={1} bg="#FAFBFC">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <ScreenHeader title="Сон" />

        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: Math.max(insets.bottom, 40) }} showsVerticalScrollIndicator={false}>
        
        {/* Date Selector */}
        <Wrapper mb={20}>
          <DateSelector value={selectedDate} onChange={setSelectedDate} tone="sleep" />
        </Wrapper>

        <Typography variant="tiny" weight="bold" color="#8A8A9E" mb={16}>Сон и режим</Typography>

        {/* AI Prediction */}
        {showAIPrediction && (
          <Wrapper mb={20} p={20} style={{ backgroundColor: predBg, borderRadius: RADIUS.xxl, borderWidth: 1, borderColor: predBorder }}>
            <Wrapper dir="row" align="center">
              <Wrapper mr={16}>
                <IconCircle bg="white">
                  <Ionicons name={isL2 ? 'analytics' : 'bulb'} size={24} color={predColor} />
                </IconCircle>
              </Wrapper>
              <Wrapper flex={1}>
                <Wrapper dir="row" align="center" mb={4}>
                  <Typography variant="tiny" weight="extraBold" color={predColor} uppercase>{predLabel}</Typography>
                  {mlPrediction.level !== 'L0' && (
                    <Wrapper ml={8}>
                      <StatusBadge label={levelLabel} tone={isL2 ? 'purple' : 'warning'} />
                    </Wrapper>
                  )}
                </Wrapper>
                <Typography variant="body" weight="black">Следующий сон: {nextSleepMsg}</Typography>
                <Wrapper mt={4}>
                  <Typography variant="tiny" weight="extraBold" color="#8A8A9E">Окно бодрствования ~{wakeWindowLabel} · точность {confidenceLabel} ({Math.round(mlPrediction.confidence * 100)}%)</Typography>
                </Wrapper>
                {mlPrediction.modelInfo && isL2 && (
                  <Wrapper mt={4}>
                    <Typography variant="tiny" weight="bold" color="#A78BFA">
                      {mlPrediction.modelInfo.algorithm} · R²={mlPrediction.modelInfo.r2?.toFixed(2)} · RMSE={mlPrediction.modelInfo.rmseMin?.toFixed(0)}мин · {mlPrediction.modelInfo.nSamples} обр.
                    </Typography>
                  </Wrapper>
                )}
              </Wrapper>
            </Wrapper>
          </Wrapper>
        )}

        {/* Input Card */}
        <Surface variant="elevated" radius="xxl" p={20} mb={20}>
          
          {/* Active Timer Banner */}
          {isRunning && (
            <Wrapper mb={20} p={16} dir="row" align="center" justify="space-between" style={{ backgroundColor: '#8B6FD4', borderRadius: RADIUS.xl }}>
              <Wrapper dir="row" align="center">
                <Wrapper width={10} height={10} mr={10} style={{ borderRadius: 5, backgroundColor: '#4ADE80', borderWidth: 2, borderColor: 'white' }} />
                <Typography variant="body" weight="extraBold" color="white">Сон идёт</Typography>
              </Wrapper>
              <Typography variant="h3" weight="black" color="white">{fmt(seconds)}</Typography>
            </Wrapper>
          )}

          {/* Mode Switch */}
          <Wrapper mb={24}>
            <SegmentedControl items={MODE_ITEMS} selected={mode} onChange={(k) => setMode(k as any)} tone="neutral" />
          </Wrapper>

          {mode === 'timer' ? (
            <Wrapper align="center" mb={24}>
              <Typography variant="tiny" weight="extraBold" color="#8B6FD4" uppercase mb={8}>Таймер сна</Typography>
              <Typography variant="h1" weight="black" size={64} letterSpacing={-2}>{fmt(seconds)}</Typography>
              <Wrapper mt={12}>
                <Typography variant="tiny" weight="bold" color="#8A8A9E">{isRunning ? "⏺ Запись активна..." : "Нажмите начать, когда малыш уснет"}</Typography>
              </Wrapper>
              {!isRunning && (
                <Wrapper mt={16} align="center" width="100%">
                  <Typography variant="tiny" weight="extraBold" color="#8A8A9E" uppercase mb={6}>Начать с времени:</Typography>
                  <TouchableOpacity onPress={() => setShowTimerStartPicker(true)} style={{ backgroundColor: '#F4F4F8', paddingVertical: 10, paddingHorizontal: 20, borderRadius: RADIUS.lg }}>
                    <Typography variant="body" weight="extraBold">{timerStartInput.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</Typography>
                  </TouchableOpacity>
                  <DateTimePickerModal visible={showTimerStartPicker} value={timerStartInput} mode="time" is24Hour onChange={(d) => { if(d) setTimerStartInput(d); }} onClose={() => setShowTimerStartPicker(false)} />
                </Wrapper>
              )}
            </Wrapper>
          ) : (
            <Wrapper dir="row" gap={12} mb={24}>
              <Wrapper flex={1}>
                <Typography variant="tiny" weight="extraBold" color="#8B6FD4" uppercase mb={8}>Уснул(а)</Typography>
                <TouchableOpacity onPress={() => setShowStartPicker(true)} style={{ backgroundColor: '#F4F4F8', padding: 16, borderRadius: RADIUS.xl }}>
                  <Typography variant="body" weight="extraBold">{manualStart.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</Typography>
                </TouchableOpacity>
                <DateTimePickerModal visible={showStartPicker} value={manualStart} mode="time" is24Hour onChange={(d) => { if(d) setManualStart(d); }} onClose={() => setShowStartPicker(false)} />
              </Wrapper>
              <Wrapper flex={1}>
                <Typography variant="tiny" weight="extraBold" color="#8B6FD4" uppercase mb={8}>Проснулся(ась)</Typography>
                <TouchableOpacity onPress={() => setShowEndPicker(true)} style={{ backgroundColor: '#F4F4F8', padding: 16, borderRadius: RADIUS.xl }}>
                  <Typography variant="body" weight="extraBold">{manualEnd.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</Typography>
                </TouchableOpacity>
                <DateTimePickerModal visible={showEndPicker} value={manualEnd} mode="time" is24Hour onChange={(d) => { if(d) setManualEnd(d); }} onClose={() => setShowEndPicker(false)} />
              </Wrapper>
            </Wrapper>
          )}

          {/* Location Picker */}
          <Typography variant="tiny" weight="extraBold" color="#8A8A9E" uppercase mb={8}>Место сна</Typography>
          <Wrapper dir="row" gap={8} mb={24}>
            {LOCATIONS.map(loc => (
              <TouchableOpacity
                key={loc.id}
                onPress={() => setLocation(loc.id)}
                style={{
                  flex: 1,
                  aspectRatio: 0.9,
                  backgroundColor: location === loc.id ? loc.color : '#F4F4F8',
                  borderRadius: RADIUS.xl,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                activeOpacity={0.8}
              >
                <IconCircle size="sm" bg="white">
                  <Ionicons name={loc.icon} size={18} color={location === loc.id ? loc.color : '#8A8A9E'} />
                </IconCircle>
                <Wrapper mt={8}>
                  <Typography variant="tiny" weight="extraBold" color={location === loc.id ? 'white' : '#8A8A9E'}>{loc.label}</Typography>
                </Wrapper>
              </TouchableOpacity>
            ))}
          </Wrapper>

          {/* Quality Stars */}
          <Typography variant="tiny" weight="extraBold" color="#8A8A9E" uppercase mb={8}>Качество сна</Typography>
          <Wrapper dir="row" gap={8} mb={24}>
            {[1,2,3,4,5].map(s => (
              <TouchableOpacity key={s} onPress={() => setQuality(s)} activeOpacity={0.8}>
                <Ionicons name={s <= quality ? "star" : "star-outline"} size={36} color={s <= quality ? '#F0A500' : '#E0DDD8'} />
              </TouchableOpacity>
            ))}
          </Wrapper>

          {/* Action Buttons */}
          <Wrapper dir="row" gap={12}>
            <TouchableOpacity
              onPress={() => { cancelSleepTimerNotification(); clearSleepTimer(); setSeconds(0); }}
              style={{ flex: 0.8, height: 56, backgroundColor: '#F4F4F8', borderRadius: RADIUS.xl, alignItems: 'center', justifyContent: 'center' }}
              activeOpacity={0.8}
            >
              <Typography variant="body" weight="extraBold" color="#8A8A9E">Сброс</Typography>
            </TouchableOpacity>

            {mode === 'timer' ? (
              isRunning ? (
                <TouchableOpacity
                  onPress={handleStopSave}
                  style={{ flex: 2, height: 56, backgroundColor: '#D94F4F', borderRadius: RADIUS.xl, alignItems: 'center', justifyContent: 'center' }}
                  activeOpacity={0.8}
                >
                  <Typography variant="body" weight="black" color="white">Остановить</Typography>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={handleStartTimer}
                  style={{ flex: 2, height: 56, backgroundColor: '#8B6FD4', borderRadius: RADIUS.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="play" size={16} color="white" />
                  <Typography variant="body" weight="black" color="white">Начать сон</Typography>
                </TouchableOpacity>
              )
            ) : (
              <TouchableOpacity
                onPress={handleManualSave}
                style={{ flex: 2, height: 56, backgroundColor: manualEnd.getTime() <= manualStart.getTime() ? '#D1D1DB' : '#8B6FD4', borderRadius: RADIUS.xl, alignItems: 'center', justifyContent: 'center' }}
                activeOpacity={0.8}
              >
                <Typography variant="body" weight="black" color="white">Сохранить</Typography>
              </TouchableOpacity>
            )}
          </Wrapper>
        </Surface>

        {/* Stats */}
        <Surface variant="elevated" radius="xxl" p={20} mb={20}>
          <Typography variant="body" weight="black" mb={16}>Сон за {selectedDate.toLocaleDateString() === new Date().toLocaleDateString() ? "сегодня" : selectedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</Typography>
          
          <Wrapper dir="row" gap={12} mb={20}>
            <Wrapper flex={1} p={12} align="center" style={{ backgroundColor: '#8B6FD410', borderRadius: RADIUS.xl }}>
              <Typography variant="tiny" weight="extraBold" color="#8B6FD4" uppercase mb={4}>Всего</Typography>
              <Typography variant="body" weight="black" color="#8B6FD4">{totalSecs > 0 ? fmtDur(totalSecs) : '—'}</Typography>
            </Wrapper>
            <Wrapper flex={1} p={12} align="center" style={{ backgroundColor: '#F4F4F8', borderRadius: RADIUS.xl }}>
              <Typography variant="tiny" weight="extraBold" color="#8A8A9E" uppercase mb={4}>Сеансов</Typography>
              <Typography variant="body" weight="black">{todaysSleeps.length}</Typography>
            </Wrapper>
            <Wrapper flex={1} p={12} align="center" style={{ backgroundColor: '#F4F4F8', borderRadius: RADIUS.xl }}>
              <Typography variant="tiny" weight="extraBold" color="#8A8A9E" uppercase mb={4}>Макс.</Typography>
              <Typography variant="body" weight="black">{maxSecs > 0 ? fmtDur(maxSecs) : '—'}</Typography>
            </Wrapper>
          </Wrapper>

          {todaysSleeps.length > 0 && (
            <Wrapper gap={12}>
              {todaysSleeps.slice(0, 5).map(s => {
                const renderRightActions = () => (
                  <Wrapper dir="row" width={140}>
                    <TouchableOpacity onPress={() => setEditTarget({ kind: 'sleep', record: s })} style={{ flex: 1, backgroundColor: '#8B6FD4', justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name="pencil" size={20} color="white" />
                      <Typography variant="tiny" weight="extraBold" color="white" mt={4}>Изменить</Typography>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteRecord(s as Sleep)} style={{ flex: 1, backgroundColor: '#D94F4F', justifyContent: 'center', alignItems: 'center', borderTopRightRadius: 16, borderBottomRightRadius: 16 }}>
                      <Ionicons name="trash" size={20} color="white" />
                      <Typography variant="tiny" weight="extraBold" color="white" mt={4}>Удалить</Typography>
                    </TouchableOpacity>
                  </Wrapper>
                );

                return (
                 <Wrapper key={s.id} mb={12} style={{ backgroundColor: '#F4F4F8', borderRadius: RADIUS.xl, overflow: 'hidden' }}>
                  <Swipeable renderRightActions={renderRightActions} friction={2} rightThreshold={40}>
                    <Wrapper dir="row" align="center" p={12} style={{ backgroundColor: '#F4F4F8', borderRadius: RADIUS.xl }}>
                      <Wrapper mr={16}>
                        <IconCircle bg="white">
                          <Ionicons name="moon" size={20} color="#8B5CF6" />
                        </IconCircle>
                      </Wrapper>
                      <Wrapper flex={1}>
                        <Typography variant="body" weight="black">{fmtDur(s.duration_seconds)}</Typography>
                        <Wrapper dir="row" align="center" mt={4}>
                          <Typography variant="tiny" weight="extraBold" color="#8A8A9E" mr={8}>{LOCATIONS.find(l => l.id === s.location)?.label}</Typography>
                          {s.quality > 0 && (
                            <Wrapper dir="row" align="center">
                              <Ionicons name="star" size={10} color="#F0A500" style={{ marginRight: 2 }} />
                              <Typography variant="tiny" weight="extraBold" color="#F0A500">{s.quality}</Typography>
                            </Wrapper>
                          )}
                        </Wrapper>
                      </Wrapper>
                      <Wrapper align="flex-end" justify="center">
                        <Typography variant="tiny" weight="extraBold">{fmtTime(s.start_time || s.created_at)}</Typography>
                        <Wrapper mt={2}>
                          <Typography variant="tiny" weight="extraBold">{fmtTime(s.end_time || (safeTime(s.created_at) + (s.duration_seconds * 1000)))}</Typography>
                        </Wrapper>
                      </Wrapper>
                    </Wrapper>
                  </Swipeable>
                 </Wrapper>
                );
              })}
            </Wrapper>
          )}
        </Surface>

        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 16, alignItems: 'center' }}>
          <Typography variant="body" weight="extraBold" color="#8A8A9E">К трекеру</Typography>
        </TouchableOpacity>
      </ScrollView>
      <EditRecordModal target={editTarget} onClose={() => setEditTarget(null)} />
      </KeyboardAvoidingView>
    </Wrapper>
  );
}

const enhance = withObservables([], () => ({
  sleeps: database.collections.get<Sleep>('sleeps').query().observe(),
}));

export default enhance(SleepScreenContent);
