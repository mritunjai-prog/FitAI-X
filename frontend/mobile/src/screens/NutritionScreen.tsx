/**
 * ════════════════════════════════════════════════════════════════════════════
 *  FitAI X — NUTRITION HUB
 *  Single-file screen. Today · Plan · Grocery · Insights.
 * ════════════════════════════════════════════════════════════════════════════
 *
 *  CONTENTS
 *  ----------------------------------------------------------------------
 *    TYPES ......................................... see `Types`
 *    DESIGN TOKENS ................................. see `makeTokens`
 *    PRIMITIVES .................................... see `Row` / `StatColumns`
 *    TAB BAR ....................................... see `NutritionTabs`
 *    TAB · TODAY ................................... see `TodayTab`
 *    TAB · PLAN .................................... see `PlanTab`
 *    TAB · GROCERY ................................. see `GroceryTab`
 *    TAB · INSIGHTS ................................ see `InsightsTab`
 *    SCREEN ........................................ see default export
 *
 *  DESIGN CONTRACT — "no cards"
 *  Nothing here renders `borderRadius + borderWidth + backgroundColor` as a
 *  CONTAINER. Hierarchy is carried by four mechanisms instead:
 *
 *    1. Two hairline weights — T.hair (section) vs T.hairSoft (row).
 *    2. Separator insets — 22px normally, 60px beside a leading time/index.
 *    3. Fading washes — LinearGradient to transparent at ~80%, so logged /
 *       active states read as emphasis with no visible edge.
 *    4. Type scale — 44 hero / 15.5 row / 12.5 meta / 9.5 overline.
 *
 *  Shapes survive ONLY on controls (buttons, chips, water glasses, checkboxes)
 *  because flattening those would destroy affordance.
 *
 *  CHARTS — this file does NOT hand-roll ring SVG. It calls the shared
 *  ActivityRings component so there is one implementation in the app.
 *
 *  ICONS — uses @expo/vector-icons MaterialIcons, matching Dashboard/Profile.
 *  All 23 glyph names used here were verified against the MaterialIcons
 *  glyphmap.
 * ════════════════════════════════════════════════════════════════════════════
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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
  Extrapolation,
  FadeIn,
  FadeInDown,
  FadeOut,
  Layout,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import MeshGradientBackground from '../components/MeshGradientBackground';
import ActivityRings from '../components/charts/ActivityRings';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { F, ThemeColors } from '../theme';
import { apiClient } from '../services/api/client';
import { fetchBudgetPlan, generateAiPlan, fetchMealPlan, regenerateMealPlan } from '../services/api/nutrition';

/* ──────────────────────────────────────────────────────────────────────────
   TYPES
   ────────────────────────────────────────────────────────────────────────── */

export type NutritionTabKey = 'today' | 'plan' | 'grocery' | 'insights';

export type MealState = 'done' | 'now' | 'pending';

export interface MealVersion {
  id: string;
  name: string;
  cals: number;
  cost?: number;
  isCurrent?: boolean;
  aiExplanation?: string;
}

export interface Meal {
  id: string;
  /** "7:30" */
  time: string;
  /** "AM" | "PM" */
  meridiem: string;
  /** Breakfast / Lunch / Snack … */
  type: string;
  name: string;
  cals: number;
  protein: number;
  carbs: number;
  fat: number;
  cost: number;
  state: MealState;
  versions?: MealVersion[];
}

export interface GroceryItem {
  name: string;
  quantity: string;
  cost: number;
  isChecked?: boolean;
  /** e.g. "in stock" — rendered instead of a price when cost is 0. */
  note?: string;
}

export interface GroceryCategory {
  category: string;
  items: GroceryItem[];
}

export interface DayPlan {
  label: string;
  dayOfMonth: number;
  cals: number;
  onTarget: boolean;
}

export interface MacroTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/* ──────────────────────────────────────────────────────────────────────────
   DESIGN TOKENS
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

/**
 * Macro + semantic accents.
 * Light mode uses genuinely darker values — inverting the dark palette fails
 * contrast on a light background.
 */
const makeAccents = (isDark: boolean) => ({
  protein: isDark ? '#4ADE80' : '#4E7C0A',
  carbs: isDark ? '#F5C400' : '#8A6400',
  fat: isDark ? '#7DD3FC' : '#0E7490',
  green: isDark ? '#A3E635' : '#5E8B00',
  red: isDark ? '#F87171' : '#C2413E',
});

/* ──────────────────────────────────────────────────────────────────────────
   HAPTICS
   ────────────────────────────────────────────────────────────────────────── */

type HapticStyle = 'light' | 'medium' | 'success' | 'select';

function haptic(style: HapticStyle = 'light'): void {
  if (Platform.OS === 'web') return;
  switch (style) {
    case 'success':
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      break;
    case 'select':
      void Haptics.selectionAsync();
      break;
    case 'medium':
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      break;
    default:
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

const money = (n: number) => `₹${n.toFixed(2)}`;

/* ──────────────────────────────────────────────────────────────────────────
   PRIMITIVES — flattened building blocks, none of these draw a card
   ────────────────────────────────────────────────────────────────────────── */

function PressableScale({
  children,
  onPress,
  style,
  disabled = false,
  hapticStyle = 'light',
  scaleTo = 0.96,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  hapticStyle?: HapticStyle;
  scaleTo?: number;
}) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable
      disabled={disabled}
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
      style={style}
    >
      <Animated.View style={anim}>{children}</Animated.View>
    </Pressable>
  );
}

/** Section label with optional trailing action node. */
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
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        paddingHorizontal: 22,
        paddingTop: 26,
        paddingBottom: 11,
      }}
    >
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

function Rule({
  isDark,
  soft = false,
  inset = 0,
}: {
  isDark: boolean;
  soft?: boolean;
  inset?: number;
}) {
  const T = makeTokens(isDark);
  return (
    <View
      style={{
        height: T.hairline,
        backgroundColor: soft ? T.hairSoft : T.hair,
        marginLeft: inset,
        marginHorizontal: inset ? undefined : T.gutter,
      }}
    />
  );
}

interface StatColumn {
  value: string;
  unit?: string;
  label: string;
  tone?: string;
}

/** Columns split by vertical hairlines — the flat replacement for stat tiles. */
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
  const T = makeTokens(isDark);
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
              numberOfLines={1}
              style={{
                fontFamily: F.num,
                fontSize: 20,
                letterSpacing: -0.7,
                color: it.tone ?? C.onSurface,
              }}
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
            numberOfLines={1}
            style={{
              fontFamily: F.header,
              fontSize: 9.5,
              letterSpacing: 1.1,
              color: C.onSurfaceVariant,
              marginTop: 6,
              textTransform: 'uppercase',
            }}
          >
            {it.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** Full-bleed list row. Separator is drawn on the row, so no container needed. */
function Row({
  children,
  isDark,
  onPress,
  first = false,
  indented = false,
  style,
}: {
  children: React.ReactNode;
  isDark: boolean;
  onPress?: () => void;
  first?: boolean;
  indented?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const T = makeTokens(isDark);
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

/** Progress track with an optional goal tick-mark. */
function Track({
  progress,
  color,
  isDark,
  goalAt,
  height = 4,
}: {
  progress: number;
  color: string;
  isDark: boolean;
  goalAt?: number;
  height?: number;
}) {
  const T = makeTokens(isDark);
  return (
    <View
      style={{
        height,
        borderRadius: height / 2,
        backgroundColor: T.track,
        overflow: 'visible',
      }}
    >
      <View
        style={{
          height,
          borderRadius: height / 2,
          backgroundColor: color,
          width: `${Math.min(Math.max(progress, 0), 1) * 100}%`,
        }}
      />
      {goalAt !== undefined && (
        <View
          style={{
            position: 'absolute',
            left: `${goalAt * 100}%`,
            top: -2,
            bottom: -2,
            width: 1.5,
            backgroundColor: T.hair,
          }}
        />
      )}
    </View>
  );
}

function Entrance({
  children,
  index = 0,
}: {
  children: React.ReactNode;
  index?: number;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 70).springify().damping(16).mass(0.85)}>
      {children}
    </Animated.View>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   TAB BAR — sliding underline, measured from real layout
   ────────────────────────────────────────────────────────────────────────── */

const TABS: ReadonlyArray<{ key: NutritionTabKey; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: 'plan', label: 'Plan' },
  { key: 'grocery', label: 'Grocery' },
  { key: 'insights', label: 'Insights' },
] as const;

function NutritionTabs({
  active,
  onChange,
  C,
  isDark,
}: {
  active: NutritionTabKey;
  onChange: (t: NutritionTabKey) => void;
  C: ThemeColors;
  isDark: boolean;
}) {
  const T = makeTokens(isDark);
  const metrics = React.useRef<Partial<Record<NutritionTabKey, { x: number; w: number }>>>({});
  const [ready, setReady] = useState(false);
  const inkX = useSharedValue(0);
  const inkW = useSharedValue(0);

  const settle = useCallback(
    (key: NutritionTabKey, animate: boolean) => {
      const m = metrics.current[key];
      if (!m) return;
      const spring = { damping: 18, stiffness: 190 };
      inkX.value = animate ? withSpring(m.x, spring) : m.x;
      inkW.value = animate ? withSpring(m.w, spring) : m.w;
    },
    [inkX, inkW],
  );

  const inkStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: inkX.value }],
    width: inkW.value,
  }));

  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 20,
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
            hitSlop={8}
            onLayout={(e) => {
              const { x, width } = e.nativeEvent.layout;
              metrics.current[t.key] = { x, w: width };
              if (t.key === active) {
                settle(t.key, ready);
                if (!ready) setReady(true);
              }
            }}
            onPress={() => {
              if (on) return;
              haptic('select');
              onChange(t.key);
              settle(t.key, true);
            }}
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
        style={[
          {
            position: 'absolute',
            bottom: -T.hairline,
            left: 0,
            height: 2.5,
            borderRadius: 2,
            backgroundColor: C.primary,
            pointerEvents: 'none' as any,
          },
          inkStyle,
        ]}
      />
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   AI COACH — gradient rail + type, no surface
   ────────────────────────────────────────────────────────────────────────── */

