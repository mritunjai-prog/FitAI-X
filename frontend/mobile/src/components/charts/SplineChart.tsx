import React, { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedProps, withSpring, withTiming, Easing } from 'react-native-reanimated';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export default function SplineChart({ width, height, color }: { width: number, height: number, color: string }) {
  // A smooth bezier curve for energy levels
  // Starts high, dips in middle, rises a bit, then dips
  const dPath = `M0,${height * 0.2} C${width*0.2},${height * 0.2} ${width*0.4},${height * 0.8} ${width*0.6},${height * 0.6} S${width*0.8},${height * 0.9} ${width},${height * 0.7}`;
  const dArea = `${dPath} L${width},${height} L0,${height} Z`;

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: 1500, easing: Easing.out(Easing.exp) });
  }, []);

  const animatedAreaProps = useAnimatedProps(() => {
    return {
      opacity: progress.value,
    } as any;
  });

  const animatedLineProps = useAnimatedProps(() => {
    const totalLength = width * 1.5; // Approx path length
    return {
      strokeDasharray: totalLength,
      strokeDashoffset: totalLength - progress.value * totalLength,
    } as any;
  });

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="splineGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.4" />
            <Stop offset="1" stopColor={color} stopOpacity="0.0" />
          </LinearGradient>
        </Defs>
        <AnimatedPath
          d={dArea}
          fill="url(#splineGrad)"
          animatedProps={animatedAreaProps}
        />
        <AnimatedPath
          d={dPath}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
          animatedProps={animatedLineProps}
        />
      </Svg>
    </View>
  );
}
