import 'react-native-url-polyfill/auto';
import 'react-native-gesture-handler';
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Sentry from '@sentry/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar, View, Platform, AppState } from 'react-native';
import { Home, Activity, Clock, LineChart, CalendarDays, Settings } from 'lucide-react-native';
import { DatabaseProvider } from '@nozbe/watermelondb/DatabaseProvider';
import { database } from './src/db';
import { Q } from '@nozbe/watermelondb';
import { supabase } from './src/lib/supabase';
import { useAuthStore } from './src/store/authStore';

import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import AIBubble from './src/components/AIBubble';
import FAB from './src/components/FAB';
import LiveActivityBanner from './src/components/LiveActivityBanner';
import { setupTimerNotifications, restoreTimerNotifications, handleBackgroundStopSleep, handleBackgroundStopWalk, handleBackgroundStopFeedingLeft, handleBackgroundStopFeedingRight } from './src/lib/timerNotifications';
import { initReminderNotifications, startNotifPoller, stopNotifPoller } from './src/lib/notifications';
import notifee, { EventType } from '@notifee/react-native';
import { useTimerStore } from './src/store/timerStore';

// Expo Fonts — Nunito + Plus Jakarta Sans (matching web)
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
} from '@expo-google-fonts/nunito';
import {
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';

import HomeScreen from './src/screens/HomeScreen';
import TrackerScreen from './src/screens/TrackerScreen';
import SleepScreen from './src/screens/SleepScreen';
import WalkScreen from './src/screens/WalkScreen';
import FeedingScreen from './src/screens/FeedingScreen';
import DiaperScreen from './src/screens/DiaperScreen';
import HealthScreen from './src/screens/HealthScreen';
import DoctorScreen from './src/screens/DoctorScreen';
import GrowthScreen from './src/screens/GrowthScreen';
import RoutineScreen from './src/screens/RoutineScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import ShiftsScreen from './src/screens/ShiftsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AuthScreen from './src/screens/AuthScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import ErrorBoundary from './src/components/ErrorBoundary';

import * as Linking from 'expo-linking';

// Keep splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const Tab = createBottomTabNavigator();
const RootStack = createNativeStackNavigator();

// ── Navigation colors (matching web BottomNav.tsx) ──
const ACTIVE_COLOR = '#2563EB';
const IDLE_COLOR = '#64748B';

// Sentry Initialization with security hardening
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
  enableNativeFramesTracking: !__DEV__,
  tracesSampleRate: 1.0,
  beforeSend(event) {
    // Strip PII from Sentry events
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
      delete event.user.username;
    }
    return event;
  },
});

