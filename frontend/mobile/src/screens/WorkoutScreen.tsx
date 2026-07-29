import React, { useState, useEffect, useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Platform,
    TextInput,
    Pressable,
    Dimensions,
    StatusBar as RNStatusBar,
    KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
    FadeInUp,
    FadeIn,
    FadeOut,
    Layout,
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withRepeat,
    withSequence,
    interpolate,
    interpolateColor,
    Extrapolation,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import Svg, { Path, Circle, Ellipse, Rect } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useTheme } from "../context/ThemeContext";
import { F, ThemeColors } from "../theme";
import MeshGradientBackground from "../components/MeshGradientBackground";
import {
    fetchCurrentWorkout,
    fetchWorkoutHistory,
    generateWorkout,
    saveWorkout,
    startSession,
    completeSession,
    updateExerciseStatus,
} from "../services/api/workout";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

// ─────────────────────────────────────────────────────────────────────────
// ICONS — consolidated path set used across Dashboard / Profile / Workout
// ─────────────────────────────────────────────────────────────────────────
const ICON_PATHS: Record<string, string> = {
    "chevron-left": "M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z",
    "chevron-right": "M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z",
    history:
        "M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z",
    "auto-awesome":
        "M19 4h-2V2h-2v2h-2v2h2v2h2V6h2V4zM10.83 8.35l-2.33-6.14c-.16-.41-.75-.41-.91 0L5.26 8.35 1.55 9.77c-.45.17-.45.8 0 .97l3.71 1.42 2.33 6.14c.16.41.75.41.91 0l2.33-6.14 3.71-1.42c.45-.17.45-.8 0-.97l-3.71-1.42zM7.5 13.91L6.37 10.9 3.36 9.77l3.01-1.13 1.13-3.01 1.13 3.01 3.01 1.13-3.01 1.13-1.13 3.01zM19 14h-2v-2h-2v2h-2v2h2v2h2v-2h2v-2z",
    "more-vert":
        "M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z",
    "play-circle":
        "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z",
    "play-arrow": "M8 5v14l11-7z",
    check: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
    timer:
        "M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.03-6.61l1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42A8.962 8.962 0 0012 4c-4.97 0-9 4.03-9 9s4.02 9 9 9 9-4.03 9-9c0-2.12-.74-4.07-1.97-5.61zM12 20c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z",
    "flash-on": "M7 2v11h3v9l7-12h-4l4-8z",
    "keyboard-arrow-down": "M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z",
    "keyboard-arrow-up": "M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6 1.41 1.41z",
    filter: "M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z",
    calendar:
        "M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z",
    "fitness-center":
        "M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z",
    "trending-up":
        "M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z",
    favorite:
        "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z",
    mic: "M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zM17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z",
    notifications:
        "M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5S10.5 3.17 10.5 4v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z",
};

function Icon({
    name,
    size = 24,
    color = "#fff",
}: {
    name: string;
    size?: number;
    color?: string;
}) {
    const d = ICON_PATHS[name];
    if (!d) return null;
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
            <Path d={d} />
        </Svg>
    );
}

// ─────────────────────────────────────────────────────────────────────────
// SHARED PRIMITIVES — same visual language as DashboardScreen / ProfileScreen
// ─────────────────────────────────────────────────────────────────────────

function haptic(style: "light" | "medium" | "success" = "light") {
    if (Platform.OS === "web") return;
    if (style === "success") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (style === "medium") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
}

function PressableScale({
    children,
    onPress,
    style,
    disabled = false,
}: {
    children: React.ReactNode;
    onPress?: () => void;
    style?: any;
    disabled?: boolean;
}) {
    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));
    return (
        <Pressable
            disabled={disabled}
            onPressIn={() => {
                scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
            }}
            onPressOut={() => {
                scale.value = withSpring(1, { damping: 15, stiffness: 300 });
            }}
            onPress={() => {
                haptic("light");
                onPress?.();
            }}
            style={style}
        >
            <Animated.View style={animatedStyle}>{children}</Animated.View>
        </Pressable>
    );
}

/** Glass card matching Dashboard's `.card` / Profile's `TiltCard` surface. */
function GlassCard({
    children,
    style,
    C,
    glow,
}: {
    children: React.ReactNode;
    style?: any;
    C: ThemeColors;
    glow?: boolean;
}) {
    return (
        <View
            style={[
                {
                    padding: 16,
                },
                style,
            ]}
        >
            {children}
        </View>
    );
}

function SectionLabel({ text, C }: { text: string; C: ThemeColors }) {
    return (
        <Text
            style={{
                fontFamily: F.header,
                fontSize: 11,
                letterSpacing: 1.5,
                color: C.onSurfaceVariant,
                marginBottom: 12,
                marginLeft: 4,
            }}
        >
            {text}
        </Text>
    );
}

function Entrance({
    children,
    index = 0,
    style,
}: {
    children: React.ReactNode;
    index?: number;
    style?: any;
}) {
    return (
        <Animated.View
            entering={FadeInUp.delay(index * 90)
                .springify()
                .damping(15)}
            layout={Layout.springify().damping(16)}
            style={style}
        >
            {children}
        </Animated.View>
    );
}

