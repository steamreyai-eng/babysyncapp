import React, { useState, useEffect } from 'react';
import { Modal, ScrollView } from 'react-native';
import { X, BellRing, Settings2, Wand2, Milk, Droplets, Moon } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../store/authStore';
import { NotifSettings, DEFAULT_NOTIF, getRecommendedIntervals, restartNotifPoller, clearFiredNotifications } from '../lib/notifications';

import { Wrapper } from './ui/Wrapper';
import { Surface } from './ui/Surface';
import { Typography } from './ui/Typography';
import { SegmentedControl } from './SegmentedControl';
import { ChipGroup } from './ChipGroup';
import { ToggleSwitch } from './ToggleSwitch';
import { IconCircle } from './IconCircle';
import { COLORS } from '../lib/theme';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const MODE_ITEMS = [
  { key: 'auto', label: 'Авто-режим', icon: <Wand2 size={16} /> },
  { key: 'manual', label: 'Вручную', icon: <Settings2 size={16} /> },
];

const FEED_INTERVALS = [
  { key: '120', label: '120 мин' },
  { key: '150', label: '150 мин' },
  { key: '180', label: '180 мин' },
  { key: '210', label: '210 мин' },
  { key: '240', label: '240 мин' },
];

const DIAPER_INTERVALS = [
  { key: '180', label: '180 мин' },
  { key: '240', label: '240 мин' },
  { key: '300', label: '300 мин' },
  { key: '360', label: '360 мин' },
];

const SLEEP_INTERVALS = [
  { key: '60', label: '60 мин' },
  { key: '90', label: '90 мин' },
  { key: '120', label: '120 мин' },
  { key: '150', label: '150 мин' },
  { key: '180', label: '180 мин' },
];

interface NotifRowProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  enabled: boolean;
  onToggle: () => void;
  showIntervals: boolean;
  intervals: { key: string; label: string }[];
  selectedInterval: number;
  onIntervalChange: (val: number) => void;
  tone: 'primary' | 'green' | 'purple';
}

const NotifRow: React.FC<NotifRowProps> = ({
  icon, iconBg, title, subtitle, enabled, onToggle,
  showIntervals, intervals, selectedInterval, onIntervalChange, tone,
}) => (
  <Surface variant="outlined" radius="xl" p={16} mb={24}>
    <Wrapper dir="row" align="center" justify="space-between" mb={showIntervals ? 12 : 0}>
      <Wrapper dir="row" align="center" gap={12}>
        <IconCircle bg={iconBg} radius={20}>
          {icon}
        </IconCircle>
        <Wrapper>
          <Typography variant="body" weight="black">{title}</Typography>
          <Typography variant="tiny" weight="bold" color="textMuted">{subtitle}</Typography>
        </Wrapper>
      </Wrapper>
      <ToggleSwitch value={enabled} onToggle={onToggle} />
    </Wrapper>
    {showIntervals && (
      <ChipGroup
        items={intervals}
        selected={String(selectedInterval)}
        onChange={(k) => onIntervalChange(Number(k))}
        tone={tone}
      />
    )}
  </Surface>
);

