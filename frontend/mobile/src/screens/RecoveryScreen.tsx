import React, { useMemo, useEffect, useState } from "react";
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
import BarChart from "../components/charts/BarChart";
import SplineChart from "../components/charts/SplineChart";
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

import { 
  fetchRecoveryOverview,
  fetchRecoveryScore,
  fetchSleepData,
  fetchHeartRateData,
  fetchWaterData,
  fetchStressData,
  fetchRecoveryTimeline,
  fetchRecoveryInsights
} from '../services/api/recovery';

const SCREEN_W = Dimensions.get('window').width;

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
      <Animated.View entering={entering} layout={Layout.springify()} style={{ flexGrow: 1 }}>
        <Animated.View style={[restStyle, { flexGrow: 1 }, animStyle]}>
          {children}
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

// Helper: Animated Progress Bar with glow
function AnimatedProgressBar({ progress, color }: { progress: number, color: string }) {
  const { C } = useTheme();
  const widthVal = useSharedValue(0);
  
  useEffect(() => {
    widthVal.value = withTiming(progress, { duration: 1000, easing: Easing.out(Easing.cubic) });
  }, [progress]);

  const animStyle = useAnimatedStyle(() => ({ width: `${widthVal.value * 100}%` }));

  return (
    <View style={{ height: 6, backgroundColor: `${C.onSurface}10`, borderRadius: 4, overflow: 'hidden', marginTop: 8 }}>
      <Animated.View style={[{ height: '100%', borderRadius: 4, overflow: 'hidden' }, animStyle]}>
        <LinearGradient colors={[color, `${color}99`]} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={StyleSheet.absoluteFillObject} />
      </Animated.View>
    </View>
  );
}

