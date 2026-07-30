/**
 * ════════════════════════════════════════════════════════════════════════════
 *  FitAI X — DASHBOARD
 *  Single continuous scroll. Greeting · CTA · XP · quick log · friends ·
 *  rings · vitals · recovery · load · body battery · nutrition · feed.
 *  Plus two swipe-dismiss sheets: Command Palette and Notifications.
 * ════════════════════════════════════════════════════════════════════════════
 *
 *  NO HARDCODED DATA
 *  ------------------------------------------------------------------------
 *  Every metric, name and feed item comes from the API. No `|| 68` fallbacks,
 *  no placeholder arrays, no invented recovery shape. Each section resolves to
 *  loading / empty / error, and sections whose data is absent do not render.
 *
 *  DESIGN CONTRACT — "no cards"
 *  Nothing renders `borderRadius + borderWidth + backgroundColor` as a
 *  CONTAINER. Hierarchy comes from section labels, hairline weights,
 *  and the charts themselves as visual anchors.
 * ════════════════════════════════════════════════════════════════════════════
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  Extrapolation,
  FadeInDown,
  Layout,
  interpolate,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Circle, Defs, LinearGradient as SvgGrad, Line, Path, Polygon, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import MeshGradientBackground from '../components/MeshGradientBackground';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { F, ThemeColors } from '../theme';
import { fetchActiveUsers, fetchFeed, fetchVitals, FeedItem, ActiveUser, Vitals, XpStats } from '../services/api/dashboard';
import { fetchWorkoutHistory } from '../services/api/workout';
import { fetchXpStats } from '../services/api/xp';
import { apiClient } from '../services/api/client';
import { socket } from '../services/socket/socketClient';

/* ──────────────────────────────────────────────────────────────────────────
   TYPES
   ────────────────────────────────────────────────────────────────────────── */
export interface RecentWorkout {
  id?: string;
  title?: string;
  progressLabel?: string;
}
export interface NotificationItem {
  id?: string;
  type?: string;
  title?: string;
  message?: string;
  createdAt?: string;
  isRead?: boolean;
}
export type SheetKind = 'palette' | 'notifications' | null;
export type RouteName = 'Coach' | 'Workout' | 'Recovery' | 'Profile' | 'Nutrition' | 'Calendar' | 'Analytics' | 'Notifications' | 'Settings';

/* ──────────────────────────────────────────────────────────────────────────
   TOKENS
   ────────────────────────────────────────────────────────────────────────── */
interface Tokens {
  hair: string; hairSoft: string; hairGold: string; track: string; wash: string; washStrong: string;
  hairline: number; gutter: number; indent: number;
}
const makeTokens = (isDark: boolean): Tokens => ({
  hair: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(20,18,10,0.13)',
  hairSoft: isDark ? 'rgba(255,255,255,0.055)' : 'rgba(20,18,10,0.07)',
  hairGold: isDark ? 'rgba(245,196,0,0.28)' : 'rgba(160,118,0,0.36)',
  track: isDark ? 'rgba(255,255,255,0.09)' : 'rgba(20,18,10,0.10)',
  wash: isDark ? 'rgba(245,196,0,0.055)' : 'rgba(245,196,0,0.10)',
  washStrong: isDark ? 'rgba(245,196,0,0.10)' : 'rgba(245,196,0,0.17)',
  hairline: StyleSheet.hairlineWidth, gutter: 22, indent: 57,
});
const makeAccents = (isDark: boolean) => ({
  move: isDark ? '#F5C400' : '#8A6400', water: isDark ? '#38BDF8' : '#0E7490',
  train: isDark ? '#A3E635' : '#4E7C0A', heart: isDark ? '#FF4B2B' : '#D63A1E',
  heart2: isDark ? '#FF416C' : '#C42A50', protein: isDark ? '#4ADE80' : '#4E7C0A',
  carbs: isDark ? '#F5C400' : '#8A6400', fat: isDark ? '#7DD3FC' : '#0E7490',
  green: isDark ? '#A3E635' : '#5E8B00', amber: isDark ? '#FB923C' : '#B45309',
  red: isDark ? '#F87171' : '#C2413E',
});
type Accents = ReturnType<typeof makeAccents>;

/* ──────────────────────────────────────────────────────────────────────────
   UTILITIES
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
const has = <T,>(v: T | null | undefined): v is T => v !== null && v !== undefined;
const hasItems = <T,>(v: T[] | null | undefined): v is T[] => Array.isArray(v) && v.length > 0;
const hasText = (v: string | null | undefined): v is string => typeof v === 'string' && v.trim().length > 0;
const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n);
function ratio(v: number | null | undefined): number | undefined {
  if (!has(v) || !Number.isFinite(v)) return undefined;
  return clamp01(v > 1 ? v / 100 : v);
}
const pct = (r: number): string => `${Math.round(r * 100)}%`;
const nf = (n: number): string => n.toLocaleString();
function greetingFor(d: Date): string {
  const h = d.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
function notifTime(iso: string | null | undefined): string | null {
  if (!hasText(iso)) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/* ──────────────────────────────────────────────────────────────────────────
   COMMAND PALETTE CONFIG
   ────────────────────────────────────────────────────────────────────────── */
interface Command {
  id: string; section: string; icon: keyof typeof Icon.glyphMap; title: string;
  subtitle?: string; dynamic?: 'goal' | 'unread'; route: RouteName;
}
const COMMANDS: ReadonlyArray<Command> = [
  { id: '1', section: 'AI', icon: 'auto-awesome', title: 'Talk to Rachel AI', subtitle: 'Start a new coaching session', route: 'Coach' },
  { id: '2', section: 'Quick actions', icon: 'fitness-center', title: 'Workout Tracker', subtitle: "View today's AI workout", route: 'Workout' },
  { id: '3', section: 'Quick actions', icon: 'favorite', title: 'Recovery & Health', subtitle: 'View sleep, vitals and stress', route: 'Recovery' },
  { id: '4', section: 'Quick actions', icon: 'track-changes', title: 'Change Goal', dynamic: 'goal', route: 'Profile' },
  { id: '5', section: 'Navigation', icon: 'calendar-month', title: 'Smart Calendar', subtitle: 'View AI schedule', route: 'Calendar' },
  { id: '5a', section: 'Navigation', icon: 'local-dining', title: 'Nutrition', subtitle: 'View nutrition targets', route: 'Nutrition' },
  { id: '8', section: 'Navigation', icon: 'insights', title: 'Progress & Analytics', subtitle: 'View charts and score', route: 'Analytics' },
  { id: '15', section: 'Navigation', icon: 'person', title: 'Profile', subtitle: 'Details, goals, devices', route: 'Profile' },
  { id: '16', section: 'System', icon: 'notifications', title: 'Notifications', dynamic: 'unread', route: 'Notifications' },
  { id: '9', section: 'System', icon: 'settings', title: 'Settings', route: 'Settings' },
] as const;

function notifStyle(type: string | undefined, A: Accents, C: ThemeColors) {
  switch ((type ?? '').toLowerCase()) {
    case 'workout': return { colour: A.water, icon: 'fitness-center' as keyof typeof Icon.glyphMap };
    case 'recovery': return { colour: A.heart, icon: 'favorite' as keyof typeof Icon.glyphMap };
    case 'system': return { colour: C.primary, icon: 'notifications' as keyof typeof Icon.glyphMap };
    default: return { colour: C.onSurfaceVariant, icon: 'notifications' as keyof typeof Icon.glyphMap };
  }
}

/* ──────────────────────────────────────────────────────────────────────────
   PRIMITIVES
   ────────────────────────────────────────────────────────────────────────── */
