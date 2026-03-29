import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TrackerScreen from './TrackerScreen';
import SleepScreen from './SleepScreen';
import WalkScreen from './WalkScreen';
import FeedingScreen from './FeedingScreen';
import DiaperScreen from './DiaperScreen';
import HealthScreen from './HealthScreen';
import DoctorScreen from './DoctorScreen';
import GrowthScreen from './GrowthScreen';
import ShiftsScreen from './ShiftsScreen';

const Stack = createNativeStackNavigator();

export default function TrackerStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TrackerMain" component={TrackerScreen} />
      <Stack.Screen name="Sleep" component={SleepScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="Walk" component={WalkScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="Feeding" component={FeedingScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="Diaper" component={DiaperScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="Health" component={HealthScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="Doctor" component={DoctorScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="Growth" component={GrowthScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="Shifts" component={ShiftsScreen} options={{ presentation: 'modal' }} />
    </Stack.Navigator>
  );
}
