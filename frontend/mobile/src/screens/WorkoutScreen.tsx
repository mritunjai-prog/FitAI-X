/**
 * ════════════════════════════════════════════════════════════════════════════
 *  FitAI X — WORKOUT HUB
 *  Single-file screen. Overview · Builder · Active · History.
 * ════════════════════════════════════════════════════════════════════════════
 *
 *  DESIGN CONTRACT — "no cards"
 *  Nothing in this file renders `borderRadius + borderWidth + backgroundColor`
 *  as a *container*. Hierarchy is carried by four mechanisms instead:
 *
 *    1. Two hairline weights — T.hair (section) vs T.hairSoft (row). That
 *       contrast is what replaces a card boundary.
 *    2. Separator insets — 22px normally, 58px beside a leading numeral.
 *    3. Fading washes — LinearGradient to transparent at 80%, so active and
 *       completed states read as emphasis with no visible edge.
 *    4. Type scale — 40 hero / 15.5 row / 12.5 meta / 9.5 overline.
 *
 *  Shapes survive ONLY on controls (buttons, chips, steppers, tick circle),
 *  because flattening those would destroy affordance.
 *
 *  CHARTS — this file deliberately does NOT hand-roll ring/spark/bar SVG.
 *  It calls the shared ActivityRings / SplineChart / BarChart components so
 *  there is exactly one chart implementation in the app.
 *
 *  ICONS — ICON_PATHS below is a local copy for drop-in portability. Replace
 *  it with your shared registry import; see the note at its declaration.
 *  CONTENTS
 *  ----------------------------------------------------------------------
 *    TYPES ......................................... L102
 *    DESIGN TOKENS ................................. L211
 *    PRIMITIVES .................................... L268
 *    TAB BAR ....................................... L662
 *    MUSCLE MAP .................................... L795
 *    HOLD TO CONFIRM ............................... L950
 *    LIVE SESSION HOOK ............................. L1069
 *    TAB · OVERVIEW ................................ L1247
 *    TAB · BUILDER ................................. L1590
 *    TAB · ACTIVE .................................. L2062
 *    TAB · HISTORY ................................. L2536
 *    SCREEN ........................................ L3022
 *
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
  saveWorkout,
  startSession,
} from '../services/api/workout';
import { fetchVitals } from '../services/api/dashboard';
import { fetchSleepData, fetchRecoveryScore } from '../services/api/recovery';
import { F, ThemeColors } from '../theme';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

/* ──────────────────────────────────────────────────────────────────────────
   TYPES
   Shared domain types.
   (was types.ts)
   ────────────────────────────────────────────────────────────────────────── */
/**
 * Workout Hub — shared types
 */

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

/** A single prescribed exercise inside a workout template. */
export interface WorkoutExercise {
  id: string;
  name: string;
  muscle?: string;
  sets: number;
  reps: number;
  /** Prescribed load in kg. */
  weight: number;
  /** Rest between sets, seconds. */
  rest?: number;
  /** Ghost value from the previous logged session, e.g. "80×8". */
  prev?: string;
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

/** One logged set inside a live session. */
export interface SetEntry {
  weight: number;
  reps: number;
  completed: boolean;
}

/** Live-session working copy of an exercise. */
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
  /** ISO date, used for range filtering. */
  iso: string;
  date: string;
  /** Minutes. */
  duration: number;
  /** Tonnage string, e.g. "8.4". */
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
  /** 0..1 */
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
   Hairlines, washes, tracks. Two hairline weights carry all grouping.
   (was tokens.ts)
   ────────────────────────────────────────────────────────────────────────── */
/**
 * Workout Hub design tokens.
 *
 * These mirror the CSS custom properties from the HTML spec. Everything that
 * was a `--var` there is derived from your existing ThemeContext `C` object
 * here, so there is a single source of truth for colour.
 *
 * The flattened design leans on exactly two hairline weights — that contrast
 * is what replaces card borders as the grouping signal.
 */
interface WorkoutTokens {
  /** Section boundary rule. */
  hair: string;
  /** Row-level rule inside a section. Deliberately ~half the weight of `hair`. */
  hairSoft: string;
  /** Accent rule for AI / composer affordances. */
  hairGold: string;
  /** Inert track behind progress bars and rings. */
  track: string;
  /** Faint gold tint for pressed + selected states. */
  wash: string;
  /** True 1px on every density. */
  hairline: number;
  /** Standard horizontal page gutter. */
  gutter: number;
  /** Left inset for separators that sit beside a leading numeral. */
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

/**
 * Semantic accents. Light mode needs genuinely darker values — a straight
 * invert of the dark palette fails contrast on a light background.
 */
const accents = (isDark: boolean) => ({
  green: isDark ? '#A3E635' : '#5E8B00',
  cyan: isDark ? '#7DD3FC' : '#0E7490',
  amber: isDark ? '#F59E0B' : '#B26B00',
  red: isDark ? '#F87171' : '#C2413E',
});


/* ──────────────────────────────────────────────────────────────────────────
   PRIMITIVES
   Row / Rule / StatColumns / Icon / haptics. No component here draws a card.
   (was primitives.tsx)
   ────────────────────────────────────────────────────────────────────────── */
/* ────────────────────────────────────────────────────────────────
   Haptics
   ──────────────────────────────────────────────────────────────── */
type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'select';

function haptic(style: HapticStyle = 'light'): void {
  if (Platform.OS === 'web') return;
  switch (style) {
    case 'success':
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      break;
    case 'select':
      void Haptics.selectionAsync();
      break;
    case 'heavy':
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      break;
    case 'medium':
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      break;
    default:
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

/* ────────────────────────────────────────────────────────────────
   Icon — reuses the app-wide path registry.
   NOTE: in your codebase this should import the shared ICON_PATHS
   rather than redeclaring. Kept local-import shaped for portability.
   ──────────────────────────────────────────────────────────────── */


/* ────────────────────────────────────────────────────────────────
   PressableScale — spring press feedback, no surface of its own.
   ──────────────────────────────────────────────────────────────── */
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

function PressableScale({
  children,
  onPress,
  onLongPress,
  style,
  disabled = false,
  hapticStyle = 'light',
  scaleTo = 0.96,
  hitSlop = 0,
}: PressableScaleProps) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      disabled={disabled}
      hitSlop={hitSlop}
      onPressIn={() => {
        scale.value = withSpring(scaleTo, { damping: 15, stiffness: 320 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 320 });
      }}
      onPress={() => {
        if (disabled) return;
        haptic(hapticStyle);
        onPress?.();
      }}
      onLongPress={onLongPress}
      style={style}
    >
      <Animated.View style={animated}>{children}</Animated.View>
    </Pressable>
  );
}

/* ────────────────────────────────────────────────────────────────
   Entrance — staggered mount animation.
   ──────────────────────────────────────────────────────────────── */
function Entrance({
  children,
  index = 0,
  style,
}: {
  children: React.ReactNode;
  index?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 70).springify().damping(16).mass(0.85)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

/* ────────────────────────────────────────────────────────────────
   Structural primitives — these replace cards entirely.
   ──────────────────────────────────────────────────────────────── */

/** Full-bleed horizontal rule. `soft` = row-level, default = section-level. */
function Rule({
  C,
  isDark,
  soft = false,
  inset = 0,
  style,
}: {
  C: ThemeColors;
  isDark: boolean;
  soft?: boolean;
  inset?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const T = useMemo(() => makeTokens(C, isDark), [C, isDark]);
  return (
    <View
      style={[
        {
          height: T.hairline,
          backgroundColor: soft ? T.hairSoft : T.hair,
          marginLeft: inset,
        },
        style,
      ]}
    />
  );
}

/** Uppercase section label with optional trailing action. */
function SectionLabel({
  text,
  C,
  action,
  onAction,
  actionNode,
}: {
  text: string;
  C: ThemeColors;
  action?: string;
  onAction?: () => void;
  actionNode?: React.ReactNode;
}) {
  return (
    <View style={s.secLbl}>
      <Text
        style={{
          fontFamily: F.header,
          fontSize: 11,
          letterSpacing: 1.5,
          color: C.onSurfaceVariant,
          textTransform: 'uppercase',
        }}
      >
        {text}
      </Text>
      {actionNode ??
        (action ? (
          <Text
            onPress={() => {
              haptic('select');
              onAction?.();
            }}
            style={{ fontFamily: F.header, fontSize: 13, color: C.primary }}
          >
            {action}
          </Text>
        ) : null)}
    </View>
  );
}

/**
 * StatColumns — the flattened replacement for stat tiles.
 * Columns divided by vertical hairlines; `bordered` adds top/bottom rules.
 */
interface StatColumn {
  value: string;
  unit?: string;
  label: string;
  tone?: string;
  /** Optional slot rendered under the label (e.g. a sparkline). */
  footer?: React.ReactNode;
}

function StatColumns({
  items,
  C,
  isDark,
  bordered = false,
}: {
  items: StatColumn[];
  C: ThemeColors;
  isDark: boolean;
  bordered?: boolean;
}) {
  const T = useMemo(() => makeTokens(C, isDark), [C, isDark]);
  return (
    <View
      style={[
        { flexDirection: 'row', paddingHorizontal: T.gutter },
        bordered && {
          borderTopWidth: T.hairline,
          borderBottomWidth: T.hairline,
          borderColor: T.hair,
        },
      ]}
    >
      {items.map((it, i) => (
        <View
          key={`${it.label}-${i}`}
          style={{ flex: 1, paddingVertical: 15, paddingLeft: i === 0 ? 0 : 16, minWidth: 0 }}
        >
          {i > 0 && (
            <View
              style={{
                position: 'absolute',
                left: 0,
                top: 15,
                bottom: 15,
                width: T.hairline,
                backgroundColor: T.hairSoft,
              }}
            />
          )}
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
            <Text
              style={{
                fontFamily: F.num,
                fontSize: 20,
                letterSpacing: -0.7,
                color: it.tone ?? C.onSurface,
              }}
              numberOfLines={1}
            >
              {it.value}
            </Text>
            {!!it.unit && (
              <Text style={{ fontFamily: F.bodyMed, fontSize: 11, color: C.onSurfaceVariant }}>
                {it.unit}
              </Text>
            )}
          </View>
          <Text
            style={{
              fontFamily: F.header,
              fontSize: 9.5,
              letterSpacing: 1.1,
              color: C.onSurfaceVariant,
              marginTop: 6,
              textTransform: 'uppercase',
            }}
            numberOfLines={1}
          >
            {it.label}
          </Text>
          {it.footer}
        </View>
      ))}
    </View>
  );
}

/**
 * Row — full-bleed list row. Separator is drawn on the row itself so that
 * lists need no wrapping container.
 */
function Row({
  children,
  C,
  isDark,
  onPress,
  first = false,
  indented = false,
  style,
}: {
  children: React.ReactNode;
  C: ThemeColors;
  isDark: boolean;
  onPress?: () => void;
  first?: boolean;
  indented?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const T = useMemo(() => makeTokens(C, isDark), [C, isDark]);
  const body = (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          paddingHorizontal: T.gutter,
          paddingVertical: 14,
        },
        style,
      ]}
    >
      {!first && (
        <View
          style={{
            position: 'absolute',
            left: indented ? T.indent : T.gutter,
            right: 0,
            top: 0,
            height: T.hairline,
            backgroundColor: T.hairSoft,
          }}
        />
      )}
      {children}
    </View>
  );

  if (!onPress) return body;
  return (
    <Pressable
      onPress={() => {
        haptic('light');
        onPress();
      }}
      android_ripple={{ color: T.wash }}
      style={({ pressed }) => (pressed ? { backgroundColor: T.wash } : undefined)}
    >
      {body}
    </Pressable>
  );
}

const s = StyleSheet.create({
  secLbl: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 11,
  },
});

/* ──────────────────────────────────────────────────────────────────────────
   TAB BAR
   Sliding underline, measured from real tab layout.
   (was WorkoutTabs.tsx)
   ────────────────────────────────────────────────────────────────────────── */
const TABS: ReadonlyArray<{ key: TabKey; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'builder', label: 'Builder' },
  { key: 'active', label: 'Active' },
  { key: 'history', label: 'History' },
] as const;

