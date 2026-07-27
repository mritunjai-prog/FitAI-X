import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable, Platform, StatusBar as RNStatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInUp, SlideInDown, SlideOutDown, useSharedValue, useAnimatedStyle, withSpring, runOnJS, useAnimatedSensor, SensorType, interpolate, Extrapolation } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { DarkColors, LightColors, F } from '../theme';
import MeshGradientBackground from '../components/MeshGradientBackground';
import { useQuery } from '@tanstack/react-query';
import { fetchBudgetPlan } from '../services/api/nutrition';
import { useTheme } from '../context/ThemeContext';

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

const ProgressBar = ({ label, current, total, color }: { label: string, current: number, total: number, color: string }) => {
  const { C } = useTheme();
  const styles = React.useMemo(() => getStyles(C), [C]);
  const width = (current / total) * 100;
  return (
    <View style={styles.progressCol}>
      <Text style={styles.progressLabel}>{label}</Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${width}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.progressValue}>{current} <Text style={{ color: C.onSurfaceVariant, fontSize: 10 }}>/ {total}g</Text></Text>
    </View>
  );
}

function SwipeableMealCard({ meal, index }: any) {
  const { C } = useTheme();
  const styles = React.useMemo(() => getStyles(C), [C]);
  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);
  
  const panGesture = Gesture.Pan()
    .onBegin(() => {
      startX.value = translateX.value;
    })
    .onUpdate((event) => {
      // Only allow swiping left
      if (event.translationX < 0) {
        translateX.value = startX.value + event.translationX;
      }
    })
    .onEnd((event) => {
      if (event.translationX < -80) {
        // Trigger regen
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Heavy);
        translateX.value = withSpring(0, { damping: 15 });
      } else {
        translateX.value = withSpring(0, { damping: 15 });
      }
    });

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }]
  }));

  const btnScale = useAnimatedStyle(() => {
    const scale = interpolate(translateX.value, [0, -100], [0.5, 1], Extrapolation.CLAMP);
    return { transform: [{ scale }] };
  });

  return (
    <Animated.View entering={FadeInUp.delay(300 + (index * 100)).springify()} style={{ marginBottom: 12, position: 'relative' }}>
      {/* Hidden Regenerate Button behind the card */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: `${C.primary}20`, borderRadius: 20, justifyContent: 'center', alignItems: 'flex-end', paddingRight: 24, borderWidth: 1, borderColor: C.primary }]}>
        <Animated.View style={[{ alignItems: 'center' }, btnScale]}>
          <MaterialCommunityIcons name="refresh" size={28} color={C.primary} />
          <Text style={{ color: C.primary, fontFamily: F.header, fontSize: 10, marginTop: 4 }}>REGENERATE</Text>
        </Animated.View>
      </View>
      
      {/* The actual card */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.mealCard, animStyle, { marginBottom: 0 }]}>
          <View style={styles.mealHeader}>
            <Text style={styles.mealType}>{meal.type}</Text>
            <View style={styles.mealCostBadge}>
              <Text style={styles.mealCostText}>${meal.cost.toFixed(2)}</Text>
            </View>
          </View>
          <Text style={styles.mealName}>{meal.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <MaterialCommunityIcons name="fire" size={14} color="#ff4a4a" />
            <Text style={styles.mealCals}>{meal.cals} kcal</Text>
          </View>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

export default function NutritionScreen() {
  const { isDark, C, bgColors } = useTheme();
  const styles = React.useMemo(() => getStyles(C), [C]);
  const [showGrocery, setShowGrocery] = useState(false);
  const { data: budgetData } = useQuery({ queryKey: ['budgetPlan'], queryFn: () => fetchBudgetPlan(75, 2500) });
  const meals = budgetData?.meals || [];
  const groceryList = budgetData?.groceryList || [];
  const weeklyCost = budgetData?.weeklyCost || 0;
  const dailyCals = budgetData?.dailyCals || 0;

  // Gyroscope Shimmer
  const sensor = useAnimatedSensor(SensorType.ROTATION, { interval: 16 });
  const shimmerStyle = useAnimatedStyle(() => {
    // Pitch/Roll are roughly between -Math.PI and Math.PI
    const tx = interpolate(sensor.sensor.value.roll, [-1, 1], [-50, 50], Extrapolation.CLAMP);
    return { transform: [{ translateX: tx }] };
  });

  return (
    <View style={styles.container}>
      <MeshGradientBackground bgColors={bgColors} isDark={isDark} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={styles.title}>Meal Planner</Text>
          <Text style={styles.subtitle}>AI optimized for high-protein and $75/wk budget.</Text>
        </View>

      <ScrollView style={styles.scrollContent} contentContainerStyle={{ padding: 24, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        
        {/* Macros Card */}
        <Animated.View entering={FadeInUp.delay(100).springify()}>
          <View style={styles.macroCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialCommunityIcons name="fire" size={24} color="#ff4a4a" />
                <Text style={styles.macroTitle}>Daily Targets</Text>
              </View>
              <Text style={styles.calorieText}>{dailyCals || 2050} <Text style={{ fontSize: 14, color: C.onSurfaceVariant }}>kcal</Text></Text>
            </View>
            
            <View style={styles.macroBarsRow}>
              <ProgressBar label="Protein" current={160} total={200} color="#4ade80" />
              <ProgressBar label="Carbs" current={195} total={250} color={C.primary} />
              <ProgressBar label="Fats" current={67} total={90} color="#38bdf8" />
            </View>
          </View>
        </Animated.View>

        {/* Generate Button with Gyroscope Shimmer */}
        <Animated.View entering={FadeInUp.delay(200).springify()}>
          <TouchableOpacity 
            activeOpacity={0.8} 
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowGrocery(true); }}
            style={{ marginBottom: 32, borderRadius: 16, overflow: 'hidden' }}
          >
            <LinearGradient colors={[C.primary, C.primaryDim]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.generateBtn}>
              {/* Shimmer Overlay driven by Gyroscope */}
              <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: 0.4 }, shimmerStyle]} pointerEvents="none">
                <LinearGradient colors={['transparent', '#FFF', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFillObject} />
              </Animated.View>

              <Feather name="shopping-cart" size={18} color={C.onPrimary} />
              <Text style={styles.generateBtnText}>Generate Grocery List</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        <Text style={styles.sectionTitle}>Today's Plan</Text>
        
        {meals.map((meal: any, index: number) => (
          <SwipeableMealCard key={meal.id} meal={meal} index={index} />
        ))}

      </ScrollView>
      </SafeAreaView>

      {/* Grocery Modal Bottom Sheet */}
      {showGrocery && (
        <Animated.View style={styles.modalOverlay}>
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFillObject} />
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowGrocery(false)} />
          
          <Animated.View entering={SlideInDown.springify().damping(20).stiffness(150)} exiting={SlideOutDown.duration(200)} style={styles.modalContent}>
            {/* Grabber Pill */}
            <View style={{ width: 40, height: 4, backgroundColor: C.outlineVariant, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 12 }} />
            
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Grocery List</Text>
              <TouchableOpacity onPress={() => setShowGrocery(false)} style={styles.closeBtn}>
                <Feather name="x" size={20} color={C.onSurface} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={{ padding: 24 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.categoryTitle}>Optimized Grocery List</Text>
              {groceryList.map((item: any, i: number) => (
                <View key={i} style={styles.groceryItem}>
                  <Text style={styles.itemText}>{item.name} x{item.quantity}</Text>
                  <Text style={styles.itemPrice}>${item.totalCost.toFixed(2)}</Text>
                </View>
              ))}
            </ScrollView>

            <View style={styles.modalFooter}>
              <View>
                <Text style={{ color: C.onSurfaceVariant, fontSize: 12, fontFamily: F.header, textTransform: 'uppercase', letterSpacing: 1 }}>Total Est.</Text>
                <Text style={{ color: '#4ade80', fontSize: 28, fontFamily: F.num, letterSpacing: -1 }}>${weeklyCost.toFixed(2)}</Text>
              </View>
              <TouchableOpacity style={styles.exportBtn}>
                <Text style={styles.exportBtnText}>Export to App</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

const getStyles = (C: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 24, marginBottom: 10, marginTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 0) + 20 : 20 },
  title: { fontSize: 32, fontFamily: F.header, color: C.onSurface, marginBottom: 4, letterSpacing: -1 },
  subtitle: { fontSize: 14, fontFamily: F.body, color: C.onSurfaceVariant },
  scrollContent: { flex: 1 },
  
  macroCard: { backgroundColor: C.glassInset, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: C.outlineVariant, marginBottom: 20 },
  macroTitle: { color: C.onSurface, fontFamily: F.header, fontSize: 16, marginLeft: 8 },
  calorieText: { color: C.onSurface, fontSize: 24, fontFamily: F.num },
  macroBarsRow: { flexDirection: 'row', gap: 16 },
  
  generateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 18, borderRadius: 16 },
  generateBtnText: { color: C.onPrimary, fontFamily: F.bodyBold, fontSize: 16, marginLeft: 10 },
  
  sectionTitle: { color: C.onSurfaceVariant, fontFamily: F.header, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 16, marginLeft: 8 },
  
  mealCard: { backgroundColor: C.glassInset, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: C.outlineVariant, marginBottom: 12 },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  mealType: { color: C.onSurfaceVariant, fontSize: 11, fontFamily: F.header, textTransform: 'uppercase', letterSpacing: 1 },
  mealCostBadge: { backgroundColor: `${C.success}1A`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: `${C.success}33` },
  mealCostText: { color: C.success, fontSize: 12, fontFamily: F.bodyBold },
  mealName: { color: C.onSurface, fontSize: 18, fontFamily: F.bodyBold },
  mealCals: { color: C.onSurfaceVariant, fontSize: 13, fontFamily: F.bodyMed },
  
  modalOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 100, justifyContent: 'flex-end' },
  modalContent: { backgroundColor: C.bg, borderTopLeftRadius: 32, borderTopRightRadius: 32, height: '85%', borderWidth: 1, borderColor: C.outlineVariant, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.5, shadowRadius: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: C.outlineVariant },
  modalTitle: { color: C.onSurface, fontSize: 24, fontFamily: F.header, letterSpacing: -0.5 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.glassInset, alignItems: 'center', justifyContent: 'center' },
  
  categoryTitle: { color: C.onSurfaceVariant, fontSize: 11, fontFamily: F.header, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 },
  groceryItem: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: C.glassInset, padding: 16, borderRadius: 16, marginBottom: 8, borderWidth: 1, borderColor: C.outlineVariant },
  itemText: { color: C.onSurface, fontFamily: F.bodyMed, fontSize: 15 },
  itemPrice: { color: C.onSurfaceVariant, fontFamily: F.num, fontSize: 15 },
  
  modalFooter: { padding: 24, paddingBottom: 40, borderTopWidth: 1, borderTopColor: C.outlineVariant, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.bg },
  exportBtn: { backgroundColor: C.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16 },
  exportBtnText: { color: C.onPrimary, fontFamily: F.bodyBold, fontSize: 15 },
  
  progressCol: { flex: 1 },
  progressLabel: { fontFamily: F.header, fontSize: 10, color: C.onSurfaceVariant, textTransform: 'uppercase', marginBottom: 6 },
  progressTrack: { height: 6, backgroundColor: C.outlineVariant, borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', borderRadius: 3 },
  progressValue: { fontFamily: F.num, fontSize: 11, color: C.onSurface }
});
