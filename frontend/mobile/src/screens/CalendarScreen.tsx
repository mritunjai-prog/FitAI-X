import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions, Platform, StatusBar as RNStatusBar, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeIn, FadeOut, SlideInDown, SlideOutUp, Layout, useSharedValue, useAnimatedStyle, withSpring, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { DarkColors, F } from '../theme';
import MeshGradientBackground from '../components/MeshGradientBackground';
import { useTheme } from '../context/ThemeContext';

import { useQuery } from '@tanstack/react-query';
import { fetchSchedule } from '../services/api/calendar';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── Reusable Scale Card ────────────────────────────────────────────────────────
function ScaleCard({ children, style, onLongPress, onPress }: any) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  
  return (
    <Pressable
      onPressIn={() => { scale.value = withSpring(0.96); }}
      onPressOut={() => { scale.value = withSpring(1); }}
      onPress={onPress}
      onLongPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); onLongPress?.(); }}
    >
      <Animated.View style={[style, animStyle]}>{children}</Animated.View>
    </Pressable>
  );
}

// ─── AI Spinner ───────────────────────────────────────────────────────────────
function AISpinner() {
  const { C } = useTheme();
  const rotation = useSharedValue(0);
  useEffect(() => {
    rotation.value = withRepeat(withTiming(360, { duration: 1000, easing: Easing.linear }), -1, false);
  }, []);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));
  return (
    <Animated.View style={[{ width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: `${C.primary}33`, borderTopColor: C.primary }, animStyle]} />
  );
}