interface Metrics {
  x: number;
  w: number;
}

/**
 * Sliding-underline tab bar.
 *
 * Replaces the pill-in-a-bordered-track. The ink is positioned from measured
 * tab layout rather than an equal-width assumption, so labels of differing
 * length stay correctly underlined.
 */
function WorkoutTabs({
  active,
  onChange,
  C,
  isDark,
}: {
  active: TabKey;
  onChange: (t: TabKey) => void;
  C: ThemeColors;
  isDark: boolean;
}) {
  const T = useMemo(() => makeTokens(C, isDark), [C, isDark]);
  const metrics = useRef<Partial<Record<TabKey, Metrics>>>({});
  const [ready, setReady] = useState(false);

  const inkX = useSharedValue(0);
  const inkW = useSharedValue(0);

  const settle = useCallback(
    (key: TabKey, animate: boolean) => {
      const m = metrics.current[key];
      if (!m) return;
      const spring = { damping: 18, stiffness: 190 };
      if (animate) {
        inkX.value = withSpring(m.x, spring);
        inkW.value = withSpring(m.w, spring);
      } else {
        inkX.value = m.x;
        inkW.value = m.w;
      }
    },
    [inkX, inkW],
  );

  const onTabLayout = useCallback(
    (key: TabKey) => (e: LayoutChangeEvent) => {
      const { x, width } = e.nativeEvent.layout;
      metrics.current[key] = { x, w: width };
      if (key === active) {
        settle(key, ready);
        if (!ready) setReady(true);
      }
    },
    [active, ready, settle],
  );

  const inkStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: inkX.value }],
    width: inkW.value,
  }));

  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 22,
        marginHorizontal: T.gutter,
        marginTop: 16,
        borderBottomWidth: T.hairline,
        borderBottomColor: T.hairSoft,
      }}
    >
      {TABS.map((t) => {
        const on = t.key === active;
        return (
          <Pressable
            key={t.key}
            onLayout={onTabLayout(t.key)}
            onPress={() => {
              if (on) return;
              haptic('select');
              onChange(t.key);
              settle(t.key, true);
            }}
            hitSlop={8}
            style={{ paddingBottom: 11 }}
          >
            <Text
              style={{
                fontFamily: on ? F.header : F.bodyBold,
                fontSize: 14.5,
                letterSpacing: -0.2,
                color: on ? C.onSurface : C.onSurfaceVariant,
              }}
            >
              {t.label}
            </Text>
          </Pressable>
        );
      })}

      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            bottom: -T.hairline,
            left: 0,
            height: 2.5,
            borderRadius: 2,
            backgroundColor: C.primary,
          },
          inkStyle,
        ]}
      />
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   MUSCLE MAP
   Front/back anatomical SVG + activation legend.
   (was MuscleMap.tsx)
   ────────────────────────────────────────────────────────────────────────── */
type MapView = 'front' | 'back';

/**
 * Anatomical activation map.
 *
 * Unlike the original binary hit/miss wireframe, fill opacity is driven by the
 * activation value so relative emphasis is legible at a glance.
 */
