import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Platform, Dimensions, KeyboardAvoidingView, Pressable } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { DarkColors, F } from '../theme';
import { useTheme } from '../context/ThemeContext';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

type Command = {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  action: () => void;
  section: string;
};

interface Props {
  isVisible: boolean;
  onClose: () => void;
  onNavigate: (screen: any) => void;
}

// Reusable spring-scaling row for the commands
function CommandRow({ cmd, onPress, C, styles }: { cmd: Command; onPress: () => void, C: any, styles: any }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      onPressIn={() => { scale.value = withSpring(0.97, { damping: 15, stiffness: 300 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
      onPress={() => {
        if (Platform.OS !== 'web') Haptics.selectionAsync();
        onPress();
      }}
    >
      <Animated.View style={[styles.commandRow, animStyle]}>
        <View style={[styles.iconBox, cmd.section === 'AI' && { backgroundColor: `${C.primary}20` }]}>
          <Icon name={cmd.icon as any} size={20} color={cmd.section === 'AI' ? C.primary : C.onSurfaceVariant} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.commandTitle, cmd.section === 'AI' && { color: C.primary }]}>{cmd.title}</Text>
          {cmd.subtitle && <Text style={styles.commandSubtitle}>{cmd.subtitle}</Text>}
        </View>
        <Icon name="chevron-right" size={20} color={C.outline} />
      </Animated.View>
    </Pressable>
  );
}

import { useAuth } from '../context/AuthContext';

export default function CommandPaletteModal({ isVisible, onClose, onNavigate }: Props) {
  const { C, isDark } = useTheme();
  const styles = React.useMemo(() => getStyles(C), [C]);
  const [query, setQuery] = useState('');
  const { user } = useAuth();

  const COMMANDS: Command[] = [
    { id: '1', title: 'Talk to Rachel AI', subtitle: 'Start a new coaching session', icon: 'auto-awesome', section: 'AI', action: () => { onClose(); onNavigate('Coach'); } },
    { id: '2', title: 'Workout Tracker', subtitle: 'View today\'s AI workout', icon: 'fitness-center', section: 'Quick Actions', action: () => { onClose(); onNavigate('Workout'); } },
    { id: '3', title: 'Recovery & Health', subtitle: 'View sleep, vitals and stress', icon: 'favorite', section: 'Quick Actions', action: () => { onClose(); onNavigate('Recovery'); } },
    { id: '4', title: 'Change Goal', subtitle: `Currently: ${user?.fitnessGoal || 'Not set'}`, icon: 'track-changes', section: 'Quick Actions', action: () => { onClose(); onNavigate('Profile'); } },
    { id: '5', title: 'Smart Calendar', subtitle: 'View AI schedule', icon: 'calendar-month', section: 'Navigation', action: () => { onClose(); onNavigate('Calendar'); } },
    { id: '5a', title: 'Nutrition', subtitle: 'View nutrition targets', icon: 'local-dining', section: 'Navigation', action: () => { onClose(); onNavigate('Nutrition'); } },
    { id: '6', title: 'AI Coach (Chat)', icon: 'chat-bubble-outline', section: 'Navigation', action: () => { onClose(); onNavigate('Coach'); } },
    { id: '7', title: 'Dashboard', icon: 'dashboard', section: 'Navigation', action: () => { onClose(); onNavigate('Dashboard'); } },
    { id: '8', title: 'Progress & Analytics', subtitle: 'View charts and score', icon: 'insights', section: 'Navigation', action: () => { onClose(); onNavigate('Analytics'); } },
    { id: '9', title: 'Settings', icon: 'settings', section: 'System', action: () => { onClose(); onNavigate('Settings'); } },
  ];

  const filtered = COMMANDS.filter(c => 
    c.title.toLowerCase().includes(query.toLowerCase()) || 
    (c.subtitle && c.subtitle.toLowerCase().includes(query.toLowerCase()))
  );

  const grouped = filtered.reduce((acc, curr) => {
    if (!acc[curr.section]) acc[curr.section] = [];
    acc[curr.section].push(curr);
    return acc;
  }, {} as Record<string, Command[]>);

  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={styles.overlay}>
      {/* Deepened background blur to mask the busy dashboard */}
      <BlurView intensity={50} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
      
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.centerContainer, { pointerEvents: 'box-none' as any }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View entering={FadeIn.duration(250)} exiting={FadeOut.duration(200)} style={styles.modal} pointerEvents="auto">
          <BlurView intensity={80} tint={isDark ? "dark" : "light"} style={styles.modalBlur}>
            
            {/* Search Input */}
            <View style={styles.inputContainer}>
              <Icon name="search" size={24} color={C.primary} style={styles.searchIcon} />
              <TextInput
                autoFocus={Platform.OS === 'web'}
                style={styles.input}
                placeholder="What do you want to do?"
                placeholderTextColor={C.onSurfaceVariant}
                value={query}
                onChangeText={setQuery}
                selectionColor={C.primary}
              />
              {Platform.OS === 'web' ? (
                <View style={styles.shortcutBadge}>
                  <Text style={styles.shortcutText}>ESC</Text>
                </View>
              ) : (
                <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Command List */}
            <Animated.ScrollView 
              style={styles.list} 
              contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {Object.entries(grouped).map(([section, cmds]) => (
                <View key={section} style={{ marginBottom: 16 }}>
                  <Text style={styles.sectionTitle}>{section}</Text>
                  {cmds.map(cmd => (
                    <CommandRow key={cmd.id} cmd={cmd} onPress={cmd.action} C={C} styles={styles} />
                  ))}
                </View>
              ))}

              {filtered.length === 0 && (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconBg}>
                    <Icon name="search-off" size={32} color={C.onSurfaceVariant} />
                  </View>
                  <Text style={styles.emptyTitle}>No results found</Text>
                  <Text style={styles.emptySub}>Try searching for "Workout" or "Rachel"</Text>
                </View>
              )}
            </Animated.ScrollView>

          </BlurView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

const getStyles = (C: any) => StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 9999, justifyContent: 'center', alignItems: 'center',
  },
  centerContainer: {
    flex: 1, width: '100%', alignItems: 'center',
    justifyContent: Platform.OS === 'web' ? 'flex-start' : 'center',
    paddingTop: Platform.OS === 'web' ? '12%' : 0,
    paddingHorizontal: 16,
  },
  modal: {
    width: '100%', maxWidth: 600, maxHeight: '55%',
    borderRadius: 24, overflow: 'hidden',
    backgroundColor: C.bg, 
    borderWidth: 1, borderColor: C.outlineVariant,
    ...Platform.select({
      web: { boxShadow: '0px 20px 40px rgba(0,0,0,0.2)' } as any,
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.2, shadowRadius: 40 },
    }),
  },
  modalBlur: { flexShrink: 1, width: '100%' },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: C.outlineVariant,
  },
  searchIcon: { marginRight: 12 },
  input: {
    flex: 1, fontFamily: F.bodyMed, fontSize: 16, color: C.onSurface, minHeight: 48,
    outlineStyle: 'none' as any, // For Web
  },
  cancelBtn: { paddingLeft: 12 },
  cancelText: { fontFamily: F.bodyMed, fontSize: 15, color: C.primary },
  shortcutBadge: { backgroundColor: C.surfaceVariant, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginLeft: 12 },
  shortcutText: { fontFamily: F.header, fontSize: 11, color: C.onSurfaceVariant },
  list: { flexShrink: 1 },
  sectionTitle: { fontFamily: F.header, fontSize: 12, color: C.onSurfaceVariant, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, marginLeft: 8 },
  commandRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, marginBottom: 4, backgroundColor: 'transparent' },
  iconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.surfaceVariant, alignItems: 'center', justifyContent: 'center' },
  commandTitle: { fontFamily: F.bodyBold, fontSize: 15, color: C.onSurface },
  commandSubtitle: { fontFamily: F.body, fontSize: 13, color: C.onSurfaceVariant, marginTop: 2 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyIconBg: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.glassInset, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontFamily: F.header, fontSize: 18, color: C.onSurface },
  emptySub: { fontFamily: F.body, fontSize: 14, color: C.onSurfaceVariant, marginTop: 6 }
});
