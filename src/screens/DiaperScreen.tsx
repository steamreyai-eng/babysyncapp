
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform, Alert, KeyboardAvoidingView, TextInput } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import DateTimePickerModal from '../components/DateTimePickerModal';
import { database } from '../db';
import { Diaper } from '../db/models/Diaper';
import { useAuthStore } from '../store/authStore';
import { triggerHaptic } from '../utils/haptics';
import withObservables from '@nozbe/with-observables';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EditRecordModal from '../components/EditRecordModal';

const COLOR_OPTIONS = [
  { label: 'Жёлтый – жидкий', tag: 'норма', dotColor: '#F5D63D' },
  { label: 'Жёлтый – зернистый', tag: 'норма', dotColor: '#E8C72A' },
  { label: 'Коричневый – мягкий', tag: 'норма', dotColor: '#A67B5B' },
  { label: 'Зелёный – плотный', tag: '', dotColor: '#6BAF6B' },
  { label: 'Тёмный / чёрный', tag: '', dotColor: '#3A3A3A' },
  { label: 'Красный – следы крови', tag: '', dotColor: '#D94F4F' },
];

function DiaperScreenContent({ diapers }: { diapers: Diaper[] }) {
  const navigation = useNavigation();
  const session = useAuthStore(state => state.session);
  const activeParent = useAuthStore(state => state.activeParent);
  const insets = useSafeAreaInsets();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [type, setType] = useState<'wet' | 'dirty' | 'both'>('wet');
  const [color, setColor] = useState('');
  const [notes, setNotes] = useState('');

  const [manualTime, setManualTime] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);

  const handleSave = async () => {
    try {
      await database.write(async () => {
        await database.get<Diaper>('diapers').create(diaper => {
          diaper.type = type;
          diaper.color = color || undefined;
          diaper.note = notes || undefined;
          diaper.created_at = manualTime.getTime();
          diaper.recorded_by = activeParent;
        });
      });
      triggerHaptic('success');
      setSaved(true);
      setNotes('');
      setColor('');
      setManualTime(new Date());
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      Alert.alert("Ошибка", "Не удалось сохранить подгузник.");
    }
  };

  const handleDeleteRecord = (record: Diaper) => {
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

  const changeDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d);
  };

  const today = diapers.filter(d => {
    const date = new Date(d.created_at);
    return date.getDate() === selectedDate.getDate() && 
           date.getMonth() === selectedDate.getMonth() && 
           date.getFullYear() === selectedDate.getFullYear();
  }).sort((a,b) => b.created_at - a.created_at);

  let warningMsg = null;
  const recent = diapers.sort((a,b) => b.created_at - a.created_at).slice(0, 5);
  let consecutive = 0;
  for (const d of recent) {
    if (d.type === 'dirty' || d.type === 'both') {
      if (d.color && !d.color.includes('норма')) consecutive++;
      else consecutive = 0;
    } else {
      consecutive = 0;
    }
    if (consecutive >= 3) {
      warningMsg = "Внимание: замечен нестандартный цвет стула 3 и более раз подряд. Рекомендуется консультация педиатра.";
      break;
    }
  }

  const NORM_MIN = 4;
  const NORM_MAX = 8;
  const progressPct = Math.min((today.length / NORM_MAX) * 100, 100);
  const isInNorm = today.length >= NORM_MIN && today.length <= NORM_MAX;
  const isBelowNorm = today.length < NORM_MIN;

  const typeConfig = {
    wet: { label: 'Мокрый', icon: 'water', color: '#2563EB', bg: '#DBEAFE' },
    dirty: { label: 'Грязный', icon: 'cloudy', color: '#F97316', bg: '#FFEDD5' },
    both: { label: 'Оба', icon: 'thunderstorm', color: '#8B5CF6', bg: '#F3E8FF' }
  };

  const fmtTime = (ms: number) => {
    const d = new Date(ms);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FAFBFC' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <View style={{ paddingTop: Math.max(insets.top, 16), paddingHorizontal: 16, paddingBottom: 16, backgroundColor: '#FAFBFC', flexDirection: 'row', alignItems: 'center' }}>
           <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, marginRight: 16, borderWidth: 1, borderColor: '#E2E8F0' }}>
               <Ionicons name="arrow-back" size={24} color="#1A1A2E" />
           </TouchableOpacity>
           <View>
               <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 24, color: '#1A1A2E' }}>Подгузники</Text>
           </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: Math.max(insets.bottom, 40) }}>
        
        {/* Date Selector */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white', borderRadius: 14, padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2, marginBottom: 20 }}>
          <TouchableOpacity onPress={() => changeDate(-1)} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#F5F0E6', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="chevron-back" size={20} color="#6B6B80" />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="calendar" size={16} color="#059669" style={{ marginRight: 8 }} />
            <Text style={{ fontSize: 14, fontFamily: 'Nunito_800ExtraBold', color: '#1A1A2E' }}>
              {selectedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
            </Text>
          </View>
          <TouchableOpacity onPress={() => changeDate(1)} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#F5F0E6', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="chevron-forward" size={20} color="#6B6B80" />
          </TouchableOpacity>
        </View>

          <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 15, color: '#8A8A9E', marginBottom: 16 }}>Физиология</Text>

        {/* Main Form */}
        <View style={{ backgroundColor: 'white', borderRadius: 24, padding: 20, shadowColor: '#8A8A9E', shadowOpacity: 0.08, shadowRadius: 32, elevation: 4, borderWidth: 1, borderColor: '#F0ECE8', marginBottom: 20 }}>
          
          <Text style={{ fontSize: 11, fontFamily: 'Nunito_800ExtraBold', color: '#8A8A9E', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 }}>Дата и время смены</Text>
          <TouchableOpacity onPress={() => setShowPicker(true)} style={{ backgroundColor: '#F9F8F6', padding: 16, borderRadius: 16, marginBottom: 20 }}>
            <Text style={{ fontSize: 16, fontFamily: 'Nunito_700Bold', color: '#1A1A2E' }}>{manualTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
          </TouchableOpacity>
          
          <Text style={{ fontSize: 11, fontFamily: 'Nunito_800ExtraBold', color: '#8A8A9E', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 }}>Тип подгузника</Text>
          <View style={{ flexDirection: 'row', backgroundColor: '#F9F8F6', borderRadius: 16, padding: 4, marginBottom: 24 }}>
            {(Object.keys(typeConfig) as Array<keyof typeof typeConfig>).map(t => {
              const active = type === t;
              const cfg = typeConfig[t];
              return (
                <TouchableOpacity key={t} onPress={() => setType(t)} style={{ flex: 1, height: 44, borderRadius: 12, backgroundColor: active ? 'white' : 'transparent', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', shadowColor: active ? '#000' : 'transparent', shadowOffset: { width: 0, height: 2 }, shadowOpacity: active ? 0.05 : 0, shadowRadius: 8, elevation: active ? 2 : 0 }}>
                  <Ionicons name={cfg.icon as any} size={16} color={active ? cfg.color : '#8A8A9E'} style={{ opacity: active ? 1 : 0.5, marginRight: 6 }} />
                  <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 12, color: active ? cfg.color : '#8A8A9E' }}>{cfg.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {type !== 'wet' && (
             <View style={{ marginBottom: 20 }}>
               <Text style={{ fontSize: 11, fontFamily: 'Nunito_800ExtraBold', color: '#8A8A9E', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 0.5 }}>Цвет и консистенция</Text>
               <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                 {COLOR_OPTIONS.map(c => {
                   const fullLabel = c.tag ? `${c.label} (${c.tag})` : c.label;
                   const isSelected = color === fullLabel;
                   return (
                     <TouchableOpacity key={c.label} onPress={() => setColor(isSelected ? '' : fullLabel)} style={{ width: '48%', flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 14, backgroundColor: isSelected ? '#DBEAFE' : '#F9F8F6', borderWidth: 1.5, borderColor: isSelected ? '#93C5FD' : 'transparent', marginBottom: 8, minHeight: 48 }}>
                       <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: c.dotColor, marginRight: 8, shadowColor: c.dotColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 1 }} />
                       <Text style={{ flex: 1, fontFamily: 'Nunito_700Bold', fontSize: 11, color: isSelected ? '#1A1A2E' : '#5A5A6E', lineHeight: 14 }}>
                         {c.label} {c.tag ? <Text style={{ color: '#059669', fontFamily: 'Nunito_900Black' }}>✓</Text> : ''}
                       </Text>
                     </TouchableOpacity>
                   )
                 })}
               </View>
             </View>
          )}

          <Text style={{ fontSize: 11, fontFamily: 'Nunito_800ExtraBold', color: '#8A8A9E', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 }}>Заметка</Text>
          <TextInput 
            value={notes} 
            onChangeText={setNotes} 
            placeholder="Дополнительные заметки..." 
            placeholderTextColor="#A0A0B0"
            style={{ backgroundColor: '#F9F8F6', borderRadius: 16, padding: 16, fontFamily: 'Nunito_700Bold', fontSize: 15, color: '#1A1A2E', marginBottom: 24, minHeight: 52 }}
          />

          {/* Stats Bar */}
          <View style={{ backgroundColor: '#EEF7F5', borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#D9F0EA' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <View>
                <Text style={{ fontSize: 11, fontFamily: 'Nunito_700Bold', color: '#8A8A9E', textTransform: 'uppercase', letterSpacing: 0.5 }}>За сегодня</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 2 }}>
                  <Text style={{ fontSize: 32, fontFamily: 'Nunito_900Black', color: '#1A1A2E', letterSpacing: -1 }}>{today.length}</Text>
                  <Text style={{ fontSize: 12, fontFamily: 'Nunito_700Bold', color: '#8A8A9E', marginLeft: 6 }}>/ {NORM_MAX}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isInNorm ? '#D1FAE5' : isBelowNorm ? '#FFEDD5' : '#DBEAFE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, borderWidth: 1, borderColor: isInNorm ? '#A7F3D0' : isBelowNorm ? '#FED7AA' : '#BFDBFE' }}>
                <Ionicons name="checkmark" size={14} color={isInNorm ? '#059669' : isBelowNorm ? '#F97316' : '#2563EB'} />
                <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 11, color: isInNorm ? '#059669' : isBelowNorm ? '#F97316' : '#2563EB', marginLeft: 4 }}>
                  {isInNorm ? "Норма" : isBelowNorm ? "Нужно ещё" : "Выше нормы"}
                </Text>
              </View>
            </View>
            <View style={{ height: 6, backgroundColor: 'rgba(138,138,158,0.1)', borderRadius: 3, overflow: 'hidden' }}>
              <View style={{ height: '100%', width: `${progressPct}%`, backgroundColor: isInNorm ? '#10B981' : isBelowNorm ? '#F97316' : '#3B82F6', borderRadius: 3 }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
              <Text style={{ fontSize: 10, fontFamily: 'Nunito_700Bold', color: '#8A8A9E' }}>0</Text>
              <Text style={{ fontSize: 10, fontFamily: 'Nunito_700Bold', color: '#8A8A9E' }}>Норма: {NORM_MIN}–{NORM_MAX}</Text>
            </View>
          </View>

          {/* AI Warning */}
          {warningMsg && (
            <View style={{ backgroundColor: '#FDF1F1', borderRadius: 16, padding: 16, flexDirection: 'row', marginBottom: 20, borderWidth: 1, borderColor: '#F9DEDC' }}>
              <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: '#FFE4E4', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Ionicons name="warning" size={20} color="#D94F4F" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 13, color: '#D94F4F', letterSpacing: -0.2 }}>AI-предупреждение</Text>
                <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 12, color: '#5A5A6E', marginTop: 4, lineHeight: 18 }}>{warningMsg}</Text>
              </View>
            </View>
          )}

          <TouchableOpacity onPress={handleSave} style={{ width: '100%', height: 52, borderRadius: 16, backgroundColor: saved ? '#4DBFAA' : '#5B9BD5', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', shadowColor: saved ? '#3DBFAA' : '#5B9BD5', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 24, elevation: 5 }}>
            {saved && <Ionicons name="checkmark" size={18} color="white" style={{ marginRight: 8 }} />}
            <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 15, color: 'white' }}>{saved ? "Сохранено!" : "Сохранить подгузник"}</Text>
          </TouchableOpacity>
        </View>

        {/* Journal */}
        <View style={{ backgroundColor: 'white', borderRadius: 24, padding: 20, shadowColor: '#8A8A9E', shadowOpacity: 0.08, shadowRadius: 32, elevation: 4, borderWidth: 1, borderColor: '#F0ECE8' }}>
          <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 18, color: '#1A1A2E', letterSpacing: -0.5, marginBottom: 16 }}>Журнал за сегодня</Text>
          {today.length === 0 ? (
            <View style={{ paddingVertical: 32, alignItems: 'center', opacity: 0.6 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#F5F0E6', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <Ionicons name="happy" size={24} color="#8A8A9E" />
              </View>
              <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 13, color: '#8A8A9E' }}>Нет записей за выбранный день</Text>
            </View>
          ) : (
            <View>
              {today.map((d, i) => {
                const cfg = typeConfig[d.type as keyof typeof typeConfig] || typeConfig.wet;
                
                const renderRightActions = () => (
                  <View style={{ flexDirection: 'row', width: 140 }}>
                    <TouchableOpacity onPress={() => setEditTarget({ kind: 'diaper', record: d })} style={{ flex: 1, backgroundColor: cfg.color, justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name="pencil" size={20} color="white" />
                      <Text style={{ color: 'white', fontSize: 10, fontFamily: 'Nunito_800ExtraBold', marginTop: 4 }}>Изменить</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteRecord(d as Diaper)} style={{ flex: 1, backgroundColor: '#D94F4F', justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name="trash" size={20} color="white" />
                      <Text style={{ color: 'white', fontSize: 10, fontFamily: 'Nunito_800ExtraBold', marginTop: 4 }}>Удалить</Text>
                    </TouchableOpacity>
                  </View>
                );

                return (
                  <Swipeable key={d.id} renderRightActions={renderRightActions} friction={2} rightThreshold={40} containerStyle={{ overflow: 'hidden' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: i < today.length - 1 ? 1 : 0, borderBottomColor: 'rgba(224, 221, 216, 0.5)', backgroundColor: 'white' }}>
                      <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: cfg.bg, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                        <Ionicons name={cfg.icon as any} size={20} color={cfg.color} />
                      </View>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 15, color: '#1A1A2E' }}>
                          {cfg.label}{d.color ? ` · ${d.color}` : ''}
                        </Text>
                        {d.note && <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 12, color: '#8A8A9E', marginTop: 2 }} numberOfLines={1}>{d.note}</Text>}
                      </View>
                      <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 13, color: '#8A8A9E' }}>{fmtTime(d.created_at)}</Text>
                    </View>
                  </Swipeable>
                )
              })}
            </View>
          )}
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 16, alignItems: 'center', marginTop: 8 }}>
          <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 16, color: '#8A8A9E' }}>К трекеру</Text>
        </TouchableOpacity>
      </ScrollView>

      <DateTimePickerModal
        visible={showPicker}
        value={manualTime}
        mode="time"
        is24Hour={true}
        onChange={(date) => { if (date) setManualTime(date); }}
        onClose={() => setShowPicker(false)}
      />
      <EditRecordModal target={editTarget} onClose={() => setEditTarget(null)} />
      </KeyboardAvoidingView>
    </View>
  );
}

const enhance = withObservables([], () => ({
  diapers: database.collections.get<Diaper>('diapers').query().observe(),
}));

export default enhance(DiaperScreenContent);

