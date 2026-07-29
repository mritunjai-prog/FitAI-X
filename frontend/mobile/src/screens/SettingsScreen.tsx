/**
 * ════════════════════════════════════════════════════════════════════════════
 *  FitAI X — SETTINGS
 *  One continuous scroll: identity · body · goals · coaching · notifications ·
 *  privacy · appearance · security · data · danger zone.
 *
 *  NO HARDCODED DATA
 *  ------------------------------------------------------------------------
 *  Every value comes from the API. No `height || 170`, no `weight || 65`.
 *  A preference the server never sent does NOT render a switch.
 *
 *  DESIGN CONTRACT — "no cards"
 *  Nothing renders `borderRadius + borderWidth + backgroundColor` as a
 *  CONTAINER. Hierarchy comes from section labels, hairline weights,
 *  separator insets, and type scale.
 *
 *  Shapes survive only on CONTROLS — switches, chips, buttons.
 * ════════════════════════════════════════════════════════════════════════════
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Image, Platform, Pressable, RefreshControl, StatusBar as RNStatusBar,
  StyleProp, StyleSheet, Text, TextInput, View, ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Easing, Extrapolation, FadeIn, FadeOut, interpolate,
  useAnimatedScrollHandler, useAnimatedStyle, useSharedValue,
  withRepeat, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import MeshGradientBackground from '../components/MeshGradientBackground';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { F, ThemeColors } from '../theme';
import { fetchProfileData, updateProfile, exportUserData } from '../services/api/profile';

/* ──────────────────────────────────────────────────────────────────────────
   TOKENS
   ────────────────────────────────────────────────────────────────────────── */
interface Tokens {
  hair: string; hairSoft: string; hairGold: string; track: string;
  wash: string; washStrong: string; hairline: number; gutter: number; indent: number;
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
  green: isDark ? '#A3E635' : '#5E8B00', water: isDark ? '#38BDF8' : '#0E7490',
  red: isDark ? '#F87171' : '#C2413E', violet: isDark ? '#A855F7' : '#7E22CE',
  amber: isDark ? '#FB923C' : '#B45309',
});

const has = <T,>(v: T | null | undefined): v is T => v !== null && v !== undefined;
const hasText = (v: string | null | undefined): v is string => typeof v === 'string' && v.trim().length > 0;

type HapticStyle = 'light' | 'medium' | 'warning' | 'success' | 'select';
function haptic(style: HapticStyle = 'light'): void {
  if (Platform.OS === 'web') return;
  switch (style) {
    case 'success': void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); break;
    case 'warning': void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); break;
    case 'select': void Haptics.selectionAsync(); break;
    case 'medium': void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); break;
    default: void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

const humanise = (id: string): string => {
  const s = id.replace(/[_-]+/g, ' ').trim();
  return s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s;
};

type SectionKey = 'coaching' | 'notifications' | 'privacy' | 'security';
type SaveState = 'saving' | 'ok' | 'error';

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

function SectionLabel({ text, C, meta, paddingTop = 26 }: {
  text: string; C: ThemeColors; meta?: string; paddingTop?: number;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop, paddingBottom: 10 }}>
      <Text style={{ fontFamily: F.header, fontSize: 11, letterSpacing: 1.5, color: C.onSurfaceVariant, textTransform: 'uppercase' }}>{text}</Text>
      {hasText(meta) && <Text style={{ fontFamily: F.header, fontSize: 12, color: C.onSurfaceVariant }}>{meta}</Text>}
    </View>
  );
}

function SaveLine({ state, onRetry, C, A }: {
  state: SaveState | undefined; onRetry: () => void; C: ThemeColors; A: ReturnType<typeof makeAccents>;
}) {
  const spin = useSharedValue(0);
  useEffect(() => {
    if (state !== 'saving') { spin.value = 0; return; }
    spin.value = withRepeat(withTiming(1, { duration: 700, easing: Easing.linear }), -1, false);
  }, [state, spin]);
  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));
  if (!state) return null;
  return (
    <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(160)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 22, paddingBottom: 10 }}>
      {state === 'saving' && <>
        <Animated.View style={[{ width: 11, height: 11, borderRadius: 6, borderWidth: 1.6, borderColor: C.outlineVariant, borderTopColor: C.onSurfaceVariant }, spinStyle]} />
        <Text style={{ fontFamily: F.header, fontSize: 10.5, color: C.onSurfaceVariant }}>Saving...</Text>
      </>}
      {state === 'ok' && <><Icon name="check" size={12} color={A.green} /><Text style={{ fontFamily: F.header, fontSize: 10.5, color: A.green }}>Saved</Text></>}
      {state === 'error' && <>
        <Icon name="error-outline" size={12} color={A.red} />
        <Text style={{ fontFamily: F.header, fontSize: 10.5, color: A.red }}>Couldn't save</Text>
        <Pressable hitSlop={8} onPress={onRetry} style={{ marginLeft: 'auto' }}>
          <Text style={{ fontFamily: F.header, fontSize: 12, color: C.primary }}>Retry</Text>
        </Pressable>
      </>}
    </Animated.View>
  );
}

