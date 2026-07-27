import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';

import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import MeshGradientBackground from '../components/MeshGradientBackground';
import { fetchProfileData } from '../services/api/profile';

// Helper: Toggles
function SettingToggle({ label, sub, value, onValueChange, C }: any) {
  return (
    <View style={S(C).row}>
      <View style={{ flex: 1 }}>
        <Text style={S(C).rowLabel}>{label}</Text>
        {sub && <Text style={S(C).rowSub}>{sub}</Text>}
      </View>
      <Switch 
        value={value} 
        onValueChange={(v) => { Haptics.selectionAsync(); onValueChange(v); }}
        trackColor={{ false: C.glassInset, true: C.primary }}
        thumbColor={Platform.OS === 'ios' ? '#fff' : value ? '#fff' : '#f4f3f4'}
      />
    </View>
  );
}

// Helper: Action Row
function SettingRow({ label, sub, icon, onPress, C, rightText }: any) {
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress?.(); }} style={[S(C).row, { paddingVertical: 14 }]}>
      {icon && <View style={S(C).rowIcon}>{icon}</View>}
      <View style={{ flex: 1, paddingLeft: icon ? 12 : 0 }}>
        <Text style={S(C).rowLabel}>{label}</Text>
        {sub && <Text style={S(C).rowSub}>{sub}</Text>}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {rightText && <Text style={S(C).rowRightText}>{rightText}</Text>}
        <Icon name="chevron-right" size={20} color={C.outlineVariant} />
      </View>
    </TouchableOpacity>
  );
}

