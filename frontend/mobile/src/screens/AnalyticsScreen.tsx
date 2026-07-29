import React, { useMemo, useState, useEffect } from "react";
import { View, Text, StyleSheet, StatusBar as RNStatusBar, TouchableOpacity, ScrollView, Dimensions, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeIn, useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence } from "react-native-reanimated";
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
  fetchOverview, fetchFitnessScore, fetchWorkouts, fetchCalories,
  fetchWeight, fetchStrength, fetchSummary, fetchStreak as fetchAnalyticsStreak,
} from '../services/api/analytics';
import { apiClient } from '../services/api/client';
import { socket } from '../services/socket/socketClient';

const { width: SCREEN_W } = Dimensions.get("window");
const HORIZ_PAD = 20;

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

function Num({ v, suffix = '', style }: { v: number | string; suffix?: string; style?: any }) {
  return <Animated.Text entering={FadeIn.duration(400)} style={style}>{v}{suffix}</Animated.Text>;
}

/** Circle badge — consistent ring style used across all sub-scores */
function StatBadge({ value, label, color }: { value: number | string; label: string; color?: string }) {
  const { C } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <View style={{
        width: 34, height: 34, borderRadius: 17,
        borderWidth: 1.5, borderColor: color || C.primary,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{ fontFamily: F.num, fontSize: 11, color: C.onSurface }}>{value}</Text>
      </View>
      <Text style={{ fontFamily: F.bodyMed, fontSize: 8, color: C.onSurfaceVariant, marginTop: 3 }}>{label}</Text>
    </View>
  );
}

/** Section wrapper – consistent vertical rhythm + hairline divider */
function Section({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: any }) {
  const { C } = useTheme();
  const hair = `${C.onSurface}18`;
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).springify().damping(18)}
      style={[{ paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: hair }, style]}
    >
      {children}
    </Animated.View>
  );
}

function SectionHeader({ title }: { title: string }) {
  const { C } = useTheme();
  return (
    <Text style={{ fontFamily: F.header, fontSize: 13, color: C.onSurface, marginBottom: 10, letterSpacing: -0.3 }}>
      {title}
    </Text>
  );
}

function SubLabel({ text, icon }: { text: string; icon?: string }) {
  const { C } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 }}>
      {icon ? <MaterialCommunityIcons name={icon as any} size={14} color={C.primary} /> : null}
      <Text style={{ fontFamily: F.header, fontSize: 9, letterSpacing: 0.8, color: C.onSurfaceVariant }}>
        {text}
      </Text>
    </View>
  );
}

