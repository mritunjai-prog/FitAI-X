import React, { useMemo, useState, useEffect } from "react";
import { View, Text, StyleSheet, StatusBar as RNStatusBar, TouchableOpacity, ScrollView, Dimensions, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeIn, useSharedValue, useAnimatedStyle, withTiming, Easing, withRepeat, withSequence } from "react-native-reanimated";
import { MaterialIcons as Icon, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';

import { ThemeColors, F } from "../theme";
import MeshGradientBackground from "../components/MeshGradientBackground";
import ActivityRings from "../components/charts/ActivityRings";
import RadarChart from "../components/charts/RadarChart";
import BarChart from "../components/charts/BarChart";
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

const { width: SCREEN_W } = Dimensions.get('window');

const TIME_FILTERS = [
  { id: '7d', label: '7D' },
  { id: '30d', label: '30D' },
  { id: '90d', label: '90D' },
  { id: '1y', label: '1Y' }
];

function Skeleton({ w, h, r = 8 }: { w: number | string; h: number; r?: number }) {
  const { C } = useTheme();
  const opacity = useSharedValue(0.3);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(withTiming(0.6, { duration: 800 }), withTiming(0.3, { duration: 800 })), -1, true
    );
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[{ width: w as any, height: h, borderRadius: r, backgroundColor: C.surfaceVariant }, style]} />;
}

function NumberDisplay({ val, suffix = '', style }: { val: number | string; suffix?: string; style?: any }) {
  return (
    <Animated.Text entering={FadeIn.duration(400)} style={style}>
      {val}{suffix}
    </Animated.Text>
  );
}