// ─────────────────────────────────────────────────────────────────────────
// SEGMENTED TAB BAR — animated sliding pill (same feel as Profile's nav dot)
// ─────────────────────────────────────────────────────────────────────────
const TABS = [
    { key: "overview", label: "Overview" },
    { key: "builder", label: "Builder" },
    { key: "active", label: "Active" },
    { key: "history", label: "History" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

function WorkoutTabs({
    active,
    onChange,
    C,
    isDark,
}: {
    active: TabKey;
    onChange: (t: TabKey) => void;
    C: ThemeColors;
    isDark: boolean;
}) {
    const [barWidth, setBarWidth] = useState(0);
    const segW = barWidth / TABS.length;
    const activeIndex = TABS.findIndex((t) => t.key === active);
    const pos = useSharedValue(0);

    useEffect(() => {
        if (segW > 0) {
            pos.value = withSpring(activeIndex * segW, { damping: 16, stiffness: 180 });
        }
    }, [activeIndex, segW]);

    const pillStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: pos.value }],
        width: segW,
    }));

    return (
        <View
            onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
            style={{
                flexDirection: "row",
                backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
                borderRadius: 18,
                borderWidth: 1,
                borderColor: C.outlineVariant,
                padding: 4,
                marginHorizontal: 20,
                marginBottom: 20,
            }}
        >
            {barWidth > 0 && (
                <Animated.View
                    style={[
                        {
                            position: "absolute",
                            top: 4,
                            bottom: 4,
                            left: 4,
                            borderRadius: 14,
                            backgroundColor: C.primary,
                        },
                        pillStyle,
                    ]}
                />
            )}
            {TABS.map((t) => {
                const isActive = t.key === active;
                return (
                    <TouchableOpacity
                        key={t.key}
                        onPress={() => {
                            haptic("light");
                            onChange(t.key);
                        }}
                        style={{ flex: 1, paddingVertical: 10, alignItems: "center" }}
                    >
                        <Text
                            style={{
                                fontFamily: isActive ? F.header : F.bodyMed,
                                fontSize: 13,
                                color: isActive ? C.onPrimary : C.onSurfaceVariant,
                            }}
                        >
                            {t.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

// ─────────────────────────────────────────────────────────────────────────
// MUSCLE MAP — small wireframe body used in Builder tab
// ─────────────────────────────────────────────────────────────────────────
function MuscleMap({
    targeted,
    C,
}: {
    targeted: string[];
    C: ThemeColors;
}) {
    const wire = C.onSurfaceVariant + "40";
    const hit = (m: string) => targeted.includes(m);
    const getStyle = (m: string) => ({
        fill: hit(m) ? C.primary + "55" : "none",
        stroke: hit(m) ? C.primary : wire,
    });
    return (
        <View style={{ height: 190, alignItems: "center", justifyContent: "center" }}>
            <Svg width={140} height={180} viewBox="0 0 140 200">
                <Ellipse cx={70} cy={18} rx={16} ry={18} {...getStyle("Neck")} strokeWidth={1.5} />
                <Rect x={63} y={35} width={14} height={10} fill="none" stroke={wire} strokeWidth={1} />
                <Path d="M30,58 Q50,48 70,48 Q90,48 110,58" {...getStyle("Shoulders")} strokeWidth={1.5} />
                <Path d="M38,58 L34,115 Q70,125 106,115 L102,58" {...getStyle("Chest")} strokeWidth={1.5} />
                <Ellipse cx={70} cy={117} rx={22} ry={8} {...getStyle("Core")} strokeWidth={1.2} />
                <Path d="M38,58 L18,95 L15,130" {...getStyle("Arms")} strokeWidth={1.5} strokeLinecap="round" />
                <Path d="M102,58 L122,95 L125,130" {...getStyle("Arms")} strokeWidth={1.5} strokeLinecap="round" />
                <Path d="M55,122 L50,162 L48,192" {...getStyle("Quads")} strokeWidth={1.5} strokeLinecap="round" />
                <Path d="M85,122 L90,162 L92,192" {...getStyle("Quads")} strokeWidth={1.5} strokeLinecap="round" />
                <Circle cx={50} cy={162} r={4} {...getStyle("Knees")} strokeWidth={1.5} />
                <Circle cx={90} cy={162} r={4} {...getStyle("Knees")} strokeWidth={1.5} />
            </Svg>
        </View>
    );
}

// ─────────────────────────────────────────────────────────────────────────
// OVERVIEW TAB — hero + AI recommendation + inset exercise list (WorkoutHome)
// ─────────────────────────────────────────────────────────────────────────
function OverviewTab({
    workout,
    onGoBuilder,
    onGoActive,
    onGoHistory,
    C,
    isDark,
}: any) {
    const [aiOpen, setAiOpen] = useState(false);
    const exercises = workout?.exercises?.length
        ? workout.exercises
        : [
            { id: "m1", name: "Barbell Bench Press", sets: 4, reps: 8, weight: 80 },
            { id: "m2", name: "Incline Dumbbell Press", sets: 3, reps: 10, weight: 30 },
            { id: "m3", name: "Overhead Press", sets: 3, reps: 10, weight: 45 },
            { id: "m4", name: "Lateral Raises", sets: 4, reps: 15, weight: 12 },
        ];

    return (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
            {/* Hero */}
            <Entrance index={0}>
                <GlassCard C={C} glow style={{ borderRadius: 32, padding: 20, marginBottom: 20 }}>
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                            alignSelf: "flex-start",
                            backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 20,
                            marginBottom: 12,
                        }}
                    >
                        <Icon name="auto-awesome" size={12} color={C.primary} />
                        <Text style={{ fontFamily: F.header, fontSize: 11, letterSpacing: 1.5, color: C.primary }}>
                            TODAY'S OPTIMIZED PLAN
                        </Text>
                    </View>
                    <Text style={{ fontFamily: F.header, fontSize: 26, color: C.onSurface, letterSpacing: -0.5 }}>
                        {workout?.title || "Push Strength"}
                    </Text>
                    <Text style={{ fontFamily: F.bodyMed, fontSize: 14, color: C.onSurfaceVariant, marginTop: 4 }}>
                        Focus: {workout?.targetMuscles || "Chest • Shoulders • Triceps"}
                    </Text>

                    <View style={{ flexDirection: "row", gap: 24, marginTop: 16 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <Icon name="timer" size={18} color={C.primary} />
                            <Text style={{ fontFamily: "JetBrainsMono-Regular", fontSize: 14, color: C.onSurface }}>
                                {workout?.duration || "45"}m
                            </Text>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <Icon name="fitness-center" size={18} color={C.primary} />
                            <Text style={{ fontFamily: "JetBrainsMono-Regular", fontSize: 14, color: C.onSurface }}>
                                {exercises.length} Ex
                            </Text>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <Icon name="trending-up" size={18} color={C.primary} />
                            <Text style={{ fontFamily: "JetBrainsMono-Regular", fontSize: 14, color: C.onSurface }}>420 kcal</Text>
                        </View>
                    </View>

                    <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
                        <PressableScale
                            onPress={onGoActive}
                            style={{
                                flex: 1.4,
                                backgroundColor: C.primary,
                                borderRadius: 12,
                                paddingVertical: 10,
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 8,
                            }}
                        >
                            <Icon name="play-arrow" size={16} color={C.onPrimary} />
                            <Text style={{ fontFamily: F.header, fontSize: 14, color: C.onPrimary }}>Start</Text>
                        </PressableScale>
                        <PressableScale
                            onPress={onGoBuilder}
                            style={{
                                flex: 1,
                                backgroundColor: "transparent",
                                borderRadius: 12,
                                paddingVertical: 10,
                                alignItems: "center",
                                justifyContent: "center",
                                borderWidth: 1,
                                borderColor: C.outlineVariant,
                            }}
                        >
                            <Text style={{ fontFamily: F.header, fontSize: 14, color: C.onSurface }}>Customize</Text>
                        </PressableScale>
                    </View>
                </GlassCard>
            </Entrance>

            {/* AI Recommendation */}
            <Entrance index={1}>
                <GlassCard C={C} glow style={{ marginBottom: 20 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <Icon name="auto-awesome" size={18} color={C.primary} />
                            <Text style={{ fontFamily: F.header, fontSize: 17, color: C.onSurface }}>AI Recommendation</Text>
                        </View>
                        <TouchableOpacity onPress={() => setAiOpen(!aiOpen)} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <Text style={{ fontFamily: F.bodyBold, fontSize: 13, color: C.onSurfaceVariant }}>Details</Text>
                            <Icon name={aiOpen ? "keyboard-arrow-up" : "keyboard-arrow-down"} size={18} color={C.onSurfaceVariant} />
                        </TouchableOpacity>
                    </View>

                    <View
                        style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            backgroundColor: isDark ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.5)",
                            borderRadius: 20,
                            padding: 12,
                            marginBottom: 16,
                        }}
                    >
                        <View style={{ alignItems: "center", gap: 4 }}>
                            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(74,222,128,0.15)", alignItems: "center", justifyContent: "center" }}>
                                <Icon name="favorite" size={18} color="#4ade80" />
                            </View>
                            <Text style={{ fontFamily: "JetBrainsMono-Regular", fontSize: 15, color: C.onSurface }}>92%</Text>
                            <Text style={{ fontFamily: F.bodyMed, fontSize: 11, color: C.onSurfaceVariant }}>RECOVERY</Text>
                        </View>
                        <View style={{ alignItems: "center", gap: 4 }}>
                            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(56,189,248,0.15)", alignItems: "center", justifyContent: "center" }}>
                                <Icon name="timer" size={18} color="#38bdf8" />
                            </View>
                            <Text style={{ fontFamily: "JetBrainsMono-Regular", fontSize: 15, color: C.onSurface }}>7h 45m</Text>
                            <Text style={{ fontFamily: F.bodyMed, fontSize: 11, color: C.onSurfaceVariant }}>SLEEP</Text>
                        </View>
                        <View style={{ alignItems: "center", gap: 4 }}>
                            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(251,191,36,0.15)", alignItems: "center", justifyContent: "center" }}>
                                <Icon name="auto-awesome" size={18} color="#fbbf24" />
                            </View>
                            <Text style={{ fontFamily: "JetBrainsMono-Regular", fontSize: 15, color: C.onSurface }}>High</Text>
                            <Text style={{ fontFamily: F.bodyMed, fontSize: 11, color: C.onSurfaceVariant }}>READINESS</Text>
                        </View>
                    </View>

                    <Text style={{ fontFamily: F.body, fontSize: 14, color: C.onSurface, lineHeight: 22 }}>
                        {workout?.aiExplanation ||
                            "Chest fully recovered. Increase pushing volume by 8% based on your logged history."}
                    </Text>

                    {aiOpen && (
                        <Animated.View entering={FadeInUp.springify().damping(15)} exiting={FadeOut.duration(150)} style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: C.outlineVariant }}>
                            <Text style={{ fontFamily: F.bodyBold, fontSize: 13, color: C.onSurface, marginBottom: 4 }}>Recovery Adjustment</Text>
                            <Text style={{ fontFamily: F.body, fontSize: 13, color: C.onSurfaceVariant, marginBottom: 12 }}>
                                Reduced volume by 10% due to low HRV this morning.
                            </Text>
                            <Text style={{ fontFamily: F.bodyBold, fontSize: 13, color: C.onSurface, marginBottom: 4 }}>Progressive Overload</Text>
                            <Text style={{ fontFamily: F.body, fontSize: 13, color: C.onSurfaceVariant }}>
                                Increased Bench Press weight by 5 lbs from last session.
                            </Text>
                        </Animated.View>
                    )}
                </GlassCard>
            </Entrance>

            {/* Inset exercise list */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingHorizontal: 4 }}>
                <SectionLabel text="TODAY'S EXERCISES" C={C} />
                <TouchableOpacity onPress={onGoBuilder}>
                    <Text style={{ fontFamily: F.header, fontSize: 14, color: C.primary }}>Edit</Text>
                </TouchableOpacity>
            </View>
            <Entrance index={2}>
                <GlassCard C={C} style={{ padding: 0, marginBottom: 20 }}>
                    {exercises.map((ex: any, i: number) => (
                        <View
                            key={ex.id || i}
                            style={{
                                flexDirection: "row",
                                alignItems: "center",
                                paddingVertical: 14,
                                paddingHorizontal: 16,
                                borderBottomWidth: i === exercises.length - 1 ? 0 : 1,
                                borderBottomColor: C.outlineVariant,
                            }}
                        >
                            <View
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 16,
                                    backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <Text style={{ fontFamily: "JetBrainsMono-Regular", fontSize: 13, color: C.onSurfaceVariant }}>{i + 1}</Text>
                            </View>
                            <View style={{ flex: 1, marginHorizontal: 14 }}>
                                <Text style={{ fontFamily: F.header, fontSize: 16, color: C.onSurface, letterSpacing: -0.3 }}>{ex.name}</Text>
                                <Text style={{ fontFamily: "JetBrainsMono-Regular", fontSize: 12, color: C.primary, marginTop: 2 }}>
                                    {ex.sets}x{ex.reps} • {ex.weight}kg
                                </Text>
                            </View>
                            <View style={{ alignItems: "flex-end" }}>
                                <Text style={{ fontFamily: "JetBrainsMono-Regular", fontSize: 15, color: C.onSurface }}>
                                    ~{Math.round(ex.sets * ex.reps * 0.8)}
                                </Text>
                                <Text style={{ fontFamily: F.bodyMed, fontSize: 10, color: C.onSurfaceVariant, marginTop: 2 }}>kcal</Text>
                            </View>
                        </View>
                    ))}
                </GlassCard>
            </Entrance>

            <TouchableOpacity onPress={onGoHistory} style={{ alignItems: "center", paddingVertical: 8 }}>
                <Text style={{ fontFamily: F.bodyBold, fontSize: 13, color: C.onSurfaceVariant }}>View past sessions →</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

// ─────────────────────────────────────────────────────────────────────────
// BUILDER TAB — muscle map, AI editor, chips, editable exercise cards
// ─────────────────────────────────────────────────────────────────────────
function BuilderExerciseCard({ ex, C, isDark }: any) {
    return (
        <Entrance style={{ marginBottom: 14 }}>
            <View style={{ paddingVertical: 12 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                        <View
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 10,
                                backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                                marginRight: 12,
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <Icon name="play-circle" size={22} color={C.onSurfaceVariant} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontFamily: F.header, fontSize: 16, color: C.onSurface }}>{ex.name}</Text>
                            <Text style={{ fontFamily: F.bodyMed, fontSize: 12, color: C.primary, marginTop: 2 }}>
                                {ex.muscle || "Full Body"} • {ex.sets} Sets
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity style={{ padding: 8 }}>
                        <Icon name="more-vert" size={20} color={C.onSurface} />
                    </TouchableOpacity>
                </View>
                <View style={{ flexDirection: "row", gap: 10 }}>
                    {[
                        { label: "TARGET", val: `${ex.reps} Reps` },
                        { label: "WEIGHT", val: `${ex.weight} lbs` },
                        { label: "REST", val: "60s" },
                    ].map((s) => (
                        <View
                            key={s.label}
                            style={{
                                flex: 1,
                                backgroundColor: isDark ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.03)",
                                padding: 10,
                                borderRadius: 12,
                                alignItems: "center",
                            }}
                        >
                            <Text style={{ fontFamily: F.bodyBold, fontSize: 10, color: C.onSurfaceVariant }}>{s.label}</Text>
                            <Text style={{ fontFamily: "JetBrainsMono-Regular", fontSize: 14, color: C.onSurface, marginTop: 4 }}>{s.val}</Text>
                        </View>
                    ))}
                </View>
            </View>
        </Entrance>
    );
}

function BuilderTab({ workout, onSave, C, isDark }: any) {
    const [exercises, setExercises] = useState<any[]>([]);
    const [aiPrompt, setAiPrompt] = useState("");

    useEffect(() => {
        if (workout?.exercises) setExercises(workout.exercises);
    }, [workout]);

    const { mutate: aiGenerate, isPending } = useMutation({
        mutationFn: (prompt: string) => generateWorkout(prompt, workout?.id),
        onSuccess: (data) => {
            if (data?.exercises) setExercises(data.exercises);
            setAiPrompt("");
            haptic("success");
        },
    });

    const targeted = Array.from(new Set(exercises.map((e) => e.muscle || "Full Body")));

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
                <Entrance index={0}>
                    <View style={{ marginBottom: 24 }}>
                        <SectionLabel text="MUSCLE ACTIVATION" C={C} />
                        <MuscleMap targeted={targeted} C={C} />
                    </View>
                </Entrance>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, marginBottom: 16 }}>
                    {["Home", "20 Min", "Injury Friendly", "Resistance Band"].map((chip) => (
                        <TouchableOpacity
                            key={chip}
                            style={{
                                paddingHorizontal: 16,
                                paddingVertical: 10,
                                borderRadius: 20,
                                backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                                borderWidth: 1,
                                borderColor: C.outlineVariant,
                            }}
                        >
                            <Text style={{ fontFamily: F.bodyMed, color: C.onSurface, fontSize: 13 }}>{chip}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
                        borderRadius: 24,
                        paddingHorizontal: 16,
                        borderWidth: 1,
                        borderColor: C.outlineVariant,
                        marginBottom: 20,
                    }}
                >
                    <Icon name="auto-awesome" size={18} color={C.primary} />
                    <TextInput
                        placeholder="Ask AI to replace an exercise..."
                        placeholderTextColor={C.onSurfaceVariant}
                        style={{ flex: 1, padding: 12, fontFamily: F.body, fontSize: 14, color: C.onSurface, height: 46 }}
                        value={aiPrompt}
                        onChangeText={setAiPrompt}
                        onSubmitEditing={() => aiPrompt && aiGenerate(aiPrompt)}
                    />
                    {isPending && <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: C.primary }} />}
                </View>

                <SectionLabel text="EXERCISES" C={C} />
                {exercises.map((ex, i) => (
                    <BuilderExerciseCard key={ex.id || i} ex={ex} C={C} isDark={isDark} />
                ))}
            </ScrollView>

            <View
                style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    paddingHorizontal: 24,
                    paddingTop: 16,
                    paddingBottom: Platform.OS === "ios" ? 34 : 20,
                }}
            >
                <BlurView intensity={isDark ? 80 : 100} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFillObject} />
                <PressableScale
                    onPress={() => onSave(exercises)}
                    style={{ borderRadius: 100, overflow: "hidden" }}
                >
                    <LinearGradient
                        colors={[C.primary, C.primaryDim]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{ paddingVertical: 16, alignItems: "center" }}
                    >
                        <Text style={{ fontFamily: F.header, fontSize: 16, color: C.onPrimary, letterSpacing: 0.5 }}>
                            Save & Lock Workout
                        </Text>
                    </LinearGradient>
                </PressableScale>
            </View>
        </KeyboardAvoidingView>
    );
}

