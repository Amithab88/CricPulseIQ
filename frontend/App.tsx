import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import HomeScreen from './src/screens/HomeScreen';
import LiveScorecardScreen from './src/screens/LiveScorecardScreen';
import AnalysisScreen from './src/screens/AnalysisScreen';
import AICoachScreen from './src/screens/AICoachScreen';
import PlayerProfileScreen from './src/screens/PlayerProfileScreen';

import WagonWheelScreen from './src/screens/WagonWheelScreen';
import MatchStrategyScreen from './src/screens/MatchStrategyScreen';
import TournamentManagerScreen from './src/screens/TournamentManagerScreen';
import AuthScreen from './src/screens/AuthScreen';
import PersonalDetailsScreen from './src/screens/PersonalDetailsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function BottomTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: true }}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Live" component={LiveScorecardScreen} />
      <Tab.Screen name="Analysis" component={AnalysisScreen} />
      <Tab.Screen name="AI Coach" component={AICoachScreen} />
      <Tab.Screen name="Profile" component={PlayerProfileScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Auth" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Auth" component={AuthScreen} />
          <Stack.Screen name="PersonalDetails" component={PersonalDetailsScreen} />
          <Stack.Screen name="MainTabs" component={BottomTabs} />
          
          {/* Additional Non-Tab Screens */}
          <Stack.Screen name="WagonWheel" component={WagonWheelScreen} options={{ headerShown: true, title: 'Wagon Wheel' }} />
          <Stack.Screen name="MatchStrategy" component={MatchStrategyScreen} options={{ headerShown: true, title: 'Strategy Setup' }} />
          <Stack.Screen name="TournamentManager" component={TournamentManagerScreen} options={{ headerShown: true, title: 'Tournament' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
