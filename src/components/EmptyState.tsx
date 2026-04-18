import React from 'react';
import { View, ViewStyle } from 'react-native';
import { Wrapper } from './ui/Wrapper';
import { Typography } from './ui/Typography';
import { IconCircle } from './IconCircle';

interface EmptyStateProps {
  emoji?: string;
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  iconBg?: string;
}

/**
 * EmptyState — Centered empty state with emoji/icon + title + subtitle.
 * Replaces all inline empty state patterns.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  emoji,
  icon,
  title,
  subtitle,
  iconBg = '#F5F0E6',
}) => {
  return (
    <Wrapper py={32} align="center">
      {emoji && (
        <Wrapper mb={12}>
          <Typography variant="h1">{emoji}</Typography>
        </Wrapper>
      )}
      {icon && (
        <Wrapper mb={12}>
          <IconCircle size="lg" bg={iconBg}>{icon}</IconCircle>
        </Wrapper>
      )}
      <Typography variant="body" weight="extraBold" align="center">{title}</Typography>
      {subtitle && (
        <Wrapper mt={4}>
          <Typography variant="tiny" weight="bold" color="textMuted" align="center">{subtitle}</Typography>
        </Wrapper>
      )}
    </Wrapper>
  );
};
