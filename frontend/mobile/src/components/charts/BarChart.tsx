import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

export type BarData = { label: string; value: number }[]; // value 0 to 1

export default function BarChart({ data, height, color }: { data: BarData, height: number, color: string }) {
  return (
    <View style={{ height, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: 20 }}>
      {data.map((d, i) => (
        <Bar key={i} data={d} maxHeight={height - 20} color={color} delay={i * 100} />
      ))}
    </View>
  );
}

function Bar({ data, maxHeight, color, delay }: { data: { label: string, value: number }, maxHeight: number, color: string, delay: number }) {
  const h = useSharedValue(0);
  
  useEffect(() => {
    setTimeout(() => {
      h.value = withSpring(data.value * maxHeight, { damping: 14, stiffness: 90 });
    }, delay);
  }, [data.value, delay, maxHeight]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: h.value
  }));

  return (
    <View style={{ alignItems: 'center' }}>
      <Animated.View style={[{ width: 8, backgroundColor: color, borderRadius: 4 }, animatedStyle]} />
      <Text style={{ color: '#a1a1aa', fontSize: 10, marginTop: 4, fontFamily: 'monospace' }}>{data.label}</Text>
    </View>
  );
}
