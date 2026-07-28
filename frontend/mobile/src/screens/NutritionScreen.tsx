import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable, Platform, StatusBar as RNStatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons, MaterialIcons as Icon } from '@expo/vector-icons';
import Animated, { FadeInUp, SlideInDown, SlideOutDown, useSharedValue, useAnimatedStyle, withSpring, runOnJS, useAnimatedSensor, SensorType, interpolate, Extrapolation } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { DarkColors, LightColors, F } from '../theme';
import MeshGradientBackground from '../components/MeshGradientBackground';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchMeals, fetchBudgetPlan, generateAiPlan } from '../services/api/nutrition';
import { apiClient } from '../services/api/client';
import { ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

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
        if (meal.id) runOnJS(meal.onRegenerate)(meal.id);
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
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {meal.versions?.length > 1 && (
                <TouchableOpacity onPress={() => meal.onShowHistory?.(meal)} style={{ backgroundColor: C.glassInset, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: C.outlineVariant }}>
                  <Text style={{ color: C.onSurfaceVariant, fontSize: 10, fontFamily: F.header, textTransform: 'uppercase' }}>History</Text>
                </TouchableOpacity>
              )}
              <View style={styles.mealCostBadge}>
                <Text style={styles.mealCostText}>${(meal.cost || 0).toFixed(2)}</Text>
              </View>
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

function GroceryItemRow({ item }: { item: any }) {
  const { C } = useTheme();
  const styles = React.useMemo(() => getStyles(C), [C]);
  const [checked, setChecked] = useState(item.isChecked || false);
  return (
    <TouchableOpacity 
      activeOpacity={0.7} 
      onPress={() => {
        Haptics.selectionAsync();
        setChecked(!checked);
      }}
      style={[styles.groceryItem, checked && { opacity: 0.5 }]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: checked ? C.primary : C.outlineVariant, backgroundColor: checked ? C.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
          {checked && <Feather name="check" size={14} color={C.onPrimary} />}
        </View>
        <Text style={[styles.itemText, checked && { textDecorationLine: 'line-through', color: C.onSurfaceVariant }]}>{item.name} x{item.quantity}</Text>
      </View>
      <Text style={[styles.itemPrice, checked && { textDecorationLine: 'line-through' }]}>${(item.totalCost || item.cost || 0).toFixed(2)}</Text>
    </TouchableOpacity>
  );
}

export default function NutritionScreen({ onNavigateToNotifications, onNavigateBack }: any) {
  const { isDark, C, bgColors } = useTheme();
  const styles = React.useMemo(() => getStyles(C), [C]);
  const [showGrocery, setShowGrocery] = useState(false);
  const [selectedMealHistory, setSelectedMealHistory] = useState<any>(null);
  const { user } = (require('../context/AuthContext') as any).useAuth();

  const queryClient = useQueryClient();

  // Live meals saved by Rachel AI
  const { data: userMeals = [] } = useQuery({
    queryKey: ['userMeals', user?.id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/nutrition?userId=${user?.id}`);
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: dashboardData } = useQuery({
    queryKey: ['nutritionDashboard', user?.id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/nutrition/dashboard?userId=${user?.id}`);
      return data;
    },
    enabled: !!user?.id,
  });

  const regenMutation = useMutation({
    mutationFn: async (mealId: string) => {
      const { data } = await apiClient.post('/nutrition/regenerate', { mealId });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userMeals'] });
    }
  });

  const generatePlanMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("No user id");
      return generateAiPlan(user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userMeals'] });
    }
  });

  const handleRegenerate = (mealId: string) => {
    regenMutation.mutate(mealId);
  };

  const logWaterMutation = useMutation({
    mutationFn: async (amountMl: number) => {
      const { data } = await apiClient.post('/nutrition/water', { userId: user?.id, amountMl });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nutritionDashboard'] });
    }
  });

  const handleLogWater = (amountMl: number) => {
    runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
    logWaterMutation.mutate(amountMl);
  };

  // Fallback static budget plan
  const { data: budgetData } = useQuery({ queryKey: ['budgetPlan'], queryFn: () => fetchBudgetPlan(75, 2500) });
  
  // Show Rachel-saved meals if any, otherwise show static plan
  const meals = userMeals.length > 0 ? userMeals : (budgetData?.meals || []);
  const groceryList = budgetData?.groceryList || [];
  const weeklyCost = budgetData?.weeklyCost || 0;
  
  const totalCals = dashboardData?.calories || (userMeals.length > 0
    ? userMeals.reduce((sum: number, m: any) => sum + (m.cals || 0), 0)
    : (budgetData?.dailyCals || 2050));
    
  const currentProtein = dashboardData?.protein || 160;
  const currentCarbs = dashboardData?.carbs || 195;
  const currentFat = dashboardData?.fat || 67;

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
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {onNavigateBack && (
              <TouchableOpacity onPress={onNavigateBack} style={{ marginRight: 12 }}>
                <Feather name="chevron-left" size={24} color={C.onSurface} />
              </TouchableOpacity>
            )}
            <View>
              <Text style={styles.title}>Meal Planner</Text>
              <Text style={styles.subtitle}>AI optimized for high-protein and $75/wk budget.</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => { Haptics.selectionAsync(); onNavigateToNotifications?.(); }} style={{ padding: 8, backgroundColor: C.glassInset, borderRadius: 20 }}>
            <Icon name="notifications" size={20} color={C.onSurface} />
          </TouchableOpacity>
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
              <Text style={styles.calorieText}>{totalCals} <Text style={{ fontSize: 14, color: C.onSurfaceVariant }}>kcal</Text></Text>
            </View>
            
            <View style={styles.macroBarsRow}>
              <ProgressBar label="Protein" current={currentProtein} total={200} color="#4ade80" />
              <ProgressBar label="Carbs" current={currentCarbs} total={250} color={C.primary} />
              <ProgressBar label="Fats" current={currentFat} total={90} color="#38bdf8" />
            </View>
          </View>
        </Animated.View>

        {/* Water Tracker */}
        <Animated.View entering={FadeInUp.delay(120).springify()}>
          <View style={[styles.macroCard, { marginTop: 16 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialCommunityIcons name="water-outline" size={24} color="#38bdf8" />
                <Text style={styles.macroTitle}>Hydration</Text>
              </View>
              <Text style={styles.calorieText}>{dashboardData?.dailyWaterMl || 0} <Text style={{ fontSize: 14, color: C.onSurfaceVariant }}>/ {dashboardData?.waterGoalMl || 2500} ml</Text></Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${(dashboardData?.waterProgress || 0) * 100}%`, backgroundColor: "#38bdf8" }]} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, gap: 12 }}>
              <TouchableOpacity onPress={() => handleLogWater(250)} style={{ flex: 1, backgroundColor: `${C.primary}15`, padding: 12, borderRadius: 12, alignItems: 'center' }}>
                <Text style={{ color: C.primary, fontFamily: F.bodyBold }}>+ 250ml</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleLogWater(500)} style={{ flex: 1, backgroundColor: `${C.primary}15`, padding: 12, borderRadius: 12, alignItems: 'center' }}>
                <Text style={{ color: C.primary, fontFamily: F.bodyBold }}>+ 500ml</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {dashboardData?.recommendation && (
          <Animated.View entering={FadeInUp.delay(150).springify()}>
            <View style={{ backgroundColor: `${C.primary}15`, padding: 16, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: `${C.primary}33` }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <MaterialCommunityIcons name="robot-outline" size={20} color={C.primary} />
                <Text style={{ fontFamily: F.header, color: C.primary, fontSize: 14 }}>AI Recommendation</Text>
              </View>
              <Text style={{ fontFamily: F.bodyBold, color: C.onSurface, fontSize: 16, marginBottom: 4 }}>{dashboardData.recommendation.text}</Text>
              <Text style={{ fontFamily: F.body, color: C.onSurfaceVariant, fontSize: 12 }}>{dashboardData.recommendation.reason}</Text>
            </View>
          </Animated.View>
        )}

        {/* Generate Meal Plan Actions */}
        <Animated.View entering={FadeInUp.delay(200).springify()} style={{ marginBottom: 32, gap: 12 }}>
          <TouchableOpacity 
            activeOpacity={0.8} 
            onPress={() => {
              if (generatePlanMutation.isPending) return;
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              generatePlanMutation.mutate();
            }}
            style={{ borderRadius: 16, overflow: 'hidden' }}
          >
            <LinearGradient colors={[C.primary, C.primaryDim]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.generateBtn}>
              {/* Shimmer Overlay driven by Gyroscope */}
              <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: 0.4 }, shimmerStyle]} pointerEvents="none">
                <LinearGradient colors={['transparent', '#FFF', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFillObject} />
              </Animated.View>

              {generatePlanMutation.isPending ? (
                <ActivityIndicator color={C.onPrimary} size="small" />
              ) : (
                <>
                  <Icon name="auto-awesome" size={18} color={C.onPrimary} />
                  <Text style={styles.generateBtnText}>Generate Meal Plan with AI</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
          
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity 
              activeOpacity={0.8} 
              onPress={() => { Haptics.selectionAsync(); setShowGrocery(true); }}
              style={[styles.generateBtn, { flex: 1, backgroundColor: `${C.primary}15`, padding: 14 }]}
            >
              <Feather name="shopping-cart" size={16} color={C.primary} />
              <Text style={[styles.generateBtnText, { color: C.primary, fontSize: 14 }]}>Grocery List</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              activeOpacity={0.8} 
              onPress={() => Haptics.selectionAsync()}
              style={[styles.generateBtn, { flex: 1, backgroundColor: C.surfaceVariant, padding: 14 }]}
            >
              <Feather name="plus" size={16} color={C.onSurfaceVariant} />
              <Text style={[styles.generateBtnText, { color: C.onSurfaceVariant, fontSize: 14 }]}>Add Manually</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        <Text style={styles.sectionTitle}>Today's Plan</Text>
        
        {meals.map((meal: any, index: number) => {
          // If the meal has versions, show the latest version's stats
          const activeVersion = meal.versions?.find((v: any) => v.isCurrent) || meal;
          return (
            <SwipeableMealCard key={meal.id || index} meal={{...activeVersion, versions: meal.versions, onRegenerate: handleRegenerate, onShowHistory: setSelectedMealHistory, id: meal.id}} index={index} />
          );
        })}

      </ScrollView>
      </SafeAreaView>

      {/* History Modal Bottom Sheet */}
      {selectedMealHistory && (
        <Animated.View style={styles.modalOverlay}>
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFillObject} />
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setSelectedMealHistory(null)} />
          
          <Animated.View entering={SlideInDown.springify().damping(20).stiffness(150)} exiting={SlideOutDown.duration(200)} style={styles.modalContent}>
            <View style={{ width: 40, height: 4, backgroundColor: C.outlineVariant, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 12 }} />
            
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Version History</Text>
              <TouchableOpacity onPress={() => setSelectedMealHistory(null)} style={styles.closeBtn}>
                <Feather name="x" size={20} color={C.onSurface} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={{ padding: 24 }} showsVerticalScrollIndicator={false}>
              {selectedMealHistory.versions?.map((v: any) => (
                <View key={v.id} style={[styles.groceryItem, v.isCurrent && { borderColor: C.primary }]}>
                  <View>
                    <Text style={[styles.itemText, v.isCurrent && { color: C.primary, fontFamily: F.header }]}>{v.name}</Text>
                    <Text style={{ color: C.onSurfaceVariant, fontFamily: F.bodyMed, fontSize: 12, marginTop: 4 }}>{v.cals} kcal • ${v.cost?.toFixed(2) || 0}</Text>
                    {v.aiExplanation && (
                      <Text style={{ color: C.onSurfaceVariant, fontFamily: F.body, fontSize: 11, marginTop: 8, fontStyle: 'italic' }}>"{v.aiExplanation}"</Text>
                    )}
                  </View>
                  {!v.isCurrent && (
                    <TouchableOpacity style={{ backgroundColor: C.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                      <Text style={{ color: C.onPrimary, fontFamily: F.bodyBold, fontSize: 12 }}>Restore</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </ScrollView>
          </Animated.View>
        </Animated.View>
      )}

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
                <GroceryItemRow key={i} item={item} />
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
  header: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 0) + 20 : 20 },
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
  
  mealCard: { backgroundColor: C.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: C.outlineVariant, marginBottom: 12 },
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
