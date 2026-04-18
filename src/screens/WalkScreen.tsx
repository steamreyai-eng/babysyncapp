
import React, { useState, useEffect } from 'react';
import { ScrollView, Platform, Alert, KeyboardAvoidingView } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import DateTimePickerModal from '../components/DateTimePickerModal';
import { database } from '../db';
import { Walk } from '../db/models/Walk';
import { useAuthStore } from '../store/authStore';
import { triggerHaptic } from '../utils/haptics';
import withObservables from '@nozbe/with-observables';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EditRecordModal from '../components/EditRecordModal';
import { useTimerStore } from '../store/timerStore';
import { startWalkTimerNotification, cancelWalkTimerNotification } from '../lib/timerNotifications';

import { Wrapper } from '../components/ui/Wrapper';
import { Surface } from '../components/ui/Surface';
import { Typography } from '../components/ui/Typography';
import { Button } from '../components/ui/Button';
import { ScreenHeader } from '../components/ScreenHeader';
import { SegmentedControl } from '../components/SegmentedControl';
import { ChipGroup } from '../components/ChipGroup';
import { EmptyState } from '../components/EmptyState';
import { IconCircle } from '../components/IconCircle';
import { FormField } from '../components/FormField';
import { StatusBadge } from '../components/StatusBadge';
import { COLORS } from '../lib/theme';

const LOCATIONS = [
  { id: 'park', label: 'Парк', icon: 'leaf', color: '#059669' },
  { id: 'yard', label: 'Двор', icon: 'home', color: '#8B5CF6' },
  { id: 'forest', label: 'Лес', icon: 'trail-sign', color: '#059669' },
  { id: 'outside', label: 'Улица', icon: 'business', color: '#2563EB' },
];

const WEATHERS = [
  { id: 'sunny', label: 'Солнечно', icon: 'sunny', color: '#F97316' },
  { id: 'cloudy', label: 'Облачно', icon: 'cloud', color: '#64748B' },
  { id: 'windy', label: 'Ветрено', icon: 'navigate', color: '#059669' },
  { id: 'rainy', label: 'Дождь', icon: 'rainy', color: '#2563EB' },
];

const MODE_ITEMS = [
  { key: 'timer', label: 'Таймер', icon: <Ionicons name="time" size={16} /> },
  { key: 'manual', label: 'Вручную', icon: <Ionicons name="calendar" size={16} /> },
];

const LOCATION_CHIPS = LOCATIONS.map(l => ({ key: l.id, label: l.label }));
const WEATHER_CHIPS = WEATHERS.map(w => ({ key: w.id, label: w.label }));

