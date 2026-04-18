
/**
 * FAB — Floating Action Button with expandable quick-action menu.
 * 
 * Shows a floating button that expands into 3 quick-add options:
 * Feeding, Diaper, Sleep — each opens a bottom sheet for input.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, TouchableOpacity, Animated, ViewStyle,
  Modal, Alert, Platform, ScrollView, KeyboardAvoidingView,
  Keyboard, Animated as RNAnimated,
} from 'react-native';
import { Plus, X, Check, Moon, Milk, Droplets, Droplet, CloudRain, Cloud, Play, Square, Utensils } from 'lucide-react-native';
import DateTimePickerModal from './DateTimePickerModal';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { database } from '../db';
import { Feeding } from '../db/models/Feeding';
import { Diaper } from '../db/models/Diaper';
import { Sleep } from '../db/models/Sleep';
import { useAuthStore } from '../store/authStore';
import { useTimerStore } from '../store/timerStore';
import { startFeedingTimerNotification, cancelFeedingTimerNotification } from '../lib/timerNotifications';
import { triggerHaptic } from '../utils/haptics';

import { Wrapper } from './ui/Wrapper';
import { Typography } from './ui/Typography';
import { Surface } from './ui/Surface';
import { Button } from './ui/Button';
import { IconCircle } from './IconCircle';
import { FormField } from './FormField';
import { SegmentedControl } from './SegmentedControl';
import { COLORS, SHADOWS, RADIUS, FONTS } from '../lib/theme';

type ActiveSheet = 'feeding' | 'diaper' | 'sleep' | null;

/* ── Internal ViewStyle constants (animation/position) ── */
const backdropStyle: ViewStyle = {
  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(250,251,252,0.85)', zIndex: 50,
};

const fabItemBtnStyle: ViewStyle = {
  flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  width: 66, height: 66, borderRadius: 33, borderWidth: 2,
  shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.15, shadowRadius: 16, elevation: 6,
};

const fabStyle: ViewStyle = {
  position: 'absolute', right: 16, width: 64, height: 64, borderRadius: 32,
  backgroundColor: '#3DBFAA', borderWidth: 4, borderColor: '#FFFFFF',
  alignItems: 'center', justifyContent: 'center', zIndex: 52,
  shadowColor: 'rgba(61,191,170,0.45)', shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.4, shadowRadius: 20, elevation: 10,
};

const fabActiveStyle: ViewStyle = { backgroundColor: '#2DA08E', borderColor: '#FFFFFF' };

const sheetOverlayStyle: ViewStyle = {
  flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(30,27,75,0.4)',
};

const sheetStyle: ViewStyle = {
  backgroundColor: COLORS.card, borderTopLeftRadius: 40, borderTopRightRadius: 40,
  padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  borderWidth: 2, borderColor: '#E2E8F0', borderBottomWidth: 0,
};

const handleStyle: ViewStyle = {
  width: 48, height: 6, borderRadius: 4, backgroundColor: '#CBD5E1',
  alignSelf: 'center', marginBottom: 24,
};

const sheetIconStyle: ViewStyle = {
  width: 52, height: 52, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
  borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
};

const diaperOptionStyle: ViewStyle = {
  flex: 1, alignItems: 'center', gap: 8, padding: 14, borderRadius: 20, borderWidth: 3,
};

const saveBtnStyle: ViewStyle = {
  flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  gap: 8, paddingVertical: 18, borderRadius: 24, borderWidth: 2,
  borderColor: 'rgba(255,255,255,0.3)', shadowColor: '#000',
  shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15,
  shadowRadius: 16, elevation: 6,
};

const stepperBtnStyle: ViewStyle = {
  width: 56, height: 56, borderRadius: 28, backgroundColor: '#DBEAFE',
  borderWidth: 1, borderColor: '#BFDBFE', alignItems: 'center', justifyContent: 'center',
  shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.1, shadowRadius: 8, elevation: 2,
};

