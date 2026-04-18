import React, { useState, useEffect } from 'react';
import { TouchableOpacity, ScrollView, Alert, TextInput, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore, getAgeLabel } from '../store/authStore';
import { useDataStore } from '../store/dataStore';
import { useTimerStore } from '../store/timerStore';
import { supabase } from '../lib/supabase';
import { exportDataAsJSON } from '../lib/exportData';
import PrivacyPolicyScreen from './PrivacyPolicyScreen';
import DateTimePickerModal from '../components/DateTimePickerModal';
import { BellRing, Moon, Sun, Download, Shield, LogOut, Trash2 } from 'lucide-react-native';
import { NotificationSettingsModal } from '../components/NotificationSettingsModal';

import { Wrapper } from '../components/ui/Wrapper';
import { Surface } from '../components/ui/Surface';
import { Typography } from '../components/ui/Typography';
import { SettingsRow } from '../components/SettingsRow';
import { ToggleSwitch } from '../components/ToggleSwitch';
import { SegmentedControl } from '../components/SegmentedControl';
import { COLORS, FONTS, RADIUS } from '../lib/theme';

export default function SettingsScreen() {
  const { baby, setSession, setBaby } = useAuthStore();
  const navigation = useNavigation();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Profile Edit State
  const [editMode, setEditMode] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [birthdateInput, setBirthdateInput] = useState('');
  const [countryInput, setCountryInput] = useState('');
  const [cityInput, setCityInput] = useState('');
  const [momNameInput, setMomNameInput] = useState('');
  const [dadNameInput, setDadNameInput] = useState('');
  const [genderInput, setGenderInput] = useState<'boy' | 'girl'>('boy');
  const [saving, setSaving] = useState(false);
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('notificationsEnabled').then(val => {
      if (val !== null) setNotificationsEnabled(val === 'true');
    });
    AsyncStorage.getItem('isDarkTheme').then(val => {
      if (val !== null) setIsDark(val === 'true');
    });
  }, []);

  useEffect(() => {
    if (baby) {
      setNameInput(baby.name || '');
      setBirthdateInput(baby.birthdate || '');
      setCountryInput(baby.country || '');
      setCityInput(baby.city || '');
      setMomNameInput(baby.mom_name || 'Мама');
      setDadNameInput(baby.dad_name || 'Папа');
      setGenderInput((baby.gender as 'boy'|'girl') || 'boy');
    }
  }, [baby]);

  const toggleNotifications = (val: boolean) => {
    setNotificationsEnabled(val);
    AsyncStorage.setItem('notificationsEnabled', String(val));
  };
  
  const toggleDarkTheme = (val: boolean) => {
    setIsDark(val);
    AsyncStorage.setItem('isDarkTheme', String(val));
  };

  const handleSignOut = async () => {
    Alert.alert('Выход', 'Выйти из аккаунта?', [
       { text: 'Отмена', style: 'cancel' },
       { text: 'Выйти', style: 'destructive', onPress: async () => {
          try {
             useDataStore.getState().clearData();
             useTimerStore.getState().clearAllTimers();
             
             const { database } = require('../db');
             await database.write(async () => {
                await database.unsafeResetDatabase();
             });
          } catch (e) {
             if (__DEV__) console.warn('Ошибка при сбросе базы данных:', e);
          }
          await supabase.auth.signOut();
          setSession(null);
          setBaby(null);
       }}
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      '⚠️ Удаление аккаунта',
      'Все ваши данные будут безвозвратно удалены:\n\n• Профиль ребёнка\n• Кормления, сон, подгузники\n• Прогулки и рост\n• Лекарства и прививки\n• Визиты к врачу\n• История чата с AI\n\nЭто действие НЕЛЬЗЯ отменить.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить всё',
          style: 'destructive',
          onPress: () => confirmDeleteAccount(),
        },
      ]
    );
  };

  const confirmDeleteAccount = () => {
    Alert.prompt
      ? Alert.prompt(
          'Подтверждение удаления',
          'Введите УДАЛИТЬ для подтверждения:',
          [
            { text: 'Отмена', style: 'cancel' },
            {
              text: 'Подтвердить',
              style: 'destructive',
              onPress: (text: string | undefined) => {
                if (text?.trim() === 'УДАЛИТЬ') {
                  executeDeleteAccount();
                } else {
                  Alert.alert('Ошибка', 'Неверное подтверждение. Введите слово УДАЛИТЬ.');
                }
              },
            },
          ],
          'plain-text'
        )
      : Alert.alert(
          'Последнее подтверждение',
          'Вы уверены? Все данные будут безвозвратно удалены. Это действие НЕЛЬЗЯ отменить.',
          [
            { text: 'Отмена', style: 'cancel' },
            { text: 'Да, удалить навсегда', style: 'destructive', onPress: () => executeDeleteAccount() },
          ]
        );
  };

  const executeDeleteAccount = async () => {
    setDeleting(true);
    try {
      const tables = [
        'feedings', 'sleeps', 'diapers', 'walks', 'tasks',
        'growth_records', 'medications', 'vaccinations',
        'doctor_visits', 'shifts', 'chat_history',
      ];

      for (const table of tables) {
        await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      }

      await supabase.from('baby_profile').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      try {
        useDataStore.getState().clearData();
        useTimerStore.getState().clearAllTimers();
        const { database } = require('../db');
        await database.write(async () => {
          await database.unsafeResetDatabase();
        });
      } catch (e) {
        if (__DEV__) console.warn('Local DB reset error:', e);
      }

      try {
        await SecureStore.deleteItemAsync('babysync_baby_profile');
      } catch (e) {}

      await supabase.auth.signOut();
      setSession(null);
      setBaby(null);

      Alert.alert('Готово', 'Ваш аккаунт и все данные удалены.');
    } catch (e: any) {
      if (__DEV__) console.warn('Delete account error:', e);
      Alert.alert('Ошибка', 'Не удалось удалить аккаунт: ' + (e?.message || 'Неизвестная ошибка'));
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    await exportDataAsJSON();
    setExporting(false);
  };

  const handleSaveProfile = async () => {
    if (!nameInput.trim()) return Alert.alert('Ошибка', 'Введите имя малыша');
    if (!birthdateInput) return Alert.alert('Ошибка', 'Укажите дату рождения');
    setSaving(true);
    try {
      if (!baby?.id) throw new Error('No baby id');
      
      const updates = {
        name: nameInput.trim(),
        birthdate: birthdateInput,
        country: countryInput.trim(),
        city: cityInput.trim(),
        mom_name: momNameInput.trim() || 'Мама',
        dad_name: dadNameInput.trim() || 'Папа',
        gender: genderInput,
      };

      const { error } = await supabase.from('baby_profile').update(updates).eq('id', baby.id);
      if (error) throw error;
      
      setBaby({ ...baby, ...updates });
      setEditMode(false);
    } catch (e: any) {
      Alert.alert('Ошибка', 'Не удалось сохранить профиль: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const ageLabel = baby?.birthdate ? getAgeLabel(baby.birthdate) : "—";
  const fmtBirthdate = (iso: string | undefined) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
  };

  // Reusable inline text input for profile editing
  const ProfileInput = ({ value, onChangeText, placeholder }: { value: string; onChangeText: (t: string) => void; placeholder: string }) => (
    <TextInput
      style={{
        width: '100%', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
        backgroundColor: 'rgba(255,255,255,0.25)', color: 'white',
        fontSize: 14, fontFamily: FONTS.extraBold,
      }}
      value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="rgba(255,255,255,0.5)"
    />
  );

  if (showPrivacy) {
    return <PrivacyPolicyScreen onBack={() => setShowPrivacy(false)} />;
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#FAFBFC', paddingHorizontal: 16, paddingTop: 16 }} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
      <Typography variant="h1" weight="black" letterSpacing={-0.5} size={32}>Настройки</Typography>
      <Typography variant="body" weight="bold" color="#6B6B80" mb={20}>Профиль и управление</Typography>

      {/* Baby profile card */}
      <Wrapper mb={24} style={{ borderRadius: RADIUS.xxl, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.25, shadowRadius: 32, elevation: 6 }}>
        <LinearGradient
          colors={['#2563EB', '#059669']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: RADIUS.xxl, padding: 20 }}
        >
          {editMode ? (
            <Wrapper zIndex={10}>
              <Wrapper dir="row" align="center" mb={16} gap={8}>
                 <Ionicons name="create" size={16} color="white" />
                 <Typography variant="body" weight="black" color="white">Редактирование профиля</Typography>
              </Wrapper>

              <Wrapper mb={8}>
                 <Typography variant="tiny" weight="bold" color="rgba(255,255,255,0.75)" mb={4}>Имя ребёнка</Typography>
                 <ProfileInput value={nameInput} onChangeText={setNameInput} placeholder="Имя малыша" />
              </Wrapper>

              <Wrapper mb={8}>
                 <Typography variant="tiny" weight="bold" color="rgba(255,255,255,0.75)" mb={4}>Дата рождения</Typography>
                 <TouchableOpacity onPress={() => setShowDatePicker(true)} style={{ width: '100%', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center' }}>
                    <Typography variant="tiny" weight="extraBold" color="white">{birthdateInput || 'Выберите дату'}</Typography>
                 </TouchableOpacity>
                 <DateTimePickerModal
                    visible={showDatePicker}
                    value={birthdateInput ? new Date(birthdateInput) : new Date()}
                    mode="date"
                    onChange={(d) => { if (d) setBirthdateInput(d.toISOString().split('T')[0]); }}
                    onClose={() => setShowDatePicker(false)}
                 />
              </Wrapper>

              <Wrapper mb={8}>
                 <Typography variant="tiny" weight="bold" color="rgba(255,255,255,0.75)" mb={4}>Пол малыша</Typography>
                 <Wrapper dir="row" gap={8}>
                    {[
                      { key: 'boy', label: 'Мальчик', activeColor: '#2563EB' },
                      { key: 'girl', label: 'Девочка', activeColor: '#8B5CF6' },
                    ].map(g => {
                      const active = genderInput === g.key;
                      return (
                        <TouchableOpacity key={g.key} onPress={() => setGenderInput(g.key as any)}
                          style={{ flex: 1, paddingVertical: 10, borderRadius: RADIUS.lg, alignItems: 'center',
                            backgroundColor: active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.2)' }}
                          activeOpacity={0.8}>
                          <Typography variant="tiny" weight="extraBold" color={active ? g.activeColor : 'white'}>{g.label}</Typography>
                        </TouchableOpacity>
                      );
                    })}
                 </Wrapper>
              </Wrapper>

              <Wrapper mb={8}>
                 <Wrapper dir="row" align="center" mb={6} gap={6}>
                    <Ionicons name="globe" size={14} color="white" />
                    <Typography variant="tiny" weight="bold" color="rgba(255,255,255,0.75)">Регион</Typography>
                 </Wrapper>
                 <Wrapper dir="row" gap={8}>
                    <ProfileInput value={countryInput} onChangeText={setCountryInput} placeholder="Страна" />
                    <ProfileInput value={cityInput} onChangeText={setCityInput} placeholder="Город" />
                 </Wrapper>
              </Wrapper>

              <Wrapper dir="row" gap={12} mt={8}>
                 <Wrapper flex={1}>
                    <Wrapper dir="row" align="center" mb={6} gap={6}>
                       <Ionicons name="person" size={14} color="white" />
                       <Typography variant="tiny" weight="bold" color="rgba(255,255,255,0.75)">Имя мамы</Typography>
                    </Wrapper>
                    <ProfileInput value={momNameInput} onChangeText={setMomNameInput} placeholder="Мама" />
                 </Wrapper>
                 <Wrapper flex={1}>
                    <Wrapper dir="row" align="center" mb={6} gap={6}>
                       <Ionicons name="person" size={14} color="white" />
                       <Typography variant="tiny" weight="bold" color="rgba(255,255,255,0.75)">Имя папы</Typography>
                    </Wrapper>
                    <ProfileInput value={dadNameInput} onChangeText={setDadNameInput} placeholder="Папа" />
                 </Wrapper>
              </Wrapper>

              <Wrapper dir="row" gap={12} mt={12}>
                 <TouchableOpacity onPress={() => setEditMode(false)}
                   style={{ flex: 1, paddingVertical: 12, borderRadius: RADIUS.lg, alignItems: 'center',
                     backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}
                   activeOpacity={0.8}>
                    <Typography variant="tiny" weight="extraBold" color="white">Отмена</Typography>
                 </TouchableOpacity>
                 <TouchableOpacity onPress={handleSaveProfile} disabled={saving}
                   style={{ flex: 2, paddingVertical: 12, borderRadius: RADIUS.lg, backgroundColor: 'white',
                     flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                   activeOpacity={0.8}>
                    {saving ? (
                       <Typography variant="tiny" weight="black" color="#2563EB">Сохраняем...</Typography>
                    ) : (
                       <>
                          <Ionicons name="checkmark-circle" size={16} color="#2563EB" />
                          <Typography variant="tiny" weight="black" color="#2563EB">Сохранить</Typography>
                       </>
                    )}
                 </TouchableOpacity>
              </Wrapper>
            </Wrapper>
          ) : (
            <Wrapper zIndex={10}>
              <Wrapper dir="row" align="center" mb={8}>
                 <Wrapper width={72} height={72} mr={16} align="center" justify="center"
                   style={{ borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' }}>
                    <Typography variant="h1" weight="black" color="white" size={30}>{(baby?.name || "М")[0].toUpperCase()}</Typography>
                 </Wrapper>
                 <Wrapper flex={1}>
                    <Typography variant="h2" weight="black" color="white" letterSpacing={-0.5} size={24}>{baby?.name || "—"}</Typography>
                    <Typography variant="tiny" weight="extraBold" color="rgba(255,255,255,0.9)">{ageLabel}</Typography>
                    <Wrapper mt={6} gap={2}>
                       <Wrapper dir="row" align="center" gap={6}>
                          <Ionicons name="calendar" size={12} color="rgba(255,255,255,0.8)" />
                          <Typography variant="tiny" weight="bold" color="rgba(255,255,255,0.8)">{fmtBirthdate(baby?.birthdate)}</Typography>
                       </Wrapper>
                       {(baby?.country || baby?.city) && (
                          <Wrapper dir="row" align="center" gap={6}>
                             <Ionicons name="globe" size={12} color="rgba(255,255,255,0.8)" />
                             <Typography variant="tiny" weight="bold" color="rgba(255,255,255,0.8)">
                                {[baby?.country, baby?.city].filter(Boolean).join(", ")}
                             </Typography>
                          </Wrapper>
                       )}
                    </Wrapper>
                 </Wrapper>
              </Wrapper>
              <TouchableOpacity onPress={() => setEditMode(true)} activeOpacity={0.8}
                style={{
                  marginTop: 16, width: '100%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
                  backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 12, borderRadius: RADIUS.lg,
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                 <Ionicons name="create-outline" size={16} color="white" />
                 <Typography variant="tiny" weight="extraBold" color="white">Редактировать профиль</Typography>
              </TouchableOpacity>
            </Wrapper>
          )}
        </LinearGradient>
      </Wrapper>

      {/* Parents */}
      {!editMode && (
         <Surface variant="flat" radius="xl" p={20} mb={20}>
            <Wrapper dir="row" align="center" mb={16} gap={8}>
               <Ionicons name="people" size={18} color="#64748B" />
               <Typography variant="body" weight="black">Родители</Typography>
            </Wrapper>
            <Wrapper dir="row" gap={12}>
               <Wrapper flex={1} p={16} align="center" style={{ borderRadius: RADIUS.xl, backgroundColor: '#DBEAFE' }}>
                  <Typography variant="tiny" weight="extraBold" color="#2563EB" uppercase letterSpacing={0.5} mb={4}>Мама</Typography>
                  <Typography variant="body" weight="black" color="#2563EB">{baby?.mom_name || "Мама"}</Typography>
               </Wrapper>
               <Wrapper flex={1} p={16} align="center" style={{ borderRadius: RADIUS.xl, backgroundColor: '#F3E8FF' }}>
                  <Typography variant="tiny" weight="extraBold" color="#8B5CF6" uppercase letterSpacing={0.5} mb={4}>Папа</Typography>
                  <Typography variant="body" weight="black" color="#8B5CF6">{baby?.dad_name || "Папа"}</Typography>
               </Wrapper>
            </Wrapper>
         </Surface>
      )}

      {/* App Settings */}
      <Typography variant="tiny" weight="extraBold" color="#64748B" uppercase letterSpacing={1} mb={8} px={4}>Приложение</Typography>
      <Wrapper gap={12} mb={24}>
         {/* Notifications */}
         <SettingsRow
           icon={<BellRing size={20} color="#059669" />}
           iconBg="#D1FAE5"
           title="Настройка уведомлений"
           subtitle="Кормление, сон и подгузники"
           onPress={() => setNotifModalOpen(true)}
         />

         {/* Dark Theme */}
         <SettingsRow
           icon={isDark ? <Moon size={20} color="#8B5CF6" /> : <Sun size={20} color="#F97316" />}
           iconBg={isDark ? '#F3E8FF' : '#FFEDD5'}
           title="Тема оформления"
           subtitle={isDark ? 'Тёмная тема' : 'Светлая тема'}
           showChevron={false}
           rightElement={<ToggleSwitch value={isDark} onToggle={toggleDarkTheme} tone="purple" />}
         />

         {/* Export */}
         <SettingsRow
           icon={<Download size={20} color="#2563EB" />}
           iconBg="#DBEAFE"
           title="Экспорт данных (PDF)"
           subtitle="Сохранить и отправить врачу"
           onPress={handleExport}
         />

         {/* Privacy */}
         <SettingsRow
           icon={<Shield size={20} color="#8B5CF6" />}
           iconBg="#F3E8FF"
           title="Политика конфиденциальности"
           subtitle="Данные, безопасность, COPPA"
           onPress={() => setShowPrivacy(true)}
         />
      </Wrapper>

      {/* Logout */}
      <TouchableOpacity onPress={handleSignOut} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, marginBottom: 8 }} activeOpacity={0.8}>
         <LogOut size={18} color="#EF4444" style={{ marginRight: 8 }} />
         <Typography variant="body" weight="extraBold" color="#EF4444">Выйти из аккаунта</Typography>
      </TouchableOpacity>

      {/* Delete Account */}
      <TouchableOpacity onPress={handleDeleteAccount} disabled={deleting} activeOpacity={0.8}
        style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
          paddingVertical: 14, marginBottom: 32, marginHorizontal: 32,
          backgroundColor: '#991B1B', borderRadius: RADIUS.xl,
        }}>
         {deleting ? (
           <ActivityIndicator size="small" color="#FFFFFF" />
         ) : (
           <>
             <Trash2 size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
             <Typography variant="tiny" weight="extraBold" color="white">Удалить аккаунт и все данные</Typography>
           </>
         )}
      </TouchableOpacity>

      <Typography variant="tiny" weight="bold" color="#6B6B80" align="center" mb={16}>BabySync v1.1.0 · Сделано с ❤️ для молодых родителей</Typography>
      
      <NotificationSettingsModal isOpen={notifModalOpen} onClose={() => setNotifModalOpen(false)} />
    </ScrollView>
  );
}
