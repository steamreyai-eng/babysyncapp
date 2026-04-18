import React from 'react';
import { TouchableOpacity, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { COLORS, RADIUS } from '../../lib/theme';
import { Typography } from './Typography';
import { Wrapper } from './Wrapper';

export interface ButtonProps {
  variant?: 'solid' | 'outline' | 'ghost';
  tone?: 'primary' | 'danger' | 'success' | 'surface' | 'neutral';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'solid',
  tone = 'primary',
  size = 'lg',
  fullWidth = false,
  leftIcon,
  rightIcon,
  loading = false,
  disabled = false,
  onPress,
  children
}) => {
  const containerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.button,
  };

  let textColor = 'white';
  let typoVariant: 'caption' | 'body' | 'h4' = 'h4';

  // Size definition
  switch (size) {
    case 'sm':
      containerStyle.paddingVertical = 8;
      containerStyle.paddingHorizontal = 16;
      containerStyle.borderRadius = RADIUS.sm;
      typoVariant = 'caption';
      break;
    case 'md':
      containerStyle.paddingVertical = 12;
      containerStyle.paddingHorizontal = 20;
      typoVariant = 'body';
      break;
    case 'lg':
      containerStyle.paddingVertical = 16;
      containerStyle.paddingHorizontal = 24;
      containerStyle.borderRadius = RADIUS.md;
      typoVariant = 'h4';
      break;
    case 'xl':
      containerStyle.paddingVertical = 18;
      containerStyle.paddingHorizontal = 32;
      containerStyle.borderRadius = RADIUS.lg;
      typoVariant = 'h4';
      break;
  }

  if (fullWidth) {
    containerStyle.width = '100%';
  }

  // Tone definition
  let mainColor = COLORS.primary;
  switch (tone) {
    case 'danger': mainColor = COLORS.red; break;
    case 'success': mainColor = COLORS.green; break;
    case 'surface': mainColor = COLORS.card; break;
    case 'neutral': mainColor = COLORS.textMuted; break;
  }

  // Variant application
  if (variant === 'solid') {
    containerStyle.backgroundColor = mainColor;
    textColor = tone === 'surface' ? 'textPrimary' : 'white';
    if (tone === 'surface') {
      containerStyle.borderColor = COLORS.borderCard;
      containerStyle.borderWidth = 1;
    }
  } else if (variant === 'outline') {
    containerStyle.backgroundColor = 'transparent';
    containerStyle.borderWidth = 2;
    containerStyle.borderColor = mainColor;
    textColor = tone === 'surface' ? 'white' : tone;
    if (tone === 'surface') textColor = 'textPrimary';
  } else if (variant === 'ghost') {
    containerStyle.backgroundColor = 'transparent';
    textColor = tone === 'surface' ? 'white' : tone;
    if (tone === 'surface') textColor = 'textPrimary';
  }

  if (disabled) {
    containerStyle.opacity = 0.5;
  }

  const handlePress = () => {
    if (!disabled && !loading && onPress) {
      onPress();
    }
  };

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={handlePress}
      activeOpacity={0.8}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={(COLORS as any)[textColor] || textColor === 'white' ? '#fff' : mainColor} />
      ) : (
        <Wrapper dir="row" align="center" gap={8} justify="center">
          {leftIcon}
          <Typography variant={typoVariant} weight="black" color={textColor}>
            {children}
          </Typography>
          {rightIcon}
        </Wrapper>
      )}
    </TouchableOpacity>
  );
};
