import React from 'react';
import { TouchableOpacity, View, ViewStyle } from 'react-native';
import { Typography } from './ui/Typography';
import { RADIUS } from '../lib/theme';

interface ChipItem {
  key: string;
  label: string;
}

interface ChipGroupProps {
  items: ChipItem[];
  selected: string;
  onChange: (key: string) => void;
  tone?: 'primary' | 'purple' | 'green' | 'teal';
}

const TONE_MAP: Record<string, { activeBg: string; activeText: string }> = {
  primary: { activeBg: '#4E8FD4', activeText: '#FFFFFF' },
  purple: { activeBg: '#8B6FD4', activeText: '#FFFFFF' },
  green: { activeBg: '#3DBFAA', activeText: '#FFFFFF' },
  teal: { activeBg: '#3DBFAA', activeText: '#FFFFFF' },
};

/**
 * ChipGroup — Horizontally-flowing group of selectable chips.
 * Replaces interval selectors in NotificationSettings and option pickers.
 */
export const ChipGroup: React.FC<ChipGroupProps> = ({
  items,
  selected,
  onChange,
  tone = 'primary',
}) => {
  const { activeBg, activeText } = TONE_MAP[tone];

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {items.map((item) => {
        const active = selected === item.key;

        const chipStyle: ViewStyle = {
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: RADIUS.sm,
          borderWidth: 1,
          backgroundColor: active ? activeBg : '#FFFFFF',
          borderColor: active ? activeBg : '#F0ECE8',
        };

        return (
          <TouchableOpacity
            key={item.key}
            style={chipStyle}
            onPress={() => onChange(item.key)}
            activeOpacity={0.8}
          >
            <Typography
              variant="tiny"
              weight="extraBold"
              color={active ? activeText : '#8A8A9E'}
            >
              {item.label}
            </Typography>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};