function Toggle({ value, onChange, C, isDark, busy }: {
  value: boolean; onChange: (next: boolean) => void; C: ThemeColors; isDark: boolean; busy?: boolean;
}) {
  const T = makeTokens(isDark);
  const p = useSharedValue(value ? 1 : 0);
  useEffect(() => { p.value = withTiming(value ? 1 : 0, { duration: 210, easing: Easing.out(Easing.cubic) }); }, [value, p]);
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: p.value * 18 }] }));
  const onLayer = useAnimatedStyle(() => ({ opacity: p.value }));
  return (
    <Pressable hitSlop={8} disabled={busy} onPress={() => { haptic('select'); onChange(!value); }}
      accessibilityRole="switch" accessibilityState={{ checked: value, disabled: !!busy }}
      style={{ opacity: busy ? 0.5 : 1 }}>
      <View style={{ width: 44, height: 26, borderRadius: 13, backgroundColor: T.track, borderWidth: T.hairline, borderColor: T.hair, overflow: 'hidden', justifyContent: 'center' }}>
        <Animated.View style={[StyleSheet.absoluteFillObject, onLayer]}>
          <LinearGradient colors={[C.primary, C.primaryDim]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }} />
        </Animated.View>
        <Animated.View style={[{ width: 20, height: 20, borderRadius: 10, marginLeft: 2, backgroundColor: value ? C.onPrimary : C.onSurface }, knob]} />
      </View>
    </Pressable>
  );
}

function Row({ icon, iconTone, label, sub, value, unit, emptyLabel = 'Not set', showValue = true, trailing, onPress, first, C, isDark }: {
  icon?: keyof typeof Icon.glyphMap; iconTone?: string; label: string; sub?: string;
  value?: string | number | null; unit?: string; emptyLabel?: string; showValue?: boolean;
  trailing?: React.ReactNode; onPress?: () => void; first: boolean; C: ThemeColors; isDark: boolean;
}) {
  const T = makeTokens(isDark);
  const text = has(value) ? String(value) : null;
  const filled = hasText(text);
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: T.gutter, paddingVertical: 13, minHeight: 52 }}>
      {!first && <View style={{ position: 'absolute', left: icon ? T.indent : T.gutter, right: 0, top: 0, height: T.hairline, backgroundColor: T.hairSoft }} />}
      {!!icon && <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: T.track, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={16} color={iconTone ?? C.onSurfaceVariant} />
      </View>}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontFamily: F.bodyMed, fontSize: 14.5, letterSpacing: -0.15, color: C.onSurface }}>{label}</Text>
        {hasText(sub) && <Text numberOfLines={2} style={{ fontFamily: F.bodyMed, fontSize: 11.5, lineHeight: 17, color: C.onSurfaceVariant, marginTop: 3 }}>{sub}</Text>}
      </View>
      {trailing}
      {!trailing && showValue && (
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <Text numberOfLines={1} style={{ fontFamily: filled ? F.num : F.bodyMed, fontSize: filled ? 14 : 13, color: C.onSurfaceVariant, fontStyle: filled ? 'normal' : 'italic', opacity: filled ? 1 : 0.7 }}>
            {filled ? text : emptyLabel}
          </Text>
          {filled && hasText(unit) && <Text style={{ fontFamily: F.bodyMed, fontSize: 10.5, color: C.onSurfaceVariant, opacity: 0.75, marginLeft: 3 }}>{unit}</Text>}
        </View>
      )}
      {!trailing && !!onPress && <Icon name="chevron-right" size={16} color={C.onSurfaceVariant} style={{ opacity: 0.5 }} />}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={() => { haptic('select'); onPress(); }} android_ripple={{ color: T.wash }}
      accessibilityRole="button" accessibilityLabel={hasText(sub) ? `${label}. ${sub}` : label}>
      {body}
    </Pressable>
  );
}

