import React from 'react';
import { TextInput, View, ViewStyle, TextInputProps } from 'react-native';
import { Typography } from './ui/Typography';
import { COLORS, RADIUS, FONTS } from '../lib/theme';

interface FormFieldProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: TextInputProps['keyboardType'];
  multiline?: boolean;
  secureTextEntry?: boolean;
  tone?: 'default' | 'blue' | 'purple' | 'green';
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
  editable?: boolean;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  onSubmitEditing?: () => void;
  testID?: string;
}

const TONE_BG: Record<string, string> = {
  default: '#F4F4F8',
  blue: '#F0F7FF',
  purple: '#F5F3FF',
  green: '#F0FCF9',
};

const TONE_BORDER: Record<string, string> = {
  default: '#E2E8F0',
  blue: '#D1E5FC',
  purple: '#EDE9FE',
  green: '#CCF0E6',
};

/**
 * FormField — Label + styled TextInput.
 * Replaces all inline label+input patterns across forms.
 */
export const FormField: React.FC<FormFieldProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline = false,
  secureTextEntry = false,
  tone = 'default',
  leftIcon,
  rightElement,
  editable = true,
  autoCapitalize,
  onSubmitEditing,
  testID,
}) => {
  const inputContainerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TONE_BG[tone],
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: TONE_BORDER[tone],
    ...(multiline ? { minHeight: 60, alignItems: 'flex-start' } : {}),
  };

  return (
    <View>
      {label && (
        <Typography
          variant="tiny"
          weight="extraBold"
          color="#8A8A9E"
          uppercase
          letterSpacing={0.5}
          mb={8}
        >
          {label}
        </Typography>
      )}
      <View style={inputContainerStyle}>
        {leftIcon && (
          <View style={{ paddingLeft: 16 }}>
            {leftIcon}
          </View>
        )}
        <TextInput
          style={{
            flex: 1,
            paddingVertical: 14,
            paddingHorizontal: leftIcon ? 12 : 16,
            fontSize: 14,
            fontFamily: FONTS.extraBold,
            color: COLORS.foreground,
            ...(multiline ? { textAlignVertical: 'top' as const } : {}),
          }}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          keyboardType={keyboardType}
          multiline={multiline}
          secureTextEntry={secureTextEntry}
          editable={editable}
          autoCapitalize={autoCapitalize}
          onSubmitEditing={onSubmitEditing}
          testID={testID}
        />
        {rightElement}
      </View>
    </View>
  );
};