export default function RecoveryScreen({ navigation, onNavigateToNotifications }: any) {
  const { isDark, C, bgColors } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => getStyles(C), [C]);

  const [activeTab, setActiveTab] = useState<'advice' | 'body'>('advice');

  const { data: overview, isLoading: isOverviewLoading } = useQuery({ queryKey: ['rec_overview'], queryFn: fetchRecoveryOverview });
  const { data: scoreData, isLoading: isScoreLoading } = useQuery({ queryKey: ['rec_score'], queryFn: fetchRecoveryScore });
  const { data: sleepData, isLoading: isSleepLoading } = useQuery({ queryKey: ['rec_sleep'], queryFn: fetchSleepData });
  const { data: hrData, isLoading: isHrLoading } = useQuery({ queryKey: ['rec_hr'], queryFn: fetchHeartRateData });
  const { data: waterData, isLoading: isWaterLoading } = useQuery({ queryKey: ['rec_water'], queryFn: fetchWaterData });
  const { data: stressData, isLoading: isStressLoading } = useQuery({ queryKey: ['rec_stress'], queryFn: fetchStressData });
  const { data: timeline, isLoading: isTimelineLoading } = useQuery({ queryKey: ['rec_timeline'], queryFn: fetchRecoveryTimeline });
  const { data: insights, isLoading: isInsightsLoading } = useQuery({ queryKey: ['rec_insights'], queryFn: fetchRecoveryInsights });

  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 300, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  return (
    <View style={styles.container}>
      <RNStatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <MeshGradientBackground bgColors={bgColors} isDark={isDark} />

      {/* Subtle Floating Gradient overlay */}
      <LinearGradient colors={['transparent', `${C.primary}10`, 'transparent']} style={[StyleSheet.absoluteFillObject, { opacity: 0.5, pointerEvents: 'none' as any }]} />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation?.goBack?.(); }}>
            <View style={styles.headerIconBg}>
              <Icon name="arrow-back" size={24} color={C.onSurface} />
            </View>
          </TouchableOpacity>
          <Text style={styles.title}>Recovery & Health</Text>
          <TouchableOpacity onPress={() => { Haptics.selectionAsync(); onNavigateToNotifications?.(); }}>
            <View style={styles.headerIconBg}>
              <Icon name="notifications" size={24} color={C.onSurface} />
            </View>
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={{ flex: 1 }} 
          contentContainerStyle={{ padding: 20, paddingBottom: 140, gap: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Card */}
          <Animated.View entering={FadeInUp.delay(100).springify().damping(16)} style={[styles.heroCard, { backgroundColor: C.surface }]}>
            <BlurView intensity={isDark ? 40 : 80} tint={C.blurTint} style={StyleSheet.absoluteFillObject} />
            <LinearGradient colors={[`${C.primary}15`, 'transparent']} style={StyleSheet.absoluteFillObject} />
            
            <View style={styles.heroLeft}>
              <Text style={styles.heroTitle}>Recovery Score</Text>
              
              {isScoreLoading || isOverviewLoading ? (
                <Skeleton width={112} height={112} borderRadius={56} style={{ marginTop: 10 }} />
              ) : (
                <View style={styles.heroChart}>
                  <ActivityRings 
                    size={112} 
                    rings={[{ progress: (scoreData?.score || 0) / 100, color: C.primary, radius: 45, strokeWidth: 10 }]} 
                  />
                  <View style={styles.heroCenter}>
                    <AnimatedNumber value={scoreData?.score || 0} suffix="%" style={styles.heroValue} />
                    <Text style={styles.heroSub}>{scoreData?.status || 'Good'}</Text>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.heroRight}>
              <Text style={styles.statusLbl}>Status</Text>
              {isOverviewLoading ? (
                <>
                  <Skeleton width={100} height={20} style={{ marginBottom: 6 }} />
                  <Skeleton width={120} height={14} />
                  <Skeleton width={100} height={14} style={{ marginTop: 4 }} />
                </>
              ) : (
                <>
                  <Text style={styles.statusVal}>{overview?.recoveryStatus || 'Calculating'}</Text>
                  <Text style={styles.heroDesc}>
                    {overview?.recoveryStatus === 'Ready to Train' 
                      ? 'Your body is recovered and primed for performance.' 
                      : 'Prioritize rest and light recovery.'}
                  </Text>
                </>
              )}
            </View>

            <View style={styles.heroMedi}>
              <Animated.View style={pulseStyle}>
                <MaterialCommunityIcons name="human-handsup" size={48} color={C.primary} style={{ opacity: 0.8 }} />
              </Animated.View>
            </View>
          </Animated.View>

          {/* 2x2 Mini Grid - Fixed Layout */}
          <View style={styles.twoColumnRow}>
            {/* Sleep */}
            <PressableCard entering={FadeInUp.delay(200).springify().damping(16)} style={styles.miniCard}>
              <View style={styles.miniTop}>
                <Icon name="nights-stay" size={16} color="#a855f7" />
                <Text style={styles.miniTopTxt} numberOfLines={1}>Sleep</Text>
              </View>
              {isSleepLoading ? (
                <View style={{ gap: 4 }}><Skeleton width={60} height={24} /><Skeleton width={40} height={14} /></View>
              ) : (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
                    <AnimatedNumber value={sleepData?.totalHours || 0} isFloat={true} style={styles.miniVal} />
                    <Text style={styles.miniUnit}>h</Text>
                  </View>
                  <Text style={[styles.miniSub, { color: C.success }]} numberOfLines={1}>{sleepData?.quality || 'Good'}</Text>
                  <View style={styles.sleepMiniBars}>
                    {[40, 70, 55, 85, 60, 75].map((h, i) => (
                      <View key={i} style={[styles.sleepBar, { height: `${h}%` }]} />
                    ))}
                  </View>
                </>
              )}
            </PressableCard>

            {/* Heart Rate */}
            <PressableCard entering={FadeInUp.delay(250).springify().damping(16)} style={styles.miniCard}>
              <View style={styles.miniTop}>
                <Icon name="favorite" size={16} color={C.error} />
                <Text style={styles.miniTopTxt} numberOfLines={1}>Heart Rate</Text>
              </View>
              {isHrLoading ? (
                <View style={{ gap: 4 }}><Skeleton width={60} height={24} /><Skeleton width={40} height={14} /></View>
              ) : (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
                    <AnimatedNumber value={hrData?.currentBpm || 0} style={styles.miniVal} />
                    <Text style={styles.miniUnit}>bpm</Text>
                  </View>
                  <Text style={styles.miniSub} numberOfLines={1}>Resting: {hrData?.restingBpm || 0}</Text>
                  <View style={{ height: 20, marginTop: 10, marginHorizontal: -5 }}>
                    {hrData && <SplineChart width={(SCREEN_W - 60)/2 - 32} height={30} color={C.error} />}
                  </View>
                </>
              )}
            </PressableCard>
          </View>

          <View style={styles.twoColumnRow}>
            {/* Water Intake */}
            <PressableCard entering={FadeInUp.delay(300).springify().damping(16)} style={styles.miniCard}>
              <View style={styles.miniTop}>
                <Icon name="water-drop" size={16} color="#38bdf8" />
                <Text style={styles.miniTopTxt} numberOfLines={1}>Water</Text>
              </View>
              {isWaterLoading ? (
                <View style={{ gap: 4 }}><Skeleton width={60} height={24} /><Skeleton width={40} height={14} /></View>
              ) : (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
                    <AnimatedNumber value={(waterData?.currentIntake || 0) / 1000} isFloat={true} style={styles.miniVal} />
                    <Text style={styles.miniUnit}>L</Text>
                  </View>
                  <Text style={styles.miniSub} numberOfLines={1}>{Math.round((waterData?.progress || 0) * 100)}% of goal</Text>
                  <View style={{ marginTop: 'auto', paddingTop: 8 }}>
                    <AnimatedProgressBar progress={waterData?.progress || 0} color="#38bdf8" />
                  </View>
                </>
              )}
            </PressableCard>

            {/* Stress */}
            <PressableCard entering={FadeInUp.delay(350).springify().damping(16)} style={styles.miniCard}>
              <View style={styles.miniTop}>
                <MaterialCommunityIcons name="head-snowflake-outline" size={16} color="#fb923c" />
                <Text style={styles.miniTopTxt} numberOfLines={1}>Stress</Text>
              </View>
              {isStressLoading ? (
                <View style={{ gap: 4 }}><Skeleton width={60} height={24} /><Skeleton width={40} height={14} /></View>
              ) : (
                <>
                  <Text style={[styles.miniVal, { color: '#fb923c', fontSize: 18 }]} numberOfLines={1}>{stressData?.status || 'Moderate'}</Text>
                  <Text style={styles.miniSub} numberOfLines={1}>{stressData?.score || 0}/100</Text>
                  <View style={{ marginTop: 'auto', paddingTop: 8 }}>
                    <AnimatedProgressBar progress={(stressData?.score || 0)/100} color="#fb923c" />
                  </View>
                </>
              )}
            </PressableCard>
          </View>

          {/* Recovery Timeline */}
          <Animated.View entering={FadeInUp.delay(400).springify().damping(16)} style={styles.card}>
            <View style={styles.cardHead}>
              <Text style={styles.cardTitle}>Recovery Timeline</Text>
              <Icon name="timeline" size={16} color={C.onSurfaceVariant} />
            </View>
            
            {isTimelineLoading ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Skeleton width={60} height={40} />
                <Skeleton width={60} height={40} />
                <Skeleton width={60} height={40} />
              </View>
            ) : (
              <View style={styles.timeline}>
                <View style={styles.tlTrack} />
                <View style={styles.tlStep}>
                  <View style={[styles.tlDot, { backgroundColor: C.success }]}><Icon name="check" size={12} color="#fff" /></View>
                  <Text style={styles.tlTxt}>Today</Text>
                  <Text style={[styles.tlVal, { color: C.success }]}>{timeline?.today || 0}%</Text>
                </View>
                <View style={styles.tlStep}>
                  <View style={[styles.tlDot, { backgroundColor: C.primary }]}><Icon name="arrow-forward" size={12} color="#fff" /></View>
                  <Text style={styles.tlTxt}>Tomorrow</Text>
                  <Text style={[styles.tlVal, { color: C.primary }]}>{timeline?.tomorrow || 0}%</Text>
                </View>
                <View style={styles.tlStep}>
                  <View style={[styles.tlDot, { backgroundColor: C.primary }]}><Icon name="arrow-forward" size={12} color="#fff" /></View>
                  <Text style={styles.tlTxt}>2 Days</Text>
                  <Text style={[styles.tlVal, { color: C.primary }]}>{timeline?.next2Days || 0}%</Text>
                </View>
                <View style={styles.tlStep}>
                  <View style={[styles.tlDot, { backgroundColor: '#a855f7' }]}><Icon name="event" size={12} color="#fff" /></View>
                  <Text style={styles.tlTxt}>Full Recovery</Text>
                  <Text style={[styles.tlVal, { color: '#a855f7' }]}>100%</Text>
                </View>
              </View>
            )}
          </Animated.View>

          {/* Tabbed Card (Body Status vs AI Advice) */}
          <Animated.View entering={FadeInUp.delay(450).springify().damping(16)} style={styles.tabbedCard}>
            <View style={styles.tabSwitch}>
              <TouchableOpacity onPress={() => { Haptics.selectionAsync(); setActiveTab('advice'); }} style={[styles.tabBtn, activeTab === 'advice' && styles.tabBtnActive]}>
                <Text style={[styles.tabTxt, activeTab === 'advice' && styles.tabTxtActive]}>AI Recovery Advice</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { Haptics.selectionAsync(); setActiveTab('body'); }} style={[styles.tabBtn, activeTab === 'body' && styles.tabBtnActive]}>
                <Text style={[styles.tabTxt, activeTab === 'body' && styles.tabTxtActive]}>Body Status</Text>
              </TouchableOpacity>
            </View>

            {activeTab === 'advice' && (
              <Animated.View entering={FadeIn} style={styles.adviceList}>
                {isInsightsLoading ? (
                  <View style={{ gap: 12 }}>
                    <Skeleton width="100%" height={40} />
                    <Skeleton width="100%" height={40} />
                  </View>
                ) : (
                  <>
                    <View style={styles.adviceItem}>
                      <View style={styles.aico}><Icon name="self-improvement" size={16} color={C.primary} /></View>
                      <View style={styles.adviceTxtBox}>
                        <Text style={styles.adviceB}>{insights?.recommendation || 'Stretching & Mobility'}</Text>
                        <Text style={styles.adviceSpan}>Recommended AI Action</Text>
                      </View>
                      <Icon name="chevron-right" size={18} color={C.onSurfaceVariant} />
                    </View>
                    <View style={styles.adviceItem}>
                      <View style={styles.aico}><MaterialCommunityIcons name="bed-empty" size={16} color={C.primary} /></View>
                      <View style={styles.adviceTxtBox}>
                        <Text style={styles.adviceB}>{insights?.summary || 'Focus on rest'}</Text>
                        <Text style={styles.adviceSpan}>Daily Summary</Text>
                      </View>
                      <Icon name="chevron-right" size={18} color={C.onSurfaceVariant} />
                    </View>
                  </>
                )}
              </Animated.View>
            )}

            {activeTab === 'body' && (
              <Animated.View entering={FadeIn} style={styles.bodyStatus}>
                <MaterialCommunityIcons name="human-handsdown" size={120} color={C.primary} style={{ opacity: 0.3 }} />
                <View style={styles.bodyLegend}>
                  <View style={styles.legendRow}><View style={[styles.legendDot, { backgroundColor: C.success }]} /><Text style={styles.legendTxt}>Recovered</Text></View>
                  <View style={styles.legendRow}><View style={[styles.legendDot, { backgroundColor: '#fb923c' }]} /><Text style={styles.legendTxt}>Recovering</Text></View>
                  <View style={styles.legendRow}><View style={[styles.legendDot, { backgroundColor: C.error }]} /><Text style={styles.legendTxt}>High Fatigue</Text></View>
                </View>
                <TouchableOpacity style={styles.viewBodyBtn}>
                  <Text style={styles.viewBodyBtnTxt}>View Full Body</Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </Animated.View>

          {/* CTA */}
          <Animated.View entering={FadeInUp.delay(550).springify()}>
            <TouchableOpacity style={styles.ctaBtn} onPress={() => Haptics.impactAsync()}>
              <Text style={styles.ctaBtnTxt}>Start Recovery Routine</Text>
              <Icon name="arrow-forward" size={18} color="#fff" />
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
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 0) + 10 : 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 20,
  },
  title: { fontSize: 20, fontFamily: F.header, color: C.onSurface, letterSpacing: -0.5 },
  headerIconBg: { width: 42, height: 42, borderRadius: 14, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  
  heroCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${C.primary}30`,
    overflow: 'hidden',
  },
  heroLeft: { flexShrink: 0 },
  heroTitle: { fontFamily: F.header, fontSize: 14, color: C.onSurfaceVariant, marginBottom: 10 },
  heroChart: { width: 112, height: 112, alignItems: 'center', justifyContent: 'center' },
  heroCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  heroValue: { fontFamily: F.header, fontSize: 26, color: C.onSurface },
  heroSub: { fontFamily: F.header, fontSize: 12, color: C.success, marginTop: 2 },
  heroRight: { flex: 1, paddingLeft: 16 },
  statusLbl: { fontFamily: F.bodyMed, fontSize: 12, color: C.onSurfaceVariant, marginBottom: 4 },
  statusVal: { fontFamily: F.header, fontSize: 16, color: C.onSurface, marginBottom: 8 },
  heroDesc: { fontFamily: F.body, fontSize: 11, color: C.onSurfaceVariant, lineHeight: 16 },
  heroMedi: { width: 52, height: 66, position: 'absolute', right: -10, top: 10 },

  twoColumnRow: { flexDirection: 'row', gap: 12, marginBottom: 16, flex: 1 },
  miniCard: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 20,
    padding: 16,
    minHeight: 120, // ensure uniform height
  },
  miniTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  miniTopTxt: { fontFamily: F.header, fontSize: 12, color: C.onSurfaceVariant, flexShrink: 1 },
  miniVal: { fontFamily: F.header, fontSize: 22, color: C.onSurface },
  miniUnit: { fontFamily: F.body, fontSize: 14, color: C.onSurfaceVariant, paddingBottom: 3 },
  miniSub: { fontFamily: F.body, fontSize: 11, color: C.onSurfaceVariant, marginTop: 2 },
  sleepMiniBars: { flexDirection: 'row', alignItems: 'flex-end', height: 24, gap: 4, marginTop: 'auto', paddingTop: 10 },
  sleepBar: { flex: 1, backgroundColor: '#a855f7', borderRadius: 2, opacity: 0.8 },

  card: { backgroundColor: C.surface, borderRadius: 24, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: C.border },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  cardTitle: { fontFamily: F.header, fontSize: 16, color: C.onSurface },
  
  timeline: { flexDirection: 'row', justifyContent: 'space-between', position: 'relative' },
  tlTrack: { position: 'absolute', top: 12, left: 24, right: 24, height: 2, backgroundColor: C.surfaceVariant },
  tlStep: { flex: 1, alignItems: 'center', zIndex: 1 },
  tlDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8, borderWidth: 3, borderColor: C.surface },
  tlTxt: { fontFamily: F.body, fontSize: 11, color: C.onSurfaceVariant, marginBottom: 2 },
  tlVal: { fontFamily: F.header, fontSize: 14 },

  tabbedCard: { backgroundColor: C.surface, borderRadius: 24, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: C.border },
  tabSwitch: { flexDirection: 'row', backgroundColor: C.surfaceVariant, borderRadius: 14, padding: 4, marginBottom: 20 },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabBtnActive: { backgroundColor: C.primary },
  tabTxt: { fontFamily: F.header, fontSize: 13, color: C.onSurfaceVariant },
  tabTxtActive: { color: C.onPrimary },

  adviceList: { gap: 14 },
  adviceItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  aico: { width: 36, height: 36, borderRadius: 12, backgroundColor: `${C.primary}15`, alignItems: 'center', justifyContent: 'center' },
  adviceTxtBox: { flex: 1 },
  adviceB: { fontFamily: F.header, fontSize: 14, color: C.onSurface, marginBottom: 2 },
  adviceSpan: { fontFamily: F.body, fontSize: 12, color: C.onSurfaceVariant },

  bodyStatus: { alignItems: 'center' },
  bodyLegend: { flexDirection: 'row', gap: 16, marginTop: 12 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendTxt: { fontFamily: F.body, fontSize: 11, color: C.onSurfaceVariant },
  viewBodyBtn: { marginTop: 16, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: `${C.primary}20`, borderRadius: 12, width: '100%', alignItems: 'center' },
  viewBodyBtnTxt: { fontFamily: F.header, fontSize: 13, color: C.primary },

  ctaBtn: { flexDirection: 'row', backgroundColor: C.primary, padding: 18, borderRadius: 20, alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 20 },
  ctaBtnTxt: { fontFamily: F.header, fontSize: 16, color: C.onPrimary },
});
