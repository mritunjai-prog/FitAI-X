/**
 * ════════════════════════════════════════════════════════════════════════════
 *  FitAI X — RECOVERY & HEALTH
 *  Single-file screen. Today · Sleep · Body · Trends.
 * ════════════════════════════════════════════════════════════════════════════
 *
 *  NO HARDCODED DATA
 *  ------------------------------------------------------------------------
 *  Every number, label and list on this screen is derived from the API.
 *  There are no fallback constants, no placeholder arrays and no `|| 82`
 *  style defaults that would render a plausible-looking lie when a request
 *  fails.
 *
 *  Instead each section resolves to exactly one of three states:
 *    loading  → Skeleton placeholders (shape only, no numbers)
 *    empty    → An explicit "no data" message naming the missing source
 *    error    → A retry affordance
 *
 *  DESIGN CONTRACT — "no cards"
 *  Nothing renders `borderRadius + borderWidth + backgroundColor` as a
 *  CONTAINER. Hierarchy comes from two hairline weights, separator insets,
 *  gradient washes that fade to transparent, and the type scale.
 *
 *  BOTTOM NAV — Full BottomNavigation component with FAB for quick actions
 * ════════════════════════════════════════════════════════════════════════════
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  Extrapolation,
  FadeIn,
  FadeOut,
  Layout,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient as SvgGrad, Path, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import MeshGradientBackground from '../components/MeshGradientBackground';
import BottomNavigation from '../components/BottomNavigation';
import ActivityRings from '../components/charts/ActivityRings';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { F, ThemeColors } from '../theme';
import {
  fetchHeartRateData,
  fetchRecoveryInsights,
  fetchRecoveryOverview,
  fetchRecoveryScore,
  fetchRecoveryTimeline,
  fetchSleepData,
  fetchStressData,
  fetchWaterData,
} from '../services/api/recovery';

/* ──────────────────────────────────────────────────────────────────────────
   TYPES
   ────────────────────────────────────────────────────────────────────────── */
export type RecoveryTabKey = 'today' | 'sleep' | 'body' | 'trends';

export interface RecoveryScore {
  score?: number;
  status?: string;
  delta?: number;
  updatedAt?: string;
  headline?: string;
  summary?: string;
  contributors?: Array<{
    key?: string;
    label?: string;
    value?: number;
    weight?: number;
    detail?: string;
    positive?: boolean;
  }>;
}

export interface RecoveryOverview {
  recoveryStatus?: string;
  description?: string;
}

export interface VitalSeries {
  label?: string;
  caption?: string;
  value?: number | string;
  unit?: string;
  trend?: number[];
  tone?: 'sleep' | 'heart' | 'water' | 'stress' | 'positive' | 'neutral';
}

export interface SleepStage {
  name?: string;
  minutes?: number;
  percent?: number;
  target?: string;
}

export interface SleepData {
  totalMinutes?: number;
  quality?: string;
  qualityScore?: number;
  bedtime?: string;
  wakeTime?: string;
  efficiency?: number;
  latencyMinutes?: number;
  debtHours?: number;
  summary?: string;
  deltaMinutes?: number;
  stages?: SleepStage[];
  hypnogram?: Array<{ stage?: string; minutes?: number }>;
  consistency?: Array<{ label?: string; value?: number }>;
  consistencyNote?: string;
}

export interface MuscleFatigue {
  muscle?: string;
  fatigue?: number;
  view?: 'front' | 'back';
  readyInHours?: number;
}

export interface BodyData {
  muscles?: MuscleFatigue[];
  injuries?: Array<{ area?: string; note?: string; flaggedAt?: string }>;
}

export interface TimelinePoint {
  label?: string;
  value?: number;
  isNow?: boolean;
}

export interface RecoveryInsights {
  headline?: string;
  details?: Array<{ title?: string; body?: string }>;
  protocol?: Array<{
    id?: string;
    title?: string;
    description?: string;
    durationLabel?: string;
    whenLabel?: string;
    impact?: number;
    completed?: boolean;
    icon?: string;
  }>;
}

export interface TrendsData {
  daily?: Array<{ label?: string; value?: number }>;
  weeklyAverage?: number;
  weeklyDelta?: number;
  monthly?: Array<{ label?: string; value?: string; unit?: string; tone?: string }>;
  correlations?: Array<{
    title?: string;
    description?: string;
    impact?: number;
    strength?: number;
  }>;
  streaks?: Array<{ label?: string; value?: string }>;
  summary?: string;
}

/* ──────────────────────────────────────────────────────────────────────────
   TOKENS
   ────────────────────────────────────────────────────────────────────────── */
interface Tokens {
  hair: string;
  hairSoft: string;
  hairGold: string;
  track: string;
  wash: string;
  hairline: number;
  gutter: number;
  indent: number;
}

const makeTokens = (isDark: boolean): Tokens => ({
  hair: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(20,18,10,0.13)',
  hairSoft: isDark ? 'rgba(255,255,255,0.055)' : 'rgba(20,18,10,0.07)',
  hairGold: isDark ? 'rgba(245,196,0,0.28)' : 'rgba(160,118,0,0.36)',
  track: isDark ? 'rgba(255,255,255,0.09)' : 'rgba(20,18,10,0.10)',
  wash: isDark ? 'rgba(245,196,0,0.055)' : 'rgba(245,196,0,0.10)',
  hairline: StyleSheet.hairlineWidth,
  gutter: 22,
  indent: 60,
});

const makeAccents = (isDark: boolean) => ({
  sleep: isDark ? '#A855F7' : '#7E22CE',
  heart: isDark ? '#FF4B2B' : '#D63A1E',
  water: isDark ? '#38BDF8' : '#0E7490',
  stress: isDark ? '#FB923C' : '#B45309',
  green: isDark ? '#A3E635' : '#5E8B00',
  red: isDark ? '#F87171' : '#C2413E',
  cyan: isDark ? '#7DD3FC' : '#0E7490',
});
type Accents = ReturnType<typeof makeAccents>;

/* ──────────────────────────────────────────────────────────────────────────
   UTILITIES
   ────────────────────────────────────────────────────────────────────────── */
type HapticStyle = 'light' | 'medium' | 'success' | 'select';
function haptic(style: HapticStyle = 'light'): void {
  if (Platform.OS === 'web') return;
  switch (style) {
    case 'success': void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); break;
    case 'select': void Haptics.selectionAsync(); break;
    case 'medium': void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); break;
    default: void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

const has = <T,>(v: T | null | undefined): v is T => v !== null && v !== undefined;
const hasItems = <T,>(v: T[] | null | undefined): v is T[] => Array.isArray(v) && v.length > 0;

const fmtMinutes = (mins?: number): string | null => {
  if (!has(mins) || !Number.isFinite(mins)) return null;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return h > 0 ? `${h}h ${m.toString().padStart(2, '0')}m` : `${m}m`;
};

const signed = (n?: number): string | null =>
  has(n) && Number.isFinite(n) ? `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n)}` : null;

/* ──────────────────────────────────────────────────────────────────────────
   PRIMITIVES
   ────────────────────────────────────────────────────────────────────────── */
function Skeleton({ width, height, radius = 6, style, isDark }: {
  width: number | `${number}%`; height: number; radius?: number;
  style?: StyleProp<ViewStyle>; isDark: boolean;
}) {
  const T = makeTokens(isDark);
  const o = useSharedValue(0.35);
  useEffect(() => {
    o.value = withRepeat(
      withSequence(
        withTiming(0.75, { duration: 780, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.35, { duration: 780, easing: Easing.inOut(Easing.ease) }),
      ), -1, true,
    );
  }, [o]);
  const anim = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: T.track }, style, anim]} />;
}

function PressableScale({ children, onPress, style, disabled, hapticStyle: hs = 'light', scaleTo = 0.96 }: {
  children: React.ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle>;
  disabled?: boolean; hapticStyle?: HapticStyle; scaleTo?: number;
}) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable
      disabled={disabled}
      onPressIn={() => { scale.value = withSpring(scaleTo, { damping: 15, stiffness: 320 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 320 }); }}
      onPress={() => { if (disabled) return; haptic(hs); onPress?.(); }}
      style={style}
    >
      <Animated.View style={anim}>{children}</Animated.View>
    </Pressable>
  );
}

function SectionLabel({ text, C, actionNode }: { text: string; C: ThemeColors; actionNode?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop: 26, paddingBottom: 12 }}>
      <Text style={{ fontFamily: F.header, fontSize: 11, letterSpacing: 1.5, color: C.onSurfaceVariant, textTransform: 'uppercase' }}>
        {text}
      </Text>
      {actionNode}
    </View>
  );
}

