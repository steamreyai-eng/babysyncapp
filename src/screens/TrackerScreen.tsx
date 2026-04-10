
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import withObservables from '@nozbe/with-observables';
import { database } from '../db';
import { Q } from '@nozbe/watermelondb';

const CARDS = [
  { id: 'Feeding', icon: 'water-outline', bg: '#EBF4FF', border: 'rgba(0,0,0,0.04)', iconColor: '#3B82F6', label: 'Кормление' },
  { id: 'Sleep', icon: 'moon-outline', bg: '#F3E8FF', border: 'rgba(0,0,0,0.04)', iconColor: '#8B5CF6', label: 'Сон' },
  { id: 'Diaper', icon: 'water-outline', bg: '#D1FAE5', border: 'rgba(0,0,0,0.04)', iconColor: '#059669', label: 'Подгузник' },
  { id: 'Health', icon: 'heart-outline', bg: '#FFE4E4', border: 'rgba(0,0,0,0.04)', iconColor: '#EF4444', label: 'Здоровье' },
  { id: 'Growth', icon: 'analytics-outline', bg: '#D1FAE5', border: 'rgba(0,0,0,0.04)', iconColor: '#059669', label: 'Рост' },
  { id: 'Shifts', icon: 'sync-outline', bg: '#FFEDD5', border: 'rgba(0,0,0,0.04)', iconColor: '#F97316', label: 'Смены' },
  { id: 'Walk', icon: 'footsteps-outline', bg: '#FEF3C7', border: 'rgba(0,0,0,0.04)', iconColor: '#D97706', label: 'Прогулка' },
  { id: 'Doctor', icon: 'medkit-outline', bg: '#FCE7F3', border: 'rgba(0,0,0,0.04)', iconColor: '#DB2777', label: 'Врач' },
];