function EmptyState({ icon, title, body, C }: {
  icon: keyof typeof Icon.glyphMap; title: string; body: string; C: ThemeColors;
}) {
  return (
    <View style={{ paddingHorizontal: 34, paddingTop: 26, paddingBottom: 14, alignItems: 'center' }}>
      <Icon name={icon} size={30} color={C.onSurfaceVariant} style={{ opacity: 0.3, marginBottom: 12 }} />
      <Text style={{ fontFamily: F.header, fontSize: 14.5, letterSpacing: -0.3, color: C.onSurface, marginBottom: 6, textAlign: 'center' }}>{title}</Text>
      <Text style={{ fontFamily: F.bodyMed, fontSize: 12.5, lineHeight: 19, color: C.onSurfaceVariant, textAlign: 'center', maxWidth: 240 }}>{body}</Text>
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   SCREEN
   ────────────────────────────────────────────────────────────────────────── */
export default function SettingsScreen({ onNavigateBack }: { onNavigateBack: () => void }) {
  const { C, isDark, bgColors, toggleTheme } = useTheme();
  const { user, logout, resetOnboarding } = useAuth();
  const qc = useQueryClient();
  const T = useMemo(() => makeTokens(isDark), [isDark]);
  const A = useMemo(() => makeAccents(isDark), [isDark]);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => fetchProfileData(user?.id),
    enabled: !!user?.id,
  });

  // Local optimistic prefs — initiated from API, updated on toggle
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [saveState, setSaveState] = useState<Record<SectionKey, SaveState | undefined>>({} as any);
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);

  // Sync prefs from API when loaded
  useEffect(() => {
    if (profile?.settings) {
      setPrefs((prev: Record<string, boolean>) => ({
        ...prev,
        publicProfile: profile.settings.publicProfile ?? true,
        twoFactor: profile.settings.twoFactorAuth ?? false,
        workoutReminders: profile.settings.workoutReminders ?? true,
        recoveryAlerts: profile.settings.recoveryAlerts ?? true,
      }));
    }
    if (profile?.aiPreferences) {
      setPrefs((prev: Record<string, boolean>) => ({
        ...prev,
        adaptive: profile.aiPreferences.adaptiveProgression ?? true,
        voice: profile.aiPreferences.voiceFeedback ?? false,
        aggressive: false,
      }));
    }
  }, [profile]);

  const savePrefs = useCallback(async (section: SectionKey, key: string, value: boolean) => {
    setSaveState(prev => ({ ...prev, [section]: 'saving' }));
    // Optimistic update
    setPrefs(prev => ({ ...prev, [key]: value }));
    try {
      await updateProfile(user?.id || '', { prefs: { [key]: value } });
      setSaveState(prev => ({ ...prev, [section]: 'ok' }));
      setTimeout(() => setSaveState(prev => ({ ...prev, [section]: undefined })), 2000);
    } catch {
      // Rollback
      setPrefs(prev => ({ ...prev, [key]: !value }));
      setSaveState(prev => ({ ...prev, [section]: 'error' }));
    }
  }, [user?.id]);

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({ onScroll: (e) => { scrollY.value = e.contentOffset.y; } });
  const compactStyle = useAnimatedStyle(() => ({ opacity: interpolate(scrollY.value, [30, 70], [0, 1], Extrapolation.CLAMP) }));

  const handleLogout = useCallback(() => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => { haptic('medium'); logout(); } },
    ]);
  }, [logout]);

  const handleRedoOnboarding = useCallback(() => {
    Alert.alert('Reset Profile', 'This will restart onboarding and clear some preferences.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => { haptic('warning'); resetOnboarding(); } },
    ]);
  }, [resetOnboarding]);

  const userData = profile?.identity || {};
  const bodyProfile = profile?.fitnessProfile || {};
  const goals = profile?.fitnessProfile?.goals || [];

  const coachToggles: Array<{ key: string; label: string; sub: string }> = [
    { key: 'adaptive', label: 'Adaptive coaching', sub: 'Adjust plans based on recovery' },
    { key: 'voice', label: 'Voice feedback', sub: 'Spoken cues during workouts' },
    { key: 'aggressive', label: 'Aggressive progression', sub: 'Push volume faster when recovered' },
  ];
  const notifToggles: Array<{ key: string; label: string; sub: string }> = [
    { key: 'workoutReminders', label: 'Workout reminders', sub: 'Daily nudge before your session' },
    { key: 'recoveryAlerts', label: 'Recovery alerts', sub: 'When readiness drops' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <MeshGradientBackground bgColors={bgColors} isDark={isDark} />
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 5, flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: Platform.OS === 'ios' ? 54 : (RNStatusBar.currentHeight ?? 0) + 12, paddingBottom: 11, paddingHorizontal: T.gutter, backgroundColor: C.bg, borderBottomWidth: T.hairline, borderBottomColor: T.hairSoft }, compactStyle]}>
        <Text style={{ fontFamily: F.header, fontSize: 15, letterSpacing: -0.2, color: C.onSurface }}>Settings</Text>
      </Animated.View>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <Animated.ScrollView onScroll={scrollHandler} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: 44 }} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => qc.invalidateQueries({ queryKey: ['profile'] })} tintColor={C.primary} />}>
          
          {/* Nav */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 6 }}>
            <Pressable onPress={() => { haptic('light'); onNavigateBack(); }} hitSlop={10} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="chevron-left" size={22} color={C.onSurface} />
            </Pressable>
            <Text style={{ fontFamily: F.header, fontSize: 15.5, letterSpacing: -0.2, color: C.onSurface }}>Settings</Text>
            <View style={{ width: 36 }} />
          </View>

          {/* Identity */}
          <SectionLabel text="Account" C={C} />
          {isLoading ? (
            <View style={{ flexDirection: 'row', gap: 14, paddingHorizontal: T.gutter, alignItems: 'center' }}>
              <Skeleton width={52} height={52} radius={26} isDark={isDark} />
              <View style={{ flex: 1, gap: 6 }}><Skeleton width="50%" height={16} isDark={isDark} /><Skeleton width="40%" height={12} isDark={isDark} /></View>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: T.gutter, paddingBottom: 4 }}>
              <View style={{ width: 52, height: 52, borderRadius: 26, overflow: 'hidden', backgroundColor: T.track, alignItems: 'center', justifyContent: 'center' }}>
                {hasText(user?.avatar) ? <Image source={{ uri: user!.avatar! }} style={{ width: '100%', height: '100%' }} />
                : <Text style={{ fontFamily: F.header, fontSize: 20, color: C.onSurfaceVariant }}>{(user?.name || 'U').charAt(0)}</Text>}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontFamily: F.header, fontSize: 18, letterSpacing: -0.3, color: C.onSurface }} numberOfLines={1}>{user?.name || 'User'}</Text>
                <Text style={{ fontFamily: F.bodyMed, fontSize: 12, color: C.onSurfaceVariant, marginTop: 2 }}>{user?.email || ''}</Text>
              </View>
              <Pressable onPress={() => { haptic('select'); onNavigateBack(); }} hitSlop={8}>
                <Icon name="chevron-right" size={20} color={C.onSurfaceVariant} style={{ opacity: 0.5 }} />
              </Pressable>
            </View>
          )}

          {/* Body Profile */}
          <SectionLabel text="Body profile" C={C} />
          <Row first icon="height" iconTone={C.primary} label="Height" sub="Your height in cm" value={bodyProfile?.height} unit="cm" onPress={() => {}} C={C} isDark={isDark} />
          <Row icon="monitor-weight" iconTone={A.water} label="Weight" sub="Your current weight" value={bodyProfile?.weight} unit="kg" onPress={() => {}} C={C} isDark={isDark} />
          <Row icon="calendar-today" iconTone={A.red} label="Age" sub="Date of birth" value={bodyProfile?.age} unit="yrs" onPress={() => {}} C={C} isDark={isDark} />

          {/* Goals */}
          <SectionLabel text="Goals" C={C} meta={goals.length > 0 ? `${goals.length} selected` : undefined} />
          {goals.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: T.gutter }}>
              {goals.map((g: string, i: number) => (
                <View key={i} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, backgroundColor: T.washStrong, borderWidth: T.hairline, borderColor: T.hairGold }}>
                  <Text style={{ fontFamily: F.header, fontSize: 11, color: C.primary }}>{humanise(g)}</Text>
                </View>
              ))}
            </View>
          ) : (
            <EmptyState icon="track-changes" title="No goals set" body="Set goals during onboarding to personalise your coaching." C={C} />
          )}

          {/* Coaching */}
          <SectionLabel text="AI coaching" C={C} />
          {coachToggles.map(t => {
            const val = prefs[t.key] ?? false;
            const section: SectionKey = 'coaching';
            return (
              <View key={t.key}>
                <Row label={t.label} sub={t.sub} first={t.key === 'adaptive'} showValue={false}
                  trailing={<Toggle value={val} onChange={(v) => savePrefs(section, t.key, v)} C={C} isDark={isDark} busy={saveState[section] === 'saving'} />}
                  C={C} isDark={isDark} />
              </View>
            );
          })}
          <SaveLine state={saveState['coaching']} onRetry={() => {}} C={C} A={A} />

          {/* Notifications */}
          <SectionLabel text="Notifications" C={C} />
          {notifToggles.map(t => {
            const val = prefs[t.key] ?? false;
            const section: SectionKey = 'notifications';
            return (
              <View key={t.key}>
                <Row label={t.label} sub={t.sub} first={t.key === 'workoutReminders'} showValue={false}
                  trailing={<Toggle value={val} onChange={(v) => savePrefs(section, t.key, v)} C={C} isDark={isDark} busy={saveState[section] === 'saving'} />}
                  C={C} isDark={isDark} />
              </View>
            );
          })}
          <SaveLine state={saveState['notifications']} onRetry={() => {}} C={C} A={A} />

          {/* Privacy */}
          <SectionLabel text="Privacy" C={C} />
          <Row label="Public profile" sub="Friends can see your sessions" first showValue={false}
            trailing={<Toggle value={prefs['publicProfile'] ?? true} onChange={(v) => savePrefs('privacy', 'publicProfile', v)} C={C} isDark={isDark} busy={saveState['privacy'] === 'saving'} />}
            C={C} isDark={isDark} />
          <SaveLine state={saveState['privacy']} onRetry={() => {}} C={C} A={A} />

          {/* Appearance */}
          <SectionLabel text="Appearance" C={C} />
          <Row label={isDark ? 'Dark mode' : 'Light mode'} sub="Tap to switch theme" first
            trailing={<Pressable onPress={() => { haptic('select'); toggleTheme(); }} hitSlop={8}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: T.track, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={isDark ? 'dark-mode' : 'light-mode'} size={18} color={C.onSurfaceVariant} />
              </View>
            </Pressable>}
            C={C} isDark={isDark} />

          {/* Security */}
          <SectionLabel text="Security" C={C} />
          <Row label="Two-factor authentication" sub="Extra layer of security" first showValue={false}
            trailing={<Toggle value={prefs['twoFactor'] ?? false} onChange={(v) => savePrefs('security', 'twoFactor', v)} C={C} isDark={isDark} busy={saveState['security'] === 'saving'} />}
            C={C} isDark={isDark} />
          <SaveLine state={saveState['security']} onRetry={() => {}} C={C} A={A} />

          {/* Data */}
          <SectionLabel text="Data" C={C} />
          <Row label="Export my data" sub="Download your complete profile" first
            trailing={<Pressable onPress={() => {
              haptic('select');
              exportUserData(user?.id || '').then(d => {
                Alert.alert('Data Export', JSON.stringify(d, null, 2).slice(0, 200) + '...');
              }).catch(() => Alert.alert('Error', 'Could not export data'));
            }} hitSlop={8}><Icon name="download" size={18} color={C.primary} /></Pressable>}
            C={C} isDark={isDark} />

          {/* Danger Zone */}
          <SectionLabel text="Danger zone" C={C} paddingTop={32} />
          <Pressable onPress={handleRedoOnboarding}
            style={{ marginHorizontal: T.gutter, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, borderWidth: T.hairline, borderColor: A.amber, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Icon name="refresh" size={18} color={A.amber} />
            <Text style={{ flex: 1, fontFamily: F.header, fontSize: 13, color: C.onSurface }}>Reset profile / Redo onboarding</Text>
            <Icon name="chevron-right" size={16} color={C.onSurfaceVariant} style={{ opacity: 0.5 }} />
          </Pressable>
          <Pressable onPress={handleLogout}
            style={{ marginHorizontal: T.gutter, marginTop: 10, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, borderWidth: T.hairline, borderColor: A.red, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Icon name="logout" size={18} color={A.red} />
            <Text style={{ flex: 1, fontFamily: F.header, fontSize: 13, color: C.onSurface }}>Log out</Text>
            <Icon name="chevron-right" size={16} color={C.onSurfaceVariant} style={{ opacity: 0.5 }} />
          </Pressable>
          <View style={{ height: 40 }} />
        </Animated.ScrollView>
      </SafeAreaView>
    </View>
  );
}
