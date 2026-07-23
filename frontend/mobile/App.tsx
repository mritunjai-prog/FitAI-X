import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import ProfileScreen from './src/screens/ProfileScreen';
import WorkoutBuilderScreen from './src/screens/WorkoutBuilderScreen';
import * as Font from 'expo-font';
import { SpaceGrotesk_700Bold, SpaceGrotesk_500Medium, SpaceGrotesk_400Regular } from '@expo-google-fonts/space-grotesk';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { View, Text } from 'react-native';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { FadeIn } from 'react-native-reanimated';

import DashboardScreen from './src/screens/DashboardScreen';
import CoachScreen from './src/screens/CoachScreen';
import BottomNavigation from './src/components/BottomNavigation';

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<'Profile' | 'WorkoutBuilder' | 'Dashboard' | 'Coach'>('Dashboard');

  useEffect(() => {
    async function loadFonts() {
      await Font.loadAsync({
        SpaceGrotesk_700Bold,
        SpaceGrotesk_500Medium,
        SpaceGrotesk_400Regular,
        Inter_400Regular,
        Inter_500Medium,
        Inter_600SemiBold,
        Inter_700Bold,
      });
      setFontsLoaded(true);
    }
    loadFonts();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#f5c400' }}>Loading FitAI X...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Animated.View key={currentScreen} entering={FadeIn.duration(300)} style={{ flex: 1 }}>
        {currentScreen === 'Profile' ? (
          <ProfileScreen onNavigateToBuilder={() => setCurrentScreen('WorkoutBuilder')} />
        ) : currentScreen === 'WorkoutBuilder' ? (
          <WorkoutBuilderScreen onNavigateBack={() => setCurrentScreen('Profile')} />
        ) : currentScreen === 'Coach' ? (
          <CoachScreen />
        ) : (
          <DashboardScreen />
        )}
      </Animated.View>
      
      {currentScreen !== 'WorkoutBuilder' && (
        <BottomNavigation 
          currentScreen={currentScreen as 'Dashboard' | 'Profile' | 'Coach'} 
          onNavigate={(screen) => setCurrentScreen(screen)} 
          onNavigateToBuilder={() => setCurrentScreen('WorkoutBuilder')} 
        />
      )}
      <StatusBar style="light" />
    </GestureHandlerRootView>
  );
}
