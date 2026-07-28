import React, { useMemo, useState, useEffect } from "react";
import { View, Text, StyleSheet, Platform, StatusBar as RNStatusBar, TouchableOpacity, ScrollView, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import Animated, { FadeInUp, Layout, useAnimatedScrollHandler, useSharedValue, useAnimatedStyle, interpolate, Extrapolation, withRepeat, withSequence, withTiming, withSpring } from "react-native-reanimated";
import Svg, { Text as SvgText, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { MaterialIcons as Icon, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { DarkColors, LightColors, ThemeColors, F } from "../theme";
import MeshGradientBackground from "../components/MeshGradientBackground";
import ActivityRings from "../components/charts/ActivityRings";
import LiveWaveform from "../components/charts/LiveWaveform";
import RadarChart from "../components/charts/RadarChart";
import BarChart from "../components/charts/BarChart";
import SplineChart from "../components/charts/SplineChart";
import AnimatedPressable from "../components/AnimatedPressable";
import { fetchFeed, fetchActiveUsers, fetchVitals, FeedItem } from '../services/api/dashboard';
import { fetchWorkoutHistory } from '../services/api/workout';
import { socket } from '../services/socket/socketClient';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export default function DashboardScreen({ 
  onOpenCommandPalette,
  onNavigateToNotifications
}: { 
  onOpenCommandPalette?: () => void;
  onNavigateToNotifications?: () => void;
}) {
  const { isDark, C, bgColors, toggleTheme } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => getStyles(C), [C]);

  const queryClient = useQueryClient();

  const { data: feed = [] } = useQuery({ queryKey: ['feed'], queryFn: fetchFeed });
  const { data: activeUsers = [] } = useQuery({ queryKey: ['activeUsers'], queryFn: fetchActiveUsers });
  const { data: vitals } = useQuery({ queryKey: ['vitals'], queryFn: fetchVitals, refetchInterval: 3000 });
  const { data: history } = useQuery({ queryKey: ['workoutHistory'], queryFn: () => fetchWorkoutHistory() });

  const recentWorkout = history?.[0];

  useEffect(() => {
    const handleFeedUpdate = (newItem: FeedItem) => {
      queryClient.setQueryData(['feed'], (old: FeedItem[] = []) => [newItem, ...old]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    socket.on('feed_update', handleFeedUpdate);

    return () => {
      socket.off('feed_update', handleFeedUpdate);
    };
  }, [queryClient]);

  // Parallax Scroll Header
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    }
  });

  const stickyHeaderStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [20, 60], [0, 1], Extrapolation.CLAMP);
    const translateY = interpolate(scrollY.value, [20, 60], [-20, 0], Extrapolation.CLAMP);
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

  // Live ring animation (Soft Glow Pulse instead of double border)
  const liveRing = useSharedValue(1);
  useEffect(() => {
    liveRing.value = withRepeat(withTiming(1.2, { duration: 1500 }), -1, true);
  }, []);
  const liveRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(liveRing.value, [1, 1.2], [1, 1.4]) }],
    opacity: interpolate(liveRing.value, [1, 1.2], [0.3, 0])
  }));

  return (
    <View style={styles.safe}>
      <MeshGradientBackground bgColors={bgColors} isDark={isDark} />

      <SafeAreaView style={{ flex: 1 }}>
        {/* Sticky Blurred Header (Replaces Top Nav when scrolled) */}
        <Animated.View style={[styles.stickyHeader, stickyHeaderStyle, { pointerEvents: 'none' as any }]}>
          <BlurView intensity={80} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          <Text style={styles.stickyTitle}>Dashboard</Text>
        </Animated.View>

        <Animated.ScrollView 
          onScroll={scrollHandler} 
          scrollEventThrottle={16} 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
        >
          {/* Top Navigation */}
          <Animated.View entering={FadeInUp.delay(50).springify()} style={styles.topNav}>
            <View style={styles.topNavLeft}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.topNavAvatar} />
              ) : (
                <View style={[styles.topNavAvatar, { backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' }]}>
                  <Icon name="person" size={24} color={C.onPrimary} />
                </View>
              )}
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.greeting} numberOfLines={1}>Welcome, {user?.name}</Text>
                <Text style={styles.subGreeting} numberOfLines={1}>Recovery is optimal. Ready?</Text>
              </View>
            </View>
            <View style={styles.topNavRight}>
              <TouchableOpacity style={styles.iconBtn} onPress={toggleTheme}>
                <Icon name={isDark ? "light-mode" : "dark-mode"} size={20} color={C.onSurface} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => { Haptics.selectionAsync(); onOpenCommandPalette?.(); }}>
                <Icon name="search" size={20} color={C.onSurface} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => { Haptics.selectionAsync(); onNavigateToNotifications?.(); }}>
                <Icon name="notifications" size={20} color={C.onSurface} />
                <View style={styles.notificationBadge} />
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Active Users Horizontal List */}
          <Animated.View entering={FadeInUp.delay(100).springify()}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeUsersContainer}>
              {activeUsers.map((u, i) => (
                <View key={u.id} style={styles.userAvatarWrapper}>
                  {u.img ? (
                    <Image source={{ uri: u.img }} style={[styles.userAvatar, u.isLive && { borderWidth: 2, borderColor: C.primary }]} />
                  ) : (
                    <View style={[styles.userAvatar, { backgroundColor: C.glassInset, alignItems: 'center', justifyContent: 'center' }, u.isLive && { borderWidth: 2, borderColor: C.primary }]}>
                      <Icon name="person" size={28} color={C.onSurfaceVariant} />
                    </View>
                  )}
                  <Text style={styles.userName} numberOfLines={1}>{u.name}</Text>
                  {u.isLive && <View style={styles.liveDot} />}
                </View>
              ))}
            </ScrollView>
          </Animated.View>

          {/* Quick Action: Start Workout */}
          <Animated.View entering={FadeInUp.delay(125).springify().damping(15)}>
            <AnimatedPressable 
              containerStyle={{ marginBottom: 12 }}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                onOpenCommandPalette?.(); 
              }}
            >
              <View style={[styles.card, { padding: 0, overflow: 'hidden' }]}>
                <ExpoLinearGradient colors={[C.primary, C.primaryDim]} start={{x:0, y:0}} end={{x:1, y:1}} style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                  <View style={{ backgroundColor: 'rgba(0,0,0,0.1)', width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="fitness-center" size={24} color={C.onPrimary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: F.header, fontSize: 18, color: C.onPrimary }}>{recentWorkout ? "Continue Workout" : "Build a Workout"}</Text>
                    <Text style={{ fontFamily: F.bodyMed, fontSize: 13, color: 'rgba(61,47,0,0.7)' }}>{recentWorkout ? recentWorkout.title : "Tap to open quick actions"}</Text>
                  </View>
                  <Icon name="chevron-right" size={24} color={C.onPrimary} />
                </ExpoLinearGradient>
              </View>
            </AnimatedPressable>
          </Animated.View>

          {/* BENTO BOX GRID */}
          <Animated.View entering={FadeInUp.delay(150).springify().damping(15)}>
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
                    { progress: vitals?.moveProgress ?? 0, color: C.primary, radius: 40, strokeWidth: 10 },
                    { progress: vitals?.waterProgress ?? 0, color: '#38bdf8', radius: 28, strokeWidth: 10 },
                    { progress: vitals?.trainProgress ?? 0, color: '#a3e635', radius: 16, strokeWidth: 10 },
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
                        <Animated.View style={pulseStyle}>
                          <Svg width={80} height={40}>
                            <Defs>
                              <SvgLinearGradient id="textGrad" x1="0" y1="0" x2="1" y2="1">
                                <Stop offset="0" stopColor="#ff4b2b" stopOpacity="1" />
                                <Stop offset="1" stopColor="#ff416c" stopOpacity="1" />
                              </SvgLinearGradient>
                            </Defs>
                            <SvgText x="0" y="32" fontSize="36" fontFamily={F.header} fill="url(#textGrad)">
                              {vitals?.bpm || 68}
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
                          { label: 'UPR', value: vitals?.recoveryUpr || 0.4 },
                          { label: 'LWR', value: vitals?.recoveryLwr || 0.9 },
                          { label: 'COR', value: vitals?.recoveryCor || 0.7 },
                          { label: 'CRD', value: vitals?.recoveryCrd || 0.5 },
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
                          { label: 'M', value: vitals?.loadM ?? 0 },
                          { label: 'T', value: vitals?.loadT ?? 0 },
                          { label: 'W', value: vitals?.loadW ?? 0 },
                          { label: 'T', value: vitals?.loadTh ?? 0 },
                          { label: 'F', value: vitals?.loadF ?? 0 },
                          { label: 'S', value: vitals?.loadSa ?? 0 },
                          { label: 'S', value: vitals?.loadSu ?? 0 },
                        ]}
                      />
                    </View>
                  </View>
                </AnimatedPressable>
              </Animated.View>
            </View>
          </View>

          {/* Nutrition Summary Section */}
          <Animated.View entering={FadeInUp.delay(450).springify().damping(15)}>
            <AnimatedPressable containerStyle={{ marginTop: 12, marginBottom: 12 }} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
              <View style={[styles.card, { padding: 20 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <Text style={styles.cardTitle}>NUTRITION SUMMARY</Text>
                  <MaterialCommunityIcons name="food-apple-outline" size={24} color={C.primary} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View>
                    <Text style={{ fontFamily: F.num, fontSize: 32, color: C.onSurface, letterSpacing: -1 }}>2,050 <Text style={{ fontSize: 16, color: C.onSurfaceVariant }}>kcal</Text></Text>
                    <Text style={{ fontFamily: F.bodyMed, color: C.onSurfaceVariant, marginTop: 4 }}>Daily Target Achieved: 75%</Text>
                  </View>
                  <ActivityRings 
                    size={64}
                    rings={[
                      { progress: 0.8, color: '#4ade80', radius: 24, strokeWidth: 6 }, // Protein
                      { progress: 0.7, color: C.primary, radius: 16, strokeWidth: 6 }, // Carbs
                      { progress: 0.6, color: '#38bdf8', radius: 8, strokeWidth: 6 },  // Fats
                    ]}
                  />
                </View>
              </View>
            </AnimatedPressable>
          </Animated.View>

          {/* Live Social Feed Section */}
          <Animated.View entering={FadeInUp.delay(500).springify().damping(15)}>
            <View style={styles.feedHeader}>
              <Text style={styles.cardTitle}>LIVE ACTIVITY FEED</Text>
              <View style={styles.livePulseDot} />
            </View>
            
            <View>
              {feed.map((item) => (
                <Animated.View 
                  key={item.id} 
                  entering={FadeInUp.springify().damping(15)} 
                  layout={Layout.springify().damping(15)}
                >
                  <AnimatedPressable containerStyle={{ marginBottom: 12 }}>
                    <View style={[styles.card, styles.feedCard]}>
                      
                      {item.type === 'ai' ? (
                        <View style={[styles.feedAvatar, { backgroundColor: C.primary }]}>
                          <Icon name="auto-awesome" size={20} color={C.onPrimary} />
                        </View>
                      ) : (
                        <Image source={{ uri: item.avatar }} style={styles.feedAvatar} />
                      )}

                      <View style={{ flex: 1 }}>
                        <View style={styles.feedCardHeader}>
                          <Text style={styles.feedUserName}>{item.user}</Text>
                          <Text style={styles.feedTime}>{item.time}</Text>
                        </View>
                        
                        <Text style={[styles.feedMsg, item.type === 'ai' && { color: C.primary, fontFamily: F.bodyMed }]}>
                          {item.msg}
                        </Text>
                        
                        {item.type === 'workout' && (
                          <View style={styles.feedMetricsRow}>
                            <View style={styles.feedMetricBadge}>
                              <Icon name="favorite" size={14} color="#ff416c" />
                              <Text style={styles.feedMetricText}>{item.bpm} bpm</Text>
                            </View>
                            <View style={styles.feedMetricBadge}>
                              <Icon name="thumb-up" size={14} color={C.onSurfaceVariant} />
                              <Text style={styles.feedMetricText}>{item.likes}</Text>
                            </View>
                          </View>
                        )}
                      </View>

                    </View>
                  </AnimatedPressable>
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

const getStyles = (C: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    stickyHeader: {
      position: 'absolute',
      top: 0, left: 0, right: 0,
      height: Platform.OS === 'ios' ? 100 : 80,
      zIndex: 10,
      justifyContent: 'flex-end',
      paddingBottom: 16,
      alignItems: 'center',
    },
    stickyTitle: { fontFamily: F.header, fontSize: 16, color: C.onSurface },
    
    topNav: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24,
      paddingHorizontal: 4,
    },
    topNavLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    topNavAvatar: { width: 44, height: 44, borderRadius: 22 },
    greeting: { fontFamily: F.header, fontSize: 20, color: C.onSurface, letterSpacing: -0.5 },
    subGreeting: { fontFamily: F.bodyMed, fontSize: 13, color: C.primary, marginTop: 2 },
    topNavRight: { flexDirection: 'row', gap: 8 },
    iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.glassInset, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.outlineVariant },
    notificationBadge: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary },

    activeUsersContainer: { paddingHorizontal: 4, paddingBottom: 24, gap: 16 },
    userAvatarWrapper: { alignItems: 'center', width: 56 },
    userAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.glassInset },
    userName: { fontFamily: F.bodyMed, fontSize: 11, color: C.onSurface, marginTop: 6 },
    liveRing: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 28, backgroundColor: C.primary },
    liveDot: { position: 'absolute', bottom: 18, right: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: C.primary, borderWidth: 2, borderColor: C.bg },

    scrollContent: { padding: 16, paddingTop: 16 },
    row: { flexDirection: 'row', gap: 12 },
    
    card: { backgroundColor: C.glassInset, borderRadius: 24, padding: 16, borderWidth: 1, borderColor: C.outlineVariant },
    cardTitle: { fontFamily: F.header, fontSize: 11, letterSpacing: 1.2, color: C.onSurfaceVariant },
    metricLabel: { fontFamily: F.bodyBold, fontSize: 16, color: C.primary },
    
    legend: { marginTop: 16, gap: 6 },
    legendItem: { flexDirection: 'row', alignItems: 'center' },
    dot: { width: 6, height: 6, borderRadius: 3, marginRight: 8 },
    legendText: { fontFamily: F.bodyMed, fontSize: 12, color: C.onSurfaceVariant },

    feedHeader: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 4, marginTop: 16, marginBottom: 12 },
    livePulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ff4b2b', marginLeft: 8, marginBottom: 2 },
    
    feedCard: { flexDirection: 'row', padding: 16, gap: 16, borderRadius: 20 },
    feedAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    feedCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    feedUserName: { fontFamily: F.header, fontSize: 14, color: C.onSurface },
    feedTime: { fontFamily: F.body, fontSize: 11, color: C.onSurfaceVariant },
    feedMsg: { fontFamily: F.body, fontSize: 14, color: C.onSurfaceVariant, lineHeight: 20 },
    
    feedMetricsRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
    feedMetricBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    feedMetricText: { fontFamily: F.bodyMed, fontSize: 12, color: C.onSurfaceVariant }
  });
