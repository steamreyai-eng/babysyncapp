
import React, { useState } from 'react';
import { 
   View, Text, TextInput, TouchableOpacity, ScrollView, 
   Alert, KeyboardAvoidingView, Platform, StyleSheet 
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function OnboardingScreen() {
  const [step, setStep] = useState(1);
  const [babyName, setBabyName] = useState('');
  const [gender, setGender] = useState<'boy' | 'girl' | ''>('');
  const [birthdate, setBirthdate] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [momName, setMomName] = useState('Мама');
  const [dadName, setDadName] = useState('Папа');
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const { setOnboardingNeeded, setBaby } = useAuthStore();

  const handleNext = () => {
    if (step === 1 && !babyName.trim()) return Alert.alert('Внимание', 'Введите имя малыша');
    if (step === 1 && !gender) return Alert.alert('Внимание', 'Укажите пол малыша');
    if (step === 2 && !birthdate) return Alert.alert('Внимание', 'Укажите дату рождения');
    if (step === 3 && !country.trim()) return Alert.alert('Внимание', 'Укажите страну');
    
    if (step < 4) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    if (!momName.trim() || !dadName.trim()) return Alert.alert('Внимание', 'Заполните имена родителей');
    
    setLoading(true);
    const profile = {
      name: babyName,
      birthdate,
      country: country.trim(),
      city: city.trim(),
      mom_name: momName,
      dad_name: dadName,
      gender: gender || 'boy',
      created_at: new Date().toISOString(),
    };

    try {
       const user = (await supabase.auth.getUser()).data.user;
       if (!user?.id) throw new Error('No user found');
       
       const { error, data } = await supabase.from('baby_profile').insert([{...profile, user_id: user.id}]).select().single();
       if (error) {
          throw error;
       }
       setBaby(data);
       setOnboardingNeeded(false);
    } catch (e: any) {
       Alert.alert('Ошибка при сохранении', e.message);
    } finally {
       setLoading(false);
    }
  };

  const stepConfig = [
      { icon: "happy", colors: ['#4E8FD4', '#3A78C0'], shadow: '#4E8FD4' },
      { icon: "balloon", colors: ['#8B6FD4', '#6B4FB4'], shadow: '#8B6FD4' },
      { icon: "globe", colors: ['#E69600', '#C87800'], shadow: '#E69600' },
      { icon: "people", colors: ['#3DBFAA', '#2E9E8A'], shadow: '#3DBFAA' },
  ];
  const current = stepConfig[step - 1];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#E8DEFF', '#C8D8F0', '#B8E8DC']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Decorative Blobs */}
      <View style={[styles.blob, { width: 260, height: 260, backgroundColor: '#C8D8F0', top: -60, left: -60 }]} />
      <View style={[styles.blob, { width: 200, height: 200, backgroundColor: '#B8E8DC', bottom: 80, right: -50 }]} />
      <View style={[styles.blob, { width: 150, height: 150, backgroundColor: '#E8DEFF', top: '40%', right: -30 }]} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20, justifyContent: 'center' }} showsVerticalScrollIndicator={false}>
          
          {/* Progress Dots */}
          <View style={styles.progressContainer}>
             {[1, 2, 3, 4].map((s) => (
                <View 
                   key={s} 
                   style={[styles.progressDot, {
                      width: step === s ? 36 : 8,
                      backgroundColor: step >= s ? '#4E8FD4' : 'rgba(255,255,255,0.5)'
                   }]} 
                />
             ))}
          </View>

          <View style={styles.card}>
             
             {/* Step Icon */}
             <View style={[styles.iconWrap, { shadowColor: current.shadow }]}>
                <LinearGradient
                   colors={current.colors as unknown as readonly [string, string]}
                   start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                   style={styles.iconGradient}
                >
                   <Ionicons name={current.icon as any} size={30} color="white" />
                </LinearGradient>
             </View>

             {/* Steps */}
             {step === 1 && (
                <View>
                   <Text style={styles.title}>Как зовут малыша?</Text>
                   <Text style={styles.subtitle}>Давайте познакомимся.</Text>
                   
                   <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Имя ребёнка</Text>
                      <TextInput
                         style={styles.input}
                         placeholder="Например: Миша"
                         placeholderTextColor="#94A3B8"
                         value={babyName}
                         onChangeText={setBabyName}
                         autoFocus
                      />
                   </View>

                   <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Пол малыша</Text>
                      <View style={{ flexDirection: 'row', gap: 12 }}>
                         <TouchableOpacity 
                            onPress={() => setGender('boy')}
                            style={[
                               styles.genderBtn, 
                               gender === 'boy' ? { backgroundColor: '#4E8FD4', borderColor: '#4E8FD4' } : { backgroundColor: '#F6F2EB', borderColor: 'transparent' }
                            ]}
                         >
                            <Text style={[styles.genderBtnText, { color: gender === 'boy' ? 'white' : '#8A8A9E' }]}>Мальчик</Text>
                         </TouchableOpacity>
                         <TouchableOpacity 
                            onPress={() => setGender('girl')}
                            style={[
                               styles.genderBtn, 
                               gender === 'girl' ? { backgroundColor: '#8B6FD4', borderColor: '#8B6FD4' } : { backgroundColor: '#F6F2EB', borderColor: 'transparent' }
                            ]}
                         >
                            <Text style={[styles.genderBtnText, { color: gender === 'girl' ? 'white' : '#8A8A9E' }]}>Девочка</Text>
                         </TouchableOpacity>
                      </View>
                   </View>
                </View>
             )}

             {step === 2 && (
                <View>
                   <Text style={styles.title}>Когда {babyName} родился?</Text>
                   <Text style={styles.subtitle}>Нужно для трекинга норм ВОЗ.</Text>
                   <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Дата рождения</Text>
                      <TouchableOpacity onPress={() => setShowDatePicker(true)} style={[styles.input, { justifyContent: 'center' }]}>
                         <Text style={{ fontFamily: 'Nunito_800ExtraBold', color: birthdate ? '#1A1A2E' : '#94A3B8' }}>{birthdate || 'Выберите дату'}</Text>
                      </TouchableOpacity>
                   </View>
                   {showDatePicker && (
                      <DateTimePicker
                         value={birthdate ? new Date(birthdate) : new Date()}
                         mode="date"
                         display="default"
                         maximumDate={new Date()}
                         onChange={(e, d) => {
                            if (Platform.OS === 'android') setShowDatePicker(false);
                            if (d) setBirthdate(d.toISOString().split('T')[0]);
                         }}
                      />
                   )}
                   {Platform.OS === 'ios' && showDatePicker && (
                      <TouchableOpacity style={{ marginTop: 10, alignSelf: 'flex-end', backgroundColor: '#F5F5F9', padding: 8, borderRadius: 8 }} onPress={() => setShowDatePicker(false)}>
                         <Text style={{ fontFamily: 'Nunito_800ExtraBold', color: '#4E8FD4' }}>Готово</Text>
                      </TouchableOpacity>
                   )}
                </View>
             )}

             {step === 3 && (
                <View>
                   <Text style={styles.title}>Откуда вы?</Text>
                   <Text style={styles.subtitle}>Для персональных советов AI по климату.</Text>
                   <LinearGradient
                      colors={['#4E8FD4', '#3A78C0']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      style={{ borderRadius: 16, padding: 16, shadowColor: '#4E8FD4', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 4 }}
                   >
                      <View style={{ gap: 12 }}>
                         <TextInput
                            style={[styles.input, { backgroundColor: 'white' }]}
                            placeholder="Страна"
                            placeholderTextColor="#94A3B8"
                            value={country}
                            onChangeText={setCountry}
                         />
                         <TextInput
                            style={[styles.input, { backgroundColor: 'white' }]}
                            placeholder="Город (необязательно)"
                            placeholderTextColor="#94A3B8"
                            value={city}
                            onChangeText={setCity}
                         />
                      </View>
                      {(country || city) ? (
                         <Text style={{ textAlign: 'center', marginTop: 12, fontSize: 13, fontFamily: 'Nunito_700Bold', color: 'rgba(255,255,255,0.9)' }}>
                            ✓ {[country, city].filter(Boolean).join(", ")}
                         </Text>
                      ) : null}
                   </LinearGradient>
                </View>
             )}

             {step === 4 && (
                <View>
                   <Text style={styles.title}>Имена родителей</Text>
                   <Text style={styles.subtitle}>Для передачи смен в приложении.</Text>
                   <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Имя мамы</Text>
                      <TextInput
                         style={styles.input}
                         placeholder="Имя мамы"
                         placeholderTextColor="#94A3B8"
                         value={momName}
                         onChangeText={setMomName}
                      />
                   </View>
                   <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Имя папы</Text>
                      <TextInput
                         style={styles.input}
                         placeholder="Имя папы"
                         placeholderTextColor="#94A3B8"
                         value={dadName}
                         onChangeText={setDadName}
                      />
                   </View>
                </View>
             )}

             <TouchableOpacity 
                style={[styles.submitBtn, loading && { opacity: 0.6 }]}
                onPress={handleNext}
                disabled={loading}
             >
                <LinearGradient
                   colors={['#4E8FD4', '#3DBFAA']}
                   start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                   style={styles.submitGradient}
                >
                   <Ionicons name={step === 4 ? "arrow-forward" : "chevron-forward"} size={18} color="white" />
                   <Text style={styles.submitText}>
                      {loading ? 'Загрузка...' : step === 4 ? 'Начать использование' : 'Далее'}
                   </Text>
                </LinearGradient>
             </TouchableOpacity>

          </View>
          
          <Text style={styles.stepText}>Шаг {step} из 4</Text>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8DEFF' },
  blob: { position: 'absolute', borderRadius: 9999, opacity: 0.6, filter: 'blur(40px)' },
  
  progressContainer: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 32, zIndex: 10 },
  progressDot: { height: 5, borderRadius: 3 },

  card: { backgroundColor: 'white', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 24, elevation: 4, zIndex: 10 },
  
  iconWrap: { width: 64, height: 64, borderRadius: 20, marginBottom: 20, alignSelf: 'flex-start', elevation: 8, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 28 },
  iconGradient: { flex: 1, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

  title: { fontSize: 24, fontFamily: 'Nunito_900Black', color: '#1A1A2E', letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 13, fontFamily: 'Nunito_700Bold', color: '#6B6B80', marginBottom: 24 },

  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 10, fontFamily: 'Nunito_800ExtraBold', color: '#8A8A9E', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  input: { minHeight: 52, backgroundColor: '#F6F2EB', borderRadius: 16, paddingHorizontal: 20, fontSize: 16, fontFamily: 'Nunito_800ExtraBold', color: '#1A1A2E' },

  genderBtn: { flex: 1, paddingVertical: 16, borderRadius: 16, borderWidth: 2, alignItems: 'center' },
  genderBtnText: { fontSize: 16, fontFamily: 'Nunito_800ExtraBold' },

  submitBtn: { marginTop: 28, borderRadius: 16, shadowColor: '#4E8FD4', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.38, shadowRadius: 24, elevation: 6 },
  submitGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 16 },
  submitText: { fontSize: 16, fontFamily: 'Nunito_800ExtraBold', color: 'white' },

  stepText: { textAlign: 'center', marginTop: 20, fontSize: 13, fontFamily: 'Nunito_700Bold', color: 'rgba(26,26,46,0.45)', zIndex: 10 },
});