function Rule({ isDark, soft = false }: { isDark: boolean; soft?: boolean }) {
  const T = makeTokens(isDark);
  return <View style={{ height: T.hairline, marginHorizontal: T.gutter, backgroundColor: soft ? T.hairSoft : T.hair }} />;
}

interface StatItem { value: string; unit?: string; label: string; tone?: string; }

function StatColumns({ items, C, isDark, bordered = true }: {
  items: StatItem[]; C: ThemeColors; isDark: boolean; bordered?: boolean;
}) {
  const T = makeTokens(isDark);
  return (
    <View style={[
      { flexDirection: 'row', paddingHorizontal: T.gutter },
      bordered && { borderTopWidth: T.hairline, borderBottomWidth: T.hairline, borderColor: T.hair },
    ]}>
      {items.map((it, i) => (
        <View key={`${it.label}-${i}`} style={{ flex: 1, paddingVertical: 15, paddingLeft: i === 0 ? 0 : 16, minWidth: 0 }}>
          {i > 0 && (
            <View style={{ position: 'absolute', left: 0, top: 15, bottom: 15, width: T.hairline, backgroundColor: T.hairSoft }} />
          )}
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text numberOfLines={1} style={{ fontFamily: F.num, fontSize: 20, letterSpacing: -0.7, color: it.tone ?? C.onSurface }}>
              {it.value}
            </Text>
            {!!it.unit && (
              <Text style={{ fontFamily: F.bodyMed, fontSize: 11, color: C.onSurfaceVariant, marginLeft: 3 }}>{it.unit}</Text>
            )}
          </View>
          <Text numberOfLines={1} style={{ fontFamily: F.header, fontSize: 9.5, letterSpacing: 1.1, color: C.onSurfaceVariant, marginTop: 6, textTransform: 'uppercase' }}>
            {it.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

function Track({ progress, color, isDark, height: h = 4 }: { progress: number; color: string; isDark: boolean; height?: number }) {
  const T = makeTokens(isDark);
  const w = useSharedValue(0);
  useEffect(() => {
    w.value = withTiming(Math.min(Math.max(progress, 0), 1), { duration: 620, easing: Easing.out(Easing.cubic) });
  }, [progress, w]);
  const anim = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  return (
    <View style={{ height: h, borderRadius: h / 2, backgroundColor: T.track, overflow: 'hidden' }}>
      <Animated.View style={[{ height: h, borderRadius: h / 2, backgroundColor: color }, anim]} />
    </View>
  );
}

function Sparkline({ points, color, width: w = 70, height: h = 26 }: { points?: number[]; color: string; width?: number; height?: number }) {
  if (!hasItems(points) || points.length < 2) return <View style={{ width: w, height: h }} />;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const d = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - ((p - min) / span) * (h - 5) - 2.5;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <Svg width={w} height={h}>
      <Path d={d} fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
    </Svg>
  );
}

function ForecastCurve({ points, color, width: w, height: h = 96, isDark }: {
  points: number[]; color: string; width: number; height?: number; isDark: boolean;
}) {
  const T = makeTokens(isDark);
  if (points.length < 2) return null;
  const MIN = 0, MAX = 100;
  const X = (i: number) => (i / (points.length - 1)) * w;
  const Y = (v: number) => h - ((v - MIN) / (MAX - MIN)) * (h - 16) - 8;
  let d = `M${X(0)},${Y(points[0])}`;
  for (let i = 1; i < points.length; i++) {
    const x0 = X(i - 1), y0 = Y(points[i - 1]);
    const x1 = X(i), y1 = Y(points[i]);
    const mid = (x0 + x1) / 2;
    d += `C${mid},${y0} ${mid},${y1} ${x1},${y1}`;
  }
  return (
    <Svg width={w} height={h}>
      <Defs>
        <SvgGrad id="fcFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0.22" />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </SvgGrad>
      </Defs>
      <Path d={`M0,${Y(100)} L${w},${Y(100)}`} stroke={T.hairSoft} strokeWidth={1} strokeDasharray="3 4" />
      <Path d={`${d} L${w},${h} L0,${h} Z`} fill="url(#fcFill)" />
      <Path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Circle cx={X(0)} cy={Y(points[0])} r={4} fill={color} />
    </Svg>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   STATE VIEWS
   ────────────────────────────────────────────────────────────────────────── */
function EmptyState({ icon = 'insights', title, body, actionLabel, onAction, C, compact = false }: {
  icon?: keyof typeof Icon.glyphMap; title: string; body: string;
  actionLabel?: string; onAction?: () => void; C: ThemeColors; compact?: boolean;
}) {
  return (
    <View style={{ paddingHorizontal: 36, paddingTop: compact ? 26 : 62, paddingBottom: compact ? 18 : 40, alignItems: 'center' }}>
      <View style={{ opacity: 0.28, marginBottom: 16 }}>
        <Icon name={icon} size={compact ? 34 : 52} color={C.onSurfaceVariant} />
      </View>
      <Text style={{ fontFamily: F.header, fontSize: compact ? 15 : 17.5, letterSpacing: -0.3, color: C.onSurface, marginBottom: 8, textAlign: 'center' }}>
        {title}
      </Text>
      <Text style={{ fontFamily: F.bodyMed, fontSize: compact ? 12.5 : 13.5, lineHeight: compact ? 19 : 22, color: C.onSurfaceVariant, textAlign: 'center', maxWidth: 270 }}>
        {body}
      </Text>
      {!!actionLabel && (
        <PressableScale onPress={onAction} style={{ marginTop: 20 }} hapticStyle="medium">
          <LinearGradient colors={[C.primary, C.primaryDim]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 13, paddingHorizontal: 22, borderRadius: 14 }}>
            <Icon name="refresh" size={16} color={C.onPrimary} />
            <Text style={{ fontFamily: F.header, fontSize: 14, color: C.onPrimary }}>{actionLabel}</Text>
          </LinearGradient>
        </PressableScale>
      )}
    </View>
  );
}

function ErrorState({ message, onRetry, C }: { message: string; onRetry: () => void; C: ThemeColors }) {
  return (
    <View style={{ paddingHorizontal: 36, paddingTop: 56, alignItems: 'center' }}>
      <Icon name="error-outline" size={44} color={C.error} style={{ opacity: 0.7, marginBottom: 16 }} />
      <Text style={{ fontFamily: F.header, fontSize: 17, letterSpacing: -0.3, color: C.onSurface, marginBottom: 8, textAlign: 'center' }}>
        Couldn't load recovery data
      </Text>
      <Text style={{ fontFamily: F.bodyMed, fontSize: 13.5, lineHeight: 22, color: C.onSurfaceVariant, textAlign: 'center', maxWidth: 280 }}>
        {message}
      </Text>
      <PressableScale onPress={onRetry} style={{ marginTop: 20 }} hapticStyle="medium">
        <LinearGradient colors={[C.primary, C.primaryDim]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 13, paddingHorizontal: 22, borderRadius: 14 }}>
          <Icon name="refresh" size={16} color={C.onPrimary} />
          <Text style={{ fontFamily: F.header, fontSize: 14, color: C.onPrimary }}>Try again</Text>
        </LinearGradient>
      </PressableScale>
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   TAB BAR
   ────────────────────────────────────────────────────────────────────────── */
const TABS: ReadonlyArray<{ key: RecoveryTabKey; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: 'sleep', label: 'Sleep' },
  { key: 'body', label: 'Body' },
  { key: 'trends', label: 'Trends' },
] as const;

function RecoveryTabs({ active, onChange, C, isDark }: {
  active: RecoveryTabKey; onChange: (t: RecoveryTabKey) => void; C: ThemeColors; isDark: boolean;
}) {
  const T = makeTokens(isDark);
  const metrics = React.useRef<Partial<Record<RecoveryTabKey, { x: number; w: number }>>>({});
  const [ready, setReady] = useState(false);
  const inkX = useSharedValue(0);
  const inkW = useSharedValue(0);
  const settle = useCallback((key: RecoveryTabKey, animate: boolean) => {
    const m = metrics.current[key];
    if (!m) return;
    const spring = { damping: 18, stiffness: 190 };
    inkX.value = animate ? withSpring(m.x, spring) : m.x;
    inkW.value = animate ? withSpring(m.w, spring) : m.w;
  }, [inkX, inkW]);
  const ink = useAnimatedStyle(() => ({ transform: [{ translateX: inkX.value }], width: inkW.value }));
  return (
    <View style={{ flexDirection: 'row', gap: 20, marginHorizontal: T.gutter, marginTop: 16, borderBottomWidth: T.hairline, borderBottomColor: T.hairSoft }}>
      {TABS.map((t) => {
        const on = t.key === active;
        return (
          <Pressable key={t.key} hitSlop={8}
            onLayout={(e) => {
              const { x, width } = e.nativeEvent.layout;
              metrics.current[t.key] = { x, w: width };
              if (t.key === active) { settle(t.key, ready); if (!ready) setReady(true); }
            }}
            onPress={() => { if (on) return; haptic('select'); onChange(t.key); settle(t.key, true); }}
            style={{ paddingBottom: 11 }}
          >
            <Text style={{ fontFamily: on ? F.header : F.bodyBold, fontSize: 14.5, letterSpacing: -0.2, color: on ? C.onSurface : C.onSurfaceVariant }}>
              {t.label}
            </Text>
          </Pressable>
        );
      })}
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', bottom: -T.hairline, left: 0, height: 2.5, borderRadius: 2, backgroundColor: C.primary }, ink]} />
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   AI COACH
   ────────────────────────────────────────────────────────────────────────── */
function AiCoach({ label, headline, details, C, isDark }: {
  label: string; headline?: string; details?: Array<{ title?: string; body?: string }>;
  C: ThemeColors; isDark: boolean;
}) {
  const T = makeTokens(isDark);
  const [open, setOpen] = useState(false);
  if (!headline) return null;
  const expandable = hasItems(details);
  return (
    <View style={{ paddingHorizontal: T.gutter, paddingVertical: 16 }}>
      <LinearGradient colors={[C.primary, 'transparent']} style={{ position: 'absolute', left: 0, top: 16, bottom: 18, width: 2.5 }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Icon name="auto-awesome" size={16} color={C.primary} />
        <Text style={{ flex: 1, fontFamily: F.header, fontSize: 13, letterSpacing: 0.2, color: C.onSurface }}>{label}</Text>
        {expandable && (
          <Pressable hitSlop={10} onPress={() => { haptic('select'); setOpen((v) => !v); }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Text style={{ fontFamily: F.header, fontSize: 12.5, color: C.primary }}>{open ? 'Less' : 'Details'}</Text>
            <Icon name={open ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={15} color={C.primary} />
          </Pressable>
        )}
      </View>
      <Text style={{ fontFamily: F.bodyMed, fontSize: 14, lineHeight: 22.6, color: C.onSurface }}>{headline}</Text>
      {open && expandable && (
        <Animated.View entering={FadeIn.duration(170)} exiting={FadeOut.duration(130)} style={{ marginTop: 16 }}>
          {details!.map((d, i) => (
            <View key={d.title ?? i} style={{ paddingVertical: 13 }}>
              {i > 0 && <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: T.hairline, backgroundColor: T.hairSoft }} />}
              {!!d.title && <Text style={{ fontFamily: F.header, fontSize: 12, letterSpacing: 0.3, color: C.onSurface, marginBottom: 4 }}>{d.title}</Text>}
              {!!d.body && <Text style={{ fontFamily: F.bodyMed, fontSize: 13, lineHeight: 20, color: C.onSurfaceVariant }}>{d.body}</Text>}
            </View>
          ))}
        </Animated.View>
      )}
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   TAB · TODAY
   ────────────────────────────────────────────────────────────────────────── */
function TodayTab({ score, overview, vitals, insights, timeline, protocolOverride, onToggleProtocol, loading, contentWidth, C, isDark, A }: {
  score?: RecoveryScore; overview?: RecoveryOverview; vitals: VitalSeries[]; insights?: RecoveryInsights;
  timeline: TimelinePoint[]; protocolOverride: Record<string, boolean>; onToggleProtocol: (id: string) => void;
  loading: boolean; contentWidth: number; C: ThemeColors; isDark: boolean; A: Accents;
}) {
  const T = makeTokens(isDark);
  const toneColour = useCallback((tone?: VitalSeries['tone']): string => {
    switch (tone) {
      case 'sleep': return A.sleep;
      case 'heart': return A.heart;
      case 'water': return A.water;
      case 'stress': return A.stress;
      case 'positive': return A.green;
      default: return C.primary;
    }
  }, [A, C]);

  const scoreColour = has(score?.score)
    ? score!.score! >= 75 ? A.green : score!.score! >= 50 ? C.primary : A.stress
    : C.onSurfaceVariant;

  const protocol = insights?.protocol ?? [];
  const isDone = (p: NonNullable<RecoveryInsights['protocol']>[number], idx: number) =>
    protocolOverride[p.id ?? String(idx)] ?? Boolean(p.completed);
  const doneCount = protocol.filter(isDone).length;
  const pointsGained = protocol.filter(isDone).reduce((a, p) => a + (has(p.impact) ? p.impact : 0), 0);

  return (
    <>
      {/* Score hero */}
      <View style={{ paddingHorizontal: T.gutter, paddingTop: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <Icon name="auto-awesome" size={13} color={C.primary} />
          <Text style={{ fontFamily: F.header, fontSize: 10, letterSpacing: 1.6, color: C.primary }}>
            {score?.updatedAt ? `RECOVERY SCORE · ${score.updatedAt}` : 'RECOVERY SCORE'}
          </Text>
        </View>
        {loading ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 22, marginTop: 16 }}>
            <Skeleton width={126} height={126} radius={63} isDark={isDark} />
            <View style={{ flex: 1, gap: 10 }}>
              <Skeleton width="70%" height={22} isDark={isDark} />
              <Skeleton width="100%" height={13} isDark={isDark} />
              <Skeleton width="86%" height={13} isDark={isDark} />
            </View>
          </View>
        ) : !has(score?.score) ? (
          <EmptyState compact icon="insights" title="No recovery score yet"
            body="Connect a wearable or log a night of sleep and your score will appear here." C={C} />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 22, marginTop: 16 }}>
            <View style={{ width: 126, height: 126, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityRings size={126} rings={[{ progress: score!.score! / 100, color: scoreColour, radius: 59, strokeWidth: 8 }]} />
              <View style={{ position: 'absolute', alignItems: 'center' }}>
                <Text style={{ fontFamily: F.num, fontSize: 40, letterSpacing: -2.2, color: C.onSurface }}>{Math.round(score!.score!)}</Text>
                {!!score?.status && (
                  <Text style={{ fontFamily: F.header, fontSize: 9.5, letterSpacing: 1.2, color: scoreColour, marginTop: 5 }}>
                    {score.status.toUpperCase()}
                  </Text>
                )}
              </View>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              {!!(score?.headline ?? overview?.recoveryStatus) && (
                <Text style={{ fontFamily: F.header, fontSize: 24, letterSpacing: -0.9, color: C.onSurface }}>
                  {score?.headline ?? overview?.recoveryStatus}
                </Text>
              )}
              {!!(score?.summary ?? overview?.description) && (
                <Text style={{ fontFamily: F.bodyMed, fontSize: 13, lineHeight: 20, color: C.onSurfaceVariant, marginTop: 8 }}>
                  {score?.summary ?? overview?.description}
                </Text>
              )}
              {has(score?.delta) && score!.delta !== 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 11 }}>
                  <Icon name={score!.delta! > 0 ? 'trending-up' : 'trending-down'} size={13} color={score!.delta! > 0 ? A.green : A.stress} />
                  <Text style={{ fontFamily: F.num, fontSize: 11.5, color: score!.delta! > 0 ? A.green : A.stress }}>
                    {signed(score!.delta)} vs yesterday
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Contributors */}
      {hasItems(score?.contributors) && (
        <>
          <SectionLabel text="What moved your score" C={C} />
          <View style={{ paddingHorizontal: T.gutter }}>
            {score!.contributors!.map((c, i) => {
              const colour = toneColour(
                (c.key as VitalSeries['tone']) ?? (c.positive === false ? 'stress' : 'positive'),
              );
              return (
                <View key={c.label ?? i} style={{ paddingVertical: 12 }}>
                  {i > 0 && <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: T.hairline, backgroundColor: T.hairSoft }} />}
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 9, marginBottom: 9 }}>
                    <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colour }} />
                    <Text style={{ flex: 1, fontFamily: F.bodyBold, fontSize: 13, color: C.onSurface }}>{c.label ?? '—'}</Text>
                    {has(c.value) && (
                      <Text style={{ fontFamily: F.num, fontSize: 13.5, color: colour }}>
                        {Math.round(c.value)}
                        <Text style={{ fontFamily: F.bodyMed, fontSize: 10.5, color: C.onSurfaceVariant }}>
                          {' '}/ 100{has(c.weight) ? ` · ${Math.round(c.weight * 100)}%` : ''}
                        </Text>
                      </Text>
                    )}
                  </View>
                  {has(c.value) && <Track progress={c.value / 100} color={colour} isDark={isDark} />}
                  {!!c.detail && (
                    <Text style={{ fontFamily: F.bodyBold, fontSize: 10.5, color: C.onSurfaceVariant, marginTop: 6 }}>{c.detail}</Text>
                  )}
                </View>
              );
            })}
          </View>
        </>
      )}

      {/* Vitals */}
      <SectionLabel text="Vitals" C={C} />
      {loading ? (
        <View style={{ paddingHorizontal: T.gutter, gap: 18, paddingVertical: 6 }}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Skeleton width={30} height={30} radius={15} isDark={isDark} />
              <View style={{ flex: 1, gap: 7 }}>
                <Skeleton width="52%" height={13} isDark={isDark} />
                <Skeleton width="34%" height={10} isDark={isDark} />
              </View>
              <Skeleton width={54} height={18} isDark={isDark} />
            </View>
          ))}
        </View>
      ) : !hasItems(vitals) ? (
        <EmptyState compact icon="favorite" title="No vitals recorded"
          body="Heart rate, HRV and hydration will show here once your device syncs." C={C} />
      ) : (
        vitals.map((v, i) => {
          const colour = toneColour(v.tone);
          const vitalIconName = (tone?: VitalSeries['tone']): keyof typeof Icon.glyphMap => {
            switch (tone) {
              case 'heart': return 'favorite';
              case 'water': return 'water-drop';
              case 'stress': return 'psychology';
              case 'sleep': return 'nights-stay';
              case 'positive': return 'trending-up';
              default: return 'air';
            }
          };
          return (
            <View key={v.label ?? i} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: T.gutter, paddingVertical: 14 }}>
              {i > 0 && <View style={{ position: 'absolute', left: T.gutter, right: 0, top: 0, height: T.hairline, backgroundColor: T.hairSoft }} />}
              <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: `${colour}26` }}>
                <Icon name={vitalIconName(v.tone)} size={15} color={colour} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontFamily: F.header, fontSize: 14, letterSpacing: -0.2, color: C.onSurface }}>{v.label ?? '—'}</Text>
                {!!v.caption && (
                  <Text numberOfLines={1} style={{ fontFamily: F.bodyBold, fontSize: 10.5, letterSpacing: 0.3, color: C.onSurfaceVariant, marginTop: 3 }}>
                    {v.caption.toUpperCase()}
                  </Text>
                )}
              </View>
              <Sparkline points={v.trend} color={colour} />
              <View style={{ alignItems: 'flex-end', minWidth: 58 }}>
                <Text style={{ fontFamily: F.num, fontSize: 16, letterSpacing: -0.5, color: C.onSurface }}>
                  {has(v.value) ? v.value : '—'}
                </Text>
                {!!v.unit && (
                  <Text style={{ fontFamily: F.header, fontSize: 9.5, letterSpacing: 0.6, color: C.onSurfaceVariant, marginTop: 2 }}>
                    {v.unit.toUpperCase()}
                  </Text>
                )}
              </View>
            </View>
          );
        })
      )}

      {/* AI coach */}
      {!!insights?.headline && (
        <>
          <View style={{ marginTop: 18 }}><Rule isDark={isDark} /></View>
          <AiCoach label="AI COACH" headline={insights.headline} details={insights.details} C={C} isDark={isDark} />
          <Rule isDark={isDark} />
        </>
      )}

      {/* Protocol */}
      {hasItems(protocol) && (
        <>
          <SectionLabel text="Recovery protocol" C={C}
            actionNode={<Text style={{ fontFamily: F.header, fontSize: 13, color: C.primary }}>
              {doneCount}/{protocol.length}{pointsGained > 0 ? ` · +${pointsGained} pts` : ''}
            </Text>}
          />
          {protocol.map((p, i) => {
            const id = p.id ?? String(i);
            const done = isDone(p, i);
            const inner = (
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingHorizontal: T.gutter, paddingVertical: 15 }}>
                {i > 0 && <View style={{ position: 'absolute', left: T.indent, right: 0, top: 0, height: T.hairline, backgroundColor: T.hairSoft }} />}
                <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: done ? 0 : 1.6, borderColor: T.hair, backgroundColor: done ? A.green : 'transparent', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                  {done && <Icon name="check" size={13} color={isDark ? C.bg : '#FFFFFF'} />}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontFamily: F.header, fontSize: 15, letterSpacing: -0.2, color: done ? C.onSurfaceVariant : C.onSurface, textDecorationLine: done ? 'line-through' : 'none' }}>
                    {p.title ?? '—'}
                  </Text>
                  {!!p.description && (
                    <Text style={{ fontFamily: F.bodyMed, fontSize: 12.5, lineHeight: 19, color: C.onSurfaceVariant, marginTop: 4 }}>
                      {p.description}
                    </Text>
                  )}
                  {(!!p.durationLabel || !!p.whenLabel) && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 }}>
                      {!!p.durationLabel && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <Icon name="timer" size={11} color={C.onSurfaceVariant} />
                          <Text style={{ fontFamily: F.num, fontSize: 10.5, color: C.onSurfaceVariant }}>{p.durationLabel}</Text>
                        </View>
                      )}
                      {!!p.whenLabel && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <Icon name="schedule" size={11} color={C.onSurfaceVariant} />
                          <Text style={{ fontFamily: F.num, fontSize: 10.5, color: C.onSurfaceVariant }}>{p.whenLabel}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
                {has(p.impact) && <Text style={{ fontFamily: F.num, fontSize: 11, color: A.green, marginTop: 1 }}>+{p.impact} pts</Text>}
              </View>
            );
            return (
              <Animated.View key={id} layout={Layout.springify().damping(18)}>
                <Pressable onPress={() => { haptic(done ? 'light' : 'success'); onToggleProtocol(id); }}>
                  {done ? (
                    <LinearGradient colors={[`${A.green}1A`, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} locations={[0, 0.8]}>
                      {inner}
                    </LinearGradient>
                  ) : inner}
                </Pressable>
              </Animated.View>
            );
          })}
        </>
      )}

      {/* Forecast */}
      {hasItems(timeline) && timeline.length >= 2 && (
        <>
          <SectionLabel text="Forecast" C={C} />
          <View style={{ paddingHorizontal: T.gutter }}>
            <ForecastCurve points={timeline.map((p) => (has(p.value) ? p.value : 0))} color={C.primary} width={contentWidth} isDark={isDark} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 9 }}>
              {timeline.map((p, i) => (
                <View key={p.label ?? i} style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontFamily: F.num, fontSize: 14, letterSpacing: -0.5, color: p.isNow ? C.primary : C.onSurface }}>
                    {has(p.value) ? `${Math.round(p.value)}%` : '—'}
                  </Text>
                  {!!p.label && (
                    <Text style={{ fontFamily: F.header, fontSize: 9, letterSpacing: 0.8, color: C.onSurfaceVariant, marginTop: 4 }}>
                      {p.label.toUpperCase()}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        </>
      )}
    </>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   TAB · SLEEP
   ────────────────────────────────────────────────────────────────────────── */
function SleepTab({ sleep, loading, C, isDark, A }: {
  sleep?: SleepData; loading: boolean; C: ThemeColors; isDark: boolean; A: Accents;
}) {
  const T = makeTokens(isDark);
  const [selectedSegment, setSelectedSegment] = useState<number | null>(null);
  const stageColour = useCallback((name?: string): string => {
    const n = (name ?? '').toLowerCase();
    if (n.includes('deep')) return A.green;
    if (n.includes('rem')) return A.sleep;
    if (n.includes('light')) return A.cyan;
    return C.onSurfaceVariant;
  }, [A, C]);

  if (loading) {
    return (
      <View style={{ paddingHorizontal: T.gutter, paddingTop: 22, gap: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 22 }}>
          <Skeleton width={104} height={104} radius={52} isDark={isDark} />
          <View style={{ flex: 1, gap: 10 }}>
            <Skeleton width="60%" height={22} isDark={isDark} />
            <Skeleton width="100%" height={13} isDark={isDark} />
          </View>
        </View>
        <Skeleton width="100%" height={56} radius={8} isDark={isDark} />
        <Skeleton width="100%" height={140} isDark={isDark} />
      </View>
    );
  }
  if (!sleep || !has(sleep.totalMinutes)) {
    return <EmptyState icon="bedtime" title="No sleep recorded"
      body="Wear your device overnight or log sleep manually, and last night's stages will appear here." C={C} />;
  }

  const totalLabel = fmtMinutes(sleep.totalMinutes);
  const hypnoTotal = (sleep.hypnogram ?? []).reduce((a, h) => a + (h.minutes ?? 0), 0);

  return (
    <>
      <View style={{ paddingHorizontal: T.gutter, paddingTop: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <Icon name="nights-stay" size={13} color={C.primary} />
          <Text style={{ fontFamily: F.header, fontSize: 10, letterSpacing: 1.6, color: C.primary }}>
            {sleep.bedtime && sleep.wakeTime ? `LAST NIGHT · ${sleep.bedtime} – ${sleep.wakeTime}` : 'LAST NIGHT'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 22, marginTop: 16 }}>
          {has(sleep.qualityScore) && (
            <View style={{ width: 104, height: 104, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityRings size={104} rings={[{ progress: sleep.qualityScore / 100, color: A.sleep, radius: 48, strokeWidth: 7 }]} />
              <View style={{ position: 'absolute', alignItems: 'center' }}>
                <Text style={{ fontFamily: F.num, fontSize: 32, letterSpacing: -1.6, color: C.onSurface }}>{Math.round(sleep.qualityScore)}</Text>
                <Text style={{ fontFamily: F.header, fontSize: 9, letterSpacing: 1.1, color: A.sleep, marginTop: 3 }}>
                  {(sleep.quality ?? 'QUALITY').toUpperCase()}
                </Text>
              </View>
            </View>
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            {!!totalLabel && <Text style={{ fontFamily: F.header, fontSize: 24, letterSpacing: -0.9, color: C.onSurface }}>{totalLabel}</Text>}
            {!!sleep.summary && <Text style={{ fontFamily: F.bodyMed, fontSize: 13, lineHeight: 20, color: C.onSurfaceVariant, marginTop: 8 }}>{sleep.summary}</Text>}
            {has(sleep.deltaMinutes) && sleep.deltaMinutes !== 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 11 }}>
                <Icon name={sleep.deltaMinutes > 0 ? 'trending-up' : 'trending-down'} size={13} color={sleep.deltaMinutes > 0 ? A.green : A.stress} />
                <Text style={{ fontFamily: F.num, fontSize: 11.5, color: sleep.deltaMinutes > 0 ? A.green : A.stress }}>
                  {signed(sleep.deltaMinutes)}m vs your average
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Hypnogram */}
      {hasItems(sleep.hypnogram) && hypnoTotal > 0 && (
        <>
          <SectionLabel text="Hypnogram" C={C} />
          <View style={{ paddingHorizontal: T.gutter }}>
            <View style={{ flexDirection: 'row', height: 56, borderRadius: 8, overflow: 'hidden', gap: 2 }}>
              {sleep.hypnogram!.map((h, i) => (
                <Pressable key={i} onPress={() => { haptic('select'); setSelectedSegment((s) => (s === i ? null : i)); }}
                  style={{ flex: Math.max(h.minutes ?? 1, 1), backgroundColor: stageColour(h.stage), opacity: selectedSegment === null || selectedSegment === i ? 1 : 0.55, borderWidth: selectedSegment === i ? 1.5 : 0, borderColor: C.onSurface }}
                />
              ))}
            </View>
            {selectedSegment !== null && (
              <Animated.Text entering={FadeIn.duration(150)} style={{ fontFamily: F.bodyBold, fontSize: 11.5, color: C.onSurfaceVariant, marginTop: 10 }}>
                {sleep.hypnogram![selectedSegment]?.stage ?? 'Segment'}
                {has(sleep.hypnogram![selectedSegment]?.minutes) ? ` · ${sleep.hypnogram![selectedSegment]!.minutes} min` : ''}
              </Animated.Text>
            )}
            {!!sleep.bedtime && !!sleep.wakeTime && selectedSegment === null && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                <Text style={{ fontFamily: F.num, fontSize: 9.5, color: C.onSurfaceVariant }}>{sleep.bedtime}</Text>
                <Text style={{ fontFamily: F.num, fontSize: 9.5, color: C.onSurfaceVariant }}>{sleep.wakeTime}</Text>
              </View>
            )}
          </View>
        </>
      )}

      {/* Stages */}
      {hasItems(sleep.stages) && (
        <>
          <SectionLabel text="Stages" C={C} />
          <View style={{ paddingHorizontal: T.gutter }}>
            {sleep.stages!.map((st, i) => (
              <View key={st.name ?? i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
                {i > 0 && <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: T.hairline, backgroundColor: T.hairSoft }} />}
                <View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: stageColour(st.name) }} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontFamily: F.bodyBold, fontSize: 13, color: C.onSurface }}>{st.name ?? '—'}</Text>
                  {!!st.target && <Text style={{ fontFamily: F.bodyBold, fontSize: 10.5, color: C.onSurfaceVariant, marginTop: 3 }}>{st.target}</Text>}
                </View>
                <Text style={{ fontFamily: F.num, fontSize: 13.5, letterSpacing: -0.3, color: C.onSurface }}>{fmtMinutes(st.minutes) ?? '—'}</Text>
                <Text style={{ fontFamily: F.num, fontSize: 11, color: C.onSurfaceVariant, width: 38, textAlign: 'right' }}>
                  {has(st.percent) ? `${Math.round(st.percent)}%` : ''}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Sleep health */}
      {(has(sleep.efficiency) || has(sleep.latencyMinutes) || has(sleep.debtHours)) && (
        <>
          <SectionLabel text="Sleep health" C={C} />
          <StatColumns C={C} isDark={isDark}
            items={[
              ...(has(sleep.efficiency) ? [{ value: String(Math.round(sleep.efficiency)), unit: '%', label: 'Efficiency', tone: A.green }] : []),
              ...(has(sleep.latencyMinutes) ? [{ value: String(Math.round(sleep.latencyMinutes)), unit: 'min', label: 'To fall asleep' }] : []),
              ...(has(sleep.debtHours) ? [{ value: sleep.debtHours.toFixed(1), unit: 'hrs', label: 'Sleep debt', tone: A.stress }] : []),
            ]}
          />
        </>
      )}

      {/* Consistency */}
      {hasItems(sleep.consistency) && (
        <>
          <SectionLabel text="Consistency" C={C} />
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 78, paddingHorizontal: T.gutter }}>
            {sleep.consistency!.map((d, i) => {
              const v = has(d.value) ? d.value : 0;
              const colour = v >= 80 ? A.green : v >= 65 ? C.primary : A.stress;
              return (
                <View key={d.label ?? i} style={{ flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: 7 }}>
                  <View style={{ width: '100%', height: `${Math.max(v, 3)}%`, borderRadius: 3, backgroundColor: colour }} />
                  <Text style={{ fontFamily: F.header, fontSize: 9.5, color: C.onSurfaceVariant }}>{d.label ?? ''}</Text>
                </View>
              );
            })}
          </View>
          {!!sleep.consistencyNote && (
            <Text style={{ fontFamily: F.bodyBold, fontSize: 11.5, lineHeight: 18, color: C.onSurfaceVariant, paddingHorizontal: T.gutter, paddingTop: 14 }}>
              {sleep.consistencyNote}
            </Text>
          )}
        </>
      )}
    </>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   TAB · BODY
   ────────────────────────────────────────────────────────────────────────── */
function BodyTab({ body, loading, C, isDark, A }: {
  body?: BodyData; loading: boolean; C: ThemeColors; isDark: boolean; A: Accents;
}) {
  const T = makeTokens(isDark);
  const [view, setView] = useState<'front' | 'back'>('front');
  const [selected, setSelected] = useState<string | null>(null);
  const all = body?.muscles ?? [];
  const tagged = all.some((m) => m.view === 'front' || m.view === 'back');
  const inView = tagged ? all.filter((m) => m.view === view) : all;
  const sorted = useMemo(() => [...inView].sort((a, b) => (b.fatigue ?? 0) - (a.fatigue ?? 0)), [inView]);
  const colourFor = (v?: number) => !has(v) ? C.onSurfaceVariant : v > 0.75 ? A.red : v > 0.45 ? A.stress : A.green;
  const cleared = sorted.filter((m) => has(m.fatigue) && m.fatigue <= 0.45);
  const holdOff = sorted.filter((m) => has(m.fatigue) && m.fatigue > 0.75);
  const worst = sorted[0];

  // BodyMap SVG
  const BodyMap = ({ muscles: ms }: { muscles: MuscleFatigue[] }) => {
    const level = useMemo(() => {
      const m = new Map<string, number>();
      ms.forEach((x) => { if (x.muscle && has(x.fatigue)) m.set(x.muscle.toLowerCase(), x.fatigue); });
      return m;
    }, [ms]);
    const lookup = (...keys: string[]): number | undefined => {
      for (const k of keys) {
        const hit = Array.from(level.entries()).find(([name]) => name.includes(k));
        if (hit) return hit[1];
      }
      return undefined;
    };
    const region = (v: number | undefined, key: string) => {
      const isSel = selected?.toLowerCase().includes(key);
      if (!has(v)) return { fill: 'none' as const, stroke: C.onSurfaceVariant, strokeOpacity: 0.4, strokeWidth: 1 };
      const c = colourFor(v);
      return { fill: c, fillOpacity: 0.16 + v * 0.3, stroke: c, strokeWidth: isSel ? 2.4 : 1.5 };
    };
    const limb = (v: number | undefined) => ({
      stroke: has(v) ? colourFor(v) : C.onSurfaceVariant,
      strokeOpacity: has(v) ? 1 : 0.4,
      strokeWidth: has(v) && v > 0.45 ? 4 : 2,
    });
    if (view === 'front') {
      return (
        <Svg width={116} height={182} viewBox="0 0 140 200">
          <Circle cx={70} cy={18} r={16} fill="none" stroke={C.onSurfaceVariant} strokeOpacity={0.4} strokeWidth={1} />
          <Path d="M30,58 Q50,47 70,47 Q90,47 110,58" {...region(lookup('front delt', 'delt', 'shoulder'), 'delt')} />
          <Path d="M38,58 L34,100 Q70,110 106,100 L102,58 Z" {...region(lookup('chest'), 'chest')} />
          <Path d="M40,104 L38,124 Q70,132 102,124 L100,104 Z" {...region(lookup('core', 'abs'), 'core')} />
          <Path d="M38,58 L20,94 L16,126" fill="none" strokeLinecap="round" {...limb(lookup('bicep', 'arm'))} />
          <Path d="M102,58 L120,94 L124,126" fill="none" strokeLinecap="round" {...limb(lookup('bicep', 'arm'))} />
          <Path d="M55,130 L50,164 L48,192" fill="none" strokeLinecap="round" {...limb(lookup('quad', 'leg'))} />
          <Path d="M85,130 L90,164 L92,192" fill="none" strokeLinecap="round" {...limb(lookup('quad', 'leg'))} />
        </Svg>
      );
    }
    return (
      <Svg width={116} height={182} viewBox="0 0 140 200">
        <Circle cx={70} cy={18} r={16} fill="none" stroke={C.onSurfaceVariant} strokeOpacity={0.4} strokeWidth={1} />
        <Path d="M30,58 Q50,47 70,47 Q90,47 110,58" {...region(lookup('trap'), 'trap')} />
        <Path d="M38,58 L36,102 Q70,112 104,102 L102,58 Z" {...region(lookup('lat', 'back'), 'lat')} />
        <Path d="M42,112 L38,130 Q70,138 102,130 L98,112 Z" {...region(lookup('glute'), 'glute')} />
        <Path d="M55,136 L50,166 L48,192" fill="none" strokeLinecap="round" {...limb(lookup('hamstring'))} />
        <Path d="M85,136 L90,166 L92,192" fill="none" strokeLinecap="round" {...limb(lookup('hamstring'))} />
        <Circle cx={49} cy={180} r={5} {...region(lookup('calf', 'calves'), 'calf')} />
        <Circle cx={91} cy={180} r={5} {...region(lookup('calf', 'calves'), 'calf')} />
      </Svg>
    );
  };

  if (loading) {
    return (
      <View style={{ paddingHorizontal: T.gutter, paddingTop: 24, flexDirection: 'row', gap: 16 }}>
        <Skeleton width={116} height={182} radius={12} isDark={isDark} />
        <View style={{ flex: 1, gap: 16 }}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{ gap: 7 }}>
              <Skeleton width="56%" height={12} isDark={isDark} />
              <Skeleton width="100%" height={3} radius={2} isDark={isDark} />
            </View>
          ))}
        </View>
      </View>
    );
  }
  if (!hasItems(all)) {
    return <EmptyState icon="self-improvement" title="No fatigue data yet"
      body="Log a few workouts and your per-muscle recovery map will build automatically." C={C} />;
  }

  return (
    <>
      <SectionLabel text="Fatigue map" C={C} />
      <View style={{ flexDirection: 'row', gap: 16, alignItems: 'flex-start', paddingHorizontal: T.gutter }}>
        <View style={{ alignItems: 'center' }}>
          {tagged && (
            <View style={{ flexDirection: 'row', gap: 16, marginBottom: 10 }}>
              {(['front', 'back'] as const).map((v) => {
                const on = v === view;
                return (
                  <Pressable key={v} hitSlop={8} onPress={() => { haptic('select'); setView(v); setSelected(null); }}
                    style={{ paddingBottom: 5, borderBottomWidth: 2, borderBottomColor: on ? C.primary : 'transparent' }}>
                    <Text style={{ fontFamily: F.header, fontSize: 10.5, letterSpacing: 1, color: on ? C.onSurface : C.onSurfaceVariant }}>
                      {v.toUpperCase()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
          <BodyMap muscles={inView} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          {sorted.map((m, i) => {
            const colour = colourFor(m.fatigue);
            const on = selected === m.muscle;
            const row = (
              <View style={{ paddingVertical: 11 }}>
                {i > 0 && <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: T.hairline, backgroundColor: T.hairSoft }} />}
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 9 }}>
                  <Text style={{ flex: 1, fontFamily: F.bodyBold, fontSize: 12.5, color: C.onSurface }}>{m.muscle ?? '—'}</Text>
                  {has(m.fatigue) && <Text style={{ fontFamily: F.num, fontSize: 11.5, color: colour }}>{Math.round(m.fatigue * 100)}%</Text>}
                </View>
                <View style={{ marginTop: 6 }}><Track progress={m.fatigue ?? 0} color={colour} isDark={isDark} height={3} /></View>
              </View>
            );
            return (
              <Pressable key={m.muscle ?? i} onPress={() => { haptic('select'); setSelected(on ? null : (m.muscle ?? null)); }}>
                {on ? (
                  <LinearGradient colors={[T.wash, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} locations={[0, 0.85]}>
                    {row}
                  </LinearGradient>
                ) : row}
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 16, paddingHorizontal: T.gutter, paddingTop: 14 }}>
        {[['Recovered', A.green], ['Recovering', A.stress], ['High fatigue', A.red]].map(([label, colour]) => (
          <View key={String(label)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colour as string }} />
            <Text style={{ fontFamily: F.bodyBold, fontSize: 11, color: C.onSurfaceVariant }}>{label}</Text>
          </View>
        ))}
      </View>

      {worst?.muscle && has(worst.fatigue) && (
        <>
          <View style={{ marginTop: 20 }}><Rule isDark={isDark} /></View>
          <AiCoach label="READINESS BY GROUP"
            headline={`${worst.muscle} is your most fatigued group at ${Math.round(worst.fatigue * 100)}%.`}
            C={C} isDark={isDark} />
          <Rule isDark={isDark} />
        </>
      )}

      {hasItems(cleared) && (
        <>
          <SectionLabel text="Cleared to train" C={C} />
          {cleared.map((m, i) => (
            <View key={m.muscle ?? i} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: T.gutter, paddingVertical: 14 }}>
              {i > 0 && <View style={{ position: 'absolute', left: T.indent, right: 0, top: 0, height: T.hairline, backgroundColor: T.hairSoft }} />}
              <View style={{ width: 22, alignItems: 'center' }}><Icon name="check" size={15} color={A.green} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontFamily: F.header, fontSize: 15, letterSpacing: -0.2, color: C.onSurface }}>{m.muscle}</Text>
                {has(m.fatigue) && <Text style={{ fontFamily: F.bodyMed, fontSize: 12.5, color: C.onSurfaceVariant, marginTop: 3 }}>{Math.round((1 - m.fatigue) * 100)}% recovered</Text>}
              </View>
              <Icon name="chevron-right" size={17} color={C.onSurfaceVariant} />
            </View>
          ))}
        </>
      )}

      {hasItems(holdOff) && (
        <>
          <SectionLabel text="Hold off" C={C} />
          {holdOff.map((m, i) => (
            <View key={m.muscle ?? i} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: T.gutter, paddingVertical: 14 }}>
              {i > 0 && <View style={{ position: 'absolute', left: T.indent, right: 0, top: 0, height: T.hairline, backgroundColor: T.hairSoft }} />}
              <View style={{ width: 22, alignItems: 'center' }}><Icon name="warning-amber" size={15} color={A.red} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontFamily: F.header, fontSize: 15, letterSpacing: -0.2, color: C.onSurface }}>{m.muscle}</Text>
                {has(m.readyInHours) && <Text style={{ fontFamily: F.bodyMed, fontSize: 12.5, color: C.onSurfaceVariant, marginTop: 3 }}>Ready in ~{Math.round(m.readyInHours)} hours</Text>}
              </View>
              <Icon name="chevron-right" size={17} color={C.onSurfaceVariant} />
            </View>
          ))}
        </>
      )}

      {hasItems(body?.injuries) && (
        <>
          <SectionLabel text="Injury memory" C={C} />
          {body!.injuries!.map((inj, i) => (
            <View key={inj.area ?? i} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: T.gutter, paddingVertical: 14 }}>
              {i > 0 && <View style={{ position: 'absolute', left: T.indent, right: 0, top: 0, height: T.hairline, backgroundColor: T.hairSoft }} />}
              <View style={{ width: 22, alignItems: 'center' }}><Icon name="favorite" size={14} color={A.stress} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontFamily: F.header, fontSize: 15, letterSpacing: -0.2, color: C.onSurface }}>{inj.area ?? '—'}</Text>
                {!!inj.note && <Text style={{ fontFamily: F.bodyMed, fontSize: 12.5, color: C.onSurfaceVariant, marginTop: 3 }}>{inj.flaggedAt ? `${inj.flaggedAt} · ${inj.note}` : inj.note}</Text>}
              </View>
              <Icon name="chevron-right" size={17} color={C.onSurfaceVariant} />
            </View>
          ))}
        </>
      )}
    </>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   TAB · TRENDS
   ────────────────────────────────────────────────────────────────────────── */
