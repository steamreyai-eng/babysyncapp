
import React, { useState, useRef, useEffect } from 'react';
import {
  View, TouchableOpacity, Modal, Alert,
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

import { Wrapper } from './ui/Wrapper';
import { Surface } from './ui/Surface';
import { Typography } from './ui/Typography';
import { Button } from './ui/Button';
import { FormField } from './FormField';
import { SegmentedControl } from './SegmentedControl';
import { ChipGroup } from './ChipGroup';
import { COLORS } from '../lib/theme';

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

/* ── Action Buttons Row ── */
const ActionRow = ({ onDelete, onSave, saving, disabled, tone = 'primary' }: {
  onDelete: () => void;
  onSave: () => void;
  saving: boolean;
  disabled?: boolean;
  tone?: 'primary' | 'danger' | 'success';
}) => (
  <Wrapper dir="row" gap={10} mt={4}>
    <Surface onPress={onDelete} tone="transparent" radius="md" width={48} height={48} align="center" justify="center" bg="#E05A5A20">
      <Ionicons name="trash" size={18} color="#E05A5A" />
    </Surface>
    <Wrapper flex={1}>
      <Button
        variant="solid"
        tone={saving || disabled ? 'neutral' : tone}
        size="lg"
        fullWidth
        disabled={saving || disabled}
        onPress={onSave}
        leftIcon={<Ionicons name="save" size={16} color="white" />}
      >
        {saving ? 'Сохранение...' : 'Сохранить'}
      </Button>
    </Wrapper>
  </Wrapper>
);

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
      onClose();
    } catch { Alert.alert('Ошибка', 'Не удалось сохранить'); }
    setSaving(false);
  };

  const handleDelete = () => {
    Alert.alert('Удалить?', 'Удалить эту запись навсегда?', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: async () => {
        await database.write(async () => { await record.markAsDeleted(); });
        onClose();
      }},
    ]);
  };

  return (
    <Wrapper gap={16}>
      <FormField label="Описание" value={desc} onChangeText={setDesc} placeholder="Описание..." />
      {record.type === 'formula' && (
        <FormField label="Объём (мл)" value={vol} onChangeText={setVol} keyboardType="numeric" placeholder="0" />
      )}
      <Wrapper>
        <Typography variant="caption" weight="extraBold" color="textMuted" uppercase letterSpacing={0.5} mb={6}>Дата и время</Typography>
        <Surface onPress={() => setShowPicker(true)} tone="transparent" radius="md" p={14} bg="#F9F8F6">
          <Typography variant="body" weight="extraBold">
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {time.toLocaleDateString('ru-RU')}
          </Typography>
        </Surface>
        <DateTimePickerModal visible={showPicker} value={time} mode="time" is24Hour
            onChange={(d) => { if (d) setTime(d); }} onClose={() => setShowPicker(false)} />
      </Wrapper>
      <ActionRow onDelete={handleDelete} onSave={handleSave} saving={saving} />
    </Wrapper>
  );
};

/* ── Diaper Edit ── */
const DIAPER_TYPES = [
  { key: 'wet', label: 'Мокрый 💧' },
  { key: 'dirty', label: 'Грязный 💩' },
  { key: 'both', label: 'Оба 🌀' },
];

