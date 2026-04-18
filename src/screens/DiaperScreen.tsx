import React, { useState } from 'react';
import { TouchableOpacity, ScrollView, Platform, Alert, KeyboardAvoidingView, TextInput } from 'react-native';
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

import { Wrapper } from '../components/ui/Wrapper';
import { Surface } from '../components/ui/Surface';
import { Typography } from '../components/ui/Typography';
import { ScreenHeader } from '../components/ScreenHeader';
import { DateSelector } from '../components/DateSelector';
import { SegmentedControl } from '../components/SegmentedControl';
import { FormField } from '../components/FormField';
import { ProgressBar } from '../components/ProgressBar';
import { EmptyState } from '../components/EmptyState';
import { IconCircle } from '../components/IconCircle';
import { StatusBadge } from '../components/StatusBadge';
import { COLORS, FONTS, RADIUS } from '../lib/theme';

const COLOR_OPTIONS = [
  { label: 'Жёлтый – жидкий', tag: 'норма', dotColor: '#F5D63D' },
  { label: 'Жёлтый – зернистый', tag: 'норма', dotColor: '#E8C72A' },
  { label: 'Коричневый – мягкий', tag: 'норма', dotColor: '#A67B5B' },
  { label: 'Зелёный – плотный', tag: '', dotColor: '#6BAF6B' },
  { label: 'Тёмный / чёрный', tag: '', dotColor: '#3A3A3A' },
  { label: 'Красный – следы крови', tag: '', dotColor: '#D94F4F' },
];

const TYPE_CONFIG = {
  wet: { label: 'Мокрый', icon: 'water' as const, color: '#2563EB', bg: '#DBEAFE' },
  dirty: { label: 'Грязный', icon: 'cloudy' as const, color: '#F97316', bg: '#FFEDD5' },
  both: { label: 'Оба', icon: 'thunderstorm' as const, color: '#8B5CF6', bg: '#F3E8FF' },
};

const SEGMENT_ITEMS = [
  { key: 'wet', label: 'Мокрый', icon: <Ionicons name="water" size={16} /> },
  { key: 'dirty', label: 'Грязный', icon: <Ionicons name="cloudy" size={16} /> },
  { key: 'both', label: 'Оба', icon: <Ionicons name="thunderstorm" size={16} /> },
];

