import React, { useMemo, useState, useEffect } from "react";
import { View, Text, StyleSheet, SafeAreaView, Platform, StatusBar as RNStatusBar } from "react-native";
import { BlurView } from "expo-blur";
import Animated, { FadeInUp, Layout, useAnimatedScrollHandler, useSharedValue, useAnimatedStyle, interpolate, Extrapolation, withRepeat, withSequence, withTiming, withSpring } from "react-native-reanimated";
import Svg, { Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';

import { DarkColors, LightColors, ThemeColors, F } from "../theme";
import MeshGradientBackground from "../components/MeshGradientBackground";
import ActivityRings from "../components/charts/ActivityRings";
import LiveWaveform from "../components/charts/LiveWaveform";
import RadarChart from "../components/charts/RadarChart";
import BarChart from "../components/charts/BarChart";
import SplineChart from "../components/charts/SplineChart";
import AnimatedPressable from "../components/AnimatedPressable";

const isDark = true;
const C = isDark ? DarkColors : LightColors;

export default function DashboardScreen() {
  const styles = useMemo(() => getStyles(C), [C]);

  const bgColors = (
    isDark
      ? [C.bg, "#1a1813", "#081a20", C.bg]
      : [C.bg, "#e8e6df", "#dff0f5", C.bg]
  ) as readonly [string, string, ...string[]];

  // Feed state with progress
  const [feed, setFeed] = useState([
    { id: '1', msg: 'AI Coach generated Push Day V3', time: 'Just now', progress: 1 },
    { id: '2', msg: 'Hydration goal', time: '2m ago', progress: 0.5 }
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFeed(prev => [
        { id: Math.random().toString(), msg: 'Rachel recommended adding sleep time tonight', time: 'Just now', progress: 0.8 },
        ...prev
      ]);
    }, 8000);
    return () => clearTimeout(timer);
  }, []);

  // Parallax Scroll Header
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    }
  });

  const headerAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [0, 100], [1, 0], Extrapolation.CLAMP);
    const scale = interpolate(scrollY.value, [0, 100], [1, 0.9], Extrapolation.CLAMP);
    return {
      opacity,
      transform: [{ scale }]
    };
  });

  const stickyHeaderStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [80, 120], [0, 1], Extrapolation.CLAMP);
    const translateY = interpolate(scrollY.value, [80, 120], [-20, 0], Extrapolation.CLAMP);
    return {
      opacity,
      transform: [{ translateY }]
    };
  });

  // Pulse effect for BPM
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 200 }),
        withTiming(1, { duration: 600 })
      ),
      -1,
      false
    );
  }, []);
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }]
  }));

  return (
    <View style={styles.safe}>
      <MeshGradientBackground bgColors={bgColors} isDark={isDark} />

      <SafeAreaView style={{ flex: 1 }}>
        {/* Sticky Blurred Header */}
        <Animated.View style={[styles.stickyHeader, stickyHeaderStyle]}>
          <BlurView intensity={80} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          <Text style={styles.stickyTitle}>Alex Mercer</Text>
        </Animated.View>

        <Animated.ScrollView 
          onScroll={scrollHandler} 
          scrollEventThrottle={16} 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
        >
          {/* Main Parallax Header */}
          <Animated.View style={[styles.header, headerAnimatedStyle]}>
            <Text style={styles.greeting}>Good Evening, Alex</Text>
            <Text style={styles.subGreeting}>Recovery is optimal. Ready to train?</Text>
          </Animated.View>

          {/* BENTO BOX GRID */}
          
          {/* Top Hero: Activity Rings */}
          <Animated.View entering={FadeInUp.delay(100).springify().damping(15)}>
            <AnimatedPressable containerStyle={{ marginBottom: 12 }}>
              <View style={[styles.card, { flexDirection: 'row', alignItems: 'center' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>TODAY'S ACTIVITY</Text>
                  <View style={styles.legend}>
                    <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: C.primary }]} /><Text style={styles.legendText}>Move</Text></View>
                    <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#38bdf8' }]} /><Text style={styles.legendText}>Water</Text></View>
                    <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#a3e635' }]} /><Text style={styles.legendText}>Train</Text></View>
                  </View>
                </View>
                <ActivityRings 
                  size={100}
                  rings={[
                    { progress: 0.8, color: C.primary, radius: 40, strokeWidth: 10 },
                    { progress: 0.6, color: '#38bdf8', radius: 28, strokeWidth: 10 },
                    { progress: 0.4, color: '#a3e635', radius: 16, strokeWidth: 10 },
                  ]}
                />
              </View>
            </AnimatedPressable>
          </Animated.View>

          {/* Asymmetrical Grid */}
          <View style={styles.row}>
            {/* Left Column (Tall) */}
            <View style={{ flex: 1.2, gap: 12 }}>
              <Animated.View entering={FadeInUp.delay(200).springify().damping(15)}>
                <AnimatedPressable containerStyle={{ flex: 1 }}>
                  <View style={[styles.card, { padding: 0, overflow: 'hidden' }]}>
                    <View style={{ padding: 16, paddingBottom: 0 }}>
                      <Text style={styles.cardTitle}>LIVE VITALS</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 8 }}>
                        {/* Gradient Typography */}
                        <Animated.View style={pulseStyle}>
                          <Svg width={80} height={40}>
                            <Defs>
                              <LinearGradient id="textGrad" x1="0" y1="0" x2="1" y2="1">
                                <Stop offset="0" stopColor="#ff4b2b" stopOpacity="1" />
                                <Stop offset="1" stopColor="#ff416c" stopOpacity="1" />
                              </LinearGradient>
                            </Defs>
                            <SvgText x="0" y="32" fontSize="36" fontFamily={F.header} fill="url(#textGrad)">
                              68
                            </SvgText>
                          </Svg>
                        </Animated.View>
                        <Text style={[styles.metricLabel, { marginLeft: -10 }]}>bpm</Text>
                      </View>
                    </View>
                    
                    <View style={{ marginTop: 12 }}>
                      <LiveWaveform width={180} height={70} color="#ff4b2b" bgFadeColor={C.glassInset} />
                    </View>
                    
                    <View style={{ padding: 16, paddingTop: 8 }}>
                      <Text style={[styles.cardTitle, { marginBottom: 8 }]}>BODY BATTERY</Text>
                      <SplineChart width={140} height={80} color="#38bdf8" />
                    </View>
                  </View>
                </AnimatedPressable>
              </Animated.View>
            </View>

            {/* Right Column (Stacked) */}
            <View style={{ flex: 1, gap: 12 }}>
              <Animated.View entering={FadeInUp.delay(300).springify().damping(15)}>
                <AnimatedPressable>
                  <View style={[styles.card, { alignItems: 'center', height: 160 }]}>
                    <Text style={styles.cardTitle}>RECOVERY</Text>
                    <View style={{ marginTop: 8 }}>
                      <RadarChart 
                        size={100}
                        color={C.primary}
                        data={[
                          { label: 'UPR', value: 0.4 },
                          { label: 'LWR', value: 0.9 },
                          { label: 'COR', value: 0.7 },
                          { label: 'CRD', value: 0.5 },
                        ]}
                      />
                    </View>
                  </View>
                </AnimatedPressable>
              </Animated.View>

              <Animated.View entering={FadeInUp.delay(400).springify().damping(15)}>
                <AnimatedPressable>
                  <View style={[styles.card, { height: 140 }]}>
                    <Text style={styles.cardTitle}>7-DAY LOAD</Text>
                    <View style={{ flex: 1, justifyContent: 'flex-end', marginTop: 8 }}>
                      <BarChart 
                        height={70}
                        color="#a3e635"
                        data={[
                          { label: 'M', value: 0.2 },
                          { label: 'T', value: 0.8 },
                          { label: 'W', value: 0.5 },
                          { label: 'T', value: 0.9 },
                          { label: 'F', value: 0.4 },
                          { label: 'S', value: 0.1 },
                          { label: 'S', value: 0.6 },
                        ]}
                      />
                    </View>
                  </View>
                </AnimatedPressable>
              </Animated.View>
            </View>
          </View>

          {/* Live Feed Section */}
          <Animated.View entering={FadeInUp.delay(500).springify().damping(15)}>
            <Text style={[styles.cardTitle, { marginHorizontal: 4, marginTop: 24, marginBottom: 12 }]}>LIVE ACTIVITY FEED</Text>
            <View>
              {feed.map((item) => (
                <Animated.View 
                  key={item.id} 
                  entering={FadeInUp.springify().damping(15)} 
                  layout={Layout.springify().damping(15)}
                  style={styles.feedItem}
                >
                  <View style={[styles.dot, { backgroundColor: C.primary, width: 8, height: 8, marginRight: 12 }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.feedMsg}>{item.msg}</Text>
                    {/* Micro Progress Bar */}
                    {item.progress && (
                      <View style={microStyles.microBarContainer}>
                        <AnimatedMicroBar progress={item.progress} />
                      </View>
                    )}
                    <Text style={styles.feedTime}>{item.time}</Text>
                  </View>
                </Animated.View>
              ))}
            </View>
          </Animated.View>
          
          <View style={{ height: 40 }} />
        </Animated.ScrollView>
      </SafeAreaView>
    </View>
  );
}

