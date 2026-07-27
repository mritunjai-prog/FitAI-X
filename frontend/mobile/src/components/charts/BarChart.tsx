import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Platform, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

export type BarData = { label: string; value: number; raw?: number }[]; // value 0 to 1

export default function BarChart({ data, height, color }: { data: BarData, height: number, color: string }) {
  // If too many items, let's allow horizontal scrolling? Or just flex. We'll use flex for up to 10 items.
  return (
    <View style={{ height, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: 20 }}>
      {data.map((d, i) => (
        <Bar key={i} data={d} maxHeight={height - 25} color={color} delay={i * 50} />
      ))}
    </View>
  );
}

function Bar({ data, maxHeight, color, delay }: { data: { label: string, value: number, raw?: number }, maxHeight: number, color: string, delay: number }) {
  const h = useSharedValue(0);
  const [active, setActive] = useState(false);
  
  useEffect(() => {
    setTimeout(() => {
      // Minimum height of 4px so it's visible even if 0
      h.value = withSpring(Math.max(data.value * maxHeight, 4), { damping: 14, stiffness: 90 });
    }, delay);
  }, [data.value, delay, maxHeight]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: h.value
  }));

  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      {active && data.raw !== undefined && (
        <Animated.View entering={FadeIn.duration(200)} style={styles.tooltip}>
          <Text style={styles.tooltipText}>{data.raw}</Text>
        </Animated.View>
      )}
      
      <Pressable 
        onPressIn={() => setActive(true)}
        onPressOut={() => setActive(false)}
        style={{ width: '100%', alignItems: 'center' }}
      >
        <Animated.View style={[{ width: 14, borderRadius: 7, overflow: 'hidden' }, animatedStyle]}>
          <LinearGradient
            colors={[color, `${color}40`]}
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>
      </Pressable>
      
      <Text style={{ color: active ? '#fff' : '#888', fontSize: 10, marginTop: 6, fontFamily: 'monospace' }} numberOfLines={1}>
        {data.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tooltip: {
    position: 'absolute',
    top: -24,
    backgroundColor: '#333',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 10,
  },
  tooltipText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'monospace'
  }
});