const DiaperEdit = ({ record, onClose }: { record: any; onClose: () => void }) => {
  const [type, setType] = useState(record.type || 'wet');
  const [color, setColor] = useState(record.color || '');
  const [note, setNote] = useState(record.note || '');
  const [time, setTime] = useState(new Date(record.created_at));
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);

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
      onClose();
    } catch { Alert.alert('Ошибка', 'Не удалось сохранить'); }
    setSaving(false);
  };

  const handleDelete = () => {
    Alert.alert('Удалить?', 'Удалить эту запись навсегда?', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: async () => {
        await database.write(async () => { await record.markAsDeleted(); });
        onClose();
      }},
    ]);
  };

  return (
    <Wrapper gap={16}>
      <Wrapper>
        <Typography variant="caption" weight="extraBold" color="textMuted" uppercase letterSpacing={0.5} mb={6}>Тип</Typography>
        <SegmentedControl items={DIAPER_TYPES} selected={type} onChange={setType} size="sm" />
      </Wrapper>
      <FormField label="Цвет" value={color} onChangeText={setColor} placeholder="Необязательно" />
      <FormField label="Заметка" value={note} onChangeText={setNote} placeholder="Необязательно" />
      <Wrapper>
        <Typography variant="caption" weight="extraBold" color="textMuted" uppercase letterSpacing={0.5} mb={6}>Дата и время</Typography>
        <Surface onPress={() => setShowPicker(true)} tone="transparent" radius="md" p={14} bg="#F9F8F6">
          <Typography variant="body" weight="extraBold">
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {time.toLocaleDateString('ru-RU')}
          </Typography>
        </Surface>
        <DateTimePickerModal visible={showPicker} value={time} mode="time" is24Hour
            onChange={(d) => { if (d) setTime(d); }} onClose={() => setShowPicker(false)} />
      </Wrapper>
      <ActionRow onDelete={handleDelete} onSave={handleSave} saving={saving} />
    </Wrapper>
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

const SLEEP_LOCS = [
  { key: 'crib', label: 'Кроватка' },
  { key: 'stroller', label: 'Коляска' },
  { key: 'arms', label: 'На руках' },
  { key: 'car', label: 'Авто' },
];

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
      onClose();
    } catch { Alert.alert('Ошибка', 'Не удалось сохранить'); }
    setSaving(false);
  };

  const handleDelete = () => {
    Alert.alert('Удалить?', 'Удалить эту запись навсегда?', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: async () => {
        await database.write(async () => { await record.markAsDeleted(); });
        onClose();
      }},
    ]);
  };

  return (
    <Wrapper gap={16}>
      <Wrapper dir="row" gap={12}>
        <Wrapper flex={1}>
          <Typography variant="caption" weight="extraBold" color="textMuted" uppercase letterSpacing={0.5} mb={6}>Начало</Typography>
          <Surface onPress={() => setShowStartPicker(true)} tone="transparent" radius="md" p={14} bg="#F9F8F6">
            <Typography variant="body" weight="extraBold">{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Typography>
          </Surface>
            <DateTimePickerModal visible={showStartPicker} value={start} mode="time" is24Hour
              onChange={(d) => { if (d) setStart(d); }} onClose={() => setShowStartPicker(false)} />
        </Wrapper>
        <Wrapper flex={1}>
          <Typography variant="caption" weight="extraBold" color="textMuted" uppercase letterSpacing={0.5} mb={6}>Конец</Typography>
          <Surface onPress={() => setShowEndPicker(true)} tone="transparent" radius="md" p={14} bg="#F9F8F6">
            <Typography variant="body" weight="extraBold">{end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Typography>
          </Surface>
            <DateTimePickerModal visible={showEndPicker} value={end} mode="time" is24Hour
              onChange={(d) => { if (d) setEnd(d); }} onClose={() => setShowEndPicker(false)} />
        </Wrapper>
      </Wrapper>
      {isInvalid
        ? <Typography variant="tiny" weight="bold" color="#EF4444">Конец должен быть после начала</Typography>
        : <Typography variant="tiny" weight="bold" color="textMuted">
            Длительность: {durationMin > 60 ? `${Math.floor(durationMin / 60)}ч ${durationMin % 60}м` : `${durationMin}м`}
          </Typography>
      }
      <Wrapper>
        <Typography variant="caption" weight="extraBold" color="textMuted" uppercase letterSpacing={0.5} mb={6}>Место</Typography>
        <SegmentedControl items={SLEEP_LOCS} selected={location} onChange={setLocation} size="sm" />
      </Wrapper>
      <ActionRow onDelete={handleDelete} onSave={handleSave} saving={saving} disabled={isInvalid} tone="primary" />
    </Wrapper>
  );
};

/* ── Walk Edit ── */
const WALK_LOCS = [
  { key: 'park', label: 'Парк' },
  { key: 'city', label: 'Город' },
  { key: 'playground', label: 'Площадка' },
  { key: 'nature', label: 'Природа' },
  { key: 'mall', label: 'ТЦ' },
];

const WalkEdit = ({ record, onClose }: { record: any; onClose: () => void }) => {
  const [notes, setNotes] = useState(record.notes || '');
  const [loc, setLoc] = useState(record.location || 'park');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await database.write(async () => {
        await record.update((r: any) => {
          r.notes = notes || undefined;
          r.location = loc;
        });
      });
      onClose();
    } catch { Alert.alert('Ошибка', 'Не удалось сохранить'); }
    setSaving(false);
  };

  const handleDelete = () => {
    Alert.alert('Удалить?', 'Удалить эту запись навсегда?', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: async () => {
        await database.write(async () => { await record.markAsDeleted(); });
        onClose();
      }},
    ]);
  };

  return (
    <Wrapper gap={16}>
      <Wrapper>
        <Typography variant="caption" weight="extraBold" color="textMuted" uppercase letterSpacing={0.5} mb={6}>Место</Typography>
        <ChipGroup items={WALK_LOCS} selected={loc} onChange={setLoc} tone="green" />
      </Wrapper>
      <FormField label="Заметка" value={notes} onChangeText={setNotes} placeholder="Необязательно" multiline />
      <ActionRow onDelete={handleDelete} onSave={handleSave} saving={saving} tone="success" />
    </Wrapper>
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
    <Surface tone="surface" radius="none" px={20} pt={20} pb={Platform.OS === 'ios' ? 34 : 20} style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: Dimensions.get('window').height * 0.85 }}>
      <Wrapper width={40} height={4} bg="#E0DDD8" radius="sm" style={{ borderRadius: 2, alignSelf: 'center' }} mb={16} />
      <Wrapper dir="row" align="center" justify="space-between" mb={20}>
        <Typography variant="h4" weight="black">{titles[target.kind]}</Typography>
        <Surface onPress={onClose} tone="transparent" radius="xl" width={36} height={36} align="center" justify="center" bg="#F5F0E6">
          <Ionicons name="close" size={18} color="#6B6B80" />
        </Surface>
      </Wrapper>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false} keyboardShouldPersistTaps="handled">
        {target.kind === 'feeding' && <FeedingEdit record={target.record} onClose={onClose} />}
        {target.kind === 'diaper' && <DiaperEdit record={target.record} onClose={onClose} />}
        {target.kind === 'sleep' && <SleepEdit record={target.record} onClose={onClose} />}
        {target.kind === 'walk' && <WalkEdit record={target.record} onClose={onClose} />}
      </ScrollView>
    </Surface>
  );

  return (
    <Modal visible={!!target} transparent animationType="slide" onRequestClose={onClose}>
      <Wrapper flex={1} justify="flex-end" bg="rgba(0,0,0,0.4)">
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
      </Wrapper>
    </Modal>
  );
}
