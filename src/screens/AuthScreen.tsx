import React, { useState, useRef, useEffect } from 'react';
import { 
   View, TextInput, TouchableOpacity, KeyboardAvoidingView, 
   Platform, Alert, Animated, ScrollView, ViewStyle
} from 'react-native';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Wrapper } from '../components/ui/Wrapper';
import { Surface } from '../components/ui/Surface';
import { Typography } from '../components/ui/Typography';
import { SegmentedControl } from '../components/SegmentedControl';
import { FormField } from '../components/FormField';
import { COLORS, FONTS, RADIUS } from '../lib/theme';

const AUTH_TABS = [
  { key: 'login', label: 'Войти' },
  { key: 'register', label: 'Регистрация' },
];

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -10, duration: 2000, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2000, useNativeDriver: true })
      ])
    ).start();
  }, [floatAnim]);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Ошибка', 'Введите email и пароль');
      return;
    }
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        Alert.alert('Успешно', 'Проверьте почту для подтверждения');
      }
    } catch (e: any) {
      Alert.alert('Ошибка', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
     if (!email) {
        Alert.alert('Ошибка', 'Введите email для восстановления пароля');
        return;
     }
     const { error } = await supabase.auth.resetPasswordForEmail(email);
     if (error) {
        Alert.alert('Ошибка', error.message);
     } else {
        Alert.alert('Успешно', 'Письмо для восстановления отправлено!');
     }
  };

  return (
    <Wrapper flex={1} bg="#F6F2EB">
      <LinearGradient
        colors={['#F6F2EB', '#C8D8F0', '#E8DEFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      
      {/* Decorative Blobs */}
      <View style={[blobStyle, { width: 280, height: 280, backgroundColor: '#C8D8F0', top: -80, right: -60 }]} />
      <View style={[blobStyle, { width: 200, height: 200, backgroundColor: '#E0D0F4', bottom: 60, left: -50 }]} />
      <View style={[blobStyle, { width: 140, height: 140, backgroundColor: '#B8E8DC', top: '35%' as any, left: -20 }]} />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <Wrapper px={20} pb={100} pt={60} flex={1} justify="center">
            
            {/* Logo */}
            <Wrapper align="center" mb={32} mt={40} zIndex={10}>
               <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
                  <LinearGradient
                     colors={['#4E8FD4', '#3DBFAA']}
                     start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                   style={logoGradientStyle}
                  >
                     <Ionicons name="happy" size={40} color="white" />
                  </LinearGradient>
               </Animated.View>
               <Wrapper mt={16}>
                 <Typography variant="h1" weight="black" letterSpacing={-0.5}>BabySync</Typography>
               </Wrapper>
               <Wrapper mt={4}>
                 <Typography variant="caption" weight="bold" color="textMuted" align="center">
                   Сохраняйте важные моменты роста вашего малыша.
                 </Typography>
               </Wrapper>
            </Wrapper>

            {/* Auth Card */}
            <Surface variant="elevated" radius="xl" p={24} zIndex={10}>
               {/* Tabs */}
               <Wrapper mb={24}>
                 <SegmentedControl
                   items={AUTH_TABS}
                   selected={isLogin ? 'login' : 'register'}
                   onChange={(key) => setIsLogin(key === 'login')}
                 />
               </Wrapper>

               <Wrapper gap={16}>
                  {/* Email */}
                  <FormField
                    label="Email"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    leftIcon={<Ionicons name="mail" size={18} color="#8A8A9E" />}
                  />

                  {/* Password */}
                  <FormField
                    label="Пароль"
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Минимум 6 символов"
                    secureTextEntry={!showPassword}
                    leftIcon={<Ionicons name="lock-closed" size={18} color="#8A8A9E" />}
                    rightElement={
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 14 }}>
                         <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#8A8A9E" />
                      </TouchableOpacity>
                    }
                  />

                  {/* Submit */}
                  <TouchableOpacity 
                     onPress={handleAuth}
                     disabled={loading}
                     style={{ marginTop: 8, opacity: loading ? 0.6 : 1 }}
                     activeOpacity={0.8}
                  >
                     <LinearGradient
                        colors={['#4E8FD4', '#3DBFAA']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={submitGradientStyle}
                     >
                        <Ionicons name={isLogin ? "log-in" : "person-add"} size={20} color="white" />
                        <Typography variant="body" weight="extraBold" color="white">
                           {loading ? 'Загрузка...' : (isLogin ? 'Войти' : 'Зарегистрироваться')}
                        </Typography>
                     </LinearGradient>
                  </TouchableOpacity>
               </Wrapper>

               {isLogin && (
                  <Wrapper mt={16} align="center">
                    <TouchableOpacity onPress={handleForgotPassword}>
                       <Typography variant="body" weight="extraBold" color="#4E8FD4">Забыли пароль?</Typography>
                    </TouchableOpacity>
                  </Wrapper>
               )}

               {/* Divider */}
               <Wrapper dir="row" align="center" gap={12} my={24}>
                  <Wrapper flex={1} height={1.5} bg="#E8E4DF" />
                  <Typography variant="tiny" weight="extraBold" color="#8A8A9E" uppercase letterSpacing={0.5}>Или</Typography>
                  <Wrapper flex={1} height={1.5} bg="#E8E4DF" />
               </Wrapper>

               {/* Google Button */}
               <TouchableOpacity
                  onPress={() => Alert.alert('Внимание', 'Google Auth в нативном приложении будет добавлен в следующем обновлении.')}
                  style={googleBtnStyle}
                  activeOpacity={0.8}
               >
                  <Ionicons name="logo-google" size={20} color="#EA4335" />
                  <Typography variant="body" weight="extraBold">Войти через Google</Typography>
               </TouchableOpacity>

            </Surface>
          </Wrapper>
        </ScrollView>
      </KeyboardAvoidingView>
    </Wrapper>
  );
}

/* ── ViewStyle constants ── */
const blobStyle: ViewStyle = { position: 'absolute', borderRadius: 9999, opacity: 0.3 };

const logoGradientStyle: ViewStyle = {
  width: 76, height: 76, borderRadius: 24,
  alignItems: 'center', justifyContent: 'center',
  shadowColor: '#4E8FD4', shadowOffset: { width: 0, height: 12 },
  shadowOpacity: 0.42, shadowRadius: 36, elevation: 8,
};

const submitGradientStyle: ViewStyle = {
  flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  gap: 8, paddingVertical: 16, borderRadius: 14,
  shadowColor: '#4E8FD4', shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.36, shadowRadius: 24, elevation: 4,
};

const googleBtnStyle: ViewStyle = {
  flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  gap: 12, paddingVertical: 14, borderRadius: RADIUS.lg,
  backgroundColor: 'white', borderWidth: 1.5, borderColor: '#E0DDD8',
};