function TrendsTab({ trends, loading, C, isDark, A }: {
  trends?: TrendsData; loading: boolean; C: ThemeColors; isDark: boolean; A: Accents;
}) {
  const T = makeTokens(isDark);
  const [day, setDay] = useState<number | null>(null);

  if (loading) {
    return (
      <View style={{ paddingHorizontal: T.gutter, paddingTop: 24, gap: 22 }}>
        <Skeleton width="46%" height={22} isDark={isDark} />
        <Skeleton width="100%" height={78} isDark={isDark} />
        <Skeleton width="100%" height={70} isDark={isDark} />
      </View>
    );
  }
  if (!hasItems(trends?.daily)) {
    return <EmptyState icon="insights" title="Not enough history"
      body="Once you have a few days of recovery scores, trends and correlations will appear here." C={C} />;
  }

  const daily = trends!.daily!;
  const selected = day !== null ? daily[day] : undefined;

  return (
    <>
      <SectionLabel text="Recovery score" C={C} />
      {(has(trends?.weeklyAverage) || has(trends?.weeklyDelta)) && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: T.gutter, paddingBottom: 12 }}>
          {has(trends?.weeklyAverage) && (
            <Text style={{ fontFamily: F.num, fontSize: 19, letterSpacing: -0.7, color: C.onSurface }}>
              {Math.round(trends!.weeklyAverage!)}
              <Text style={{ fontFamily: F.bodyMed, fontSize: 11, color: C.onSurfaceVariant }}>{'  '}avg this week</Text>
            </Text>
          )}
          {has(trends?.weeklyDelta) && trends!.weeklyDelta !== 0 && (
            <Text style={{ fontFamily: F.header, fontSize: 11.5, color: trends!.weeklyDelta! > 0 ? A.green : A.stress }}>
              {signed(trends!.weeklyDelta)} vs last week
            </Text>
          )}
        </View>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 78, paddingHorizontal: T.gutter }}>
        {daily.map((d, i) => {
          const v = has(d.value) ? d.value : 0;
          const colour = v >= 80 ? A.green : v >= 65 ? C.primary : A.stress;
          const on = day === i;
          return (
            <Pressable key={d.label ?? i} onPress={() => { haptic('select'); setDay(on ? null : i); }}
              style={{ flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: 7 }}>
              <View style={{ width: '100%', height: `${Math.max(v, 3)}%`, borderRadius: 3, backgroundColor: colour, opacity: day === null || on ? 1 : 0.45 }} />
              <Text style={{ fontFamily: F.header, fontSize: 9.5, color: on ? C.primary : C.onSurfaceVariant }}>{d.label ?? ''}</Text>
            </Pressable>
          );
        })}
      </View>
      {selected && has(selected.value) && (
        <Animated.Text entering={FadeIn.duration(150)} style={{ fontFamily: F.bodyBold, fontSize: 11.5, color: C.onSurfaceVariant, paddingHorizontal: T.gutter, paddingTop: 14 }}>
          {selected.label}: <Text style={{ color: C.primary }}>{Math.round(selected.value)}%</Text>
        </Animated.Text>
      )}
      {hasItems(trends?.monthly) && (
        <>
          <SectionLabel text="30-day averages" C={C} />
          <StatColumns C={C} isDark={isDark}
            items={trends!.monthly!.map((m) => ({
              value: m.value ?? '—', unit: m.unit, label: m.label ?? '',
              tone: m.tone === 'sleep' ? A.sleep : m.tone === 'heart' ? A.heart : m.tone === 'positive' ? A.green : undefined,
            }))}
          />
        </>
      )}
      {hasItems(trends?.correlations) && (
        <>
          <SectionLabel text="What drives your recovery" C={C} />
          {trends!.correlations!.map((c, i) => {
            const positive = has(c.impact) ? c.impact >= 0 : true;
            const colour = positive ? A.green : A.stress;
            return (
              <View key={c.title ?? i} style={{ flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: T.gutter, paddingVertical: 14 }}>
                {i > 0 && <View style={{ position: 'absolute', left: T.gutter, right: 0, top: 0, height: T.hairline, backgroundColor: T.hairSoft }} />}
                <View style={{ width: 64 }}>{has(c.strength) ? <Track progress={c.strength} color={colour} isDark={isDark} /> : null}</View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontFamily: F.header, fontSize: 13.5, letterSpacing: -0.2, color: C.onSurface }}>{c.title ?? '—'}</Text>
                  {!!c.description && <Text style={{ fontFamily: F.bodyMed, fontSize: 11.5, lineHeight: 17, color: C.onSurfaceVariant, marginTop: 3 }}>{c.description}</Text>}
                </View>
                {has(c.impact) && <Text style={{ fontFamily: F.num, fontSize: 14, color: colour }}>{signed(c.impact)}</Text>}
              </View>
            );
          })}
        </>
      )}
      {hasItems(trends?.streaks) && (
        <>
          <SectionLabel text="Streaks" C={C} />
          <StatColumns C={C} isDark={isDark}
            items={trends!.streaks!.map((s) => ({ value: s.value ?? '—', label: s.label ?? '' }))}
          />
        </>
      )}
      {!!trends?.summary && (
        <>
          <View style={{ marginTop: 22 }}><Rule isDark={isDark} /></View>
          <AiCoach label="MONTHLY READ" headline={trends.summary} C={C} isDark={isDark} />
        </>
      )}
    </>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   ADAPTERS
   ────────────────────────────────────────────────────────────────────────── */
