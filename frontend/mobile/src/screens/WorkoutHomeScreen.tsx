import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInUp, useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, interpolate, Extrapolation, useAnimatedScrollHandler } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, Rect, Ellipse, Defs, LinearGradient as SvgLinearGradient, Stop, RadialGradient } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';
import { fetchCurrentWorkout } from '../services/api/workout';
import { fetchVitals } from '../services/api/dashboard';
import { useTheme } from '../context/ThemeContext';
import { F } from '../theme';

const { width: SCREEN_W } = Dimensions.get('window');

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

export default function WorkoutHomeScreen({ onNavigateBack, onNavigateToBuilder, onNavigateToActive, onNavigateToHistory }: { onNavigateBack: () => void; onNavigateToBuilder: () => void; onNavigateToActive: () => void; onNavigateToHistory: () => void; }) {
  const { C, isDark } = useTheme();
  
  // Custom Premium Theme specific to Workout
  const WP = {
    bg: C.bg,
    card: C.surface,
    card2: C.glassInset,
    purple: '#F5C400',
    violet: '#FFD60A',
    pink: '#FFB300',
    blue: '#CA8A04',
    cyan: '#FDE68A',
    green: '#A3E635',
    text: C.onSurface,
    text2: C.onSurfaceVariant,
    border: C.outlineVariant
  };

  const { data: currentWorkout } = useQuery({ queryKey: ['currentWorkout'], queryFn: () => fetchCurrentWorkout() });
  const { data: vitals } = useQuery({ queryKey: ['vitals'], queryFn: fetchVitals });

  const [aiWhyOpen, setAiWhyOpen] = useState(false);

  // Animations
  const botY = useSharedValue(0);
  useEffect(() => {
    botY.value = withRepeat(withSequence(withTiming(-8, { duration: 1700 }), withTiming(0, { duration: 1700 })), -1, true);
  }, []);

  const botStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: botY.value }]
  }));

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => { scrollY.value = e.contentOffset.y; }
  });

  const haptic = () => { if (Platform.OS !== 'web') Haptics.selectionAsync(); };

  return (
    <View style={{ flex: 1, backgroundColor: WP.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <TouchableOpacity onPress={() => { haptic(); onNavigateBack(); }} style={{ padding: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12 }}>
              <Icon name="arrow-back" size={24} color={WP.text} />
            </TouchableOpacity>
            <Text style={{ fontSize: 20, color: WP.text, fontFamily: F.header }}>Workout Hub</Text>
          </View>
          <TouchableOpacity onPress={() => { haptic(); onNavigateToHistory(); }} style={{ padding: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12 }}>
            <Icon name="history" size={24} color={WP.text} />
          </TouchableOpacity>
        </View>

        <Animated.ScrollView 
          onScroll={scrollHandler} 
          scrollEventThrottle={16} 
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >


          <View style={{ paddingHorizontal: 16 }}>
            {/* Hero Section */}
          <Animated.View entering={FadeInUp.delay(100)} style={[styles.hero, { backgroundColor: WP.card }]}>
            <LinearGradient colors={['rgba(245,196,0,0.15)', 'transparent']} style={StyleSheet.absoluteFillObject} start={{x:0.75, y:0}} end={{x:1, y:1}} />
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <View style={[styles.heroPill, { backgroundColor: isDark ? 'rgba(253,230,138,0.1)' : 'rgba(202,138,4,0.15)' }]}>
                  <Icon name="auto-awesome" size={12} color={isDark ? WP.cyan : WP.blue} />
                  <Text style={[styles.heroPillText, { color: isDark ? '#FDE9A8' : WP.blue }]}>TODAY'S BEST WORKOUT</Text>
                </View>
                <Text style={[styles.heroTitle, { color: WP.text }]}>{currentWorkout?.title || 'Push Strength'}</Text>
                <Text style={[styles.heroSub, { color: WP.text2 }]}>Focus: {currentWorkout?.targetMuscles || 'Chest • Shoulders • Triceps'}</Text>
              </View>

              {/* Bot SVG */}
              <Animated.View style={[{ width: 96, height: 96, marginTop: -6 }, botStyle]}>
                <Svg viewBox="0 0 150 150" fill="none">
                  <Defs>
                    <SvgLinearGradient id="botBody" x1="0" y1="0" x2="1" y2="1"><Stop offset="0%" stopColor="#FFF8E8"/><Stop offset="100%" stopColor="#E8D9A0"/></SvgLinearGradient>
                    <RadialGradient id="eyeglow" cx="50%" cy="50%" r="50%"><Stop offset="0%" stopColor="#FFE9A8"/><Stop offset="100%" stopColor="#F5C400"/></RadialGradient>
                  </Defs>
                  <Ellipse cx="75" cy="128" rx="30" ry="6" fill="#000" opacity="0.25"/>
                  <Rect x="45" y="60" width="60" height="58" rx="22" fill="url(#botBody)"/>
                  <Circle cx="75" cy="34" r="26" fill="url(#botBody)"/>
                  <Rect x="66" y="6" width="18" height="10" rx="5" fill="#FFD60A"/>
                  <Circle cx="75" cy="4" r="4" fill="#FFD60A"/>
                  <Ellipse cx="65" cy="34" rx="6" ry="7" fill="url(#eyeglow)"/>
                  <Ellipse cx="85" cy="34" rx="6" ry="7" fill="url(#eyeglow)"/>
                  <Path d="M64 46q11 7 22 0" stroke="#B0A488" strokeWidth="2.4" strokeLinecap="round" />
                  <Rect x="58" y="72" width="34" height="6" rx="3" fill="#F5C400" opacity="0.55"/>
                  <Rect x="20" y="66" width="16" height="30" rx="8" fill="url(#botBody)"/>
                  <Rect x="10" y="58" width="14" height="16" rx="7" fill="url(#botBody)" transform="rotate(-25 17 66)"/>
                  <Rect x="114" y="66" width="16" height="30" rx="8" fill="url(#botBody)"/>
                  <Rect x="50" y="118" width="16" height="24" rx="7" fill="url(#botBody)"/>
                  <Rect x="84" y="118" width="16" height="24" rx="7" fill="url(#botBody)"/>
                </Svg>
              </Animated.View>
            </View>

            {/* Stats */}
            <View style={{ flexDirection: 'row', gap: 18, marginVertical: 16 }}>
              <View style={{ gap: 4 }}>
                <Icon name="timer" size={17} color={isDark ? WP.cyan : WP.blue} />
                <Text style={{ color: WP.text, fontFamily: F.header, fontSize: 13.5 }}>{currentWorkout?.duration || '45'} Mins</Text>
              </View>
              <View style={{ gap: 4 }}>
                <Icon name="fitness-center" size={17} color={isDark ? WP.cyan : WP.blue} />
                <Text style={{ color: WP.text, fontFamily: F.header, fontSize: 13.5 }}>{currentWorkout?.exercises?.length || 6} Exercises</Text>
              </View>
              <View style={{ gap: 4 }}>
                <Icon name="trending-up" size={17} color={isDark ? WP.cyan : WP.blue} />
                <Text style={{ color: WP.text, fontFamily: F.header, fontSize: 13.5 }}>~420 kcal</Text>
              </View>
            </View>

            <View style={[styles.heroChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)' }]}>
              <Icon name="fitness-center" size={13} color={WP.text} />
              <Text style={{ color: WP.text, fontFamily: F.header, fontSize: 11.5 }}>{currentWorkout?.difficulty || 'Intermediate'}</Text>
            </View>

            {/* Buttons */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={[styles.hbtn, { flex: 1, backgroundColor: WP.purple }]} onPress={() => { haptic(); onNavigateToActive(); }}>
                <Icon name="play-arrow" size={16} color={WP.bg} />
                <Text style={{ color: WP.bg, fontFamily: F.header, fontSize: 14 }}>Start Workout</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.hbtn, { flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.1)' }]} onPress={() => { haptic(); onNavigateToBuilder(); }}>
                <Text style={{ color: WP.text, fontFamily: F.header, fontSize: 14 }}>Customize</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* AI Recommendation Card */}
          <Animated.View entering={FadeInUp.delay(200)} style={[styles.glassCard, { backgroundColor: WP.card, borderColor: WP.border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Icon name="auto-awesome" size={17} color={WP.cyan} />
                <Text style={{ color: WP.text, fontFamily: F.header, fontSize: 15 }}>AI Recommendation</Text>
              </View>
              <TouchableOpacity onPress={() => { haptic(); setAiWhyOpen(!aiWhyOpen); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ color: WP.text2, fontFamily: F.bodyBold, fontSize: 11.5 }}>Why this workout?</Text>
                <Animated.View style={useAnimatedStyle(() => ({ transform: [{ rotate: withTiming(aiWhyOpen ? '180deg' : '0deg') }] }))}>
                  <Icon name="chevron-down" size={16} color={WP.text2} />
                </Animated.View>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
              <View style={{ alignItems: 'center', gap: 6 }}>
                <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(163,230,53,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="favorite" size={17} color={WP.green} />
                </View>
                <Text style={{ color: WP.text, fontFamily: F.header, fontSize: 13 }}>{vitals ? Math.round((vitals.recoveryCor + vitals.recoveryUpr) / 2 * 100) : 92}%</Text>
                <Text style={{ color: WP.text2, fontFamily: F.body, fontSize: 10 }}>Recovery</Text>
              </View>

              <View style={{ alignItems: 'center', gap: 6 }}>
                <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(245,196,0,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="timer" size={17} color={WP.purple} />
                </View>
                <Text style={{ color: WP.text, fontFamily: F.header, fontSize: 13 }}>7h 45m</Text>
                <Text style={{ color: WP.text2, fontFamily: F.body, fontSize: 10 }}>Sleep</Text>
              </View>

              <View style={{ alignItems: 'center', gap: 6 }}>
                <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(253,230,138,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="auto-awesome" size={17} color={WP.cyan} />
                </View>
                <Text style={{ color: WP.text, fontFamily: F.header, fontSize: 13 }}>High</Text>
                <Text style={{ color: WP.text2, fontFamily: F.body, fontSize: 10 }}>Muscle Readiness</Text>
              </View>
            </View>

            <Text style={{ color: WP.text2, fontFamily: F.body, fontSize: 12.5, lineHeight: 18 }}>
              {currentWorkout?.aiExplanation || "Chest fully recovered. Increase pushing volume by 8% for better results based on your logged history."}
            </Text>

            {aiWhyOpen && (
              <Animated.View entering={FadeInUp.duration(300)} style={{ marginTop: 8 }}>
                <Text style={{ color: WP.text2, fontFamily: F.body, fontSize: 12.5, lineHeight: 18 }}>
                  Rest periods trimmed slightly given strong HRV this morning. Ready for high intensity.
                </Text>
              </Animated.View>
            )}
          </Animated.View>

          {/* Today's Exercises */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 20 }}>
            <Text style={{ color: WP.text, fontFamily: F.header, fontSize: 16 }}>Today's Exercises</Text>
            <TouchableOpacity onPress={() => onNavigateToBuilder()}>
              <Text style={{ color: WP.purple, fontFamily: F.header, fontSize: 12.5 }}>View All</Text>
            </TouchableOpacity>
          </View>

          {(currentWorkout?.exercises?.length ? currentWorkout.exercises : [
            { id: 'm1', name: 'Barbell Bench Press', sets: 4, reps: 8, weight: 80 },
            { id: 'm2', name: 'Incline Dumbbell Press', sets: 3, reps: 10, weight: 30 },
            { id: 'm3', name: 'Overhead Press', sets: 3, reps: 10, weight: 45 },
            { id: 'm4', name: 'Lateral Raises', sets: 4, reps: 15, weight: 12 },
            { id: 'm5', name: 'Tricep Pushdown', sets: 3, reps: 12, weight: 25 },
          ]).map((ex: any, i: number) => (
            <Animated.View key={ex.id || i} entering={FadeInUp.delay(300 + (i * 100))} style={[styles.exerciseCard, { backgroundColor: WP.card, borderColor: WP.border }]}>
              <View style={[styles.exNum, { backgroundColor: WP.card2 }]}><Text style={{ color: WP.text2, fontFamily: F.header, fontSize: 11 }}>{i + 1}</Text></View>
              <View style={{ flex: 1, marginHorizontal: 12 }}>
                <Text style={{ color: WP.text, fontFamily: F.header, fontSize: 13.5, marginBottom: 4 }}>{ex.name}</Text>
                <Text style={{ color: WP.text2, fontFamily: F.body, fontSize: 10.5 }}>{ex.sets} Sets • {ex.reps} Reps • {ex.weight}kg</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: WP.text, fontFamily: F.header, fontSize: 13 }}>~{Math.round(ex.sets * ex.reps * 0.8)}</Text>
                <Text style={{ color: WP.text2, fontFamily: F.body, fontSize: 9.5 }}>kcal</Text>
              </View>
            </Animated.View>
          ))}
          </View>
        </Animated.ScrollView>

        {/* Sticky CTA */}
        <Animated.View entering={FadeInUp.delay(500).springify()} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 34 : 20, paddingTop: 20, backgroundColor: isDark ? 'rgba(10,10,10,0.85)' : 'rgba(255,255,255,0.85)', borderTopWidth: 1, borderTopColor: WP.border }}>
          <BlurView intensity={80} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFillObject} />
          <TouchableOpacity onPress={() => { haptic(); onNavigateToActive(); }} style={{ backgroundColor: WP.violet, paddingVertical: 18, borderRadius: 100, alignItems: 'center', shadowColor: WP.purple, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 15 }}>
            <Text style={{ color: '#000', fontFamily: F.header, fontSize: 16 }}>Lock & Start Workout</Text>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 28,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: 'rgba(255,214,10,0.15)',
    padding: 20,
    marginBottom: 16,
    overflow: 'hidden'
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 10
  },
  heroPillText: {
    color: '#FDE9A8',
    fontFamily: 'Inter_700Bold',
    fontSize: 10.5,
    letterSpacing: 0.4
  },
  heroTitle: {
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
    fontSize: 26,
    lineHeight: 30,
    marginBottom: 4
  },
  heroSub: {
    color: '#E8DFC0',
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    marginBottom: 0
  },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 16
  },
  hbtn: {
    padding: 14,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  },
  glassCard: {
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: 'rgba(255,214,10,0.09)',
    borderRadius: 22,
    padding: 18,
    marginBottom: 16
  },
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: 'rgba(255,214,10,0.09)',
    borderRadius: 18,
    padding: 12,
    marginBottom: 10
  },
  exNum: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: '#101010',
    alignItems: 'center',
    justifyContent: 'center'
  }
});
