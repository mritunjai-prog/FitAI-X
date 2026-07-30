/**
 * ════════════════════════════════════════════════════════════════════════════
 *  FitAI X — WORKOUT HUB (PRODUCTION)
 *  Single-file screen. Overview · Builder · Active · History.
 *  All data from API. No mock/hardcoded/dummy data.
 * ════════════════════════════════════════════════════════════════════════════
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  AppStateStatus,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Platform,
  Pressable,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  Extrapolation,
  FadeIn,
  FadeInDown,
  FadeOut,
  Layout,
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import MaskedView from '@react-native-masked-view/masked-view';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import MeshGradientBackground from '../components/MeshGradientBackground';
import ActivityRings from '../components/charts/ActivityRings';
import BarChart from '../components/charts/BarChart';
import SplineChart from '../components/charts/SplineChart';
import { useTheme } from '../context/ThemeContext';
import {
  completeSession,
  fetchCurrentWorkout,
  fetchWorkoutHistory,
  generateWorkout,
  generateInitialWorkout,
  saveWorkout,
  saveWorkoutAsVersion,
  startSession,
  deleteWorkout,
  renameWorkout,
  duplicateWorkout,
  fetchPersonalRecords,
  updateWorkout,
  regenerateWorkout,
} from '../services/api/workout';
import { fetchVitals } from '../services/api/dashboard';
import { fetchSleepData, fetchRecoveryScore } from '../services/api/recovery';
import { fetchXpStats } from '../services/api/xp';
import { F, ThemeColors } from '../theme';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

/* ──────────────────────────────────────────────────────────────────────────
   TYPES
   ────────────────────────────────────────────────────────────────────────── */

export type TabKey = 'overview' | 'builder' | 'active' | 'history';

export type MuscleGroup =
  | 'Chest'
  | 'Front Delts'
  | 'Side Delts'
  | 'Triceps'
  | 'Core'
  | 'Back'
  | 'Biceps'
  | 'Quads'
  | 'Hamstrings'
  | 'Glutes'
  | 'Calves';

export interface WorkoutExercise {
  id: string;
  name: string;
  muscle?: string;
  sets: number;
  reps: number;
  weight: number;
  rest?: number;
  prev?: string;
  setsData?: { weight: number; reps: number }[];
}

export interface Workout {
  id: string;
  title: string;
  duration?: string | number;
  targetMuscles?: string;
  aiExplanation?: string;
  exercises: WorkoutExercise[];
  versionNumber?: number;
  parentVersionId?: string;
  isCurrent?: boolean;
}

export interface SetEntry {
  weight: number;
  reps: number;
  completed: boolean;
}

export interface ActiveExercise extends WorkoutExercise {
  setsData: SetEntry[];
}

export interface HistoryExerciseSummary {
  name: string;
  scheme: string;
  load: string;
  pr?: boolean;
}

export interface HistorySession {
  id: string;
  title: string;
  iso: string;
  date: string;
  duration: number;
  volume: string;
  sets: number;
  calories: number;
  pr?: boolean;
  exercises: HistoryExerciseSummary[];
}

export type HistoryFilterKey = 'all' | 'week' | 'month' | 'pr';

export interface HistoryFilter {
  key: HistoryFilterKey;
  label: string;
  count: number;
}

export interface MuscleActivation {
  muscle: string;
  value: number;
}

export interface ReadinessMetric {
  key: string;
  label: string;
  value: string;
  unit?: string;
  tone: 'green' | 'cyan' | 'gold';
  trend: number[];
}

/* ──────────────────────────────────────────────────────────────────────────
   DESIGN TOKENS
   ────────────────────────────────────────────────────────────────────────── */

interface WorkoutTokens {
  hair: string;
  hairSoft: string;
  hairGold: string;
  track: string;
  wash: string;
  hairline: number;
  gutter: number;
  indent: number;
}

const makeTokens = (_C: ThemeColors, isDark: boolean): WorkoutTokens => ({
  hair: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(20,18,10,0.13)',
  hairSoft: isDark ? 'rgba(255,255,255,0.055)' : 'rgba(20,18,10,0.07)',
  hairGold: isDark ? 'rgba(245,196,0,0.28)' : 'rgba(160,118,0,0.36)',
  track: isDark ? 'rgba(255,255,255,0.09)' : 'rgba(20,18,10,0.10)',
  wash: isDark ? 'rgba(245,196,0,0.055)' : 'rgba(245,196,0,0.10)',
  hairline: StyleSheet.hairlineWidth,
  gutter: 22,
  indent: 58,
});

const accents = (isDark: boolean) => ({
  green: isDark ? '#A3E635' : '#5E8B00',
  cyan: isDark ? '#7DD3FC' : '#0E7490',
  amber: isDark ? '#F59E0B' : '#B26B00',
  red: isDark ? '#F87171' : '#C2413E',
});

/* ──────────────────────────────────────────────────────────────────────────
   PRIMITIVES
   ────────────────────────────────────────────────────────────────────────── */

type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'select';

function haptic(style: HapticStyle = 'light'): void {
  if (Platform.OS === 'web') return;
  switch (style) {
    case 'success': void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); break;
    case 'select': void Haptics.selectionAsync(); break;
    case 'heavy': void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); break;
    case 'medium': void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); break;
    default: void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

interface PressableScaleProps {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  hapticStyle?: HapticStyle;
  scaleTo?: number;
  hitSlop?: number;
}

function PressableScale({ children, onPress, onLongPress, style, disabled = false, hapticStyle = 'light', scaleTo = 0.96, hitSlop = 0 }: PressableScaleProps) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable
      disabled={disabled}
      hitSlop={hitSlop}
      onPressIn={() => { scale.value = withSpring(scaleTo, { damping: 15, stiffness: 320 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 320 }); }}
      onPress={() => { if (disabled) return; haptic(hapticStyle); onPress?.(); }}
      onLongPress={onLongPress}
      style={style}
    >
      <Animated.View style={animated}>{children}</Animated.View>
    </Pressable>
  );
}

function Entrance({ children, index = 0, style }: { children: React.ReactNode; index?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 70).springify().damping(16).mass(0.85)} style={style}>
      {children}
    </Animated.View>
  );
}

function Rule({ C, isDark, soft = false, inset = 0, style }: { C: ThemeColors; isDark: boolean; soft?: boolean; inset?: number; style?: StyleProp<ViewStyle> }) {
  const T = useMemo(() => makeTokens(C, isDark), [C, isDark]);
  return <View style={[{ height: T.hairline, backgroundColor: soft ? T.hairSoft : T.hair, marginLeft: inset }, style]} />;
}

function SectionLabel({ text, C, action, onAction, actionNode }: { text: string; C: ThemeColors; action?: string; onAction?: () => void; actionNode?: React.ReactNode }) {
  return (
    <View style={s.secLbl}>
      <Text style={{ fontFamily: F.header, fontSize: 11, letterSpacing: 1.5, color: C.onSurfaceVariant, textTransform: 'uppercase' }}>{text}</Text>
      {actionNode ?? (action ? <Text onPress={() => { haptic('select'); onAction?.(); }} style={{ fontFamily: F.header, fontSize: 13, color: C.primary }}>{action}</Text> : null)}
    </View>
  );
}

interface StatColumn { value: string; unit?: string; label: string; tone?: string; footer?: React.ReactNode; }

function StatColumns({ items, C, isDark, bordered = false }: { items: StatColumn[]; C: ThemeColors; isDark: boolean; bordered?: boolean }) {
  const T = useMemo(() => makeTokens(C, isDark), [C, isDark]);
  return (
    <View style={[{ flexDirection: 'row', paddingHorizontal: T.gutter }, bordered && { borderTopWidth: T.hairline, borderBottomWidth: T.hairline, borderColor: T.hair }]}>
      {items.map((it, i) => (
        <View key={`${it.label}-${i}`} style={{ flex: 1, paddingVertical: 15, paddingLeft: i === 0 ? 0 : 16, minWidth: 0 }}>
          {i > 0 && <View style={{ position: 'absolute', left: 0, top: 15, bottom: 15, width: T.hairline, backgroundColor: T.hairSoft }} />}
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
            <Text style={{ fontFamily: F.num, fontSize: 20, letterSpacing: -0.7, color: it.tone ?? C.onSurface }} numberOfLines={1}>{it.value}</Text>
            {!!it.unit && <Text style={{ fontFamily: F.bodyMed, fontSize: 11, color: C.onSurfaceVariant }}>{it.unit}</Text>}
          </View>
          <Text style={{ fontFamily: F.header, fontSize: 9.5, letterSpacing: 1.1, color: C.onSurfaceVariant, marginTop: 6, textTransform: 'uppercase' }} numberOfLines={1}>{it.label}</Text>
          {it.footer}
        </View>
      ))}
    </View>
  );
}

function Row({ children, C, isDark, onPress, first = false, indented = false, style }: { children: React.ReactNode; C: ThemeColors; isDark: boolean; onPress?: () => void; first?: boolean; indented?: boolean; style?: StyleProp<ViewStyle> }) {
  const T = useMemo(() => makeTokens(C, isDark), [C, isDark]);
  const body = (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: T.gutter, paddingVertical: 14 }, style]}>
      {!first && <View style={{ position: 'absolute', left: indented ? T.indent : T.gutter, right: 0, top: 0, height: T.hairline, backgroundColor: T.hairSoft }} />}
      {children}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={() => { haptic('light'); onPress(); }} android_ripple={{ color: T.wash }} style={({ pressed }) => (pressed ? { backgroundColor: T.wash } : undefined)}>
      {body}
    </Pressable>
  );
}

const s = StyleSheet.create({
  secLbl: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop: 26, paddingBottom: 11 },
});

/* ──────────────────────────────────────────────────────────────────────────
   TAB BAR
   ────────────────────────────────────────────────────────────────────────── */

const TABS: ReadonlyArray<{ key: TabKey; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'builder', label: 'Builder' },
  { key: 'active', label: 'Active' },
  { key: 'history', label: 'History' },
] as const;

interface Metrics { x: number; w: number; }

