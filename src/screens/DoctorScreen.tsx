import React, { useState, useEffect, useCallback } from 'react';
import { ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { database } from '../db';
import withObservables from '@nozbe/with-observables';
import { Q } from '@nozbe/watermelondb';
import { DoctorVisitModel } from '../db/models/DoctorVisitModel';
import { VaccinationModel } from '../db/models/VaccinationModel';
import { useAuthStore } from '../store/authStore';
import { callAI } from '../lib/ai';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { Wrapper } from '../components/ui/Wrapper';
import { Surface } from '../components/ui/Surface';
import { Typography } from '../components/ui/Typography';
import { Button } from '../components/ui/Button';
import { ScreenHeader } from '../components/ScreenHeader';
import { SegmentedControl } from '../components/SegmentedControl';
import { FormField } from '../components/FormField';
import { IconCircle } from '../components/IconCircle';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { COLORS, FONTS, RADIUS } from '../lib/theme';

type DocTab = 'visits' | 'vaccines';

const vaccineSchedule = [
  { age: 'При рождении', vaccines: ['БЦЖ', 'Гепатит B-1'] },
  { age: '1 месяц', vaccines: ['Гепатит B-2'] },
  { age: '2 месяца', vaccines: ['АКДС-1', 'ИПВ-1', 'Хиб-1', 'ПКВ-1'] },
  { age: '4 месяца', vaccines: ['АКДС-2', 'ИПВ-2', 'Хиб-2', 'ПКВ-2'] },
  { age: '6 месяцев', vaccines: ['АКДС-3', 'ИПВ-3', 'Гепатит B-3'] },
  { age: '12 месяцев', vaccines: ['КПК-1', 'Ветрянка'] },
];

const TAB_ITEMS = [
  { key: 'visits', label: '📋 Посещения' },
  { key: 'vaccines', label: '💉 Прививки' },
];

const LocalPediatricianTips = () => {
    const baby = useAuthStore(state => state.baby);
    const [tips, setTips] = useState<string>('');
    const [loading, setLoading] = useState(false);

    const ageMo = baby?.birthdate
        ? (Date.now() - new Date(baby.birthdate).getTime()) / (30.44 * 24 * 3600 * 1000)
        : 4;

    const fetchTips = useCallback(async () => {
        if (!baby?.country) return;
        setLoading(true);
        const prompt = `Ты педиатр. Ребёнок: ${Math.round(ageMo)} мес., ${baby.country} (${baby.city || "не указан"}). Сразу дай 1-2 очень коротких, практичных совета (максимум 20 слов суммарно) с учетом возраста и климата. Без воды, без "Привет".`;
          try {
            const result = await callAI(prompt, {});
            setTips(result ? result.trim() : "Ошибка загрузки рекомендаций.");
        } catch {
            setTips("Ошибка загрузки рекомендаций.");
        }
        setLoading(false);
    }, [baby?.country, baby?.city, ageMo]);

    useEffect(() => {
        if (!tips && baby?.country) fetchTips();
    }, [fetchTips, baby?.country, tips]);

    if (!baby?.country) return null;

    return (
        <Wrapper mb={16} overflow="hidden" style={{ borderRadius: RADIUS.xl, borderWidth: 1, borderColor: '#BFDBFE' }}>
            <LinearGradient
                colors={['#EFF6FF', '#DBEAFE']}
                start={{x:0, y:0}} end={{x:1, y:1}}
                style={{ padding: 16 }}
            >
                <Wrapper dir="row" justify="space-between" align="center" mb={8}>
                    <Wrapper dir="row" align="center" gap={8}>
                        <IconCircle size="xs" bg="#2563EB">
                            <Ionicons name="globe-outline" size={14} color="white" />
                        </IconCircle>
                        <Typography variant="tiny" weight="extraBold">Совет дня от ИИ</Typography>
                    </Wrapper>
                    {!loading && (
                        <Surface onPress={fetchTips} tone="transparent" radius="sm" px={10} py={6} bg="rgba(37,99,235,0.1)">
                            <Typography variant="tiny" weight="extraBold" color="#2563EB">Обновить</Typography>
                        </Surface>
                    )}
                </Wrapper>
                {loading ? (
                    <Wrapper dir="row" align="center" gap={8}>
                        <ActivityIndicator size="small" color="#2563EB" />
                        <Typography variant="tiny" weight="bold" color="textMuted">Подготовка совета...</Typography>
                    </Wrapper>
                ) : (
                    <Typography variant="tiny" weight="bold" color="#4A4A5A">{tips}</Typography>
                )}
            </LinearGradient>
        </Wrapper>
    );
};

const DoctorScreenContent = ({ doctorVisits, vaccinations }: { doctorVisits: DoctorVisitModel[], vaccinations: VaccinationModel[] }) => {
  const navigation = useNavigation();
  const session = useAuthStore(state => state.session);
  const activeParent = useAuthStore(state => state.activeParent);
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<DocTab>('visits');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDoctor, setNewDoctor] = useState('');
  const [newType, setNewType] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [aiCheckingId, setAiCheckingId] = useState<string | null>(null);
  const [aiResultMap, setAiResultMap] = useState<Record<string, string>>({});

  const handleCompareWHO = async (visitId: string, notes: string) => {
      setAiCheckingId(visitId);
      try {
          const result = await callAI(
              `Ты педиатрический AI-ассистент. Сравни данные посещения врача с нормами ВОЗ для ребёнка. Ответ на русском языке, коротко и по делу.\nПосещение врача: ${notes || ""}. Соответствует ли это нормам ВОЗ?`,
              {}
          );
          setAiResultMap(prev => ({ ...prev, [visitId]: result || "Рекомендации соответствуют нормам ВОЗ." }));
      } catch (e) {
          setAiResultMap(prev => ({ ...prev, [visitId]: "Ошибка соединения с AI." }));
      }
      setAiCheckingId(null);
  };

  const handleAddVisit = async () => {
    if (!newDoctor || !newType) return;
    if (!session?.user.id) return;
    
    try {
      await database.write(async () => {
         await database.get<DoctorVisitModel>('doctor_visits').create(v => {
           v.visit_date = new Date().toISOString();
           v.doctor = newDoctor;
           v.visit_type = newType;
          v.notes = newNotes;
          v.created_at = Date.now();
          v.recorded_by = activeParent;
         });
      });
      setNewDoctor(''); setNewType(''); setNewNotes('');
      setShowAddForm(false);
      Alert.alert('✓', 'Визит добавлен');
    } catch(err) {
      if (__DEV__) console.warn("handleAddVisit error:", err);
      Alert.alert('Ошибка', 'Не удалось сохранить визит');
    }
  };

  const handleToggleVaccination = async (vaccineName: string, isDone: boolean) => {
    if (!session?.user.id) return;

    try {
      await database.write(async () => {
        if (isDone) {
          await database.get<VaccinationModel>('vaccinations').create(v => {
            v.vaccine_name = vaccineName;
            v.date_given = new Date().toISOString();
            v.created_at = Date.now();
             v.recorded_by = activeParent;
          });
        } else {
          const existing = await database.get<VaccinationModel>('vaccinations').query(Q.where('vaccine_name', vaccineName)).fetch();
          for (const v of existing) {
            await v.destroyPermanently();
          }
        }
      });
    } catch (err) {
      if (__DEV__) console.warn("handleToggleVaccination error:", err);
    }
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <Wrapper flex={1} bg="#FAFBFC">
      <ScreenHeader title="Врач" />
      <ScrollView style={{ flex: 1, paddingHorizontal: 16 }} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 120) }} showsVerticalScrollIndicator={false}>

      <LocalPediatricianTips />

      {/* Tabs */}
      <Wrapper mb={16}>
        <SegmentedControl items={TAB_ITEMS} selected={activeTab} onChange={(k) => setActiveTab(k as DocTab)} />
      </Wrapper>

      {/* ── Visits ── */}
      {activeTab === 'visits' && (
        <Wrapper>
          <Surface onPress={() => setShowAddForm(!showAddForm)} variant="outlined" radius="md" p={14} mb={12} style={{ borderWidth: 2, borderColor: 'rgba(37,99,235,0.4)', borderStyle: 'dashed', minHeight: 48 }}>
            <Wrapper dir="row" align="center" justify="center">
              <Wrapper mr={10}><Ionicons name="add" size={20} color="#2563EB" /></Wrapper>
              <Typography variant="tiny" weight="extraBold" color="#2563EB">Добавить посещение</Typography>
            </Wrapper>
          </Surface>

          {showAddForm && (
            <Surface variant="elevated" radius="xl" p={16} mb={12}>
              <Typography variant="h3" weight="black" letterSpacing={-0.5} mb={12}>Новое посещение</Typography>
              <Wrapper mb={12}>
                <FormField value={newDoctor} onChangeText={setNewDoctor} placeholder="Врач (Др. Смирнова)" />
              </Wrapper>
              <Wrapper mb={12}>
                <FormField value={newType} onChangeText={setNewType} placeholder="Тип (Плановый осмотр)" />
              </Wrapper>
              <Wrapper mb={12}>
                <FormField value={newNotes} onChangeText={setNewNotes} placeholder="Заметки..." multiline />
              </Wrapper>
              <Button variant="solid" tone="primary" size="lg" fullWidth onPress={handleAddVisit}>
                Сохранить
              </Button>
            </Surface>
          )}

          {doctorVisits.map((v: DoctorVisitModel) => {
              const checking = aiCheckingId === v.id;
              const result = aiResultMap[v.id];
              return (
                <Surface key={v.id} variant="elevated" radius="xl" p={16} mb={12}>
                  <Wrapper dir="row" justify="space-between" align="flex-start" mb={8}>
                    <Wrapper>
                      <Typography variant="tiny" weight="black">{v.visit_type}</Typography>
                      <Typography variant="tiny" weight="bold" color="#2563EB">{v.doctor}</Typography>
                    </Wrapper>
                    <StatusBadge label={fmtDate(v.visit_date)} tone="neutral" />
                  </Wrapper>
                  {v.notes ? <Typography variant="tiny" weight="bold" color="textMuted" mb={12}>{v.notes}</Typography> : null}
                  
                  <Wrapper dir="row" gap={8}>
                      {v.has_photo && (
                          <Surface tone="transparent" radius="sm" px={12} py={8} bg="#F3E8FF" style={{ minHeight: 32 }}>
                              <Wrapper dir="row" align="center" gap={6}>
                                  <Ionicons name="camera" size={13} color="#8B5CF6" />
                                  <Typography variant="tiny" weight="extraBold" color="#8B5CF6">Рецепт</Typography>
                              </Wrapper>
                          </Surface>
                      )}
                    {v.notes && (
                      <Surface onPress={() => handleCompareWHO(v.id, v.notes as string)} tone="transparent" radius="sm" px={12} py={8} bg="#DBEAFE" style={{ minHeight: 32 }}>
                        <Wrapper dir="row" align="center" gap={6}>
                          <Ionicons name="medical" size={12} color="#4E8FD4" />
                          <Typography variant="tiny" weight="extraBold" color="#2563EB">{checking ? "Анализ..." : "Сравнить с ВОЗ"}</Typography>
                        </Wrapper>
                      </Surface>
                    )}
                  </Wrapper>

                  {/* AI WHO Result Box */}
                  {(checking || result) && (
                      <Wrapper mt={16} p={12} style={{ backgroundColor: '#FAFBFC', borderRadius: RADIUS.lg }}>
                          <Wrapper dir="row" align="center" mb={8} gap={8}>
                              <IconCircle size="sm" bg="#D1FAE5">
                                  <Ionicons name="sparkles" size={12} color="#059669" />
                              </IconCircle>
                              <Typography variant="body" weight="black">AI-анализ ВОЗ</Typography>
                          </Wrapper>
                          {checking ? (
                              <Wrapper p={16} align="center" style={{ backgroundColor: '#F5F0E6', borderRadius: RADIUS.lg }}>
                                  <ActivityIndicator size="small" color="#2563EB" style={{ marginBottom: 8 }} />
                                  <Typography variant="tiny" weight="bold" color="textMuted">Анализ данных по нормам ВОЗ...</Typography>
                              </Wrapper>
                          ) : (
                              <Wrapper p={12} style={{ backgroundColor: 'rgba(5,150,105,0.1)', borderRadius: RADIUS.lg }}>
                                  <Wrapper dir="row" align="center" mb={4} gap={6}>
                                      <Ionicons name="checkmark" size={14} color="#059669" />
                                      <Typography variant="tiny" weight="extraBold" color="#059669">Рекомендация AI</Typography>
                                  </Wrapper>
                                  <Typography variant="tiny" weight="bold" color="textMuted">{result}</Typography>
                              </Wrapper>
                          )}
                          <Typography variant="tiny" weight="bold" color="textMuted" align="center" mt={8}>⚕️ AI-анализ носит информационный характер.</Typography>
                      </Wrapper>
                  )}
                </Surface>
              );
          })}

          {doctorVisits.length === 0 && !showAddForm && (
            <EmptyState
              icon={<Ionicons name="medical" size={48} color="#C8D8F0" />}
              title="Нет записей"
              subtitle="Добавьте посещения врача"
            />
          )}
        </Wrapper>
      )}

      {/* ── Vaccines ── */}
      {activeTab === 'vaccines' && (
        <Wrapper>
          <Surface variant="elevated" radius="xl" p={16} mb={12}>
            <Wrapper dir="row" align="center" justify="space-between" mb={16}>
              <Typography variant="h3" weight="black" letterSpacing={-0.5}>График прививок</Typography>
              <Wrapper dir="row" gap={12}>
                <Wrapper dir="row" align="center" gap={4}>
                  <Wrapper width={10} height={10} style={{ borderRadius: 5, backgroundColor: '#059669' }} />
                  <Typography variant="tiny" weight="bold" color="textMuted">Сделано</Typography>
                </Wrapper>
                <Wrapper dir="row" align="center" gap={4}>
                  <Wrapper width={10} height={10} style={{ borderRadius: 5, backgroundColor: '#E2E8F0' }} />
                  <Typography variant="tiny" weight="bold" color="textMuted">Ожидает</Typography>
                </Wrapper>
              </Wrapper>
            </Wrapper>

            {vaccineSchedule.map((g, i) => {
              const isDone = g.vaccines.every(v => vaccinations.some((vac: VaccinationModel) => vac.vaccine_name === v));
              return (
                <Wrapper key={i} dir="row">
                  <Wrapper align="center" mr={12}>
                    <Wrapper width={28} height={28} align="center" justify="center"
                      style={{
                        borderRadius: 14,
                        backgroundColor: isDone ? '#059669' : '#F5F0E6',
                        borderWidth: isDone ? 0 : 2,
                        borderColor: '#E0DDD8',
                      }}>
                      {isDone
                        ? <Typography variant="tiny" color="white">✓</Typography>
                        : <Typography variant="tiny" color="#6B6B80">○</Typography>
                      }
                    </Wrapper>
                    {i < vaccineSchedule.length - 1 && (
                      <Wrapper width={2} flex={1} mt={4} style={{ borderRadius: 1, backgroundColor: isDone ? 'rgba(5,150,105,0.4)' : '#E0DDD8' }} />
                    )}
                  </Wrapper>
                  <Wrapper flex={1} pb={12}>
                    <Typography variant="tiny" weight="extraBold" color={isDone ? 'textPrimary' : 'textMuted'}>{g.age}</Typography>
                    <Wrapper dir="row" wrap="wrap" mt={4} gap={4}>
                      {g.vaccines.map(v => {
                        const vacDone = vaccinations.some((vac: VaccinationModel) => vac.vaccine_name === v);
                        return (
                          <Surface
                            key={v}
                            onPress={() => handleToggleVaccination(v, !vacDone)}
                            tone="transparent"
                            radius="xl"
                            px={8}
                            py={4}
                            bg={vacDone ? 'rgba(5,150,105,0.15)' : '#F5F0E6'}
                          >
                            <Typography variant="tiny" weight="extraBold" color={vacDone ? '#059669' : 'textMuted'}>{v}</Typography>
                          </Surface>
                        );
                      })}
                    </Wrapper>
                  </Wrapper>
                </Wrapper>
              );
            })}
          </Surface>

          {(() => {
            const nextGroup = vaccineSchedule.find(g =>
              !g.vaccines.every(v => vaccinations.some((vac: VaccinationModel) => vac.vaccine_name === v))
            );
            if (!nextGroup) return (
              <Surface variant="flat" radius="xl" p={16} mb={12} style={{ backgroundColor: 'rgba(5,150,105,0.1)' }}>
                <Typography variant="body" weight="extraBold" color="#059669" align="center">
                  🎉 Все прививки по графику сделаны!
                </Typography>
              </Surface>
            );
            return (
              <Wrapper mb={12} style={{ borderRadius: RADIUS.xl, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 24, elevation: 4 }}>
                <LinearGradient
                    colors={['#3B82F6', '#2563EB']}
                    start={{x:0,y:0}} end={{x:1,y:1}}
                    style={{ borderRadius: RADIUS.xl, padding: 16 }}
                >
                  <Typography variant="tiny" weight="extraBold" color="rgba(255,255,255,0.8)" uppercase letterSpacing={1} mb={4}>СЛЕДУЮЩИЙ ПРИЁМ</Typography>
                  <Typography variant="h3" weight="black" color="white" size={18}>Осмотр: {nextGroup.age}</Typography>
                  <Typography variant="tiny" weight="bold" color="rgba(255,255,255,0.8)" mt={2}>{nextGroup.vaccines.join(', ')}</Typography>
                  <Surface onPress={() => Alert.alert('Успех', 'Добавлено в план! 📅')} tone="transparent" radius="md" px={12} py={8} mt={12} bg="rgba(255,255,255,0.2)" style={{ alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', minHeight: 32 }}>
                      <Typography variant="tiny" weight="extraBold" color="white">Добавить в календарь</Typography>
                  </Surface>
                </LinearGradient>
              </Wrapper>
            );
          })()}
        </Wrapper>
      )}
    </ScrollView>
    </Wrapper>
  );
};

const enhance = withObservables([], () => ({
  doctorVisits: database.collections.get<DoctorVisitModel>('doctor_visits').query(Q.sortBy('created_at', Q.desc)).observe(),
  vaccinations: database.collections.get<VaccinationModel>('vaccinations').query().observe(),
}));

const EnhancedDoctorScreen = enhance(DoctorScreenContent);

export default function DoctorScreen() {
  return <EnhancedDoctorScreen />;
}
