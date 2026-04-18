import React from 'react';
import { TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS, RADIUS } from '../lib/theme';

interface BackButtonProps {
  onPress: () => void;
  testID?: string;
}

/**
 * BackButton — Circular navigation back button.
 * Self-contained visual styling. Place with Wrapper for layout.
 */
export const BackButton: React.FC<BackButtonProps> = ({ onPress, testID }) => {
  const style: ViewStyle = {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderCard,
    ...SHADOWS.surface,
  };

  return (
    <TouchableOpacity style={style} onPress={onPress} activeOpacity={0.8} testID={testID}>
      <Ionicons name="arrow-back" size={24} color={COLORS.foreground} />
    </TouchableOpacity>
  );
};
