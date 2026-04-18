/**
 * ErrorBoundary — Global React error handler.
 * Catches render errors and displays a friendly fallback UI.
 */

import React from 'react';
import { View, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Wrapper } from './ui/Wrapper';
import { Typography } from './ui/Typography';
import { Button } from './ui/Button';
import { IconCircle } from './IconCircle';
import { COLORS } from '../lib/theme';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const errorBoxStyle: ViewStyle = {
  backgroundColor: '#FEF2F2',
  borderRadius: 12,
  padding: 12,
  width: '100%',
};

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (__DEV__) console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Wrapper flex={1} bg="#FAFBFC" align="center" justify="center" p={32}>
          <Wrapper mb={20}>
            <IconCircle size="lg" bg="#FEE2E2" radius={40}>
              <Ionicons name="warning-outline" size={48} color="#EF4444" />
            </IconCircle>
          </Wrapper>
          <Typography variant="h2" weight="black" align="center" mb={8}>
            Упс! Что-то пошло не так
          </Typography>
          <Typography variant="tiny" weight="semiBold" color="textMuted" align="center" mb={20} style={{ lineHeight: 22 }}>
            Произошла непредвиденная ошибка. Попробуйте перезапустить экран.
          </Typography>
          {__DEV__ && this.state.error && (
            <Wrapper mb={20} style={errorBoxStyle}>
              <Typography variant="caption" weight="semiBold" color="#EF4444" style={{ fontFamily: 'monospace' }}>
                {this.state.error.message}
              </Typography>
            </Wrapper>
          )}
          <Button
            variant="solid"
            tone="primary"
            size="lg"
            onPress={this.handleReset}
            leftIcon={<Ionicons name="refresh" size={18} color="white" />}
          >
            Попробовать снова
          </Button>
        </Wrapper>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
