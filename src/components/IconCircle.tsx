import React from 'react';
import { View, ViewStyle } from 'react-native';

type IconCircleSize = 'xs' | 'sm' | 'md' | 'lg';

interface IconCircleProps {
  children: React.ReactNode;
  size?: IconCircleSize;
  bg?: string;
  radius?: number;
}

const SIZE_MAP: Record<IconCircleSize, number> = {
  xs: 28,
  sm: 36,
  md: 44,
  lg: 52,
};

const RADIUS_MAP: Record<IconCircleSize, number> = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 20,
};

/**
 * IconCircle — Icon inside a rounded colored container.
 * Encapsulates the ubiquitous "icon in circle" pattern.
 */
export const IconCircle: React.FC<IconCircleProps> = ({
  children,
  size = 'md',
  bg = '#F4F4F8',
  radius,
}) => {
  const dim = SIZE_MAP[size];
  const r = radius ?? RADIUS_MAP[size];

  const style: ViewStyle = {
    width: dim,
    height: dim,
    borderRadius: r,
    backgroundColor: bg,
    alignItems: 'center',
    justifyContent: 'center',
  };

  return <View style={style}>{children}</View>;
};