export default function AnalyticsScreen({ navigation, onNavigateToNotifications, onNavigateBack }: any) {
  const { isDark, C, bgColors } = useTheme();
  const { user } = useAuth();
  const uid = user?.id || '';

  const [period, setPeriod] = useState('7d');
  const [aiOpen, setAiOpen] = useState(false);

  const { data: ov } = useQuery({ queryKey: ['ov', uid], queryFn: () => fetchOverview(uid), enabled: !!uid });
  const { data: fit, isLoading: fitL } = useQuery({ queryKey: ['fit', uid], queryFn: () => fetchFitnessScore(uid), enabled: !!uid });
  const { data: wt } = useQuery({ queryKey: ['wt', uid], queryFn: () => fetchWeight(uid), enabled: !!uid });
  const { data: str } = useQuery({ queryKey: ['str', uid], queryFn: () => fetchStrength(uid), enabled: !!uid });
  const { data: cal } = useQuery({ queryKey: ['cal', period, uid], queryFn: () => fetchCalories(period, uid), enabled: !!uid });
  const { data: wo } = useQuery({ queryKey: ['wo', period, uid], queryFn: () => fetchWorkouts(period, uid), enabled: !!uid });
  const { data: ai } = useQuery({ queryKey: ['ai', uid], queryFn: () => fetchSummary(uid), enabled: !!uid });
  const { data: streak } = useQuery({ queryKey: ['strk', uid], queryFn: () => fetchAnalyticsStreak(uid), enabled: !!uid });
  const { data: nut } = useQuery({ queryKey: ['nut', uid], queryFn: async () => (await apiClient.get(`/nutrition/dashboard?userId=${uid}`)).data, enabled: !!uid });

  useEffect(() => { if (uid) socket.emit('join_room', uid); }, [uid]);

  const name = ov?.name || user?.name || 'Athlete';
  const goal = ov?.goal || '';
  const hair = `${C.onSurface}18`;

  return (
    <View style={s.c}>
      <RNStatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <MeshGradientBackground bgColors={bgColors} isDark={isDark} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>

        {/* ── Header ── */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: HORIZ_PAD, paddingTop: 10, paddingBottom: 8,
        }}>
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); (onNavigateBack || navigation?.goBack)?.(); }}
            style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="arrow-back" size={22} color={C.onSurface} />
          </TouchableOpacity>
          <Text style={{ fontFamily: F.header, fontSize: 17, color: C.onSurface, letterSpacing: -0.5 }}>Progress</Text>
          <TouchableOpacity
            onPress={() => { Haptics.selectionAsync(); onNavigateToNotifications?.(); }}
            style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="notifications" size={22} color={C.onSurface} />
          </TouchableOpacity>
        </View>

        {/* ── Welcome ── */}
        <View style={{ paddingHorizontal: HORIZ_PAD, marginBottom: 6 }}>
          <Text style={{ fontFamily: F.header, fontSize: 24, letterSpacing: -1, color: C.onSurface }}>
            Hey, {name.split(' ')[0]}
          </Text>
          {goal ? (
            <Text style={{ fontFamily: F.bodyMed, fontSize: 11, color: C.onSurfaceVariant, marginTop: 2 }}>
              {goal}
            </Text>
          ) : null}
        </View>

        {/* ── Period filter pills ── */}
        <View style={{ paddingHorizontal: HORIZ_PAD, marginBottom: 14 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {TIME_FILTERS.map(f => {
              const on = period === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  onPress={() => { Haptics.selectionAsync(); setPeriod(f.id); }}
                  style={{
                    paddingHorizontal: 13, paddingVertical: 6, borderRadius: 8,
                    backgroundColor: on ? C.primary : 'transparent',
                    borderWidth: 1, borderColor: on ? C.primary : hair,
                  }}
                >
                  <Text style={{
                    fontFamily: F.header, fontSize: 10,
                    color: on ? C.onPrimary : C.onSurfaceVariant,
                  }}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: HORIZ_PAD, paddingBottom: 140 }}
          showsVerticalScrollIndicator={false}
        >

          {/* ════════════════════════════════════════════════════════════════
              FITNESS SCORE
          ════════════════════════════════════════════════════════════════ */}
          <Section delay={60}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              {/* Left — label + number */}
              <View style={{ flex: 1, marginRight: 16 }}>
                <Text style={{ fontFamily: F.header, fontSize: 10, letterSpacing: 1.2, color: C.primary, marginBottom: 4 }}>
                  FITNESS SCORE
                </Text>
                {fitL ? (
                  <Skeleton w={80} h={32} />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 1 }}>
                    <Num v={fit?.score || 0} style={{ fontFamily: F.num, fontSize: 34, letterSpacing: -1.5, color: C.onSurface }} />
                    <Text style={{ fontFamily: F.header, fontSize: 13, color: C.onSurfaceVariant }}>/100</Text>
                  </View>
                )}
                {fit?.motivation ? (
                  <Text style={{ fontFamily: F.bodyMed, fontSize: 11, color: C.success, marginTop: 4 }}>{fit.motivation}</Text>
                ) : !fitL ? (
                  <Text style={{ fontFamily: F.bodyMed, fontSize: 11, color: C.onSurfaceVariant, marginTop: 4 }}>
                    Complete workouts to build your score
                  </Text>
                ) : null}
              </View>

              {/* Right — ring */}
              {!fitL && fit ? (
                <View style={{ width: 72, height: 72 }}>
                  <ActivityRings
                    size={72}
                    rings={[{ progress: (fit.score || 0) / 100, color: C.primary, radius: 30, strokeWidth: 6 }]}
                  />
                  <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
                    <Text style={{ fontFamily: F.num, fontSize: 16, color: C.onSurface }}>{fit.score || 0}</Text>
                  </View>
                </View>
              ) : null}
            </View>

            {/* Sub-scores row — consistent ring badges */}
            {fit ? (
              <View style={{
                flexDirection: 'row', marginTop: 12, gap: 8,
                paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: hair,
              }}>
                <StatBadge label="Consistency" value={fit.consistencyScore || 0} color="#4ade80" />
                <StatBadge label="Recovery" value={fit.recoveryScore || 0} color="#38bdf8" />
                <StatBadge label="Streak" value={fit.streakScore || 0} color="#f59e0b" />
                <StatBadge label="Days" value={streak?.currentStreak || fit?.streak || 0} color={C.primary} />
              </View>
            ) : null}
          </Section>

          {/* ════════════════════════════════════════════════════════════════
              TRAINING
          ════════════════════════════════════════════════════════════════ */}
          <Section delay={120}>
            <SectionHeader title="Training" />

            {/* ── Workouts column ── */}
            <View style={{ marginBottom: 16 }}>
              <SubLabel text="WORKOUTS" icon="dumbbell" />
              {wo ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
                  {/* Ring */}
                  <View style={{ width: 64, height: 64, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityRings
                      size={64}
                      rings={[{ progress: (wo.completionPct || 0) / 100, color: C.primary, radius: 26, strokeWidth: 6 }]}
                    />
                    <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
                      <Text style={{ fontFamily: F.num, fontSize: 14, color: C.onSurface }}>{wo.completionPct || 0}%</Text>
                    </View>
                  </View>
                  {/* Stats */}
                  <View style={{ gap: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Text style={{ fontFamily: F.bodyMed, fontSize: 10, color: C.onSurfaceVariant, width: 46 }}>Completed</Text>
                      <Text style={{ fontFamily: F.num, fontSize: 14, color: C.onSurface }}>{wo.completed || 0}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Text style={{ fontFamily: F.bodyMed, fontSize: 10, color: C.onSurfaceVariant, width: 46 }}>Missed</Text>
                      <Text style={{ fontFamily: F.num, fontSize: 14, color: '#f87171' }}>{wo.missed || 0}</Text>
                    </View>
                  </View>
                </View>
              ) : (
                <Text style={{ fontFamily: F.bodyMed, fontSize: 11, color: C.onSurfaceVariant }}>No workout data yet</Text>
              )}
            </View>

            {/* Hairline separator between workout/calories */}
            <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: hair, marginBottom: 14 }} />

            {/* ── Calories column ── */}
            <View>
              <SubLabel text="CALORIES" icon="fire" />
              {cal ? (
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
                    <Num v={cal.total || 0} style={{ fontFamily: F.num, fontSize: 22, letterSpacing: -0.8, color: C.onSurface }} />
                    <Text style={{ fontFamily: F.header, fontSize: 10, color: C.onSurfaceVariant }}>kcal</Text>
                    <Text style={{ fontFamily: F.bodyMed, fontSize: 10, color: C.onSurfaceVariant, marginLeft: 6 }}>
                      Avg {cal.dailyAvg || 0}/day
                    </Text>
                  </View>
                  {cal.chartData?.length > 0 ? (
                    <View style={{ height: 40, marginTop: 8 }}>
                      <BarChart data={cal.chartData} height={40} color="#f97316" hideLabels />
                    </View>
                  ) : null}
                </View>
              ) : (
                <Text style={{ fontFamily: F.bodyMed, fontSize: 11, color: C.onSurfaceVariant }}>No calorie data yet</Text>
              )}
            </View>
          </Section>

          {/* ════════════════════════════════════════════════════════════════
              BODY & STRENGTH
          ════════════════════════════════════════════════════════════════ */}
          <Section delay={180}>
            <SectionHeader title="Body & Strength" />

            <View style={{ flexDirection: 'row', gap: 16 }}>
              {/* Weight */}
              <View style={{ flex: 1 }}>
                <SubLabel text="WEIGHT" />
                {wt && wt.current > 0 ? (
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                      <Num v={wt.current} style={{ fontFamily: F.num, fontSize: 24, letterSpacing: -0.8, color: C.onSurface }} />
                      <Text style={{ fontFamily: F.bodyMed, fontSize: 10, color: C.onSurfaceVariant }}>kg</Text>
                    </View>
                    {wt.change !== 0 ? (
                      <Text style={{
                        fontFamily: F.header, fontSize: 11, marginTop: 2,
                        color: (wt.change || 0) <= 0 ? C.success : '#f87171',
                      }}>
                        {(wt.change || 0) <= 0 ? '↓' : '↑'} {Math.abs(wt.change || 0)} kg
                      </Text>
                    ) : null}
                  </View>
                ) : (
                  <Text style={{ fontFamily: F.bodyMed, fontSize: 11, color: C.onSurfaceVariant }}>Log in profile</Text>
                )}
              </View>

              {/* Hairline vertical divider */}
              <View style={{ width: StyleSheet.hairlineWidth, backgroundColor: hair }} />

              {/* Strength */}
              <View style={{ flex: 1 }}>
                <SubLabel text="STRENGTH" />
                {str?.radarData?.length > 0 ? (
                  <View style={{ alignItems: 'center', marginTop: 4 }}>
                    <RadarChart data={str.radarData} size={80} color={C.primary} />
                  </View>
                ) : (
                  <Text style={{ fontFamily: F.bodyMed, fontSize: 11, color: C.onSurfaceVariant }}>No data yet</Text>
                )}
              </View>
            </View>
          </Section>

          {/* ════════════════════════════════════════════════════════════════
              WEEKLY LOAD
          ════════════════════════════════════════════════════════════════ */}
          <Section delay={240}>
            <SectionHeader title="Weekly Load" />
            <View style={{ height: 90, justifyContent: 'center' }}>
              {wo?.chartData?.length > 0 ? (
                <BarChart data={wo.chartData} height={80} color={C.primary} />
              ) : (
                <Text style={{ fontFamily: F.bodyMed, fontSize: 11, color: C.onSurfaceVariant, textAlign: 'center' }}>
                  Complete a workout to see data
                </Text>
              )}
            </View>
          </Section>

          {/* ════════════════════════════════════════════════════════════════
              AI INSIGHTS
          ════════════════════════════════════════════════════════════════ */}
          <Section delay={300}>
            <SectionHeader title="AI Insights" />
            <TouchableOpacity
              onPress={() => { Haptics.selectionAsync(); setAiOpen(!aiOpen); }}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="auto-awesome" size={14} color={C.primary} />
                <Text style={{ flex: 1, fontFamily: F.header, fontSize: 12, color: C.onSurface }}>
                  Coach Summary
                </Text>
                <Icon name={aiOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={16} color={C.onSurfaceVariant} />
              </View>
              <Text style={{
                fontFamily: F.body, fontSize: 12, color: C.onSurfaceVariant,
                lineHeight: 18, marginTop: 8, paddingLeft: 20,
              }}>
                {ai?.progressText || 'Keep training consistently!'}
              </Text>
              {ai?.suggestions?.length > 0 && aiOpen ? (
                <View style={{ marginTop: 10, gap: 4, paddingLeft: 20 }}>
                  {ai.suggestions.map((s: any, i: number) => (
                    <Text key={i} style={{ fontFamily: F.body, fontSize: 11, color: C.onSurfaceVariant, lineHeight: 16 }}>
                      • {s.name || s}
                    </Text>
                  ))}
                </View>
              ) : null}
            </TouchableOpacity>
          </Section>

          {/* ════════════════════════════════════════════════════════════════
              NUTRITION
          ════════════════════════════════════════════════════════════════ */}
          <Section delay={360}>
            <SectionHeader title="Nutrition" />
            <SubLabel text="TODAY" icon="food-apple-outline" />
            {nut ? (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[
                  { l: 'Calories', v: `${nut.calories || 0}`, c: '#f97316' },
                  { l: 'Protein', v: `${nut.protein || 0}g`, c: '#4ade80' },
                  { l: 'Carbs', v: `${nut.carbs || 0}g`, c: '#38bdf8' },
                  { l: 'Fat', v: `${nut.fat || 0}g`, c: '#f59e0b' },
                ].map(m => (
                  <View key={m.l} style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ fontFamily: F.num, fontSize: 15, color: C.onSurface }}>{m.v}</Text>
                    <Text style={{ fontFamily: F.bodyMed, fontSize: 8, color: C.onSurfaceVariant, marginTop: 2 }}>{m.l}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={{ fontFamily: F.bodyMed, fontSize: 11, color: C.onSurfaceVariant }}>
                Log meals to see nutrition
              </Text>
            )}
          </Section>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: 'transparent' },
});
