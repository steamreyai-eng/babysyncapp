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
  View, Text, TouchableOpacity, Animated, Dimensions, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTimerStore } from '../store/timerStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { cancelSleepTimerNotification, cancelWalkTimerNotification } from '../lib/timerNotifications';
import { pushNow } from '../db/sync';
import { saveSleepInterval, saveWalkInterval } from '../lib/recordMutations';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface BannerConfig {
  type: 'sleep' | 'walk';
  label: string;
  sublabel: string;
  icon: string;
  iconBg: string;
  gradientStart: string;
  gradientEnd: string;
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
  gradientStart: '#8B6FD4',
  gradientEnd: '#7C5CBF',
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
  gradientStart: '#059669',
  gradientEnd: '#047857',
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
    // Slide in
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();

    // Pulse animation for the dot
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    pulse.start();

    // Update elapsed time every second
    const interval = setInterval(() => {
      setElapsed(formatElapsed(config.startTime));
    }, 1000);

    return () => {
      clearInterval(interval);
      pulse.stop();
    };
  }, [config.startTime]);

  const startTimeStr = formatTime(config.startTime);

  return (
    <Animated.View
      style={{
        transform: [{ translateY: slideAnim }],
        marginBottom: 6,
      }}
    >
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#FFFFFF',
          borderRadius: 22,
          paddingVertical: 10,
          paddingLeft: 10,
          paddingRight: 10,
          shadowColor: config.accentColor,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.25,
          shadowRadius: 20,
          elevation: 8,
          borderWidth: 1,
          borderColor: `${config.accentColor}20`,
        }}
      >
        {/* Icon */}
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: config.iconBg,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}
        >
          <Ionicons name={config.icon as any} size={22} color={config.accentColor} />
        </View>

        {/* Info */}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text
              style={{
                fontFamily: 'Nunito_900Black',
                fontSize: 15,
                color: '#1A1A2E',
              }}
            >
              {config.label}
            </Text>
            {/* Pulsing dot */}
            <Animated.View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: config.accentColor,
                opacity: pulseAnim,
              }}
            />
          </View>
          <Text
            style={{
              fontFamily: 'Nunito_700Bold',
              fontSize: 12,
              color: '#8A8A9E',
              marginTop: 1,
            }}
          >
            {startTimeStr} {config.sublabel}
          </Text>
        </View>

        {/* Timer Display */}
        <Text
          style={{
            fontFamily: 'Nunito_900Black',
            fontSize: 18,
            color: config.accentColor,
            marginRight: 10,
            minWidth: 52,
            textAlign: 'right',
          }}
        >
          {elapsed}
        </Text>

        {/* Stop Button */}
        <TouchableOpacity
          onPress={onStop}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            backgroundColor: config.stopBg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View
            style={{
              width: 12,
              height: 12,
              borderRadius: 2,
              backgroundColor: config.accentColor,
            }}
          />
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
           await saveSleepInterval({
             startMs: startTime,
             endMs: Date.now(),
             location: location || 'crib',
             quality: quality || 0,
             recordedBy: useAuthStore.getState().activeParent || 'mom',
           });
         } catch (error) {
           if (__DEV__) console.warn("Error saving sleep from banner", error);
         }
      }
    }
    clearSleepTimer();
    cancelSleepTimerNotification();
    pushNow();
  };

  const handleWalkStop = async () => {
    const { startTime, location, weather, notes } = walkConfig;
    if (startTime) {
      const seconds = Math.floor((Date.now() - startTime) / 1000);
      if (seconds > 0) {
         try {
           await saveWalkInterval({
             startMs: startTime,
             endMs: Date.now(),
             location: location || 'park',
             weather: weather || 'sunny',
             notes,
             recordedBy: useAuthStore.getState().activeParent || 'mom',
           });
         } catch (error) {
           if (__DEV__) console.warn("Error saving walk from banner", error);
         }
      }
    }
    clearWalkTimer();
    cancelWalkTimerNotification();
    pushNow();
  };

  const handleSleepPress = () => {
    try {
      navigation.navigate('Tracker', { screen: 'Sleep' });
    } catch (e) {
      // Navigation may not be ready
    }
  };

  const handleWalkPress = () => {
    try {
      navigation.navigate('Tracker', { screen: 'Walk' });
    } catch (e) {
      // Navigation may not be ready
    }
  };

  return (
    <View
      pointerEvents="box-none"
      style={{
        zIndex: 20,
        elevation: 20,
        backgroundColor: '#FAFBFC',
        paddingTop: Math.max(insets.top, 16) + 4,
        paddingHorizontal: 12,
        paddingBottom: 6,
      }}
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
    </View>
  );
}
