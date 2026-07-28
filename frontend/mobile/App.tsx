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
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Animated, { FadeIn, Easing } from 'react-native-reanimated';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // cache data for 24 hours (offline access)
      staleTime: 1000 * 60 * 5, // consider data stale after 5 mins
    },
  },
});

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
});

import DashboardScreen from './src/screens/DashboardScreen';
import CoachScreen from './src/screens/CoachScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import NutritionScreen from './src/screens/NutritionScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import RecoveryScreen from './src/screens/RecoveryScreen';
import ActiveWorkoutScreen from './src/screens/ActiveWorkoutScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import WorkoutHistoryScreen from './src/screens/WorkoutHistoryScreen';
import BottomNavigation from './src/components/BottomNavigation';
import CommandPaletteModal from './src/components/CommandPaletteModal';
import WorkoutHomeScreen from './src/screens/WorkoutHomeScreen';
import AuthScreen from './src/screens/AuthScreen';
import SplashScreen from './src/screens/SplashScreen';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { socket } from './src/services/socket/socketClient';

function MainApp() {
  const { isDark } = useTheme();
  const { user, isLoading, hasOnboarded, completeOnboarding } = useAuth();
  
  const [currentScreen, setCurrentScreen] = useState<'Profile' | 'WorkoutBuilder' | 'ActiveWorkout' | 'WorkoutHistory' | 'Dashboard' | 'Coach' | 'Calendar' | 'Nutrition' | 'Analytics' | 'Recovery' | 'Settings' | 'Notifications' | 'WorkoutHome'>('Dashboard');
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

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

  // AI Function Calling Realtime Link
  useEffect(() => {
    if (!user) return;
    
    const handleNotification = (data: { message: string }) => {
      if (Platform.OS !== 'web') {
        const { Alert } = require('react-native');
        Alert.alert('AI Update', data.message);
      } else {
        window.alert(`AI Update: ${data.message}`);
      }
      queryClient.invalidateQueries();
    };

    socket.on('system_notification', handleNotification);
    
    return () => {
      socket.off('system_notification', handleNotification);
    };
  }, [user]);

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: isDark ? '#050505' : '#F5F5F7', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#f5c400', fontFamily: 'SpaceGrotesk_500Medium' }}>Initializing Neural Link...</Text>
      </View>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <Animated.View key={!hasOnboarded ? 'Onboarding' : currentScreen} entering={FadeIn.duration(400)} style={{ flex: 1 }}>
      {!hasOnboarded ? (
        <OnboardingScreen onComplete={completeOnboarding} />
      ) : currentScreen === 'Profile' ? (
        <ProfileScreen 
          onNavigateToBuilder={() => setCurrentScreen('WorkoutBuilder')} 
          onNavigateToSettings={() => setCurrentScreen('Settings')}
          onNavigateToNotifications={() => setCurrentScreen('Notifications')}
          onNavigateToHistory={() => setCurrentScreen('WorkoutHistory')}
        />
      ) : currentScreen === 'WorkoutHistory' ? (
        <WorkoutHistoryScreen onNavigateBack={() => setCurrentScreen('Profile')} />
      ) : currentScreen === 'WorkoutHome' ? (
        <WorkoutHomeScreen 
          onNavigateBack={() => setCurrentScreen('Dashboard')}
          onNavigateToBuilder={() => setCurrentScreen('WorkoutBuilder')}
          onNavigateToActive={() => setCurrentScreen('ActiveWorkout')}
          onNavigateToHistory={() => setCurrentScreen('WorkoutHistory')}
        />
      ) : currentScreen === 'WorkoutBuilder' ? (
        <WorkoutBuilderScreen 
          onNavigateBack={() => setCurrentScreen('WorkoutHome')} 
          onStartWorkout={() => setCurrentScreen('ActiveWorkout')}
        />
      ) : currentScreen === 'ActiveWorkout' ? (
        <ActiveWorkoutScreen onFinish={() => setCurrentScreen('Dashboard')} onNavigateBack={() => setCurrentScreen('WorkoutHome')} />
      ) : currentScreen === 'Coach' ? (
        <CoachScreen onNavigateToNotifications={() => setCurrentScreen('Notifications')} onNavigateBack={() => setCurrentScreen('Dashboard')} />
      ) : currentScreen === 'Calendar' ? (
        <CalendarScreen onNavigateToNotifications={() => setCurrentScreen('Notifications')} onNavigateBack={() => setCurrentScreen('Dashboard')} />
      ) : currentScreen === 'Nutrition' ? (
        <NutritionScreen onNavigateToNotifications={() => setCurrentScreen('Notifications')} onNavigateBack={() => setCurrentScreen('Dashboard')} />
      ) : currentScreen === 'Analytics' ? (
        <AnalyticsScreen onNavigateToNotifications={() => setCurrentScreen('Notifications')} onNavigateBack={() => setCurrentScreen('Dashboard')} />
      ) : currentScreen === 'Recovery' ? (
        <RecoveryScreen navigation={{ goBack: () => setCurrentScreen('Dashboard') }} onNavigateToNotifications={() => setCurrentScreen('Notifications')} />
      ) : currentScreen === 'Settings' ? (
        <SettingsScreen onNavigateBack={() => setCurrentScreen('Profile')} />
      ) : currentScreen === 'Notifications' ? (
        <NotificationsScreen onNavigateBack={() => setCurrentScreen('Profile')} />
      ) : (
        <DashboardScreen onOpenCommandPalette={() => setIsCommandOpen(true)} onNavigateToNotifications={() => setCurrentScreen('Notifications')} />
      )}
      
      {hasOnboarded && !['WorkoutBuilder', 'ActiveWorkout', 'WorkoutHistory', 'Settings', 'Notifications', 'WorkoutHome'].includes(currentScreen) && (
        <BottomNavigation 
          currentScreen={currentScreen as 'Dashboard' | 'Profile' | 'Coach' | 'Calendar' | 'Nutrition' | 'Analytics'} 
          onNavigate={(screen) => setCurrentScreen(screen)} 
          onOpenActionMenu={() => setIsCommandOpen(true)} 
        />
      )}

      {/* Global Command Palette */}
      {isCommandOpen && (
        <CommandPaletteModal 
          isVisible={isCommandOpen} 
          onClose={() => setIsCommandOpen(false)} 
          onNavigate={(screen) => { setCurrentScreen(screen); setIsCommandOpen(false); }} 
        />
      )}
    </Animated.View>
  );
}

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

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

  if (!fontsLoaded) return null;

  return (
    <PersistQueryClientProvider
      client={queryClient} 
      persistOptions={{ persister: asyncStoragePersister }}
    >
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <MainApp />
              <StatusBar style="auto" />
            </GestureHandlerRootView>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </PersistQueryClientProvider>
  );
}
