
import React, { useState } from 'react';
import { ScrollView, Platform, Alert, KeyboardAvoidingView, TouchableOpacity, RefreshControl } from 'react-native';
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

type HealthTab = 'vitals' | 'meds' | 'symptoms';

const SYMPTOM_LIST = [
  'Температура (>38°C)', 'Насморк', 'Кашель', 'Сыпь', 'Рвота',
  'Диарея', 'Потеря аппетита', 'Раздражительность', 'Тянет за ухо', 'Выделения из глаз'
];

const TAB_ITEMS = [
  { key: 'vitals', label: 'Показатели', icon: <Ionicons name="thermometer-outline" size={16} /> },
  { key: 'meds', label: 'Лекарства', icon: <Ionicons name="medkit-outline" size={16} /> },
  { key: 'symptoms', label: 'Симптомы', icon: <Ionicons name="pulse-outline" size={16} /> },
];

const UNIT_ITEMS = [
  { key: 'капли', label: 'капли' },
  { key: 'мл', label: 'мл' },
  { key: 'таблетки', label: 'таблетки' },
  { key: 'мг', label: 'мг' },
  { key: 'МЕ', label: 'МЕ' },
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
        });
      });
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

  const getTempTone = () => {
    if (tempFloat >= 38) return { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', color: '#EF4444', text: '⚠️ Высокая — вызовите врача' };
    if (tempFloat >= 37) return { bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.2)', color: '#F97316', text: '🟡 Немного повышена' };
    return { bg: 'rgba(5,150,105,0.1)', border: 'rgba(5,150,105,0.2)', color: '#059669', text: '✓ Нормальная' };
  };
  const tempTone = getTempTone();

  const vitalsData = [
    { label: "Вес", icon: "scale", color: "#2563EB", bg: "#DBEAFE", value: latestWeight ? `${latestWeight.weight_kg} кг` : "—", date: latestWeight ? new Date(latestWeight.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long" }) : "Нет данных" },
    { label: "Рост", icon: "resize", color: "#8B5CF6", bg: "#F3E8FF", value: latestHeight ? `${latestHeight.height_cm} см` : "—", date: latestHeight ? new Date(latestHeight.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long" }) : "Нет данных" },
    { label: "Окр. головы", icon: "ellipse", color: "#059669", bg: "#D1FAE5", value: latestHead ? `${latestHead.head_cm} см` : "—", date: latestHead ? new Date(latestHead.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long" }) : "Нет данных" },
  ];

  return (
    <Wrapper flex={1} bg="background">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <ScreenHeader title="Здоровье" />

        <ScrollView 
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 40) }} 
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366F1']} />}
        >

        {/* Date Navigation (meds tab) */}
        {activeTab === 'meds' && (
          <Surface variant="elevated" radius="md" p={12} mb={20}>
            <Wrapper dir="row" align="center" justify="space-between">
              <Surface onPress={() => changeDate(-1)} tone="transparent" radius="sm" width={40} height={40} align="center" justify="center" bg="#F5F0E6">
                <Ionicons name="chevron-back" size={20} color="#6B6B80" />
              </Surface>
              <Wrapper dir="row" align="center" gap={8}>
                <Ionicons name="calendar-outline" size={16} color="#059669" />
                <Typography variant="tiny" weight="extraBold">
                  {selectedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                </Typography>
              </Wrapper>
              <Surface onPress={() => changeDate(1)} tone="transparent" radius="sm" width={40} height={40} align="center" justify="center" bg="#F5F0E6">
                <Ionicons name="chevron-forward" size={20} color="#6B6B80" />
              </Surface>
            </Wrapper>
          </Surface>
        )}

        {/* Tab Switcher */}
        <Wrapper mb={20}>
          <SegmentedControl items={TAB_ITEMS} selected={activeTab} onChange={(k) => setActiveTab(k as HealthTab)} />
        </Wrapper>

        {/* ── Vitals ── */}
        {activeTab === 'vitals' && (
          <Wrapper>
            <Surface variant="elevated" radius="xl" p={20} mb={16}>
              <Wrapper dir="row" align="center" mb={16} gap={12}>
                <IconCircle bg="#FEE2E2">
                  <Ionicons name="thermometer" size={20} color="#EF4444" />
                </IconCircle>
                <Typography variant="h4" weight="black" letterSpacing={-0.5}>Температура</Typography>
              </Wrapper>

              <Surface variant="outlined" radius="xl" p={8} mb={20}>
                <Wrapper dir="row" align="center" justify="center">
                  <FormField value={temp} onChangeText={setTemp} keyboardType="numeric" placeholder="36.6" />
                </Wrapper>
              </Surface>

              <Surface tone="transparent" radius="md" p={14} align="center" bg={tempTone.bg} style={{ borderWidth: 1, borderColor: tempTone.border }}>
                <Typography variant="tiny" weight="extraBold" color={tempTone.color}>{tempTone.text}</Typography>
              </Surface>
            </Surface>

            <Surface variant="elevated" radius="xl" p={20}>
              <Typography variant="h4" weight="black" letterSpacing={-0.5} mb={16}>Быстрые измерения</Typography>
              {vitalsData.map((m, i) => (
                <Wrapper key={m.label} dir="row" align="center" py={12} style={i < 2 ? { borderBottomWidth: 1, borderBottomColor: 'rgba(224, 221, 216, 0.5)' } : {}}>
                  <Wrapper mr={16}>
                    <IconCircle bg={m.bg}>
                      <Ionicons name={m.icon as any} size={18} color={m.color} />
                    </IconCircle>
                  </Wrapper>
                  <Wrapper flex={1}>
                    <Typography variant="body" weight="extraBold">{m.label}</Typography>
                    <Typography variant="caption" weight="bold" color="textMuted" mt={2}>{m.date}</Typography>
                  </Wrapper>
                  <Typography variant="h4" weight="black" letterSpacing={-0.3}>{m.value}</Typography>
                </Wrapper>
              ))}
            </Surface>
          </Wrapper>
        )}

        {/* ── Meds ── */}
        {activeTab === 'meds' && (
          <Wrapper>
            <Surface variant="elevated" radius="xl" p={20} mb={16}>
              <Wrapper dir="row" align="center" justify="space-between" mb={20}>
                <Typography variant="h4" weight="black" letterSpacing={-0.5}>Лекарства сегодня</Typography>
                <Surface onPress={() => setShowAddMed(!showAddMed)} tone="primary" radius="xl" width={44} height={44} align="center" justify="center" style={{ shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 4 }}>
                  <Ionicons name={showAddMed ? "close" : "add"} size={20} color="white" />
                </Surface>
              </Wrapper>

              {todayMeds.length === 0 ? (
                <EmptyState icon={<Ionicons name="medkit" size={24} color="#8A8A9E" />} title="Нет лекарств на выбранный день" />
              ) : (
                <Wrapper>
                  {todayMeds.map((m, i) => (
                    <Wrapper key={m.id} dir="row" align="center" py={12} style={i < todayMeds.length - 1 ? { borderBottomWidth: 1, borderBottomColor: 'rgba(224, 221, 216, 0.5)' } : {}}>
                      <Wrapper mr={12}>
                        <IconCircle size="lg" bg="#DBEAFE">
                          <Ionicons name="medkit" size={20} color="#2563EB" />
                        </IconCircle>
                      </Wrapper>
                      <Wrapper flex={1} mr={8}>
                        <Typography variant="body" weight="extraBold">{m.name}</Typography>
                        <Typography variant="tiny" weight="bold" color="textMuted" mt={2}>Доза: {m.dose} · {m.time_str}</Typography>
                      </Wrapper>
                      <Surface onPress={() => toggleMedication(m.id, !m.taken)} tone={m.taken ? 'success' : 'transparent'} radius="xl" width={40} height={40} align="center" justify="center" bg={m.taken ? '#10B981' : '#E0DDD8'} style={m.taken ? { shadowColor: '#059669', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 4 } : {}}>
                        <Ionicons name="checkmark" size={18} color="white" />
                      </Surface>
                    </Wrapper>
                  ))}
                </Wrapper>
              )}
            </Surface>

            {showAddMed && (
              <Surface variant="elevated" radius="xl" p={20}>
                <Typography variant="h4" weight="black" letterSpacing={-0.5} mb={16}>Добавить лекарство</Typography>
                
                <Wrapper mb={12}>
                  <FormField value={medName} onChangeText={setMedName} placeholder="Название лекарства" />
                </Wrapper>
                
                <Wrapper dir="row" gap={12} mb={12}>
                  <Wrapper flex={1}>
                    <FormField value={medDose} onChangeText={setMedDose} placeholder="Доза" keyboardType="numeric" />
                  </Wrapper>
                  <Wrapper width={140}>
                    <ChipGroup items={UNIT_ITEMS} selected={medUnit} onChange={setMedUnit} tone="primary" />
                  </Wrapper>
                </Wrapper>

                <Surface onPress={() => setShowTimePicker(true)} tone="transparent" variant="flat" radius="md" p={16} mb={20} bg="#F9F8F6">
                  <Wrapper dir="row" align="center" justify="space-between">
                    <Typography variant="body" weight="extraBold">Время: {medTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Typography>
                    <Ionicons name="time-outline" size={20} color="#8A8A9E" />
                  </Wrapper>
                </Surface>

                <Button variant="solid" tone="primary" size="lg" fullWidth onPress={handleAddMed}>Сохранить лекарство</Button>
              </Surface>
            )}
          </Wrapper>
        )}

        {/* ── Symptoms ── */}
        {activeTab === 'symptoms' && (
          <Wrapper>
            <Surface variant="elevated" radius="xl" p={20} mb={16}>
              <Wrapper dir="row" align="center" justify="space-between" mb={20}>
                <Typography variant="h4" weight="black" letterSpacing={-0.5}>Выберите симптомы</Typography>
                {symptoms.length > 0 && (
                  <StatusBadge label={`${symptoms.length} выбрано`} tone="danger" />
                )}
              </Wrapper>

              <Wrapper dir="row" wrap="wrap" gap={12}>
                {SYMPTOM_LIST.map(s => {
                  const isActive = symptoms.includes(s);
                  return (
                    <Surface
                      key={s}
                      onPress={() => toggleSymptom(s)}
                      tone="transparent"
                      radius="md"
                      p={12}
                      width="48%"
                      bg={isActive ? 'rgba(224,90,90,0.1)' : '#F9F8F6'}
                      style={{ borderWidth: 1, borderColor: isActive ? 'rgba(224,90,90,0.3)' : 'transparent', minHeight: 52 }}
                    >
                      <Wrapper dir="row" align="center">
                        <Wrapper mr={12}>
                          <IconCircle size="xs" bg={isActive ? '#EF4444' : 'white'} radius={6}>
                            {isActive && <Ionicons name="checkmark" size={14} color="white" />}
                          </IconCircle>
                        </Wrapper>
                        <Wrapper flex={1}>
                          <Typography variant="tiny" weight="extraBold" color={isActive ? '#D94F4F' : 'textPrimary'}>{s}</Typography>
                        </Wrapper>
                      </Wrapper>
                    </Surface>
                  );
                })}
              </Wrapper>
            </Surface>

            {symptoms.length > 0 && (
              <Surface variant="elevated" radius="xl" p={20}>
                <Wrapper dir="row" gap={12} mb={16}>
                  <IconCircle bg="#FFEDD5">
                    <Ionicons name="warning" size={20} color="#F97316" />
                  </IconCircle>
                  <Wrapper flex={1}>
                    <Typography variant="body" weight="black">Заметка для врача</Typography>
                    <Wrapper mt={12}>
                      <FormField value={symptomNote} onChangeText={setSymptomNote} placeholder="Подробности для педиатра..." multiline />
                    </Wrapper>
                  </Wrapper>
                </Wrapper>
                <Button variant="solid" tone="danger" size="lg" fullWidth onPress={() => { Alert.alert('✓', "Симптомы сохранены"); setSymptoms([]); setSymptomNote(""); }}>
                  Сохранить и уведомить
                </Button>
              </Surface>
            )}
          </Wrapper>
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
    </Wrapper>
  );
}

const enhance = withObservables([], () => ({
  medications: database.collections.get<MedicationModel>('medications').query().observe(),
  growthRecords: database.collections.get<GrowthRecord>('growth_records').query(Q.sortBy('created_at', Q.desc)).observe(),
}));

export default enhance(HealthScreenContent);
