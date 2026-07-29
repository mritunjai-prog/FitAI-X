import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Image,
  Dimensions,
  Platform,
  StatusBar as RNStatusBar,
} from "react-native";
import Svg, { Ellipse, Rect, Line, Circle, Path } from "react-native-svg";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withDelay,
  useAnimatedSensor,
  SensorType,
  Easing,
  interpolate,
  interpolateColor,
  Extrapolation,
  useAnimatedScrollHandler,
  useDerivedValue,
  FadeInDown,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import MaskedView from "@react-native-masked-view/masked-view";
import MeshGradientBackground from "../components/MeshGradientBackground";
import RadarChart from "../components/charts/RadarChart";
import { DarkColors, LightColors, ThemeColors, F } from "../theme";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { fetchProfileData } from "../services/api/profile";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

// ─── SVG Icons ────────────────────────────────────────────────────────────────
type IconProps = { size?: number; color?: string };
const Icons = {
  notifications: ({ size = 24, color = "#fff" }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5S10.5 3.17 10.5 4v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
    </Svg>
  ),
  bolt: ({ size = 24, color = "#fff" }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M7 2v11h3v9l7-12h-4l4-8z" />
    </Svg>
  ),
  "auto-awesome": ({ size = 24, color = "#fff" }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M19 4.25L17.75 7L15 8.25L17.75 9.5L19 12.25L20.25 9.5L23 8.25L20.25 7L19 4.25ZM10.5 5.5L8 11L2.5 13.5L8 16L10.5 21.5L13 16L18.5 13.5L13 11L10.5 5.5ZM10.5 9.87L11.59 12.24L13.96 13.33L11.59 14.42L10.5 16.79L9.41 14.42L7.04 13.33L9.41 12.24L10.5 9.87Z" />
    </Svg>
  ),
  edit: ({ size = 24, color = "#fff" }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
    </Svg>
  ),
  "fitness-center": ({ size = 24, color = "#fff" }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z" />
    </Svg>
  ),
  "directions-run": ({ size = 24, color = "#fff" }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M13.49 5.48c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-3.6 13.9l1-4.4 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1l-5.2 2.2v4.7h2v-3.4l1.8-.7-1.6 8.1-4.9-1-.4 2 7 1.4z" />
    </Svg>
  ),
  "flash-on": ({ size = 24, color = "#fff" }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M7 2v11h3v9l7-12h-4l4-8z" />
    </Svg>
  ),
  "monitor-weight": ({ size = 24, color = "#fff" }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M19 3H5C3.9 3 3 3.9 3 5v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5 0 1.58-1.06 2.9-2.5 3.35V19h-2v-6.15c-1.44-.45-2.5-1.78-2.5-3.35C8.5 7.57 10.07 6 12 6z" />
    </Svg>
  ),
  watch: ({ size = 24, color = "#fff" }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M20 12c0-2.54-1.19-4.81-3.04-6.27L16 2H8l-.95 3.73C5.19 7.19 4 9.45 4 12s1.19 4.81 3.05 6.27L8 22h8l.96-3.73C18.81 16.81 20 14.54 20 12zm-8 5c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" />
    </Svg>
  ),
  "expand-more": ({ size = 24, color = "#fff" }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z" />
    </Svg>
  ),
  "expand-less": ({ size = 24, color = "#fff" }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z" />
    </Svg>
  ),
  "favorite-border": ({ size = 24, color = "#fff" }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z" />
    </Svg>
  ),
  "add-circle-outline": ({ size = 24, color = "#fff" }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M13 7h-2v4H7v2h4v4h2v-4h4v-2h-4V7zm-1-5C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
    </Svg>
  ),
  home: ({ size = 24, color = "#fff" }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
    </Svg>
  ),
  insights: ({ size = 24, color = "#fff" }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M21 8c-1.45 0-2.26 1.44-1.93 2.51l-3.55 3.56c-.3-.09-.74-.09-1.04 0l-2.55-2.55C12.26 10.44 11.45 9 10 9c-1.45 0-2.26 1.46-1.93 2.53l-4.56 4.57C2.44 15.74 1 16.55 1 18c0 1.1.9 2 2 2 1.45 0 2.26-1.44 1.93-2.51l4.55-4.56c.3.09.74.09 1.04 0l2.55 2.55C12.74 16.56 13.55 18 15 18c1.45 0 2.26-1.46 1.93-2.53l3.56-3.55c1.07.33 2.51-.48 2.51-1.92 0-1.1-.9-2-2-2z" />
    </Svg>
  ),
  settings: ({ size = 24, color = "#fff" }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
    </Svg>
  ),
  person: ({ size = 24, color = "#fff" }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    </Svg>
  ),
  "smart-toy": ({ size = 24, color = "#fff" }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3zM7.5 11.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5S9.83 13 9 13s-1.5-.67-1.5-1.5zm7.5 6.5H9v-1.5h6V18zm.5-5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
    </Svg>
  ),
  "light-mode": ({ size = 24, color = "#fff" }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41.39.39 1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41.39.39 1.03.39 1.41 0l1.06-1.06z" />
    </Svg>
  ),
  history: ({ size = 24, color = "#fff" }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" />
    </Svg>
  ),
  "dark-mode": ({ size = 24, color = "#fff" }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-3.03 0-5.5-2.47-5.5-5.5 0-1.82.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z" />
    </Svg>
  ),
  download: ({ size = 24, color = "#fff" }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
    </Svg>
  ),
  "chevron-right": ({ size = 24, color = "#fff" }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
    </Svg>
  ),
};