function Skeleton({ width, height, radius = 6, style, isDark }: {
  width: number | `${number}%`; height: number; radius?: number; style?: StyleProp<ViewStyle>; isDark: boolean;
}) {
  const T = makeTokens(isDark);
  const o = useSharedValue(0.35);
  useEffect(() => {
    o.value = withRepeat(
      withSequence(withTiming(0.75, { duration: 780, easing: Easing.inOut(Easing.ease) }), withTiming(0.35, { duration: 780, easing: Easing.inOut(Easing.ease) })), -1, true
    );
  }, [o]);
  const anim = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: T.track }, style, anim]} />;
}

function PressableScale({ children, onPress, style, disabled, hapticStyle = 'light', scaleTo = 0.97 }: {
  children: React.ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle>; disabled?: boolean;
  hapticStyle?: HapticStyle; scaleTo?: number;
}) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable disabled={disabled}
      onPressIn={() => { scale.value = withSpring(scaleTo, { damping: 15, stiffness: 320 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 320 }); }}
      onPress={() => { if (disabled) return; haptic(hapticStyle); onPress?.(); }} style={style}>
      <Animated.View style={anim}>{children}</Animated.View>
    </Pressable>
  );
}

function SectionLabel({ text, C, actionNode, paddingTop = 26 }: {
  text: string; C: ThemeColors; actionNode?: React.ReactNode; paddingTop?: number;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop, paddingBottom: 12 }}>
      <Text style={{ fontFamily: F.header, fontSize: 11, letterSpacing: 1.5, color: C.onSurfaceVariant, textTransform: 'uppercase' }}>{text}</Text>
      {actionNode}
    </View>
  );
}

function SectionAction({ label, C, onPress, icon, chevron = false }: {
  label: string; C: ThemeColors; onPress?: () => void; icon?: keyof typeof Icon.glyphMap; chevron?: boolean;
}) {
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      {!!icon && <Icon name={icon} size={14} color={C.primary} />}
      <Text style={{ fontFamily: F.header, fontSize: 13, color: C.primary }}>{label}</Text>
      {chevron && <Icon name="chevron-right" size={14} color={C.primary} />}
    </View>
  );
  if (!onPress) return body;
  return <Pressable hitSlop={8} onPress={() => { haptic('select'); onPress(); }}>{body}</Pressable>;
}

function Rule({ isDark, soft = false, marginTop = 0 }: { isDark: boolean; soft?: boolean; marginTop?: number }) {
  const T = makeTokens(isDark);
  return <View style={{ height: T.hairline, marginHorizontal: T.gutter, marginTop, backgroundColor: soft ? T.hairSoft : T.hair }} />;
}

