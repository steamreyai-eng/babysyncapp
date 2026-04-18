import React from 'react';
import { View, ViewStyle } from 'react-native';
import { Typography } from './ui/Typography';
import { RADIUS } from '../lib/theme';

interface StatusBadgeProps {
  label: string;
  tone?: 'primary' | 'purple' | 'success' | 'danger' | 'warning' | 'neutral' | 'info';
  size?: 'sm' | 'md';
}

const TONE_STYLES: Record<string, { bg: string; text: string }> = {
  primary: { bg: '#2563EB', text: '#FFFFFF' },
  purple: { bg: '#8B5CF6', text: '#FFFFFF' },
  success: { bg: '#D1FAE5', text: '#059669' },
  danger: { bg: '#FFE4E4', text: '#D94F4F' },
  warning: { bg: '#FEF3C7', text: '#92400E' },
  neutral: { bg: '#F4F4F8', text: '#8A8A9E' },
  info: { bg: '#DBEAFE', text: '#2563EB' },
};

/**
 * StatusBadge — Small inline badge with colored background.
 * Replaces all inline badge/tag patterns across screens.
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  tone = 'neutral',
  size = 'sm',
}) => {
  const { bg, text } = TONE_STYLES[tone];

  const style: ViewStyle = {
    paddingHorizontal: size === 'sm' ? 8 : 12,
    paddingVertical: size === 'sm' ? 2 : 4,
    borderRadius: 12,
    backgroundColor: bg,
  };

  return (
    <View style={style}>
      <Typography variant="tiny" weight="extraBold" color={text}>{label}</Typography>
    </View>
  );
};
