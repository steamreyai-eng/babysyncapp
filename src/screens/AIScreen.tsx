
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
  Keyboard, Animated as RNAnimated, Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Wrapper } from '../components/ui/Wrapper';
import { Surface } from '../components/ui/Surface';
import { Typography } from '../components/ui/Typography';
import { callAIWithDetails } from '../lib/ai';
import { database } from '../db';
import { useAuthStore } from '../store/authStore';
import NetInfo from '@react-native-community/netinfo';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

const AI_CONSENT_KEY = '@babysync_ai_consent';

const AIScreenContent = () => {
  const [messages, setMessages] = useState<Message[]>([
      { role: 'assistant', text: 'Привет! Я AI-ассистент. Могу анализировать паттерны, давать советы по нормам ВОЗ. Чем помочь?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [consentGiven, setConsentGiven] = useState<boolean | null>(null); // null = loading

  const [feedings, setFeedings] = useState<any[]>([]);
  const [sleeps, setSleeps] = useState<any[]>([]);
  const [diapers, setDiapers] = useState<any[]>([]);
  const [walks, setWalks] = useState<any[]>([]);
  const [growthRecords, setGrowthRecords] = useState<any[]>([]);
  const { baby } = useAuthStore();

  // Keyboard height tracking for Android (KeyboardAvoidingView doesn't work in Modal on Android)
  const keyboardPadding = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    // Check AI consent on mount
    AsyncStorage.getItem(AI_CONSENT_KEY).then(val => {
      setConsentGiven(val === 'true');
    });
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      RNAnimated.timing(keyboardPadding, {
        toValue: e.endCoordinates.height,
        duration: 250,
        useNativeDriver: false,
      }).start();
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      RNAnimated.timing(keyboardPadding, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleAcceptConsent = async () => {
    await AsyncStorage.setItem(AI_CONSENT_KEY, 'true');
    setConsentGiven(true);
  };

  const handleDeclineConsent = () => {
    setConsentGiven(false);
  };

  const quickPrompts = [
    baby?.gender === "girl" ? "Почему она плачет? 😭" : "Почему он плачет? 😭",
    "Анализ кормлений 🍼",
    "Нормы ВОЗ 🌐"
  ];

  useEffect(() => {
    database.get('feedings').query().fetch().then(setFeedings).catch(() => {});
    database.get('sleeps').query().fetch().then(setSleeps).catch(() => {});
    database.get('diapers').query().fetch().then(setDiapers).catch(() => {});
    database.get('walks').query().fetch().then(setWalks).catch(() => {});
    database.get('growth_records').query().fetch().then(setGrowthRecords).catch(() => {});

    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(!!state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  const buildContext = () => {
    const sortDesc = (a: any, b: any) => b.created_at - a.created_at;
    const sortedFeed = [...feedings].sort(sortDesc).slice(0, 50);
    const sortedSleep = [...sleeps].sort(sortDesc).slice(0, 50);
    const sortedDiaper = [...diapers].sort(sortDesc).slice(0, 50);
    const sortedWalk = [...walks].sort(sortDesc).slice(0, 50);
    const sortedGrowth = [...growthRecords].sort((a: any, b: any) => b.date - a.date).slice(0, 20);

    return {
      baby: baby ? { name: baby.name, birthdate: new Date(baby.birthdate).toLocaleDateString(), gender: baby.gender } : null,
      feedings: sortedFeed.map(f => ({ time: new Date(f.created_at).toLocaleString(), type: f.feed_type, amount_ml: f.amount_ml })),
      sleeps: sortedSleep.map(s => ({ start: new Date(s.created_at).toLocaleString(), end: new Date(s.end_time).toLocaleString(), durationMin: Math.round(s.duration_seconds / 60) })),
      diapers: sortedDiaper.map(d => ({ time: new Date(d.created_at).toLocaleString(), type: d.diaper_type })),
      walks: sortedWalk.map(w => ({ start: new Date(w.created_at).toLocaleString(), durationMin: Math.round(w.duration_seconds / 60) })),
      growth: sortedGrowth.map(g => ({ date: new Date(g.date).toLocaleDateString(), weight_kg: g.weight_kg, height_cm: g.height_cm }))
    };
  };

  // ── COPPA Consent Screen ──
  if (consentGiven === null) {
    // Loading consent state
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFBFC' }}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  if (!consentGiven) {
    return (
      <Wrapper flex={1} bg="#FAFBFC" justify="center" px={24}>
        <Surface bg="white" radius="xl" p={28} borderWidth={1.5} borderColor="#F0ECE8" variant="elevated" align="center">
          <Wrapper width={72} height={72} radius="card" bg="#EEF2FF" align="center" justify="center" mb={16}>
            <Ionicons name="shield-checkmark" size={40} color="#6366F1" />
          </Wrapper>
          <Wrapper mb={4}><Typography variant="h2" weight="black" color="textPrimary">AI-ассистент</Typography></Wrapper>
          <Wrapper mb={20}><Typography variant="body" weight="bold" color="textMuted">Согласие на обработку данных</Typography></Wrapper>

          <Surface width="100%" bg="#F8FAFC" radius="lg" p={16} mb={24} variant="flat">
            <Typography variant="body" weight="bold" color="#334155" style={{ lineHeight: 20 }}>
              AI-ассистент BabySync использует OpenAI для анализа данных вашего ребёнка и предоставления персонализированных рекомендаций.
            </Typography>
            <Typography variant="body" weight="bold" color="#334155" style={{ lineHeight: 20 }} mt={12}>
              <Typography variant="body" weight="black">Что передаётся:</Typography>
              {'\n'}• Возраст ребёнка (в месяцах) и пол
              {'\n'}• Статистика кормлений, сна, подгузников
              {'\n'}• Данные роста и веса
            </Typography>
            <Typography variant="body" weight="bold" color="#334155" style={{ lineHeight: 20 }} mt={12}>
              <Typography variant="body" weight="black" color="#059669">Что НЕ передаётся:</Typography>
              {'\n'}• Имя ребёнка и родителей
              {'\n'}• Дата рождения и город
              {'\n'}• Email и другие личные данные
            </Typography>
            <Typography variant="tiny" weight="bold" color="textMuted" mt={12}>
              Данные обрабатываются через серверную функцию Supabase и не сохраняются на серверах OpenAI.
              Советы AI не являются медицинским диагнозом.
            </Typography>
          </Surface>

          <Surface as={TouchableOpacity} width="100%" dir="row" align="center" justify="center" gap={8} bg="#6366F1" radius="lg" py={16} mb={12} variant="elevated" onPress={handleAcceptConsent}>
            <Ionicons name="checkmark-circle" size={20} color="white" />
            <Typography variant="body" weight="black" color="white">Согласен, начать</Typography>
          </Surface>

          <TouchableOpacity onPress={handleDeclineConsent} style={{ paddingVertical: 12 }}>
            <Typography variant="body" weight="bold" color="textMuted">Не сейчас</Typography>
          </TouchableOpacity>
        </Surface>
      </Wrapper>
    );
  }

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    // Check connectivity before sending
    if (!isOnline) {
      setMessages(prev => [...prev, 
        { role: 'user', text: text.trim() },
        { role: 'assistant', text: '📡 Нет подключения к интернету. AI-ассистент работает только онлайн.' }
      ]);
      return;
    }

    const userMsg: Message = { role: 'user', text: text.trim() };
    const newChat = [...messages, userMsg];
    setMessages(newChat);
    setInput('');
    setLoading(true);

    try {
      const contextData = buildContext();
      // Убираем первое сообщение-приветствие из истории для API, чтобы экономить токены и не путать системный промпт
      const apiMessages = newChat.slice(1).map(m => ({ role: m.role, content: m.text })); 
      const result = await callAIWithDetails(apiMessages, contextData);
      
      if (result.content) {
        const aiMsg: Message = {
          role: 'assistant',
          text: result.content.replace(/\[CHART:[A-Z_]+\]/g, ''),
        };
        setMessages(prev => [...prev, aiMsg]);
      } else {
        // Show specific error message from the AI service
        const errorText = result.errorMessage || 'Не удалось получить ответ. Попробуйте позже.';
        setMessages(prev => [...prev, { role: 'assistant', text: `⚠️ ${errorText}` }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', text: '⚠️ Ошибка связи с AI. Проверьте подключение к интернету.' }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd(), 100);
    }
  };

  const renderContent = () => (
    <>
      {/* Header */}
      <Wrapper dir="row" align="center" gap={12} px={16} pt={16} pb={12} bg="rgba(255,255,255,0.75)">
          <LinearGradient
              colors={['#F0E8FF', '#DBCDF0']}
              start={{x:0,y:0}} end={{x:1,y:1}}
              style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)' }}
          >
              <Ionicons name="sparkles" size={22} color="#8B6FD4" />
          </LinearGradient>
          <Wrapper>
              <Typography variant="h2" weight="black" color="textPrimary" letterSpacing={-0.5}>AI-Ассистент</Typography>
              <Wrapper dir="row" align="center" gap={6} mt={2}>
                  <Wrapper width={8} height={8} radius="xs" bg="#3DBFAA" />
                  <Typography variant="tiny" weight="bold" color="#3DBFAA">Онлайн · знает малыша</Typography>
              </Wrapper>
          </Wrapper>
      </Wrapper>

      {/* Offline Banner */}
      {!isOnline && (
          <Wrapper mx={16} mb={8} px={16} py={12} bg="#FFF0F0" radius="lg" borderWidth={1} borderColor="rgba(217, 79, 79, 0.2)" dir="row" align="center" gap={8}>
              <Ionicons name="wifi" size={18} color="#D94F4F" />
              <Typography variant="body" weight="bold" color="#D94F4F">Интернета нет. AI-функции недоступны.</Typography>
          </Wrapper>
      )}

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 20, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((msg, i) => (
            <View key={i} style={[{ flexDirection: 'row', marginBottom: 16, maxWidth: '90%', alignItems: 'flex-end' }, msg.role === 'user' ? { alignSelf: 'flex-end', justifyContent: 'flex-end' } : { alignSelf: 'flex-start' }] }>
                {msg.role === 'assistant' && (
                    <LinearGradient
                        colors={['#F0E8FF', '#DBCDF0']}
                        style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 8, zIndex: 2, borderWidth: 1.5, borderColor: 'white', shadowColor: '#8B6FD4', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8 }}
                    >
                        <Ionicons name="sparkles" size={14} color="#8B6FD4" />
                    </LinearGradient>
                )}
                {msg.role === 'user' ? (
                    <LinearGradient
                        colors={['#764BA2', '#667EEA']}
                        start={{x:0, y:0}} end={{x:1, y:1}}
                        style={{ paddingHorizontal: 16, paddingVertical: 12, zIndex: 1, borderRadius: 20, borderBottomRightRadius: 4, shadowColor: '#764BA2', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 4 }}
                    >
                        <Typography variant="body" weight="extraBold" color="white" style={{ lineHeight: 20 }}>{msg.text}</Typography>
                    </LinearGradient>
                ) : (
                    <View style={{ paddingHorizontal: 16, paddingVertical: 12, zIndex: 1, borderRadius: 20, borderBottomLeftRadius: 4, backgroundColor: 'rgba(255,255,255,0.9)', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 20, elevation: 2, borderWidth: 1, borderColor: '#F0ECE8' }}>
                        <Typography variant="body" weight="bold" color="textPrimary" style={{ lineHeight: 20 }}>{msg.text}</Typography>
                    </View>
                )}
            </View>
        ))}

        {loading && (
           <View style={{ flexDirection: 'row', marginBottom: 16, maxWidth: '90%', alignItems: 'flex-end', alignSelf: 'flex-start' }}>
               <LinearGradient colors={['#F0E8FF', '#DBCDF0']} style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 8, zIndex: 2, borderWidth: 1.5, borderColor: 'white', shadowColor: '#8B6FD4', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8 }}>
                   <Ionicons name="sparkles" size={14} color="#8B6FD4" />
               </LinearGradient>
               <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, zIndex: 1, borderRadius: 20, borderBottomLeftRadius: 4, backgroundColor: 'rgba(255,255,255,0.9)', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 20, elevation: 2, borderWidth: 1, borderColor: '#F0ECE8' }}>
                   <ActivityIndicator size="small" color="#8B6FD4" style={{ marginRight: 8 }} />
               </View>
           </View>
        )}
      </ScrollView>

      {/* Quick actions */}
      <Wrapper>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 10, gap: 8 }}>
              {quickPrompts.map((qp, i) => (
                  <Surface as={TouchableOpacity} key={i} bg="rgba(255,255,255,0.7)" radius="card" px={16} py={10} borderWidth={1} borderColor="#F0ECE8" variant="elevated" onPress={() => sendMessage(qp)}>
                      <Typography variant="tiny" weight="extraBold" color="#8B6FD4">{qp}</Typography>
                  </Surface>
              ))}
          </ScrollView>
      </Wrapper>

      {/* Input */}
      <Wrapper dir="row" align="flex-end" gap={8} px={16} pb={8} pt={4}>
        <TextInput
          style={{ flex: 1, backgroundColor: 'white', borderRadius: 24, paddingLeft: 20, paddingRight: 48, paddingTop: 14, paddingBottom: 14, fontSize: 14, fontFamily: 'Nunito_700Bold', color: '#1A1A2E', maxHeight: 100, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 24, elevation: 2, borderWidth: 1, borderColor: '#F5F0E6' }}
          value={input}
          onChangeText={setInput}
          placeholder="Ваш вопрос..."
          placeholderTextColor="#A8A8B6"
          multiline
          maxLength={500}
          onSubmitEditing={() => sendMessage(input)}
          blurOnSubmit
        />
        <Surface as={TouchableOpacity} width={38} height={38} radius="card" align="center" justify="center" variant="elevated"
          bg={(!input.trim() || loading) ? '#A8A8B6' : '#8B6FD4'}
          style={{ position: 'absolute', right: 24, bottom: 14, zIndex: 10, opacity: (!input.trim() || loading) ? 0.5 : 1 }}
          onPress={() => sendMessage(input)}
          disabled={!input.trim() || loading}
        >
          <Ionicons name="send" size={16} color="white" />
        </Surface>
      </Wrapper>
      <Wrapper pb={12} align="center">
      <Typography variant="tiny" weight="extraBold" color="textMuted" align="center">
          <Ionicons name="sparkles" size={10} color="#6B6B80" /> Не заменяет консультацию врача
      </Typography>
   </Wrapper>
    </>
  );

  // iOS: use KeyboardAvoidingView (works fine inside modal on iOS)
  // Android: use manual keyboard padding (KeyboardAvoidingView broken inside Modal on Android)
  if (Platform.OS === 'ios') {
    return (
      <View style={{ flex: 1, backgroundColor: "#FAFBFC" }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior="padding"
          keyboardVerticalOffset={10}
        >
          {renderContent()}
        </KeyboardAvoidingView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#FAFBFC" }}>
      <RNAnimated.View style={[{}, { paddingBottom: keyboardPadding }]}>
        {renderContent()}
      </RNAnimated.View>
    </View>
  );
};



export default function AIScreen() {
  return <AIScreenContent />;
}