// ─────────────────────────────────────────────────────────────────────────
// ACTIVE TAB — live session with set tracking, rest timer, progress ring
// ─────────────────────────────────────────────────────────────────────────
function CircularProgress({ progress, size = 52, color = "#eab308" }: any) {
    const strokeWidth = 4;
    const radius = (size - strokeWidth) / 2;
    const circum = radius * 2 * Math.PI;
    const dashOffset = circum - (progress / 100) * circum;
    return (
        <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
            <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
                <Circle stroke="rgba(255,255,255,0.08)" fill="none" cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} />
                <Circle
                    stroke={color}
                    fill="none"
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circum}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                />
            </Svg>
            <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}>
                <Icon name="flash-on" size={16} color={color} />
            </View>
        </View>
    );
}

function SetRow({ sIdx, isChecked, onToggle, weight, reps, C, isDark }: any) {
    return (
        <TouchableOpacity
            onPress={() => {
                haptic("light");
                onToggle();
            }}
            style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 12,
                paddingHorizontal: 12,
                borderRadius: 16,
                marginVertical: 4,
                borderWidth: 1,
                backgroundColor: isChecked
                    ? "rgba(234, 179, 8, 0.15)"
                    : isDark
                        ? "rgba(0,0,0,0.2)"
                        : "rgba(0,0,0,0.02)",
                borderColor: isChecked ? "rgba(234, 179, 8, 0.4)" : "transparent",
            }}
        >
            <Text style={{ flex: 0.3, fontFamily: "JetBrainsMono-Regular", color: C.onSurfaceVariant, fontSize: 14 }}>{sIdx + 1}</Text>
            <Text style={{ flex: 1, textAlign: "center", fontFamily: "JetBrainsMono-Regular", fontSize: 16, color: isChecked ? C.primary : C.onSurface }}>
                {weight}
            </Text>
            <Text style={{ flex: 1, textAlign: "center", fontFamily: "JetBrainsMono-Regular", fontSize: 16, color: isChecked ? C.primary : C.onSurface }}>
                {reps}
            </Text>
            <View style={{ flex: 0.4, alignItems: "flex-end" }}>
                <View
                    style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: isChecked ? C.primary : "transparent",
                        alignItems: "center",
                        justifyContent: "center",
                        borderWidth: 1.5,
                        borderColor: isChecked ? C.primary : C.outlineVariant,
                    }}
                >
                    {isChecked && <Icon name="check" size={18} color={C.onPrimary} />}
                </View>
            </View>
        </TouchableOpacity>
    );
}

