import React, { useMemo, useState, useEffect } from "react";
import { View, Text, StyleSheet, StatusBar as RNStatusBar, TouchableOpacity, ScrollView, Dimensions, Pressable, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInUp, FadeIn, Layout, useSharedValue, useAnimatedStyle, withSpring, withTiming, Easing, withRepeat, withSequence, FadeInDown, interpolate, Extrapolation } from "react-native-reanimated";
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons as Icon, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Line, Text as SvgText, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { ThemeColors, F } from "../theme";
import MeshGradientBackground from "../components/MeshGradientBackground";
import ActivityRings from "../components/charts/ActivityRings";
import RadarChart from "../components/charts/RadarChart";
import BarChart from "../components/charts/BarChart";
import SplineChart from "../components/charts/SplineChart";
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

import { 
  fetchOverview, 
  fetchFitnessScore, 
  fetchWorkouts, 
  fetchCalories, 
  fetchWeight, 
  fetchStrength,
  fetchSummary,
  fetchStreak as fetchAnalyticsStreak,
} from '../services/api/analytics';
import { fetchWorkoutHistory } from '../services/api/workout';
import { apiClient } from '../services/api/client';
import { socket } from '../services/socket/socketClient';

const SCREEN_W = Dimensions.get('window').width;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TIME_FILTERS = [
  { id: '7d', label: '7D' },
  { id: '30d', label: '30D' },
  { id: '90d', label: '90D' },
  { id: '1y', label: '1Y' }
];

// ─── Skeleton pulse ───────────────────────────────────────────
function Skeleton({ width, height, borderRadius = 8, style }: any) {
  const { C } = useTheme();
  const opacity = useSharedValue(0.3);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ), -1, true
    );
  }, []);
  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[{ width, height, borderRadius, backgroundColor: C.surfaceVariant }, style, animStyle]} />;
}

function AnimatedNumber({ value, suffix = '', prefix = '', style, isFloat = false }: any) {
  return (
    <Animated.Text entering={FadeIn.duration(400)} style={style}>
      {prefix}{isFloat ? Number(value).toFixed(1) : Math.round(Number(value))}{suffix}
    </Animated.Text>
  );
}

function PulseDot() {
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withTiming(0.4, { duration: 900 }), withTiming(1, { duration: 900 })),
      -1, true
    );
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: pulse.value }));
  return <Animated.View style={[{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ade80' }, style]} />;
}

// ─── Section header ──────────────────────────────────────────
function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const { C } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, marginTop: 4 }}>
      <Text style={{ fontFamily: F.header, fontSize: 16, letterSpacing: -0.3, color: C.onSurface }}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={() => { Haptics.selectionAsync(); onAction?.(); }}>
          <Text style={{ fontFamily: F.header, fontSize: 12, color: C.primary }}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Bento card ────────────────────────────────────────────
function BentoCard({ children, style, enteringDelay = 0 }: any) {
  const { C } = useTheme();
  return (
    <Animated.View
      entering={FadeInDown.delay(enteringDelay).springify().damping(16).mass(0.9)}
      style={[{
        backgroundColor: C.surface,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: C.border,
        overflow: 'hidden',
      }, style]}
    >
      {children}
    </Animated.View>
  );
}

