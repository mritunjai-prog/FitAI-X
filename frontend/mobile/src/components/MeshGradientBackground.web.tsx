import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, interpolate } from 'react-native-reanimated';

type Props = {
  isDark: boolean;
  bgColors: readonly [string, string, ...string[]];
};


export default function MeshGradientBackground({ isDark, bgColors }: Props) {
  const floatAnim1 = useSharedValue(0);
  const floatAnim2 = useSharedValue(0);

  React.useEffect(() => {
    floatAnim1.value = withRepeat(withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.ease) }), -1, true);
    floatAnim2.value = withRepeat(withTiming(1, { duration: 5000, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, []);

  const blob1Style = useAnimatedStyle(() => ({
    opacity: interpolate(floatAnim1.value, [0, 1], [0.6, 1]),
    transform: [
      { translateY: interpolate(floatAnim1.value, [0, 1], [0, 30]) },
      { scale: interpolate(floatAnim1.value, [0, 1], [1, 1.1]) }
    ]
  }));

  const blob2Style = useAnimatedStyle(() => ({
    opacity: interpolate(floatAnim2.value, [0, 1], [0.5, 0.8]),
    transform: [
      { translateY: interpolate(floatAnim2.value, [0, 1], [0, -40]) },
      { scale: interpolate(floatAnim2.value, [0, 1], [1, 1.15]) }
    ]
  }));

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      <LinearGradient colors={bgColors} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      
      {/* Abstract Background Elements (Web Fallback for Skia) */}
      <Animated.View style={[{
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: isDark ? 'rgba(245, 196, 0, 0.15)' : 'rgba(245, 196, 0, 0.25)',
        top: -50,
        right: -50,
        // @ts-ignore
        filter: 'blur(60px)',
      }, blob1Style]} />
      
      <Animated.View style={[{
        position: 'absolute',
        width: 400,
        height: 400,
        borderRadius: 200,
        backgroundColor: isDark ? 'rgba(0, 240, 255, 0.1)' : 'rgba(50, 173, 230, 0.2)',
        bottom: -100,
        left: -100,
        // @ts-ignore
        filter: 'blur(80px)',
      }, blob2Style]} />

      <Image 
        source={{ uri: 'https://www.transparenttextures.com/patterns/stardust.png' }} 
        style={[StyleSheet.absoluteFill, { opacity: isDark ? 0.03 : 0.05 }]} 
        resizeMode="repeat" 
      />
    </View>
  );
}