const FEEDING_TABS = [
  { key: 'breast', label: 'Грудное' },
  { key: 'formula', label: 'Смесь' },
  { key: 'solid', label: 'Прикорм' },
];

const FAB = () => {
  const session = useAuthStore(state => state.session);
  const activeParent = useAuthStore(state => state.activeParent);
  const navigation = useNavigation<NavigationProp<any>>();
  const insets = useSafeAreaInsets();
  const tabBarHeight = 60 + insets.bottom;
  const fabBottom = tabBarHeight + 16;
  const [expanded, setExpanded] = useState(false);
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null);
  const scaleAnim = useRef(new Animated.Value(0)).current;

  // Manual keyboard tracking for Android
  const fabKeyboardPadding = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      if (activeSheet) {
        RNAnimated.timing(fabKeyboardPadding, {
          toValue: e.endCoordinates.height,
          duration: 250,
          useNativeDriver: false,
        }).start();
      }
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      RNAnimated.timing(fabKeyboardPadding, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [activeSheet]);

  // Global Timer store
  const { feedingConfig, setFeedingConfig, clearFeedingTimer } = useTimerStore();

  // Common state
  const [logDate, setLogDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Feeding state
  const [feedingType, setFeedingType] = useState<'breast' | 'formula' | 'solid'>('breast');
  const [formulaBrand, setFormulaBrand] = useState('Nan Optipro');
  const [formulaVolume, setFormulaVolume] = useState('120');
  
  const [secondsL, setSecondsL] = useState(feedingConfig.accumulatedLeftSeconds);
  const [secondsR, setSecondsR] = useState(feedingConfig.accumulatedRightSeconds);
  const intervalLRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const intervalRRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [solidProduct, setSolidProduct] = useState('');
  const [solidVolume, setSolidVolume] = useState('80');

  // Diaper state
  const [diaperType, setDiaperType] = useState<'wet' | 'dirty' | 'both'>('wet');
  const [diaperColor, setDiaperColor] = useState('');
  const [diaperNote, setDiaperNote] = useState('');

  // Sleep state
  const [sleepMinutes, setSleepMinutes] = useState('60');
  const [sleepTimerRunning, setSleepTimerRunning] = useState(false);
  const [sleepSeconds, setSleepSeconds] = useState(0);
  const [showManualSleep, setShowManualSleep] = useState(false);
  const sleepIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync state if stopped from background
  useEffect(() => {
    if (!feedingConfig.leftRunning) setSecondsL(feedingConfig.accumulatedLeftSeconds);
    if (!feedingConfig.rightRunning) setSecondsR(feedingConfig.accumulatedRightSeconds);
  }, [feedingConfig.leftRunning, feedingConfig.rightRunning, feedingConfig.accumulatedLeftSeconds, feedingConfig.accumulatedRightSeconds]);

  // Timers UI ticking
  useEffect(() => {
    if (feedingConfig.leftRunning) {
      intervalLRef.current = setInterval(() => {
        const elapsed = feedingConfig.lastLeftStart ? Math.floor((Date.now() - feedingConfig.lastLeftStart)/1000) : 0;
        setSecondsL(feedingConfig.accumulatedLeftSeconds + elapsed);
      }, 1000);
    } else if (intervalLRef.current) clearInterval(intervalLRef.current);
    return () => { if (intervalLRef.current) clearInterval(intervalLRef.current); };
  }, [feedingConfig.leftRunning, feedingConfig.lastLeftStart, feedingConfig.accumulatedLeftSeconds]);

  useEffect(() => {
    if (feedingConfig.rightRunning) {
      intervalRRef.current = setInterval(() => {
        const elapsed = feedingConfig.lastRightStart ? Math.floor((Date.now() - feedingConfig.lastRightStart)/1000) : 0;
        setSecondsR(feedingConfig.accumulatedRightSeconds + elapsed);
      }, 1000);
    } else if (intervalRRef.current) clearInterval(intervalRRef.current);
    return () => { if (intervalRRef.current) clearInterval(intervalRRef.current); };
  }, [feedingConfig.rightRunning, feedingConfig.lastRightStart, feedingConfig.accumulatedRightSeconds]);

  useEffect(() => {
    if (sleepTimerRunning) {
      sleepIntervalRef.current = setInterval(() => setSleepSeconds(s => s + 1), 1000);
    } else if (sleepIntervalRef.current) {
      clearInterval(sleepIntervalRef.current);
    }
    return () => { if (sleepIntervalRef.current) clearInterval(sleepIntervalRef.current); };
  }, [sleepTimerRunning]);

  const toggleExpand = () => {
    triggerHaptic('light');
    const toValue = expanded ? 0 : 1;
    setExpanded(!expanded);
    Animated.spring(scaleAnim, { toValue, useNativeDriver: true, friction: 6, tension: 80 }).start();
  };

  const openSheet = (type: ActiveSheet) => {
    setExpanded(false);
    Animated.timing(scaleAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start();
    setLogDate(new Date());
    setActiveSheet(type);
  };

  const closeSheet = () => setActiveSheet(null);

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const formatDate = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + date.toLocaleDateString();
  };

  const toggleLeftBreastTimer = async () => {
    const isNowRunning = !feedingConfig.leftRunning;
    const sessionStart = feedingConfig.sessionStart || Date.now();
    
    if (isNowRunning) {
      setFeedingConfig({ leftRunning: true, lastLeftStart: Date.now(), sessionStart });
      await startFeedingTimerNotification(
        feedingConfig.accumulatedLeftSeconds + feedingConfig.accumulatedRightSeconds,
        sessionStart, true, feedingConfig.rightRunning
      );
    } else {
      const elapsed = feedingConfig.lastLeftStart ? Math.floor((Date.now() - feedingConfig.lastLeftStart)/1000) : 0;
      const newAcc = feedingConfig.accumulatedLeftSeconds + elapsed;
      setFeedingConfig({ leftRunning: false, lastLeftStart: null, accumulatedLeftSeconds: newAcc });
      setSecondsL(newAcc);
      if (feedingConfig.rightRunning) {
        await startFeedingTimerNotification(newAcc + feedingConfig.accumulatedRightSeconds, sessionStart, false, true);
      } else {
        await cancelFeedingTimerNotification();
      }
    }
  };

  const toggleRightBreastTimer = async () => {
    const isNowRunning = !feedingConfig.rightRunning;
    const sessionStart = feedingConfig.sessionStart || Date.now();
    
    if (isNowRunning) {
      setFeedingConfig({ rightRunning: true, lastRightStart: Date.now(), sessionStart });
      await startFeedingTimerNotification(
        feedingConfig.accumulatedLeftSeconds + feedingConfig.accumulatedRightSeconds,
        sessionStart, feedingConfig.leftRunning, true
      );
    } else {
      const elapsed = feedingConfig.lastRightStart ? Math.floor((Date.now() - feedingConfig.lastRightStart)/1000) : 0;
      const newAcc = feedingConfig.accumulatedRightSeconds + elapsed;
      setFeedingConfig({ rightRunning: false, lastRightStart: null, accumulatedRightSeconds: newAcc });
      setSecondsR(newAcc);
      if (feedingConfig.leftRunning) {
        await startFeedingTimerNotification(feedingConfig.accumulatedLeftSeconds + newAcc, sessionStart, true, false);
      } else {
        await cancelFeedingTimerNotification();
      }
    }
  };

  // ── Save handlers ──
  const handleSaveFeeding = async () => {
    if (!session?.user.id) return;
    try {
      await database.write(async () => {
        await database.get<Feeding>('feedings').create(f => {
          f.type = feedingType;
          f.recorded_by = activeParent;
          f.created_at = logDate.getTime();
          
          if (feedingType === 'breast') {
            const totalSecs = secondsL + secondsR;
            const parts = [];
            if (secondsL > 0) parts.push(`лев. ${fmt(secondsL)}`);
            if (secondsR > 0) parts.push(`прав. ${fmt(secondsR)}`);
            f.duration_seconds = totalSecs > 0 ? totalSecs : 1;
            f.description = parts.length > 0 ? `Грудь (${parts.join(", ")})` : `Грудь`;
            f.breast_side = 'Л';
          } else if (feedingType === 'formula') {
            const vol = parseInt(formulaVolume) || 120;
            f.formula_brand = formulaBrand;
            f.formula_volume_ml = vol;
            f.description = `Смесь (${vol}мл, ${formulaBrand})`;
          } else {
            const prod = solidProduct.trim() || 'Прикорм';
            const vol = parseInt(solidVolume) || 80;
            f.solid_product = prod;
            f.solid_volume_g = vol;
            f.description = `${prod} (${vol}г)`;
          }
        });
      });
      setSolidProduct('');
      setSecondsL(0); setSecondsR(0);
      clearFeedingTimer();
      await cancelFeedingTimerNotification();
      closeSheet();
      triggerHaptic('success');
    } catch (e) {
      if (__DEV__) console.warn("handleSaveFeeding error:", e);
    }
  };

  const handleSaveDiaper = async () => {
    if (!session?.user.id) return;
    try {
      await database.write(async () => {
        await database.get<Diaper>('diapers').create(d => {
          d.type = diaperType;
          d.color = diaperColor || undefined;
          d.note = diaperNote || undefined;
          d.recorded_by = activeParent;
          d.created_at = logDate.getTime();
        });
      });
      setDiaperNote('');
      setDiaperColor('');
      closeSheet();
      triggerHaptic('success');
    } catch (e) {
      if (__DEV__) console.warn("handleSaveDiaper error:", e);
    }
  };

  const handleSaveSleep = async () => {
    if (!session?.user.id) return;
    const secs = showManualSleep ? (parseInt(sleepMinutes) || 60) * 60 : sleepSeconds;
    if (secs === 0) { closeSheet(); return; }
    
    try {
      await database.write(async () => {
        await database.get<Sleep>('sleeps').create(s => {
          s.duration_seconds = secs;
          s.location = 'crib';
          s.quality = 0;
          s.recorded_by = activeParent;
          s.created_at = logDate.getTime();
        });
      });
      setSleepSeconds(0);
      setSleepTimerRunning(false);
      setShowManualSleep(false);
      closeSheet();
      triggerHaptic('success');
    } catch (e) {
      if (__DEV__) console.warn("handleSaveSleep error:", e);
    }
  };

  const fabItems = [
    { type: 'feeding' as const, label: 'Кормление', icon: Milk, color: '#2563EB', bg: '#EFF6FF' },
    { type: 'diaper' as const, label: 'Подгузник', icon: Droplets, color: '#059669', bg: '#ECFDF5' },
    { type: 'sleep' as const, label: 'Сон', icon: Moon, color: '#8B5CF6', bg: '#F3E8FF' },
  ];

  const renderInlineIOSPicker = (colorHex: string, bgColorHex: string) => {
    if (Platform.OS !== 'ios' || !showDatePicker) return null;
    return (
      <Wrapper mt={8}>
        <DateTimePicker
          value={logDate}
          mode="time"
          is24Hour={true}
          display="spinner"
          textColor={COLORS.foreground}
          onChange={(e, d) => { if (d) setLogDate(d); }}
          style={{ height: 150 }}
        />
        <Surface onPress={() => setShowDatePicker(false)} tone="transparent" radius="sm" px={20} py={8} bg={bgColorHex} style={{ alignSelf: 'center', marginTop: 4 }}>
          <Typography variant="tiny" weight="extraBold" color={colorHex}>Готово</Typography>
        </Surface>
      </Wrapper>
    );
  };

  // ── Sheet content ──
  const renderSheetContent = () => (
    <>
      {activeSheet === 'feeding' && (
        <Wrapper>
          <Wrapper dir="row" align="center" gap={14} mb={24}>
            <View style={[sheetIconStyle, { backgroundColor: '#EDE4F8' }]}>
              <Milk size={22} color="#8B6FD4" strokeWidth={1.5} />
            </View>
            <Typography variant="h2" weight="black">Новое кормление</Typography>
          </Wrapper>

          <Wrapper mb={20}>
            <SegmentedControl
              items={FEEDING_TABS}
              selected={feedingType}
              onChange={(k) => setFeedingType(k as any)}
            />
          </Wrapper>

          <Wrapper mb={20}>
            <Typography variant="caption" weight="extraBold" color="textMuted" uppercase letterSpacing={0.8} mb={8}>Время</Typography>
            <Surface onPress={() => setShowDatePicker(true)} tone="transparent" radius="xl" p={16} bg="#F1F5F9" style={{ borderWidth: 1, borderColor: '#E2E8F0' }}>
              <Typography variant="body" weight="bold">{formatDate(logDate)}</Typography>
            </Surface>
            {renderInlineIOSPicker('#2563EB', '#EFF6FF')}
          </Wrapper>

          {feedingType === 'breast' && (
            <Wrapper dir="row" gap={12} mb={20}>
              {[
                { side: 'Л', label: 'Левая грудь', seconds: secondsL, running: feedingConfig.leftRunning, toggle: toggleLeftBreastTimer },
                { side: 'П', label: 'Правая грудь', seconds: secondsR, running: feedingConfig.rightRunning, toggle: toggleRightBreastTimer }
              ].map(({ side, label, seconds, running, toggle }) => (
                <Surface key={side} variant="outlined" radius="md" p={16} flex={1} align="center" style={{ borderColor: running ? '#5B9BD5' : '#E0DDD8' }}>
                  <Typography variant="caption" weight="extraBold" color="#5B9BD5" uppercase mb={8}>{label}</Typography>
                  <Typography variant="h1" weight="black" color={running ? '#5B9BD5' : COLORS.foreground} mb={16} style={{ fontSize: 32 }}>
                    {fmt(seconds)}
                  </Typography>
                  <Surface onPress={toggle} tone="transparent" radius="sm" py={10} bg={running ? '#E05A5A' : '#E8DEFF'} style={{ width: '100%', alignItems: 'center' }}>
                    <Typography variant="tiny" weight="extraBold" color={running ? 'white' : COLORS.foreground}>
                      {running ? 'Стоп' : 'Старт'}
                    </Typography>
                  </Surface>
                </Surface>
              ))}
            </Wrapper>
          )}

          {feedingType === 'formula' && (
            <Wrapper>
              <Wrapper mb={20}>
                <FormField label="Бренд смеси" value={formulaBrand} onChangeText={setFormulaBrand} placeholder="Nan Optipro..." />
              </Wrapper>
              <Wrapper mb={20}>
                <FormField label="Объём (мл)" value={formulaVolume} onChangeText={setFormulaVolume} keyboardType="number-pad" placeholder="120" />
              </Wrapper>
            </Wrapper>
          )}

          {feedingType === 'solid' && (
            <Wrapper>
              <Wrapper mb={20}>
                <FormField label="Продукт" value={solidProduct} onChangeText={setSolidProduct} placeholder="Каша овсяная" />
              </Wrapper>
              <Wrapper mb={20}>
                <FormField label="Количество (г)" value={solidVolume} onChangeText={setSolidVolume} keyboardType="number-pad" placeholder="80" />
              </Wrapper>
            </Wrapper>
          )}

          <TouchableOpacity style={[saveBtnStyle, { backgroundColor: '#5B9BD5' }]} onPress={handleSaveFeeding}>
            <Check size={20} color="white" strokeWidth={2.5} />
            <Typography variant="body" weight="black" color="white">Сохранить</Typography>
          </TouchableOpacity>
        </Wrapper>
      )}

      {activeSheet === 'diaper' && (
        <Wrapper>
          <Wrapper dir="row" align="center" gap={14} mb={24}>
            <View style={[sheetIconStyle, { backgroundColor: '#D4F3EC' }]}>
              <Droplets size={22} color="#3DBFAA" strokeWidth={1.5} />
            </View>
            <Typography variant="h2" weight="black">Подгузник</Typography>
          </Wrapper>

          <Wrapper dir="row" gap={10} mb={16}>
            {([
              { id: 'wet' as const, label: 'Мокрый', IconComp: Droplet, color: '#4E8FD4', bg: '#DEEAF8' },
              { id: 'both' as const, label: 'Смешан.', IconComp: CloudRain, color: '#8B6FD4', bg: '#EDE4F8' },
              { id: 'dirty' as const, label: 'Грязный', IconComp: Cloud, color: '#E69600', bg: '#FFF0CC' },
            ]).map(t => (
              <TouchableOpacity
                key={t.id}
                style={[diaperOptionStyle, {
                  backgroundColor: diaperType === t.id ? t.bg : 'white',
                  borderColor: diaperType === t.id ? t.color : '#E2E8F0',
                }]}
                onPress={() => setDiaperType(t.id)}
              >
                <IconCircle bg={t.bg} radius={22}>
                  <t.IconComp size={18} color={t.color} strokeWidth={1.5} />
                </IconCircle>
                <Typography variant="tiny" weight="extraBold" color={diaperType === t.id ? t.color : COLORS.foreground}>
                  {t.label}
                </Typography>
              </TouchableOpacity>
            ))}
          </Wrapper>

          <Wrapper mb={20}>
            <Typography variant="caption" weight="extraBold" color="textMuted" uppercase letterSpacing={0.8} mb={8}>Время</Typography>
            <Surface onPress={() => setShowDatePicker(true)} tone="transparent" radius="xl" p={16} bg="#F1F5F9" style={{ borderWidth: 1, borderColor: '#E2E8F0' }}>
              <Typography variant="body" weight="bold">{formatDate(logDate)}</Typography>
            </Surface>
            {renderInlineIOSPicker('#059669', '#ECFDF5')}
          </Wrapper>

          <Wrapper mb={20}>
            <FormField label="Цвет / консистенция" value={diaperColor} onChangeText={setDiaperColor} placeholder="Жёлтый – жидкий (норма)..." />
          </Wrapper>
          <Wrapper mb={20}>
            <FormField label="Заметка" value={diaperNote} onChangeText={setDiaperNote} placeholder="Раздражение кожи..." multiline />
          </Wrapper>

          <TouchableOpacity style={[saveBtnStyle, { backgroundColor: '#4DBFAA' }]} onPress={handleSaveDiaper}>
            <Check size={20} color="white" strokeWidth={2.5} />
            <Typography variant="body" weight="black" color="white">Сохранить</Typography>
          </TouchableOpacity>
        </Wrapper>
      )}

      {activeSheet === 'sleep' && (
        <Wrapper>
          <Wrapper dir="row" align="center" gap={14} mb={24}>
            <View style={[sheetIconStyle, { backgroundColor: '#DEEAF8' }]}>
              <Moon size={22} color="#4E8FD4" strokeWidth={1.5} />
            </View>
            <Typography variant="h2" weight="black">Новый сон</Typography>
          </Wrapper>

          {!showManualSleep ? (
            <>
              <Wrapper align="center" mb={20}>
                <Typography variant="h1" weight="black" color="#8B6FD4" style={{ fontSize: 64 }}>{fmt(sleepSeconds)}</Typography>
                <Typography variant="tiny" weight="semiBold" color="textMuted" mt={4}>
                  {sleepTimerRunning ? 'Сон идёт...' : 'Готов к запуску'}
                </Typography>
              </Wrapper>
              <TouchableOpacity
                style={[saveBtnStyle, { backgroundColor: sleepTimerRunning ? '#D94F4F' : '#8B6FD4' }]}
                onPress={() => { if (sleepTimerRunning) { setSleepTimerRunning(false); handleSaveSleep(); } else { setSleepSeconds(0); setSleepTimerRunning(true); } }}
              >
                {sleepTimerRunning ? <Square size={20} color="white" strokeWidth={2.5} /> : <Play size={20} color="white" strokeWidth={2.5} />}
                <Typography variant="body" weight="black" color="white">
                  {sleepTimerRunning ? 'Остановить и сохранить' : 'Начать сон'}
                </Typography>
              </TouchableOpacity>
              {!sleepTimerRunning && (
                <TouchableOpacity
                  style={[saveBtnStyle, { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', marginTop: 12 }]}
                  onPress={() => setShowManualSleep(true)}
                >
                  <Typography variant="body" weight="black" color="textMuted">Ввести время вручную</Typography>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <>
              <Wrapper mb={20}>
                <Typography variant="caption" weight="extraBold" color="textMuted" uppercase letterSpacing={0.8} mb={8}>Время начала</Typography>
                <Surface onPress={() => setShowDatePicker(true)} tone="transparent" radius="xl" p={16} bg="#F1F5F9" style={{ borderWidth: 1, borderColor: '#E2E8F0' }}>
                  <Typography variant="body" weight="bold">{formatDate(logDate)}</Typography>
                </Surface>
                {renderInlineIOSPicker('#8B5CF6', '#F3E8FF')}
              </Wrapper>
              <Wrapper mb={20}>
                <Typography variant="caption" weight="extraBold" color="textMuted" uppercase letterSpacing={0.8} mb={8}>Длительность (мин)</Typography>
                <Wrapper dir="row" align="center" justify="center" gap={16} mb={16}>
                  <TouchableOpacity style={stepperBtnStyle} onPress={() => setSleepMinutes(String(Math.max(5, (parseInt(sleepMinutes) || 60) - 5)))}>
                    <Typography variant="h2" weight="black" color="#2563EB">−</Typography>
                  </TouchableOpacity>
                  <Typography variant="h1" weight="black" style={{ fontSize: 56 }}>{sleepMinutes}</Typography>
                  <TouchableOpacity style={stepperBtnStyle} onPress={() => setSleepMinutes(String((parseInt(sleepMinutes) || 60) + 5))}>
                    <Typography variant="h2" weight="black" color="#2563EB">+</Typography>
                  </TouchableOpacity>
                </Wrapper>
                <Typography variant="tiny" weight="semiBold" color="textMuted" align="center" mb={12}>
                  {parseInt(sleepMinutes) || 0} минут = {Math.floor((parseInt(sleepMinutes) || 0) / 60)}ч {(parseInt(sleepMinutes) || 0) % 60}м
                </Typography>
              </Wrapper>
              <TouchableOpacity style={[saveBtnStyle, { backgroundColor: '#8B6FD4' }]} onPress={handleSaveSleep}>
                <Check size={20} color="white" strokeWidth={2.5} />
                <Typography variant="body" weight="black" color="white">Сохранить</Typography>
              </TouchableOpacity>
              <TouchableOpacity
                style={[saveBtnStyle, { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', marginTop: 12 }]}
                onPress={() => setShowManualSleep(false)}
              >
                <Typography variant="body" weight="black" color="textMuted">Назад к таймеру</Typography>
              </TouchableOpacity>
            </>
          )}
        </Wrapper>
      )}
    </>
  );

  // ── Sheet shell ──
  const renderSheetShell = () => (
    <TouchableOpacity style={sheetOverlayStyle} activeOpacity={1} onPress={closeSheet}>
      <View style={sheetStyle} onStartShouldSetResponder={() => true}>
        <Wrapper dir="row" align="center" justify="center" position="relative">
          <View style={handleStyle} />
          <Surface
            onPress={closeSheet}
            tone="transparent"
            radius="xl"
            width={36}
            height={36}
            align="center"
            justify="center"
            bg="#F1F5F9"
            style={{ position: 'absolute', right: 0, top: 0 }}
          >
            <X size={18} color="#64748B" strokeWidth={2} />
          </Surface>
        </Wrapper>
        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          style={Platform.OS === 'ios' ? { maxHeight: 520 } : undefined}
          keyboardShouldPersistTaps="handled"
        >
          {renderSheetContent()}
        </ScrollView>
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      {/* Expanded items */}
      {expanded && (
        <TouchableOpacity style={backdropStyle} activeOpacity={1} onPress={toggleExpand}>
          {fabItems.map((item, i) => {
            const getOffsets = (index: number) => {
              if (index === 0) return { tx: -65, ty: -160 };
              if (index === 1) return { tx: -25, ty: -90 };
              if (index === 2) return { tx: -105, ty: -90 };
              return { tx: 0, ty: 0 };
            };
            const { tx, ty } = getOffsets(i);
            const translateY = scaleAnim.interpolate({ inputRange: [0, 1], outputRange: [0, ty] });
            const translateX = scaleAnim.interpolate({ inputRange: [0, 1], outputRange: [0, tx] });
            const opacity = scaleAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] });

            return (
              <Animated.View key={item.type} style={[{ position: 'absolute', bottom: fabBottom, right: 16, zIndex: 51 }, { transform: [{ translateX }, { translateY }, { scale: scaleAnim }], opacity }]}>
                <TouchableOpacity
                  testID={`fab-item-${item.type}`}
                  style={[fabItemBtnStyle, { backgroundColor: item.bg, borderColor: item.color + '40' }]}
                  onPress={() => openSheet(item.type)}
                  activeOpacity={0.8}
                >
                  <item.icon size={24} color={item.color} strokeWidth={1.5} />
                  <Typography variant="caption" weight="black" color={item.color} style={{ fontSize: 9.5, marginTop: 2, letterSpacing: -0.2 }}>
                    {item.label}
                  </Typography>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </TouchableOpacity>
      )}

      {/* Main FAB button */}
      <TouchableOpacity
        testID="fab-main-button"
        style={[fabStyle, { bottom: fabBottom }, expanded && fabActiveStyle]}
        onPress={toggleExpand}
        activeOpacity={0.9}
      >
        <Animated.View style={{ transform: [{ rotate: scaleAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] }) }] }}>
          <Plus size={32} color="white" strokeWidth={2.5} />
        </Animated.View>
      </TouchableOpacity>

      {/* ── Bottom Sheet Modal ── */}
      <Modal visible={activeSheet !== null} transparent animationType="slide" onRequestClose={closeSheet}>
        {Platform.OS === 'ios' ? (
          <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
            {renderSheetShell()}
          </KeyboardAvoidingView>
        ) : (
          <RNAnimated.View style={{ flex: 1, paddingBottom: fabKeyboardPadding }}>
            {renderSheetShell()}
          </RNAnimated.View>
        )}
      </Modal>

      {/* Date picker — Android only uses modal */}
      {Platform.OS === 'android' && (
        <DateTimePickerModal
          visible={showDatePicker}
          value={logDate}
          mode="time"
          is24Hour={true}
          onChange={(selectedDate) => { if (selectedDate) setLogDate(selectedDate); }}
          onClose={() => setShowDatePicker(false)}
        />
      )}
    </>
  );
};

export default FAB;