function StatColumns({ items, C, isDark, marginTop = 0 }: {
  items: Array<{ value: string; unit?: string; label: string; tone?: string }>; C: ThemeColors; isDark: boolean; marginTop?: number;
}) {
  const T = makeTokens(isDark);
  if (!hasItems(items)) return null;
  return (
    <View style={{ flexDirection: 'row', paddingHorizontal: T.gutter, marginTop, borderTopWidth: T.hairline, borderBottomWidth: T.hairline, borderColor: T.hair }}>
      {items.map((it, i) => (
        <View key={`${it.label}-${i}`} style={{ flex: 1, paddingVertical: 15, paddingLeft: i === 0 ? 0 : 16, minWidth: 0 }}>
          {i > 0 && <View style={{ position: 'absolute', left: 0, top: 15, bottom: 15, width: T.hairline, backgroundColor: T.hairSoft }} />}
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text numberOfLines={1} style={{ fontFamily: F.num, fontSize: 20, letterSpacing: -0.7, color: it.tone ?? C.onSurface }}>{it.value}</Text>
            {!!it.unit && <Text style={{ fontFamily: F.bodyMed, fontSize: 11, color: C.onSurfaceVariant, marginLeft: 3 }}>{it.unit}</Text>}
          </View>
          <Text numberOfLines={1} style={{ fontFamily: F.header, fontSize: 9.5, letterSpacing: 1.1, color: C.onSurfaceVariant, marginTop: 6, textTransform: 'uppercase' }}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
}

function Track({ progress, color, isDark, height: h = 3 }: { progress: number; color: string; isDark: boolean; height?: number }) {
  const T = makeTokens(isDark);
  const w = useSharedValue(0);
  useEffect(() => { w.value = withTiming(clamp01(progress), { duration: 620, easing: Easing.out(Easing.cubic) }); }, [progress, w]);
  const anim = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  return (
    <View style={{ height: h, borderRadius: h / 2, backgroundColor: T.track, overflow: 'hidden' }}>
      <Animated.View style={[{ height: h, borderRadius: h / 2, backgroundColor: color }, anim]} />
    </View>
  );
}

function EmptyState({ icon = 'insights', title, body, C, compact = true }: {
  icon?: keyof typeof Icon.glyphMap; title: string; body: string; C: ThemeColors; compact?: boolean;
}) {
  return (
    <View style={{ paddingHorizontal: 36, paddingTop: compact ? 26 : 56, paddingBottom: compact ? 16 : 36, alignItems: 'center' }}>
      <View style={{ opacity: 0.28, marginBottom: 14 }}>
        <Icon name={icon} size={compact ? 34 : 50} color={C.onSurfaceVariant} />
      </View>
      <Text style={{ fontFamily: F.header, fontSize: compact ? 15 : 17.5, letterSpacing: -0.3, color: C.onSurface, marginBottom: 7, textAlign: 'center' }}>{title}</Text>
      <Text style={{ fontFamily: F.bodyMed, fontSize: 12.5, lineHeight: 19, color: C.onSurfaceVariant, textAlign: 'center', maxWidth: 250 }}>{body}</Text>
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   CHARTS
   ────────────────────────────────────────────────────────────────────────── */
interface RingSpec { key: string; label: string; colour: string; progress: number; current?: number; goal?: number; unit: string; }

function ActivityRings({ size, rings }: { size: number; rings: RingSpec[] }) {
  const cx = size / 2;
  const stroke = size >= 100 ? 9 : 6;
  const radii = [size / 2 - stroke, size / 2 - stroke * 2.5, size / 2 - stroke * 4];
  const T = makeTokens(true);
  if (!hasItems(rings)) return null;
  return (
    <Svg width={size} height={size}>
      {rings.map((r, i) => {
        const R = radii[i];
        if (!has(R) || R <= 0) return null;
        const circ = 2 * Math.PI * R;
        return (
          <React.Fragment key={r.key}>
            <Circle cx={cx} cy={cx} r={R} fill="none" stroke={T.track} strokeWidth={stroke} />
            <Circle cx={cx} cy={cx} r={R} fill="none" stroke={r.colour} strokeWidth={stroke}
              strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - clamp01(r.progress))}
              transform={`rotate(-90 ${cx} ${cx})`} />
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

function Waveform({ width, height, color, colorTail }: { width: number; height: number; color: string; colorTail: string }) {
  const d = useMemo(() => {
    const mid = height * 0.55;
    const amp = height * 0.42;
    let path = `M0,${mid}`;
    for (let x = 0; x < width; x += 64) {
      path += `L${x},${mid}`;
      path += `L${x + 6},${mid} L${x + 10},${mid - 4} L${x + 14},${mid + 3}`;
      path += `L${x + 18},${mid - amp} L${x + 22},${mid + amp * 0.7} L${x + 26},${mid - 2}`;
      path += `L${x + 32},${mid}`;
    }
    return path;
  }, [width, height]);
  if (width <= 0) return null;
  return (
    <Svg width={width} height={height}>
      <Defs>
        <SvgGrad id="wfStroke" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={color} stopOpacity="0.15" />
          <Stop offset="0.55" stopColor={color} stopOpacity="1" />
          <Stop offset="1" stopColor={colorTail} stopOpacity="0.25" />
        </SvgGrad>
        <SvgGrad id="wfFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0.16" />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </SvgGrad>
      </Defs>
      <Path d={`${d} L${width},${height} L0,${height} Z`} fill="url(#wfFill)" />
      <Path d={d} fill="none" stroke="url(#wfStroke)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function Spline({ width, height, points, color }: { width: number; height: number; points: number[]; color: string }) {
  const geo = useMemo(() => {
    if (!hasItems(points) || points.length < 2 || width <= 0) return null;
    const mn = Math.min(...points); const mx = Math.max(...points); const range = mx - mn || 1;
    const X = (i: number) => (i / (points.length - 1)) * width;
    const Y = (v: number) => height - 6 - ((v - mn) / range) * (height - 14);
    let d = `M${X(0)},${Y(points[0])}`;
    for (let i = 1; i < points.length; i++) {
      const x0 = X(i - 1), y0 = Y(points[i - 1]), x1 = X(i), y1 = Y(points[i]), mid = (x0 + x1) / 2;
      d += `C${mid},${y0} ${mid},${y1} ${x1},${y1}`;
    }
    return { d, lastX: X(points.length - 1), lastY: Y(points[points.length - 1]) };
  }, [points, width, height]);
  if (!geo) return null;
  return (
    <Svg width={width} height={height}>
      <Defs>
        <SvgGrad id="spFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0.22" />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </SvgGrad>
      </Defs>
      <Path d={`${geo.d} L${width},${height} L0,${height} Z`} fill="url(#spFill)" />
      <Path d={geo.d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Circle cx={geo.lastX - 1} cy={geo.lastY} r={3.2} fill={color} />
    </Svg>
  );
}

interface RadarPoint { label: string; value: number; }

function RadarChart({ size, data, color, gridColor }: { size: number; data: RadarPoint[]; color: string; gridColor: string }) {
  if (!hasItems(data) || data.length < 3) return null;
  const cx = size / 2, R = size / 2 - 14;
  const angle = (i: number) => (Math.PI * 2 * i) / data.length - Math.PI / 2;
  const pt = (i: number, r: number): [number, number] => [cx + Math.cos(angle(i)) * R * r, cx + Math.sin(angle(i)) * R * r];
  const ringPoly = (k: number) => data.map((_, i) => pt(i, k).join(',')).join(' ');
  return (
    <Svg width={size} height={size}>
      {[0.33, 0.66, 1].map((k) => <Polygon key={k} points={ringPoly(k)} fill="none" stroke={gridColor} strokeWidth={1} />)}
      {data.map((d, i) => { const [x, y] = pt(i, 1); return <Line key={d.label} x1={cx} y1={cx} x2={x} y2={y} stroke={gridColor} strokeWidth={1} />; })}
      <Polygon points={data.map((d, i) => pt(i, clamp01(d.value)).join(',')).join(' ')} fill={color} fillOpacity={0.18} stroke={color} strokeWidth={1.6} />
      {data.map((d, i) => { const [x, y] = pt(i, clamp01(d.value)); return <Circle key={`${d.label}-dot`} cx={x} cy={y} r={2.4} fill={color} />; })}
    </Svg>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   SWIPE-DISMISS SHEET
   ────────────────────────────────────────────────────────────────────────── */
const DISMISS_PX = 110;
const FLICK_VELOCITY = 750;

function Sheet({ visible, title, onClose, children, headerRight, C, isDark, maxHeightRatio = 0.82 }: {
  visible: boolean; title: string; onClose: () => void; children: React.ReactNode; headerRight?: React.ReactNode;
  C: ThemeColors; isDark: boolean; maxHeightRatio?: number;
}) {
  const T = makeTokens(isDark);
  const { height: screenH } = useWindowDimensions();
  const sheetH = screenH * maxHeightRatio;
  const y = useSharedValue(sheetH);
  const scrollTop = useSharedValue(0);
  const dismiss = useCallback(() => { haptic('light'); onClose(); }, [onClose]);
  const settle = useCallback((translation: number, velocity: number) => {
    'worklet';
    if (translation > DISMISS_PX || velocity > FLICK_VELOCITY) {
      y.value = withTiming(sheetH, { duration: 200, easing: Easing.in(Easing.cubic) });
      runOnJS(dismiss)();
    } else {
      y.value = withSpring(0, { damping: 20, stiffness: 240 });
    }
  }, [y, sheetH, dismiss]);

  useEffect(() => {
    y.value = withTiming(visible ? 0 : sheetH, { duration: visible ? 300 : 240, easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic) });
  }, [visible, sheetH, y]);

  const handleDrag = useMemo(() => Gesture.Pan().onUpdate((e) => { y.value = Math.max(e.translationY, 0); }).onEnd((e) => { settle(e.translationY, e.velocityY); }), [y, settle]);
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const scrimStyle = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [0, sheetH], [1, 0], Extrapolation.CLAMP) }));
  if (!visible) return null;

  return (
    <>
      <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(40,34,14,0.34)', zIndex: 20 }, scrimStyle]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={dismiss} />
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 21, maxHeight: sheetH, backgroundColor: C.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26, overflow: 'hidden' }, sheetStyle]}>
        <GestureDetector gesture={handleDrag}>
          <View>
            <View style={{ height: 46, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: C.onSurfaceVariant, opacity: 0.55 }} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: T.gutter, paddingBottom: 12 }}>
              <Text style={{ fontFamily: F.header, fontSize: 22, letterSpacing: -0.8, color: C.onSurface }}>{title}</Text>
              {headerRight}
            </View>
          </View>
        </GestureDetector>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
          {children}
        </ScrollView>
      </Animated.View>
    </>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   SCREEN
   ────────────────────────────────────────────────────────────────────────── */
export default function DashboardScreen({ onNavigate, onNavigateToWorkout, onNavigateToNutrition, onNavigateToRecovery, onNavigateToNotifications, onNavigateToFriends }: {
  onNavigate?: (route: RouteName) => void; onNavigateToWorkout?: () => void; onNavigateToNutrition?: () => void;
  onNavigateToRecovery?: () => void; onNavigateToNotifications?: () => void; onNavigateToFriends?: () => void;
}) {
  const { C, isDark, bgColors, toggleTheme } = useTheme();
  const { user } = useAuth();
  const qc = useQueryClient();
  const T = useMemo(() => makeTokens(isDark), [isDark]);
  const A = useMemo(() => makeAccents(isDark), [isDark]);
  const { width: screenW } = useWindowDimensions();
  const [refreshing, setRefreshing] = useState(false);
  const [likes, setLikes] = useState<Record<string, boolean>>({});
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [query, setQuery] = useState('');
  const [selectedBar, setSelectedBar] = useState<number | null>(null);
  const [readLocal, setReadLocal] = useState<Record<string, boolean>>({});
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const userId = user?.id;

  const results = useQueries({
    queries: [
      { queryKey: ['feed'], queryFn: fetchFeed },
      { queryKey: ['activeUsers'], queryFn: fetchActiveUsers },
      { queryKey: ['vitals'], queryFn: fetchVitals, refetchInterval: 5000 },
      { queryKey: ['workoutHistory', userId], queryFn: () => fetchWorkoutHistory(userId || ''), enabled: !!userId },
      { queryKey: ['xpStats', userId], queryFn: () => fetchXpStats(userId || ''), enabled: !!userId },
    ],
  });
  const [feedQ, usersQ, vitalsQ, historyQ, xpQ] = results;
  const feed = (feedQ?.data ?? []) as FeedItem[];
  const activeUsers = (usersQ?.data ?? []) as ActiveUser[];
  const vitals = vitalsQ?.data as Vitals | null;
  const history = historyQ?.data as RecentWorkout[] | undefined;
  const xp = xpQ?.data as any;
  const recentWorkout = hasItems(history) ? history[0] : undefined;
  const anyLoading = results.some((r) => r.isLoading);
  const allErrored = results.every((r) => r.isError);
  const firstError = results.find((r) => r.isError)?.error as Error | undefined;

  // Fetch notifications separately
  useEffect(() => {
    apiClient.get('/notifications').then(r => setNotifications(r.data?.notifications || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const onFeedUpdate = (item: FeedItem) => {
      qc.setQueryData(['feed'], (old: FeedItem[] = []) => [item, ...old]);
      haptic('success');
    };
    socket.on('feed_update', onFeedUpdate);
    return () => { socket.off('feed_update', onFeedUpdate); };
  }, [qc]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true); haptic('light');
    await Promise.all(['feed', 'activeUsers', 'vitals', 'workoutHistory', 'xpStats'].map(k => qc.invalidateQueries({ queryKey: [k] })));
    apiClient.get('/notifications').then(r => setNotifications(r.data?.notifications || [])).catch(() => {});
    setRefreshing(false);
  }, [qc]);

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({ onScroll: (e) => { scrollY.value = e.contentOffset.y; } });
  const compactStyle = useAnimatedStyle(() => ({ opacity: interpolate(scrollY.value, [24, 64], [0, 1], Extrapolation.CLAMP) }));

  const greeting = useMemo(() => greetingFor(new Date()), []);
  const firstName = useMemo(() => (hasText(user?.name) ? user!.name!.split(' ')[0] : null), [user]);
  const unreadCount = useMemo(() => notifications.filter(n => !(readLocal[n.id!] ?? n.isRead === true)).length, [notifications, readLocal]);
  const xpProgress = useMemo(() => { if (!has(xp?.currentXp) || !has(xp?.nextLevelXp) || xp!.nextLevelXp! <= 0) return undefined; return clamp01(xp!.currentXp! / xp!.nextLevelXp!); }, [xp]);
  const xpRemaining = useMemo(() => { if (!has(xp?.currentXp) || !has(xp?.nextLevelXp)) return undefined; return Math.max(xp!.nextLevelXp! - xp!.currentXp!, 0); }, [xp]);

  const ringData = useMemo<RingSpec[]>(() => {
    const out: RingSpec[] = [];
    const move = ratio(vitals?.moveProgress);
    const water = ratio(vitals?.waterProgress);
    const train = ratio(vitals?.trainProgress);
    if (has(move)) out.push({ key: 'move', label: 'Move', colour: A.move, progress: move, current: vitals?.moveCurrent, goal: vitals?.moveGoal, unit: 'kcal' });
    if (has(water)) out.push({ key: 'water', label: 'Water', colour: A.water, progress: water, current: vitals?.waterCurrent, goal: vitals?.waterGoal, unit: 'L' });
    if (has(train)) out.push({ key: 'train', label: 'Train', colour: A.train, progress: train, current: vitals?.trainCurrent, goal: vitals?.trainGoal, unit: 'min' });
    return out;
  }, [vitals, A]);

  const vitalStats = useMemo(() => {
    const out: Array<{ value: string; unit?: string; label: string; tone?: string }> = [];
    if (has(vitals?.hrv)) out.push({ value: String(vitals!.hrv), unit: 'ms', label: 'HRV' });
    if (has(vitals?.spo2)) out.push({ value: String(vitals!.spo2), unit: '%', label: 'SpO2' });
    if (has(vitals?.respiratoryRate)) out.push({ value: String(vitals!.respiratoryRate), unit: '/min', label: 'Resp' });
    return out;
  }, [vitals]);

  const recovery = useMemo(() => {
    const src: Array<[string, number | undefined]> = [
      ['Upper body', ratio(vitals?.recoveryUpper)], ['Lower body', ratio(vitals?.recoveryLower)],
      ['Core', ratio(vitals?.recoveryCore)], ['Cardio', ratio(vitals?.recoveryCardio)],
    ];
    return src.map(([label, raw]) => has(raw) ? { label, value: raw! } : null).filter((x): x is RadarPoint => x !== null);
  }, [vitals]);

  const recoveryRanked = useMemo(() => [...recovery].sort((a, b) => a.value - b.value), [recovery]);
  const recoveryAvg = useMemo(() => (hasItems(recovery) ? recovery.reduce((s, r) => s + r.value, 0) / recovery.length : undefined), [recovery]);

  const loadData = useMemo(() => {
    const src: Array<[string, string, number | undefined]> = [
      ['Monday', 'M', vitals?.loadM], ['Tuesday', 'T', vitals?.loadT], ['Wednesday', 'W', vitals?.loadW],
      ['Thursday', 'T', vitals?.loadTh], ['Friday', 'F', vitals?.loadF], ['Saturday', 'S', vitals?.loadSa], ['Sunday', 'S', vitals?.loadSu],
    ];
    return src.map(([long, short, v]) => has(v) ? { long, short, value: v! } : null).filter((x): x is { long: string; short: string; value: number } => x !== null);
  }, [vitals]);

  const loadTotal = useMemo(() => loadData.reduce((s, d) => s + d.value, 0), [loadData]);
  const loadMax = useMemo(() => Math.max(...loadData.map((d) => d.value), 1), [loadData]);
  const loadAvg = useMemo(() => { const active = loadData.filter((d) => d.value > 0); return active.length ? Math.round(loadTotal / active.length) : undefined; }, [loadData, loadTotal]);

  const macros = useMemo(() => {
    const out: Array<{ label: string; current: number; goal: number; colour: string }> = [];
    if (has(vitals?.protein) && has(vitals?.proteinGoal)) out.push({ label: 'Protein', current: vitals!.protein!, goal: vitals!.proteinGoal!, colour: A.protein });
    if (has(vitals?.carbs) && has(vitals?.carbsGoal)) out.push({ label: 'Carbs', current: vitals!.carbs!, goal: vitals!.carbsGoal!, colour: A.carbs });
    if (has(vitals?.fat) && has(vitals?.fatGoal)) out.push({ label: 'Fat', current: vitals!.fat!, goal: vitals!.fatGoal!, colour: A.fat });
    return out;
  }, [vitals, A]);

  const commandSubtitle = useCallback((c: Command): string | undefined => {
    if (c.dynamic === 'goal') return `Currently: ${hasText((user as any)?.fitnessGoal) ? (user as any).fitnessGoal : 'Not set'}`;
    if (c.dynamic === 'unread') return unreadCount > 0 ? `${unreadCount} unread` : 'All caught up';
    return c.subtitle;
  }, [user, unreadCount]);

  const groupedCommands = useMemo(() => {
    const q = query.trim().toLowerCase();
    const hits = COMMANDS.filter(c => {
      if (!q) return true;
      const sub = commandSubtitle(c) ?? '';
      return c.title.toLowerCase().includes(q) || sub.toLowerCase().includes(q);
    });
    const groups: Array<{ section: string; items: Command[] }> = [];
    hits.forEach(c => {
      let g = groups.find(x => x.section === c.section);
      if (!g) { g = { section: c.section, items: [] }; groups.push(g); }
      g.items.push(c);
    });
    return groups;
  }, [query, commandSubtitle]);

  const toggleLike = useCallback((id: string) => { haptic('light'); setLikes(prev => ({ ...prev, [id]: !prev[id] })); }, []);
  const closeSheet = useCallback(() => { setSheet(null); setQuery(''); }, []);
  const runCommand = useCallback((c: Command) => {
    closeSheet();
    if (c.route === 'Notifications') { if (onNavigateToNotifications) onNavigateToNotifications(); else setSheet('notifications'); return; }
    onNavigate?.(c.route);
  }, [closeSheet, onNavigate, onNavigateToNotifications]);

  const markAllRead = useCallback(() => {
    haptic('select');
    setReadLocal(prev => {
      const next = { ...prev };
      notifications.forEach(n => { if (n.id) next[n.id] = true; });
      return next;
    });
  }, [notifications]);

  const railWidth = screenW - T.gutter * 2;

  if (allErrored) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <MeshGradientBackground bgColors={bgColors} isDark={isDark} />
        <SafeAreaView style={{ flex: 1, justifyContent: 'center' }}>
          <View style={{ paddingHorizontal: 36, alignItems: 'center' }}>
            <Icon name="error-outline" size={44} color={C.error} style={{ opacity: 0.7, marginBottom: 16 }} />
            <Text style={{ fontFamily: F.header, fontSize: 17, letterSpacing: -0.3, color: C.onSurface, marginBottom: 8, textAlign: 'center' }}>Couldn't load your dashboard</Text>
            <Text style={{ fontFamily: F.bodyMed, fontSize: 13.5, lineHeight: 22, color: C.onSurfaceVariant, textAlign: 'center', maxWidth: 280 }}>
              {hasText(firstError?.message) ? firstError!.message : 'Nothing below is guessed — the screen stays empty until real data arrives.'}
            </Text>
            <PressableScale onPress={() => results.forEach((r) => void r.refetch())} style={{ marginTop: 20 }} hapticStyle="medium">
              <LinearGradient colors={[C.primary, C.primaryDim]} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 13, paddingHorizontal: 22, borderRadius: 14 }}>
                <Icon name="refresh" size={16} color={C.onPrimary} />
                <Text style={{ fontFamily: F.header, fontSize: 14, color: C.onPrimary }}>Try again</Text>
              </LinearGradient>
            </PressableScale>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <MeshGradientBackground bgColors={bgColors} isDark={isDark} />
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 5, flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: Platform.OS === 'ios' ? 54 : (RNStatusBar.currentHeight ?? 0) + 12, paddingBottom: 11, paddingHorizontal: T.gutter, backgroundColor: C.bg, borderBottomWidth: T.hairline, borderBottomColor: T.hairSoft }, compactStyle]}>
        <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.header, fontSize: 15, letterSpacing: -0.2, color: C.onSurface }}>{hasText(user?.name) ? user!.name! : 'Dashboard'}</Text>
        {has(xp?.level) && <Text style={{ fontFamily: F.num, fontSize: 11, color: C.primary }}>LVL {xp!.level}</Text>}
      </Animated.View>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <Animated.ScrollView onScroll={scrollHandler} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: 44 }} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}>
          {/* Nav - settings right */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 18, paddingTop: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Pressable onPress={() => { haptic('select'); toggleTheme(); }} hitSlop={8} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={isDark ? 'light-mode' : 'dark-mode'} size={22} color={C.onSurface} />
              </Pressable>
              <Pressable onPress={() => { haptic('select'); setSheet('palette'); }} hitSlop={8} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="search" size={22} color={C.onSurface} />
              </Pressable>
              <Pressable onPress={() => { haptic('select'); if (onNavigateToNotifications) onNavigateToNotifications(); else setSheet('notifications'); }} hitSlop={8} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="notifications" size={22} color={C.onSurface} />
                {unreadCount > 0 && <View style={{ position: 'absolute', top: 5, right: 5, width: 7, height: 7, borderRadius: 4, backgroundColor: C.primary, borderWidth: 2, borderColor: C.bg }} />}
              </Pressable>
              <Pressable onPress={() => { haptic('select'); onNavigate?.('Settings'); }} hitSlop={8} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="settings" size={22} color={C.onSurface} />
              </Pressable>
            </View>
          </View>
          {/* Greeting */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: T.gutter, paddingTop: 8 }}>
            <View style={{ width: 46, height: 46, borderRadius: 23, overflow: 'hidden', backgroundColor: T.track, alignItems: 'center', justifyContent: 'center' }}>
              {hasText(user?.avatar) ? <Image source={{ uri: user!.avatar! }} style={{ width: '100%', height: '100%' }} /> : <Icon name="person" size={24} color={C.onSurfaceVariant} />}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontFamily: F.header, fontSize: 29, letterSpacing: -1.1, color: C.onSurface }}>{greeting}{hasText(firstName) ? ',' : ''}</Text>
              {hasText(firstName) && <Text numberOfLines={1} style={{ fontFamily: F.header, fontSize: 29, letterSpacing: -1.1, color: C.onSurface }}>{firstName}</Text>}
            </View>
          </View>
          {/* CTA */}
          <View style={{ paddingHorizontal: T.gutter, paddingTop: 20 }}>
            <PressableScale onPress={() => { if (recentWorkout) onNavigateToWorkout?.(); else setSheet('palette'); }} hapticStyle="heavy">
              <LinearGradient colors={[C.primary, C.primaryDim]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 15, borderRadius: 16 }}>
                <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(0,0,0,0.12)', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={recentWorkout ? 'fitness-center' : 'add'} size={21} color={C.onPrimary} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontFamily: F.header, fontSize: 16, letterSpacing: -0.3, color: C.onPrimary }}>{recentWorkout ? 'Continue Workout' : 'Build a Workout'}</Text>
                  <Text numberOfLines={1} style={{ fontFamily: F.bodyMed, fontSize: 12.5, color: C.onPrimary, opacity: 0.72, marginTop: 2 }}>
                    {recentWorkout ? [recentWorkout.title, recentWorkout.progressLabel].filter(hasText).join('  ·  ') : 'Tap to open quick actions'}
                  </Text>
                </View>
                <Icon name="chevron-right" size={20} color={C.onPrimary} style={{ opacity: 0.7 }} />
              </LinearGradient>
            </PressableScale>
          </View>
          {/* XP / Level */}
          {xpQ?.isLoading ? (
            <><SectionLabel text="Level" C={C} /><View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: T.gutter, alignItems: 'flex-end' }}>
              <Skeleton width={68} height={40} radius={8} isDark={isDark} /><View style={{ flex: 1, gap: 8 }}><Skeleton width="60%" height={13} isDark={isDark} /><Skeleton width="40%" height={10} isDark={isDark} /></View>
            </View><View style={{ paddingHorizontal: T.gutter, paddingTop: 13 }}><Skeleton width="100%" height={3} radius={2} isDark={isDark} /></View></>
          ) : has(xp?.level) ? (
            <><SectionLabel text="Level" C={C} actionNode={hasText(xp?.rankLabel) ? <Text style={{ fontFamily: F.header, fontSize: 13, color: C.primary }}>{xp!.rankLabel}</Text> : undefined} />
            <View style={{ paddingHorizontal: T.gutter }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
                <Text style={{ fontFamily: F.num, fontSize: 40, letterSpacing: -2, lineHeight: 40, color: C.onSurface }}>{xp!.level}</Text>
                <View style={{ flex: 1, minWidth: 0, paddingBottom: 4 }}>
                  {hasText(xp?.tier) && <Text style={{ fontFamily: F.header, fontSize: 14, letterSpacing: -0.2, color: C.onSurface }}>{xp!.tier}</Text>}
                  {has(xp?.todayXp) && <Text style={{ fontFamily: F.num, fontSize: 11, color: C.onSurfaceVariant, marginTop: 4 }}>+{nf(xp!.todayXp!)} XP today</Text>}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 100, borderWidth: T.hairline, borderColor: T.hairGold, backgroundColor: T.wash, marginBottom: 4 }}>
                  <Icon name="military-tech" size={12} color={C.primary} />
                  <Text style={{ fontFamily: F.header, fontSize: 9.5, letterSpacing: 0.9, color: C.primary }}>LVL {xp!.level}</Text>
                </View>
              </View>
              {has(xpProgress) && <View style={{ marginTop: 13 }}><Track progress={xpProgress} color={C.primary} isDark={isDark} /></View>}
              {(has(xp?.currentXp) || has(xpRemaining)) && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 7 }}>
                  <Text style={{ fontFamily: F.num, fontSize: 10.5, color: C.onSurfaceVariant }}>{has(xp?.currentXp) ? `${nf(xp!.currentXp!)} XP` : ''}</Text>
                  <Text style={{ fontFamily: F.bodyBold, fontSize: 10.5, color: C.onSurfaceVariant }}>{has(xpRemaining) ? `${nf(xpRemaining)} to Level ${xp!.level! + 1}` : ''}</Text>
                </View>
              )}
            </View></>
          ) : null}
          {/* Quick log */}
          <View style={{ flexDirection: 'row', paddingHorizontal: T.gutter, paddingTop: 14 }}>
            {([['restaurant', 'Log Food', 'Nutrition'], ['water-drop', 'Water', 'Nutrition'], ['monitor-weight', 'Weight', 'Profile']] as Array<[keyof typeof Icon.glyphMap, string, RouteName]>).map(([ic, label, route], i) => (
              <Pressable key={label} onPress={() => { haptic('select'); onNavigate?.(route); }} style={{ flex: 1, alignItems: 'center', paddingVertical: 12 }}>
                {i > 0 && <View style={{ position: 'absolute', left: 0, top: 14, bottom: 14, width: T.hairline, backgroundColor: T.hairSoft }} />}
                <Icon name={ic} size={19} color={C.onSurfaceVariant} />
                <Text style={{ fontFamily: F.header, fontSize: 11, letterSpacing: 0.3, color: C.onSurfaceVariant, marginTop: 7 }}>{label}</Text>
              </Pressable>
            ))}
          </View>
          <Rule isDark={isDark} marginTop={6} />
          {/* Friends */}
          {usersQ?.isLoading ? (
            <><SectionLabel text="Training now" C={C} /><View style={{ flexDirection: 'row', gap: 16, paddingHorizontal: T.gutter }}>{[0,1,2,3,4].map(i => <View key={i} style={{ alignItems: 'center', gap: 7 }}><Skeleton width={54} height={54} radius={27} isDark={isDark} /><Skeleton width={40} height={9} isDark={isDark} /></View>)}</View></>
          ) : hasItems(activeUsers) ? (
            <><SectionLabel text="Training now" C={C} actionNode={<SectionAction label="All friends" C={C} chevron onPress={onNavigateToFriends} />} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingHorizontal: T.gutter }}>
              {activeUsers.map((u, i) => (
                <Pressable key={u.id ?? `${u.name}-${i}`} onPress={() => haptic('select')} style={{ width: 54, alignItems: 'center' }}>
                  <View style={{ width: 54, height: 54, borderRadius: 27, overflow: 'hidden', backgroundColor: T.track, alignItems: 'center', justifyContent: 'center', borderWidth: u.isLive ? 2 : 0, borderColor: C.primary }}>
                    {hasText(u.img) ? <Image source={{ uri: u.img }} style={{ width: '100%', height: '100%' }} /> : <Icon name="person" size={24} color={C.onSurfaceVariant} />}
                  </View>
                  {u.isLive && <View style={{ position: 'absolute', bottom: 22, right: 0, width: 13, height: 13, borderRadius: 7, backgroundColor: C.primary, borderWidth: 2.5, borderColor: C.bg }} />}
                  <Text numberOfLines={1} style={{ fontFamily: F.bodyBold, fontSize: 10.5, color: C.onSurfaceVariant, marginTop: 7 }}>{hasText(u.name) ? u.name : '—'}</Text>
                </Pressable>
              ))}
            </ScrollView></>
          ) : null}
          {/* Activity rings */}
          {vitalsQ?.isLoading ? (
            <><SectionLabel text="Today's activity" C={C} /><View style={{ flexDirection: 'row', gap: 20, paddingHorizontal: T.gutter, alignItems: 'center' }}>
              <Skeleton width={112} height={112} radius={56} isDark={isDark} />
              <View style={{ flex: 1, gap: 14 }}>{[0,1,2].map(i => <View key={i} style={{ gap: 6 }}><Skeleton width="70%" height={12} isDark={isDark} /><Skeleton width="100%" height={3} radius={2} isDark={isDark} /></View>)}</View>
            </View></>
          ) : hasItems(ringData) ? (
            <><SectionLabel text="Today's activity" C={C} actionNode={<Text style={{ fontFamily: F.header, fontSize: 13, color: C.onSurfaceVariant }}>{pct(ringData.reduce((s, r) => s + r.progress, 0) / ringData.length)} avg</Text>} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20, paddingHorizontal: T.gutter }}>
              <ActivityRings size={112} rings={ringData} />
              <View style={{ flex: 1, minWidth: 0 }}>{ringData.map((r, i) => (
                <View key={r.key} style={{ paddingVertical: 10 }}>
                  {i > 0 && <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: T.hairline, backgroundColor: T.hairSoft }} />}
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                    <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: r.colour }} />
                    <Text style={{ flex: 1, fontFamily: F.header, fontSize: 12, color: C.onSurface }}>{r.label}</Text>
                    <Text style={{ fontFamily: F.num, fontSize: 13, letterSpacing: -0.3, color: r.colour }}>{pct(r.progress)}</Text>
                  </View>
                  {has(r.current) && has(r.goal) && <Text style={{ fontFamily: F.num, fontSize: 10, color: C.onSurfaceVariant, marginTop: 4, marginLeft: 15 }}>{r.current} / {r.goal} {r.unit}</Text>}
                  <View style={{ marginTop: 6 }}><Track progress={r.progress} color={r.colour} isDark={isDark} /></View>
                </View>
              ))}</View>
            </View></>
          ) : <><SectionLabel text="Today's activity" C={C} /><EmptyState icon="insights" title="No activity goals yet" body="Set a move, water or training goal and your rings will appear here." C={C} /></>}
          {/* Live vitals */}
          {vitalsQ?.isLoading ? (
            <><SectionLabel text="Live vitals" C={C} /><View style={{ paddingHorizontal: T.gutter }}><Skeleton width="40%" height={52} radius={8} isDark={isDark} /></View><View style={{ paddingHorizontal: T.gutter, paddingTop: 14 }}><Skeleton width="100%" height={70} radius={8} isDark={isDark} /></View></>
          ) : has(vitals?.bpm) ? (
            <><SectionLabel text="Live vitals" C={C} actionNode={<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: A.heart }} /><Text style={{ fontFamily: F.header, fontSize: 11, letterSpacing: 1.5, color: C.onSurfaceVariant }}>LIVE</Text></View>} />
            <View style={{ paddingHorizontal: T.gutter }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                <Text style={{ fontFamily: F.num, fontSize: 54, letterSpacing: -2.6, lineHeight: 56, color: A.heart }}>{vitals!.bpm}</Text>
                <Text style={{ fontFamily: F.bodyBold, fontSize: 14, color: C.onSurfaceVariant }}>bpm</Text>
                {has(vitals?.bpmDelta) && <Text style={{ marginLeft: 'auto', fontFamily: F.num, fontSize: 12, color: vitals!.bpmDelta! <= 0 ? A.green : A.red }}>{vitals!.bpmDelta! > 0 ? '▲' : '▼'} {Math.abs(vitals!.bpmDelta!)}</Text>}
              </View>
              {has(vitals?.restingBpm) && <Text style={{ fontFamily: F.bodyBold, fontSize: 12, color: C.onSurfaceVariant, marginTop: 8 }}>Resting {vitals!.restingBpm} bpm</Text>}
            </View>
            <View style={{ marginTop: 12, height: 76 }}><Waveform width={screenW} height={76} color={A.heart} colorTail={A.heart2} /></View>
            {hasItems(vitalStats) && <StatColumns items={vitalStats} C={C} isDark={isDark} marginTop={2} />}
            </>
          ) : <><SectionLabel text="Live vitals" C={C} /><EmptyState icon="favorite" title="Heart rate unavailable" body="Your watch hasn't reported recently." C={C} /></>}
          {/* Recovery */}
          {hasItems(recovery) && (
            <><SectionLabel text="Recovery" C={C} actionNode={onNavigateToRecovery ? <SectionAction label="Details" C={C} chevron onPress={onNavigateToRecovery} /> : has(recoveryAvg) ? <Text style={{ fontFamily: F.header, fontSize: 13, color: C.onSurfaceVariant }}>{pct(recoveryAvg)} overall</Text> : undefined} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18, paddingHorizontal: T.gutter }}>
              <RadarChart size={112} data={recovery} color={C.primary} gridColor={T.hairSoft} />
              <View style={{ flex: 1, minWidth: 0 }}>{recoveryRanked.map((r, i) => {
                const tone = r.value >= 0.75 ? A.train : r.value >= 0.5 ? C.primary : A.amber;
                return (<View key={r.label} style={{ paddingVertical: 8 }}>
                  {i > 0 && <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: T.hairline, backgroundColor: T.hairSoft }} />}
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                    <Text style={{ flex: 1, fontFamily: F.header, fontSize: 12, color: C.onSurface }}>{r.label}</Text>
                    <Text style={{ fontFamily: F.num, fontSize: 11.5, color: tone }}>{pct(r.value)}</Text>
                  </View>
                  <View style={{ marginTop: 5 }}><Track progress={r.value} color={tone} isDark={isDark} height={2.5} /></View>
                </View>);
              })}</View>
            </View></>
          )}
          {/* 7-day load */}
          {hasItems(loadData) && (
            <><SectionLabel text="7-day load" C={C} actionNode={<Text style={{ fontFamily: F.header, fontSize: 13, color: C.onSurfaceVariant }}>{nf(loadTotal)} kg total</Text>} />
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 86, paddingHorizontal: T.gutter }}>
              {loadData.map((d, i) => {
                const isToday = vitals?.loadTodayIndex === i;
                const sel = selectedBar === i;
                const dim = selectedBar !== null && !sel;
                return (
                  <Pressable key={`${d.long}-${i}`} onPress={() => { haptic('select'); setSelectedBar(sel ? null : i); }}
                    style={{ flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center', gap: 7 }}>
                    <View style={{ width: '100%', height: `${Math.max((d.value / loadMax) * 100, 2)}%`, minHeight: 3, borderTopLeftRadius: 3, borderTopRightRadius: 3, backgroundColor: isToday ? C.primary : A.train, opacity: dim ? 0.35 : 1 }} />
                    <Text style={{ fontFamily: F.header, fontSize: 9.5, letterSpacing: 0.5, color: isToday ? C.primary : C.onSurfaceVariant }}>{d.short}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingHorizontal: T.gutter, paddingTop: 12 }}>
              {selectedBar !== null && has(loadData[selectedBar]) ? <>
                <Text style={{ fontFamily: F.num, fontSize: 21, letterSpacing: -0.9, color: C.onSurface }}>{loadData[selectedBar]!.value === 0 ? 'Rest' : `${nf(loadData[selectedBar]!.value)} kg`}</Text>
                <Text style={{ fontFamily: F.bodyBold, fontSize: 12, color: C.onSurfaceVariant }}>on {loadData[selectedBar]!.long}</Text>
              </> : has(loadAvg) ? <>
                <Text style={{ fontFamily: F.num, fontSize: 21, letterSpacing: -0.9, color: C.onSurface }}>{nf(loadAvg)} kg</Text>
                <Text style={{ fontFamily: F.bodyBold, fontSize: 12, color: C.onSurfaceVariant }}>average per session · tap a bar</Text>
              </> : null}
            </View></>
          )}
          {/* Body battery */}
          {has(vitals?.bodyBattery) && (
            <><SectionLabel text="Body battery" C={C} />
            <View style={{ paddingHorizontal: T.gutter }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                <Text style={{ fontFamily: F.num, fontSize: 34, letterSpacing: -1.5, color: C.onSurface }}>{vitals!.bodyBattery}</Text>
                <Text style={{ fontFamily: F.bodyBold, fontSize: 12, color: C.onSurfaceVariant }}>%</Text>
                {has(vitals?.bodyBatteryDelta) && <Text style={{ marginLeft: 'auto', fontFamily: F.num, fontSize: 12, color: vitals!.bodyBatteryDelta! >= 0 ? A.green : A.red }}>{vitals!.bodyBatteryDelta! > 0 ? '▲' : '▼'} {Math.abs(vitals!.bodyBatteryDelta!)}</Text>}
              </View>
              {hasItems(vitals?.bodyBatteryTrend) && railWidth > 0 && <View style={{ marginTop: 10 }}><Spline width={railWidth} height={70} points={vitals!.bodyBatteryTrend!} color={A.water} /></View>}
            </View></>
          )}
          {/* Nutrition */}
          {(has(vitals?.caloriesRemaining) || hasItems(macros)) && (
            <><SectionLabel text="Nutrition" C={C} actionNode={<SectionAction label="Open planner" C={C} chevron onPress={onNavigateToNutrition} />} />
            <View style={{ paddingHorizontal: T.gutter }}>
              {has(vitals?.caloriesRemaining) && <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Text style={{ fontFamily: F.num, fontSize: 34, letterSpacing: -1.5, color: C.onSurface }}>{nf(vitals!.caloriesRemaining!)}</Text>
                <Text style={{ fontFamily: F.bodyBold, fontSize: 12, color: C.onSurfaceVariant, marginLeft: 6 }}>kcal left</Text>
              </View>}
              {has(vitals?.caloriesConsumed) && has(vitals?.caloriesGoal) && <Text style={{ fontFamily: F.bodyMed, fontSize: 12, color: C.onSurfaceVariant, marginTop: 6 }}>{nf(vitals!.caloriesConsumed!)} eaten · {nf(vitals!.caloriesGoal!)} target</Text>}
              {hasItems(macros) && <View style={{ flexDirection: 'row', gap: 14, marginTop: 15 }}>{macros.map(m => (
                <View key={m.label} style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: m.colour }} />
                    <Text style={{ fontFamily: F.header, fontSize: 10, letterSpacing: 0.5, color: C.onSurfaceVariant }}>{m.label}</Text>
                  </View>
                  <View style={{ marginTop: 6 }}><Track progress={m.goal > 0 ? m.current / m.goal : 0} color={m.colour} isDark={isDark} /></View>
                  <Text style={{ fontFamily: F.num, fontSize: 10.5, color: C.onSurfaceVariant, marginTop: 5 }}>{m.current}<Text style={{ color: C.onSurfaceVariant, opacity: 0.7 }}>/{m.goal}g</Text></Text>
                </View>
              ))}</View>}
            </View></>
          )}
          {/* Activity feed */}
          <SectionLabel text="Activity feed" C={C} actionNode={hasItems(feed) ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: A.heart }} /><Text style={{ fontFamily: F.header, fontSize: 11, letterSpacing: 1.5, color: C.onSurfaceVariant }}>LIVE</Text></View> : undefined} />
          {feedQ?.isLoading ? (
            <View style={{ paddingHorizontal: T.gutter, gap: 18 }}>{[0,1,2].map(i => <View key={i} style={{ flexDirection: 'row', gap: 13 }}><Skeleton width={34} height={34} radius={17} isDark={isDark} /><View style={{ flex: 1, gap: 7 }}><Skeleton width="42%" height={13} isDark={isDark} /><Skeleton width="90%" height={12} isDark={isDark} /></View></View>)}</View>
          ) : !hasItems(feed) ? <EmptyState icon="chat-bubble-outline" title="No activity yet" body="Updates from you and the people you follow will show up here." C={C} /> : (
            feed.map((item, i) => {
              const id = item.id ?? String(i);
              const isAi = item.type === 'ai';
              const liked = likes[id] ?? false;
              const likeCount = (item.likes ?? 0) + (liked ? 1 : 0);
              const inner = (
                <View style={{ flexDirection: 'row', gap: 13, paddingHorizontal: T.gutter, paddingVertical: 14 }}>
                  {i > 0 && <View style={{ position: 'absolute', left: T.indent, right: 0, top: 0, height: T.hairline, backgroundColor: T.hairSoft }} />}
                  <View style={{ width: 34, height: 34, borderRadius: 17, overflow: 'hidden', backgroundColor: T.track, alignItems: 'center', justifyContent: 'center' }}>
                    {isAi ? <LinearGradient colors={[C.primary, C.primaryDim]} style={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' }}><Icon name="auto-awesome" size={17} color={C.onPrimary} /></LinearGradient>
                    : hasText(item.avatar) ? <Image source={{ uri: item.avatar }} style={{ width: '100%', height: '100%' }} /> : <Icon name="person" size={18} color={C.onSurfaceVariant} />}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                      <Text style={{ fontFamily: F.header, fontSize: 13.5, letterSpacing: -0.15, color: C.onSurface }}>{hasText(item.user) ? item.user : '—'}</Text>
                      {hasText(item.time) && <Text style={{ marginLeft: 'auto', fontFamily: F.num, fontSize: 10.5, color: C.onSurfaceVariant }}>{item.time}</Text>}
                    </View>
                    {hasText(item.msg) && <Text style={{ fontFamily: F.bodyMed, fontSize: 13, lineHeight: 19.5, color: isAi ? C.onSurface : C.onSurfaceVariant, marginTop: 4 }}>{item.msg}</Text>}
                    <View style={{ flexDirection: 'row', gap: 16, marginTop: 9 }}>
                      <Pressable hitSlop={6} onPress={() => toggleLike(id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <Icon name="favorite" size={13} color={liked ? A.heart : C.onSurfaceVariant} />
                        <Text style={{ fontFamily: F.bodyBold, fontSize: 11, color: liked ? A.heart : C.onSurfaceVariant }}>{likeCount}</Text>
                      </Pressable>
                      {has(item.bpm) && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <Icon name="trending-up" size={13} color={C.onSurfaceVariant} />
                        <Text style={{ fontFamily: F.num, fontSize: 11, color: C.onSurfaceVariant }}>{item.bpm} bpm</Text>
                      </View>}
                    </View>
                  </View>
                </View>
              );
              return <Animated.View key={id} entering={FadeInDown.duration(220)} layout={Layout.springify().damping(18)}>{inner}</Animated.View>;
            })
          )}
        </Animated.ScrollView>
      </SafeAreaView>
      {/* Command Palette */}
      <Sheet visible={sheet === 'palette'} title="Command Palette" onClose={closeSheet} C={C} isDark={isDark}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: T.gutter, backgroundColor: T.track, borderRadius: 12, paddingHorizontal: 14, height: 44 }}>
          <Icon name="search" size={18} color={C.onSurfaceVariant} />
          <TextInput value={query} onChangeText={setQuery} placeholder="What do you want to do?" placeholderTextColor={C.onSurfaceVariant}
            selectionColor={C.primary} style={{ flex: 1, minWidth: 0, height: '100%', fontFamily: F.bodyMed, fontSize: 15, color: C.onSurface }} />
          {hasText(query) && <Pressable hitSlop={8} onPress={() => setQuery('')}><Icon name="close" size={17} color={C.onSurfaceVariant} /></Pressable>}
        </View>
        {hasItems(groupedCommands) ? groupedCommands.map(g => (
          <View key={g.section}>
            <Text style={{ fontFamily: F.header, fontSize: 10, letterSpacing: 1.3, textTransform: 'uppercase', color: C.onSurfaceVariant, paddingHorizontal: T.gutter, paddingTop: 16, paddingBottom: 7 }}>{g.section}</Text>
            {g.items.map((c, i) => {
              const sub = commandSubtitle(c);
              const isAi = c.section === 'AI';
              return (
                <Pressable key={c.id} onPress={() => { haptic('select'); runCommand(c); }} android_ripple={{ color: T.wash }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: T.gutter, paddingVertical: 13 }}>
                    {i > 0 && <View style={{ position: 'absolute', left: T.indent, right: 0, top: 0, height: T.hairline, backgroundColor: T.hairSoft }} />}
                    <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: isAi ? T.washStrong : T.track, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name={c.icon} size={15} color={isAi ? C.primary : C.onSurfaceVariant} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text numberOfLines={1} style={{ fontFamily: F.header, fontSize: 14.5, letterSpacing: -0.15, color: isAi ? C.primary : C.onSurface }}>{c.title}</Text>
                      {hasText(sub) && <Text numberOfLines={1} style={{ fontFamily: F.bodyMed, fontSize: 11.5, color: C.onSurfaceVariant, marginTop: 3 }}>{sub}</Text>}
                    </View>
                    <Icon name="chevron-right" size={18} color={C.onSurfaceVariant} style={{ opacity: 0.45 }} />
                  </View>
                </Pressable>
              );
            })}
          </View>
        )) : (
          <View style={{ paddingHorizontal: 34, paddingTop: 34, paddingBottom: 20, alignItems: 'center' }}>
            <Icon name="search-off" size={32} color={C.onSurfaceVariant} style={{ opacity: 0.4, marginBottom: 12 }} />
            <Text style={{ fontFamily: F.header, fontSize: 15, color: C.onSurface, marginBottom: 7 }}>No results found</Text>
            <Text style={{ fontFamily: F.bodyMed, fontSize: 12.5, lineHeight: 19, color: C.onSurfaceVariant, textAlign: 'center' }}>Try searching for "Workout" or "Rachel".</Text>
          </View>
        )}
      </Sheet>
      {/* Notifications */}
      <Sheet visible={sheet === 'notifications'} title="Notifications" onClose={closeSheet} C={C} isDark={isDark}
        headerRight={unreadCount > 0 ? <Pressable hitSlop={8} onPress={markAllRead}><Text style={{ fontFamily: F.header, fontSize: 13, color: C.primary }}>Mark all read</Text></Pressable> : undefined}>
        {!hasItems(notifications) ? (
          <View style={{ paddingHorizontal: 34, paddingTop: 34, paddingBottom: 20, alignItems: 'center' }}>
            <Icon name="notifications-off" size={40} color={C.onSurfaceVariant} style={{ opacity: 0.4, marginBottom: 12 }} />
            <Text style={{ fontFamily: F.header, fontSize: 15, color: C.onSurface }}>You're all caught up!</Text>
          </View>
        ) : notifications.map((n, i) => {
          const id = n.id ?? String(i);
          const nstyle = notifStyle(n.type, A, C);
          const unread = !(readLocal[id] ?? n.isRead === true);
          const time = notifTime(n.createdAt);
          const row = (
            <Pressable key={id} onPress={() => { setReadLocal(p => ({ ...p, [id]: true })); }}>
              <View style={{ flexDirection: 'row', gap: 13, paddingHorizontal: T.gutter, paddingVertical: 14 }}>
                {i > 0 && <View style={{ position: 'absolute', left: T.indent, right: 0, top: 0, height: T.hairline, backgroundColor: T.hairSoft }} />}
                <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: T.track, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={nstyle.icon} size={15} color={nstyle.colour} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                    <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.header, fontSize: 14, letterSpacing: -0.15, color: C.onSurface }}>{hasText(n.title) ? n.title : '—'}</Text>
                    {hasText(time) && <Text style={{ fontFamily: F.num, fontSize: 10, color: C.onSurfaceVariant }}>{time}</Text>}
                  </View>
                  {hasText(n.message) && <Text style={{ fontFamily: F.bodyMed, fontSize: 12.5, lineHeight: 19, color: C.onSurfaceVariant, marginTop: 4 }}>{n.message}</Text>}
                </View>
                {unread && <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.primary, marginTop: 6 }} />}
              </View>
            </Pressable>
          );
          return row;
        })}
      </Sheet>
    </View>
  );
}
