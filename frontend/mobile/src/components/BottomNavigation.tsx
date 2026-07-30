import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, Dimensions, Text } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { F } from '../theme';

const SCREEN_WIDTH = Dimensions.get('window').width;

type BottomNavProps = {
  currentScreen: 'Dashboard' | 'Profile' | 'Coach' | 'Nutrition' | 'Workout';
  onNavigate: (screen: 'Dashboard' | 'Profile' | 'Coach' | 'Nutrition' | 'Workout') => void;
};

export default function BottomNavigation({ currentScreen, onNavigate }: BottomNavProps) {
  const { C, isDark } = useTheme();
  const tabCount = 5;
  const tabWidth = SCREEN_WIDTH / tabCount;

  // Map screens to indices: 0=Dashboard, 1=Workout, 2=Coach(center), 3=Nutrition, 4=Profile
  const activeIndex = currentScreen === 'Dashboard' ? 0 
    : currentScreen === 'Workout' ? 1 
    : currentScreen === 'Coach' ? 2 
    : currentScreen === 'Nutrition' ? 3 
    : currentScreen === 'Profile' ? 4 
    : -1;

  const pillPos = useSharedValue(activeIndex !== -1 ? (activeIndex * tabWidth) + (tabWidth / 2) - 24 : 1000);
  const pillOpacity = useSharedValue(activeIndex !== -1 ? 1 : 0);

  useEffect(() => {
    if (activeIndex !== -1) {
      pillPos.value = withSpring((activeIndex * tabWidth) + (tabWidth / 2) - 24, { damping: 15, stiffness: 150 });
      pillOpacity.value = withTiming(1, { duration: 150 });
    } else {
      pillOpacity.value = withTiming(0, { duration: 150 });
    }
  }, [activeIndex, tabWidth]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pillPos.value }],
    opacity: pillOpacity.value,
  }));

  const handleNav = (screen: 'Dashboard' | 'Profile' | 'Coach' | 'Nutrition' | 'Workout') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onNavigate(screen);
  };

  return (
    <View style={[styles.bottomNav, { backgroundColor: C.bg }]}>
      <Animated.View style={[styles.navActivePill, pillStyle]} />
      
      {/* Dashboard / Home */}
      <TouchableOpacity style={styles.navItem} onPress={() => handleNav('Dashboard')}>
        <Icon name="home" size={24} color={activeIndex === 0 ? C.primary : C.onSurfaceVariant} />
        <Text style={[styles.navLabel, { color: activeIndex === 0 ? C.primary : C.onSurfaceVariant }]}>Home</Text>
      </TouchableOpacity>
      
      {/* Workout Tracker */}
      <TouchableOpacity style={styles.navItem} onPress={() => handleNav('Workout')}>
        <Icon name="fitness-center" size={24} color={activeIndex === 1 ? C.primary : C.onSurfaceVariant} />
        <Text style={[styles.navLabel, { color: activeIndex === 1 ? C.primary : C.onSurfaceVariant }]}>Workout</Text>
      </TouchableOpacity>
      
      {/* AI Coach Rachel - Center Button */}
      <TouchableOpacity style={styles.centerBtn} onPress={() => handleNav('Coach')} activeOpacity={0.85}>
        <View style={[styles.aiFaceCircle, { backgroundColor: C.primary }]}>
          <Icon name="auto-awesome" size={26} color={C.onPrimary} />
        </View>
      </TouchableOpacity>
      
      {/* Nutrition */}
      <TouchableOpacity style={styles.navItem} onPress={() => handleNav('Nutrition')}>
        <Icon name="local-dining" size={24} color={activeIndex === 3 ? C.primary : C.onSurfaceVariant} />
        <Text style={[styles.navLabel, { color: activeIndex === 3 ? C.primary : C.onSurfaceVariant }]}>Nutrition</Text>
      </TouchableOpacity>
      
      {/* Profile */}
      <TouchableOpacity style={styles.navItem} onPress={() => handleNav('Profile')}>
        <Icon name="person" size={24} color={activeIndex === 4 ? C.primary : C.onSurfaceVariant} />
        <Text style={[styles.navLabel, { color: activeIndex === 4 ? C.primary : C.onSurfaceVariant }]}>Profile</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: { 
    position: 'absolute', 
    bottom: 0, left: 0, right: 0, 
    flexDirection: 'row', 
    paddingBottom: Platform.OS === 'ios' ? 24 : 16, 
    paddingTop: 8, 
    borderTopWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navItem: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    height: 56, 
    zIndex: 2,
    paddingTop: 6,
  },
  navLabel: {
    fontFamily: F.header,
    fontSize: 9,
    letterSpacing: 0.3,
    marginTop: 2,
  },
  navActivePill: { 
    position: 'absolute', 
    bottom: Platform.OS === 'ios' ? 24 : 16, 
    left: 0, 
    width: 48, 
    height: 4, 
    borderRadius: 2, 
    backgroundColor: 'rgba(245,196,0,0.6)', 
    zIndex: 1,
  },
  centerBtn: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
    marginTop: -20,
  },
  aiFaceCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 16px rgba(245,196,0,0.45)',
      },
      default: {
        shadowColor: '#F5C400',
        shadowOpacity: 0.45,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
      }
    }),
  },
});
