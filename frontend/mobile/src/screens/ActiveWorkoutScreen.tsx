import React, { useState, useMemo, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, StatusBar as RNStatusBar, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp, SlideInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import Svg, { Path } from "react-native-svg";
import { useQuery, useMutation } from '@tanstack/react-query';

import { useTheme } from '../context/ThemeContext';
import { F, DarkColors } from "../theme";
import MeshGradientBackground from "../components/MeshGradientBackground";
import { fetchCurrentWorkout, startSession, completeSession } from '../services/api/workout';

function Icon({ name, size = 24, color = "#fff" }: { name: string; size?: number; color?: string }) {
  const paths: Record<string, string> = {
    "chevron-left": "M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z",
    "check": "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
    "timer": "M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.03-6.61l1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42A8.962 8.962 0 0012 4c-4.97 0-9 4.03-9 9s4.02 9 9 9 9-4.03 9-9c0-2.12-.74-4.07-1.97-5.61zM12 20c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"
  };
  return paths[name] ? (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d={paths[name]} />
    </Svg>
  ) : null;
}

export default function ActiveWorkoutScreen({ onFinish }: { onFinish: () => void }) {
  const { C } = useTheme();
  
  const { data: template } = useQuery({ queryKey: ['currentWorkout'], queryFn: () => fetchCurrentWorkout() });
  
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  
  const startMutation = useMutation({
    mutationFn: startSession,
    onSuccess: (data) => {
      setSessionId(data.id);
      setStartTime(new Date(data.startTime));
    }
  });

  const completeMutation = useMutation({
    mutationFn: completeSession,
    onSuccess: () => {
      onFinish();
    }
  });

  const activeTemplate = template || {
    id: 'mock-workout-id',
    title: 'Push Strength',
    exercises: [
      { id: 'm1', name: 'Barbell Bench Press', sets: 4, reps: 8, weight: 80 },
      { id: 'm2', name: 'Incline Dumbbell Press', sets: 3, reps: 10, weight: 30 },
      { id: 'm3', name: 'Overhead Press', sets: 3, reps: 10, weight: 45 },
      { id: 'm4', name: 'Lateral Raises', sets: 4, reps: 15, weight: 12 },
      { id: 'm5', name: 'Tricep Pushdown', sets: 3, reps: 12, weight: 25 },
    ]
  };

  useEffect(() => {
    if (activeTemplate && !sessionId && !startMutation.isPending) {
      startMutation.mutate({
        userId: 'demo-user-id',
        workoutId: activeTemplate.id,
        title: activeTemplate.title,
        exercises: activeTemplate.exercises
      });
    }
  }, [activeTemplate, sessionId]);

  const [completedSets, setCompletedSets] = useState<Record<string, boolean>>({});

  const toggleSet = (exIndex: number, setIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCompletedSets(prev => ({
      ...prev,
      [`${exIndex}-${setIndex}`]: !prev[`${exIndex}-${setIndex}`]
    }));
  };

  const handleFinish = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const duration = startTime ? Math.floor((new Date().getTime() - startTime.getTime()) / 60000) : 45;
    completeMutation.mutate({
      sessionId: sessionId || 'mock-session-id',
      duration: duration,
      caloriesBurned: duration * 8, // Rough estimate
      notes: 'Felt great, hit a PR on bench.'
    });
  };

  if (template === undefined) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: C.onSurface, fontFamily: F.body }}>Loading Workout...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <MeshGradientBackground />
      
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: C.outlineVariant }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.header, fontSize: 24, color: C.onSurface }}>{activeTemplate.title}</Text>
            <Text style={{ fontFamily: F.bodyMed, fontSize: 13, color: '#4ade80', marginTop: 4 }}>
              ● IN PROGRESS
            </Text>
          </View>
          <View style={{ backgroundColor: C.glassInset, padding: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="timer" size={18} color={C.onSurfaceVariant} />
            <Text style={{ color: C.onSurface, fontFamily: F.num, fontSize: 16 }}>45:00</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
          {activeTemplate.exercises.map((ex, i) => (
            <Animated.View key={i} entering={FadeInUp.delay(i * 100).springify()} style={{ backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.outlineVariant }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                <Text style={{ fontFamily: F.header, fontSize: 18, color: C.onSurface }}>{ex.name}</Text>
              </View>
              
              <View style={{ flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: C.outlineVariant, marginBottom: 8 }}>
                <Text style={{ flex: 0.5, fontFamily: F.bodyBold, color: C.onSurfaceVariant, fontSize: 12 }}>SET</Text>
                <Text style={{ flex: 1, fontFamily: F.bodyBold, color: C.onSurfaceVariant, fontSize: 12, textAlign: 'center' }}>LBS</Text>
                <Text style={{ flex: 1, fontFamily: F.bodyBold, color: C.onSurfaceVariant, fontSize: 12, textAlign: 'center' }}>REPS</Text>
                <Text style={{ flex: 0.5, textAlign: 'center' }} />
              </View>

              {Array.from({ length: ex.sets }).map((_, sIdx) => {
                const isChecked = completedSets[`${i}-${sIdx}`];
                return (
                  <View key={sIdx} style={[{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderRadius: 8 }, isChecked && { backgroundColor: `${C.success}15` }]}>
                    <Text style={{ flex: 0.5, fontFamily: F.num, color: C.onSurface, fontSize: 16 }}>{sIdx + 1}</Text>
                    <Text style={{ flex: 1, fontFamily: F.num, color: isChecked ? C.success : C.onSurface, fontSize: 20, textAlign: 'center' }}>{ex.weight}</Text>
                    <Text style={{ flex: 1, fontFamily: F.num, color: isChecked ? C.success : C.onSurface, fontSize: 20, textAlign: 'center' }}>{ex.reps}</Text>
                    <TouchableOpacity 
                      onPress={() => toggleSet(i, sIdx)}
                      style={{ flex: 0.5, alignItems: 'flex-end', paddingRight: 8 }}
                    >
                      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isChecked ? C.success : C.glassInset, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: isChecked ? C.success : C.outlineVariant }}>
                        {isChecked && <Icon name="check" size={18} color="#fff" />}
                      </View>
                    </TouchableOpacity>
                  </View>
                );
              })}
              
              <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.outlineVariant }}>
                <TextInput 
                  placeholder="Add notes for this exercise..." 
                  placeholderTextColor={C.outline}
                  style={{ fontFamily: F.body, fontSize: 13, color: C.onSurface, backgroundColor: C.bg, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: C.outlineVariant }}
                  multiline
                />
              </View>
            </Animated.View>
          ))}
        </ScrollView>
      </SafeAreaView>

      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: Platform.OS === 'ios' ? 32 : 16, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.outlineVariant }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 16, gap: 8 }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star}>
              <Icon name="auto-awesome" size={28} color={star <= 4 ? C.primary : C.outlineVariant} />
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity 
          onPress={handleFinish}
          style={{ backgroundColor: C.primary, paddingVertical: 16, borderRadius: 100, alignItems: "center", shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 }}
        >
          <Text style={{ fontFamily: F.header, fontSize: 16, color: C.onPrimary }}>Finish Workout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
