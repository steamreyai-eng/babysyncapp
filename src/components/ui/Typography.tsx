import React from 'react';
import { Text, TextStyle, TextProps } from 'react-native';
import { COLORS } from '../../lib/theme';

export interface TypographyProps extends TextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'tiny' | 'caption' | 'h4';
  weight?: 'regular' | 'medium' | 'semiBold' | 'bold' | 'extraBold' | 'black';
  color?: keyof typeof COLORS | (string & {});
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
  uppercase?: boolean;
  mb?: number;
  mt?: number;
  px?: number;
  letterSpacing?: number;
  children: React.ReactNode;
  [key: string]: any;
}

const FONTS = {
  regular: 'Nunito_400Regular',
  medium: 'Nunito_500Medium', semiBold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  extraBold: 'Nunito_800ExtraBold',
  black: 'Nunito_900Black',
};

const SIZES = {
  h1: 28,
  h2: 24,
  h3: 20,
  body: 16,
  tiny: 13, caption: 11, h4: 18,
};

export const Typography: React.FC<TypographyProps> = ({
  variant = 'body',
  weight: customWeight,
  color = 'textPrimary',
  align,
  uppercase,
  mb,
  mt,
  px,
  letterSpacing,
  style: overrideStyle,
  children,
  ...props
}) => {
  let defaultWeight: keyof typeof FONTS = 'regular';
  if (variant === 'h1' || variant === 'h2' || variant === 'h3') defaultWeight = 'black';

  const weight = customWeight || defaultWeight;
  const fontFamily = FONTS[weight];
  const fontSize = SIZES[variant];
  
  const textColor = (COLORS as any)[color] || color;

  const style: TextStyle = {
    fontFamily,
    fontSize,
    color: textColor,
  };

  if (align) style.textAlign = align;
  if (uppercase) style.textTransform = 'uppercase';
  if (mb !== undefined) style.marginBottom = mb;
  if (mt !== undefined) style.marginTop = mt;
  if (px !== undefined) style.paddingHorizontal = px;
  if (letterSpacing !== undefined) style.letterSpacing = letterSpacing;

  return (
    <Text style={[style, overrideStyle]} {...props}>
      {children}
    </Text>
  );
};
