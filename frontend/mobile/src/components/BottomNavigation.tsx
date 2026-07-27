import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { DarkColors } from '../theme';
import { useTheme } from '../context/ThemeContext';

const SCREEN_WIDTH = Dimensions.get('window').width;

type BottomNavProps = {
  currentScreen: 'Dashboard' | 'Profile' | 'Coach' | 'Calendar' | 'Nutrition' | 'Analytics' | 'Recovery';
  onNavigate: (screen: 'Dashboard' | 'Profile' | 'Coach' | 'Calendar' | 'Nutrition' | 'Analytics' | 'Recovery') => void;
  onOpenActionMenu: () => void;
};

export default function BottomNavigation({ currentScreen, onNavigate, onOpenActionMenu }: BottomNavProps) {
  const { C, isDark } = useTheme();
  const isCoachScreen = currentScreen === 'Coach';
  const styles = React.useMemo(() => getStyles(C, isDark, isCoachScreen), [C, isDark, isCoachScreen]);
  // 5 tabs conceptually: 0=Dashboard, 1=Calendar, 2=FAB, 3=Coach, 4=Profile
  const activeIndex = currentScreen === 'Dashboard' ? 0 : currentScreen === 'Calendar' ? 1 : currentScreen === 'Coach' ? 3 : 4;
  const tabWidth = SCREEN_WIDTH / 5;

  const pillPos = useSharedValue((activeIndex * tabWidth) + (tabWidth / 2) - 24);

  useEffect(() => {
    pillPos.value = withSpring((activeIndex * tabWidth) + (tabWidth / 2) - 24, { damping: 15, stiffness: 150 });
  }, [activeIndex]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pillPos.value }]
  }));

  const rippleScale = useSharedValue(1);
  const rippleOpacity = useSharedValue(0.5);

  useEffect(() => {
    rippleScale.value = withRepeat(withTiming(1.6, { duration: 1500, easing: Easing.out(Easing.ease) }), -1, false);
    rippleOpacity.value = withRepeat(withTiming(0, { duration: 1500, easing: Easing.out(Easing.ease) }), -1, false);
  }, []);

  const rippleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rippleScale.value }],
    opacity: rippleOpacity.value
  }));

  const handleNav = (screen: 'Dashboard' | 'Profile' | 'Coach' | 'Calendar' | 'Nutrition' | 'Analytics' | 'Recovery') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onNavigate(screen);
  };

  return (
    <BlurView intensity={80} tint={isDark ? "dark" : "light"} style={styles.bottomNav}>
      <Animated.View style={[styles.navActivePill, pillStyle]} />
      
      <TouchableOpacity style={styles.navItem} onPress={() => handleNav('Dashboard')}>
        <Icon name="home" size={24} color={activeIndex === 0 ? C.primary : C.onSurfaceVariant} />
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.navItem} onPress={() => handleNav('Calendar')}>
        <Icon name="event" size={24} color={activeIndex === 1 ? C.primary : C.onSurfaceVariant} />
      </TouchableOpacity>
      
      <View style={{ flex: 1 }} />
      
      <TouchableOpacity style={styles.navItem} onPress={() => handleNav('Coach')}>
        <Icon name="auto-awesome" size={24} color={activeIndex === 3 ? C.primary : C.onSurfaceVariant} />
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.navItem} onPress={() => handleNav('Profile')}>
        <Icon name="person" size={24} color={activeIndex === 4 ? C.primary : C.onSurfaceVariant} />
      </TouchableOpacity>

      <View style={styles.fabContainer}>
        <TouchableOpacity activeOpacity={0.85} style={styles.fab} onPress={onOpenActionMenu}>
          <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: 28, backgroundColor: C.primary }, rippleStyle]} pointerEvents="none" />
          <Icon name="add" size={32} color={C.onPrimary} />
        </TouchableOpacity>
      </View>
    </BlurView>
  );
}

const getStyles = (C: any, isDark: boolean, isCoachScreen: boolean) => StyleSheet.create({
  bottomNav: { 
    position: 'absolute', 
    bottom: 0, left: 0, right: 0, 
    flexDirection: 'row', 
    paddingBottom: Platform.OS === 'ios' ? 24 : 16, 
    paddingTop: 12, 
    backgroundColor: isDark ? 'rgba(15, 23, 42, 0.90)' : 'rgba(255, 255, 255, 0.95)',
    borderTopWidth: 1, 
    borderTopColor: C.outlineVariant 
  },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 48, zIndex: 2 },
  navActivePill: { position: 'absolute', top: 12, left: 0, width: 48, height: 48, borderRadius: 24, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)', zIndex: 1 },
  
  fabContainer: { position: 'absolute', top: isCoachScreen ? 4 : -20, left: '50%', marginLeft: -28, width: 56, height: 56, zIndex: 3 },
  fab: { 
    width: 56, 
    height: 56, 
    borderRadius: 28, 
    backgroundColor: C.primary, 
    alignItems: 'center', 
    justifyContent: 'center',
    ...Platform.select({
      web: {
        boxShadow: `0px 4px 12px ${C.primary}66`
      },
      default: {
        shadowColor: C.primary, 
        shadowOpacity: 0.4, 
        shadowRadius: 12, 
        shadowOffset: { width: 0, height: 4 }, 
        elevation: 8
      }
    })
  },
});
