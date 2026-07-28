import React, { useState, useMemo, useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, TextInput, Pressable, KeyboardAvoidingView, Dimensions, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInUp, FadeInDown, SlideInDown, SlideOutDown, useSharedValue, useAnimatedStyle, withTiming, withSpring, withRepeat, withSequence, interpolate, Extrapolate, Layout, useAnimatedProps } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import Svg, { Path, Circle, Rect, Ellipse, Line } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useTheme } from '../context/ThemeContext';
import { F, ThemeColors } from "../theme";
import MeshGradientBackground from "../components/MeshGradientBackground";
import { fetchCurrentWorkout, saveWorkout, fetchWorkoutVersions, generateWorkout } from '../services/api/workout';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── SVGs ────────────────────────────────────────────────────────────────
function Icon({ name, size = 24, color = "#fff" }: { name: string; size?: number; color?: string }) {
  const paths: Record<string, string> = {
    "chevron-left": "M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z",
    "history": "M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z",
    "auto-awesome": "M19 4h-2V2h-2v2h-2v2h2v2h2V6h2V4zM10.83 8.35l-2.33-6.14c-.16-.41-.75-.41-.91 0L5.26 8.35 1.55 9.77c-.45.17-.45.8 0 .97l3.71 1.42 2.33 6.14c.16.41.75.41.91 0l2.33-6.14 3.71-1.42c.45-.17.45-.8 0-.97l-3.71-1.42zM7.5 13.91L6.37 10.9 3.36 9.77l3.01-1.13 1.13-3.01 1.13 3.01 3.01 1.13-3.01 1.13-1.13 3.01zM19 14h-2v-2h-2v2h-2v2h2v2h2v-2h2v-2z",
    "edit": "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z",
    "close": "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z",
    "keyboard-arrow-down": "M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z",
    "keyboard-arrow-up": "M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6 1.41 1.41z",
    "more-vert": "M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s-.9 2-2 2 2 .9 2 2-.9 2-2 2zm0 6c-1.1 0-2 .9-2 2s-.9 2-2 2 2 .9 2 2-.9 2-2 2z",
    "play-circle": "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z",
    "event": "M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"
  };
  return paths[name] ? (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d={paths[name]} />
    </Svg>
  ) : null;
}

