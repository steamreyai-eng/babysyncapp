
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform, Alert, KeyboardAvoidingView, TextInput } from 'react-native';
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
import { pushNow } from '../db/sync';
import { resolveBabyId, getCurrentUserId } from '../db/syncHelpers';

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
  
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
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
         const babyId = await resolveBabyId();
         const userId = getCurrentUserId();
         await database.write(async () => {
           await database.get<Walk>('walks').create(walk => {
             walk.duration_seconds = seconds;
             walk.location = location;
             walk.weather = weather;
             walk.notes = notes.trim() || undefined;
             walk.created_at = startTime || Date.now() - (seconds * 1000);
             walk.recorded_by = activeParent;
             if (babyId) walk.baby_id = babyId;
             if (userId) walk.user_id = userId;
           });
         });
         pushNow();
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
      const babyId = await resolveBabyId();
      const userId = getCurrentUserId();
      await database.write(async () => {
        await database.get<Walk>('walks').create(walk => {
          walk.duration_seconds = durationSeconds;
          walk.location = location;
          walk.weather = weather;
          walk.notes = notes.trim() || undefined;
          walk.created_at = manualStart.getTime();
          walk.recorded_by = activeParent;
          if (babyId) walk.baby_id = babyId;
          if (userId) walk.user_id = userId;
        });
      });
      pushNow();
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
              pushNow();
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
    <View style={{ flex: 1, backgroundColor: '#FAFBFC' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <View style={{ paddingTop: Math.max(insets.top, 16), paddingHorizontal: 16, paddingBottom: 16, backgroundColor: '#FAFBFC', flexDirection: 'row', alignItems: 'center' }}>
           <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, marginRight: 16, borderWidth: 1, borderColor: '#E2E8F0' }}>
               <Ionicons name="arrow-back" size={24} color="#1A1A2E" />
           </TouchableOpacity>
           <View>
               <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 24, color: '#1A1A2E' }}>Прогулка</Text>
           </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: Math.max(insets.bottom, 40) }}>

        {/* Input Card */}
        <View style={{ backgroundColor: 'white', borderRadius: 24, padding: 20, shadowColor: '#059669', shadowOpacity: 0.08, shadowRadius: 32, elevation: 4, borderWidth: 1, borderColor: '#F0ECE8', marginBottom: 20 }}>
          <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 18, color: '#1A1A2E', marginBottom: 16 }}>Новая запись</Text>
          
          <View style={{ flexDirection: 'row', backgroundColor: '#F4F4F8', borderRadius: 16, padding: 4, marginBottom: 24 }}>
            <TouchableOpacity onPress={() => setMode('timer')} style={{ flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: mode === 'timer' ? 'white' : 'transparent', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', shadowColor: mode === 'timer' ? '#000' : 'transparent', shadowOpacity: 0.05, shadowRadius: 8, elevation: mode === 'timer' ? 2 : 0 }}>
              <Ionicons name="time" size={16} color={mode === 'timer' ? '#059669' : '#8A8A9E'} />
              <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 13, color: mode === 'timer' ? '#059669' : '#8A8A9E', marginLeft: 8 }}>Таймер</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMode('manual')} style={{ flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: mode === 'manual' ? 'white' : 'transparent', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', shadowColor: mode === 'manual' ? '#000' : 'transparent', shadowOpacity: 0.05, shadowRadius: 8, elevation: mode === 'manual' ? 2 : 0 }}>
              <Ionicons name="calendar" size={16} color={mode === 'manual' ? '#059669' : '#8A8A9E'} />
              <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 13, color: mode === 'manual' ? '#059669' : '#8A8A9E', marginLeft: 8 }}>Вручную</Text>
            </TouchableOpacity>
          </View>

          {isRunning && (
            <View style={{ backgroundColor: '#059669', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#4ADE80', borderWidth: 2, borderColor: 'white', marginRight: 10 }} />
                <Text style={{ color: 'white', fontFamily: 'Nunito_800ExtraBold', fontSize: 14 }}>Прогулка идёт</Text>
              </View>
              <Text style={{ color: 'white', fontFamily: 'Nunito_900Black', fontSize: 18 }}>{fmt(seconds)}</Text>
            </View>
          )}

          {mode === 'timer' ? (
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 11, color: '#059669', textTransform: 'uppercase', marginBottom: 8 }}>Таймер прогулки</Text>
              <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 64, color: '#1A1A2E', letterSpacing: -2 }}>{fmt(seconds)}</Text>
              <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 12, color: '#8A8A9E', marginTop: 12 }}>{isRunning ? "⏺ Запись активна..." : "Нажмите начать, когда выйдете"}</Text>
              {!isRunning && (
                <View style={{ marginTop: 16, alignItems: 'center', width: '100%' }}>
                  <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 11, color: '#8A8A9E', textTransform: 'uppercase', marginBottom: 6 }}>Начать с времени:</Text>
                  <TouchableOpacity onPress={() => setShowTimerStartPicker(true)} style={{ backgroundColor: '#F4F4F8', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12 }}>
                    <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 16, color: '#1A1A2E' }}>{timerStartInput.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} {timerStartInput.toLocaleDateString()}</Text>
                  </TouchableOpacity>
                    <DateTimePickerModal visible={showTimerStartPicker} value={timerStartInput} mode="datetime" is24Hour onChange={(d) => { if(d) setTimerStartInput(d); }} onClose={() => setShowTimerStartPicker(false)} />
                </View>
              )}
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 11, color: '#059669', textTransform: 'uppercase', marginBottom: 8 }}>Начали</Text>
                <TouchableOpacity onPress={() => setShowStartPicker(true)} style={{ backgroundColor: '#F4F4F8', padding: 16, borderRadius: 16 }}>
                  <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 16, color: '#1A1A2E' }}>{manualStart.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} {manualStart.toLocaleDateString()}</Text>
                </TouchableOpacity>
                <DateTimePickerModal visible={showStartPicker} value={manualStart} mode="datetime" is24Hour onChange={(d) => { if(d) setManualStart(d); }} onClose={() => setShowStartPicker(false)} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 11, color: '#059669', textTransform: 'uppercase', marginBottom: 8 }}>Закончили</Text>
                <TouchableOpacity onPress={() => setShowEndPicker(true)} style={{ backgroundColor: '#F4F4F8', padding: 16, borderRadius: 16 }}>
                  <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 16, color: '#1A1A2E' }}>{manualEnd.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} {manualEnd.toLocaleDateString()}</Text>
                </TouchableOpacity>
                <DateTimePickerModal visible={showEndPicker} value={manualEnd} mode="datetime" is24Hour onChange={(d) => { if(d) setManualEnd(d); }} onClose={() => setShowEndPicker(false)} />
              </View>
            </View>
          )}

          <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 12, color: '#6B6B80', marginBottom: 8 }}>Место прогулки</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {LOCATIONS.map(loc => (
              <TouchableOpacity key={loc.id} onPress={() => setLocation(loc.id)} style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: location === loc.id ? '#DBEAFE' : '#F5F0E6', borderWidth: 2, borderColor: location === loc.id ? '#059669' : 'transparent', flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name={loc.icon as any} size={18} color={location === loc.id ? '#1A1A2E' : loc.color} style={{ marginRight: 6 }} />
                <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 13, color: '#1A1A2E' }}>{loc.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 12, color: '#6B6B80', marginBottom: 8 }}>Погода</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {WEATHERS.map(w => (
              <TouchableOpacity key={w.id} onPress={() => setWeather(w.id)} style={{ paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, backgroundColor: weather === w.id ? '#FFEDD5' : '#F5F0E6', borderWidth: 2, borderColor: weather === w.id ? '#F97316' : 'transparent', alignItems: 'center' }}>
                <Ionicons name={w.icon as any} size={24} color={weather === w.id ? '#1A1A2E' : w.color} style={{ marginBottom: 4 }} />
                <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 9, color: '#6B6B80' }}>{w.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 12, color: '#6B6B80', marginBottom: 8 }}>Заметки (необязательно)</Text>
          <TextInput 
            value={notes} 
            onChangeText={setNotes} 
            placeholder="Малыш улыбался солнцу..." 
            placeholderTextColor="#A0A0B0"
            multiline
            numberOfLines={2}
            style={{ backgroundColor: '#F5F0E6', borderRadius: 12, padding: 12, fontFamily: 'Nunito_700Bold', fontSize: 13, color: '#1A1A2E', minHeight: 60, marginBottom: 20, borderWidth: 1.5, borderColor: '#E0DDD8' }}
          />

          <View style={{ flexDirection: 'row', gap: 12 }}>
            {mode === 'timer' && (
              <TouchableOpacity onPress={() => { cancelWalkTimerNotification(); clearWalkTimer(); setSeconds(0); }} style={{ flex: 0.8, backgroundColor: '#F4F4F8', height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 14, color: '#8A8A9E' }}>Сброс</Text>
              </TouchableOpacity>
            )}

            {mode === 'timer' ? (
              isRunning ? (
                <TouchableOpacity onPress={handleStopSave} style={{ flex: 2, backgroundColor: '#D94F4F', height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', shadowColor: '#D94F4F', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 4 }}>
                  <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 14, color: 'white' }}>Остановить</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={handleStartTimer} style={{ flex: 2, backgroundColor: '#059669', height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', shadowColor: '#059669', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 4 }}>
                  <Ionicons name="play" size={16} color="white" style={{ marginRight: 8 }} />
                  <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 14, color: 'white' }}>Начать прогулку</Text>
                </TouchableOpacity>
              )
            ) : (
              <TouchableOpacity onPress={handleManualSave} style={{ flex: 1, backgroundColor: manualEnd.getTime() <= manualStart.getTime() ? '#D1D1DB' : '#059669', height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#059669', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 4 }}>
                <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 14, color: 'white' }}>Сохранить</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* History */}
        <View style={{ backgroundColor: 'white', borderRadius: 24, padding: 20, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 16, elevation: 2, borderWidth: 1, borderColor: '#F0ECE8' }}>
          <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 16, color: '#1A1A2E', marginBottom: 16 }}>История прогулок</Text>
          
          {sortedWalks.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 16 }}>
              <Text style={{ fontSize: 40, marginBottom: 8 }}>🌤️</Text>
              <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 13, color: '#6B6B80' }}>Прогулок пока нет</Text>
              <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 11, color: '#A0A0B0', marginTop: 4 }}>Запишите первую прогулку выше</Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {sortedWalks.map(w => {
                const renderRightActions = () => (
                  <View style={{ flexDirection: 'row', width: 140 }}>
                    <TouchableOpacity onPress={() => setEditTarget({ kind: 'walk', record: w })} style={{ flex: 1, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name="pencil" size={20} color="white" />
                      <Text style={{ color: 'white', fontSize: 10, fontFamily: 'Nunito_800ExtraBold', marginTop: 4 }}>Изменить</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteRecord(w as Walk)} style={{ flex: 1, backgroundColor: '#D94F4F', borderTopRightRadius: 14, borderBottomRightRadius: 14, justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name="trash" size={20} color="white" />
                      <Text style={{ color: 'white', fontSize: 10, fontFamily: 'Nunito_800ExtraBold', marginTop: 4 }}>Удалить</Text>
                    </TouchableOpacity>
                  </View>
                );

                return (
                 <View key={w.id} style={{ marginBottom: 12, backgroundColor: '#F5F0E6', borderRadius: 14, overflow: 'hidden' }}>
                  <Swipeable renderRightActions={renderRightActions} friction={2} rightThreshold={40}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F0E6', padding: 12, borderRadius: 14 }}>
                      <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                        <Ionicons name={getLoc(w.location).icon as any} size={22} color={getLoc(w.location).color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                          <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 13, color: '#1A1A2E', marginRight: 6 }}>{fmtDur(w.duration_seconds)}</Text>
                          <View style={{ backgroundColor: getLoc(w.location).color, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100, marginRight: 6 }}>
                            <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 9, color: 'white' }}>{getLoc(w.location).label}</Text>
                          </View>
                          <Ionicons name={getW(w.weather).icon as any} size={14} color={getW(w.weather).color} />
                        </View>
                        {w.notes && <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 11, color: '#6B6B80', marginTop: 4 }} numberOfLines={1}>{w.notes}</Text>}
                      </View>
                      <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                        <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 11, color: '#6B6B80', marginRight: 6 }}>{fmtTime(w.created_at)}</Text>
                        <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 11, color: '#6B6B80', marginRight: 6, marginTop: 2 }}>{fmtTime(safeTime(w.created_at) + w.duration_seconds * 1000)}</Text>
                      </View>
                    </View>
                  </Swipeable>
                 </View>
                );
              })}
            </View>
          )}
        </View>

      </ScrollView>
      <EditRecordModal target={editTarget} onClose={() => setEditTarget(null)} />
      </KeyboardAvoidingView>
    </View>
  );
}

const enhance = withObservables([], () => ({
  walks: database.collections.get<Walk>('walks').query().observe(),
}));

export default enhance(WalkScreenContent);