function WorkoutTabs({ active, onChange, C, isDark }: { active: TabKey; onChange: (t: TabKey) => void; C: ThemeColors; isDark: boolean }) {
  const T = useMemo(() => makeTokens(C, isDark), [C, isDark]);
  const metrics = useRef<Partial<Record<TabKey, Metrics>>>({});
  const [ready, setReady] = useState(false);
  const inkX = useSharedValue(0);
  const inkW = useSharedValue(0);

  const settle = useCallback((key: TabKey, animate: boolean) => {
    const m = metrics.current[key];
    if (!m) return;
    const spring = { damping: 18, stiffness: 190 };
    if (animate) { inkX.value = withSpring(m.x, spring); inkW.value = withSpring(m.w, spring); }
    else { inkX.value = m.x; inkW.value = m.w; }
  }, [inkX, inkW]);

  const onTabLayout = useCallback((key: TabKey) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    metrics.current[key] = { x, w: width };
    if (key === active) { settle(key, ready); if (!ready) setReady(true); }
  }, [active, ready, settle]);

  const inkStyle = useAnimatedStyle(() => ({ transform: [{ translateX: inkX.value }], width: inkW.value }));

  return (
    <View style={{ flexDirection: 'row', gap: 22, marginHorizontal: T.gutter, marginTop: 16, borderBottomWidth: T.hairline, borderBottomColor: T.hairSoft }}>
      {TABS.map((t) => {
        const on = t.key === active;
        return (
          <Pressable key={t.key} onLayout={onTabLayout(t.key)} onPress={() => { if (on) return; haptic('select'); onChange(t.key); settle(t.key, true); }} hitSlop={8} style={{ paddingBottom: 11 }}>
            <Text style={{ fontFamily: on ? F.header : F.bodyBold, fontSize: 14.5, letterSpacing: -0.2, color: on ? C.onSurface : C.onSurfaceVariant }}>{t.label}</Text>
          </Pressable>
        );
      })}
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', bottom: -T.hairline, left: 0, height: 2.5, borderRadius: 2, backgroundColor: C.primary }, inkStyle]} />
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   MUSCLE MAP
   ────────────────────────────────────────────────────────────────────────── */

type MapView = 'front' | 'back';

function MuscleMap({ activation, view, onChangeView, C, isDark }: { activation: MuscleActivation[]; view: MapView; onChangeView: (v: MapView) => void; C: ThemeColors; isDark: boolean }) {
  const T = useMemo(() => makeTokens(C, isDark), [C, isDark]);
  const level = useMemo(() => { const m: Record<string, number> = {}; activation.forEach(a => { m[a.muscle] = a.value; }); return m; }, [activation]);
  const graphicPrimary = isDark ? C.primary : '#e6b300';
  const paint = (muscle: string) => { const v = level[muscle] ?? 0; const hot = v > 0.4; return { fill: hot ? graphicPrimary : 'none', fillOpacity: hot ? 0.26 : 0, stroke: hot ? graphicPrimary : C.onSurfaceVariant, strokeWidth: hot ? 1.7 : 1, strokeOpacity: hot ? 1 : 0.55 }; };
  const inert = { fill: 'none' as const, stroke: C.onSurfaceVariant, strokeWidth: 1, strokeOpacity: 0.5 };

  return (
    <View style={{ flexDirection: 'row', gap: 18, alignItems: 'center', paddingHorizontal: T.gutter }}>
      <View style={{ alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', gap: 16, marginBottom: 10 }}>
          {(['front', 'back'] as const).map(v => {
            const on = v === view;
            return (
              <Pressable key={v} hitSlop={8} onPress={() => { haptic('select'); onChangeView(v); }} style={{ paddingBottom: 5, borderBottomWidth: 2, borderBottomColor: on ? C.primary : 'transparent' }}>
                <Text style={{ fontFamily: F.header, fontSize: 10.5, letterSpacing: 1, color: on ? C.onSurface : C.onSurfaceVariant }}>{v.toUpperCase()}</Text>
              </Pressable>
            );
          })}
        </View>
        <Svg width={112} height={176} viewBox="0 0 140 200">
          <Ellipse cx={70} cy={18} rx={15} ry={17} {...inert} />
          <Rect x={63} y={34} width={14} height={10} {...inert} strokeWidth={0.9} />
          {view === 'front' ? (
            <>
              <Path d="M30,58 Q50,47 70,47 Q90,47 110,58" {...paint('Side Delts')} />
              <Path d="M38,58 L34,100 Q70,110 106,100 L102,58 Z" {...paint('Chest')} />
              <Path d="M40,104 L38,124 Q70,132 102,124 L100,104 Z" {...paint('Core')} />
              <Path d="M38,58 L20,94 L16,126" {...paint('Front Delts')} fill="none" strokeLinecap="round" />
              <Path d="M102,58 L120,94 L124,126" {...paint('Front Delts')} fill="none" strokeLinecap="round" />
              <Path d="M55,130 L50,164 L48,192" {...inert} strokeLinecap="round" />
              <Path d="M85,130 L90,164 L92,192" {...inert} strokeLinecap="round" />
              <Circle cx={50} cy={164} r={3.2} {...inert} strokeWidth={0.9} />
              <Circle cx={90} cy={164} r={3.2} {...inert} strokeWidth={0.9} />
            </>
          ) : (
            <>
              <Path d="M30,58 Q50,47 70,47 Q90,47 110,58" {...paint('Side Delts')} />
              <Path d="M38,58 L36,102 Q70,112 104,102 L102,58 Z" {...paint('Back')} />
              <Path d="M40,58 L24,92 L18,124" {...paint('Triceps')} fill="none" strokeLinecap="round" />
              <Path d="M100,58 L116,92 L122,124" {...paint('Triceps')} fill="none" strokeLinecap="round" />
              <Path d="M42,116 L38,132 Q70,140 102,132 L98,116 Z" {...paint('Glutes')} />
              <Path d="M55,138 L50,168 L48,192" {...paint('Hamstrings')} fill="none" strokeLinecap="round" />
              <Path d="M85,138 L90,168 L92,192" {...paint('Hamstrings')} fill="none" strokeLinecap="round" />
            </>
          )}
        </Svg>
      </View>
      <View style={{ flex: 1, gap: 11 }}>
        {activation.map(a => (
          <View key={a.muscle}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 9 }}>
              <Text style={{ flex: 1, fontFamily: F.bodyBold, fontSize: 12.5, color: C.onSurface }}>{a.muscle}</Text>
              <Text style={{ fontFamily: F.num, fontSize: 11, color: C.onSurfaceVariant }}>{Math.round(a.value * 100)}%</Text>
            </View>
            <View style={{ height: 3, borderRadius: 2, backgroundColor: T.track, overflow: 'hidden', marginTop: 5 }}>
              <View style={{ height: '100%', width: `${a.value * 100}%`, borderRadius: 2, backgroundColor: graphicPrimary }} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   HOLD TO CONFIRM
   ────────────────────────────────────────────────────────────────────────── */

function HoldToConfirm({ label, holdingLabel = 'Keep holding…', iconName = 'stop', duration = 1000, onConfirm, onHoldChange, C, isDark, disabled = false }: {
  label: string; holdingLabel?: string; iconName?: string; duration?: number; onConfirm: () => void; onHoldChange?: (holding: boolean) => void;
  C: ThemeColors; isDark: boolean; disabled?: boolean;
}) {
  const progress = useSharedValue(0);
  const [holding, setHolding] = React.useState(false);
  const setHold = useCallback((v: boolean) => { setHolding(v); onHoldChange?.(v); }, [onHoldChange]);
  const fire = useCallback(() => { setHold(false); progress.value = 0; haptic('success'); onConfirm(); }, [onConfirm, progress, setHold]);
  const start = useCallback(() => { if (disabled) return; haptic('medium'); setHold(true); progress.value = 0; progress.value = withTiming(1, { duration, easing: Easing.linear }, (finished) => { if (finished) runOnJS(fire)(); }); }, [disabled, duration, fire, progress, setHold]);
  const cancel = useCallback(() => { cancelAnimation(progress); if (progress.value > 0 && progress.value < 1) progress.value = withTiming(0, { duration: 160 }); else progress.value = 0; setHold(false); }, [progress, setHold]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));
  return (
    <Pressable disabled={disabled} onPressIn={start} onPressOut={cancel} style={{ flex: 1, borderRadius: 14, overflow: 'hidden' }}>
      <LinearGradient colors={[C.primary, C.primaryDim]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingVertical: 15, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { backgroundColor: isDark ? 'rgba(255,255,255,0.42)' : 'rgba(255,255,255,0.6)' }, fillStyle]} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name={iconName as any} size={17} color={C.onPrimary} />
          <Text style={{ fontFamily: F.header, fontSize: 14.5, color: C.onPrimary, letterSpacing: -0.1 }}>{holding ? holdingLabel : label}</Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   LIVE SESSION HOOK
   ────────────────────────────────────────────────────────────────────────── */

interface Options { template: WorkoutExercise[]; autoRest?: boolean; }

function useLiveSession({ template, autoRest = true }: Options) {
  const [exercises, setExercises] = useState<ActiveExercise[]>([]);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [restRemaining, setRestRemaining] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!template.length) { setExercises([]); return; }
    setExercises((prev) => template.map((ex) => {
      const existing = prev.find((p) => p.id === ex.id || p.name === ex.name);
      const newSetsData = Array.from({ length: ex.sets }, (_, i) => {
        if (existing && i < existing.setsData.length) return existing.setsData[i];
        if (ex.setsData && i < ex.setsData.length) return { weight: ex.setsData[i].weight, reps: ex.setsData[i].reps, completed: false };
        return { weight: ex.weight, reps: ex.reps, completed: false };
      });
      return { ...ex, setsData: newSetsData };
    }));
  }, [template]);

  const start = useCallback((at?: number) => { setStartedAt(at ?? Date.now()); }, []);

  useEffect(() => {
    if (startedAt === null || finished) return;
    const tick = () => setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    const sub = AppState.addEventListener('change', (s: AppStateStatus) => { if (s === 'active') tick(); });
    return () => { clearInterval(id); sub.remove(); };
  }, [startedAt, finished]);

  useEffect(() => {
    if (restEndsAt === null) { setRestRemaining(null); return; }
    const tick = () => { const left = Math.ceil((restEndsAt - Date.now()) / 1000); if (left <= 0) { setRestEndsAt(null); setRestRemaining(null); } else setRestRemaining(left); };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [restEndsAt]);

  const toggleSet = useCallback((exIdx: number, setIdx: number) => {
    setExercises((prev) => {
      const next = prev.map((e, i) => i !== exIdx ? e : { ...e, setsData: e.setsData.map((s, j) => j !== setIdx ? s : { ...s, completed: !s.completed }) });
      if (autoRest && next[exIdx]?.setsData[setIdx]?.completed) setRestEndsAt(Date.now() + (next[exIdx].rest ?? 60) * 1000);
      return next;
    });
  }, [autoRest]);

  const addSet = useCallback((exIdx: number) => {
    setExercises((prev) => prev.map((e, i) => {
      if (i !== exIdx) return e;
      const lastSet = e.setsData[e.setsData.length - 1];
      return { ...e, sets: e.sets + 1, setsData: [...e.setsData, { weight: lastSet?.weight ?? e.weight, reps: lastSet?.reps ?? e.reps, completed: false }] };
    }));
  }, []);

  const updateSet = useCallback((exIdx: number, setIdx: number, updates: { weight?: number; reps?: number }) => {
    setExercises((prev) => prev.map((e, i) => (i !== exIdx ? e : {
      ...e,
      setsData: e.setsData.map((s, j) => j !== setIdx ? s : { ...s, ...updates })
    })));
  }, []);

  const removeSet = useCallback((exIdx: number, setIdx: number) => {
    setExercises((prev) => prev.map((e, i) => (i !== exIdx ? e : {
      ...e,
      sets: Math.max(1, e.sets - 1),
      setsData: e.setsData.filter((_, j) => j !== setIdx)
    })));
  }, []);

  const extendRest = useCallback(() => { setRestEndsAt((prev) => (prev === null ? Date.now() + 15_000 : prev + 15_000)); }, []);
  const skipRest = useCallback(() => setRestEndsAt(null), []);
  const finish = useCallback(() => { setFinished(true); setRestEndsAt(null); }, []);
  const reset = useCallback(() => { setExercises([]); setStartedAt(null); setElapsed(0); setRestEndsAt(null); setFinished(false); }, []);

  const stats = useMemo(() => {
    let done = 0, total = 0, volume = 0;
    exercises.forEach(e => e.setsData.forEach(s => { total += 1; if (s.completed) { done += 1; volume += s.weight * s.reps; } }));
    return { done, total, volume, minutes: Math.max(1, Math.round(elapsed / 60)), progress: total ? done / total : 0 };
  }, [exercises, elapsed]);

  return { exercises, setExercises, elapsed, restRemaining, finished, stats, start, toggleSet, addSet, updateSet, removeSet, extendRest, skipRest, finish, reset };
}

/* ──────────────────────────────────────────────────────────────────────────
   TAB · OVERVIEW
   ────────────────────────────────────────────────────────────────────────── */

function GradientWord({ text, C, style }: { text: string; C: ThemeColors; style: any }) {
  if (Platform.OS === 'web') return <Text style={[style, { color: C.primary }]}>{text}</Text>;
  return (
    <MaskedView maskElement={<Text style={[style, { backgroundColor: 'transparent' }]}>{text}</Text>}>
      <LinearGradient colors={[C.primary, C.primaryDim]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Text style={[style, { opacity: 0 }]}>{text}</Text>
      </LinearGradient>
    </MaskedView>
  );
}

function OverviewTab({ workout, exercises, readiness, sessions = [], onStart, onCustomise, onHistory, onRename, onRegenerate, C, isDark, generating }: {
  workout?: Workout | null; exercises: WorkoutExercise[]; readiness: ReadinessMetric[]; sessions?: HistorySession[];
  onStart: () => void; onCustomise: () => void; onHistory: () => void; onRename: () => void; onRegenerate: () => void;
  C: ThemeColors; isDark: boolean; generating: boolean;
}) {
  const T = useMemo(() => makeTokens(C, isDark), [C, isDark]);
  const A = useMemo(() => accents(isDark), [isDark]);
  const [aiOpen, setAiOpen] = useState(false);

  const totalSets = exercises.reduce((a, b) => a + b.sets, 0);
  const estimatedKcal = Math.round(exercises.reduce((a, e) => a + e.sets * (e.weight > 0 ? 8 : 4), 0));
  const [firstWord, ...restWords] = (workout?.title ?? (generating ? 'Generating...' : 'No Workout')).split(' ');
  const rest = restWords.join(' ');
  const toneFor = (t: ReadinessMetric['tone']) => t === 'green' ? A.green : t === 'cyan' ? A.cyan : C.primary;

  if (generating) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={{ fontFamily: F.bodyMed, fontSize: 14, color: C.onSurfaceVariant, marginTop: 16 }}>Rachel AI is generating your workout...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <Entrance index={0}>
        <View style={{ paddingHorizontal: T.gutter, paddingTop: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <Icon name="auto-awesome" size={13} color={C.primary} />
            <Text style={{ fontFamily: F.header, fontSize: 10, letterSpacing: 1.6, color: C.primary }}>TODAY'S OPTIMISED PLAN</Text>
          </View>
          <View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.header, fontSize: 40, letterSpacing: -1.9, lineHeight: 40, color: C.onSurface }}>{firstWord}</Text>
              {!!rest && <GradientWord text={rest} C={C} style={{ fontFamily: F.header, fontSize: 40, letterSpacing: -1.9, lineHeight: 44 }} />}
            </View>
            <View style={{ flexDirection: 'row', gap: 8, paddingBottom: 8 }}>
              <Pressable onPress={() => { haptic('light'); onRename(); }} hitSlop={8}>
                <Icon name="edit" size={18} color={C.onSurfaceVariant} />
              </Pressable>
              <Pressable onPress={() => { haptic('light'); onRegenerate(); }} hitSlop={8}>
                <Icon name="refresh" size={18} color={C.primary} />
              </Pressable>
            </View>
          </View>
          <Text style={{ fontFamily: F.bodyMed, fontSize: 13.5, color: C.onSurfaceVariant, marginTop: 9, lineHeight: 20 }}>
            {(workout?.targetMuscles ?? exercises.map(e => e.muscle).filter(Boolean).join(' · ')) || 'Full Body'} {'  •  '}{exercises.length} exercises
          </Text>
        </View>
      </Entrance>

      <View style={{ marginTop: 20 }}>
        <StatColumns C={C} isDark={isDark} bordered items={[
          { value: String(workout?.duration ?? 45), unit: 'min', label: 'Duration' },
          { value: String(exercises.length), unit: `/ ${totalSets} sets`, label: 'Exercises' },
          { value: String(estimatedKcal), unit: 'kcal', label: 'Est. burn', tone: C.primary },
        ]} />
      </View>

      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', paddingHorizontal: T.gutter, paddingTop: 20 }}>
        <PressableScale onPress={onStart} style={{ flex: 1 }} hapticStyle="heavy">
          <LinearGradient colors={[C.primary, C.primaryDim]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 14 }}>
            <Icon name="play-arrow" size={17} color={C.onPrimary} />
            <Text style={{ fontFamily: F.header, fontSize: 14.5, color: C.onPrimary }}>Start Session</Text>
          </LinearGradient>
        </PressableScale>
        <Pressable onPress={() => { haptic('light'); onCustomise(); }} style={{ paddingVertical: 15, paddingHorizontal: 6 }}>
          <Text style={{ fontFamily: F.header, fontSize: 14.5, color: C.onSurface }}>Customise</Text>
        </Pressable>
      </View>

      <SectionLabel text="Readiness" C={C} />
      <StatColumns C={C} isDark={isDark} items={readiness.map(m => ({
        value: m.value, unit: m.unit, label: m.label, tone: toneFor(m.tone),
        footer: <View style={{ marginTop: 9, height: 22 }}><SplineChart width={70} height={22} color={toneFor(m.tone)} data={m.trend} /></View>,
      }))} />

      <View style={{ marginTop: 18 }}><Rule C={C} isDark={isDark} /></View>

      <Entrance index={1}>
        <View style={{ paddingHorizontal: T.gutter, paddingVertical: 16 }}>
          <LinearGradient colors={[C.primary, 'transparent']} style={{ position: 'absolute', left: 0, top: 16, bottom: 18, width: 2.5 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Icon name="auto-awesome" size={16} color={C.primary} />
            <Text style={{ flex: 1, fontFamily: F.header, fontSize: 13, letterSpacing: 0.2, color: C.onSurface }}>AI COACH</Text>
            <Pressable hitSlop={10} onPress={() => { haptic('select'); setAiOpen((v) => !v); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Text style={{ fontFamily: F.header, fontSize: 12.5, color: C.primary }}>{aiOpen ? 'Less' : 'Details'}</Text>
              <Icon name={aiOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={15} color={C.primary} />
            </Pressable>
          </View>
          <Text style={{ fontFamily: F.bodyMed, fontSize: 14, lineHeight: 22.6, color: C.onSurface }}>
            {workout?.aiExplanation ?? `${exercises.length} exercises · ${totalSets} total sets. Ready at ${readiness?.[0]?.value ?? 'optimal'}%.`}
          </Text>
          {(() => {
            const readyVal = readiness?.[0]?.value ? parseFloat(readiness[0].value) / 100 : 0.85;
            const readyPct = Math.round(Math.min(Math.max(readyVal, 0), 1) * 100);
            return (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 14 }}>
                <View style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: T.track, overflow: 'hidden' }}>
                  <LinearGradient colors={[C.primary, A.cyan]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: '100%', width: `${readyPct}%`, borderRadius: 2 }} />
                </View>
                <Text style={{ fontFamily: F.header, fontSize: 9.5, letterSpacing: 0.9, color: C.onSurfaceVariant }}>{readyPct}% READY</Text>
              </View>
            );
          })()}
          {aiOpen && (
            <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(140)} style={{ marginTop: 16 }}>
              {[
                { t: 'Exercises', s: `${exercises.length} exercises planned. Total volume: ${estimatedKcal} kcal estimated.` },
                { t: 'Recovery', s: `Readiness: ${readiness?.[0]?.value ?? 'Ready'}%. Sleep: ${readiness?.[1]?.value ?? '7h'}.` },
                { t: 'Plan', s: `Duration: ${workout?.duration ?? 45} min. ${totalSets} sets across ${exercises.length} movements.` },
              ].map((d, i) => (
                <View key={d.t} style={{ paddingVertical: 13 }}>
                  {i > 0 && <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: T.hairline, backgroundColor: T.hairSoft }} />}
                  <Text style={{ fontFamily: F.header, fontSize: 12, letterSpacing: 0.3, color: C.onSurface, marginBottom: 4 }}>{d.t}</Text>
                  <Text style={{ fontFamily: F.bodyMed, fontSize: 13, lineHeight: 20, color: C.onSurfaceVariant }}>{d.s}</Text>
                </View>
              ))}
            </Animated.View>
          )}
        </View>
      </Entrance>

      <Rule C={C} isDark={isDark} />

      <SectionLabel text="Today's Exercises" C={C} action="Edit" onAction={onCustomise} />
      {exercises.map((e, i) => (
        <Row key={e.id} C={C} isDark={isDark} first={i === 0} indented onPress={() => undefined}>
          <Text style={{ width: 22, textAlign: 'center', fontFamily: F.num, fontSize: 13, color: C.onSurfaceVariant }}>{i + 1}</Text>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontFamily: F.header, fontSize: 15.5, letterSpacing: -0.25, color: C.onSurface }}>{e.name}</Text>
            <Text style={{ fontFamily: F.num, fontSize: 11.5, color: C.primary, marginTop: 4 }}>
              {e.sets}×{e.reps}<Text style={{ color: C.onSurfaceVariant }}> · </Text>{e.weight} kg<Text style={{ color: C.onSurfaceVariant }}> · </Text>rest {e.rest ?? 60}s
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontFamily: F.num, fontSize: 14, color: C.onSurfaceVariant }}>~{Math.round(e.sets * (e.reps * (e.weight > 0 ? e.weight * 0.03 : 2)))}</Text>
            <Text style={{ fontFamily: F.header, fontSize: 9, letterSpacing: 0.8, color: C.onSurfaceVariant, marginTop: 2 }}>KCAL</Text>
          </View>
          <Icon name="chevron-right" size={17} color={C.onSurfaceVariant} />
        </Row>
      ))}

      <SectionLabel text="Plan" C={C} />
      <Row C={C} isDark={isDark} first onPress={() => undefined}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.header, fontSize: 15.5, letterSpacing: -0.2, color: C.onSurface }}>Session</Text>
          <Text style={{ fontFamily: F.bodyMed, fontSize: 12.5, color: C.onSurfaceVariant, marginTop: 3 }}>{workout?.title ?? 'Workout'} · {totalSets} sets · {workout?.duration ?? '~45'} min</Text>
        </View>
        <Icon name="chevron-right" size={17} color={C.onSurfaceVariant} />
      </Row>
      <Row C={C} isDark={isDark} onPress={() => undefined}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.header, fontSize: 15.5, letterSpacing: -0.2, color: C.onSurface }}>Target muscles</Text>
          <Text style={{ fontFamily: F.bodyMed, fontSize: 12.5, color: C.onSurfaceVariant, marginTop: 3 }}>{exercises.map(e => e.muscle).filter(Boolean).join(' · ') || 'Full Body'}</Text>
        </View>
        <Text style={{ fontFamily: F.header, fontSize: 9.5, letterSpacing: 0.8, color: C.primary }}>{exercises.length} EX</Text>
      </Row>
      <Row C={C} isDark={isDark} onPress={onHistory}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.header, fontSize: 15.5, letterSpacing: -0.2, color: C.onSurface }}>Last session overview</Text>
          <Text style={{ fontFamily: F.bodyMed, fontSize: 12.5, color: C.onSurfaceVariant, marginTop: 3 }}>{sessions?.[0]?.date ?? 'No past sessions'} · {sessions?.[0]?.duration ?? '~'} min · {sessions?.[0]?.volume ?? '0'}t</Text>
        </View>
        <Icon name="chevron-right" size={17} color={C.onSurfaceVariant} />
      </Row>
      <Pressable onPress={() => { haptic('light'); onHistory(); }} style={{ paddingVertical: 24 }}>
        <Text style={{ textAlign: 'center', fontFamily: F.header, fontSize: 13, color: C.primary }}>View all past sessions</Text>
      </Pressable>
    </ScrollView>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   TAB · BUILDER
   ────────────────────────────────────────────────────────────────────────── */