function Icon({
  name,
  size = 24,
  color = "#fff",
}: {
  name: keyof typeof Icons;
  size?: number;
  color?: string;
}) {
  const Component = Icons[name];
  return Component ? <Component size={size} color={color} /> : null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const hapticFeedback = () => {
  if (Platform.OS !== "web") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
};

// ─── Shared Components ────────────────────────────────────────────────────────

function GradientText({
  text,
  style,
  C,
}: {
  text: string;
  style: any;
  C: ThemeColors;
}) {
  if (Platform.OS === "web") {
    return <Text style={[style, { color: C.primary }]}>{text}</Text>;
  }
  return (
    <MaskedView
      maskElement={
        <Text style={[style, { backgroundColor: "transparent" }]}>{text}</Text>
      }
    >
      <LinearGradient
        colors={[C.primary, C.primaryDim]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={[style, { opacity: 0 }]}>{text}</Text>
      </LinearGradient>
    </MaskedView>
  );
}

function AnimatedCard({
  children,
  index,
  style,
}: {
  children: React.ReactNode;
  index: number;
  style?: any;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 120)
        .springify()
        .mass(0.8)
        .damping(15)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

function PressableScale({ children, onPress, style, disabled = false }: any) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return (
    <TouchableOpacity
      activeOpacity={1}
      disabled={disabled}
      onPressIn={() => {
        scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      }}
      onPress={() => {
        hapticFeedback();
        onPress?.();
      }}
      style={style}
    >
      <Animated.View style={animatedStyle}>{children}</Animated.View>
    </TouchableOpacity>
  );
}

function TiltCard({
  children,
  style,
  tiltEnabled = true,
  C,
}: {
  children: React.ReactNode;
  style?: any;
  tiltEnabled?: boolean;
  C: ThemeColors;
}) {
  const animatedSensor = useAnimatedSensor(SensorType.ROTATION, {
    interval: 20,
  });

  // Smarter 3D Tilt: Dampen gyroscope noise using withSpring
  const dampPitch = useDerivedValue(() =>
    withSpring(animatedSensor.sensor.value.pitch, {
      damping: 20,
      stiffness: 90,
    }),
  );
  const dampRoll = useDerivedValue(() =>
    withSpring(animatedSensor.sensor.value.roll, {
      damping: 20,
      stiffness: 90,
    }),
  );

  const animatedStyle = useAnimatedStyle(() => {
    if (!tiltEnabled || Platform.OS === "web") return {};
    const rotateX = interpolate(
      dampPitch.value,
      [-Math.PI / 4, Math.PI / 4],
      [3, -3],
      Extrapolation.CLAMP,
    );
    const rotateY = interpolate(
      dampRoll.value,
      [-Math.PI / 4, Math.PI / 4],
      [-3, 3],
      Extrapolation.CLAMP,
    );
    return {
      transform: [
        { perspective: 800 },
        { rotateX: `${rotateX}deg` },
        { rotateY: `${rotateY}deg` },
      ],
    };
  });

  return (
    <Animated.View style={[animatedStyle, style]}>
      <BlurView
        intensity={30}
        tint={C.blurTint}
        style={[
          { borderRadius: 20, padding: 20, overflow: "hidden" },
          {
            backgroundColor: C.surface,
            borderWidth: 1,
            borderColor: C.outlineVariant,
          },
        ]}
      >
        {children}
      </BlurView>
    </Animated.View>
  );
}

function SpinningAvatarRing({
  children,
  C,
}: {
  children: React.ReactNode;
  C: ThemeColors;
}) {
  const rotation = useSharedValue(0);
  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 10000, easing: Easing.linear }),
      -1,
      false,
    );
  }, []);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View
      style={{
        width: 72,
        height: 72,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
        <Svg width="100%" height="100%" viewBox="0 0 100 100">
          <Circle
            cx="50"
            cy="50"
            r="48"
            fill="none"
            stroke={C.primary}
            strokeWidth="1.5"
            strokeDasharray="12, 8"
            strokeOpacity={0.6}
          />
          <Circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke={C.cyan}
            strokeWidth="1"
            strokeDasharray="40, 20"
            strokeOpacity={0.3}
          />
        </Svg>
      </Animated.View>
      <View
        style={{ width: 62, height: 62, borderRadius: 31, overflow: "hidden" }}
      >
        {children}
      </View>
    </View>
  );
}

function Toggle({
  on,
  onChange,
  C,
}: {
  on: boolean;
  onChange: () => void;
  C: ThemeColors;
}) {
  const pos = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    pos.value = withSpring(on ? 1 : 0, {
      damping: 15,
      stiffness: 200,
      overshootClamping: false,
    });
  }, [on]);

  const tx = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(pos.value, [0, 1], [2, 18]) }],
  }));
  const bgStyle = useAnimatedStyle(() => ({
    backgroundColor: pos.value > 0.5 ? C.primary : C.glassInset,
  }));

  return (
    <PressableScale onPress={onChange} style={{ padding: 4, margin: -4 }}>
      <Animated.View
        style={[
          {
            width: 44,
            height: 26,
            borderRadius: 13,
            borderWidth: 1,
            borderColor: C.outlineVariant,
            justifyContent: "center",
          },
          bgStyle,
        ]}
      >
        <Animated.View
          style={[
            {
              width: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: C.onSurface,
            },
            on && { backgroundColor: C.onPrimary },
            tx,
          ]}
        />
      </Animated.View>
    </PressableScale>
  );
}

