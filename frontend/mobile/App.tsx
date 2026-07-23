import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import ProfileScreen from './src/screens/ProfileScreen';
import WorkoutBuilderScreen from './src/screens/WorkoutBuilderScreen';
import * as Font from 'expo-font';
import { SpaceGrotesk_700Bold, SpaceGrotesk_500Medium, SpaceGrotesk_400Regular } from '@expo-google-fonts/space-grotesk';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { View, Text, Platform } from 'react-native';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { FadeIn, Easing } from 'react-native-reanimated';

import DashboardScreen from './src/screens/DashboardScreen';
import CoachScreen from './src/screens/CoachScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import BottomNavigation from './src/components/BottomNavigation';
import CommandPaletteModal from './src/components/CommandPaletteModal';

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<'Onboarding' | 'Profile' | 'WorkoutBuilder' | 'Dashboard' | 'Coach'>('Onboarding');
  const [isCommandOpen, setIsCommandOpen] = useState(false);

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

  // Keyboard shortcut for Cmd+K / Ctrl+K on Web
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
          e.preventDefault();
          setIsCommandOpen(prev => !prev);
        }
        if (e.key === 'Escape') {
          setIsCommandOpen(false);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
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
      <Animated.View key={currentScreen} entering={FadeIn.duration(400).easing(Easing.out(Easing.cubic))} style={{ flex: 1 }}>
        {currentScreen === 'Onboarding' ? (
          <OnboardingScreen onComplete={() => setCurrentScreen('Dashboard')} />
        ) : currentScreen === 'Profile' ? (
          <ProfileScreen onNavigateToBuilder={() => setCurrentScreen('WorkoutBuilder')} />
        ) : currentScreen === 'WorkoutBuilder' ? (
          <WorkoutBuilderScreen onNavigateBack={() => setCurrentScreen('Profile')} />
        ) : currentScreen === 'Coach' ? (
          <CoachScreen />
        ) : (
          <DashboardScreen onOpenCommandPalette={() => setIsCommandOpen(true)} />
        )}
      </Animated.View>
      
      {currentScreen !== 'WorkoutBuilder' && currentScreen !== 'Onboarding' && (
        <BottomNavigation 
          currentScreen={currentScreen as 'Dashboard' | 'Profile' | 'Coach'} 
          onNavigate={(screen) => setCurrentScreen(screen)} 
          onNavigateToBuilder={() => setCurrentScreen('WorkoutBuilder')} 
        />
      )}

      {/* Global Command Palette */}
      <CommandPaletteModal 
        isVisible={isCommandOpen} 
        onClose={() => setIsCommandOpen(false)} 
        onNavigate={(screen) => { setCurrentScreen(screen); setIsCommandOpen(false); }} 
      />

      <StatusBar style="light" />
    </GestureHandlerRootView>
  );
}