export default Sentry.wrap(function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const {
    session,
    loading,
    onboardingNeeded,
    setSession,
    setLoading,
    setBaby,
    setOnboardingNeeded,
  } = useAuthStore();

  useEffect(() => {
    async function prepare() {
      try {
        await setupTimerNotifications();
        await initReminderNotifications();
        const { sleepConfig, walkConfig, feedingConfig } = useTimerStore.getState();
        await restoreTimerNotifications(
           sleepConfig.isRunning, sleepConfig.startTime,
           walkConfig.isRunning, walkConfig.startTime,
           feedingConfig
        );
        
        await Font.loadAsync({
          Nunito_400Regular,
          Nunito_600SemiBold,
          Nunito_700Bold,
          Nunito_800ExtraBold,
          Nunito_900Black,
          PlusJakartaSans_600SemiBold,
          PlusJakartaSans_700Bold,
          PlusJakartaSans_800ExtraBold,
        });
      } catch (e) {
        console.warn('Error loading fonts', e);
      } finally {
        setAppIsReady(true);
      }
    }
    prepare();
  }, []);

  const BABY_PROFILE_CACHE_KEY = 'babysync_baby_profile';

  const checkProfile = async (currentSession: any) => {
    if (!currentSession) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('baby_profile')
        .select('*')
        .limit(1)
        .single();

      if (error || !data) {
        // Network error vs. genuinely no profile:
        // PGRST116 = "no rows" → real empty result → onboarding needed
        // Any other error (network, timeout, etc.) → try cached profile
        const isNoRows = error?.code === 'PGRST116';
        if (isNoRows) {
          setOnboardingNeeded(true);
          setBaby(null);
          await SecureStore.deleteItemAsync(BABY_PROFILE_CACHE_KEY);
        } else {
          // Network / server error → fall back to SecureStore cache
          const cached = await SecureStore.getItemAsync(BABY_PROFILE_CACHE_KEY);
          if (cached) {
            const cachedBaby = JSON.parse(cached);
            setOnboardingNeeded(false);
            setBaby(cachedBaby);
            if (__DEV__) console.log('[offline] Using cached baby profile');
          } else {
            // No cache and no network — show onboarding (first use)
            setOnboardingNeeded(true);
            setBaby(null);
          }
        }
      } else {
        setOnboardingNeeded(false);
        setBaby(data);
        // Persist to cache for offline use
        await SecureStore.setItemAsync(BABY_PROFILE_CACHE_KEY, JSON.stringify(data));
      }
    } catch (e) {
      if (__DEV__) console.warn('Error fetching profile', e);
      // Total failure (e.g. network down before request) → fall back to cache
      try {
        const cached = await SecureStore.getItemAsync(BABY_PROFILE_CACHE_KEY);
        if (cached) {
          const cachedBaby = JSON.parse(cached);
          setOnboardingNeeded(false);
          setBaby(cachedBaby);
          if (__DEV__) console.log('[offline] Using cached baby profile (catch)');
        }
      } catch (_cacheErr) {
        // Nothing we can do
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Auto-detect active parent from today's shift schedule (WatermelonDB) ──
  const checkTodayShift = async () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const shifts = await database.get('shifts').query(
        Q.where('shift_date', todayStr),
        Q.where('assigned_to', Q.notEq(null)),
      ).fetch();
      if (shifts.length > 0) {
        const assigned = (shifts[0] as any).assigned_to;
        if (assigned === 'mom' || assigned === 'dad') {
          useAuthStore.getState().setActiveParent(assigned);
        }
      }
    } catch (e) {
      // Silently fail — will retry on next sync
    }
  };


  // Mutable ref for cached event data — survives re-renders
  const lastEventsCacheRef = useRef({
    lastFeedingMs: null as number | null,
    lastDiaperMs: null as number | null,
    lastSleepEndMs: null as number | null,
    ageMo: 4,
  });

  const refreshLastEventsCache = useCallback(async () => {
    try {
      const baby = useAuthStore.getState().baby;
      const ageMo = baby?.birthdate
        ? (Date.now() - new Date(baby.birthdate).getTime()) / (30.44 * 24 * 3600 * 1000)
        : 4;

      const [latestFeedings, latestDiapers, latestSleeps] = await Promise.all([
        database.get('feedings').query(Q.sortBy('created_at', Q.desc), Q.take(1)).fetch(),
        database.get('diapers').query(Q.sortBy('created_at', Q.desc), Q.take(1)).fetch(),
        database.get('sleeps').query(Q.sortBy('created_at', Q.desc), Q.take(1)).fetch(),
      ]);

      const lastFeeding = latestFeedings[0] as any;
      const lastDiaper = latestDiapers[0] as any;
      const lastSleep = latestSleeps[0] as any;

      lastEventsCacheRef.current = {
        lastFeedingMs: lastFeeding ? new Date(lastFeeding.created_at).getTime() : null,
        lastDiaperMs: lastDiaper ? new Date(lastDiaper.created_at).getTime() : null,
        lastSleepEndMs: lastSleep
          ? (lastSleep.end_time
              ? new Date(lastSleep.end_time).getTime()
              : new Date(lastSleep.created_at).getTime() + (lastSleep.duration_seconds || 0) * 1000)
          : null,
        ageMo,
      };
    } catch (e) {
      if (__DEV__) console.warn('[Notifications] Error refreshing event cache:', e);
    }
  }, []);

  // Refs to hold interval IDs — survives re-renders, cleaned up properly
  const cacheIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cached sync module ref — avoids repeated dynamic imports
  const syncModuleRef = useRef<{ syncWithSupabase: (force?: boolean) => Promise<void>; getLastPushTimestamp: () => number } | null>(null);
  const getSyncModule = useCallback(async () => {
    if (!syncModuleRef.current) {
      syncModuleRef.current = await import('./src/db/sync');
    }
    return syncModuleRef.current;
  }, []);

  // Helper: run sync + post-sync tasks
  const runSync = useCallback(async (force?: boolean) => {
    try {
      const { syncWithSupabase } = await getSyncModule();
      await syncWithSupabase(force);
      checkTodayShift();
    } catch (e) {
      if (__DEV__) console.warn('Sync failed', e);
    }
  }, [getSyncModule]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      checkProfile(initialSession);
      if (initialSession) {
        runSync();
        // Start notification reminder poller
        refreshLastEventsCache().then(() => {
          startNotifPoller(() => lastEventsCacheRef.current);
        });
        // Refresh event cache periodically (every 60s) — stored in ref for proper cleanup
        if (cacheIntervalRef.current) clearInterval(cacheIntervalRef.current);
        cacheIntervalRef.current = setInterval(refreshLastEventsCache, 60_000);
      } else {
        import('./src/store/dataStore').then(({ useDataStore }) => useDataStore.getState().clearData());
        import('./src/store/timerStore').then(({ useTimerStore }) => useTimerStore.getState().clearAllTimers());
        stopNotifPoller();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      checkProfile(newSession);
      if (newSession) {
        runSync();
        // Re-start notification poller on re-auth
        refreshLastEventsCache().then(() => {
          startNotifPoller(() => lastEventsCacheRef.current);
        });
      } else {
        import('./src/store/dataStore').then(({ useDataStore }) => useDataStore.getState().clearData());
        import('./src/store/timerStore').then(({ useTimerStore }) => useTimerStore.getState().clearAllTimers());
        stopNotifPoller();
      }
    });

    const unsubscribeForeground = notifee.onForegroundEvent(async ({ type, detail }) => {
      if (type === EventType.ACTION_PRESS) {
        if (detail.pressAction?.id === 'stop-sleep') {
          await handleBackgroundStopSleep();
        } else if (detail.pressAction?.id === 'stop-walk') {
          await handleBackgroundStopWalk();
        } else if (detail.pressAction?.id === 'stop-feeding-left') {
          await handleBackgroundStopFeedingLeft();
        } else if (detail.pressAction?.id === 'stop-feeding-right') {
          await handleBackgroundStopFeedingRight();
        }
      }
    });

    return () => {
      subscription.unsubscribe();
      unsubscribeForeground();
      stopNotifPoller();
      if (cacheIntervalRef.current) {
        clearInterval(cacheIntervalRef.current);
        cacheIntervalRef.current = null;
      }
    };
  }, []);

  // Debounce ref for Realtime sync — prevents rapid-fire syncs
  const realtimeDebounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active' && session) {
        runSync(true); // Force sync on return from background
      }
    });

    let interval: NodeJS.Timeout | undefined;
    let channel: any;

    if (session) {
       // Periodic background sync (every 2 min for responsive cross-device updates)
       interval = setInterval(() => {
          runSync();
       }, 120_000);

       // Targeted realtime sync — listen to ALL changes (no user_id filter)
       // so both parents see each other's data immediately
       const REALTIME_TABLES = [
         'feedings', 'sleeps', 'diapers', 'walks', 'tasks',
         'growth_records', 'medications', 'vaccinations',
         'doctor_visits', 'shifts',
       ];
       channel = supabase.channel('baby-sync');
       for (const table of REALTIME_TABLES) {
         channel = channel.on(
           'postgres_changes',
           { event: '*', schema: 'public', table },
           (payload: any) => {
             if (__DEV__) console.log(`[realtime] ${table}:`, payload.eventType);

             // Feedback loop protection: ignore Realtime events triggered by our own push
             getSyncModule().then(({ getLastPushTimestamp }) => {
               const timeSincePush = Date.now() - getLastPushTimestamp();
               if (timeSincePush < 2000) {
                 if (__DEV__) console.log(`[realtime] Skipping sync — own push ${timeSincePush}ms ago`);
                 return;
               }

               // Debounce: coalesce multiple rapid Realtime events into one sync
               if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current);
               realtimeDebounceRef.current = setTimeout(() => {
                 runSync();
               }, 300);
             });
           }
         );
       }
       channel.subscribe();

       // Initial shift check from local DB
       checkTodayShift();
    }

    return () => {
       subscription.remove();
       if (interval) clearInterval(interval);
       if (channel) supabase.removeChannel(channel);
       if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current);
    };
  }, [session, runSync, getSyncModule]);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady && !loading) {
      try {
        await SplashScreen.hideAsync();
      } catch (e) {
        // Ignored
      }
    }
  }, [appIsReady, loading]);

  if (!appIsReady || loading) {
    return null;
  }

  const renderContent = () => {
    if (!session) {
      return <AuthScreen />;
    }
    if (onboardingNeeded) {
      return <OnboardingScreen />;
    }

    const prefix = Linking.createURL('/');
    const linking = {
      prefixes: [prefix, 'babysync://'],
      config: {
        screens: {
          Home: 'home',
          Tracker: 'tracker',
          Feeding: 'feeding',
          Sleep: 'sleep',
          Diaper: 'diaper',
          Walk: 'walk',
          Pump: 'pump',
          Health: 'health',
          Routine: 'routine',
          Analytics: 'analytics',
          Shifts: 'shifts',
          Settings: 'settings'
        }
      }
    };

    return (
      <DatabaseProvider database={database}>
        <NavigationContainer linking={linking}>
          <StatusBar barStyle="dark-content" backgroundColor="#FAFBFC" />
          <MainAppContent />
        </NavigationContainer>
      </DatabaseProvider>
    );
  };

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
          {renderContent()}
        </GestureHandlerRootView>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
});


