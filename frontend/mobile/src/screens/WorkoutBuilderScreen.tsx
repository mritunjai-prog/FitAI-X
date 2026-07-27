import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, StatusBar as RNStatusBar, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeOut,
  FadeInUp,
  FadeOutUp,
  SlideInDown,
  SlideOutDown,
  LinearTransition,
  useAnimatedScrollHandler,
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withRepeat,
  withSequence,
  withTiming,
  interpolate,
  Extrapolate
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import Svg, { Path, Circle, Ellipse, Rect, Line } from "react-native-svg";
import * as Haptics from "expo-haptics";

import { DarkColors, LightColors, ThemeColors, F } from "../theme";
import MeshGradientBackground from "../components/MeshGradientBackground";
import ExerciseCard from "../components/ExerciseCard";
import AnimatedPressable from "../components/AnimatedPressable";
import { LinearGradient } from "expo-linear-gradient";
import DraggableFlatList, { RenderItemParams } from "react-native-draggable-flatlist";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchCurrentWorkout, saveWorkout, fetchWorkoutVersions } from '../services/api/workout';
import { useTheme } from '../context/ThemeContext';

const { width: SCREEN_W } = require("react-native").Dimensions.get("window");

// ─── SVG Icons ────────────────────────────────────────────────────────────────
function Icon({
  name,
  size = 24,
  color = "#fff",
}: {
  name: string;
  size?: number;
  color?: string;
}) {
  const paths: Record<string, string> = {
    "chevron-left": "M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z",
    add: "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",
    history:
      "M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z",
    warning: "M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z",
  };
  return paths[name] ? (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d={paths[name]} />
    </Svg>
  ) : null;
}

// ─── BodyMap Component for Real-time Muscle Highlighting ──────────────────────
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function ActiveBodyMap({
  targetedMuscles,
  injuredMuscles,
  C,
}: {
  targetedMuscles: string[];
  injuredMuscles: string[];
  C: ThemeColors;
}) {
  const wire = C.onSurfaceVariant + "40";
  const wireL = C.onSurfaceVariant + "20";

  // Breathing animation for injured muscles
  const breathing = useSharedValue(0.3);
  React.useEffect(() => {
    breathing.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 1000 }),
        withTiming(0.3, { duration: 1000 })
      ),
      -1,
      true
    );
  }, []);

  const animatedInjuredProps = useAnimatedProps(() => ({
    opacity: breathing.value
  }) as any);

  const getProps = (muscle: string) => {
    return injuredMuscles.includes(muscle) ? { animatedProps: animatedInjuredProps } : {};
  };

  const isTargeted = (muscle: string) => targetedMuscles.includes(muscle);
  const isInjured = (muscle: string) => injuredMuscles.includes(muscle);

  const getStyle = (muscle: string) => {
    if (isTargeted(muscle) && isInjured(muscle))
      return { fill: C.error + "80", stroke: C.error };
    if (isTargeted(muscle))
      return { fill: C.primary + "80", stroke: C.primary };
    if (isInjured(muscle)) return { fill: C.error + "80", stroke: C.error };
    return { fill: "none", stroke: wire };
  };

  return (
    <View
      style={{
        height: 200,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
      }}
    >
      <Svg width={160} height={200} viewBox="0 0 140 200">
        {/* Head */}
        <AnimatedEllipse
          cx={70} cy={18} rx={16} ry={18}
          {...getStyle("Neck")} strokeWidth={1.5}
          {...getProps("Neck")}
        />
        <Rect x={63} y={35} width={14} height={10} fill="none" stroke={wireL} strokeWidth={1} />

        {/* Shoulders */}
        <AnimatedPath
          d="M30,58 Q50,48 70,48 Q90,48 110,58"
          fill={isTargeted("Shoulders") ? C.primary + "40" : "none"}
          stroke={isTargeted("Shoulders") ? C.primary : wire}
          strokeWidth={1.5}
          {...getProps("Shoulders")}
        />

        {/* Arms */}
        <AnimatedPath
          d="M38,58 L34,115 Q70,125 106,115 L102,58"
          {...getStyle("Chest")} strokeWidth={1.5}
          {...getProps("Chest")}
        />
        <Line x1={70} y1={48} x2={70} y2={115} stroke={wireL} strokeWidth={1} strokeDasharray="4,3" />
        <Line x1={40} y1={75} x2={100} y2={75} stroke={wireL} strokeWidth={1} />
        <Line x1={38} y1={95} x2={102} y2={95} stroke={wireL} strokeWidth={1} />

        {/* Core */}
        <AnimatedEllipse
          cx={70} cy={117} rx={22} ry={8}
          {...getStyle("Core")} strokeWidth={1.2}
          {...getProps("Core")}
        />

        {/* Left Leg */}
        <AnimatedPath d="M38,58 L18,95 L15,130" {...getStyle("Arms")} strokeWidth={1.5} strokeLinecap="round" {...getProps("Arms")} />
        {/* Right Leg */}
        <AnimatedPath d="M102,58 L122,95 L125,130" {...getStyle("Arms")} strokeWidth={1.5} strokeLinecap="round" {...getProps("Arms")} />

        {/* Left Quad */}
        <AnimatedPath d="M55,122 L50,162 L48,192" {...getStyle("Quads")} strokeWidth={1.5} strokeLinecap="round" {...getProps("Quads")} />
        {/* Right Quad */}
        <AnimatedPath d="M85,122 L90,162 L92,192" {...getStyle("Quads")} strokeWidth={1.5} strokeLinecap="round" {...getProps("Quads")} />

        {/* Knees */}
        <AnimatedCircle cx={50} cy={162} r={4} {...getStyle("Knees")} strokeWidth={1.5} {...getProps("Knees")} />
        <AnimatedCircle cx={90} cy={162} r={4} {...getStyle("Knees")} strokeWidth={1.5} {...getProps("Knees")} />
      </Svg>
    </View>
  );
}

