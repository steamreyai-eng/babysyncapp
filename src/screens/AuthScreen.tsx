
import React, { useState, useRef, useEffect } from 'react';
import { 
   View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, 
   Platform, Alert, StyleSheet, Dimensions, Animated, ScrollView
} from 'react-native';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

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
    <View style={styles.container}>
      <LinearGradient
        colors={['#F6F2EB', '#C8D8F0', '#E8DEFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Decorative Blobs */}
      <View style={[styles.blob, { width: 280, height: 280, backgroundColor: '#C8D8F0', top: -80, right: -60 }]} />
      <View style={[styles.blob, { width: 200, height: 200, backgroundColor: '#E0D0F4', bottom: 60, left: -50 }]} />
      <View style={[styles.blob, { width: 140, height: 140, backgroundColor: '#B8E8DC', top: '35%', left: -20 }]} />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
           
           <View style={{ alignItems: 'center', marginBottom: 32, marginTop: 40, zIndex: 10 }}>
              <Animated.View style={[styles.logoWrap, { transform: [{ translateY: floatAnim }] }]}>
                 <LinearGradient
                    colors={['#4E8FD4', '#3DBFAA']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={styles.logoGradient}
                 >
                    <Ionicons name="happy" size={40} color="white" />
                 </LinearGradient>
              </Animated.View>
              <Text style={styles.title}>BabySync</Text>
              <Text style={styles.subtitle}>Сохраняйте важные моменты роста вашего малыша.</Text>
           </View>

           <View style={styles.card}>
              {/* Tabs */}
              <View style={styles.tabsContainer}>
                 {[
                    { key: true, label: "Войти" },
                    { key: false, label: "Регистрация" },
                 ].map(({ key, label }) => (
                    <TouchableOpacity
                       key={String(key)}
                       onPress={() => setIsLogin(key)}
                       style={[styles.tab, isLogin === key && styles.tabActive]}
                    >
                       <Text style={[styles.tabText, isLogin === key && styles.tabTextActive]}>{label}</Text>
                    </TouchableOpacity>
                 ))}
              </View>

              <View style={{ gap: 16 }}>
                 <View>
                    <Text style={styles.inputLabel}>Email</Text>
                    <View style={styles.inputWrap}>
                       <Ionicons name="mail" size={18} color="#8A8A9E" style={styles.inputIcon} />
                       <TextInput
                          style={styles.input}
                          placeholder="you@example.com"
                          placeholderTextColor="#94A3B8"
                          value={email}
                          onChangeText={setEmail}
                          autoCapitalize="none"
                          keyboardType="email-address"
                       />
                    </View>
                 </View>

                 <View>
                    <Text style={styles.inputLabel}>Пароль</Text>
                    <View style={styles.inputWrap}>
                       <Ionicons name="lock-closed" size={18} color="#8A8A9E" style={styles.inputIcon} />
                       <TextInput
                          style={styles.input}
                          placeholder="Минимум 6 символов"
                          placeholderTextColor="#94A3B8"
                          value={password}
                          onChangeText={setPassword}
                          secureTextEntry={!showPassword}
                       />
                       <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                          <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#8A8A9E" />
                       </TouchableOpacity>
                    </View>
                 </View>

                 <TouchableOpacity 
                    style={[styles.submitBtn, loading && { opacity: 0.6 }]}
                    onPress={handleAuth}
                    disabled={loading}
                 >
                    <LinearGradient
                       colors={['#4E8FD4', '#3DBFAA']}
                       start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                       style={styles.submitGradient}
                    >
                       <Ionicons name={isLogin ? "log-in" : "person-add"} size={20} color="white" />
                       <Text style={styles.submitText}>
                          {loading ? 'Загрузка...' : (isLogin ? 'Войти' : 'Зарегистрироваться')}
                       </Text>
                    </LinearGradient>
                 </TouchableOpacity>
              </View>

              {isLogin && (
                 <TouchableOpacity onPress={handleForgotPassword} style={{ marginTop: 16, alignItems: 'center' }}>
                    <Text style={styles.forgotText}>Забыли пароль?</Text>
                 </TouchableOpacity>
              )}

              <View style={styles.dividerWrap}>
                 <View style={styles.dividerLine} />
                 <Text style={styles.dividerText}>Или</Text>
                 <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity 
                 onPress={() => Alert.alert('Внимание', 'Google Auth в нативном приложении будет добавлен в следующем обновлении.')}
                 style={styles.googleBtn}
              >
                 <Ionicons name="logo-google" size={20} color="#EA4335" />
                 <Text style={styles.googleBtnText}>Войти через Google</Text>
              </TouchableOpacity>

           </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F2EB' },
  blob: { position: 'absolute', borderRadius: 9999, opacity: 0.3 },
  keyboardView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100, paddingTop: 60, flexGrow: 1, justifyContent: 'center' },
  
  logoWrap: { width: 76, height: 76, borderRadius: 24, marginBottom: 16, elevation: 8, shadowColor: '#4E8FD4', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.42, shadowRadius: 36 },
  logoGradient: { flex: 1, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 32, fontFamily: 'Nunito_900Black', color: '#1A1A2E', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, fontFamily: 'Nunito_700Bold', color: '#6B6B80', textAlign: 'center', marginTop: 4, maxWidth: 260, lineHeight: 20 },

  card: { backgroundColor: 'white', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 24, elevation: 4, zIndex: 10 },
  
  tabsContainer: { flexDirection: 'row', backgroundColor: '#F0EDE8', borderRadius: 14, padding: 4, marginBottom: 24 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.09, shadowRadius: 8, elevation: 1 },
  tabText: { fontSize: 13, fontFamily: 'Nunito_800ExtraBold', color: '#8A8A9E' },
  tabTextActive: { color: '#1A1A2E' },

  inputLabel: { fontSize: 10, fontFamily: 'Nunito_800ExtraBold', color: '#8A8A9E', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F6F2EB', borderRadius: 14, borderWidth: 2, borderColor: 'transparent' },
  inputIcon: { paddingLeft: 16 },
  input: { flex: 1, paddingVertical: 14, paddingHorizontal: 12, fontSize: 14, fontFamily: 'Nunito_800ExtraBold', color: '#1A1A2E' },
  eyeBtn: { padding: 14 },

  submitBtn: { marginTop: 8, borderRadius: 14, shadowColor: '#4E8FD4', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.36, shadowRadius: 24, elevation: 4 },
  submitGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14 },
  submitText: { fontSize: 15, fontFamily: 'Nunito_800ExtraBold', color: 'white' },

  forgotText: { fontSize: 13, fontFamily: 'Nunito_800ExtraBold', color: '#4E8FD4' },

  dividerWrap: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 24 },
  dividerLine: { flex: 1, height: 1.5, backgroundColor: '#E8E4DF' },
  dividerText: { fontSize: 10, fontFamily: 'Nunito_800ExtraBold', color: '#8A8A9E', textTransform: 'uppercase', letterSpacing: 0.5 },

  googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 14, borderRadius: 14, backgroundColor: 'white', borderWidth: 1.5, borderColor: '#E0DDD8', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 1 },
  googleBtnText: { fontSize: 14, fontFamily: 'Nunito_800ExtraBold', color: '#1A1A2E' },
});
