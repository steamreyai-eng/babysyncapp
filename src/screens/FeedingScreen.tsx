import React, { useState, useEffect } from 'react';
import { ScrollView, TouchableOpacity, TextInput, Platform, Alert, KeyboardAvoidingView, Dimensions } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePickerModal from '../components/DateTimePickerModal';
import { database } from '../db';
import { Feeding } from '../db/models/Feeding';
import { useAuthStore } from '../store/authStore';
import { triggerHaptic } from '../utils/haptics';
import withObservables from '@nozbe/with-observables';
import EditRecordModal from '../components/EditRecordModal';

import { Wrapper } from '../components/ui/Wrapper';
import { Surface } from '../components/ui/Surface';
import { Typography } from '../components/ui/Typography';
import { ScreenHeader } from '../components/ScreenHeader';
import { SegmentedControl } from '../components/SegmentedControl';
import { IconCircle } from '../components/IconCircle';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { COLORS, FONTS, RADIUS } from '../lib/theme';

const { width } = Dimensions.get('window');

const TAB_ITEMS = [
  { key: 'breast', label: 'Грудь', icon: <Ionicons name="water" size={16} /> },
  { key: 'formula', label: 'Смесь', icon: <Ionicons name="flask" size={16} /> },
  { key: 'solid', label: 'Прикорм', icon: <Ionicons name="restaurant" size={16} /> },
];

const TAB_TONES = {
  breast: 'primary' as const,
  formula: 'purple' as const,
  solid: 'green' as const,
};

const TAB_COLORS = {
  breast: { accent: '#4E8FD4', bg: '#F0F7FF', border: '#D1E5FC' },
  formula: { accent: '#7B50C8', bg: '#F5F3FF', border: '#EDE9FE' },
  solid: { accent: '#2A9B7E', bg: '#F0FCF9', border: '#CCF0E6' },
};

