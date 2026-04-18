
import React, { useState, useEffect, useMemo } from 'react';
import {
  ScrollView, TouchableOpacity, TextInput,
  Alert, Dimensions, Platform, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { database } from '../db';
import withObservables from '@nozbe/with-observables';
import { Q } from '@nozbe/watermelondb';
import DateTimePickerModal from '../components/DateTimePickerModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { Wrapper } from '../components/ui/Wrapper';
import { Surface } from '../components/ui/Surface';
import { Typography } from '../components/ui/Typography';
import { Button } from '../components/ui/Button';
import { ScreenHeader } from '../components/ScreenHeader';
import { IconCircle } from '../components/IconCircle';
import { EmptyState } from '../components/EmptyState';
import { StatusBadge } from '../components/StatusBadge';
import { FormField } from '../components/FormField';
import { COLORS, RADIUS, SHADOWS } from '../lib/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ShiftsScreenContent = ({ feedings, sleeps, diapers, tasks, shiftsData }: any) => {
  const navigation = useNavigation();
  const { activeParent, baby, setActiveParent } = useAuthStore();
  const insets = useSafeAreaInsets();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskTime, setNewTaskTime] = useState<Date | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

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

  const shiftsDict = useMemo(() => {
     const dict: Record<string, string> = {};
     shiftsData.forEach((s: any) => {
        if (s.shift_date && s.assigned_to) {
           dict[s.shift_date] = s.assigned_to;
        }
     });
     return dict;
  }, [shiftsData]);

  const changeMonth = (delta: number) => {
    const d = new Date(currentDate);
    d.setDate(1);
    d.setMonth(d.getMonth() + delta);
    setCurrentDate(d);
  };

  const triggerSync = () => {
    import('../db/sync').then(({ syncWithSupabase }) =>
      syncWithSupabase().catch(e => { if (__DEV__) console.warn('Sync failed', e); })
    );
  };

  const assignShift = async (dateStr: string, currentAssigned: string | undefined) => {
    if (isAssigning) return;
    setIsAssigning(true);

    const next = currentAssigned === 'mom' ? 'dad' : currentAssigned === 'dad' ? null : 'mom';
    try {
      await database.write(async () => {
         const existing = shiftsData.find((s: any) => s.shift_date === dateStr);
         if (existing) {
            if (next) {
               await existing.update((s: any) => { s.assigned_to = next; });
            } else {
               await existing.destroyPermanently();
            }
         } else if (next) {
            await database.get('shifts').create((s: any) => {
               s.shift_date = dateStr;
               s.assigned_to = next;
               s.active_parent = next;
               s.started_at = Date.now();
            });
         }
      });
      triggerSync();
    } catch (e) {
      if (__DEV__) console.warn("assignShift error", e);
    } finally {
      setIsAssigning(false);
    }
  };

  const getDays = () => {
    const days: (Date | null)[] = [];
    const first = new Date(year, month, 1);
    const startDay = first.getDay() || 7;
    for (let i = 1; i < startDay; i++) days.push(null);
    const d = new Date(year, month, 1);
    while (d.getMonth() === month) { days.push(new Date(d)); d.setDate(d.getDate() + 1); }
    return days;
  };

  const fmtTime = (iso: string | number) => {
    const d = new Date(iso);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const allEvents = useMemo(() => {
    const events = [
      ...feedings.slice(0, 3).map((f: any) => ({
        time: fmtTime(f.created_at),
        who: f.recorded_by === 'dad' ? 'Папа' : 'Мама',
        action: f.description || `Кормление (${f.type})`,
        icon: 'nutrition-outline' as const,
        iconColor: '#8B6FD4',
        bg: '#EDE4F8',
      })),
      ...sleeps.slice(0, 2).map((s: any) => {
        const m = Math.floor(s.duration_seconds / 60);
        const h = Math.floor(m / 60); const rem = m % 60;
        return {
          time: fmtTime(s.created_at),
          who: s.recorded_by === 'dad' ? 'Папа' : 'Мама',
          action: `Сон (${h > 0 ? `${h}ч ` : ''}${rem}м)`,
          icon: 'moon-outline' as const,
          iconColor: '#4E8FD4',
          bg: '#DEEAF8',
        };
      }),
      ...diapers.slice(0, 2).map((d: any) => ({
        time: fmtTime(d.created_at),
        who: d.recorded_by === 'dad' ? 'Папа' : 'Мама',
        action: `Подгузник (${d.type === 'wet' ? 'мокрый' : d.type === 'dirty' ? 'грязный' : 'оба'})`,
        icon: 'water-outline' as const,
        iconColor: '#3DBFAA',
        bg: '#D4F3EC',
      })),
    ];
    return events.sort((a, b) => b.time.localeCompare(a.time)).slice(0, 5);
  }, [feedings, sleeps, diapers]);

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    try {
      await database.write(async () => {
        await database.get('tasks').create((task: any) => {
          task.title = newTaskTitle.trim();
          task.is_completed = false;
          task.recorded_by = activeParent;
          task.created_at = Date.now();
          if (newTaskTime) {
             task.due_time = newTaskTime.toISOString();
          }
        });
      });
      setNewTaskTitle('');
      setNewTaskTime(null);
      triggerSync();
    } catch (e) {
      if (__DEV__) console.warn("handleAddTask err", e);
    }
  };

  const toggleTask = async (task: any) => {
    try {
      await database.write(async () => {
        await task.update((t: any) => { t.is_completed = !t.is_completed; });
      });
      triggerSync();
    } catch (e) {
      if (__DEV__) console.warn("toggleTask err", e);
    }
  };

  const deleteTask = async (task: any) => {
    try {
      await database.write(async () => { await task.markAsDeleted(); });
      triggerSync();
    } catch (e) {
      if (__DEV__) console.warn("deleteTask err", e);
    }
  };

  const incompleteTasks = tasks.filter((t: any) => !t.is_completed).length;
  const monthNames = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${(today.getMonth()+1).toString().padStart(2,'0')}-${today.getDate().toString().padStart(2,'0')}`;

  const renderCalDays = () => {
     const days = getDays();
     const cellMargin = 2;
     const availableWidth = SCREEN_WIDTH - 64; 
     const cellWidth = Math.floor(availableWidth / 7) - (cellMargin * 2);

     return days.map((d, i) => {
        if (!d) return <Wrapper key={`empty-${i}`} width={cellWidth} m={cellMargin} />;
        const dStr = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
        const assigned = shiftsDict[dStr];
        const isToday = dStr === todayStr;

        let cellBg = 'transparent';
        let label = '';
        let labelColor = COLORS.foreground;
        if (assigned === 'mom') { cellBg = '#C8D8F0'; label = 'М'; labelColor = '#3A6CB0'; }
        if (assigned === 'dad') { cellBg = '#E0D0F4'; label = 'П'; labelColor = '#7B50C8'; }

        return (
           <Surface
              key={dStr}
              onPress={() => assignShift(dStr, assigned)}
              tone="transparent"
              radius="sm"
              bg={cellBg}
              width={cellWidth}
              height={44}
              m={cellMargin}
              align="center"
              justify="center"
              py={2}
              style={{ borderWidth: 2, borderColor: isToday ? '#5B9BD5' : 'transparent' }}
           >
              <Typography variant="caption" weight="extraBold" color={isToday ? '#5B9BD5' : COLORS.foreground}>
                 {d.getDate()}
              </Typography>
              {label ? (
                 <Typography variant="caption" weight="black" color={labelColor} style={{ fontSize: 10 }}>{label}</Typography>
              ) : null}
           </Surface>
        );
     });
  };

  return (
    <Wrapper flex={1} bg="background">
      <ScreenHeader title="Смены родителей" />
      <ScrollView 
        style={{ flex: 1, paddingHorizontal: 16 }} 
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 160) }} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366F1']} />}
      >

      {/* Active parent banner */}
      <Surface tone="transparent" radius="xl" p={16} mb={16} bg="#5B9BD5" style={{ shadowColor: '#5B9BD5', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 24, elevation: 4 }}>
        <Typography variant="caption" weight="extraBold" color="rgba(255,255,255,0.8)" letterSpacing={1} mb={8}>СЕЙЧАС АКТИВЕН</Typography>
        <Wrapper dir="row" align="center" gap={12}>
          <IconCircle size="lg" bg="rgba(255,255,255,0.25)" radius={24}>
            <Typography variant="h3" weight="black" color="white">{activeParent === 'mom' ? 'М' : 'П'}</Typography>
          </IconCircle>
          <Wrapper flex={1}>
            <Typography variant="h4" weight="black" color="white">
              {activeParent === 'mom' ? (baby?.mom_name || 'Мама') : (baby?.dad_name || 'Папа')}
            </Typography>
            <Typography variant="caption" weight="semiBold" color="rgba(255,255,255,0.75)">Активен сейчас</Typography>
          </Wrapper>
          <Surface onPress={() => setActiveParent(activeParent === 'mom' ? 'dad' : 'mom')} tone="transparent" radius="md" px={14} py={8} style={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', backgroundColor: 'rgba(255,255,255,0.15)' }}>
            <Typography variant="tiny" weight="extraBold" color="white">Передать →</Typography>
          </Surface>
        </Wrapper>
      </Surface>

      {/* CALENDAR */}
      <Surface variant="elevated" radius="xl" p={16} mb={16}>
         <Wrapper dir="row" justify="space-between" align="center" mb={16}>
            <Surface onPress={() => changeMonth(-1)} tone="transparent" radius="xl" width={44} height={44} align="center" justify="center" bg="#F5F0E6">
               <Ionicons name="chevron-back" size={20} color="#6B6B80" />
            </Surface>
            <Typography variant="body" weight="black">{monthNames[month]} {year}</Typography>
            <Surface onPress={() => changeMonth(1)} tone="transparent" radius="xl" width={44} height={44} align="center" justify="center" bg="#F5F0E6">
               <Ionicons name="chevron-forward" size={20} color="#6B6B80" />
            </Surface>
         </Wrapper>

         <Wrapper dir="row" mb={8} px={2}>
            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => (
               <Wrapper key={d} flex={1} align="center">
                  <Typography variant="caption" weight="extraBold" color="#9B9BAF" style={{ fontSize: 10 }}>{d}</Typography>
               </Wrapper>
            ))}
         </Wrapper>

         <Wrapper dir="row" wrap="wrap">
            {renderCalDays()}
         </Wrapper>

         <Wrapper dir="row" align="center" mt={16} pt={8} style={{ borderTopWidth: 1, borderColor: '#E0DDD8' }}>
            <Wrapper dir="row" align="center" gap={6} mr={16}>
               <Wrapper width={16} height={16} bg="#C8D8F0" radius="sm" style={{ borderRadius: 4 }} />
               <Typography variant="caption" weight="bold" color="textMuted">Мама</Typography>
            </Wrapper>
            <Wrapper dir="row" align="center" gap={6}>
               <Wrapper width={16} height={16} bg="#E0D0F4" radius="sm" style={{ borderRadius: 4 }} />
               <Typography variant="caption" weight="bold" color="textMuted">Папа</Typography>
            </Wrapper>
            <Wrapper flex={1} align="flex-end">
              <Typography variant="caption" weight="semiBold" color="#AAA" style={{ fontSize: 10 }}>Нажмите: М→П→пусто</Typography>
            </Wrapper>
         </Wrapper>
      </Surface>

      {/* Manual Switch */}
      <Surface variant="elevated" radius="xl" p={16} mb={16}>
        <Typography variant="body" weight="black" mb={12}>Ручная передача смены</Typography>
        <Wrapper dir="row" justify="space-around" py={8}>
          {(['mom', 'dad'] as const).map(p => (
            <Surface
              key={p}
              onPress={() => p !== activeParent && setActiveParent(p)}
              tone="transparent"
              radius="none"
              align="center"
              gap={6}
              style={{ opacity: activeParent === p ? 1 : 0.4 }}
            >
              <IconCircle size="lg" bg={p === 'mom' ? '#5B9BD5' : '#8B6FD4'} radius={34}>
                <Typography variant="h2" weight="black" color="white">{p === 'mom' ? 'М' : 'П'}</Typography>
              </IconCircle>
              <Typography variant="tiny" weight="extraBold">{p === 'mom' ? 'Мама' : 'Папа'}</Typography>
              {activeParent === p && <Typography variant="caption" weight="bold" color="#4DBFAA" style={{ fontSize: 9 }}>● Активен</Typography>}
            </Surface>
          ))}
        </Wrapper>
      </Surface>

      {/* Tasks */}
      <Surface variant="elevated" radius="xl" p={16} mb={16} bg="#EEF2FF" style={{ borderWidth: 1.5, borderColor: '#E0E7FF' }}>
        <Wrapper dir="row" align="center" justify="space-between" mb={12}>
          <Typography variant="body" weight="black" color="#6366F1">📋 Задачи на смену</Typography>
          {incompleteTasks > 0 && (
            <StatusBadge label={`${incompleteTasks} ост.`} tone="primary" />
          )}
        </Wrapper>

        {tasks.length === 0 ? (
          <Typography variant="tiny" weight="semiBold" color="#A0A0B0" align="center" py={8}>Нет активных задач</Typography>
        ) : (
          <Wrapper style={{ maxHeight: 200 }}>
             <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                {tasks.map((t: any) => (
                  <Surface key={t.id} variant="elevated" radius="sm" p={10} mb={8} style={{ borderWidth: 1, borderColor: '#F5EAD6' }}>
                    <Wrapper dir="row" align="center" gap={10}>
                      <TouchableOpacity onPress={() => toggleTask(t)} style={{ opacity: t.is_completed ? 0.6 : 1 }}>
                        <Ionicons
                          name={t.is_completed ? 'checkmark-circle' : 'radio-button-off'}
                          size={22}
                          color={t.is_completed ? '#4DBFAA' : '#E0DDD8'}
                        />
                      </TouchableOpacity>
                      <Wrapper flex={1}>
                        <Typography variant="tiny" weight="extraBold" color={t.is_completed ? '#A0A0B0' : COLORS.foreground} style={t.is_completed ? { textDecorationLine: 'line-through' } : {}} numberOfLines={1}>{t.title}</Typography>
                        <Typography variant="caption" weight="bold" color="#AAA" mt={2} style={{ fontSize: 9 }}>
                          {t.due_time ? `До: ${new Date(t.due_time).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} • ` : ''}
                          Добавил(а): {t.recorded_by === 'mom' ? 'Мама' : 'Папа'}
                        </Typography>
                      </Wrapper>
                      <Surface
                        onPress={() => deleteTask(t)}
                        tone="transparent"
                        radius="sm"
                        p={6}
                        bg="#FFE4E4"
                        style={{ opacity: t.is_completed ? 1 : 0.2 }}
                      >
                        <Ionicons name="trash" size={14} color="#D94F4F" />
                      </Surface>
                    </Wrapper>
                  </Surface>
                ))}
             </ScrollView>
          </Wrapper>
        )}

        {/* Task Input Area */}
        <Wrapper dir="row" gap={8} mt={8}>
          <Wrapper flex={1}>
            <FormField value={newTaskTitle} onChangeText={setNewTaskTitle} placeholder="Напр. дать витамин Д" onSubmitEditing={handleAddTask} />
          </Wrapper>
          
          <Surface
             onPress={() => setShowTimePicker(true)} 
             tone="transparent"
             radius="sm"
             height={40}
             width={newTaskTime ? undefined : 40}
             px={newTaskTime ? 12 : 0}
             align="center"
             justify="center"
             bg="white"
             style={{ borderWidth: 1, borderColor: '#E0DDD8', minWidth: 40 }}
          >
             {newTaskTime ? (
                <Typography variant="caption" weight="extraBold" color="#6366F1">
                   {fmtTime(newTaskTime.getTime())}
                </Typography>
             ) : (
                <Ionicons name="calendar" size={18} color="#6366F1" />
             )}
          </Surface>

          <Surface
            onPress={handleAddTask}
            tone="transparent"
            radius="sm"
            width={40}
            height={40}
            align="center"
            justify="center"
            bg="#6366F1"
            style={{ shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 2 }}
          >
            <Ionicons name="add" size={18} color="white" />
          </Surface>
        </Wrapper>

         <DateTimePickerModal
           visible={showTimePicker}
           value={newTaskTime || new Date()}
           mode="time"
           is24Hour={true}
           onChange={(date) => { if (date) setNewTaskTime(date); }}
           onClose={() => setShowTimePicker(false)}
         />

      </Surface>

      {/* Activity timeline */}
      <Surface variant="elevated" radius="xl" p={16}>
        <Typography variant="body" weight="black" mb={12}>История активности</Typography>
        {allEvents.length === 0 ? (
          <EmptyState icon={<Ionicons name="clipboard" size={36} color="#C8D8F0" />} title="Нет данных" subtitle="Добавьте кормление, сон или подгузник" />
        ) : (
          <Wrapper pl={24} mt={8}>
            <Wrapper position="absolute" left={11} top={8} bottom={8} width={2} bg="#E0DDD8" radius="sm" style={{ borderRadius: 2 }} />
            {allEvents.map((item, i) => {
              const isDad = item.who === 'Папа';
              return (
                <Wrapper key={i} dir="row" align="center" gap={10} mb={16}>
                  <Wrapper position="absolute" left={-24} width={18} height={18} bg={isDad ? '#8B6FD4' : '#5B9BD5'} style={{ borderRadius: 9, borderWidth: 2, borderColor: '#F5F0E6' }} />
                  <IconCircle size="sm" bg={item.bg}>
                    <Ionicons name={item.icon} size={16} color={item.iconColor} />
                  </IconCircle>
                  <Wrapper flex={1}>
                    <Typography variant="tiny" weight="extraBold">{item.action}</Typography>
                    <Wrapper mt={2} align="flex-start">
                      <StatusBadge label={item.who} tone={isDad ? 'purple' : 'primary'} />
                    </Wrapper>
                  </Wrapper>
                  <Typography variant="caption" weight="bold" color="textMuted">{item.time}</Typography>
                </Wrapper>
              );
            })}
          </Wrapper>
        )}
      </Surface>
    </ScrollView>
    </Wrapper>
  );
};

const enhance = withObservables([], () => ({
  feedings: database.collections.get('feedings').query(Q.sortBy('created_at', Q.desc)).observe(),
  sleeps: database.collections.get('sleeps').query(Q.sortBy('created_at', Q.desc)).observe(),
  diapers: database.collections.get('diapers').query(Q.sortBy('created_at', Q.desc)).observe(),
  tasks: database.collections.get('tasks').query(Q.sortBy('created_at', Q.asc)).observe(),
  shiftsData: database.collections.get('shifts').query().observe(),
}));

const ShiftsScreen = enhance(ShiftsScreenContent);
export default ShiftsScreen;
