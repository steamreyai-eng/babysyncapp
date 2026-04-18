import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Wrapper } from './ui/Wrapper';
import { Typography } from './ui/Typography';
import { BackButton } from './BackButton';

interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
}

/**
 * ScreenHeader — Back button + screen title.
 * Handles safe area insets internally.
 */
export const ScreenHeader: React.FC<ScreenHeaderProps> = ({ title, onBack }) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const handleBack = onBack || (() => navigation.goBack());

  return (
    <Wrapper pt={Math.max(insets.top, 16)} px={16} pb={16} dir="row" align="center" gap={16}>
      <BackButton onPress={handleBack} />
      <Typography variant="h2">{title}</Typography>
    </Wrapper>
  );
};