export default function AnalyticsScreen({ navigation, onNavigateToNotifications, onNavigateBack }: any) {
  const { isDark, C, bgColors } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => getStyles(C), [C]);
  const uid = user?.id || '';

  const [period, setPeriod] = useState('7d');
  const [aiOpen, setAiOpen] = useState(false);

  const { data: overview } = useQuery({ queryKey: ['ov', uid], queryFn: () => fetchOverview(uid), enabled: !!uid });
  const { data: fit, isLoading: fitLoad } = useQuery({ queryKey: ['fit', uid], queryFn: () => fetchFitnessScore(uid), enabled: !!uid });
  const { data: wt, isLoading: wtLoad } = useQuery({ queryKey: ['wt', uid], queryFn: () => fetchWeight(uid), enabled: !!uid });
  const { data: str, isLoading: strLoad } = useQuery({ queryKey: ['str', uid], queryFn: () => fetchStrength(uid), enabled: !!uid });
  const { data: cal, isLoading: calLoad } = useQuery({ queryKey: ['cal', period, uid], queryFn: () => fetchCalories(period, uid), enabled: !!uid });
  const { data: wo, isLoading: woLoad } = useQuery({ queryKey: ['wo', period, uid], queryFn: () => fetchWorkouts(period, uid), enabled: !!uid });
  const { data: ai, isLoading: aiLoad } = useQuery({ queryKey: ['ai', uid], queryFn: () => fetchSummary(uid), enabled: !!uid });
  const { data: streak } = useQuery({ queryKey: ['strk', uid], queryFn: () => fetchAnalyticsStreak(uid), enabled: !!uid });
  const { data: nut } = useQuery({ queryKey: ['nut', uid], queryFn: async () => (await apiClient.get(`/nutrition/dashboard?userId=${uid}`)).data, enabled: !!uid });

  useEffect(() => { if (uid) socket.emit('join_room', uid); }, [uid]);

  const name = overview?.name || user?.name || 'Athlete';
  const goal = overview?.goal || '';

  return (
    <View style={styles.c}>
      <RNStatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <MeshGradientBackground bgColors={bgColors} isDark={isDark} />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        
        {/* ── Header ─────────────────────────────────── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12 }}>
          <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); (onNavigateBack || navigation?.goBack)?.(); }}>
            <Icon name="arrow-back" size={22} color={C.onSurface} />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontFamily: F.header, fontSize: 17, color: C.onSurface, letterSpacing: -0.5 }}>Progress</Text>
            {goal ? <Text style={{ fontFamily: F.bodyMed, fontSize: 10, color: C.onSurfaceVariant }}>{goal}</Text> : null}
          </View>
          <TouchableOpacity onPress={() => { Haptics.selectionAsync(); onNavigateToNotifications?.(); }}>
            <Icon name="notifications" size={22} color={C.onSurface} />
          </TouchableOpacity>
        </View>

        {/* ── Welcome ─────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(60).springify().damping(18)} style={{ paddingHorizontal: 20, marginBottom: 6 }}>
          <Text style={{ fontFamily: F.header, fontSize: 24, letterSpacing: -1, color: C.onSurface }}>Hey, {name.split(' ')[0]}</Text>
          {fit && <Text style={{ fontFamily: F.bodyMed, fontSize: 12, color: C.onSurfaceVariant, marginTop: 2 }}>Score: {fit.score}/100 · {fit.streak}d streak</Text>}
        </Animated.View>

        {/* ── Period Filter ────────────────────────────── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 14 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {TIME_FILTERS.map(f => {
              const on = period === f.id;
              return (
                <TouchableOpacity key={f.id} onPress={() => { Haptics.selectionAsync(); setPeriod(f.id); }}
                  style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, backgroundColor: on ? C.primary : `${C.primary}18` }}>
                  <Text style={{ fontFamily: F.header, fontSize: 11, color: on ? C.onPrimary : C.primary }}>{f.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140, gap: 18 }} showsVerticalScrollIndicator={false}>

          {/* ═══ FITNESS SCORE ═══ */}
          <Animated.View entering={FadeInDown.delay(80).springify().damping(18)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                  <Icon name="auto-awesome" size={12} color={C.primary} />
                  <Text style={{ fontFamily: F.header, fontSize: 10, letterSpacing: 1, color: C.primary }}>FITNESS SCORE</Text>
                </View>
                {fitLoad ? <Skeleton w={100} h={34} /> : (
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 1 }}>
                    <NumberDisplay val={fit?.score || 0} style={{ fontFamily: F.num, fontSize: 36, letterSpacing: -1.5, color: C.onSurface }} />
                    <Text style={{ fontFamily: F.header, fontSize: 14, color: C.onSurfaceVariant }}>/100</Text>
                  </View>
                )}
                {fit?.motivation ? <Text style={{ fontFamily: F.bodyMed, fontSize: 11, color: C.success, marginTop: 2 }}>{fit.motivation}</Text> : null}
              </View>
              {!fitLoad && (
                <View style={{ width: 80, height: 80 }}>
                  <ActivityRings size={80} rings={[{ progress: (fit?.score || 0) / 100, color: C.primary, radius: 34, strokeWidth: 7 }]} />
                  <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
                    <Text style={{ fontFamily: F.num, fontSize: 18, color: C.onSurface }}>{fit?.score || 0}</Text>
                  </View>
                </View>
              )}
            </View>
            {fit && (
              <View style={{ flexDirection: 'row', marginTop: 14, gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: `${C.onSurface}20`, paddingTop: 12 }}>
                {[
                  { l: 'Consistency', v: fit.consistencyScore || 0, c: '#4ade80' },
                  { l: 'Recovery', v: fit.recoveryScore || 0, c: '#38bdf8' },
                  { l: 'Streak', v: fit.streakScore || 0, c: '#f59e0b' },
                ].map(m => (
                  <View key={m.l} style={{ flex: 1, alignItems: 'center' }}>
                    <View style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: m.c, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontFamily: F.num, fontSize: 12, color: C.onSurface }}>{m.v}</Text>
                    </View>
                    <Text style={{ fontFamily: F.bodyMed, fontSize: 8, color: C.onSurfaceVariant, marginTop: 3 }}>{m.l}</Text>
                  </View>
                ))}
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: `${C.primary}25`, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontFamily: F.num, fontSize: 12, color: C.primary }}>{streak?.currentStreak || fit?.streak || 0}</Text>
                  </View>
                  <Text style={{ fontFamily: F.bodyMed, fontSize: 8, color: C.onSurfaceVariant, marginTop: 3 }}>Streak</Text>
                </View>
              </View>
            )}
          </Animated.View>

          {/* ═══ WORKOUTS + CALORIES ═══ */}
          <Animated.View entering={FadeInDown.delay(140).springify().damping(18)}>
            <Text style={{ fontFamily: F.header, fontSize: 14, color: C.onSurface, marginBottom: 10, letterSpacing: -0.3 }}>Training</Text>
            <View style={{ flexDirection: 'row', gap: 14 }}>
              {/* Workouts */}
              <View style={{ flex: 1, backgroundColor: `${C.primary}10`, borderRadius: 18, padding: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                  <Icon name="fitness-center" size={14} color={C.primary} />
                  <Text style={{ fontFamily: F.header, fontSize: 9, letterSpacing: 0.7, color: C.onSurfaceVariant }}>WORKOUTS</Text>
                </View>
                {woLoad ? <Skeleton w={60} h={60} r={30} /> : (
                  <>
                    <View style={{ alignItems: 'center', marginBottom: 6 }}>
                      <View style={{ width: 64, height: 64 }}>
                        <ActivityRings size={64} rings={[{ progress: (wo?.completionPct || 0) / 100, color: C.primary, radius: 26, strokeWidth: 6 }]} />
                        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
                          <Text style={{ fontFamily: F.num, fontSize: 14, color: C.onSurface }}>{wo?.completionPct || 0}%</Text>
                        </View>
                      </View>
                    </View>
                    <View style={{ gap: 2 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontFamily: F.bodyMed, fontSize: 9, color: C.onSurfaceVariant }}>Done</Text>
                        <Text style={{ fontFamily: F.num, fontSize: 11, color: C.onSurface }}>{wo?.completed || 0}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontFamily: F.bodyMed, fontSize: 9, color: C.onSurfaceVariant }}>Missed</Text>
                        <Text style={{ fontFamily: F.num, fontSize: 11, color: '#f87171' }}>{wo?.missed || 0}</Text>
                      </View>
                    </View>
                  </>
                )}
              </View>

              {/* Calories */}
              <View style={{ flex: 1, backgroundColor: `${C.primary}10`, borderRadius: 18, padding: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                  <Icon name="local-fire-department" size={14} color="#f97316" />
                  <Text style={{ fontFamily: F.header, fontSize: 9, letterSpacing: 0.7, color: C.onSurfaceVariant }}>CALORIES</Text>
                </View>
                {calLoad ? <Skeleton w={60} h={20} /> : (
                  <>
                    <NumberDisplay val={cal?.total || 0} suffix=" kcal" style={{ fontFamily: F.num, fontSize: 22, letterSpacing: -0.8, color: C.onSurface }} />
                    <Text style={{ fontFamily: F.bodyMed, fontSize: 9, color: C.onSurfaceVariant, marginTop: 1 }}>Avg {cal?.dailyAvg || 0}/day</Text>
                    <View style={{ height: 40, marginTop: 6 }}>
                      {cal?.chartData?.length > 0 ? <BarChart data={cal.chartData} height={40} color="#f97316" hideLabels /> : null}
                    </View>
                  </>
                )}
              </View>
            </View>
          </Animated.View>

          {/* ═══ WEIGHT + STRENGTH ═══ */}
          <Animated.View entering={FadeInDown.delay(200).springify().damping(18)}>
            <Text style={{ fontFamily: F.header, fontSize: 14, color: C.onSurface, marginBottom: 10, letterSpacing: -0.3 }}>Body & Strength</Text>
            <View style={{ flexDirection: 'row', gap: 14 }}>
              <View style={{ flex: 1, backgroundColor: `${C.primary}10`, borderRadius: 18, padding: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                  <Icon name="monitor-weight" size={14} color="#38bdf8" />
                  <Text style={{ fontFamily: F.header, fontSize: 9, letterSpacing: 0.7, color: C.onSurfaceVariant }}>WEIGHT</Text>
                </View>
                {wtLoad ? <Skeleton w={50} h={20} /> : (
                  <>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                      <NumberDisplay val={wt?.current || 0} style={{ fontFamily: F.num, fontSize: 24, letterSpacing: -1, color: C.onSurface }} />
                      <Text style={{ fontFamily: F.bodyMed, fontSize: 10, color: C.onSurfaceVariant }}>kg</Text>
                    </View>
                    {wt?.change !== 0 && wt?.current > 0 ? (
                      <Text style={{ fontFamily: F.header, fontSize: 10, color: (wt.change || 0) <= 0 ? C.success : '#f87171', marginTop: 1 }}>
                        {(wt.change || 0) <= 0 ? '↓' : '↑'} {Math.abs(wt.change || 0)} kg
                      </Text>
                    ) : null}
                    {(!wt?.current || wt.current === 0) && <Text style={{ fontFamily: F.bodyMed, fontSize: 10, color: C.onSurfaceVariant, marginTop: 2 }}>Log in profile</Text>}
                  </>
                )}
              </View>
              <View style={{ flex: 1, backgroundColor: `${C.primary}10`, borderRadius: 18, padding: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                  <Icon name="fitness-center" size={14} color={C.primary} />
                  <Text style={{ fontFamily: F.header, fontSize: 9, letterSpacing: 0.7, color: C.onSurfaceVariant }}>STRENGTH</Text>
                </View>
                {strLoad ? <Skeleton w={80} h={80} r={40} /> : str?.radarData?.length > 0 ? (
                  <View style={{ alignItems: 'center', marginTop: 4 }}>
                    <RadarChart data={str.radarData} size={80} color={C.primary} />
                  </View>
                ) : (
                  <Text style={{ fontFamily: F.bodyMed, fontSize: 10, color: C.onSurfaceVariant, textAlign: 'center', marginTop: 20 }}>No data</Text>
                )}
              </View>
            </View>
          </Animated.View>

          {/* ═══ WEEKLY LOAD ═══ */}
          <Animated.View entering={FadeInDown.delay(260).springify().damping(18)}>
            <Text style={{ fontFamily: F.header, fontSize: 14, color: C.onSurface, marginBottom: 10, letterSpacing: -0.3 }}>Weekly Load</Text>
            <View style={{ backgroundColor: `${C.primary}10`, borderRadius: 18, padding: 14, height: 110 }}>
              {wo?.chartData?.length > 0 ? <BarChart data={wo.chartData} height={80} color={C.primary} /> : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: F.bodyMed, fontSize: 11, color: C.onSurfaceVariant }}>Complete a workout to see data</Text>
                </View>
              )}
            </View>
          </Animated.View>

          {/* ═══ AI INSIGHTS ═══ */}
          <Animated.View entering={FadeInDown.delay(320).springify().damping(18)}>
            <Text style={{ fontFamily: F.header, fontSize: 14, color: C.onSurface, marginBottom: 10, letterSpacing: -0.3 }}>AI Insights</Text>
            <TouchableOpacity onPress={() => { Haptics.selectionAsync(); setAiOpen(!aiOpen); }}
              style={{ backgroundColor: `${C.primary}10`, borderRadius: 18, padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="auto-awesome" size={13} color={C.onPrimary} />
                </View>
                <Text style={{ flex: 1, fontFamily: F.header, fontSize: 13, color: C.onSurface }}>Coach Summary</Text>
                <Icon name={aiOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={16} color={C.onSurfaceVariant} />
              </View>
              {aiLoad ? <Skeleton w="100%" h={12} /> : (
                <>
                  <Text style={{ fontFamily: F.body, fontSize: 12, color: C.onSurfaceVariant, lineHeight: 18 }}>
                    {ai?.progressText || 'Keep training!'}
                  </Text>
                  {ai?.suggestions?.length > 0 && aiOpen ? (
                    <View style={{ marginTop: 10, gap: 6 }}>
                      <Text style={{ fontFamily: F.header, fontSize: 10, letterSpacing: 0.5, color: C.primary }}>SUGGESTIONS</Text>
                      {ai.suggestions.map((s: any, i: number) => (
                        <Text key={i} style={{ fontFamily: F.body, fontSize: 11, color: C.onSurfaceVariant }}>• {s.name || s}</Text>
                      ))}
                    </View>
                  ) : null}
                </>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* ═══ NUTRITION ═══ */}
          <Animated.View entering={FadeInDown.delay(380).springify().damping(18)}>
            <Text style={{ fontFamily: F.header, fontSize: 14, color: C.onSurface, marginBottom: 10, letterSpacing: -0.3 }}>Nutrition</Text>
            <View style={{ backgroundColor: `${C.primary}10`, borderRadius: 18, padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <MaterialCommunityIcons name="food-apple-outline" size={18} color={C.primary} />
                <Text style={{ fontFamily: F.header, fontSize: 9, letterSpacing: 0.6, color: C.onSurfaceVariant }}>TODAY</Text>
              </View>
              {nut ? (
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {[
                    { l: 'Cals', v: `${nut.calories || 0}` },
                    { l: 'Protein', v: `${nut.protein || 0}` },
                    { l: 'Carbs', v: `${nut.carbs || 0}` },
                    { l: 'Fat', v: `${nut.fat || 0}` },
                  ].map(m => (
                    <View key={m.l} style={{ flex: 1, alignItems: 'center' }}>
                      <Text style={{ fontFamily: F.num, fontSize: 15, color: C.onSurface }}>{m.v}</Text>
                      <Text style={{ fontFamily: F.bodyMed, fontSize: 8, color: C.onSurfaceVariant, marginTop: 1 }}>{m.l}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={{ fontFamily: F.bodyMed, fontSize: 11, color: C.onSurfaceVariant }}>Log meals to see nutrition</Text>
              )}
            </View>
          </Animated.View>

          <View style={{ height: 20 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const getStyles = (C: ThemeColors) => StyleSheet.create({
  c: { flex: 1, backgroundColor: C.bg },
});
