import React, { useState } from 'react';
import { 
   View, TextInput, TouchableOpacity, ScrollView, 
   Alert, KeyboardAvoidingView, Platform, ViewStyle,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePickerModal from '../components/DateTimePickerModal';

import { Wrapper } from '../components/ui/Wrapper';
import { Surface } from '../components/ui/Surface';
import { Typography } from '../components/ui/Typography';
import { FormField } from '../components/FormField';
import { SegmentedControl } from '../components/SegmentedControl';
import { COLORS, FONTS, RADIUS } from '../lib/theme';

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
      { icon: "happy" as const, colors: ['#4E8FD4', '#3A78C0'] as const, shadow: '#4E8FD4' },
      { icon: "balloon" as const, colors: ['#8B6FD4', '#6B4FB4'] as const, shadow: '#8B6FD4' },
      { icon: "globe" as const, colors: ['#E69600', '#C87800'] as const, shadow: '#E69600' },
      { icon: "people" as const, colors: ['#3DBFAA', '#2E9E8A'] as const, shadow: '#3DBFAA' },
  ];
  const current = stepConfig[step - 1];

  const GENDER_ITEMS = [
    { key: 'boy', label: 'Мальчик' },
    { key: 'girl', label: 'Девочка' },
  ];

  return (
    <View style={containerStyle}>
      <LinearGradient
        colors={['#E8DEFF', '#C8D8F0', '#B8E8DC']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      
      {/* Decorative Blobs */}
      <View style={[blobStyle, { width: 260, height: 260, backgroundColor: '#C8D8F0', top: -60, left: -60 }]} />
      <View style={[blobStyle, { width: 200, height: 200, backgroundColor: '#B8E8DC', bottom: 80, right: -50 }]} />
      <View style={[blobStyle, { width: 150, height: 150, backgroundColor: '#E8DEFF', top: '40%' as any, right: -30 }]} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20, justifyContent: 'center' }} showsVerticalScrollIndicator={false}>
          
          {/* Progress Dots */}
          <Wrapper dir="row" justify="center" gap={8} mb={32} zIndex={10}>
             {[1, 2, 3, 4].map((s) => (
                <View 
                   key={s} 
                   style={[progressDotStyle, {
                      width: step === s ? 36 : 8,
                      backgroundColor: step >= s ? '#4E8FD4' : 'rgba(255,255,255,0.5)',
                   }]} 
                />
             ))}
          </Wrapper>

          {/* Card */}
          <Surface variant="elevated" radius="xxl" p={24} zIndex={10}>
             
             {/* Step Icon */}
             <View style={[iconWrapStyle, { shadowColor: current.shadow }]}>
                <LinearGradient
                   colors={current.colors as unknown as readonly [string, string]}
                   start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                   style={iconGradientStyle}
                >
                   <Ionicons name={current.icon} size={30} color="white" />
                </LinearGradient>
             </View>

             {/* Steps */}
             {step === 1 && (
                <Wrapper>
                   <Typography variant="h2" weight="black" letterSpacing={-0.5} mb={4}>Как зовут малыша?</Typography>
                   <Typography variant="tiny" weight="bold" color="#6B6B80" mb={24}>Давайте познакомимся.</Typography>
                   
                   <Wrapper mb={16}>
                     <FormField label="Имя ребёнка" value={babyName} onChangeText={setBabyName} placeholder="Например: Миша" />
                   </Wrapper>

                   <Wrapper>
                      <Typography variant="tiny" weight="extraBold" color="#8A8A9E" uppercase letterSpacing={0.5} mb={8}>Пол малыша</Typography>
                      <SegmentedControl
                        items={GENDER_ITEMS}
                        selected={gender}
                        onChange={(key) => setGender(key as any)}
                        tone={gender === 'girl' ? 'purple' : 'primary'}
                      />
                   </Wrapper>
                </Wrapper>
             )}

             {step === 2 && (
                <Wrapper>
                   <Typography variant="h2" weight="black" letterSpacing={-0.5} mb={4}>Когда {babyName} родился?</Typography>
                   <Typography variant="tiny" weight="bold" color="#6B6B80" mb={24}>Нужно для трекинга норм ВОЗ.</Typography>
                   <Wrapper>
                      <Typography variant="tiny" weight="extraBold" color="#8A8A9E" uppercase letterSpacing={0.5} mb={8}>Дата рождения</Typography>
                      <Surface onPress={() => setShowDatePicker(true)} tone="transparent" radius="md" p={16} bg="#F6F2EB" style={{ minHeight: 52 }}>
                         <Typography variant="body" weight="extraBold" color={birthdate ? COLORS.foreground : '#94A3B8'}>{birthdate || 'Выберите дату'}</Typography>
                      </Surface>
                   </Wrapper>
                   <DateTimePickerModal
                      visible={showDatePicker}
                      value={birthdate ? new Date(birthdate) : new Date()}
                      mode="date"
                      onChange={(d) => { if (d) setBirthdate(d.toISOString().split('T')[0]); }}
                      onClose={() => setShowDatePicker(false)}
                   />
                </Wrapper>
             )}

             {step === 3 && (
                <Wrapper>
                   <Typography variant="h2" weight="black" letterSpacing={-0.5} mb={4}>Откуда вы?</Typography>
                   <Typography variant="tiny" weight="bold" color="#6B6B80" mb={24}>Для персональных советов AI по климату.</Typography>
                   <LinearGradient
                      colors={['#4E8FD4', '#3A78C0']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      style={locationGradientStyle}
                   >
                      <Wrapper gap={12}>
                         <TextInput
                            style={locationInputStyle}
                            placeholder="Страна"
                            placeholderTextColor="#94A3B8"
                            value={country}
                            onChangeText={setCountry}
                         />
                         <TextInput
                            style={locationInputStyle}
                            placeholder="Город (необязательно)"
                            placeholderTextColor="#94A3B8"
                            value={city}
                            onChangeText={setCity}
                         />
                      </Wrapper>
                      {(country || city) ? (
                         <Typography variant="tiny" weight="bold" color="rgba(255,255,255,0.9)" align="center" mt={12}>
                            ✓ {[country, city].filter(Boolean).join(", ")}
                         </Typography>
                      ) : null}
                   </LinearGradient>
                </Wrapper>
             )}

             {step === 4 && (
                <Wrapper>
                   <Typography variant="h2" weight="black" letterSpacing={-0.5} mb={4}>Имена родителей</Typography>
                   <Typography variant="tiny" weight="bold" color="#6B6B80" mb={24}>Для передачи смен в приложении.</Typography>
                   <Wrapper mb={16}>
                     <FormField label="Имя мамы" value={momName} onChangeText={setMomName} placeholder="Имя мамы" />
                   </Wrapper>
                   <FormField label="Имя папы" value={dadName} onChangeText={setDadName} placeholder="Имя папы" />
                </Wrapper>
             )}

             {/* Submit */}
             <TouchableOpacity 
                style={[submitBtnStyle, loading && { opacity: 0.6 }]}
                onPress={handleNext}
                disabled={loading}
                activeOpacity={0.8}
             >
                <LinearGradient
                   colors={['#4E8FD4', '#3DBFAA']}
                   start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                   style={submitGradientStyle}
                >
                   <Ionicons name={step === 4 ? "arrow-forward" : "chevron-forward"} size={18} color="white" />
                   <Typography variant="body" weight="extraBold" color="white">
                      {loading ? 'Загрузка...' : step === 4 ? 'Начать использование' : 'Далее'}
                   </Typography>
                </LinearGradient>
             </TouchableOpacity>

          </Surface>
          
          <Typography variant="tiny" weight="bold" color="rgba(26,26,46,0.45)" align="center" mt={20} zIndex={10}>Шаг {step} из 4</Typography>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/* ── ViewStyle constants (decorative/absolute-positioned elements) ── */
const containerStyle: ViewStyle = { flex: 1, backgroundColor: '#E8DEFF' };
const blobStyle: ViewStyle = { position: 'absolute', borderRadius: 9999, opacity: 0.3 };
const progressDotStyle: ViewStyle = { height: 5, borderRadius: 3 };

const iconWrapStyle: ViewStyle = {
  width: 64, height: 64, borderRadius: 20, marginBottom: 20,
  alignSelf: 'flex-start', elevation: 8,
  shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 28,
};
const iconGradientStyle: ViewStyle = { flex: 1, borderRadius: 20, alignItems: 'center', justifyContent: 'center' };

const locationGradientStyle: ViewStyle = {
  borderRadius: RADIUS.lg, padding: 16,
  shadowColor: '#4E8FD4', shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.3, shadowRadius: 20, elevation: 4,
};
const locationInputStyle = {
  backgroundColor: 'white', borderRadius: RADIUS.lg,
  paddingHorizontal: 20, minHeight: 52,
  fontSize: 16, fontFamily: FONTS.extraBold, color: COLORS.foreground,
};

const submitBtnStyle: ViewStyle = {
  marginTop: 28, borderRadius: RADIUS.lg,
  shadowColor: '#4E8FD4', shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.38, shadowRadius: 24, elevation: 6,
};
const submitGradientStyle: ViewStyle = {
  flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  gap: 8, paddingVertical: 16, borderRadius: RADIUS.lg,
};
