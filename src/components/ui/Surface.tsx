import React from 'react';
import { View, ViewStyle, TouchableOpacity } from 'react-native';
import { COLORS, SHADOWS, RADIUS } from '../../lib/theme';
import { WrapperProps } from './Wrapper';

export interface SurfaceProps extends WrapperProps {
  variant?: 'elevated' | 'flat' | 'outlined';
  tone?: 'surface' | 'primary' | 'transparent' | 'secondary' | 'danger' | 'success';
  radius?: keyof typeof RADIUS | 'none';
  onPress?: () => void;
  activeOpacity?: number;
  children?: React.ReactNode;
  [key: string]: any;
}

export const Surface = React.forwardRef<View, SurfaceProps>(({
  as: Comp = View,
  variant = 'flat',
  tone = 'surface',
  radius = 'md',
  onPress,
  activeOpacity = 0.8,
  flex, dir, justify, align, gap, wrap,
  p, px, py, pt, pb, pl, pr,
  m, mx, my, mt, mb, ml, mr,
  width, height, position, top, bottom, left, right, zIndex, overflow,
  bg, testID, pointerEvents,
  children,
  ...rest
}, ref) => {
  const style: ViewStyle = {};

  if (flex !== undefined) style.flex = flex;
  if (dir === 'row') style.flexDirection = 'row';
  else if (dir === 'col') style.flexDirection = 'column';
  
  if (justify) style.justifyContent = justify;
  if (align) style.alignItems = align;
  if (gap !== undefined) style.gap = gap;
  if (wrap) style.flexWrap = wrap;
  
  if (p !== undefined) style.padding = p;
  if (px !== undefined) style.paddingHorizontal = px;
  if (py !== undefined) style.paddingVertical = py;
  if (pt !== undefined) style.paddingTop = pt;
  if (pb !== undefined) style.paddingBottom = pb;
  if (pl !== undefined) style.paddingLeft = pl;
  if (pr !== undefined) style.paddingRight = pr;

  if (m !== undefined) style.margin = m;
  if (mx !== undefined) style.marginHorizontal = mx;
  if (my !== undefined) style.marginVertical = my;
  if (mt !== undefined) style.marginTop = mt;
  if (mb !== undefined) style.marginBottom = mb;
  if (ml !== undefined) style.marginLeft = ml;
  if (mr !== undefined) style.marginRight = mr;

  if (width !== undefined) style.width = width;
  if (height !== undefined) style.height = height;

  if (position) style.position = position;
  if (top !== undefined) style.top = top;
  if (bottom !== undefined) style.bottom = bottom;
  if (left !== undefined) style.left = left;
  if (right !== undefined) style.right = right;
  
  if (zIndex !== undefined) style.zIndex = zIndex;
  if (overflow) style.overflow = overflow;

  if (radius !== 'none') {
    style.borderRadius = (RADIUS as any)[radius as any] || RADIUS.md;
  }
  
  if (bg) {
    style.backgroundColor = (COLORS as any)[bg] || bg;
  }

  switch (tone) {
    case 'surface': style.backgroundColor = COLORS.card; break;
    case 'primary': style.backgroundColor = COLORS.primary; break;
    case 'secondary': style.backgroundColor = COLORS.secondary; break;
    case 'danger': style.backgroundColor = COLORS.red; break;
    case 'success': style.backgroundColor = COLORS.green; break;
    case 'transparent': style.backgroundColor = 'transparent'; break;
  }

  if (variant === 'elevated') {
    Object.assign(style, SHADOWS.surface);
  } else if (variant === 'outlined') {
    style.borderWidth = 1;
    style.borderColor = COLORS.borderCard;
  }
  
  if (rest.style) {
     Object.assign(style, rest.style);
  }

  if (Comp === TouchableOpacity || onPress) {
    return (
      <TouchableOpacity 
        ref={ref as any}
        style={style} 
        onPress={onPress} 
        activeOpacity={activeOpacity}
        testID={testID}
        {...rest}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <Comp ref={ref} style={style} testID={testID} pointerEvents={pointerEvents} {...rest}>
      {children}
    </Comp>
  );
});

Surface.displayName = 'Surface';
