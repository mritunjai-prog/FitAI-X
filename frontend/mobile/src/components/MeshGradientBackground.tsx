import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, withRepeat, withTiming, Easing, useAnimatedStyle,
  useDerivedValue, interpolate
} from 'react-native-reanimated';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

type Props = {
  isDark: boolean;
  bgColors: readonly [string, string, ...string[]];
};

export default function MeshGradientBackground({ isDark, bgColors }: Props) {
  const clock = useSharedValue(0);

  React.useEffect(() => {
    clock.value = withRepeat(
      withTiming(Math.PI * 2, { duration: 10000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  // Blob 1 (top-right) animated style
  const blob1Style = useAnimatedStyle(() => {
    const tx = Math.cos(clock.value) * 30;
    const ty = Math.sin(clock.value) * 30;
    const scale = interpolate(Math.sin(clock.value * 2), [-1, 1], [0.9, 1.1]);
    return {
      transform: [{ translateX: tx }, { translateY: ty }, { scale }],
    };
  });

  // Blob 2 (bottom-left) animated style
  const blob2Style = useAnimatedStyle(() => {
    const tx = Math.sin(clock.value) * 40;
    const ty = Math.cos(clock.value) * 40;
    const scale = interpolate(Math.cos(clock.value * 2), [-1, 1], [0.85, 1.15]);
    return {
      transform: [{ translateX: tx }, { translateY: ty }, { scale }],
    };
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Base gradient */}
      <LinearGradient
        colors={bgColors as unknown as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Animated blob 1 - top right */}
      <Animated.View
        style={[
          styles.blob,
          {
            top: -100,
            right: -100,
            width: 400,
            height: 400,
            borderRadius: 200,
            backgroundColor: isDark ? 'rgba(245, 196, 0, 0.08)' : 'rgba(245, 196, 0, 0.15)',
          },
          blob1Style,
        ]}
      />

      {/* Animated blob 2 - bottom left */}
      <Animated.View
        style={[
          styles.blob,
          {
            bottom: -100,
            left: -100,
            width: 450,
            height: 450,
            borderRadius: 225,
            backgroundColor: isDark ? 'rgba(0, 240, 255, 0.03)' : 'rgba(50, 173, 230, 0.08)',
          },
          blob2Style,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  blob: {
    position: 'absolute',
    // Blur via shadow approximation
    ...({
      // web/iOS only
      filter: 'blur(80px)',
    } as any),
  },
});