function MuscleMap({
  activation,
  view,
  onChangeView,
  C,
  isDark,
}: {
  activation: MuscleActivation[];
  view: MapView;
  onChangeView: (v: MapView) => void;
  C: ThemeColors;
  isDark: boolean;
}) {
  const T = useMemo(() => makeTokens(C, isDark), [C, isDark]);

  const level = useMemo(() => {
    const m: Record<string, number> = {};
    activation.forEach((a) => {
      m[a.muscle] = a.value;
    });
    return m;
  }, [activation]);

  const graphicPrimary = isDark ? C.primary : '#e6b300';

  const paint = (muscle: string) => {
    const v = level[muscle] ?? 0;
    const hot = v > 0.4;
    return {
      fill: hot ? graphicPrimary : 'none',
      fillOpacity: hot ? 0.26 : 0,
      stroke: hot ? graphicPrimary : C.onSurfaceVariant,
      strokeWidth: hot ? 1.7 : 1,
      strokeOpacity: hot ? 1 : 0.55,
    };
  };

  const inert = {
    fill: 'none' as const,
    stroke: C.onSurfaceVariant,
    strokeWidth: 1,
    strokeOpacity: 0.5,
  };

  return (
    <View style={{ flexDirection: 'row', gap: 18, alignItems: 'center', paddingHorizontal: T.gutter }}>
      <View style={{ alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', gap: 16, marginBottom: 10 }}>
          {(['front', 'back'] as const).map((v) => {
            const on = v === view;
            return (
              <Pressable
                key={v}
                hitSlop={8}
                onPress={() => {
                  haptic('select');
                  onChangeView(v);
                }}
                style={{
                  paddingBottom: 5,
                  borderBottomWidth: 2,
                  borderBottomColor: on ? C.primary : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontFamily: F.header,
                    fontSize: 10.5,
                    letterSpacing: 1,
                    color: on ? C.onSurface : C.onSurfaceVariant,
                  }}
                >
                  {v.toUpperCase()}
                </Text>
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
        {activation.map((a) => (
          <View key={a.muscle}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 9 }}>
              <Text style={{ flex: 1, fontFamily: F.bodyBold, fontSize: 12.5, color: C.onSurface }}>
                {a.muscle}
              </Text>
              <Text style={{ fontFamily: F.num, fontSize: 11, color: C.onSurfaceVariant }}>
                {Math.round(a.value * 100)}%
              </Text>
            </View>
            <View
              style={{
                height: 3,
                borderRadius: 2,
                backgroundColor: T.track,
                overflow: 'hidden',
                marginTop: 5,
              }}
            >
              <View
                style={{
                  height: '100%',
                  width: `${a.value * 100}%`,
                  borderRadius: 2,
                  backgroundColor: graphicPrimary,
                }}
              />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   HOLD TO CONFIRM
   Press-and-hold gesture. Early release cannot fire onConfirm.
   (was HoldToConfirm.tsx)
   ────────────────────────────────────────────────────────────────────────── */
interface HoldToConfirmProps {
  label: string;
  holdingLabel?: string;
  iconName?: string;
  /** Milliseconds the user must hold. */
  duration?: number;
  onConfirm: () => void;
  onHoldChange?: (holding: boolean) => void;
  C: ThemeColors;
  isDark: boolean;
  disabled?: boolean;
}

/**
 * Press-and-hold confirmation.
 *
 * A destructive-ish action (ending a live session) must not be a single tap.
 * A white sweep fills the button over `duration`; releasing early cancels with
 * no state change. Only completion calls `onConfirm`.
 */
function HoldToConfirm({
  label,
  holdingLabel = 'Keep holding…',
  iconName = 'stop',
  duration = 1000,
  onConfirm,
  onHoldChange,
  C,
  isDark,
  disabled = false,
}: HoldToConfirmProps) {
  const progress = useSharedValue(0);
  const [holding, setHolding] = React.useState(false);

  const setHold = useCallback(
    (v: boolean) => {
      setHolding(v);
      onHoldChange?.(v);
    },
    [onHoldChange],
  );

  const fire = useCallback(() => {
    setHold(false);
    progress.value = 0;
    haptic('success');
    onConfirm();
  }, [onConfirm, progress, setHold]);

  const start = useCallback(() => {
    if (disabled) return;
    haptic('medium');
    setHold(true);
    progress.value = 0;
    progress.value = withTiming(
      1,
      { duration, easing: Easing.linear },
      (finished) => {
        if (finished) runOnJS(fire)();
      },
    );
  }, [disabled, duration, fire, progress, setHold]);

  const cancel = useCallback(() => {
    cancelAnimation(progress);
    if (progress.value > 0 && progress.value < 1) {
      progress.value = withTiming(0, { duration: 160 });
    } else {
      progress.value = 0;
    }
    setHold(false);
  }, [progress, setHold]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <Pressable
      disabled={disabled}
      onPressIn={start}
      onPressOut={cancel}
      style={{ flex: 1, borderRadius: 14, overflow: 'hidden' }}
    >
      <LinearGradient
        colors={[C.primary, C.primaryDim]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingVertical: 15,
          paddingHorizontal: 20,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: isDark ? 'rgba(255,255,255,0.42)' : 'rgba(255,255,255,0.6)' },
            fillStyle,
          ]}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name={iconName} size={17} color={C.onPrimary} />
          <Text style={{ fontFamily: F.header, fontSize: 14.5, color: C.onPrimary, letterSpacing: -0.1 }}>
            {holding ? holdingLabel : label}
          </Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   LIVE SESSION HOOK
   Timestamp-derived clock, rest countdown, set completion.
   (was useLiveSession.ts)
   ────────────────────────────────────────────────────────────────────────── */
interface Options {
  template: WorkoutExercise[];
  /** Auto-start a rest countdown when a set is completed. */
  autoRest?: boolean;
}

/**
 * Owns live-session state: elapsed clock, rest countdown, per-set completion.
 *
 * Timing is wall-clock based (start timestamp + delta) rather than an
 * incrementing counter, so backgrounding the app does not drift the elapsed
 * time — a plain `setInterval` counter loses seconds when JS is suspended.
 */
function useLiveSession({ template, autoRest = true }: Options) {
  const [exercises, setExercises] = useState<ActiveExercise[]>([]);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [restRemaining, setRestRemaining] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);

  /* Hydrate working copy from the template. */
  useEffect(() => {
    if (!template.length) return;
    setExercises((prev) => {
      if (prev.length) return prev;
      return template.map((ex) => ({
        ...ex,
        setsData: Array.from({ length: ex.sets }, () => ({
          weight: ex.weight,
          reps: ex.reps,
          completed: false,
        })),
      }));
    });
  }, [template]);

  const start = useCallback((at?: number) => {
    setStartedAt(at ?? Date.now());
  }, []);

  /* Elapsed clock — derived from timestamps. */
  useEffect(() => {
    if (startedAt === null || finished) return;
    const tick = () => setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    const sub = AppState.addEventListener('change', (s: AppStateStatus) => {
      if (s === 'active') tick();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [startedAt, finished]);

  /* Rest countdown. */
  useEffect(() => {
    if (restEndsAt === null) {
      setRestRemaining(null);
      return;
    }
    const tick = () => {
      const left = Math.ceil((restEndsAt - Date.now()) / 1000);
      if (left <= 0) {
        setRestEndsAt(null);
        setRestRemaining(null);
      } else {
        setRestRemaining(left);
      }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [restEndsAt]);

  const toggleSet = useCallback(
    (exIdx: number, setIdx: number) => {
      setExercises((prev) => {
        const next = prev.map((e, i) =>
          i !== exIdx
            ? e
            : {
                ...e,
                setsData: e.setsData.map((s, j) =>
                  j !== setIdx ? s : { ...s, completed: !s.completed },
                ),
              },
        );
        if (autoRest && next[exIdx]?.setsData[setIdx]?.completed) {
          setRestEndsAt(Date.now() + (next[exIdx].rest ?? 60) * 1000);
        }
        return next;
      });
    },
    [autoRest],
  );

  const addSet = useCallback((exIdx: number) => {
    setExercises((prev) =>
      prev.map((e, i) => {
        if (i !== exIdx) return e;
        const lastSet = e.setsData[e.setsData.length - 1];
        return {
          ...e,
          sets: e.sets + 1,
          setsData: [
            ...e.setsData,
            { weight: lastSet?.weight ?? e.weight, reps: lastSet?.reps ?? e.reps, completed: false },
          ],
        };
      }),
    );
  }, []);

  const extendRest = useCallback(() => {
    setRestEndsAt((prev) => (prev === null ? Date.now() + 15_000 : prev + 15_000));
  }, []);

  const skipRest = useCallback(() => setRestEndsAt(null), []);

  const finish = useCallback(() => {
    setFinished(true);
    setRestEndsAt(null);
  }, []);

  const reset = useCallback(() => {
    setExercises([]);
    setStartedAt(null);
    setElapsed(0);
    setRestEndsAt(null);
    setFinished(false);
  }, []);

  const stats = useMemo(() => {
    let done = 0;
    let total = 0;
    let volume = 0;
    exercises.forEach((e) =>
      e.setsData.forEach((s) => {
        total += 1;
        if (s.completed) {
          done += 1;
          volume += s.weight * s.reps;
        }
      }),
    );
    return {
      done,
      total,
      volume,
      minutes: Math.max(1, Math.round(elapsed / 60)),
      progress: total ? done / total : 0,
    };
  }, [exercises, elapsed]);

  return {
    exercises,
    setExercises,
    elapsed,
    restRemaining,
    finished,
    stats,
    start,
    toggleSet,
    addSet,
    extendRest,
    skipRest,
    finish,
    reset,
  };
}

/* ──────────────────────────────────────────────────────────────────────────
   TAB · OVERVIEW
   (was OverviewTab.tsx)
   ────────────────────────────────────────────────────────────────────────── */
/** Gradient headline word. Falls back to solid colour on web. */
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

interface OverviewTabProps {
  workout?: Workout | null;
  exercises: WorkoutExercise[];
  readiness: ReadinessMetric[];
  sessions?: HistorySession[];
  onStart: () => void;
  onCustomise: () => void;
  onHistory: () => void;
  C: ThemeColors;
  isDark: boolean;
}

function OverviewTab({
  workout,
  exercises,
  readiness,
  sessions = [],
  onStart,
  onCustomise,
  onHistory,
  C,
  isDark,
}: OverviewTabProps) {
  const T = useMemo(() => makeTokens(C, isDark), [C, isDark]);
  const A = useMemo(() => accents(isDark), [isDark]);
  const [aiOpen, setAiOpen] = useState(false);

  const totalSets = exercises.reduce((a, b) => a + b.sets, 0);
  // Calculate estimated calories from exercises (rough: ~8 kcal per set-pair)
  const estimatedKcal = Math.round(exercises.reduce((a, e) => a + e.sets * (e.weight > 0 ? 8 : 4), 0));
  const [firstWord, ...restWords] = (workout?.title ?? 'No Workout').split(' ');
  const rest = restWords.join(' ');

  const toneFor = (t: ReadinessMetric['tone']) =>
    t === 'green' ? A.green : t === 'cyan' ? A.cyan : C.primary;

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero ───────────────────────────────────────────── */}
      <Entrance index={0}>
        <View style={{ paddingHorizontal: T.gutter, paddingTop: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <Icon name="auto-awesome" size={13} color={C.primary} />
            <Text
              style={{
                fontFamily: F.header,
                fontSize: 10,
                letterSpacing: 1.6,
                color: C.primary,
              }}
            >
              TODAY'S OPTIMISED PLAN
            </Text>
          </View>

          <View style={{ marginTop: 14 }}>
            <Text
              style={{
                fontFamily: F.header,
                fontSize: 40,
                letterSpacing: -1.9,
                lineHeight: 40,
                color: C.onSurface,
              }}
            >
              {firstWord}
            </Text>
            {!!rest && (
              <GradientWord
                text={rest}
                C={C}
                style={{ fontFamily: F.header, fontSize: 40, letterSpacing: -1.9, lineHeight: 44 }}
              />
            )}
          </View>

          <Text
            style={{
              fontFamily: F.bodyMed,
              fontSize: 13.5,
              color: C.onSurfaceVariant,
              marginTop: 9,
              lineHeight: 20,
            }}
          >
            {(workout?.targetMuscles ?? exercises.map(e => e.muscle).filter(Boolean).join(' · ')) || 'Full Body'} {'  •  '}{exercises.length} exercises
          </Text>
        </View>
      </Entrance>

      <View style={{ marginTop: 20 }}>
        <StatColumns
          C={C}
          isDark={isDark}
          bordered
          items={[
            { value: String(workout?.duration ?? 45), unit: 'min', label: 'Duration' },
            { value: String(exercises.length), unit: `/ ${totalSets} sets`, label: 'Exercises' },
            { value: String(estimatedKcal), unit: 'kcal', label: 'Est. burn', tone: C.primary },
          ]}
        />
      </View>

      {/* ── Primary actions ────────────────────────────────── */}
      <View
        style={{
          flexDirection: 'row',
          gap: 10,
          alignItems: 'center',
          paddingHorizontal: T.gutter,
          paddingTop: 20,
        }}
      >
        <PressableScale onPress={onStart} style={{ flex: 1 }} hapticStyle="heavy">
          <LinearGradient
            colors={[C.primary, C.primaryDim]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              paddingVertical: 15,
              borderRadius: 14,
            }}
          >
            <Icon name="play-arrow" size={17} color={C.onPrimary} />
            <Text style={{ fontFamily: F.header, fontSize: 14.5, color: C.onPrimary }}>
              Start Session
            </Text>
          </LinearGradient>
        </PressableScale>

        <Pressable onPress={() => { haptic('light'); onCustomise(); }} style={{ paddingVertical: 15, paddingHorizontal: 6 }}>
          <Text style={{ fontFamily: F.header, fontSize: 14.5, color: C.onSurface }}>Customise</Text>
        </Pressable>
      </View>

      {/* ── Readiness ──────────────────────────────────────── */}
      <SectionLabel text="Readiness" C={C} />
      <StatColumns
        C={C}
        isDark={isDark}
        items={readiness.map((m) => ({
          value: m.value,
          unit: m.unit,
          label: m.label,
          tone: toneFor(m.tone),
          footer: (
            <View style={{ marginTop: 9, height: 22 }}>
              <SplineChart width={70} height={22} color={toneFor(m.tone)} data={m.trend} />
            </View>
          ),
        }))}
      />

      <View style={{ marginTop: 18 }}>
        <Rule C={C} isDark={isDark} />
      </View>

      {/* ── AI coach — gradient rail, no surface ───────────── */}
      <Entrance index={1}>
        <View style={{ paddingHorizontal: T.gutter, paddingVertical: 16 }}>
          <LinearGradient
            colors={[C.primary, 'transparent']}
            style={{ position: 'absolute', left: 0, top: 16, bottom: 18, width: 2.5 }}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Icon name="auto-awesome" size={16} color={C.primary} />
            <Text style={{ flex: 1, fontFamily: F.header, fontSize: 13, letterSpacing: 0.2, color: C.onSurface }}>
              AI COACH
            </Text>
            <Pressable
              hitSlop={10}
              onPress={() => { haptic('select'); setAiOpen((v) => !v); }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
            >
              <Text style={{ fontFamily: F.header, fontSize: 12.5, color: C.primary }}>
                {aiOpen ? 'Less' : 'Details'}
              </Text>
              <Icon
                name={aiOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                size={15}
                color={C.primary}
              />
            </Pressable>
          </View>

          <Text style={{ fontFamily: F.bodyMed, fontSize: 14, lineHeight: 22.6, color: C.onSurface }}>
            {workout?.aiExplanation ?? (
              `${exercises.length} exercises · ${totalSets} total sets in this session. Ready to train at ${readiness?.[0]?.value ?? 'optimal'}% readiness.`
            )}
          </Text>

          {/* Dynamic confidence bar from readiness data */}
          {(() => {
            const readyVal = readiness?.[0]?.value ? parseFloat(readiness[0].value) / 100 : 0.85;
            const readyPct = Math.round(Math.min(Math.max(readyVal, 0), 1) * 100);
            return (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 14 }}>
            <View style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: T.track, overflow: 'hidden' }}>
              <LinearGradient
                colors={[C.primary, A.cyan]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ height: '100%', width: `${readyPct}%`, borderRadius: 2 }}
              />
            </View>
            <Text style={{ fontFamily: F.header, fontSize: 9.5, letterSpacing: 0.9, color: C.onSurfaceVariant }}>
              {readyPct}% READY
            </Text>
            </View>
            );
          })()}

          {aiOpen && (
            <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(140)} style={{ marginTop: 16 }}>
              {[
                {
                  t: 'Exercises',
                  s: `${exercises.length} exercises planned. Total training volume: ${estimatedKcal} estimated kcal burn.`,
                },
                {
                  t: 'Recovery',
                  s: `Current readiness: ${readiness?.[0]?.value ?? 'Ready'}%. Sleep: ${readiness?.[1]?.value ?? '7h'}.`,
                },
                {
                  t: 'Plan',
                  s: `Duration: ${workout?.duration ?? 45} min. ${totalSets} sets across ${exercises.length} movements.`,
                },
              ].map((d, i) => (
                <View key={d.t} style={{ paddingVertical: 13 }}>
                  {i > 0 && (
                    <View
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: 0,
                        height: T.hairline,
                        backgroundColor: T.hairSoft,
                      }}
                    />
                  )}
                  <Text style={{ fontFamily: F.header, fontSize: 12, letterSpacing: 0.3, color: C.onSurface, marginBottom: 4 }}>
                    {d.t}
                  </Text>
                  <Text style={{ fontFamily: F.bodyMed, fontSize: 13, lineHeight: 20, color: C.onSurfaceVariant }}>
                    {d.s}
                  </Text>
                </View>
              ))}
            </Animated.View>
          )}
        </View>
      </Entrance>

      <Rule C={C} isDark={isDark} />

      {/* ── Exercise list ──────────────────────────────────── */}
      <SectionLabel text="Today's Exercises" C={C} action="Edit" onAction={onCustomise} />
      {exercises.map((e, i) => (
        <Row key={e.id} C={C} isDark={isDark} first={i === 0} indented onPress={() => undefined}>
          <Text style={{ width: 22, textAlign: 'center', fontFamily: F.num, fontSize: 13, color: C.onSurfaceVariant }}>
            {i + 1}
          </Text>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontFamily: F.header, fontSize: 15.5, letterSpacing: -0.25, color: C.onSurface }}>
              {e.name}
            </Text>
            <Text style={{ fontFamily: F.num, fontSize: 11.5, color: C.primary, marginTop: 4 }}>
              {e.sets}×{e.reps}
              <Text style={{ color: C.onSurfaceVariant }}> · </Text>
              {e.weight} kg
              <Text style={{ color: C.onSurfaceVariant }}> · </Text>
              rest {e.rest ?? 60}s
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontFamily: F.num, fontSize: 14, color: C.onSurfaceVariant }}>
              ~{Math.round(e.sets * (e.reps * (e.weight > 0 ? e.weight * 0.03 : 2)))}
            </Text>
            <Text style={{ fontFamily: F.header, fontSize: 9, letterSpacing: 0.8, color: C.onSurfaceVariant, marginTop: 2 }}>
              KCAL
            </Text>
          </View>
          <Icon name="chevron-right" size={17} color={C.onSurfaceVariant} />
        </Row>
      ))}

      {/* ── Plan ───────────────────────────────────────────── */}
      <SectionLabel text="Plan" C={C} />
      <Row C={C} isDark={isDark} first onPress={() => undefined}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.header, fontSize: 15.5, letterSpacing: -0.2, color: C.onSurface }}>
            Session
          </Text>
          <Text style={{ fontFamily: F.bodyMed, fontSize: 12.5, color: C.onSurfaceVariant, marginTop: 3 }}>
            {workout?.title ?? 'Workout'} · {totalSets} sets · {workout?.duration ?? '~45'} min
          </Text>
        </View>
        <Icon name="chevron-right" size={17} color={C.onSurfaceVariant} />
      </Row>
      <Row C={C} isDark={isDark} onPress={() => undefined}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.header, fontSize: 15.5, letterSpacing: -0.2, color: C.onSurface }}>
            Target muscles
          </Text>
          <Text style={{ fontFamily: F.bodyMed, fontSize: 12.5, color: C.onSurfaceVariant, marginTop: 3 }}>
            {exercises.map(e => e.muscle).filter(Boolean).join(' · ') || 'Full Body'} 
          </Text>
        </View>
        <Text style={{ fontFamily: F.header, fontSize: 9.5, letterSpacing: 0.8, color: C.primary }}>{exercises.length} EX</Text>
      </Row>
      <Row C={C} isDark={isDark} onPress={onHistory}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.header, fontSize: 15.5, letterSpacing: -0.2, color: C.onSurface }}>
            Last session overview
          </Text>
          <Text style={{ fontFamily: F.bodyMed, fontSize: 12.5, color: C.onSurfaceVariant, marginTop: 3 }}>
            {sessions?.[0]?.date ?? 'No past sessions'} · {sessions?.[0]?.duration ?? '~'} min · {sessions?.[0]?.volume ?? '0'} t volume
          </Text>
        </View>
        <Icon name="chevron-right" size={17} color={C.onSurfaceVariant} />
      </Row>

      <Pressable onPress={() => { haptic('light'); onHistory(); }} style={{ paddingVertical: 24 }}>
        <Text style={{ textAlign: 'center', fontFamily: F.header, fontSize: 13, color: C.primary }}>
          View all past sessions
        </Text>
      </Pressable>
    </ScrollView>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   TAB · BUILDER
   (was BuilderTab.tsx)
   ────────────────────────────────────────────────────────────────────────── */