export default function SettingsScreen({ onNavigateBack }: { onNavigateBack: () => void }) {
  const { isDark, C, bgColors, toggleTheme } = useTheme();
  const { user, logout, resetOnboarding } = useAuth();
  const styles = useMemo(() => S(C), [C]);

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => fetchProfileData(user?.id),
    enabled: !!user?.id,
  });

  const [aiPrefs, setAiPrefs] = useState({ adaptive: true, voice: false, aggressive: false });
  const [notifPrefs, setNotifPrefs] = useState({ workout: true, recovery: true, social: false });
  const [privacyPrefs, setPrivacyPrefs] = useState({ public: true, share: false });

  return (
    <View style={styles.container}>
      <MeshGradientBackground bgColors={bgColors} isDark={isDark} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onNavigateBack(); }} style={styles.backBtn}>
            <Icon name="arrow-back" size={24} color={C.onSurface} />
          </TouchableOpacity>
          <Text style={styles.title}>Profile & Settings</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          
          {/* Personal Info Hero */}
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.heroCard}>
            <BlurView intensity={isDark ? 40 : 80} tint={C.blurTint} style={StyleSheet.absoluteFillObject} />
            <View style={styles.heroAvatar}>
              <Text style={styles.heroAvatarTxt}>{user?.name?.charAt(0) || 'P'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroName}>{user?.name || 'Loading...'}</Text>
              <Text style={styles.heroEmail}>{user?.email || ''}</Text>
            </View>
            <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); resetOnboarding(); }} style={styles.editBtn}>
              <Icon name="edit" size={16} color={C.onSurfaceVariant} />
            </TouchableOpacity>
          </Animated.View>

          {/* Fitness Profile */}
          <Animated.View entering={FadeInDown.delay(150).springify()}>
            <Text style={styles.sectionTitle}>FITNESS PROFILE</Text>
            <View style={styles.group}>
              <BlurView intensity={isDark ? 30 : 60} tint={C.blurTint} style={StyleSheet.absoluteFillObject} />
              <SettingRow label="Height" sub="Update your height" rightText={`${profile?.fitnessProfile?.height || 170} cm`} C={C} icon={<Icon name="height" size={16} color={C.primary} />} />
              <View style={styles.divider} />
              <SettingRow label="Weight" sub="Last logged today" rightText={`${profile?.fitnessProfile?.weight || 65} kg`} C={C} icon={<Icon name="monitor-weight" size={16} color={C.cyan} />} />
              <View style={styles.divider} />
              <SettingRow label="Age" sub="Date of birth" rightText={`${profile?.fitnessProfile?.age || 25}`} C={C} icon={<Icon name="calendar-today" size={16} color={C.error} />} />
            </View>
          </Animated.View>

          {/* Goals */}
          <Animated.View entering={FadeInDown.delay(200).springify()}>
            <Text style={styles.sectionTitle}>GOALS</Text>
            <View style={[styles.group, { padding: 12 }]}>
              <BlurView intensity={isDark ? 30 : 60} tint={C.blurTint} style={StyleSheet.absoluteFillObject} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {profile?.fitnessProfile?.goals?.map((g: string, i: number) => (
                  <View key={i} style={styles.chipActive}><Text style={styles.chipTxtActive}>{g.replace(/_/g, ' ')}</Text></View>
                ))}
              </View>
            </View>
          </Animated.View>

          {/* AI Preferences */}
          <Animated.View entering={FadeInDown.delay(250).springify()}>
            <Text style={styles.sectionTitle}>AI PREFERENCES</Text>
            <View style={styles.group}>
              <BlurView intensity={isDark ? 30 : 60} tint={C.blurTint} style={StyleSheet.absoluteFillObject} />
              <SettingToggle label="Adaptive Coaching" sub="Adjust plans based on recovery" value={aiPrefs.adaptive} onValueChange={(v: boolean) => setAiPrefs(p => ({...p, adaptive: v}))} C={C} />
              <View style={styles.divider} />
              <SettingToggle label="Voice Feedback" sub="Spoken cues during workouts" value={aiPrefs.voice} onValueChange={(v: boolean) => setAiPrefs(p => ({...p, voice: v}))} C={C} />
              <View style={styles.divider} />
              <SettingToggle label="Aggressive Progression" sub="Push volume faster when recovered" value={aiPrefs.aggressive} onValueChange={(v: boolean) => setAiPrefs(p => ({...p, aggressive: v}))} C={C} />
            </View>
          </Animated.View>

          {/* Notifications */}
          <Animated.View entering={FadeInDown.delay(300).springify()}>
            <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>
            <View style={styles.group}>
              <BlurView intensity={isDark ? 30 : 60} tint={C.blurTint} style={StyleSheet.absoluteFillObject} />
              <SettingToggle label="Workout Reminders" sub="Daily nudge at 6:00 PM" value={notifPrefs.workout} onValueChange={(v: boolean) => setNotifPrefs(p => ({...p, workout: v}))} C={C} />
              <View style={styles.divider} />
              <SettingToggle label="Recovery Alerts" sub="When readiness drops" value={notifPrefs.recovery} onValueChange={(v: boolean) => setNotifPrefs(p => ({...p, recovery: v}))} C={C} />
            </View>
          </Animated.View>

          {/* Theme Preferences */}
          <Animated.View entering={FadeInDown.delay(325).springify()}>
            <Text style={styles.sectionTitle}>THEME PREFERENCES</Text>
            <View style={styles.group}>
              <BlurView intensity={isDark ? 30 : 60} tint={C.blurTint} style={StyleSheet.absoluteFillObject} />
              <SettingRow 
                label={isDark ? "Dark Mode" : "Light Mode"} 
                sub="Tap to switch theme" 
                C={C} 
                icon={<Icon name={isDark ? "dark-mode" : "light-mode"} size={16} color={C.primary} />} 
                onPress={toggleTheme}
              />
            </View>
          </Animated.View>

          {/* Security */}
          <Animated.View entering={FadeInDown.delay(350).springify()}>
            <Text style={styles.sectionTitle}>SECURITY</Text>
            <View style={styles.group}>
              <BlurView intensity={isDark ? 30 : 60} tint={C.blurTint} style={StyleSheet.absoluteFillObject} />
              <SettingRow label="Change Password" C={C} icon={<Icon name="lock" size={16} color={C.primary} />} />
              <View style={styles.divider} />
              <SettingToggle label="Two-Factor Authentication" sub="Extra layer of security" value={true} onValueChange={() => {}} C={C} />
            </View>
          </Animated.View>

          {/* Logout */}
          <Animated.View entering={FadeInDown.delay(400).springify()}>
            <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); logout(); }} style={styles.logoutBtn}>
              <Icon name="logout" size={20} color={C.error} />
              <Text style={styles.logoutTxt}>Log Out</Text>
            </TouchableOpacity>
          </Animated.View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const S = (C: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16 },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: C.glassInset },
  title: { fontSize: 20, fontFamily: 'SpaceGrotesk_700Bold', color: C.onSurface },
  
  heroCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.surface, borderRadius: 20, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: C.outlineVariant, overflow: 'hidden' },
  heroAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  heroAvatarTxt: { fontSize: 24, fontFamily: 'SpaceGrotesk_700Bold', color: C.onPrimary },
  heroName: { fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold', color: C.onSurface },
  heroEmail: { fontSize: 13, fontFamily: 'Inter_500Medium', color: C.onSurfaceVariant, marginTop: 2 },
  proBadge: { backgroundColor: `${C.primary}22`, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start', marginTop: 8 },
  proBadgeTxt: { fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', color: C.primary, letterSpacing: 0.5 },
  editBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: C.glassInset, alignItems: 'center', justifyContent: 'center' },

  sectionTitle: { fontSize: 11, fontFamily: 'SpaceGrotesk_700Bold', color: C.onSurfaceVariant, letterSpacing: 1, marginLeft: 8, marginBottom: 8, marginTop: 16 },
  group: { backgroundColor: C.surface, borderRadius: 20, borderWidth: 1, borderColor: C.outlineVariant, overflow: 'hidden' },
  divider: { height: 1, backgroundColor: C.outlineVariant, opacity: 0.5 },
  
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  rowIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: C.glassInset, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: C.onSurface },
  rowSub: { fontSize: 12, fontFamily: 'Inter_400Regular', color: C.onSurfaceVariant, marginTop: 2 },
  rowRightText: { fontSize: 14, fontFamily: 'Inter_500Medium', color: C.onSurfaceVariant },

  chipActive: { backgroundColor: C.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
  chipTxtActive: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: C.onPrimary, textTransform: 'capitalize' },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: `${C.error}15`, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: `${C.error}33`, marginTop: 32, marginBottom: 40 },
  logoutTxt: { fontSize: 15, fontFamily: 'SpaceGrotesk_700Bold', color: C.error }
});
