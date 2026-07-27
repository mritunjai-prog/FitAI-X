import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, StatusBar as RNStatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from "react-native-reanimated";
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
    "dumbbell": "M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71 3.43 9.14 2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43 1.43 1.43 2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43 1.43-1.43z"
  };
  return paths[name] ? (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d={paths[name]} />
    </Svg>
  ) : null;
}

export default function WorkoutHistoryScreen({ onNavigateBack }: { onNavigateBack: () => void }) {
  const { C } = useTheme();
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
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={{ paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 0) + 12 : 12, paddingBottom: 16, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: C.outlineVariant }}>
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

        {/* List */}
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          {history?.map((session: any, index: number) => (
            <Animated.View key={session.id} entering={FadeInUp.delay(index * 50).springify()} style={{ backgroundColor: C.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: C.outlineVariant }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.header, fontSize: 18, color: C.onSurface, marginBottom: 4 }}>{session.title}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Icon name="calendar" size={14} color={C.onSurfaceVariant} />
                    <Text style={{ fontFamily: F.body, fontSize: 13, color: C.onSurfaceVariant }}>{new Date(session.endTime).toLocaleDateString()} at {new Date(session.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontFamily: F.num, fontSize: 20, color: C.primary }}>{session.duration} <Text style={{ fontSize: 14 }}>min</Text></Text>
                  <Text style={{ fontFamily: F.body, fontSize: 12, color: C.success, marginTop: 4 }}>{session.caloriesBurned} kcal</Text>
                </View>
              </View>

              <View style={{ height: 1, backgroundColor: C.outlineVariant, marginBottom: 16 }} />

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Icon name="dumbbell" size={16} color={C.onSurfaceVariant} />
                <Text style={{ fontFamily: F.bodyBold, fontSize: 13, color: C.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 1 }}>Volume Completed</Text>
              </View>

              {session.exercises.slice(0, 3).map((ex: any, exIdx: number) => {
                const totalReps = ex.sets.reduce((sum: number, s: any) => sum + (s.reps || 0), 0);
                const maxWeight = Math.max(...ex.sets.map((s: any) => s.weight || 0), 0);
                return (
                  <View key={exIdx} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ fontFamily: F.body, fontSize: 14, color: C.onSurface }}>{ex.sets.length}x {ex.name}</Text>
                    <Text style={{ fontFamily: F.bodyMed, fontSize: 14, color: C.onSurfaceVariant }}>{maxWeight}lbs</Text>
                  </View>
                )
              })}
              {session.exercises.length > 3 && (
                <Text style={{ fontFamily: F.body, fontSize: 13, color: C.primary, marginTop: 4 }}>+ {session.exercises.length - 3} more exercises...</Text>
              )}
            </Animated.View>
          ))}

          {!history?.length && (
            <View style={{ alignItems: 'center', marginTop: 48 }}>
              <Icon name="history" size={48} color={C.outline} />
              <Text style={{ fontFamily: F.header, fontSize: 18, color: C.onSurfaceVariant, marginTop: 16 }}>No workout history yet</Text>
              <Text style={{ fontFamily: F.body, fontSize: 14, color: C.outline, marginTop: 8 }}>Complete a workout to see it here</Text>
            </View>
          )}
        </ScrollView>

        {isFilterOpen && (
          <View style={[StyleSheet.absoluteFill, { zIndex: 10 }]}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setIsFilterOpen(false)} />
            <Animated.View entering={FadeInUp.duration(200)} style={{ position: 'absolute', top: Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 0) + 60 : 60, right: 16, backgroundColor: C.surface, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: C.outlineVariant, width: 200, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 15 }}>
              <Text style={{ fontFamily: F.header, fontSize: 14, color: C.onSurface, marginBottom: 12 }}>Filter by Date</Text>
              {['All Time', 'Past Week', 'Past Month'].map(t => (
                <TouchableOpacity key={t} style={{ paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }} onPress={() => { setActiveFilter(t); setIsFilterOpen(false); }}>
                  <Text style={{ fontFamily: F.bodyMed, fontSize: 14, color: activeFilter === t ? C.primary : C.onSurfaceVariant }}>{t}</Text>
                  {activeFilter === t && <Icon name="chevron-left" size={16} color={C.primary} />}
                </TouchableOpacity>
              ))}
              <View style={{ height: 1, backgroundColor: C.outlineVariant, marginVertical: 12 }} />
              <Text style={{ fontFamily: F.header, fontSize: 14, color: C.onSurface, marginBottom: 12 }}>Filter by Goal</Text>
              {['Any', 'Hypertrophy', 'Strength'].map(t => (
                <TouchableOpacity key={t} style={{ paddingVertical: 8 }} onPress={() => setIsFilterOpen(false)}>
                  <Text style={{ fontFamily: F.bodyMed, fontSize: 14, color: C.onSurfaceVariant }}>{t}</Text>
                </TouchableOpacity>
              ))}
            </Animated.View>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}
