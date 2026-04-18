
/**
 * DateTimePickerModal — Cross-platform date/time picker.
 * 
 * On iOS, wraps the @react-native-community/datetimepicker in a Modal 
 * with "Cancel" + "Done" buttons so the spinner is always visible and
 * properly positioned. On Android, uses the native dialog (`display="default"`).
 */

import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Modal, Platform, ViewStyle } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { Wrapper } from './ui/Wrapper';
import { Typography } from './ui/Typography';
import { COLORS, RADIUS } from '../lib/theme';

interface Props {
  visible: boolean;
  value: Date;
  mode?: 'date' | 'time' | 'datetime';
  is24Hour?: boolean;
  onChange: (date: Date | undefined) => void;
  onClose: () => void;
}

const sheetStyle: ViewStyle = {
  backgroundColor: COLORS.card,
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  paddingBottom: 34,
  overflow: 'hidden',
};

const headerStyle: ViewStyle = {
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
};

const headerBtnStyle: ViewStyle = {
  paddingHorizontal: 8,
  paddingVertical: 4,
};

const DateTimePickerModal: React.FC<Props> = ({
  visible,
  value,
  mode = 'time',
  is24Hour = true,
  onChange,
  onClose,
}) => {
  const [tempDate, setTempDate] = useState(value);

  // Sync tempDate when value prop changes or modal opens
  useEffect(() => {
    if (visible) {
      setTempDate(value);
    }
  }, [visible, value]);

  if (!visible) return null;

  // Android: use native dialog picker
  if (Platform.OS === 'android') {
    return (
      <DateTimePicker
        value={value}
        mode={mode}
        is24Hour={is24Hour}
        display="default"
        onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
          onClose();
          if (event.type === 'set' && selectedDate) {
            onChange(selectedDate);
          }
        }}
      />
    );
  }

  const titleMap = {
    time: 'Выберите время',
    date: 'Выберите дату',
    datetime: 'Дата и время',
  };

  // iOS: wrap in a bottom-sheet modal with spinner
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' }}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={sheetStyle} onStartShouldSetResponder={() => true}>
          {/* Header with Cancel / Done */}
          <View style={headerStyle}>
            <TouchableOpacity onPress={onClose} style={headerBtnStyle}>
              <Typography variant="body" weight="bold" color="#8A8A9E">Отмена</Typography>
            </TouchableOpacity>
            <Typography variant="body" weight="extraBold">{titleMap[mode]}</Typography>
            <TouchableOpacity
              onPress={() => { onChange(tempDate); onClose(); }}
              style={headerBtnStyle}
            >
              <Typography variant="body" weight="extraBold" color="#2563EB">Готово</Typography>
            </TouchableOpacity>
          </View>

          <DateTimePicker
            value={tempDate}
            mode={mode}
            is24Hour={is24Hour}
            display="spinner"
            textColor={COLORS.foreground}
            onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
              if (selectedDate) {
                setTempDate(selectedDate);
              }
            }}
            style={{ height: 200, width: '100%' }}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

export default DateTimePickerModal;
