import React from 'react';
import { View, StyleSheet, Dimensions, Image } from 'react-native';
import { Canvas, LinearGradient as SkiaLinearGradient, Rect as SkiaRect, vec, Blur, Circle as SkiaCircle } from '@shopify/react-native-skia';

import { useSharedValue, withRepeat, withTiming, Easing, useDerivedValue } from 'react-native-reanimated';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

type Props = {
  isDark: boolean;
  bgColors: readonly [string, string, ...string[]];
};

export default function MeshGradientBackground({ isDark, bgColors }: Props) {
  const clock = useSharedValue(0);
  React.useEffect(() => {
    clock.value = withRepeat(withTiming(Math.PI * 2, { duration: 10000, easing: Easing.linear }), -1, false);
  }, []);

  const topCircleX = useDerivedValue(() => SCREEN_W + Math.cos(clock.value) * 30);
  const topCircleY = useDerivedValue(() => Math.sin(clock.value) * 30);
  const bottomCircleX = useDerivedValue(() => Math.sin(clock.value) * 40);
  const bottomCircleY = useDerivedValue(() => SCREEN_H + Math.cos(clock.value) * 40);
  const pulse = useDerivedValue(() => 300 + Math.sin(clock.value * 2) * 20);
  const pulse2 = useDerivedValue(() => 350 + Math.cos(clock.value * 2) * 30);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Canvas style={{ flex: 1 }}>
        <SkiaRect x={0} y={0} width={SCREEN_W} height={SCREEN_H}>
          <SkiaLinearGradient start={vec(0, 0)} end={vec(SCREEN_W, SCREEN_H)} colors={bgColors as unknown as string[]} />
        </SkiaRect>
        <SkiaCircle cx={topCircleX} cy={topCircleY} r={pulse} color={isDark ? 'rgba(245, 196, 0, 0.08)' : 'rgba(245, 196, 0, 0.15)'}>
          <Blur blur={80} />
        </SkiaCircle>
        <SkiaCircle cx={bottomCircleX} cy={bottomCircleY} r={pulse2} color={isDark ? 'rgba(0, 240, 255, 0.03)' : 'rgba(50, 173, 230, 0.08)'}>
          <Blur blur={100} />
        </SkiaCircle>
      </Canvas>
      <Image 
        source={{ uri: 'https://www.transparenttextures.com/patterns/stardust.png' }} 
        style={[StyleSheet.absoluteFill, { opacity: isDark ? 0.03 : 0.05 }]} 
        resizeMode="repeat" 
      />
    </View>
  );
}