function ActiveTab({ workout, onFinish, C, isDark }: any) {
    const queryClient = useQueryClient();
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [startTime, setStartTime] = useState<Date | null>(null);
    const [elapsed, setElapsed] = useState(0);
    const [exercises, setExercises] = useState<any[]>([]);
    const [completed, setCompleted] = useState<Record<string, boolean>>({});

    const activeTemplate = workout || {
        id: "mock-workout-id",
        title: "Push Strength",
        exercises: [
            { id: "m1", name: "Barbell Bench Press", sets: 4, reps: 8, weight: 80 },
            { id: "m2", name: "Incline Dumbbell Press", sets: 3, reps: 10, weight: 30 },
            { id: "m3", name: "Overhead Press", sets: 3, reps: 10, weight: 45 },
        ],
    };

    const startMutation = useMutation({
        mutationFn: startSession,
        onSuccess: (data) => {
            setSessionId(data.id);
            setStartTime(new Date(data.startTime));
        },
    });

    const completeMutation = useMutation({
        mutationFn: completeSession,
        onSuccess: () => {
            haptic("success");
            onFinish();
        },
    });

    useEffect(() => {
        if (exercises.length === 0) {
            setExercises(
                activeTemplate.exercises.map((ex: any) => ({
                    ...ex,
                    setsData: Array.from({ length: ex.sets }).map(() => ({ weight: ex.weight, reps: ex.reps })),
                }))
            );
        }
        if (!sessionId && !startMutation.isPending) {
            startMutation.mutate({
                userId: "demo-user-id",
                workoutId: activeTemplate.id,
                title: activeTemplate.title,
                exercises: activeTemplate.exercises,
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!startTime) return;
        const t = setInterval(() => setElapsed(Math.floor((Date.now() - startTime.getTime()) / 1000)), 1000);
        return () => clearInterval(t);
    }, [startTime]);

    const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

    const toggleSet = (exIdx: number, sIdx: number) => {
        setCompleted((prev) => ({ ...prev, [`${exIdx}-${sIdx}`]: !prev[`${exIdx}-${sIdx}`] }));
    };

    let totalSets = 0;
    let doneSets = 0;
    exercises.forEach((ex, i) => {
        totalSets += ex.sets;
        for (let s = 0; s < ex.sets; s++) if (completed[`${i}-${s}`]) doneSets++;
    });
    const progress = totalSets > 0 ? (doneSets / totalSets) * 100 : 0;

    const handleFinish = () => {
        const duration = startTime ? Math.floor((Date.now() - startTime.getTime()) / 60000) : 45;
        completeMutation.mutate({
            sessionId: sessionId || "mock-session-id",
            duration,
            caloriesBurned: duration * 8,
            notes: "",
            completedSetIds: [],
        });
        queryClient.invalidateQueries({ queryKey: ["workoutHistory"] });
    };

    if (exercises.length === 0) {
        return (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: C.onSurface, fontFamily: F.body }}>Loading Workout...</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
                <Entrance index={0}>
                    <GlassCard C={C} style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
                        <CircularProgress progress={progress} />
                        <View style={{ marginLeft: 16, flex: 1 }}>
                            <Text style={{ fontFamily: F.header, fontSize: 16, color: C.onSurface }}>Workout Progress</Text>
                            <Text style={{ fontFamily: F.body, fontSize: 13, color: C.onSurfaceVariant, marginTop: 2 }}>
                                {doneSets} of {totalSets} sets completed
                            </Text>
                        </View>
                        <View
                            style={{
                                backgroundColor: "rgba(234,179,8,0.1)",
                                paddingHorizontal: 12,
                                paddingVertical: 6,
                                borderRadius: 20,
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 6,
                                borderWidth: 1,
                                borderColor: "rgba(234,179,8,0.2)",
                            }}
                        >
                            <Icon name="timer" size={16} color={C.primary} />
                            <Text style={{ color: C.primary, fontFamily: "JetBrainsMono-Regular", fontSize: 15 }}>{formatTime(elapsed)}</Text>
                        </View>
                    </GlassCard>
                </Entrance>

                {exercises.map((ex, i) => (
                    <Entrance index={i + 1} key={i} style={{ marginBottom: 16 }}>
                        <GlassCard C={C} style={{ borderRadius: 22 }}>
                            <Text style={{ fontFamily: F.header, fontSize: 18, color: C.onSurface, marginBottom: 12 }}>{ex.name}</Text>
                            <View style={{ flexDirection: "row", paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: C.outlineVariant, marginBottom: 6 }}>
                                <Text style={{ flex: 0.3, fontFamily: F.bodyBold, color: C.onSurfaceVariant, fontSize: 11, letterSpacing: 1 }}>SET</Text>
                                <Text style={{ flex: 1, textAlign: "center", fontFamily: F.bodyBold, color: C.onSurfaceVariant, fontSize: 11, letterSpacing: 1 }}>LBS</Text>
                                <Text style={{ flex: 1, textAlign: "center", fontFamily: F.bodyBold, color: C.onSurfaceVariant, fontSize: 11, letterSpacing: 1 }}>REPS</Text>
                                <Text style={{ flex: 0.4 }} />
                            </View>
                            {ex.setsData.map((sd: any, sIdx: number) => (
                                <SetRow
                                    key={sIdx}
                                    sIdx={sIdx}
                                    weight={sd.weight}
                                    reps={sd.reps}
                                    isChecked={!!completed[`${i}-${sIdx}`]}
                                    onToggle={() => toggleSet(i, sIdx)}
                                    C={C}
                                    isDark={isDark}
                                />
                            ))}
                        </GlassCard>
                    </Entrance>
                ))}
            </ScrollView>

            <View
                style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    paddingHorizontal: 24,
                    paddingTop: 16,
                    paddingBottom: Platform.OS === "ios" ? 34 : 20,
                }}
            >
                <BlurView intensity={isDark ? 80 : 100} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFillObject} />
                <PressableScale onPress={handleFinish} style={{ borderRadius: 100, overflow: "hidden" }}>
                    <LinearGradient
                        colors={[C.primary, C.primaryDim]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{ paddingVertical: 16, alignItems: "center" }}
                    >
                        <Text style={{ fontFamily: F.header, fontSize: 16, color: C.onPrimary, letterSpacing: 0.5 }}>Finish Workout</Text>
                    </LinearGradient>
                </PressableScale>
            </View>
        </View>
    );
}

