import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, FadeIn, FadeOut, Easing, runOnJS } from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';
import { F } from '../theme';

interface XpNotificationProps {
  xpAwarded: number;
  totalXp: number;
  level: number;
  newBadge?: string | null;
  currentStreak?: number;
  visible: boolean;
  onDismiss: () => void;
}

export default function XpNotification({ xpAwarded, totalXp, level, newBadge, currentStreak, visible, onDismiss }: XpNotificationProps) {
  const { C } = useTheme();
  const scale = useSharedValue(0);
  const transY = useSharedValue(50);

  useEffect(() => {
    if (visible) {
      scale.value = withSequence(
        withTiming(1.1, { duration: 200, easing: Easing.out(Easing.back) }),
        withTiming(1, { duration: 100 }),
      );
      transY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) });
      
      const timer = setTimeout(() => {
        onDismiss();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: transY.value }],
    opacity: transY.value === 0 ? 1 : 0,
  }));

  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      style={[styles.container, { backgroundColor: C.primary }]}
    >
      <Animated.View style={[styles.inner, animStyle]}>
        <View style={styles.iconContainer}>
          <Text style={styles.starText}>⭐</Text>
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>
            +{xpAwarded} XP Earned!
          </Text>
          <Text style={styles.subtitle}>
            Level {level} · {totalXp} total XP{currentStreak ? ` · ${currentStreak} day streak` : ''}
          </Text>
          {newBadge && (
            <Text style={styles.badge}>
              🏆 New Rank: {newBadge}
            </Text>
          )}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    left: 16,
    right: 16,
    borderRadius: 16,
    padding: 16,
    zIndex: 9999,
    elevation: 10,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  starText: {
    fontSize: 20,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontFamily: F.header,
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: F.bodyMed,
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  badge: {
    fontFamily: F.header,
    fontSize: 13,
    color: '#FFD700',
    marginTop: 4,
  },
});
