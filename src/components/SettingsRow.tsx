import React from 'react';
import { TouchableOpacity, View, ViewStyle } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Wrapper } from './ui/Wrapper';
import { Typography } from './ui/Typography';
import { IconCircle } from './IconCircle';
import { COLORS, RADIUS } from '../lib/theme';

interface SettingsRowProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  showChevron?: boolean;
}

/**
 * SettingsRow — Icon + title/subtitle + chevron/custom right element.
 * Replaces all repeated settings row patterns in SettingsScreen and NotificationSettings.
 */
export const SettingsRow: React.FC<SettingsRowProps> = ({
  icon,
  iconBg,
  title,
  subtitle,
  onPress,
  rightElement,
  showChevron = true,
}) => {
  const containerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderCard,
  };

  const content = (
    <View style={containerStyle}>
      <Wrapper mr={16}>
        <IconCircle bg={iconBg}>{icon}</IconCircle>
      </Wrapper>
      <Wrapper flex={1}>
        <Typography variant="body" weight="extraBold">{title}</Typography>
        {subtitle && (
          <Wrapper mt={2}>
            <Typography variant="tiny" weight="bold" color="#64748B">{subtitle}</Typography>
          </Wrapper>
        )}
      </Wrapper>
      {rightElement || (showChevron && <ChevronRight size={20} color="#94A3B8" />)}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};
