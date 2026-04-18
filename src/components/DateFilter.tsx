/**
 * DateFilter — Horizontal date selector component.
 * Mirrors the web app's date navigation (chevron left/right + date display).
 */

import React from 'react';
import { TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Wrapper } from './ui/Wrapper';
import { Typography } from './ui/Typography';
import { Surface } from './ui/Surface';
import { StatusBadge } from './StatusBadge';
import { COLORS, SHADOWS, RADIUS } from '../lib/theme';

interface Props {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

const arrowBtnStyle: ViewStyle = {
  width: 36,
  height: 36,
  borderRadius: 10,
  backgroundColor: '#F0ECE8',
  alignItems: 'center',
  justifyContent: 'center',
};

const DateFilter = ({ selectedDate, onDateChange }: Props) => {
  const isToday =
    selectedDate.getDate() === new Date().getDate() &&
    selectedDate.getMonth() === new Date().getMonth() &&
    selectedDate.getFullYear() === new Date().getFullYear();

  const changeDay = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    onDateChange(d);
  };

  const goToday = () => onDateChange(new Date());

  const formatted = selectedDate.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
  });

  return (
    <Surface variant="elevated" radius="md" px={12} py={8} mb={16}>
      <Wrapper dir="row" align="center" justify="space-between">
        <TouchableOpacity testID="prev-btn" style={arrowBtnStyle} onPress={() => changeDay(-1)}>
          <Ionicons name="chevron-back" size={20} color="#6B6B80" />
        </TouchableOpacity>

        <TouchableOpacity testID="today-btn" onPress={goToday}>
          <Wrapper dir="row" align="center" gap={6}>
            <Ionicons name="calendar-outline" size={16} color="#059669" />
            <Typography variant="tiny" weight="extraBold">{formatted}</Typography>
            {isToday && <StatusBadge label="Сегодня" tone="success" />}
          </Wrapper>
        </TouchableOpacity>

        <TouchableOpacity testID="next-btn" style={arrowBtnStyle} onPress={() => changeDay(1)}>
          <Ionicons name="chevron-forward" size={20} color="#6B6B80" />
        </TouchableOpacity>
      </Wrapper>
    </Surface>
  );
};

export default DateFilter;
