import React from 'react';
import { View, ViewStyle } from 'react-native';
import { Wrapper } from './ui/Wrapper';
import { Typography } from './ui/Typography';
import { RADIUS } from '../lib/theme';

interface ProgressBarProps {
  value: number;
  max: number;
  tone?: 'success' | 'warning' | 'danger' | 'purple' | 'primary';
  showLabel?: boolean;
  height?: number;
}

const TONE_COLORS: Record<string, string> = {
  success: '#10B981',
  warning: '#F97316',
  danger: '#EF4444',
  purple: '#8B5CF6',
  primary: '#2563EB',
};

/**
 * ProgressBar — Horizontal progress bar with optional label.
 * Replaces inline progress bar patterns in Diaper stats, Routine progress, etc.
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max,
  tone = 'success',
  showLabel = false,
  height = 6,
}) => {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100);
  const color = TONE_COLORS[tone];

  const trackStyle: ViewStyle = {
    height,
    borderRadius: height / 2,
    backgroundColor: 'rgba(138,138,158,0.1)',
    overflow: 'hidden',
  };

  const fillStyle: ViewStyle = {
    height: '100%',
    width: `${pct}%`,
    backgroundColor: color,
    borderRadius: height / 2,
  };

  return (
    <View>
      <View style={trackStyle}>
        <View style={fillStyle} />
      </View>
      {showLabel && (
        <Wrapper dir="row" justify="space-between" mt={4}>
          <Typography variant="tiny" weight="bold" color="textMuted">{value}</Typography>
          <Typography variant="tiny" weight="bold" color="textMuted">{max}</Typography>
        </Wrapper>
      )}
    </View>
  );
};
