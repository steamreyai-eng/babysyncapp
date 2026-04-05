
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet,
  Dimensions, Platform, KeyboardAvoidingView
} from 'react-native';
import PagerView from 'react-native-pager-view';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Smile, Moon, CalendarDays, Baby, Zap, Sparkles } from 'lucide-react-native';
import { useAuthStore } from '../store/authStore';
import { database } from '../db';
import { useRoutineEngine, type ScheduleBlock, type LeapInfo, type AgeNorms } from '../hooks/useRoutineEngine';
import { useRituals, STEP_PALETTE, type Ritual, type RitualStep, type RitualLog } from '../hooks/useRituals';
import DateTimePickerModal from '../components/DateTimePickerModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/* ═══════════════════════════════════════════════════
   STATUS DASHBOARD
   ═══════════════════════════════════════════════════ */
const StatusDashboard = ({
  leapInfo, norms, adaptations, ageWeeks, ageMo, sources,
}: {
  leapInfo: LeapInfo; norms: AgeNorms; adaptations: string[];
  ageWeeks: number; ageMo: number; sources: string[];
}) => {
  let days = Math.round((ageMo % 1) * 30);
  let m = Math.floor(ageMo);
  if (days >= 30) { m += 1; days = 0; }
  const ageLabel = ageMo < 1 ? `${ageWeeks} нед` : `${m} мес ${days} дн`;

  return (
    <View style={{ gap: 16 }}>
      {/* Age Card */}
      <View style={[styles.card, { padding: 20, overflow: 'hidden' }]}>
        <LinearGradient
          colors={['#667EEA', '#764BA2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
        />
        <View style={{ zIndex: 1 }}>
          <Text style={{ fontSize: 12, fontFamily: 'Nunito_800ExtraBold', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1 }}>
            ВОЗРАСТ МАЛЫША
          </Text>
          <Text style={{ fontSize: 32, fontFamily: 'Nunito_900Black', color: 'white', marginTop: 4 }}>
            {ageLabel}
          </Text>
          <Text style={{ fontSize: 13, fontFamily: 'Nunito_700Bold', color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>
            {ageWeeks} недель · этап: {norms.ageLabel}
          </Text>
        </View>
      </View>

      {/* Leap Card */}
      {leapInfo.status !== 'none' && leapInfo.leap && (
        <View style={[styles.card, {
          padding: 20,
          borderColor: leapInfo.status === 'during' ? '#FDE68A' : leapInfo.status === 'before' ? '#8B5CF6' : '#4DBFAA',
          backgroundColor: leapInfo.status === 'during' ? '#FFFBEB' : leapInfo.status === 'before' ? '#FAF5FF' : '#F0FDF4',
        }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <View style={{
              width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
              backgroundColor: leapInfo.status === 'during' ? '#F59E0B' : leapInfo.status === 'before' ? '#8B5CF6' : '#4DBFAA',
            }}>
              <Ionicons
                name={leapInfo.status === 'during' ? 'flash' : leapInfo.status === 'before' ? 'warning' : 'checkmark'}
                size={20} color="white"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontFamily: 'Nunito_900Black', color: '#1A1A2E' }}>
                Скачок {leapInfo.leapNumber}: «{leapInfo.leap.nameRu}»
              </Text>
              <Text style={{ fontSize: 12, fontFamily: 'Nunito_700Bold', color: '#6B6B80' }}>
                {leapInfo.status === 'during' ? 'В процессе' : leapInfo.status === 'before' ? `Через ~${leapInfo.daysUntilStart} дн` : 'Завершён ✓'}
              </Text>
            </View>
          </View>

          {leapInfo.status === 'during' && leapInfo.progressPct !== null && (
            <View style={{ marginBottom: 12 }}>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: '#F0ECE8' }}>
                <View style={{ height: '100%', borderRadius: 4, backgroundColor: '#F59E0B', width: `${Math.max(1, leapInfo.progressPct)}%` }} />
              </View>
              <Text style={{ fontSize: 11, fontFamily: 'Nunito_800ExtraBold', color: '#92400E', marginTop: 4 }}>
                {leapInfo.progressPct === 0 ? '< 1% пройдено' : `${leapInfo.progressPct}% пройдено`}
              </Text>
            </View>
          )}

          {leapInfo.warning && (
            <Text style={{ fontSize: 13, fontFamily: 'Nunito_600SemiBold', color: '#475569', lineHeight: 20 }}>
              {leapInfo.warning}
            </Text>
          )}

          {leapInfo.status === 'during' && (
            <View style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 11, fontFamily: 'Nunito_800ExtraBold', color: '#8A8A9E', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                ТИПИЧНЫЕ СИМПТОМЫ
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {leapInfo.leap.symptoms.map((s, i) => (
                  <View key={i} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: '#FEF3C7' }}>
                     <Text style={{ fontSize: 11, fontFamily: 'Nunito_700Bold', color: '#92400E' }}>{s}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {leapInfo.leap.parentTips.length > 0 && (
            <View style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 11, fontFamily: 'Nunito_800ExtraBold', color: '#8A8A9E', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                ЧТО ДЕЛАТЬ
              </Text>
              {leapInfo.leap.parentTips.map((tip, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 6 }}>
                  <Text style={{ color: '#4DBFAA', marginTop: 2 }}>✓</Text>
                  <Text style={{ fontSize: 12, fontFamily: 'Nunito_600SemiBold', color: '#475569', lineHeight: 18, flex: 1 }}>{tip}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Norms Card */}
      <View style={[styles.card, { padding: 20 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Ionicons name="trending-up" size={18} color="#8B5CF6" />
          <Text style={{ fontSize: 16, fontFamily: 'Nunito_900Black', color: '#1A1A2E' }}>Нормы для {norms.ageLabel}</Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {[
            { label: 'СОН/СУТКИ', value: `${norms.totalSleepH} ч`, icon: '💤', bg: '#F3E8FF' },
            { label: 'ОКНО БОДР.', value: `${norms.wakeWindowMin[0]}–${norms.wakeWindowMin[1]} мин`, icon: '⏱', bg: '#FEF3C7' },
            { label: 'СНОВ/ДЕНЬ', value: norms.napsCount, icon: '🛏', bg: '#DBEAFE' },
            { label: 'КОРМЛЕНИЙ', value: norms.feedsPerDay, icon: '🍼', bg: '#D1FAE5' },
          ].map((item, i) => (
            <View key={i} style={{ width: (SCREEN_WIDTH - 72) / 2, padding: 12, borderRadius: 16, backgroundColor: item.bg }}>
              <Text style={{ fontSize: 10, fontFamily: 'Nunito_800ExtraBold', color: '#6B6B80', textTransform: 'uppercase' }}>{item.label}</Text>
              <Text style={{ fontSize: 16, fontFamily: 'Nunito_900Black', color: '#1A1A2E', marginTop: 2 }}>{item.icon} {item.value}</Text>
            </View>
          ))}
        </View>

        <Text style={{ fontSize: 11, fontFamily: 'Nunito_800ExtraBold', color: '#8A8A9E', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 16, marginBottom: 8 }}>
          РЕКОМЕНДАЦИИ ДЛЯ ЭТОГО ВОЗРАСТА
        </Text>
        {norms.specificActions.map((action, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 12, backgroundColor: '#F8FAFC', marginBottom: 8 }}>
            <Text style={{ color: '#8B5CF6', fontSize: 12, fontFamily: 'Nunito_900Black' }}>•</Text>
            <Text style={{ fontSize: 13, fontFamily: 'Nunito_700Bold', color: '#334155', flex: 1 }}>{action}</Text>
          </View>
        ))}

        {norms.alerts.length > 0 && (
          <View style={{ gap: 8, marginTop: 12 }}>
             {norms.alerts.map((alert, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 12, backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FDBA74' }}>
                   <Ionicons name="warning" size={16} color="#F97316" style={{ marginTop: 2 }} />
                   <Text style={{ fontSize: 12, fontFamily: 'Nunito_700Bold', color: '#9A3412', flex: 1, lineHeight: 18 }}>{alert}</Text>
                </View>
             ))}
          </View>
        )}
      </View>

      {/* Weekly Adaptations */}
      <View style={[styles.card, { padding: 20 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Sparkles size={18} color="#F59E0B" />
          <Text style={{ fontSize: 16, fontFamily: 'Nunito_900Black', color: '#1A1A2E' }}>Анализ недели</Text>
        </View>
        {adaptations.map((a, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 12, backgroundColor: '#FAFBFC', marginBottom: 10 }}>
            <Ionicons name="information-circle" size={15} color="#6366F1" style={{ marginTop: 2 }} />
            <Text style={{ fontSize: 13, fontFamily: 'Nunito_600SemiBold', color: '#334155', lineHeight: 20, flex: 1 }}>{a}</Text>
          </View>
        ))}
      </View>

      {/* Sources */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 16 }}>
        {sources.map((s, i) => (
          <View key={i} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: '#F1F5F9' }}>
            <Text style={{ fontSize: 10, fontFamily: 'Nunito_800ExtraBold', color: '#64748B' }}>📚 {s}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

/* ═══════════════════════════════════════════════════
   ENGINE SCHEDULE
   ═══════════════════════════════════════════════════ */
const EngineSchedule = ({
  schedule, leapInfo, norms, wakeUpTime, onChangeWakeUp,
}: {
  schedule: ScheduleBlock[]; leapInfo: LeapInfo; norms: AgeNorms;
  wakeUpTime: string; onChangeWakeUp: (t: string) => void;
}) => {
   const [showTimePicker, setShowTimePicker] = useState(false);
   
   const handleTimeChange = (event: any, selectedDate?: Date) => {
      if (Platform.OS === 'android') setShowTimePicker(false);
      if (selectedDate) {
         const h = selectedDate.getHours().toString().padStart(2, '0');
         const m = selectedDate.getMinutes().toString().padStart(2, '0');
         onChangeWakeUp(`${h}:${m}`);
      }
   };

   // Helper to convert string back to Date
   const curDate = new Date();
   const [hh, mm] = wakeUpTime.split(':').map(Number);
   curDate.setHours(hh); curDate.setMinutes(mm); curDate.setSeconds(0);

   return (
      <View>
        {/* Wake-up time display */}
        <View style={[styles.card, { padding: 16, marginBottom: 16 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ fontSize: 14, fontFamily: 'Nunito_900Black', color: '#1A1A2E' }}>☀️ Время подъёма</Text>
              <Text style={{ fontSize: 11, fontFamily: 'Nunito_700Bold', color: '#8A8A9E' }}>Весь план строится от этого времени</Text>
            </View>
            <TouchableOpacity onPress={() => setShowTimePicker(true)}>
               <View style={{ backgroundColor: '#F3E8FF', borderWidth: 2, borderColor: '#8B5CF6', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 }}>
                 <Text style={{ fontSize: 18, fontFamily: 'Nunito_900Black', color: '#8B5CF6' }}>{wakeUpTime}</Text>
               </View>
            </TouchableOpacity>
          </View>
          <DateTimePickerModal
            visible={showTimePicker}
            value={curDate}
            mode="time"
            is24Hour={true}
            onChange={(selectedDate) => {
              if (selectedDate) {
                const h = selectedDate.getHours().toString().padStart(2, '0');
                const m = selectedDate.getMinutes().toString().padStart(2, '0');
                onChangeWakeUp(`${h}:${m}`);
              }
            }}
            onClose={() => setShowTimePicker(false)}
          />
        </View>

        {/* Leap banner */}
        {leapInfo.status === 'during' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 16, backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FCD34D', marginBottom: 16 }}>
            <Ionicons name="flash" size={16} color="#F59E0B" />
            <Text style={{ fontSize: 12, fontFamily: 'Nunito_800ExtraBold', color: '#92400E', flex: 1 }}>Мягкий режим: ±30 мин гибкости к каждому блоку</Text>
          </View>
        )}

        {/* Legend */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { icon: '🍼', label: 'Кормление', bg: '#DBEAFE' },
            { icon: '💤', label: 'Сон', bg: '#F3E8FF' },
            { icon: '🧸', label: 'Активность', bg: '#ECFDF5' },
            { icon: '🌙', label: 'Ритуал/Ночь', bg: '#EDE4F8' },
          ].map(l => (
             <View key={l.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: l.bg }}>
               <Text style={{ fontSize: 12 }}>{l.icon}</Text>
               <Text style={{ fontSize: 10, fontFamily: 'Nunito_800ExtraBold', color: '#475569' }}>{l.label}</Text>
             </View>
          ))}
        </View>

        {/* Timeline */}
        {schedule.map((block, i) => (
          <View key={i} style={[styles.card, { borderColor: block.isFlexible ? '#FCD34D' : '#F0ECE8', marginBottom: 8, overflow: 'hidden' }]}>
            <View style={{ flexDirection: 'row' }}>
               <View style={{ alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 12, backgroundColor: block.color, minWidth: 64 }}>
                 <Text style={{ fontSize: 14, fontFamily: 'Nunito_900Black', color: '#334155' }}>{block.time}</Text>
                 {block.durationMin > 0 && (
                   <Text style={{ fontSize: 10, fontFamily: 'Nunito_800ExtraBold', color: '#6B6B80' }}>{block.durationMin}м</Text>
                 )}
                 {block.isFlexible && <Text style={{ fontSize: 9, fontFamily: 'Nunito_800ExtraBold', color: '#F59E0B' }}>±30м</Text>}
               </View>
               <View style={{ flex: 1, padding: 12 }}>
                 <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                   <Text style={{ fontSize: 18 }}>{block.icon}</Text>
                   <Text style={{ fontSize: 14, fontFamily: 'Nunito_900Black', color: '#1A1A2E' }}>{block.activity}</Text>
                 </View>
                 <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                   {block.actions.map((a, j) => (
                     <View key={j} style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: '#F8FAFC' }}>
                        <Text style={{ fontSize: 10, fontFamily: 'Nunito_700Bold', color: '#6B6B80' }}>{a}</Text>
                     </View>
                   ))}
                 </View>
               </View>
            </View>
          </View>
        ))}

        {/* Norms summary */}
        <View style={[styles.card, { padding: 16, marginTop: 8 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3E8FF' }}>
               <Ionicons name="time" size={20} color="#8B5CF6" />
            </View>
            <View style={{ flex: 1 }}>
               <Text style={{ fontSize: 13, fontFamily: 'Nunito_800ExtraBold', color: '#1A1A2E', marginBottom: 4 }}>
                 Окна бодрствования: {norms.wakeWindowMin[0]}–{norms.wakeWindowMin[1]} мин
               </Text>
               <Text style={{ fontSize: 12, fontFamily: 'Nunito_600SemiBold', color: '#6B6B80', lineHeight: 18 }}>
                 Расписание рассчитано от времени подъёма с учётом рекомендованных окон бодрствования ({norms.ageLabel}).
               </Text>
            </View>
          </View>
        </View>
      </View>
   );
};

/* ═══════════════════════════════════════════════════
   RITUAL CHECKLIST — Active session
   ═══════════════════════════════════════════════════ */
const RitualChecklist = ({
  ritual, log, onCompleteStep, onFinish, onBack, anchorPhrase,
}: {
  ritual: Ritual; log: RitualLog;
  onCompleteStep: (logId: string, stepId: string) => void;
  onFinish: (logId: string) => void;
  onBack: () => void;
  anchorPhrase?: string;
}) => {
  const [stepTimers, setStepTimers] = useState<Record<string, number>>({});
  const intervalRefs = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const [activeStep, setActiveStep] = useState<string | null>(null);

  const toggleTimer = (stepId: string) => {
    if (activeStep === stepId) {
      clearInterval(intervalRefs.current[stepId]);
      delete intervalRefs.current[stepId];
      setActiveStep(null);
    } else {
      if (activeStep && intervalRefs.current[activeStep]) {
        clearInterval(intervalRefs.current[activeStep]);
        delete intervalRefs.current[activeStep];
      }
      setActiveStep(stepId);
      intervalRefs.current[stepId] = setInterval(() => {
        setStepTimers(prev => ({ ...prev, [stepId]: (prev[stepId] || 0) + 1 }));
      }, 1000);
    }
  };

  useEffect(() => () => { Object.values(intervalRefs.current).forEach(clearInterval); }, []);

  const allDone = log.completedSteps.length === ritual.steps.length;
  const progressPct = ritual.steps.length > 0 ? Math.round((log.completedSteps.length / ritual.steps.length) * 100) : 0;
  const fmtTimer = (secs: number) => `${Math.floor(secs / 60).toString().padStart(2, '0')}:${(secs % 60).toString().padStart(2, '0')}`;

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <TouchableOpacity onPress={onBack} style={{ padding: 8, borderRadius: 12, backgroundColor: '#F5F5F9' }}>
          <Ionicons name="chevron-back" size={20} color="#6B6B80" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 22, fontFamily: 'Nunito_900Black', color: '#1A1A2E' }}>{ritual.emoji} {ritual.name}</Text>
          <Text style={{ fontSize: 13, fontFamily: 'Nunito_700Bold', color: '#8A8A9E' }}>{log.completedSteps.length} из {ritual.steps.length} шагов</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={{ marginBottom: 20 }}>
        <View style={{ height: 10, borderRadius: 5, backgroundColor: '#F0ECE8', overflow: 'hidden' }}>
          <View style={{ height: '100%', borderRadius: 5, width: `${progressPct}%`, backgroundColor: allDone ? '#4DBFAA' : '#8B5CF6' }} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
          <Text style={{ fontSize: 11, fontFamily: 'Nunito_800ExtraBold', color: '#8A8A9E' }}>{progressPct}%</Text>
          <Text style={{ fontSize: 11, fontFamily: 'Nunito_800ExtraBold', color: allDone ? '#4DBFAA' : '#8A8A9E' }}>
            {allDone ? '✨ Готово!' : 'В процессе...'}
          </Text>
        </View>
      </View>

      {/* Steps */}
      {ritual.steps.map((step, i) => {
        const done = log.completedSteps.includes(step.id);
        const isActive = activeStep === step.id;
        const timerSec = stepTimers[step.id] || 0;

        return (
          <View key={step.id} style={[styles.card, {
            borderColor: isActive ? '#8B5CF6' : done ? 'rgba(77,191,170,0.25)' : '#F0ECE8',
            backgroundColor: done ? '#F0FDF9' : isActive ? '#FAF5FF' : '#FFFFFF',
            padding: 16, marginBottom: 12,
          }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity
                onPress={() => onCompleteStep(log.id, step.id)}
                style={{
                  width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: done ? '#4DBFAA' : '#F5F5F9',
                }}
              >
                {done ? (
                  <Ionicons name="checkmark" size={18} color="white" />
                ) : (
                  <Text style={{ fontSize: 14, fontFamily: 'Nunito_900Black', color: '#8A8A9E' }}>{i + 1}</Text>
                )}
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 20 }}>{step.icon}</Text>
                  <Text style={{
                    fontSize: 15, fontFamily: 'Nunito_800ExtraBold',
                    color: done ? '#8A8A9E' : '#1A1A2E',
                    textDecorationLine: done ? 'line-through' : 'none',
                  }}>{step.label}</Text>
                </View>
                <Text style={{ fontSize: 11, fontFamily: 'Nunito_700Bold', color: '#6B6B80', marginTop: 2 }}>
                  Рекомендовано: {step.durationMin} мин
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {timerSec > 0 && (
                  <Text style={{ fontSize: 14, fontFamily: 'Nunito_900Black', color: isActive ? '#8B5CF6' : '#6B6B80' }}>
                    {fmtTimer(timerSec)}
                  </Text>
                )}
                <TouchableOpacity
                  onPress={() => toggleTimer(step.id)}
                  style={{
                    width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: isActive ? '#8B5CF6' : '#F5F3FF',
                  }}
                >
                  <Ionicons name={isActive ? 'pause' : 'timer-outline'} size={16} color={isActive ? 'white' : '#8B5CF6'} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );
      })}

      {/* Anchor phrase */}
      {anchorPhrase && (
        <View style={{ marginTop: 16, padding: 16, borderRadius: 16, alignItems: 'center', backgroundColor: '#F0EEFF', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(196, 181, 253, 0.3)' }}>
          <Text style={{ fontSize: 11, fontFamily: 'Nunito_800ExtraBold', color: '#8B5CF6', textTransform: 'uppercase', letterSpacing: 0.5 }}>ФРАЗА-ЯКОРЬ</Text>
          <Text style={{ fontSize: 16, fontFamily: 'Nunito_900Black', color: '#5B21B6', marginTop: 4 }}>«{anchorPhrase}»</Text>
        </View>
      )}

      {allDone && (
        <TouchableOpacity onPress={() => onFinish(log.id)} style={{ marginTop: 24, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#4DBFAA', shadowColor: '#4DBFAA', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 24 }}>
          <Text style={{ fontSize: 16, fontFamily: 'Nunito_900Black', color: 'white' }}>✨ Завершить ритуал</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};


/* ═══════════════════════════════════════════════════
   RITUAL EDITOR 
   ═══════════════════════════════════════════════════ */
const RitualEditor = ({ initial, onSave, onBack, onDelete }: {
  initial?: Ritual;
  onSave: (data: { name: string; emoji: string; steps: RitualStep[] }) => void;
  onBack: () => void; onDelete?: () => void;
}) => {
   const [name, setName] = useState(initial?.name || "");
   const [emoji, setEmoji] = useState(initial?.emoji || "🌙");
   const [steps, setSteps] = useState<RitualStep[]>(initial?.steps || []);
   const emojiOptions = ["🌙", "⚡", "🧖", "🌟", "💤", "🎵", "🛁", "🧸", "☀️"];

   const addStep = (ps: RitualStep) => setSteps(prev => [...prev, { ...ps, id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }]);
   const removeStep = (id: string) => setSteps(prev => prev.filter(s => s.id !== id));
   const moveStep = (from: number, to: number) => {
       if (to < 0 || to >= steps.length) return;
       const arr = [...steps]; const [item] = arr.splice(from, 1); arr.splice(to, 0, item); setSteps(arr);
   };

   const isValid = name.trim().length > 0 && steps.length > 0;

   return (
      <View>
         <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <TouchableOpacity onPress={onBack} style={{ padding: 8, borderRadius: 12, backgroundColor: '#F5F5F9' }}>
               <Ionicons name="chevron-back" size={20} color="#6B6B80" />
            </TouchableOpacity>
            <Text style={{ fontSize: 22, fontFamily: 'Nunito_900Black', color: '#1A1A2E' }}>
               {initial ? "Редактировать" : "Новый ритуал"}
            </Text>
         </View>

         <View style={[styles.card, { padding: 16, marginBottom: 16 }]}>
            <Text style={{ fontSize: 12, fontFamily: 'Nunito_800ExtraBold', color: '#8A8A9E', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>НАЗВАНИЕ</Text>
            <TextInput
               value={name}
               onChangeText={setName}
               placeholder="Напр. Утренний ритуал"
               placeholderTextColor="#94A3B8"
               style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, fontFamily: 'Nunito_800ExtraBold', color: '#1A1A2E' }}
            />
            
            <Text style={{ fontSize: 12, fontFamily: 'Nunito_800ExtraBold', color: '#8A8A9E', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 16, marginBottom: 8 }}>ИКОНКА</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
               {emojiOptions.map(e => (
                  <TouchableOpacity
                     key={e}
                     onPress={() => setEmoji(e)}
                     style={{
                        width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                        backgroundColor: emoji === e ? 'rgba(139,92,246,0.2)' : '#F5F5F9',
                        borderWidth: 2, borderColor: emoji === e ? '#8B5CF6' : 'transparent',
                     }}
                  >
                     <Text style={{ fontSize: 22 }}>{e}</Text>
                  </TouchableOpacity>
               ))}
            </View>
         </View>

         <View style={[styles.card, { padding: 16, marginBottom: 16 }]}>
            <Text style={{ fontSize: 12, fontFamily: 'Nunito_800ExtraBold', color: '#8A8A9E', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
               ШАГИ ({steps.length})
            </Text>
            {steps.length === 0 ? (
               <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, fontFamily: 'Nunito_600SemiBold', color: '#6B6B80' }}>Добавьте шаги из палитры ниже</Text>
               </View>
            ) : (
               <View style={{ gap: 8 }}>
                  {steps.map((step, i) => (
                     <View key={step.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12 }}>
                        <View style={{ flexDirection: 'column', gap: 4, marginRight: 8 }}>
                           <TouchableOpacity onPress={() => moveStep(i, i - 1)}><Ionicons name="chevron-up" size={16} color="#6B6B80" /></TouchableOpacity>
                           <TouchableOpacity onPress={() => moveStep(i, i + 1)}><Ionicons name="chevron-down" size={16} color="#6B6B80" /></TouchableOpacity>
                        </View>
                        <Text style={{ fontSize: 20, marginRight: 8 }}>{step.icon}</Text>
                        <Text style={{ flex: 1, fontSize: 14, fontFamily: 'Nunito_800ExtraBold', color: '#1A1A2E' }}>{step.label}</Text>
                        <Text style={{ fontSize: 12, fontFamily: 'Nunito_700Bold', color: '#8A8A9E', marginRight: 8 }}>{step.durationMin}м</Text>
                        <TouchableOpacity onPress={() => removeStep(step.id)} style={{ padding: 4 }}>
                           <Ionicons name="close-circle" size={20} color="#E05A5A" />
                        </TouchableOpacity>
                     </View>
                  ))}
               </View>
            )}
         </View>

         <View style={[styles.card, { padding: 16, marginBottom: 24 }]}>
            <Text style={{ fontSize: 12, fontFamily: 'Nunito_800ExtraBold', color: '#8A8A9E', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>ДОБАВИТЬ ШАГ</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }}>
               {STEP_PALETTE.map(ps => (
                  <TouchableOpacity
                     key={ps.id}
                     onPress={() => addStep(ps)}
                     style={{ width: '31%', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4, borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', marginBottom: 8 }}
                  >
                     <Text style={{ fontSize: 22, marginBottom: 4 }}>{ps.icon}</Text>
                     <Text style={{ fontSize: 10, fontFamily: 'Nunito_800ExtraBold', color: '#6B6B80', textAlign: 'center', lineHeight: 12 }}>{ps.label}</Text>
                  </TouchableOpacity>
               ))}
            </View>
         </View>

         <View style={{ flexDirection: 'row', gap: 12, marginBottom: 40 }}>
            {onDelete && (
               <TouchableOpacity
                  onPress={onDelete}
                  style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: '#FFE4E4', alignItems: 'center', justifyContent: 'center' }}
               >
                  <Ionicons name="trash" size={20} color="#E05A5A" />
               </TouchableOpacity>
            )}
            <TouchableOpacity
               disabled={!isValid}
               onPress={() => {
                  if (isValid) {
                     onSave({ name: name.trim(), emoji, steps });
                  }
               }}
               style={{
                  flex: 1, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: isValid ? '#8B5CF6' : '#E2E8F0',
                  shadowColor: isValid ? '#8B5CF6' : 'transparent', shadowOffset: { width: 0, height: 8 }, shadowOpacity: isValid ? 0.3 : 0, shadowRadius: 24
               }}
            >
               <Text style={{ fontSize: 15, fontFamily: 'Nunito_900Black', color: isValid ? 'white' : '#94A3B8' }}>
                  {initial ? "Сохранить" : "Создать ритуал"}
               </Text>
            </TouchableOpacity>
         </View>

      </View>
   );
};

/* ═══════════════════════════════════════════════════
   MAIN ROUTINE SCREEN
   ═══════════════════════════════════════════════════ */
const RoutineScreen = () => {
  const baby = useAuthStore(s => s.baby);
  const [sleeps, setSleeps] = useState<any[]>([]);

  useEffect(() => {
    database.get('sleeps').query().fetch().then(setSleeps).catch(() => setSleeps([]));
  }, []);
  const {
    rituals, logs, addRitual, updateRitual, deleteRitual,
    startRitual, completeStep, finishRitual, getCompletionRate, getLastLog,
  } = useRituals();

  const [wakeUpTime, setWakeUpTime] = useState('07:00');
  const engine = useRoutineEngine(baby?.birthdate, baby?.name, sleeps, wakeUpTime);

  const [activeSubTab, setActiveSubTab] = useState<'status' | 'rituals' | 'schedule'>('status');
  const [view, setView] = useState<'list' | 'checklist' | 'editor'>('list');
  const [activeLog, setActiveLog] = useState<RitualLog | null>(null);
  const [activeRitual, setActiveRitual] = useState<Ritual | null>(null);
  const [editingRitual, setEditingRitual] = useState<Ritual | null>(null);

  const pagerRef = useRef<PagerView>(null);
  const handleTabPress = (tab: 'status' | 'rituals' | 'schedule', index: number) => {
    setActiveSubTab(tab);
    pagerRef.current?.setPage(index);
  };

  const completionRate = getCompletionRate(7);

  // Build combined ritual list
  const engineBedtimeRitual: Ritual = {
    id: 'engine-bedtime',
    name: `Вечерний (${engine.bedtimeRitual.ageRange})`,
    emoji: '🌙',
    isPreset: true,
    steps: engine.bedtimeRitual.steps,
  };
  const engineMorningRitual: Ritual = {
    id: 'engine-morning',
    name: 'Утренний ритуал',
    emoji: '☀️',
    isPreset: true,
    steps: engine.morningRitual.steps,
  };
  const allRituals = [engineBedtimeRitual, engineMorningRitual, ...rituals.filter(r => !r.id.startsWith('preset-') && !r.id.startsWith('engine-'))];

  const handleStartRitual = (ritual: Ritual) => {
    const log = startRitual(ritual.id);
    setActiveLog(log);
    setActiveRitual(ritual);
    setView('checklist');
  };

  const handleFinishRitual = (logId: string) => {
    finishRitual(logId);
    setView('list');
    setActiveLog(null);
    setActiveRitual(null);
  };

  const handleSaveRitual = (data: { name: string; emoji: string; steps: RitualStep[] }) => {
     if (editingRitual) updateRitual(editingRitual.id, data);
     else addRitual(data);
     setEditingRitual(null); setView('list');
  };

  const handleDeleteRitual = () => {
     if (editingRitual) {
        deleteRitual(editingRitual.id);
        setEditingRitual(null);
        setView('list');
     }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#FAFBFC' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
       <View style={{ paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 16 }}>
         <Text style={{ fontSize: 32, fontFamily: 'Nunito_900Black', color: '#0F172A', letterSpacing: -0.5, marginBottom: 4 }}>Режим</Text>
         <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 }}>
           {engine.leapInfo.status === 'during' ? (
             <>
               <Zap size={16} color="#F59E0B" />
               <Text style={{ fontSize: 15, fontFamily: 'Nunito_700Bold', color: '#6B6B80' }}>
                 Скачок {engine.leapInfo.leapNumber} — мягкий режим
               </Text>
             </>
           ) : (
             <Text style={{ fontSize: 15, fontFamily: 'Nunito_700Bold', color: '#6B6B80' }}>
               Ритуалы, нормы и расписание
             </Text>
           )}
         </View>

         {/* Sub-tab Selector */}
         {view === 'list' && (
           <View style={{ flexDirection: 'row', padding: 4, marginBottom: 20, borderRadius: 100, backgroundColor: '#E2E8F0' }}>
             {([
               { id: 'status' as const, label: 'Статус', icon: Baby },
               { id: 'rituals' as const, label: 'Ритуалы', icon: Moon },
               { id: 'schedule' as const, label: 'План', icon: CalendarDays },
             ]).map((t, index) => (
               <TouchableOpacity
                 key={t.id}
                 onPress={() => handleTabPress(t.id, index)}
                 style={{
                   flex: 1, flexDirection: 'row', gap: 6, paddingVertical: 10, borderRadius: 100, alignItems: 'center', justifyContent: 'center',
                   backgroundColor: activeSubTab === t.id ? '#FFFFFF' : 'transparent',
                   ...(activeSubTab === t.id ? { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 } : {}),
                 }}
               >
                 <t.icon size={16} color={activeSubTab === t.id ? '#0F172A' : '#64748B'} strokeWidth={activeSubTab === t.id ? 2 : 1.5} />
                 <Text style={{
                   fontSize: 13, fontFamily: 'Nunito_800ExtraBold',
                   color: activeSubTab === t.id ? '#0F172A' : '#64748B',
                 }}>{t.label}</Text>
               </TouchableOpacity>
             ))}
           </View>
         )}
       </View>

       {view === 'list' ? (
        <PagerView style={{ flex: 1 }} initialPage={0} ref={pagerRef} onPageSelected={e => {
          const p = ['status', 'rituals', 'schedule'] as const;
          setActiveSubTab(p[e.nativeEvent.position]);
        }}>
          <View key="status">
            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 180 }} showsVerticalScrollIndicator={false}>
              <StatusDashboard
                leapInfo={engine.leapInfo} norms={engine.norms}
                adaptations={engine.adaptations} ageWeeks={engine.ageWeeks}
                ageMo={engine.ageMo} sources={engine.sources}
              />
            </ScrollView>
          </View>

          <View key="rituals">
            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 180 }} showsVerticalScrollIndicator={false}>
              <View>
             {/* Weekly Stats */}
             {logs.length > 0 && (
               <View style={[styles.card, { padding: 16, marginBottom: 16 }]}>
                 <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                   <View style={{ width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#8B5CF6' }}>
                     <Ionicons name="checkmark-circle" size={22} color="white" />
                   </View>
                   <View style={{ flex: 1 }}>
                     <Text style={{ fontSize: 13, fontFamily: 'Nunito_800ExtraBold', color: '#8A8A9E', textTransform: 'uppercase', letterSpacing: 0.5 }}>ЗА 7 ДНЕЙ</Text>
                     <Text style={{ fontSize: 24, fontFamily: 'Nunito_900Black', color: '#1A1A2E' }}>
                       {completionRate}% <Text style={{ fontSize: 13, fontFamily: 'Nunito_700Bold', color: '#8A8A9E' }}>выполнено</Text>
                     </Text>
                   </View>
                 </View>
               </View>
             )}

             {/* Ritual Cards */}
             {allRituals.map(ritual => {
               const lastLog = getLastLog(ritual.id);
               const totalMin = ritual.steps.reduce((s, st) => s + st.durationMin, 0);
               const isEngine = ritual.id.startsWith('engine-');

               return (
                 <View key={ritual.id} style={[styles.card, { borderColor: isEngine ? 'rgba(139,92,246,0.19)' : '#F0ECE8', marginBottom: 12, overflow: 'hidden' }]}>
                   {isEngine && (
                     <View style={{ paddingHorizontal: 16, paddingVertical: 6, backgroundColor: 'rgba(139,92,246,0.06)' }}>
                       <Text style={{ fontSize: 10, fontFamily: 'Nunito_900Black', color: '#8B5CF6', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                         ✨ РЕКОМЕНДОВАНО ДЛЯ {engine.norms.ageLabel} · {engine.sources[0]}
                       </Text>
                     </View>
                   )}
                   <View style={{ padding: 16 }}>
                     <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                       <View style={{
                         width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
                         backgroundColor: isEngine ? '#8B5CF6' : '#F3E8FF',
                       }}>
                         <Text style={{ fontSize: 24 }}>{ritual.emoji}</Text>
                       </View>
                       <View style={{ flex: 1 }}>
                         <Text style={{ fontSize: 16, fontFamily: 'Nunito_900Black', color: '#1A1A2E' }}>{ritual.name}</Text>
                         <Text style={{ fontSize: 12, fontFamily: 'Nunito_700Bold', color: '#8A8A9E' }}>
                           {ritual.steps.length} шагов · ~{totalMin} мин
                         </Text>
                       </View>
                       {!ritual.isPreset && !isEngine && (
                           <TouchableOpacity onPress={() => { setEditingRitual(ritual); setView('editor'); }} style={{ padding: 8, borderRadius: 12, backgroundColor: '#F5F5F9' }}>
                              <Ionicons name="pencil" size={16} color="#6B6B80" />
                           </TouchableOpacity>
                       )}
                     </View>

                     <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                       {ritual.steps.map(step => (
                         <View key={step.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: '#F8FAFC' }}>
                           <Text style={{ fontSize: 12 }}>{step.icon}</Text>
                           <Text style={{ fontSize: 11, fontFamily: 'Nunito_700Bold', color: '#475569' }}>{step.label}</Text>
                         </View>
                       ))}
                     </View>

                     <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                       {lastLog?.finishedAt ? (
                         <Text style={{ fontSize: 11, fontFamily: 'Nunito_700Bold', color: '#4DBFAA' }}>
                           ✓ Послед.: {new Date(lastLog.finishedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                         </Text>
                       ) : (
                         <Text style={{ fontSize: 11, fontFamily: 'Nunito_700Bold', color: '#6B6B80' }}>Ещё не выполнялся</Text>
                       )}
                       <TouchableOpacity
                         onPress={() => handleStartRitual(ritual)}
                         style={{
                           flexDirection: 'row', alignItems: 'center', gap: 6,
                           paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12,
                           backgroundColor: '#8B5CF6',
                           shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 2
                         }}
                       >
                         <Ionicons name="play" size={14} color="white" />
                         <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 13, color: 'white' }}>Начать</Text>
                       </TouchableOpacity>
                     </View>
                   </View>
                 </View>
               );
             })}

             {/* Anchor Phrase Card */}
             <View style={{ padding: 16, borderRadius: 16, alignItems: 'center', backgroundColor: '#F0EEFF', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(196, 181, 253, 0.3)', marginBottom: 20 }}>
               <Text style={{ fontSize: 11, fontFamily: 'Nunito_800ExtraBold', color: '#8B5CF6', textTransform: 'uppercase', letterSpacing: 0.5 }}>ФРАЗА-ЯКОРЬ НА НОЧЬ</Text>
               <Text style={{ fontSize: 16, fontFamily: 'Nunito_900Black', color: '#5B21B6', marginTop: 4 }}>«{engine.bedtimeRitual.anchorPhrase}»</Text>
               <Text style={{ fontSize: 11, fontFamily: 'Nunito_600SemiBold', color: '#7C3AED', marginTop: 4 }}>Повторяйте каждый вечер одну и ту же фразу</Text>
             </View>

             <TouchableOpacity onPress={() => { setEditingRitual(null); setView('editor'); }} style={{ width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', borderColor: '#D1D5DB', backgroundColor: '#FAFBFC' }}>
                <Ionicons name="add" size={18} color="#6B6B80" />
                <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 14, color: '#6B6B80' }}>Создать свой ритуал</Text>
             </TouchableOpacity>

           </View>
           </ScrollView>
         </View>

         <View key="schedule">
           <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 180 }} showsVerticalScrollIndicator={false}>
             <EngineSchedule
               schedule={engine.schedule} leapInfo={engine.leapInfo}
               norms={engine.norms} onChangeWakeUp={setWakeUpTime} wakeUpTime={wakeUpTime}
             />
           </ScrollView>
         </View>
       </PagerView>
       ) : (
         <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 180 }} showsVerticalScrollIndicator={false}>
            {view === 'checklist' && activeRitual && activeLog && (
              <RitualChecklist
                ritual={activeRitual} log={activeLog}
                onCompleteStep={completeStep} onFinish={handleFinishRitual}
                onBack={() => { setView('list'); setActiveLog(null); setActiveRitual(null); }}
                anchorPhrase={activeRitual.id === 'engine-bedtime' ? engine.bedtimeRitual.anchorPhrase : undefined}
              />
            )}

            {view === 'editor' && (
               <RitualEditor
                  initial={editingRitual || undefined}
                  onSave={handleSaveRitual}
                  onBack={() => { setView('list'); setEditingRitual(null); }}
                  onDelete={editingRitual && !editingRitual.isPreset ? handleDeleteRitual : undefined}
               />
            )}
         </ScrollView>
       )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: '#F0ECE8',
    overflow: 'hidden',
  },
});

export default RoutineScreen;

