import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Rect, Filter, FeDropShadow } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';

export default function LiveWaveform({ width, height, color, bgFadeColor }: { width: number, height: number, color: string, bgFadeColor: string }) {
  // A simple ECG-like repeating path segment width is 150
  const segW = 150;
  // Generate enough segments to cover the screen width + 2 segments for smooth loop scrolling
  const segmentsCount = Math.ceil(width / segW) + 2;
  
  const segments = Array.from({ length: segmentsCount }).map((_, i) => {
    const startX = i * segW;
    return `M${startX},${height/2} L${startX+30},${height/2} L${startX+40},${height/2-15} L${startX+50},${height/2+35} L${startX+60},${height/2-45} L${startX+70},${height/2} L${startX+100},${height/2} L${startX+110},${height/2-8} L${startX+120},${height/2} L${startX+150},${height/2}`;
  });
  
  const fullPath = segments.join(" ");

  const shift = useSharedValue(0);

  useEffect(() => {
    shift.value = withRepeat(
      withTiming(-segW, { duration: 1000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shift.value }]
  }));

  return (
    <View style={{ width, height, overflow: 'hidden' }}>
      <Animated.View style={animatedStyle}>
        <Svg width={width + segW * 2} height={height}>
          <Defs>
            <Filter id="waveGlow" x="-20%" y="-20%" width="140%" height="140%">
              <FeDropShadow dx="0" dy="0" stdDeviation="4" floodColor={color} floodOpacity="0.8" />
            </Filter>
          </Defs>
          <Path
            d={fullPath}
            fill="none"
            stroke={color}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            filter="url(#waveGlow)"
          />
        </Svg>
      </Animated.View>

      {/* Fade overlay on left and right edges for smooth enter/exit */}
      <View style={[StyleSheet.absoluteFill, { flexDirection: 'row', justifyContent: 'space-between' }]}>
        <Svg width={40} height={height}>
          <Defs>
            <LinearGradient id="gradL" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={bgFadeColor} stopOpacity="1" />
              <Stop offset="1" stopColor={bgFadeColor} stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="40" height={height} fill="url(#gradL)" />
        </Svg>
        <Svg width={40} height={height}>
          <Defs>
            <LinearGradient id="gradR" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={bgFadeColor} stopOpacity="0" />
              <Stop offset="1" stopColor={bgFadeColor} stopOpacity="1" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="40" height={height} fill="url(#gradR)" />
        </Svg>
      </View>
    </View>
  );
}
