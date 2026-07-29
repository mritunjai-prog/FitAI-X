import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import ProfileScreen from './src/screens/ProfileScreen';
import WorkoutScreen from './src/screens/WorkoutScreen';
import * as Font from 'expo-font';
import { SpaceGrotesk_700Bold, SpaceGrotesk_500Medium, SpaceGrotesk_400Regular } from '@expo-google-fonts/space-grotesk';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { View, Text, Platform, Pressable, TextInput, StyleSheet } from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24,
      staleTime: 1000 * 60 * 5,
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
import SettingsScreen from './src/screens/SettingsScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import BottomNavigation from './src/components/BottomNavigation';
import TopBar from './src/components/TopBar';
import AuthScreen from './src/screens/AuthScreen';
import SplashScreen from './src/screens/SplashScreen';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { socket } from './src/services/socket/socketClient';

function MainApp() {
  const { isDark } = useTheme();
  const { user, isLoading, hasOnboarded, completeOnboarding } = useAuth();
  
  const [currentScreen, setCurrentScreen] = useState<'Profile' | 'Workout' | 'Dashboard' | 'Coach' | 'Calendar' | 'Nutrition' | 'Analytics' | 'Recovery' | 'Settings' | 'Notifications'>('Dashboard');
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // Check for unread notifications
  useEffect(() => {
    if (!user) return;
    import('./src/services/api/client').then(({ apiClient }) => {
      apiClient.get('/notifications').then((r: any) => {
        const notifs = r.data?.notifications || [];
        setUnreadCount(notifs.filter((n: any) => !n.isRead).length);
      }).catch(() => {});
    });
  }, [user, currentScreen]);

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
    return () => { socket.off('system_notification', handleNotification); };
  }, [user]);

  const handleTopAction = (action: string) => {
    switch (action) {
      case 'settings': setCurrentScreen('Settings'); break;
      case 'palette': setIsCommandOpen(true); break;
      case 'notifications': setCurrentScreen('Notifications'); break;
    }
  };

  const screenTitle = (): string => {
    const t: Record<string, string> = {
      Dashboard: 'Home', Workout: 'Workout', Coach: 'AI Coach',
      Calendar: 'Calendar', Nutrition: 'Nutrition', Analytics: 'Analytics',
      Recovery: 'Recovery', Profile: 'Profile', Settings: 'Settings', Notifications: 'Notifications',
    };
    return t[currentScreen] || '';
  };

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

  const renderScreen = () => {
    if (!hasOnboarded) {
      return <OnboardingScreen onComplete={completeOnboarding} />;
    }

    const screen = (
      <>
        {currentScreen === 'Profile' ? (
          <ProfileScreen 
            onNavigateToBuilder={() => setCurrentScreen('Workout')} 
            onNavigateToSettings={() => setCurrentScreen('Settings')}
            onNavigateToNotifications={() => setCurrentScreen('Notifications')}
            onNavigateToHistory={() => setCurrentScreen('Workout')}
          />
        ) : currentScreen === 'Workout' ? (
          <WorkoutScreen 
            onNavigateBack={() => setCurrentScreen('Dashboard')}
            onNavigateToNotifications={() => setCurrentScreen('Notifications')}
          />
        ) : currentScreen === 'Coach' ? (
          <CoachScreen onNavigateToNotifications={() => setCurrentScreen('Notifications')} onNavigateBack={() => setCurrentScreen('Dashboard')} />
        ) : currentScreen === 'Calendar' ? (
          <CalendarScreen onNavigateToNotifications={() => setCurrentScreen('Notifications')} onNavigateBack={() => setCurrentScreen('Dashboard')} />
        ) : currentScreen === 'Nutrition' ? (
          <NutritionScreen onNavigateToNotifications={() => setCurrentScreen('Notifications')} onNavigateBack={() => setCurrentScreen('Dashboard')} />
        ) : currentScreen === 'Analytics' ? (
          <AnalyticsScreen onNavigateToNotifications={() => setCurrentScreen('Notifications')} onNavigateBack={() => setCurrentScreen('Dashboard')} />
        ) : currentScreen === 'Recovery' ? (
          <RecoveryScreen navigation={{ goBack: () => setCurrentScreen('Dashboard') }} onNavigateToNotifications={() => setCurrentScreen('Notifications')} onNavigate={(screen: any) => setCurrentScreen(screen)} />
        ) : currentScreen === 'Settings' ? (
          <SettingsScreen onNavigateBack={() => setCurrentScreen('Profile')} />
        ) : currentScreen === 'Notifications' ? (
          <NotificationsScreen onNavigateBack={() => setCurrentScreen('Profile')} />
        ) : (
          <DashboardScreen onNavigateToNotifications={() => setCurrentScreen('Notifications')} onNavigateToWorkout={() => setCurrentScreen('Workout')} onNavigateToNutrition={() => setCurrentScreen('Nutrition')} onNavigateToRecovery={() => setCurrentScreen('Recovery')} onNavigate={(screen) => setCurrentScreen(screen)} />
        )}
      </>
    );

    if (!hasOnboarded) return screen;

    const hideTopFor = ['Settings', 'Notifications'];
    const showTop = !hideTopFor.includes(currentScreen);

    return (
      <View style={{ flex: 1 }}>
        {showTop && (
          <TopBar
            title={screenTitle()}
            showBack={currentScreen !== 'Dashboard'}
            onBack={() => setCurrentScreen('Dashboard')}
            onAction={(action) => handleTopAction(action)}
            rightActions={['theme', 'settings', 'palette', 'notifications']}
            unreadCount={unreadCount}
          />
        )}
        <View style={{ flex: 1 }}>{screen}</View>
      </View>
    );
  };

  return (
    <Animated.View key={!hasOnboarded ? 'Onboarding' : currentScreen} entering={FadeIn.duration(400)} style={{ flex: 1, backgroundColor: isDark ? '#050505' : '#F5F5F7' }}>
      {renderScreen()}
      
      {hasOnboarded && !['Settings', 'Notifications', 'Recovery'].includes(currentScreen) && (
        <BottomNavigation 
          currentScreen={currentScreen as 'Dashboard' | 'Profile' | 'Coach' | 'Nutrition' | 'Workout'} 
          onNavigate={(screen) => setCurrentScreen(screen)} 
        />
      )}

      {/* Global Command Palette Modal */}
      {isCommandOpen && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-start', paddingTop: 100 }}>
          <View style={{ margin: 20, backgroundColor: isDark ? '#1a1a2e' : '#fff', borderRadius: 20, padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', borderRadius: 12, paddingHorizontal: 14, height: 44 }}>
              <Icon name="search" size={18} color={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'} />
              <TextInput
                placeholder="What do you want to do?"
                placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                style={{ flex: 1, height: '100%', color: isDark ? '#fff' : '#000' }}
              />
              <Pressable onPress={() => setIsCommandOpen(false)} hitSlop={8}>
                <Icon name="close" size={17} color={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'} />
              </Pressable>
            </View>
            {[
              { icon: 'auto-awesome', label: 'Talk to Rachel AI', action: 'Coach' },
              { icon: 'fitness-center', label: 'Workout Tracker', action: 'Workout' },
              { icon: 'favorite', label: 'Recovery & Health', action: 'Recovery' },
              { icon: 'calendar-month', label: 'Smart Calendar', action: 'Calendar' },
              { icon: 'local-dining', label: 'Nutrition', action: 'Nutrition' },
              { icon: 'insights', label: 'Progress & Analytics', action: 'Analytics' },
            ].map((item, i) => (
              <Pressable key={i} onPress={() => { setCurrentScreen(item.action as any); setIsCommandOpen(false); }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 13, paddingHorizontal: 4, borderTopWidth: i > 0 ? StyleSheet.hairlineWidth : 0, borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                <Icon name={item.icon as any} size={18} color="#F5C400" />
                <Text style={{ color: isDark ? '#fff' : '#000', fontFamily: 'SpaceGrotesk_500Medium' }}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
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
