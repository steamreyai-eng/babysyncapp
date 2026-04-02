
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Platform, Alert, KeyboardAvoidingView, Dimensions } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { database } from '../db';
import { Feeding } from '../db/models/Feeding';
import { useAuthStore } from '../store/authStore';
import { triggerHaptic } from '../utils/haptics';
import withObservables from '@nozbe/with-observables';
import EditRecordModal from '../components/EditRecordModal';

const { width } = Dimensions.get('window');

function FeedingScreenContent({ feedings }: { feedings: Feeding[] }) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const scrollViewRef = React.useRef<ScrollView>(null);
  
  const TABS = ['breast', 'formula', 'solid'];
  const session = useAuthStore(state => state.session);
  const activeParent = useAuthStore(state => state.activeParent);
  
  const [activeTab, setActiveTab] = useState<'breast' | 'formula' | 'solid'>('breast');
  const [eventTime, setEventTime] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  // Breast
  const [breastSide, setBreastSide] = useState<'Л' | 'П'>('Л');
  const [timerRunning, setTimerRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);

  // Formula
  const [formulaBrand, setFormulaBrand] = useState('Nan Optipro');
  const [temperature, setTemperature] = useState('37');
  const [formulaVolume, setFormulaVolume] = useState('120');

  // Solid
  const [weaningProduct, setWeaningProduct] = useState('');
  const [weaningVolume, setWeaningVolume] = useState('100');
  const [reaction, setReaction] = useState<'happy' | 'neutral' | 'fussy'>('happy');
  const [editTarget, setEditTarget] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerRunning) {
      interval = setInterval(() => setSeconds(s => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const handleSaveBreast = async () => {
    try {
      if (seconds === 0) return Alert.alert("Ошибка", "Запустите таймер или укажите время");
      await database.write(async () => {
        await database.get<Feeding>('feedings').create(f => {
          f.type = 'breast';
          f.recorded_by = activeParent;
          f.created_at = eventTime.getTime();
          f.duration_seconds = seconds;
          f.breast_side = breastSide;
          const m = Math.floor(seconds / 60); const s = seconds % 60;
          f.description = `Грудь (${breastSide === 'Л' ? 'лев.' : 'прав.'}, ${m > 0 ? m + ' мин' : s + ' сек'})`;
        });
      });
      triggerHaptic('success');
      navigation.goBack();
    } catch (error) { Alert.alert("Ошибка", "Не удалось сохранить"); }
  };

  const handleSaveFormula = async () => {
    try {
      const brandStr = formulaBrand.trim() || 'Смесь';
      await database.write(async () => {
        await database.get<Feeding>('feedings').create(f => {
          f.type = 'formula';
          f.recorded_by = activeParent;
          f.created_at = eventTime.getTime();
          f.formula_brand = brandStr;
          f.formula_volume_ml = parseInt(formulaVolume) || 0;
          f.formula_temp_c = parseInt(temperature) || 37;
          f.description = `Смесь (${formulaVolume}мл, ${brandStr}, ${temperature}°C)`;
        });
      });
      triggerHaptic('success');
      navigation.goBack();
    } catch (error) { Alert.alert("Ошибка", "Не удалось сохранить"); }
  };

  const handleSaveSolid = async () => {
    try {
      const prodStr = weaningProduct.trim() || 'Прикорм';
      const reactionStr = reaction === 'happy' ? 'рад' : reaction === 'neutral' ? 'норм' : 'плач';
      await database.write(async () => {
        await database.get<Feeding>('feedings').create(f => {
          f.type = 'solid';
          f.recorded_by = activeParent;
          f.created_at = eventTime.getTime();
          f.solid_product = weaningProduct;
          f.solid_volume_g = parseInt(weaningVolume) || 0;
          f.solid_reaction = reaction;
          f.description = `${prodStr} (${weaningVolume}г, ${reactionStr})`;
        });
      });
      triggerHaptic('success');
      navigation.goBack();
    } catch (error) { Alert.alert("Ошибка", "Не удалось сохранить"); }
  };

  const handleDeleteRecord = (record: Feeding) => {
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
    const m = Math.floor(s / 60); const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const handleTabPress = (idx: number) => {
    setActiveTab(TABS[idx] as any);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FAFBFC' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <View style={{ paddingTop: Math.max(insets.top, 16), paddingHorizontal: 16, paddingBottom: 16, backgroundColor: '#FAFBFC', flexDirection: 'row', alignItems: 'center' }}>
         <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, marginRight: 16, borderWidth: 1, borderColor: '#E2E8F0' }}>
             <Ionicons name="arrow-back" size={24} color="#1A1A2E" />
         </TouchableOpacity>
         <View>
             <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 24, color: '#1A1A2E' }}>Кормление</Text>
         </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: Math.max(insets.bottom, 120) }}>
          {/* Tabs */}
          <View style={{ backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', borderRadius: 18, padding: 4, flexDirection: 'row', marginBottom: 20 }}>
            <TouchableOpacity onPress={() => handleTabPress(0)} style={{ flex: 1, height: 46, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: activeTab === 'breast' ? '#2563EB' : 'transparent', shadowColor: activeTab === 'breast' ? '#2563EB' : 'transparent', shadowOpacity: 0.2, shadowRadius: 8, elevation: activeTab === 'breast' ? 2 : 0 }}>
              <Ionicons name="water" size={16} color={activeTab === 'breast' ? 'white' : '#8A8A9E'} />
              <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 13, color: activeTab === 'breast' ? 'white' : '#8A8A9E', marginLeft: 6 }}>Грудь</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleTabPress(1)} style={{ flex: 1, height: 46, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: activeTab === 'formula' ? '#8B5CF6' : 'transparent', shadowColor: activeTab === 'formula' ? '#8B5CF6' : 'transparent', shadowOpacity: 0.2, shadowRadius: 8, elevation: activeTab === 'formula' ? 2 : 0 }}>
              <Ionicons name="flask" size={16} color={activeTab === 'formula' ? 'white' : '#8A8A9E'} />
              <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 13, color: activeTab === 'formula' ? 'white' : '#8A8A9E', marginLeft: 6 }}>Смесь</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleTabPress(2)} style={{ flex: 1, height: 46, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: activeTab === 'solid' ? '#059669' : 'transparent', shadowColor: activeTab === 'solid' ? '#059669' : 'transparent', shadowOpacity: 0.2, shadowRadius: 8, elevation: activeTab === 'solid' ? 2 : 0 }}>
              <Ionicons name="restaurant" size={16} color={activeTab === 'solid' ? 'white' : '#8A8A9E'} />
              <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 13, color: activeTab === 'solid' ? 'white' : '#8A8A9E', marginLeft: 6 }}>Прикорм</Text>
            </TouchableOpacity>
          </View>

          {/* Breast Panel */}
          {activeTab === 'breast' && (
          <View style={{ backgroundColor: 'white', borderRadius: 24, padding: 20, shadowColor: '#4E8FD4', shadowOpacity: 0.12, shadowRadius: 32, elevation: 5, borderWidth: 2, borderColor: 'rgba(78,143,212,0.15)' }}>
            <Text style={{ fontSize: 12, fontFamily: 'Nunito_800ExtraBold', color: '#8A8A9E', marginBottom: 8, textTransform: 'uppercase' }}>Время кормления</Text>
            <TouchableOpacity onPress={() => setShowPicker(true)} style={{ backgroundColor: '#F0F7FF', padding: 16, borderRadius: 16, marginBottom: 20 }}>
              <Text style={{ fontSize: 16, fontFamily: 'Nunito_700Bold', color: '#1A1A2E' }}>{eventTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} {eventTime.toLocaleDateString()}</Text>
            </TouchableOpacity>

            <Text style={{ fontSize: 12, fontFamily: 'Nunito_800ExtraBold', color: '#8A8A9E', marginBottom: 10, textTransform: 'uppercase' }}>Какая грудь?</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
              {['Л', 'П'].map(side => {
                const active = breastSide === side;
                return (
                  <TouchableOpacity key={side} onPress={() => setBreastSide(side as any)} style={{ flex: 1, height: 56, borderRadius: 16, backgroundColor: active ? '#4E8FD4' : '#F0F7FF', alignItems: 'center', justifyContent: 'center', borderWidth: active ? 0 : 1, borderColor: '#D1E5FC' }}>
                    <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 16, color: active ? 'white' : '#4E8FD4' }}>{side === 'Л' ? '← Левая' : 'Правая →'}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ backgroundColor: '#F0F7FF', borderRadius: 20, padding: 20, borderColor: '#D1E5FC', borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: (!timerRunning && seconds > 0) ? 20 : 0 }}>
              <View>
                <Text style={{ fontSize: 12, fontFamily: 'Nunito_800ExtraBold', color: '#8A8A9E', textTransform: 'uppercase', marginBottom: 4 }}>Длительность</Text>
                <Text style={{ fontSize: 38, fontFamily: 'Nunito_900Black', color: '#1A1A2E' }}>{fmt(seconds)}</Text>
              </View>
              <TouchableOpacity onPress={() => setTimerRunning(!timerRunning)} style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: timerRunning ? '#D94F4F' : '#4E8FD4', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={timerRunning ? "stop" : "play"} size={26} color="white" />
              </TouchableOpacity>
            </View>

            {!timerRunning && seconds > 0 && (
              <TouchableOpacity onPress={handleSaveBreast} style={{ height: 56, borderRadius: 20, backgroundColor: '#4E8FD4', alignItems: 'center', justifyContent: 'center', shadowColor: '#4E8FD4', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 24, elevation: 6 }}>
                <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 16, color: 'white' }}>Сохранить ГВ ({fmt(seconds)})</Text>
              </TouchableOpacity>
            )}
          </View>
          )}

          {/* Formula Panel */}
          {activeTab === 'formula' && (
          <View style={{ backgroundColor: 'white', borderRadius: 24, padding: 20, shadowColor: '#7B50C8', shadowOpacity: 0.06, shadowRadius: 32, elevation: 5, borderWidth: 1, borderColor: 'rgba(123,80,200,0.15)' }}>
            <Text style={{ fontSize: 12, fontFamily: 'Nunito_800ExtraBold', color: '#8A8A9E', marginBottom: 8, textTransform: 'uppercase' }}>Время кормления</Text>
            <TouchableOpacity onPress={() => setShowPicker(true)} style={{ backgroundColor: '#F5F3FF', padding: 16, borderRadius: 16, marginBottom: 20 }}>
              <Text style={{ fontSize: 16, fontFamily: 'Nunito_700Bold', color: '#1A1A2E' }}>{eventTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} {eventTime.toLocaleDateString()}</Text>
            </TouchableOpacity>

            <Text style={{ fontSize: 12, fontFamily: 'Nunito_800ExtraBold', color: '#8A8A9E', marginBottom: 10, textTransform: 'uppercase' }}>Параметры смеси</Text>
            <View style={{ backgroundColor: '#F5F3FF', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 12, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#EDE9FE' }}>
              <Text style={{ fontSize: 16, fontFamily: 'Nunito_800ExtraBold', color: '#1A1A2E' }}>Объём (мл)</Text>
              <TextInput value={formulaVolume} onChangeText={setFormulaVolume} keyboardType="numeric" style={{ fontSize: 18, fontFamily: 'Nunito_900Black', color: '#7B50C8', textAlign: 'right', minWidth: 60 }} />
            </View>
            <View style={{ backgroundColor: '#F5F3FF', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 12, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#EDE9FE' }}>
              <Text style={{ fontSize: 16, fontFamily: 'Nunito_800ExtraBold', color: '#1A1A2E' }}>Бренд</Text>
              <TextInput value={formulaBrand} onChangeText={setFormulaBrand} placeholder="Nan Optipro" style={{ fontSize: 16, fontFamily: 'Nunito_800ExtraBold', color: '#7B50C8', textAlign: 'right', minWidth: 100 }} />
            </View>
            <View style={{ backgroundColor: '#F5F3FF', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 12, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#EDE9FE' }}>
              <Text style={{ fontSize: 16, fontFamily: 'Nunito_800ExtraBold', color: '#1A1A2E' }}>Температура (°C)</Text>
              <TextInput value={temperature} onChangeText={setTemperature} keyboardType="numeric" style={{ fontSize: 16, fontFamily: 'Nunito_800ExtraBold', color: '#7B50C8', textAlign: 'right', minWidth: 60 }} />
            </View>

            <TouchableOpacity onPress={handleSaveFormula} style={{ height: 56, borderRadius: 20, backgroundColor: '#7B50C8', alignItems: 'center', justifyContent: 'center', marginTop: 10, shadowColor: '#7B50C8', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 24, elevation: 6 }}>
              <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 16, color: 'white' }}>Сохранить смесь ({formulaVolume}мл)</Text>
            </TouchableOpacity>
          </View>
          )}

          {/* Solid Panel */}
          {activeTab === 'solid' && (
          <View style={{ backgroundColor: 'white', borderRadius: 24, padding: 20, shadowColor: '#2A9B7E', shadowOpacity: 0.12, shadowRadius: 32, elevation: 5, borderWidth: 2, borderColor: 'rgba(42,155,126,0.15)' }}>
            <Text style={{ fontSize: 12, fontFamily: 'Nunito_800ExtraBold', color: '#8A8A9E', marginBottom: 8, textTransform: 'uppercase' }}>Время кормления</Text>
            <TouchableOpacity onPress={() => setShowPicker(true)} style={{ backgroundColor: '#F0FCF9', padding: 16, borderRadius: 16, marginBottom: 20 }}>
              <Text style={{ fontSize: 16, fontFamily: 'Nunito_700Bold', color: '#1A1A2E' }}>{eventTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} {eventTime.toLocaleDateString()}</Text>
            </TouchableOpacity>

            <Text style={{ fontSize: 12, fontFamily: 'Nunito_800ExtraBold', color: '#8A8A9E', marginBottom: 10, textTransform: 'uppercase' }}>Что ел малыш?</Text>
            <TextInput placeholder="Напр. Брокколи" value={weaningProduct} onChangeText={setWeaningProduct} style={{ backgroundColor: '#F0FCF9', borderRadius: 16, padding: 16, fontFamily: 'Nunito_800ExtraBold', fontSize: 16, color: '#1A1A2E', marginBottom: 16, borderWidth: 1, borderColor: '#CCF0E6' }} />

            <View style={{ backgroundColor: '#F0FCF9', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 12, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#CCF0E6' }}>
              <Text style={{ fontSize: 16, fontFamily: 'Nunito_800ExtraBold', color: '#1A1A2E' }}>Объём (г)</Text>
              <TextInput value={weaningVolume} onChangeText={setWeaningVolume} keyboardType="numeric" style={{ fontSize: 18, fontFamily: 'Nunito_900Black', color: '#2A9B7E', textAlign: 'right', minWidth: 60 }} />
            </View>

            <Text style={{ fontSize: 12, fontFamily: 'Nunito_800ExtraBold', color: '#8A8A9E', marginBottom: 10, textTransform: 'uppercase' }}>Реакция</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
              {[
                { id: 'happy', emoji: '😋', label: 'Рад', color: '#2A9B7E' },
                { id: 'neutral', emoji: '😐', label: 'Норм', color: '#E69600' },
                { id: 'fussy', emoji: '😖', label: 'Плач', color: '#D94F4F' }
              ].map(r => (
                <TouchableOpacity key={r.id} onPress={() => setReaction(r.id as any)} style={{ flex: 1, height: 74, borderRadius: 16, backgroundColor: reaction === r.id ? `${r.color}15` : '#F5F5F9', alignItems: 'center', justifyContent: 'center', borderWidth: reaction === r.id ? 2 : 0, borderColor: r.color }}>
                  <Text style={{ fontSize: 26, opacity: reaction !== r.id ? 0.3 : 1 }}>{r.emoji}</Text>
                  <Text style={{ fontSize: 11, fontFamily: 'Nunito_800ExtraBold', color: reaction === r.id ? r.color : '#8A8A9E', marginTop: 4 }}>{r.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity onPress={handleSaveSolid} style={{ height: 56, borderRadius: 20, backgroundColor: '#2A9B7E', alignItems: 'center', justifyContent: 'center', shadowColor: '#2A9B7E', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 24, elevation: 6 }}>
              <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 16, color: 'white' }}>Сохранить прикорм ({weaningVolume}г)</Text>
            </TouchableOpacity>
          </View>
          )}

      {/* ── History Timeline ── */}
        <View style={{ marginTop: 24 }}>
        <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 18, color: '#1A1A2E', marginBottom: 16 }}>
          История за день ({(() => {
            const today = feedings.filter(f => {
              const d = new Date(f.created_at);
              return d.getDate() === selectedDate.getDate() && d.getMonth() === selectedDate.getMonth() && d.getFullYear() === selectedDate.getFullYear();
            });
            return today.length;
          })()})
        </Text>

        {(() => {
          const today = feedings.filter(f => {
            const d = new Date(f.created_at);
            return d.getDate() === selectedDate.getDate() && d.getMonth() === selectedDate.getMonth() && d.getFullYear() === selectedDate.getFullYear();
          }).sort((a, b) => b.created_at - a.created_at);

          if (today.length === 0) return (
            <View style={{ paddingVertical: 40, alignItems: 'center', backgroundColor: 'white', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)' }}>
              <Text style={{ fontSize: 42, marginBottom: 12, opacity: 0.8 }}>🍽️</Text>
              <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 15, color: '#1A1A2E' }}>Пока нет записей</Text>
              <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 13, color: '#8A8A9E', marginTop: 4 }}>Сохраните первое кормление выше</Text>
            </View>
          );

          const getTypeStyle = (type: string) => {
            switch (type) {
              case 'breast': return { icon: 'water', bg: '#DBEAFE', color: '#2563EB', label: 'Грудь' };
              case 'formula': return { icon: 'flask', bg: '#F3E8FF', color: '#8B5CF6', label: 'Смесь' };
              case 'solid': return { icon: 'restaurant', bg: '#D1FAE5', color: '#059669', label: 'Прикорм' };
              default: return { icon: 'water', bg: '#F5F0E6', color: '#6B6B80', label: type };
            }
          };

          const fmtTime = (ms: number) => {
            const d = new Date(ms);
            return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
          };

          return (
            <View style={{ paddingLeft: 8 }}>
              <View style={{ position: 'absolute', left: 23, top: 16, bottom: 24, width: 2, backgroundColor: '#E5E7EB' }} />
              {today.map(f => {
                const ts = getTypeStyle(f.type);
                
                const renderRightActions = () => (
                  <View style={{ flexDirection: 'row', width: 140 }}>
                    <TouchableOpacity onPress={() => setEditTarget({ kind: 'feeding', record: f })} style={{ flex: 1, backgroundColor: ts.color, justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name="pencil" size={20} color="white" />
                      <Text style={{ color: 'white', fontSize: 10, fontFamily: 'Nunito_800ExtraBold', marginTop: 4 }}>Изменить</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteRecord(f as Feeding)} style={{ flex: 1, backgroundColor: '#D94F4F', borderTopRightRadius: 16, borderBottomRightRadius: 16, justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name="trash" size={20} color="white" />
                      <Text style={{ color: 'white', fontSize: 10, fontFamily: 'Nunito_800ExtraBold', marginTop: 4 }}>Удалить</Text>
                    </TouchableOpacity>
                  </View>
                );

                return (
                  <View key={f.id} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: ts.bg, alignItems: 'center', justifyContent: 'center', zIndex: 2, borderWidth: 3, borderColor: '#FAFAFC' }}>
                      <Ionicons name={ts.icon as any} size={14} color={ts.color} />
                    </View>
                    <View style={{ flex: 1, backgroundColor: 'white', borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 16, elevation: 1, borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                      <Swipeable renderRightActions={renderRightActions} friction={2} rightThreshold={40}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, paddingHorizontal: 16, backgroundColor: 'white' }}>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 15, color: '#1A1A2E' }}>{fmtTime(f.created_at)}</Text>
                              <View style={{ backgroundColor: ts.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                                <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 11, color: ts.color }}>{ts.label}</Text>
                              </View>
                            </View>
                            <Text numberOfLines={1} style={{ fontFamily: 'Nunito_700Bold', fontSize: 13, color: '#6B6B80' }}>{f.description}</Text>
                          </View>
                        </View>
                      </Swipeable>
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })()}
        </View>
      </ScrollView>

      {showPicker && (
        <DateTimePicker
          value={eventTime}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={(event, date) => {
            setShowPicker(Platform.OS === 'ios');
            if (date) setEventTime(date);
          }}
        />
      )}
      <EditRecordModal target={editTarget} onClose={() => setEditTarget(null)} />
      </KeyboardAvoidingView>
    </View>
  );
}

const enhance = withObservables([], () => ({
  feedings: database.collections.get('feedings').query().observe(),
}));

export default enhance(FeedingScreenContent as any);