// ─── ANIMATED BODY MAP (Pseudo-3D) ──────────────────────────────────────────────
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function EnhancedBodyMap({ targetedMuscles, C }: { targetedMuscles: string[], C: ThemeColors }) {
  const rotation = useSharedValue(0);
  
  useEffect(() => {
    rotation.value = withRepeat(
      withSequence(
        withTiming(15, { duration: 4000 }),
        withTiming(-15, { duration: 4000 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 400 }, { rotateY: `${rotation.value}deg` }]
  }));

  const wire = C.onSurfaceVariant + "40";
  const wireL = C.onSurfaceVariant + "20";
  const isTargeted = (m: string) => targetedMuscles.includes(m);
  
  const getStyle = (m: string) => ({
    fill: isTargeted(m) ? C.primary + "60" : "none",
    stroke: isTargeted(m) ? C.primary : wire
  });

  return (
    <View style={{ height: 220, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={animatedStyle}>
        <Svg width={160} height={200} viewBox="0 0 140 200">
          <AnimatedEllipse cx={70} cy={18} rx={16} ry={18} {...getStyle("Neck")} strokeWidth={1.5} />
          <Rect x={63} y={35} width={14} height={10} fill="none" stroke={wireL} strokeWidth={1} />
          <AnimatedPath d="M30,58 Q50,48 70,48 Q90,48 110,58" {...getStyle("Shoulders")} strokeWidth={1.5} />
          <AnimatedPath d="M38,58 L34,115 Q70,125 106,115 L102,58" {...getStyle("Chest")} strokeWidth={1.5} />
          <AnimatedEllipse cx={70} cy={117} rx={22} ry={8} {...getStyle("Core")} strokeWidth={1.2} />
          <AnimatedPath d="M38,58 L18,95 L15,130" {...getStyle("Arms")} strokeWidth={1.5} strokeLinecap="round" />
          <AnimatedPath d="M102,58 L122,95 L125,130" {...getStyle("Arms")} strokeWidth={1.5} strokeLinecap="round" />
          <AnimatedPath d="M55,122 L50,162 L48,192" {...getStyle("Quads")} strokeWidth={1.5} strokeLinecap="round" />
          <AnimatedPath d="M85,122 L90,162 L92,192" {...getStyle("Quads")} strokeWidth={1.5} strokeLinecap="round" />
          <AnimatedCircle cx={50} cy={162} r={4} {...getStyle("Knees")} strokeWidth={1.5} />
          <AnimatedCircle cx={90} cy={162} r={4} {...getStyle("Knees")} strokeWidth={1.5} />
        </Svg>
      </Animated.View>
    </View>
  );
}

// ─── AI EXPLANATION CARD ──────────────────────────────────────────────────────────
function AiExplanationCard({ C, isDark }: { C: ThemeColors, isDark: boolean }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Animated.View layout={Layout.springify()} style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(234, 179, 8, 0.3)', marginBottom: 24 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="auto-awesome" size={20} color="#eab308" />
          <Text style={{ fontFamily: F.header, fontSize: 16, color: C.onSurface }}>AI Insight</Text>
        </View>
        <TouchableOpacity onPress={() => setExpanded(!expanded)} style={{ padding: 4 }}>
          <Icon name={expanded ? "keyboard-arrow-up" : "keyboard-arrow-down"} size={20} color={C.onSurfaceVariant} />
        </TouchableOpacity>
      </View>
      <Text style={{ fontFamily: F.body, fontSize: 14, color: C.onSurfaceVariant, marginTop: 12, lineHeight: 20 }}>
        Generated based on your Hypertrophy goal. Prioritizes chest & shoulders.
      </Text>
      
      {expanded && (
        <Animated.View entering={FadeInUp} style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' }}>
          <Text style={{ fontFamily: F.bodyBold, fontSize: 13, color: C.onSurface, marginBottom: 4 }}>Recovery Adjustment</Text>
          <Text style={{ fontFamily: F.body, fontSize: 13, color: C.onSurfaceVariant, marginBottom: 12 }}>Reduced volume by 10% due to low HRV this morning.</Text>
          
          <Text style={{ fontFamily: F.bodyBold, fontSize: 13, color: C.onSurface, marginBottom: 4 }}>Progressive Overload</Text>
          <Text style={{ fontFamily: F.body, fontSize: 13, color: C.onSurfaceVariant }}>Increased Bench Press weight by 5 lbs from last session.</Text>
        </Animated.View>
      )}
    </Animated.View>
  );
}

// ─── EXERCISE CARD ──────────────────────────────────────────────────────────
function EnhancedExerciseCard({ ex, C, isDark, onSelect }: any) {
  return (
    <Animated.View layout={Layout.springify()} entering={FadeInUp.springify()} style={{ backgroundColor: isDark ? 'rgba(20,20,20,0.8)' : 'rgba(255,255,255,0.9)', borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.outlineVariant }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: isDark ? '#333' : '#e2e8f0', marginRight: 12, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="play-circle" size={24} color={C.onSurfaceVariant} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.header, fontSize: 17, color: C.onSurface }}>{ex.name}</Text>
            <Text style={{ fontFamily: F.bodyMed, fontSize: 12, color: '#eab308', marginTop: 2 }}>{ex.muscle || 'Full Body'} • {ex.sets} Sets</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => onSelect(ex)} style={{ padding: 8, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderRadius: 12 }}>
          <Icon name="more-vert" size={20} color={C.onSurface} />
        </TouchableOpacity>
      </View>
      
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1, backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.03)', padding: 10, borderRadius: 12, alignItems: 'center' }}>
          <Text style={{ fontFamily: F.bodyBold, fontSize: 11, color: C.onSurfaceVariant }}>TARGET</Text>
          <Text style={{ fontFamily: F.num, fontSize: 15, color: C.onSurface, marginTop: 4 }}>{ex.reps} Reps</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.03)', padding: 10, borderRadius: 12, alignItems: 'center' }}>
          <Text style={{ fontFamily: F.bodyBold, fontSize: 11, color: C.onSurfaceVariant }}>WEIGHT</Text>
          <Text style={{ fontFamily: F.num, fontSize: 15, color: C.onSurface, marginTop: 4 }}>{ex.weight} lbs</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.03)', padding: 10, borderRadius: 12, alignItems: 'center' }}>
          <Text style={{ fontFamily: F.bodyBold, fontSize: 11, color: C.onSurfaceVariant }}>REST</Text>
          <Text style={{ fontFamily: F.num, fontSize: 15, color: C.onSurface, marginTop: 4 }}>60s</Text>
        </View>
      </View>
    </Animated.View>
  );
}