function AiCoach({
  headline,
  details,
  C,
  isDark,
}: {
  headline: React.ReactNode;
  details: Array<{ title: string; body: string }>;
  C: ThemeColors;
  isDark: boolean;
}) {
  const T = makeTokens(isDark);
  const [open, setOpen] = useState(false);
  return (
    <View style={{ paddingHorizontal: T.gutter, paddingVertical: 16 }}>
      <LinearGradient
        colors={[C.primary, 'transparent']}
        style={{ position: 'absolute', left: 0, top: 16, bottom: 18, width: 2.5 }}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Icon name="auto-awesome" size={16} color={C.primary} />
        <Text
          style={{
            flex: 1,
            fontFamily: F.header,
            fontSize: 13,
            letterSpacing: 0.2,
            color: C.onSurface,
          }}
        >
          AI COACH
        </Text>
        <Pressable
          hitSlop={10}
          onPress={() => {
            haptic('select');
            setOpen((v) => !v);
          }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
        >
          <Text style={{ fontFamily: F.header, fontSize: 12.5, color: C.primary }}>
            {open ? 'Less' : 'Details'}
          </Text>
          <Icon
            name={open ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
            size={15}
            color={C.primary}
          />
        </Pressable>
      </View>

      <Text style={{ fontFamily: F.bodyMed, fontSize: 14, lineHeight: 22.6, color: C.onSurface }}>
        {headline}
      </Text>

      {open && (
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(140)} style={{ marginTop: 16 }}>
          {details.map((d, i) => (
            <View key={d.title} style={{ paddingVertical: 13 }}>
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
              <Text
                style={{
                  fontFamily: F.header,
                  fontSize: 12,
                  letterSpacing: 0.3,
                  color: C.onSurface,
                  marginBottom: 4,
                }}
              >
                {d.title}
              </Text>
              <Text
                style={{
                  fontFamily: F.bodyMed,
                  fontSize: 13,
                  lineHeight: 20,
                  color: C.onSurfaceVariant,
                }}
              >
                {d.body}
              </Text>
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

interface TodayTabProps {
  meals: Meal[];
  targets: MacroTargets;
  loggedOverride: Record<string, boolean>;
  waterGlasses: number;
  waterGoalGlasses: number;
  onToggleMeal: (id: string) => void;
  onRegenerate: (id: string) => void;
  onSetWater: (glasses: number) => void;
  onGoPlan: () => void;
  onGoInsights: () => void;
  regenerating?: boolean;
  C: ThemeColors;
  isDark: boolean;
  /** AI Meal Plan data */
  mealPlan?: { today?: any[]; tomorrow?: any[]; targets?: any; dietType?: string; timeSlot?: string };
  mealPlanLoading?: boolean;
  onRegenToday?: () => void;
  onRegenTomorrow?: () => void;
  onRegenAll?: () => void;
  regenBusy?: boolean;
}

function TodayTab({
  meals,
  targets,
  loggedOverride,
  waterGlasses,
  waterGoalGlasses,
  onToggleMeal,
  onRegenerate,
  onSetWater,
  onGoPlan,
  onGoInsights,
  regenerating,
  C,
  isDark,
  mealPlan,
  mealPlanLoading,
  onRegenToday,
  onRegenTomorrow,
  onRegenAll,
  regenBusy,
}: TodayTabProps) {
  const T = makeTokens(isDark);
  const A = makeAccents(isDark);

  const isLogged = useCallback(
    (m: Meal) => loggedOverride[m.id] ?? m.state === 'done',
    [loggedOverride],
  );

  const totals = useMemo(() => {
    const logged = meals.filter(isLogged);
    return {
      cals: logged.reduce((a, m) => a + m.cals, 0),
      protein: logged.reduce((a, m) => a + m.protein, 0),
      carbs: logged.reduce((a, m) => a + m.carbs, 0),
      fat: logged.reduce((a, m) => a + m.fat, 0),
      cost: logged.reduce((a, m) => a + m.cost, 0),
    };
  }, [meals, isLogged]);

  const left = targets.calories - totals.cals;
  const pct = targets.calories ? totals.cals / targets.calories : 0;
  const proteinGap = Math.max(0, targets.protein - totals.protein);

  const MacroRow = ({
    name,
    current,
    goal,
    color,
    first,
  }: {
    name: string;
    current: number;
    goal: number;
    color: string;
    first?: boolean;
  }) => (
    <View style={{ paddingVertical: 13 }}>
      {!first && (
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
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 9, marginBottom: 9 }}>
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color }} />
        <Text style={{ flex: 1, fontFamily: F.bodyBold, fontSize: 13, color: C.onSurface }}>
          {name}
        </Text>
        <Text style={{ fontFamily: F.num, fontSize: 13.5, letterSpacing: -0.3, color }}>
          {current}
          <Text style={{ fontFamily: F.bodyMed, fontSize: 10.5, color: C.onSurfaceVariant }}>
            {' '}/ {goal} g
          </Text>
        </Text>
      </View>
      <Track progress={current / goal} color={color} isDark={isDark} goalAt={0.8} />
      <Text
        style={{ fontFamily: F.bodyBold, fontSize: 10.5, color: C.onSurfaceVariant, marginTop: 6 }}
      >
        {goal - current > 0 ? `${goal - current} g to go` : `${current - goal} g over`}
      </Text>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      {/* Hero */}
      <Entrance index={0}>
        <View style={{ paddingHorizontal: T.gutter, paddingTop: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <Icon name="auto-awesome" size={13} color={C.primary} />
            <Text
              style={{ fontFamily: F.header, fontSize: 10, letterSpacing: 1.6, color: C.primary }}
            >
              AI PLAN · HIGH PROTEIN
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 15 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                <Text
                  style={{
                    fontFamily: F.num,
                    fontSize: 44,
                    letterSpacing: -2.4,
                    lineHeight: 46,
                    color: C.onSurface,
                  }}
                >
                  {left.toLocaleString()}
                </Text>
                <Text
                  style={{ fontFamily: F.bodyBold, fontSize: 14, color: C.onSurfaceVariant }}
                >
                  kcal left
                </Text>
              </View>
              <Text
                style={{
                  fontFamily: F.bodyMed,
                  fontSize: 13,
                  color: C.onSurfaceVariant,
                  marginTop: 8,
                }}
              >
                <Text style={{ fontFamily: F.num, color: C.onSurface }}>
                  {totals.cals.toLocaleString()}
                </Text>{' '}
                eaten · {' '}
                <Text style={{ fontFamily: F.num, color: C.onSurface }}>
                  {targets.calories.toLocaleString()}
                </Text>{' '}
                target
              </Text>
            </View>

            <View style={{ width: 92, height: 92, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityRings
                size={92}
                rings={[{ progress: pct, color: C.primary, radius: 43, strokeWidth: 6 }]}
              />
              <View style={{ position: 'absolute', alignItems: 'center' }}>
                <Text style={{ fontFamily: F.num, fontSize: 17, letterSpacing: -0.6, color: C.onSurface }}>
                  {Math.round(pct * 100)}%
                </Text>
                <Text
                  style={{
                    fontFamily: F.header,
                    fontSize: 8,
                    letterSpacing: 0.9,
                    color: C.onSurfaceVariant,
                    marginTop: 1,
                  }}
                >
                  OF GOAL
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Entrance>

      {/* Actions */}
      <View
        style={{
          flexDirection: 'row',
          gap: 10,
          alignItems: 'center',
          paddingHorizontal: T.gutter,
          paddingTop: 18,
        }}
      >
        <PressableScale onPress={() => undefined} style={{ flex: 1 }} hapticStyle="medium">
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
            <Icon name="add" size={17} color={C.onPrimary} />
            <Text style={{ fontFamily: F.header, fontSize: 14.5, color: C.onPrimary }}>
              Log Food
            </Text>
          </LinearGradient>
        </PressableScale>
      </View>

      {/* Macros */}
      <SectionLabel text="Macros" C={C} />
      <View style={{ paddingHorizontal: T.gutter }}>
        <MacroRow first name="Protein" current={totals.protein} goal={targets.protein} color={A.protein} />
        <MacroRow name="Carbs" current={totals.carbs} goal={targets.carbs} color={A.carbs} />
        <MacroRow name="Fat" current={totals.fat} goal={targets.fat} color={A.fat} />
      </View>

      {/* Hydration — tappable glass segments */}
      <SectionLabel
        text="Hydration"
        C={C}
        actionNode={
          <Text style={{ fontFamily: F.header, fontSize: 13, color: C.primary }}>
            Goal {(waterGoalGlasses * 0.3).toFixed(1)} L
          </Text>
        }
      />
      <View style={{ paddingHorizontal: T.gutter }}>
        <View style={{ flexDirection: 'row', gap: 5 }}>
          {Array.from({ length: waterGoalGlasses }).map((_, i) => {
            const filled = i < waterGlasses;
            return (
              <Pressable
                key={i}
                onPress={() => {
                  haptic('light');
                  onSetWater(i + 1 === waterGlasses ? i : i + 1);
                }}
                style={{
                  flex: 1,
                  height: 34,
                  borderRadius: 5,
                  borderWidth: 1.5,
                  borderColor: filled ? A.fat : T.track,
                  overflow: 'hidden',
                  justifyContent: 'flex-end',
                }}
              >
                {filled && <View style={{ height: '78%', backgroundColor: A.fat, opacity: 0.55 }} />}
              </Pressable>
            );
          })}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 }}>
          <Text style={{ flex: 1, fontFamily: F.bodyMed, fontSize: 12, color: C.onSurfaceVariant }}>
            <Text style={{ fontFamily: F.num, color: C.onSurface }}>
              {(waterGlasses * 0.3).toFixed(1)} L
            </Text>{' '}
            of {(waterGoalGlasses * 0.3).toFixed(1)} L · {waterGlasses} glasses
          </Text>
          {[1, 2].map((n) => (
            <Pressable
              key={n}
              onPress={() => {
                haptic('light');
                onSetWater(Math.min(waterGoalGlasses, waterGlasses + n));
              }}
              style={{
                borderWidth: T.hairline,
                borderColor: T.hair,
                borderRadius: 100,
                paddingHorizontal: 13,
                paddingVertical: 8,
              }}
            >
              <Text style={{ fontFamily: F.header, fontSize: 12, color: A.fat }}>
                +{n * 250}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={{ marginTop: 20 }}>
        <Rule isDark={isDark} />
      </View>

      <AiCoach
        C={C}
        isDark={isDark}
        headline={
          <>
            You&apos;re{' '}
            <Text style={{ fontFamily: F.header, color: C.primary }}>{proteinGap} g protein</Text>{' '}
            short with {meals.filter((m) => !isLogged(m)).length} meals left. Log the remaining
            plan and you&apos;ll land on target.
          </>
        }
        details={[
          {
            title: 'Why this plan',
            body: 'Training day — carbs front-loaded around your session, protein spread across 5 feedings for even MPS.',
          },
          {
            title: 'Budget tracking',
            body: `${money(totals.cost)} spent today. Weekly pace ${money(totals.cost * 7)}.`,
          },
        ]}
      />
      <Rule isDark={isDark} />

      {/* Meal timeline — hidden when AI meal plan is active */}
      {!mealPlan && <><SectionLabel text="Today's Meals" C={C} action="Edit plan" onAction={onGoPlan} />
      <View style={{ position: 'relative' }}>
        {/* continuous rail behind the nodes */}
        <View
          style={{
            position: 'absolute',
            left: T.gutter + 44 + 14 + 5,
            top: 20,
            bottom: 34,
            width: 1.5,
            backgroundColor: T.hair,
            pointerEvents: 'none' as any,
          }}
        />
        {meals.map((m, i) => {
          const done = isLogged(m);
          const nodeColor = done ? A.green : m.state === 'now' ? C.primary : T.track;
          const rowInner = (
            <View style={{ flexDirection: 'row', gap: 14, paddingHorizontal: T.gutter, paddingVertical: 15 }}>
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
              <View style={{ width: 44 }}>
                <Text style={{ fontFamily: F.num, fontSize: 12.5, letterSpacing: -0.3, color: C.onSurface }}>
                  {m.time}
                </Text>
                <Text
                  style={{
                    fontFamily: F.header,
                    fontSize: 8.5,
                    letterSpacing: 0.7,
                    color: C.onSurfaceVariant,
                    marginTop: 2,
                  }}
                >
                  {m.meridiem}
                </Text>
              </View>

              <View style={{ width: 11, alignItems: 'center', paddingTop: 6 }}>
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: nodeColor,
                    boxShadow: '0 0 0 2px ' + C.bg,
                    borderWidth: 4,
                    borderColor: C.bg,
                  }}
                />
              </View>

              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={{
                        fontFamily: F.header,
                        fontSize: 9.5,
                        letterSpacing: 1.1,
                        color: C.onSurfaceVariant,
                        textTransform: 'uppercase',
                      }}
                    >
                      {m.type}
                      {m.state === 'now' && !done ? ' · NOW' : ''}
                    </Text>
                    <Text
                      style={{
                        fontFamily: F.header,
                        fontSize: 15.5,
                        letterSpacing: -0.25,
                        color: C.onSurface,
                        marginTop: 3,
                      }}
                    >
                      {m.name}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontFamily: F.num, fontSize: 15, letterSpacing: -0.4, color: C.onSurface }}>
                      {m.cals}
                    </Text>
                    <Text
                      style={{
                        fontFamily: F.header,
                        fontSize: 8.5,
                        letterSpacing: 0.8,
                        color: C.onSurfaceVariant,
                        marginTop: 1,
                      }}
                    >
                      KCAL
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 9 }}>
                  {[
                    [m.protein, 'p', A.protein],
                    [m.carbs, 'c', A.carbs],
                    [m.fat, 'f', A.fat],
                  ].map(([v, s, col]) => (
                    <View key={String(s)} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: col as string }} />
                      <Text style={{ fontFamily: F.num, fontSize: 11, color: C.onSurfaceVariant }}>
                        {v}
                        {s}
                      </Text>
                    </View>
                  ))}
                  <Text style={{ marginLeft: 'auto', fontFamily: F.num, fontSize: 11.5, color: A.green }}>
                    {money(m.cost)}
                  </Text>
                </View>

                {/* Visible actions — a hidden swipe is undiscoverable */}
                <View style={{ flexDirection: 'row', gap: 20, marginTop: 11 }}>
                  <Pressable
                    onPress={() => {
                      haptic(done ? 'light' : 'success');
                      onToggleMeal(m.id);
                    }}
                    hitSlop={6}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
                  >
                    <Icon
                      name={done ? 'history' : 'check'}
                      size={13}
                      color={done ? C.onSurfaceVariant : C.primary}
                    />
                    <Text
                      style={{
                        fontFamily: F.header,
                        fontSize: 11.5,
                        color: done ? C.onSurfaceVariant : C.primary,
                      }}
                    >
                      {done ? 'Undo' : 'Log it'}
                    </Text>
                  </Pressable>

                  <Pressable
                    disabled={regenerating}
                    onPress={() => {
                      haptic('medium');
                      onRegenerate(m.id);
                    }}
                    hitSlop={6}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
                  >
                    <Icon name="refresh" size={13} color={C.onSurfaceVariant} />
                    <Text style={{ fontFamily: F.header, fontSize: 11.5, color: C.onSurfaceVariant }}>
                      Regenerate
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      haptic('medium');
                      // Try to swap to next version if available
                      if (m.versions && m.versions.length > 1) {
                        const currentIdx = m.versions.findIndex((v: any) => v.isCurrent);
                        const nextIdx = (currentIdx + 1) % m.versions.length;
                        onRegenerate(m.id); // Regenerate as a form of swap
                      } else {
                        onRegenerate(m.id);
                      }
                    }}
                    hitSlop={6}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
                  >
                    <Icon name="swap-horiz" size={13} color={C.onSurfaceVariant} />
                    <Text style={{ fontFamily: F.header, fontSize: 11.5, color: C.onSurfaceVariant }}>
                      Swap
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          );

          return (
            <Animated.View key={m.id} layout={Layout.springify().damping(18)}>
              {done ? (
                <LinearGradient
                  colors={[isDark ? 'rgba(163,230,53,0.09)' : 'rgba(94,139,0,0.10)', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  locations={[0, 0.8]}
                >
                  {rowInner}
                </LinearGradient>
              ) : (
                rowInner
              )}
            </Animated.View>
          );
        })}
      </View></>}

      {/* ── AI MEAL PLAN ──────────────────────────────── */}
      {mealPlan && (
        <>
          <View style={{ marginTop: 16 }}>
            <Rule isDark={isDark} />
          </View>
          <SectionLabel
            text={`AI MEAL PLAN · ${(mealPlan.dietType || 'Personalized').toUpperCase()}`}
            C={C}
            actionNode={regenBusy ? (
              <ActivityIndicator size="small" color={C.primary} />
            ) : (
              <Pressable onPress={() => { haptic('medium'); onRegenAll?.(); }} hitSlop={8}>
                <Text style={{ fontFamily: F.header, fontSize: 12, color: C.primary }}>Refresh All</Text>
              </Pressable>
            )}
          />

          {mealPlanLoading ? (
            <View style={{ paddingHorizontal: T.gutter, gap: 12 }}>            {[0,1,2].map(i => (
                <View key={i} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: T.track }} />
                  <View style={{ flex: 1, gap: 6 }}>
                    <View style={{ width: '60%', height: 12, borderRadius: 4, backgroundColor: T.track }} />
                    <View style={{ width: '40%', height: 10, borderRadius: 4, backgroundColor: T.track }} />
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <>
              {/* Today's remaining meals - time filtered */}
              {mealPlan.today && mealPlan.today.length > 0 && (
                <>
                  <SectionLabel text="Today · Remaining" C={C}
                    actionNode={
                      <Pressable onPress={() => { haptic('medium'); onRegenToday?.(); }} hitSlop={8} style={{ opacity: regenBusy ? 0.5 : 1 }} disabled={regenBusy}>
                        <Text style={{ fontFamily: F.header, fontSize: 11, color: C.primary }}>Regenerate</Text>
                      </Pressable>
                    }
                  />
                  {mealPlan.today.map((m: any, i: number) => {
                    const timeLabel = (mealPlan.mealTimeSlots && mealPlan.mealTimeSlots[m.type]) || `${m.type}`;
                    return (
                    <View key={m.id || `t${i}`} style={{ paddingHorizontal: T.gutter, paddingVertical: 12 }}>
                      {i > 0 && <View style={{ position: 'absolute', left: T.gutter, right: 0, top: 0, height: T.hairline, backgroundColor: T.hairSoft }} />}
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: `${C.primary}20`, alignItems: 'center', justifyContent: 'center' }}>
                          <Icon name={m.type === 'Breakfast' ? 'free-breakfast' : m.type === 'Lunch' ? 'restaurant' : 'dinner-dining'} size={18} color={C.primary} />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontFamily: F.header, fontSize: 15, letterSpacing: -0.2, color: C.onSurface, flex: 1 }}>{m.name}</Text>
                            <Text style={{ fontFamily: F.num, fontSize: 14, color: C.onSurface }}>{m.cals || m.calories}<Text style={{ fontFamily: F.bodyMed, fontSize: 9, color: C.onSurfaceVariant }}> kcal</Text></Text>
                          </View>
                          <Text style={{ fontFamily: F.bodyMed, fontSize: 9, color: C.primary, marginTop: 2, letterSpacing: 0.5 }}>{timeLabel}</Text>
                          <View style={{ flexDirection: 'row', gap: 14, marginTop: 4 }}>
                            <Text style={{ fontFamily: F.num, fontSize: 11, color: A.protein }}>P {m.protein || 0}g</Text>
                            <Text style={{ fontFamily: F.num, fontSize: 11, color: A.carbs }}>C {m.carbs || 0}g</Text>
                            <Text style={{ fontFamily: F.num, fontSize: 11, color: A.fat }}>F {m.fat || m.fats || 0}g</Text>
                            <Text style={{ fontFamily: F.num, fontSize: 10, color: C.onSurfaceVariant }}>{m.prepTime || '15'}m</Text>
                          </View>
                          {m.ingredients && (
                            <Text numberOfLines={1} style={{ fontFamily: F.body, fontSize: 10, color: C.onSurfaceVariant, marginTop: 4 }}>
                              {(typeof m.ingredients === 'string' ? JSON.parse(m.ingredients) : m.ingredients).slice(0, 4).join(' · ')}
                            </Text>
                          )}
                          <View style={{ flexDirection: 'row', gap: 20, marginTop: 8 }}>
                            <Pressable onPress={() => { haptic(done ? 'light' : 'success'); onToggleMeal(m.id); }} hitSlop={6}
                              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Icon name={loggedOverride[m.id] ? 'check-circle' : 'check'} size={12} color={loggedOverride[m.id] ? C.success : C.primary} />
                              <Text style={{ fontFamily: F.header, fontSize: 10.5, color: loggedOverride[m.id] ? C.success : C.primary }}>{loggedOverride[m.id] ? 'Logged' : 'Log it'}</Text>
                            </Pressable>
                            <Pressable onPress={() => { haptic('medium'); onRegenerate(m.id); }} hitSlop={6}
                              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Icon name="refresh" size={12} color={C.primary} />
                              <Text style={{ fontFamily: F.header, fontSize: 10.5, color: C.primary }}>Regenerate</Text>
                            </Pressable>
                            <Pressable onPress={() => { haptic('medium'); onRegenerate(m.id); }} hitSlop={6}
                              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Icon name="swap-horiz" size={12} color={C.primary} />
                              <Text style={{ fontFamily: F.header, fontSize: 10.5, color: C.primary }}>Swap</Text>
                            </Pressable>
                          </View>
                        </View>
                      </View>
                    </View>
                  );})}
                </>
              )}

              {/* Tomorrow's meals */}
              {mealPlan.tomorrow && mealPlan.tomorrow.length > 0 && (
                <>
                  <View style={{ marginTop: 4 }}>
                    <Rule isDark={isDark} soft />
                  </View>
                  <SectionLabel text="Tomorrow" C={C}
                    actionNode={
                      <Pressable onPress={() => { haptic('medium'); onRegenTomorrow?.(); }} hitSlop={8} style={{ opacity: regenBusy ? 0.5 : 1 }} disabled={regenBusy}>
                        <Text style={{ fontFamily: F.header, fontSize: 11, color: C.primary }}>Regenerate</Text>
                      </Pressable>
                    }
                  />
                  {mealPlan.tomorrow.map((m: any, i: number) => {
                    const timeLabel = (mealPlan.mealTimeSlots && mealPlan.mealTimeSlots[m.type]) || `${m.type}`;
                    return (
                    <View key={m.id || `tm${i}`} style={{ paddingHorizontal: T.gutter, paddingVertical: 12 }}>
                      {i > 0 && <View style={{ position: 'absolute', left: T.gutter, right: 0, top: 0, height: T.hairline, backgroundColor: T.hairSoft }} />}
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: `${C.primary}15`, alignItems: 'center', justifyContent: 'center' }}>
                          <Icon name={m.type === 'Breakfast' ? 'free-breakfast' : m.type === 'Lunch' ? 'restaurant' : 'dinner-dining'} size={18} color={C.primary} />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontFamily: F.header, fontSize: 15, letterSpacing: -0.2, color: C.onSurface, flex: 1 }}>{m.name}</Text>
                            <Text style={{ fontFamily: F.num, fontSize: 14, color: C.onSurface }}>{m.cals || m.calories}<Text style={{ fontFamily: F.bodyMed, fontSize: 9, color: C.onSurfaceVariant }}> kcal</Text></Text>
                          </View>
                          <Text style={{ fontFamily: F.bodyMed, fontSize: 9, color: C.primary, marginTop: 2, letterSpacing: 0.5 }}>{timeLabel}</Text>
                          <View style={{ flexDirection: 'row', gap: 14, marginTop: 4 }}>
                            <Text style={{ fontFamily: F.num, fontSize: 11, color: A.protein }}>P {m.protein || 0}g</Text>
                            <Text style={{ fontFamily: F.num, fontSize: 11, color: A.carbs }}>C {m.carbs || 0}g</Text>
                            <Text style={{ fontFamily: F.num, fontSize: 11, color: A.fat }}>F {m.fat || m.fats || 0}g</Text>
                            <Text style={{ fontFamily: F.num, fontSize: 10, color: C.onSurfaceVariant }}>{m.prepTime || '15'}m</Text>
                          </View>
                          {m.ingredients && (
                            <Text numberOfLines={1} style={{ fontFamily: F.body, fontSize: 10, color: C.onSurfaceVariant, marginTop: 4 }}>
                              {(typeof m.ingredients === 'string' ? JSON.parse(m.ingredients) : m.ingredients).slice(0, 4).join(' · ')}
                            </Text>
                          )}
                          <View style={{ flexDirection: 'row', gap: 20, marginTop: 8 }}>
                            <Pressable onPress={() => { haptic(loggedOverride[m.id] ? 'light' : 'success'); onToggleMeal(m.id); }} hitSlop={6}
                              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Icon name={loggedOverride[m.id] ? 'check-circle' : 'check'} size={12} color={loggedOverride[m.id] ? C.success : C.primary} />
                              <Text style={{ fontFamily: F.header, fontSize: 10.5, color: loggedOverride[m.id] ? C.success : C.primary }}>{loggedOverride[m.id] ? 'Logged' : 'Log it'}</Text>
                            </Pressable>
                            <Pressable onPress={() => { haptic('medium'); onRegenerate(m.id); }} hitSlop={6}
                              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Icon name="refresh" size={12} color={C.primary} />
                              <Text style={{ fontFamily: F.header, fontSize: 10.5, color: C.primary }}>Regenerate</Text>
                            </Pressable>
                            <Pressable onPress={() => { haptic('medium'); onRegenerate(m.id); }} hitSlop={6}
                              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Icon name="swap-horiz" size={12} color={C.primary} />
                              <Text style={{ fontFamily: F.header, fontSize: 10.5, color: C.primary }}>Swap</Text>
                            </Pressable>
                          </View>
                        </View>
                      </View>
                    </View>
                  );})}
                </>
              )}

              {/* Empty state */}
              {(!mealPlan.today || mealPlan.today.length === 0) && (!mealPlan.tomorrow || mealPlan.tomorrow.length === 0) && !mealPlanLoading && (
                <View style={{ paddingHorizontal: T.gutter, paddingVertical: 30, alignItems: 'center' }}>
                  <Icon name="auto-awesome" size={32} color={C.onSurfaceVariant} style={{ opacity: 0.3, marginBottom: 12 }} />
                  <Text style={{ fontFamily: F.bodyMed, fontSize: 13, color: C.onSurfaceVariant, textAlign: 'center' }}>
                    Generate a personalized AI meal plan based on your profile and preferences.
                  </Text>
                  <PressableScale onPress={() => { haptic('medium'); onRegenAll?.(); }} style={{ marginTop: 16 }}>
                    <LinearGradient colors={[C.primary, C.primaryDim]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12 }}>
                      <Icon name="auto-awesome" size={16} color={C.onPrimary} />
                      <Text style={{ fontFamily: F.header, fontSize: 13, color: C.onPrimary }}>Generate Meal Plan</Text>
                    </LinearGradient>
                  </PressableScale>
                </View>
              )}
            </>
          )}
        </>
      )}

      <Pressable onPress={() => { haptic('light'); onGoInsights(); }} style={{ paddingVertical: 22 }}>
        <Text style={{ textAlign: 'center', fontFamily: F.header, fontSize: 13, color: C.primary }}>
          See weekly insights
        </Text>
      </Pressable>
    </ScrollView>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   TAB · PLAN
   ────────────────────────────────────────────────────────────────────────── */

