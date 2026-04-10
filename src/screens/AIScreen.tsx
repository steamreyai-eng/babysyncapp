
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { callAI } from '../lib/ai';
import { database } from '../db';
import { useAuthStore } from '../store/authStore';
import NetInfo from '@react-native-community/netinfo';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

const AIScreenContent = () => {
  const [messages, setMessages] = useState<Message[]>([
      { role: 'assistant', text: 'Привет! Я AI-ассистент. Могу анализировать паттерны, давать советы по нормам ВОЗ. Чем помочь?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const [isOnline, setIsOnline] = useState(true);

  const [feedings, setFeedings] = useState<any[]>([]);
  const [sleeps, setSleeps] = useState<any[]>([]);
  const [diapers, setDiapers] = useState<any[]>([]);
  const [walks, setWalks] = useState<any[]>([]);
  const [growthRecords, setGrowthRecords] = useState<any[]>([]);
  const { baby } = useAuthStore();

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

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: 'user', text: text.trim() };
    const newChat = [...messages, userMsg];
    setMessages(newChat);
    setInput('');
    setLoading(true);

    try {
      const contextData = buildContext();
      // Убираем первое сообщение-приветствие из истории для API, чтобы экономить токены и не путать системный промпт
      const apiMessages = newChat.slice(1).map(m => ({ role: m.role, content: m.text })); 
      const result = await callAI(apiMessages, contextData);
      
      const aiMsg: Message = {
        role: 'assistant',
        text: result ? result.replace(/\[CHART:[A-Z_]+\]/g, '') : 'Не удалось получить ответ. Попробуйте позже.',
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', text: '⚠️ Ошибка связи с AI. Проверьте подключение к интернету.' }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd(), 100);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
            <LinearGradient
                colors={['#F0E8FF', '#DBCDF0']}
                start={{x:0,y:0}} end={{x:1,y:1}}
                style={styles.aiIcon}
            >
                <Ionicons name="sparkles" size={22} color="#8B6FD4" />
            </LinearGradient>
            <View>
                <Text style={styles.title}>AI-Ассистент</Text>
                <View style={styles.statusRow}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusText}>Онлайн · знает малыша</Text>
                </View>
            </View>
        </View>

        {/* Offline Banner */}
        {!isOnline && (
            <View style={styles.offlineBanner}>
                <Ionicons name="wifi" size={18} color="#D94F4F" />
                <Text style={styles.offlineText}>Интернета нет. AI-функции недоступны.</Text>
            </View>
        )}

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={styles.messages}
          contentContainerStyle={{ paddingBottom: 20, paddingHorizontal: 16 }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((msg, i) => (
              <View key={i} style={[styles.bubbleWrap, msg.role === 'user' ? styles.userWrap : styles.aiWrap]}>
                  {msg.role === 'assistant' && (
                      <LinearGradient
                          colors={['#F0E8FF', '#DBCDF0']}
                          style={styles.aiAvatar}
                      >
                          <Ionicons name="sparkles" size={14} color="#8B6FD4" />
                      </LinearGradient>
                  )}
                  {msg.role === 'user' ? (
                      <LinearGradient
                          colors={['#764BA2', '#667EEA']}
                          start={{x:0, y:0}} end={{x:1, y:1}}
                          style={[styles.bubble, styles.userBubble]}
                      >
                          <Text style={[styles.bubbleText, styles.userBubbleText]}>{msg.text}</Text>
                      </LinearGradient>
                  ) : (
                      <View style={[styles.bubble, styles.aiBubble]}>
                          <Text style={[styles.bubbleText, styles.aiBubbleText]}>{msg.text}</Text>
                      </View>
                  )}
              </View>
          ))}

          {loading && (
             <View style={[styles.bubbleWrap, styles.aiWrap]}>
                 <LinearGradient colors={['#F0E8FF', '#DBCDF0']} style={styles.aiAvatar}>
                     <Ionicons name="sparkles" size={14} color="#8B6FD4" />
                 </LinearGradient>
                 <View style={[styles.bubble, styles.aiBubble, { flexDirection: 'row', alignItems: 'center' }]}>
                     <ActivityIndicator size="small" color="#8B6FD4" style={{ marginRight: 8 }} />
                 </View>
             </View>
          )}
        </ScrollView>

        {/* Quick actions */}
        <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickActionsContainer}>
                {quickPrompts.map((qp, i) => (
                    <TouchableOpacity
                        key={i}
                        style={styles.quickBtn}
                        onPress={() => sendMessage(qp)}
                    >
                        <Text style={styles.quickBtnText}>{qp}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>

        {/* Input */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ваш вопрос..."
            placeholderTextColor="#A8A8B6"
            multiline
            maxLength={500}
            onSubmitEditing={() => sendMessage(input)}
            blurOnSubmit
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || loading) && { opacity: 0.5, backgroundColor: '#A8A8B6' }]}
            onPress={() => sendMessage(input)}
            disabled={!input.trim() || loading}
          >
            <Ionicons name="send" size={16} color="white" />
          </TouchableOpacity>
        </View>
        <Text style={styles.disclaimerText}>
            <Ionicons name="sparkles" size={10} color="#6B6B80" /> Не заменяет консультацию врача
        </Text>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFBFC' },
  keyboardView: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, backgroundColor: 'rgba(255,255,255,0.75)' },
  aiIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)' },
  title: { fontSize: 20, fontFamily: 'Nunito_900Black', color: '#1A1A2E', letterSpacing: -0.5 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3DBFAA' },
  statusText: { fontSize: 11, fontFamily: 'Nunito_700Bold', color: '#3DBFAA' },

  offlineBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 8, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF0F0', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(217, 79, 79, 0.2)' },
  offlineText: { fontSize: 13, fontFamily: 'Nunito_700Bold', color: '#D94F4F' },

  messages: { flex: 1 },
  
  bubbleWrap: { flexDirection: 'row', marginBottom: 16, maxWidth: '90%', alignItems: 'flex-end' },
  userWrap: { alignSelf: 'flex-end', justifyContent: 'flex-end' },
  aiWrap: { alignSelf: 'flex-start' },
  aiAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 8, zIndex: 2, borderWidth: 1.5, borderColor: 'white', shadowColor: '#8B6FD4', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8 },
  
  bubble: { paddingHorizontal: 16, paddingVertical: 12, zIndex: 1 },
  userBubble: { borderRadius: 20, borderBottomRightRadius: 4, shadowColor: '#764BA2', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 4 },
  aiBubble: { borderRadius: 20, borderBottomLeftRadius: 4, backgroundColor: 'rgba(255,255,255,0.9)', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 20, elevation: 2, borderWidth: 1, borderColor: '#F0ECE8' },
  
  bubbleText: { fontSize: 14, fontFamily: 'Nunito_700Bold', lineHeight: 20 },
  userBubbleText: { color: 'white', fontFamily: 'Nunito_800ExtraBold' },
  aiBubbleText: { color: '#1A1A2E' },

  quickActionsContainer: { paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
  quickBtn: { backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: '#F0ECE8', shadowColor: '#8B6FD4', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 1 },
  quickBtnText: { fontSize: 13, fontFamily: 'Nunito_800ExtraBold', color: '#8B6FD4' },

  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 16, paddingBottom: 8, paddingTop: 4 },
  input: { flex: 1, backgroundColor: 'white', borderRadius: 24, paddingLeft: 20, paddingRight: 48, paddingTop: 14, paddingBottom: 14, fontSize: 14, fontFamily: 'Nunito_700Bold', color: '#1A1A2E', maxHeight: 100, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 24, elevation: 2, borderWidth: 1, borderColor: '#F5F0E6' },
  sendBtn: { position: 'absolute', right: 24, bottom: 14, width: 38, height: 38, borderRadius: 19, backgroundColor: '#8B6FD4', alignItems: 'center', justifyContent: 'center', shadowColor: '#8B6FD4', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 4, zIndex: 10 },
  disclaimerText: { textAlign: 'center', fontSize: 10, fontFamily: 'Nunito_800ExtraBold', color: '#6B6B80', paddingBottom: 12 },
});

export default function AIScreen() {
  return <AIScreenContent />;
}