// ─── Pressable card ─────────────────────────────────────────
function PressableCard({ children, style, entering }: any) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable
      onPressIn={() => { scale.value = withSpring(0.97, { damping: 15, stiffness: 300 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
      style={{ flex: 1 }}
    >
      <Animated.View entering={entering} layout={Layout.springify()} style={[style, animStyle]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

export default function AnalyticsScreen({ navigation, onNavigateToNotifications, onNavigateBack }: any) {
  const { isDark, C, bgColors } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => getStyles(C), [C]);
  const userId = user?.id || '';

  const [selectedFilter, setSelectedFilter] = useState('7d');
  const [aiExpanded, setAiExpanded] = useState(false);

  const queryKey = ['analytics', userId];

  const { data: overview } = useQuery({
    queryKey: ['analyticsOverview', userId],
    queryFn: () => fetchOverview(userId),
    enabled: !!userId,
  });

  const { data: fitnessScore, isLoading: isScoreLoading } = useQuery({
    queryKey: ['fitnessScore', userId],
    queryFn: () => fetchFitnessScore(userId),
    enabled: !!userId,
  });

  const { data: history, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['workoutHistory', userId],
    queryFn: () => fetchWorkoutHistory(userId),
    enabled: !!userId,
  });

  const { data: weightData, isLoading: isWeightLoading } = useQuery({
    queryKey: ['weight', userId],
    queryFn: () => fetchWeight(userId),
    enabled: !!userId,
  });

  const { data: strengthData, isLoading: isStrengthLoading } = useQuery({
    queryKey: ['strength', userId],
    queryFn: () => fetchStrength(userId),
    enabled: !!userId,
  });

  const { data: caloriesData, isLoading: isCaloriesLoading } = useQuery({
    queryKey: ['calories', selectedFilter, userId],
    queryFn: () => fetchCalories(selectedFilter, userId),
    enabled: !!userId,
  });

  const { data: workoutsData, isLoading: isWorkoutsLoading } = useQuery({
    queryKey: ['workouts', selectedFilter, userId],
    queryFn: () => fetchWorkouts(selectedFilter, userId),
    enabled: !!userId,
  });

  const { data: insights, isLoading: isInsightsLoading } = useQuery({
    queryKey: ['aiSummary', userId],
    queryFn: () => fetchSummary(userId),
    enabled: !!userId,
  });

  const { data: streakData } = useQuery({
    queryKey: ['streak', userId],
    queryFn: () => fetchAnalyticsStreak(userId),
    enabled: !!userId,
  });

  const { data: nutritionDash } = useQuery({
    queryKey: ['nutritionDashboard', userId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/nutrition/dashboard?userId=${userId}`);
      return data;
    },
    enabled: !!userId,
  });

  // Live socket updates
  useEffect(() => {
    if (!userId) return;
    const qc = require('@tanstack/react-query').useQueryClient;
    // Can't use hooks inside effect, so just connect
    socket.emit('join_room', userId);
  }, [userId]);

  const completedCount = history?.length || 0;
  const handleFilterSelect = (filterId: string) => {
    Haptics.selectionAsync();
    setSelectedFilter(filterId);
  };

  const userGoal = overview?.goal || 'Build Muscle';
  const userName = overview?.name || user?.name || 'Athlete';

  return (
    <View style={styles.container}>
      <RNStatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <MeshGradientBackground bgColors={bgColors} isDark={isDark} />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        
        {/* ── Header ─────────────────────────────────────── */}

        <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14 }]}>
          <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); (onNavigateBack || navigation?.goBack)?.(); }} 
            style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
            <Icon name="arrow-back" size={20} color={C.onSurface} />
          </TouchableOpacity>
          <View>
            <Text style={{ fontFamily: F.header, fontSize: 18, letterSpacing: -0.5, color: C.onSurface, textAlign: 'center' }}>Progress</Text>
            <Text style={{ fontFamily: F.bodyMed, fontSize: 11, color: C.onSurfaceVariant, textAlign: 'center' }}>{userGoal}</Text>
          </View>
          <TouchableOpacity onPress={() => { Haptics.selectionAsync(); onNavigateToNotifications?.(); }}
            style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
            <Icon name="notifications" size={18} color={C.onSurface} />
          </TouchableOpacity>
        </View>

        {/* ── Welcome strip ──────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(50).springify().damping(18)} style={{ paddingHorizontal: 20, marginBottom: 8 }}>
          <Text style={{ fontFamily: F.header, fontSize: 26, letterSpacing: -1.2, color: C.onSurface }}>Hey, {userName.split(' ')[0]}</Text>
          <Text style={{ fontFamily: F.bodyMed, fontSize: 13, color: C.onSurfaceVariant, marginTop: 2 }}>
            {fitnessScore ? `Score: ${fitnessScore.score}/100 · ${fitnessScore.streak} day streak` : 'Loading your stats...'}
          </Text>
        </Animated.View>

        {/* ── Segmented Control ──────────────────────────── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', backgroundColor: C.surface, borderRadius: 14, padding: 3, borderWidth: 1, borderColor: C.border }}>
            {TIME_FILTERS.map(filter => {
              const isActive = selectedFilter === filter.id;
              return (
                <TouchableOpacity
                  key={filter.id}
                  onPress={() => handleFilterSelect(filter.id)}
                  style={{ flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 11, backgroundColor: isActive ? C.primary : 'transparent' }}
                >
                  <Text style={{ fontFamily: F.header, fontSize: 12, color: isActive ? C.onPrimary : C.onSurfaceVariant }}>{filter.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <ScrollView 
          style={{ flex: 1 }} 
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140, gap: 16 }}
          showsVerticalScrollIndicator={false}
        >

          {/* ═══ FITNESS SCORE — HERO ═══ */}
          <BentoCard enteringDelay={100} style={{}}>
            <LinearGradient colors={[`${C.primary}12`, 'transparent']} style={StyleSheet.absoluteFillObject} />
            <View style={{ padding: 18 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <Icon name="auto-awesome" size={14} color={C.primary} />
                    <Text style={{ fontFamily: F.header, fontSize: 11, letterSpacing: 1.2, color: C.primary, textTransform: 'uppercase' }}>Fitness Score</Text>
                  </View>
                  {isScoreLoading ? (
                    <Skeleton width={100} height={36} />
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                      <AnimatedNumber value={fitnessScore?.score || 0} style={{ fontFamily: F.num, fontSize: 40, letterSpacing: -2, color: C.onSurface }} />
                      <Text style={{ fontFamily: F.header, fontSize: 16, color: C.onSurfaceVariant, marginBottom: 4 }}>/100</Text>
                    </View>
                  )}
                  {fitnessScore?.motivation && (
                    <Text style={{ fontFamily: F.bodyMed, fontSize: 12, color: C.success, marginTop: 4 }}>{fitnessScore.motivation}</Text>
                  )}
                </View>

                {!isScoreLoading && (
                  <View style={{ width: 90, height: 90, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityRings 
                      size={90} 
                      rings={[{ progress: (fitnessScore?.score || 0) / 100, color: C.primary, radius: 38, strokeWidth: 8 }]} 
                    />
                    <View style={{ position: 'absolute', alignItems: 'center' }}>
                      <Text style={{ fontFamily: F.num, fontSize: 20, color: C.onSurface }}>{fitnessScore?.score || 0}</Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Sub-scores row */}
              {fitnessScore && (
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border, paddingTop: 14 }}>
                  {[
                    { label: 'Consistency', value: fitnessScore.consistencyScore || 0, color: '#4ade80' },
                    { label: 'Recovery', value: fitnessScore.recoveryScore || 0, color: '#38bdf8' },
                    { label: 'Streak', value: fitnessScore.streakScore || 0, color: '#f59e0b' },
                  ].map((m, i) => (
                    <View key={m.label} style={{ flex: 1, alignItems: 'center' }}>
                      <View style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: m.color, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontFamily: F.num, fontSize: 13, color: C.onSurface }}>{m.value}</Text>
                      </View>
                      <Text style={{ fontFamily: F.bodyMed, fontSize: 9, color: C.onSurfaceVariant, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{m.label}</Text>
                    </View>
                  ))}
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.primary + '20', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontFamily: F.num, fontSize: 13, color: C.primary }}>{streakData?.currentStreak || fitnessScore?.streak || 0}</Text>
                    </View>
                    <Text style={{ fontFamily: F.bodyMed, fontSize: 9, color: C.onSurfaceVariant, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Streak</Text>
                  </View>
                </View>
              )}
            </View>
          </BentoCard>

          {/* ═══ WORKOUTS & CALORIES ═══ */}
          <SectionHeader title="Training" />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            
            {/* Workouts */}
            <BentoCard enteringDelay={200} style={{ flex: 1, padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <Icon name="fitness-center" size={16} color={C.primary} />
                <Text style={{ fontFamily: F.header, fontSize: 11, letterSpacing: 0.8, color: C.onSurfaceVariant, textTransform: 'uppercase' }}>Workouts</Text>
              </View>
              {isWorkoutsLoading ? (
                <View style={{ alignItems: 'center', gap: 8 }}><Skeleton width={64} height={64} borderRadius={32} /><Skeleton width={80} height={14} /></View>
              ) : (
                <>
                  <View style={{ alignItems: 'center', marginBottom: 8 }}>
                    <ActivityRings 
                      size={72}
                      rings={[{ progress: (workoutsData?.completionPct || 0) / 100, color: C.primary, radius: 30, strokeWidth: 7 }]}
                    />
                    <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
                      <Text style={{ fontFamily: F.num, fontSize: 16, color: C.onSurface }}>{workoutsData?.completionPct || 0}%</Text>
                    </View>
                  </View>
                  <View style={{ gap: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontFamily: F.bodyMed, fontSize: 10, color: C.onSurfaceVariant }}>Completed</Text>
                      <Text style={{ fontFamily: F.num, fontSize: 12, color: C.onSurface }}>{workoutsData?.completed || 0}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontFamily: F.bodyMed, fontSize: 10, color: C.onSurfaceVariant }}>Missed</Text>
                      <Text style={{ fontFamily: F.num, fontSize: 12, color: '#f87171' }}>{workoutsData?.missed || 0}</Text>
                    </View>
                  </View>
                </>
              )}
            </BentoCard>

            {/* Calories */}
            <BentoCard enteringDelay={250} style={{ flex: 1, padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <Icon name="local-fire-department" size={16} color="#f97316" />
                <Text style={{ fontFamily: F.header, fontSize: 11, letterSpacing: 0.8, color: C.onSurfaceVariant, textTransform: 'uppercase' }}>Calories</Text>
              </View>
              {isCaloriesLoading ? (
                <View><Skeleton width={80} height={20} /><Skeleton width="100%" height={50} style={{ marginTop: 8 }} /></View>
              ) : (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                    <Text style={{ fontFamily: F.num, fontSize: 26, letterSpacing: -1, color: C.onSurface }}>{caloriesData?.total || 0}</Text>
                    <Text style={{ fontFamily: F.bodyMed, fontSize: 10, color: C.onSurfaceVariant }}>kcal</Text>
                  </View>
                  <Text style={{ fontFamily: F.bodyMed, fontSize: 10, color: C.onSurfaceVariant, marginTop: 1 }}>Avg {caloriesData?.dailyAvg || 0}/day</Text>
                  <View style={{ height: 46, marginTop: 10 }}>
                    {caloriesData?.chartData?.length > 0 ? (
                      <BarChart data={caloriesData.chartData} height={46} color="#f97316" hideLabels />
                    ) : (
                      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontFamily: F.bodyMed, fontSize: 10, color: C.onSurfaceVariant }}>No data</Text>
                      </View>
                    )}
                  </View>
                </>
              )}
            </BentoCard>

          </View>

          {/* ═══ WEIGHT & STRENGTH ═══ */}
          <SectionHeader title="Body & Strength" />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            
            {/* Weight */}
            <BentoCard enteringDelay={300} style={{ flex: 1, padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Icon name="monitor-weight" size={16} color="#38bdf8" />
                <Text style={{ fontFamily: F.header, fontSize: 11, letterSpacing: 0.8, color: C.onSurfaceVariant, textTransform: 'uppercase' }}>Weight</Text>
              </View>
              {isWeightLoading ? (
                <Skeleton width={60} height={20} />
              ) : (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
                    <AnimatedNumber value={weightData?.current || 0} isFloat style={{ fontFamily: F.num, fontSize: 28, letterSpacing: -1, color: C.onSurface }} />
                    <Text style={{ fontFamily: F.bodyMed, fontSize: 12, color: C.onSurfaceVariant }}>kg</Text>
                  </View>
                  {weightData?.change !== 0 && weightData?.current > 0 && (
                    <Text style={{ fontFamily: F.header, fontSize: 11, color: (weightData?.change || 0) <= 0 ? C.success : '#f87171', marginTop: 2 }}>
                      {(weightData?.change || 0) <= 0 ? '↓' : '↑'} {Math.abs(weightData?.change || 0)} kg
                    </Text>
                  )}
                  {weightData?.current === 0 && (
                    <Text style={{ fontFamily: F.bodyMed, fontSize: 11, color: C.onSurfaceVariant, marginTop: 2 }}>Log weight in profile</Text>
                  )}
                </>
              )}
            </BentoCard>

            {/* Strength */}
            <BentoCard enteringDelay={350} style={{ flex: 1, padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Icon name="fitness-center" size={16} color={C.primary} />
                <Text style={{ fontFamily: F.header, fontSize: 11, letterSpacing: 0.8, color: C.onSurfaceVariant, textTransform: 'uppercase' }}>Strength</Text>
              </View>
              {isStrengthLoading ? (
                <Skeleton width={90} height={90} borderRadius={45} style={{ alignSelf: 'center' }} />
              ) : strengthData?.radarData?.length > 0 ? (
                <View style={{ alignItems: 'center' }}>
                  <RadarChart data={strengthData.radarData} size={90} color={C.primary} />
                </View>
              ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: F.bodyMed, fontSize: 11, color: C.onSurfaceVariant }}>No data</Text>
                </View>
              )}
            </BentoCard>

          </View>

          {/* ═══ WEEKLY LOAD CHART ═══ */}
          <SectionHeader title="Weekly Load" />
          <BentoCard enteringDelay={400} style={{ padding: 16 }}>
            <View style={{ height: 110 }}>
              {workoutsData?.chartData?.length > 0 ? (
                <BarChart data={workoutsData.chartData} height={90} color={C.primary} />
              ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="fitness-center" size={32} color={C.onSurfaceVariant} style={{ opacity: 0.3 }} />
                  <Text style={{ fontFamily: F.bodyMed, fontSize: 12, color: C.onSurfaceVariant, marginTop: 8 }}>Complete a workout to see your weekly load</Text>
                </View>
              )}
            </View>
          </BentoCard>

          {/* ═══ AI INSIGHTS ═══ */}
          <SectionHeader title="AI Insights" />
          <BentoCard enteringDelay={450} style={{ padding: 18 }}>
            <TouchableOpacity onPress={() => { Haptics.selectionAsync(); setAiExpanded(!aiExpanded); }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="auto-awesome" size={14} color={C.onPrimary} />
                </View>
                <Text style={{ flex: 1, fontFamily: F.header, fontSize: 14, color: C.onSurface }}>Coach Summary</Text>
                <Icon name={aiExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={18} color={C.onSurfaceVariant} />
              </View>
            </TouchableOpacity>
            
            {isInsightsLoading ? (
              <View style={{ gap: 6 }}><Skeleton width="100%" height={14} /><Skeleton width="85%" height={14} /></View>
            ) : (
              <>
                <Text style={{ fontFamily: F.body, fontSize: 13, color: C.onSurfaceVariant, lineHeight: 20 }}>
                  {insights?.progressText || 'Keep training consistently! Your data will unlock AI-powered insights.'}
                </Text>
                
                {insights?.suggestions?.length > 0 && aiExpanded && (
                  <View style={{ marginTop: 12, gap: 8 }}>
                    <Text style={{ fontFamily: F.header, fontSize: 11, letterSpacing: 0.8, color: C.primary, textTransform: 'uppercase' }}>Suggestions</Text>
                    {insights.suggestions.map((s: any, i: number) => (
                      <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                        <Text style={{ color: C.primary, fontFamily: F.header, fontSize: 12 }}>•</Text>
                        <Text style={{ fontFamily: F.body, fontSize: 12, color: C.onSurfaceVariant, flex: 1 }}>{s.name || s}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}
          </BentoCard>

          {/* ═══ NUTRITION ═══ */}
          <SectionHeader title="Nutrition" />
          <BentoCard enteringDelay={500} style={{ padding: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <MaterialCommunityIcons name="food-apple-outline" size={20} color={C.primary} />
              <Text style={{ fontFamily: F.header, fontSize: 12, letterSpacing: 0.6, color: C.onSurfaceVariant, textTransform: 'uppercase', flex: 1 }}>Today's Intake</Text>
            </View>

            {nutritionDash ? (
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {[
                  { label: 'Calories', value: `${nutritionDash.calories || 0}`, unit: 'kcal', color: '#f97316' },
                  { label: 'Protein', value: `${nutritionDash.protein || 0}`, unit: 'g', color: '#4ade80' },
                  { label: 'Carbs', value: `${nutritionDash.carbs || 0}`, unit: 'g', color: '#38bdf8' },
                  { label: 'Fat', value: `${nutritionDash.fat || 0}`, unit: 'g', color: '#f59e0b' },
                ].map(m => (
                  <View key={m.label} style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ fontFamily: F.num, fontSize: 16, letterSpacing: -0.5, color: C.onSurface }}>{m.value}</Text>
                    <Text style={{ fontFamily: F.bodyMed, fontSize: 8, color: C.onSurfaceVariant, marginTop: 2 }}>{m.label}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={{ fontFamily: F.bodyMed, fontSize: 12, color: C.onSurfaceVariant }}>Log your meals to see nutrition data</Text>
            )}
          </BentoCard>

          <View style={{ height: 20 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const getStyles = (C: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
});