function adaptVitals(raw: { hr?: any; water?: any; stress?: any; sleep?: any }): VitalSeries[] {
  const out: VitalSeries[] = [];
  if (raw.hr && (has(raw.hr.currentBpm) || has(raw.hr.restingBpm))) {
    out.push({ label: 'Heart rate', caption: has(raw.hr.restingBpm) ? `Resting ${raw.hr.restingBpm}` : undefined, value: raw.hr.currentBpm ?? raw.hr.restingBpm, unit: 'bpm', trend: raw.hr.trend ?? raw.hr.history, tone: 'heart' });
  }
  if (raw.hr && has(raw.hr.hrv)) {
    out.push({ label: 'HRV', caption: raw.hr.hrvCaption, value: raw.hr.hrv, unit: 'ms', trend: raw.hr.hrvTrend, tone: 'positive' });
  }
  if (raw.hr && has(raw.hr.respiratoryRate)) {
    out.push({ label: 'Respiratory', caption: 'Overnight avg', value: raw.hr.respiratoryRate, unit: '/min', trend: raw.hr.respiratoryTrend, tone: 'neutral' });
  }
  if (raw.water && has(raw.water.progress)) {
    out.push({ label: 'Hydration', caption: has(raw.water.currentIntake) && has(raw.water.goal) ? `${(raw.water.currentIntake / 1000).toFixed(1)} of ${(raw.water.goal / 1000).toFixed(1)} L` : undefined, value: Math.round(raw.water.progress * 100), unit: '%', trend: raw.water.trend, tone: 'water' });
  }
  if (raw.stress && has(raw.stress.score)) {
    out.push({ label: 'Stress load', caption: raw.stress.status, value: raw.stress.score, unit: '/100', trend: raw.stress.trend, tone: 'stress' });
  }
  return out;
}

