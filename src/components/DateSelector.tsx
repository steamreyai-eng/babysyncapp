import React from 'react';
import { TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Wrapper } from './ui/Wrapper';
import { Typography } from './ui/Typography';
import { COLORS, SHADOWS, RADIUS } from '../lib/theme';

interface DateSelectorProps {
  value: Date;
  onChange: (date: Date) => void;
  tone?: 'default' | 'sleep' | 'diaper' | 'feeding';
}

const TONE_COLORS = {
  default: '#059669',
  sleep: '#8B5CF6',
  diaper: '#059669',
  feeding: '#2563EB',
};

/**
 * DateSelector — Horizontal date navigation with chevrons.
 * Replaces all inline date-selector blocks across tracker screens.
 */
export const DateSelector: React.FC<DateSelectorProps> = ({
  value,
  onChange,
  tone = 'default',
}) => {
  const isToday =
    value.getDate() === new Date().getDate() &&
    value.getMonth() === new Date().getMonth() &&
    value.getFullYear() === new Date().getFullYear();

  const changeDay = (delta: number) => {
    const d = new Date(value);
    d.setDate(d.getDate() + delta);
    onChange(d);
  };

  const formatted = value.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
  });

  const accentColor = TONE_COLORS[tone];

  const containerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderCard,
    ...SHADOWS.surface,
  };

  const arrowStyle: ViewStyle = {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    backgroundColor: '#F4F4F8',
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <Wrapper>
      <TouchableOpacity style={containerStyle} activeOpacity={1}>
        <TouchableOpacity style={arrowStyle} onPress={() => changeDay(-1)}>
          <Ionicons name="chevron-back" size={20} color="#8A8A9E" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onChange(new Date())}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
        >
          <Ionicons name="calendar" size={18} color={accentColor} />
          <Typography variant="body" weight="extraBold">{formatted}</Typography>
          {isToday && (
            <Typography variant="tiny" weight="extraBold" color={accentColor}>
              Сегодня
            </Typography>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={arrowStyle} onPress={() => changeDay(1)}>
          <Ionicons name="chevron-forward" size={20} color="#8A8A9E" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Wrapper>
  );
};

export default DateSelector;
