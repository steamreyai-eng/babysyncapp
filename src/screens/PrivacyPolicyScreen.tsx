/**
 * PrivacyPolicyScreen — Required for Google Play / App Store.
 * Port from web: PrivacyPolicyScreen.tsx (99 lines)
 */

import React from 'react';
import { ScrollView, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Wrapper } from '../components/ui/Wrapper';
import { Surface } from '../components/ui/Surface';
import { Typography } from '../components/ui/Typography';
import { BackButton } from '../components/BackButton';
import { IconCircle } from '../components/IconCircle';
import { COLORS } from '../lib/theme';

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
  <Surface variant="elevated" radius="xl" p={20} mb={16}>
    <Wrapper dir="row" align="center" gap={8} mb={12}>
      <Ionicons name={icon as any} size={18} color={iconColor} />
      <Typography variant="body" weight="black">{title}</Typography>
    </Wrapper>
    <Wrapper>{children}</Wrapper>
  </Surface>
);

const PrivacyPolicyScreen = ({ onBack }: Props) => (
  <Wrapper flex={1} bg="background">
    <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
      {onBack && (
        <Wrapper mb={16}>
          <BackButton onPress={onBack} />
        </Wrapper>
      )}

      <Typography variant="h2" weight="black" mb={8}>Политика конфиденциальности</Typography>
      <Typography variant="tiny" weight="bold" color="textMuted" mb={20}>Последнее обновление: 9 марта 2026 г.</Typography>

      <Section icon="shield-checkmark-outline" iconColor="#4E8FD4" title="Какие данные мы собираем">
        <Typography variant="tiny" weight="semiBold" color="textSecondary">BabySync собирает только те данные, которые вы вводите самостоятельно:</Typography>
        <Typography variant="tiny" weight="semiBold" color="textSecondary" style={{ lineHeight: 22, paddingLeft: 8 }}>• Профиль ребёнка (имя, дата рождения, пол)</Typography>
        <Typography variant="tiny" weight="semiBold" color="textSecondary" style={{ lineHeight: 22, paddingLeft: 8 }}>• Записи о кормлениях, сне, подгузниках, прогулках</Typography>
        <Typography variant="tiny" weight="semiBold" color="textSecondary" style={{ lineHeight: 22, paddingLeft: 8 }}>• Данные роста и веса</Typography>
        <Typography variant="tiny" weight="semiBold" color="textSecondary" style={{ lineHeight: 22, paddingLeft: 8 }}>• Записи о прививках и посещениях врача</Typography>
        <Typography variant="tiny" weight="semiBold" color="textSecondary" style={{ lineHeight: 22, paddingLeft: 8 }}>• Email для аутентификации</Typography>
      </Section>

      <Section icon="eye-outline" iconColor="#8B5CF6" title="Как мы используем данные">
        <Typography variant="tiny" weight="semiBold" color="textSecondary" style={{ lineHeight: 22, paddingLeft: 8 }}>• Отображение статистики и графиков в приложении</Typography>
        <Typography variant="tiny" weight="semiBold" color="textSecondary" style={{ lineHeight: 22, paddingLeft: 8 }}>• Генерация AI-рекомендаций (данные передаются в OpenAI API для обработки запроса и не сохраняются на сторонних серверах)</Typography>
        <Typography variant="tiny" weight="semiBold" color="textSecondary" style={{ lineHeight: 22, paddingLeft: 8 }}>• Синхронизация данных между устройствами (через Supabase)</Typography>
        <Wrapper mt={8}>
          <Typography variant="tiny" weight="bold" color="#E05A5A">
            Мы НЕ продаём и НЕ передаём ваши данные третьим лицам для маркетинговых целей.
          </Typography>
        </Wrapper>
      </Section>

      <Section icon="trash-outline" iconColor="#E05A5A" title="Удаление данных">
        <Typography variant="tiny" weight="semiBold" color="textSecondary" style={{ lineHeight: 20 }}>
          Вы можете удалить свой аккаунт и все связанные данные в любое время через раздел «Настройки» → «Удалить аккаунт».
          После удаления данные будут безвозвратно удалены в течение 30 дней.
        </Typography>
      </Section>

      <Section icon="shield-outline" iconColor="#4DBFAA" title="Безопасность">
        <Typography variant="tiny" weight="semiBold" color="textSecondary" style={{ lineHeight: 20 }}>
          Данные передаются по защищённому каналу (HTTPS/TLS). Хранение данных осуществляется на серверах Supabase с шифрованием.
          Аутентификация обеспечивается через Supabase Auth с поддержкой OAuth 2.0.
        </Typography>
      </Section>

      <Section icon="shield-half-outline" iconColor="#F59E0B" title="Дети (COPPA)">
        <Typography variant="tiny" weight="semiBold" color="textSecondary" style={{ lineHeight: 20 }}>
          BabySync предназначен для использования родителями и законными представителями.
          Приложение не собирает данные непосредственно от детей. Все данные о ребёнке вводятся родителем.
        </Typography>
      </Section>

      <Surface variant="flat" radius="md" p={16} mb={20} bg="#F8FAFC" style={{ borderWidth: 1, borderColor: '#E2E8F0' }}>
        <Wrapper dir="row" align="center" gap={8} mb={12}>
          <Ionicons name="mail-outline" size={16} color="#6B6B80" />
          <Typography variant="tiny" weight="extraBold">Связаться с нами</Typography>
        </Wrapper>
        <Typography variant="tiny" weight="semiBold" color="textSecondary">
          По вопросам конфиденциальности:{' '}
          <Typography variant="tiny" weight="extraBold" color="#4E8FD4" onPress={() => Linking.openURL('mailto:privacy@babysync.app')}>
            privacy@babysync.app
          </Typography>
        </Typography>
      </Surface>
    </ScrollView>
  </Wrapper>
);

export default PrivacyPolicyScreen;