export default function WorkoutBuilderScreen({ onNavigateBack, onStartWorkout }: { onNavigateBack?: () => void; onStartWorkout?: () => void }) {
  const { C } = useTheme();
  const styles = useMemo(() => getStyles(C), [C]);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const { data: currentWorkout } = useQuery({ queryKey: ['currentWorkout'], queryFn: () => fetchCurrentWorkout() });
  
  const { data: versionsData } = useQuery({
    queryKey: ['workoutVersions', currentWorkout?.id],
    queryFn: () => fetchWorkoutVersions(currentWorkout?.id!),
    enabled: !!currentWorkout?.id
  });

  const [activeSimulation, setActiveSimulation] = useState("Latest");
  const simulations = ["Latest", "20 min Quick", "Home (No Equip)"];
  const queryClient = useQueryClient();

  const [exercises, setExercises] = useState<any[]>([]);

  React.useEffect(() => {
    if (currentWorkout?.exercises) {
      setExercises(currentWorkout.exercises);
    }
  }, [currentWorkout]);

  const { mutate: saveWork } = useMutation({
    mutationFn: (data: any) => saveWorkout(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentWorkout'] });
      queryClient.invalidateQueries({ queryKey: ['workoutVersions'] });
      onNavigateBack?.();
    }
  });

  const [aiPrompt, setAiPrompt] = useState("");
  const { mutate: aiGenerateWork, isPending: isAiGenerating } = useMutation({
    mutationFn: (promptText: string) => {
      const { generateWorkout } = require('../services/api/workout');
      return generateWorkout(promptText, currentWorkout?.id);
    },
    onSuccess: (data) => {
      if (data.exercises) {
        setExercises(data.exercises);
      }
      setAiPrompt("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  });

  const handleAiGenerate = () => {
    if (!aiPrompt.trim()) return;
    haptic();
    aiGenerateWork(aiPrompt);
  };

  const handleSave = () => {
    haptic();
    saveWork({
      userId: 'demo-user-id',
      title: currentWorkout?.title || 'Push Day',
      duration: currentWorkout?.duration || '60',
      parentVersionId: currentWorkout?.parentVersionId || currentWorkout?.id,
      exercises: exercises
    });
  };

  // Mock profile data
  const injuredMuscles = ["Shoulders"]; // User has a reported shoulder injury
  const targetedMuscles = Array.from(new Set(exercises.map((e) => e.muscle || 'Full Body')));

  // Real-time conflict detection (FR-008)
  const conflicts = targetedMuscles.filter((m) => injuredMuscles.includes(m));

  const haptic = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
  };

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => { scrollY.value = e.contentOffset.y; },
  });

  const headerBlurStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 50], [0, 1], Extrapolate.CLAMP),
  }));

  const headerTextStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(scrollY.value, [0, 50], [1, 0.9], Extrapolate.CLAMP) },
      { translateY: interpolate(scrollY.value, [0, 50], [0, -4], Extrapolate.CLAMP) }
    ]
  }));

  const shimmerX = useSharedValue(-250);
  React.useEffect(() => {
    shimmerX.value = withRepeat(withTiming(350, { duration: 3000 }), -1, false);
  }, []);
  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value }]
  }));

  const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);
  const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

  const moveUp = (index: number) => {
    if (index === 0) return;
    haptic();
    const newEx = [...exercises];
    [newEx[index - 1], newEx[index]] = [newEx[index], newEx[index - 1]];
    setExercises(newEx);
  };

  const moveDown = (index: number) => {
    if (index === exercises.length - 1) return;
    haptic();
    const newEx = [...exercises];
    [newEx[index + 1], newEx[index]] = [newEx[index], newEx[index + 1]];
    setExercises(newEx);
  };

  const remove = (id: string) => {
    haptic();
    setExercises((e) => e.filter((x) => x.id !== id));
  };

  const renderHeader = () => (
    <>
      <View style={styles.explanationBanner}>
        <Text style={styles.explanationText}>
          <Text style={{ fontFamily: F.bodyBold, color: C.primary }}>
            AI Note:{" "}
          </Text>
          Reduced overall shoulder pressing volume by 20% due to your
          reported soreness yesterday.
        </Text>
      </View>
      <ActiveBodyMap
        targetedMuscles={targetedMuscles}
        injuredMuscles={injuredMuscles}
        C={C}
      />
      {conflicts.length > 0 && (
        <Animated.View
          entering={FadeInUp}
          exiting={FadeOutUp}
          style={[styles.conflictBanner, { overflow: 'hidden' }]}
        >
          <AnimatedLinearGradient 
            colors={['transparent', 'rgba(239, 68, 68, 0.15)', 'transparent']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[StyleSheet.absoluteFill, shimmerStyle, { width: '150%' }]} 
          />
          <Icon name="warning" size={20} color={C.error} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.conflictTitle}>
              Injury Conflict Detected
            </Text>
            <Text style={styles.conflictText}>
              You have a reported injury in your {conflicts.join(", ")}. The
              AI strongly recommends replacing exercises targeting these
              areas.
            </Text>
          </View>
        </Animated.View>
      )}

      {/* Simulator Toggles (FR-012) */}
      <View style={{ marginTop: 24 }}>
        <Text style={styles.sectionTitle}>SIMULATE SCENARIO</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
          {simulations.map((sim, i) => (
            <AnimatedPressable
              key={i}
              scaleTo={0.95}
              onPress={() => {
                haptic();
                setActiveSimulation(sim);
              }}
              style={[
                styles.simChip,
                activeSimulation === sim && styles.simChipActive
              ]}
            >
              <Text style={[
                styles.simChipText,
                activeSimulation === sim && styles.simChipTextActive
              ]}>{sim}</Text>
            </AnimatedPressable>
          ))}
        </ScrollView>
      </View>

      <View style={{ marginTop: 24 }}>
        <Text style={styles.sectionTitle}>WORKOUT FLOW</Text>
      </View>
      
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.glassInset, borderRadius: 16, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: C.outlineVariant }}>
        <TextInput
          placeholder="Ask AI (e.g. 'Add a tricep exercise')"
          placeholderTextColor={C.onSurfaceVariant}
          style={{ flex: 1, color: C.onSurface, fontFamily: F.body, fontSize: 14 }}
          value={aiPrompt}
          onChangeText={setAiPrompt}
          onSubmitEditing={handleAiGenerate}
          returnKeyType="send"
        />
        <TouchableOpacity onPress={handleAiGenerate} style={{ backgroundColor: C.primary, padding: 8, borderRadius: 12 }}>
          {isAiGenerating ? (
            <ActivityIndicator size="small" color={C.onPrimary} />
          ) : (
            <Icon name="add" size={16} color={C.onPrimary} />
          )}
        </TouchableOpacity>
      </View>
    </>
  );

  const renderFooter = () => (
    <>
      <AnimatedPressable style={styles.addButton} scaleTo={0.96}>
        <Icon name="add" color={C.onSurfaceVariant} size={20} />
        <Text style={styles.addButtonText}>Add Exercise</Text>
      </AnimatedPressable>
      <View style={{ height: 100 }} />
    </>
  );

  return (
    <View style={styles.safe}>
      <MeshGradientBackground bgColors={bgColors} isDark={isDark} />

      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <AnimatedBlurView intensity={80} tint={C.blurTint} style={[StyleSheet.absoluteFill, headerBlurStyle]} />
          <TouchableOpacity style={styles.headerIcon} onPress={onNavigateBack}>
            <Icon name="chevron-left" color={C.onSurfaceVariant} />
          </TouchableOpacity>
          <Animated.View style={[styles.headerTextContainer, headerTextStyle]}>
            <Text style={styles.headerTitle}>Push Day — V3</Text>
            <Text style={styles.headerSubtitle}>AI Adjusted for Recovery</Text>
          </Animated.View>
          <TouchableOpacity style={styles.headerIcon} onPress={() => setIsHistoryOpen(true)}>
            <Icon name="history" color={C.primary} />
          </TouchableOpacity>
        </View>

        {Platform.OS === 'web' ? (
          <Animated.ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
          >
            {renderHeader()}
            {exercises.map((item, index) => (
              <ExerciseCard
                key={item.id}
                exercise={item}
                isDark={isDark}
                isFirst={index === 0}
                isLast={index === exercises.length - 1}
                onMoveUp={() => moveUp(index)}
                onMoveDown={() => moveDown(index)}
                onRemove={() => remove(item.id)}
                onDuplicate={() => {
                  const duplicated = { ...item, id: Math.random().toString(36).substring(7) };
                  const newExercises = [...exercises];
                  newExercises.splice(index + 1, 0, duplicated);
                  setExercises(newExercises);
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                onEdit={() => {
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  // Open an edit modal (we can just alert for now or implement a quick edit state)
                }}
              />
            ))}
            {renderFooter()}
          </Animated.ScrollView>
        ) : (
          <DraggableFlatList
            style={{ flex: 1 }}
            data={exercises}
            onDragEnd={({ data }) => setExercises(data)}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            ListHeaderComponent={renderHeader}
            renderItem={({ item, drag, isActive, getIndex }) => {
              const index = getIndex() || 0;
              return (
                <ExerciseCard
                  exercise={item}
                  isDark={isDark}
                  isFirst={index === 0}
                  isLast={index === exercises.length - 1}
                  onMoveUp={() => moveUp(index)}
                  onMoveDown={() => moveDown(index)}
                  onRemove={() => remove(item.id)}
                  onDuplicate={() => {
                    const duplicated = { ...item, id: Math.random().toString(36).substring(7) };
                    const newExercises = [...exercises];
                    newExercises.splice(index + 1, 0, duplicated);
                    setExercises(newExercises);
                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  onEdit={() => {
                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  drag={drag}
                  isActive={isActive}
                />
              );
            }}
            ListFooterComponent={renderFooter}
          />
        )}
      </SafeAreaView>

      {/* Floating Action Bar */}
      <BlurView intensity={80} tint={C.blurTint} style={styles.fabContainer}>
        <AnimatedPressable style={[styles.saveButton, { overflow: 'hidden' }]} scaleTo={0.94} onPress={handleSave}>
          <AnimatedLinearGradient 
            colors={['transparent', 'rgba(255, 255, 255, 0.25)', 'transparent']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[StyleSheet.absoluteFill, shimmerStyle, { width: '150%' }]} 
          />
          <Text style={styles.saveButtonText}>Lock & Start Workout</Text>
        </AnimatedPressable>
      </BlurView>

      {/* Version History Drawer (FR-002) */}
      {isHistoryOpen && (
        <Animated.View 
          entering={FadeIn} exiting={FadeOut}
          style={[StyleSheet.absoluteFill, { zIndex: 1000 }]}
        >
          {/* Backdrop */}
          <TouchableOpacity 
            style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} 
            onPress={() => setIsHistoryOpen(false)} 
            activeOpacity={1}
          />
          
          {/* Drawer */}
          <Animated.View 
            entering={SlideInDown.springify().damping(16).stiffness(140)}
            exiting={SlideOutDown}
            style={styles.historyDrawer}
          >
            <View style={styles.drawerHandle} />
            <Text style={styles.drawerTitle}>Version History</Text>
            
            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              {versionsData?.map((v: any, i: number) => (
                <View key={v.id || i} style={[styles.historyItem, v.isCurrent && { borderColor: C.primary }]}>
                  <View style={styles.historyItemHeader}>
                    <Text style={styles.historyItemTitle}>Version {v.versionNumber} {v.isCurrent && '(Current)'}</Text>
                    <Text style={styles.historyItemTime}>{new Date(v.createdAt).toLocaleDateString()}</Text>
                  </View>
                  <Text style={styles.historyItemDesc}>{v.aiExplanation || 'Manual edit.'}</Text>
                  
                  {!v.isCurrent && (
                    <TouchableOpacity style={styles.rollbackButton} onPress={() => {
                      haptic();
                      setExercises(v.exercises);
                      setIsHistoryOpen(false);
                    }}>
                      <Text style={styles.rollbackButtonText}>Restore this version</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              {!versionsData?.length && (
                <Text style={{ color: C.onSurfaceVariant, fontFamily: F.body }}>No version history found.</Text>
              )}
            </ScrollView>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

const getStyles = (C: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    header: {
      paddingHorizontal: 16,
      paddingTop:
        Platform.OS === "android" ? (RNStatusBar.currentHeight ?? 0) + 12 : 12,
      paddingBottom: 16,
      flexDirection: "row",
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor: C.outlineVariant,
    },
    headerIcon: { padding: 8, backgroundColor: C.glassInset, borderRadius: 12 },
    headerTextContainer: { flex: 1, alignItems: "center" },
    headerTitle: { fontFamily: F.header, fontSize: 18, color: C.onSurface },
    headerSubtitle: {
      fontFamily: F.bodyMed,
      fontSize: 13,
      color: C.primary,
      marginTop: 2,
    },

    scrollContent: { padding: 16 },

    explanationBanner: {
      padding: 16,
      backgroundColor: C.primary + "1A", // 10% opacity
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.primary + "33",
      marginBottom: 24,
    },
    explanationText: {
      fontFamily: F.body,
      fontSize: 14,
      color: C.onSurface,
      lineHeight: 22,
    },

    conflictBanner: {
      flexDirection: "row",
      padding: 16,
      backgroundColor: C.error + "1A",
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.error + "4D",
      marginBottom: 24,
    },
    conflictTitle: {
      fontFamily: F.bodyBold,
      fontSize: 14,
      color: C.error,
      marginBottom: 4,
    },
    conflictText: {
      fontFamily: F.body,
      fontSize: 13,
      color: C.onSurface,
      lineHeight: 20,
    },

    sectionTitle: {
      fontFamily: F.header,
      fontSize: 12,
      letterSpacing: 1.5,
      color: C.onSurfaceVariant,
      marginBottom: 12,
      marginLeft: 4,
    },

    addButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.outlineVariant,
      borderStyle: "dashed",
      backgroundColor: C.glassInset,
      marginTop: 8,
    },
    addButtonText: {
      fontFamily: F.bodyMed,
      fontSize: 14,
      color: C.onSurfaceVariant,
      marginLeft: 8,
    },

    fabContainer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      padding: 16,
      paddingBottom: Platform.OS === "ios" ? 32 : 16,
      borderTopWidth: 1,
      borderTopColor: C.outlineVariant,
    },
    saveButton: {
      backgroundColor: C.primary,
      paddingVertical: 16,
      borderRadius: 100,
      alignItems: "center",
      shadowColor: C.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
    },
    saveButtonText: { fontFamily: F.header, fontSize: 16, color: C.onPrimary },

    simChip: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 100,
      backgroundColor: C.glassInset,
      borderWidth: 1,
      borderColor: C.outlineVariant,
      marginRight: 8,
    },
    simChipActive: {
      backgroundColor: C.primary + "22",
      borderColor: C.primary,
    },
    simChipText: {
      fontFamily: F.bodyMed,
      fontSize: 13,
      color: C.onSurfaceVariant,
    },
    simChipTextActive: {
      color: C.primary,
    },
    historyDrawer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: C.bg,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      paddingBottom: Platform.OS === 'ios' ? 48 : 24,
      borderTopWidth: 1,
      borderTopColor: C.outlineVariant,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -10 },
      shadowOpacity: 0.2,
      shadowRadius: 20,
      elevation: 20,
    },
    drawerHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: C.outline,
      alignSelf: 'center',
      marginBottom: 20,
    },
    drawerTitle: {
      fontFamily: F.header,
      fontSize: 20,
      color: C.onSurface,
      marginBottom: 16,
    },
    historyItem: {
      padding: 16,
      borderRadius: 16,
      backgroundColor: C.glassInset,
      borderWidth: 1,
      borderColor: C.outlineVariant,
      marginBottom: 12,
    },
    historyItemHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    historyItemTitle: {
      fontFamily: F.bodyBold,
      fontSize: 15,
      color: C.onSurface,
    },
    historyItemTime: {
      fontFamily: F.body,
      fontSize: 12,
      color: C.outline,
    },
    historyItemDesc: {
      fontFamily: F.body,
      fontSize: 13,
      color: C.onSurfaceVariant,
      lineHeight: 20,
    },
    rollbackButton: {
      marginTop: 12,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 100,
      backgroundColor: C.surface,
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderColor: C.outlineVariant,
    },
    rollbackButtonText: {
      fontFamily: F.bodyMed,
      fontSize: 13,
      color: C.onSurface,
    },
  });