function DiaperScreenContent({ diapers }: { diapers: Diaper[] }) {
  const navigation = useNavigation();
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

  const today = diapers.filter(d => {
    const date = new Date(d.created_at);
    return date.getDate() === selectedDate.getDate() &&
           date.getMonth() === selectedDate.getMonth() &&
           date.getFullYear() === selectedDate.getFullYear();
  }).sort((a, b) => b.created_at - a.created_at);

  // AI warning logic
  let warningMsg: string | null = null;
  const recent = diapers.sort((a, b) => b.created_at - a.created_at).slice(0, 5);
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
  const isInNorm = today.length >= NORM_MIN && today.length <= NORM_MAX;
  const isBelowNorm = today.length < NORM_MIN;

  const progressTone = isInNorm ? 'success' as const : isBelowNorm ? 'warning' as const : 'primary' as const;
  const normBadgeTone = isInNorm ? 'success' as const : isBelowNorm ? 'warning' as const : 'info' as const;
  const normBadgeLabel = isInNorm ? "Норма" : isBelowNorm ? "Нужно ещё" : "Выше нормы";

  const fmtTime = (ms: number) => {
    const d = new Date(ms);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  return (
    <Wrapper flex={1} bg="#FAFBFC">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <ScreenHeader title="Подгузники" />

        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: Math.max(insets.bottom, 40) }}>

        {/* Date Selector */}
        <Wrapper mb={20}>
          <DateSelector value={selectedDate} onChange={setSelectedDate} tone="diaper" />
        </Wrapper>

        <Typography variant="body" weight="bold" color="textMuted" mb={16}>Физиология</Typography>

        {/* Main Form */}
        <Surface variant="elevated" radius="xl" p={20} mb={20}>

          {/* Time */}
          <Wrapper mb={20}>
            <Typography variant="tiny" weight="extraBold" color="textMuted" uppercase letterSpacing={0.5} mb={8}>Дата и время смены</Typography>
            <TouchableOpacity onPress={() => setShowPicker(true)} style={{ backgroundColor: '#F9F8F6', padding: 16, borderRadius: RADIUS.lg }}>
              <Typography variant="body" weight="bold">{manualTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Typography>
            </TouchableOpacity>
          </Wrapper>

          {/* Type Selector */}
          <Wrapper mb={24}>
            <Typography variant="tiny" weight="extraBold" color="textMuted" uppercase letterSpacing={0.5} mb={8}>Тип подгузника</Typography>
            <SegmentedControl
              items={SEGMENT_ITEMS}
              selected={type}
              onChange={(key) => setType(key as any)}
            />
          </Wrapper>

          {/* Color Options (dirty/both only) */}
          {type !== 'wet' && (
            <Wrapper mb={20}>
              <Typography variant="tiny" weight="extraBold" color="textMuted" uppercase letterSpacing={0.5} mb={12}>Цвет и консистенция</Typography>
              <Wrapper dir="row" wrap="wrap" gap={8}>
                {COLOR_OPTIONS.map(c => {
                  const fullLabel = c.tag ? `${c.label} (${c.tag})` : c.label;
                  const isSelected = color === fullLabel;
                  return (
                    <TouchableOpacity
                      key={c.label}
                      onPress={() => setColor(isSelected ? '' : fullLabel)}
                      style={{
                        width: '48%',
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: 12,
                        borderRadius: RADIUS.lg,
                        backgroundColor: isSelected ? '#DBEAFE' : '#F9F8F6',
                        borderWidth: 1.5,
                        borderColor: isSelected ? '#93C5FD' : 'transparent',
                        minHeight: 48,
                      }}
                      activeOpacity={0.8}
                    >
                      <Wrapper width={14} height={14} mr={8} style={{ borderRadius: 7, backgroundColor: c.dotColor }} />
                      <Typography variant="tiny" weight="bold" color={isSelected ? 'textPrimary' : '#5A5A6E'}>
                        {c.label} {c.tag ? '✓' : ''}
                      </Typography>
                    </TouchableOpacity>
                  );
                })}
              </Wrapper>
            </Wrapper>
          )}

          {/* Notes */}
          <Wrapper mb={24}>
            <FormField
              label="Заметка"
              value={notes}
              onChangeText={setNotes}
              placeholder="Дополнительные заметки..."
              multiline
            />
          </Wrapper>

          {/* Stats Bar */}
          <Surface radius="xl" p={16} mb={16} tone="transparent" style={{ backgroundColor: '#EEF7F5', borderWidth: 1, borderColor: '#D9F0EA' }}>
            <Wrapper dir="row" align="center" justify="space-between" mb={12}>
              <Wrapper>
                <Typography variant="tiny" weight="bold" color="textMuted" uppercase letterSpacing={0.5}>За сегодня</Typography>
                <Wrapper dir="row" align="baseline" mt={2}>
                  <Typography variant="h1" weight="black" letterSpacing={-1}>{today.length}</Typography>
                  <Wrapper ml={6}>
                    <Typography variant="tiny" weight="bold" color="textMuted">/ {NORM_MAX}</Typography>
                  </Wrapper>
                </Wrapper>
              </Wrapper>
              <StatusBadge label={normBadgeLabel} tone={normBadgeTone} size="md" />
            </Wrapper>
            <ProgressBar value={today.length} max={NORM_MAX} tone={progressTone} />
            <Wrapper dir="row" justify="space-between" mt={6}>
              <Typography variant="tiny" weight="bold" color="textMuted">0</Typography>
              <Typography variant="tiny" weight="bold" color="textMuted">Норма: {NORM_MIN}–{NORM_MAX}</Typography>
            </Wrapper>
          </Surface>

          {/* AI Warning */}
          {warningMsg && (
            <Wrapper dir="row" p={16} mb={20} style={{ backgroundColor: '#FDF1F1', borderRadius: RADIUS.lg, borderWidth: 1, borderColor: '#F9DEDC' }}>
              <Wrapper mr={12}>
                <IconCircle size="md" bg="#FFE4E4">
                  <Ionicons name="warning" size={20} color="#D94F4F" />
                </IconCircle>
              </Wrapper>
              <Wrapper flex={1}>
                <Typography variant="body" weight="black" color="#D94F4F" letterSpacing={-0.2}>AI-предупреждение</Typography>
                <Wrapper mt={4}>
                  <Typography variant="tiny" weight="bold" color="#5A5A6E">{warningMsg}</Typography>
                </Wrapper>
              </Wrapper>
            </Wrapper>
          )}

          {/* Save Button */}
          <Surface
            onPress={handleSave}
            tone={saved ? 'success' : 'primary'}
            variant="elevated"
            radius="lg"
            p={16}
            dir="row"
            align="center"
            justify="center"
          >
            {saved && <Wrapper mr={8}><Ionicons name="checkmark" size={18} color="white" /></Wrapper>}
            <Typography variant="body" weight="black" color="white">{saved ? "Сохранено!" : "Сохранить подгузник"}</Typography>
          </Surface>
        </Surface>

        {/* Journal */}
        <Surface variant="elevated" radius="xl" p={20}>
          <Typography variant="h2" weight="black" letterSpacing={-0.5} mb={16}>Журнал за сегодня</Typography>
          {today.length === 0 ? (
            <EmptyState
              icon={<Ionicons name="happy" size={24} color="#8A8A9E" />}
              title="Нет записей за выбранный день"
            />
          ) : (
            <Wrapper>
              {today.map((d, i) => {
                const cfg = TYPE_CONFIG[d.type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.wet;

                const renderRightActions = () => (
                  <Wrapper dir="row" width={140}>
                    <TouchableOpacity onPress={() => setEditTarget({ kind: 'diaper', record: d })} style={{ flex: 1, backgroundColor: cfg.color, justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name="pencil" size={20} color="white" />
                      <Typography variant="tiny" weight="extraBold" color="white" mt={4}>Изменить</Typography>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteRecord(d as Diaper)} style={{ flex: 1, backgroundColor: '#D94F4F', justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name="trash" size={20} color="white" />
                      <Typography variant="tiny" weight="extraBold" color="white" mt={4}>Удалить</Typography>
                    </TouchableOpacity>
                  </Wrapper>
                );

                return (
                  <Swipeable key={d.id} renderRightActions={renderRightActions} friction={2} rightThreshold={40} containerStyle={{ overflow: 'hidden' }}>
                    <Wrapper dir="row" align="center" py={12} style={{ borderBottomWidth: i < today.length - 1 ? 1 : 0, borderBottomColor: 'rgba(224, 221, 216, 0.5)' }}>
                      <Wrapper mr={12}>
                        <IconCircle bg={cfg.bg}>
                          <Ionicons name={cfg.icon} size={20} color={cfg.color} />
                        </IconCircle>
                      </Wrapper>
                      <Wrapper flex={1} mr={8}>
                        <Typography variant="body" weight="extraBold">
                          {cfg.label}{d.color ? ` · ${d.color}` : ''}
                        </Typography>
                        {d.note && (
                          <Wrapper mt={2}>
                            <Typography variant="tiny" weight="bold" color="textMuted">{d.note}</Typography>
                          </Wrapper>
                        )}
                      </Wrapper>
                      <Typography variant="tiny" weight="extraBold" color="textMuted">{fmtTime(d.created_at)}</Typography>
                    </Wrapper>
                  </Swipeable>
                );
              })}
            </Wrapper>
          )}
        </Surface>

        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 16, alignItems: 'center', marginTop: 8 }}>
          <Typography variant="body" weight="extraBold" color="textMuted">К трекеру</Typography>
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
    </Wrapper>
  );
}

const enhance = withObservables([], () => ({
  diapers: database.collections.get<Diaper>('diapers').query().observe(),
}));

export default enhance(DiaperScreenContent);
