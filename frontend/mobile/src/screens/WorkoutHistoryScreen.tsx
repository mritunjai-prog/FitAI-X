import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, StatusBar as RNStatusBar, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp, FadeIn, ZoomIn, ZoomOut, FadeOut } from "react-native-reanimated";
import { BlurView } from 'expo-blur';
import * as Haptics from "expo-haptics";
import Svg, { Path } from "react-native-svg";
import { useQuery } from '@tanstack/react-query';

import { useTheme } from '../context/ThemeContext';
import { F, DarkColors } from "../theme";
import { fetchWorkoutHistory } from '../services/api/workout';

function Icon({ name, size = 24, color = "#fff" }: { name: string; size?: number; color?: string }) {
  const paths: Record<string, string> = {
    "chevron-left": "M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z",
    "filter": "M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z",
    "calendar": "M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z",
    "dumbbell": "M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71 3.43 9.14 2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43 1.43 1.43 2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43 1.43-1.43z",
    "check": "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
  };
  return paths[name] ? (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d={paths[name]} />
    </Svg>
  ) : null;
}

export default function WorkoutHistoryScreen({ onNavigateBack }: { onNavigateBack: () => void }) {
  const { C, isDark } = useTheme();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All Time');
  
  const { data: history, isLoading } = useQuery({ queryKey: ['workoutHistory'], queryFn: () => fetchWorkoutHistory() });

  const haptic = () => { if (Platform.OS !== "web") Haptics.selectionAsync(); };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: C.onSurface, fontFamily: F.body }}>Loading History...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
          <TouchableOpacity onPress={() => { haptic(); onNavigateBack(); }} style={{ padding: 8, backgroundColor: C.glassInset, borderRadius: 12 }}>
            <Icon name="chevron-left" size={24} color={C.onSurface} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={{ fontFamily: F.header, fontSize: 18, color: C.onSurface }}>History</Text>
          </View>
          <TouchableOpacity onPress={() => { haptic(); setIsFilterOpen(true); }} style={{ padding: 8, backgroundColor: C.glassInset, borderRadius: 12 }}>
            <Icon name="filter" size={24} color={C.onSurface} />
          </TouchableOpacity>
        </View>

        {/* Timeline List */}
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          
          {/* The Continuous Timeline Spine */}
          <View style={{ position: 'absolute', top: 40, bottom: 0, left: 35, width: 2, backgroundColor: C.outlineVariant, opacity: 0.5 }} />

          {history?.map((session: any, index: number) => (
            <Animated.View key={session.id} entering={FadeInUp.delay(index * 100).springify()} style={{ flexDirection: 'row', marginBottom: 24 }}>
              
              {/* Timeline Dot */}
              <View style={{ width: 32, alignItems: 'center', marginRight: 16, marginTop: 24 }}>
                <View style={[{ width: 14, height: 14, borderRadius: 7, backgroundColor: C.primary, borderWidth: 3, borderColor: C.bg, zIndex: 2 }, Platform.select({ web: { boxShadow: `0px 0px 8px ${C.primary}99` } as any, default: { shadowColor: C.primary, shadowOpacity: 0.6, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } } })]} />
              </View>

              {/* History Card */}
              <View style={[{ flex: 1, backgroundColor: C.surface, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: C.outlineVariant }, Platform.select({ web: { boxShadow: '0px 8px 16px rgba(0,0,0,0.2)' } as any, default: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16 } })]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: F.header, fontSize: 19, color: C.onSurface, marginBottom: 4, letterSpacing: -0.3 }}>{session.title}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Icon name="calendar" size={14} color={C.onSurfaceVariant} />
                      <Text style={{ fontFamily: F.bodyMed, fontSize: 13, color: C.onSurfaceVariant }}>{new Date(session.endTime).toLocaleDateString()} • {new Date(session.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 }}>
                    <Text style={{ fontFamily: F.num, fontSize: 18, color: C.primary }}>{session.duration} <Text style={{ fontSize: 12, color: C.onSurfaceVariant }}>m</Text></Text>
                  </View>
                </View>

                <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginBottom: 16 }} />

                {session.exercises.slice(0, 3).map((ex: any, exIdx: number) => {
                  const maxWeight = Math.max(...ex.sets.map((s: any) => s.weight || 0), 0);
                  return (
                    <View key={exIdx} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                      <Text style={{ fontFamily: F.bodyMed, fontSize: 14, color: C.onSurface }}>
                        <Text style={{ color: C.onSurfaceVariant }}>{ex.sets.length}x</Text> {ex.name}
                      </Text>
                      <Text style={{ fontFamily: F.num, fontSize: 14, color: C.primary }}>{maxWeight} <Text style={{ fontSize: 11, color: C.onSurfaceVariant }}>lbs</Text></Text>
                    </View>
                  )
                })}
              </View>
            </Animated.View>
          ))}
        </ScrollView>

        {/* Elite Glass Filter Modal */}
        {isFilterOpen && (
          <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={[StyleSheet.absoluteFill, { zIndex: 100 }]}>
            <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsFilterOpen(false)} />
            
            <Animated.View entering={ZoomIn.duration(250).springify().damping(20)} exiting={ZoomOut.duration(200)} style={[{ position: 'absolute', top: Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 0) + 70 : 70, right: 20, width: 220, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }, Platform.select({ web: { boxShadow: '0px 20px 30px rgba(0,0,0,0.5)' } as any, default: { shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.5, shadowRadius: 30 } })]}>
              <BlurView intensity={80} tint={isDark ? "dark" : "light"} style={{ padding: 20 }}>
                <Text style={{ fontFamily: F.header, fontSize: 12, color: C.onSurfaceVariant, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Timeframe</Text>
                {['All Time', 'Past Week', 'Past Month'].map(t => (
                  <TouchableOpacity key={t} style={{ paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }} onPress={() => { setActiveFilter(t); setIsFilterOpen(false); }}>
                    <Text style={{ fontFamily: F.bodyBold, fontSize: 15, color: activeFilter === t ? C.primary : C.onSurface }}>{t}</Text>
                    {activeFilter === t && <Icon name="check" size={18} color={C.primary} />}
                  </TouchableOpacity>
                ))}
              </BlurView>
            </Animated.View>
          </Animated.View>
        )}
      </SafeAreaView>
    </View>
  );
}
