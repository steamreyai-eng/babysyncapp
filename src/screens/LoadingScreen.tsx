import React from 'react';
import { ActivityIndicator } from 'react-native';
import { Wrapper } from '../components/ui/Wrapper';
import { Typography } from '../components/ui/Typography';
import { COLORS } from '../lib/theme';

export default function LoadingScreen() {
  return (
    <Wrapper flex={1} justify="center" align="center" bg="#EFF6FF">
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Wrapper mt={16}>
        <Typography color="#1E40AF" weight="bold">
          Синхронизация...
        </Typography>
      </Wrapper>
    </Wrapper>
  );
}
