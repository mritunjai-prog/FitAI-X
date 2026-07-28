import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Dimensions, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp, FadeIn, FadeOut, useSharedValue, useAnimatedStyle, withSpring, interpolate, Extrapolation, useAnimatedScrollHandler, withTiming, Layout } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';

import { fetchCurrentWorkout } from '../services/api/workout';
import { fetchVitals } from '../services/api/dashboard';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors, F } from '../theme';
import MeshGradientBackground from '../components/MeshGradientBackground';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── REUSABLE KINETIC PRESSABLE ──────────────────────────────────────────────
function SquishButton({ children, onPress, style }: { children: React.ReactNode, onPress?: () => void, style?: any }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable
      onPressIn={() => { scale.value = withSpring(0.94, { damping: 15, stiffness: 300 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
      onPress={() => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (onPress) onPress();
      }}
      style={style}
    >
      <Animated.View style={animStyle}>{children}</Animated.View>
    </Pressable>
  );
}

// ─── ICON COMPONENT ──────────────────────────────────────────────────────────
function Icon({ name, size = 24, color = "#fff" }: { name: string; size?: number; color?: string }) {
  const paths: Record<string, string> = {
    "arrow-back": "M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z",
    "timer": "M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.03-6.61l1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42A8.962 8.962 0 0012 4c-4.97 0-9 4.03-9 9s4.02 9 9 9 9-4.03 9-9c0-2.12-.74-4.07-1.97-5.61zM12 20c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z",
    "fitness-center": "M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z",
    "auto-awesome": "M12 3l1.9 4.9L19 9l-4.9 1.9L12 16l-1.9-5.1L5 9l5.1-1.9L12 3z",
    "favorite": "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z",
    "trending-up": "M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z",
    "chevron-down": "M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z",
    "play-arrow": "M8 5v14l11-7z",
    "history": "M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"
  };
  return paths[name] ? (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d={paths[name]} />
    </Svg>
  ) : null;
}

// ─── MAIN SCREEN ─────────────────────────────────────────────────────────────
export default function WorkoutHomeScreen({ onNavigateBack, onNavigateToBuilder, onNavigateToActive, onNavigateToHistory }: any) {
  const { C, isDark, bgColors } = useTheme();
  const styles = useMemo(() => getStyles(C, isDark), [C, isDark]);

  const { data: currentWorkout } = useQuery({ queryKey: ['currentWorkout'], queryFn: () => fetchCurrentWorkout() });
  const { data: vitals } = useQuery({ queryKey: ['vitals'], queryFn: fetchVitals });

  const [aiWhyOpen, setAiWhyOpen] = useState(false);

  // Scroll Parallax Engine
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => { scrollY.value = e.contentOffset.y; }
  });

  const headerBlurStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 40], [0, 1], Extrapolation.CLAMP)
  }));

  const inlineTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [40, 60], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(scrollY.value, [40, 60], [10, 0], Extrapolation.CLAMP) }]
  }));

  const largeTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 40], [1, 0], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(scrollY.value, [-50, 0, 40], [1.1, 1, 0.9], Extrapolation.CLAMP) }]
  }));

  // Fallback Data
  const exercises = currentWorkout?.exercises?.length ? currentWorkout.exercises : [
    { id: 'm1', name: 'Barbell Bench Press', sets: 4, reps: 8, weight: 80 },
    { id: 'm2', name: 'Incline Dumbbell Press', sets: 3, reps: 10, weight: 30 },
    { id: 'm3', name: 'Overhead Press', sets: 3, reps: 10, weight: 45 },
    { id: 'm4', name: 'Lateral Raises', sets: 4, reps: 15, weight: 12 },
    { id: 'm5', name: 'Tricep Pushdown', sets: 3, reps: 12, weight: 25 },
  ];

  return (
    <View style={styles.safe}>
      <MeshGradientBackground bgColors={bgColors} isDark={isDark} />
      
      {/* ─── Apple-Style Sticky Header ─── */}
      <View style={styles.stickyHeaderContainer}>
        <Animated.View style={[StyleSheet.absoluteFill, headerBlurStyle]}>
          <BlurView intensity={80} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          <View style={styles.headerBorder} />
        </Animated.View>
        
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <SquishButton onPress={onNavigateBack} style={styles.headerIconBtn}>
              <Icon name="arrow-back" size={22} color={C.onSurface} />
            </SquishButton>
            
            {/* Inline Title (Visible on scroll) */}
            <Animated.Text style={[styles.inlineTitle, inlineTitleStyle]}>
              Workout Hub
            </Animated.Text>

            <SquishButton onPress={onNavigateToHistory} style={styles.headerIconBtn}>
              <Icon name="history" size={22} color={C.onSurface} />
            </SquishButton>
          </View>
        </SafeAreaView>
      </View>

      <Animated.ScrollView 
        onScroll={scrollHandler} 
        scrollEventThrottle={16} 
        contentContainerStyle={{ paddingTop: 110, paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 20 }}>
          
          {/* Large Title (Fades out on scroll) */}
          <Animated.Text style={[styles.largeTitle, largeTitleStyle]}>
            Workout Hub
          </Animated.Text>

          {/* ─── Hero Section ─── */}
          <Animated.View entering={FadeInUp.delay(100).springify().damping(15)} style={styles.hero}>
            <LinearGradient 
              colors={isDark ? ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.02)'] : ['rgba(0,0,0,0.08)', 'rgba(0,0,0,0.01)']} 
              style={StyleSheet.absoluteFillObject} 
              start={{x: 0, y: 0}} end={{x: 0, y: 1}} 
            />
            
            <View style={styles.heroPill}>
              <Icon name="auto-awesome" size={12} color={C.primary} />
              <Text style={[styles.heroPillText, { color: C.primary }]}>TODAY'S OPTIMIZED PLAN</Text>
            </View>
            
            <Text style={styles.heroTitle}>{currentWorkout?.title || 'Push Strength'}</Text>
            <Text style={styles.heroSub}>Focus: {currentWorkout?.targetMuscles || 'Chest • Shoulders • Triceps'}</Text>

            {/* Technical Stats using JetBrains Mono */}
            <View style={styles.statsRow}>
              <View style={styles.statGroup}>
                <Icon name="timer" size={18} color={C.primary} />
                <Text style={styles.statTextTech}>{currentWorkout?.duration || '45'}m</Text>
              </View>
              <View style={styles.statGroup}>
                <Icon name="fitness-center" size={18} color={C.primary} />
                <Text style={styles.statTextTech}>{currentWorkout?.exercises?.length || 6} Ex</Text>
              </View>
              <View style={styles.statGroup}>
                <Icon name="trending-up" size={18} color={C.primary} />
                <Text style={styles.statTextTech}>420 kcal</Text>
              </View>
            </View>

            {/* CTA Buttons */}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
              <SquishButton style={[styles.hbtn, { flex: 1.5, backgroundColor: C.primary }]} onPress={onNavigateToActive}>
                <Icon name="play-arrow" size={18} color={C.onPrimary} />
                <Text style={[styles.btnText, { color: C.onPrimary }]}>Start</Text>
              </SquishButton>
              
              <SquishButton style={[styles.hbtn, styles.hbtnSecondary]} onPress={onNavigateToBuilder}>
                <Text style={[styles.btnText, { color: C.onSurface }]}>Customize</Text>
              </SquishButton>
            </View>
          </Animated.View>

          {/* ─── AI Recommendation Card ─── */}
          <Animated.View entering={FadeInUp.delay(200).springify().damping(15)} style={styles.glassCard}>
            {/* Ambient Backlight */}
            <View style={[styles.ambientGlow, { backgroundColor: C.primary }]} />

            <View style={styles.cardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Icon name="auto-awesome" size={18} color={C.primary} />
                <Text style={styles.cardTitle}>AI Recommendation</Text>
              </View>
              <SquishButton onPress={() => setAiWhyOpen(!aiWhyOpen)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={styles.whyText}>Details</Text>
                <Animated.View style={useAnimatedStyle(() => ({ transform: [{ rotate: withTiming(aiWhyOpen ? '180deg' : '0deg') }] }))}>
                  <Icon name="chevron-down" size={18} color={C.onSurfaceVariant} />
                </Animated.View>
              </SquishButton>
            </View>

            <View style={styles.metricsRow}>
              <View style={styles.metricItem}>
                <View style={[styles.metricIconBg, { backgroundColor: 'rgba(74,222,128,0.15)' }]}><Icon name="favorite" size={18} color="#4ade80" /></View>
                <Text style={styles.metricValTech}>{vitals ? Math.round((vitals.recoveryCor + vitals.recoveryUpr) / 2 * 100) : 92}%</Text>
                <Text style={styles.metricLabel}>Recovery</Text>
              </View>
              <View style={styles.metricItem}>
                <View style={[styles.metricIconBg, { backgroundColor: 'rgba(56,189,248,0.15)' }]}><Icon name="timer" size={18} color="#38bdf8" /></View>
                <Text style={styles.metricValTech}>7h 45m</Text>
                <Text style={styles.metricLabel}>Sleep</Text>
              </View>
              <View style={styles.metricItem}>
                <View style={[styles.metricIconBg, { backgroundColor: 'rgba(251,191,36,0.15)' }]}><Icon name="auto-awesome" size={18} color="#fbbf24" /></View>
                <Text style={styles.metricValTech}>High</Text>
                <Text style={styles.metricLabel}>Readiness</Text>
              </View>
            </View>

            <Text style={styles.insightText}>
              {currentWorkout?.aiExplanation || "Chest fully recovered. Increase pushing volume by 8% for better results based on your logged history."}
            </Text>

            {/* Fluid Accordion Expansion */}
            {aiWhyOpen && (
              <Animated.View entering={FadeInUp.springify().damping(15)} exiting={FadeOut.duration(200)} layout={Layout.springify().damping(15)}>
                <View style={styles.accordionContent}>
                  <Text style={styles.insightText}>
                    Rest periods trimmed slightly given strong HRV this morning. Ready for high intensity.
                  </Text>
                </View>
              </Animated.View>
            )}
          </Animated.View>

          {/* ─── Inset Grouped Exercises List ─── */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginTop: 12, paddingHorizontal: 4 }}>
            <Text style={styles.listSectionTitle}>TODAY'S EXERCISES</Text>
            <SquishButton onPress={onNavigateToBuilder}>
              <Text style={styles.seeAllText}>Edit</Text>
            </SquishButton>
          </View>

          <Animated.View entering={FadeInUp.delay(300).springify().damping(15)} style={styles.insetGroup}>
            {exercises.map((ex: any, i: number) => {
              const isLast = i === exercises.length - 1;
              return (
                <View key={ex.id || i} style={[styles.exerciseRow, !isLast && styles.exerciseRowBorder]}>
                  <View style={styles.exNum}>
                    <Text style={styles.exNumText}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1, marginHorizontal: 14 }}>
                    <Text style={styles.exName}>{ex.name}</Text>
                    <Text style={styles.exDetailsTech}>{ex.sets}x{ex.reps} • {ex.weight}kg</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.exCalsTech}>~{Math.round(ex.sets * ex.reps * 0.8)}</Text>
                    <Text style={styles.exCalsLabel}>kcal</Text>
                  </View>
                </View>
              );
            })}
          </Animated.View>

        </View>
      </Animated.ScrollView>

      {/* ─── Dissolving Bottom CTA ─── */}
      <View style={styles.bottomCtaWrapper}>
        <LinearGradient colors={['transparent', C.bg]} style={StyleSheet.absoluteFillObject} />
        <SafeAreaView edges={['bottom']}>
          <SquishButton style={[styles.floatingCta, { backgroundColor: C.primary }]} onPress={onNavigateToActive}>
            <Text style={[styles.ctaText, { color: C.onPrimary }]}>Lock & Start Workout</Text>
          </SquishButton>
        </SafeAreaView>
      </View>

    </View>
  );
}

