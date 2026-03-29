import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { X, BellRing, Settings2, Wand2, Milk, Droplets, Moon } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../store/authStore';
import { NotifSettings, DEFAULT_NOTIF, getRecommendedIntervals } from '../lib/notifications';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

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
    AsyncStorage.setItem('notif_settings', JSON.stringify(next));
  };

  const handleIntervalChange = (key: keyof Pick<NotifSettings, "feedingIntervalMin" | "diaperIntervalMin" | "sleepWindowMin">, value: number) => {
    const next = { ...notif, [key]: value };
    setNotif(next);
    AsyncStorage.setItem('notif_settings', JSON.stringify(next));
  };

  const ageMo = baby?.birthdate
    ? (Date.now() - new Date(baby.birthdate).getTime()) / (30.44 * 24 * 3600 * 1000)
    : 4;
  const recs = getRecommendedIntervals(ageMo);

  return (
    <Modal visible={isOpen} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: 'white', borderTopLeftRadius: 36, borderTopRightRadius: 36, height: '90%' }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 24, borderBottomWidth: 1, borderColor: '#F0ECE8' }}>
             <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                 <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(77,191,170,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                    <BellRing size={22} color="#4DBFAA" />
                 </View>
                 <Text style={{ fontSize: 22, fontFamily: 'Nunito_900Black', color: '#1A1A2E' }}>Уведомления</Text>
             </View>
             <TouchableOpacity onPress={onClose} style={{ padding: 8, borderRadius: 20, backgroundColor: '#F4F4F8' }}>
                <X size={20} color="#6B6B80" />
             </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 14, fontFamily: 'Nunito_700Bold', color: '#8A8A9E', paddingHorizontal: 24, marginTop: -12, marginBottom: 12 }}>
            Настройте напоминания для кормления, смены подгузников и сна.
          </Text>

          {/* Content */}
          <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
            {/* Mode switch */}
            <View style={{ flexDirection: 'row', backgroundColor: '#F4F4F8', borderRadius: 18, padding: 4, marginBottom: 24 }}>
               <TouchableOpacity onPress={() => setModeAuto(true)} style={[{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 14 }, modeAuto && { backgroundColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 }]}>
                  <Wand2 size={16} color={modeAuto ? '#4E8FD4' : '#8A8A9E'} />
                  <Text style={{ fontSize: 14, fontFamily: 'Nunito_800ExtraBold', color: modeAuto ? '#4E8FD4' : '#8A8A9E' }}>Авто-режим</Text>
               </TouchableOpacity>
               <TouchableOpacity onPress={() => setModeAuto(false)} style={[{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 14 }, !modeAuto && { backgroundColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 }]}>
                  <Settings2 size={16} color={!modeAuto ? '#1A1A2E' : '#8A8A9E'} />
                  <Text style={{ fontSize: 14, fontFamily: 'Nunito_800ExtraBold', color: !modeAuto ? '#1A1A2E' : '#8A8A9E' }}>Вручную</Text>
               </TouchableOpacity>
            </View>

            {modeAuto && (
               <View style={{ padding: 16, backgroundColor: '#F4F8FD', borderRadius: 16, borderWidth: 1, borderColor: '#DEEAF8', marginBottom: 24 }}>
                  <Text style={{ fontSize: 13, fontFamily: 'Nunito_700Bold', color: '#4E8FD4', lineHeight: 20 }}>
                     Режим Авто использует AI-интервалы по нормам для возраста малыша. Отсчет ведется от последнего добавленного события.
                  </Text>
               </View>
            )}

            {/* Feeding */}
            <View style={{ marginBottom: 24, backgroundColor: 'white', borderWidth: 1, borderColor: '#F0ECE8', borderRadius: 20, padding: 16 }}>
               <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: (!modeAuto && notif.feeding) ? 12 : 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                     <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(78,143,212,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                        <Milk size={20} color="#4E8FD4" />
                     </View>
                     <View>
                        <Text style={{ fontSize: 16, fontFamily: 'Nunito_900Black', color: '#1A1A2E' }}>Кормление</Text>
                        <Text style={{ fontSize: 13, fontFamily: 'Nunito_700Bold', color: '#8A8A9E' }}>{modeAuto ? `Рекомендуемо: ${recs.feed} мин` : `Через: ${notif.feedingIntervalMin} мин`}</Text>
                     </View>
                  </View>
                  <TouchableOpacity onPress={() => handleNotifToggle('feeding')} style={{ width: 50, height: 28, borderRadius: 14, backgroundColor: notif.feeding ? '#4DBFAA' : '#EAE6E1', padding: 2 }}>
                     <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, transform: [{ translateX: notif.feeding ? 22 : 0 }] }} />
                  </TouchableOpacity>
               </View>
               {!modeAuto && notif.feeding && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                     {[120, 150, 180, 210, 240].map(v => (
                        <TouchableOpacity key={v} onPress={() => handleIntervalChange('feedingIntervalMin', v)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, backgroundColor: notif.feedingIntervalMin === v ? '#4E8FD4' : 'white', borderColor: notif.feedingIntervalMin === v ? '#4E8FD4' : '#F0ECE8' }}>
                           <Text style={{ fontSize: 13, fontFamily: 'Nunito_800ExtraBold', color: notif.feedingIntervalMin === v ? 'white' : '#8A8A9E' }}>{v} мин</Text>
                        </TouchableOpacity>
                     ))}
                  </View>
               )}
            </View>

            {/* Diaper */}
            <View style={{ marginBottom: 24, backgroundColor: 'white', borderWidth: 1, borderColor: '#F0ECE8', borderRadius: 20, padding: 16 }}>
               <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: (!modeAuto && notif.diaper) ? 12 : 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                     <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(61,191,170,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                        <Droplets size={20} color="#3DBFAA" />
                     </View>
                     <View>
                        <Text style={{ fontSize: 16, fontFamily: 'Nunito_900Black', color: '#1A1A2E' }}>Подгузник</Text>
                        <Text style={{ fontSize: 13, fontFamily: 'Nunito_700Bold', color: '#8A8A9E' }}>{modeAuto ? `Рекомендуемо: ${recs.diap} мин` : `Через: ${notif.diaperIntervalMin} мин`}</Text>
                     </View>
                  </View>
                  <TouchableOpacity onPress={() => handleNotifToggle('diaper')} style={{ width: 50, height: 28, borderRadius: 14, backgroundColor: notif.diaper ? '#4DBFAA' : '#EAE6E1', padding: 2 }}>
                     <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, transform: [{ translateX: notif.diaper ? 22 : 0 }] }} />
                  </TouchableOpacity>
               </View>
               {!modeAuto && notif.diaper && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                     {[180, 240, 300, 360].map(v => (
                        <TouchableOpacity key={v} onPress={() => handleIntervalChange('diaperIntervalMin', v)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, backgroundColor: notif.diaperIntervalMin === v ? '#3DBFAA' : 'white', borderColor: notif.diaperIntervalMin === v ? '#3DBFAA' : '#F0ECE8' }}>
                           <Text style={{ fontSize: 13, fontFamily: 'Nunito_800ExtraBold', color: notif.diaperIntervalMin === v ? 'white' : '#8A8A9E' }}>{v} мин</Text>
                        </TouchableOpacity>
                     ))}
                  </View>
               )}
            </View>

            {/* Sleep */}
            <View style={{ marginBottom: 24, backgroundColor: 'white', borderWidth: 1, borderColor: '#F0ECE8', borderRadius: 20, padding: 16 }}>
               <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: (!modeAuto && notif.sleep) ? 12 : 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                     <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(139,111,212,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                        <Moon size={20} color="#8B6FD4" />
                     </View>
                     <View>
                        <Text style={{ fontSize: 16, fontFamily: 'Nunito_900Black', color: '#1A1A2E' }}>Бодрствование</Text>
                        <Text style={{ fontSize: 13, fontFamily: 'Nunito_700Bold', color: '#8A8A9E' }}>{modeAuto ? `Рекомендуемо: ${recs.sleep} мин` : `Через: ${notif.sleepWindowMin} мин`}</Text>
                     </View>
                  </View>
                  <TouchableOpacity onPress={() => handleNotifToggle('sleep')} style={{ width: 50, height: 28, borderRadius: 14, backgroundColor: notif.sleep ? '#4DBFAA' : '#EAE6E1', padding: 2 }}>
                     <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, transform: [{ translateX: notif.sleep ? 22 : 0 }] }} />
                  </TouchableOpacity>
               </View>
               {!modeAuto && notif.sleep && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                     {[60, 90, 120, 150, 180].map(v => (
                        <TouchableOpacity key={v} onPress={() => handleIntervalChange('sleepWindowMin', v)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, backgroundColor: notif.sleepWindowMin === v ? '#8B6FD4' : 'white', borderColor: notif.sleepWindowMin === v ? '#8B6FD4' : '#F0ECE8' }}>
                           <Text style={{ fontSize: 13, fontFamily: 'Nunito_800ExtraBold', color: notif.sleepWindowMin === v ? 'white' : '#8A8A9E' }}>{v} мин</Text>
                        </TouchableOpacity>
                     ))}
                  </View>
               )}
            </View>

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