function WalkScreenContent({ walks }: { walks: Walk[] }) {
  const navigation = useNavigation();
  const session = useAuthStore(state => state.session);
  const activeParent = useAuthStore(state => state.activeParent);
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<'timer' | 'manual'>('timer');
  const { walkConfig, setWalkConfig, clearWalkTimer } = useTimerStore();
  const { location, weather, notes, isRunning, startTime } = walkConfig;
  const setLocation = (l: string) => setWalkConfig({ location: l });
  const setWeather = (w: string) => setWalkConfig({ weather: w });
  const setNotes = (n: string) => setWalkConfig({ notes: n });
  
  const [seconds, setSeconds] = useState(0);

  const [manualStart, setManualStart] = useState(new Date());
  const [manualEnd, setManualEnd] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  
  const [timerStartInput, setTimerStartInput] = useState(new Date());
  const [showTimerStartPicker, setShowTimerStartPicker] = useState(false);
  
  const [editTarget, setEditTarget] = useState<any>(null);

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
    setWalkConfig({ startTime: stime, isRunning: true });
    startWalkTimerNotification(stime);
  };

  const handleStopSave = async () => {
    setWalkConfig({ isRunning: false });
    if (seconds > 0) {
       try {
         await database.write(async () => {
           await database.get<Walk>('walks').create(walk => {
             walk.duration_seconds = seconds;
             walk.location = location;
             walk.weather = weather;
             walk.notes = notes.trim() || undefined;
             walk.created_at = startTime || Date.now() - (seconds * 1000);
             walk.recorded_by = activeParent;
           });
         });
       } catch (error) {
         Alert.alert("Ошибка", "Не удалось сохранить запись.");
       }
    }
    triggerHaptic('success');
    cancelWalkTimerNotification();
    clearWalkTimer();
    setSeconds(0);
  };

  const handleManualSave = async () => {
    if (manualEnd.getTime() <= manualStart.getTime()) {
      return;
    }
    const durationSeconds = Math.floor((manualEnd.getTime() - manualStart.getTime()) / 1000);
    
    try {
      await database.write(async () => {
        await database.get<Walk>('walks').create(walk => {
          walk.duration_seconds = durationSeconds;
          walk.location = location;
          walk.weather = weather;
          walk.notes = notes.trim() || undefined;
          walk.created_at = manualStart.getTime();
          walk.recorded_by = activeParent;
        });
      });
      triggerHaptic('success');
      setNotes('');
      setManualStart(new Date());
      setManualEnd(new Date());
    } catch (error) {
      Alert.alert("Ошибка", "Не удалось сохранить запись.");
    }
  };

  const handleDeleteRecord = (record: Walk) => {
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
    const d = new Date(safeTime(ms));
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  const getLoc = (l: string) => LOCATIONS.find(x => x.id === l) || LOCATIONS[0];
  const getW = (w: string) => WEATHERS.find(x => x.id === w) || WEATHERS[0];
  
  const sortedWalks = [...walks].sort((a,b) => b.created_at - a.created_at);

  return (
    <Wrapper flex={1} bg="background">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <ScreenHeader title="Прогулка" />

        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 40) }}>

        {/* Input Card */}
        <Surface variant="elevated" radius="xl" p={20} mb={20}>
          <Typography variant="h4" weight="black" mb={16}>Новая запись</Typography>
          
          <Wrapper mb={24}>
            <SegmentedControl
              items={MODE_ITEMS}
              selected={mode}
              onChange={(k) => setMode(k as 'timer' | 'manual')}
              tone="green"
            />
          </Wrapper>

          {isRunning && (
            <Surface tone="success" radius="md" p={16} mb={20}>
              <Wrapper dir="row" align="center" justify="space-between">
                <Wrapper dir="row" align="center" gap={10}>
                  <Wrapper width={10} height={10} bg="#4ADE80" style={{ borderRadius: 5, borderWidth: 2, borderColor: 'white' }} />
                  <Typography variant="tiny" weight="extraBold" color="white">Прогулка идёт</Typography>
                </Wrapper>
                <Typography variant="h4" weight="black" color="white">{fmt(seconds)}</Typography>
              </Wrapper>
            </Surface>
          )}

          {mode === 'timer' ? (
            <Wrapper align="center" mb={24}>
              <Typography variant="caption" weight="extraBold" color="#059669" uppercase mb={8}>Таймер прогулки</Typography>
              <Typography variant="h1" weight="black" letterSpacing={-2} style={{ fontSize: 64 }}>{fmt(seconds)}</Typography>
              <Typography variant="tiny" weight="bold" color="textMuted" mt={12}>{isRunning ? "⏺ Запись активна..." : "Нажмите начать, когда выйдете"}</Typography>
              {!isRunning && (
                <Wrapper mt={16} align="center" width="100%">
                  <Typography variant="caption" weight="extraBold" color="textMuted" uppercase mb={6}>Начать с времени:</Typography>
                  <Surface onPress={() => setShowTimerStartPicker(true)} tone="transparent" variant="flat" radius="sm" py={10} px={20} bg="#F4F4F8">
                    <Typography variant="body" weight="extraBold">{timerStartInput.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</Typography>
                  </Surface>
                    <DateTimePickerModal visible={showTimerStartPicker} value={timerStartInput} mode="time" is24Hour onChange={(d) => { if(d) setTimerStartInput(d); }} onClose={() => setShowTimerStartPicker(false)} />
                </Wrapper>
              )}
            </Wrapper>
          ) : (
            <Wrapper dir="row" gap={12} mb={24}>
              <Wrapper flex={1}>
                <Typography variant="caption" weight="extraBold" color="#059669" uppercase mb={8}>Начали</Typography>
                <Surface onPress={() => setShowStartPicker(true)} tone="transparent" variant="flat" radius="md" p={16} bg="#F4F4F8">
                  <Typography variant="body" weight="extraBold">{manualStart.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</Typography>
                </Surface>
                <DateTimePickerModal visible={showStartPicker} value={manualStart} mode="time" is24Hour onChange={(d) => { if(d) setManualStart(d); }} onClose={() => setShowStartPicker(false)} />
              </Wrapper>
              <Wrapper flex={1}>
                <Typography variant="caption" weight="extraBold" color="#059669" uppercase mb={8}>Закончили</Typography>
                <Surface onPress={() => setShowEndPicker(true)} tone="transparent" variant="flat" radius="md" p={16} bg="#F4F4F8">
                  <Typography variant="body" weight="extraBold">{manualEnd.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</Typography>
                </Surface>
                <DateTimePickerModal visible={showEndPicker} value={manualEnd} mode="time" is24Hour onChange={(d) => { if(d) setManualEnd(d); }} onClose={() => setShowEndPicker(false)} />
              </Wrapper>
            </Wrapper>
          )}

          <Typography variant="tiny" weight="bold" color="textMuted" mb={8}>Место прогулки</Typography>
          <Wrapper mb={16}>
            <ChipGroup items={LOCATION_CHIPS} selected={location} onChange={setLocation} tone="green" />
          </Wrapper>

          <Typography variant="tiny" weight="bold" color="textMuted" mb={8}>Погода</Typography>
          <Wrapper mb={16}>
            <ChipGroup items={WEATHER_CHIPS} selected={weather} onChange={setWeather} tone="primary" />
          </Wrapper>

          <Wrapper mb={20}>
            <FormField label="Заметки (необязательно)" value={notes} onChangeText={setNotes} placeholder="Малыш улыбался солнцу..." multiline />
          </Wrapper>

          <Wrapper dir="row" gap={12}>
            {mode === 'timer' && (
              <Wrapper flex={0.8}>
                <Button variant="solid" tone="surface" size="lg" fullWidth onPress={() => { cancelWalkTimerNotification(); clearWalkTimer(); setSeconds(0); }}>
                  Сброс
                </Button>
              </Wrapper>
            )}

            {mode === 'timer' ? (
              isRunning ? (
                <Wrapper flex={2}>
                  <Button variant="solid" tone="danger" size="lg" fullWidth onPress={handleStopSave}>Остановить</Button>
                </Wrapper>
              ) : (
                <Wrapper flex={2}>
                  <Button variant="solid" tone="success" size="lg" fullWidth onPress={handleStartTimer} leftIcon={<Ionicons name="play" size={16} color="white" />}>
                    Начать прогулку
                  </Button>
                </Wrapper>
              )
            ) : (
              <Wrapper flex={1}>
                <Button
                  variant="solid"
                  tone={manualEnd.getTime() <= manualStart.getTime() ? 'neutral' : 'success'}
                  size="lg"
                  fullWidth
                  disabled={manualEnd.getTime() <= manualStart.getTime()}
                  onPress={handleManualSave}
                >
                  Сохранить
                </Button>
              </Wrapper>
            )}
          </Wrapper>
        </Surface>

        {/* History */}
        <Surface variant="elevated" radius="xl" p={20}>
          <Typography variant="body" weight="black" mb={16}>История прогулок</Typography>
          
          {sortedWalks.length === 0 ? (
            <EmptyState emoji="🌤️" title="Прогулок пока нет" subtitle="Запишите первую прогулку выше" />
          ) : (
            <Wrapper gap={12}>
              {sortedWalks.map(w => {
                const renderRightActions = () => (
                  <Wrapper dir="row" width={140}>
                    <Surface onPress={() => setEditTarget({ kind: 'walk', record: w })} tone="success" radius="none" flex={1} align="center" justify="center">
                      <Ionicons name="pencil" size={20} color="white" />
                      <Typography variant="caption" weight="extraBold" color="white" mt={4}>Изменить</Typography>
                    </Surface>
                    <Surface onPress={() => handleDeleteRecord(w as Walk)} tone="danger" radius="none" flex={1} align="center" justify="center" style={{ borderTopRightRadius: 14, borderBottomRightRadius: 14 }}>
                      <Ionicons name="trash" size={20} color="white" />
                      <Typography variant="caption" weight="extraBold" color="white" mt={4}>Удалить</Typography>
                    </Surface>
                  </Wrapper>
                );

                return (
                 <Wrapper key={w.id} mb={0} bg="#F5F0E6" overflow="hidden" radius="md">
                  <Swipeable renderRightActions={renderRightActions} friction={2} rightThreshold={40}>
                    <Wrapper dir="row" align="center" bg="#F5F0E6" p={12} radius="md">
                      <Wrapper mr={12}>
                        <IconCircle size="md" bg="#DBEAFE">
                          <Ionicons name={getLoc(w.location).icon as any} size={22} color={getLoc(w.location).color} />
                        </IconCircle>
                      </Wrapper>
                      <Wrapper flex={1}>
                        <Wrapper dir="row" align="center" wrap="wrap" gap={6}>
                          <Typography variant="tiny" weight="black">{fmtDur(w.duration_seconds)}</Typography>
                          <StatusBadge label={getLoc(w.location).label} tone="success" />
                          <Ionicons name={getW(w.weather).icon as any} size={14} color={getW(w.weather).color} />
                        </Wrapper>
                        {w.notes && <Typography variant="caption" weight="bold" color="textMuted" mt={4} numberOfLines={1}>{w.notes}</Typography>}
                      </Wrapper>
                      <Wrapper align="flex-end" justify="center">
                        <Typography variant="caption" weight="extraBold" color="textMuted">{fmtTime(w.created_at)}</Typography>
                        <Typography variant="caption" weight="extraBold" color="textMuted" mt={2}>{fmtTime(safeTime(w.created_at) + w.duration_seconds * 1000)}</Typography>
                      </Wrapper>
                    </Wrapper>
                  </Swipeable>
                 </Wrapper>
                );
              })}
            </Wrapper>
          )}
        </Surface>

      </ScrollView>
      <EditRecordModal target={editTarget} onClose={() => setEditTarget(null)} />
      </KeyboardAvoidingView>
    </Wrapper>
  );
}

const enhance = withObservables([], () => ({
  walks: database.collections.get<Walk>('walks').query().observe(),
}));

export default enhance(WalkScreenContent);
