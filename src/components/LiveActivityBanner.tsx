/**
 * LiveActivityBanner — In-app floating timer notification
 * Shows a persistent banner at the top of the screen when
 * Sleep or Walk timers are running, similar to iOS Live Activities.
 * 
 * Styled per tracker:
 * - Sleep: purple theme (#8B6FD4)
 * - Walk: green theme (#059669)
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, TouchableOpacity, Animated, Dimensions, Platform, ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTimerStore } from '../store/timerStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { database } from '../db';
import { Sleep } from '../db/models/Sleep';
import { Walk } from '../db/models/Walk';
import { useAuthStore } from '../store/authStore';
import { cancelSleepTimerNotification, cancelWalkTimerNotification } from '../lib/timerNotifications';

import { Wrapper } from './ui/Wrapper';
import { Typography } from './ui/Typography';
import { IconCircle } from './IconCircle';
import { COLORS, SHADOWS } from '../lib/theme';

interface BannerConfig {
  type: 'sleep' | 'walk';
  label: string;
  sublabel: string;
  icon: string;
  iconBg: string;
  accentColor: string;
  stopBg: string;
  startTime: number;
  route: string;
}

const SLEEP_CONFIG: Omit<BannerConfig, 'startTime'> = {
  type: 'sleep',
  label: 'Сон',
  sublabel: '– Сейчас',
  icon: 'moon',
  iconBg: 'rgba(139, 111, 212, 0.25)',
  accentColor: '#8B6FD4',
  stopBg: 'rgba(139, 111, 212, 0.2)',
  route: 'Sleep',
};

const WALK_CONFIG: Omit<BannerConfig, 'startTime'> = {
  type: 'walk',
  label: 'Прогулка',
  sublabel: '– Сейчас',
  icon: 'walk',
  iconBg: 'rgba(5, 150, 105, 0.25)',
  accentColor: '#059669',
  stopBg: 'rgba(5, 150, 105, 0.2)',
  route: 'Walk',
};

function formatTime(ms: number): string {
  const d = new Date(ms);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function formatElapsed(startTimeMs: number): string {
  const elapsed = Math.max(0, Math.floor((Date.now() - startTimeMs) / 1000));
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ── Single Banner Item ──
const BannerItem = ({
  config,
  onStop,
  onPress,
}: {
  config: BannerConfig;
  onStop: () => void;
  onPress: () => void;
}) => {
  const [elapsed, setElapsed] = useState(formatElapsed(config.startTime));
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    pulse.start();

    const interval = setInterval(() => {
      setElapsed(formatElapsed(config.startTime));
    }, 1000);

    return () => {
      clearInterval(interval);
      pulse.stop();
    };
  }, [config.startTime]);

  const startTimeStr = formatTime(config.startTime);

  const bannerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 22,
    paddingVertical: 10,
    paddingHorizontal: 10,
    shadowColor: config.accentColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: `${config.accentColor}20`,
  };

  const stopBtnStyle: ViewStyle = {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: config.stopBg,
    alignItems: 'center',
    justifyContent: 'center',
  };

  const stopIndicatorStyle: ViewStyle = {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: config.accentColor,
  };

  return (
    <Animated.View style={{ transform: [{ translateY: slideAnim }], marginBottom: 6 }}>
      <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={bannerStyle}>
        {/* Icon */}
        <Wrapper mr={12}>
          <IconCircle bg={config.iconBg}>
            <Ionicons name={config.icon as any} size={22} color={config.accentColor} />
          </IconCircle>
        </Wrapper>

        {/* Info */}
        <Wrapper flex={1}>
          <Wrapper dir="row" align="center" gap={6}>
            <Typography variant="body" weight="black">{config.label}</Typography>
            <Animated.View style={{
              width: 6, height: 6, borderRadius: 3,
              backgroundColor: config.accentColor, opacity: pulseAnim,
            }} />
          </Wrapper>
          <Typography variant="tiny" weight="bold" color="textMuted" mt={1}>
            {startTimeStr} {config.sublabel}
          </Typography>
        </Wrapper>

        {/* Timer Display */}
        <Typography variant="h4" weight="black" color={config.accentColor} style={{ marginRight: 10, minWidth: 52, textAlign: 'right' }}>
          {elapsed}
        </Typography>

        {/* Stop Button */}
        <TouchableOpacity onPress={onStop} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={stopBtnStyle}>
          <View style={stopIndicatorStyle} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ── Main Component ──
export default function LiveActivityBanner() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { sleepConfig, walkConfig, clearSleepTimer, clearWalkTimer } = useTimerStore();

  const sleepRunning = sleepConfig.isRunning && sleepConfig.startTime;
  const walkRunning = walkConfig.isRunning && walkConfig.startTime;

  if (!sleepRunning && !walkRunning) return null;

  const handleSleepStop = async () => {
    const { startTime, location, quality } = sleepConfig;
    if (startTime) {
      const seconds = Math.floor((Date.now() - startTime) / 1000);
      if (seconds > 0) {
         try {
           await database.write(async () => {
             await database.get<Sleep>('sleeps').create(sleep => {
               sleep.duration_seconds = seconds;
               sleep.location = location || 'crib';
               sleep.quality = quality || 0;
               sleep.start_time = startTime;
               sleep.end_time = Date.now();
               sleep.created_at = startTime;
               sleep.recorded_by = useAuthStore.getState().activeParent || 'mom';
             });
           });
         } catch (error) {
           if (__DEV__) console.warn("Error saving sleep from banner", error);
         }
      }
    }
    clearSleepTimer();
    cancelSleepTimerNotification();
  };

  const handleWalkStop = async () => {
    const { startTime, location, weather, notes } = walkConfig;
    if (startTime) {
      const seconds = Math.floor((Date.now() - startTime) / 1000);
      if (seconds > 0) {
         try {
           await database.write(async () => {
             await database.get<Walk>('walks').create(walk => {
               walk.duration_seconds = seconds;
               walk.location = location || 'park';
               walk.weather = weather || 'sunny';
               walk.notes = (notes || '').trim() || undefined;
               walk.created_at = startTime;
               walk.recorded_by = useAuthStore.getState().activeParent || 'mom';
             });
           });
         } catch (error) {
           if (__DEV__) console.warn("Error saving walk from banner", error);
         }
      }
    }
    clearWalkTimer();
    cancelWalkTimerNotification();
  };

  const handleSleepPress = () => {
    try { navigation.navigate('Tracker', { screen: 'Sleep' }); } catch (e) {}
  };

  const handleWalkPress = () => {
    try { navigation.navigate('Tracker', { screen: 'Walk' }); } catch (e) {}
  };

  return (
    <Wrapper
      pointerEvents="box-none"
      position="absolute"
      top={0}
      left={0}
      right={0}
      zIndex={9999}
      pt={Math.max(insets.top, 16) + 4}
      px={12}
    >
      {sleepRunning && (
        <BannerItem
          config={{ ...SLEEP_CONFIG, startTime: sleepConfig.startTime! }}
          onStop={handleSleepStop}
          onPress={handleSleepPress}
        />
      )}
      {walkRunning && (
        <BannerItem
          config={{ ...WALK_CONFIG, startTime: walkConfig.startTime! }}
          onStop={handleWalkStop}
          onPress={handleWalkPress}
        />
      )}
    </Wrapper>
  );
}
