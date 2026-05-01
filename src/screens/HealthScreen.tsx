
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform, Alert, KeyboardAvoidingView, TextInput, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import DateTimePickerModal from '../components/DateTimePickerModal';
import { database } from '../db';
import { MedicationModel } from '../db/models/MedicationModel';
import { GrowthRecord } from '../db/models/GrowthRecord';
import { useAuthStore } from '../store/authStore';
import withObservables from '@nozbe/with-observables';
import { Q } from '@nozbe/watermelondb';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { pushNow } from '../db/sync';
import { resolveBabyId, getCurrentUserId } from '../db/syncHelpers';

type HealthTab = 'vitals' | 'meds' | 'symptoms';

const SYMPTOM_LIST = [
  'Температура (>38°C)', 'Насморк', 'Кашель', 'Сыпь', 'Рвота',
  'Диарея', 'Потеря аппетита', 'Раздражительность', 'Тянет за ухо', 'Выделения из глаз'
];

function HealthScreenContent({ medications, growthRecords }: { medications: MedicationModel[], growthRecords: GrowthRecord[] }) {
  const navigation = useNavigation();
  const session = useAuthStore(state => state.session);
  const activeParent = useAuthStore(state => state.activeParent);
  const insets = useSafeAreaInsets();
  
  const [activeTab, setActiveTab] = useState<HealthTab>('vitals');
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const [temp, setTemp] = useState("36.6");
  const tempFloat = parseFloat(temp) || 0;
  
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [symptomNote, setSymptomNote] = useState("");
  
  const [showAddMed, setShowAddMed] = useState(false);
  const [medName, setMedName] = useState("");
  const [medDose, setMedDose] = useState("");
  const [medUnit, setMedUnit] = useState("капли");
  const [medTime, setMedTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = React.useCallback(async () => {
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

  const tabs: { id: HealthTab; label: string; icon: string }[] = [
    { id: 'vitals', label: 'Показатели', icon: 'thermometer-outline' },
    { id: 'meds', label: 'Лекарства', icon: 'medkit-outline' },
    { id: 'symptoms', label: 'Симптомы', icon: 'pulse-outline' },
  ];

  const todayMeds = medications.filter(m => {
    const d = new Date(m.created_at);
    return d.getDate() === selectedDate.getDate() && 
           d.getMonth() === selectedDate.getMonth() && 
           d.getFullYear() === selectedDate.getFullYear();
  });

  const handleAddMed = async () => {
    if (!medName || !medDose) return;
    const timeStr = `${medTime.getHours().toString().padStart(2, '0')}:${medTime.getMinutes().toString().padStart(2, '0')}`;
    try {
      const babyId = await resolveBabyId();
      const userId = getCurrentUserId();
      await database.write(async () => {
        await database.get<MedicationModel>('medications').create(m => {
          m.name = medName;
          m.dose = `${medDose} ${medUnit}`;
          m.time_str = timeStr;
          m.taken = false;
          const dt = new Date(selectedDate);
          dt.setHours(medTime.getHours(), medTime.getMinutes(), 0, 0);
          m.created_at = dt.getTime();
          m.recorded_by = activeParent;
          if (babyId) m.baby_id = babyId;
          if (userId) m.user_id = userId;
        });
      });
      pushNow();
      setMedName(""); setMedDose(""); setMedTime(new Date()); setShowAddMed(false);
    } catch (error) {
      Alert.alert("Ошибка", "Не удалось сохранить лекарство.");
    }
  };

  const toggleMedication = async (id: string, taken: boolean) => {
    try {
      await database.write(async () => {
        const med = await database.get<MedicationModel>('medications').find(id);
        await med.update(m => {
          m.taken = taken;
        });
      });
      pushNow();
    } catch (err) {}
  };

  const toggleSymptom = (s: string) => {
    setSymptoms(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const changeDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d);
  };

  const latestWeight = growthRecords.find(r => r.weight_kg);
  const latestHeight = growthRecords.find(r => r.height_cm);
  const latestHead = growthRecords.find(r => r.head_cm);

  const formatUnitOptions = ["капли", "мл", "таблетки", "мг", "МЕ"];

  return (
    <View style={{ flex: 1, backgroundColor: '#FAFBFC' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <View style={{ paddingTop: Math.max(insets.top, 16), paddingHorizontal: 16, paddingBottom: 16, backgroundColor: '#FAFBFC', flexDirection: 'row', alignItems: 'center' }}>
           <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, marginRight: 16, borderWidth: 1, borderColor: '#E2E8F0' }}>
               <Ionicons name="arrow-back" size={24} color="#1A1A2E" />
           </TouchableOpacity>
           <View>
               <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 24, color: '#1A1A2E' }}>Здоровье</Text>
           </View>
        </View>

        <ScrollView 
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: Math.max(insets.bottom, 40) }} 
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366F1']} />}
        >

        {activeTab === 'meds' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white', borderRadius: 14, padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2, marginBottom: 20 }}>
            <TouchableOpacity onPress={() => changeDate(-1)} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#F5F0E6', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="chevron-back" size={20} color="#6B6B80" />
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="calendar-outline" size={16} color="#059669" style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 14, fontFamily: 'Nunito_800ExtraBold', color: '#1A1A2E' }}>
                {selectedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
              </Text>
            </View>
            <TouchableOpacity onPress={() => changeDate(1)} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#F5F0E6', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="chevron-forward" size={20} color="#6B6B80" />
            </TouchableOpacity>
          </View>
        )}

        {/* Tab Switcher */}
        <View style={{ flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 16, padding: 6, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)' }}>
          {tabs.map(tab => {
            const active = activeTab === tab.id;
            return (
              <TouchableOpacity key={tab.id} onPress={() => setActiveTab(tab.id)} style={{ flex: 1, height: 44, borderRadius: 12, backgroundColor: active ? 'white' : 'transparent', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', shadowColor: active ? '#000' : 'transparent', shadowOffset: { width: 0, height: 2 }, shadowOpacity: active ? 0.05 : 0, shadowRadius: 8, elevation: active ? 2 : 0 }}>
                <Ionicons name={tab.icon as any} size={14} color={active ? '#1A1A2E' : '#8A8A9E'} style={{ opacity: active ? 1 : 0.6, marginRight: 6 }} />
                <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 12, color: active ? '#1A1A2E' : '#8A8A9E' }}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Vitals ── */}
        {activeTab === 'vitals' && (
          <View>
            <View style={{ backgroundColor: 'white', borderRadius: 24, padding: 20, shadowColor: '#8A8A9E', shadowOpacity: 0.08, shadowRadius: 32, elevation: 4, borderWidth: 1, borderColor: '#F0ECE8', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Ionicons name="thermometer" size={20} color="#EF4444" />
                </View>
                <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 18, color: '#1A1A2E', letterSpacing: -0.5 }}>Температура</Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', borderRadius: 20, padding: 8, marginBottom: 20, borderWidth: 2, borderColor: '#F5F0E6' }}>
                <TextInput value={temp} onChangeText={setTemp} keyboardType="numeric" maxLength={5} style={{ flex: 1, fontFamily: 'Nunito_900Black', fontSize: 46, color: '#1A1A2E', textAlign: 'center', paddingLeft: 24 }} />
                <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 24, color: '#8A8A9E', paddingRight: 24 }}>°C</Text>
              </View>

              <View style={{ borderRadius: 16, padding: 14, alignItems: 'center', backgroundColor: tempFloat >= 38 ? 'rgba(239,68,68,0.1)' : tempFloat >= 37 ? 'rgba(249,115,22,0.1)' : 'rgba(5,150,105,0.1)', borderWidth: 1, borderColor: tempFloat >= 38 ? 'rgba(239,68,68,0.2)' : tempFloat >= 37 ? 'rgba(249,115,22,0.2)' : 'rgba(5,150,105,0.2)' }}>
                <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 13, color: tempFloat >= 38 ? '#EF4444' : tempFloat >= 37 ? '#F97316' : '#059669' }}>
                  {tempFloat >= 38 ? "⚠️ Высокая — вызовите врача" : tempFloat >= 37 ? "🟡 Немного повышена" : "✓ Нормальная"}
                </Text>
              </View>
            </View>

            <View style={{ backgroundColor: 'white', borderRadius: 24, padding: 20, shadowColor: '#8A8A9E', shadowOpacity: 0.08, shadowRadius: 32, elevation: 4, borderWidth: 1, borderColor: '#F0ECE8' }}>
              <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 18, color: '#1A1A2E', letterSpacing: -0.5, marginBottom: 16 }}>Быстрые измерения</Text>
              <View>
                {[
                  { label: "Вес", icon: "scale", color: "#2563EB", bg: "#DBEAFE", value: latestWeight ? `${latestWeight.weight_kg} кг` : "—", date: latestWeight ? new Date(latestWeight.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long" }) : "Нет данных" },
                  { label: "Рост", icon: "resize", color: "#8B5CF6", bg: "#F3E8FF", value: latestHeight ? `${latestHeight.height_cm} см` : "—", date: latestHeight ? new Date(latestHeight.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long" }) : "Нет данных" },
                  { label: "Окр. головы", icon: "ellipse", color: "#059669", bg: "#D1FAE5", value: latestHead ? `${latestHead.head_cm} см` : "—", date: latestHead ? new Date(latestHead.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long" }) : "Нет данных" }
                ].map((m, i) => (
                  <View key={m.label} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: i < 2 ? 1 : 0, borderBottomColor: 'rgba(224, 221, 216, 0.5)' }}>
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: m.bg, alignItems: 'center', justifyContent: 'center', marginRight: 16, shadowColor: m.color, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 1 }}>
                      <Ionicons name={m.icon as any} size={18} color={m.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 15, color: '#1A1A2E' }}>{m.label}</Text>
                      <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 11, color: '#8A8A9E', marginTop: 2 }}>{m.date}</Text>
                    </View>
                    <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 18, color: '#1A1A2E', letterSpacing: -0.3 }}>{m.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ── Meds ── */}
        {activeTab === 'meds' && (
          <View>
            <View style={{ backgroundColor: 'white', borderRadius: 24, padding: 20, shadowColor: '#8A8A9E', shadowOpacity: 0.08, shadowRadius: 32, elevation: 4, borderWidth: 1, borderColor: '#F0ECE8', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 18, color: '#1A1A2E', letterSpacing: -0.5 }}>Лекарства сегодня</Text>
                <TouchableOpacity onPress={() => setShowAddMed(!showAddMed)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center', shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 4 }}>
                  <Ionicons name={showAddMed ? "close" : "add"} size={20} color="white" />
                </TouchableOpacity>
              </View>

              {todayMeds.length === 0 ? (
                <View style={{ paddingVertical: 32, alignItems: 'center', opacity: 0.6 }}>
                  <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#F5F0E6', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                    <Ionicons name="medkit" size={24} color="#8A8A9E" />
                  </View>
                  <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 13, color: '#8A8A9E' }}>Нет лекарств на выбранный день</Text>
                </View>
              ) : (
                <View>
                  {todayMeds.map((m, i) => (
                    <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: i < todayMeds.length - 1 ? 1 : 0, borderBottomColor: 'rgba(224, 221, 216, 0.5)' }}>
                      <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                        <Ionicons name="medkit" size={20} color="#2563EB" />
                      </View>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 16, color: '#1A1A2E' }}>{m.name}</Text>
                        <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 12, color: '#8A8A9E', marginTop: 2 }}>Доза: {m.dose} · {m.time_str}</Text>
                      </View>
                      <TouchableOpacity onPress={() => toggleMedication(m.id, !m.taken)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: m.taken ? '#10B981' : '#E0DDD8', alignItems: 'center', justifyContent: 'center', shadowColor: m.taken ? '#059669' : 'transparent', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: m.taken ? 4 : 0 }}>
                        <Ionicons name="checkmark" size={18} color="white" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {showAddMed && (
              <View style={{ backgroundColor: 'white', borderRadius: 24, padding: 20, shadowColor: '#8A8A9E', shadowOpacity: 0.08, shadowRadius: 32, elevation: 4, borderWidth: 1, borderColor: '#F0ECE8' }}>
                <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 18, color: '#1A1A2E', letterSpacing: -0.5, marginBottom: 16 }}>Добавить лекарство</Text>
                
                <TextInput value={medName} onChangeText={setMedName} placeholder="Название лекарства" placeholderTextColor="#A0A0B0" style={{ backgroundColor: '#F9F8F6', borderRadius: 16, padding: 16, fontFamily: 'Nunito_800ExtraBold', fontSize: 16, color: '#1A1A2E', marginBottom: 12 }} />
                
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                  <TextInput value={medDose} onChangeText={setMedDose} placeholder="Доза" placeholderTextColor="#A0A0B0" keyboardType="numeric" style={{ flex: 1, backgroundColor: '#F9F8F6', borderRadius: 16, padding: 16, fontFamily: 'Nunito_800ExtraBold', fontSize: 16, color: '#1A1A2E' }} />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ width: 140, backgroundColor: '#F9F8F6', borderRadius: 16, padding: 4 }}>
                     {formatUnitOptions.map(u => (
                       <TouchableOpacity key={u} onPress={() => setMedUnit(u)} style={{ backgroundColor: medUnit === u ? 'white' : 'transparent', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 4 }}>
                         <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 13, color: medUnit === u ? '#1A1A2E' : '#8A8A9E' }}>{u}</Text>
                       </TouchableOpacity>
                     ))}
                  </ScrollView>
                </View>

                <TouchableOpacity onPress={() => setShowTimePicker(true)} style={{ backgroundColor: '#F9F8F6', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 16, color: '#1A1A2E' }}>Время: {medTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                  <Ionicons name="time-outline" size={20} color="#8A8A9E" />
                </TouchableOpacity>

                <TouchableOpacity onPress={handleAddMed} style={{ backgroundColor: '#2563EB', paddingVertical: 16, borderRadius: 16, alignItems: 'center', shadowColor: '#2563EB', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 24, elevation: 5 }}>
                  <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 16, color: 'white' }}>Сохранить лекарство</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* ── Symptoms ── */}
        {activeTab === 'symptoms' && (
          <View>
            <View style={{ backgroundColor: 'white', borderRadius: 24, padding: 20, shadowColor: '#8A8A9E', shadowOpacity: 0.08, shadowRadius: 32, elevation: 4, borderWidth: 1, borderColor: '#F0ECE8', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 18, color: '#1A1A2E', letterSpacing: -0.5 }}>Выберите симптомы</Text>
                {symptoms.length > 0 && (
                  <View style={{ backgroundColor: '#EF4444', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 }}>
                    <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 12, color: 'white' }}>{symptoms.length} выбрано</Text>
                  </View>
                )}
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {SYMPTOM_LIST.map(s => {
                  const isActive = symptoms.includes(s);
                  return (
                    <TouchableOpacity key={s} onPress={() => toggleSymptom(s)} style={{ width: '48%', flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, backgroundColor: isActive ? 'rgba(224,90,90,0.1)' : '#F9F8F6', borderWidth: 1, borderColor: isActive ? 'rgba(224,90,90,0.3)' : 'transparent', minHeight: 52 }}>
                      <View style={{ width: 20, height: 20, borderRadius: 6, backgroundColor: isActive ? '#EF4444' : 'white', borderWidth: isActive ? 0 : 2, borderColor: '#E0DDD8', alignItems: 'center', justifyContent: 'center', marginRight: 12, shadowColor: isActive ? '#EF4444' : 'transparent', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: isActive ? 2 : 0 }}>
                        {isActive && <Ionicons name="checkmark" size={14} color="white" />}
                      </View>
                      <Text style={{ flex: 1, fontFamily: 'Nunito_800ExtraBold', fontSize: 12, color: isActive ? '#D94F4F' : '#1A1A2E', lineHeight: 16 }}>{s}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {symptoms.length > 0 && (
              <View style={{ backgroundColor: 'white', borderRadius: 24, padding: 20, shadowColor: '#8A8A9E', shadowOpacity: 0.08, shadowRadius: 32, elevation: 4, borderWidth: 1, borderColor: '#F0ECE8' }}>
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: '#FFEDD5', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="warning" size={20} color="#F97316" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 16, color: '#1A1A2E' }}>Заметка для врача</Text>
                    <TextInput value={symptomNote} onChangeText={setSymptomNote} placeholder="Подробности для педиатра..." placeholderTextColor="#A0A0B0" multiline numberOfLines={4} style={{ backgroundColor: '#F9F8F6', borderRadius: 16, padding: 16, marginTop: 12, fontFamily: 'Nunito_700Bold', fontSize: 15, color: '#1A1A2E', minHeight: 100, textAlignVertical: 'top' }} />
                  </View>
                </View>
                <TouchableOpacity onPress={() => { Alert.alert('✓', "Симптомы сохранены"); setSymptoms([]); setSymptomNote(""); }} style={{ backgroundColor: '#EF4444', paddingVertical: 16, borderRadius: 16, alignItems: 'center', shadowColor: '#EF4444', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 24, elevation: 5 }}>
                  <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 16, color: 'white' }}>Сохранить и уведомить</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <DateTimePickerModal
        visible={showTimePicker}
        value={medTime}
        mode="time"
        is24Hour={true}
        onChange={(date) => { if (date) setMedTime(date); }}
        onClose={() => setShowTimePicker(false)}
      />
      </KeyboardAvoidingView>
    </View>
  );
}

const enhance = withObservables([], () => ({
  medications: database.collections.get<MedicationModel>('medications').query().observe(),
  growthRecords: database.collections.get<GrowthRecord>('growth_records').query(Q.sortBy('created_at', Q.desc)).observe(),
}));

export default enhance(HealthScreenContent);