// Helper for Feed micro progress bars
function AnimatedMicroBar({ progress }: { progress: number }) {
  const w = useSharedValue(0);
  useEffect(() => {
    w.value = withSpring(progress * 100, { damping: 14, stiffness: 90 });
  }, [progress]);
  const style = useAnimatedStyle(() => ({ width: `${w.value}%` }));
  return (
    <Animated.View style={[microStyles.microBarFill, style]} />
  );
}

const microStyles = StyleSheet.create({
  microBarContainer: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    marginTop: 8,
    marginBottom: 4,
    overflow: 'hidden'
  },
  microBarFill: {
    height: '100%',
    backgroundColor: DarkColors.primary,
    borderRadius: 2
  }
});

const getStyles = (C: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    stickyHeader: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: Platform.OS === 'ios' ? 100 : 80,
      zIndex: 10,
      justifyContent: 'flex-end',
      paddingBottom: 16,
      alignItems: 'center',
    },
    stickyTitle: {
      fontFamily: F.header,
      fontSize: 16,
      color: C.onSurface,
    },
    header: {
      paddingHorizontal: 4,
      paddingTop: 12,
      paddingBottom: 24,
    },
    greeting: { fontFamily: F.header, fontSize: 32, color: C.onSurface, letterSpacing: -0.5 },
    subGreeting: { fontFamily: F.body, fontSize: 15, color: C.onSurfaceVariant, marginTop: 4 },
    
    scrollContent: { padding: 16, paddingTop: 40 },
    
    row: {
      flexDirection: 'row',
      gap: 12,
    },
    card: {
      backgroundColor: C.glassInset,
      borderRadius: 24,
      padding: 16,
      borderWidth: 1,
      borderColor: C.outlineVariant,
    },
    cardTitle: {
      fontFamily: F.header,
      fontSize: 11,
      letterSpacing: 1.2,
      color: C.onSurfaceVariant,
    },
    metricLabel: {
      fontFamily: F.bodyBold,
      fontSize: 16,
      color: C.primary,
    },
    legend: {
      marginTop: 16,
      gap: 6,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginRight: 8,
    },
    legendText: {
      fontFamily: F.bodyMed,
      fontSize: 12,
      color: C.onSurfaceVariant,
    },
    feedItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.glassInset,
      borderRadius: 16,
      padding: 16,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: C.outlineVariant,
    },
    feedMsg: {
      fontFamily: F.bodyMed,
      fontSize: 14,
      color: C.onSurface,
      lineHeight: 20,
    },
    feedTime: {
      fontFamily: F.body,
      fontSize: 12,
      color: C.outline,
      marginTop: 2,
    }
  });
