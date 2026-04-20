/**
 * DateFilter — Horizontal date selector component.
 * Mirrors the web app's date navigation (chevron left/right + date display).
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

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
    <View style={styles.container}>
      <TouchableOpacity testID="prev-btn" style={styles.arrowBtn} onPress={() => changeDay(-1)}>
        <Ionicons name="chevron-back" size={20} color="#6B6B80" />
      </TouchableOpacity>

      <TouchableOpacity testID="today-btn" style={styles.dateSection} onPress={goToday}>
        <Ionicons name="calendar-outline" size={16} color="#059669" />
        <Text style={styles.dateText}>{formatted}</Text>
        {isToday && <Text style={styles.todayBadge}>Сегодня</Text>}
      </TouchableOpacity>

      <TouchableOpacity testID="next-btn" style={styles.arrowBtn} onPress={() => changeDay(1)}>
        <Ionicons name="chevron-forward" size={20} color="#6B6B80" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: 16,
  },
  arrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F0ECE8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A1A2E',
  },
  todayBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
});

export default DateFilter;
