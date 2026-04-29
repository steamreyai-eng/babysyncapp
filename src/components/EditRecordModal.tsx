
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, Modal, TextInput, Alert,
  Platform, ScrollView, KeyboardAvoidingView, Dimensions,
  Keyboard, Animated as RNAnimated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePickerModal from './DateTimePickerModal';
import { database } from '../db';
import { Feeding } from '../db/models/Feeding';
import { Sleep } from '../db/models/Sleep';
import { Diaper } from '../db/models/Diaper';
import { Walk } from '../db/models/Walk';
import { pushNow } from '../db/sync';

/* ── Types ── */
export type EditTarget =
  | { kind: 'feeding'; record: Feeding }
  | { kind: 'sleep'; record: Sleep }
  | { kind: 'diaper'; record: Diaper }
  | { kind: 'walk'; record: Walk };

interface Props {
  target: EditTarget | null;
  onClose: () => void;
}

/* ── Feeding Edit ── */
const FeedingEdit = ({ record, onClose }: { record: any; onClose: () => void }) => {
  const [desc, setDesc] = useState(record.description || '');
  const [vol, setVol] = useState(String(record.formula_volume_ml || 0));
  const [time, setTime] = useState(new Date(record.created_at));
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await database.write(async () => {
        await record.update((r: any) => {
          r.description = desc;
          if (record.type === 'formula') r.formula_volume_ml = parseInt(vol) || 0;
          r.created_at = time.getTime();
        });
      });
      pushNow();
      onClose();
    } catch { Alert.alert('Ошибка', 'Не удалось сохранить'); }
    setSaving(false);
  };

  const handleDelete = () => {
    Alert.alert('Удалить?', 'Удалить эту запись навсегда?', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: async () => {
        await database.write(async () => { await record.markAsDeleted(); });
        pushNow();
        onClose();
      }},
    ]);
  };

  return (
    <View style={{ gap: 16 }}>
      <View>
        <Text style={s.label}>ОПИСАНИЕ</Text>
        <TextInput value={desc} onChangeText={setDesc} placeholder="Описание..." placeholderTextColor="#A0A0B0" style={s.input} />
      </View>
      {record.type === 'formula' && (
        <View>
          <Text style={s.label}>ОБЪЁМ (мл)</Text>
          <TextInput value={vol} onChangeText={setVol} keyboardType="numeric" placeholder="0" placeholderTextColor="#A0A0B0" style={s.input} />
        </View>
      )}
      <View>
        <Text style={s.label}>ДАТА И ВРЕМЯ</Text>
        <TouchableOpacity onPress={() => setShowPicker(true)} style={s.input}>
          <Text style={s.inputText}>
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {time.toLocaleDateString('ru-RU')}
          </Text>
        </TouchableOpacity>
        <DateTimePickerModal visible={showPicker} value={time} mode="time" is24Hour
            onChange={(d) => { if (d) setTime(d); }} onClose={() => setShowPicker(false)} />
      </View>
      <View style={s.actions}>
        <TouchableOpacity onPress={handleDelete} style={s.deleteBtn}>
          <Ionicons name="trash" size={18} color="#E05A5A" />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSave} disabled={saving}
          style={[s.saveBtn, { backgroundColor: saving ? '#A8A8B6' : '#5B9BD5' }]}>
          <Ionicons name="save" size={16} color="white" style={{ marginRight: 8 }} />
          <Text style={s.saveBtnText}>{saving ? 'Сохранение...' : 'Сохранить'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

/* ── Diaper Edit ── */
const DiaperEdit = ({ record, onClose }: { record: any; onClose: () => void }) => {
  const [type, setType] = useState(record.type || 'wet');
  const [color, setColor] = useState(record.color || '');
  const [note, setNote] = useState(record.note || '');
  const [time, setTime] = useState(new Date(record.created_at));
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const types = [
    { id: 'wet', label: 'Мокрый 💧' },
    { id: 'dirty', label: 'Грязный 💩' },
    { id: 'both', label: 'Оба 🌀' },
  ];

  const handleSave = async () => {
    setSaving(true);
    try {
      await database.write(async () => {
        await record.update((r: any) => {
          r.type = type;
          r.color = color || undefined;
          r.note = note || undefined;
          r.created_at = time.getTime();
        });
      });
      pushNow();
      onClose();
    } catch { Alert.alert('Ошибка', 'Не удалось сохранить'); }
    setSaving(false);
  };

  const handleDelete = () => {
    Alert.alert('Удалить?', 'Удалить эту запись навсегда?', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: async () => {
        await database.write(async () => { await record.markAsDeleted(); });
        pushNow();
        onClose();
      }},
    ]);
  };

  return (
    <View style={{ gap: 16 }}>
      <View>
        <Text style={s.label}>ТИП</Text>
        <View style={{ flexDirection: 'row', backgroundColor: '#F5F0E6', borderRadius: 12, padding: 4 }}>
          {types.map(t => (
            <TouchableOpacity key={t.id} onPress={() => setType(t.id)}
              style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: type === t.id ? 'white' : 'transparent', alignItems: 'center',
                shadowColor: type === t.id ? '#000' : 'transparent', shadowOpacity: 0.05, shadowRadius: 4, elevation: type === t.id ? 1 : 0 }}>
              <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 12, color: type === t.id ? '#1A1A2E' : '#6B6B80' }}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View>
        <Text style={s.label}>ЦВЕТ</Text>
        <TextInput value={color} onChangeText={setColor} placeholder="Необязательно" placeholderTextColor="#A0A0B0" style={s.input} />
      </View>
      <View>
        <Text style={s.label}>ЗАМЕТКА</Text>
        <TextInput value={note} onChangeText={setNote} placeholder="Необязательно" placeholderTextColor="#A0A0B0" style={s.input} />
      </View>
      <View>
        <Text style={s.label}>ДАТА И ВРЕМЯ</Text>
        <TouchableOpacity onPress={() => setShowPicker(true)} style={s.input}>
          <Text style={s.inputText}>
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {time.toLocaleDateString('ru-RU')}
          </Text>
        </TouchableOpacity>
        <DateTimePickerModal visible={showPicker} value={time} mode="time" is24Hour
            onChange={(d) => { if (d) setTime(d); }} onClose={() => setShowPicker(false)} />
      </View>
      <View style={s.actions}>
        <TouchableOpacity onPress={handleDelete} style={s.deleteBtn}>
          <Ionicons name="trash" size={18} color="#E05A5A" />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSave} disabled={saving}
          style={[s.saveBtn, { backgroundColor: saving ? '#A8A8B6' : '#5B9BD5' }]}>
          <Ionicons name="save" size={16} color="white" style={{ marginRight: 8 }} />
          <Text style={s.saveBtnText}>{saving ? 'Сохранение...' : 'Сохранить'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

/* ── Sleep Edit ── */
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

const SleepEdit = ({ record, onClose }: { record: any; onClose: () => void }) => {
  const startMs = safeTime(record.start_time) || safeTime(record.created_at);
  const endMs = safeTime(record.end_time) || (startMs + (record.duration_seconds || 0) * 1000);
  const [start, setStart] = useState(new Date(startMs));
  const [end, setEnd] = useState(new Date(endMs));
  const [location, setLocation] = useState(record.location || 'crib');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const isInvalid = end.getTime() <= start.getTime();
  const durationMin = isInvalid ? 0 : Math.floor((end.getTime() - start.getTime()) / 60000);

  const locs = [
    { id: 'crib', label: 'Кроватка' },
    { id: 'stroller', label: 'Коляска' },
    { id: 'arms', label: 'На руках' },
    { id: 'car', label: 'Авто' },
  ];

  const handleSave = async () => {
    if (isInvalid) return;
    setSaving(true);
    try {
      const durationSecs = Math.floor((end.getTime() - start.getTime()) / 1000);
      await database.write(async () => {
        await record.update((r: any) => {
          r.duration_seconds = durationSecs;
          r.location = location;
          r.start_time = start.getTime();
          r.end_time = end.getTime();
          r.created_at = start.getTime();
        });
      });
      pushNow();
      onClose();
    } catch { Alert.alert('Ошибка', 'Не удалось сохранить'); }
    setSaving(false);
  };

  const handleDelete = () => {
    Alert.alert('Удалить?', 'Удалить эту запись навсегда?', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: async () => {
        await database.write(async () => { await record.markAsDeleted(); });
        pushNow();
        onClose();
      }},
    ]);
  };

  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>НАЧАЛО</Text>
          <TouchableOpacity onPress={() => setShowStartPicker(true)} style={s.input}>
            <Text style={s.inputText}>{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          </TouchableOpacity>
            <DateTimePickerModal visible={showStartPicker} value={start} mode="time" is24Hour
              onChange={(d) => { if (d) setStart(d); }} onClose={() => setShowStartPicker(false)} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>КОНЕЦ</Text>
          <TouchableOpacity onPress={() => setShowEndPicker(true)} style={s.input}>
            <Text style={s.inputText}>{end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          </TouchableOpacity>
            <DateTimePickerModal visible={showEndPicker} value={end} mode="time" is24Hour
              onChange={(d) => { if (d) setEnd(d); }} onClose={() => setShowEndPicker(false)} />
        </View>
      </View>
      {isInvalid && <Text style={{ fontSize: 12, fontFamily: 'Nunito_700Bold', color: '#EF4444' }}>Конец должен быть после начала</Text>}
      {!isInvalid && <Text style={{ fontSize: 12, fontFamily: 'Nunito_700Bold', color: '#8A8A9E' }}>
        Длительность: {durationMin > 60 ? `${Math.floor(durationMin / 60)}ч ${durationMin % 60}м` : `${durationMin}м`}
      </Text>}
      <View>
        <Text style={s.label}>МЕСТО</Text>
        <View style={{ flexDirection: 'row', backgroundColor: '#F5F0E6', borderRadius: 12, padding: 4 }}>
          {locs.map(l => (
            <TouchableOpacity key={l.id} onPress={() => setLocation(l.id)}
              style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: location === l.id ? 'white' : 'transparent', alignItems: 'center',
                shadowColor: location === l.id ? '#000' : 'transparent', shadowOpacity: 0.05, shadowRadius: 4, elevation: location === l.id ? 1 : 0 }}>
              <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 10, color: location === l.id ? '#1A1A2E' : '#6B6B80' }}>{l.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={s.actions}>
        <TouchableOpacity onPress={handleDelete} style={s.deleteBtn}>
          <Ionicons name="trash" size={18} color="#E05A5A" />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSave} disabled={saving || isInvalid}
          style={[s.saveBtn, { backgroundColor: saving || isInvalid ? '#A8A8B6' : '#8B6FD4' }]}>
          <Ionicons name="save" size={16} color="white" style={{ marginRight: 8 }} />
          <Text style={s.saveBtnText}>{saving ? 'Сохранение...' : 'Сохранить'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

/* ── Walk Edit ── */
const WalkEdit = ({ record, onClose }: { record: any; onClose: () => void }) => {
  const [notes, setNotes] = useState(record.notes || '');
  const [loc, setLoc] = useState(record.location || 'park');
  const [saving, setSaving] = useState(false);

  const locs = [
    { id: 'park', label: 'Парк' },
    { id: 'city', label: 'Город' },
    { id: 'playground', label: 'Площадка' },
    { id: 'nature', label: 'Природа' },
    { id: 'mall', label: 'ТЦ' },
  ];

  const handleSave = async () => {
    setSaving(true);
    try {
      await database.write(async () => {
        await record.update((r: any) => {
          r.notes = notes || undefined;
          r.location = loc;
        });
      });
      pushNow();
      onClose();
    } catch { Alert.alert('Ошибка', 'Не удалось сохранить'); }
    setSaving(false);
  };

  const handleDelete = () => {
    Alert.alert('Удалить?', 'Удалить эту запись навсегда?', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: async () => {
        await database.write(async () => { await record.markAsDeleted(); });
        pushNow();
        onClose();
      }},
    ]);
  };

  return (
    <View style={{ gap: 16 }}>
      <View>
        <Text style={s.label}>МЕСТО</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {locs.map(l => (
            <TouchableOpacity key={l.id} onPress={() => setLoc(l.id)}
              style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: loc === l.id ? '#059669' : '#F5F0E6' }}>
              <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 12, color: loc === l.id ? 'white' : '#6B6B80' }}>{l.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View>
        <Text style={s.label}>ЗАМЕТКА</Text>
        <TextInput value={notes} onChangeText={setNotes} placeholder="Необязательно" placeholderTextColor="#A0A0B0"
          multiline style={[s.input, { minHeight: 80, textAlignVertical: 'top' }]} />
      </View>
      <View style={s.actions}>
        <TouchableOpacity onPress={handleDelete} style={s.deleteBtn}>
          <Ionicons name="trash" size={18} color="#E05A5A" />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSave} disabled={saving}
          style={[s.saveBtn, { backgroundColor: saving ? '#A8A8B6' : '#059669' }]}>
          <Ionicons name="save" size={16} color="white" style={{ marginRight: 8 }} />
          <Text style={s.saveBtnText}>{saving ? 'Сохранение...' : 'Сохранить'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

/* ── Shell Modal ── */
const titles = {
  feeding: 'Редактировать кормление',
  diaper: 'Редактировать подгузник',
  sleep: 'Редактировать сон',
  walk: 'Редактировать прогулку',
};

export default function EditRecordModal({ target, onClose }: Props) {
  // Manual keyboard tracking for Android (KeyboardAvoidingView broken inside Modal on Android)
  const keyboardPadding = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      RNAnimated.timing(keyboardPadding, {
        toValue: e.endCoordinates.height,
        duration: 250,
        useNativeDriver: false,
      }).start();
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      RNAnimated.timing(keyboardPadding, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  if (!target) return null;

  const sheetContent = (
    <View style={{
      backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24,
      paddingHorizontal: 20, paddingTop: 20, paddingBottom: Platform.OS === 'ios' ? 34 : 20,
      maxHeight: Dimensions.get('window').height * 0.85,
    }}>
      <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#E0DDD8', alignSelf: 'center', marginBottom: 16 }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 17, color: '#1A1A2E' }}>{titles[target.kind]}</Text>
        <TouchableOpacity onPress={onClose}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F5F0E6', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="close" size={18} color="#6B6B80" />
        </TouchableOpacity>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false} keyboardShouldPersistTaps="handled">
        {target.kind === 'feeding' && <FeedingEdit record={target.record} onClose={onClose} />}
        {target.kind === 'diaper' && <DiaperEdit record={target.record} onClose={onClose} />}
        {target.kind === 'sleep' && <SleepEdit record={target.record} onClose={onClose} />}
        {target.kind === 'walk' && <WalkEdit record={target.record} onClose={onClose} />}
      </ScrollView>
    </View>
  );

  return (
    <Modal visible={!!target} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        {Platform.OS === 'ios' ? (
          <KeyboardAvoidingView behavior="padding">
            {sheetContent}
          </KeyboardAvoidingView>
        ) : (
          <RNAnimated.View style={{ paddingBottom: keyboardPadding }}>
            {sheetContent}
          </RNAnimated.View>
        )}
      </View>
    </Modal>
  );
}

const s = {
  label: { fontFamily: 'Nunito_800ExtraBold', fontSize: 11, color: '#8A8A9E', textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 6 },
  input: { backgroundColor: '#F9F8F6', borderRadius: 14, padding: 14, fontFamily: 'Nunito_800ExtraBold', fontSize: 15, color: '#1A1A2E' },
  inputText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 15, color: '#1A1A2E' },
  actions: { flexDirection: 'row' as const, gap: 10, marginTop: 4 },
  deleteBtn: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#E05A5A20', alignItems: 'center' as const, justifyContent: 'center' as const },
  saveBtn: { flex: 1, height: 48, borderRadius: 14, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const },
  saveBtnText: { fontFamily: 'Nunito_900Black', fontSize: 14, color: 'white' },
};
