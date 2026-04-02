import 'react-native-url-polyfill/auto';
import 'react-native-gesture-handler';
import React, { useEffect, useState, useCallback } from 'react';
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
import { setupTimerNotifications, restoreTimerNotifications } from './src/lib/timerNotifications';
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

// Sentry Initialization
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
  enableNativeFramesTracking: !__DEV__,
  tracesSampleRate: 1.0,
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
        const { sleepConfig, walkConfig } = useTimerStore.getState();
        await restoreTimerNotifications(
           sleepConfig.isRunning, sleepConfig.startTime,
           walkConfig.isRunning, walkConfig.startTime
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
        setOnboardingNeeded(true);
        setBaby(null);
      } else {
        setOnboardingNeeded(false);
        setBaby(data);
      }
    } catch (e) {
      if (__DEV__) console.warn('Error fetching profile', e);
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      checkProfile(initialSession);
      if (initialSession) {
        import('./src/db/sync').then(({ syncWithSupabase }) =>
          syncWithSupabase()
            .then(() => checkTodayShift())
            .catch(e => __DEV__ && console.warn('Sync failed', e))
        );
      } else {
        import('./src/store/dataStore').then(({ useDataStore }) => useDataStore.getState().clearData());
        import('./src/store/timerStore').then(({ useTimerStore }) => useTimerStore.getState().clearAllTimers());
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      checkProfile(newSession);
      if (newSession) {
        import('./src/db/sync').then(({ syncWithSupabase }) =>
          syncWithSupabase()
            .then(() => checkTodayShift())
            .catch(e => __DEV__ && console.warn('Sync failed', e))
        );
      } else {
        import('./src/store/dataStore').then(({ useDataStore }) => useDataStore.getState().clearData());
        import('./src/store/timerStore').then(({ useTimerStore }) => useTimerStore.getState().clearAllTimers());
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active' && session) {
        import('./src/db/sync').then(({ syncWithSupabase }) =>
          syncWithSupabase()
            .then(() => checkTodayShift())
            .catch(e => __DEV__ && console.warn('Sync bg failed', e))
        );
      }
    });

    let interval: NodeJS.Timeout | undefined;
    let channel: any;

    if (session) {
       // Periodic background sync (every 2 min)
       interval = setInterval(() => {
          import('./src/db/sync').then(({ syncWithSupabase }) =>
            syncWithSupabase()
              .then(() => checkTodayShift())
              .catch(() => {})
          );
       }, 120000);

       // Targeted realtime sync — listen to specific tables only
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
             import('./src/db/sync').then(({ syncWithSupabase }) =>
               syncWithSupabase()
                 .then(() => checkTodayShift())
                 .catch(() => {})
             );
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
    };
  }, [session]);

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

// Pulled to top-level to prevent unmounting when App re-renders
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