export function NotificationSettingsModal({ isOpen, onClose }: Props) {
  const { baby } = useAuthStore();
  const [notif, setNotif] = useState<NotifSettings>(DEFAULT_NOTIF);
  const [modeAuto, setModeAuto] = useState(true);

  useEffect(() => {
    if (isOpen) {
      AsyncStorage.getItem('notif_settings').then(val => {
        if (val) {
          const parsed = JSON.parse(val);
          setNotif({ ...DEFAULT_NOTIF, ...parsed });
          setModeAuto(parsed.autoMode ?? true);
        }
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (notif.autoMode !== modeAuto) {
      const next = { ...notif, autoMode: modeAuto };
      setNotif(next);
      AsyncStorage.setItem('notif_settings', JSON.stringify(next));
    }
  }, [modeAuto, notif]);

  const handleNotifToggle = (key: keyof Pick<NotifSettings, "feeding" | "diaper" | "sleep">) => {
    const next = { ...notif, [key]: !notif[key] };
    setNotif(next);
    AsyncStorage.setItem('notif_settings', JSON.stringify(next)).then(() => {
      clearFiredNotifications();
      restartNotifPoller();
    });
  };

  const handleIntervalChange = (key: keyof Pick<NotifSettings, "feedingIntervalMin" | "diaperIntervalMin" | "sleepWindowMin">, value: number) => {
    const next = { ...notif, [key]: value };
    setNotif(next);
    AsyncStorage.setItem('notif_settings', JSON.stringify(next)).then(() => {
      clearFiredNotifications();
      restartNotifPoller();
    });
  };

  const ageMo = baby?.birthdate
    ? (Date.now() - new Date(baby.birthdate).getTime()) / (30.44 * 24 * 3600 * 1000)
    : 4;
  const recs = getRecommendedIntervals(ageMo);

  return (
    <Modal visible={isOpen} animationType="fade" transparent={true} onRequestClose={onClose}>
      <Wrapper flex={1} bg="rgba(0,0,0,0.4)" justify="flex-end">
        <Surface tone="surface" radius="none" style={{ borderTopLeftRadius: 36, borderTopRightRadius: 36, height: '90%' }}>
          {/* Header */}
          <Wrapper dir="row" align="center" justify="space-between" p={24} style={{ borderBottomWidth: 1, borderColor: '#F0ECE8' }}>
             <Wrapper dir="row" align="center" gap={12}>
                <IconCircle bg="rgba(77,191,170,0.1)">
                   <BellRing size={22} color="#4DBFAA" />
                </IconCircle>
                <Typography variant="h2" weight="black">Уведомления</Typography>
             </Wrapper>
             <Surface onPress={onClose} tone="transparent" radius="xl" p={8} bg="#F4F4F8">
                <X size={20} color="#6B6B80" />
             </Surface>
          </Wrapper>
          <Wrapper px={24} mt={-12} mb={12}>
            <Typography variant="tiny" weight="bold" color="textMuted">
              Настройте напоминания для кормления, смены подгузников и сна.
            </Typography>
          </Wrapper>

          {/* Content */}
          <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
            {/* Mode switch */}
            <Wrapper mb={24}>
              <SegmentedControl
                items={MODE_ITEMS}
                selected={modeAuto ? 'auto' : 'manual'}
                onChange={(k) => setModeAuto(k === 'auto')}
              />
            </Wrapper>

            {modeAuto && (
               <Surface tone="transparent" radius="md" p={16} mb={24} bg="#F4F8FD" style={{ borderWidth: 1, borderColor: '#DEEAF8' }}>
                  <Typography variant="tiny" weight="bold" color="#4E8FD4" style={{ lineHeight: 20 }}>
                     Режим Авто использует AI-интервалы по нормам для возраста малыша. Отсчет ведется от последнего добавленного события.
                  </Typography>
               </Surface>
            )}

            {/* Feeding */}
            <NotifRow
              icon={<Milk size={20} color="#4E8FD4" />}
              iconBg="rgba(78,143,212,0.1)"
              title="Кормление"
              subtitle={modeAuto ? `Рекомендуемо: ${recs.feed} мин` : `Через: ${notif.feedingIntervalMin} мин`}
              enabled={notif.feeding}
              onToggle={() => handleNotifToggle('feeding')}
              showIntervals={!modeAuto && notif.feeding}
              intervals={FEED_INTERVALS}
              selectedInterval={notif.feedingIntervalMin}
              onIntervalChange={(v) => handleIntervalChange('feedingIntervalMin', v)}
              tone="primary"
            />

            {/* Diaper */}
            <NotifRow
              icon={<Droplets size={20} color="#3DBFAA" />}
              iconBg="rgba(61,191,170,0.1)"
              title="Подгузник"
              subtitle={modeAuto ? `Рекомендуемо: ${recs.diap} мин` : `Через: ${notif.diaperIntervalMin} мин`}
              enabled={notif.diaper}
              onToggle={() => handleNotifToggle('diaper')}
              showIntervals={!modeAuto && notif.diaper}
              intervals={DIAPER_INTERVALS}
              selectedInterval={notif.diaperIntervalMin}
              onIntervalChange={(v) => handleIntervalChange('diaperIntervalMin', v)}
              tone="green"
            />

            {/* Sleep */}
            <NotifRow
              icon={<Moon size={20} color="#8B6FD4" />}
              iconBg="rgba(139,111,212,0.1)"
              title="Бодрствование"
              subtitle={modeAuto ? `Рекомендуемо: ${recs.sleep} мин` : `Через: ${notif.sleepWindowMin} мин`}
              enabled={notif.sleep}
              onToggle={() => handleNotifToggle('sleep')}
              showIntervals={!modeAuto && notif.sleep}
              intervals={SLEEP_INTERVALS}
              selectedInterval={notif.sleepWindowMin}
              onIntervalChange={(v) => handleIntervalChange('sleepWindowMin', v)}
              tone="purple"
            />

          </ScrollView>
        </Surface>
      </Wrapper>
    </Modal>
  );
}
