import React, { useMemo, useState, useEffect } from "react";
import { View, Text, StyleSheet, StatusBar as RNStatusBar, TouchableOpacity, ScrollView, Dimensions, Pressable, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import Animated, { FadeInUp, FadeIn, Layout, useSharedValue, useAnimatedStyle, withSpring, withTiming, Easing, withRepeat, withSequence } from "react-native-reanimated";
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons as Icon, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';

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
  fetchAiInsights
} from '../services/api/analytics';
import { fetchWorkoutHistory } from '../services/api/workout';

const SCREEN_W = Dimensions.get('window').width;

const TIME_FILTERS = [
  { id: '7d', label: '7D' },
  { id: '30d', label: '30D' },
  { id: '90d', label: '90D' },
  { id: '1y', label: '1Y' }
];

// Helper: Pulse Animation for Skeleton Loader
function Skeleton({ width, height, borderRadius = 8, style }: any) {
  const { C } = useTheme();
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[{ width, height, borderRadius, backgroundColor: C.surfaceVariant }, style, animStyle]} />;
}

// Helper: Animated Number Counter
function AnimatedNumber({ value, suffix = '', prefix = '', style, isFloat = false }: any) {
  return (
    <Animated.Text entering={FadeIn.duration(400)} style={style}>
      {prefix}{isFloat ? Number(value).toFixed(1) : Math.round(Number(value))}{suffix}
    </Animated.Text>
  );
}

