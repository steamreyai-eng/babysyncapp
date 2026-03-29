
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Switch, ScrollView, Alert, TextInput, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore, getAgeLabel } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { exportDataAsJSON } from '../lib/exportData';
import PrivacyPolicyScreen from './PrivacyPolicyScreen';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BellRing, Moon, Sun, Download, Shield, ChevronRight, LogOut, Edit3, Globe as GlobeIcon, CalendarDays, User } from 'lucide-react-native';
import { NotificationSettingsModal } from '../components/NotificationSettingsModal';

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
    // NOTE: Full native dark mode would require context/theme provider wrappers
  };

  const handleSignOut = async () => {
    Alert.alert('Выход', 'Выйти из аккаунта?', [
       { text: 'Отмена', style: 'cancel' },
       { text: 'Выйти', style: 'destructive', onPress: async () => {
          try {
             const { database } = require('../db');
             await database.write(async () => {
                await database.unsafeResetDatabase();
             });
          } catch (e) {
             console.warn('Ошибка при сбросе базы данных:', e);
          }
          await supabase.auth.signOut();
          setSession(null);
          setBaby(null);
       }}
    ]);
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

  if (showPrivacy) {
    return <PrivacyPolicyScreen onBack={() => setShowPrivacy(false)} />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Настройки</Text>
      <Text style={styles.subtitle}>Профиль и управление</Text>

      {/* Baby profile card */}
      <LinearGradient
        colors={['#2563EB', '#059669']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.profileCard}
      >
        {editMode ? (
          <View style={{ zIndex: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
               <Ionicons name="create" size={16} color="white" />
               <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 15, color: 'white' }}>Редактирование профиля</Text>
            </View>

            <View style={styles.inputGroup}>
               <Text style={styles.inputLabel}>Имя ребёнка</Text>
               <TextInput style={styles.input} value={nameInput} onChangeText={setNameInput} placeholder="Имя малыша" placeholderTextColor="rgba(255,255,255,0.5)" />
            </View>

            <View style={styles.inputGroup}>
               <Text style={styles.inputLabel}>Дата рождения</Text>
               <TouchableOpacity onPress={() => setShowDatePicker(true)} style={[styles.input, { justifyContent: 'center' }]}>
                  <Text style={{ fontFamily: 'Nunito_800ExtraBold', color: 'white' }}>{birthdateInput || 'Выберите дату'}</Text>
               </TouchableOpacity>
               {showDatePicker && (
                  <DateTimePicker
                     value={birthdateInput ? new Date(birthdateInput) : new Date()}
                     mode="date"
                     display="default"
                     maximumDate={new Date()}
                     onChange={(e, d) => {
                        setShowDatePicker(false);
                        if (d) setBirthdateInput(d.toISOString().split('T')[0]);
                     }}
                  />
               )}
            </View>

            <View style={styles.inputGroup}>
               <Text style={styles.inputLabel}>Пол малыша</Text>
               <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity onPress={() => setGenderInput('boy')} style={[styles.genderBtn, { backgroundColor: genderInput === 'boy' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.2)' }]}>
                     <Text style={[styles.genderBtnText, { color: genderInput === 'boy' ? '#2563EB' : 'white' }]}>Мальчик</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setGenderInput('girl')} style={[styles.genderBtn, { backgroundColor: genderInput === 'girl' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.2)' }]}>
                     <Text style={[styles.genderBtnText, { color: genderInput === 'girl' ? '#8B5CF6' : 'white' }]}>Девочка</Text>
                  </TouchableOpacity>
               </View>
            </View>

            <View style={styles.inputGroup}>
               <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Ionicons name="globe" size={14} color="white" />
                  <Text style={styles.inputLabel}>Регион</Text>
               </View>
               <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput style={[styles.input, { flex: 1 }]} value={countryInput} onChangeText={setCountryInput} placeholder="Страна" placeholderTextColor="rgba(255,255,255,0.5)" />
                  <TextInput style={[styles.input, { flex: 1 }]} value={cityInput} onChangeText={setCityInput} placeholder="Город" placeholderTextColor="rgba(255,255,255,0.5)" />
               </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
               <View style={[styles.inputGroup, { flex: 1 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                     <Ionicons name="person" size={14} color="white" />
                     <Text style={styles.inputLabel}>Имя мамы</Text>
                  </View>
                  <TextInput style={styles.input} value={momNameInput} onChangeText={setMomNameInput} placeholder="Мама" placeholderTextColor="rgba(255,255,255,0.5)" />
               </View>
               <View style={[styles.inputGroup, { flex: 1 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                     <Ionicons name="person" size={14} color="white" />
                     <Text style={styles.inputLabel}>Имя папы</Text>
                  </View>
                  <TextInput style={styles.input} value={dadNameInput} onChangeText={setDadNameInput} placeholder="Папа" placeholderTextColor="rgba(255,255,255,0.5)" />
               </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
               <TouchableOpacity onPress={() => setEditMode(false)} style={styles.cancelBtn}>
                  <Text style={{ fontFamily: 'Nunito_800ExtraBold', color: 'white', fontSize: 13 }}>Отмена</Text>
               </TouchableOpacity>
               <TouchableOpacity onPress={handleSaveProfile} disabled={saving} style={styles.saveBtn}>
                  {saving ? (
                     <Text style={{ fontFamily: 'Nunito_900Black', color: '#2563EB', fontSize: 13 }}>Сохраняем...</Text>
                  ) : (
                     <>
                        <Ionicons name="checkmark-circle" size={16} color="#2563EB" />
                        <Text style={{ fontFamily: 'Nunito_900Black', color: '#2563EB', fontSize: 13 }}>Сохранить</Text>
                     </>
                  )}
               </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={{ zIndex: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 8 }}>
               <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{(baby?.name || "М")[0].toUpperCase()}</Text>
               </View>
               <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 24, color: 'white', letterSpacing: -0.5 }}>{baby?.name || "—"}</Text>
                  <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 13, color: 'rgba(255,255,255,0.9)' }}>{ageLabel}</Text>
                  <View style={{ marginTop: 6, gap: 2 }}>
                     <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="calendar" size={12} color="rgba(255,255,255,0.8)" />
                        <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>{fmtBirthdate(baby?.birthdate)}</Text>
                     </View>
                     {(baby?.country || baby?.city) && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                           <Ionicons name="globe" size={12} color="rgba(255,255,255,0.8)" />
                           <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>
                              {[baby?.country, baby?.city].filter(Boolean).join(", ")}
                           </Text>
                        </View>
                     )}
                  </View>
               </View>
            </View>
            <TouchableOpacity onPress={() => setEditMode(true)} style={styles.editBtn}>
               <Ionicons name="create-outline" size={16} color="white" />
               <Text style={{ fontFamily: 'Nunito_800ExtraBold', fontSize: 13, color: 'white' }}>Редактировать профиль</Text>
            </TouchableOpacity>
          </View>
        )}
      </LinearGradient>

      {/* Parents */}
      {!editMode && (
         <View style={styles.parentsCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
               <Ionicons name="people" size={18} color="#64748B" />
               <Text style={{ fontFamily: 'Nunito_900Black', fontSize: 16, color: '#0F172A' }}>Родители</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
               <View style={[styles.parentBadge, { backgroundColor: '#DBEAFE' }]}>
                  <Text style={[styles.parentBadgeLabel, { color: '#2563EB' }]}>Мама</Text>
                  <Text style={[styles.parentBadgeName, { color: '#2563EB' }]}>{baby?.mom_name || "Мама"}</Text>
               </View>
               <View style={[styles.parentBadge, { backgroundColor: '#F3E8FF' }]}>
                  <Text style={[styles.parentBadgeLabel, { color: '#8B5CF6' }]}>Папа</Text>
                  <Text style={[styles.parentBadgeName, { color: '#8B5CF6' }]}>{baby?.dad_name || "Папа"}</Text>
               </View>
            </View>
         </View>
      )}

      {/* App Settings */}
      <Text style={styles.sectionCaption}>Приложение</Text>
      <View style={{ gap: 12, marginBottom: 24 }}>
         {/* Notifications */}
         <TouchableOpacity style={styles.settingItem} onPress={() => setNotifModalOpen(true)}>
            <View style={[styles.settingIconWrap, { backgroundColor: '#D1FAE5' }]}>
               <BellRing size={20} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
               <Text style={styles.settingLabel}>Настройка уведомлений</Text>
               <Text style={styles.settingSub}>Кормление, сон и подгузники</Text>
            </View>
            <ChevronRight size={20} color="#94A3B8" />
         </TouchableOpacity>

         {/* Dark Theme */}
         <View style={styles.settingItem}>
            <View style={[styles.settingIconWrap, { backgroundColor: isDark ? '#F3E8FF' : '#FFEDD5' }]}>
               {isDark ? <Moon size={20} color="#8B5CF6" /> : <Sun size={20} color="#F97316" />}
            </View>
            <View style={{ flex: 1 }}>
               <Text style={styles.settingLabel}>Тема оформления</Text>
               <Text style={styles.settingSub}>{isDark ? 'Тёмная тема' : 'Светлая тема'}</Text>
            </View>
            <TouchableOpacity onPress={() => toggleDarkTheme(!isDark)} style={{ width: 52, height: 30, borderRadius: 15, padding: 2, backgroundColor: isDark ? '#1A1A2E' : '#F4F4F8', borderWidth: 1, borderColor: '#E0DDD8' }}>
               <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, transform: [{ translateX: isDark ? 22 : 0 }] }} />
            </TouchableOpacity>
         </View>

         {/* Export */}
         <TouchableOpacity style={styles.settingItem} onPress={handleExport}>
            <View style={[styles.settingIconWrap, { backgroundColor: '#DBEAFE' }]}>
               <Download size={20} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
               <Text style={styles.settingLabel}>Экспорт данных (PDF)</Text>
               <Text style={styles.settingSub}>Сохранить и отправить врачу</Text>
            </View>
            <ChevronRight size={20} color="#94A3B8" />
         </TouchableOpacity>

         {/* Privacy */}
         <TouchableOpacity style={styles.settingItem} onPress={() => setShowPrivacy(true)}>
            <View style={[styles.settingIconWrap, { backgroundColor: '#F3E8FF' }]}>
               <Shield size={20} color="#8B5CF6" />
            </View>
            <View style={{ flex: 1 }}>
               <Text style={styles.settingLabel}>Политика конфиденциальности</Text>
               <Text style={styles.settingSub}>Данные, безопасность, COPPA</Text>
            </View>
            <ChevronRight size={20} color="#94A3B8" />
         </TouchableOpacity>
      </View>

      {/* Logout */}
      <TouchableOpacity onPress={handleSignOut} style={styles.logoutBtn}>
         <LogOut size={18} color="#EF4444" />
         <Text style={styles.logoutBtnText}>Выйти из аккаунта</Text>
      </TouchableOpacity>

      <Text style={styles.footerText}>BabySync v1.1.0 · Сделано с ❤️ для молодых родителей</Text>
      
      <NotificationSettingsModal isOpen={notifModalOpen} onClose={() => setNotifModalOpen(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFBFC', paddingHorizontal: 16, paddingTop: 16 },
  title: { fontSize: 32, fontFamily: 'Nunito_900Black', color: '#0F172A', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, fontFamily: 'Nunito_700Bold', color: '#6B6B80', marginBottom: 20 },
  
  profileCard: { borderRadius: 24, padding: 20, marginBottom: 24, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.25, shadowRadius: 32, elevation: 6 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 30, fontFamily: 'Nunito_900Black', color: 'white' },
  editBtn: { marginTop: 16, width: '100%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 12, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  
  inputGroup: { marginBottom: 8 },
  inputLabel: { fontSize: 11, fontFamily: 'Nunito_700Bold', color: 'rgba(255,255,255,0.75)', marginBottom: 4 },
  input: { width: '100%', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: 'rgba(255,255,255,0.25)', color: 'white', fontSize: 14, fontFamily: 'Nunito_800ExtraBold' },
  genderBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  genderBtnText: { fontSize: 13, fontFamily: 'Nunito_800ExtraBold' },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center' },
  saveBtn: { flex: 2, paddingVertical: 12, borderRadius: 14, backgroundColor: 'white', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },

  parentsCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#F0ECE8' },
  parentBadge: { flex: 1, borderRadius: 16, padding: 16, alignItems: 'center' },
  parentBadgeLabel: { fontSize: 11, fontFamily: 'Nunito_800ExtraBold', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, opacity: 0.8 },
  parentBadgeName: { fontSize: 16, fontFamily: 'Nunito_900Black' },

  sectionCaption: { fontSize: 11, fontFamily: 'Nunito_800ExtraBold', color: '#64748B', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, paddingHorizontal: 4 },
  settingItem: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: 'white', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  settingIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  settingLabel: { fontSize: 15, fontFamily: 'Nunito_800ExtraBold', color: '#0F172A', marginBottom: 2 },
  settingSub: { fontSize: 12, fontFamily: 'Nunito_700Bold', color: '#64748B' },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, marginBottom: 32 },
  logoutBtnText: { fontSize: 15, fontFamily: 'Nunito_800ExtraBold', color: '#EF4444' },
  footerText: { textAlign: 'center', fontSize: 10, fontFamily: 'Nunito_700Bold', color: '#6B6B80', marginBottom: 16 },
});

