import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { DarkColors } from '../theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const C = DarkColors;

type BottomNavProps = {
  currentScreen: 'Dashboard' | 'Profile' | 'Coach';
  onNavigate: (screen: 'Dashboard' | 'Profile' | 'Coach') => void;
  onNavigateToBuilder: () => void;
};

export default function BottomNavigation({ currentScreen, onNavigate, onNavigateToBuilder }: BottomNavProps) {
  // 5 tabs conceptually: 0=Dashboard, 1=Coach, 2=FAB, 3=Settings, 4=Profile
  const activeIndex = currentScreen === 'Dashboard' ? 0 : currentScreen === 'Coach' ? 1 : 4;
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

  const handleNav = (screen: 'Dashboard' | 'Profile' | 'Coach') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onNavigate(screen);
  };

  const handleBuilderNav = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onNavigateToBuilder();
  };

  return (
    <BlurView intensity={60} tint="dark" style={styles.bottomNav}>
      <Animated.View style={[styles.navActivePill, pillStyle]} />
      
      <TouchableOpacity style={styles.navItem} onPress={() => handleNav('Dashboard')}>
        <Icon name="home" size={24} color={activeIndex === 0 ? C.primary : C.onSurfaceVariant} />
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.navItem} onPress={() => handleNav('Coach')}>
        <Icon name="auto-awesome" size={24} color={activeIndex === 1 ? C.primary : C.onSurfaceVariant} />
      </TouchableOpacity>
      
      <View style={{ flex: 1 }} />
      
      <TouchableOpacity style={styles.navItem}>
        <Icon name="settings" size={24} color={C.onSurfaceVariant} />
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.navItem} onPress={() => handleNav('Profile')}>
        <Icon name="person" size={24} color={activeIndex === 4 ? C.primary : C.onSurfaceVariant} />
      </TouchableOpacity>

      <View style={styles.fabContainer}>
        <TouchableOpacity activeOpacity={0.85} style={styles.fab} onPress={handleBuilderNav}>
          <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: 28, backgroundColor: C.primary }, rippleStyle]} pointerEvents="none" />
          <Icon name="smart-toy" size={28} color={C.onPrimary} />
        </TouchableOpacity>
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  bottomNav: { 
    position: 'absolute', 
    bottom: 0, left: 0, right: 0, 
    flexDirection: 'row', 
    paddingBottom: Platform.OS === 'ios' ? 24 : 16, 
    paddingTop: 12, 
    borderTopWidth: 1, 
    borderTopColor: C.outlineVariant 
  },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 48, zIndex: 2 },
  navActivePill: { position: 'absolute', top: 12, left: 0, width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.1)', zIndex: 1 },
  
  fabContainer: { position: 'absolute', top: -20, left: '50%', marginLeft: -28, width: 56, height: 56, zIndex: 3 },
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