function PressableCard({ children, style, entering }: any) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  
  const flattenedStyle = StyleSheet.flatten(style) || {};
  const { flex, ...restStyle } = flattenedStyle as any;

  return (
    <Pressable
      onPressIn={() => { scale.value = withSpring(0.97, { damping: 15, stiffness: 300 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
      style={{ flex }}
    >
      <Animated.View entering={entering} layout={Layout.springify()} style={[restStyle, { flexGrow: 1 }, animStyle]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

export default function AnalyticsScreen({ navigation, onNavigateToNotifications }: any) {
  const { isDark, C, bgColors } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => getStyles(C), [C]);

  const [selectedFilter, setSelectedFilter] = useState('7d');

  const { data: fitnessScore, isLoading: isScoreLoading } = useQuery({ queryKey: ['fitnessScore'], queryFn: fetchFitnessScore });
  const { data: history, isLoading: isHistoryLoading } = useQuery({ queryKey: ['workoutHistory'], queryFn: () => fetchWorkoutHistory() });
  const { data: weightData, isLoading: isWeightLoading } = useQuery({ queryKey: ['weight'], queryFn: fetchWeight });
  const { data: strengthData, isLoading: isStrengthLoading } = useQuery({ queryKey: ['strength'], queryFn: fetchStrength });
  const { data: caloriesData, isLoading: isCaloriesLoading } = useQuery({ queryKey: ['calories', selectedFilter], queryFn: () => fetchCalories(selectedFilter) });
  const { data: workoutsData, isLoading: isWorkoutsLoading } = useQuery({ queryKey: ['workouts', selectedFilter], queryFn: () => fetchWorkouts(selectedFilter) });
  const { data: insights, isLoading: isInsightsLoading } = useQuery({ queryKey: ['aiInsights'], queryFn: fetchAiInsights });
  
  const { data: foodHistory } = useQuery({ queryKey: ['foodHistory', user?.id], queryFn: async () => {
    const res = await (require('../services/api/client').apiClient).get(`/nutrition/history?userId=${user?.id}`);
    return res.data;
  }, enabled: !!user?.id });

  const workoutsCompleted = history?.length || 0;
  const workoutsGoal = 5;

  const handleFilterSelect = (filterId: string) => {
    Haptics.selectionAsync();
    setSelectedFilter(filterId);
  };

  return (
    <View style={styles.container}>
      <RNStatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <MeshGradientBackground bgColors={bgColors} isDark={isDark} />

      {/* Subtle Floating Gradient overlay */}
      <LinearGradient colors={['transparent', `${C.primary}10`, 'transparent']} style={[StyleSheet.absoluteFillObject, { opacity: 0.5 }]} pointerEvents="none" />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation?.goBack?.(); }} style={styles.backBtn}>
              <Icon name="arrow-back" size={20} color={C.onSurfaceVariant} />
            </TouchableOpacity>
            <Text style={styles.title}>Progress & Analytics</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity onPress={() => { Haptics.selectionAsync(); onNavigateToNotifications?.(); }} style={styles.calBtn}>
              <Icon name="notifications" size={18} color={C.onSurfaceVariant} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Haptics.selectionAsync()} style={styles.calBtn}>
              <Icon name="calendar-today" size={18} color={C.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Segmented Control */}
        <View style={styles.segmentWrap}>
          <View style={styles.segment}>
            {TIME_FILTERS.map(filter => {
              const isActive = selectedFilter === filter.id;
              return (
                <TouchableOpacity
                  key={filter.id}
                  onPress={() => handleFilterSelect(filter.id)}
                  style={[styles.segmentBtn, isActive && styles.segmentBtnActive]}
                >
                  <Text style={[styles.segmentTxt, isActive && styles.segmentTxtActive]}>{filter.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <ScrollView 
          style={{ flex: 1 }} 
          contentContainerStyle={{ padding: 20, paddingBottom: 140, gap: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Fitness Score Card */}
          <Animated.View entering={FadeInUp.delay(100).springify().damping(16)} style={[styles.heroCard, { backgroundColor: C.surface }]}>
            <BlurView intensity={isDark ? 40 : 80} tint={C.blurTint} style={StyleSheet.absoluteFillObject} />
            <LinearGradient colors={[`${C.primary}15`, 'transparent']} style={StyleSheet.absoluteFillObject} />
            
            <View style={styles.fscoreTop}>
              <View style={styles.fscoreLeft}>
                <Text style={styles.lbl}>Fitness Score</Text>
                {isScoreLoading ? (
                  <Skeleton width={100} height={40} />
                ) : (
                  <>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
                      <AnimatedNumber value={fitnessScore?.score || 0} style={styles.big} />
                      <Text style={styles.bigSmall}>/100</Text>
                    </View>
                    <Text style={styles.msg}>{fitnessScore?.motivation || 'Great Progress! 🔥'}</Text>
                  </>
                )}
              </View>

              <View style={styles.fscoreRingWrap}>
                {isScoreLoading ? (
                  <Skeleton width={88} height={88} borderRadius={44} />
                ) : (
                  <View style={styles.fscoreRing}>
                    <ActivityRings 
                      size={88} 
                      rings={[{ progress: (fitnessScore?.score || 0) / 100, color: C.primary, radius: 37, strokeWidth: 8 }]} 
                    />
                    <View style={styles.fscoreCenter}>
                      <AnimatedNumber value={fitnessScore?.score || 0} style={styles.fscoreCenterTxt} />
                    </View>
                  </View>
                )}
              </View>

              <View style={styles.fscoreSide}>
                <View style={styles.fscoreItem}>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.fscoreItemB}>{fitnessScore?.streak || 0} Days</Text>
                    <Text style={styles.fscoreItemT}>Streak</Text>
                  </View>
                  <Icon name="whatshot" size={16} color="#F59E0B" />
                </View>
                <View style={styles.fscoreItem}>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.fscoreItemB}>{workoutsCompleted}/{workoutsGoal}</Text>
                    <Text style={styles.fscoreItemT}>Workouts</Text>
                  </View>
                  <Icon name="fitness-center" size={16} color={C.onSurfaceVariant} />
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Nutrition Weekly Score Card */}
          <Animated.View entering={FadeInUp.delay(120).springify().damping(16)}>
            <View style={[styles.card, { backgroundColor: C.surface, padding: 20 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MaterialCommunityIcons name="food-apple-outline" size={24} color={C.primary} />
                  <Text style={styles.cardTitle}>NUTRITION SCORE</Text>
                </View>
                <View style={{ backgroundColor: `${C.primary}20`, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}>
                  <Text style={{ color: C.primary, fontFamily: F.bodyBold, fontSize: 12 }}>THIS WEEK</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
                    <Text style={{ fontSize: 40, fontFamily: F.num, color: C.onSurface, letterSpacing: -2 }}>{foodHistory?.length > 0 ? 92 : '--'}</Text>
                    <Text style={{ fontSize: 16, fontFamily: F.num, color: C.onSurfaceVariant, marginBottom: 8 }}>/100</Text>
                  </View>
                  <Text style={{ fontFamily: F.bodyMed, color: C.success }}>{foodHistory?.length > 0 ? '+5 pts from last week' : 'No data yet'}</Text>
                </View>

                <View style={{ flex: 1, marginLeft: 24, height: 64, justifyContent: 'center' }}>
                  <BarChart 
                    height={64}
                    color="#4ade80"
                    data={foodHistory?.length > 0 ? [
                      { label: 'M', value: 85 },
                      { label: 'T', value: 92 },
                      { label: 'W', value: 88 },
                      { label: 'T', value: Math.min(100, 70 + foodHistory.length * 5) },
                      { label: 'F', value: 90 },
                      { label: 'S', value: 85 },
                      { label: 'S', value: 96 },
                    ] : [
                      { label: 'M', value: 0 },
                      { label: 'T', value: 0 },
                      { label: 'W', value: 0 },
                      { label: 'T', value: 0 },
                      { label: 'F', value: 0 },
                      { label: 'S', value: 0 },
                      { label: 'S', value: 0 },
                    ]}
                  />
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Body Map & Progress Graph */}
          <View style={styles.row}>
            
            {/* Weight Progress */}
            <PressableCard entering={FadeInUp.delay(200).springify().damping(16)} style={styles.miniCard}>
              <View style={styles.miniHead}>
                <Text style={styles.miniH4}>Weight Progress</Text>
                {weightData?.change !== 0 && (
                  <Text style={[styles.miniTag, { color: (weightData?.change || 0) <= 0 ? C.success : C.error }]}>
                    {(weightData?.change || 0) <= 0 ? '↓' : '↑'} {Math.abs(weightData?.change || 0)} kg
                  </Text>
                )}
              </View>
              {isWeightLoading ? (
                <View style={{ gap: 4 }}><Skeleton width={80} height={20} /><Skeleton width={40} height={14} /></View>
              ) : (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginVertical: 4 }}>
                    <AnimatedNumber value={weightData?.current || 0} isFloat={true} style={styles.miniStat} />
                    <Text style={styles.miniStatSmall}>kg</Text>
                  </View>
                  <View style={{ height: 46, marginTop: 'auto', marginHorizontal: -10 }}>
                    <SplineChart width={(SCREEN_W - 60)/2} height={46} color="#FFB300" />
                  </View>
                </>
              )}
            </PressableCard>

            {/* Strength Progress */}
            <PressableCard entering={FadeInUp.delay(250).springify().damping(16)} style={styles.miniCard}>
              <View style={styles.miniHead}>
                <Text style={styles.miniH4}>Strength Progress</Text>
              </View>
              {isStrengthLoading ? (
                <Skeleton width={100} height={100} borderRadius={50} style={{ alignSelf: 'center', marginTop: 10 }} />
              ) : strengthData?.radarData ? (
                <View style={{ alignItems: 'center', marginTop: 10 }}>
                  <RadarChart 
                    data={strengthData.radarData}
                    size={90}
                    color={C.primary}
                    labels={false}
                  />
                </View>
              ) : (
                <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1, opacity: 0.5 }}>
                  <Text style={styles.miniFootSpan}>No Data</Text>
                </View>
              )}
            </PressableCard>

          </View>

          <View style={styles.grid2}>
            
            {/* Workout Completion */}
            <PressableCard entering={FadeInUp.delay(300).springify().damping(16)} style={styles.miniCard}>
              <View style={styles.miniHead}>
                <Text style={styles.miniH4}>Workouts</Text>
              </View>
              {isWorkoutsLoading ? (
                <View style={{ alignItems: 'center', gap: 10, marginTop: 10 }}><Skeleton width={60} height={60} borderRadius={30} /><Skeleton width={100} height={40} /></View>
              ) : (
                <>
                  <View style={{ alignItems: 'center', marginVertical: 8 }}>
                    <ActivityRings 
                      size={78}
                      rings={[{ progress: (workoutsData?.completionPct || 0) / 100, color: C.primary, radius: 30, strokeWidth: 8 }]}
                    />
                    <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
                      <AnimatedNumber value={workoutsData?.completionPct || 0} suffix="%" style={{ fontFamily: F.header, fontSize: 17, color: C.onSurface }} />
                    </View>
                  </View>
                  
                  <View style={styles.legend}>
                    <View style={styles.legendRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <View style={[styles.legendDot, { backgroundColor: '#38bdf8' }]} />
                        <Text style={styles.legendT}>Completed</Text>
                      </View>
                      <Text style={styles.legendB}>{workoutsData?.completed || 0}</Text>
                    </View>
                    <View style={styles.legendRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <View style={[styles.legendDot, { backgroundColor: C.error }]} />
                        <Text style={styles.legendT}>Missed</Text>
                      </View>
                      <Text style={styles.legendB}>{workoutsData?.missed || 0}</Text>
                    </View>
                  </View>
                </>
              )}
            </PressableCard>

            {/* Calories Burned */}
            <PressableCard entering={FadeInUp.delay(350).springify().damping(16)} style={styles.miniCard}>
              <View style={styles.miniHead}>
                <Text style={styles.miniH4}>Calories Burned</Text>
              </View>
              {isCaloriesLoading ? (
                <View style={{ gap: 4 }}><Skeleton width={80} height={20} /><Skeleton width="100%" height={60} /></View>
              ) : (
                <>
                  <Text style={{ fontSize: 11, color: C.onSurfaceVariant, marginBottom: 10 }}>Avg {caloriesData?.dailyAvg || 0} kcal</Text>
                  
                  <View style={{ height: 60, marginTop: 'auto' }}>
                    {caloriesData?.chartData && (
                      <BarChart data={caloriesData.chartData} height={60} color="#38bdf8" hideLabels={true} />
                    )}
                  </View>
                </>
              )}
            </PressableCard>

          </View>

          {/* AI Insights */}
          <Animated.View entering={FadeInUp.delay(450).springify().damping(16)} style={styles.insightCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Icon name="auto-awesome" size={18} color="#FDE68A" />
              <Text style={{ fontFamily: F.header, fontSize: 15, color: C.onSurface }}>AI Insights</Text>
            </View>

            {isInsightsLoading ? (
              <View style={{ gap: 8 }}>
                <Skeleton width="100%" height={16} />
                <Skeleton width="90%" height={16} />
              </View>
            ) : (
              <Text style={{ fontFamily: F.body, fontSize: 13, color: C.onSurfaceVariant, lineHeight: 20, marginBottom: 12 }}>
                {insights?.recommendation || "Consistency improved. Keep up the good work!"}
              </Text>
            )}

            <TouchableOpacity style={styles.detailsBtn}>
              <Text style={styles.detailsBtnTxt}>See Details</Text>
            </TouchableOpacity>
          </Animated.View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const getStyles = (C: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  backBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontFamily: F.header, color: C.onSurface, letterSpacing: -0.5 },
  calBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  
  segmentWrap: { paddingHorizontal: 20, marginBottom: 16 },
  segment: { flexDirection: 'row', backgroundColor: C.surface, borderRadius: 14, padding: 4, borderWidth: 1, borderColor: C.border },
  segmentBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  segmentBtnActive: { backgroundColor: C.primary },
  segmentTxt: { fontFamily: F.header, fontSize: 12, color: C.onSurfaceVariant },
  segmentTxtActive: { color: C.onPrimary },

  heroCard: {
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: `${C.primary}30`,
    overflow: 'hidden',
  },
  fscoreTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  fscoreLeft: { flex: 1 },
  lbl: { fontFamily: F.header, fontSize: 13, color: C.onSurfaceVariant, marginBottom: 8 },
  big: { fontFamily: F.header, fontSize: 32, color: C.onSurface },
  bigSmall: { fontFamily: F.header, fontSize: 15, color: C.onSurfaceVariant, paddingBottom: 4 },
  msg: { fontFamily: F.header, fontSize: 12, color: C.success, marginTop: 4 },
  fscoreRingWrap: { width: 88, height: 88, alignItems: 'center', justifyContent: 'center', marginHorizontal: 16 },
  fscoreRing: { width: 88, height: 88, alignItems: 'center', justifyContent: 'center' },
  fscoreCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  fscoreCenterTxt: { fontFamily: F.header, fontSize: 22, color: C.onSurface },
  fscoreSide: { flexShrink: 0, gap: 10, alignItems: 'flex-end', justifyContent: 'center', height: 88 },
  fscoreItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fscoreItemB: { fontFamily: F.header, fontSize: 13, color: C.onSurface },
  fscoreItemT: { fontFamily: F.bodyMed, fontSize: 11, color: C.onSurfaceVariant },

  grid2: { flexDirection: 'row', gap: 12, marginBottom: 12, flex: 1 },
  miniCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 20,
    padding: 14,
    minHeight: 140,
  },
  miniHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  miniH4: { fontFamily: F.header, fontSize: 12.5, color: C.onSurface },
  miniTag: { fontFamily: F.header, fontSize: 10.5 },
  miniStat: { fontFamily: F.header, fontSize: 20, color: C.onSurface },
  miniStatSmall: { fontFamily: F.bodyMed, fontSize: 12, color: C.onSurfaceVariant, paddingBottom: 3 },
  miniFootSpan: { fontFamily: F.bodyMed, fontSize: 10, color: C.onSurfaceVariant },

  legend: { marginTop: 6, gap: 6 },
  legendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  legendDot: { width: 7, height: 7, borderRadius: 3.5 },
  legendT: { fontFamily: F.bodyMed, fontSize: 11, color: C.onSurfaceVariant },
  legendB: { fontFamily: F.header, fontSize: 12, color: C.onSurface },

  insightCard: { backgroundColor: C.surface, borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.border },
  detailsBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center' },
  detailsBtnTxt: { fontFamily: F.header, fontSize: 12.5, color: C.onSurface },
});