// ── TabNavigator: defined OUTSIDE App to prevent unmounting on re-render ──
const TabNavigator = () => {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1 }}>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarIcon: ({ focused, color, size }) => {
              let IconComponent = Home;

              if (route.name === 'Home') {
                IconComponent = Home;
              } else if (route.name === 'Tracker') {
                IconComponent = Activity;
              } else if (route.name === 'Routine') {
                IconComponent = Clock;
              } else if (route.name === 'Analytics') {
                IconComponent = LineChart;
              } else if (route.name === 'Shifts') {
                IconComponent = CalendarDays;
              } else if (route.name === 'Settings') {
                IconComponent = Settings;
              }

              return (
                <View style={{
                  width: focused ? 48 : 42,
                  height: 32,
                  backgroundColor: focused ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: [{ translateY: focused ? -2 : 0 }]
                }}>
                  <IconComponent size={focused ? 22 : 20} color={color} strokeWidth={1.5} />
                </View>
              );
            },
            tabBarActiveTintColor: ACTIVE_COLOR,
            tabBarInactiveTintColor: IDLE_COLOR,
            tabBarStyle: {
              backgroundColor: 'rgba(255,255,255,0.95)',
              position: 'absolute',
              borderTopWidth: 1,
              borderTopColor: 'rgba(240,240,246,0.8)',
              elevation: 0,
              shadowColor: 'rgba(138,138,158,0.06)',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 1,
              shadowRadius: 24,
              height: 60 + insets.bottom,
              paddingBottom: insets.bottom + 8,
              paddingTop: 8,
            },
            tabBarLabelStyle: {
              fontFamily: 'Nunito_700Bold',
              fontSize: 10,
              letterSpacing: 0.2,
            },
          })}
        >
          <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Дом' }} />
          <Tab.Screen name="Tracker" component={TrackerScreen} options={{ title: 'Трекер' }} />
          <Tab.Screen name="Routine" component={RoutineScreen} options={{ title: 'Режим' }} />
          <Tab.Screen name="Analytics" component={AnalyticsScreen} options={{ title: 'Графики' }} />
          <Tab.Screen name="Shifts" component={ShiftsScreen} options={{ title: 'Смены' }} />
          <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Профиль' }} />
        </Tab.Navigator>
    </View>
  );
};

// ── MainAppContent: defined OUTSIDE App to prevent remounting ──
const MainAppContent = () => {
  return (
    <View style={{ flex: 1 }}>
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
           <RootStack.Screen name="MainTabs" component={TabNavigator} />
           <RootStack.Group screenOptions={{ presentation: 'modal' }}>
             <RootStack.Screen name="Sleep" component={SleepScreen} />
             <RootStack.Screen name="Walk" component={WalkScreen} />
             <RootStack.Screen name="Feeding" component={FeedingScreen} />
             <RootStack.Screen name="Diaper" component={DiaperScreen} />
             <RootStack.Screen name="Health" component={HealthScreen} />
             <RootStack.Screen name="Doctor" component={DoctorScreen} />
             <RootStack.Screen name="Growth" component={GrowthScreen} />
           </RootStack.Group>
        </RootStack.Navigator>
        <FAB />
        <AIBubble />
        <LiveActivityBanner />
    </View>
  );
};
