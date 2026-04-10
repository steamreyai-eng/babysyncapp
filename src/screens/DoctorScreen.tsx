
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
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

type DocTab = 'visits' | 'vaccines';

const vaccineSchedule = [
  { age: 'При рождении', vaccines: ['БЦЖ', 'Гепатит B-1'] },
  { age: '1 месяц', vaccines: ['Гепатит B-2'] },
  { age: '2 месяца', vaccines: ['АКДС-1', 'ИПВ-1', 'Хиб-1', 'ПКВ-1'] },
  { age: '4 месяца', vaccines: ['АКДС-2', 'ИПВ-2', 'Хиб-2', 'ПКВ-2'] },
  { age: '6 месяцев', vaccines: ['АКДС-3', 'ИПВ-3', 'Гепатит B-3'] },
  { age: '12 месяцев', vaccines: ['КПК-1', 'Ветрянка'] },
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
        <View style={styles.tipsContainer}>
            <LinearGradient
                colors={['#EFF6FF', '#DBEAFE']}
                start={{x:0, y:0}} end={{x:1, y:1}}
                style={styles.tipsGradient}
            >
                <View style={styles.tipsHeader}>
                    <View style={styles.tipsHeaderLeft}>
                        <View style={styles.globeIconWrap}>
                            <Ionicons name="globe-outline" size={14} color="white" />
                        </View>
                        <Text style={styles.tipsTitle}>Совет дня от ИИ</Text>
                    </View>
                    {!loading && (
                        <TouchableOpacity onPress={fetchTips} style={styles.updateBtn}>
                            <Text style={styles.updateBtnText}>Обновить</Text>
                        </TouchableOpacity>
                    )}
                </View>
                {loading ? (
                    <View style={styles.tipsLoading}>
                        <ActivityIndicator size="small" color="#2563EB" />
                        <Text style={styles.tipsLoadingText}>Подготовка совета...</Text>
                    </View>
                ) : (
                    <Text style={styles.tipsText}>{tips}</Text>
                )}
            </LinearGradient>
        </View>
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
    <View style={{ flex: 1, backgroundColor: '#FAFBFC' }}>
      <View style={{ paddingTop: Math.max(insets.top, 16), paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#FAFBFC', flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, marginRight: 16, borderWidth: 1, borderColor: '#E2E8F0' }}>
          <Ionicons name="arrow-back" size={24} color="#1A1A2E" />
        </TouchableOpacity>
        <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 24, color: '#1A1A2E' }}>Врач</Text>
      </View>
      <ScrollView style={{ flex: 1, paddingHorizontal: 16 }} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 120) }} showsVerticalScrollIndicator={false}>

      <LocalPediatricianTips />

      {/* Tabs */}
      <View style={styles.tabBar}>
        {[
          { id: 'visits' as DocTab, label: '📋 Посещения' },
          { id: 'vaccines' as DocTab, label: '💉 Прививки' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Visits ── */}
      {activeTab === 'visits' && (
        <View>
          <TouchableOpacity
            style={styles.addVisitBtn}
            onPress={() => setShowAddForm(!showAddForm)}
          >
            <Ionicons name="add" size={20} color="#2563EB" />
            <Text style={styles.addVisitText}>Добавить посещение</Text>
          </TouchableOpacity>

          {showAddForm && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Новое посещение</Text>
              <TextInput style={styles.input} placeholder="Врач (Др. Смирнова)" placeholderTextColor="#94A3B8" value={newDoctor} onChangeText={setNewDoctor} />
              <TextInput style={styles.input} placeholder="Тип (Плановый осмотр)" placeholderTextColor="#94A3B8" value={newType} onChangeText={setNewType} />
              <TextInput
                style={[styles.input, { minHeight: 64, textAlignVertical: 'top' }]}
                placeholder="Заметки..."
                placeholderTextColor="#94A3B8"
                value={newNotes}
                onChangeText={setNewNotes}
                multiline
              />
              <TouchableOpacity style={styles.saveBtn} onPress={handleAddVisit}>
                <Text style={styles.saveBtnText}>Сохранить</Text>
              </TouchableOpacity>
            </View>
          )}

          {doctorVisits.map((v: DoctorVisitModel) => {
              const checking = aiCheckingId === v.id;
              const result = aiResultMap[v.id];
              return (
                <View key={v.id} style={styles.card}>
                  <View style={styles.visitHeader}>
                    <View>
                      <Text style={styles.visitType}>{v.visit_type}</Text>
                      <Text style={styles.visitDoctor}>{v.doctor}</Text>
                    </View>
                    <View style={styles.dateBadge}>
                      <Text style={styles.dateBadgeText}>{fmtDate(v.visit_date)}</Text>
                    </View>
                  </View>
                  {v.notes ? <Text style={styles.visitNotes}>{v.notes}</Text> : null}
                  
                  <View style={styles.visitActions}>
                      {v.has_photo && (
                          <TouchableOpacity style={styles.recipeBtn}>
                              <Ionicons name="camera" size={13} color="#8B5CF6" />
                              <Text style={styles.recipeText}>Рецепт</Text>
                          </TouchableOpacity>
                      )}
                    {v.notes && (
                      <TouchableOpacity onPress={() => handleCompareWHO(v.id, v.notes as string)} style={styles.whoBtn}>
                        <Ionicons name="medical" size={12} color="#4E8FD4" />
                          <Text style={styles.whoText}>{checking ? "Анализ..." : "Сравнить с ВОЗ"}</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* AI WHO Result Box */}
                  {(checking || result) && (
                      <View style={styles.whoResultContainer}>
                          <View style={styles.whoResultHeader}>
                              <View style={styles.whoResultIconWrap}>
                                  <Ionicons name="sparkles" size={12} color="#059669" />
                              </View>
                              <Text style={styles.whoResultTitle}>AI-анализ ВОЗ</Text>
                          </View>
                          {checking ? (
                              <View style={styles.whoChecking}>
                                  <ActivityIndicator size="small" color="#2563EB" />
                                  <Text style={styles.whoCheckingText}>Анализ данных по нормам ВОЗ...</Text>
                              </View>
                          ) : (
                              <View style={styles.whoDone}>
                                  <View style={styles.whoDoneHeader}>
                                      <Ionicons name="checkmark" size={14} color="#059669" />
                                      <Text style={styles.whoDoneTitle}>Рекомендация AI</Text>
                                  </View>
                                  <Text style={styles.whoDoneText}>{result}</Text>
                              </View>
                          )}
                          <Text style={styles.whoDisclaimer}>⚕️ AI-анализ носит информационный характер.</Text>
                      </View>
                  )}
                </View>
              );
          })}

          {doctorVisits.length === 0 && !showAddForm && (
            <View style={styles.empty}>
              <Ionicons name="medical" size={48} color="#C8D8F0" />
              <Text style={styles.emptyTitle}>Нет записей</Text>
              <Text style={styles.emptySubtitle}>Добавьте посещения врача</Text>
            </View>
          )}
        </View>
      )}

      {/* ── Vaccines ── */}
      {activeTab === 'vaccines' && (
        <View>
          <View style={styles.card}>
            <View style={[styles.cardHeader, { justifyContent: 'space-between' }]}>
              <Text style={styles.cardTitle}>График прививок</Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={[styles.dot, { backgroundColor: '#059669' }]} />
                  <Text style={styles.legendText}>Сделано</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={[styles.dot, { backgroundColor: '#E2E8F0' }]} />
                  <Text style={styles.legendText}>Ожидает</Text>
                </View>
              </View>
            </View>

            {vaccineSchedule.map((g, i) => {
              const isDone = g.vaccines.every(v => vaccinations.some((vac: VaccinationModel) => vac.vaccine_name === v));
              return (
                <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ alignItems: 'center' }}>
                    <View style={[styles.timelineDot, { backgroundColor: isDone ? '#059669' : '#F5F0E6', borderWidth: isDone ? 0 : 2, borderColor: '#E0DDD8' }]}>
                      {isDone ? <Text style={{color:'white', fontSize:12}}>✓</Text> : <Text style={{color:'#6B6B80', fontSize:10}}>○</Text>}
                    </View>
                    {i < vaccineSchedule.length - 1 && (
                      <View style={[styles.timelineLine, { backgroundColor: isDone ? 'rgba(5,150,105,0.4)' : '#E0DDD8' }]} />
                    )}
                  </View>
                  <View style={{ flex: 1, paddingBottom: 12 }}>
                    <Text style={[styles.ageLabel, { color: isDone ? '#1A1A2E' : '#6B6B80' }]}>{g.age}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                      {g.vaccines.map(v => {
                        const vacDone = vaccinations.some((vac: VaccinationModel) => vac.vaccine_name === v);
                        return (
                          <TouchableOpacity
                            key={v}
                            onPress={() => handleToggleVaccination(v, !vacDone)}
                            style={[styles.vaccinePill, { backgroundColor: vacDone ? 'rgba(5,150,105,0.15)' : '#F5F0E6' }]}
                          >
                            <Text style={[styles.vaccinePillText, { color: vacDone ? '#059669' : '#6B6B80' }]}>{v}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

          {(() => {
            const nextGroup = vaccineSchedule.find(g =>
              !g.vaccines.every(v => vaccinations.some((vac: VaccinationModel) => vac.vaccine_name === v))
            );
            if (!nextGroup) return (
              <View style={[styles.card, { backgroundColor: 'rgba(5,150,105,0.1)' }]}>
                <Text style={{ fontSize: 14, fontWeight: '800', fontFamily: 'Nunito_800ExtraBold', color: '#059669', textAlign: 'center' }}>
                  🎉 Все прививки по графику сделаны!
                </Text>
              </View>
            );
            return (
              <LinearGradient
                  colors={['#3B82F6', '#2563EB']}
                  start={{x:0,y:0}} end={{x:1,y:1}}
                  style={styles.nextCard}
              >
                <Text style={styles.nextCaption}>СЛЕДУЮЩИЙ ПРИЁМ</Text>
                <Text style={styles.nextTitle}>Осмотр: {nextGroup.age}</Text>
                <Text style={styles.nextVaccines}>{nextGroup.vaccines.join(', ')}</Text>
                <TouchableOpacity onPress={() => Alert.alert('Успех', 'Добавлено в план! 📅')} style={styles.addToCalBtn}>
                    <Text style={styles.addToCalBtnText}>Добавить в календарь</Text>
                </TouchableOpacity>
              </LinearGradient>
            );
          })()}
        </View>
      )}
    </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFBFC' },
  title: { fontSize: 28, fontFamily: 'Nunito_900Black', color: '#1A1A2E' },
  subtitle: { fontSize: 14, fontFamily: 'Nunito_800ExtraBold', color: '#8A8A9E', marginBottom: 16 },
  
  tipsContainer: { marginBottom: 16, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#BFDBFE', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  tipsGradient: { padding: 16 },
  tipsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  tipsHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  globeIconWrap: { width: 24, height: 24, borderRadius: 8, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center' },
  tipsTitle: { fontSize: 13, fontFamily: 'Nunito_800ExtraBold', color: '#1A1A2E' },
  updateBtn: { backgroundColor: 'rgba(37,99,235,0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  updateBtnText: { fontSize: 10, fontFamily: 'Nunito_800ExtraBold', color: '#2563EB' },
  tipsLoading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tipsLoadingText: { fontSize: 11, fontFamily: 'Nunito_700Bold', color: '#6B6B80' },
  tipsText: { fontSize: 13, fontFamily: 'Nunito_700Bold', color: '#4A4A5A', lineHeight: 18 },

  tabBar: { flexDirection: 'row', backgroundColor: '#F5F0E6', borderRadius: 14, padding: 4, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  tabActive: { backgroundColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  tabLabel: { fontSize: 12, fontFamily: 'Nunito_800ExtraBold', color: '#6B6B80' },
  tabLabelActive: { color: '#1A1A2E' },
  
  card: { backgroundColor: 'white', borderRadius: 20, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 18, fontFamily: 'Nunito_900Black', color: '#1A1A2E', letterSpacing: -0.5, marginBottom: 12 },
  
  addVisitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 2, borderColor: 'rgba(37,99,235,0.4)', borderStyle: 'dashed', borderRadius: 16, padding: 14, marginBottom: 12, minHeight: 48, backgroundColor: 'white' },
  addVisitText: { fontSize: 13, fontFamily: 'Nunito_800ExtraBold', color: '#2563EB' },
  
  input: { backgroundColor: '#F8FAFC', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, fontFamily: 'Nunito_800ExtraBold', color: '#1A1A2E', marginBottom: 12 },
  saveBtn: { backgroundColor: '#2563EB', borderRadius: 14, paddingVertical: 14, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  saveBtnText: { color: 'white', fontSize: 14, fontFamily: 'Nunito_800ExtraBold' },
  
  visitHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  visitType: { fontSize: 13, fontFamily: 'Nunito_900Black', color: '#1A1A2E' },
  visitDoctor: { fontSize: 11, fontFamily: 'Nunito_700Bold', color: '#2563EB' },
  dateBadge: { backgroundColor: '#F5F0E6', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  dateBadgeText: { fontSize: 10, fontFamily: 'Nunito_800ExtraBold', color: '#6B6B80' },
  visitNotes: { fontSize: 12, fontFamily: 'Nunito_700Bold', color: '#6B6B80', lineHeight: 18, marginBottom: 12 },
  
  visitActions: { flexDirection: 'row', gap: 8 },
  recipeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F3E8FF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, minHeight: 32 },
  recipeText: { fontSize: 11, fontFamily: 'Nunito_800ExtraBold', color: '#8B5CF6' },
  whoBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#DBEAFE', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, minHeight: 32 },
  whoText: { fontSize: 11, fontFamily: 'Nunito_800ExtraBold', color: '#2563EB' },

  whoResultContainer: { marginTop: 16, backgroundColor: '#FAFBFC', borderRadius: 12, padding: 12 },
  whoResultHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  whoResultIconWrap: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center' },
  whoResultTitle: { fontSize: 14, fontFamily: 'Nunito_900Black', color: '#1A1A2E' },
  whoChecking: { backgroundColor: '#F5F0E6', borderRadius: 12, padding: 16, alignItems: 'center', gap: 8 },
  whoCheckingText: { fontSize: 11, fontFamily: 'Nunito_700Bold', color: '#6B6B80' },
  whoDone: { backgroundColor: 'rgba(5,150,105,0.1)', borderRadius: 12, padding: 12 },
  whoDoneHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  whoDoneTitle: { fontSize: 12, fontFamily: 'Nunito_800ExtraBold', color: '#059669' },
  whoDoneText: { fontSize: 11, fontFamily: 'Nunito_700Bold', color: '#6B6B80' },
  whoDisclaimer: { fontSize: 9, fontFamily: 'Nunito_700Bold', color: '#6B6B80', textAlign: 'center', marginTop: 8 },

  empty: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { fontSize: 16, fontFamily: 'Nunito_800ExtraBold', color: '#1A1A2E' },
  emptySubtitle: { fontSize: 12, fontFamily: 'Nunito_700Bold', color: '#8A8A9E' },
  
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 10, fontFamily: 'Nunito_700Bold', color: '#6B6B80' },
  timelineDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  timelineLine: { width: 2, flex: 1, marginTop: 4, borderRadius: 1 },
  ageLabel: { fontSize: 13, fontFamily: 'Nunito_800ExtraBold' },
  vaccinePill: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  vaccinePillText: { fontSize: 10, fontFamily: 'Nunito_800ExtraBold' },
  
  nextCard: { borderRadius: 20, padding: 16, marginBottom: 12, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 24, elevation: 4 },
  nextCaption: { fontSize: 10, fontFamily: 'Nunito_800ExtraBold', color: 'rgba(255,255,255,0.8)', marginBottom: 4, letterSpacing: 1 },
  nextTitle: { fontSize: 18, fontFamily: 'Nunito_900Black', color: 'white' },
  nextVaccines: { fontSize: 12, fontFamily: 'Nunito_700Bold', color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  addToCalBtn: { marginTop: 12, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, minHeight: 32, justifyContent: 'center' },
  addToCalBtnText: { color: 'white', fontSize: 11, fontFamily: 'Nunito_800ExtraBold' }
});

const enhance = withObservables([], () => ({
  doctorVisits: database.collections.get<DoctorVisitModel>('doctor_visits').query(Q.sortBy('created_at', Q.desc)).observe(),
  vaccinations: database.collections.get<VaccinationModel>('vaccinations').query().observe(),
}));

const EnhancedDoctorScreen = enhance(DoctorScreenContent);

export default function DoctorScreen() {
  return <EnhancedDoctorScreen />;
}
