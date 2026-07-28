import React, { useState, useMemo, useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, TextInput, Pressable, KeyboardAvoidingView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp, SlideInDown, useSharedValue, useAnimatedStyle, withTiming, withSpring, withRepeat, withSequence, interpolateColor, Layout, withDelay } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import Svg, { Path, Circle, Rect } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useQuery, useMutation } from '@tanstack/react-query';

import { useTheme } from '../context/ThemeContext';
import { F } from "../theme";
import MeshGradientBackground from "../components/MeshGradientBackground";
import { fetchCurrentWorkout, startSession, completeSession } from '../services/api/workout';

const { width } = Dimensions.get('window');

function Icon({ name, size = 24, color = "#fff" }: { name: string; size?: number; color?: string }) {
  const paths: Record<string, string> = {
    "chevron-left": "M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z",
    "check": "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
    "timer": "M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.03-6.61l1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42A8.962 8.962 0 0012 4c-4.97 0-9 4.03-9 9s4.02 9 9 9 9-4.03 9-9c0-2.12-.74-4.07-1.97-5.61zM12 20c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z",
    "flash-on": "M7 2v11h3v9l7-12h-4l4-8z",
    "auto-awesome": "M19 4h-2V2h-2v2h-2v2h2v2h2V6h2V4zM10.83 8.35l-2.33-6.14c-.16-.41-.75-.41-.91 0L5.26 8.35 1.55 9.77c-.45.17-.45.8 0 .97l3.71 1.42 2.33 6.14c.16.41.75.41.91 0l2.33-6.14 3.71-1.42c.45-.17.45-.8 0-.97l-3.71-1.42zM7.5 13.91L6.37 10.9 3.36 9.77l3.01-1.13 1.13-3.01 1.13 3.01 3.01 1.13-3.01 1.13-1.13 3.01zM19 14h-2v-2h-2v2h-2v2h2v2h2v-2h2v-2z",
    "mic": "M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zM17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z",
    "more-horiz": "M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z",
  };
  return paths[name] ? (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d={paths[name]} />
    </Svg>
  ) : null;
}

const AnimatedSvg = Animated.createAnimatedComponent(Svg);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function CircularProgress({ progress, size = 40, strokeWidth = 4, color = "#eab308" }: any) {
  const radius = (size - strokeWidth) / 2;
  const circum = radius * 2 * Math.PI;
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(progress, { duration: 800 });
  }, [progress]);

  const animatedProps = useAnimatedStyle(() => ({
    strokeDashoffset: circum - (animatedProgress.value / 100) * circum
  })) as any;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <AnimatedSvg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle stroke="rgba(255,255,255,0.1)" fill="none" cx={size/2} cy={size/2} r={radius} strokeWidth={strokeWidth} />
        <AnimatedCircle stroke={color} fill="none" cx={size/2} cy={size/2} r={radius} strokeWidth={strokeWidth} strokeDasharray={circum} animatedProps={animatedProps} strokeLinecap="round" />
      </AnimatedSvg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <Icon name="flash-on" size={14} color={color} />
      </View>
    </View>
  );
}

function Stepper({ value, onChange, isDark, C }: any) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderRadius: 8, paddingHorizontal: 2, paddingVertical: 2 }}>
      <TouchableOpacity onPress={() => onChange(Math.max(0, value - 1))} style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: C.onSurface, fontSize: 16, fontFamily: F.num }}>-</Text>
      </TouchableOpacity>
      <Text style={{ flex: 1, textAlign: 'center', fontFamily: F.num, fontSize: 15, color: C.onSurface, minWidth: 20 }}>{value}</Text>
      <TouchableOpacity onPress={() => onChange(value + 1)} style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: C.onSurface, fontSize: 16, fontFamily: F.num }}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

