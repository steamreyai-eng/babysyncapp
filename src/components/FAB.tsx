
/**
 * FAB — Floating Action Button with expandable quick-action menu.
 * Port from web: FAB.tsx (399 lines)
 * 
 * Shows a floating button that expands into 3 quick-add options:
 * Feeding, Diaper, Sleep — each opens a bottom sheet for input.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Animated, StyleSheet,
  Modal, TextInput, Alert, Platform, ScrollView, KeyboardAvoidingView,
  Keyboard, Animated as RNAnimated,
} from 'react-native';
import { Plus, X, Check, Moon, Milk, Droplets, Droplet, CloudRain, Cloud, Play, Square, Utensils } from 'lucide-react-native';
import DateTimePickerModal from './DateTimePickerModal';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { database } from '../db';
import { Feeding } from '../db/models/Feeding';
import { Diaper } from '../db/models/Diaper';
import { Sleep } from '../db/models/Sleep';
import { useAuthStore } from '../store/authStore';
import { useTimerStore } from '../store/timerStore';
import { startFeedingTimerNotification, cancelFeedingTimerNotification } from '../lib/timerNotifications';
import { triggerHaptic } from '../utils/haptics';

type ActiveSheet = 'feeding' | 'diaper' | 'sleep' | null;

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

  // Manual keyboard tracking for Android (KeyboardAvoidingView broken inside Modal on Android)
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

  // Date formatting helper
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
            f.breast_side = 'Л'; // or calculate most used side
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
      <View style={{ marginTop: 8 }}>
        <DateTimePicker
          value={logDate}
          mode="time"
          is24Hour={true}
          display="spinner"
          textColor="#1A1A2E"
          onChange={(e, d) => { if (d) setLogDate(d); }}
          style={{ height: 150 }}
        />
        <TouchableOpacity onPress={() => setShowDatePicker(false)} style={{ alignSelf: 'center', backgroundColor: bgColorHex, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 12, marginTop: 4 }}>
          <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 14, color: colorHex }}>Готово</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ── Sheet content (shared between iOS and Android wrappers) ──
  const renderSheetContent = () => (
    <>
      {activeSheet === 'feeding' && (
        <View>
          <View style={styles.sheetHeader}>
            <View style={[styles.sheetIcon, { backgroundColor: '#EDE4F8' }]}>
              <Milk size={22} color="#8B6FD4" strokeWidth={1.5} />
            </View>
            <Text style={styles.sheetTitle}>Новое кормление</Text>
          </View>
          <View style={styles.typeTabs}>
            {([
              { id: 'breast' as const, label: 'Грудное' },
              { id: 'formula' as const, label: 'Смесь' },
              { id: 'solid' as const, label: 'Прикорм' },
            ]).map(t => (
              <TouchableOpacity key={t.id} style={[styles.typeTab, feedingType === t.id && styles.typeTabActive]} onPress={() => setFeedingType(t.id)}>
                <Text style={[styles.typeTabText, feedingType === t.id && { color: '#4E8FD4' }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Время</Text>
            <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A2E', fontFamily: 'Nunito_700Bold' }}>{formatDate(logDate)}</Text>
            </TouchableOpacity>
            {renderInlineIOSPicker('#2563EB', '#EFF6FF')}
          </View>
          {feedingType === 'breast' && (
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
              {[
                { side: 'Л', label: 'Левая грудь', seconds: secondsL, running: feedingConfig.leftRunning, toggle: toggleLeftBreastTimer },
                { side: 'П', label: 'Правая грудь', seconds: secondsR, running: feedingConfig.rightRunning, toggle: toggleRightBreastTimer }
              ].map(({ side, label, seconds, running, toggle }) => (
                <View key={side} style={{ flex: 1, padding: 16, backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: running ? '#5B9BD5' : '#E0DDD8', alignItems: 'center' }}>
                  <Text style={[styles.fieldLabel, { color: '#5B9BD5', marginBottom: 8 }]}>{label}</Text>
                  <Text style={{ fontSize: 32, fontWeight: '900', color: running ? '#5B9BD5' : '#1A1A2E', marginBottom: 16, fontFamily: 'Nunito_900Black' }}>{fmt(seconds)}</Text>
                  <TouchableOpacity style={{ width: '100%', paddingVertical: 10, borderRadius: 12, backgroundColor: running ? '#E05A5A' : '#E8DEFF', alignItems: 'center' }} onPress={toggle}>
                    <Text style={{ color: running ? 'white' : '#1A1A2E', fontSize: 14, fontWeight: '800', fontFamily: 'Nunito_800ExtraBold' }}>{running ? 'Стоп' : 'Старт'}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          {feedingType === 'formula' && (
            <>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Бренд смеси</Text>
                <TextInput style={styles.input} value={formulaBrand} onChangeText={setFormulaBrand} placeholder="Nan Optipro..." placeholderTextColor="#94A3B8" />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Объём (мл)</Text>
                <TextInput style={styles.input} value={formulaVolume} onChangeText={setFormulaVolume} keyboardType="number-pad" placeholder="120" placeholderTextColor="#94A3B8" />
              </View>
            </>
          )}
          {feedingType === 'solid' && (
            <>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Продукт</Text>
                <TextInput style={styles.input} value={solidProduct} onChangeText={setSolidProduct} placeholder="Каша овсяная" placeholderTextColor="#94A3B8" />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Количество (г)</Text>
                <TextInput style={styles.input} value={solidVolume} onChangeText={setSolidVolume} keyboardType="number-pad" placeholder="80" placeholderTextColor="#94A3B8" />
              </View>
            </>
          )}
          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#5B9BD5' }]} onPress={handleSaveFeeding}>
            <Check size={20} color="white" strokeWidth={2.5} />
            <Text style={styles.saveBtnText}>Сохранить</Text>
          </TouchableOpacity>
        </View>
      )}

      {activeSheet === 'diaper' && (
        <View>
          <View style={styles.sheetHeader}>
            <View style={[styles.sheetIcon, { backgroundColor: '#D4F3EC' }]}>
              <Droplets size={22} color="#3DBFAA" strokeWidth={1.5} />
            </View>
            <Text style={styles.sheetTitle}>Подгузник</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            {([
              { id: 'wet' as const, label: 'Мокрый', IconComp: Droplet, color: '#4E8FD4', bg: '#DEEAF8' },
              { id: 'both' as const, label: 'Смешан.', IconComp: CloudRain, color: '#8B6FD4', bg: '#EDE4F8' },
              { id: 'dirty' as const, label: 'Грязный', IconComp: Cloud, color: '#E69600', bg: '#FFF0CC' },
            ]).map(t => (
              <TouchableOpacity key={t.id} style={[styles.diaperOption, { backgroundColor: diaperType === t.id ? t.bg : 'white', borderColor: diaperType === t.id ? t.color : '#E2E8F0' }]} onPress={() => setDiaperType(t.id)}>
                <View style={[styles.diaperIcon, { backgroundColor: t.bg }]}>
                  <t.IconComp size={18} color={t.color} strokeWidth={1.5} />
                </View>
                <Text style={[styles.diaperLabel, { color: diaperType === t.id ? t.color : '#1A1A2E' }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Время</Text>
            <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A2E', fontFamily: 'Nunito_700Bold' }}>{formatDate(logDate)}</Text>
            </TouchableOpacity>
            {renderInlineIOSPicker('#059669', '#ECFDF5')}
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Цвет / консистенция</Text>
            <TextInput style={styles.input} value={diaperColor} onChangeText={setDiaperColor} placeholder="Жёлтый – жидкий (норма)..." placeholderTextColor="#94A3B8" />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Заметка</Text>
            <TextInput style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]} value={diaperNote} onChangeText={setDiaperNote} placeholder="Раздражение кожи..." placeholderTextColor="#94A3B8" multiline />
          </View>
          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#4DBFAA' }]} onPress={handleSaveDiaper}>
            <Check size={20} color="white" strokeWidth={2.5} />
            <Text style={styles.saveBtnText}>Сохранить</Text>
          </TouchableOpacity>
        </View>
      )}

      {activeSheet === 'sleep' && (
        <View>
          <View style={styles.sheetHeader}>
            <View style={[styles.sheetIcon, { backgroundColor: '#DEEAF8' }]}>
              <Moon size={22} color="#4E8FD4" strokeWidth={1.5} />
            </View>
            <Text style={styles.sheetTitle}>Новый сон</Text>
          </View>
          {!showManualSleep ? (
            <>
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <Text style={[styles.sleepBigNum, { fontSize: 64, color: '#8B6FD4' }]}>{fmt(sleepSeconds)}</Text>
                <Text style={{ fontSize: 14, color: '#6B6B80', marginTop: 4 }}>{sleepTimerRunning ? 'Сон идёт...' : 'Готов к запуску'}</Text>
              </View>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: sleepTimerRunning ? '#D94F4F' : '#8B6FD4' }]}
                onPress={() => { if (sleepTimerRunning) { setSleepTimerRunning(false); handleSaveSleep(); } else { setSleepSeconds(0); setSleepTimerRunning(true); } }}
              >
                {sleepTimerRunning ? <Square size={20} color="white" strokeWidth={2.5} /> : <Play size={20} color="white" strokeWidth={2.5} />}
                <Text style={styles.saveBtnText}>{sleepTimerRunning ? 'Остановить и сохранить' : 'Начать сон'}</Text>
              </TouchableOpacity>
              {!sleepTimerRunning && (
                <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', marginTop: 12 }]} onPress={() => setShowManualSleep(true)}>
                  <Text style={[styles.saveBtnText, { color: '#64748B' }]}>Ввести время вручную</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Время начала</Text>
                <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A2E', fontFamily: 'Nunito_700Bold' }}>{formatDate(logDate)}</Text>
                </TouchableOpacity>
                {renderInlineIOSPicker('#8B5CF6', '#F3E8FF')}
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Длительность (мин)</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 16 }}>
                  <TouchableOpacity style={styles.stepperBtn} onPress={() => setSleepMinutes(String(Math.max(5, (parseInt(sleepMinutes) || 60) - 5)))}>
                    <Text style={styles.stepperText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.sleepBigNum}>{sleepMinutes}</Text>
                  <TouchableOpacity style={styles.stepperBtn} onPress={() => setSleepMinutes(String((parseInt(sleepMinutes) || 60) + 5))}>
                    <Text style={styles.stepperText}>+</Text>
                  </TouchableOpacity>
                </View>
                <Text style={{ textAlign: 'center', fontSize: 12, color: '#6B6B80', marginBottom: 12 }}>
                  {parseInt(sleepMinutes) || 0} минут = {Math.floor((parseInt(sleepMinutes) || 0) / 60)}ч {(parseInt(sleepMinutes) || 0) % 60}м
                </Text>
              </View>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#8B6FD4' }]} onPress={handleSaveSleep}>
                <Check size={20} color="white" strokeWidth={2.5} />
                <Text style={styles.saveBtnText}>Сохранить</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', marginTop: 12 }]} onPress={() => setShowManualSleep(false)}>
                <Text style={[styles.saveBtnText, { color: '#64748B' }]}>Назад к таймеру</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </>
  );

  // ── Sheet shell (handle + close + scrollview) ──
  const renderSheetShell = () => (
    <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={closeSheet}>
      <View style={styles.sheet} onStartShouldSetResponder={() => true}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <View style={styles.handle} />
          <TouchableOpacity onPress={closeSheet} style={{ position: 'absolute', right: 0, top: 0, width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
            <X size={18} color="#64748B" strokeWidth={2} />
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} bounces={false} style={Platform.OS === 'ios' ? { maxHeight: 520 } : undefined} keyboardShouldPersistTaps="handled">
          {renderSheetContent()}
        </ScrollView>
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      {/* Expanded items */}
      {expanded && (
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={toggleExpand}>
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
              <Animated.View key={item.type} style={[styles.fabItem, { bottom: fabBottom, transform: [{ translateX }, { translateY }, { scale: scaleAnim }], opacity }]}>
                <TouchableOpacity testID={`fab-item-${item.type}`} style={[styles.fabItemBtn, { backgroundColor: item.bg, borderColor: item.color + '40' }]} onPress={() => openSheet(item.type)} activeOpacity={0.8}>
                  <item.icon size={24} color={item.color} strokeWidth={1.5} />
                  <Text style={[styles.fabItemLabel, { color: item.color }]}>{item.label}</Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </TouchableOpacity>
      )}

      {/* Main FAB button */}
      <TouchableOpacity testID="fab-main-button" style={[styles.fab, { bottom: fabBottom }, expanded && styles.fabActive]} onPress={toggleExpand} activeOpacity={0.9}>
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

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(250,251,252,0.85)', zIndex: 50 },
  fabItem: { position: 'absolute', bottom: 0, right: 16, zIndex: 51 },
  fabItemBtn: { flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 66, height: 66, borderRadius: 33, borderWidth: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 6 },
  fabItemLabel: { fontSize: 9.5, fontWeight: '900', fontFamily: 'Nunito_900Black', marginTop: 2, letterSpacing: -0.2 },
  fab: { position: 'absolute', right: 16, width: 64, height: 64, borderRadius: 32, backgroundColor: '#3DBFAA', borderWidth: 4, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', zIndex: 52, shadowColor: 'rgba(61,191,170,0.45)', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 10 },
  fabActive: { backgroundColor: '#2DA08E', borderColor: '#FFFFFF' },
  aiFab: { position: 'absolute', right: 16, height: 50, paddingHorizontal: 18, borderRadius: 25, borderWidth: 3, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, zIndex: 50, shadowColor: '#6366F1', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 8, overflow: 'hidden' },
  aiFabText: { color: 'white', fontSize: 14, fontFamily: 'Nunito_900Black', marginLeft: 2 },
  sheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(30,27,75,0.4)' },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, borderWidth: 2, borderColor: '#E2E8F0', borderBottomWidth: 0 },
  handle: { width: 48, height: 6, borderRadius: 4, backgroundColor: '#CBD5E1', alignSelf: 'center', marginBottom: 24 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 24 },
  sheetIcon: { width: 52, height: 52, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  sheetTitle: { fontSize: 24, fontWeight: '900', color: '#0F172A', fontFamily: 'Nunito_900Black' },
  typeTabs: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 20, padding: 6, marginBottom: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  typeTab: { flex: 1, paddingVertical: 12, borderRadius: 16, alignItems: 'center' },
  typeTabActive: { backgroundColor: '#FFFFFF', shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4, borderWidth: 1, borderColor: '#E2E8F0' },
  typeTabText: { fontSize: 13, fontWeight: '800', color: '#64748B', fontFamily: 'Nunito_800ExtraBold' },
  fieldGroup: { marginBottom: 20 },
  fieldLabel: { fontSize: 11, fontWeight: '800', color: '#64748B', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8, fontFamily: 'Nunito_800ExtraBold' },
  input: { backgroundColor: '#F1F5F9', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 16, paddingVertical: 16, fontSize: 16, fontWeight: '700', color: '#0F172A', fontFamily: 'Nunito_700Bold' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 18, borderRadius: 24, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 6 },
  saveBtnText: { color: 'white', fontSize: 16, fontWeight: '900', fontFamily: 'Nunito_900Black' },
  diaperOption: { flex: 1, alignItems: 'center', gap: 8, padding: 14, borderRadius: 20, borderWidth: 3 },
  diaperIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  diaperLabel: { fontSize: 12, fontWeight: '800', fontFamily: 'Nunito_800ExtraBold' },
  stepperBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#DBEAFE', borderWidth: 1, borderColor: '#BFDBFE', alignItems: 'center', justifyContent: 'center', shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2 },
  stepperText: { fontSize: 26, fontWeight: '900', color: '#2563EB', fontFamily: 'Nunito_900Black' },
  sleepBigNum: { fontSize: 56, fontWeight: '900', color: '#0F172A', textAlign: 'center', fontFamily: 'Nunito_900Black' },
});

export default FAB;