// ─────────────────────────────────────────────────────────────────────────
// HISTORY TAB — timeline of past sessions
// ─────────────────────────────────────────────────────────────────────────
function HistoryTab({ history, isLoading, C, isDark }: any) {
    const [filterOpen, setFilterOpen] = useState(false);
    const [activeFilter, setActiveFilter] = useState("All Time");

    if (isLoading) {
        return (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: C.onSurface, fontFamily: F.body }}>Loading History...</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 20, marginBottom: 8 }}>
                <TouchableOpacity
                    onPress={() => setFilterOpen((v) => !v)}
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        backgroundColor: C.glassInset,
                        borderWidth: 1,
                        borderColor: C.outlineVariant,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 14,
                    }}
                >
                    <Icon name="filter" size={16} color={C.onSurface} />
                    <Text style={{ fontFamily: F.bodyMed, fontSize: 12, color: C.onSurface }}>{activeFilter}</Text>
                </TouchableOpacity>
            </View>

            {filterOpen && (
                <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(150)} style={{ paddingHorizontal: 20, marginBottom: 12 }}>
                    <GlassCard C={C} style={{ padding: 12 }}>
                        {["All Time", "Past Week", "Past Month"].map((t) => (
                            <TouchableOpacity
                                key={t}
                                onPress={() => {
                                    setActiveFilter(t);
                                    setFilterOpen(false);
                                }}
                                style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 }}
                            >
                                <Text style={{ fontFamily: F.bodyBold, fontSize: 14, color: activeFilter === t ? C.primary : C.onSurface }}>{t}</Text>
                                {activeFilter === t && <Icon name="check" size={16} color={C.primary} />}
                            </TouchableOpacity>
                        ))}
                    </GlassCard>
                </Animated.View>
            )}

            <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 4, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
                <View style={{ position: "absolute", top: 30, bottom: 0, left: 35, width: 2, backgroundColor: C.outlineVariant, opacity: 0.5 }} />

                {(!history || history.length === 0) && (
                    <Text style={{ fontFamily: F.body, color: C.onSurfaceVariant, textAlign: "center", marginTop: 40 }}>
                        No sessions logged yet. Finish a workout to see it here.
                    </Text>
                )}

                {history?.map((session: any, index: number) => (
                    <Entrance index={index} key={session.id} style={{ flexDirection: "row", marginBottom: 20 }}>
                        <View style={{ width: 32, alignItems: "center", marginRight: 16, marginTop: 20 }}>
                            <View
                                style={{
                                    width: 14,
                                    height: 14,
                                    borderRadius: 7,
                                    backgroundColor: C.primary,
                                    borderWidth: 3,
                                    borderColor: isDark ? "#050505" : "#F5F5F7",
                                }}
                            />
                        </View>
                        <GlassCard C={C} style={{ flex: 1, borderRadius: 22 }}>
                            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 14 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontFamily: F.header, fontSize: 17, color: C.onSurface, marginBottom: 4 }}>{session.title}</Text>
                                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                        <Icon name="calendar" size={13} color={C.onSurfaceVariant} />
                                        <Text style={{ fontFamily: F.bodyMed, fontSize: 12, color: C.onSurfaceVariant }}>
                                            {new Date(session.endTime).toLocaleDateString()}
                                        </Text>
                                    </View>
                                </View>
                                <View
                                    style={{
                                        backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
                                        paddingHorizontal: 12,
                                        paddingVertical: 8,
                                        borderRadius: 12,
                                    }}
                                >
                                    <Text style={{ fontFamily: "JetBrainsMono-Regular", fontSize: 16, color: C.primary }}>
                                        {session.duration}
                                        <Text style={{ fontSize: 11, color: C.onSurfaceVariant }}> m</Text>
                                    </Text>
                                </View>
                            </View>
                            <View style={{ height: 1, backgroundColor: C.outlineVariant, marginBottom: 12, opacity: 0.6 }} />
                            {session.exercises?.slice(0, 3).map((ex: any, exIdx: number) => {
                                const maxWeight = Math.max(...(ex.sets || []).map((s: any) => s.weight || 0), 0);
                                return (
                                    <View key={exIdx} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                                        <Text style={{ fontFamily: F.bodyMed, fontSize: 13, color: C.onSurface }}>
                                            <Text style={{ color: C.onSurfaceVariant }}>{ex.sets?.length || 0}x</Text> {ex.name}
                                        </Text>
                                        <Text style={{ fontFamily: "JetBrainsMono-Regular", fontSize: 13, color: C.primary }}>{maxWeight} lbs</Text>
                                    </View>
                                );
                            })}
                        </GlassCard>
                    </Entrance>
                ))}
            </ScrollView>
        </View>
    );
}