function adaptTimeline(raw: any): TimelinePoint[] {
  if (Array.isArray(raw)) return raw.map((p: any) => ({ label: p.label, value: p.value, isNow: p.isNow }));
  if (Array.isArray(raw?.points)) return raw.points.map((p: any) => ({ label: p.label, value: p.value, isNow: p.isNow }));
  if (raw && typeof raw === 'object') {
    const pts: TimelinePoint[] = [];
    if (has(raw.today)) pts.push({ label: 'Now', value: raw.today, isNow: true });
    if (has(raw.tomorrow)) pts.push({ label: 'Tomorrow', value: raw.tomorrow });
    if (has(raw.next2Days)) pts.push({ label: '2 days', value: raw.next2Days });
    if (has(raw.fullRecovery)) pts.push({ label: 'Full', value: raw.fullRecovery });
    return pts;
  }
  return [];
}

/* ──────────────────────────────────────────────────────────────────────────
   SCREEN
   ────────────────────────────────────────────────────────────────────────── */
export interface RecoveryScreenProps {
  navigation?: { goBack?: () => void };
  onNavigateBack?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigate?: (screen: string) => void;
}

export default function RecoveryScreen({
  navigation,
  onNavigateBack,
  onNavigateToNotifications,
  onNavigate,
}: RecoveryScreenProps) {
  const { C, isDark, bgColors } = useTheme();
  const { user } = useAuth();
  const qc = useQueryClient();
  const T = useMemo(() => makeTokens(isDark), [isDark]);
  const A = useMemo(() => makeAccents(isDark), [isDark]);
  const [tab, setTab] = useState<RecoveryTabKey>('today');
  const [protocolOverride, setProtocolOverride] = useState<Record<string, boolean>>({});
  const [contentWidth, setContentWidth] = useState(0);
  const userId = user?.id;
  const enabled = !!userId;

  const results = useQueries({
    queries: [
      { queryKey: ['rec_overview', userId], queryFn: () => fetchRecoveryOverview(userId), enabled },
      { queryKey: ['rec_score', userId], queryFn: () => fetchRecoveryScore(userId), enabled },
      { queryKey: ['rec_sleep', userId], queryFn: () => fetchSleepData(userId), enabled },
      { queryKey: ['rec_hr', userId], queryFn: () => fetchHeartRateData(userId), enabled },
      { queryKey: ['rec_water', userId], queryFn: () => fetchWaterData(userId), enabled },
      { queryKey: ['rec_stress', userId], queryFn: () => fetchStressData(userId), enabled },
      { queryKey: ['rec_timeline', userId], queryFn: () => fetchRecoveryTimeline(userId), enabled },
      { queryKey: ['rec_insights', userId], queryFn: () => fetchRecoveryInsights(userId), enabled },
    ],
  });

  const [overviewQ, scoreQ, sleepQ, hrQ, waterQ, stressQ, timelineQ, insightsQ] = results;
  const anyLoading = results.some((r) => r.isLoading);
  const allErrored = results.every((r) => r.isError);
  const firstError = results.find((r) => r.isError)?.error as Error | undefined;
  const overview = overviewQ.data as RecoveryOverview | undefined;
  const score = scoreQ.data as RecoveryScore | undefined;
  const sleep = sleepQ.data as SleepData | undefined;
  const insights = insightsQ.data as RecoveryInsights | undefined;
  const vitals = useMemo(() => adaptVitals({ hr: hrQ.data, water: waterQ.data, stress: stressQ.data, sleep: sleepQ.data }), [hrQ.data, waterQ.data, stressQ.data, sleepQ.data]);
  const timeline = useMemo(() => adaptTimeline(timelineQ.data), [timelineQ.data]);
  const bodyData = (overviewQ.data as any)?.body as BodyData | undefined;
  const trendsData = (overviewQ.data as any)?.trends as TrendsData | undefined;

  const refetchAll = useCallback(() => { results.forEach((r) => void r.refetch()); }, [results]);
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    haptic('light');
    await qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith('rec_') });
    setRefreshing(false);
  }, [qc]);
  const toggleProtocol = useCallback((id: string) => { setProtocolOverride((prev) => ({ ...prev, [id]: !prev[id] })); }, []);

  const scrollY = useSharedValue(0);
  const compact = useAnimatedStyle(() => ({ opacity: interpolate(scrollY.value, [10, 46], [0, 1], Extrapolation.CLAMP) }));

  const subtitle = useMemo(() => {
    switch (tab) {
      case 'sleep': return sleep?.quality ? `Last night · ${sleep.quality}` : 'Last night';
      case 'body': return 'Per-muscle fatigue';
      case 'trends': return 'Recent history';
      default: return overview?.recoveryStatus ?? score?.status ?? 'Recovery overview';
    }
  }, [tab, sleep, overview, score]);

  const goBack = useCallback(() => {
    haptic('light');
    if (onNavigateBack) onNavigateBack();
    else navigation?.goBack?.();
  }, [navigation, onNavigateBack]);

  const handleNavigate = useCallback((screen: string) => {
    if (onNavigate) onNavigate(screen);
    else if (screen === 'Dashboard') goBack();
  }, [onNavigate, goBack]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <MeshGradientBackground bgColors={bgColors} isDark={isDark} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* ── Nav bar ── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 0) * 0.2 + 6 : 6 }}>
          <Pressable onPress={goBack} hitSlop={10} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="chevron-left" size={22} color={C.onSurface} />
          </Pressable>
          <Animated.Text numberOfLines={1} style={[{ fontFamily: F.header, fontSize: 15.5, letterSpacing: -0.2, color: C.onSurface }, compact]}>
            Recovery
          </Animated.Text>
          <Pressable onPress={() => { haptic('light'); onNavigateToNotifications?.(); }} hitSlop={10} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="notifications" size={22} color={C.onSurface} />
          </Pressable>
        </View>

        {/* ── Large title ── */}
        <View style={{ paddingHorizontal: T.gutter, paddingTop: 8, paddingBottom: 2 }}>
          <Text style={{ fontFamily: F.header, fontSize: 34, letterSpacing: -1.2, color: C.onSurface }}>Recovery</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 6 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: A.green }} />
            <Text style={{ fontFamily: F.bodyBold, fontSize: 13, color: C.onSurfaceVariant }}>{subtitle}</Text>
          </View>
        </View>

        <RecoveryTabs active={tab} onChange={setTab} C={C} isDark={isDark} />

        {!enabled ? (
          <EmptyState icon="error-outline" title="Not signed in" body="Sign in to see your recovery score, sleep breakdown and fatigue map." C={C} />
        ) : allErrored ? (
          <ErrorState message={firstError?.message ?? 'Please check your connection and try again.'} onRetry={refetchAll} C={C} />
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            onScroll={(e) => { scrollY.value = e.nativeEvent.contentOffset.y; }}
            scrollEventThrottle={16}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
            onLayout={(e) => setContentWidth(e.nativeEvent.layout.width - T.gutter * 2)}
          >
            <Animated.View entering={FadeIn.duration(180)}>
              {tab === 'today' && (
                <TodayTab
                  score={score} overview={overview} vitals={vitals} insights={insights}
                  timeline={timeline} protocolOverride={protocolOverride} onToggleProtocol={toggleProtocol}
                  loading={anyLoading} contentWidth={contentWidth > 0 ? contentWidth : 320}
                  C={C} isDark={isDark} A={A}
                />
              )}
              {tab === 'sleep' && <SleepTab sleep={sleep} loading={sleepQ.isLoading} C={C} isDark={isDark} A={A} />}
              {tab === 'body' && <BodyTab body={bodyData} loading={overviewQ.isLoading} C={C} isDark={isDark} A={A} />}
              {tab === 'trends' && <TrendsTab trends={trendsData} loading={overviewQ.isLoading} C={C} isDark={isDark} A={A} />}
            </Animated.View>
          </ScrollView>
        )}
      </SafeAreaView>

      {/* Bottom Navigation Bar */}
      <BottomNavigation
        currentScreen="Recovery"
        onNavigate={(screen) => handleNavigate(screen)}
        onOpenActionMenu={() => {}}
      />
    </View>
  );
}