function FeedingScreenContent({ feedings }: { feedings: Feeding[] }) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const scrollViewRef = React.useRef<ScrollView>(null);
  
  const TABS = ['breast', 'formula', 'solid'];
  const session = useAuthStore(state => state.session);
  const activeParent = useAuthStore(state => state.activeParent);
  
  const [activeTab, setActiveTab] = useState<'breast' | 'formula' | 'solid'>('breast');
  const [eventTime, setEventTime] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  // Breast
  const [breastSide, setBreastSide] = useState<'Л' | 'П'>('Л');
  const [timerRunning, setTimerRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);

  // Formula
  const [formulaBrand, setFormulaBrand] = useState('Nan Optipro');
  const [temperature, setTemperature] = useState('37');
  const [formulaVolume, setFormulaVolume] = useState('120');

  // Solid
  const [weaningProduct, setWeaningProduct] = useState('');
  const [weaningVolume, setWeaningVolume] = useState('100');
  const [reaction, setReaction] = useState<'happy' | 'neutral' | 'fussy'>('happy');
  const [editTarget, setEditTarget] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerRunning) {
      interval = setInterval(() => setSeconds(s => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const handleSaveBreast = async () => {
    try {
      if (seconds === 0) return Alert.alert("Ошибка", "Запустите таймер или укажите время");
      await database.write(async () => {
        await database.get<Feeding>('feedings').create(f => {
          f.type = 'breast';
          f.recorded_by = activeParent;
          f.created_at = eventTime.getTime();
          f.duration_seconds = seconds;
          f.breast_side = breastSide;
          const m = Math.floor(seconds / 60); const s = seconds % 60;
          f.description = `Грудь (${breastSide === 'Л' ? 'лев.' : 'прав.'}, ${m > 0 ? m + ' мин' : s + ' сек'})`;
        });
      });
      triggerHaptic('success');
      navigation.goBack();
    } catch (error) { Alert.alert("Ошибка", "Не удалось сохранить"); }
  };

  const handleSaveFormula = async () => {
    try {
      const brandStr = formulaBrand.trim() || 'Смесь';
      await database.write(async () => {
        await database.get<Feeding>('feedings').create(f => {
          f.type = 'formula';
          f.recorded_by = activeParent;
          f.created_at = eventTime.getTime();
          f.formula_brand = brandStr;
          f.formula_volume_ml = parseInt(formulaVolume) || 0;
          f.formula_temp_c = parseInt(temperature) || 37;
          f.description = `Смесь (${formulaVolume}мл, ${brandStr}, ${temperature}°C)`;
        });
      });
      triggerHaptic('success');
      navigation.goBack();
    } catch (error) { Alert.alert("Ошибка", "Не удалось сохранить"); }
  };

  const handleSaveSolid = async () => {
    try {
      const prodStr = weaningProduct.trim() || 'Прикорм';
      const reactionStr = reaction === 'happy' ? 'рад' : reaction === 'neutral' ? 'норм' : 'плач';
      await database.write(async () => {
        await database.get<Feeding>('feedings').create(f => {
          f.type = 'solid';
          f.recorded_by = activeParent;
          f.created_at = eventTime.getTime();
          f.solid_product = weaningProduct;
          f.solid_volume_g = parseInt(weaningVolume) || 0;
          f.solid_reaction = reaction;
          f.description = `${prodStr} (${weaningVolume}г, ${reactionStr})`;
        });
      });
      triggerHaptic('success');
      navigation.goBack();
    } catch (error) { Alert.alert("Ошибка", "Не удалось сохранить"); }
  };

  const handleDeleteRecord = (record: Feeding) => {
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

  const fmt = (s: number) => {
    const m = Math.floor(s / 60); const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const colors = TAB_COLORS[activeTab];

  // Inline row component for formula/solid fields
  const FieldRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <Wrapper dir="row" align="center" justify="space-between" px={20} py={12} mb={16}
      style={{ backgroundColor: colors.bg, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: colors.border }}>
      <Typography variant="body" weight="extraBold">{label}</Typography>
      {children}
    </Wrapper>
  );

  return (
    <Wrapper flex={1} bg="#FAFBFC">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <ScreenHeader title="Кормление" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: Math.max(insets.bottom, 120) }}>
          {/* Tabs */}
          <Wrapper mb={20}>
            <SegmentedControl
              items={TAB_ITEMS}
              selected={activeTab}
              onChange={(key) => setActiveTab(key as any)}
              tone={TAB_TONES[activeTab]}
            />
          </Wrapper>

          {/* Breast Panel */}
          {activeTab === 'breast' && (
          <Surface variant="elevated" radius="xxl" p={20}>
            <Typography variant="tiny" weight="extraBold" color="#8A8A9E" mb={8} uppercase>Время кормления</Typography>
            <TouchableOpacity onPress={() => setShowPicker(true)} style={{ backgroundColor: colors.bg, padding: 16, borderRadius: RADIUS.xl, marginBottom: 20 }}>
              <Typography variant="body" weight="bold">{eventTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} {eventTime.toLocaleDateString()}</Typography>
            </TouchableOpacity>

            <Typography variant="tiny" weight="extraBold" color="#8A8A9E" mb={10} uppercase>Какая грудь?</Typography>
            <Wrapper dir="row" gap={12} mb={24}>
              {['Л', 'П'].map(side => {
                const active = breastSide === side;
                return (
                  <TouchableOpacity
                    key={side}
                    onPress={() => setBreastSide(side as any)}
                    style={{
                      flex: 1, height: 56, borderRadius: RADIUS.xl,
                      backgroundColor: active ? colors.accent : colors.bg,
                      alignItems: 'center', justifyContent: 'center',
                      borderWidth: active ? 0 : 1, borderColor: colors.border,
                    }}
                    activeOpacity={0.8}
                  >
                    <Typography variant="body" weight="extraBold" color={active ? 'white' : colors.accent}>
                      {side === 'Л' ? '← Левая' : 'Правая →'}
                    </Typography>
                  </TouchableOpacity>
                );
              })}
            </Wrapper>

            <Wrapper dir="row" align="center" justify="space-between" p={20} mb={(!timerRunning && seconds > 0) ? 20 : 0}
              style={{ backgroundColor: colors.bg, borderRadius: RADIUS.xxl, borderWidth: 1, borderColor: colors.border }}>
              <Wrapper>
                <Typography variant="tiny" weight="extraBold" color="#8A8A9E" uppercase mb={4}>Длительность</Typography>
                <Typography variant="h1" weight="black" size={38}>{fmt(seconds)}</Typography>
              </Wrapper>
              <TouchableOpacity
                onPress={() => setTimerRunning(!timerRunning)}
                style={{
                  width: 56, height: 56, borderRadius: 28,
                  backgroundColor: timerRunning ? '#D94F4F' : colors.accent,
                  alignItems: 'center', justifyContent: 'center',
                }}
                activeOpacity={0.8}
              >
                <Ionicons name={timerRunning ? "stop" : "play"} size={26} color="white" />
              </TouchableOpacity>
            </Wrapper>

            {!timerRunning && seconds > 0 && (
              <TouchableOpacity
                onPress={handleSaveBreast}
                style={{
                  height: 56, borderRadius: RADIUS.xl,
                  backgroundColor: colors.accent,
                  alignItems: 'center', justifyContent: 'center',
                }}
                activeOpacity={0.8}
              >
                <Typography variant="body" weight="black" color="white">Сохранить ГВ ({fmt(seconds)})</Typography>
              </TouchableOpacity>
            )}
          </Surface>
          )}

          {/* Formula Panel */}
          {activeTab === 'formula' && (
          <Surface variant="elevated" radius="xxl" p={20}>
            <Typography variant="tiny" weight="extraBold" color="#8A8A9E" mb={8} uppercase>Время кормления</Typography>
            <TouchableOpacity onPress={() => setShowPicker(true)} style={{ backgroundColor: colors.bg, padding: 16, borderRadius: RADIUS.xl, marginBottom: 20 }}>
              <Typography variant="body" weight="bold">{eventTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} {eventTime.toLocaleDateString()}</Typography>
            </TouchableOpacity>

            <Typography variant="tiny" weight="extraBold" color="#8A8A9E" mb={10} uppercase>Параметры смеси</Typography>
            <FieldRow label="Объём (мл)">
              <TextInput value={formulaVolume} onChangeText={setFormulaVolume} keyboardType="numeric" placeholder="120" placeholderTextColor="#B8A8D8"
                style={{ fontSize: 18, fontFamily: FONTS.black, color: colors.accent, textAlign: 'right', minWidth: 60 }} />
            </FieldRow>
            <FieldRow label="Бренд">
              <TextInput value={formulaBrand} onChangeText={setFormulaBrand} placeholder="Nan Optipro" placeholderTextColor="#B8A8D8"
                style={{ fontSize: 16, fontFamily: FONTS.extraBold, color: colors.accent, textAlign: 'right', minWidth: 100 }} />
            </FieldRow>
            <FieldRow label="Температура (°C)">
              <TextInput value={temperature} onChangeText={setTemperature} keyboardType="numeric" placeholder="37" placeholderTextColor="#B8A8D8"
                style={{ fontSize: 16, fontFamily: FONTS.extraBold, color: colors.accent, textAlign: 'right', minWidth: 60 }} />
            </FieldRow>

            <TouchableOpacity
              onPress={handleSaveFormula}
              style={{
                marginTop: 10, height: 56, borderRadius: RADIUS.xl,
                backgroundColor: colors.accent,
                alignItems: 'center', justifyContent: 'center',
              }}
              activeOpacity={0.8}
            >
              <Typography variant="body" weight="black" color="white">Сохранить смесь ({formulaVolume}мл)</Typography>
            </TouchableOpacity>
          </Surface>
          )}

          {/* Solid Panel */}
          {activeTab === 'solid' && (
          <Surface variant="elevated" radius="xxl" p={20}>
            <Typography variant="tiny" weight="extraBold" color="#8A8A9E" mb={8} uppercase>Время кормления</Typography>
            <TouchableOpacity onPress={() => setShowPicker(true)} style={{ backgroundColor: colors.bg, padding: 16, borderRadius: RADIUS.xl, marginBottom: 20 }}>
              <Typography variant="body" weight="bold">{eventTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} {eventTime.toLocaleDateString()}</Typography>
            </TouchableOpacity>

            <Typography variant="tiny" weight="extraBold" color="#8A8A9E" mb={10} uppercase>Что ел малыш?</Typography>
            <TextInput placeholder="Напр. Брокколи" placeholderTextColor="#94A3B8" value={weaningProduct} onChangeText={setWeaningProduct}
              style={{ backgroundColor: colors.bg, borderRadius: RADIUS.lg, padding: 16, fontFamily: FONTS.extraBold, fontSize: 16, color: COLORS.foreground, marginBottom: 16, borderWidth: 1, borderColor: colors.border }} />

            <FieldRow label="Объём (г)">
              <TextInput value={weaningVolume} onChangeText={setWeaningVolume} keyboardType="numeric" placeholder="100" placeholderTextColor="#7EC8B5"
                style={{ fontSize: 18, fontFamily: FONTS.black, color: colors.accent, textAlign: 'right', minWidth: 60 }} />
            </FieldRow>

            <Typography variant="tiny" weight="extraBold" color="#8A8A9E" mb={10} uppercase>Реакция</Typography>
            <Wrapper dir="row" gap={8} mb={20}>
              {[
                { id: 'happy', emoji: '😋', label: 'Рад', color: '#2A9B7E' },
                { id: 'neutral', emoji: '😐', label: 'Норм', color: '#E69600' },
                { id: 'fussy', emoji: '😖', label: 'Плач', color: '#D94F4F' }
              ].map(r => {
                const active = reaction === r.id;
                return (
                  <TouchableOpacity
                    key={r.id}
                    onPress={() => setReaction(r.id as any)}
                    style={{
                      flex: 1, height: 74, borderRadius: RADIUS.xl,
                      backgroundColor: active ? `${r.color}15` : '#F5F5F9',
                      alignItems: 'center', justifyContent: 'center',
                      borderWidth: active ? 2 : 0, borderColor: r.color,
                    }}
                    activeOpacity={0.8}
                  >
                    <Typography variant="h1" size={26} style={{ opacity: !active ? 0.3 : 1 }}>{r.emoji}</Typography>
                    <Wrapper mt={4}>
                      <Typography variant="tiny" weight="extraBold" color={active ? r.color : '#8A8A9E'}>{r.label}</Typography>
                    </Wrapper>
                  </TouchableOpacity>
                );
              })}
            </Wrapper>

            <TouchableOpacity
              onPress={handleSaveSolid}
              style={{
                height: 56, borderRadius: RADIUS.xl,
                backgroundColor: colors.accent,
                alignItems: 'center', justifyContent: 'center',
              }}
              activeOpacity={0.8}
            >
              <Typography variant="body" weight="black" color="white">Сохранить прикорм ({weaningVolume}г)</Typography>
            </TouchableOpacity>
          </Surface>
          )}

      {/* ── History Timeline ── */}
        <Wrapper mt={24}>
        <Typography variant="body" weight="black" mb={16}>
          История за день ({(() => {
            const today = feedings.filter(f => {
              const d = new Date(f.created_at);
              return d.getDate() === selectedDate.getDate() && d.getMonth() === selectedDate.getMonth() && d.getFullYear() === selectedDate.getFullYear();
            });
            return today.length;
          })()})
        </Typography>

        {(() => {
          const today = feedings.filter(f => {
            const d = new Date(f.created_at);
            return d.getDate() === selectedDate.getDate() && d.getMonth() === selectedDate.getMonth() && d.getFullYear() === selectedDate.getFullYear();
          }).sort((a, b) => b.created_at - a.created_at);

          if (today.length === 0) return (
            <Surface variant="flat" radius="xl" p={0}>
              <EmptyState emoji="🍽️" title="Пока нет записей" subtitle="Сохраните первое кормление выше" />
            </Surface>
          );

          const getTypeStyle = (type: string) => {
            switch (type) {
              case 'breast': return { icon: 'water' as const, bg: '#DBEAFE', color: '#2563EB', label: 'Грудь' };
              case 'formula': return { icon: 'flask' as const, bg: '#F3E8FF', color: '#8B5CF6', label: 'Смесь' };
              case 'solid': return { icon: 'restaurant' as const, bg: '#D1FAE5', color: '#059669', label: 'Прикорм' };
              default: return { icon: 'water' as const, bg: '#F5F0E6', color: '#6B6B80', label: type };
            }
          };

          const fmtTime = (ms: number) => {
            const d = new Date(ms);
            return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
          };

          return (
            <Wrapper pl={8}>
              <Wrapper style={{ position: 'absolute', left: 23, top: 16, bottom: 24, width: 2, backgroundColor: '#E5E7EB' }} />
              {today.map(f => {
                const ts = getTypeStyle(f.type);
                
                const renderRightActions = () => (
                  <Wrapper dir="row" width={140}>
                    <TouchableOpacity onPress={() => setEditTarget({ kind: 'feeding', record: f })} style={{ flex: 1, backgroundColor: ts.color, justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name="pencil" size={20} color="white" />
                      <Typography variant="tiny" weight="extraBold" color="white" mt={4}>Изменить</Typography>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteRecord(f as Feeding)} style={{ flex: 1, backgroundColor: '#D94F4F', justifyContent: 'center', alignItems: 'center', borderTopRightRadius: 16, borderBottomRightRadius: 16 }}>
                      <Ionicons name="trash" size={20} color="white" />
                      <Typography variant="tiny" weight="extraBold" color="white" mt={4}>Удалить</Typography>
                    </TouchableOpacity>
                  </Wrapper>
                );

                return (
                  <Wrapper key={f.id} dir="row" align="flex-start" gap={14} mb={16}>
                    <IconCircle size="sm" bg={ts.bg}>
                      <Ionicons name={ts.icon} size={14} color={ts.color} />
                    </IconCircle>
                    <Wrapper flex={1} overflow="hidden" style={{ backgroundColor: COLORS.card, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)' }}>
                      <Swipeable renderRightActions={renderRightActions} friction={2} rightThreshold={40}>
                        <Wrapper dir="row" align="center" p={12} px={16}>
                          <Wrapper flex={1}>
                            <Wrapper dir="row" align="center" gap={8} mb={4}>
                              <Typography variant="body" weight="black">{fmtTime(f.created_at)}</Typography>
                              <StatusBadge label={ts.label} tone={f.type === 'breast' ? 'info' : f.type === 'formula' ? 'purple' : 'success'} />
                            </Wrapper>
                            <Typography variant="tiny" weight="bold" color="#6B6B80" numberOfLines={1}>{f.description}</Typography>
                          </Wrapper>
                        </Wrapper>
                      </Swipeable>
                    </Wrapper>
                  </Wrapper>
                );
              })}
            </Wrapper>
          );
        })()}
        </Wrapper>
      </ScrollView>

      <DateTimePickerModal
        visible={showPicker}
        value={eventTime}
        mode="time"
        is24Hour={true}
        onChange={(date) => { if (date) setEventTime(date); }}
        onClose={() => setShowPicker(false)}
      />
      <EditRecordModal target={editTarget} onClose={() => setEditTarget(null)} />
      </KeyboardAvoidingView>
    </Wrapper>
  );
}

const enhance = withObservables([], () => ({
  feedings: database.collections.get('feedings').query().observe(),
}));

export default enhance(FeedingScreenContent as any);
