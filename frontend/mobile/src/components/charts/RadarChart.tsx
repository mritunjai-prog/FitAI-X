import React, { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Polygon, Line, Text as SvgText, Circle } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedProps, withSpring } from 'react-native-reanimated';

const AnimatedPolygon = Animated.createAnimatedComponent(Polygon);

export type RadarData = { label: string; value: number }[]; // value 0 to 1

export default function RadarChart({ data, size, color }: { data: RadarData, size: number, color: string }) {
  const center = size / 2;
  const radius = (size / 2) - 25; // padding for labels

  const points = data.map((d, i) => {
    const angle = (Math.PI * 2 * i) / data.length - Math.PI / 2;
    return {
      x: center + Math.cos(angle) * radius * d.value,
      y: center + Math.sin(angle) * radius * d.value,
      lx: center + Math.cos(angle) * (radius + 18),
      ly: center + Math.sin(angle) * (radius + 18),
    };
  });

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withSpring(1, { damping: 15, stiffness: 80, mass: 1 });
  }, []);

  const animatedProps = useAnimatedProps(() => {
    const p = progress.value;
    const currentPoints = data.map((d, i) => {
      const angle = (Math.PI * 2 * i) / data.length - Math.PI / 2;
      const x = center + Math.cos(angle) * radius * (d.value * p);
      const y = center + Math.sin(angle) * radius * (d.value * p);
      return `${x},${y}`;
    }).join(" ");
    return { points: currentPoints } as any;
  });

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {/* Background Grid */}
        {[0.33, 0.66, 1].map((scale, idx) => (
          <Circle key={idx} cx={center} cy={center} r={radius * scale} stroke={color + '33'} strokeWidth={1} fill="none" strokeDasharray="3,3" />
        ))}
        {/* Axes */}
        {data.map((_, i) => {
          const angle = (Math.PI * 2 * i) / data.length - Math.PI / 2;
          return (
            <Line
              key={i}
              x1={center} y1={center}
              x2={center + Math.cos(angle) * radius} y2={center + Math.sin(angle) * radius}
              stroke={color + '33'} strokeWidth={1}
            />
          );
        })}
        {/* Fill Polygon */}
        <AnimatedPolygon
          fill={color + '40'}
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
          animatedProps={animatedProps}
        />
        {/* Labels */}
        {data.map((d, i) => (
          <SvgText
            key={i}
            x={points[i].lx} y={points[i].ly}
            fill="#a1a1aa"
            fontSize="10"
            fontFamily="monospace"
            textAnchor="middle"
            alignmentBaseline="middle"
          >
            {d.label}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}