function PlanTab({
  week,
  selectedDay,
  meals,
  preferences,
  suggestions,
  onSelectDay,
  onGenerate,
  generating,
  C,
  isDark,
}: {
  week: DayPlan[];
  selectedDay: number;
  meals: Meal[];
  preferences: string[];
  suggestions: string[];
  onSelectDay: (i: number) => void;
  onGenerate: (prompt?: string) => void;
  generating?: boolean;
  C: ThemeColors;
  isDark: boolean;
}) {
  const T = makeTokens(isDark);
  const A = makeAccents(isDark);
  const [chips, setChips] = useState<string[]>(['High protein']);
  const [prompt, setPrompt] = useState('');
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null);

  const day = week[selectedDay] || { label: 'MON', dayOfMonth: new Date().getDate(), cals: 2000, onTarget: true };
  const dayCost = meals?.reduce((a, m) => a + (m?.cost || 0), 0) || 0;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 160 }} showsVerticalScrollIndicator={false}>
        <SectionLabel
          text="This Week"
          C={C}
          actionNode={
            <Pressable
              hitSlop={10}
              onPress={() => haptic('select')}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}
            >
              <Icon name="filter-list" size={15} color={C.primary} />
              <Text style={{ fontFamily: F.header, fontSize: 13, color: C.primary }}>Filters</Text>
            </Pressable>
          }
        />

        <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: T.gutter }}>
          {week.map((w, i) => {
            const on = i === selectedDay;
            return (
              <Pressable
                key={w.label}
                onPress={() => {
                  haptic('select');
                  onSelectDay(i);
                }}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  paddingVertical: 10,
                  borderRadius: 12,
                  borderWidth: T.hairline,
                  borderColor: on ? T.hairGold : 'transparent',
                  backgroundColor: on ? T.wash : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontFamily: F.header,
                    fontSize: 9.5,
                    letterSpacing: 0.6,
                    color: on ? C.primary : C.onSurfaceVariant,
                  }}
                >
                  {w.label}
                </Text>
                <Text
                  style={{
                    fontFamily: F.num,
                    fontSize: 15,
                    letterSpacing: -0.5,
                    marginTop: 4,
                    color: on ? C.primary : C.onSurface,
                  }}
                >
                  {w.dayOfMonth}
                </Text>
                <Text style={{ fontFamily: F.num, fontSize: 8.5, color: C.onSurfaceVariant, marginTop: 4 }}>
                  {(w.cals / 1000).toFixed(1)}k
                </Text>
                {w.onTarget && (
                  <View
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: A.green,
                      marginTop: 4,
                    }}
                  />
                )}
              </Pressable>
            );
          })}
        </View>

        <View style={{ marginTop: 18 }}>
          <StatColumns
            C={C}
            isDark={isDark}
            bordered
            items={[
              { value: day.cals.toLocaleString(), unit: 'kcal', label: 'Planned' },
              { value: String(meals.length), label: 'Meals' },
              { value: money(dayCost), label: 'Day cost', tone: A.green },
            ]}
          />
        </View>

        <SectionLabel text="Preferences" C={C} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 9, paddingHorizontal: T.gutter, paddingBottom: 4 }}
        >
          {preferences.map((p) => {
            const on = chips.includes(p);
            return (
              <Pressable
                key={p}
                onPress={() => {
                  haptic('select');
                  setChips((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
                }}
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
                  {p}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <SectionLabel text="Ask Rachel" C={C} />
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
              placeholder="“swap lunch for something vegetarian”"
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
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="send" size={14} color={C.onPrimary} />
              </LinearGradient>
            </PressableScale>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 18, marginTop: 13 }}
          >
            {suggestions.map((s) => (
              <Pressable key={s} onPress={() => { haptic('select'); onGenerate(s); }}>
                <Text style={{ fontFamily: F.bodyBold, fontSize: 12, color: C.primary, opacity: 0.85 }}>
                  {s}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <SectionLabel text={`${day.label} · Meals`} C={C} action="Add" onAction={() => undefined} />
        {meals.filter(m => ['Breakfast','Lunch','Dinner'].includes(m.type)).map((m, i) => {
          const isExpanded = expandedMeal === m.id;
          return (
          <View key={m.id}>
          <Row key={m.id} isDark={isDark} first={i === 0} indented onPress={() => setExpandedMeal(isExpanded ? null : m.id)}>
            <View style={{ width: 32, alignItems: 'center' }}>
              <Text style={{ fontFamily: F.num, fontSize: 11.5, color: C.onSurfaceVariant }}>
                {m.time}
              </Text>
              <Text
                style={{
                  fontFamily: F.header,
                  fontSize: 8,
                  color: C.onSurfaceVariant,
                  marginTop: 1,
                }}
              >
                {m.meridiem}
              </Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontFamily: F.header, fontSize: 15.5, letterSpacing: -0.2, color: C.onSurface }}>
                {m.type}: {m.name}
              </Text>
              <Text style={{ fontFamily: F.num, fontSize: 12, color: C.primary, marginTop: 3 }}>
                {m.cals} kcal
                <Text style={{ color: C.onSurfaceVariant }}> · </Text>
                {m.protein}p {m.carbs}c {m.fat}f
              </Text>
            </View>
            <Icon name={isExpanded ? 'expand-less' : 'chevron-right'} size={17} color={C.onSurfaceVariant} />
          </Row>
          {isExpanded && (
            <View style={{ paddingHorizontal: T.gutter + 32, paddingBottom: 14 }}>
              <Text style={{ fontFamily: F.body, fontSize: 12, color: C.onSurfaceVariant, lineHeight: 18 }}>
                Protein: {m.protein}g | Carbs: {m.carbs}g | Fat: {m.fat}g | Cost: {money(m.cost || 0)}
              </Text>
            </View>
          )}
          </View>
        ))}

        <SectionLabel text="Week Total" C={C} />
        <StatColumns
          C={C}
          isDark={isDark}
          bordered
          items={[
            {
              value: (week.reduce((a, w) => a + w.cals, 0) / 1000).toFixed(1),
              unit: 'k kcal',
              label: 'Planned',
            },
            { value: String(Math.round(dayCost * 7 * 10) / 10), unit: '', label: 'Est. $/wk', tone: A.green },
            { value: String(meals.length * 7), label: 'Meals' },
          ]}
        />
        {/* Dock */}
        <View
          style={{
            paddingHorizontal: T.gutter,
            paddingTop: 16,
            paddingBottom: Platform.OS === 'ios' ? 30 : 20,
          }}
        >
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Pressable onPress={() => haptic('light')} style={{ paddingVertical: 15, paddingHorizontal: 6 }}>
              <Text style={{ fontFamily: F.header, fontSize: 14.5, color: C.onSurfaceVariant }}>
                Reset
              </Text>
            </Pressable>
            <PressableScale
              onPress={() => onGenerate()}
              style={{ flex: 1 }}
              disabled={generating}
              hapticStyle="medium"
            >
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
                  opacity: generating ? 0.7 : 1,
                }}
              >
                {generating ? (
                  <ActivityIndicator color={C.onPrimary} size="small" />
                ) : (
                  <>
                    <Icon name="auto-awesome" size={17} color={C.onPrimary} />
                    <Text style={{ fontFamily: F.header, fontSize: 14.5, color: C.onPrimary }}>
                      Regenerate Week
                    </Text>
                  </>
                )}
              </LinearGradient>
            </PressableScale>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   TAB · GROCERY
   ────────────────────────────────────────────────────────────────────────── */

function GroceryTab({
  categories,
  checked,
  weeklyBudget,
  onToggle,
  onGoPlan,
  C,
  isDark,
}: {
  categories: GroceryCategory[];
  checked: Record<string, boolean>;
  weeklyBudget: number;
  onToggle: (name: string) => void;
  onGoPlan: () => void;
  C: ThemeColors;
  isDark: boolean;
}) {
  const T = makeTokens(isDark);
  const A = makeAccents(isDark);

  const all = useMemo(() => categories.flatMap((c) => c.items), [categories]);
  const isChecked = useCallback(
    (it: GroceryItem) => checked[it.name] ?? Boolean(it.isChecked),
    [checked],
  );

  const listTotal = all.reduce((a, i) => a + i.cost, 0);
  const inCart = all.filter(isChecked).reduce((a, i) => a + i.cost, 0);
  const remaining = all.filter((i) => !isChecked(i)).length;

  if (!all.length) {
    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <SectionLabel text="Grocery" C={C} />
        <View style={{ paddingHorizontal: 36, paddingTop: 60, alignItems: 'center' }}>
          <View style={{ opacity: 0.3, marginBottom: 18 }}>
            <Icon name="shopping-cart" size={52} color={C.onSurfaceVariant} />
          </View>
          <Text
            style={{
              fontFamily: F.header,
              fontSize: 17.5,
              letterSpacing: -0.3,
              color: C.onSurface,
              marginBottom: 9,
            }}
          >
            No list yet
          </Text>
          <Text
            style={{
              fontFamily: F.bodyMed,
              fontSize: 13.5,
              lineHeight: 22,
              color: C.onSurfaceVariant,
              textAlign: 'center',
              maxWidth: 250,
            }}
          >
            Generate a meal plan and Rachel will build an optimised grocery list inside your budget.
          </Text>
          <PressableScale onPress={onGoPlan} style={{ marginTop: 22 }} hapticStyle="medium">
            <LinearGradient
              colors={[C.primary, C.primaryDim]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingVertical: 14,
                paddingHorizontal: 24,
                borderRadius: 14,
              }}
            >
              <Icon name="auto-awesome" size={16} color={C.onPrimary} />
              <Text style={{ fontFamily: F.header, fontSize: 14, color: C.onPrimary }}>
                Build a plan
              </Text>
            </LinearGradient>
          </PressableScale>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 180 }} showsVerticalScrollIndicator={false}>
        <SectionLabel text="Weekly Budget" C={C} />
        <View style={{ paddingHorizontal: T.gutter }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              marginBottom: 10,
            }}
          >
            <Text style={{ fontFamily: F.num, fontSize: 26, letterSpacing: -1.2, color: C.onSurface }}>
              {money(inCart)}
              <Text style={{ fontFamily: F.bodyMed, fontSize: 12, color: C.onSurfaceVariant }}>
                {' '}of {money(weeklyBudget)}
              </Text>
            </Text>
            <Text style={{ fontFamily: F.header, fontSize: 11.5, color: A.green }}>
              {money(Math.max(0, weeklyBudget - listTotal))} under cap
            </Text>
          </View>
          <Track progress={inCart / weeklyBudget} color={A.green} isDark={isDark} height={5} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
            <Text style={{ fontFamily: F.bodyBold, fontSize: 10.5, color: C.onSurfaceVariant }}>
              {money(listTotal)} list total
            </Text>
            <Text style={{ fontFamily: F.bodyBold, fontSize: 10.5, color: C.onSurfaceVariant }}>
              {remaining} items left
            </Text>
          </View>
        </View>

        <View style={{ marginTop: 18 }}>
          <StatColumns
            C={C}
            isDark={isDark}
            bordered
            items={[
              { value: String(all.length), label: 'Items' },
              { value: String(all.length - remaining), label: 'In cart' },
              { value: money(listTotal / 7), label: 'Per day', tone: A.green },
            ]}
          />
        </View>

        {categories.map((cat) => {
          const catTotal = cat.items.reduce((a, i) => a + i.cost, 0);
          return (
            <View key={cat.category}>
              <SectionLabel
                text={cat.category}
                C={C}
                actionNode={
                  <Text style={{ fontFamily: F.num, fontSize: 12, color: C.onSurfaceVariant }}>
                    {money(catTotal)}
                  </Text>
                }
              />
              {cat.items.map((it, i) => {
                const on = isChecked(it);
                return (
                  <Pressable
                    key={it.name}
                    onPress={() => {
                      haptic('select');
                      onToggle(it.name);
                    }}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 13,
                      paddingHorizontal: T.gutter,
                      paddingVertical: 13,
                      backgroundColor: pressed ? T.wash : undefined,
                    })}
                  >
                    {i > 0 && (
                      <View
                        style={{
                          position: 'absolute',
                          left: 56,
                          right: 0,
                          top: 0,
                          height: T.hairline,
                          backgroundColor: T.hairSoft,
                        }}
                      />
                    )}
                    <View
                      style={{
                        width: 21,
                        height: 21,
                        borderRadius: 11,
                        borderWidth: on ? 0 : 1.6,
                        borderColor: T.hair,
                        backgroundColor: on ? A.green : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {on && <Icon name="check" size={13} color={isDark ? C.bg : '#FFFFFF'} />}
                    </View>

                    <Text
                      numberOfLines={1}
                      style={{
                        flex: 1,
                        fontFamily: F.bodyMed,
                        fontSize: 14.5,
                        color: on ? C.onSurfaceVariant : C.onSurface,
                        textDecorationLine: on ? 'line-through' : 'none',
                      }}
                    >
                      {it.name}
                      <Text style={{ fontFamily: F.num, fontSize: 11.5, color: C.onSurfaceVariant }}>
                        {'  '}{it.quantity}
                      </Text>
                    </Text>

                    {it.cost > 0 ? (
                      <Text
                        style={{
                          fontFamily: F.num,
                          fontSize: 13.5,
                          color: C.onSurfaceVariant,
                          textDecorationLine: on ? 'line-through' : 'none',
                        }}
                      >
                        {money(it.cost)}
                      </Text>
                    ) : (
                      <Text style={{ fontFamily: F.header, fontSize: 10.5, color: A.green }}>
                        {(it.note ?? 'HAVE').toUpperCase()}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          );
        })}
        {/* Dock */}
        <View
          style={{
            paddingHorizontal: T.gutter,
            paddingTop: 16,
            paddingBottom: Platform.OS === 'ios' ? 30 : 20,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: F.header,
                  fontSize: 9.5,
                  letterSpacing: 1.1,
                  color: C.onSurfaceVariant,
                }}
              >
                IN CART
              </Text>
              <Text
                style={{
                  fontFamily: F.num,
                  fontSize: 24,
                  letterSpacing: -1.1,
                  color: A.green,
                  marginTop: 2,
                }}
              >
                {money(inCart)}
              </Text>
            </View>
            <PressableScale onPress={() => undefined} hapticStyle="medium">
              <LinearGradient
                colors={[C.primary, C.primaryDim]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingVertical: 15,
                  paddingHorizontal: 22,
                  borderRadius: 14,
                }}
              >
                <Icon name="shopping-cart" size={17} color={C.onPrimary} />
                <Text style={{ fontFamily: F.header, fontSize: 14.5, color: C.onPrimary }}>
                  Export list
                </Text>
              </LinearGradient>
            </PressableScale>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   TAB · INSIGHTS
   ────────────────────────────────────────────────────────────────────────── */

function InsightsTab({
  week,
  targets,
  macroSplit,
  adherence,
  spend,
  topProtein,
  C,
  isDark,
}: {
  week: DayPlan[];
  targets: MacroTargets;
  macroSplit: { protein: number; carbs: number; fat: number };
  adherence: { logged: number; total: number };
  spend: { week: number; day: number; meal: number };
  topProtein: Array<{ name: string; grams: number; share: number }>;
  C: ThemeColors;
  isDark: boolean;
}) {
  const T = makeTokens(isDark);
  const A = makeAccents(isDark);

  const maxCals = Math.max(...week.map((w) => w.cals), 1);
  const avg = Math.round(week.reduce((a, w) => a + w.cals, 0) / (week.length || 1));
  const pct = adherence.total ? adherence.logged / adherence.total : 0;
  const overDays = week.filter((w) => w.cals > targets.calories * 1.08).length;

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
      <SectionLabel text="Calories · Last 7 Days" C={C} />
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: T.gutter,
          paddingBottom: 12,
        }}
      >
        <Text style={{ fontFamily: F.num, fontSize: 19, letterSpacing: -0.7, color: C.onSurface }}>
          {avg.toLocaleString()}
          <Text style={{ fontFamily: F.bodyMed, fontSize: 11, color: C.onSurfaceVariant }}>
            {' '}kcal avg
          </Text>
        </Text>
        <Text style={{ fontFamily: F.header, fontSize: 11.5, color: A.green }}>
          ▲ {Math.round(pct * 100)}% adherence
        </Text>
      </View>

      {/* Bars — over-target days render red */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 9, height: 70, paddingHorizontal: T.gutter }}>
        {week.map((w, i) => {
          const over = w.cals > targets.calories * 1.08;
          return (
            <View key={`${w.label}-${i}`} style={{ flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: 7 }}>
              <View
                style={{
                  width: '100%',
                  height: `${(w.cals / maxCals) * 100}%`,
                  borderRadius: 3,
                  backgroundColor: over ? A.red : C.primary,
                }}
              />
              <Text style={{ fontFamily: F.header, fontSize: 9.5, color: C.onSurfaceVariant }}>
                {w.label.charAt(0)}
              </Text>
            </View>
          );
        })}
      </View>
      <Text
        style={{
          fontFamily: F.bodyBold,
          fontSize: 11,
          color: C.onSurfaceVariant,
          paddingHorizontal: T.gutter,
          paddingTop: 12,
        }}
      >
        Target {targets.calories.toLocaleString()} kcal
        {overDays > 0 ? ` · ${overDays} day${overDays > 1 ? 's' : ''} over` : ' · all days on target'}
      </Text>

      {/* Stacked macro split */}
      <SectionLabel text="Macro Split · Avg" C={C} />
      <View style={{ flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginHorizontal: T.gutter }}>
        <View style={{ flex: macroSplit.protein, backgroundColor: A.protein }} />
        <View style={{ flex: macroSplit.carbs, backgroundColor: A.carbs }} />
        <View style={{ flex: macroSplit.fat, backgroundColor: A.fat }} />
      </View>
      <View style={{ flexDirection: 'row', gap: 16, paddingHorizontal: T.gutter, paddingTop: 11 }}>
        {[
          ['Protein', macroSplit.protein, A.protein],
          ['Carbs', macroSplit.carbs, A.carbs],
          ['Fat', macroSplit.fat, A.fat],
        ].map(([label, val, col]) => (
          <View key={String(label)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: col as string }} />
            <Text style={{ fontFamily: F.bodyBold, fontSize: 11, color: C.onSurfaceVariant }}>
              {label}{' '}
              <Text style={{ fontFamily: F.num, color: C.onSurface }}>{val as number}%</Text>
            </Text>
          </View>
        ))}
      </View>

      {/* Adherence */}
      <SectionLabel text="Adherence" C={C} />
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center', paddingHorizontal: T.gutter }}>
        <View style={{ width: 76, height: 76, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityRings size={76} rings={[{ progress: pct, color: A.green, radius: 35, strokeWidth: 5 }]} />
          <View style={{ position: 'absolute', alignItems: 'center' }}>
            <Text style={{ fontFamily: F.num, fontSize: 16, letterSpacing: -0.6, color: C.onSurface }}>
              {Math.round(pct * 100)}%
            </Text>
            <Text
              style={{
                fontFamily: F.header,
                fontSize: 8,
                letterSpacing: 0.9,
                color: C.onSurfaceVariant,
              }}
            >
              ON PLAN
            </Text>
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.num, fontSize: 30, letterSpacing: -1.4, color: C.onSurface }}>
            {adherence.logged}
            <Text style={{ fontFamily: F.bodyMed, fontSize: 13, color: C.onSurfaceVariant }}>
              {' '}/ {adherence.total} meals
            </Text>
          </Text>
          <Text
            style={{
              fontFamily: F.bodyMed,
              fontSize: 12.5,
              lineHeight: 19,
              color: C.onSurfaceVariant,
              marginTop: 5,
            }}
          >
            Logged meals across the last 7 days of your plan.
          </Text>
        </View>
      </View>

      {/* Spend */}
      <SectionLabel text="Spend" C={C} />
      <StatColumns
        C={C}
        isDark={isDark}
        bordered
        items={[
          { value: money(spend.week), label: 'This week', tone: A.green },
          { value: money(spend.day), label: 'Per day' },
          { value: money(spend.meal), label: 'Per meal' },
        ]}
      />

      {/* Top protein sources */}
      <SectionLabel text="Top Protein Sources" C={C} />
      {topProtein.map((p, i) => (
        <Row key={p.name} isDark={isDark} first={i === 0} indented>
          <Text
            style={{
              width: 32,
              textAlign: 'center',
              fontFamily: F.num,
              fontSize: 12,
              color: C.onSurfaceVariant,
            }}
          >
            {i + 1}
          </Text>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontFamily: F.header, fontSize: 15, letterSpacing: -0.2, color: C.onSurface }}>
              {p.name}
            </Text>
            <View style={{ marginTop: 7 }}>
              <Track progress={p.share} color={A.protein} isDark={isDark} />
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontFamily: F.num, fontSize: 13.5, color: C.onSurface }}>
              {p.grams}
              <Text style={{ fontSize: 10, color: C.onSurfaceVariant }}> g</Text>
            </Text>
            <Text
              style={{
                fontFamily: F.header,
                fontSize: 9,
                color: C.onSurfaceVariant,
                marginTop: 2,
              }}
            >
              {Math.round(p.share * 100)}%
            </Text>
          </View>
        </Row>
      ))}
    </ScrollView>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   FALLBACK DATA — used only until the API resolves
   ────────────────────────────────────────────────────────────────────────── */

