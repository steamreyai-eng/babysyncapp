
import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, Dimensions, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { database } from '../db';
import withObservables from '@nozbe/with-observables';
import { Q } from '@nozbe/watermelondb';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ShiftsScreenContent = ({ feedings, sleeps, diapers, tasks, shiftsData }: any) => {
  const navigation = useNavigation();
  const { activeParent, baby, setActiveParent } = useAuthStore();
  const insets = useSafeAreaInsets();
  
  // Date states for Calendar
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Tasks form state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskTime, setNewTaskTime] = useState<Date | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Parse shifts into dict: { 'YYYY-MM-DD': 'mom' | 'dad' }
  const shiftsDict = useMemo(() => {
     const dict: Record<string, string> = {};
     shiftsData.forEach((s: any) => {
        if (s.shift_date && s.assigned_to) {
           dict[s.shift_date] = s.assigned_to;
        }
     });
     return dict;
  }, [shiftsData]);

  // Calendar Helpers
  const changeMonth = (delta: number) => {
    const d = new Date(currentDate);
    d.setDate(1);
    d.setMonth(d.getMonth() + delta);
    setCurrentDate(d);
  };

  const assignShift = async (dateStr: string, currentAssigned: string | undefined) => {
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
    } catch (e) {
      console.warn("assignShift error", e);
    }
  };

  const getDays = () => {
    const days: (Date | null)[] = [];
    const first = new Date(year, month, 1);
    const startDay = first.getDay() || 7; // Mon=1..Sun=7
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
    } catch (e) {
      console.warn("handleAddTask err", e);
    }
  };

  const toggleTask = async (task: any) => {
    try {
      await database.write(async () => {
        await task.update((t: any) => { t.is_completed = !t.is_completed; });
      });
    } catch (e) {
      console.warn("toggleTask err", e);
    }
  };

  const deleteTask = async (task: any) => {
    try {
      await database.write(async () => { await task.markAsDeleted(); });
    } catch (e) {
      console.warn("deleteTask err", e);
    }
  };

  const incompleteTasks = tasks.filter((t: any) => !t.is_completed).length;
  const monthNames = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${(today.getMonth()+1).toString().padStart(2,'0')}-${today.getDate().toString().padStart(2,'0')}`;

  const renderCalDays = () => {
     const days = getDays();
     // Calculate responsive size for 7 columns
     const cellMargin = 2;
     // 16 padding on each side of screen, 16 padding inside card = 64 total horizontal padding
     const availableWidth = SCREEN_WIDTH - 64; 
     const cellWidth = Math.floor(availableWidth / 7) - (cellMargin * 2);

     return days.map((d, i) => {
        if (!d) return <View key={`empty-${i}`} style={{ width: cellWidth, margin: cellMargin }} />;
        const dStr = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
        const assigned = shiftsDict[dStr];
        const isToday = dStr === todayStr;

        let cellBg = 'transparent';
        let label = '';
        let labelColor = '#1A1A2E';
        if (assigned === 'mom') { cellBg = '#C8D8F0'; label = 'М'; labelColor = '#3A6CB0'; }
        if (assigned === 'dad') { cellBg = '#E0D0F4'; label = 'П'; labelColor = '#7B50C8'; }

        return (
           <TouchableOpacity
              key={dStr}
              onPress={() => assignShift(dStr, assigned)}
              style={{
                 width: cellWidth,
                 minHeight: 44,
                 margin: cellMargin,
                 backgroundColor: cellBg,
                 borderColor: isToday ? '#5B9BD5' : 'transparent',
                 borderWidth: 2,
                 borderRadius: 10,
                 alignItems: 'center',
                 justifyContent: 'center',
                 paddingVertical: 2,
              }}
           >
              <Text style={{ fontSize: 11, fontFamily: 'Nunito_800ExtraBold', color: isToday ? '#5B9BD5' : '#1A1A2E' }}>
                 {d.getDate()}
              </Text>
              {label ? (
                 <Text style={{ fontSize: 10, fontFamily: 'Nunito_900Black', color: labelColor }}>{label}</Text>
              ) : null}
           </TouchableOpacity>
        );
     });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FAFBFC' }}>
      <View style={{ paddingTop: Math.max(insets.top, 16), paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#FAFBFC', flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, marginRight: 16, borderWidth: 1, borderColor: '#E2E8F0' }}>
          <Ionicons name="arrow-back" size={24} color="#1A1A2E" />
        </TouchableOpacity>
        <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 24, color: '#1A1A2E' }}>Смены родителей</Text>
      </View>
      <ScrollView style={{ flex: 1, paddingHorizontal: 16 }} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 160) }} showsVerticalScrollIndicator={false}>

      {/* Active parent banner */}
      <View style={styles.banner}>
        <Text style={styles.bannerCaption}>СЕЙЧАС АКТИВЕН</Text>
        <View style={styles.bannerRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{activeParent === 'mom' ? 'М' : 'П'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerName}>
              {activeParent === 'mom' ? (baby?.mom_name || 'Мама') : (baby?.dad_name || 'Папа')}
            </Text>
            <Text style={styles.bannerSub}>Активен сейчас</Text>
          </View>
          <TouchableOpacity style={styles.transferBtn} onPress={() => setActiveParent(activeParent === 'mom' ? 'dad' : 'mom')}>
            <Text style={styles.transferBtnText}>Передать →</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* CALENDAR */}
      <View style={styles.card}>
         <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.calNavBtn}>
               <Ionicons name="chevron-back" size={20} color="#6B6B80" />
            </TouchableOpacity>
            <Text style={{ fontSize: 15, fontFamily: 'Nunito_900Black', color: '#1A1A2E' }}>
               {monthNames[month]} {year}
            </Text>
            <TouchableOpacity onPress={() => changeMonth(1)} style={styles.calNavBtn}>
               <Ionicons name="chevron-forward" size={20} color="#6B6B80" />
            </TouchableOpacity>
         </View>

         <View style={{ flexDirection: 'row', marginBottom: 8, paddingHorizontal: 2 }}>
            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => (
               <View key={d} style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 10, fontFamily: 'Nunito_800ExtraBold', color: '#9B9BAF' }}>{d}</Text>
               </View>
            ))}
         </View>

         <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {renderCalDays()}
         </View>

         <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingTop: 8, borderTopWidth: 1, borderColor: '#E0DDD8' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 16 }}>
               <View style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: '#C8D8F0' }} />
               <Text style={{ fontSize: 11, fontFamily: 'Nunito_700Bold', color: '#6B6B80' }}>Мама</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
               <View style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: '#E0D0F4' }} />
               <Text style={{ fontSize: 11, fontFamily: 'Nunito_700Bold', color: '#6B6B80' }}>Папа</Text>
            </View>
            <Text style={{ fontSize: 10, fontFamily: 'Nunito_600SemiBold', color: '#AAA', marginLeft: 'auto' }}>
               Нажмите: М→П→пусто
            </Text>
         </View>
      </View>

      {/* Manual Switch */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Ручная передача смены</Text>
        <View style={styles.switchRow}>
          {(['mom', 'dad'] as const).map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.parentBtn, { opacity: activeParent === p ? 1 : 0.4 }]}
              onPress={() => p !== activeParent && setActiveParent(p)}
            >
              <View style={[styles.parentCircle, {
                backgroundColor: p === 'mom' ? '#5B9BD5' : '#8B6FD4',
                transform: [{ scale: activeParent === p ? 1.1 : 1 }],
              }]}>
                <Text style={styles.parentCircleText}>{p === 'mom' ? 'М' : 'П'}</Text>
              </View>
              <Text style={styles.parentLabel}>{p === 'mom' ? 'Мама' : 'Папа'}</Text>
              {activeParent === p && <Text style={styles.activeLabel}>● Активен</Text>}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Tasks */}
      <View style={[styles.card, { backgroundColor: '#EEF2FF', borderColor: '#E0E7FF' }]}>
        <View style={[styles.cardHeader, { justifyContent: 'space-between' }]}>
          <Text style={[styles.cardTitle, { color: '#6366F1' }]}>📋 Задачи на смену</Text>
          {incompleteTasks > 0 && (
            <View style={styles.taskBadge}>
              <Text style={styles.taskBadgeText}>{incompleteTasks} ост.</Text>
            </View>
          )}
        </View>

        {tasks.length === 0 ? (
          <Text style={{ textAlign: 'center', fontSize: 12, color: '#A0A0B0', paddingVertical: 8, fontFamily: 'Nunito_600SemiBold' }}>Нет активных задач</Text>
        ) : (
          <View style={{ maxHeight: 200 }}>
             <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                {tasks.map((t: any) => (
                  <View key={t.id} style={styles.taskRow}>
                    <TouchableOpacity onPress={() => toggleTask(t)} style={{ opacity: t.is_completed ? 0.6 : 1 }}>
                      <Ionicons
                        name={t.is_completed ? 'checkmark-circle' : 'radio-button-off'}
                        size={22}
                        color={t.is_completed ? '#4DBFAA' : '#E0DDD8'}
                      />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.taskTitle, t.is_completed && styles.taskTitleDone]} numberOfLines={1}>{t.title}</Text>
                      <Text style={styles.taskMeta}>
                        {t.due_time ? `До: ${new Date(t.due_time).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} • ` : ''}
                        Добавил(а): {t.recorded_by === 'mom' ? 'Мама' : 'Папа'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => deleteTask(t)}
                      style={[styles.deleteBtn, { opacity: t.is_completed ? 1 : 0.2 }]}
                    >
                      <Ionicons name="trash" size={14} color="#D94F4F" />
                    </TouchableOpacity>
                  </View>
                ))}
             </ScrollView>
          </View>
        )}

        {/* Task Input Area */}
        <View style={styles.addTaskRow}>
          <TextInput
            style={styles.taskInput}
            placeholder="Напр. дать витамин Д"
            placeholderTextColor="#94A3B8"
            value={newTaskTitle}
            onChangeText={setNewTaskTitle}
            onSubmitEditing={handleAddTask}
            returnKeyType="done"
          />
          
          <TouchableOpacity 
             onPress={() => setShowTimePicker(true)} 
             style={[styles.timeBtn, newTaskTime && { paddingHorizontal: 12 }]}
          >
             {newTaskTime ? (
                <Text style={{ fontSize: 11, fontFamily: 'Nunito_800ExtraBold', color: '#6366F1' }}>
                   {fmtTime(newTaskTime.getTime())}
                </Text>
             ) : (
                <Ionicons name="calendar" size={18} color="#6366F1" />
             )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.addTaskBtn} onPress={handleAddTask}>
            <Ionicons name="add" size={18} color="white" />
          </TouchableOpacity>
        </View>

        {showTimePicker && (
           <DateTimePicker
              value={newTaskTime || new Date()}
              mode="time"
              is24Hour={true}
              display="default"
              onChange={(e, date) => {
                 if (Platform.OS === 'android') setShowTimePicker(false);
                 if (date) setNewTaskTime(date);
              }}
              style={{ alignSelf: 'center', marginTop: 10 }}
           />
        )}
        {Platform.OS === 'ios' && showTimePicker && (
             <TouchableOpacity style={{ marginTop: 10, alignSelf: 'flex-end', backgroundColor: '#E0E7FF', padding: 8, borderRadius: 8 }} onPress={() => setShowTimePicker(false)}>
                <Text style={{ fontFamily: 'Nunito_800ExtraBold', color: '#6366F1' }}>Готово</Text>
             </TouchableOpacity>
        )}

      </View>

      {/* Activity timeline */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>История активности</Text>
        {allEvents.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 24 }}>
            <Ionicons name="clipboard" size={36} color="#C8D8F0" />
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#1A1A2E', marginTop: 8 }}>Нет данных</Text>
            <Text style={{ fontSize: 10, fontWeight: '600', color: '#6B6B80' }}>Добавьте кормление, сон или подгузник</Text>
          </View>
        ) : (
          <View style={{ paddingLeft: 24, marginTop: 8 }}>
            <View style={{ position: 'absolute', left: 11, top: 8, bottom: 8, width: 2, borderRadius: 2, backgroundColor: '#E0DDD8' }} />
            {allEvents.map((item, i) => {
              const isDad = item.who === 'Папа';
              return (
                <View key={i} style={styles.timelineItem}>
                  <View style={[styles.timelineDot, { backgroundColor: isDad ? '#8B6FD4' : '#5B9BD5', borderColor: '#F5F0E6' }]} />
                  <View style={[styles.timelineIcon, { backgroundColor: item.bg }]}>
                    <Ionicons name={item.icon} size={16} color={item.iconColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontFamily: 'Nunito_800ExtraBold', color: '#1A1A2E' }}>{item.action}</Text>
                    <View style={[styles.whoBadge, { backgroundColor: isDad ? '#8B6FD4' : '#5B9BD5' }]}>
                      <Text style={{ color: 'white', fontSize: 9, fontFamily: 'Nunito_800ExtraBold' }}>{item.who}</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 11, fontFamily: 'Nunito_700Bold', color: '#6B6B80' }}>{item.time}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFBFC' },
  title: { fontSize: 32, fontFamily: 'Nunito_800ExtraBold', color: '#0F172A', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, fontFamily: 'Nunito_600SemiBold', color: '#6B6B80', marginBottom: 16 },
  banner: { borderRadius: 20, padding: 16, marginBottom: 16, backgroundColor: '#5B9BD5', shadowColor: '#5B9BD5', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 24, elevation: 4 },
  bannerCaption: { fontSize: 10, fontFamily: 'Nunito_800ExtraBold', color: 'rgba(255,255,255,0.8)', marginBottom: 8, letterSpacing: 1 },
  bannerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontFamily: 'Nunito_900Black', color: 'white' },
  bannerName: { fontSize: 18, fontFamily: 'Nunito_900Black', color: 'white' },
  bannerSub: { fontSize: 11, fontFamily: 'Nunito_600SemiBold', color: 'rgba(255,255,255,0.75)' },
  transferBtn: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8 },
  transferBtnText: { color: 'white', fontSize: 12, fontFamily: 'Nunito_800ExtraBold' },
  
  card: { backgroundColor: 'white', borderRadius: 20, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 20, elevation: 3, borderWidth: 1.5, borderColor: '#F0ECE8' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 16, fontFamily: 'Nunito_900Black', color: '#1A1A2E', marginBottom: 12 },
  
  calNavBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F5F0E6', alignItems: 'center', justifyContent: 'center' },
  
  switchRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8 },
  parentBtn: { alignItems: 'center', gap: 6 },
  parentCircle: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center' },
  parentCircleText: { color: 'white', fontSize: 24, fontFamily: 'Nunito_900Black' },
  parentLabel: { fontSize: 12, fontFamily: 'Nunito_800ExtraBold', color: '#1A1A2E' },
  activeLabel: { fontSize: 9, fontFamily: 'Nunito_700Bold', color: '#4DBFAA' },
  
  taskBadge: { backgroundColor: '#6366F1', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  taskBadgeText: { color: 'white', fontSize: 10, fontFamily: 'Nunito_800ExtraBold' },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'white', padding: 10, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#F5EAD6', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  taskTitle: { fontSize: 13, fontFamily: 'Nunito_800ExtraBold', color: '#1A1A2E' },
  taskTitleDone: { color: '#A0A0B0', textDecorationLine: 'line-through' },
  taskMeta: { fontSize: 9, fontFamily: 'Nunito_700Bold', color: '#AAA', marginTop: 2 },
  deleteBtn: { padding: 6, borderRadius: 8, backgroundColor: '#FFE4E4' },
  
  addTaskRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  taskInput: { flex: 1, backgroundColor: 'white', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, fontFamily: 'Nunito_700Bold' },
  timeBtn: { height: 40, minWidth: 40, borderRadius: 12, backgroundColor: 'white', borderWidth: 1, borderColor: '#E0DDD8', alignItems: 'center', justifyContent: 'center' },
  addTaskBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#6366F1', alignItems: 'center', justifyContent: 'center', shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 2 },
  
  timelineItem: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  timelineDot: { position: 'absolute', left: -24, width: 18, height: 18, borderRadius: 9, borderWidth: 2 },
  timelineIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  whoBadge: { borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 2 },
});

const enhance = withObservables([], () => ({
  feedings: database.collections.get('feedings').query(Q.sortBy('created_at', Q.desc)).observe(),
  sleeps: database.collections.get('sleeps').query(Q.sortBy('created_at', Q.desc)).observe(),
  diapers: database.collections.get('diapers').query(Q.sortBy('created_at', Q.desc)).observe(),
  tasks: database.collections.get('tasks').query(Q.sortBy('created_at', Q.asc)).observe(),
  shiftsData: database.collections.get('shifts').query().observe(), // Get all shifts
}));

const ShiftsScreen = enhance(ShiftsScreenContent);
export default ShiftsScreen;