// ─── DYNAMIC STYLES ──────────────────────────────────────────────────────────
const getStyles = (C: ThemeColors, isDark: boolean) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  
  // Header
  stickyHeaderContainer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50 },
  headerBorder: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, backgroundColor: C.outlineVariant },
  headerContent: { paddingHorizontal: 20, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerIconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.glassInset, alignItems: 'center', justifyContent: 'center' },
  inlineTitle: { fontFamily: F.header, fontSize: 18, color: C.onSurface, position: 'absolute', left: 0, right: 0, textAlign: 'center', zIndex: -1 },
  largeTitle: { fontFamily: F.header, fontSize: 34, color: C.onSurface, letterSpacing: -1, marginBottom: 20 },

  // Hero Card
  hero: { borderRadius: 32, backgroundColor: C.glassInset, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 20, marginBottom: 24, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 15 }, shadowOpacity: 0.2, shadowRadius: 30 },
  heroPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start', marginBottom: 12 },
  heroPillText: { fontFamily: F.header, fontSize: 11, letterSpacing: 1.5 },
  heroTitle: { color: C.onSurface, fontFamily: F.header, fontSize: 26, lineHeight: 30, letterSpacing: -0.5, marginBottom: 4 },
  heroSub: { color: C.onSurfaceVariant, fontFamily: F.bodyMed, fontSize: 14 },
  
  // Technical Stats
  statsRow: { flexDirection: 'row', gap: 24, marginTop: 16 },
  statGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statTextTech: { color: C.onSurface, fontFamily: 'JetBrainsMono-Regular', fontSize: 14 },
  
  // Buttons
  hbtn: { padding: 14, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  hbtnSecondary: { flex: 1, backgroundColor: C.glassInset, borderWidth: 1, borderColor: C.outlineVariant },
  btnText: { fontFamily: F.header, fontSize: 15 },

  // AI Card & Glow
  glassCard: { backgroundColor: C.glassInset, borderWidth: 1, borderColor: C.outlineVariant, borderRadius: 28, padding: 20, marginBottom: 24, overflow: 'hidden' },
  ambientGlow: { position: 'absolute', top: -50, right: -50, width: 150, height: 150, borderRadius: 75, filter: 'blur(40px)', opacity: 0.15 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardTitle: { color: C.onSurface, fontFamily: F.header, fontSize: 17, letterSpacing: -0.3 },
  whyText: { color: C.onSurfaceVariant, fontFamily: F.bodyBold, fontSize: 13 },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)', borderRadius: 20, padding: 12 },
  metricItem: { alignItems: 'center', gap: 6 },
  metricIconBg: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  metricValTech: { color: C.onSurface, fontFamily: 'JetBrainsMono-Regular', fontSize: 15 },
  metricLabel: { color: C.onSurfaceVariant, fontFamily: F.bodyMed, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  insightText: { color: C.onSurface, fontFamily: F.body, fontSize: 14, lineHeight: 22 },
  accordionContent: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: C.outlineVariant },

  // Inset Grouped List
  listSectionTitle: { color: C.onSurfaceVariant, fontFamily: F.header, fontSize: 12, letterSpacing: 1.5 },
  seeAllText: { color: C.primary, fontFamily: F.header, fontSize: 14 },
  insetGroup: { backgroundColor: C.glassInset, borderRadius: 24, borderWidth: 1, borderColor: C.outlineVariant, overflow: 'hidden' },
  exerciseRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, backgroundColor: 'transparent' },
  exerciseRowBorder: { borderBottomWidth: 1, borderBottomColor: C.outlineVariant },
  exNum: { width: 32, height: 32, borderRadius: 16, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', alignItems: 'center', justifyContent: 'center' },
  exNumText: { color: C.onSurfaceVariant, fontFamily: 'JetBrainsMono-Regular', fontSize: 13 },
  exName: { color: C.onSurface, fontFamily: F.header, fontSize: 16, marginBottom: 4, letterSpacing: -0.3 },
  exDetailsTech: { color: C.primary, fontFamily: 'JetBrainsMono-Regular', fontSize: 12 },
  exCalsTech: { color: C.onSurface, fontFamily: 'JetBrainsMono-Regular', fontSize: 15 },
  exCalsLabel: { color: C.onSurfaceVariant, fontFamily: F.bodyMed, fontSize: 10, marginTop: 2 },

  // Floating CTA
  bottomCtaWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingTop: 60, paddingBottom: Platform.OS === 'ios' ? 10 : 24, pointerEvents: 'box-none' },
  floatingCta: { borderRadius: 100, paddingVertical: 20, alignItems: 'center', shadowColor: C.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  ctaText: { fontFamily: F.header, fontSize: 17, letterSpacing: 0.5 }
});
