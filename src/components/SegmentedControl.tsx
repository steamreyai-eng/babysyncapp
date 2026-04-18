import React from 'react';
import { TouchableOpacity, View, ViewStyle } from 'react-native';
import { Typography } from './ui/Typography';
import { COLORS, SHADOWS, RADIUS } from '../lib/theme';

interface SegmentItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
}

interface SegmentedControlProps {
  items: SegmentItem[];
  selected: string;
  onChange: (key: string) => void;
  tone?: 'primary' | 'purple' | 'green' | 'neutral';
  size?: 'sm' | 'md';
}

const TONE_ACTIVE_BG: Record<string, string> = {
  primary: '#2563EB',
  purple: '#8B5CF6',
  green: '#059669',
  neutral: COLORS.card,
};

/**
 * SegmentedControl — Horizontal tab/segment picker.
 * Replaces all inline tab implementations across the app.
 */
export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  items,
  selected,
  onChange,
  tone = 'neutral',
  size = 'md',
}) => {
  const isNeutral = tone === 'neutral';
  const activeBg = TONE_ACTIVE_BG[tone];

  const containerStyle: ViewStyle = {
    flexDirection: 'row',
    backgroundColor: '#F4F4F8',
    borderRadius: RADIUS.xl,
    padding: 4,
  };

  const itemHeight = size === 'sm' ? 38 : 46;

  return (
    <View style={containerStyle}>
      {items.map((item) => {
        const active = selected === item.key;

        const itemStyle: ViewStyle = {
          flex: 1,
          height: itemHeight,
          borderRadius: RADIUS.lg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          backgroundColor: active ? activeBg : 'transparent',
          ...(active && isNeutral ? SHADOWS.surface : {}),
        };

        const textColor = active
          ? isNeutral ? COLORS.foreground : '#FFFFFF'
          : '#8A8A9E';

        return (
          <TouchableOpacity
            key={item.key}
            style={itemStyle}
            onPress={() => onChange(item.key)}
            activeOpacity={0.8}
          >
            {item.icon && React.cloneElement(item.icon as React.ReactElement<any>, {
              color: textColor,
              size: 16,
            })}
            <Typography variant="tiny" weight="extraBold" color={textColor}>
              {item.label}
            </Typography>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};