export default function CalendarScreen() {
  const { isDark, C, bgColors } = useTheme();
  const styles = React.useMemo(() => getStyles(C), [C]);
  const { user } = useAuth();
  
  const { data: events = [] } = useQuery({ 
    queryKey: ['calendar', user?.id], 
    queryFn: () => fetchSchedule(user?.id),
    enabled: !!user?.id
  });
  
  // Transform flat events into schedule array
  const scheduleData = React.useMemo(() => {
    const arr = Array.from({ length: 7 }).map((_, i) => ({ day: i, items: [] as any[] }));
    events.forEach((evt: any) => {
      if (arr[evt.dayIndex]) {
        arr[evt.dayIndex].items.push(evt);
      }
    });
    return arr;
  }, [events]);

  const [schedule, setSchedule] = useState(scheduleData);
  const [selectedDayIndex, setSelectedDayIndex] = useState(2);
  useEffect(() => {
    setSchedule(scheduleData);
  }, [scheduleData]);

  const [isRecalculating, setIsRecalculating] = useState(false);
  const [warningMsg, setWarningMsg] = useState<string | null>(null);
  const [selectedWorkout, setSelectedWorkout] = useState<any | null>(null);

  const simulateDragAndDrop = () => {
    setIsRecalculating(true);
    
    // Simulate AI thinking delay
    setTimeout(() => {
      // Actually shift the data to trigger Layout Animations
      const newSchedule = [...schedule];
      const runItem = newSchedule[6].items.pop(); // Remove from Sat
      if (runItem) newSchedule[0].items.push(runItem); // Move to Sun
      
      setSchedule(newSchedule);
      setIsRecalculating(false);
      setWarningMsg("AI Shifted 'Long Run' to Sunday due to Heavy Legs on Thursday.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      setTimeout(() => setWarningMsg(null), 4000);
    }, 1500);
  };

  return (
    <View style={styles.container}>
      <MeshGradientBackground bgColors={bgColors} isDark={isDark} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={styles.title}>Smart Calendar</Text>
          <Text style={styles.subtitle}>Hold & drag to reschedule. AI adapts instantly.</Text>
        </View>

      {warningMsg && (
        <Animated.View entering={SlideInDown.springify()} exiting={SlideOutUp} style={styles.warningBox}>
          <Feather name="alert-triangle" size={18} color={C.primary} />
          <Text style={styles.warningText}>{warningMsg}</Text>
        </Animated.View>
      )}

      <ScrollView style={styles.scrollContent} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        
        {/* Horizontal Days Header */}
        <View style={styles.calendarHeaderRow}>
          {DAYS.map((day, i) => {
            const isActive = i === selectedDayIndex; 
            return (
              <TouchableOpacity key={day} style={styles.dayCol} onPress={() => setSelectedDayIndex(i)}>
                <Text style={[styles.dayText, isActive && { color: C.onPrimary }]}>{day}</Text>
                <View style={[styles.dateWrapper, isActive && { backgroundColor: C.primary }]}>
                  <Text style={[styles.dateText, isActive && { color: C.onPrimary }]}>{22 + i}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Calendar Body */}
        <View style={styles.calendarBody}>
          {isRecalculating && (
            <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(300)} style={styles.recalcOverlay}>
              <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFillObject} />
              <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                <AISpinner />
                <View style={{ position: 'absolute' }}>
                  <MaterialCommunityIcons name="brain" size={24} color={C.primary} />
                </View>
              </View>
              <Text style={styles.recalcTitle}>Recalculating Ecosystem</Text>
              <Text style={styles.recalcSub}>Adjusting recovery windows...</Text>
            </Animated.View>
          )}

          {schedule.filter((_, index) => index === selectedDayIndex).map((dayPlan) => (
            <View key={selectedDayIndex} style={styles.dayRow}>
              <View style={styles.dayLabel}>
                <Text style={styles.dayLabelText}>{DAYS[selectedDayIndex]}</Text>
              </View>
              <View style={styles.dayContent}>
                {dayPlan.items.length === 0 ? (
                  <View style={styles.emptySlot}>
                    <Text style={styles.emptyText}>Rest / Unscheduled</Text>
                  </View>
                ) : (
                  dayPlan.items.map((item, itemIndex) => (
                    <Animated.View 
                      layout={Layout.springify().damping(16).stiffness(120)} 
                      entering={FadeInUp.delay(itemIndex * 100).springify()} 
                      key={item.id}
                      style={{ marginBottom: 8 }}
                    >
                      <Animated.View {...{ sharedTransitionTag: `card-${item.id}` }}>
                        <ScaleCard 
                          style={[styles.itemCard, item.type === 'meal' && styles.mealCard, { marginBottom: 0 }]}
                          onLongPress={simulateDragAndDrop}
                          onPress={() => {
                            if(item.type === 'workout') {
                              setSelectedWorkout(item);
                            }
                          }}
                        >
                          <View style={[styles.iconBox, item.type === 'meal' ? { backgroundColor: `${C.success}20` } : { backgroundColor: `${C.primary}20` }]}>
                            <MaterialCommunityIcons 
                              name={item.type === 'workout' ? 'dumbbell' : 'food-apple'} 
                              size={18} 
                              color={item.type === 'workout' ? C.primary : C.success} 
                            />
                          </View>
                          <View style={{ marginLeft: 12, flex: 1 }}>
                            <Text style={styles.itemTitle}>{item.title}</Text>
                            {item.intensity && <Text style={styles.itemSub}>{item.intensity} Intensity</Text>}
                          </View>
                          <Feather name="menu" size={16} color={C.outlineVariant} />
                        </ScaleCard>
                      </Animated.View>
                    </Animated.View>
                  ))
                )}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
      </SafeAreaView>

      {/* Shared Transition Full Screen View */}
      {selectedWorkout && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFillObject} />
          
          <Animated.View 
            {...{ sharedTransitionTag: `card-${selectedWorkout.id}` }}
            style={styles.fullScreenCard}
          >
            <View style={{ padding: 24, paddingTop: 60, flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={[styles.iconBox, { backgroundColor: `${C.primary}20`, width: 48, height: 48, borderRadius: 16 }]}>
                  <MaterialCommunityIcons name="dumbbell" size={24} color={C.primary} />
                </View>
                <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedWorkout(null)}>
                  <Feather name="x" size={24} color={C.onSurface} />
                </TouchableOpacity>
              </View>
              
              <Text style={[styles.itemTitle, { fontSize: 32, fontFamily: F.header, marginTop: 24, letterSpacing: -1 }]}>
                {selectedWorkout.title}
              </Text>
              <Text style={[styles.itemSub, { fontSize: 16, marginTop: 8 }]}>
                {selectedWorkout.intensity} Intensity • AI Optimized
              </Text>
              
              <View style={{ marginTop: 40 }}>
                <Text style={styles.recalcTitle}>Workout Plan</Text>
                {/* Dummy list to simulate details */}
                {[1,2,3].map(i => (
                  <Animated.View entering={FadeInUp.delay(i*100)} key={i} style={{ flexDirection: 'row', padding: 16, backgroundColor: C.glassInset, borderRadius: 12, marginTop: 12, borderWidth: 1, borderColor: C.outlineVariant }}>
                    <Text style={{ color: C.onSurface, fontFamily: F.bodyMed }}>Exercise {i}</Text>
                  </Animated.View>
                ))}
              </View>
            </View>
          </Animated.View>
        </View>
      )}

    </View>
  );
}

const getStyles = (C: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 24, marginBottom: 20, marginTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 0) + 20 : 20 },
  title: { fontSize: 32, fontFamily: F.header, color: C.onSurface, letterSpacing: -1, marginBottom: 4 },
  subtitle: { fontSize: 14, fontFamily: F.body, color: C.onSurfaceVariant },
  warningBox: { marginHorizontal: 24, marginBottom: 16, backgroundColor: `${C.primary}1A`, borderColor: `${C.primary}4D`, borderWidth: 1, padding: 14, borderRadius: 16, flexDirection: 'row', alignItems: 'center' },
  warningText: { color: C.primary, fontFamily: F.bodyMed, fontSize: 13, marginLeft: 12, flex: 1, lineHeight: 18 },
  scrollContent: { flex: 1 },
  
  calendarHeaderRow: { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 16, marginBottom: 16 },
  dayCol: { flex: 1, alignItems: 'center', gap: 6 },
  dayText: { fontSize: 10, color: C.onSurfaceVariant, fontFamily: F.header, textTransform: 'uppercase', letterSpacing: 1 },
  dateWrapper: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  dateText: { fontSize: 16, color: C.onSurface, fontFamily: F.num },
  
  calendarBody: { paddingHorizontal: 16, position: 'relative', minHeight: 400 },
  dayRow: { flexDirection: 'row', marginBottom: 16, minHeight: 60 },
  dayLabel: { width: 44, alignItems: 'center', paddingTop: 16 },
  dayLabelText: { fontSize: 11, color: C.onSurfaceVariant, fontFamily: F.header, textTransform: 'uppercase', letterSpacing: 1 },
  dayContent: { flex: 1, borderLeftWidth: 1, borderLeftColor: C.outlineVariant, paddingLeft: 16, paddingBottom: 16 },
  
  emptySlot: { height: 64, borderStyle: 'dashed', borderWidth: 1, borderColor: C.outlineVariant, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: C.glassInset },
  emptyText: { fontFamily: F.bodyMed, fontSize: 12, color: C.outline },
  
  itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.glassInset, borderWidth: 1, borderColor: C.outlineVariant, borderRadius: 16, padding: 16, marginBottom: 8 },
  mealCard: { backgroundColor: `${C.success}0A`, borderColor: `${C.success}33` },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  itemTitle: { color: C.onSurface, fontSize: 15, fontFamily: F.bodyBold },
  itemSub: { color: C.onSurfaceVariant, fontSize: 12, fontFamily: F.body, marginTop: 2 },
  
  recalcOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 24, overflow: 'hidden' },
  recalcTitle: { color: C.onSurface, fontSize: 22, fontFamily: F.header, marginTop: 24 },
  recalcSub: { color: C.primary, fontSize: 14, fontFamily: F.bodyMed, marginTop: 6 },
  
  fullScreenCard: { ...StyleSheet.absoluteFillObject, backgroundColor: C.bg, zIndex: 50 },
  closeBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.glassInset, alignItems: 'center', justifyContent: 'center' }
});
