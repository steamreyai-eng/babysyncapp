import React from 'react';
import { View, ViewStyle, TouchableOpacity } from 'react-native';
import { COLORS } from '../../lib/theme';

export interface WrapperProps {
  as?: any;
  children?: React.ReactNode;
  flex?: number;
  dir?: 'row' | 'col';
  justify?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around';
  align?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
  gap?: number;
  wrap?: 'wrap' | 'nowrap';
  p?: number; px?: number; py?: number; pt?: number; pb?: number; pl?: number; pr?: number;
  m?: number; mx?: number; my?: number; mt?: number; mb?: number; ml?: number; mr?: number;
  width?: number | string;
  height?: number | string;
  position?: 'absolute' | 'relative';
  top?: number; bottom?: number; left?: number; right?: number;
  zIndex?: number;
  bg?: keyof typeof COLORS | (string & {}); 
  testID?: string;
  pointerEvents?: 'box-none' | 'none' | 'box-only' | 'auto';
  radius?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'none' | string;
  overflow?: 'hidden' | 'visible' | 'scroll';
  [key: string]: any;
}

export const Wrapper = React.forwardRef<View, WrapperProps>(({
  as: Comp = View,
  children, flex, dir, justify, align, gap, wrap,
  p, px, py, pt, pb, pl, pr,
  m, mx, my, mt, mb, ml, mr,
  width, height, position, top, bottom, left, right, zIndex,
  bg, testID, pointerEvents, overflow, radius,
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
  if (overflow !== undefined) style.overflow = overflow;
  
  if (bg) {
    style.backgroundColor = (COLORS as any)[bg] || bg;
  }
  
  if (rest.style) {
    Object.assign(style, rest.style);
  }

  if (Comp === TouchableOpacity) {
    return (
      <TouchableOpacity ref={ref as any} style={style} testID={testID} {...rest}>
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

Wrapper.displayName = 'Wrapper';