const fmtTime = (ms: number) => {
  const d = new Date(ms);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

const getCardSub = (id: string, feedings: any[], sleeps: any[], diapers: any[], walks: any[], growthRecords: any[]) => {
  switch (id) {
    case 'Feeding': {
      const f = feedings[0];
      if (!f) return 'Нет данных';
      const type = f.type === 'breast' ? 'Грудь' : f.type === 'formula' ? 'Смесь' : 'Прикорм';
      const vol = f.formula_volume_ml ? ` (${f.formula_volume_ml}мл)` : '';
      return `${type}${vol} · ${fmtTime(f.created_at)}`;
    }
    case 'Sleep': {
      const s = sleeps[0];
      if (!s) return 'Нет данных';
      const h = Math.floor(s.duration_seconds / 3600);
      const m = Math.floor((s.duration_seconds % 3600) / 60);
      return h > 0 ? `${h}ч ${m}м` : `${m}м`;
    }
    case 'Diaper': {
      const d = diapers[0];
      if (!d) return 'Нет данных';
      const type = d.type === 'wet' ? 'Мокрый' : d.type === 'dirty' ? 'Грязный' : 'Оба';
      return `${type} · ${fmtTime(d.created_at)}`;
    }
    case 'Health':
      return 'Витамин Д 4 капли';
    case 'Growth': {
      const g = growthRecords[0];
      if (!g) return 'Нет данных';
      return g.weight_kg ? `${g.weight_kg} кг` : g.height_cm ? `${g.height_cm} см` : 'Нет данных';
    }
    case 'Shifts':
      return 'Смена дежурства';
    case 'Walk': {
      const w = walks[0];
      if (!w) return 'Нет данных';
      const dur = Math.floor(w.duration_seconds / 60);
      const h = Math.floor(dur / 60);
      const m = dur % 60;
      const durStr = h > 0 ? `${h}ч ${m}м` : `${m}м`;
      const weather = w.weather === 'sunny' ? 'Солнечно' : w.weather === 'cloudy' ? 'Облачно' : w.weather === 'rainy' ? 'Дождь' : w.weather || '';
      return `${durStr} · ${weather}`;
    }
    case 'Doctor':
      return 'Нет данных';
    default:
      return '';
  }
};

const TrackerScreenContent = ({ feedings, sleeps, diapers, walks, growthRecords }: any) => {
  const navigation = useNavigation<any>();

  const [refreshing, setRefreshing] = React.useState(false);
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

  // Build recent events from all data
  const recentEvents = React.useMemo(() => {
    const events: { type: string; icon: string; iconColor: string; iconBg: string; label: string; sub: string; time: number }[] = [];
    feedings.slice(0, 5).forEach((f: any) => {
      const type = f.type === 'breast' ? 'Грудь' : f.type === 'formula' ? 'Смесь' : 'Прикорм';
      const vol = f.formula_volume_ml ? ` (${f.formula_volume_ml}мл, ${type})` : ` (${type})`;
      events.push({ type: 'feeding', icon: 'water-outline', iconColor: '#8B5CF6', iconBg: '#F3E8FF', label: 'Кормление', sub: `${type}${vol}`, time: f.created_at });
    });
    sleeps.slice(0, 3).forEach((s: any) => {
      const h = Math.floor(s.duration_seconds / 3600);
      const m = Math.floor((s.duration_seconds % 3600) / 60);
      events.push({ type: 'sleep', icon: 'moon-outline', iconColor: '#2563EB', iconBg: '#DBEAFE', label: 'Сон', sub: h > 0 ? `${h}ч ${m}м` : `${m}м`, time: s.created_at });
    });
    diapers.slice(0, 5).forEach((d: any) => {
      const type = d.type === 'wet' ? 'Мокрый' : d.type === 'dirty' ? 'Грязный' : 'Оба';
      events.push({ type: 'diaper', icon: 'water-outline', iconColor: '#059669', iconBg: '#D1FAE5', label: 'Подгузник', sub: type, time: d.created_at });
    });
    walks.slice(0, 3).forEach((w: any) => {
      const m = Math.floor(w.duration_seconds / 60);
      events.push({ type: 'walk', icon: 'footsteps-outline', iconColor: '#F97316', iconBg: '#FFEDD5', label: 'Прогулка', sub: `${m}м`, time: w.created_at });
    });
    return events.sort((a, b) => b.time - a.time).slice(0, 10);
  }, [feedings, sleeps, diapers, walks]);

  const fmtEventDate = (ms: number) => {
    const d = new Date(ms);
    const time = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    const day = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    return { time, day };
  };

  return (
    <View style={{ flex: 1, paddingTop: 16, backgroundColor: '#FAFBFC' }}>
      <ScrollView 
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366F1']} />}
      >
        <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 30, color: '#0F172A', marginBottom: 4 }}>Трекер</Text>
        <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 13, color: '#64748B', marginBottom: 24 }}>Быстрый доступ к разделам</Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12, marginTop: 8 }}>
          {CARDS.map((card) => (
            <TouchableOpacity
              key={card.id}
              onPress={() => navigation.navigate(card.id)}
              style={{ width: '48%', borderRadius: 20, padding: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: card.bg, minHeight: 130, borderWidth: 1.5, borderColor: card.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 }}
            >
              <View style={{ marginBottom: 8, height: 40, justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name={card.icon as any} size={36} color={card.iconColor} />
              </View>
              <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 13, color: '#0F172A', marginBottom: 5 }}>{card.label}</Text>
              <Text style={{ fontFamily: 'Nunito_600SemiBold', fontSize: 10, color: '#475569', textAlign: 'center', lineHeight: 14 }} numberOfLines={2}>
                {getCardSub(card.id, feedings, sleeps, diapers, walks, growthRecords)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Events */}
        {recentEvents.length > 0 && (
          <View style={{ backgroundColor: 'white', borderRadius: 20, padding: 16, marginTop: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 }}>
            <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 18, color: '#0F172A', marginBottom: 16 }}>Последние события</Text>
            <View style={{ gap: 12 }}>
              {recentEvents.map((ev, i) => {
                const { time, day } = fmtEventDate(ev.time);
                return (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
                    <View style={{ width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12, flexShrink: 0, backgroundColor: ev.iconBg }}>
                      <Ionicons name={ev.icon as any} size={18} color={ev.iconColor} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                      <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 13, color: '#0F172A' }} numberOfLines={1}>{ev.label}</Text>
                      <Text style={{ fontFamily: 'Nunito_600SemiBold', fontSize: 11, color: '#475569' }} numberOfLines={1}>{ev.sub}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                      <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 10, color: '#475569' }}>{time}</Text>
                      <Text style={{ fontFamily: 'Nunito_600SemiBold', fontSize: 9, color: '#94A3B8' }}>{day}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const enhance = withObservables([], () => ({
  feedings: database.get('feedings').query(Q.sortBy('created_at', Q.desc), Q.take(5)).observe(),
  sleeps: database.get('sleeps').query(Q.sortBy('created_at', Q.desc), Q.take(5)).observe(),
  diapers: database.get('diapers').query(Q.sortBy('created_at', Q.desc), Q.take(5)).observe(),
  walks: database.get('walks').query(Q.sortBy('created_at', Q.desc), Q.take(5)).observe(),
  growthRecords: database.get('growth_records').query(Q.sortBy('created_at', Q.desc), Q.take(1)).observe(),
}));

export default enhance(TrackerScreenContent);