type NumericField = 'sets' | 'reps' | 'weight' | 'rest';
const STEP: Record<NumericField, number> = { sets: 1, reps: 1, weight: 2.5, rest: 15 };
const MIN: Record<NumericField, number> = { sets: 1, reps: 1, weight: 0, rest: 0 };

const SUGGESTIONS = ['Make it 30 min', 'Shoulder-safe swap', 'Add finisher', 'More intensity', 'Beginner friendly'];

/* ── Add Exercise Modal ─────────────────────────────── */
interface AddExerciseModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (exercise: WorkoutExercise) => void;
  C: ThemeColors;
  isDark: boolean;
}

function AddExerciseModal({ visible, onClose, onAdd, C, isDark }: AddExerciseModalProps) {
  const T = useMemo(() => makeTokens(C, isDark), [C, isDark]);
  const [name, setName] = useState('');
  const [muscle, setMuscle] = useState('');
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [weight, setWeight] = useState(0);
  const [rest, setRest] = useState(60);

  const handleAdd = () => {
    if (!name.trim()) return;
    haptic('medium');
    onAdd({
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      muscle: muscle.trim() || 'Full Body',
      sets,
      reps,
      weight,
      rest,
    });
    // Reset form
    setName('');
    setMuscle('');
    setSets(3);
    setReps(10);
    setWeight(0);
    setRest(60);
    onClose();
  };

  const handleClose = () => {
    setName('');
    setMuscle('');
    setSets(3);
    setReps(10);
    setWeight(0);
    setRest(60);
    onClose();
  };

  if (!visible) return null;

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
      <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={handleClose} />
      <Animated.View entering={FadeInDown.springify().damping(20).stiffness(120)}
        style={{ width: '88%', maxHeight: '80%', backgroundColor: C.bg, borderRadius: 24, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: T.hair }}>
        
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 22, paddingVertical: 18, borderBottomWidth: T.hairline, borderBottomColor: T.hairSoft }}>
          <Text style={{ fontFamily: F.header, fontSize: 18, letterSpacing: -0.3, color: C.onSurface }}>Add Exercise</Text>
          <Pressable onPress={handleClose} hitSlop={10}><Icon name="close" size={20} color={C.onSurfaceVariant} /></Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 30 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Exercise Name */}
          <View style={{ marginBottom: 18 }}>
            <Text style={{ fontFamily: F.header, fontSize: 10, letterSpacing: 1.2, color: C.onSurfaceVariant, marginBottom: 7, textTransform: 'uppercase' }}>Exercise Name *</Text>
            <TextInput value={name} onChangeText={setName} placeholder="e.g. Bench Press" placeholderTextColor={C.onSurfaceVariant}
              style={{ fontFamily: F.bodyMed, fontSize: 15, color: C.onSurface, backgroundColor: T.wash, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: T.hairline, borderColor: name.trim() ? C.primary : T.hairSoft }} />
          </View>

          {/* Muscle Group */}
          <View style={{ marginBottom: 18 }}>
            <Text style={{ fontFamily: F.header, fontSize: 10, letterSpacing: 1.2, color: C.onSurfaceVariant, marginBottom: 7, textTransform: 'uppercase' }}>Muscle Group</Text>
            <TextInput value={muscle} onChangeText={setMuscle} placeholder="e.g. Chest" placeholderTextColor={C.onSurfaceVariant}
              style={{ fontFamily: F.bodyMed, fontSize: 15, color: C.onSurface, backgroundColor: T.wash, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: T.hairline, borderColor: T.hairSoft }} />
          </View>

          {/* Sets & Reps row */}
          <View style={{ flexDirection: 'row', gap: 16, marginBottom: 18 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.header, fontSize: 10, letterSpacing: 1.2, color: C.onSurfaceVariant, marginBottom: 7, textTransform: 'uppercase' }}>Sets</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: T.wash, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, borderWidth: T.hairline, borderColor: T.hairSoft }}>
                <Stepper sign="−" onPress={() => setSets(Math.max(1, sets - 1))} C={C} T={T} />
                <Text style={{ flex: 1, textAlign: 'center', fontFamily: F.num, fontSize: 18, letterSpacing: -0.5, color: C.onSurface }}>{sets}</Text>
                <Stepper sign="+" onPress={() => setSets(Math.min(20, sets + 1))} C={C} T={T} />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.header, fontSize: 10, letterSpacing: 1.2, color: C.onSurfaceVariant, marginBottom: 7, textTransform: 'uppercase' }}>Reps</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: T.wash, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, borderWidth: T.hairline, borderColor: T.hairSoft }}>
                <Stepper sign="−" onPress={() => setReps(Math.max(1, reps - 1))} C={C} T={T} />
                <Text style={{ flex: 1, textAlign: 'center', fontFamily: F.num, fontSize: 18, letterSpacing: -0.5, color: C.onSurface }}>{reps}</Text>
                <Stepper sign="+" onPress={() => setReps(Math.min(100, reps + 1))} C={C} T={T} />
              </View>
            </View>
          </View>

          {/* Weight & Rest row */}
          <View style={{ flexDirection: 'row', gap: 16, marginBottom: 24 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.header, fontSize: 10, letterSpacing: 1.2, color: C.onSurfaceVariant, marginBottom: 7, textTransform: 'uppercase' }}>Weight (kg)</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: T.wash, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, borderWidth: T.hairline, borderColor: T.hairSoft }}>
                <Stepper sign="−" onPress={() => setWeight(Math.max(0, weight - 2.5))} C={C} T={T} />
                <Text style={{ flex: 1, textAlign: 'center', fontFamily: F.num, fontSize: 18, letterSpacing: -0.5, color: C.onSurface }}>{weight}</Text>
                <Stepper sign="+" onPress={() => setWeight(Math.min(500, weight + 2.5))} C={C} T={T} />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.header, fontSize: 10, letterSpacing: 1.2, color: C.onSurfaceVariant, marginBottom: 7, textTransform: 'uppercase' }}>Rest (s)</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: T.wash, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, borderWidth: T.hairline, borderColor: T.hairSoft }}>
                <Stepper sign="−" onPress={() => setRest(Math.max(0, rest - 15))} C={C} T={T} />
                <Text style={{ flex: 1, textAlign: 'center', fontFamily: F.num, fontSize: 18, letterSpacing: -0.5, color: C.onSurface }}>{rest}</Text>
                <Stepper sign="+" onPress={() => setRest(Math.min(600, rest + 15))} C={C} T={T} />
              </View>
            </View>
          </View>

          {/* Actions */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable onPress={handleClose} style={{ flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: T.hairline, borderColor: T.hair, alignItems: 'center' }}>
              <Text style={{ fontFamily: F.header, fontSize: 14, color: C.onSurfaceVariant }}>Cancel</Text>
            </Pressable>
            <PressableScale onPress={handleAdd} style={{ flex: 1.5 }} disabled={!name.trim()}>
              <LinearGradient colors={[C.primary, C.primaryDim]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{ paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center', opacity: name.trim() ? 1 : 0.5 }}>
                <Text style={{ fontFamily: F.header, fontSize: 14, color: C.onPrimary }}>Add Exercise</Text>
              </LinearGradient>
            </PressableScale>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

function BuilderTab({ exercises, activation, onChange, onSave, onDiscard, onGenerate, title, setTitle, muscleGroup, setMuscleGroup, generating, saving, C, isDark, onDuplicate, onDelete, onRename }: {
  exercises: WorkoutExercise[]; activation: MuscleActivation[]; onChange: (next: WorkoutExercise[]) => void;
  onSave: () => void; onDiscard: () => void; onGenerate: (prompt: string) => void;
  title: string; setTitle: (title: string) => void; muscleGroup: string; setMuscleGroup: (mg: string) => void;
  generating?: boolean; saving?: boolean; C: ThemeColors; isDark: boolean;
  onDuplicate?: () => void; onDelete?: () => void; onRename?: () => void;
}) {
  const T = useMemo(() => makeTokens(C, isDark), [C, isDark]);
  const [view, setView] = useState<MapView>('front');
  const [open, setOpen] = useState<string | null>(exercises[0]?.id ?? null);
  const [prompt, setPrompt] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const bump = useCallback((id: string, field: 'sets' | 'reps' | 'weight' | 'rest', delta: number) => {
    haptic('light');
    onChange(exercises.map(e => e.id === id ? { ...e, [field]: Math.max(0, (e[field] ?? 0) + delta) } : e));
  }, [exercises, onChange]);

  const remove = useCallback((id: string) => { haptic('medium'); onChange(exercises.filter(e => e.id !== id)); }, [exercises, onChange]);

  const duplicate = useCallback((index: number) => {
    haptic('light');
    const cloned = { ...exercises[index], id: `custom-${Date.now()}` };
    const next = [...exercises]; next.splice(index + 1, 0, cloned); onChange(next);
  }, [exercises, onChange]);

  const moveUp = useCallback((index: number) => {
    if (index === 0) return; haptic('light');
    const next = [...exercises]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; onChange(next);
  }, [exercises, onChange]);

  const moveDown = useCallback((index: number) => {
    if (index === exercises.length - 1) return; haptic('light');
    const next = [...exercises]; [next[index], next[index + 1]] = [next[index + 1], next[index]]; onChange(next);
  }, [exercises, onChange]);

  const totalSets = exercises.reduce((a, b) => a + b.sets, 0);
  const tonnage = exercises.reduce((a, b) => a + b.sets * b.reps * b.weight, 0) / 1000;
  const minutes = Math.round(exercises.reduce((a, b) => a + b.sets * ((b.rest ?? 60) + 35), 0) / 60);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={{ paddingBottom: 160 }} showsVerticalScrollIndicator={false}>
        <SectionLabel text="Muscle Activation" C={C} />
        <MuscleMap activation={activation} view={view} onChangeView={setView} C={C} isDark={isDark} />

        <SectionLabel text="Ask Coach" C={C} />
        <View style={{ paddingHorizontal: T.gutter }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 11, borderBottomWidth: T.hairline, borderBottomColor: T.hairGold }}>
            <Icon name="auto-awesome" size={17} color={C.primary} />
            <TextInput value={prompt} onChangeText={setPrompt} placeholder='"swap bench for dumbbell"' placeholderTextColor={C.onSurfaceVariant}
              returnKeyType="send" onSubmitEditing={() => { if (!prompt.trim()) return; onGenerate(prompt.trim()); setPrompt(''); }}
              style={{ flex: 1, minWidth: 0, fontFamily: F.bodyMed, fontSize: 14, color: C.onSurface, paddingVertical: 0 }} />
            <PressableScale disabled={!prompt.trim() || generating} onPress={() => { if (!prompt.trim()) return; onGenerate(prompt.trim()); setPrompt(''); }} scaleTo={0.88}>
              <LinearGradient colors={[C.primary, C.primaryDim]} style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="send" size={14} color={C.onPrimary} />
              </LinearGradient>
            </PressableScale>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 18, marginTop: 13 }}>
            {SUGGESTIONS.map(sg => (
              <Pressable key={sg} onPress={() => { haptic('select'); onGenerate(sg); }}>
                <Text style={{ fontFamily: F.bodyBold, fontSize: 12, color: C.primary, opacity: 0.85 }}>{sg}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <SectionLabel text={`Exercises · ${exercises.length}`} C={C} action="Add" onAction={() => {
          haptic('select');
          setShowAddModal(true);
        }} />

        {exercises.map((e, i) => {
          const expanded = open === e.id;
          return (
            <Animated.View key={e.id} layout={Layout.springify().damping(18)}>
              <View style={{ paddingHorizontal: T.gutter, paddingVertical: 14 }}>
                {i > 0 && <View style={{ position: 'absolute', left: T.gutter, right: 0, top: 0, height: T.hairline, backgroundColor: T.hairSoft }} />}
                <Pressable onPress={() => { haptic('select'); setOpen(expanded ? null : e.id); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <View style={{ width: 15, gap: 3.5, opacity: 0.32 }}>
                    {[0, 1, 2].map(k => <View key={k} style={{ height: 1.8, borderRadius: 1, backgroundColor: C.onSurface }} />)}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontFamily: F.header, fontSize: 15.5, letterSpacing: -0.25, color: C.onSurface }}>{e.name}</Text>
                    <Text style={{ fontFamily: F.num, fontSize: 11.5, color: C.primary, marginTop: 4 }}>
                      <Text style={{ color: C.onSurfaceVariant }}>{e.muscle ?? 'Full Body'}</Text>
                      {' · '}{e.sets}×{e.reps}{' · '}{e.weight} kg
                    </Text>
                  </View>
                  <Icon name={expanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={17} color={C.onSurfaceVariant} />
                </Pressable>

                {expanded && (
                  <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)}>
                    <View style={{ marginTop: 15 }}>
                      <View style={{ flexDirection: 'row', paddingHorizontal: 0, paddingBottom: 8 }}>
                        <Text style={{ width: 30, fontFamily: F.header, fontSize: 9, letterSpacing: 1.2, color: C.onSurfaceVariant }}>SET</Text>
                        <Text style={{ flex: 1, textAlign: 'center', fontFamily: F.header, fontSize: 9, letterSpacing: 1.2, color: C.onSurfaceVariant }}>WEIGHT</Text>
                        <Text style={{ flex: 1, textAlign: 'center', fontFamily: F.header, fontSize: 9, letterSpacing: 1.2, color: C.onSurfaceVariant }}>REPS</Text>
                        <View style={{ width: 34 }} />
                      </View>
                      {(e.setsData || []).map((sd, sIdx) => (
                        <BuilderSetRow key={sIdx} index={sIdx} data={sd}
                          onBump={(field, delta) => {
                            const newExercises = [...exercises];
                            const exIdx = exercises.findIndex(x => x.id === e.id);
                            if (exIdx >= 0) {
                              const newSetsData = [...(newExercises[exIdx].setsData || [])];
                              if (newSetsData[sIdx]) newSetsData[sIdx] = { ...newSetsData[sIdx], [field]: Math.max(0, newSetsData[sIdx][field as 'weight' | 'reps'] + delta) };
                              newExercises[exIdx] = { ...newExercises[exIdx], setsData: newSetsData, sets: newSetsData.length };
                              onChange(newExercises);
                            }
                          }}
                          onDelete={() => { haptic('light'); const newExercises = [...exercises]; const exIdx = exercises.findIndex(x => x.id === e.id); if (exIdx >= 0) { const newSetsData = (newExercises[exIdx].setsData || []).filter((_, i) => i !== sIdx); newExercises[exIdx] = { ...newExercises[exIdx], setsData: newSetsData, sets: newSetsData.length }; onChange(newExercises); } }}
                          C={C} isDark={isDark} />
                      ))}
                      <Pressable
                        onPress={() => { haptic('light'); const newExercises = [...exercises]; const exIdx = exercises.findIndex(x => x.id === e.id); if (exIdx >= 0) { const lastSet = e.setsData && e.setsData.length > 0 ? e.setsData[e.setsData.length - 1] : { weight: e.weight, reps: e.reps }; const newSetsData = [...(e.setsData || []), lastSet]; newExercises[exIdx] = { ...newExercises[exIdx], setsData: newSetsData, sets: newSetsData.length }; onChange(newExercises); } }}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 12, marginTop: 4, borderTopWidth: T.hairline, borderTopColor: T.hairSoft }}>
                        <Icon name="add" size={13} color={C.primary} />
                        <Text style={{ fontFamily: F.header, fontSize: 12.5, color: C.primary }}>Add set</Text>
                      </Pressable>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 12, paddingVertical: 12, borderTopWidth: T.hairline, borderTopColor: T.hairSoft }}>
                        <Text style={{ fontFamily: F.header, fontSize: 9, letterSpacing: 1, color: C.onSurfaceVariant }}>REST (s)</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
                          <Stepper sign="−" onPress={() => bump(e.id, 'rest', -10)} C={C} T={T} />
                          <Text style={{ fontFamily: F.num, fontSize: 16, letterSpacing: -0.5, color: C.onSurface, minWidth: 40, textAlign: 'center' }}>{e.rest ?? 60}</Text>
                          <Stepper sign="+" onPress={() => bump(e.id, 'rest', 10)} C={C} T={T} />
                        </View>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 24, marginTop: 14 }}>
                      <MiniAction icon="content-copy" label="Duplicate" C={C} onPress={() => duplicate(i)} />
                      {i > 0 && <MiniAction icon="arrow-upward" label="Move Up" C={C} onPress={() => moveUp(i)} />}
                      {i < exercises.length - 1 && <MiniAction icon="arrow-downward" label="Move Down" C={C} onPress={() => moveDown(i)} />}
                      <MiniAction icon="delete" label="Remove" C={C} tone={C.error || '#ef4444'} onPress={() => remove(e.id)} />
                    </View>
                  </Animated.View>
                )}
              </View>
            </Animated.View>
          );
        })}

        <SectionLabel text="Session Estimate" C={C} />
        <StatColumns C={C} isDark={isDark} bordered items={[
          { value: String(totalSets), label: 'Total sets' },
          { value: tonnage.toFixed(1), unit: 't', label: 'Volume' },
          { value: String(minutes), unit: 'min', label: 'Duration', tone: C.primary },
        ]} />

        <View style={{ paddingHorizontal: T.gutter, paddingTop: 30, paddingBottom: Platform.OS === 'ios' ? 120 : 100 }}>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Pressable onPress={() => { haptic('light'); onDiscard(); }} style={{ paddingVertical: 12, paddingHorizontal: 12 }}>
              <Text style={{ fontFamily: F.header, fontSize: 14.5, color: C.onSurfaceVariant }}>Discard</Text>
            </Pressable>
            <PressableScale onPress={onSave} style={{ flex: 1 }} disabled={saving} hapticStyle="medium">
              <LinearGradient colors={[C.primary, C.primaryDim]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 14, opacity: saving ? 0.7 : 1 }}>
                <Icon name="check" size={17} color={C.onPrimary} />
                <Text style={{ fontFamily: F.header, fontSize: 14.5, color: C.onPrimary }}>{saving ? 'Saving…' : 'Save & Lock Workout'}</Text>
              </LinearGradient>
            </PressableScale>
          </View>
        </View>
      </ScrollView>

      {/* Add Exercise Modal */}
      <AddExerciseModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={(newEx) => {
          onChange([...exercises, newEx]);
        }}
        C={C}
        isDark={isDark}
      />
    </KeyboardAvoidingView>
  );
}