function BodyMapSVG({
  C,
  injuryModel = [],
}: {
  C: ThemeColors;
  injuryModel?: any[];
}) {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, []);
  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.4, 1]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.2]) }],
  }));

  const wire = C.primary;
  const wireL = C.outline;

  const partMap: Record<string, { x: number; y: number }> = {
    "Right Shoulder": { x: 108, y: 58 },
    "Left Shoulder": { x: 32, y: 58 },
    Shoulders: { x: 32, y: 58 },
    "Right Knee": { x: 90, y: 162 },
    "Left Knee": { x: 50, y: 162 },
    Back: { x: 70, y: 80 },
    Core: { x: 70, y: 100 },
    Chest: { x: 70, y: 58 },
    Triceps: { x: 25, y: 80 },
    Biceps: { x: 115, y: 80 },
    Quads: { x: 90, y: 140 },
    Hamstrings: { x: 50, y: 140 },
    Glutes: { x: 70, y: 125 },
    Calves: { x: 92, y: 180 },
  };

  const getCoords = (partName: string) => {
    if (!partName) return null;
    const p = partName.toLowerCase();
    if (p.includes('back')) return partMap['Back'];
    if (p.includes('shoulder')) {
      if (p.includes('left')) return partMap['Left Shoulder'];
      if (p.includes('right')) return partMap['Right Shoulder'];
      return partMap['Shoulders'];
    }
    if (p.includes('knee')) {
      if (p.includes('left')) return partMap['Left Knee'];
      if (p.includes('right')) return partMap['Right Knee'];
      return partMap['Right Knee'];
    }
    const exact = Object.keys(partMap).find(k => k.toLowerCase() === p);
    if (exact) return partMap[exact];
    return null;
  };

  return (
    <View
      style={{ height: 220, alignItems: "center", justifyContent: "center" }}
    >
      <Svg width={160} height={220} viewBox="0 0 140 200">
        <Ellipse
          cx={70}
          cy={18}
          rx={16}
          ry={18}
          fill="none"
          stroke={wire}
          strokeWidth={1.5}
        />
        <Rect
          x={63}
          y={35}
          width={14}
          height={10}
          fill="none"
          stroke={wireL}
          strokeWidth={1}
        />
        <Path
          d="M30,58 Q50,48 70,48 Q90,48 110,58"
          fill="none"
          stroke={wire}
          strokeWidth={1.5}
        />
        <Path
          d="M38,58 L34,115 Q70,125 106,115 L102,58"
          fill="none"
          stroke={wire}
          strokeWidth={1.5}
        />
        <Line
          x1={70}
          y1={48}
          x2={70}
          y2={115}
          stroke={wireL}
          strokeWidth={1}
          strokeDasharray="4,3"
        />
        <Line x1={40} y1={75} x2={100} y2={75} stroke={wireL} strokeWidth={1} />
        <Line x1={38} y1={95} x2={102} y2={95} stroke={wireL} strokeWidth={1} />
        <Ellipse
          cx={70}
          cy={117}
          rx={22}
          ry={8}
          fill="none"
          stroke={wire}
          strokeWidth={1.2}
        />
        <Path
          d="M38,58 L18,95 L15,130"
          fill="none"
          stroke={wire}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
        <Path
          d="M102,58 L122,95 L125,130"
          fill="none"
          stroke={wire}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
        <Path
          d="M55,122 L50,162 L48,192"
          fill="none"
          stroke={wire}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
        <Path
          d="M85,122 L90,162 L92,192"
          fill="none"
          stroke={wire}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
        <Circle
          cx={50}
          cy={162}
          r={4}
          fill="none"
          stroke={wireL}
          strokeWidth={1}
        />
        <Circle
          cx={90}
          cy={162}
          r={4}
          fill="none"
          stroke={wireL}
          strokeWidth={1}
        />

        {injuryModel.map((inj) => {
          const coords = getCoords(inj.part);
          if (!coords) return null;
          const color =
            inj.status === "active" || inj.status === "reported"
              ? C.error
              : C.success;
          return (
            <React.Fragment key={inj.id}>
              <Circle
                cx={coords.x}
                cy={coords.y}
                r={8}
                fill={`${color}33`}
                stroke={color}
                strokeWidth={1.5}
              />
              <Circle cx={coords.x} cy={coords.y} r={3} fill={color} />
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

function BatteryRing({
  percentage,
  C,
}: {
  percentage: number;
  C: ThemeColors;
}) {
  const dashOffset = 62 * (1 - percentage / 100);
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24">
      <Circle
        cx="12"
        cy="12"
        r="10"
        fill="none"
        stroke={C.outlineVariant}
        strokeWidth="3"
      />
      <Circle
        cx="12"
        cy="12"
        r="10"
        fill="none"
        stroke={percentage > 20 ? C.success : C.error}
        strokeWidth="3"
        strokeDasharray="62"
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        transform="rotate(-90 12 12)"
      />
    </Svg>
  );
}

const toSentenceCase = (str: string) => {
  if (!str) return '';
  const cleanStr = str.replace(/_/g, ' ');
  return cleanStr.charAt(0).toUpperCase() + cleanStr.slice(1).toLowerCase();
};

export default function ProfileScreen({
  onNavigateToBuilder,
  onNavigateToSettings,
  onNavigateToNotifications,
  onNavigateToHistory,
}: {
  onNavigateToBuilder?: () => void;
  onNavigateToSettings?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToHistory?: () => void;
}) {
  const { isDark, C, toggleTheme, bgColors } = useTheme();
  const { user, logout, resetOnboarding } = useAuth();
  const S = useMemo(() => getStyles(C), [C]);

  const [goals, setGoals] = useState({
    hypertrophy: true,
    endurance: false,
    power: false,
    leanMass: true,
  });
  const [ai, setAi] = useState({
    adaptive: true,
    formFeedback: false,
    nutritionSync: true,
  });
  const [deviceExpanded, setDeviceExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState(4);

  const { data: profileData, refetch: refetchProfile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => fetchProfileData(user?.id),
    enabled: !!user?.id,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Always refresh profile when screen mounts so we get latest onboarding data
  useEffect(() => {
    if (user?.id) refetchProfile();
  }, [user?.id]);

  const toggleGoal = (k: keyof typeof goals) => {
    setGoals((g) => ({ ...g, [k]: !g[k] }));
  };

  const navDotPos = useSharedValue(SCREEN_W - (SCREEN_W / 5) * 0.5 - 28);
  useEffect(() => {
    const tabWidth = SCREEN_W / 5;
    const centerOffset = tabWidth / 2 - 2;
    navDotPos.value = withSpring(activeTab * tabWidth + centerOffset, {
      damping: 14,
      stiffness: 120,
    });
  }, [activeTab]);
  const navDotStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: navDotPos.value }],
  }));

  // Dynamic Scroll Header
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  const headerBlurStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 30], [0, 1], Extrapolation.CLAMP),
  }));
  const headerBorderStyle = useAnimatedStyle(() => ({
    borderBottomColor: interpolateColor(
      scrollY.value,
      [20, 40],
      ["transparent", C.outlineVariant],
    ) as any,
  }));
  const titleStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(
          scrollY.value,
          [0, 40],
          [1, 0.95],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  // FAB Breathing Ripple
  const rippleScale = useSharedValue(1);
  const rippleOpacity = useSharedValue(0.5);
  useEffect(() => {
    rippleScale.value = withRepeat(
      withTiming(1.6, { duration: 2000, easing: Easing.out(Easing.ease) }),
      -1,
      false,
    );
    rippleOpacity.value = withRepeat(
      withTiming(0, { duration: 2000, easing: Easing.out(Easing.ease) }),
      -1,
      false,
    );
  }, []);
  const rippleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rippleScale.value }],
    opacity: rippleOpacity.value,
  }));

  return (
    <View style={S.safe}>
      <MeshGradientBackground bgColors={bgColors} isDark={isDark} />
      <SafeAreaView style={{ flex: 1 }}>
        {/* ── Dynamic Top Bar ── */}
        <Animated.View style={[S.topBar, headerBorderStyle]}>
          <Animated.View style={[StyleSheet.absoluteFill, headerBlurStyle]}>
            <BlurView
              intensity={80}
              tint={C.blurTint}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
          <Animated.View
            style={[
              {
                paddingHorizontal: 24,
                paddingVertical: 14,
                paddingTop:
                  Platform.OS === "android"
                    ? (RNStatusBar.currentHeight ?? 0 + 14)
                    : 14,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                zIndex: 10,
              },
              headerBorderStyle,
            ]}
          >
            <Animated.View style={titleStyle}>
              <GradientText text="FitAI X" style={S.appTitle} C={C} />
            </Animated.View>
            <View style={S.topBarRight}>
              <PressableScale onPress={toggleTheme} style={S.iconBtn}>
                <Icon
                  name={isDark ? "light-mode" : "dark-mode"}
                  size={24}
                  color={C.onSurfaceVariant}
                />
              </PressableScale>
              <PressableScale onPress={onNavigateToNotifications} style={S.iconBtn}>
                <Icon
                  name="notifications"
                  size={24}
                  color={C.onSurfaceVariant}
                />
              </PressableScale>
              <PressableScale onPress={onNavigateToSettings} style={S.iconBtn}>
                <Icon name="settings" size={24} color={C.onSurfaceVariant} />
              </PressableScale>
            </View>
          </Animated.View>
        </Animated.View>

        <Animated.ScrollView
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          style={S.scroll}
          contentContainerStyle={S.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ═══ HERO CARD ═══ */}
          <AnimatedCard index={0}>
            <TiltCard C={C} style={{ marginBottom: 12 }}>
              <View style={S.heroContentRow}>
                <SpinningAvatarRing C={C}>
                  <Image
                    source={{
                      uri:
                        profileData?.identity?.avatar ||
                        user?.avatar ||
                        "https://i.pravatar.cc/150?img=11",
                    }}
                    style={S.avatar}
                  />
                </SpinningAvatarRing>
                <View style={S.heroTextBlock}>
                  <View style={S.nameRow}>
                    <Text style={S.heroName}>{profileData?.identity?.name || user?.name || 'Loading...'}</Text>
                  </View>
                  <Text style={S.heroEmail}>{profileData?.identity?.email || user?.email || ''}</Text>
                </View>
              </View>
            </TiltCard>
          </AnimatedCard>

          {/* ═══ FITNESS PROFILE ═══ */}
          <AnimatedCard index={1}>
            <View style={S.section}>
              <Text style={S.sectionLabel}>FITNESS PROFILE</Text>
              <TiltCard C={C} tiltEnabled={false}>
                <View style={S.statsGrid}>
                  <View
                    style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}
                  >
                    {[
                      {
                        label: "Gender",
                        val: profileData?.fitnessProfile?.gender || "—",
                        unit: "",
                      },
                      {
                        label: "Age",
                        val: String(profileData?.fitnessProfile?.age || "—"),
                        unit: "yrs",
                      },
                      {
                        label: "Height",
                        val: String(profileData?.fitnessProfile?.height || "—"),
                        unit: "cm",
                      },
                      {
                        label: "Weight",
                        val: String(profileData?.fitnessProfile?.weight || "—"),
                        unit: "kg",
                      },
                      {
                        label: "Experience",
                        val: profileData?.fitnessProfile?.experience || "—",
                        unit: "",
                      },
                    ].map((s, i) => (
                      <View
                        key={i}
                        style={[{ width: "30%", marginBottom: 10 }]}
                      >
                        <Text style={S.statLabel}>{s.label}</Text>
                        <View style={S.statValueRow}>
                          <GradientText text={s.label === 'Experience' || s.label === 'Gender' ? toSentenceCase(s.val) : s.val} style={S.statNum} C={C} />
                          {s.unit ? (
                            <Text style={S.statUnit}>{s.unit}</Text>
                          ) : null}
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              </TiltCard>
            </View>
          </AnimatedCard>

          {/* ═══ DYNAMIC GOALS ═══ */}
          <AnimatedCard index={2}>
            <View style={S.section}>
              <Text style={S.sectionLabel}>DYNAMIC GOALS</Text>
              <TiltCard C={C} tiltEnabled={false}>
                <View style={S.chipsWrap}>
                  {profileData?.fitnessProfile?.goals?.length > 0 ? (
                    profileData.fitnessProfile.goals.map((g: string) => (
                      <View key={g} style={[S.chip, S.chipActive]}>
                        <Icon name="fitness-center" size={14} color={C.primary} />
                        <Text style={[S.chipText, S.chipTextActive]}>
                          {toSentenceCase(g)}
                        </Text>
                        <View style={[S.chipGlow, { pointerEvents: "none" as any }]} />
                      </View>
                    ))
                  ) : (
                    <Text style={S.timelineEvent}>No goals selected</Text>
                  )}
                </View>
              </TiltCard>
            </View>
          </AnimatedCard>

          {/* ═══ HEALTH & PREFERENCES ═══ */}
          <AnimatedCard index={3}>
            <View style={S.section}>
              <Text style={S.sectionLabel}>HEALTH & PREFERENCES</Text>
              <TiltCard C={C} tiltEnabled={false}>
                <View style={{ gap: 16 }}>
                  <View>
                    <Text style={[S.statLabel, { marginBottom: 4 }]}>
                      Nutrition Preferences
                    </Text>
                    <View style={S.chipsWrap}>
                      {profileData?.fitnessProfile?.diet?.length > 0 ? (
                        profileData.fitnessProfile.diet.map((d: string) => (
                          <View key={d} style={S.chip}>
                            <Text style={S.chipText}>
                              {toSentenceCase(d)}
                            </Text>
                          </View>
                        ))
                      ) : (
                        <Text style={S.timelineEvent}>None selected</Text>
                      )}
                    </View>
                  </View>

                  <View>
                    <Text style={[S.statLabel, { marginBottom: 4 }]}>
                      Available Equipment
                    </Text>
                    <View style={S.chipsWrap}>
                      {profileData?.fitnessProfile?.equipment?.length > 0 ? (
                        profileData.fitnessProfile.equipment.map(
                          (e: string) => (
                            <View key={e} style={S.chip}>
                              <Text style={S.chipText}>
                                {toSentenceCase(e)}
                              </Text>
                            </View>
                          ),
                        )
                      ) : (
                        <Text style={S.timelineEvent}>None selected</Text>
                      )}
                    </View>
                  </View>

                  <View style={S.divider} />

                  {[
                    {
                      label: "Past Injuries",
                      val: profileData?.healthProfile?.pastInjuries,
                    },
                    {
                      label: "Current Injuries",
                      val: profileData?.healthProfile?.currentInjuries,
                    },
                    {
                      label: "Medical Conditions",
                      val: profileData?.healthProfile?.medicalConditions,
                    },
                    {
                      label: "Allergies",
                      val: profileData?.healthProfile?.allergies,
                    },
                    {
                      label: "Physical Limitations",
                      val: profileData?.healthProfile?.physicalLimitations,
                    },
                    {
                      label: "Medications",
                      val: profileData?.healthProfile?.medications,
                    },
                  ].map((h, i) =>
                    h.val ? (
                      <View key={i}>
                        <Text style={[S.statLabel, { marginBottom: 2 }]}>
                          {h.label}
                        </Text>
                        <Text style={S.timelineEvent}>{h.label.includes('Injuries') ? toSentenceCase(h.val) : h.val}</Text>
                      </View>
                    ) : null,
                  )}
                </View>
              </TiltCard>
            </View>
          </AnimatedCard>

          {/* ═══ MUSCLE BALANCE ═══ */}
          <AnimatedCard index={4}>
            <View style={S.section}>
              <Text style={S.sectionLabel}>MUSCLE BALANCE</Text>
              <TiltCard C={C} tiltEnabled={false}>
                <View style={{ alignItems: "center", marginVertical: 10 }}>
                  {profileData?.radarChart && profileData.radarChart.length > 0 ? (
                    <RadarChart
                      size={180}
                      color={C.cyan}
                      data={profileData.radarChart}
                    />
                  ) : (
                    <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                      <Icon name="insights" size={48} color={C.outlineVariant} />
                      <Text style={{ fontFamily: 'Inter_500Medium', color: C.onSurfaceVariant, marginTop: 12 }}>No muscle balance data available yet.</Text>
                    </View>
                  )}
                </View>
                <View
                  style={{
                    marginTop: 20,
                    backgroundColor: `${C.cyan}15`,
                    borderRadius: 12,
                    padding: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: `${C.cyan}40`,
                  }}
                >
                  <View style={{ marginRight: 10 }}>
                    <Icon name="auto-awesome" size={20} color={C.cyan} />
                  </View>
                  <Text
                    style={{
                      flex: 1,
                      fontFamily: 'Inter_500Medium',
                      fontSize: 13,
                      color: C.onSurface,
                      lineHeight: 18,
                    }}
                  >
                    {profileData?.imbalanceMsg ||
                      "Keep logging workouts to unlock muscle balance insights."}
                  </Text>
                </View>
              </TiltCard>
            </View>
          </AnimatedCard>

          {/* ═══ INJURY PROTOCOL & MEMORY MODEL ═══ */}
          <AnimatedCard index={5}>
            <View style={S.section}>
              <Text style={S.sectionLabel}>INJURY-MEMORY MODEL</Text>
              <TiltCard C={C}>
                <View style={S.pillsRow}>
                  {profileData?.injuryModel?.length > 0 ? (
                    Array.from(
                      new Set(profileData.injuryModel.map((i: any) => i.part)),
                    ).map((part: any, idx: number) => (
                      <View
                        key={idx}
                        style={idx % 2 === 0 ? S.pillRed : S.pillGreen}
                      >
                        <Text
                          style={
                            idx % 2 === 0 ? S.pillRedText : S.pillGreenText
                          }
                        >
                          {part}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <View style={S.pillGreen}>
                      <Text style={S.pillGreenText}>No active injuries</Text>
                    </View>
                  )}
                </View>
                <BodyMapSVG
                  C={C}
                  injuryModel={profileData?.injuryModel || []}
                />

                {/* Visual Timeline of Injury Memory */}
                <View style={S.timelineContainer}>
                  <LinearGradient
                    colors={[C.error, C.primary, C.success]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={S.timelineLine}
                  />

                  {profileData?.injuryModel?.length > 0 ? (
                    profileData.injuryModel.map((evt: any, idx: number) => (
                      <View key={evt.id || idx} style={S.timelineNode}>
                        <View
                          style={
                            evt.status === "reported"
                              ? S.timelineDotRed
                              : evt.status === "active"
                                ? S.timelineDotPrimary
                                : S.timelineDotGreen
                          }
                        />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={S.timelineDate}>{evt.date}</Text>
                          <Text style={S.timelineEvent}>{evt.desc}</Text>
                        </View>
                      </View>
                    ))
                  ) : (
                    <View style={S.timelineNode}>
                      <View style={S.timelineDotGreen} />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={S.timelineDate}>Present</Text>
                        <Text style={S.timelineEvent}>
                          System detecting full mobility. You are ready for
                          heavy loads.
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </TiltCard>
            </View>
          </AnimatedCard>

          {/* ═══ AI COACHING ENGINE ═══ */}
          <AnimatedCard index={6}>
            <View style={S.section}>
              <Text style={S.sectionLabel}>AI COACHING ENGINE</Text>
              <TiltCard C={C}>
                {(
                  [
                    {
                      key: "adaptive",
                      label: "Adaptive Progression",
                      sub: "Auto-adjust weights based on previous sets",
                    },
                    {
                      key: "formFeedback",
                      label: "Real-time Form Feedback",
                      sub: "Voice alerts during working sets",
                    },
                    {
                      key: "nutritionSync",
                      label: "Nutrition Auto-Sync",
                      sub: "Adjust macros based on workout intensity",
                    },
                  ] as const
                ).map((item, idx) => (
                  <View key={item.key}>
                    {idx > 0 ? <View style={S.divider} /> : null}
                    <View style={S.toggleRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={S.toggleLabel}>{item.label}</Text>
                        <Text style={S.toggleSub}>{item.sub}</Text>
                      </View>
                      <Toggle
                        on={ai[item.key]}
                        onChange={() =>
                          setAi((a) => ({ ...a, [item.key]: !a[item.key] }))
                        }
                        C={C}
                      />
                    </View>
                  </View>
                ))}
              </TiltCard>
            </View>
          </AnimatedCard>

          {/* ═══ TELEMETRY DEVICES ═══ */}
          <AnimatedCard index={7}>
            <View style={S.section}>
              <Text style={S.sectionLabel}>TELEMETRY DEVICES</Text>
              <TiltCard C={C} tiltEnabled={false}>
                {Array.isArray(profileData?.telemetry) &&
                  profileData.telemetry.map((dev: any, i: number) => (
                    <View key={i}>
                      <PressableScale
                        onPress={() => setDeviceExpanded((e) => !e)}
                      >
                        <View
                          style={[
                            S.deviceRow,
                            dev.status !== "Connected" && { opacity: 0.6 },
                          ]}
                        >
                          <View style={S.deviceIconBox}>
                            <Icon
                              name={dev.icon || "watch"}
                              size={20}
                              color={
                                dev.status === "Connected"
                                  ? C.primary
                                  : C.onSurfaceVariant
                              }
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={S.deviceName}>{dev.name}</Text>
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 6,
                                marginTop: 2,
                              }}
                            >
                              {dev.battery ? (
                                <BatteryRing percentage={dev.battery} C={C} />
                              ) : null}
                              <Text
                                style={
                                  dev.status === "Connected"
                                    ? S.deviceConnected
                                    : S.deviceDisconnected
                                }
                              >
                                {dev.status}
                              </Text>
                            </View>
                          </View>
                          {dev.details && (
                            <Icon
                              name={
                                deviceExpanded ? "expand-less" : "expand-more"
                              }
                              size={22}
                              color={C.outline}
                            />
                          )}
                        </View>
                        {deviceExpanded && dev.details ? (
                          <View style={S.deviceDetails}>
                            {Object.entries(dev.details).map(
                              ([k, v]: [string, any]) => (
                                <View key={k} style={S.deviceDetailChip}>
                                  <Text style={S.deviceDetailKey}>{k}</Text>
                                  <Text
                                    style={[
                                      S.deviceDetailVal,
                                      k === "Sleep" ? { color: C.primary } : {},
                                    ]}
                                  >
                                    {v}
                                  </Text>
                                </View>
                              ),
                            )}
                          </View>
                        ) : null}
                      </PressableScale>
                      {i < profileData.telemetry.length - 1 && (
                        <View style={S.divider} />
                      )}
                    </View>
                  ))}
              </TiltCard>
            </View>
          </AnimatedCard>

          {/* ═══ DATA EXPORT ═══ */}
          <AnimatedCard index={7.5}>
            <View style={{ paddingHorizontal: 24, marginTop: 12, marginBottom: 12 }}>
              <Text style={[S.sectionLabel, { marginBottom: 12 }]}>DATA EXPORT</Text>
              
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={async () => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  if (profileData) {
                    try {
                      const dataStr = JSON.stringify(profileData, null, 2);
                      const fileUri = FileSystem.documentDirectory + 'fitai_x_user_data.json';
                      await FileSystem.writeAsStringAsync(fileUri, dataStr);
                      if (await Sharing.isAvailableAsync()) {
                        await Sharing.shareAsync(fileUri);
                      } else {
                        alert("Sharing is not available on this device.");
                      }
                    } catch (e) {
                      console.error("Export failed:", e);
                      alert("Failed to export data.");
                    }
                  } else {
                    alert("No data available to export.");
                  }
                }}
                style={{
                  backgroundColor: C.surface,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: C.outlineVariant,
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 16
                }}
              >
                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(245, 196, 0, 0.1)', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="download" size={20} color="#F5C400" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.header, fontSize: 16, color: C.onSurface, marginBottom: 2 }}>Export My Data</Text>
                  <Text style={{ fontFamily: F.body, fontSize: 13, color: C.onSurfaceVariant }}>Download as CSV or PDF</Text>
                </View>
                <Icon name="chevron-right" size={20} color={C.outline} />
              </TouchableOpacity>
            </View>
          </AnimatedCard>

          {/* ═══ UPDATE PROFILE + LOGOUT ═══ */}
          <AnimatedCard index={8}>
            <View style={{ paddingHorizontal: 24, marginTop: 12, marginBottom: 24, gap: 12 }}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  resetOnboarding();
                }}
                style={{
                  backgroundColor: `${C.primary}18`,
                  padding: 16,
                  borderRadius: 16,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: `${C.primary}44`,
                }}
              >
                <Text style={{ color: C.primary, fontFamily: F.bodyBold, fontSize: 16 }}>
                  Update Profile / Redo Onboarding
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  logout();
                }}
                style={{
                  backgroundColor: `${C.error}15`,
                  padding: 16,
                  borderRadius: 16,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: `${C.error}33`,
                }}
              >
                <Text
                  style={{
                    color: C.error,
                    fontFamily: F.bodyBold,
                    fontSize: 16,
                  }}
                >
                  Log Out
                </Text>
              </TouchableOpacity>
            </View>
          </AnimatedCard>

          <View style={{ height: 100 }} />
        </Animated.ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─── Dynamic Styles ───────────────────────────────────────────────────────────
const getStyles = (C: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    topBar: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      borderBottomWidth: 1,
      borderBottomColor: "transparent",
    },
    appTitle: {
      fontSize: 26,
      fontFamily: F.header,
      letterSpacing: -1,
      height: 32,
    },
    topBarRight: { flexDirection: "row", gap: 4 },
    iconBtn: { padding: 6 },
    scroll: { flex: 1 },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop:
        Platform.OS === "android" ? (RNStatusBar.currentHeight ?? 0) + 70 : 70,
      gap: 24,
    },
    section: { gap: 8 },

    heroContentRow: { flexDirection: "row", alignItems: "center" },
    avatar: { width: "100%", height: "100%" },
    heroTextBlock: { flex: 1, marginLeft: 16 },
    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 4,
    },
    heroName: { fontSize: 20, fontFamily: F.header, color: C.onSurface },
    proBadge: { width: 44, height: 18, borderRadius: 4 },
    proBadgeTextAbs: {
      position: "absolute",
      right: -50,
      top: 2,
      fontSize: 10,
      fontFamily: F.header,
      color: C.onPrimary,
      letterSpacing: 1,
    },
    heroEmail: { fontSize: 13, fontFamily: F.body, color: C.onSurfaceVariant },

    sectionLabel: {
      fontSize: 11,
      fontFamily: F.header,
      color: C.onSurfaceVariant,
      letterSpacing: 1.5,
      marginLeft: 8,
    },
    statsGrid: { flexDirection: "row" },
    statCell: { flex: 1, alignItems: "center", gap: 4 },
    statCellBorder: { borderRightWidth: 1, borderRightColor: C.outlineVariant },
    statLabel: {
      fontSize: 12,
      fontFamily: F.bodyMed,
      color: C.onSurfaceVariant,
    },
    statValueRow: { flexDirection: "row", alignItems: "baseline", gap: 2 },
    statNum: { fontSize: 28, fontFamily: F.num, letterSpacing: -1, height: 32 },
    statUnit: { fontSize: 13, fontFamily: F.bodyMed, color: C.outlineVariant },

    chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: C.glassInset,
      borderWidth: 1,
      borderColor: "transparent",
    },
    chipActive: { borderColor: C.primary },
    chipText: {
      fontSize: 13,
      fontFamily: F.bodyMed,
      color: C.onSurfaceVariant,
    },
    chipTextActive: { color: C.primary },
    chipGlow: {
      position: "absolute",
      inset: 0,
      borderRadius: 12,
      backgroundColor: C.primary,
      opacity: 0.1,
    },

    pillsRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
    pillRed: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: `${C.error}26`,
      borderWidth: 1,
      borderColor: `${C.error}4D`,
    },
    pillRedText: {
      fontSize: 11,
      fontFamily: F.header,
      color: C.error,
      letterSpacing: 0.5,
    },
    pillGreen: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: `${C.success}26`,
      borderWidth: 1,
      borderColor: `${C.success}4D`,
    },
    pillGreenText: {
      fontSize: 11,
      fontFamily: F.header,
      color: C.success,
      letterSpacing: 0.5,
    },

    injuryNote: {
      fontFamily: F.bodyMed,
      fontSize: 13,
      color: C.onSurfaceVariant,
      textAlign: "center",
      marginTop: 12,
      lineHeight: 18,
    },

    // Timeline Styles
    timelineContainer: { marginTop: 24, paddingLeft: 8 },
    timelineLine: {
      position: "absolute",
      left: 15,
      top: 10,
      bottom: 20,
      width: 2,
      opacity: 0.6,
    },
    timelineNode: { flexDirection: "row", marginBottom: 20 },
    timelineDotRed: {
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: C.error,
      borderWidth: 3,
      borderColor: C.surface,
      zIndex: 1,
    },
    timelineDotPrimary: {
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: C.primary,
      borderWidth: 3,
      borderColor: C.surface,
      zIndex: 1,
    },
    timelineDotGreen: {
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: C.success,
      borderWidth: 3,
      borderColor: C.surface,
      zIndex: 1,
    },
    timelineDate: {
      fontFamily: F.header,
      fontSize: 11,
      color: C.onSurfaceVariant,
      marginBottom: 2,
    },
    timelineEvent: {
      fontFamily: F.bodyMed,
      fontSize: 13,
      color: C.onSurface,
      lineHeight: 18,
    },

    toggleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
      paddingVertical: 6,
    },
    toggleLabel: {
      fontSize: 16,
      fontFamily: F.bodyMed,
      color: C.onSurface,
      marginBottom: 2,
    },
    toggleSub: {
      fontSize: 13,
      fontFamily: F.body,
      color: C.onSurfaceVariant,
      lineHeight: 18,
    },

    divider: {
      height: 1,
      backgroundColor: C.outlineVariant,
      marginVertical: 16,
      opacity: 0.5,
    },

    deviceRow: { flexDirection: "row", alignItems: "center", gap: 16 },
    deviceIconBox: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: C.glassInset,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    deviceName: {
      fontSize: 16,
      fontFamily: F.bodyMed,
      color: C.onSurface,
      marginBottom: 2,
    },
    deviceConnected: { fontSize: 13, fontFamily: F.bodyMed, color: C.primary },
    deviceDisconnected: {
      fontSize: 13,
      fontFamily: F.body,
      color: C.onSurfaceVariant,
    },
    deviceDetails: {
      flexDirection: "row",
      gap: 12,
      paddingLeft: 60,
      paddingTop: 12,
    },
    deviceDetailChip: {
      backgroundColor: C.glassInset,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
      gap: 2,
      alignItems: "center",
    },
    deviceDetailKey: {
      fontSize: 10,
      fontFamily: F.header,
      color: C.onSurfaceVariant,
      letterSpacing: 0.5,
    },
    deviceDetailVal: { fontSize: 16, fontFamily: F.num, color: C.onSurface },

    bottomNav: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: "row",
      paddingBottom: Platform.OS === "ios" ? 24 : 16,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: C.outlineVariant,
    },
    navActiveDot: {
      position: "absolute",
      top: 6,
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: C.primary,
      ...Platform.select({
        web: { boxShadow: `0px 0px 6px ${C.primary}` } as any,
        default: {
          shadowColor: C.primary,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 1,
          shadowRadius: 6,
        },
      }),
    },
    navItem: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 8,
    },
    fabContainer: {
      position: "absolute",
      top: -28,
      left: "50%",
      marginLeft: -28,
    },
    fab: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: C.primary,
      alignItems: "center",
      justifyContent: "center",
      ...Platform.select({
        web: { boxShadow: `0px 4px 12px ${C.primary}66` } as any,
        default: {
          shadowColor: C.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 12,
        },
      }),
    },
  });