const FALLBACK_MEALS: Meal[] = [];
const FALLBACK_WEEK: DayPlan[] = [];

const DEFAULT_TARGETS: MacroTargets = { calories: 2500, protein: 200, carbs: 250, fat: 90 };

/** Group a flat grocery array into categories, tolerating a missing field. */
function groupGrocery(list: any[]): GroceryCategory[] {
  if (!Array.isArray(list) || !list.length) return [];
  const map = new Map<string, GroceryItem[]>();
  list.forEach((raw) => {
    const cat = String(raw?.category ?? 'ITEMS').toUpperCase();
    const item: GroceryItem = {
      name: raw?.name ?? 'Item',
      quantity: String(raw?.quantity ?? ''),
      cost: Number(raw?.totalCost ?? raw?.cost ?? 0),
      isChecked: Boolean(raw?.isChecked),
      note: raw?.note,
    };
    map.set(cat, [...(map.get(cat) ?? []), item]);
  });
  return Array.from(map.entries()).map(([category, items]) => ({ category, items }));
}

/** Map an API meal payload onto the shape this screen renders. */
function toMeal(raw: any, index: number): Meal {
  const active = raw?.versions?.find((v: any) => v.isCurrent) ?? raw;
  // Derive time/meridiem from the meal type instead of hardcoded slots
  const type = raw?.type || (index === 0 ? 'Breakfast' : index === 1 ? 'Lunch' : index === 2 ? 'Dinner' : 'Snack');
  const timeMap: Record<string, [string, string]> = {
    'Breakfast': ['7:30', 'AM'],
    'Lunch': ['1:00', 'PM'],
    'Dinner': ['7:30', 'PM'],
    'Snack': ['10:30', 'AM'],
  };
  const [time, meridiem] = timeMap[type] || ['12:00', 'PM'];
  return {
    id: raw?.id ?? `meal-${index}`,
    time: raw?.time ?? time,
    meridiem: raw?.meridiem ?? meridiem,
    type: type,
    name: active?.name ?? 'Meal',
    cals: Number(active?.cals ?? 0),
    protein: Number(active?.protein ?? 0),
    carbs: Number(active?.carbs ?? 0),
    fat: Number(active?.fat ?? 0),
    cost: Number(active?.cost ?? 0),
    state: raw?.isLogged ? 'done' : index === 2 ? 'now' : 'pending',
    versions: raw?.versions,
  };
}