// ─────────────────────────────────────────────────────────────────────────
// MAIN SCREEN — WorkoutScreen: single hub covering Overview / Builder /
// Active / History, all styled like Dashboard & Profile.
// ─────────────────────────────────────────────────────────────────────────
export default function WorkoutScreen({
    onNavigateBack,
    onNavigateToNotifications,
}: {
    onNavigateBack?: () => void;
    onNavigateToNotifications?: () => void;
}) {
    const { C, isDark, bgColors } = useTheme();
    const [tab, setTab] = useState<TabKey>("overview");
    const queryClient = useQueryClient();

    const { data: workout } = useQuery({ queryKey: ["currentWorkout"], queryFn: () => fetchCurrentWorkout() });
    const { data: history, isLoading: historyLoading } = useQuery({
        queryKey: ["workoutHistory"],
        queryFn: () => fetchWorkoutHistory(),
    });

    const { mutate: save } = useMutation({
        mutationFn: (data: any) => saveWorkout(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["currentWorkout"] });
            queryClient.invalidateQueries({ queryKey: ["workoutHistory"] });
            setTab("overview");
        },
    });

    const handleSaveBuilder = (exercises: any[]) => {
        haptic("medium");
        save({
            userId: "demo-user-id",
            title: workout?.title || "Push Day",
            duration: workout?.duration || "60",
            parentVersionId: workout?.parentVersionId || workout?.id,
            exercises,
        });
    };

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <MeshGradientBackground bgColors={bgColors} isDark={isDark} />

            <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
                {/* Header — matches Dashboard/Profile top bar */}
                <View
                    style={{
                        paddingHorizontal: 20,
                        paddingTop: 8,
                        paddingBottom: 16,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                    }}
                >
                    <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                        {onNavigateBack && (
                            <TouchableOpacity
                                onPress={onNavigateBack}
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 20,
                                    backgroundColor: C.glassInset,
                                    borderWidth: 1,
                                    borderColor: C.outlineVariant,
                                    alignItems: "center",
                                    justifyContent: "center",
                                    marginRight: 12,
                                }}
                            >
                                <Icon name="chevron-left" size={22} color={C.onSurface} />
                            </TouchableOpacity>
                        )}
                        <Text style={{ fontFamily: F.header, fontSize: 22, color: C.onSurface, letterSpacing: -0.5 }}>Workout Hub</Text>
                    </View>

                    <TouchableOpacity
                        onPress={onNavigateToNotifications}
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: C.glassInset,
                            borderWidth: 1,
                            borderColor: C.outlineVariant,
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <Icon name="notifications" size={20} color={C.onSurface} />
                    </TouchableOpacity>
                </View>

                <WorkoutTabs active={tab} onChange={setTab} C={C} isDark={isDark} />

                {tab === "overview" && (
                    <OverviewTab
                        workout={workout}
                        onGoBuilder={() => setTab("builder")}
                        onGoActive={() => setTab("active")}
                        onGoHistory={() => setTab("history")}
                        C={C}
                        isDark={isDark}
                    />
                )}
                {tab === "builder" && <BuilderTab workout={workout} onSave={handleSaveBuilder} C={C} isDark={isDark} />}
                {tab === "active" && <ActiveTab workout={workout} onFinish={() => setTab("history")} C={C} isDark={isDark} />}
                {tab === "history" && <HistoryTab history={history} isLoading={historyLoading} C={C} isDark={isDark} />}
            </SafeAreaView>
        </View>
    );
}