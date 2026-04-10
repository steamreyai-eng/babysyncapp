import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform, Alert, KeyboardAvoidingView, TextInput, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Svg, { Line, Path, Circle as SvgCircle, Text as SvgText } from 'react-native-svg';
import { database } from '../db';
import { GrowthRecord } from '../db/models/GrowthRecord';
import { useAuthStore } from '../store/authStore';
import withObservables from '@nozbe/with-observables';
import { Q } from '@nozbe/watermelondb';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const months = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const P3 = [2.4, 3.2, 4.0, 4.7, 5.4, 5.9, 6.4, 6.8, 7.2, 7.5, 7.9, 8.1, 8.4];
const P50 = [3.2, 4.2, 5.1, 5.8, 6.4, 7.0, 7.5, 8.0, 8.5, 8.9, 9.2, 9.6, 9.9];
const P97 = [4.2, 5.5, 6.6, 7.5, 8.3, 9.0, 9.7, 10.2, 10.8, 11.3, 11.7, 12.1, 12.6];

const W = 280, H = 130;
const minKg = 2, maxKg = 13;
const toX = (m: number) => (m / 12) * W;
const toY = (kg: number) => H - ((kg - minKg) / (maxKg - minKg)) * H;
const pathD = (data: number[]) => data.map((v, i) => `${i === 0 ? 'M' : 'L'} ${toX(months[i]).toFixed(1)} ${toY(v).toFixed(1)}`).join(' ');

const milestones = [
  { month: 1, text: 'Поднимает подбородок лёжа на животе' },
  { month: 2, text: 'Улыбается людям' },
  { month: 3, text: 'Следит за предметами' },
  { month: 4, text: 'Уверенно держит голову' },
  { month: 4, text: 'Смеётся и гулит' },
  { month: 5, text: 'Узнаёт знакомых людей' },
  { month: 6, text: 'Сидит без поддержки' },
  { month: 6, text: 'Лепечет' },
  { month: 7, text: 'Перекладывает из руки в руку' },
  { month: 8, text: 'Ползает' },
];

type Metric = 'weight' | 'height' | 'head';

const METRICS_CFG = [
  { key: 'weight' as Metric, label: 'Вес', icon: 'scale', bg: '#DBEAFE', color: '#2563EB', unit: 'кг', field: 'weight_kg' },
  { key: 'height' as Metric, label: 'Рост', icon: 'resize', bg: '#F3E8FF', color: '#8B5CF6', unit: 'см', field: 'height_cm' },
  { key: 'head' as Metric, label: 'Голова', icon: 'ellipse', bg: '#D1FAE5', color: '#059669', unit: 'см', field: 'head_cm' },
];