/* ──────────────────────────────────────────────────────────────────────────
   SCREEN
   ────────────────────────────────────────────────────────────────────────── */

export interface NutritionScreenProps {
  onNavigateBack?: () => void;
  onNavigateToNotifications?: () => void;
}

export default function NutritionScreen({
  onNavigateBack,
  onNavigateToNotifications,
}: NutritionScreenProps) {
  const { C, isDark, bgColors } = useTheme();
  const { user } = useAuth();
  const T = useMemo(() => makeTokens(isDark), [isDark]);
  const A = useMemo(() => makeAccents(isDark), [isDark]);
  const qc = useQueryClient();

  const [tab, setTab] = useState<NutritionTabKey>('today');
  const [logged, setLogged] = useState<Record<string, boolean>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [selectedDay, setSelectedDay] = useState(1);

  /* ── Queries ─────────────────────────────────────── */
  const { data: userMeals = [] } = useQuery({
    queryKey: ['userMeals', user?.id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/nutrition?userId=${user?.id}`);
      return data;
    },
    enabled: !!user?.id,
  });

  /* Smart AI Meal Plan — fetches personalized meals for today/tomorrow */
  const { data: mealPlan, isLoading: mealPlanLoading, refetch: refetchMealPlan } = useQuery({
    queryKey: ['mealPlan', user?.id],
    queryFn: () => fetchMealPlan(user?.id || ''),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 15, // 15 min cache
  });

  const { data: dashboardData } = useQuery({
    queryKey: ['nutritionDashboard', user?.id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/nutrition/dashboard?userId=${user?.id}`);
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: budgetData } = useQuery({
    queryKey: ['budgetPlan', user?.id],
    queryFn: () => fetchBudgetPlan(75, 2500, user?.diet || undefined),
  });

  /* ── Mutations ───────────────────────────────────── */
  const regenMutation = useMutation({
    mutationFn: async (mealId: string) => {
      const { data } = await apiClient.post('/nutrition/regenerate', { mealId });
      return data;
    },
    onSuccess: () => {
      haptic('success');
      void qc.invalidateQueries({ queryKey: ['userMeals'] });
    },
  });

  const generatePlanMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('No user id');
      return generateAiPlan(user.id);
    },
    onSuccess: () => {
      haptic('success');
      void qc.invalidateQueries({ queryKey: ['userMeals'] });
    },
  });

  const logWaterMutation = useMutation({
    mutationFn: async (amountMl: number) => {
      const { data } = await apiClient.post('/nutrition/water', { userId: user?.id, amountMl });
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['nutritionDashboard'] });
    },
  });

  const regenTodayMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('No user id');
      return regenerateMealPlan(user.id, 'today');
    },
    onSuccess: () => {
      haptic('success');
      void qc.invalidateQueries({ queryKey: ['mealPlan'] });
    },
  });

  const regenTomorrowMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('No user id');
      return regenerateMealPlan(user.id, 'tomorrow');
    },
    onSuccess: () => {
      haptic('success');
      void qc.invalidateQueries({ queryKey: ['mealPlan'] });
    },
  });

  const regenAllMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('No user id');
      const results = await Promise.allSettled([
        regenerateMealPlan(user.id, 'today'),
        regenerateMealPlan(user.id, 'tomorrow'),
      ]);
      const failures = results.filter(r => r.status === 'rejected');
      if (failures.length > 0) {
        console.warn('[RegenAll] Some days failed:', failures);
      }
      return results;
    },
    onSuccess: () => {
      haptic('success');
      setTimeout(() => qc.invalidateQueries({ queryKey: ['mealPlan'] }), 500);
    },
    onError: (err) => {
      console.warn('[RegenAll] Error:', err);
      haptic('medium');
    }
  });

  /* ── Derived data ────────────────────────────────── */
  const meals: Meal[] = useMemo(() => {
    let raw: any[] = [];
    if (Array.isArray(userMeals) && userMeals.length) raw = userMeals;
    else if (Array.isArray(budgetData?.meals) && budgetData.meals.length) raw = budgetData.meals;
    const seen = new Set<string>();
    const deduped = raw.filter((m: any) => {
      const id = m.id || m.name;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    return deduped.map(toMeal);
  }, [userMeals, budgetData]);

  const targets: MacroTargets = useMemo(
    () => ({
      calories: dashboardData?.calorieGoal ?? DEFAULT_TARGETS.calories,
      protein: dashboardData?.proteinGoal ?? DEFAULT_TARGETS.protein,
      carbs: dashboardData?.carbGoal ?? DEFAULT_TARGETS.carbs,
      fat: dashboardData?.fatGoal ?? DEFAULT_TARGETS.fat,
    }),
    [dashboardData],
  );

  const groceries = useMemo(
    () => groupGrocery(budgetData?.groceryList ?? []),
    [budgetData],
  );

  const GLASS_ML = 300;
  const waterGoalGlasses = Math.max(
    1,
    Math.round((dashboardData?.waterGoalMl ?? 2400) / GLASS_ML),
  );
  const waterGlasses = Math.min(
    waterGoalGlasses,
    Math.round((dashboardData?.dailyWaterMl ?? 1500) / GLASS_ML),
  );

  const handleSetWater = useCallback(
    (glasses: number) => {
      const delta = (glasses - waterGlasses) * GLASS_ML;
      if (delta !== 0) logWaterMutation.mutate(delta);
    },
    [waterGlasses, logWaterMutation],
  );

  const toggleMeal = useCallback((id: string) => {
    setLogged((prev) => {
      const cur = prev[id] ?? meals.find((m) => m.id === id)?.state === 'done';
      return { ...prev, [id]: !cur };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meals]);

  const toggleGrocery = useCallback(
    (name: string) => {
      setChecked((prev) => {
        const found = groceries.flatMap((g) => g.items).find((i) => i.name === name);
        const cur = prev[name] ?? Boolean(found?.isChecked);
        return { ...prev, [name]: !cur };
      });
    },
    [groceries],
  );

  /* ── Header ──────────────────────────────────────── */
  const scrollY = useSharedValue(0);
  const compactStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [10, 46], [0, 1], Extrapolation.CLAMP),
  }));

  const subtitle: Record<NutritionTabKey, string> = {
    today: 'Day plan · AI optimised',
    plan: 'Week of your current plan',
    grocery: `Budget ${money(budgetData?.budget ?? 75)} / week`,
    insights: 'Last 7 days',
  };

  const weeklyCost = budgetData?.weeklyCost ?? 68.4;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <MeshGradientBackground bgColors={bgColors} isDark={isDark} />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* Nav — bare glyphs, no circular chrome */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 18,
            paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 0) * 0.2 + 6 : 6,
          }}
        >
          <Pressable
            onPress={() => {
              haptic('light');
              onNavigateBack?.();
            }}
            hitSlop={10}
            style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="chevron-left" size={22} color={C.onSurface} />
          </Pressable>

          <Animated.Text
            numberOfLines={1}
            style={[
              { fontFamily: F.header, fontSize: 15.5, letterSpacing: -0.2, color: C.onSurface },
              compactStyle,
            ]}
          >
            Nutrition
          </Animated.Text>

          <Pressable
            onPress={() => {
              haptic('light');
              onNavigateToNotifications?.();
            }}
            hitSlop={10}
            style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="notifications" size={22} color={C.onSurface} />
            <View
              style={{
                position: 'absolute',
                top: 5,
                right: 5,
                width: 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: C.primary,
                borderWidth: 2,
                borderColor: C.bg,
              }}
            />
          </Pressable>
        </View>

        {/* Large title */}
        <View style={{ paddingHorizontal: T.gutter, paddingTop: 8, paddingBottom: 2 }}>
          <Text style={{ fontFamily: F.header, fontSize: 34, letterSpacing: -1.2, color: C.onSurface }}>
            Nutrition
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 6 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: A.green }} />
            <Text style={{ fontFamily: F.bodyBold, fontSize: 13, color: C.onSurfaceVariant }}>
              {subtitle[tab]}
            </Text>
          </View>
        </View>

        <NutritionTabs active={tab} onChange={setTab} C={C} isDark={isDark} />

        <View style={{ flex: 1 }}>
          {tab === 'today' && (
            <Animated.View style={{ flex: 1 }} entering={FadeIn.duration(180)}>
              <TodayTab
                meals={meals}
                targets={targets}
                loggedOverride={logged}
                waterGlasses={waterGlasses}
                waterGoalGlasses={waterGoalGlasses}
                onToggleMeal={toggleMeal}
                onRegenerate={(id) => regenMutation.mutate(id)}
                onSetWater={handleSetWater}
                onGoPlan={() => setTab('plan')}
                onGoInsights={() => setTab('insights')}
                regenerating={regenMutation.isPending}
                C={C}
                isDark={isDark}
                mealPlan={mealPlan}
                mealPlanLoading={mealPlanLoading}
                onRegenToday={() => regenTodayMutation.mutate()}
                onRegenTomorrow={() => regenTomorrowMutation.mutate()}
                onRegenAll={() => regenAllMutation.mutate()}
                regenBusy={regenTodayMutation.isPending || regenTomorrowMutation.isPending || regenAllMutation.isPending}
              />
            </Animated.View>
          )}

          {tab === 'plan' && (
            <Animated.View style={{ flex: 1 }} entering={FadeIn.duration(180)}>
              <PlanTab
                week={budgetData?.week ?? []}
                selectedDay={selectedDay}
                meals={meals}
                preferences={budgetData?.preferences ?? []}
                suggestions={budgetData?.suggestions ?? []}
                onSelectDay={setSelectedDay}
                onGenerate={(prompt) => {
                  if (user?.id) generatePlanMutation.mutate({ userId: user.id, prompt });
                }}
                generating={generatePlanMutation.isPending}
                C={C}
                isDark={isDark}
              />
            </Animated.View>
          )}

          {tab === 'grocery' && (
            <Animated.View style={{ flex: 1 }} entering={FadeIn.duration(180)}>
              <GroceryTab
                categories={groceries}
                checked={checked}
                weeklyBudget={budgetData?.budget ?? 75}
                onToggle={toggleGrocery}
                onGoPlan={() => setTab('plan')}
                C={C}
                isDark={isDark}
              />
            </Animated.View>
          )}

          {tab === 'insights' && (
            <Animated.View style={{ flex: 1 }} entering={FadeIn.duration(180)}>
              <InsightsTab
                week={budgetData?.week ?? []}
                dashboardData={dashboardData}
                targets={targets}
                macroSplit={{ protein: 32, carbs: 44, fat: 24 }}
                adherence={{ logged: 0, total: 0 }}
                spend={{ week: 0, day: 0, meal: 0 }}
                topProtein={[]}
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