type NumericField = 'sets' | 'reps' | 'weight' | 'rest';

const STEP: Record<NumericField, number> = { sets: 1, reps: 1, weight: 2.5, rest: 15 };
const MIN: Record<NumericField, number> = { sets: 1, reps: 1, weight: 0, rest: 0 };

const CONSTRAINTS = ['Home', '20 min', 'Injury friendly', 'Bands only', 'No overhead', 'Superset'];
const SUGGESTIONS = ['Make it 30 min', 'Shoulder-safe swap', 'Add finisher', 'More intensity'];

interface BuilderTabProps {
  exercises: WorkoutExercise[];
  activation: MuscleActivation[];
  onChange: (next: WorkoutExercise[]) => void;
  onSave: () => void;
  onDiscard: () => void;
  onGenerate: (prompt: string) => void;
  generating?: boolean;
  saving?: boolean;
  C: ThemeColors;
  isDark: boolean;
}

function BuilderTab({
  exercises,
  activation,
  onChange,
  onSave,
  onDiscard,
  onGenerate,
  generating = false,
  saving = false,
  C,
  isDark,
}: BuilderTabProps) {
  const T = useMemo(() => makeTokens(C, isDark), [C, isDark]);
  const [view, setView] = useState<MapView>('front');
  const [chips, setChips] = useState<string[]>(['Injury friendly']);
  const [open, setOpen] = useState<string | null>(exercises[0]?.id ?? null);
  const [prompt, setPrompt] = useState('');

  const bump = useCallback(
    (id: string, field: NumericField, dir: 1 | -1) => {
      haptic('light');
      onChange(
        exercises.map((e) =>
          e.id === id
            ? {
                ...e,
                [field]: Math.max(MIN[field], (e[field] ?? 0) + dir * STEP[field]),
              }
            : e,
        ),
      );
    },
    [exercises, onChange],
  );

  const remove = useCallback(
    (id: string) => {
      haptic('medium');
      onChange(exercises.filter((e) => e.id !== id));
    },
    [exercises, onChange],
  );

  const toggleChip = (c: string) => {
    haptic('select');
    setChips((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  const totalSets = exercises.reduce((a, b) => a + b.sets, 0);
  const tonnage = exercises.reduce((a, b) => a + b.sets * b.reps * b.weight, 0) / 1000;
  const minutes = Math.round(exercises.reduce((a, b) => a + b.sets * ((b.rest ?? 60) + 35), 0) / 60);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 160 }} showsVerticalScrollIndicator={false}>
        <SectionLabel text="Muscle Activation" C={C} />
        <MuscleMap activation={activation} view={view} onChangeView={setView} C={C} isDark={isDark} />

        <SectionLabel text="Constraints" C={C} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 9, paddingHorizontal: T.gutter, paddingBottom: 4 }}
        >
          {CONSTRAINTS.map((c) => {
            const on = chips.includes(c);
            return (
              <Pressable
                key={c}
                onPress={() => toggleChip(c)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 15,
                  paddingVertical: 9,
                  borderRadius: 100,
                  borderWidth: T.hairline,
                  borderColor: on ? C.primary : T.hair,
                  backgroundColor: on ? T.wash : 'transparent',
                }}
              >
                {on && <Icon name="check" size={13} color={C.primary} />}
                <Text
                  style={{
                    fontFamily: F.bodyBold,
                    fontSize: 12.5,
                    color: on ? C.primary : C.onSurfaceVariant,
                  }}
                >
                  {c}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── AI composer — underline field, no box ────────── */}
        <SectionLabel text="Ask Coach" C={C} />
        <View style={{ paddingHorizontal: T.gutter }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 11,
              paddingVertical: 11,
              borderBottomWidth: T.hairline,
              borderBottomColor: T.hairGold,
            }}
          >
            <Icon name="auto-awesome" size={17} color={C.primary} />
            <TextInput
              value={prompt}
              onChangeText={setPrompt}
              placeholder="“swap bench for a dumbbell variant”"
              placeholderTextColor={C.onSurfaceVariant}
              returnKeyType="send"
              onSubmitEditing={() => {
                if (!prompt.trim()) return;
                onGenerate(prompt.trim());
                setPrompt('');
              }}
              style={{
                flex: 1,
                minWidth: 0,
                fontFamily: F.bodyMed,
                fontSize: 14,
                color: C.onSurface,
                paddingVertical: 0,
              }}
            />
            <PressableScale
              disabled={!prompt.trim() || generating}
              onPress={() => {
                if (!prompt.trim()) return;
                onGenerate(prompt.trim());
                setPrompt('');
              }}
              scaleTo={0.88}
            >
              <LinearGradient
                colors={[C.primary, C.primaryDim]}
                style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }}
              >
                <Icon name="send" size={14} color={C.onPrimary} />
              </LinearGradient>
            </PressableScale>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 18, marginTop: 13 }}>
            {SUGGESTIONS.map((sg) => (
              <Pressable key={sg} onPress={() => { haptic('select'); onGenerate(sg); }}>
                <Text style={{ fontFamily: F.bodyBold, fontSize: 12, color: C.primary, opacity: 0.85 }}>
                  {sg}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* ── Exercises ────────────────────────────────────── */}
        <SectionLabel text={`Exercises · ${exercises.length}`} C={C} action="Add" onAction={() => undefined} />

        {exercises.map((e, i) => {
          const expanded = open === e.id;
          return (
            <Animated.View key={e.id} layout={Layout.springify().damping(18)}>
              <View style={{ paddingHorizontal: T.gutter, paddingVertical: 14 }}>
                {i > 0 && (
                  <View
                    style={{
                      position: 'absolute',
                      left: T.gutter,
                      right: 0,
                      top: 0,
                      height: T.hairline,
                      backgroundColor: T.hairSoft,
                    }}
                  />
                )}

                <Pressable
                  onPress={() => { haptic('select'); setOpen(expanded ? null : e.id); }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}
                >
                  <View style={{ width: 15, gap: 3.5, opacity: 0.32 }}>
                    {[0, 1, 2].map((k) => (
                      <View key={k} style={{ height: 1.8, borderRadius: 1, backgroundColor: C.onSurface }} />
                    ))}
                  </View>

                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontFamily: F.header, fontSize: 15.5, letterSpacing: -0.25, color: C.onSurface }}>
                      {e.name}
                    </Text>
                    <Text style={{ fontFamily: F.num, fontSize: 11.5, color: C.primary, marginTop: 4 }}>
                      <Text style={{ color: C.onSurfaceVariant }}>{e.muscle ?? 'Full Body'}</Text>
                      {' · '}{e.sets}×{e.reps}{' · '}{e.weight} kg
                    </Text>
                  </View>

                  <Icon
                    name={expanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                    size={17}
                    color={C.onSurfaceVariant}
                  />
                </Pressable>

                {expanded && (
                  <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)}>
                    {/* 2×2 stepper grid — hairline dividers, no boxes */}
                    <View
                      style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        marginTop: 15,
                        borderTopWidth: T.hairline,
                        borderBottomWidth: T.hairline,
                        borderColor: T.hairSoft,
                      }}
                    >
                      {(
                        [
                          ['SETS', 'sets', ''],
                          ['REPS', 'reps', ''],
                          ['WEIGHT', 'weight', 'kg'],
                          ['REST', 'rest', 's'],
                        ] as Array<[string, NumericField, string]>
                      ).map(([label, field, unit], idx) => (
                        <View key={field} style={{ width: '50%', paddingVertical: 12, alignItems: 'center' }}>
                          {idx % 2 === 1 && (
                            <View
                              style={{
                                position: 'absolute',
                                left: 0,
                                top: 12,
                                bottom: 12,
                                width: T.hairline,
                                backgroundColor: T.hairSoft,
                              }}
                            />
                          )}
                          {idx >= 2 && (
                            <View
                              style={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                top: 0,
                                height: T.hairline,
                                backgroundColor: T.hairSoft,
                              }}
                            />
                          )}
                          <Text
                            style={{
                              fontFamily: F.header,
                              fontSize: 9,
                              letterSpacing: 1,
                              color: C.onSurfaceVariant,
                              marginBottom: 7,
                            }}
                          >
                            {label}
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
                            <Stepper sign="−" onPress={() => bump(e.id, field, -1)} C={C} T={T} />
                            <Text
                              style={{
                                fontFamily: F.num,
                                fontSize: 16,
                                letterSpacing: -0.5,
                                color: C.onSurface,
                                minWidth: 54,
                                textAlign: 'center',
                              }}
                            >
                              {e[field] ?? 0}
                              {!!unit && (
                                <Text style={{ fontFamily: F.bodyBold, fontSize: 9, color: C.onSurfaceVariant }}>
                                  {' '}{unit}
                                </Text>
                              )}
                            </Text>
                            <Stepper sign="+" onPress={() => bump(e.id, field, 1)} C={C} T={T} />
                          </View>
                        </View>
                      ))}
                    </View>

                    <View style={{ flexDirection: 'row', gap: 24, marginTop: 14 }}>
                      <MiniAction icon="swap-horiz" label="Swap" C={C} onPress={() => undefined} />
                      <MiniAction icon="play-arrow" label="Form video" C={C} onPress={() => undefined} />
                      <MiniAction icon="delete" label="Remove" C={C} tone={C.error} onPress={() => remove(e.id)} />
                    </View>
                  </Animated.View>
                )}
              </View>
            </Animated.View>
          );
        })}

        <SectionLabel text="Session Estimate" C={C} />
        <StatColumns
          C={C}
          isDark={isDark}
          bordered
          items={[
            { value: String(totalSets), label: 'Total sets' },
            { value: tonnage.toFixed(1), unit: 't', label: 'Volume' },
            { value: String(minutes), unit: 'min', label: 'Duration', tone: C.primary },
          ]}
        />
        {/* ── Dock ───────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: T.gutter, paddingTop: 30, paddingBottom: Platform.OS === 'ios' ? 120 : 100 }}>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Pressable onPress={() => { haptic('light'); onDiscard(); }} style={{ paddingVertical: 12, paddingHorizontal: 12 }}>
              <Text style={{ fontFamily: F.header, fontSize: 14.5, color: C.onSurfaceVariant }}>Discard</Text>
            </Pressable>
            <PressableScale onPress={onSave} style={{ flex: 1 }} disabled={saving} hapticStyle="medium">
              <LinearGradient
                colors={[C.primary, C.primaryDim]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  paddingVertical: 12,
                  borderRadius: 14,
                  opacity: saving ? 0.7 : 1,
                }}
              >
                <Icon name="check" size={17} color={C.onPrimary} />
                <Text style={{ fontFamily: F.header, fontSize: 14.5, color: C.onPrimary }}>
                  {saving ? 'Saving…' : 'Save & Lock Workout'}
                </Text>
              </LinearGradient>
            </PressableScale>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Stepper({
  sign,
  onPress,
  C,
  T,
}: {
  sign: string;
  onPress: () => void;
  C: ThemeColors;
  T: ReturnType<typeof makeTokens>;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      style={({ pressed }) => ({
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: T.hairline,
        borderColor: pressed ? C.primary : T.hair,
        backgroundColor: pressed ? C.primary : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      })}
    >
      {({ pressed }) => (
        <Text
          style={{
            fontFamily: F.bodyBold,
            fontSize: 14,
            lineHeight: 17,
            color: pressed ? C.onPrimary : C.onSurfaceVariant,
          }}
        >
          {sign}
        </Text>
      )}
    </Pressable>
  );
}

function MiniAction({
  icon,
  label,
  C,
  onPress,
  tone,
}: {
  icon: string;
  label: string;
  C: ThemeColors;
  onPress: () => void;
  tone?: string;
}) {
  const color = tone ?? C.onSurfaceVariant;
  return (
    <Pressable
      onPress={() => { haptic('light'); onPress(); }}
      hitSlop={8}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
    >
      <Icon name={icon} size={14} color={color} />
      <Text style={{ fontFamily: F.header, fontSize: 12.5, color }}>{label}</Text>
    </Pressable>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   TAB · ACTIVE
   (was ActiveTab.tsx)
   ────────────────────────────────────────────────────────────────────────── */
const fmt = (s: number) =>
  `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

interface ActiveTabProps {
  exercises: ActiveExercise[];
  elapsed: number;
  restRemaining: number | null;
  finished: boolean;
  savedSummary?: string;
  sessionTitle?: string;
  onToggleSet: (exIdx: number, setIdx: number) => void;
  onAddSet: (exIdx: number) => void;
  onExtendRest: () => void;
  onSkipRest: () => void;
  onFinish: () => void;
  onViewHistory: () => void;
  C: ThemeColors;
  isDark: boolean;
}

function ActiveTab({
  exercises,
  elapsed,
  restRemaining,
  finished,
  savedSummary,
  sessionTitle = 'Workout',
  onToggleSet,
  onAddSet,
  onExtendRest,
  onSkipRest,
  onFinish,
  onViewHistory,
  C,
  isDark,
}: ActiveTabProps) {
  const T = useMemo(() => makeTokens(C, isDark), [C, isDark]);
  const A = useMemo(() => accents(isDark), [isDark]);

  const { done, total } = useMemo(() => {
    let d = 0;
    let t = 0;
    exercises.forEach((e) => {
      e.setsData.forEach((s) => {
        t += 1;
        if (s.completed) d += 1;
      });
    });
    return { done: d, total: t };
  }, [exercises]);

  const progress = total > 0 ? done / total : 0;
  const currentIdx = exercises.findIndex((e) => e.setsData.some((s) => !s.completed));

  /* Live dot pulse */
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (finished) {
      pulse.value = 1;
      return;
    }
    pulse.value = withRepeat(
      withSequence(withTiming(0.35, { duration: 700 }), withTiming(1, { duration: 700 })),
      -1,
      false,
    );
  }, [finished, pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 170 }} showsVerticalScrollIndicator={false}>
        {/* ── Live strip ─────────────────────────────────── */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
            paddingHorizontal: T.gutter,
            paddingVertical: 16,
            borderBottomWidth: T.hairline,
            borderBottomColor: T.hair,
          }}
        >
          <View style={{ width: 54, height: 54, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityRings
              size={54}
              rings={[{ progress, color: C.primary, radius: 24, strokeWidth: 4 }]}
            />
            <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: F.num, fontSize: 12, color: C.onSurface }}>
                {Math.round(progress * 100)}%
              </Text>
            </View>
          </View>

          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Animated.View
                style={[
                  { width: 6, height: 6, borderRadius: 3, backgroundColor: finished ? A.green : A.red },
                  pulseStyle,
                ]}
              />
              <Text style={{ fontFamily: F.header, fontSize: 9.5, letterSpacing: 1.4, color: C.primary }}>
                {finished ? 'SESSION COMPLETE' : 'LIVE SESSION'}
              </Text>
            </View>
            <Text style={{ fontFamily: F.header, fontSize: 17, letterSpacing: -0.4, color: C.onSurface, marginTop: 5 }}>
              {sessionTitle}
            </Text>
            <Text style={{ fontFamily: F.bodyMed, fontSize: 12, color: C.onSurfaceVariant, marginTop: 3 }}>
              {done} of {total} sets · {exercises.reduce((a, e) => a + e.setsData.filter(s => s.completed).reduce((b, s) => b + (s.weight * s.reps), 0), 0).toFixed(1)} kg moved
            </Text>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontFamily: F.num, fontSize: 23, letterSpacing: -1.1, color: C.onSurface }}>
              {fmt(elapsed)}
            </Text>
            <Text style={{ fontFamily: F.header, fontSize: 9, letterSpacing: 1, color: C.onSurfaceVariant }}>
              ELAPSED
            </Text>
          </View>
        </View>

        {/* ── Rest timer ─────────────────────────────────── */}
        {restRemaining !== null && !finished && (
          <Animated.View entering={FadeIn.duration(200)}>
            <LinearGradient
              colors={[
                isDark ? 'rgba(125,211,252,0.12)' : 'rgba(14,116,144,0.10)',
                'transparent',
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                paddingHorizontal: T.gutter,
                paddingVertical: 13,
                borderBottomWidth: T.hairline,
                borderBottomColor: T.hairSoft,
              }}
            >
              <ActivityRings
                size={34}
                rings={[{ progress: Math.min(restRemaining / 90, 1), color: A.cyan, radius: 15, strokeWidth: 3 }]}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.header, fontSize: 9.5, letterSpacing: 1.3, color: A.cyan }}>
                  REST · NEXT SET
                </Text>
                <Text style={{ fontFamily: F.num, fontSize: 21, letterSpacing: -0.9, color: C.onSurface, marginTop: 3 }}>
                  {fmt(restRemaining)}
                </Text>
              </View>
              <Pressable onPress={() => { haptic('light'); onExtendRest(); }} hitSlop={8} style={{ padding: 8 }}>
                <Text style={{ fontFamily: F.header, fontSize: 12, color: A.cyan }}>+15s</Text>
              </Pressable>
              <Pressable onPress={() => { haptic('light'); onSkipRest(); }} hitSlop={8} style={{ padding: 8 }}>
                <Text style={{ fontFamily: F.header, fontSize: 12, color: A.cyan }}>Skip</Text>
              </Pressable>
            </LinearGradient>
          </Animated.View>
        )}

        {/* ── Exercises ──────────────────────────────────── */}
        {exercises.map((e, i) => {
          const allDone = e.setsData.every((s) => s.completed);
          const isNow = i === currentIdx;
          const label = allDone ? 'DONE' : isNow ? 'NOW' : 'UP NEXT';
          const labelColor = allDone ? A.green : isNow ? C.primary : C.onSurfaceVariant;

          const Header = (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                paddingHorizontal: T.gutter,
                paddingTop: 16,
                paddingBottom: 13,
              }}
            >
              <View style={{ width: 22, alignItems: 'center' }}>
                {allDone ? (
                  <Icon name="check" size={15} color={A.green} />
                ) : (
                  <Text style={{ fontFamily: F.num, fontSize: 13, color: C.onSurfaceVariant }}>{i + 1}</Text>
                )}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontFamily: F.header, fontSize: 16, letterSpacing: -0.3, color: C.onSurface }}>
                  {e.name}
                </Text>
                <Text style={{ fontFamily: F.bodyMed, fontSize: 11.5, color: C.onSurfaceVariant, marginTop: 3 }}>
                  {e.muscle ?? 'Full Body'} · rest {e.rest ?? 60}s{e.prev ? ` · prev ${e.prev}` : ''}
                </Text>
              </View>
              <Text style={{ fontFamily: F.header, fontSize: 9.5, letterSpacing: 1, color: labelColor }}>
                {label}
              </Text>
            </View>
          );

          return (
            <View key={e.id}>
              {isNow && !finished ? (
                <LinearGradient
                  colors={[T.wash, 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  locations={[0, 0.8]}
                >
                  {Header}
                </LinearGradient>
              ) : (
                Header
              )}

              {/* table head */}
              <View style={{ flexDirection: 'row', paddingHorizontal: T.gutter, paddingBottom: 8 }}>
                <Text style={{ width: 30, fontFamily: F.header, fontSize: 9, letterSpacing: 1.2, color: C.onSurfaceVariant }}>
                  SET
                </Text>
                <Text style={{ flex: 1, textAlign: 'center', fontFamily: F.header, fontSize: 9, letterSpacing: 1.2, color: C.onSurfaceVariant }}>
                  WEIGHT
                </Text>
                <Text style={{ flex: 1, textAlign: 'center', fontFamily: F.header, fontSize: 9, letterSpacing: 1.2, color: C.onSurfaceVariant }}>
                  REPS
                </Text>
                <View style={{ width: 34 }} />
              </View>

              {e.setsData.map((sd, sIdx) => (
                <SetRow
                  key={sIdx}
                  index={sIdx}
                  data={sd}
                  prev={e.prev}
                  onToggle={() => onToggleSet(i, sIdx)}
                  C={C}
                  isDark={isDark}
                  disabled={finished}
                />
              ))}

              {!finished && (
                <Pressable
                  onPress={() => { haptic('light'); onAddSet(i); }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 7,
                    paddingHorizontal: T.gutter,
                    paddingVertical: 12,
                  }}
                >
                  <View
                    style={{
                      position: 'absolute',
                      left: T.gutter,
                      right: 0,
                      top: 0,
                      height: T.hairline,
                      backgroundColor: T.hairSoft,
                    }}
                  />
                  <Icon name="add" size={13} color={C.primary} />
                  <Text style={{ fontFamily: F.header, fontSize: 12.5, color: C.primary }}>Add set</Text>
                </Pressable>
              )}
            </View>
          );
        })}
        {/* ── Dock ───────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: T.gutter, paddingTop: finished ? 30 : 30, paddingBottom: Platform.OS === 'ios' ? 120 : 100 }}>
          {finished ? (
            <Animated.View entering={FadeIn.duration(240)}>
              <LinearGradient
                colors={[
                  isDark ? 'rgba(163,230,53,0.15)' : 'rgba(94,139,0,0.14)',
                  'transparent',
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                locations={[0, 0.82]}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingHorizontal: T.gutter,
                  paddingVertical: 13,
                  marginHorizontal: -T.gutter,
                }}
              >
                <Icon name="check" size={16} color={A.green} />
                <Text style={{ fontFamily: F.bodyBold, fontSize: 13, color: A.green }}>
                  {savedSummary ?? 'Session saved'}
                </Text>
              </LinearGradient>

              <PressableScale onPress={onViewHistory} style={{ marginTop: 10 }} hapticStyle="medium">
                <LinearGradient
                  colors={[C.primary, C.primaryDim]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    paddingVertical: 12,
                    borderRadius: 14,
                  }}
                >
                  <Icon name="calendar-today" size={17} color={C.onPrimary} />
                  <Text style={{ fontFamily: F.header, fontSize: 14.5, color: C.onPrimary }}>
                    View in History
                  </Text>
                </LinearGradient>
              </PressableScale>
            </Animated.View>
          ) : (
            <>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <Pressable style={{ padding: 12 }} hitSlop={6}>
                  <Icon name="timer" size={20} color={C.onSurface} />
                </Pressable>
                <HoldToConfirm
                  label="Finish Workout"
                  onConfirm={onFinish}
                  C={C}
                  isDark={isDark}
                />
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

/* ── Set row ────────────────────────────────────────────── */
const SetRow = React.memo(function SetRow({
  index,
  data,
  prev,
  onToggle,
  C,
  isDark,
  disabled,
}: {
  index: number;
  data: { weight: number; reps: number; completed: boolean };
  prev?: string;
  onToggle: () => void;
  C: ThemeColors;
  isDark: boolean;
  disabled?: boolean;
}) {
  const T = useMemo(() => makeTokens(C, isDark), [C, isDark]);
  const A = useMemo(() => accents(isDark), [isDark]);
  const on = data.completed;
  const [pw, pr] = (prev ?? '').split('×');

  const inner = (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: T.gutter, paddingVertical: 11 }}>
      <View
        style={{
          position: 'absolute',
          left: T.gutter,
          right: 0,
          top: 0,
          height: T.hairline,
          backgroundColor: T.hairSoft,
        }}
      />
      <Text style={{ width: 30, fontFamily: F.num, fontSize: 13, color: C.onSurfaceVariant }}>{index + 1}</Text>

      <View style={{ flex: 1, alignItems: 'center' }}>
        <Text style={{ fontFamily: F.num, fontSize: 16, letterSpacing: -0.4, color: on ? A.green : C.onSurface }}>
          {data.weight}
          <Text style={{ fontFamily: F.bodyBold, fontSize: 9.5, color: C.onSurfaceVariant }}> KG</Text>
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
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            borderWidth: on ? 0 : 1.5,
            borderColor: T.hair,
            backgroundColor: on ? A.green : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {on && <Icon name="check" size={14} color={isDark ? C.bg : '#FFFFFF'} />}
        </View>
      </View>
    </View>
  );

  if (disabled) return inner;

  return (
    <Pressable onPress={() => { haptic(on ? 'light' : 'success'); onToggle(); }}>
      {on ? (
        <LinearGradient
          colors={[isDark ? 'rgba(163,230,53,0.10)' : 'rgba(94,139,0,0.11)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          locations={[0, 0.8]}
        >
          {inner}
        </LinearGradient>
      ) : (
        inner
      )}
    </Pressable>
  );
});

/* ──────────────────────────────────────────────────────────────────────────
   TAB · HISTORY
   (was HistoryTab.tsx)
   ────────────────────────────────────────────────────────────────────────── */
const FILTERS: ReadonlyArray<{ key: HistoryFilterKey; label: string }> = [
  { key: 'all', label: 'All time' },
  { key: 'week', label: 'Past week' },
  { key: 'month', label: 'Past month' },
  { key: 'pr', label: 'PR sessions only' },
] as const;

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

/** Range predicate per filter key. */
export function filterSessions(
  sessions: HistorySession[],
  key: HistoryFilterKey,
): HistorySession[] {
  switch (key) {
    case 'pr':
      return sessions.filter((s) => s.pr);
    case 'week':
      return sessions.filter((s) => s.iso >= daysAgo(7));
    case 'month':
      return sessions.filter((s) => s.iso >= daysAgo(30));
    default:
      return sessions;
  }
}

/** Group sessions by "MONTH YYYY" preserving input order. */
function groupByMonth(sessions: HistorySession[]) {
  const out: Array<{ month: string; items: HistorySession[] }> = [];
  sessions.forEach((s) => {
    const d = new Date(s.iso);
    const month = `${d.toLocaleString('en-US', { month: 'long' }).toUpperCase()} ${d.getFullYear()}`;
    const last = out[out.length - 1];
    if (last && last.month === month) last.items.push(s);
    else out.push({ month, items: [s] });
  });
  return out;
}

interface HistoryTabProps {
  sessions: HistorySession[];
  loading?: boolean;
  weeklyLoad: Array<{ label: string; value: number }>;
  streak?: number;
  onStartWorkout: () => void;
  C: ThemeColors;
  isDark: boolean;
}

function HistoryTab({
  sessions,
  loading = false,
  weeklyLoad,
  streak = 0,
  onStartWorkout,
  C,
  isDark,
}: HistoryTabProps) {
  const T = useMemo(() => makeTokens(C, isDark), [C, isDark]);
  const A = useMemo(() => accents(isDark), [isDark]);

  const [filter, setFilter] = useState<HistoryFilterKey>('all');
  const [open, setOpen] = useState(false);

  const counts = useMemo(
    () =>
      FILTERS.reduce<Record<HistoryFilterKey, number>>(
        (acc, f) => {
          acc[f.key] = filterSessions(sessions, f.key).length;
          return acc;
        },
        { all: 0, week: 0, month: 0, pr: 0 },
      ),
    [sessions],
  );

  const filtered = useMemo(() => filterSessions(sessions, filter), [sessions, filter]);
  const groups = useMemo(() => groupByMonth(filtered), [filtered]);
  const active = FILTERS.find((f) => f.key === filter)!;

  /* Summary recomputes with the filter — not a static header. */
  const summary = useMemo(() => {
    const vol = filtered.reduce((a, s) => a + parseFloat(s.volume || '0'), 0);
    const mins = filtered.reduce((a, s) => a + s.duration, 0);
    return {
      count: filtered.length,
      volume: vol.toFixed(1),
      hours: (mins / 60).toFixed(1),
    };
  }, [filtered]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 }}>
        <ActivityIndicator color={C.primary} />
        <Text style={{ fontFamily: F.bodyMed, fontSize: 13, color: C.onSurfaceVariant, marginTop: 14 }}>
          Loading history…
        </Text>
      </View>
    );
  }

  const header = (
    <>
      <SectionLabel
        text={active.label}
        C={C}
        actionNode={
          <Pressable
            hitSlop={10}
            onPress={() => { haptic('select'); setOpen((v) => !v); }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}
          >
            <Icon name="filter" size={15} color={C.primary} />
            <Text style={{ fontFamily: F.header, fontSize: 13, color: C.primary }}>Filter</Text>
            <Icon
              name={open ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
              size={15}
              color={C.primary}
            />
          </Pressable>
        }
      />

      {open && (
        <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)}>
          {FILTERS.map((f, i) => {
            const on = f.key === filter;
            return (
              <Pressable
                key={f.key}
                onPress={() => {
                  haptic('select');
                  setFilter(f.key);
                  setOpen(false);
                }}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingHorizontal: T.gutter,
                  paddingVertical: 13,
                  backgroundColor: pressed ? T.wash : undefined,
                })}
              >
                {i > 0 && (
                  <View
                    style={{
                      position: 'absolute',
                      left: T.gutter,
                      right: 0,
                      top: 0,
                      height: T.hairline,
                      backgroundColor: T.hairSoft,
                    }}
                  />
                )}
                <View style={{ width: 17 }}>
                  {on && <Icon name="check" size={17} color={C.primary} />}
                </View>
                <Text
                  style={{
                    flex: 1,
                    fontFamily: F.bodyBold,
                    fontSize: 14.5,
                    color: on ? C.primary : C.onSurface,
                  }}
                >
                  {f.label}
                </Text>
                <Text style={{ fontFamily: F.num, fontSize: 11.5, color: C.onSurfaceVariant }}>
                  {counts[f.key]}
                </Text>
              </Pressable>
            );
          })}
          <Rule C={C} isDark={isDark} soft />
        </Animated.View>
      )}
    </>
  );

  /* ── Empty states — two distinct cases ─────────────── */
  if (!filtered.length) {
    const firstRun = sessions.length === 0;
    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {header}
        <View style={{ paddingHorizontal: 36, paddingTop: 66, paddingBottom: 40, alignItems: 'center' }}>
          <View style={{ opacity: 0.3, marginBottom: 20 }}>
            <Icon name="fitness-center" size={52} color={C.onSurfaceVariant} />
          </View>
          <Text
            style={{
              fontFamily: F.header,
              fontSize: 17.5,
              letterSpacing: -0.3,
              color: C.onSurface,
              marginBottom: 9,
              textAlign: 'center',
            }}
          >
            {firstRun ? 'No sessions yet' : 'Nothing in this range'}
          </Text>
          <Text
            style={{
              fontFamily: F.bodyMed,
              fontSize: 13.5,
              lineHeight: 22,
              color: C.onSurfaceVariant,
              textAlign: 'center',
              maxWidth: 252,
            }}
          >
            {firstRun
              ? 'Finish a workout and it lands here — volume, PRs and every set you logged.'
              : `No ${active.label.toLowerCase()} sessions found. Try widening the range.`}
          </Text>

          <PressableScale
            onPress={firstRun ? onStartWorkout : () => setFilter('all')}
            style={{ marginTop: 24 }}
            hapticStyle="medium"
          >
            <LinearGradient
              colors={[C.primary, C.primaryDim]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingVertical: 14,
                paddingHorizontal: 26,
                borderRadius: 14,
              }}
            >
              <Icon name="play-arrow" size={16} color={C.onPrimary} />
              <Text style={{ fontFamily: F.header, fontSize: 14, color: C.onPrimary }}>
                {firstRun ? 'Start your first workout' : 'Show all time'}
              </Text>
            </LinearGradient>
          </PressableScale>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      {header}

      <StatColumns
        C={C}
        isDark={isDark}
        bordered
        items={[
          { value: String(summary.count), label: 'Sessions' },
          { value: summary.volume, unit: 't', label: 'Volume' },
          { value: summary.hours, unit: 'hrs', label: 'Time' },
          { value: String(streak), label: 'Streak', tone: C.primary },
        ]}
      />

      <SectionLabel text="Weekly Load" C={C} />
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          paddingHorizontal: T.gutter,
          paddingBottom: 12,
        }}
      >
        <Text style={{ fontFamily: F.num, fontSize: 19, letterSpacing: -0.7, color: C.onSurface }}>
          {sessions.length}
          <Text style={{ fontFamily: F.bodyMed, fontSize: 11, color: C.onSurfaceVariant }}> session{sessions.length !== 1 ? 's' : ''} logged</Text>
        </Text>
        <Text style={{ fontFamily: F.header, fontSize: 11.5, color: A.green }}>{summary.volume}t</Text>
      </View>
      <View style={{ paddingHorizontal: T.gutter }}>
        <BarChart height={70} color={C.primary} data={weeklyLoad} />
      </View>

      {/* ── Timeline ───────────────────────────────────── */}
      {groups.map((g) => (
        <View key={g.month}>
          <Text
            style={{
              fontFamily: F.header,
              fontSize: 10.5,
              letterSpacing: 1.5,
              color: C.onSurfaceVariant,
              paddingHorizontal: T.gutter,
              paddingTop: 24,
              paddingBottom: 10,
            }}
          >
            {g.month}
          </Text>

          {g.items.map((s, i) => (
            <Animated.View key={s.id} layout={Layout.springify().damping(18)}>
              <SessionEntry
                session={s}
                first={i === 0}
                last={i === g.items.length - 1}
                C={C}
                isDark={isDark}
              />
            </Animated.View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

function SessionEntry({
  session,
  first,
  last,
  C,
  isDark,
}: {
  session: HistorySession;
  first: boolean;
  last: boolean;
  C: ThemeColors;
  isDark: boolean;
}) {
  const T = useMemo(() => makeTokens(C, isDark), [C, isDark]);
  const A = useMemo(() => accents(isDark), [isDark]);

  return (
    <Pressable
      style={({ pressed }) => ({
        flexDirection: 'row',
        gap: 15,
        paddingHorizontal: T.gutter,
        paddingVertical: 16,
        backgroundColor: pressed ? T.wash : undefined,
      })}
    >
      {!first && (
        <View
          style={{
            position: 'absolute',
            left: T.gutter,
            right: 0,
            top: 0,
            height: T.hairline,
            backgroundColor: T.hairSoft,
          }}
        />
      )}

      {/* continuous rail */}
      <View
        style={{
          position: 'absolute',
          left: T.gutter + 5,
          top: first ? 22 : 0,
          bottom: last ? undefined : 0,
          height: last ? 22 : undefined,
          width: 1.5,
          backgroundColor: T.hair,
        }}
      />

      <View style={{ width: 11, paddingTop: 6 }}>
        <View
          style={{
            width: 9,
            height: 9,
            borderRadius: 5,
            backgroundColor: session.pr ? C.primary : A.green,
            borderWidth: 4,
            borderColor: C.bg,
          }}
        />
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
              <Text style={{ fontFamily: F.header, fontSize: 15.5, letterSpacing: -0.25, color: C.onSurface }}>
                {session.title}
              </Text>
              {session.pr && <PRBadge C={C} />}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <Icon name="calendar-today" size={11} color={C.onSurfaceVariant} />
              <Text style={{ fontFamily: F.bodyMed, fontSize: 11.5, color: C.onSurfaceVariant }}>
                {session.date}
              </Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontFamily: F.num, fontSize: 16, color: C.primary }}>{session.duration}</Text>
            <Text style={{ fontFamily: F.header, fontSize: 9, letterSpacing: 0.8, color: C.onSurfaceVariant, marginTop: 2 }}>
              MIN
            </Text>
          </View>
        </View>

        <View
          style={{
            flexDirection: 'row',
            marginTop: 13,
            marginBottom: 11,
            borderTopWidth: T.hairline,
            borderBottomWidth: T.hairline,
            borderColor: T.hairSoft,
          }}
        >
          {[
            { v: `${session.volume} t`, k: 'VOLUME' },
            { v: String(session.sets), k: 'SETS' },
            { v: String(session.calories), k: 'KCAL' },
          ].map((st, i) => (
            <View key={st.k} style={{ flex: 1, paddingVertical: 9, paddingLeft: i === 0 ? 0 : 12 }}>
              {i > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 10,
                    bottom: 10,
                    width: T.hairline,
                    backgroundColor: T.hairSoft,
                  }}
                />
              )}
              <Text style={{ fontFamily: F.num, fontSize: 13.5, letterSpacing: -0.4, color: C.onSurface }}>
                {st.v}
              </Text>
              <Text style={{ fontFamily: F.header, fontSize: 8.5, letterSpacing: 0.9, color: C.onSurfaceVariant, marginTop: 3 }}>
                {st.k}
              </Text>
            </View>
          ))}
        </View>

        {session.exercises.map((ex, i) => (
          <View
            key={`${ex.name}-${i}`}
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 }}>
              <Text style={{ fontFamily: F.num, fontSize: 11, color: C.onSurfaceVariant, marginRight: 8 }}>
                {ex.scheme}
              </Text>
              <Text style={{ fontFamily: F.bodyMed, fontSize: 12.5, color: C.onSurface }} numberOfLines={1}>
                {ex.name}
              </Text>
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
    <LinearGradient
      colors={[C.primary, C.primaryDim]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 }}
    >
      <Text style={{ fontFamily: F.header, fontSize: 8.5, letterSpacing: 0.8, color: C.onPrimary }}>PR</Text>
    </LinearGradient>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   SCREEN
   Default export. Header, tab routing, queries and mutations.
   (was WorkoutScreen.tsx)
   ────────────────────────────────────────────────────────────────────────── */



/** Derive activation weights from the current exercise list. */
function deriveActivation(exercises: WorkoutExercise[]): MuscleActivation[] {
  const totals = new Map<string, number>();
  let max = 0;
  exercises.forEach((e) => {
    const key = e.muscle ?? 'Full Body';
    const v = (totals.get(key) ?? 0) + e.sets * e.reps;
    totals.set(key, v);
    if (v > max) max = v;
  });
  return Array.from(totals.entries())
    .map(([muscle, v]) => ({ muscle, value: max ? v / max : 0 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
}

/**
 * Maps an API workout response to the frontend Workout type.
 * The API returns muscleGroup and restTime, but the frontend expects muscle and rest.
 */
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
    muscle: ex.muscleGroup || ex.muscle || undefined, // API returns muscleGroup
    sets: ex.sets,
    reps: ex.reps,
    weight: typeof ex.weight === 'string' ? parseFloat(ex.weight) || 0 : (ex.weight || 0), // API returns weight as string
    rest: ex.restTime || ex.rest || 60, // API returns restTime
    prev: ex.prev,
  };
}

/** Map an API session payload into the shape the timeline renders. */
function computePRsAndMapHistory(rawHistory: any[]): HistorySession[] {
  // Sort oldest to newest for calculating PRs
  const sortedRaw = [...rawHistory].sort((a, b) => new Date(a.endTime || 0).getTime() - new Date(b.endTime || 0).getTime());
  
  const bests: Record<string, number> = {};

  return sortedRaw.map((raw, idx) => {
    const end = raw?.endTime ? new Date(raw.endTime) : new Date();
    const exs = Array.isArray(raw?.exercises) ? raw.exercises : [];
    const volume = exs.reduce(
      (a: number, ex: any) =>
        a + (ex.sets ?? []).reduce((b: number, s: any) => b + (s.weight ?? 0) * (s.reps ?? 0), 0),
      0,
    );
    
    let sessionHasPR = false;
    const mappedExercises = exs.slice(0, 3).map((ex: any) => {
      const maxWeight = Math.max(0, ...(ex.sets ?? []).map((s: any) => s.weight ?? 0));
      let isPR = false;
      if (maxWeight > 0) {
        if (!bests[ex.name] || maxWeight > bests[ex.name]) {
          isPR = true;
          bests[ex.name] = maxWeight;
          sessionHasPR = true;
        }
      }
      return {
        name: ex.name,
        scheme: `${ex.sets?.length ?? 0}×${ex.sets?.[0]?.reps ?? 0}`,
        load: `${maxWeight} kg`,
        pr: isPR,
      };
    });

    return {
      id: raw?.id ?? `s-${idx}`,
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
  }).reverse(); // Return newest to oldest
}

export interface WorkoutScreenProps {
  onNavigateBack?: () => void;
  onNavigateToNotifications?: () => void;
  userId?: string;
}

export default function WorkoutScreen({
  onNavigateBack,
  onNavigateToNotifications,
  userId: propUserId,
}: WorkoutScreenProps) {
  const { user } = useAuth();
  const userId = propUserId || user?.id || '';
  const { C, isDark, bgColors } = useTheme();
  const T = useMemo(() => makeTokens(C, isDark), [C, isDark]);
  const qc = useQueryClient();

  const { data: vitals } = useQuery({ queryKey: ['vitals'], queryFn: fetchVitals, refetchInterval: 3000 });
  const { data: sleepData } = useQuery({ queryKey: ['sleep', userId], queryFn: () => fetchSleepData(userId) });
  const { data: recoveryScore } = useQuery({ queryKey: ['recoveryScore', userId], queryFn: () => fetchRecoveryScore(userId) });

  const readinessData: ReadinessMetric[] = useMemo(() => {
    if (!vitals) return [];
    
    // Process sleep trend from chartData
    const sleepTrend = sleepData?.chartData ? sleepData.chartData.map((d: any) => d.value) : [];
    const sleepStr = sleepData?.current || '0h';
    const sleepVal = sleepStr.replace('h', ':').replace('m', '').replace(' ', '');
    
    return [
      { key: 'recovery', label: 'Recovery', value: vitals.bodyBattery.toString(), unit: '%', tone: 'green', trend: [vitals.recoveryUpr, vitals.recoveryLwr, vitals.recoveryCor, vitals.recoveryCrd] },
      { key: 'sleep', label: 'Sleep', value: sleepVal, unit: 'hrs', tone: 'cyan', trend: sleepTrend.length > 0 ? sleepTrend : [0] },
      { key: 'readiness', label: 'Readiness', value: recoveryScore?.status || 'Unknown', tone: 'gold', trend: [] },
    ];
  }, [vitals, sleepData, recoveryScore]);

  const weeklyLoadData = useMemo(() => {
    if (!vitals) return [];
    const loads = [vitals.loadM, vitals.loadT, vitals.loadW, vitals.loadTh, vitals.loadF, vitals.loadSa, vitals.loadSu];
    const maxLoad = Math.max(...loads, 1); // Avoid division by zero
    return loads.map((load, i) => ({
      label: ['M', 'T', 'W', 'T', 'F', 'S', 'S'][i],
      value: load / maxLoad,
    }));
  }, [vitals]);

  const [tab, setTab] = useState<TabKey>('overview');
  const [draft, setDraft] = useState<WorkoutExercise[] | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  /* ── Queries ──────────────────────────────────────── */
  const { data: workout } = useQuery<Workout | null>({
    queryKey: ['currentWorkout', userId],
    queryFn: async () => mapApiWorkout(await fetchCurrentWorkout(userId)),
  });

  const { data: historyRaw, isLoading: historyLoading } = useQuery({
    queryKey: ['workoutHistory', userId],
    queryFn: async () => (await fetchWorkoutHistory(userId)) as any[],
  });

  const templateExercises = workout?.exercises ?? [];
  const builderExercises = draft ?? templateExercises;
  const activation = useMemo(() => deriveActivation(builderExercises), [builderExercises]);

  const sessions = useMemo<HistorySession[]>(
    () => (Array.isArray(historyRaw) ? computePRsAndMapHistory(historyRaw) : []),
    [historyRaw],
  );

  /* ── Live session ─────────────────────────────────── */
  const session = useLiveSession({ template: templateExercises });

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
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['workoutHistory'] });
      void qc.invalidateQueries({ queryKey: ['currentWorkout'] });
    },
  });

  const saveMutation = useMutation({
    mutationFn: (payload: any) => saveWorkout(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['currentWorkout'] });
      setDraft(null);
      haptic('success');
      setTab('overview');
    },
  });

  const generateMutation = useMutation({
    mutationFn: (prompt: string) => generateWorkout(prompt, workout?.id, user?.id),
    onSuccess: (data: any) => {
      if (data?.exercises?.length) {
        // Map API exercise format (muscleGroup) to frontend (muscle)
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

  /* Start the session the first time the Active tab opens. */
  useEffect(() => {
    if (tab !== 'active' || sessionId || startMutation.isPending || session.finished) return;
    startMutation.mutate({
      userId,
      workoutId: workout?.id,
      title: workout?.title ?? (templateExercises.length > 0 ? `${templateExercises.length} Exercise Workout` : 'Untitled Workout'),
      exercises: templateExercises,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const handleFinish = useCallback(() => {
    session.finish();
    const realSessionId = sessionId;
    const estimatedCalories = Math.round(session.stats.volume * 0.05 + session.stats.minutes * 5);
    completeMutation.mutate({
      sessionId: realSessionId,
      duration: session.stats.minutes,
      caloriesBurned: estimatedCalories,
      notes: `Completed ${session.stats.done} sets · ${(session.stats.volume / 1000).toFixed(1)}t volume`,
      completedSetIds: [],
    });
    if (!realSessionId) {
      console.warn('[Workout] No sessionId — session completed locally only.');
      void qc.invalidateQueries({ queryKey: ['workoutHistory'] });
    }
  }, [completeMutation, session, sessionId, qc]);

  const handleSaveBuilder = useCallback(() => {
    const estDuration = Math.round(builderExercises.reduce((a, e) => a + e.sets * ((e.rest ?? 60) + 40), 0) / 60);
    saveMutation.mutate({
      userId,
      title: workout?.title ?? (builderExercises.length > 0 ? `Custom ${builderExercises.length} Exercise Workout` : 'Custom Workout'),
      duration: workout?.duration ?? String(estDuration),
      parentVersionId: workout?.parentVersionId ?? workout?.id,
      exercises: builderExercises,
    });
  }, [builderExercises, saveMutation, userId, workout]);

  /* ── Collapsing header title ──────────────────────── */
  const scrollY = useSharedValue(0);
  const compactStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [10, 46], [0, 1], Extrapolation.CLAMP),
  }));

  const currentWorkoutTitle = workout?.title ?? 'No workout';
  const subtitle =
    tab === 'active'
      ? session.finished
        ? 'Session complete · saved'
        : 'Session running'
      : workout
        ? `${currentWorkoutTitle} · v${workout.versionNumber ?? 1}`
        : 'Loading workout…';

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <MeshGradientBackground bgColors={bgColors} isDark={isDark} />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* ── Large title ────────────────────────────────── */}
        <View style={{ paddingHorizontal: T.gutter, paddingTop: 8, paddingBottom: 2 }}>
          <Text style={{ fontFamily: F.header, fontSize: 34, letterSpacing: -1.2, color: C.onSurface }}>
            Workout Tracker
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 6 }}>
            <View
              style={{
                width: 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: isDark ? '#A3E635' : '#5E8B00',
              }}
            />
            <Text style={{ fontFamily: F.bodyBold, fontSize: 13, color: C.onSurfaceVariant }}>
              {subtitle}
            </Text>
          </View>
        </View>

        <WorkoutTabs active={tab} onChange={setTab} C={C} isDark={isDark} />

        <View style={{ flex: 1 }}>
          {tab === 'overview' && (
            <Animated.View style={{ flex: 1 }} entering={FadeIn.duration(180)}>
              <OverviewTab
                workout={workout}
                exercises={templateExercises}
                readiness={readinessData}
                sessions={sessions}
                onStart={() => setTab('active')}
                onCustomise={() => setTab('builder')}
                onHistory={() => setTab('history')}
                C={C}
                isDark={isDark}
              />
            </Animated.View>
          )}

          {tab === 'builder' && (
            <Animated.View style={{ flex: 1 }} entering={FadeIn.duration(180)}>
              <BuilderTab
                exercises={builderExercises}
                activation={activation}
                onChange={setDraft}
                onSave={handleSaveBuilder}
                onDiscard={() => { setDraft(null); setTab('overview'); }}
                onGenerate={(p) => generateMutation.mutate(p)}
                generating={generateMutation.isPending}
                saving={saveMutation.isPending}
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
                savedSummary={`Session saved · ${Math.floor(session.elapsed / 60)}:${(session.elapsed % 60)
                  .toString()
                  .padStart(2, '0')} · ${session.stats.done} sets logged`}
                sessionTitle={workout?.title ?? (templateExercises.length > 0 ? `${templateExercises.length} Exercise Workout` : 'Workout')}
                onToggleSet={session.toggleSet}
                onAddSet={session.addSet}
                onExtendRest={session.extendRest}
                onSkipRest={session.skipRest}
                onFinish={handleFinish}
                onViewHistory={() => setTab('history')}
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
                onStartWorkout={() => setTab('overview')}
                C={C}
                isDark={isDark}
              />
            </Animated.View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}