function Stepper({ sign, onPress, C, T }: { sign: string; onPress: () => void; C: ThemeColors; T: ReturnType<typeof makeTokens> }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} style={({ pressed }) => ({ width: 22, height: 22, borderRadius: 11, borderWidth: T.hairline, borderColor: pressed ? C.primary : T.hair, backgroundColor: pressed ? C.primary : 'transparent', alignItems: 'center', justifyContent: 'center' })}>
      {({ pressed }) => <Text style={{ fontFamily: F.bodyBold, fontSize: 14, lineHeight: 17, color: pressed ? C.onPrimary : C.onSurfaceVariant }}>{sign}</Text>}
    </Pressable>
  );
}

function MiniAction({ icon, label, C, onPress, tone }: { icon: string; label: string; C: ThemeColors; onPress: () => void; tone?: string }) {
  const color = tone ?? C.onSurfaceVariant;
  return (
    <Pressable onPress={() => { haptic('light'); onPress(); }} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Icon name={icon as any} size={14} color={color} />
      <Text style={{ fontFamily: F.header, fontSize: 12.5, color }}>{label}</Text>
    </Pressable>
  );
}

const BuilderSetRow = React.memo(function BuilderSetRow({ index, data, onBump, onDelete, C, isDark }: {
  index: number; data: { weight: number; reps: number }; onBump: (field: 'weight' | 'reps', delta: number) => void; onDelete: () => void; C: ThemeColors; isDark: boolean;
}) {
  const T = useMemo(() => makeTokens(C, isDark), [C, isDark]);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 11 }}>
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: T.hairline, backgroundColor: T.hairSoft }} />
      <Text style={{ width: 30, fontFamily: F.num, fontSize: 13, color: C.onSurfaceVariant }}>{index + 1}</Text>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <Stepper sign="−" onPress={() => onBump('weight', -2.5)} C={C} T={T} />
        <Text style={{ fontFamily: F.num, fontSize: 15, letterSpacing: -0.4, color: C.onSurface, minWidth: 32, textAlign: 'center' }}>{data.weight}</Text>
        <Stepper sign="+" onPress={() => onBump('weight', 2.5)} C={C} T={T} />
      </View>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <Stepper sign="−" onPress={() => onBump('reps', -1)} C={C} T={T} />
        <Text style={{ fontFamily: F.num, fontSize: 15, letterSpacing: -0.4, color: C.onSurface, minWidth: 24, textAlign: 'center' }}>{data.reps}</Text>
        <Stepper sign="+" onPress={() => onBump('reps', 1)} C={C} T={T} />
      </View>
      <View style={{ width: 34, alignItems: 'flex-end' }}>
        <Pressable onPress={onDelete} style={{ padding: 4 }}><Icon name="close" size={16} color={C.onSurfaceVariant} /></Pressable>
      </View>
    </View>
  );
});

