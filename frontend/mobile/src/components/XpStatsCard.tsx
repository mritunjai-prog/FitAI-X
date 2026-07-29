import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence, Easing, FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { F } from '../theme';

const LEVEL_COLORS: Record<string, string[]> = {
  'iron': ['#8B8B8B', '#5C5C5C'],
  'bronze': ['#CD7F32', '#8B5E3C'],
  'silver': ['#C0C0C0', '#8A8A8A'],
  'gold': ['#FFD700', '#B8960C'],
  'platinum': ['#E5E4E2', '#A8A8A8'],
  'diamond': ['#B9F2FF', '#4FC3F7'],
  'elite': ['#FF6B6B', '#D32F2F'],
  'legend': ['#FFD700', '#FF6B00'],
};

const BADGE_EMOJIS = ['🥉', '🥈', '🥇', '💎', '🔥', '👑', '⭐', '🌟'];
const BADGE_NAMES = ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Elite', 'Legend'];

interface XpStats {
  totalXp: number;
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  streak: number;
  longestStreak: number;
  weeklyWorkouts: number;
  totalWorkouts: number;
  xpProgressPct: number;
}

export default function XpStatsCard({ stats, compact = false }: { stats?: XpStats; compact?: boolean }) {
  const { C } = useTheme();
  const progress = useSharedValue(0);
  const glow = useSharedValue(0.6);

  useEffect(() => {
    if (stats?.xpProgressPct) {
      progress.value = withTiming(stats.xpProgressPct / 100, { duration: 1000, easing: Easing.out(Easing.cubic) });
    }
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      ), -1, true
    );
  }, [stats?.xpProgressPct]);

  const progressStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));

  if (!stats) return null;

  const badgeIndex = Math.min(stats.level - 1, BADGE_NAMES.length - 1);
  const badgeName = BADGE_NAMES[Math.max(0, badgeIndex)];
  const badgeEmoji = BADGE_EMOJIS[Math.max(0, badgeIndex)];
  const levelColors = LEVEL_COLORS[badgeName.toLowerCase()] || LEVEL_COLORS.iron;

  if (compact) {
    return (
      <Animated.View entering={FadeIn.duration(300)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: `${C.primary}20`, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 18 }}>{badgeEmoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <Text style={{ fontFamily: F.header, fontSize: 13, color: C.onSurface }}>
              Lv.{stats.level} {badgeName}
            </Text>
            <Text style={{ fontFamily: F.num, fontSize: 11, color: C.onSurfaceVariant }}>
              {stats.totalXp} XP
            </Text>
          </View>
          <View style={{ height: 4, borderRadius: 2, backgroundColor: `${C.onSurface}10`, marginTop: 4, overflow: 'hidden' }}>
            <Animated.View style={[{ height: '100%', borderRadius: 2, backgroundColor: C.primary }, progressStyle]} />
          </View>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeIn.duration(400)} style={{ paddingTop: 8 }}>
      <LinearGradient
        colors={[`${levelColors[0]}25`, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 16, padding: 16, borderWidth: 1, borderColor: `${levelColors[0]}30` }}
      >
        {/* Level badge */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: `${levelColors[0]}20`, alignItems: 'center', justifyContent: 'center' }}>
            <Animated.View style={[{ position: 'absolute', width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: levelColors[0] }, glowStyle]} />
            <Text style={{ fontSize: 24 }}>{badgeEmoji}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.header, fontSize: 18, letterSpacing: -0.5, color: C.onSurface }}>
              Level {stats.level} {badgeName}
            </Text>
            <Text style={{ fontFamily: F.bodyMed, fontSize: 12, color: C.onSurfaceVariant, marginTop: 2 }}>
              {stats.totalXp} Total XP · {stats.weeklyWorkouts} workouts this week
            </Text>
          </View>
        </View>

        {/* XP Progress */}
        <View style={{ marginTop: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ fontFamily: F.bodyMed, fontSize: 11, color: C.onSurfaceVariant }}>Level Progress</Text>
            <Text style={{ fontFamily: F.num, fontSize: 11, color: C.primary }}>
              {stats.currentLevelXp} / {stats.nextLevelXp} XP
            </Text>
          </View>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: `${C.onSurface}10`, overflow: 'hidden' }}>
            <Animated.View style={[{ height: '100%', borderRadius: 4, backgroundColor: levelColors[0] }, progressStyle]} />
          </View>
        </View>

        {/* Quick stats */}
        <View style={{ flexDirection: 'row', gap: 16, marginTop: 14, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: `${C.onSurface}15` }}>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text style={{ fontFamily: F.num, fontSize: 18, color: C.onSurface }}>{stats.streak}</Text>
            <Text style={{ fontFamily: F.header, fontSize: 9, letterSpacing: 0.7, color: C.onSurfaceVariant, marginTop: 2 }}>STREAK</Text>
          </View>
          <View style={{ width: StyleSheet.hairlineWidth, backgroundColor: `${C.onSurface}10` }} />
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text style={{ fontFamily: F.num, fontSize: 18, color: C.onSurface }}>{stats.totalWorkouts}</Text>
            <Text style={{ fontFamily: F.header, fontSize: 9, letterSpacing: 0.7, color: C.onSurfaceVariant, marginTop: 2 }}>WORKOUTS</Text>
          </View>
          <View style={{ width: StyleSheet.hairlineWidth, backgroundColor: `${C.onSurface}10` }} />
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text style={{ fontFamily: F.num, fontSize: 18, color: C.onSurface }}>{stats.longestStreak}</Text>
            <Text style={{ fontFamily: F.header, fontSize: 9, letterSpacing: 0.7, color: C.onSurfaceVariant, marginTop: 2 }}>BEST</Text>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}
