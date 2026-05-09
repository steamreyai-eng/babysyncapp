
/**
 * DateTimePickerModal — Cross-platform date/time picker.
 * 
 * On iOS, wraps the @react-native-community/datetimepicker in a Modal 
 * with "Cancel" + "Done" buttons so the spinner is always visible and
 * properly positioned. On Android, uses the native dialog (`display="default"`).
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, Platform, StyleSheet } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

interface Props {
  visible: boolean;
  value: Date;
  mode?: 'date' | 'time' | 'datetime';
  is24Hour?: boolean;
  onChange: (date: Date | undefined) => void;
  onClose: () => void;
}

const DateTimePickerModal: React.FC<Props> = ({
  visible,
  value,
  mode = 'time',
  is24Hour = true,
  onChange,
  onClose,
}) => {
  const [tempDate, setTempDate] = useState(value);
  const [androidStep, setAndroidStep] = useState<'date' | 'time'>('date');

  const mergeByMode = (base: Date, selected: Date, pickerMode: 'date' | 'time' | 'datetime') => {
    const next = new Date(base);

    if (pickerMode === 'date') {
      next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      return next;
    }

    if (pickerMode === 'time') {
      next.setHours(selected.getHours(), selected.getMinutes(), selected.getSeconds(), selected.getMilliseconds());
      return next;
    }

    return selected;
  };

  // Sync tempDate when value prop changes or modal opens
  useEffect(() => {
    if (visible) {
      setTempDate(value);
      setAndroidStep('date');
    }
  }, [visible, value]);

  if (!visible) return null;

  // Android: native picker does not support datetime, so run date then time.
  if (Platform.OS === 'android') {
    const nativeMode = mode === 'datetime' ? androidStep : mode;

    return (
      <DateTimePicker
        key={nativeMode}
        value={mode === 'datetime' ? tempDate : value}
        mode={nativeMode}
        is24Hour={is24Hour}
        display="default"
        onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
          if (event.type !== 'set' || !selectedDate) {
            onClose();
            return;
          }

          if (mode === 'datetime' && androidStep === 'date') {
            setTempDate(mergeByMode(tempDate, selectedDate, 'date'));
            setAndroidStep('time');
            return;
          }

          const base = mode === 'datetime' ? tempDate : value;
          onChange(mergeByMode(base, selectedDate, nativeMode));
          onClose();
        }}
      />
    );
  }

  // iOS: wrap in a bottom-sheet modal with spinner
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={() => {
          onClose();
        }}
      >
        <View style={styles.sheet} onStartShouldSetResponder={() => true}>
          {/* Header with Cancel / Done */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => {
                onClose();
              }}
              style={styles.headerBtn}
            >
              <Text style={styles.cancelText}>Отмена</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {mode === 'time' ? 'Выберите время' : mode === 'date' ? 'Выберите дату' : 'Дата и время'}
            </Text>
            <TouchableOpacity
              onPress={() => {
                onChange(tempDate);
                onClose();
              }}
              style={styles.headerBtn}
            >
              <Text style={styles.doneText}>Готово</Text>
            </TouchableOpacity>
          </View>

          <DateTimePicker
            value={tempDate}
            mode={mode}
            is24Hour={is24Hour}
            display="spinner"
            textColor="#1A1A2E"
            onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
              if (selectedDate) {
                setTempDate(mergeByMode(tempDate, selectedDate, mode));
              }
            }}
            style={{ height: 200, width: '100%' }}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  headerBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  headerTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 16,
    color: '#1A1A2E',
  },
  cancelText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 15,
    color: '#8A8A9E',
  },
  doneText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 15,
    color: '#2563EB',
  },
});

export default DateTimePickerModal;