/* ──────────────────────────────────────────────────────────────────────────
   TAB · ACTIVE
   ────────────────────────────────────────────────────────────────────────── */

const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

function ActiveTab({ exercises, elapsed, restRemaining, finished, savedSummary, sessionTitle = 'Workout', onToggleSet, onAddSet, onRemoveSet, onUpdateSet, onExtendRest, onSkipRest, onFinish, onViewHistory, C, isDark, onBackToOverview }: {
  exercises: ActiveExercise[]; elapsed: number; restRemaining: number | null; finished: boolean; savedSummary?: string; sessionTitle?: string;
  onToggleSet: (exIdx: number, setIdx: number) => void; onAddSet: (exIdx: number) => void; onRemoveSet: (exIdx: number, setIdx: number) => void;
  onUpdateSet: (exIdx: number, setIdx: number, updates: { weight?: number; reps?: number }) => void;
  onExtendRest: () => void; onSkipRest: () => void; onFinish: () => void; onViewHistory: () => void;
  C: ThemeColors; isDark: boolean; onBackToOverview: () => void;
}) {
  const T = useMemo(() => makeTokens(C, isDark), [C, isDark]);
  const A = useMemo(() => accents(isDark), [isDark]);

  const { done, total } = useMemo(() => {
    let d = 0, t = 0;
    exercises.forEach(e => e.setsData.forEach(s => { t += 1; if (s.completed) d += 1; }));
    return { done: d, total: t };
  }, [exercises]);

  const progress = total > 0 ? done / total : 0;
  const currentIdx = exercises.findIndex((e) => e.setsData.some((s) => !s.completed));

  const pulse = useSharedValue(1);
  useEffect(() => {
    if (finished) { pulse.value = 1; return; }
    pulse.value = withRepeat(withSequence(withTiming(0.35, { duration: 700 }), withTiming(1, { duration: 700 })), -1, false);
  }, [finished, pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 170 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: T.gutter, paddingVertical: 16, borderBottomWidth: T.hairline, borderBottomColor: T.hair }}>
          <View style={{ width: 54, height: 54, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityRings size={54} rings={[{ progress, color: C.primary, radius: 24, strokeWidth: 4 }]} />
            <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: F.num, fontSize: 12, color: C.onSurface }}>{Math.round(progress * 100)}%</Text>
            </View>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Animated.View style={[{ width: 6, height: 6, borderRadius: 3, backgroundColor: finished ? A.green : A.red }, pulseStyle]} />
              <Text style={{ fontFamily: F.header, fontSize: 9.5, letterSpacing: 1.4, color: C.primary }}>{finished ? 'SESSION COMPLETE' : 'LIVE SESSION'}</Text>
            </View>
            <Text style={{ fontFamily: F.header, fontSize: 17, letterSpacing: -0.4, color: C.onSurface, marginTop: 5 }}>{sessionTitle}</Text>
            <Text style={{ fontFamily: F.bodyMed, fontSize: 12, color: C.onSurfaceVariant, marginTop: 3 }}>
              {done} of {total} sets · {exercises.reduce((a, e) => a + e.setsData.filter(s => s.completed).reduce((b, s) => b + (s.weight * s.reps), 0), 0).toFixed(1)} kg moved
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontFamily: F.num, fontSize: 23, letterSpacing: -1.1, color: C.onSurface }}>{fmt(elapsed)}</Text>
            <Text style={{ fontFamily: F.header, fontSize: 9, letterSpacing: 1, color: C.onSurfaceVariant }}>ELAPSED</Text>
          </View>
        </View>

        {restRemaining !== null && !finished && (
          <Animated.View entering={FadeIn.duration(200)}>
            <LinearGradient colors={[isDark ? 'rgba(125,211,252,0.12)' : 'rgba(14,116,144,0.10)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: T.gutter, paddingVertical: 13, borderBottomWidth: T.hairline, borderBottomColor: T.hairSoft }}>
              <ActivityRings size={34} rings={[{ progress: Math.min(restRemaining / 90, 1), color: A.cyan, radius: 15, strokeWidth: 3 }]} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.header, fontSize: 9.5, letterSpacing: 1.3, color: A.cyan }}>REST · NEXT SET</Text>
                <Text style={{ fontFamily: F.num, fontSize: 21, letterSpacing: -0.9, color: C.onSurface, marginTop: 3 }}>{fmt(restRemaining)}</Text>
              </View>
              <Pressable onPress={() => { haptic('light'); onExtendRest(); }} hitSlop={8} style={{ padding: 8 }}><Text style={{ fontFamily: F.header, fontSize: 12, color: A.cyan }}>+15s</Text></Pressable>
              <Pressable onPress={() => { haptic('light'); onSkipRest(); }} hitSlop={8} style={{ padding: 8 }}><Text style={{ fontFamily: F.header, fontSize: 12, color: A.cyan }}>Skip</Text></Pressable>
            </LinearGradient>
          </Animated.View>
        )}

        {exercises.map((e, i) => {
          const allDone = e.setsData.every((s) => s.completed);
          const isNow = i === currentIdx;
          const label = allDone ? 'DONE' : isNow ? 'NOW' : 'UP NEXT';
          const labelColor = allDone ? A.green : isNow ? C.primary : C.onSurfaceVariant;

          const Header = (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: T.gutter, paddingTop: 16, paddingBottom: 13 }}>
              <View style={{ width: 22, alignItems: 'center' }}>
                {allDone ? <Icon name="check" size={15} color={A.green} /> : <Text style={{ fontFamily: F.num, fontSize: 13, color: C.onSurfaceVariant }}>{i + 1}</Text>}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontFamily: F.header, fontSize: 16, letterSpacing: -0.3, color: C.onSurface }}>{e.name}</Text>
                <Text style={{ fontFamily: F.bodyMed, fontSize: 11.5, color: C.onSurfaceVariant, marginTop: 3 }}>{e.muscle ?? 'Full Body'} · rest {e.rest ?? 60}s{e.prev ? ` · prev ${e.prev}` : ''}</Text>
              </View>
              <Text style={{ fontFamily: F.header, fontSize: 9.5, letterSpacing: 1, color: labelColor }}>{label}</Text>
            </View>
          );

          return (
            <View key={e.id}>
              {isNow && !finished ? (
                <LinearGradient colors={[T.wash, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} locations={[0, 0.8]}>{Header}</LinearGradient>
              ) : Header}

              <View style={{ flexDirection: 'row', paddingHorizontal: T.gutter, paddingBottom: 8 }}>
                <Text style={{ width: 30, fontFamily: F.header, fontSize: 9, letterSpacing: 1.2, color: C.onSurfaceVariant }}>SET</Text>
                <Text style={{ flex: 1, textAlign: 'center', fontFamily: F.header, fontSize: 9, letterSpacing: 1.2, color: C.onSurfaceVariant }}>WEIGHT</Text>
                <Text style={{ flex: 1, textAlign: 'center', fontFamily: F.header, fontSize: 9, letterSpacing: 1.2, color: C.onSurfaceVariant }}>REPS</Text>
                <View style={{ width: 34 }} />
              </View>

              {e.setsData.map((sd, sIdx) => (
                <ActiveSetRow key={sIdx} index={sIdx} data={sd} prev={e.prev} onToggle={() => onToggleSet(i, sIdx)}
                  onUpdate={(updates) => onUpdateSet(i, sIdx, updates)} onRemove={() => onRemoveSet(i, sIdx)}
                  C={C} isDark={isDark} disabled={finished} />
              ))}

              {!finished && (
                <Pressable onPress={() => { haptic('light'); onAddSet(i); }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: T.gutter, paddingVertical: 12 }}>
                  <View style={{ position: 'absolute', left: T.gutter, right: 0, top: 0, height: T.hairline, backgroundColor: T.hairSoft }} />
                  <Icon name="add" size={13} color={C.primary} />
                  <Text style={{ fontFamily: F.header, fontSize: 12.5, color: C.primary }}>Add set</Text>
                </Pressable>
              )}
            </View>
          );
        })}

        <View style={{ paddingHorizontal: T.gutter, paddingTop: finished ? 30 : 30, paddingBottom: Platform.OS === 'ios' ? 120 : 100 }}>
          {finished ? (
            <Animated.View entering={FadeIn.duration(240)}>
              <LinearGradient colors={[isDark ? 'rgba(163,230,53,0.15)' : 'rgba(94,139,0,0.14)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} locations={[0, 0.82]}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: T.gutter, paddingVertical: 13, marginHorizontal: -T.gutter }}>
                <Icon name="check" size={16} color={A.green} />
                <Text style={{ fontFamily: F.bodyBold, fontSize: 13, color: A.green }}>{savedSummary ?? 'Session saved'}</Text>
              </LinearGradient>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <PressableScale onPress={onViewHistory} style={{ flex: 1 }} hapticStyle="medium">
                  <LinearGradient colors={[C.primary, C.primaryDim]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 14 }}>
                    <Icon name="calendar-today" size={17} color={C.onPrimary} />
                    <Text style={{ fontFamily: F.header, fontSize: 14.5, color: C.onPrimary }}>View in History</Text>
                  </LinearGradient>
                </PressableScale>
                <PressableScale onPress={onBackToOverview} style={{ flex: 1 }} hapticStyle="medium">
                  <LinearGradient colors={[C.primaryDim, C.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 14 }}>
                    <Icon name="home" size={17} color={C.onPrimary} />
                    <Text style={{ fontFamily: F.header, fontSize: 14.5, color: C.onPrimary }}>Back to Overview</Text>
                  </LinearGradient>
                </PressableScale>
              </View>
            </Animated.View>
          ) : (
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <Pressable style={{ padding: 12 }} hitSlop={6}><Icon name="timer" size={20} color={C.onSurface} /></Pressable>
              <PressableScale onPress={onFinish} style={{ flex: 1 }} hapticStyle="medium">
                <LinearGradient colors={[C.primary, C.primaryDim]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 14 }}>
                  <Icon name="check" size={17} color={C.onPrimary} />
                  <Text style={{ fontFamily: F.header, fontSize: 14.5, color: C.onPrimary }}>Finish Workout</Text>
                </LinearGradient>
              </PressableScale>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const ActiveSetRow = React.memo(function ActiveSetRow({ index, data, prev, onToggle, onUpdate, onRemove, C, isDark, disabled }: {
  index: number; data: { weight: number; reps: number; completed: boolean }; prev?: string;
  onToggle: () => void; onUpdate: (updates: { weight?: number; reps?: number }) => void; onRemove: () => void;
  C: ThemeColors; isDark: boolean; disabled?: boolean;
}) {
  const T = useMemo(() => makeTokens(C, isDark), [C, isDark]);
  const A = useMemo(() => accents(isDark), [isDark]);
  const on = data.completed;
  const [pw, pr] = (prev ?? '').split('×');

  const inner = (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: T.gutter, paddingVertical: 11 }}>
      <View style={{ position: 'absolute', left: T.gutter, right: 0, top: 0, height: T.hairline, backgroundColor: T.hairSoft }} />
      <Text style={{ width: 30, fontFamily: F.num, fontSize: 13, color: C.onSurfaceVariant }}>{index + 1}</Text>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Text style={{ fontFamily: F.num, fontSize: 16, letterSpacing: -0.4, color: on ? A.green : C.onSurface }}>
          {data.weight}<Text style={{ fontFamily: F.bodyBold, fontSize: 9.5, color: C.onSurfaceVariant }}> KG</Text>
        </Text>
        {!!pw && <Text style={{ fontFamily: F.num, fontSize: 9.5, color: C.onSurfaceVariant, marginTop: 3, opacity: 0.75 }}>{pw}</Text>}
      </View>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Text style={{ fontFamily: F.num, fontSize: 16, letterSpacing: -0.4, color: on ? A.green : C.onSurface }}>
          {data.reps}
        </Text>
        {!!pr && <Text style={{ fontFamily: F.num, fontSize: 9.5, color: C.onSurfaceVariant, marginTop: 3, opacity: 0.75 }}>{pr}</Text>}
      </View>
      <View style={{ width: 34, alignItems: 'flex-end' }}>
        <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: on ? 0 : 1.5, borderColor: T.hair, backgroundColor: on ? A.green : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
          {on && <Icon name="check" size={14} color={isDark ? C.bg : '#FFFFFF'} />}
        </View>
      </View>
    </View>
  );

  if (disabled) return inner;

  return (
    <Pressable onPress={() => { haptic(on ? 'light' : 'success'); onToggle(); }}>
      {on ? (
        <LinearGradient colors={[isDark ? 'rgba(163,230,53,0.10)' : 'rgba(94,139,0,0.11)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} locations={[0, 0.8]}>
          {inner}
        </LinearGradient>
      ) : inner}
    </Pressable>
  );
});

/* ──────────────────────────────────────────────────────────────────────────
   TAB · HISTORY
   ────────────────────────────────────────────────────────────────────────── */

const FILTERS: ReadonlyArray<{ key: HistoryFilterKey; label: string }> = [
  { key: 'all', label: 'All time' },
  { key: 'week', label: 'Past week' },
  { key: 'month', label: 'Past month' },
  { key: 'pr', label: 'PR sessions only' },
] as const;

const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };

export function filterSessions(sessions: HistorySession[], key: HistoryFilterKey): HistorySession[] {
  switch (key) {
    case 'pr': return sessions.filter(s => s.pr);
    case 'week': return sessions.filter(s => s.iso >= daysAgo(7));
    case 'month': return sessions.filter(s => s.iso >= daysAgo(30));
    default: return sessions;
  }
}

function groupByMonth(sessions: HistorySession[]) {
  const out: Array<{ month: string; items: HistorySession[] }> = [];
  sessions.forEach(s => {
    const d = new Date(s.iso);
    const month = `${d.toLocaleString('en-US', { month: 'long' }).toUpperCase()} ${d.getFullYear()}`;
    const last = out[out.length - 1];
    if (last && last.month === month) last.items.push(s);
    else out.push({ month, items: [s] });
  });
  return out;
}

function HistoryTab({ sessions, loading = false, weeklyLoad, streak = 0, onStartWorkout, C, isDark }: {
  sessions: HistorySession[]; loading?: boolean; weeklyLoad: Array<{ label: string; value: number }>; streak?: number; onStartWorkout: () => void; C: ThemeColors; isDark: boolean;
}) {
  const T = useMemo(() => makeTokens(C, isDark), [C, isDark]);
  const A = useMemo(() => accents(isDark), [isDark]);
  const [filter, setFilter] = useState<HistoryFilterKey>('all');
  const [open, setOpen] = useState(false);

  const counts = useMemo(() => FILTERS.reduce<Record<HistoryFilterKey, number>>((acc, f) => { acc[f.key] = filterSessions(sessions, f.key).length; return acc; }, { all: 0, week: 0, month: 0, pr: 0 }), [sessions]);
  const filtered = useMemo(() => filterSessions(sessions, filter), [sessions, filter]);
  const groups = useMemo(() => groupByMonth(filtered), [filtered]);
  const active = FILTERS.find(f => f.key === filter)!;

  const summary = useMemo(() => {
    const vol = filtered.reduce((a, s) => a + parseFloat(s.volume || '0'), 0);
    const mins = filtered.reduce((a, s) => a + s.duration, 0);
    return { count: filtered.length, volume: vol.toFixed(1), hours: (mins / 60).toFixed(1) };
  }, [filtered]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 }}>
        <ActivityIndicator color={C.primary} />
        <Text style={{ fontFamily: F.bodyMed, fontSize: 13, color: C.onSurfaceVariant, marginTop: 14 }}>Loading history…</Text>
      </View>
    );
  }

  const header = (
    <>
      <SectionLabel text={active.label} C={C} actionNode={
        <Pressable hitSlop={10} onPress={() => { haptic('select'); setOpen(v => !v); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <Icon name="filter" size={15} color={C.primary} />
          <Text style={{ fontFamily: F.header, fontSize: 13, color: C.primary }}>Filter</Text>
          <Icon name={open ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={15} color={C.primary} />
        </Pressable>
      } />
      {open && (
        <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)}>
          {FILTERS.map((f, i) => {
            const on = f.key === filter;
            return (
              <Pressable key={f.key} onPress={() => { haptic('select'); setFilter(f.key); setOpen(false); }} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: T.gutter, paddingVertical: 13, backgroundColor: pressed ? T.wash : undefined })}>
                {i > 0 && <View style={{ position: 'absolute', left: T.gutter, right: 0, top: 0, height: T.hairline, backgroundColor: T.hairSoft }} />}
                <View style={{ width: 17 }}>{on && <Icon name="check" size={17} color={C.primary} />}</View>
                <Text style={{ flex: 1, fontFamily: F.bodyBold, fontSize: 14.5, color: on ? C.primary : C.onSurface }}>{f.label}</Text>
                <Text style={{ fontFamily: F.num, fontSize: 11.5, color: C.onSurfaceVariant }}>{counts[f.key]}</Text>
              </Pressable>
            );
          })}
          <Rule C={C} isDark={isDark} soft />
        </Animated.View>
      )}
    </>
  );

  if (!filtered.length) {
    const firstRun = sessions.length === 0;
    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {header}
        <View style={{ paddingHorizontal: 36, paddingTop: 66, paddingBottom: 40, alignItems: 'center' }}>
          <View style={{ opacity: 0.3, marginBottom: 20 }}><Icon name="fitness-center" size={52} color={C.onSurfaceVariant} /></View>
          <Text style={{ fontFamily: F.header, fontSize: 17.5, letterSpacing: -0.3, color: C.onSurface, marginBottom: 9, textAlign: 'center' }}>
            {firstRun ? 'No sessions yet' : 'Nothing in this range'}
          </Text>
          <Text style={{ fontFamily: F.bodyMed, fontSize: 13.5, lineHeight: 22, color: C.onSurfaceVariant, textAlign: 'center', maxWidth: 252 }}>
            {firstRun ? 'Finish a workout and it lands here — volume, PRs and every set you logged.' : `No ${active.label.toLowerCase()} sessions found.`}
          </Text>
          <PressableScale onPress={firstRun ? onStartWorkout : () => setFilter('all')} style={{ marginTop: 24 }} hapticStyle="medium">
            <LinearGradient colors={[C.primary, C.primaryDim]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 26, borderRadius: 14 }}>
              <Icon name="play-arrow" size={16} color={C.onPrimary} />
              <Text style={{ fontFamily: F.header, fontSize: 14, color: C.onPrimary }}>{firstRun ? 'Start your first workout' : 'Show all time'}</Text>
            </LinearGradient>
          </PressableScale>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      {header}
      <StatColumns C={C} isDark={isDark} bordered items={[
        { value: String(summary.count), label: 'Sessions' },
        { value: summary.volume, unit: 't', label: 'Volume' },
        { value: summary.hours, unit: 'hrs', label: 'Time' },
        { value: String(streak), label: 'Streak', tone: C.primary },
      ]} />
      <SectionLabel text="Weekly Load" C={C} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: T.gutter, paddingBottom: 12 }}>
        <Text style={{ fontFamily: F.num, fontSize: 19, letterSpacing: -0.7, color: C.onSurface }}>{sessions.length}<Text style={{ fontFamily: F.bodyMed, fontSize: 11, color: C.onSurfaceVariant }}> session{sessions.length !== 1 ? 's' : ''} logged</Text></Text>
        <Text style={{ fontFamily: F.header, fontSize: 11.5, color: A.green }}>{summary.volume}t</Text>
      </View>
      <View style={{ paddingHorizontal: T.gutter }}><BarChart height={70} color={C.primary} data={weeklyLoad} /></View>

      {groups.map(g => (
        <View key={g.month}>
          <Text style={{ fontFamily: F.header, fontSize: 10.5, letterSpacing: 1.5, color: C.onSurfaceVariant, paddingHorizontal: T.gutter, paddingTop: 24, paddingBottom: 10 }}>{g.month}</Text>
          {g.items.map((s, i) => (
            <Animated.View key={s.id} layout={Layout.springify().damping(18)}>
              <SessionEntry session={s} first={i === 0} last={i === g.items.length - 1} C={C} isDark={isDark} />
            </Animated.View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

function SessionEntry({ session, first, last, C, isDark }: { session: HistorySession; first: boolean; last: boolean; C: ThemeColors; isDark: boolean }) {
  const T = useMemo(() => makeTokens(C, isDark), [C, isDark]);
  const A = useMemo(() => accents(isDark), [isDark]);

  return (
    <Pressable style={({ pressed }) => ({ flexDirection: 'row', gap: 15, paddingHorizontal: T.gutter, paddingVertical: 16, backgroundColor: pressed ? T.wash : undefined })}>
      {!first && <View style={{ position: 'absolute', left: T.gutter, right: 0, top: 0, height: T.hairline, backgroundColor: T.hairSoft }} />}
      <View style={{ position: 'absolute', left: T.gutter + 5, top: first ? 22 : 0, bottom: last ? undefined : 0, height: last ? 22 : undefined, width: 1.5, backgroundColor: T.hair }} />
      <View style={{ width: 11, paddingTop: 6 }}>
        <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: session.pr ? C.primary : A.green, borderWidth: 4, borderColor: C.bg }} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
              <Text style={{ fontFamily: F.header, fontSize: 15.5, letterSpacing: -0.25, color: C.onSurface }}>{session.title}</Text>
              {session.pr && <PRBadge C={C} />}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <Icon name="calendar-today" size={11} color={C.onSurfaceVariant} />
              <Text style={{ fontFamily: F.bodyMed, fontSize: 11.5, color: C.onSurfaceVariant }}>{session.date}</Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontFamily: F.num, fontSize: 16, color: C.primary }}>{session.duration}</Text>
            <Text style={{ fontFamily: F.header, fontSize: 9, letterSpacing: 0.8, color: C.onSurfaceVariant, marginTop: 2 }}>MIN</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', marginTop: 13, marginBottom: 11, borderTopWidth: T.hairline, borderBottomWidth: T.hairline, borderColor: T.hairSoft }}>
          {[{ v: `${session.volume} t`, k: 'VOLUME' }, { v: String(session.sets), k: 'SETS' }, { v: String(session.calories), k: 'KCAL' }].map((st, i) => (
            <View key={st.k} style={{ flex: 1, paddingVertical: 9, paddingLeft: i === 0 ? 0 : 12 }}>
              {i > 0 && <View style={{ position: 'absolute', left: 0, top: 10, bottom: 10, width: T.hairline, backgroundColor: T.hairSoft }} />}
              <Text style={{ fontFamily: F.num, fontSize: 13.5, letterSpacing: -0.4, color: C.onSurface }}>{st.v}</Text>
              <Text style={{ fontFamily: F.header, fontSize: 8.5, letterSpacing: 0.9, color: C.onSurfaceVariant, marginTop: 3 }}>{st.k}</Text>
            </View>
          ))}
        </View>

        {session.exercises.map((ex, i) => (
          <View key={`${ex.name}-${i}`} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 }}>
              <Text style={{ fontFamily: F.num, fontSize: 11, color: C.onSurfaceVariant, marginRight: 8 }}>{ex.scheme}</Text>
              <Text style={{ fontFamily: F.bodyMed, fontSize: 12.5, color: C.onSurface }} numberOfLines={1}>{ex.name}</Text>
              {ex.pr && <PRBadge C={C} />}
            </View>
            <Text style={{ fontFamily: F.num, fontSize: 11.5, color: C.onSurfaceVariant }}>{ex.load}</Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

function PRBadge({ C }: { C: ThemeColors }) {
  return (
    <LinearGradient colors={[C.primary, C.primaryDim]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 }}>
      <Text style={{ fontFamily: F.header, fontSize: 8.5, letterSpacing: 0.8, color: C.onPrimary }}>PR</Text>
    </LinearGradient>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   SCREEN — Main export
   ────────────────────────────────────────────────────────────────────────── */

function deriveActivation(exercises: WorkoutExercise[]): MuscleActivation[] {
  const totals = new Map<string, number>();
  let max = 0;
  exercises.forEach(e => {
    const key = e.muscle ?? 'Full Body';
    const v = (totals.get(key) ?? 0) + e.sets * e.reps;
    totals.set(key, v);
    if (v > max) max = v;
  });
  return Array.from(totals.entries()).map(([muscle, v]) => ({ muscle, value: max ? v / max : 0 })).sort((a, b) => b.value - a.value).slice(0, 5);
}

function mapApiWorkout(apiWorkout: any): Workout | null {
  if (!apiWorkout) return null;
  return {
    id: apiWorkout.id,
    title: apiWorkout.title,
    duration: apiWorkout.duration,
    targetMuscles: apiWorkout.targetMuscles,
    aiExplanation: apiWorkout.aiExplanation,
    versionNumber: apiWorkout.versionNumber,
    parentVersionId: apiWorkout.parentVersionId,
    isCurrent: apiWorkout.isCurrent,
    exercises: (apiWorkout.exercises || []).map(mapApiExercise),
  };
}

function mapApiExercise(ex: any): WorkoutExercise {
  return {
    id: ex.id,
    name: ex.name,
    muscle: ex.muscleGroup || ex.muscle || undefined,
    sets: ex.sets,
    reps: ex.reps,
    weight: typeof ex.weight === 'string' ? parseFloat(ex.weight) || 0 : (ex.weight || 0),
    rest: ex.restTime || ex.rest || 60,
    prev: ex.prev,
    setsData: typeof ex.setsData === 'string' ? JSON.parse(ex.setsData) : ex.setsData,
  };
}

function computePRsAndMapHistory(rawHistory: any[], existingPrs?: any[]): HistorySession[] {
  const sortedRaw = [...rawHistory].sort((a, b) => new Date(a.endTime || 0).getTime() - new Date(b.endTime || 0).getTime());
  const bests: Record<string, number> = {};
  
  // Seed with existing PRs
  if (existingPrs) {
    existingPrs.forEach((pr: any) => {
      bests[pr.exerciseName] = pr.weight;
    });
  }

  return sortedRaw.map((raw) => {
    const end = raw?.endTime ? new Date(raw.endTime) : new Date();
    const exs = Array.isArray(raw?.exercises) ? raw.exercises : [];
    const volume = exs.reduce((a: number, ex: any) => a + (ex.sets ?? []).reduce((b: number, s: any) => b + (s.weight ?? 0) * (s.reps ?? 0), 0), 0);
    
    let sessionHasPR = false;
    const mappedExercises = exs.slice(0, 5).map((ex: any) => {
      const maxWeight = Math.max(0, ...(ex.sets ?? []).filter((s: any) => s.isCompleted).map((s: any) => s.weight ?? 0));
      let isPR = false;
      if (maxWeight > 0) {
        if (!bests[ex.name] || maxWeight > bests[ex.name]) {
          isPR = true;
          bests[ex.name] = maxWeight;
          sessionHasPR = true;
        }
      }
      const totalSets = ex.sets?.length ?? 0;
      const completedSets = ex.sets?.filter((s: any) => s.isCompleted).length ?? 0;
      return {
        name: ex.name,
        scheme: `${completedSets}/${totalSets}×${ex.sets?.[0]?.reps ?? 0}`,
        load: maxWeight > 0 ? `${maxWeight} kg` : '0 kg',
        pr: isPR,
      };
    });

    return {
      id: raw?.id ?? `s-${Date.now()}`,
      title: raw?.title ?? 'Session',
      iso: end.toISOString().slice(0, 10),
      date: end.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }),
      duration: raw?.duration ?? 0,
      volume: (volume / 1000).toFixed(1),
      sets: exs.reduce((a: number, ex: any) => a + (ex.sets?.length ?? 0), 0),
      calories: raw?.caloriesBurned ?? 0,
      pr: sessionHasPR,
      exercises: mappedExercises,
    };
  }).reverse();
}

export interface WorkoutScreenProps {
  onNavigateBack?: () => void;
  onNavigateToNotifications?: () => void;
  userId?: string;
  createMode?: boolean;
}

export default function WorkoutScreen({ onNavigateBack, onNavigateToNotifications, userId: propUserId, createMode = false }: WorkoutScreenProps) {
  const { user } = useAuth();
  const userId = propUserId || user?.id || '';
  const { C, isDark, bgColors } = useTheme();
  const T = useMemo(() => makeTokens(C, isDark), [C, isDark]);
  const qc = useQueryClient();

  const [tab, setTab] = useState<TabKey>('overview');
  const [draft, setDraft] = useState<WorkoutExercise[] | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftMuscleGroup, setDraftMuscleGroup] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [xpToast, setXpToast] = useState<{ xp: number; level: number; streak: number; badge?: string } | null>(null);
  const [showRenameInput, setShowRenameInput] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => {
    if (createMode) { setTab('builder'); setDraft([]); setDraftTitle(''); setDraftMuscleGroup(''); }
  }, [createMode]);

  /* ── Queries ──────────────────────────────────────── */
  const { data: workout, isLoading: workoutLoading } = useQuery<Workout | null>({
    queryKey: ['currentWorkout', userId],
    queryFn: async () => mapApiWorkout(await fetchCurrentWorkout(userId)),
    enabled: !!userId,
  });

  const { data: historyRaw, isLoading: historyLoading } = useQuery({
    queryKey: ['workoutHistory', userId],
    queryFn: async () => (await fetchWorkoutHistory(userId)) as any[],
    enabled: !!userId,
  });

  const { data: prRecords } = useQuery({
    queryKey: ['workoutPrs', userId],
    queryFn: () => fetchPersonalRecords(userId),
    enabled: !!userId,
  });

  const { data: vitals } = useQuery({ queryKey: ['vitals'], queryFn: fetchVitals, refetchInterval: 3000 });
  const { data: sleepData } = useQuery({ queryKey: ['sleep', userId], queryFn: () => fetchSleepData(userId), enabled: !!userId });
  const { data: recoveryScore } = useQuery({ queryKey: ['recoveryScore', userId], queryFn: () => fetchRecoveryScore(userId), enabled: !!userId });

  // Auto-generate initial workout if none exists — backend saves to DB directly
  const generateInitMutation = useMutation({
    mutationFn: () => generateInitialWorkout(userId),
    onSuccess: () => {
      // Backend already saved to DB, just invalidate queries
      void qc.invalidateQueries({ queryKey: ['currentWorkout', userId] });
      void qc.invalidateQueries({ queryKey: ['calendar', userId] });
      void qc.invalidateQueries({ queryKey: ['calendar'] });
      setDraft(null);
      setDraftTitle('');
      haptic('success');
    },
  });

  // Generate initial workout when component mounts and no workout exists
  useEffect(() => {
    if (userId && !workoutLoading && !workout && !generateInitMutation.isPending && !createMode) {
      generateInitMutation.mutate();
    }
  }, [userId, workoutLoading, workout]);

  // Socket listeners for real-time updates from Rachel AI
  useEffect(() => {
    if (!userId) return;
    const { socket, joinUserRoom } = require('../services/socket/socketClient');
    joinUserRoom(userId);

    const handleWorkoutUpdate = () => {
      void qc.invalidateQueries({ queryKey: ['currentWorkout'] });
    };
    const handleCalendarUpdate = () => {
      void qc.invalidateQueries({ queryKey: ['calendar'] });
    };

    socket.on('workout_update', handleWorkoutUpdate);
    socket.on('calendar_update', handleCalendarUpdate);

    return () => {
      socket.off('workout_update', handleWorkoutUpdate);
      socket.off('calendar_update', handleCalendarUpdate);
    };
  }, [userId, qc]);

  const saveWorkoutMutation = useMutation({
    mutationFn: (payload: any) => saveWorkout(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['currentWorkout'] });
      void qc.invalidateQueries({ queryKey: ['calendar'] });
      setDraft(null);
      setDraftTitle('');
      haptic('success');
      setTab('overview');
    },
  });

  // Auto-save draft when leaving builder tab
  const handleTabChange = useCallback((newTab: TabKey) => {
    if (tab === 'builder' && newTab !== 'builder') {
      if (draft && draft.length > 0 && userId) {
        const estDuration = Math.round(draft.reduce((a, e) => a + e.sets * ((e.rest ?? 60) + 40), 0) / 60);
        saveWorkoutMutation.mutate({
          userId,
          title: draftTitle.trim() || workout?.title || 'Custom Workout',
          duration: String(estDuration),
          targetMuscles: draftMuscleGroup.trim() || workout?.targetMuscles || undefined,
          parentVersionId: workout?.id,
          exercises: draft,
        });
      }
    }
    setTab(newTab);
  }, [tab, draft, draftTitle, draftMuscleGroup, userId, workout, saveWorkoutMutation]);

  const readinessData: ReadinessMetric[] = useMemo(() => {
    if (!vitals) return [];
    const sleepTrend = sleepData?.chartData ? sleepData.chartData.map((d: any) => d.value) : [];
    const sleepStr = sleepData?.current || '0h';
    const sleepVal = sleepStr.replace('h', ':').replace('m', '').replace(' ', '');
    return [
      { key: 'recovery', label: 'Recovery', value: (vitals.bodyBattery ?? 0).toString(), unit: '%', tone: 'green', trend: [vitals.recoveryUpper ?? 0, vitals.recoveryLower ?? 0, vitals.recoveryCore ?? 0, vitals.recoveryCardio ?? 0] },
      { key: 'sleep', label: 'Sleep', value: sleepVal, unit: 'hrs', tone: 'cyan', trend: sleepTrend.length > 0 ? sleepTrend : [0, 0] },
      { key: 'readiness', label: 'Readiness', value: recoveryScore?.status || 'Ready', tone: 'gold', trend: [] },
    ];
  }, [vitals, sleepData, recoveryScore]);

  const weeklyLoadData = useMemo(() => {
    if (!vitals) return [];
    const loads = [vitals.loadM ?? 0, vitals.loadT ?? 0, vitals.loadW ?? 0, vitals.loadTh ?? 0, vitals.loadF ?? 0, vitals.loadSa ?? 0, vitals.loadSu ?? 0];
    const maxLoad = Math.max(...loads, 1);
    return loads.map((load, i) => ({ label: ['M', 'T', 'W', 'T', 'F', 'S', 'S'][i], value: load / maxLoad }));
  }, [vitals]);

  const templateExercises = workout?.exercises ?? [];
  const builderExercises = draft ?? templateExercises;
  const activation = useMemo(() => deriveActivation(builderExercises), [builderExercises]);

  const sessions = useMemo<HistorySession[]>(
    () => Array.isArray(historyRaw) ? computePRsAndMapHistory(historyRaw, prRecords) : [],
    [historyRaw, prRecords],
  );

  /* ── Live session ─────────────────────────────────── */
  const session = useLiveSession({ template: builderExercises });

  const startMutation = useMutation({
    mutationFn: startSession,
    onSuccess: (data: any) => {
      setSessionId(data?.id ?? null);
      session.start(data?.startTime ? new Date(data.startTime).getTime() : undefined);
    },
    onError: () => session.start(),
  });

  const completeMutation = useMutation({
    mutationFn: completeSession,
    onSuccess: (data: any) => {
      // Show XP notification toast
      if (data) {
        setXpToast({
          xp: data.xpAwarded || 0,
          level: data.level || 1,
          streak: data.currentStreak || 0,
          badge: data.newBadge || undefined,
        });
        // Auto-dismiss after 4 seconds
        setTimeout(() => setXpToast(null), 4000);
      }
      void qc.invalidateQueries({ queryKey: ['workoutHistory'] });
      void qc.invalidateQueries({ queryKey: ['currentWorkout'] });
      void qc.invalidateQueries({ queryKey: ['vitals'] });
      void qc.invalidateQueries({ queryKey: ['xpStats'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
      void qc.invalidateQueries({ queryKey: ['calendar'] });
      void qc.invalidateQueries({ queryKey: ['recoveryScore'] });
      void qc.invalidateQueries({ queryKey: ['workoutPrs'] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => deleteWorkout(workout?.id || ''),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['currentWorkout'] });
      void qc.invalidateQueries({ queryKey: ['calendar'] });
      haptic('success');
      setTab('overview');
      setDraft(null);
      // Trigger re-generation
      if (userId) generateInitMutation.mutate();
    },
  });

  // Rename mutation
  const renameMutation = useMutation({
    mutationFn: (newTitle: string) => renameWorkout(workout?.id || '', newTitle),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['currentWorkout'] });
      haptic('success');
      setShowRenameInput(false);
    },
  });

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: () => duplicateWorkout(workout?.id || ''),
    onSuccess: (data: any) => {
      void qc.invalidateQueries({ queryKey: ['currentWorkout'] });
      haptic('success');
      if (data) setDraft(null);
    },
  });

  const generateMutation = useMutation({
    mutationFn: (prompt: string) => generateWorkout(prompt, workout?.id, userId),
    onSuccess: (data: any) => {
      if (data?.exercises?.length) {
        setDraft(data.exercises.map((ex: any, idx: number) => ({
          id: ex.id || `gen-${idx}-${Date.now()}`,
          name: ex.name,
          muscle: ex.muscleGroup || ex.muscle,
          sets: ex.sets,
          reps: ex.reps,
          weight: typeof ex.weight === 'string' ? parseFloat(ex.weight) || 0 : (ex.weight || 0),
          rest: ex.restTime || ex.rest || 60,
        })));
      }
      haptic('success');
    },
  });

  /* Start session when Active tab opens */
  useEffect(() => {
    if (tab !== 'active' || sessionId || startMutation.isPending || session.finished || !builderExercises.length) return;
    startMutation.mutate({
      userId,
      workoutId: workout?.id,
      title: workout?.title ?? (builderExercises.length > 0 ? `${builderExercises.length} Exercise Workout` : 'Untitled Workout'),
      exercises: builderExercises,
    });
  }, [tab]);

  const handleFinish = useCallback(() => {
    session.finish();
    const realSessionId = sessionId;
    const estimatedCalories = Math.round(session.stats.volume * 0.05 + session.stats.minutes * 5);
    completeMutation.mutate({
      sessionId: realSessionId,
      userId,
      workoutId: workout?.id,
      title: draftTitle.trim() || workout?.title || 'Custom Workout',
      duration: session.stats.minutes,
      caloriesBurned: estimatedCalories,
      notes: `Completed ${session.stats.done} sets · ${(session.stats.volume / 1000).toFixed(1)}t volume`,
      exercises: session.exercises,
    });
    if (!realSessionId) {
      console.warn('[Workout] No sessionId — local only.');
      void qc.invalidateQueries({ queryKey: ['workoutHistory'] });
    }
  }, [completeMutation, session, sessionId, qc, userId, workout?.id, workout?.title, draftTitle]);

  const handleSaveBuilder = useCallback(() => {
    const estDuration = Math.round(builderExercises.reduce((a, e) => a + e.sets * ((e.rest ?? 60) + 40), 0) / 60);
    
    if (workout?.id) {
      // Save as new version
      saveWorkoutMutation.mutate({
        userId,
        title: draftTitle.trim() || workout?.title || 'Custom Workout',
        duration: String(estDuration),
        targetMuscles: draftMuscleGroup.trim() || workout?.targetMuscles,
        parentVersionId: workout.id,
        exercises: builderExercises,
      });
    } else {
      saveWorkoutMutation.mutate({
        userId,
        title: draftTitle.trim() || 'Custom Workout',
        duration: String(estDuration),
        targetMuscles: draftMuscleGroup.trim() || undefined,
        exercises: builderExercises,
      });
    }
  }, [builderExercises, saveWorkoutMutation, userId, workout, draftTitle, draftMuscleGroup]);

  const handleRename = useCallback(() => {
    if (!workout?.id) return;
    setRenameValue(workout.title || '');
    setShowRenameInput(true);
  }, [workout]);

  const handleDeleteConfirm = useCallback(() => {
    if (!workout?.id) return;
    Alert.alert('Delete Workout', 'Delete this workout template? This cancels any active sessions.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate() }
    ]);
  }, [workout, deleteMutation]);

  const scrollY = useSharedValue(0);
  const compactStyle = useAnimatedStyle(() => ({ opacity: interpolate(scrollY.value, [10, 46], [0, 1], Extrapolation.CLAMP) }));

  const currentWorkoutTitle = workout?.title ?? (generateInitMutation.isPending ? 'Generating...' : 'No workout');
  const subtitle = tab === 'active'
    ? session.finished ? 'Session complete · saved' : 'Session running'
    : workout ? `${currentWorkoutTitle} · v${workout.versionNumber ?? 1}` : 'Loading workout…';

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <MeshGradientBackground bgColors={bgColors} isDark={isDark} />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={{ paddingHorizontal: T.gutter, paddingTop: 8, paddingBottom: 2 }}>
          <Text style={{ fontFamily: F.header, fontSize: 34, letterSpacing: -1.2, color: C.onSurface }}>Workout Tracker</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 6 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: isDark ? '#A3E635' : '#5E8B00' }} />
            <Text style={{ fontFamily: F.bodyBold, fontSize: 13, color: C.onSurfaceVariant }}>{subtitle}</Text>
          </View>
        </View>

        {/* Rename input overlay */}
        {showRenameInput && (
          <View style={{ paddingHorizontal: T.gutter, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TextInput
              value={renameValue} onChangeText={setRenameValue}
              style={{ flex: 1, fontFamily: F.bodyMed, fontSize: 15, color: C.onSurface, backgroundColor: T.wash, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: T.hairline, borderColor: C.primary }}
              autoFocus
              placeholder="Workout name"
              placeholderTextColor={C.onSurfaceVariant}
              onSubmitEditing={() => { if (renameValue.trim()) renameMutation.mutate(renameValue.trim()); }}
            />
            <Pressable onPress={() => { haptic('light'); if (renameValue.trim()) renameMutation.mutate(renameValue.trim()); }} style={{ padding: 8 }}>
              <Icon name="check" size={20} color={C.primary} />
            </Pressable>
            <Pressable onPress={() => setShowRenameInput(false)} style={{ padding: 8 }}>
              <Icon name="close" size={20} color={C.onSurfaceVariant} />
            </Pressable>
          </View>
        )}

        <WorkoutTabs active={tab} onChange={handleTabChange} C={C} isDark={isDark} />

        <View style={{ flex: 1 }}>
          {tab === 'overview' && (
            <Animated.View style={{ flex: 1 }} entering={FadeIn.duration(180)}>
              <OverviewTab
                workout={workout}
                exercises={templateExercises}
                readiness={readinessData}
                sessions={sessions}
                generating={generateInitMutation.isPending}
                onStart={() => handleTabChange('active')}
                onCustomise={() => handleTabChange('builder')}
                onHistory={() => handleTabChange('history')}
                onRename={handleRename}
                onRegenerate={() => {
                  if (userId) generateInitMutation.mutate();
                }}
                C={C}
                isDark={isDark}
              />
            </Animated.View>
          )}

          {tab === 'builder' && (
            <Animated.View style={{ flex: 1 }} entering={FadeIn.duration(180)}>
              <BuilderTab
                title={draftTitle}
                setTitle={setDraftTitle}
                muscleGroup={draftMuscleGroup}
                setMuscleGroup={setDraftMuscleGroup}
                exercises={builderExercises}
                activation={activation}
                onChange={setDraft}
                onSave={handleSaveBuilder}
                onDiscard={() => { setDraft(null); setDraftTitle(''); setTab('overview'); }}
                onGenerate={(p) => generateMutation.mutate(p)}
                generating={generateMutation.isPending}
                saving={saveWorkoutMutation.isPending}
                onDuplicate={() => duplicateMutation.mutate()}
                onDelete={handleDeleteConfirm}
                onRename={handleRename}
                C={C}
                isDark={isDark}
              />
            </Animated.View>
          )}

          {tab === 'active' && (
            <Animated.View style={{ flex: 1 }} entering={FadeIn.duration(180)}>
              <ActiveTab
                exercises={session.exercises}
                elapsed={session.elapsed}
                restRemaining={session.restRemaining}
                finished={session.finished}
                savedSummary={`Session saved · ${Math.floor(session.elapsed / 60)}:${(session.elapsed % 60).toString().padStart(2, '0')} · ${session.stats.done} sets logged`}
                sessionTitle={workout?.title ?? (templateExercises.length > 0 ? `${templateExercises.length} Exercise Workout` : 'Workout')}
                onToggleSet={session.toggleSet}
                onAddSet={session.addSet}
                onRemoveSet={session.removeSet}
                onUpdateSet={session.updateSet}
                onExtendRest={session.extendRest}
                onSkipRest={session.skipRest}
                onFinish={handleFinish}
                onViewHistory={() => handleTabChange('history')}
                onBackToOverview={() => { session.reset(); setSessionId(null); handleTabChange('overview'); }}
                C={C}
                isDark={isDark}
              />
            </Animated.View>
          )}

          {tab === 'history' && (
            <Animated.View style={{ flex: 1 }} entering={FadeIn.duration(180)}>
              <HistoryTab
                sessions={sessions}
                loading={historyLoading}
                weeklyLoad={weeklyLoadData}
                streak={(user as any)?.currentStreak ?? 0}
                onStartWorkout={() => handleTabChange('overview')}
                C={C}
                isDark={isDark}
              />
            </Animated.View>
          )}
        </View>
      </SafeAreaView>

      {/* XP Toast Notification */}
      {xpToast && (
        <Animated.View entering={FadeInDown.delay(200).springify()} exiting={FadeOut.duration(300)}
          style={{ position: 'absolute', bottom: Platform.OS === 'ios' ? 120 : 100, left: 22, right: 22, zIndex: 100 }}>
          <LinearGradient colors={[C.primary, C.primaryDim]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ borderRadius: 16, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="auto-awesome" size={20} color={C.onPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.header, fontSize: 15, color: C.onPrimary }}>+{xpToast.xp} XP · Level {xpToast.level}</Text>
              <Text style={{ fontFamily: F.bodyMed, fontSize: 12, color: C.onPrimary, opacity: 0.8, marginTop: 2 }}>
                Streak: {xpToast.streak} days{xpToast.badge ? ` · 🏆 ${xpToast.badge}` : ''}
              </Text>
            </View>
            <Pressable onPress={() => setXpToast(null)} hitSlop={10}>
              <Icon name="close" size={16} color={C.onPrimary} />
            </Pressable>
          </LinearGradient>
        </Animated.View>
      )}
    </View>
  );
}