// ─── BOTTOM SHEET ──────────────────────────────────────────────────────────
const EXERCISE_VIDEOS: Record<string, string> = {
  'bench press': 'rxD321l2svE',
  'squat': 'gcNh17Ckjgg',
  'deadlift': 'op9kVnSso6Q',
  'pull up': 'eGo4IYPNBGc',
  'push up': 'IODxDxX7oi4',
  'overhead press': 'QAQ64B6xJDk',
  'row': 'G8l_8chR5BE',
  'curl': 'ykJmrZ5v0Oo',
  'tricep': 'nRiJVZDpdL0',
  'leg press': 'IZxyjW7OSvc',
  'lunge': 'QOVaHwm-Q6U',
  'plank': 'pSHjTRCQxIw'
};

function getDirectVideoUrl(exerciseName: string) {
  const name = exerciseName.toLowerCase();
  for (const [key, videoId] of Object.entries(EXERCISE_VIDEOS)) {
    if (name.includes(key)) {
      return `https://www.youtube.com/watch?v=${videoId}`;
    }
  }
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(exerciseName + " exercise form tutorial")}`;
}

function ExerciseDetailsSheet({ exercise, onClose, C, isDark }: any) {
  if (!exercise) return null;

  return (
    <Animated.View entering={SlideInDown.springify().damping(15)} exiting={SlideOutDown.duration(200)} style={[StyleSheet.absoluteFill, { zIndex: 100, justifyContent: 'flex-end' }]}>
      <Pressable onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
      <View style={{ backgroundColor: C.bg, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40, maxHeight: SCREEN_H * 0.8 }}>
        <View style={{ width: 40, height: 4, backgroundColor: C.outlineVariant, borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />
        
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={{ fontFamily: F.header, fontSize: 24, color: C.onSurface, marginBottom: 16 }}>{exercise.name}</Text>
          
          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={() => Linking.openURL(getDirectVideoUrl(exercise.name))} 
            style={{ height: 200, backgroundColor: isDark ? '#222' : '#e2e8f0', borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 24, borderWidth: 1, borderColor: C.outlineVariant }}>
            <Icon name="play-circle" size={56} color="#ef4444" />
            <Text style={{ fontFamily: F.header, fontSize: 16, color: C.onSurface, marginTop: 16 }}>Watch tutorial</Text>
            <Text style={{ fontFamily: F.body, fontSize: 13, color: C.onSurfaceVariant, marginTop: 4 }}>on YouTube</Text>
          </TouchableOpacity>

          <Text style={{ fontFamily: F.header, fontSize: 18, color: C.onSurface, marginBottom: 12 }}>Technique</Text>
          <View style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)', padding: 16, borderRadius: 16, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(234, 179, 8, 0.2)' }}>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <Icon name="auto-awesome" size={16} color="#eab308" />
              <Text style={{ fontFamily: F.bodyBold, color: '#eab308' }}>AI Voice Coach</Text>
            </View>
            <Text style={{ fontFamily: F.body, fontSize: 14, color: C.onSurface, lineHeight: 22 }}>
              Keep your core tight. Don't let your elbows flare out. Breathe in on the way down, out on the way up.
            </Text>
          </View>

          <Text style={{ fontFamily: F.header, fontSize: 18, color: C.onSurface, marginBottom: 12 }}>Alternatives</Text>
          <View style={{ gap: 12 }}>
            <TouchableOpacity style={{ padding: 16, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ fontFamily: F.bodyBold, fontSize: 15, color: C.onSurface }}>Dumbbell Press</Text>
                <Text style={{ fontFamily: F.body, fontSize: 13, color: C.onSurfaceVariant, marginTop: 4 }}>Similar Muscle Group</Text>
              </View>
              <Text style={{ fontFamily: F.bodyBold, fontSize: 13, color: C.primary }}>Replace</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ padding: 16, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ fontFamily: F.bodyBold, fontSize: 15, color: C.onSurface }}>Machine Chest Press</Text>
                <Text style={{ fontFamily: F.body, fontSize: 13, color: C.onSurfaceVariant, marginTop: 4 }}>Safer Alternative</Text>
              </View>
              <Text style={{ fontFamily: F.bodyBold, fontSize: 13, color: C.primary }}>Replace</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Animated.View>
  );
}

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────
export default function WorkoutBuilderScreen({ onNavigateBack, onStartWorkout }: { onNavigateBack?: () => void; onStartWorkout?: () => void }) {
  const { C, isDark, bgColors } = useTheme();
  
  const { data: currentWorkout } = useQuery({ queryKey: ['currentWorkout'], queryFn: () => fetchCurrentWorkout() });
  const queryClient = useQueryClient();

  const [exercises, setExercises] = useState<any[]>([]);
  const [selectedEx, setSelectedEx] = useState<any>(null);

  useEffect(() => {
    if (currentWorkout?.exercises) {
      setExercises(currentWorkout.exercises);
    }
  }, [currentWorkout]);

  const [aiPrompt, setAiPrompt] = useState("");
  const { mutate: aiGenerateWork, isPending: isAiGenerating } = useMutation({
    mutationFn: (promptText: string) => generateWorkout(promptText, currentWorkout?.id),
    onSuccess: (data) => {
      if (data.exercises) setExercises(data.exercises);
      setAiPrompt("");
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  });

  const { mutate: saveWork } = useMutation({
    mutationFn: (data: any) => saveWorkout(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentWorkout'] });
      queryClient.invalidateQueries({ queryKey: ['workoutVersions'] });
      if (onStartWorkout) onStartWorkout();
      else onNavigateBack?.();
    }
  });

  const handleStart = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    saveWork({
      userId: 'demo-user-id',
      title: currentWorkout?.title || 'Push Day',
      duration: currentWorkout?.duration || '60',
      parentVersionId: currentWorkout?.parentVersionId || currentWorkout?.id,
      exercises: exercises
    });
  };

  const btnScale = useSharedValue(1);
  const animatedBtnStyle = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <MeshGradientBackground bgColors={bgColors} isDark={isDark} />
      
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <TouchableOpacity onPress={onNavigateBack} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <Icon name="chevron-left" size={24} color={C.onSurface} />
            </TouchableOpacity>
            <View>
              <Text style={{ fontFamily: F.header, fontSize: 22, color: C.onSurface, letterSpacing: -0.5 }}>{currentWorkout?.title || 'Workout'}</Text>
              <Text style={{ fontFamily: F.bodyMed, fontSize: 13, color: '#eab308', marginTop: 2 }}>V2 • AI Recovery Adjusted</Text>
            </View>
          </View>
          
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity style={{ padding: 8 }}>
              <Icon name="event" size={24} color={C.onSurface} />
            </TouchableOpacity>
            <TouchableOpacity style={{ padding: 8 }}>
              <Icon name="history" size={24} color={C.onSurface} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
          
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
            <View style={{ flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', padding: 12, borderRadius: 12, alignItems: 'center' }}>
              <Text style={{ fontFamily: F.bodyBold, fontSize: 12, color: C.onSurfaceVariant }}>TIME</Text>
              <Text style={{ fontFamily: F.num, fontSize: 18, color: C.onSurface, marginTop: 4 }}>45m</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', padding: 12, borderRadius: 12, alignItems: 'center' }}>
              <Text style={{ fontFamily: F.bodyBold, fontSize: 12, color: C.onSurfaceVariant }}>CALORIES</Text>
              <Text style={{ fontFamily: F.num, fontSize: 18, color: C.onSurface, marginTop: 4 }}>320</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', padding: 12, borderRadius: 12, alignItems: 'center' }}>
              <Text style={{ fontFamily: F.bodyBold, fontSize: 12, color: C.onSurfaceVariant }}>LEVEL</Text>
              <Text style={{ fontFamily: F.num, fontSize: 18, color: C.onSurface, marginTop: 4 }}>INT</Text>
            </View>
          </View>

          <AiExplanationCard C={C} isDark={isDark} />
          
          <Text style={{ fontFamily: F.header, fontSize: 18, color: C.onSurface, marginBottom: 16 }}>Muscle Activation</Text>
          <EnhancedBodyMap targetedMuscles={Array.from(new Set(exercises.map((e) => e.muscle || 'Full Body')))} C={C} />

          {/* Quick Scenario Simulators */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 16, gap: 12, marginBottom: 12 }}>
             {['Home', '20 Min', 'Injury Friendly', 'Resistance Band'].map(chip => (
               <TouchableOpacity key={chip} style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: isDark ? '#222' : '#e2e8f0' }}>
                 <Text style={{ fontFamily: F.bodyMed, color: C.onSurface, fontSize: 14 }}>{chip}</Text>
               </TouchableOpacity>
             ))}
          </ScrollView>

          {/* AI Editor Input */}
          <View style={{ flexDirection: 'row', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 4, alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
            <Icon name="auto-awesome" size={20} color="#eab308" />
            <TextInput 
              placeholder="Ask Rachel to replace an exercise..."
              placeholderTextColor={C.onSurfaceVariant}
              style={{ flex: 1, padding: 12, fontFamily: F.body, fontSize: 15, color: C.onSurface, height: 48 }}
              value={aiPrompt}
              onChangeText={setAiPrompt}
              onSubmitEditing={() => aiGenerateWork(aiPrompt)}
            />
            {isAiGenerating && <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#eab308' }} />}
          </View>

          {/* Timeline Mock */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <Text style={{ fontFamily: F.bodyBold, color: C.onSurfaceVariant }}>WARM UP</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: C.outlineVariant }} />
          </View>

          {exercises.map((ex, i) => (
            <EnhancedExerciseCard key={i} ex={ex} C={C} isDark={isDark} onSelect={(exercise: any) => setSelectedEx(exercise)} />
          ))}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 24 }}>
            <Text style={{ fontFamily: F.bodyBold, color: C.onSurfaceVariant }}>COOLDOWN</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: C.outlineVariant }} />
          </View>

        </ScrollView>
      </SafeAreaView>

      {/* Sticky Bottom Finish Button */}
      <Animated.View entering={SlideInDown.springify().damping(16)} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingTop: 24, paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' }}>
        <BlurView intensity={isDark ? 80 : 100} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFillObject} />
        <Pressable 
          onPressIn={() => btnScale.value = withSpring(0.95)}
          onPressOut={() => btnScale.value = withSpring(1)}
          onPress={handleStart}
        >
          <Animated.View style={[{ 
            ...Platform.select({
              web: { boxShadow: `0px 0px 8px #eab308` } as any,
              default: { shadowColor: '#eab308', shadowOpacity: 0.8, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } }
            }), 
            borderRadius: 100, 
            overflow: 'hidden', 
            elevation: 10 
          }, animatedBtnStyle]}>
            <LinearGradient 
              colors={['#fde047', '#eab308', '#ca8a04']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ paddingVertical: 18, alignItems: "center" }}
            >
              <Text style={{ fontFamily: F.header, fontSize: 18, color: '#422006', letterSpacing: 0.5 }}>Lock & Start Workout</Text>
            </LinearGradient>
          </Animated.View>
        </Pressable>
      </Animated.View>

      {/* Bottom Sheet */}
      {selectedEx && <ExerciseDetailsSheet exercise={selectedEx} onClose={() => setSelectedEx(null)} C={C} isDark={isDark} />}

    </KeyboardAvoidingView>
  );
}