function Confetti({ active }: { active: boolean }) {
  if (!active) return null;
  // A lightweight mock confetti burst
  return (
    <Animated.View entering={FadeInUp.duration(300)} style={{ position: 'absolute', top: -10, left: -10, right: -10, bottom: -10, zIndex: -1, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ade80', position: 'absolute', top: 0, left: 0 }} />
      <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#eab308', position: 'absolute', top: 10, right: 0 }} />
      <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#60a5fa', position: 'absolute', bottom: 0, left: 10 }} />
    </Animated.View>
  );
}

function RestTimer({ duration = 60, onComplete, C }: any) {
  const [timeLeft, setTimeLeft] = useState(duration);
  useEffect(() => {
    if (timeLeft <= 0) {
      onComplete?.();
      return;
    }
    const timer = setInterval(() => setTimeLeft((t: number) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  return (
    <Animated.View entering={FadeInUp.springify()} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 8, paddingVertical: 8, backgroundColor: 'rgba(234, 179, 8, 0.1)', borderRadius: 12 }}>
       <Icon name="timer" size={16} color="#eab308" />
       <Text style={{ color: '#eab308', fontFamily: F.num, fontSize: 14, marginLeft: 6 }}>Rest: {timeLeft}s</Text>
    </Animated.View>
  );
}

function AnimatedSetRow({ ex, sIdx, isChecked, onToggle, weight, reps, onUpdate, isDark, C, showRestTimer }: any) {
  const scale = useSharedValue(1);
  const bgOpacity = useSharedValue(isChecked ? 1 : 0);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    bgOpacity.value = withTiming(isChecked ? 1 : 0, { duration: 300 });
    if (isChecked) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 1000);
    }
  }, [isChecked]);

  const bgStyle = useAnimatedStyle(() => ({
    backgroundColor: isDark 
      ? `rgba(234, 179, 8, ${bgOpacity.value * 0.12})` 
      : `rgba(234, 179, 8, ${bgOpacity.value * 0.1})`
  }));

  const textStyle = useAnimatedStyle(() => {
    const color = interpolateColor(bgOpacity.value, [0, 1], [C.onSurface, '#eab308']);
    return { color };
  });

  return (
    <>
      <Animated.View layout={Layout.springify()} style={[{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderRadius: 12, paddingHorizontal: 8, marginVertical: 2 }, bgStyle]}>
        <Text style={{ flex: 0.3, fontFamily: F.num, color: C.onSurfaceVariant, fontSize: 14 }}>{sIdx + 1}</Text>
        
        <View style={{ flex: 1, paddingHorizontal: 4 }}>
          {isChecked ? (
            <Animated.Text style={[{ fontFamily: F.num, fontSize: 18, textAlign: 'center' }, textStyle]}>{weight}</Animated.Text>
          ) : (
            <Stepper value={weight} onChange={(v: number) => onUpdate(sIdx, 'weight', v)} isDark={isDark} C={C} />
          )}
        </View>

        <View style={{ flex: 1, paddingHorizontal: 4 }}>
          {isChecked ? (
            <Animated.Text style={[{ fontFamily: F.num, fontSize: 18, textAlign: 'center' }, textStyle]}>{reps}</Animated.Text>
          ) : (
            <Stepper value={reps} onChange={(v: number) => onUpdate(sIdx, 'reps', v)} isDark={isDark} C={C} />
          )}
        </View>

        <TouchableOpacity 
          activeOpacity={0.8}
          onPress={() => {
            scale.value = withSequence(withSpring(0.8), withSpring(1));
            onToggle();
          }}
          style={{ flex: 0.4, alignItems: 'flex-end', paddingRight: 4 }}
        >
          <Animated.View style={[{ transform: [{ scale }] }, { width: 32, height: 32, borderRadius: 16, backgroundColor: isChecked ? '#eab308' : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'), alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: isChecked ? '#eab308' : C.outlineVariant }]}>
            <Confetti active={showConfetti} />
            {isChecked && <Icon name="check" size={20} color="#000" />}
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
      
      {showRestTimer && isChecked && (
        <RestTimer duration={60} C={C} />
      )}
    </>
  );
}

function ExpandableNotes({ C, isDark }: any) {
  const [isFocused, setIsFocused] = useState(false);
  const borderProgress = useSharedValue(0);
  const [isRecording, setIsRecording] = useState(false);
  const micPulse = useSharedValue(1);

  useEffect(() => {
    borderProgress.value = withTiming(isFocused ? 1 : 0, { duration: 250 });
  }, [isFocused]);

  useEffect(() => {
    if (isRecording) {
      micPulse.value = withRepeat(withTiming(1.2, { duration: 500 }), -1, true);
    } else {
      micPulse.value = withTiming(1);
    }
  }, [isRecording]);

  const borderStyle = useAnimatedStyle(() => {
    return {
      borderColor: interpolateColor(borderProgress.value, [0, 1], [C.outlineVariant, 'rgba(234, 179, 8, 0.6)']),
      backgroundColor: interpolateColor(borderProgress.value, [0, 1], [isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)', isDark ? 'rgba(234,179,8,0.05)' : 'rgba(234,179,8,0.05)']),
    };
  });

  return (
    <Animated.View style={[{ marginTop: 16, borderRadius: 16, borderWidth: 1, overflow: 'hidden', flexDirection: 'row', alignItems: 'center' }, borderStyle]}>
      <TextInput 
        placeholder="Add notes..." 
        placeholderTextColor={C.onSurfaceVariant}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={{ flex: 1, fontFamily: F.body, fontSize: 14, color: C.onSurface, padding: 16, minHeight: 60 }}
        multiline
      />
      <TouchableOpacity onPress={() => setIsRecording(!isRecording)} style={{ padding: 16 }}>
        <Animated.View style={[{ transform: [{ scale: micPulse }] }]}>
           <Icon name="mic" size={20} color={isRecording ? '#ef4444' : C.onSurfaceVariant} />
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function ActiveWorkoutScreen({ onFinish, onNavigateBack }: { onFinish: () => void; onNavigateBack?: () => void }) {
  const { C, isDark, bgColors } = useTheme();
  
  const { data: template } = useQuery({ queryKey: ['currentWorkout'], queryFn: () => fetchCurrentWorkout() });
  
  const btnScale = useSharedValue(1);
  const [sessionData, setSessionData] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState(0);
  
  // Local state for editable exercises
  const [exercises, setExercises] = useState<any[]>([]);

  // Timer Animation
  const timerOpacity = useSharedValue(1);
  useEffect(() => {
    timerOpacity.value = withRepeat(withSequence(withTiming(0.6, { duration: 1000 }), withTiming(1, { duration: 1000 })), -1, true);
  }, []);

  useEffect(() => {
    let interval: any;
    if (startTime) {
      interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime.getTime()) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [startTime]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };
  
  const startMutation = useMutation({
    mutationFn: startSession,
    onSuccess: (data) => {
      setSessionData(data);
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
    if (activeTemplate && exercises.length === 0) {
      // Map sets into individual editable state
      const mapped = activeTemplate.exercises.map((ex: any) => ({
        ...ex,
        setsData: Array.from({ length: ex.sets }).map(() => ({ weight: ex.weight, reps: ex.reps }))
      }));
      setExercises(mapped);
    }
    
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
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCompletedSets(prev => ({
      ...prev,
      [`${exIndex}-${setIndex}`]: !prev[`${exIndex}-${setIndex}`]
    }));
  };

  const updateSet = (exIndex: number, setIndex: number, field: 'weight' | 'reps', value: number) => {
    setExercises(prev => {
      const next = [...prev];
      next[exIndex].setsData[setIndex][field] = value;
      return next;
    });
  };

  const handleFinish = () => {
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const duration = startTime ? Math.floor((new Date().getTime() - startTime.getTime()) / 60000) : 45;
    
    const completedSetIds: string[] = [];
    if (sessionData && sessionData.exercises) {
      sessionData.exercises.forEach((ex: any, exIdx: number) => {
        ex.sets.forEach((set: any, setIdx: number) => {
          if (completedSets[`${exIdx}-${setIdx}`]) {
            completedSetIds.push(set.id);
          }
        });
      });
    }

    completeMutation.mutate({
      sessionId: sessionId || 'mock-session-id',
      duration: duration,
      caloriesBurned: duration * 8,
      notes: 'Felt great.',
      completedSetIds
    });
  };

  // Calculate overall progress
  let totalSets = 0;
  let finishedSets = 0;
  exercises.forEach((ex, i) => {
    totalSets += ex.sets;
    for (let s = 0; s < ex.sets; s++) {
      if (completedSets[`${i}-${s}`]) finishedSets++;
    }
  });
  const progressPercent = totalSets > 0 ? (finishedSets / totalSets) * 100 : 0;

  // Determine active exercise
  let activeExIndex = 0;
  for (let i = 0; i < exercises.length; i++) {
    let allDone = true;
    for (let s = 0; s < exercises[i].sets; s++) {
      if (!completedSets[`${i}-${s}`]) allDone = false;
    }
    if (!allDone) {
      activeExIndex = i;
      break;
    }
    if (i === exercises.length - 1) activeExIndex = i; // All done
  }

  const animatedTimerStyle = useAnimatedStyle(() => ({ opacity: timerOpacity.value }));
  const animatedBtnStyle = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));

  if (exercises.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: C.onSurface, fontFamily: F.body }}>Loading Workout...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <MeshGradientBackground bgColors={bgColors} isDark={isDark} />
      
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
          {onNavigateBack && (
            <TouchableOpacity onPress={onNavigateBack} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
              <Icon name="chevron-left" size={24} color={C.onSurface} />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.header, fontSize: 24, color: C.onSurface, letterSpacing: -0.5 }}>{activeTemplate.title}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <Animated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#eab308', marginRight: 6 }, animatedTimerStyle]} />
              <Text style={{ fontFamily: F.bodyMed, fontSize: 13, color: '#eab308', letterSpacing: 1 }}>
                IN PROGRESS
              </Text>
            </View>
          </View>
          
          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            <View style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(234, 179, 8, 0.2)' }}>
              <Icon name="timer" size={16} color="#eab308" />
              <Text style={{ color: '#eab308', fontFamily: F.num, fontSize: 16 }}>{formatTime(elapsed)}</Text>
            </View>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
          {/* Progress Header */}
          <Animated.View entering={FadeInUp.delay(50)} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(20, 20, 20, 0.6)' : 'rgba(255, 255, 255, 0.6)', padding: 16, borderRadius: 20, marginBottom: 24, borderWidth: 1, borderColor: C.outlineVariant }}>
            <CircularProgress progress={progressPercent} size={48} />
            <View style={{ marginLeft: 16, flex: 1 }}>
              <Text style={{ fontFamily: F.header, fontSize: 16, color: C.onSurface }}>Workout Progress</Text>
              <Text style={{ fontFamily: F.body, fontSize: 13, color: C.onSurfaceVariant, marginTop: 2 }}>{finishedSets} of {totalSets} sets completed</Text>
            </View>
          </Animated.View>

          {exercises.map((ex, i) => {
            const isActive = i === activeExIndex;
            return (
              <Animated.View key={i} entering={FadeInUp.delay(i * 100).springify()} style={{ 
                backgroundColor: isDark ? 'rgba(15,15,15,0.7)' : 'rgba(255,255,255,0.8)', 
                borderRadius: 24, 
                padding: 20, 
                marginBottom: 20, 
                borderWidth: 1, 
                borderColor: isActive ? 'rgba(234, 179, 8, 0.3)' : C.outlineVariant,
                overflow: 'hidden',
                shadowColor: isActive ? '#eab308' : '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: isActive ? 0.1 : 0.05,
                shadowRadius: 12,
                elevation: isActive ? 8 : 2
              }}>
                {isActive && (
                  <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: '#eab308', shadowColor: '#eab308', shadowOpacity: 0.8, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } }} />
                )}
                
                <View style={{ flexDirection: 'row', marginBottom: 16, alignItems: 'center' }}>
                  {/* Thumbnail Placeholder */}
                  <View style={{ width: 48, height: 48, borderRadius: 12, overflow: 'hidden', marginRight: 12, borderWidth: 1, borderColor: C.outlineVariant }}>
                    <LinearGradient colors={isDark ? ['#333', '#111'] : ['#e2e8f0', '#cbd5e1']} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: F.header, fontSize: 19, color: C.onSurface, letterSpacing: -0.2 }}>{ex.name}</Text>
                    {isActive && <Text style={{ fontFamily: F.bodyBold, fontSize: 12, color: '#eab308', marginTop: 2 }}>CURRENT</Text>}
                  </View>
                  
                  {/* Swipe Action Placeholder Icon */}
                  <TouchableOpacity style={{ padding: 8 }}>
                    <Icon name="more-horiz" size={20} color={C.onSurfaceVariant} />
                  </TouchableOpacity>
                </View>

                {/* AI Tip */}
                {isActive && (
                  <Animated.View entering={FadeInUp} style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)', padding: 12, borderRadius: 12, flexDirection: 'row', marginBottom: 16, borderWidth: 1, borderColor: 'rgba(234, 179, 8, 0.2)' }}>
                    <Icon name="auto-awesome" size={16} color="#eab308" />
                    <Text style={{ fontFamily: F.body, fontSize: 13, color: C.onSurface, marginLeft: 8, flex: 1, lineHeight: 18 }}>
                      AI Tip: Focus on slow, controlled eccentric movements for maximum hypertrophy.
                    </Text>
                  </Animated.View>
                )}
                
                <View style={{ flexDirection: 'row', paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: C.outlineVariant, marginBottom: 8 }}>
                  <Text style={{ flex: 0.3, fontFamily: F.bodyBold, color: C.onSurfaceVariant, fontSize: 12, letterSpacing: 1 }}>SET</Text>
                  <Text style={{ flex: 1, fontFamily: F.bodyBold, color: C.onSurfaceVariant, fontSize: 12, textAlign: 'center', letterSpacing: 1 }}>LBS</Text>
                  <Text style={{ flex: 1, fontFamily: F.bodyBold, color: C.onSurfaceVariant, fontSize: 12, textAlign: 'center', letterSpacing: 1 }}>REPS</Text>
                  <Text style={{ flex: 0.4, textAlign: 'center' }} />
                </View>

                {ex.setsData.map((setData: any, sIdx: number) => {
                  const isChecked = completedSets[`${i}-${sIdx}`];
                  // Show rest timer only on active exercise, if it's checked, and it's the most recently checked one (simplification: show for the last checked set)
                  const showRestTimer = isChecked && sIdx < ex.setsData.length - 1 && !completedSets[`${i}-${sIdx + 1}`];
                  
                  return (
                    <AnimatedSetRow 
                      key={sIdx} 
                      ex={ex} 
                      sIdx={sIdx} 
                      weight={setData.weight}
                      reps={setData.reps}
                      isChecked={isChecked} 
                      onToggle={() => toggleSet(i, sIdx)} 
                      onUpdate={(setIndex: number, field: any, val: number) => updateSet(i, setIndex, field, val)}
                      isDark={isDark} 
                      C={C} 
                      showRestTimer={showRestTimer}
                    />
                  );
                })}
                
                <ExpandableNotes C={C} isDark={isDark} />
              </Animated.View>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      {/* Sticky Bottom Finish Button */}
      <Animated.View entering={SlideInDown.springify().damping(16)} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingTop: 24, paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' }}>
        <BlurView intensity={isDark ? 80 : 100} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFillObject} />
        <Pressable 
          onPressIn={() => btnScale.value = withSpring(0.95)}
          onPressOut={() => btnScale.value = withSpring(1)}
          onPress={handleFinish}
        >
          <Animated.View style={[{ 
            borderRadius: 100, 
            overflow: 'hidden', 
            shadowColor: '#eab308', 
            shadowOffset: { width: 0, height: 8 }, 
            shadowOpacity: 0.35, 
            shadowRadius: 16, 
            elevation: 10 
          }, animatedBtnStyle]}>
            <LinearGradient 
              colors={['#fde047', '#eab308', '#ca8a04']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ paddingVertical: 18, alignItems: "center" }}
            >
              <Text style={{ fontFamily: F.header, fontSize: 18, color: '#422006', letterSpacing: 0.5 }}>Finish Workout</Text>
            </LinearGradient>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}