function GrowthScreenContent({ growthRecords }: { growthRecords: GrowthRecord[] }) {
  const navigation = useNavigation();
  const { baby } = useAuthStore();
  const session = useAuthStore(state => state.session);
  const activeParent = useAuthStore(state => state.activeParent);
  const insets = useSafeAreaInsets();
  
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [activeChart, setActiveChart] = useState<Metric>('weight');
  
  const [openPicker, setOpenPicker] = useState<Metric | null>(null);
  const [pickerValues, setPickerValues] = useState<Record<Metric, string>>({
    weight: '6.0',
    height: '60.0',
    head: '40.0',
  });
  const [saving, setSaving] = useState<Metric | null>(null);

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

  useEffect(() => {
    AsyncStorage.getItem('growth_milestones').then(val => {
      if (val) setChecks(JSON.parse(val));
    });
  }, []);

  const toggle = (text: string) => {
    setChecks(prev => {
      const updated = { ...prev, [text]: !prev[text] };
      AsyncStorage.setItem('growth_milestones', JSON.stringify(updated));
      return updated;
    });
  };

  const handleAdd = async (cfg: typeof METRICS_CFG[0]) => {
    const valStr = pickerValues[cfg.key];
    const val = parseFloat(valStr.replace(',', '.'));
    if (!val || isNaN(val)) {
      Alert.alert('Ошибка', 'Введите корректное число');
      return;
    }
    
    setSaving(cfg.key);
    try {
      await database.write(async () => {
        await database.get<GrowthRecord>('growth_records').create(r => {
          if (cfg.field === 'weight_kg') r.weight_kg = val;
          if (cfg.field === 'height_cm') r.height_cm = val;
          if (cfg.field === 'head_cm') r.head_cm = val; // Assuming headValue was meant to be val for head_cm
          r.recorded_by = 'user';
          r.created_at = Date.now();
        });
      });
      setOpenPicker(null);
    } catch (e) {
      Alert.alert("Ошибка", "Не удалось сохранить");
    } finally {
      setSaving(null);
    }
  };

  const fmtDate = (iso: string | Date) => new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });

  return (
    <View style={{ flex: 1, backgroundColor: '#FAFBFC' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <View style={{ paddingTop: Math.max(insets.top, 16), paddingHorizontal: 16, paddingBottom: 16, backgroundColor: '#FAFBFC', flexDirection: 'row', alignItems: 'center' }}>
           <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, marginRight: 16, borderWidth: 1, borderColor: '#E2E8F0' }}>
               <Ionicons name="arrow-back" size={24} color="#1A1A2E" />
           </TouchableOpacity>
           <View>
               <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 24, color: '#1A1A2E' }}>Рост и развитие</Text>
           </View>
        </View>

        <ScrollView 
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: Math.max(insets.bottom, 40) }} 
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366F1']} />}
        >

        {/* 3 Metric Cards */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
          {METRICS_CFG.map(m => {
            const latestRecord = growthRecords.find(r => r[m.field as keyof GrowthRecord] != null);
            const latest = latestRecord ? latestRecord[m.field as keyof GrowthRecord] : null;
            const isOpen = openPicker === m.key;

            return (
              <View key={m.key} style={{ flex: 1, backgroundColor: m.bg, borderRadius: 20, padding: 12, marginHorizontal: 4, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={m.icon as any} size={24} color={m.color} style={{ marginBottom: 4 }} />
                <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 10, color: '#1A1A2E' }}>{m.label} ({m.unit})</Text>
                <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 13, color: m.color, marginBottom: 8 }}>{latest != null ? `${latest}${m.unit}` : "—"}</Text>
                
                <TouchableOpacity onPress={() => setOpenPicker(isOpen ? null : m.key)} style={{ backgroundColor: isOpen ? m.color : 'white', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 8, width: '100%', alignItems: 'center', justifyContent: 'center', shadowColor: isOpen ? m.color : '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: isOpen ? 0.3 : 0.05, shadowRadius: 6, elevation: 2, borderWidth: 2, borderColor: isOpen ? m.color : 'transparent' }}>
                  <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 11, color: isOpen ? 'white' : m.color }}>{isOpen ? "Скрыть" : "Выбрать ↕"}</Text>
                </TouchableOpacity>

                {isOpen && (
                  <View style={{ width: '100%', marginTop: 8, backgroundColor: 'white', borderRadius: 14, padding: 8, shadowColor: m.color, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 4 }}>
                    <TextInput 
                      value={pickerValues[m.key]} 
                      onChangeText={(t) => setPickerValues(v => ({ ...v, [m.key]: t }))} 
                      keyboardType="decimal-pad" 
                      style={{ backgroundColor: '#F9F8F6', borderRadius: 10, padding: 8, textAlign: 'center', fontFamily: 'Nunito_900Black', fontSize: 16, color: '#1A1A2E', marginBottom: 8, borderWidth: 1, borderColor: m.bg }} 
                    />
                    <TouchableOpacity onPress={() => handleAdd(m)} style={{ backgroundColor: m.color, paddingVertical: 8, borderRadius: 10, alignItems: 'center' }}>
                      <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 11, color: 'white' }}>{saving === m.key ? "..." : "✓ Добавить"}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* WHO Chart */}
        <View style={{ backgroundColor: 'white', borderRadius: 24, padding: 20, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 16, elevation: 2, borderWidth: 1, borderColor: '#F0ECE8', marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 16, color: '#1A1A2E' }}>Перцентили ВОЗ</Text>
            <View style={{ flexDirection: 'row', backgroundColor: '#F5F0E6', borderRadius: 10, padding: 2 }}>
              {[{ id: 'weight', label: 'Вес' }, { id: 'height', label: 'Рост' }, { id: 'head', label: 'Гол.' }].map(c => (
                <TouchableOpacity key={c.id} onPress={() => setActiveChart(c.id as Metric)} style={{ backgroundColor: activeChart === c.id ? 'white' : 'transparent', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, shadowColor: activeChart === c.id ? '#000' : 'transparent', shadowOpacity: 0.05, shadowRadius: 4, elevation: activeChart === c.id ? 1 : 0 }}>
                  <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 10, color: activeChart === c.id ? '#1A1A2E' : '#8A8A9E' }}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={{ borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#E0DDD8', backgroundColor: 'white', padding: 8 }}>
            <Svg viewBox={`0 0 ${W} ${H + 12}`} style={{ width: '100%', height: 150 }}>
              {[3, 5, 7, 9, 11].map(kg => (
                <Line key={kg} x1="0" y1={toY(kg)} x2={W} y2={toY(kg)} stroke="#E0DDD8" strokeWidth="0.5" />
              ))}
              <Path d={pathD(P3)} stroke="#EF4444" strokeWidth="1" fill="none" opacity={0.5} />
              <Path d={pathD(P50)} stroke="#059669" strokeWidth="2" fill="none" />
              <Path d={pathD(P97)} stroke="#8B5CF6" strokeWidth="1" fill="none" opacity={0.5} />
              {[{ d: P3, label: 'P3', color: '#EF4444' }, { d: P50, label: 'P50', color: '#059669' }, { d: P97, label: 'P97', color: '#8B5CF6' }].map(({ d, label, color }) => (
                <SvgText key={label} x={W - 2} y={toY(d[d.length - 1]) + 3} fontSize="7" fill={color} fontWeight="700" textAnchor="end">{label}</SvgText>
              ))}
              {growthRecords.slice(0, 3).map((r, i) => {
                if (!baby?.birthdate) return null;
                const recDate = new Date(r.created_at);
                const monthAge = (recDate.getTime() - new Date(baby.birthdate).getTime()) / (30.44 * 24 * 3600 * 1000);
                const val = activeChart === 'weight' ? r.weight_kg : activeChart === 'height' ? r.height_cm : r.head_cm;
                if (!val || monthAge < 0 || monthAge > 12) return null;
                return <SvgCircle key={r.id} cx={toX(monthAge)} cy={toY(val)} r={i === 0 ? 5 : 3.5} fill="#8B5CF6" stroke="white" strokeWidth="1.5" />;
              })}
              {[0, 3, 6, 9, 12].map(m => (
                <SvgText key={m} x={toX(m)} y={H + 10} fontSize="6" fill="#6B6B80" textAnchor="middle">{m}мес</SvgText>
              ))}
            </Svg>
          </View>
        </View>

        {/* Milestones */}
        <View style={{ backgroundColor: 'white', borderRadius: 24, padding: 20, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 16, elevation: 2, borderWidth: 1, borderColor: '#F0ECE8', marginBottom: 20 }}>
          <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 16, color: '#1A1A2E', marginBottom: 16 }}>Этапы развития</Text>
          {[1, 2, 3, 4, 5, 6, 7, 8].filter(m => milestones.some(ms => ms.month === m)).map(mo => (
            <View key={mo} style={{ marginBottom: 16 }}>
              <View style={{ backgroundColor: '#2563EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 8 }}>
                <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 11, color: 'white' }}>Месяц {mo}</Text>
              </View>
              {milestones.filter(ms => ms.month === mo).map(ms => (
                <TouchableOpacity key={ms.text} onPress={() => toggle(ms.text)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}>
                  <View style={{ width: 20, height: 20, borderRadius: 6, backgroundColor: checks[ms.text] ? '#2563EB' : 'white', borderWidth: checks[ms.text] ? 0 : 2, borderColor: '#E0DDD8', alignItems: 'center', justifyContent: 'center' }}>
                    {checks[ms.text] && <Ionicons name="checkmark" size={14} color="white" />}
                  </View>
                  <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 13, color: checks[ms.text] ? '#8A8A9E' : '#1A1A2E', textDecorationLine: checks[ms.text] ? 'line-through' : 'none' }}>{ms.text}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>

        {/* History */}
        <View style={{ backgroundColor: 'white', borderRadius: 24, padding: 20, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 16, elevation: 2, borderWidth: 1, borderColor: '#F0ECE8' }}>
          <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 16, color: '#1A1A2E', marginBottom: 16 }}>История измерений</Text>
          {growthRecords.length === 0 ? (
            <Text style={{ textAlign: 'center', fontFamily: 'Nunito_700Bold', fontSize: 13, color: '#8A8A9E', paddingVertical: 16 }}>Нет измерений</Text>
          ) : (
            growthRecords.map((r, i) => (
              <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: i < growthRecords.length - 1 ? 1 : 0, borderBottomColor: 'rgba(224, 221, 216, 0.5)' }}>
                <View style={{ width: 32, height: 32, borderRadius: 12, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Ionicons name="resize" size={16} color="#2563EB" />
                </View>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View>
                    <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 13, color: '#1A1A2E' }}>{fmtDate(new Date(r.created_at))}</Text>
                    <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 11, color: '#8A8A9E', marginTop: 2 }}>
                      {[r.weight_kg && `${r.weight_kg} кг`, r.height_cm && `${r.height_cm} см`, r.head_cm && `${r.head_cm} см гол.`].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => { /* setEditTarget({ kind: 'growth', record: r }) */ }} style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#F5F5F9', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="pencil" size={14} color="#8A8A9E" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const enhance = withObservables([], () => ({
  growthRecords: database.collections.get<GrowthRecord>('growth_records').query(Q.sortBy('created_at', Q.desc)).observe(),
}));

export default enhance(GrowthScreenContent);
