/**
 * PrivacyPolicyScreen — Required for Google Play / App Store.
 * Port from web: PrivacyPolicyScreen.tsx (99 lines)
 */

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  onBack?: () => void;
}

const Section = ({
  icon,
  iconColor,
  title,
  children,
}: {
  icon: string;
  iconColor: string;
  title: string;
  children: React.ReactNode;
}) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Ionicons name={icon as any} size={18} color={iconColor} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    <View style={styles.sectionBody}>{children}</View>
  </View>
);

const PrivacyPolicyScreen = ({ onBack }: Props) => (
  <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
    {onBack && (
      <TouchableOpacity style={styles.backBtn} onPress={onBack}>
        <Ionicons name="chevron-back" size={20} color="#6B6B80" />
      </TouchableOpacity>
    )}

    <Text style={styles.title}>Политика конфиденциальности</Text>
    <Text style={styles.date}>Последнее обновление: 9 марта 2026 г.</Text>

    <Section icon="shield-checkmark-outline" iconColor="#4E8FD4" title="Какие данные мы собираем">
      <Text style={styles.body}>BabySync собирает только те данные, которые вы вводите самостоятельно:</Text>
      <Text style={styles.bullet}>• Профиль ребёнка (имя, дата рождения, пол)</Text>
      <Text style={styles.bullet}>• Записи о кормлениях, сне, подгузниках, прогулках</Text>
      <Text style={styles.bullet}>• Данные роста и веса</Text>
      <Text style={styles.bullet}>• Записи о прививках и посещениях врача</Text>
      <Text style={styles.bullet}>• Email для аутентификации</Text>
    </Section>

    <Section icon="eye-outline" iconColor="#8B5CF6" title="Как мы используем данные">
      <Text style={styles.bullet}>• Отображение статистики и графиков в приложении</Text>
      <Text style={styles.bullet}>• Генерация AI-рекомендаций (данные передаются в OpenAI API для обработки запроса и не сохраняются на сторонних серверах)</Text>
      <Text style={styles.bullet}>• Синхронизация данных между устройствами (через Supabase)</Text>
      <Text style={[styles.body, { color: '#E05A5A', fontWeight: '700', marginTop: 8 }]}>
        Мы НЕ продаём и НЕ передаём ваши данные третьим лицам для маркетинговых целей.
      </Text>
    </Section>

    <Section icon="trash-outline" iconColor="#E05A5A" title="Удаление данных">
      <Text style={styles.body}>
        Вы можете удалить свой аккаунт и все связанные данные в любое время через раздел «Настройки» → «Удалить аккаунт».
        После удаления данные будут безвозвратно удалены в течение 30 дней.
      </Text>
    </Section>

    <Section icon="shield-outline" iconColor="#4DBFAA" title="Безопасность">
      <Text style={styles.body}>
        Данные передаются по защищённому каналу (HTTPS/TLS). Хранение данных осуществляется на серверах Supabase с шифрованием.
        Аутентификация обеспечивается через Supabase Auth с поддержкой OAuth 2.0.
      </Text>
    </Section>

    <Section icon="shield-half-outline" iconColor="#F59E0B" title="Дети (COPPA)">
      <Text style={styles.body}>
        BabySync предназначен для использования родителями и законными представителями.
        Приложение не собирает данные непосредственно от детей. Все данные о ребёнке вводятся родителем.
      </Text>
    </Section>

    <View style={styles.contactCard}>
      <View style={styles.sectionHeader}>
        <Ionicons name="mail-outline" size={16} color="#6B6B80" />
        <Text style={styles.contactTitle}>Связаться с нами</Text>
      </View>
      <Text style={styles.body}>
        По вопросам конфиденциальности:{' '}
        <Text style={styles.email} onPress={() => Linking.openURL('mailto:privacy@babysync.app')}>
          privacy@babysync.app
        </Text>
      </Text>
    </View>
  </ScrollView>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFBFC', paddingHorizontal: 16, paddingTop: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F5F5F9', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '900', color: '#1A1A2E', marginBottom: 8, fontFamily: 'Nunito_900Black' },
  date: { fontSize: 12, fontWeight: '700', color: '#8A8A9E', marginBottom: 20 },
  section: { backgroundColor: 'white', borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1.5, borderColor: '#F0ECE8', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 20, elevation: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: '#1A1A2E' },
  sectionBody: {},
  body: { fontSize: 13, fontWeight: '600', color: '#475569', lineHeight: 20 },
  bullet: { fontSize: 13, fontWeight: '600', color: '#475569', lineHeight: 22, paddingLeft: 8 },
  contactCard: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  contactTitle: { fontSize: 14, fontWeight: '800', color: '#1A1A2E' },
  email: { color: '#4E8FD4', fontWeight: '800' },
});

export default PrivacyPolicyScreen;
