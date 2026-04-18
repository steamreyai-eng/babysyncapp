import React from 'react';
import { TouchableOpacity, View, ViewStyle, Animated } from 'react-native';
import { SHADOWS } from '../lib/theme';

interface ToggleSwitchProps {
  value: boolean;
  onToggle: (value: boolean) => void;
  tone?: 'success' | 'primary' | 'purple';
  disabled?: boolean;
}

const TONE_ACTIVE: Record<string, string> = {
  success: '#4DBFAA',
  primary: '#2563EB',
  purple: '#8B5CF6',
};

/**
 * ToggleSwitch — Custom toggle switch with smooth transition.
 * Replaces all inline toggle implementations in Settings and Notifications.
 */
export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  value,
  onToggle,
  tone = 'success',
  disabled = false,
}) => {
  const activeColor = TONE_ACTIVE[tone];

  const trackStyle: ViewStyle = {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: value ? activeColor : '#EAE6E1',
    padding: 2,
    opacity: disabled ? 0.5 : 1,
  };

  const thumbStyle: ViewStyle = {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    ...SHADOWS.surface,
    transform: [{ translateX: value ? 22 : 0 }],
  };

  return (
    <TouchableOpacity
      style={trackStyle}
      onPress={() => !disabled && onToggle(!value)}
      activeOpacity={0.8}
      disabled={disabled}
    >
      <View style={thumbStyle} />
    </TouchableOpacity>
  );
};
